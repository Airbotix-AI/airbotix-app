import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import type { ReactNode } from 'react'

export function ProtectedRoute({ children }: { children: ReactNode }) {
  const { session, loading } = useAuth()
  const loc = useLocation()

  if (loading) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-cream text-charcoal">
        <p className="opacity-60">Loading…</p>
      </main>
    )
  }
  if (!session) {
    return <Navigate to="/login" replace state={{ from: loc.pathname }} />
  }
  return <>{children}</>
}
