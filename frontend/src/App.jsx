import { Routes, Route, Navigate } from 'react-router-dom'
import LoginPage from './pages/LoginPage'
import RegisterPage from './pages/RegisterPage'
import ChatPage from './pages/ChatPage'
import AdminPage from './pages/AdminPage'

function App() {
  const isAuthenticated = () => !!localStorage.getItem('bribox_token')
  const getUser = () => {
    try {
      return JSON.parse(localStorage.getItem('bribox_user') || '{}')
    } catch {
      return {}
    }
  }

  const ProtectedRoute = ({ children, requiredRoles }) => {
    if (!isAuthenticated()) return <Navigate to="/login" replace />
    if (requiredRoles) {
      const user = getUser()
      if (!requiredRoles.includes(user.role)) {
        return <Navigate to="/chat" replace />
      }
    }
    return children
  }

  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />
      <Route
        path="/chat"
        element={
          <ProtectedRoute>
            <ChatPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin"
        element={
          <ProtectedRoute requiredRoles={['Agent', 'Admin']}>
            <AdminPage />
          </ProtectedRoute>
        }
      />
      <Route path="/" element={<Navigate to="/chat" replace />} />
      <Route path="*" element={<Navigate to="/chat" replace />} />
    </Routes>
  )
}

export default App
