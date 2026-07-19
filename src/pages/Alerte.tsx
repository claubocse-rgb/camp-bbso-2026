import PageStub from '../components/PageStub'
import { useAuth } from '../context/AuthProvider'

export default function Alerte() {
  const { profile } = useAuth()
  const isAdmin = profile?.role === 'admin'

  return (
    <PageStub title="Alerte" subtitle="Anunțuri urgente către toți sau nominal.">
      Modul de alertă: trimiți o notificare fie tuturor organizatorilor, fie unor
      persoane anume, în caz de nevoie.
      {!isAdmin && (
        <p className="muted small" style={{ marginTop: 12 }}>
          Notă: trimiterea alertelor va fi permisă doar administratorilor.
        </p>
      )}
    </PageStub>
  )
}
