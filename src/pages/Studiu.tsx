import { useEffect, useState, useCallback, useRef } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthProvider'
import type { Study } from '../lib/types'
import Modal from '../components/Modal'

export default function Studiu() {
  const { profile } = useAuth()
  const [items, setItems] = useState<Study[]>([])
  const [loading, setLoading] = useState(true)
  const [modal, setModal] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    const { data } = await supabase.from('studies').select('*').order('day', { nullsFirst: false }).order('created_at', { ascending: false })
    setItems((data as Study[]) ?? [])
    setLoading(false)
  }, [])
  useEffect(() => { load() }, [load])

  async function open(s: Study) {
    const { data } = await supabase.storage.from('studii').createSignedUrl(s.storage_path, 60)
    if (data?.signedUrl) window.open(data.signedUrl, '_blank')
  }
  async function remove(s: Study) {
    if (!confirm('Ștergi studiul?')) return
    await supabase.storage.from('studii').remove([s.storage_path])
    await supabase.from('studies').delete().eq('id', s.id)
    load()
  }

  return (
    <div className="page">
      <header className="page-head with-action">
        <div>
          <h1>Studiu</h1>
          <p className="muted">Materialele de studiu în format PDF.</p>
        </div>
        <button className="btn-primary" onClick={() => setModal(true)}>+ Încarcă PDF</button>
      </header>

      {loading ? <div className="spinner-inline"><div className="spinner" /></div> : (
        items.length === 0 ? <p className="muted">Niciun material încărcat încă.</p> : (
          <div className="cards-list">
            {items.map((s) => (
              <div key={s.id} className="list-card">
                <div className="list-card-main">
                  <h3>📄 {s.title}</h3>
                  <div className="act-meta">
                    {s.day && <span>{new Date(s.day + 'T00:00:00').toLocaleDateString('ro-RO', { day: 'numeric', month: 'long' })}</span>}
                    {s.file_name && <span className="muted small">{s.file_name}</span>}
                  </div>
                </div>
                <div className="act-edit">
                  <button className="link-btn" onClick={() => open(s)}>Deschide</button>
                  <button className="link-btn danger" onClick={() => remove(s)}>Șterge</button>
                </div>
              </div>
            ))}
          </div>
        )
      )}

      {modal && <UploadModal profileId={profile?.id} onDone={() => { setModal(false); load() }} onClose={() => setModal(false)} />}
    </div>
  )
}

function UploadModal({ profileId, onDone, onClose }: { profileId?: string; onDone: () => void; onClose: () => void }) {
  const [title, setTitle] = useState('')
  const [day, setDay] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const fileRef = useRef<HTMLInputElement>(null)

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    const file = fileRef.current?.files?.[0]
    if (!file) { setError('Alege un fișier PDF.'); return }
    if (file.type !== 'application/pdf') { setError('Doar fișiere PDF.'); return }
    setBusy(true); setError('')
    const safe = file.name.replace(/[^\w.\-]+/g, '_')
    const path = `${Date.now()}_${safe}`
    const up = await supabase.storage.from('studii').upload(path, file, { contentType: 'application/pdf' })
    if (up.error) { setError('Eroare la încărcare: ' + up.error.message); setBusy(false); return }
    const ins = await supabase.from('studies').insert({
      title: title.trim() || file.name.replace(/\.pdf$/i, ''),
      day: day || null, storage_path: path, file_name: file.name, uploaded_by: profileId,
    })
    if (ins.error) { setError('Eroare la salvare: ' + ins.error.message); setBusy(false); return }
    onDone()
  }

  return (
    <Modal title="Încarcă material de studiu" onClose={onClose}>
      <form className="form" onSubmit={submit}>
        <label>Titlu
          <input autoFocus value={title} onChange={(e) => setTitle(e.target.value)} placeholder="ex. Studiu ziua 1 — Identitate" />
        </label>
        <label>Ziua (opțional)
          <input type="date" value={day} onChange={(e) => setDay(e.target.value)} />
        </label>
        <label>Fișier PDF
          <input ref={fileRef} type="file" accept="application/pdf" />
        </label>
        {error && <p className="error-text">{error}</p>}
        <button className="btn-primary" type="submit" disabled={busy}>{busy ? 'Se încarcă…' : 'Încarcă'}</button>
      </form>
    </Modal>
  )
}
