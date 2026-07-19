import { useEffect, useState, useRef, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthProvider'
import { useOrganizers } from '../lib/hooks'
import { sendPush } from '../lib/push'
import type { Message, ProfileLite } from '../lib/types'

export default function Chat() {
  const { profile } = useAuth()
  const organizers = useOrganizers()
  const [messages, setMessages] = useState<Message[]>([])
  const [text, setText] = useState('')
  const [loading, setLoading] = useState(true)
  const endRef = useRef<HTMLDivElement>(null)

  const scrollDown = useCallback(() => {
    setTimeout(() => endRef.current?.scrollIntoView({ behavior: 'smooth' }), 50)
  }, [])

  useEffect(() => {
    supabase.from('messages').select('*').eq('channel', 'general')
      .order('created_at').limit(300)
      .then(({ data }) => { setMessages((data as Message[]) ?? []); setLoading(false); scrollDown() })

    const ch = supabase.channel('chat-general')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages', filter: 'channel=eq.general' },
        (payload) => { setMessages((prev) => [...prev, payload.new as Message]); scrollDown() })
      .subscribe()
    return () => { supabase.removeChannel(ch) }
  }, [scrollDown])

  async function send(e: React.FormEvent) {
    e.preventDefault()
    const body = text.trim()
    if (!body || !profile) return
    setText('')
    await supabase.from('messages').insert({ channel: 'general', sender_id: profile.id, body })
    await sendPush({
      all: true, exclude: [profile.id],
      title: `💬 ${profile.full_name || 'Mesaj nou'}`,
      body, link: '/chat',
    })
  }

  function sender(id: string): ProfileLite | undefined { return organizers.find((o) => o.id === id) }

  return (
    <div className="page chat-page">
      <header className="page-head">
        <h1>Chat</h1>
        <p className="muted">Canal general al organizatorilor — live.</p>
      </header>

      <div className="chat-window">
        {loading ? <div className="spinner-inline"><div className="spinner" /></div> : (
          messages.length === 0 ? <p className="muted" style={{ textAlign: 'center', marginTop: 20 }}>Niciun mesaj încă. Scrie primul!</p> : (
            messages.map((m) => {
              const mine = m.sender_id === profile?.id
              const s = sender(m.sender_id)
              return (
                <div key={m.id} className={'msg' + (mine ? ' mine' : '')}>
                  {!mine && (
                    s?.avatar_url
                      ? <img className="msg-av" src={s.avatar_url} alt="" />
                      : <div className="msg-av placeholder">{(s?.full_name || s?.email || '?').charAt(0).toUpperCase()}</div>
                  )}
                  <div className="msg-bubble">
                    {!mine && <div className="msg-sender">{s?.full_name || s?.email || 'Cineva'}</div>}
                    <div className="msg-body">{m.body}</div>
                    <div className="msg-time">{new Date(m.created_at).toLocaleTimeString('ro-RO', { hour: '2-digit', minute: '2-digit' })}</div>
                  </div>
                </div>
              )
            })
          )
        )}
        <div ref={endRef} />
      </div>

      <form className="chat-input" onSubmit={send}>
        <input value={text} onChange={(e) => setText(e.target.value)} placeholder="Scrie un mesaj…" />
        <button className="btn-primary" type="submit" disabled={!text.trim()}>Trimite</button>
      </form>
    </div>
  )
}
