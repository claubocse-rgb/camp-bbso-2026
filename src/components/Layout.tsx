import { NavLink, Outlet } from 'react-router-dom'
import { useAuth } from '../context/AuthProvider'
import Icon from './Icon'

const NAV = [
  { to: '/', label: 'Dashboard', icon: 'dashboard' as const, end: true },
  { to: '/orar', label: 'Orar', icon: 'orar' as const },
  { to: '/echipe-studiu', label: 'Echipe studiu', icon: 'studiu-team' as const },
  { to: '/echipe-jocuri', label: 'Echipe jocuri', icon: 'jocuri-team' as const },
  { to: '/camere', label: 'Camere', icon: 'camere' as const },
  { to: '/studiu', label: 'Studiu', icon: 'studiu' as const },
  { to: '/jocuri', label: 'Jocuri', icon: 'jocuri' as const },
  { to: '/todo', label: 'To-do', icon: 'todo' as const },
  { to: '/chat', label: 'Chat', icon: 'chat' as const },
  { to: '/alerte', label: 'Alerte', icon: 'alerte' as const },
]

export default function Layout() {
  const { profile, signOut } = useAuth()

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand">
          <span className="brand-mark">BBSO</span>
          <span className="brand-year">2026</span>
        </div>
        <nav className="nav">
          {NAV.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) => 'nav-item' + (isActive ? ' active' : '')}
            >
              <Icon name={item.icon} />
              <span>{item.label}</span>
            </NavLink>
          ))}
        </nav>
        <div className="sidebar-footer">
          <div className="me">
            {profile?.avatar_url ? (
              <img src={profile.avatar_url} alt="" className="me-avatar" />
            ) : (
              <div className="me-avatar placeholder">
                {(profile?.full_name || profile?.email || '?').charAt(0).toUpperCase()}
              </div>
            )}
            <div className="me-info">
              <div className="me-name">{profile?.full_name || profile?.email}</div>
              <div className="me-role">{profile?.role === 'admin' ? 'Administrator' : 'Organizator'}</div>
            </div>
          </div>
          <button className="btn-ghost" onClick={() => signOut()} title="Ieșire">
            <Icon name="logout" size={18} />
          </button>
        </div>
      </aside>

      <main className="content">
        <Outlet />
      </main>
    </div>
  )
}
