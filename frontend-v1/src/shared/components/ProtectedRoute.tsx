import { Navigate } from 'react-router-dom'
import { authService } from '@/modules/auth/services/authService'

// Componente para proteger rutas - MVP Nivel 1
// TODO: En Nivel 2 agregar verificación de roles y permisos
interface ProtectedRouteProps {
  children: React.ReactNode
}

function ProtectedRoute({ children }: ProtectedRouteProps) {
  const isAuthenticated = authService.isAuthenticated()
  
  if (!isAuthenticated) {
    // Si no está autenticado, redirigir a login
    return <Navigate to="/auth/login" replace />
  }
  
  // TODO: Nivel 2 - Verificar roles y permisos aquí
  
  return <>{children}</>
}

export default ProtectedRoute