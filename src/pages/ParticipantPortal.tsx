import { useEffect, useState, useCallback } from 'react'
import { useParams } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { CAMP_DAYS } from '../lib/week'

const TSHIRTS = ['XS', 'S', 'M', 'L', 'XL', 'XXL', '3XL']

type Portal = {
  participant: {
    full_name: string; first_name: string | null; age: number | null; tshirt_size: string | null; status: string
    consent_accepted: boolean; consent_name: string | null; consent_at: string | null
    parent_name: string | null; parent_phone: string | null
    emergency_name: string | null; emergency_phone: string | null
    medical_info: string | null; sign_date: string | null
  }
  room: { building: string; name: string; level: string | null; beds: string | null; bathroom: string | null } | null
  roommates: string[]
  activities: { day: string; start_time: string | null; end_time: string | null; title: string; location: string | null; kind: string }[]
  settings: Record<string, string>
}

function todayISO() {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
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
  const [signMsg, setSignMsg] = useState('')
  // câmpuri editabile ale declarației
  const [parentName, setParentName] = useState('')
  const [parentPhone, setParentPhone] = useState('')
  const [emgName, setEmgName] = useState('')
  const [emgPhone, setEmgPhone] = useState('')
  const [medical, setMedical] = useState('')
  const [signDate, setSignDate] = useState(todayISO())

  const load = useCallback(async () => {
    const { data: res, error } = await supabase.rpc('get_participant_portal', { p_token: token })
    if (error || !res) { setState('notfound'); return }
    const d = res as Portal
    setData(d); setSize(d.participant.tshirt_size ?? '')
    setSignName(d.participant.consent_name ?? d.participant.full_name)
    setParentName(d.participant.parent_name ?? '')
    setParentPhone(d.participant.parent_phone ?? '')
    setEmgName(d.participant.emergency_name ?? '')
    setEmgPhone(d.participant.emergency_phone ?? '')
    setMedical(d.participant.medical_info ?? '')
    setSignDate(d.participant.sign_date || todayISO())
    setState('ok')
  }, [token])
  useEffect(() => { load() }, [load])

  async function saveSize(newSize: string) {
    setSize(newSize)
    await supabase.rpc('set_participant_tshirt', { p_token: token, p_size: newSize })
    setSaved(true); setTimeout(() => setSaved(false), 2000)
  }
  async function signAndSend() {
    if (!agree || !signName.trim()) return
    setSignBusy(true); setSignMsg('')
    const { data: ok, error: rpcErr } = await supabase.rpc('set_participant_declaration', {
      p_token: token,
      p_data: {
        signer_name: signName.trim(),
        tshirt_size: size,
        parent_name: parentName.trim(),
        parent_phone: parentPhone.trim(),
        emergency_name: emgName.trim(),
        emergency_phone: emgPhone.trim(),
        medical_info: medical.trim(),
        sign_date: signDate,
      },
    })
    if (rpcErr || !ok) { setSignBusy(false); setSignMsg('Eroare la salvare. Mai încearcă o dată.'); return }
    // trimite regulamentul semnat pe email (organizatori + copie participant)
    const { error: fnErr } = await supabase.functions.invoke('sign-regulament', { body: { token } })
    await load()
    setSignBusy(false)
    setSignMsg(fnErr
      ? 'Am salvat semnătura. (Documentul complet se generează în câteva momente.)'
      : '✓ Gata! Regulamentul semnat a fost înregistrat. Mulțumim!')
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

  const declForm = (
    <div className="decl-form">
      <div className="decl-summary muted small">
        Participant: <b>{p.full_name}</b>{p.age != null ? ` · ${p.age} ani` : ''}{size ? ` · tricou ${size}` : ''}
      </div>
      <label className="sign-name">Nume părinte / tutore legal (pentru minori)
        <input value={parentName} onChange={(e) => setParentName(e.target.value)} placeholder="Nume și prenume" />
      </label>
      <label className="sign-name">Telefon părinte (WhatsApp)
        <input value={parentPhone} onChange={(e) => setParentPhone(e.target.value)} placeholder="07…" inputMode="tel" />
      </label>
      <label className="sign-name">Contact în caz de urgență — nume
        <input value={emgName} onChange={(e) => setEmgName(e.target.value)} placeholder="Nume și prenume" />
      </label>
      <label className="sign-name">Contact în caz de urgență — telefon
        <input value={emgPhone} onChange={(e) => setEmgPhone(e.target.value)} placeholder="07…" inputMode="tel" />
      </label>
      <label className="sign-name">Alergii / afecțiuni / info medicale
        <textarea rows={2} value={medical} onChange={(e) => setMedical(e.target.value)} placeholder="Scrie „nu e cazul” dacă nu există" />
      </label>
      <label className="sign-name">Data
        <input type="date" value={signDate} onChange={(e) => setSignDate(e.target.value)} />
      </label>
      <label className="agree-row">
        <input type="checkbox" checked={agree} onChange={(e) => setAgree(e.target.checked)} />
        <span>Am citit integral, am înțeles și sunt de acord cu regulamentul taberei și confirm datele de mai sus. (Pentru minori, semnătura aparține părintelui/tutorelui.)</span>
      </label>
      <label className="sign-name">Semnătură (nume complet)
        <input value={signName} onChange={(e) => setSignName(e.target.value)} placeholder="Nume și prenume" />
      </label>
      <button className="btn-primary" onClick={signAndSend} disabled={!agree || !signName.trim() || signBusy}>
        {signBusy ? 'Se trimite…' : '📩 Semnează și trimite regulamentul'}
      </button>
    </div>
  )

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
          <h2>✍️ Declarație & semnătură</h2>
          {p.consent_accepted ? (
            <>
              <p className="signed-ok">✓ Ai semnat{p.consent_at ? ` pe ${new Date(p.consent_at).toLocaleDateString('ro-RO', { day: 'numeric', month: 'long', year: 'numeric' })}` : ''}{p.consent_name ? ` · ${p.consent_name}` : ''}</p>
              <p className="muted small">Regulamentul semnat a fost înregistrat. Dacă vrei să corectezi ceva, completează din nou mai jos și retrimite.</p>
              <details className="resend-details">
                <summary>Modifică / retrimite</summary>
                {declForm}
              </details>
            </>
          ) : (
            <>
              <p className="muted small">Completează datele de mai jos, bifează acordul și semnează. Îți trimitem automat pe email regulamentul completat și semnat.</p>
              {declForm}
            </>
          )}
          {signMsg && <p className={'small ' + (signMsg.startsWith('✓') ? 'saved-note' : 'error-text')}>{signMsg}</p>}
        </section>

        {/* Orarul e ascuns momentan (nu e final). Se reactivează când e gata. */}

        <footer className="portal-foot muted small">Camp BBSO 2026 · Asociația Creștină Cristia</footer>
      </div>
    </div>
  )
}
