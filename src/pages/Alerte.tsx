import { useEffect, useState, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthProvider'
import { useOrganizers, organizerName } from '../lib/hooks'
import { sendPush } from '../lib/push'
import Modal from '../components/Modal'

type Alert = { id: string; sender_id: string | null; title: string; body: string | null; audience: string; created_at: string }

export default function Alerte() {
  const { profile } = useAuth()
  const organizers = useOrganizers()
  const isAdmin = profile?.role === 'admin'
  const [alerts, setAlerts] = useState<Alert[]>([])
  const [loading, setLoading] = useState(true)
  const [modal, setModal] = useState(false)

  const load = useCallback(async () => {
    const { data } = await supabase.from('alerts').select('*').order('created_at', { ascending: false }).limit(50)
    setAlerts((data as Alert[]) ?? [])
    setLoading(false)
  }, [])
  useEffect(() => { load() }, [load])

  return (
    <div className="page">
      <header className="page-head with-action">
        <div>
          <h1>Alerte</h1>
          <p className="muted">Anunțuri către toți organizatorii sau nominal.</p>
        </div>
        {isAdmin && <button className="btn-primary" onClick={() => setModal(true)}>+ Trimite alertă</button>}
      </header>

      {!isAdmin && <p className="muted small">Doar administratorii pot trimite alerte. Aici vezi istoricul.</p>}

      {loading ? <div className="spinner-inline"><div className="spinner" /></div> : (
        alerts.length === 0 ? <p className="muted">Nicio alertă trimisă încă.</p> : (
          <div className="cards-list">
            {alerts.map((a) => (
              <div key={a.id} className="list-card alert-card">
                <div className="list-card-main">
                  <h3>🔔 {a.title}</h3>
                  {a.body && <p className="muted small">{a.body}</p>}
                  <div className="act-meta">
                    <span className={'badge-audience ' + a.audience}>{a.audience === 'all' ? 'Toți' : 'Nominal'}</span>
                    <span>{organizerName(organizers, a.sender_id)}</span>
                    <span>{new Date(a.created_at).toLocaleString('ro-RO', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )
      )}

      {modal && isAdmin && (
        <Modal title="Trimite alertă" onClose={() => setModal(false)}>
          <AlertForm organizers={organizers} onDone={() => { setModal(false); load() }} />
        </Modal>
      )}
    </div>
  )
}

function AlertForm({
  organizers, onDone,
}: {
  organizers: ReturnType<typeof useOrganizers>; onDone: () => void
}) {
  const [title, setTitle] = useState('')
  const [body, setBody] = useState('')
  const [audience, setAudience] = useState<'all' | 'nominal'>('all')
  const [selected, setSelected] = useState<string[]>([])
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  function toggle(id: string) {
    setSelected((prev) => prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id])
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    if (!title.trim()) { setError('Pune un titlu.'); return }
    if (audience === 'nominal' && selected.length === 0) { setError('Alege cel puțin o persoană.'); return }
    setBusy(true); setError('')
    const { error } = await supabase.rpc('broadcast_alert', {
      p_title: title.trim(), p_body: body || null, p_audience: audience,
      p_recipient_ids: audience === 'nominal' ? selected : null,
    })
    if (error) { setError('Eroare: ' + error.message); setBusy(false); return }
    // push pe telefon (best-effort)
    if (audience === 'nominal') await sendPush({ profile_ids: selected, title: title.trim(), body: body || undefined, link: '/alerte' })
    else await sendPush({ all: true, title: title.trim(), body: body || undefined, link: '/alerte' })
    onDone()
  }

  return (
    <form className="form" onSubmit={submit}>
      <label>Titlu
        <input autoFocus value={title} onChange={(e) => setTitle(e.target.value)} placeholder="ex. Ne adunăm în 10 min la sala mare" />
      </label>
      <label>Mesaj (opțional)
        <textarea value={body} onChange={(e) => setBody(e.target.value)} rows={3} />
      </label>
      <label>Către
        <select value={audience} onChange={(e) => setAudience(e.target.value as 'all' | 'nominal')}>
          <option value="all">Toți organizatorii</option>
          <option value="nominal">Anumite persoane</option>
        </select>
      </label>
      {audience === 'nominal' && (
        <div className="picker">
          {organizers.map((o) => (
            <label key={o.id} className="picker-item">
              <input type="checkbox" checked={selected.includes(o.id)} onChange={() => toggle(o.id)} />
              <span>{o.full_name || o.email}</span>
            </label>
          ))}
        </div>
      )}
      {error && <p className="error-text">{error}</p>}
      <button className="btn-primary" type="submit" disabled={busy}>{busy ? 'Se trimite…' : 'Trimite alerta'}</button>
    </form>
  )
}
