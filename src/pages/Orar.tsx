import { useEffect, useState, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { useOrganizers, organizerName } from '../lib/hooks'
import type { Activity } from '../lib/types'
import { ACTIVITY_KINDS } from '../lib/types'
import { CAMP_DAYS } from '../lib/week'
import { useAuth } from '../context/AuthProvider'
import Modal from '../components/Modal'

export default function Orar() {
  const { profile } = useAuth()
  const organizers = useOrganizers()
  const [items, setItems] = useState<Activity[]>([])
  const [loading, setLoading] = useState(true)
  const [modal, setModal] = useState<Partial<Activity> | null>(null)

  const load = useCallback(async () => {
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

  return (
    <div className="page wide">
      <header className="page-head with-action">
        <div>
          <h1>Orar tabără</h1>
          <p className="muted">Program pe zile, 17–23 august. Adaugă ora și activitatea.</p>
        </div>
      </header>

      {loading ? <div className="spinner-inline"><div className="spinner" /></div> : (
        <div className="timetable">
          {CAMP_DAYS.map((day) => {
            const acts = items.filter((i) => i.day === day.date)
            return (
              <div key={day.date} className="tt-col">
                <div className="tt-head">
                  <span>{day.label}</span>
                  <button className="tt-add" title="Adaugă activitate"
                    onClick={() => setModal({ day: day.date, notify_minutes_before: 15, kind: 'general' })}>+</button>
                </div>
                <div className="tt-body">
                  {acts.length === 0 && <div className="tt-empty muted small">—</div>}
                  {acts.map((a) => (
                    <div key={a.id} className={'tt-act kind-' + a.kind} onClick={() => setModal(a)}>
                      <div className="tt-time">{a.start_time ? a.start_time.slice(0, 5) : ''}{a.end_time ? `–${a.end_time.slice(0, 5)}` : ''}</div>
                      <div className="tt-title">{a.title}</div>
                      {(a.location || a.responsible_id) && (
                        <div className="tt-meta">
                          {a.location && <span>📍 {a.location}</span>}
                          {a.responsible_id && <span>👤 {organizerName(organizers, a.responsible_id)}</span>}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {modal && (
        <Modal title={modal.id ? 'Editează activitatea' : 'Activitate nouă'} onClose={() => setModal(null)}>
          <ActivityForm initial={modal} organizers={organizers} onSave={save}
            onDelete={modal.id ? () => { remove(modal.id!); setModal(null) } : undefined} />
        </Modal>
      )}
    </div>
  )
}

function ActivityForm({
  initial, organizers, onSave, onDelete,
}: {
  initial: Partial<Activity>; organizers: ReturnType<typeof useOrganizers>
  onSave: (a: Partial<Activity>) => void; onDelete?: () => void
}) {
  const [a, setA] = useState<Partial<Activity>>(initial)
  const set = (k: keyof Activity, v: any) => setA((prev) => ({ ...prev, [k]: v }))
  return (
    <form className="form" onSubmit={(e) => { e.preventDefault(); onSave(a) }}>
      <label>Titlu / activitate
        <input autoFocus value={a.title ?? ''} onChange={(e) => set('title', e.target.value)} placeholder="ex. Studiu biblic de dimineață" />
      </label>
      <div className="form-row">
        <label>Ziua
          <select value={a.day ?? ''} onChange={(e) => set('day', e.target.value)}>
            {CAMP_DAYS.map((d) => <option key={d.date} value={d.date}>{d.label}</option>)}
          </select>
        </label>
        <label>Tip
          <select value={a.kind ?? 'general'} onChange={(e) => set('kind', e.target.value)}>
            {ACTIVITY_KINDS.map((k) => <option key={k.value} value={k.value}>{k.label}</option>)}
          </select>
        </label>
      </div>
      <div className="form-row">
        <label>Ora început
          <input type="time" value={a.start_time ?? ''} onChange={(e) => set('start_time', e.target.value)} />
        </label>
        <label>Ora sfârșit
          <input type="time" value={a.end_time ?? ''} onChange={(e) => set('end_time', e.target.value)} />
        </label>
      </div>
      <label>Loc
        <input value={a.location ?? ''} onChange={(e) => set('location', e.target.value)} placeholder="ex. Sala mese, Capela…" />
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
      <label>Notificare (minute înainte)
        <input type="number" min={0} value={a.notify_minutes_before ?? 15} onChange={(e) => set('notify_minutes_before', Number(e.target.value))} />
      </label>
      <div className="form-actions">
        {onDelete && <button type="button" className="btn-secondary danger" onClick={onDelete}>Șterge</button>}
        <button className="btn-primary" type="submit">Salvează</button>
      </div>
    </form>
  )
}
