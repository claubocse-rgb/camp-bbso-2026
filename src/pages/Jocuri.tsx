import { useEffect, useState, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { useOrganizers, organizerName } from '../lib/hooks'
import type { Game } from '../lib/types'
import { CAMP_DAYS } from '../lib/week'
import { useAuth } from '../context/AuthProvider'
import Modal from '../components/Modal'

// data locala (Bucuresti) din timestamp -> YYYY-MM-DD
function localDate(iso: string | null): string | null {
  if (!iso) return null
  return new Date(iso).toLocaleDateString('en-CA')
}
function localTime(iso: string | null): string {
  if (!iso) return ''
  return new Date(iso).toLocaleTimeString('ro-RO', { hour: '2-digit', minute: '2-digit' })
}

export default function Jocuri() {
  const { profile } = useAuth()
  const organizers = useOrganizers()
  const [items, setItems] = useState<Game[]>([])
  const [loading, setLoading] = useState(true)
  const [modal, setModal] = useState<Partial<Game> | null>(null)

  const load = useCallback(async () => {
    const { data } = await supabase.from('games').select('*').order('scheduled_at', { nullsFirst: false })
    setItems((data as Game[]) ?? [])
    setLoading(false)
  }, [])
  useEffect(() => { load() }, [load])

  async function save(g: Partial<Game> & { _day?: string; _time?: string }) {
    if (!g.title) return
    let scheduled_at: string | null = g.scheduled_at ?? null
    if (g._day) scheduled_at = new Date(`${g._day}T${g._time || '00:00'}`).toISOString()
    else if (g._day === '') scheduled_at = null
    const payload = {
      title: g.title, description: g.description || null,
      responsible_id: g.responsible_id || null, scheduled_at, location: g.location || null,
    }
    if (g.id) await supabase.from('games').update(payload).eq('id', g.id)
    else await supabase.from('games').insert({ ...payload, created_by: profile?.id })
    setModal(null); load()
  }
  async function remove(id: string) {
    if (!confirm('Ștergi jocul?')) return
    await supabase.from('games').delete().eq('id', id); load()
  }

  const gamesOf = (date: string) => items.filter((g) => localDate(g.scheduled_at) === date)
  const unscheduled = items.filter((g) => !g.scheduled_at)

  return (
    <div className="page">
      <header className="page-head with-action">
        <div>
          <h1>Jocuri</h1>
          <p className="muted">Program pe zile — cu descriere, responsabil și oră.</p>
        </div>
        <button className="btn-primary" onClick={() => setModal({})}>+ Joc</button>
      </header>

      {loading ? <div className="spinner-inline"><div className="spinner" /></div> : (
        <div className="study-days">
          {CAMP_DAYS.map((d) => {
            const games = gamesOf(d.date)
            if (games.length === 0) return null
            return (
              <div key={d.date} className="study-day">
                <div className="study-day-head"><h2>{d.label}</h2></div>
                <div className="cards-list">
                  {games.map((g) => <GameCard key={g.id} g={g} organizers={organizers} onEdit={() => setModal(g)} onDelete={() => remove(g.id)} />)}
                </div>
              </div>
            )
          })}
          {unscheduled.length > 0 && (
            <div className="study-day">
              <div className="study-day-head"><h2>Neprogramate</h2></div>
              <div className="cards-list">
                {unscheduled.map((g) => <GameCard key={g.id} g={g} organizers={organizers} onEdit={() => setModal(g)} onDelete={() => remove(g.id)} />)}
              </div>
            </div>
          )}
          {items.length === 0 && <p className="muted">Niciun joc adăugat încă.</p>}
        </div>
      )}

      {modal && (
        <Modal title={modal.id ? 'Editează jocul' : 'Joc nou'} onClose={() => setModal(null)}>
          <GameForm initial={modal} organizers={organizers} onSave={save} />
        </Modal>
      )}
    </div>
  )
}

function GameCard({ g, organizers, onEdit, onDelete }: { g: Game; organizers: ReturnType<typeof useOrganizers>; onEdit: () => void; onDelete: () => void }) {
  return (
    <div className="list-card">
      <div className="list-card-main">
        <h3>{localTime(g.scheduled_at) && <span className="game-time">{localTime(g.scheduled_at)}</span>} {g.title}</h3>
        {g.description && <p className="muted small">{g.description}</p>}
        <div className="act-meta">
          {g.location && <span>📍 {g.location}</span>}
          {g.responsible_id && <span>👤 {organizerName(organizers, g.responsible_id)}</span>}
        </div>
      </div>
      <div className="act-edit">
        <button className="link-btn" onClick={onEdit}>Editează</button>
        <button className="link-btn danger" onClick={onDelete}>Șterge</button>
      </div>
    </div>
  )
}

function GameForm({ initial, organizers, onSave }: {
  initial: Partial<Game>; organizers: ReturnType<typeof useOrganizers>
  onSave: (g: Partial<Game> & { _day?: string; _time?: string }) => void
}) {
  const [g, setG] = useState<Partial<Game>>(initial)
  const [day, setDay] = useState<string>(localDate(initial.scheduled_at ?? null) ?? '')
  const [time, setTime] = useState<string>(initial.scheduled_at ? localTime(initial.scheduled_at) : '')
  const set = (k: keyof Game, v: any) => setG((p) => ({ ...p, [k]: v }))
  return (
    <form className="form" onSubmit={(e) => { e.preventDefault(); onSave({ ...g, _day: day, _time: time }) }}>
      <label>Nume joc
        <input autoFocus value={g.title ?? ''} onChange={(e) => set('title', e.target.value)} placeholder="ex. Vânătoare de comori" />
      </label>
      <label>Descriere
        <textarea value={g.description ?? ''} onChange={(e) => set('description', e.target.value)} rows={3} placeholder="Reguli scurte, materiale necesare…" />
      </label>
      <div className="form-row">
        <label>Ziua
          <select value={day} onChange={(e) => setDay(e.target.value)}>
            <option value="">— neprogramat —</option>
            {CAMP_DAYS.map((d) => <option key={d.date} value={d.date}>{d.label}</option>)}
          </select>
        </label>
        <label>Ora
          <input type="time" value={time} onChange={(e) => setTime(e.target.value)} />
        </label>
      </div>
      <label>Loc
        <input value={g.location ?? ''} onChange={(e) => set('location', e.target.value)} placeholder="ex. Teren sport" />
      </label>
      <label>Responsabil organizare
        <select value={g.responsible_id ?? ''} onChange={(e) => set('responsible_id', e.target.value)}>
          <option value="">— niciunul —</option>
          {organizers.map((o) => <option key={o.id} value={o.id}>{o.full_name || o.email}</option>)}
        </select>
      </label>
      <button className="btn-primary" type="submit">Salvează</button>
    </form>
  )
}
