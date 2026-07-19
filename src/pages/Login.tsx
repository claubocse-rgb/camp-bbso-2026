import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthProvider'

export default function Login() {
  const { session, profile, signInWithGoogle } = useAuth()
  const navigate = useNavigate()

  useEffect(() => {
    if (session && profile && profile.role !== 'pending') navigate('/', { replace: true })
    else if (session && profile?.role === 'pending') navigate('/pending', { replace: true })
  }, [session, profile, navigate])

  return (
    <div className="auth-screen">
      <div className="auth-card">
        <div className="auth-brand">
          <span className="brand-mark">BBSO</span>
          <span className="brand-year">2026</span>
        </div>
        <h1>Organizare tabără</h1>
        <p className="muted">Acces doar pentru echipa de organizatori.</p>
        <button className="btn-google" onClick={() => signInWithGoogle()}>
          <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden="true">
            <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.4 29.3 35 24 35c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.9 1.2 8 3.1l5.7-5.7C34.6 6.1 29.6 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.3-.4-3.5z"/>
            <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 16 19 13 24 13c3.1 0 5.9 1.2 8 3.1l5.7-5.7C34.6 6.1 29.6 4 24 4 16.3 4 9.7 8.3 6.3 14.7z"/>
            <path fill="#4CAF50" d="M24 44c5.2 0 10-2 13.6-5.2l-6.3-5.3C29.2 34.9 26.7 36 24 36c-5.3 0-9.7-3.6-11.3-8.4l-6.5 5C9.5 39.6 16.2 44 24 44z"/>
            <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.1-4 5.5l6.3 5.3C41.8 35.6 44 30.3 44 24c0-1.3-.1-2.3-.4-3.5z"/>
          </svg>
          Continuă cu Google
        </button>
        <p className="muted small">
          Nu ai cont? Contactează coordonatorul ca să fii adăugat pe listă.
        </p>
      </div>
    </div>
  )
}
