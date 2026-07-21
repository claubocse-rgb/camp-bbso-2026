import { useEffect, useState, useRef, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthProvider'
import { useOrganizers } from '../lib/hooks'
import { sendPush } from '../lib/push'
import type { Message, ProfileLite } from '../lib/types'

const norm = (s: string) => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')

export default function Chat() {
  const { profile } = useAuth()
  const organizers = useOrganizers()
  const [messages, setMessages] = useState<Message[]>([])
  const [text, setText] = useState('')
  const [loading, setLoading] = useState(true)
  const [mq, setMq] = useState<string | null>(null)
  const [mentioned, setMentioned] = useState<string[]>([])
  const endRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

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

  function onText(v: string) {
    setText(v)
    const m = v.match(/@([A-Za-zĂÂÎȘȚăâîșț.\-]*)$/)
    setMq(m ? m[1] : null)
  }

  function pickMention(o: ProfileLite) {
    const name = o.full_name || o.email || ''
    const next = text.replace(/@([A-Za-zĂÂÎȘȚăâîșț.\-]*)$/, '@' + name + ' ')
    setText(next)
    setMentioned((prev) => prev.includes(o.id) ? prev : [...prev, o.id])
    setMq(null)
    setTimeout(() => inputRef.current?.focus(), 0)
  }

  async function send(e: React.FormEvent) {
    e.preventDefault()
    const body = text.trim()
    if (!body || !profile) return
    setText(''); setMq(null)
    const mine = mentioned
    setMentioned([])
    await supabase.from('messages').insert({ channel: 'general', sender_id: profile.id, body })

    // cine e mentionat si inca apare in text
    const tagged = mine.filter((id) => {
      const o = organizers.find((x) => x.id === id)
      return o && body.includes('@' + (o.full_name || o.email || ''))
    }).filter((id) => id !== profile.id)

    const name = profile.full_name || 'Mesaj nou'
    // push general catre restul
    await sendPush({ all: true, exclude: [profile.id, ...tagged], title: `💬 ${name}`, body, link: '/chat' })
    // push + notificare in-app pentru cei mentionati
    if (tagged.length) {
      await sendPush({ profile_ids: tagged, title: `💬 ${name} te-a menționat`, body, link: '/chat' })
      await supabase.rpc('notify_profiles', { p_ids: tagged, p_title: `${name} te-a menționat în chat`, p_body: body, p_link: '/chat' })
    }
  }

  function sender(id: string): ProfileLite | undefined { return organizers.find((o) => o.id === id) }

  const mentionList = mq !== null
    ? organizers.filter((o) => o.id !== profile?.id && norm(o.full_name || o.email || '').includes(norm(mq))).slice(0, 6)
    : []

  return (
    <div className="page chat-page">
      <header className="page-head">
        <h1>Chat</h1>
        <p className="muted">Canal general al organizatorilor — live. Scrie <b>@</b> ca să menționezi pe cineva.</p>
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
        {mentionList.length > 0 && (
          <div className="mention-pop">
            {mentionList.map((o) => (
              <button type="button" key={o.id} className="mention-item" onClick={() => pickMention(o)}>
                {o.avatar_url
                  ? <img className="mention-av" src={o.avatar_url} alt="" />
                  : <span className="mention-av placeholder">{(o.full_name || o.email || '?').charAt(0).toUpperCase()}</span>}
                <span>{o.full_name || o.email}</span>
              </button>
            ))}
          </div>
        )}
        <input ref={inputRef} value={text} onChange={(e) => onText(e.target.value)} placeholder="Scrie un mesaj… (@ pentru mențiune)" />
        <button className="btn-primary" type="submit" disabled={!text.trim()}>Trimite</button>
      </form>
    </div>
  )
}
