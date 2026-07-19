import { Navigate } from 'react-router-dom'
import { ReactNode } from 'react'
import { useAuth } from '../context/AuthProvider'

export default function ProtectedRoute({ children }: { children: ReactNode }) {
  const { session, profile, loading } = useAuth()

  if (loading) return null
  if (!session) return <Navigate to="/login" replace />
  // Cont fara profil aprobat (ne-allowlistat) -> ecran de asteptare
  if (!profile || profile.role === 'pending') return <Navigate to="/pending" replace />

  return <>{children}</>
}
