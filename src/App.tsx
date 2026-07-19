import { Routes, Route, Navigate } from 'react-router-dom'
import { useAuth } from './context/AuthProvider'
import Layout from './components/Layout'
import ProtectedRoute from './components/ProtectedRoute'
import Login from './pages/Login'
import Pending from './pages/Pending'
import Dashboard from './pages/Dashboard'
import Orar from './pages/Orar'
import EchipeStudiu from './pages/EchipeStudiu'
import EchipeJocuri from './pages/EchipeJocuri'
import Camere from './pages/Camere'
import Studiu from './pages/Studiu'
import Jocuri from './pages/Jocuri'
import Todo from './pages/Todo'
import Chat from './pages/Chat'
import Alerte from './pages/Alerte'

export default function App() {
  const { loading } = useAuth()

  if (loading) {
    return (
      <div className="center-screen">
        <div className="spinner" />
      </div>
    )
  }

  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/pending" element={<Pending />} />
      <Route
        element={
          <ProtectedRoute>
            <Layout />
          </ProtectedRoute>
        }
      >
        <Route path="/" element={<Dashboard />} />
        <Route path="/orar" element={<Orar />} />
        <Route path="/echipe-studiu" element={<EchipeStudiu />} />
        <Route path="/echipe-jocuri" element={<EchipeJocuri />} />
        <Route path="/camere" element={<Camere />} />
        <Route path="/studiu" element={<Studiu />} />
        <Route path="/jocuri" element={<Jocuri />} />
        <Route path="/todo" element={<Todo />} />
        <Route path="/chat" element={<Chat />} />
        <Route path="/alerte" element={<Alerte />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
