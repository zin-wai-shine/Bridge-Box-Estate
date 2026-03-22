import React, { Suspense, lazy } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import { ChatSkeleton, AdminSkeleton } from './components/PageSkeletons'

const LoginPage = lazy(() => import('./pages/LoginPage'))
const RegisterPage = lazy(() => import('./pages/RegisterPage'))
const ChatPage = lazy(() => import('./pages/ChatPage'))
const AdminPage = lazy(() => import('./pages/AdminPage'))

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
    <Suspense fallback={<ChatSkeleton />}>
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
              <Suspense fallback={<AdminSkeleton />}>
                <AdminPage />
              </Suspense>
            </ProtectedRoute>
          }
        />
        <Route path="/" element={<Navigate to="/chat" replace />} />
        <Route path="*" element={<Navigate to="/chat" replace />} />
      </Routes>
    </Suspense>
  )
}

export default App
