import { useEffect, useState, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthProvider'
import { useOrganizers, organizerName } from '../lib/hooks'
import type { Task } from '../lib/types'
import Modal from '../components/Modal'

export default function Todo() {
  const { profile } = useAuth()
  const organizers = useOrganizers()
  const [tasks, setTasks] = useState<Task[]>([])
  const [loading, setLoading] = useState(true)
  const [modal, setModal] = useState(false)

  const load = useCallback(async () => {
    const { data } = await supabase.from('tasks').select('*')
      .order('done').order('created_at', { ascending: false })
    setTasks((data as Task[]) ?? [])
    setLoading(false)
  }, [])

  useEffect(() => {
    load()
    const ch = supabase.channel('tasks-rt')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'tasks' }, () => load())
      .subscribe()
    return () => { supabase.removeChannel(ch) }
  }, [load])

  async function addTask(title: string, description: string, due: string) {
    if (!title.trim()) return
    await supabase.from('tasks').insert({
      title: title.trim(), description: description || null,
      due_at: due ? new Date(due).toISOString() : null, created_by: profile?.id,
    })
    setModal(false)
  }
  async function claim(t: Task) {
    const mine = t.claimed_by === profile?.id
    await supabase.from('tasks').update({
      claimed_by: mine ? null : profile?.id,
      claimed_at: mine ? null : new Date().toISOString(),
    }).eq('id', t.id)
  }
  async function toggleDone(t: Task) {
    await supabase.from('tasks').update({
      done: !t.done, done_at: !t.done ? new Date().toISOString() : null,
    }).eq('id', t.id)
  }
  async function remove(t: Task) {
    if (!confirm('Ștergi task-ul?')) return
    await supabase.from('tasks').delete().eq('id', t.id)
  }

  const open = tasks.filter((t) => !t.done)
  const done = tasks.filter((t) => t.done)

  return (
    <div className="page">
      <header className="page-head with-action">
        <div>
          <h1>To-do</h1>
          <p className="muted">Task-uri pe care ți le poți asuma. Se actualizează live.</p>
        </div>
        <button className="btn-primary" onClick={() => setModal(true)}>+ Task</button>
      </header>

      {loading ? <div className="spinner-inline"><div className="spinner" /></div> : (
        <>
          <div className="cards-list">
            {open.length === 0 && <p className="muted">Niciun task deschis. 🎉</p>}
            {open.map((t) => (
              <TaskRow key={t.id} t={t} me={profile?.id} organizers={organizers}
                onClaim={() => claim(t)} onDone={() => toggleDone(t)} onDelete={() => remove(t)} />
            ))}
          </div>

          {done.length > 0 && (
            <>
              <h2 className="section-sep">Finalizate ({done.length})</h2>
              <div className="cards-list">
                {done.map((t) => (
                  <TaskRow key={t.id} t={t} me={profile?.id} organizers={organizers}
                    onClaim={() => claim(t)} onDone={() => toggleDone(t)} onDelete={() => remove(t)} />
                ))}
              </div>
            </>
          )}
        </>
      )}

      {modal && (
        <Modal title="Task nou" onClose={() => setModal(false)}>
          <TaskForm onSave={addTask} />
        </Modal>
      )}
    </div>
  )
}

function TaskRow({
  t, me, organizers, onClaim, onDone, onDelete,
}: {
  t: Task; me?: string; organizers: ReturnType<typeof useOrganizers>
  onClaim: () => void; onDone: () => void; onDelete: () => void
}) {
  const mine = t.claimed_by === me
  return (
    <div className={'task-row' + (t.done ? ' is-done' : '')}>
      <button className={'check' + (t.done ? ' on' : '')} onClick={onDone} title={t.done ? 'Redeschide' : 'Marchează gata'}>
        {t.done ? '✓' : ''}
      </button>
      <div className="task-main">
        <div className="task-title">{t.title}</div>
        {t.description && <div className="muted small">{t.description}</div>}
        <div className="act-meta">
          {t.due_at && <span>⏰ {new Date(t.due_at).toLocaleString('ro-RO', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}</span>}
          {t.claimed_by && <span className={mine ? 'claimed-me' : ''}>👤 {mine ? 'Tu' : organizerName(organizers, t.claimed_by)}</span>}
        </div>
      </div>
      <div className="task-actions">
        <button className={mine ? 'btn-secondary' : 'btn-primary'} onClick={onClaim} style={{ padding: '6px 12px', fontSize: '.82rem' }}>
          {mine ? 'Renunț' : t.claimed_by ? 'Preia' : 'Îmi asum'}
        </button>
        <button className="link-btn danger" onClick={onDelete}>Șterge</button>
      </div>
    </div>
  )
}

function TaskForm({ onSave }: { onSave: (title: string, description: string, due: string) => void }) {
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [due, setDue] = useState('')
  return (
    <form className="form" onSubmit={(e) => { e.preventDefault(); onSave(title, description, due) }}>
      <label>Ce e de făcut
        <input autoFocus value={title} onChange={(e) => setTitle(e.target.value)} placeholder="ex. Pregătit materiale pentru jocul de seară" />
      </label>
      <label>Detalii (opțional)
        <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={2} />
      </label>
      <label>Termen (opțional)
        <input type="datetime-local" value={due} onChange={(e) => setDue(e.target.value)} />
      </label>
      <button className="btn-primary" type="submit">Adaugă</button>
    </form>
  )
}
