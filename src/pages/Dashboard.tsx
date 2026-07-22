import { useEffect, useState, useCallback } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../context/AuthProvider'
import { supabase } from '../lib/supabase'
import type { Activity, Task } from '../lib/types'
import Icon from '../components/Icon'

export default function Dashboard() {
  const { profile } = useAuth()
  const [studyTeam, setStudyTeam] = useState<string | null>(null)
  const [gameTeam, setGameTeam] = useState<string | null>(null)
  const [todayActs, setTodayActs] = useState<Activity[]>([])
  const [myTasks, setMyTasks] = useState<Task[]>([])

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

  const loadTasks = useCallback(async () => {
    if (!profile?.id) return
    const { data } = await supabase.from('tasks').select('*').eq('done', false)
      .order('due_at', { nullsFirst: false }).order('created_at', { ascending: false })
    const mine = (data as Task[] ?? []).filter(
      (t) => t.assigned_all || t.assigned_to === profile.id || t.claimed_by === profile.id
    )
    setMyTasks(mine)
  }, [profile?.id])

  useEffect(() => {
    loadTasks()
    let t: ReturnType<typeof setTimeout>
    const ch = supabase.channel('dash-tasks')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'tasks' },
        () => { clearTimeout(t); t = setTimeout(loadTasks, 300) })
      .subscribe()
    return () => { clearTimeout(t); supabase.removeChannel(ch) }
  }, [loadTasks])

  async function toggleDone(task: Task) {
    setMyTasks((prev) => prev.filter((x) => x.id !== task.id))
    await supabase.from('tasks').update({ done: true, done_at: new Date().toISOString() }).eq('id', task.id)
  }

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

        <div className="card span-2">
          <div className="card-head">
            <Icon name="todo" size={18} />
            <h2>Task-urile mele ({myTasks.length})</h2>
            <Link to="/todo" className="card-link">Toate</Link>
          </div>
          {myTasks.length === 0 ? (
            <p className="muted">Nu ai niciun task activ. 🎉</p>
          ) : (
            <ul className="dash-tasks">
              {myTasks.map((t) => (
                <li key={t.id}>
                  <input type="checkbox" checked={false} onChange={() => toggleDone(t)} title="Marchează gata" />
                  <div className="dash-task-main">
                    <span className="today-title">{t.title}</span>
                    <div className="dash-task-meta">
                      {t.assigned_all && <span className="badge-all">📌 toți</span>}
                      {!t.assigned_all && t.assigned_to === profile?.id && <span className="badge-all">📌 ție</span>}
                      {t.claimed_by === profile?.id && <span className="muted small">asumat</span>}
                      {t.due_at && <span className="muted small">⏰ {new Date(t.due_at).toLocaleString('ro-RO', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}</span>}
                    </div>
                  </div>
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
      </section>
    </div>
  )
}
