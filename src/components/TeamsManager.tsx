import { useEffect, useState, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthProvider'
import type { Participant } from '../lib/types'
import Modal from './Modal'

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
  const [personModal, setPersonModal] = useState<{ teamId: string | null } | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    const [{ data: t }, { data: p }] = await Promise.all([
      supabase.from(teamTable).select('id, name, description').order('name'),
      supabase.from('participants').select('*').order('full_name'),
    ])
    setTeams((t as Team[]) ?? [])
    setPeople((p as Participant[]) ?? [])
    setLoading(false)
  }, [teamTable])

  useEffect(() => { load() }, [load])

  async function saveTeam(name: string, id?: string) {
    if (!name.trim()) return
    if (id) await supabase.from(teamTable).update({ name: name.trim() }).eq('id', id)
    else await supabase.from(teamTable).insert({ name: name.trim() })
    setTeamModal(null); load()
  }
  async function deleteTeam(id: string) {
    if (!confirm('Ștergi echipa? Membrii rămân, doar fără echipă.')) return
    await supabase.from(teamTable).delete().eq('id', id); load()
  }
  async function addPerson(name: string, gender: string, teamId: string | null) {
    if (!name.trim()) return
    await supabase.from('participants').insert({
      full_name: name.trim(),
      gender: gender || null,
      [fk]: teamId,
    })
    setPersonModal(null); load()
  }
  async function movePerson(personId: string, teamId: string | null) {
    await supabase.from('participants').update({ [fk]: teamId }).eq('id', personId); load()
  }
  async function deletePerson(id: string) {
    if (!confirm('Ștergi participantul complet?')) return
    await supabase.from('participants').delete().eq('id', id); load()
  }

  const unassigned = people.filter((p) => !(p as any)[fk])
  const membersOf = (teamId: string) => people.filter((p) => (p as any)[fk] === teamId)

  if (loading) return <div className="spinner-inline"><div className="spinner" /></div>

  return (
    <div>
      <div className="toolbar">
        <button className="btn-primary" onClick={() => setTeamModal({ name: '' })}>+ Echipă</button>
        <button className="btn-secondary" onClick={() => setPersonModal({ teamId: null })}>+ Participant</button>
      </div>

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
                    <span>{m.full_name}{m.gender ? ` (${m.gender})` : ''}</span>
                    <span className="row-actions">
                      <select
                        value={team.id}
                        onChange={(e) => movePerson(m.id, e.target.value || null)}
                        title="Mută în altă echipă"
                      >
                        <option value="">— fără echipă —</option>
                        {teams.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
                      </select>
                      <button className="link-btn danger" onClick={() => deletePerson(m.id)}>✕</button>
                    </span>
                  </li>
                ))}
                {members.length === 0 && <li className="muted small">Niciun membru</li>}
              </ul>
              <button className="add-inline" onClick={() => setPersonModal({ teamId: team.id })}>+ adaugă în echipă</button>
            </div>
          )
        })}
      </div>

      {unassigned.length > 0 && (
        <div className="unassigned">
          <h3>Neatribuiți ({unassigned.length})</h3>
          <ul className="member-list">
            {unassigned.map((m) => (
              <li key={m.id}>
                <span>{m.full_name}{m.gender ? ` (${m.gender})` : ''}</span>
                <span className="row-actions">
                  <select value="" onChange={(e) => movePerson(m.id, e.target.value || null)}>
                    <option value="">→ echipă…</option>
                    {teams.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
                  </select>
                  <button className="link-btn danger" onClick={() => deletePerson(m.id)}>✕</button>
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {teamModal && (
        <Modal title={teamModal.id ? 'Redenumește echipa' : 'Echipă nouă'} onClose={() => setTeamModal(null)}>
          <TeamForm initial={teamModal.name} onSave={(n) => saveTeam(n, teamModal.id)} />
        </Modal>
      )}
      {personModal && (
        <Modal title="Participant nou" onClose={() => setPersonModal(null)}>
          <PersonForm teams={teams} defaultTeam={personModal.teamId} onSave={addPerson} />
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

function PersonForm({
  teams, defaultTeam, onSave,
}: {
  teams: Team[]; defaultTeam: string | null; onSave: (name: string, gender: string, teamId: string | null) => void
}) {
  const [name, setName] = useState('')
  const [gender, setGender] = useState('')
  const [teamId, setTeamId] = useState(defaultTeam ?? '')
  return (
    <form onSubmit={(e) => { e.preventDefault(); onSave(name, gender, teamId || null) }} className="form">
      <label>Nume participant
        <input autoFocus value={name} onChange={(e) => setName(e.target.value)} placeholder="Nume și prenume" />
      </label>
      <label>Gen (opțional)
        <select value={gender} onChange={(e) => setGender(e.target.value)}>
          <option value="">—</option>
          <option value="M">M</option>
          <option value="F">F</option>
        </select>
      </label>
      <label>Echipă
        <select value={teamId} onChange={(e) => setTeamId(e.target.value)}>
          <option value="">— fără echipă —</option>
          {teams.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
        </select>
      </label>
      <button className="btn-primary" type="submit">Adaugă</button>
    </form>
  )
}
