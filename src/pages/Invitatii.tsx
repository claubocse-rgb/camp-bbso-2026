import { useEffect, useState, useCallback, useRef } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthProvider'

type P = { id: string; full_name: string; email: string | null; access_token: string; status: string; consent_accepted: boolean }

function portalLink(token: string) {
  return `${window.location.origin}${import.meta.env.BASE_URL}p/${token}`
}

export default function Invitatii() {
  const { profile } = useAuth()
  const isAdmin = profile?.role === 'admin'
  const [people, setPeople] = useState<P[]>([])
  const [departure, setDeparture] = useState('')
  const [regulament, setRegulament] = useState('')
  const [loading, setLoading] = useState(true)
  const [savedMsg, setSavedMsg] = useState('')
  const [busy, setBusy] = useState(false)
  const [onlyConfirmed, setOnlyConfirmed] = useState(true)
  const [copiedId, setCopiedId] = useState<string | null>(null)
  const [subject, setSubject] = useState('Pagina ta pentru tabăra BBSO 2026')
  const [message, setMessage] = useState('Salut! Îți trimitem pagina ta personală pentru tabără. Acolo vezi camera în care stai, cu cine, ora de plecare, orarul și regulamentul — și te rugăm să confirmi (semnezi) și să ne spui mărimea ta de tricou. Mulțumim!')
  const [sending, setSending] = useState(false)
  const [sendResult, setSendResult] = useState('')
  const fileRef = useRef<HTMLInputElement>(null)

  const load = useCallback(async () => {
    const [{ data: p }, { data: s }] = await Promise.all([
      supabase.from('participants').select('id, full_name, email, access_token, status, consent_accepted').order('full_name'),
      supabase.from('camp_settings').select('*'),
    ])
    setPeople((p as P[]) ?? [])
    const map: Record<string, string> = {}
    ;(s ?? []).forEach((x: any) => (map[x.key] = x.value))
    setDeparture(map.departure ?? '')
    setRegulament(map.regulament_url ?? '')
    setLoading(false)
  }, [])
  useEffect(() => { load() }, [load])

  async function saveDeparture() {
    await supabase.from('camp_settings').upsert({ key: 'departure', value: departure }, { onConflict: 'key' })
    flash('Ora plecării salvată')
  }
  async function uploadRegulament(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setBusy(true)
    const path = `regulament-${Date.now()}.pdf`
    const up = await supabase.storage.from('public-docs').upload(path, file, { contentType: file.type || 'application/pdf', upsert: true })
    if (up.error) { flash('Eroare: ' + up.error.message); setBusy(false); return }
    const url = supabase.storage.from('public-docs').getPublicUrl(path).data.publicUrl
    await supabase.from('camp_settings').upsert({ key: 'regulament_url', value: url }, { onConflict: 'key' })
    setRegulament(url); setBusy(false); flash('Regulament încărcat')
  }
  async function removeRegulament() {
    await supabase.from('camp_settings').upsert({ key: 'regulament_url', value: '' }, { onConflict: 'key' })
    setRegulament(''); flash('Regulament scos')
  }
  function flash(m: string) { setSavedMsg(m); setTimeout(() => setSavedMsg(''), 2500) }

  async function copyOne(p: P) {
    await navigator.clipboard.writeText(portalLink(p.access_token))
    setCopiedId(p.id); setTimeout(() => setCopiedId(null), 1500)
  }
  async function copyAll() {
    const rows = list.map((p) => `${p.full_name}\t${p.email ?? ''}\t${portalLink(p.access_token)}`).join('\n')
    await navigator.clipboard.writeText('Nume\tEmail\tLink\n' + rows)
    flash(`${list.length} linkuri copiate (Nume / Email / Link)`)
  }

  const linkBase = () => `${window.location.origin}${import.meta.env.BASE_URL}p/`
  async function sendTest() {
    if (!profile?.email) { setSendResult('Nu am emailul tău.'); return }
    setSending(true); setSendResult('')
    const { data, error } = await supabase.functions.invoke('send-invites', {
      body: { subject, message, link_base: linkBase(), only_confirmed: onlyConfirmed, test_email: profile.email },
    })
    setSending(false)
    setSendResult(error ? 'Eroare: ' + error.message : `Test trimis la ${profile.email}. Verifică inbox/spam.`)
  }
  async function sendAll() {
    const n = people.filter((p) => p.email && (!onlyConfirmed || p.status !== 'rezerva')).length
    if (!confirm(`Trimit emailul la toți cei ${n} cu adresă de email? (${onlyConfirmed ? 'doar confirmați' : 'toți'})`)) return
    setSending(true); setSendResult('')
    const { data, error } = await supabase.functions.invoke('send-invites', {
      body: { subject, message, link_base: linkBase(), only_confirmed: onlyConfirmed },
    })
    setSending(false)
    if (error) { setSendResult('Eroare: ' + error.message); return }
    const r = data as { sent: number; total: number; errors?: string[]; more_errors?: number }
    setSendResult(`Trimise: ${r.sent}/${r.total}.` + (r.errors?.length ? ` Erori (${r.errors.length}${r.more_errors ? '+' + r.more_errors : ''}): ${r.errors.join(' · ')}` : ' Fără erori.'))
  }

  if (!isAdmin) return <div className="page"><header className="page-head"><h1>Invitații</h1></header><p className="muted">Doar administratorii.</p></div>

  const list = onlyConfirmed ? people.filter((p) => p.status !== 'rezerva') : people

  return (
    <div className="page">
      <header className="page-head">
        <h1>Invitații participanți</h1>
        <p className="muted">Fiecare participant are un link personal — îl trimiți pe email. Vede camera, colegii, ora plecării, orarul, regulamentul și își alege mărimea de tricou.</p>
      </header>

      {savedMsg && <div className="flash">{savedMsg}</div>}

      {loading ? <div className="spinner-inline"><div className="spinner" /></div> : (
        <>
          <section className="portal-settings">
            <div className="card">
              <h2>🚌 Ora plecării</h2>
              <div className="inline-form">
                <input value={departure} onChange={(e) => setDeparture(e.target.value)} placeholder="ex. Duminică 23 aug, ora 11:30" />
                <button className="btn-primary" onClick={saveDeparture}>Salvează</button>
              </div>
            </div>
            <div className="card">
              <h2>📋 Regulament (PDF)</h2>
              {regulament ? (
                <div className="inline-form">
                  <a className="btn-secondary" href={regulament} target="_blank" rel="noreferrer">Vezi regulamentul</a>
                  <button className="link-btn danger" onClick={removeRegulament}>Scoate</button>
                </div>
              ) : <p className="muted small">Niciun regulament încărcat.</p>}
              <input ref={fileRef} type="file" accept="application/pdf" onChange={uploadRegulament} disabled={busy} style={{ marginTop: 8 }} />
            </div>
          </section>

          <section className="card" style={{ marginTop: 22 }}>
            <h2>✉️ Trimite pe email</h2>
            <p className="muted small">Fiecare primește linkul lui personal + mesajul de mai jos. Testează întâi la tine, apoi trimite la toți.</p>
            <div className="form" style={{ marginTop: 10 }}>
              <label>Subiect<input value={subject} onChange={(e) => setSubject(e.target.value)} /></label>
              <label>Mesaj<textarea rows={5} value={message} onChange={(e) => setMessage(e.target.value)} /></label>
              <div className="email-actions">
                <button className="btn-secondary" onClick={sendTest} disabled={sending}>{sending ? 'Se trimite…' : 'Trimite test la mine'}</button>
                <button className="btn-primary" onClick={sendAll} disabled={sending}>Trimite la toți</button>
              </div>
              {sendResult && <p className={'small ' + (sendResult.startsWith('Eroare') ? 'error-text' : 'muted')}>{sendResult}</p>}
            </div>
          </section>

          <section style={{ marginTop: 22 }}>
            <div className="page-head with-action">
              <h2 style={{ fontSize: '1.05rem' }}>Linkuri personale ({list.length}) · {list.filter((p) => p.consent_accepted).length} au semnat</h2>
              <div className="head-actions">
                <label className="check-row" style={{ fontSize: '.85rem' }}>
                  <input type="checkbox" checked={onlyConfirmed} onChange={(e) => setOnlyConfirmed(e.target.checked)} /> doar confirmați
                </label>
                <button className="btn-primary" onClick={copyAll}>Copiază toate</button>
              </div>
            </div>
            <p className="muted small">„Copiază toate" pune în clipboard un tabel Nume / Email / Link — îl lipești în Excel sau în unealta de email (mail merge).</p>
            <div className="table-wrap">
              <table className="p-table">
                <thead><tr><th>Nume</th><th>Semnat</th><th>Email</th><th>Link personal</th><th></th></tr></thead>
                <tbody>
                  {list.map((p) => (
                    <tr key={p.id}>
                      <td>{p.full_name}</td>
                      <td className="cazat-cell">{p.consent_accepted ? <span className="cazat-check" title="A semnat">✓</span> : <span className="cazat-no">·</span>}</td>
                      <td className="muted small">{p.email || '—'}</td>
                      <td className="muted small link-cell">{portalLink(p.access_token)}</td>
                      <td className="nowrap">
                        <button className="link-btn" onClick={() => copyOne(p)}>{copiedId === p.id ? '✓ copiat' : 'Copiază'}</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        </>
      )}
    </div>
  )
}
