import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '@/hooks/use-auth'

export function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, user, loading } = useAuth()
  const location = useLocation()

  if (loading) return <div>Carregando...</div>

  if (!isAuthenticated) {
    return <Navigate to="/admin/login" state={{ from: location }} replace />
  }

  if (user?.needs_password_reset && location.pathname !== '/admin/reset-password') {
    return <Navigate to="/admin/reset-password" replace />
  }

  return <>{children}</>
}
