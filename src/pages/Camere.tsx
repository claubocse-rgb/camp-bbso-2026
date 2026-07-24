import { useEffect, useState, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import type { Room, Participant } from '../lib/types'
import NameAutocomplete from '../components/NameAutocomplete'

export default function Camere() {
  const [rooms, setRooms] = useState<Room[]>([])
  const [people, setPeople] = useState<Participant[]>([])
  const [loading, setLoading] = useState(true)
  const [openBuildings, setOpenBuildings] = useState<string[]>([])
  const [q, setQ] = useState('')
  const [showMap, setShowMap] = useState(true)
  const [hasMap, setHasMap] = useState(true)

  const load = useCallback(async () => {
    const [{ data: r }, { data: p }] = await Promise.all([
      supabase.from('rooms').select('*').order('sort_order'),
      supabase.from('participants').select('*').order('full_name'),
    ])
    setRooms((r as Room[]) ?? [])
    setPeople((p as Participant[]) ?? [])
    setLoading(false)
  }, [])
  useEffect(() => {
    load()
    let t: ReturnType<typeof setTimeout>
    const bump = () => { clearTimeout(t); t = setTimeout(load, 400) }
    const ch = supabase.channel('camere-rt')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'participants' }, bump)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'rooms' }, bump)
      .subscribe()
    return () => { clearTimeout(t); supabase.removeChannel(ch) }
  }, [load])

  async function assign(personId: string, roomId: string | null) {
    await supabase.from('participants').update({ room_id: roomId }).eq('id', personId); load()
  }
  async function createInRoom(name: string, roomId: string) {
    if (!name.trim()) return
    await supabase.from('participants').insert({ full_name: name.trim(), room_id: roomId }); load()
  }
  async function removePerson(id: string, name: string) {
    if (!confirm(`Ștergi „${name}" complet din listă? (dacă a fost scris greșit)`)) return
    await supabase.from('participants').delete().eq('id', id); load()
  }
  async function setBlocked(room: Room, n: number) {
    const val = Math.max(0, Math.min(n, room.capacity - occupantsOf(room.id).length))
    await supabase.from('rooms').update({ blocked: val }).eq('id', room.id); load()
  }

  if (loading) return <Wrap map={null}><div className="spinner-inline"><div className="spinner" /></div></Wrap>

  const buildings = [...new Set(rooms.map((r) => r.building))]
  const occupantsOf = (roomId: string) => people.filter((p) => p.room_id === roomId)
  const unassigned = people.filter((p) => !p.room_id)
  const totalCap = rooms.reduce((s, r) => s + r.capacity, 0)
  const totalOcc = people.filter((p) => p.room_id).length
  const totalBlocked = rooms.reduce((s, r) => s + (r.blocked || 0), 0)

  const norm = (s: string) => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
  const roomName = (id: string) => { const r = rooms.find((x) => x.id === id); return r ? `${r.building} · ${r.name}` : '' }
  const listed = q.trim() ? people.filter((p) => norm(p.full_name).includes(norm(q))) : people

  const mapEl = hasMap ? (
    <div className="map-box">
      <button className="map-toggle" onClick={() => setShowMap((s) => !s)}>
        {showMap ? '▾' : '▸'} Harta taberei
      </button>
      {showMap && (
        <img src={`${import.meta.env.BASE_URL}harta-tabara.jpg`} alt="Harta aeriană a taberei"
          onError={() => setHasMap(false)} />
      )}
    </div>
  ) : null

  return (
    <Wrap map={mapEl}>
      <div className="rooms-summary">
        <div className="sum-tile"><b>{totalOcc + totalBlocked}</b><span>{totalBlocked > 0 ? `ocupate (${totalBlocked} blocate)` : 'ocupate'}</span></div>
        <div className="sum-tile"><b>{Math.max(totalCap - totalOcc - totalBlocked, 0)}</b><span>libere</span></div>
        <div className="sum-tile"><b>{unassigned.length}</b><span>nerepartizați</span></div>
      </div>

      <div className="camere-layout">
        <div className="camere-main">
          {buildings.map((b) => {
            const bRooms = rooms.filter((r) => r.building === b)
            const cap = bRooms.reduce((s, r) => s + r.capacity, 0)
            const occ = bRooms.reduce((s, r) => s + occupantsOf(r.id).length + (r.blocked || 0), 0)
            const isOpen = openBuildings.includes(b)
            return (
              <div key={b} className="building">
                <button className="building-head" onClick={() => setOpenBuildings((prev) => prev.includes(b) ? prev.filter((x) => x !== b) : [...prev, b])}>
                  <span className="building-name">{b}</span>
                  <span className="building-meta">{occ}/{cap} <span className={'chev' + (isOpen ? ' open' : '')}>▾</span></span>
                </button>
                {isOpen && (
                  <div className="rooms-grid">
                    {bRooms.map((room) => {
                      const occ = occupantsOf(room.id)
                      const blocked = room.blocked || 0
                      const used = occ.length + blocked
                      const free = room.capacity - used
                      return (
                        <div key={room.id} className={'room-card' + (free <= 0 ? ' full' : '')}>
                          <div className="room-top">
                            <b>{room.name}{room.level ? ` · ${room.level}` : ''}</b>
                            <span className={'room-count' + (free < 0 ? ' over' : '')}>{used}/{room.capacity}</span>
                          </div>
                          {room.beds && <div className="muted small">{room.beds}</div>}
                          <ul className="room-occ">
                            {occ.map((p) => (
                              <li key={p.id}>
                                <span>{p.full_name}{p.age != null ? `, ${p.age}` : ''}</span>
                                <button className="link-btn danger" onClick={() => assign(p.id, null)} title="Scoate din cameră">✕</button>
                              </li>
                            ))}
                            {Array.from({ length: blocked }).map((_, i) => (
                              <li key={'b' + i} className="blocked-spot">
                                <span>🔒 Loc blocat</span>
                                <button className="link-btn" onClick={() => setBlocked(room, blocked - 1)} title="Deblochează">✕</button>
                              </li>
                            ))}
                            {used === 0 && <li className="muted small">Goală</li>}
                          </ul>
                          {free > 0 && (
                            <div className="room-add">
                              <NameAutocomplete
                                participants={unassigned}
                                placeholder="+ nume în cameră…"
                                onPick={(p) => assign(p.id, room.id)}
                                onCreate={(name) => createInRoom(name, room.id)}
                              />
                              <button className="block-btn" onClick={() => setBlocked(room, blocked + 1)} title="Blochează un loc (rămâne gol)">🔒</button>
                            </div>
                          )}
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            )
          })}
        </div>

        <aside className="camere-side">
          <h3>Toți participanții ({people.length})</h3>
          <input className="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Caută…" />
          <ul className="side-list">
            {listed.map((p) => (
              <li key={p.id} className={p.room_id ? 'placed' : ''} title={p.room_id ? roomName(p.room_id) : 'nerepartizat'}>
                <span className="dot" />
                <span className="side-name">{p.full_name}{p.age != null ? `, ${p.age}` : ''}</span>
                {p.room_id && <span className="side-room">{roomName(p.room_id)}</span>}
                <button className="side-del" onClick={() => removePerson(p.id, p.full_name)} title="Șterge din listă">✕</button>
              </li>
            ))}
            {listed.length === 0 && <li className="muted small">Niciun rezultat.</li>}
          </ul>
        </aside>
      </div>
    </Wrap>
  )
}

function Wrap({ children, map }: { children: React.ReactNode; map: React.ReactNode }) {
  return (
    <div className="page">
      <header className="page-head">
        <h1>Aranjare camere</h1>
        <p className="muted">Cazarea 2026 — Camp Cristia, Voroneț. Repartizarea se salvează pentru toți.</p>
      </header>
      {map}
      {children}
    </div>
  )
}
