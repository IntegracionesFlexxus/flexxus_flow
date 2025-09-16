import { Navigate, useLocation } from 'react-router-dom'
import { useAuthStore } from '@/shared/store/authStore'

// RouteGuard mejorado - MVP con verificación de autenticación
// TODO: En Nivel 2 agregar verificación de roles y permisos

interface RouteGuardProps {
  children: React.ReactNode
  requireAuth?: boolean
  requireRole?: string // TODO: Implementar en Nivel 2
  redirectTo?: string
}

function RouteGuard({ 
  children, 
  requireAuth = true,
  requireRole,
  redirectTo = '/auth/login'
}: RouteGuardProps) {
  const location = useLocation()
  const isAuthenticated = useAuthStore(state => state.isAuthenticated)
  const user = useAuthStore(state => state.user)
  
  // Verificar autenticación
  if (requireAuth && !isAuthenticated) {
    // Guardar la ruta intentada para redirigir después del login
    // TODO: En Nivel 2 usar sessionStorage o state management
    const returnUrl = location.pathname + location.search
    localStorage.setItem('returnUrl', returnUrl) // Temporal para MVP
    
    return <Navigate to={redirectTo} state={{ from: location }} replace />
  }
  
  // TODO: Verificar roles en Nivel 2
  if (requireRole && user) {
    // Placeholder para verificación de roles
    console.log('TODO: Verificar rol', requireRole)
  }
  
  return <>{children}</>
}

export default RouteGuard