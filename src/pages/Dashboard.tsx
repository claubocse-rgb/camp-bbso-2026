import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../context/AuthProvider'
import { supabase } from '../lib/supabase'
import type { Activity } from '../lib/types'
import Icon from '../components/Icon'

export default function Dashboard() {
  const { profile } = useAuth()
  const [studyTeam, setStudyTeam] = useState<string | null>(null)
  const [gameTeam, setGameTeam] = useState<string | null>(null)
  const [todayActs, setTodayActs] = useState<Activity[]>([])

  const now = new Date()
  const iso = now.toISOString().slice(0, 10)
  const today = now.toLocaleDateString('ro-RO', {
    weekday: 'long', day: 'numeric', month: 'long',
  })

  useEffect(() => {
    async function load() {
      if (profile?.study_team_id) {
        const { data } = await supabase
          .from('study_teams').select('name').eq('id', profile.study_team_id).maybeSingle()
        setStudyTeam((data as { name: string } | null)?.name ?? null)
      }
      if (profile?.game_team_id) {
        const { data } = await supabase
          .from('game_teams').select('name').eq('id', profile.game_team_id).maybeSingle()
        setGameTeam((data as { name: string } | null)?.name ?? null)
      }
      const { data: acts } = await supabase
        .from('activities').select('*').eq('day', iso)
        .order('start_time', { nullsFirst: true })
      setTodayActs((acts as Activity[]) ?? [])
    }
    load()
  }, [profile?.study_team_id, profile?.game_team_id, iso])

  const firstName = (profile?.full_name || '').split(' ')[0] || 'organizator'

  return (
    <div className="page">
      <header className="page-head">
        <h1>Salut, {firstName}!</h1>
        <p className="muted" style={{ textTransform: 'capitalize' }}>{today}</p>
      </header>

      <section className="dash-grid">
        <div className="card span-2">
          <div className="card-head">
            <Icon name="orar" size={18} />
            <h2>Programul zilei</h2>
            <Link to="/orar" className="card-link">Vezi orarul</Link>
          </div>
          {todayActs.length === 0 ? (
            <p className="muted">Nimic programat pentru azi (sau orarul nu e completat încă).</p>
          ) : (
            <ul className="today-list">
              {todayActs.map((a) => (
                <li key={a.id}>
                  <span className="today-time">{a.start_time ? a.start_time.slice(0, 5) : '—'}</span>
                  <span className="today-title">{a.title}</span>
                  {a.location && <span className="muted small">📍 {a.location}</span>}
                </li>
              ))}
            </ul>
          )}
        </div>

        <Link to="/echipe-studiu" className="card shortcut">
          <div className="card-head">
            <Icon name="studiu-team" size={18} />
            <h2>Echipa mea de studiu</h2>
          </div>
          <p className="shortcut-value">{studyTeam || 'Neatribuită'}</p>
          <span className="card-cta">Deschide echipa →</span>
        </Link>

        <Link to="/echipe-jocuri" className="card shortcut">
          <div className="card-head">
            <Icon name="jocuri-team" size={18} />
            <h2>Echipa mea de jocuri</h2>
          </div>
          <p className="shortcut-value">{gameTeam || 'Neatribuită'}</p>
          <span className="card-cta">Deschide echipa →</span>
        </Link>

        <Link to="/todo" className="card shortcut">
          <div className="card-head">
            <Icon name="todo" size={18} />
            <h2>Task-urile mele</h2>
          </div>
          <p className="muted">Ce ți-ai asumat va apărea aici.</p>
          <span className="card-cta">Deschide to-do →</span>
        </Link>
      </section>
    </div>
  )
}
