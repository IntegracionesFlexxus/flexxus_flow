/**
 * useAuth Hook - Sprint 2
 * Siguiendo lineamientos nivel 2: Hook personalizado con abstracción de la lógica de autenticación
 * Implementa patrón Facade para simplificar el uso del authStore en componentes
 */

import { useCallback, useEffect } from 'react'
import { useAuthStore, selectUser, selectIsAuthenticated, selectIsLoading, selectError, selectCurrentCompany, selectCompanies, AuthUtils } from '@/shared/store/authStore'
import type { LoginCredentials, RegisterData, User, Company } from '@/modules/auth/services/authService'

// Types específicos para el hook
interface UseAuthResult {
  // Estado
  user: User | null
  currentCompany: Company | null
  companies: Company[]
  isAuthenticated: boolean
  isLoading: boolean
  error: string | null
  
  // Acciones principales
  login: (credentials: LoginCredentials) => Promise<void>
  register: (data: RegisterData) => Promise<void>
  logout: () => Promise<void>
  switchCompany: (company: Company) => void
  updateProfile: (userData: Partial<User>) => Promise<void>
  
  // Utilidades
  hasRole: (role: string) => boolean
  hasPermission: (permission: string) => boolean
  canAutoRefresh: () => boolean
  getCurrentUserRole: () => string | null
  getCurrentUserPermissions: () => string[]
  
  // Gestión de estado
  clearError: () => void
  validateToken: () => Promise<boolean>
  refreshToken: () => Promise<boolean>
}

/**
 * Hook principal para gestión de autenticación
 * Proporciona una interfaz simplificada para interactuar con el sistema de auth
 * Siguiendo principio de Responsabilidad Única - abstraer la complejidad del store
 * @returns {UseAuthResult} Objeto con estado y acciones de autenticación
 */
export const useAuth = (): UseAuthResult => {
  // Selectors del store para optimizar re-renders
  const user = useAuthStore(selectUser)
  const currentCompany = useAuthStore(selectCurrentCompany)
  const companies = useAuthStore(selectCompanies)
  const isAuthenticated = useAuthStore(selectIsAuthenticated)
  const isLoading = useAuthStore(selectIsLoading)
  const error = useAuthStore(selectError)
  
  // Obtener acciones del store
  const {
    loginAsync,
    registerAsync,
    logoutAsync,
    switchCompany: switchCompanyAction,
    updateProfileAsync,
    setError,
    validateTokenAsync,
    refreshTokenAsync,
    hasRole: hasRoleAction,
    hasPermission: hasPermissionAction,
    canAutoRefresh: canAutoRefreshAction
  } = useAuthStore()

  /**
   * Login con manejo de errores
   */
  const login = useCallback(async (credentials: LoginCredentials): Promise<any> => {
    try {
      const response = await loginAsync(credentials)
      return response
    } catch (error: any) {
      // Error ya está manejado en el store
      throw error
    }
  }, [loginAsync])

  /**
   * Registro con manejo de errores
   */
  const register = useCallback(async (data: RegisterData): Promise<void> => {
    try {
      await registerAsync(data)
    } catch (error: any) {
      // Error ya está manejado en el store
      throw error
    }
  }, [registerAsync])

  /**
   * Logout con limpieza completa
   */
  const logout = useCallback(async (): Promise<void> => {
    try {
      await logoutAsync()
    } catch (error: any) {
      // Aún así considerar logout exitoso en el cliente
      console.warn('Logout completed with server error:', error)
    }
  }, [logoutAsync])

  /**
   * Cambio de empresa con logging
   */
  const switchCompany = useCallback((company: Company): void => {
    switchCompanyAction(company)
  }, [switchCompanyAction])

  /**
   * Actualización de perfil
   */
  const updateProfile = useCallback(async (userData: Partial<User>): Promise<void> => {
    try {
      await updateProfileAsync(userData)
    } catch (error: any) {
      // Error ya está manejado en el store
      throw error
    }
  }, [updateProfileAsync])

  /**
   * Validación de token
   */
  const validateToken = useCallback(async (): Promise<boolean> => {
    try {
      return await validateTokenAsync()
    } catch (error) {
      return false
    }
  }, [validateTokenAsync])

  /**
   * Refresh de token
   */
  const refreshToken = useCallback(async (): Promise<boolean> => {
    try {
      return await refreshTokenAsync()
    } catch (error) {
      return false
    }
  }, [refreshTokenAsync])

  /**
   * Verificación de rol
   */
  const hasRole = useCallback((role: string): boolean => {
    return hasRoleAction(role)
  }, [hasRoleAction])

  /**
   * Verificación de permiso
   */
  const hasPermission = useCallback((permission: string): boolean => {
    return hasPermissionAction(permission)
  }, [hasPermissionAction])

  /**
   * Verificación de auto-refresh disponible
   */
  const canAutoRefresh = useCallback((): boolean => {
    return canAutoRefreshAction()
  }, [canAutoRefreshAction])

  /**
   * Obtener rol actual del usuario
   */
  const getCurrentUserRole = useCallback((): string | null => {
    return AuthUtils.getCurrentUserRole()
  }, [])

  /**
   * Obtener permisos actuales del usuario
   */
  const getCurrentUserPermissions = useCallback((): string[] => {
    return AuthUtils.getCurrentUserPermissions()
  }, [])

  /**
   * Limpiar error del estado
   */
  const clearError = useCallback((): void => {
    setError(null)
  }, [setError])

  // Auto-refresh token cuando esté próximo a expirar
  useEffect(() => {
    if (!isAuthenticated || !canAutoRefresh()) return

    const interval = setInterval(async () => {
      if (canAutoRefresh()) {
        try {
          const refreshed = await refreshToken()
          if (!refreshed) {
            console.warn('Auto-refresh failed, user may need to re-login')
            // Optionally could trigger logout here
          }
        } catch (error) {
          console.error('Auto-refresh error:', error)
        }
      }
    }, 4 * 60 * 1000) // Verificar cada 4 minutos

    return () => clearInterval(interval)
  }, [isAuthenticated, canAutoRefresh, refreshToken])

  // Auto-clear errors después de un tiempo
  useEffect(() => {
    if (error) {
      const timeout = setTimeout(() => {
        clearError()
      }, 10000) // Limpiar error después de 10 segundos

      return () => clearTimeout(timeout)
    }
  }, [error, clearError])

  return {
    // Estado
    user,
    currentCompany,
    companies,
    isAuthenticated,
    isLoading,
    error,
    
    // Acciones principales
    login,
    register,
    logout,
    switchCompany,
    updateProfile,
    
    // Utilidades
    hasRole,
    hasPermission,
    canAutoRefresh,
    getCurrentUserRole,
    getCurrentUserPermissions,
    
    // Gestión de estado
    clearError,
    validateToken,
    refreshToken
  }
}

/**
 * Hook especializado para verificaciones de autorización
 * Proporciona utilidades específicas para guards y componentes protegidos
 * @returns Funciones de autorización optimizadas
 */
export const useAuthGuard = () => {
  const { hasRole, hasPermission, isAuthenticated, user, currentCompany } = useAuth()

  /**
   * Verifica si el usuario puede acceder a una ruta/componente
   * @param {Object} requirements - Requisitos de acceso
   * @returns {boolean} Si el usuario tiene acceso
   */
  const canAccess = useCallback((requirements: {
    requireAuth?: boolean
    roles?: string[]
    permissions?: string[]
    requireAny?: boolean // Si true, requiere cualquier rol/permiso, si false requiere todos
  }): boolean => {
    const { requireAuth = true, roles = [], permissions = [], requireAny = false } = requirements

    // Verificar autenticación
    if (requireAuth && !isAuthenticated) {
      return false
    }

    // Si no requiere auth y no hay roles/permisos específicos
    if (!requireAuth && roles.length === 0 && permissions.length === 0) {
      return true
    }

    // Verificar roles
    if (roles.length > 0) {
      const hasRequiredRoles = requireAny 
        ? roles.some(role => hasRole(role))
        : roles.every(role => hasRole(role))
      
      if (!hasRequiredRoles) return false
    }

    // Verificar permisos
    if (permissions.length > 0) {
      const hasRequiredPermissions = requireAny
        ? permissions.some(permission => hasPermission(permission))
        : permissions.every(permission => hasPermission(permission))
      
      if (!hasRequiredPermissions) return false
    }

    return true
  }, [isAuthenticated, hasRole, hasPermission])

  /**
   * Obtiene el motivo por el cual no se tiene acceso
   * @param {Object} requirements - Requisitos de acceso
   * @returns {string | null} Mensaje de error o null si hay acceso
   */
  const getAccessDeniedReason = useCallback((requirements: {
    requireAuth?: boolean
    roles?: string[]
    permissions?: string[]
    requireAny?: boolean
  }): string | null => {
    const { requireAuth = true, roles = [], permissions = [], requireAny = false } = requirements

    if (requireAuth && !isAuthenticated) {
      return 'Debes iniciar sesión para acceder a esta funcionalidad'
    }

    if (!user || !currentCompany) {
      return 'Debes seleccionar una empresa para continuar'
    }

    if (roles.length > 0) {
      const hasRequiredRoles = requireAny 
        ? roles.some(role => hasRole(role))
        : roles.every(role => hasRole(role))
      
      if (!hasRequiredRoles) {
        return `Necesitas uno de los siguientes roles: ${roles.join(', ')}`
      }
    }

    if (permissions.length > 0) {
      const hasRequiredPermissions = requireAny
        ? permissions.some(permission => hasPermission(permission))
        : permissions.every(permission => hasPermission(permission))
      
      if (!hasRequiredPermissions) {
        return `No tienes permisos suficientes. Permisos requeridos: ${permissions.join(', ')}`
      }
    }

    return null
  }, [isAuthenticated, user, currentCompany, hasRole, hasPermission])

  return {
    canAccess,
    getAccessDeniedReason,
    hasRole,
    hasPermission,
    isAuthenticated
  }
}

/**
 * Hook para debugging del estado de auth (solo desarrollo)
 * @returns Información de debug del estado de autenticación
 */
export const useAuthDebug = () => {
  const auth = useAuth()
  
  if (!import.meta.env.DEV) {
    return null
  }

  return {
    authState: auth,
    debugInfo: AuthUtils.getDebugInfo(),
    utils: AuthUtils
  }
}

export default useAuth