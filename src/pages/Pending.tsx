import { useAuth } from '../context/AuthProvider'

export default function Pending() {
  const { profile, session, signOut } = useAuth()

  return (
    <div className="auth-screen">
      <div className="auth-card">
        <div className="auth-brand">
          <span className="brand-mark">BBSO</span>
          <span className="brand-year">2026</span>
        </div>
        <h1>Cont în așteptare</h1>
        {session ? (
          <>
            <p className="muted">
              Salut{profile?.full_name ? `, ${profile.full_name}` : ''}! Contul tău
              (<strong>{profile?.email || session.user.email}</strong>) nu este încă aprobat
              ca organizator.
            </p>
            <p className="muted">
              Roagă un administrator să te adauge pe lista de organizatori, apoi reîncarcă pagina.
            </p>
            <button className="btn-secondary" onClick={() => signOut()}>Ieșire</button>
          </>
        ) : (
          <p className="muted">Nu ești autentificat.</p>
        )}
      </div>
    </div>
  )
}
