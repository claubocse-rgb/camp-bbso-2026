import { useEffect, useState, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import type { Room, Participant } from '../lib/types'

export default function Camere() {
  const [rooms, setRooms] = useState<Room[]>([])
  const [people, setPeople] = useState<Participant[]>([])
  const [loading, setLoading] = useState(true)
  const [openBuilding, setOpenBuilding] = useState<string | null>(null)

  const load = useCallback(async () => {
    const [{ data: r }, { data: p }] = await Promise.all([
      supabase.from('rooms').select('*').order('sort_order'),
      supabase.from('participants').select('*').order('full_name'),
    ])
    setRooms((r as Room[]) ?? [])
    setPeople((p as Participant[]) ?? [])
    setLoading(false)
  }, [])
  useEffect(() => { load() }, [load])

  async function assign(personId: string, roomId: string | null) {
    await supabase.from('participants').update({ room_id: roomId }).eq('id', personId); load()
  }
  async function quickAdd(name: string, roomId: string) {
    if (!name.trim()) return
    await supabase.from('participants').insert({ full_name: name.trim(), room_id: roomId }); load()
  }

  if (loading) return <Wrap><div className="spinner-inline"><div className="spinner" /></div></Wrap>

  const buildings = [...new Set(rooms.map((r) => r.building))]
  const occupantsOf = (roomId: string) => people.filter((p) => p.room_id === roomId)
  const unassigned = people.filter((p) => !p.room_id)

  const totalCap = rooms.reduce((s, r) => s + r.capacity, 0)
  const totalOcc = people.filter((p) => p.room_id).length

  return (
    <Wrap>
      <div className="rooms-summary">
        <div className="sum-tile"><b>{totalOcc}</b><span>ocupate</span></div>
        <div className="sum-tile"><b>{totalCap}</b><span>locuri total</span></div>
        <div className="sum-tile"><b>{Math.max(totalCap - totalOcc, 0)}</b><span>libere</span></div>
        <div className="sum-tile"><b>{unassigned.length}</b><span>nerepartizați</span></div>
      </div>

      {buildings.map((b) => {
        const bRooms = rooms.filter((r) => r.building === b)
        const cap = bRooms.reduce((s, r) => s + r.capacity, 0)
        const occ = bRooms.reduce((s, r) => s + occupantsOf(r.id).length, 0)
        const isOpen = openBuilding === b
        return (
          <div key={b} className="building">
            <button className="building-head" onClick={() => setOpenBuilding(isOpen ? null : b)}>
              <span className="building-name">{b}</span>
              <span className="building-meta">{occ}/{cap} <span className={'chev' + (isOpen ? ' open' : '')}>▾</span></span>
            </button>
            {isOpen && (
              <div className="rooms-grid">
                {bRooms.map((room) => {
                  const occ = occupantsOf(room.id)
                  const free = room.capacity - occ.length
                  return (
                    <div key={room.id} className={'room-card' + (free <= 0 ? ' full' : '')}>
                      <div className="room-top">
                        <b>{room.name}{room.level ? ` · ${room.level}` : ''}</b>
                        <span className={'room-count' + (free < 0 ? ' over' : '')}>{occ.length}/{room.capacity}</span>
                      </div>
                      {room.beds && <div className="muted small">{room.beds}</div>}
                      {room.bathroom && <div className="muted small">🚿 {room.bathroom}</div>}
                      <ul className="room-occ">
                        {occ.map((p) => (
                          <li key={p.id}>
                            <span>{p.full_name}{p.gender ? ` (${p.gender})` : ''}</span>
                            <button className="link-btn danger" onClick={() => assign(p.id, null)} title="Scoate din cameră">✕</button>
                          </li>
                        ))}
                        {occ.length === 0 && <li className="muted small">Goală</li>}
                      </ul>
                      {free > 0 && <RoomAdd roomId={room.id} unassigned={unassigned} onAssign={assign} onQuickAdd={quickAdd} />}
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        )
      })}

      {unassigned.length > 0 && (
        <div className="unassigned">
          <h3>Nerepartizați ({unassigned.length})</h3>
          <p className="muted small">Deschide o clădire și adaugă-i într-o cameră cu locuri libere.</p>
          <div className="chips">
            {unassigned.map((p) => <span key={p.id} className="chip">{p.full_name}</span>)}
          </div>
        </div>
      )}
    </Wrap>
  )
}

function RoomAdd({
  roomId, unassigned, onAssign, onQuickAdd,
}: {
  roomId: string; unassigned: Participant[]
  onAssign: (personId: string, roomId: string) => void
  onQuickAdd: (name: string, roomId: string) => void
}) {
  const [mode, setMode] = useState<'pick' | 'new'>('pick')
  const [name, setName] = useState('')
  return (
    <div className="room-add">
      {mode === 'pick' ? (
        <div className="room-add-row">
          <select defaultValue="" onChange={(e) => { if (e.target.value) onAssign(e.target.value, roomId) }}>
            <option value="">+ repartizează…</option>
            {unassigned.map((p) => <option key={p.id} value={p.id}>{p.full_name}</option>)}
          </select>
          <button className="link-btn" onClick={() => setMode('new')}>nou</button>
        </div>
      ) : (
        <form className="room-add-row" onSubmit={(e) => { e.preventDefault(); onQuickAdd(name, roomId); setName(''); setMode('pick') }}>
          <input autoFocus value={name} onChange={(e) => setName(e.target.value)} placeholder="Nume nou…" />
          <button className="link-btn" type="submit">ok</button>
        </form>
      )}
    </div>
  )
}

function Wrap({ children }: { children: React.ReactNode }) {
  return (
    <div className="page">
      <header className="page-head">
        <h1>Aranjare camere</h1>
        <p className="muted">Cazarea 2026 — Camp Cristia, Voroneț. Repartizarea se salvează pentru toți.</p>
      </header>
      {children}
    </div>
  )
}
