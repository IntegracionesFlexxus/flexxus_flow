import React, { useEffect, useState, ReactNode } from 'react'
import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { Box, CircularProgress, Typography, Alert, Button } from '@mui/material'
import { useAuth, useAuthGuard } from '@/shared/hooks/useAuth'

// AuthGuard - Sprint 2 con principios SOLID y validación de permisos avanzada
// Implementa patrón Strategy para diferentes tipos de validación
// Types - Principio de Segregación de Interfaces
interface AuthGuardProps {
  children?: ReactNode
  requireAuth?: boolean
  roles?: string[]
  permissions?: string[]
  requireAny?: boolean
  fallbackPath?: string
  loadingComponent?: ReactNode
  errorComponent?: ReactNode
  unauthorizedComponent?: ReactNode
  enableAutoRedirect?: boolean
  // Compatibility props
  requiredRole?: string | string[]
  redirectTo?: string
}

interface AuthGuardState {
  isValidating: boolean
  hasCheckedInitialAuth: boolean
  shouldRedirect: boolean
  accessDeniedReason: string | null
}

/**
 * Componente principal de protección de rutas y componentes
 * Siguiendo principios SOLID - Responsabilidad Única para control de acceso
 */
export const AuthGuard: React.FC<AuthGuardProps> = ({
  children,
  requireAuth = true,
  roles = [],
  permissions = [],
  requireAny = false,
  fallbackPath,
  loadingComponent,
  errorComponent,
  unauthorizedComponent,
  enableAutoRedirect = true,
  // Compatibility props para mantener retrocompatibilidad
  requiredRole,
  redirectTo = '/auth/login'
}) => {
  const location = useLocation()
  
  // Transformar props de compatibility a nuevo formato
  const normalizedRoles = requiredRole 
    ? (Array.isArray(requiredRole) ? requiredRole : [requiredRole])
    : roles
  const normalizedFallbackPath = fallbackPath || redirectTo

  const { 
    isAuthenticated, 
    user, 
    currentCompany, 
    isLoading, 
    error,
    validateToken,
    clearError
  } = useAuth()
  
  const { canAccess, getAccessDeniedReason } = useAuthGuard()

  const [guardState, setGuardState] = useState<AuthGuardState>({
    isValidating: true,
    hasCheckedInitialAuth: false,
    shouldRedirect: false,
    accessDeniedReason: null
  })

  /**
   * Validación inicial de autenticación
   */
  useEffect(() => {
    const performAuthValidation = async () => {
      // Si no requiere auth, permitir acceso inmediato
      if (!requireAuth) {
        setGuardState(prev => ({
          ...prev,
          isValidating: false,
          hasCheckedInitialAuth: true,
          shouldRedirect: false,
          accessDeniedReason: null
        }))
        return
      }

      // Si ya está validando desde el store, esperar
      if (isLoading) {
        return
      }

      // Si no está autenticado pero tenemos un token almacenado, validar
      if (!isAuthenticated && !guardState.hasCheckedInitialAuth) {
        try {
          setGuardState(prev => ({ ...prev, isValidating: true }))
          const isValid = await validateToken()
          
          setGuardState(prev => ({
            ...prev,
            isValidating: false,
            hasCheckedInitialAuth: true,
            shouldRedirect: !isValid,
            accessDeniedReason: isValid ? null : 'Sesión expirada'
          }))
        } catch (error) {
          setGuardState(prev => ({
            ...prev,
            isValidating: false,
            hasCheckedInitialAuth: true,
            shouldRedirect: true,
            accessDeniedReason: 'Error validando sesión'
          }))
        }
        return
      }

      // Verificar acceso con roles y permisos
      const hasAccess = canAccess({ 
        requireAuth, 
        roles: normalizedRoles, 
        permissions, 
        requireAny 
      })
      
      const deniedReason = hasAccess ? null : getAccessDeniedReason({ 
        requireAuth, 
        roles: normalizedRoles, 
        permissions, 
        requireAny 
      })

      setGuardState(prev => ({
        ...prev,
        isValidating: false,
        hasCheckedInitialAuth: true,
        shouldRedirect: requireAuth && !isAuthenticated,
        accessDeniedReason: deniedReason
      }))
    }

    performAuthValidation()
  }, [
    isAuthenticated, 
    user, 
    currentCompany, 
    isLoading, 
    requireAuth, 
    normalizedRoles, 
    permissions, 
    requireAny,
    guardState.hasCheckedInitialAuth,
    canAccess,
    getAccessDeniedReason,
    validateToken
  ])

  /**
   * Componente de loading personalizable
   */
  const LoadingComponent = loadingComponent || (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '60vh',
        gap: 2
      }}
    >
      <CircularProgress size={40} />
      <Typography variant="body1" color="text.secondary">
        Validando permisos...
      </Typography>
    </Box>
  )

  /**
   * Componente de error personalizable
   */
  const ErrorComponent = errorComponent || (
    <Box sx={{ maxWidth: 600, mx: 'auto', mt: 4, p: 3 }}>
      <Alert 
        severity="error" 
        action={
          <Button color="inherit" size="small" onClick={clearError}>
            Reintentar
          </Button>
        }
      >
        <Typography variant="h6" gutterBottom>
          Error de autenticación
        </Typography>
        <Typography variant="body2">
          {error || 'Ha ocurrido un error inesperado'}
        </Typography>
      </Alert>
    </Box>
  )

  /**
   * Componente de acceso denegado personalizable
   */
  const UnauthorizedComponent = unauthorizedComponent || (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '60vh',
        textAlign: 'center',
        p: 3
      }}
    >
      <Typography variant="h4" gutterBottom>
        Acceso Denegado
      </Typography>
      <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
        {guardState.accessDeniedReason || 'No tienes permisos para acceder a esta sección'}
      </Typography>
      <Button 
        variant="contained" 
        onClick={() => window.history.back()}
        sx={{ mr: 2 }}
      >
        Volver
      </Button>
      {isAuthenticated && (
        <Button 
          variant="outlined"
          onClick={() => window.location.href = '/dashboard'}
        >
          Ir al Dashboard
        </Button>
      )}
    </Box>
  )

  // Estados de renderizado

  // Estado de validación
  if (guardState.isValidating || isLoading) {
    return <>{LoadingComponent}</>
  }

  // Error de autenticación
  if (error && requireAuth) {
    return <>{ErrorComponent}</>
  }

  // No autenticado - redirigir al login
  if (guardState.shouldRedirect && enableAutoRedirect) {
    const redirectPath = normalizedFallbackPath === '/auth/login' 
      ? `${normalizedFallbackPath}?redirect=${encodeURIComponent(location.pathname + location.search)}`
      : normalizedFallbackPath

    return (
      <Navigate 
        to={redirectPath}
        replace 
        state={{ 
          from: location.pathname,
          reason: guardState.accessDeniedReason 
        }}
      />
    )
  }

  // Autenticado pero necesita seleccionar empresa
  if (requireAuth && isAuthenticated && user?.companies && user.companies.length > 1 && !currentCompany) {
    return (
      <Navigate 
        to="/auth/company-selector" 
        replace
        state={{ 
          companies: user.companies,
          from: location.pathname 
        }} 
      />
    )
  }

  // Acceso denegado por roles/permisos
  if (guardState.accessDeniedReason && requireAuth) {
    return <>{UnauthorizedComponent}</>
  }

  // Acceso concedido - renderizar children
  return <>{children || <Outlet />}</>
}

/**
 * HOC para proteger componentes con AuthGuard
 * Patrón Higher-Order Component para reutilización
 */
export const withAuthGuard = (guardProps: Partial<AuthGuardProps> = {}) => {
  return function <T extends {}>(Component: React.ComponentType<T>) {
    return function AuthGuardedComponent(props: T) {
      return (
        <AuthGuard {...guardProps}>
          <Component {...props} />
        </AuthGuard>
      )
    }
  }
}

/**
 * Componente específico para protección de rutas
 * Alias especializado del AuthGuard para uso en routing
 */
export const ProtectedRoute: React.FC<AuthGuardProps> = (props) => {
  return <AuthGuard {...props} />
}

/**
 * Hook de conveniencia para verificar acceso dentro de componentes
 * Útil para mostrar/ocultar elementos según permisos
 */
export const useRouteGuard = (requirements: {
  requireAuth?: boolean
  roles?: string[]
  permissions?: string[]
  requireAny?: boolean
}) => {
  const { canAccess, getAccessDeniedReason, isAuthenticated } = useAuthGuard()
  const { isLoading } = useAuth()

  const hasAccess = canAccess(requirements)
  const accessDeniedReason = getAccessDeniedReason(requirements)

  return {
    hasAccess,
    accessDeniedReason,
    isLoading,
    isAuthenticated
  }
}

/**
 * Componente para renderizado condicional basado en permisos
 * Patrón Render Props para máxima flexibilidad
 */
export const ConditionalRender: React.FC<{
  requirements: {
    requireAuth?: boolean
    roles?: string[]
    permissions?: string[]
    requireAny?: boolean
  }
  children: ReactNode
  fallback?: ReactNode
  loadingFallback?: ReactNode
}> = ({ requirements, children, fallback = null, loadingFallback }) => {
  const { hasAccess, isLoading } = useRouteGuard(requirements)

  if (isLoading && loadingFallback) {
    return <>{loadingFallback}</>
  }

  return hasAccess ? <>{children}</> : <>{fallback}</>
}

export default AuthGuard