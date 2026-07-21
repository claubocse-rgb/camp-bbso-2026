import { useEffect, useState, useCallback } from 'react'
import { useParams } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { CAMP_DAYS } from '../lib/week'

const TSHIRTS = ['XS', 'S', 'M', 'L', 'XL', 'XXL', '3XL']

type Portal = {
  participant: { full_name: string; first_name: string | null; tshirt_size: string | null; status: string; consent_accepted: boolean; consent_name: string | null; consent_at: string | null }
  room: { building: string; name: string; level: string | null; beds: string | null; bathroom: string | null } | null
  roommates: string[]
  activities: { day: string; start_time: string | null; end_time: string | null; title: string; location: string | null; kind: string }[]
  settings: Record<string, string>
}

export default function ParticipantPortal() {
  const { token } = useParams()
  const [data, setData] = useState<Portal | null>(null)
  const [state, setState] = useState<'loading' | 'ok' | 'notfound'>('loading')
  const [size, setSize] = useState('')
  const [saved, setSaved] = useState(false)
  const [agree, setAgree] = useState(false)
  const [signName, setSignName] = useState('')
  const [signBusy, setSignBusy] = useState(false)

  const load = useCallback(async () => {
    const { data: res, error } = await supabase.rpc('get_participant_portal', { p_token: token })
    if (error || !res) { setState('notfound'); return }
    const d = res as Portal
    setData(d); setSize(d.participant.tshirt_size ?? '')
    setSignName(d.participant.consent_name ?? d.participant.full_name)
    setState('ok')
  }, [token])
  useEffect(() => { load() }, [load])

  async function saveSize(newSize: string) {
    setSize(newSize)
    await supabase.rpc('set_participant_tshirt', { p_token: token, p_size: newSize })
    setSaved(true); setTimeout(() => setSaved(false), 2000)
  }
  async function sign() {
    if (!agree || !signName.trim()) return
    setSignBusy(true)
    await supabase.rpc('set_participant_signature', { p_token: token, p_name: signName.trim() })
    await load()
    setSignBusy(false)
  }

  if (state === 'loading') return <div className="portal-screen"><div className="spinner" /></div>
  if (state === 'notfound' || !data) return (
    <div className="portal-screen">
      <div className="portal-card center">
        <div className="p-brand"><span className="brand-mark">BBSO</span><span className="brand-year">2026</span></div>
        <h1>Link invalid</h1>
        <p className="muted">Linkul tău nu este valid sau a expirat. Cere-i organizatorului unul nou.</p>
      </div>
    </div>
  )

  const p = data.participant
  const first = p.first_name || p.full_name.split(' ').slice(-1)[0]
  const acts = (day: string) => data.activities.filter((a) => a.day === day)
  const departure = data.settings.departure
  const regulament = data.settings.regulament_url

  return (
    <div className="portal-screen">
      <div className="portal-wrap">
        <header className="portal-head">
          <div className="p-brand"><span className="brand-mark">BBSO</span><span className="brand-year">2026</span></div>
          <h1>Salut, {first}!</h1>
          <p className="muted">Bine ai venit la Camp Cristia, Voroneț.</p>
          {p.status === 'rezerva' && <div className="rez-note">Ești pe lista de rezerve — te anunțăm dacă se eliberează un loc.</div>}
        </header>

        <section className="portal-card">
          <h2>🛏️ Camera ta</h2>
          {data.room ? (
            <>
              <p className="room-big">{data.room.building} · {data.room.name}{data.room.level ? ` · ${data.room.level}` : ''}</p>
              {data.room.beds && <p className="muted small">{data.room.beds}</p>}
              {data.room.bathroom && <p className="muted small">🚿 Baie: {data.room.bathroom}</p>}
              <div className="roommates">
                <strong>Colegi de cameră:</strong>
                {data.roommates.length === 0 ? <span className="muted"> — încă nimeni</span> : (
                  <ul>{data.roommates.map((r) => <li key={r}>{r}</li>)}</ul>
                )}
              </div>
            </>
          ) : <p className="muted">Repartizarea pe camere se face în curând.</p>}
        </section>

        {departure && (
          <section className="portal-card">
            <h2>🚌 Plecarea</h2>
            <p>{departure}</p>
          </section>
        )}

        <section className="portal-card">
          <h2>👕 Mărimea ta de tricou</h2>
          <p className="muted small">Alege mărimea ca să-ți pregătim tricoul.</p>
          <div className="size-grid">
            {TSHIRTS.map((s) => (
              <button key={s} className={'size-btn' + (size === s ? ' on' : '')} onClick={() => saveSize(s)}>{s}</button>
            ))}
          </div>
          {saved && <p className="saved-note">✓ Salvat</p>}
        </section>

        {regulament && (
          <section className="portal-card">
            <h2>📋 Regulament</h2>
            <a className="btn-primary" href={regulament} target="_blank" rel="noreferrer">Deschide regulamentul</a>
          </section>
        )}

        <section className="portal-card">
          <h2>✍️ Confirmare</h2>
          {p.consent_accepted ? (
            <p className="signed-ok">✓ Ai confirmat{p.consent_at ? ` pe ${new Date(p.consent_at).toLocaleDateString('ro-RO', { day: 'numeric', month: 'long', year: 'numeric' })}` : ''}{p.consent_name ? ` · ${p.consent_name}` : ''}</p>
          ) : (
            <>
              <label className="agree-row">
                <input type="checkbox" checked={agree} onChange={(e) => setAgree(e.target.checked)} />
                <span>Am citit și sunt de acord cu regulamentul taberei și confirm datele de mai sus.</span>
              </label>
              <label className="sign-name">Numele tău (semnătură)
                <input value={signName} onChange={(e) => setSignName(e.target.value)} placeholder="Nume și prenume" />
              </label>
              <button className="btn-primary" onClick={sign} disabled={!agree || !signName.trim() || signBusy}>{signBusy ? 'Se salvează…' : 'Semnează'}</button>
            </>
          )}
        </section>

        <section className="portal-card">
          <h2>🗓️ Orar</h2>
          {data.activities.length === 0 ? <p className="muted">Orarul se publică în curând.</p> : (
            CAMP_DAYS.map((day) => {
              const list = acts(day.date)
              if (list.length === 0) return null
              return (
                <div key={day.date} className="portal-day">
                  <h3>{day.label}</h3>
                  <ul className="portal-orar">
                    {list.map((a, i) => (
                      <li key={i}>
                        <span className="po-time">{a.start_time ? a.start_time.slice(0, 5) : ''}</span>
                        <span className="po-title">{a.title}{a.location ? ` · ${a.location}` : ''}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )
            })
          )}
        </section>

        <footer className="portal-foot muted small">Camp BBSO 2026 · Asociația Creștină Cristia</footer>
      </div>
    </div>
  )
}
