import { useEffect, useState, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthProvider'
import type { Participant } from '../lib/types'
import Modal from './Modal'
import NameAutocomplete from './NameAutocomplete'

type Team = { id: string; name: string; description: string | null }
type Kind = 'study' | 'game'

export default function TeamsManager({ kind }: { kind: Kind }) {
  const { profile } = useAuth()
  const teamTable = kind === 'study' ? 'study_teams' : 'game_teams'
  const fk = kind === 'study' ? 'study_team_id' : 'game_team_id'
  const myTeamId = kind === 'study' ? profile?.study_team_id : profile?.game_team_id

  const [teams, setTeams] = useState<Team[]>([])
  const [people, setPeople] = useState<Participant[]>([])
  const [loading, setLoading] = useState(true)
  const [teamModal, setTeamModal] = useState<{ id?: string; name: string } | null>(null)
  const [addingTo, setAddingTo] = useState<string | null>(null)
  const [q, setQ] = useState('')

  const load = useCallback(async () => {
    const [{ data: t }, { data: p }] = await Promise.all([
      supabase.from(teamTable).select('id, name, description').order('name'),
      supabase.from('participants').select('*').order('full_name'),
    ])
    setTeams((t as Team[]) ?? [])
    setPeople((p as Participant[]) ?? [])
    setLoading(false)
  }, [teamTable])
  useEffect(() => {
    load()
    let t: ReturnType<typeof setTimeout>
    const bump = () => { clearTimeout(t); t = setTimeout(load, 400) }
    const ch = supabase.channel('teams-rt-' + teamTable)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'participants' }, bump)
      .on('postgres_changes', { event: '*', schema: 'public', table: teamTable }, bump)
      .subscribe()
    return () => { clearTimeout(t); supabase.removeChannel(ch) }
  }, [load, teamTable])

  async function saveTeam(name: string, id?: string) {
    if (!name.trim()) return
    if (id) await supabase.from(teamTable).update({ name: name.trim() }).eq('id', id)
    else await supabase.from(teamTable).insert({ name: name.trim() })
    setTeamModal(null); load()
  }
  async function deleteTeam(id: string) {
    if (!confirm('Ștergi echipa? Membrii rămân în bază, doar fără echipă.')) return
    await supabase.from(teamTable).delete().eq('id', id); load()
  }
  async function assignExisting(personId: string, teamId: string | null) {
    await supabase.from('participants').update({ [fk]: teamId }).eq('id', personId); load()
  }
  async function createAndAssign(name: string, teamId: string) {
    await supabase.from('participants').insert({ full_name: name, [fk]: teamId }); load()
  }
  async function deletePerson(id: string) {
    if (!confirm('Ștergi participantul complet din bază?')) return
    await supabase.from('participants').delete().eq('id', id); load()
  }

  const unassigned = people.filter((p) => !(p as any)[fk])
  const membersOf = (teamId: string) => people.filter((p) => (p as any)[fk] === teamId)
  const teamName = (id: string) => teams.find((t) => t.id === id)?.name ?? ''
  const norm = (s: string) => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
  const listed = q.trim() ? people.filter((p) => norm(p.full_name).includes(norm(q))) : people
  const assignedCount = people.length - unassigned.length

  if (loading) return <div className="spinner-inline"><div className="spinner" /></div>

  return (
    <div>
      <div className="toolbar">
        <button className="btn-primary" onClick={() => setTeamModal({ name: '' })}>+ Echipă</button>
        <span className="muted small" style={{ alignSelf: 'center' }}>
          {people.length} participanți · {unassigned.length} fără echipă aici
        </span>
      </div>

      <div className="camere-layout">
        <div className="camere-main">
      {teams.length === 0 && <p className="muted">Nicio echipă încă. Adaugă una ca să începi.</p>}

      <div className="teams-grid">
        {teams.map((team) => {
          const members = membersOf(team.id)
          const mine = team.id === myTeamId
          return (
            <div key={team.id} className={'team-card' + (mine ? ' mine' : '')}>
              <div className="team-head">
                <h3>{team.name}{mine && <span className="tag">echipa mea</span>}</h3>
                <div className="team-actions">
                  <button className="link-btn" onClick={() => setTeamModal({ id: team.id, name: team.name })}>Redenumește</button>
                  <button className="link-btn danger" onClick={() => deleteTeam(team.id)}>Șterge</button>
                </div>
              </div>
              <div className="count">{members.length} {members.length === 1 ? 'membru' : 'membri'}</div>
              <ul className="member-list">
                {members.map((m) => (
                  <li key={m.id}>
                    <span>{m.full_name}{m.age != null ? `, ${m.age}` : ''}{m.gender ? ` (${m.gender})` : ''}</span>
                    <span className="row-actions">
                      <select value={team.id} onChange={(e) => assignExisting(m.id, e.target.value || null)} title="Mută în altă echipă">
                        <option value="">— scoate —</option>
                        {teams.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
                      </select>
                      <button className="link-btn danger" onClick={() => deletePerson(m.id)}>✕</button>
                    </span>
                  </li>
                ))}
                {members.length === 0 && <li className="muted small">Niciun membru</li>}
              </ul>
              {addingTo === team.id ? (
                <div className="team-add">
                  <NameAutocomplete
                    participants={people}
                    autoFocus
                    placeholder="Scrie 1-2 litere…"
                    onPick={(p) => assignExisting(p.id, team.id)}
                    onCreate={(name) => createAndAssign(name, team.id)}
                  />
                  <button className="link-btn" onClick={() => setAddingTo(null)}>gata</button>
                </div>
              ) : (
                <button className="add-inline" onClick={() => setAddingTo(team.id)}>+ adaugă în echipă</button>
              )}
            </div>
          )
        })}
      </div>
        </div>

        <aside className="camere-side">
          <h3>Toți ({people.length}) · {assignedCount} repartizați</h3>
          <input className="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Caută…" />
          <ul className="side-list">
            {listed.map((p) => {
              const tid = (p as any)[fk] as string | null
              return (
                <li key={p.id} className={tid ? 'placed' : ''} title={tid ? teamName(tid) : 'fără echipă'}>
                  <span className="dot" />
                  <span className="side-name">{p.full_name}{p.age != null ? `, ${p.age}` : ''}</span>
                  {tid && <span className="side-room">{teamName(tid)}</span>}
                </li>
              )
            })}
            {listed.length === 0 && <li className="muted small">Niciun rezultat.</li>}
          </ul>
        </aside>
      </div>

      {teamModal && (
        <Modal title={teamModal.id ? 'Redenumește echipa' : 'Echipă nouă'} onClose={() => setTeamModal(null)}>
          <TeamForm initial={teamModal.name} onSave={(n) => saveTeam(n, teamModal.id)} />
        </Modal>
      )}
    </div>
  )
}

function TeamForm({ initial, onSave }: { initial: string; onSave: (name: string) => void }) {
  const [name, setName] = useState(initial)
  return (
    <form onSubmit={(e) => { e.preventDefault(); onSave(name) }} className="form">
      <label>Nume echipă
        <input autoFocus value={name} onChange={(e) => setName(e.target.value)} placeholder="ex. Grupa Leilor" />
      </label>
      <button className="btn-primary" type="submit">Salvează</button>
    </form>
  )
}
