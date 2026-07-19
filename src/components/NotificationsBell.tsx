import { useEffect, useState, useCallback, useRef } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthProvider'
import Icon from './Icon'

type Notif = { id: string; type: string; title: string; body: string | null; read: boolean; created_at: string }

export default function NotificationsBell() {
  const { profile } = useAuth()
  const [items, setItems] = useState<Notif[]>([])
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  const load = useCallback(async () => {
    if (!profile) return
    const { data } = await supabase.from('notifications').select('*')
      .eq('profile_id', profile.id).order('created_at', { ascending: false }).limit(30)
    setItems((data as Notif[]) ?? [])
  }, [profile])

  useEffect(() => {
    load()
    if (!profile) return
    const ch = supabase.channel('notif-' + profile.id)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'notifications', filter: `profile_id=eq.${profile.id}` },
        (payload) => setItems((prev) => [payload.new as Notif, ...prev]))
      .subscribe()
    return () => { supabase.removeChannel(ch) }
  }, [load, profile])

  useEffect(() => {
    const onClick = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false) }
    document.addEventListener('mousedown', onClick)
    return () => document.removeEventListener('mousedown', onClick)
  }, [])

  const unread = items.filter((i) => !i.read).length

  async function markAllRead() {
    if (!profile || unread === 0) return
    setItems((prev) => prev.map((i) => ({ ...i, read: true })))
    await supabase.from('notifications').update({ read: true }).eq('profile_id', profile.id).eq('read', false)
  }

  return (
    <div className="bell-wrap" ref={ref}>
      <button className="bell-btn" onClick={() => { setOpen((o) => !o); if (!open) markAllRead() }} aria-label="Notificări">
        <Icon name="alerte" size={20} />
        {unread > 0 && <span className="bell-badge">{unread > 9 ? '9+' : unread}</span>}
      </button>
      {open && (
        <div className="bell-panel">
          <div className="bell-head">Notificări</div>
          {items.length === 0 ? (
            <div className="bell-empty">Nicio notificare.</div>
          ) : items.map((n) => (
            <div key={n.id} className={'bell-item' + (n.read ? '' : ' unread')}>
              <div className="bell-title">{n.title}</div>
              {n.body && <div className="bell-body">{n.body}</div>}
              <div className="bell-time">{new Date(n.created_at).toLocaleString('ro-RO', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
