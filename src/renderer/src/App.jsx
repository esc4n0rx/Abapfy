import React, { useEffect } from 'react'
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom'
import { useAuthStore } from './store/authStore'
import { useThemeStore } from './store/themeStore'
import LoginView from './views/LoginView'
import DashboardView from './views/DashboardView'
import SplashScreen from './components/SplashScreen'

function ProtectedRoute({ children }) {
  const { user, loading } = useAuthStore()
  if (loading) return <SplashScreen />
  if (!user) return <Navigate to="/login" replace />
  return children
}

function PublicRoute({ children }) {
  const { user, loading } = useAuthStore()
  if (loading) return <SplashScreen />
  if (user) return <Navigate to="/dashboard" replace />
  return children
}

export default function App() {
  const initialize = useAuthStore((s) => s.initialize)
  const initTheme = useThemeStore((s) => s.initialize)

  useEffect(() => {
    initTheme()
    initialize()
  }, [])

  return (
    <HashRouter>
      <Routes>
        <Route path="/login" element={<PublicRoute><LoginView /></PublicRoute>} />
        <Route path="/dashboard/*" element={<ProtectedRoute><DashboardView /></ProtectedRoute>} />
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </HashRouter>
  )
}
