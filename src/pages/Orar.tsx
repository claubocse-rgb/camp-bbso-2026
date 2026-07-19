import { useEffect, useState, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { useOrganizers, organizerName } from '../lib/hooks'
import type { Activity } from '../lib/types'
import { ACTIVITY_KINDS } from '../lib/types'
import { useAuth } from '../context/AuthProvider'
import Modal from '../components/Modal'

export default function Orar() {
  const { profile } = useAuth()
  const organizers = useOrganizers()
  const [items, setItems] = useState<Activity[]>([])
  const [loading, setLoading] = useState(true)
  const [modal, setModal] = useState<Partial<Activity> | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    const { data } = await supabase.from('activities').select('*')
      .order('day').order('start_time', { nullsFirst: true })
    setItems((data as Activity[]) ?? [])
    setLoading(false)
  }, [])
  useEffect(() => { load() }, [load])

  async function save(a: Partial<Activity>) {
    const payload = {
      day: a.day, start_time: a.start_time || null, end_time: a.end_time || null,
      title: a.title, description: a.description || null, location: a.location || null,
      kind: a.kind || 'general', responsible_id: a.responsible_id || null,
      notify_minutes_before: a.notify_minutes_before ?? 15,
    }
    if (!payload.day || !payload.title) return
    if (a.id) await supabase.from('activities').update(payload).eq('id', a.id)
    else await supabase.from('activities').insert({ ...payload, created_by: profile?.id })
    setModal(null); load()
  }
  async function remove(id: string) {
    if (!confirm('Ștergi activitatea?')) return
    await supabase.from('activities').delete().eq('id', id); load()
  }

  const days = [...new Set(items.map((i) => i.day))]

  if (loading) return <PageWrap><div className="spinner-inline"><div className="spinner" /></div></PageWrap>

  return (
    <PageWrap onAdd={() => setModal({ notify_minutes_before: 15, kind: 'general' })}>
      {items.length === 0 && <p className="muted">Niciun eveniment în orar. Adaugă primul.</p>}
      {days.map((day) => (
        <div key={day} className="day-block">
          <h2 className="day-title">{formatDay(day)}</h2>
          <div className="timeline">
            {items.filter((i) => i.day === day).map((a) => (
              <div key={a.id} className={'act-row kind-' + a.kind}>
                <div className="act-time">{a.start_time ? a.start_time.slice(0, 5) : '—'}{a.end_time ? `–${a.end_time.slice(0, 5)}` : ''}</div>
                <div className="act-main">
                  <div className="act-title">{a.title} <span className="kind-badge">{kindLabel(a.kind)}</span></div>
                  {a.description && <div className="muted small">{a.description}</div>}
                  <div className="act-meta">
                    {a.location && <span>📍 {a.location}</span>}
                    {a.responsible_id && <span>👤 {organizerName(organizers, a.responsible_id)}</span>}
                    <span>🔔 {a.notify_minutes_before} min înainte</span>
                  </div>
                </div>
                <div className="act-edit">
                  <button className="link-btn" onClick={() => setModal(a)}>Editează</button>
                  <button className="link-btn danger" onClick={() => remove(a.id)}>Șterge</button>
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}

      {modal && (
        <Modal title={modal.id ? 'Editează activitatea' : 'Activitate nouă'} onClose={() => setModal(null)}>
          <ActivityForm initial={modal} organizers={organizers} onSave={save} />
        </Modal>
      )}
    </PageWrap>
  )
}

function PageWrap({ children, onAdd }: { children: React.ReactNode; onAdd?: () => void }) {
  return (
    <div className="page">
      <header className="page-head with-action">
        <div>
          <h1>Orar tabără</h1>
          <p className="muted">Programul pe zile și ore, cu responsabil și reminder.</p>
        </div>
        {onAdd && <button className="btn-primary" onClick={onAdd}>+ Activitate</button>}
      </header>
      {children}
    </div>
  )
}

function ActivityForm({
  initial, organizers, onSave,
}: {
  initial: Partial<Activity>; organizers: ReturnType<typeof useOrganizers>; onSave: (a: Partial<Activity>) => void
}) {
  const [a, setA] = useState<Partial<Activity>>(initial)
  const set = (k: keyof Activity, v: any) => setA((prev) => ({ ...prev, [k]: v }))
  return (
    <form className="form" onSubmit={(e) => { e.preventDefault(); onSave(a) }}>
      <label>Titlu
        <input autoFocus value={a.title ?? ''} onChange={(e) => set('title', e.target.value)} placeholder="ex. Studiu biblic de dimineață" />
      </label>
      <div className="form-row">
        <label>Ziua
          <input type="date" value={a.day ?? ''} onChange={(e) => set('day', e.target.value)} />
        </label>
        <label>Tip
          <select value={a.kind ?? 'general'} onChange={(e) => set('kind', e.target.value)}>
            {ACTIVITY_KINDS.map((k) => <option key={k.value} value={k.value}>{k.label}</option>)}
          </select>
        </label>
      </div>
      <div className="form-row">
        <label>Început
          <input type="time" value={a.start_time ?? ''} onChange={(e) => set('start_time', e.target.value)} />
        </label>
        <label>Sfârșit
          <input type="time" value={a.end_time ?? ''} onChange={(e) => set('end_time', e.target.value)} />
        </label>
      </div>
      <label>Loc
        <input value={a.location ?? ''} onChange={(e) => set('location', e.target.value)} placeholder="ex. Sala mare" />
      </label>
      <label>Responsabil
        <select value={a.responsible_id ?? ''} onChange={(e) => set('responsible_id', e.target.value)}>
          <option value="">— niciunul —</option>
          {organizers.map((o) => <option key={o.id} value={o.id}>{o.full_name || o.email}</option>)}
        </select>
      </label>
      <label>Descriere (opțional)
        <textarea value={a.description ?? ''} onChange={(e) => set('description', e.target.value)} rows={2} />
      </label>
      <label>Notificare cu (minute înainte)
        <input type="number" min={0} value={a.notify_minutes_before ?? 15} onChange={(e) => set('notify_minutes_before', Number(e.target.value))} />
      </label>
      <button className="btn-primary" type="submit">Salvează</button>
    </form>
  )
}

function kindLabel(k: string) { return ACTIVITY_KINDS.find((x) => x.value === k)?.label ?? k }
function formatDay(d: string) {
  try { return new Date(d + 'T00:00:00').toLocaleDateString('ro-RO', { weekday: 'long', day: 'numeric', month: 'long' }) }
  catch { return d }
}
