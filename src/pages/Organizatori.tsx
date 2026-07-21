import { useEffect, useState, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthProvider'

type Prof = { id: string; email: string; full_name: string | null; avatar_url: string | null; role: string; created_at: string }
type Allowed = { email: string; role: string; invited_at: string }

export default function Organizatori() {
  const { profile } = useAuth()
  const isAdmin = profile?.role === 'admin'
  const [profs, setProfs] = useState<Prof[]>([])
  const [allowed, setAllowed] = useState<Allowed[]>([])
  const [loading, setLoading] = useState(true)
  const [newEmail, setNewEmail] = useState('')

  const load = useCallback(async () => {
    const [{ data: p }, { data: a }] = await Promise.all([
      supabase.from('profiles').select('id, email, full_name, avatar_url, role, created_at').order('created_at'),
      supabase.from('allowed_organizers').select('*').order('invited_at'),
    ])
    setProfs((p as Prof[]) ?? [])
    setAllowed((a as Allowed[]) ?? [])
    setLoading(false)
  }, [])

  useEffect(() => {
    load()
    if (!isAdmin || !profile) return
    // reincarca live cand apare/schimba un profil
    const ch = supabase.channel('profiles-admin')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'profiles' }, () => load())
      .subscribe()
    return () => { supabase.removeChannel(ch) }
  }, [load, isAdmin, profile])

  async function setRole(p: Prof, role: string) {
    await supabase.from('profiles').update({ role }).eq('id', p.id)
    // pastreaza pe lista de allowlist ca sa ramana aprobat
    await supabase.from('allowed_organizers').upsert({ email: p.email, role: role === 'admin' ? 'admin' : 'organizer' }, { onConflict: 'email' })
    load()
  }
  async function removeAccess(p: Prof) {
    if (p.id === profile?.id) { alert('Nu te poți scoate pe tine.'); return }
    if (!confirm(`Scoți accesul pentru ${p.full_name || p.email}?`)) return
    await supabase.from('profiles').delete().eq('id', p.id)
    await supabase.from('allowed_organizers').delete().eq('email', p.email)
    load()
  }
  async function preApprove(e: React.FormEvent) {
    e.preventDefault()
    const email = newEmail.trim().toLowerCase()
    if (!email) return
    await supabase.from('allowed_organizers').upsert({ email, role: 'organizer' }, { onConflict: 'email' })
    setNewEmail(''); load()
  }
  async function removeAllowed(email: string) {
    await supabase.from('allowed_organizers').delete().eq('email', email); load()
  }

  if (!isAdmin) {
    return (
      <div className="page">
        <header className="page-head"><h1>Organizatori</h1></header>
        <p className="muted">Doar administratorii pot gestiona accesul organizatorilor.</p>
      </div>
    )
  }

  const pending = profs.filter((p) => p.role === 'pending')
  const active = profs.filter((p) => p.role !== 'pending')

  return (
    <div className="page">
      <header className="page-head">
        <h1>Organizatori</h1>
        <p className="muted">Aprobă cine are acces la aplicație.</p>
      </header>

      {loading ? <div className="spinner-inline"><div className="spinner" /></div> : (
        <>
          <section className="org-section">
            <h2 className="org-h">În așteptare {pending.length > 0 && <span className="pending-badge">{pending.length}</span>}</h2>
            {pending.length === 0 ? <p className="muted small">Nicio cerere de acces.</p> : (
              <div className="cards-list">
                {pending.map((p) => (
                  <div key={p.id} className="list-card">
                    <div className="list-card-main">
                      <PersonHead p={p} />
                    </div>
                    <div className="org-actions">
                      <button className="btn-primary" onClick={() => setRole(p, 'organizer')}>Aprobă</button>
                      <button className="btn-secondary" onClick={() => setRole(p, 'admin')}>Ca admin</button>
                      <button className="link-btn danger" onClick={() => removeAccess(p)}>Respinge</button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>

          <section className="org-section">
            <h2 className="org-h">Activi ({active.length})</h2>
            <div className="cards-list">
              {active.map((p) => (
                <div key={p.id} className="list-card">
                  <div className="list-card-main"><PersonHead p={p} /></div>
                  <div className="org-actions">
                    <select value={p.role} onChange={(e) => setRole(p, e.target.value)} disabled={p.id === profile?.id}>
                      <option value="organizer">Organizator</option>
                      <option value="admin">Administrator</option>
                    </select>
                    <button className="link-btn danger" onClick={() => removeAccess(p)} disabled={p.id === profile?.id}>Scoate</button>
                  </div>
                </div>
              ))}
            </div>
          </section>

          <section className="org-section">
            <h2 className="org-h">Pre-aprobă un email</h2>
            <p className="muted small">Adaugă emailul dinainte — când se loghează prima dată cu Google, intră direct, fără așteptare.</p>
            <form className="pre-approve" onSubmit={preApprove}>
              <input value={newEmail} onChange={(e) => setNewEmail(e.target.value)} placeholder="email@exemplu.com" type="email" />
              <button className="btn-primary" type="submit">Adaugă</button>
            </form>
            {allowed.length > 0 && (
              <ul className="allowed-list">
                {allowed.map((a) => (
                  <li key={a.email}>
                    <span>{a.email} <span className="muted small">({a.role})</span></span>
                    <button className="link-btn danger" onClick={() => removeAllowed(a.email)}>✕</button>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </>
      )}
    </div>
  )
}

function PersonHead({ p }: { p: { full_name: string | null; email: string; avatar_url: string | null } }) {
  return (
    <div className="person-head">
      {p.avatar_url
        ? <img className="me-avatar" src={p.avatar_url} alt="" />
        : <div className="me-avatar placeholder">{(p.full_name || p.email || '?').charAt(0).toUpperCase()}</div>}
      <div>
        <div className="person-name">{p.full_name || '(fără nume)'}</div>
        <div className="muted small">{p.email}</div>
      </div>
    </div>
  )
}
