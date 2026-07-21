import { useEffect, useState, useCallback, useRef } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthProvider'
import type { Study } from '../lib/types'
import { STUDY_DAYS } from '../lib/week'
import Modal from '../components/Modal'

const ACCEPT = '.pdf,.doc,.docx,.xls,.xlsx'
const TYPES: Record<string, string> = {
  pdf: 'application/pdf',
  doc: 'application/msword',
  docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  xls: 'application/vnd.ms-excel',
  xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
}
function ext(name: string) { return (name.split('.').pop() || '').toLowerCase() }
function fileIcon(name: string) {
  const e = ext(name)
  if (e === 'pdf') return '📕'
  if (e === 'doc' || e === 'docx') return '📘'
  if (e === 'xls' || e === 'xlsx') return '📗'
  return '📄'
}

export default function Studiu() {
  const { profile } = useAuth()
  const [items, setItems] = useState<Study[]>([])
  const [loading, setLoading] = useState(true)
  const [modalDay, setModalDay] = useState<string | null | false>(false)

  const load = useCallback(async () => {
    const { data } = await supabase.from('studies').select('*').order('created_at', { ascending: false })
    setItems((data as Study[]) ?? [])
    setLoading(false)
  }, [])
  useEffect(() => { load() }, [load])

  async function open(s: Study) {
    const { data } = await supabase.storage.from('studii').createSignedUrl(s.storage_path, 120, { download: s.file_name ?? true })
    if (data?.signedUrl) window.open(data.signedUrl, '_blank')
  }
  async function remove(s: Study) {
    if (!confirm('Ștergi materialul?')) return
    await supabase.storage.from('studii').remove([s.storage_path])
    await supabase.from('studies').delete().eq('id', s.id)
    load()
  }

  const byDay = (date: string) => items.filter((s) => s.day === date)
  const noDay = items.filter((s) => !s.day)

  return (
    <div className="page">
      <header className="page-head">
        <h1>Studiu</h1>
        <p className="muted">Materiale pe zile (18–22 august). PDF, Word sau Excel.</p>
      </header>

      {loading ? <div className="spinner-inline"><div className="spinner" /></div> : (
        <div className="study-days">
          {STUDY_DAYS.map((d) => (
            <div key={d.date} className="study-day">
              <div className="study-day-head">
                <h2>{d.label}</h2>
                <button className="btn-secondary" onClick={() => setModalDay(d.date)}>+ Încarcă</button>
              </div>
              {byDay(d.date).length === 0 ? <p className="muted small">Niciun material.</p> : (
                <div className="cards-list">
                  {byDay(d.date).map((s) => (
                    <StudyRow key={s.id} s={s} onOpen={() => open(s)} onDelete={() => remove(s)} />
                  ))}
                </div>
              )}
            </div>
          ))}

          {noDay.length > 0 && (
            <div className="study-day">
              <div className="study-day-head"><h2>Fără zi</h2></div>
              <div className="cards-list">
                {noDay.map((s) => <StudyRow key={s.id} s={s} onOpen={() => open(s)} onDelete={() => remove(s)} />)}
              </div>
            </div>
          )}
        </div>
      )}

      {modalDay !== false && (
        <UploadModal day={modalDay as string} profileId={profile?.id}
          onDone={() => { setModalDay(false); load() }} onClose={() => setModalDay(false)} />
      )}
    </div>
  )
}

function StudyRow({ s, onOpen, onDelete }: { s: Study; onOpen: () => void; onDelete: () => void }) {
  return (
    <div className="list-card">
      <div className="list-card-main">
        <h3>{fileIcon(s.file_name || '')} {s.title}</h3>
        {s.file_name && <div className="muted small">{s.file_name}</div>}
      </div>
      <div className="act-edit">
        <button className="link-btn" onClick={onOpen}>Descarcă</button>
        <button className="link-btn danger" onClick={onDelete}>Șterge</button>
      </div>
    </div>
  )
}

function UploadModal({ day, profileId, onDone, onClose }: { day: string; profileId?: string; onDone: () => void; onClose: () => void }) {
  const [title, setTitle] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const fileRef = useRef<HTMLInputElement>(null)

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    const file = fileRef.current?.files?.[0]
    if (!file) { setError('Alege un fișier.'); return }
    const e2 = ext(file.name)
    if (!TYPES[e2]) { setError('Acceptăm doar PDF, Word (.doc/.docx) sau Excel (.xls/.xlsx).'); return }
    setBusy(true); setError('')
    const safe = file.name.replace(/[^\w.\-]+/g, '_')
    const path = `${day || 'fara-zi'}/${Date.now()}_${safe}`
    const up = await supabase.storage.from('studii').upload(path, file, { contentType: TYPES[e2] })
    if (up.error) { setError('Eroare la încărcare: ' + up.error.message); setBusy(false); return }
    const ins = await supabase.from('studies').insert({
      title: title.trim() || file.name.replace(/\.[^.]+$/, ''),
      day: day || null, storage_path: path, file_name: file.name, uploaded_by: profileId,
    })
    if (ins.error) { setError('Eroare la salvare: ' + ins.error.message); setBusy(false); return }
    onDone()
  }

  return (
    <Modal title="Încarcă material" onClose={onClose}>
      <form className="form" onSubmit={submit}>
        <label>Titlu
          <input autoFocus value={title} onChange={(e) => setTitle(e.target.value)} placeholder="ex. Studiu — Identitate în Cristos" />
        </label>
        <label>Fișier (PDF, Word sau Excel)
          <input ref={fileRef} type="file" accept={ACCEPT} />
        </label>
        {error && <p className="error-text">{error}</p>}
        <button className="btn-primary" type="submit" disabled={busy}>{busy ? 'Se încarcă…' : 'Încarcă'}</button>
      </form>
    </Modal>
  )
}
