import { useEffect, useState, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { useOrganizers, organizerName } from '../lib/hooks'
import type { Game } from '../lib/types'
import { useAuth } from '../context/AuthProvider'
import Modal from '../components/Modal'

export default function Jocuri() {
  const { profile } = useAuth()
  const organizers = useOrganizers()
  const [items, setItems] = useState<Game[]>([])
  const [loading, setLoading] = useState(true)
  const [modal, setModal] = useState<Partial<Game> | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    const { data } = await supabase.from('games').select('*')
      .order('scheduled_at', { nullsFirst: false })
    setItems((data as Game[]) ?? [])
    setLoading(false)
  }, [])
  useEffect(() => { load() }, [load])

  async function save(g: Partial<Game>) {
    if (!g.title) return
    const payload = {
      title: g.title, description: g.description || null,
      responsible_id: g.responsible_id || null,
      scheduled_at: g.scheduled_at || null, location: g.location || null,
    }
    if (g.id) await supabase.from('games').update(payload).eq('id', g.id)
    else await supabase.from('games').insert({ ...payload, created_by: profile?.id })
    setModal(null); load()
  }
  async function remove(id: string) {
    if (!confirm('Ștergi jocul?')) return
    await supabase.from('games').delete().eq('id', id); load()
  }

  return (
    <div className="page">
      <header className="page-head with-action">
        <div>
          <h1>Jocuri</h1>
          <p className="muted">Lista jocurilor cu descriere, responsabil și oră.</p>
        </div>
        <button className="btn-primary" onClick={() => setModal({})}>+ Joc</button>
      </header>

      {loading ? <div className="spinner-inline"><div className="spinner" /></div> : (
        items.length === 0 ? <p className="muted">Niciun joc adăugat încă.</p> : (
          <div className="cards-list">
            {items.map((g) => (
              <div key={g.id} className="list-card">
                <div className="list-card-main">
                  <h3>{g.title}</h3>
                  {g.description && <p className="muted small">{g.description}</p>}
                  <div className="act-meta">
                    {g.scheduled_at && <span>🕒 {new Date(g.scheduled_at).toLocaleString('ro-RO', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}</span>}
                    {g.location && <span>📍 {g.location}</span>}
                    {g.responsible_id && <span>👤 {organizerName(organizers, g.responsible_id)}</span>}
                  </div>
                </div>
                <div className="act-edit">
                  <button className="link-btn" onClick={() => setModal(g)}>Editează</button>
                  <button className="link-btn danger" onClick={() => remove(g.id)}>Șterge</button>
                </div>
              </div>
            ))}
          </div>
        )
      )}

      {modal && (
        <Modal title={modal.id ? 'Editează jocul' : 'Joc nou'} onClose={() => setModal(null)}>
          <GameForm initial={modal} organizers={organizers} onSave={save} />
        </Modal>
      )}
    </div>
  )
}

function GameForm({
  initial, organizers, onSave,
}: {
  initial: Partial<Game>; organizers: ReturnType<typeof useOrganizers>; onSave: (g: Partial<Game>) => void
}) {
  const [g, setG] = useState<Partial<Game>>(initial)
  const set = (k: keyof Game, v: any) => setG((p) => ({ ...p, [k]: v }))
  // input datetime-local vrea format YYYY-MM-DDTHH:mm
  const dtValue = g.scheduled_at ? new Date(g.scheduled_at).toISOString().slice(0, 16) : ''
  return (
    <form className="form" onSubmit={(e) => { e.preventDefault(); onSave(g) }}>
      <label>Nume joc
        <input autoFocus value={g.title ?? ''} onChange={(e) => set('title', e.target.value)} placeholder="ex. Vânătoare de comori" />
      </label>
      <label>Descriere
        <textarea value={g.description ?? ''} onChange={(e) => set('description', e.target.value)} rows={3} placeholder="Reguli scurte, materiale necesare…" />
      </label>
      <div className="form-row">
        <label>Data și ora
          <input type="datetime-local" value={dtValue} onChange={(e) => set('scheduled_at', e.target.value ? new Date(e.target.value).toISOString() : null)} />
        </label>
        <label>Loc
          <input value={g.location ?? ''} onChange={(e) => set('location', e.target.value)} placeholder="ex. Teren sport" />
        </label>
      </div>
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
