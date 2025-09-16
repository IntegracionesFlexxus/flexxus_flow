import React, { useEffect } from 'react'
import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { Box, CircularProgress, Typography } from '@mui/material'
import { useAuthStore } from '@/shared/store'
import { authApi } from '@/shared/services/authApi'

// AuthGuard - Protege rutas que requieren autenticación - MVP básico
// TODO: En Nivel 2 agregar validación de permisos por rol
interface AuthGuardProps {
  children?: React.ReactNode
  requiredRole?: string | string[]
  redirectTo?: string
}

export const AuthGuard: React.FC<AuthGuardProps> = ({ 
  children, 
  requiredRole,
  redirectTo = '/auth/login' 
}) => {
  const location = useLocation()
  const { isAuthenticated, user, token, logout } = useAuthStore()
  const [isValidating, setIsValidating] = React.useState(true)
  
  useEffect(() => {
    // Validar token al montar el componente
    const validateToken = async () => {
      // Si no hay token, no validar
      if (!token) {
        setIsValidating(false)
        return
      }
      
      try {
        // Validar token con el backend
        const isValid = await authApi.validateToken()
        
        if (!isValid) {
          // Token inválido, hacer logout
          logout()
        }
      } catch (error) {
        // Error de validación, hacer logout
        console.error('Error validando token:', error)
        logout()
      } finally {
        setIsValidating(false)
      }
    }
    
    validateToken()
  }, [token, logout])
  
  // Mostrar loading mientras valida
  if (isValidating) {
    return (
      <Box
        sx={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: '100vh',
          gap: 2
        }}
      >
        <CircularProgress />
        <Typography variant="body2" color="text.secondary">
          Validando sesión...
        </Typography>
      </Box>
    )
  }
  
  // Si no está autenticado, redirigir al login
  if (!isAuthenticated || !user) {
    return (
      <Navigate 
        to={redirectTo} 
        state={{ from: location.pathname }} 
        replace 
      />
    )
  }
  
  // Validar rol si es necesario
  if (requiredRole) {
    const roles = Array.isArray(requiredRole) ? requiredRole : [requiredRole]
    const userRole = user.role || 'user'
    
    if (!roles.includes(userRole)) {
      // No tiene el rol requerido, mostrar acceso denegado
      return (
        <Box
          sx={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            minHeight: '100vh',
            gap: 2,
            p: 3
          }}
        >
          <Typography variant="h4" color="error">
            Acceso Denegado
          </Typography>
          <Typography variant="body1" color="text.secondary" textAlign="center">
            No tienes permisos para acceder a esta sección.
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Rol requerido: {roles.join(', ')}
          </Typography>
        </Box>
      )
    }
  }
  
  // Usuario autenticado y con permisos, renderizar contenido
  return <>{children || <Outlet />}</>
}

export default AuthGuard

// TODO: En Nivel 2 agregar:
// - Validación de permisos granulares
// - Refresh token automático
// - Cache de validación
// - Redirección inteligente después del login
// - Manejo de múltiples roles/permisos