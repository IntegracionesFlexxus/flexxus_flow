import { create } from 'zustand'
import { devtools, persist } from 'zustand/middleware'
import { immer } from 'zustand/middleware/immer'
import { authService } from '@/modules/auth/services/authService'
import { tokenService } from '@/shared/services/tokenService'
import type { LoginCredentials, RegisterData } from '@/modules/auth/services/authService'

// Store de autenticación - Nivel 2 con servicios integrados
// Implementa principios SOLID y patrones de estado reactivo

export interface User {
  id: string
  email: string
  firstName: string
  lastName: string
  avatar?: string
  timezone?: string
  language?: string
  companies?: UserCompany[]
  createdAt?: string
  lastLoginAt?: string
}

export interface UserCompany {
  id: string
  name: string
  plan: string
  role: string
  permissions: string[]
}

export interface Company {
  id: string
  name: string
  plan: string
  features: Record<string, boolean>
  settings?: Record<string, any>
}

export interface AuthState {
  // Estado
  isAuthenticated: boolean
  user: User | null
  currentCompany: Company | null
  companies: Company[]
  token: string | null
  isLoading: boolean
  error: string | null
  
  // Acciones async
  loginAsync: (credentials: LoginCredentials) => Promise<void>
  registerAsync: (data: RegisterData) => Promise<void>
  logoutAsync: () => Promise<void>
  validateTokenAsync: () => Promise<boolean>
  refreshTokenAsync: () => Promise<boolean>
  updateProfileAsync: (userData: Partial<User>) => Promise<void>
  
  // Acciones síncronas  
  setAuth: (user: User, token: string, companies: Company[]) => void
  switchCompany: (company: Company) => void
  clearAuth: () => void
  setLoading: (loading: boolean) => void
  setError: (error: string | null) => void
  
  // Utilidades
  checkAuth: () => boolean
  hasRole: (role: string) => boolean
  hasPermission: (permission: string) => boolean
  canAutoRefresh: () => boolean
}

// Store de autenticación con persistencia y devtools
export const useAuthStore = create<AuthState>()(
  devtools(
    persist(
      immer((set, get) => ({
        // Estado inicial
        isAuthenticated: false,
        user: null,
        currentCompany: null,
        companies: [],
        token: null,
        isLoading: false,
        error: null,
        
        // Acciones async - integradas con servicios
        loginAsync: async (credentials: LoginCredentials) => {
          set((state) => {
            state.isLoading = true
            state.error = null
          })

          try {
            const response = await authService.login(credentials)

            console.log('🔍 [AuthStore] Login response:', {
              user: response.data.user,
              companiesCount: response.data.companies?.length || 0,
              companies: response.data.companies,
              availableCompanies: response.data.availableCompanies,
              availableCompaniesCount: response.data.availableCompanies?.length || 0
            });

            // Usar availableCompanies que tiene la empresa virtual para SuperAdmin
            const userCompanies = response.data.availableCompanies || response.data.companies || [];

            set((state) => {
              state.user = response.data.user
              state.token = response.data.accessToken
              state.companies = userCompanies
              state.currentCompany = userCompanies[0] || null
              state.isAuthenticated = true
              state.isLoading = false
            })

            console.log('Usuario autenticado:', response.data.user.email)
            console.log('🏢 [AuthStore] Current company set to:', userCompanies[0] || null)
            console.log('🏢 [AuthStore] Using companies from:', response.data.availableCompanies ? 'availableCompanies' : 'companies')
            
            // Devolver la respuesta para que LoginPage pueda usarla
            return {
              success: true,
              user: response.data.user,
              companies: response.data.companies,
              token: response.data.accessToken
            }
          } catch (error: any) {
            set((state) => {
              state.error = error.message
              state.isLoading = false
              state.isAuthenticated = false
            })
            throw error
          }
        },

        registerAsync: async (data: RegisterData) => {
          set((state) => {
            state.isLoading = true
            state.error = null
          })

          try {
            const response = await authService.register(data)
            
            set((state) => {
              state.user = response.data.user
              state.token = response.data.accessToken
              state.companies = response.data.companies
              state.currentCompany = response.data.companies[0] || null
              state.isAuthenticated = true
              state.isLoading = false
            })

            console.log('Usuario registrado:', response.data.user.email)
          } catch (error: any) {
            set((state) => {
              state.error = error.message
              state.isLoading = false
            })
            throw error
          }
        },

        logoutAsync: async () => {
          set((state) => {
            state.isLoading = true
          })

          try {
            await authService.logout()
            
            set((state) => {
              state.user = null
              state.token = null
              state.companies = []
              state.currentCompany = null
              state.isAuthenticated = false
              state.isLoading = false
              state.error = null
            })

            console.log('Sesión cerrada correctamente')
          } catch (error: any) {
            // Aún así limpiar el estado local
            set((state) => {
              state.user = null
              state.token = null
              state.companies = []
              state.currentCompany = null
              state.isAuthenticated = false
              state.isLoading = false
              state.error = null
            })
            
            console.warn('Error en logout del servidor (limpiado local):', error)
          }
        },

        validateTokenAsync: async (): Promise<boolean> => {
          try {
            const response = await authService.validateToken()
            
            if (response.success && response.data.isValid) {
              set((state) => {
                state.user = response.data.user
                state.companies = response.data.companies
                state.currentCompany = response.data.companies[0] || null
                state.isAuthenticated = true
                state.error = null
              })
              return true
            } else {
              // Token no válido
              set((state) => {
                state.isAuthenticated = false
                state.user = null
                state.companies = []
                state.currentCompany = null
                state.token = null
              })
              return false
            }
          } catch (error) {
            set((state) => {
              state.isAuthenticated = false
              state.user = null
              state.companies = []
              state.currentCompany = null
              state.token = null
            })
            return false
          }
        },

        refreshTokenAsync: async (): Promise<boolean> => {
          try {
            const response = await authService.refreshAccessToken()
            
            if (response.success) {
              set((state) => {
                state.token = response.data.accessToken
                state.error = null
              })
              return true
            }
            return false
          } catch (error: any) {
            set((state) => {
              state.isAuthenticated = false
              state.user = null
              state.companies = []
              state.currentCompany = null
              state.token = null
              state.error = error.message
            })
            return false
          }
        },

        updateProfileAsync: async (userData: Partial<User>) => {
          set((state) => {
            state.isLoading = true
            state.error = null
          })

          try {
            const response = await authService.updateProfile(userData)
            
            set((state) => {
              state.user = response.user
              state.isLoading = false
            })
          } catch (error: any) {
            set((state) => {
              state.error = error.message
              state.isLoading = false
            })
            throw error
          }
        },

        // Acciones síncronas
        setAuth: (user, token, companies) =>
          set((state) => {
            state.user = user
            state.token = token
            state.companies = companies
            state.currentCompany = companies[0] || null
            state.isAuthenticated = true
            state.error = null
          }),
          
        switchCompany: (company) =>
          set((state) => {
            state.currentCompany = company
            localStorage.setItem('company_id', company.id)
            console.log('Compañía cambiada a:', company.name)
          }),

        clearAuth: () =>
          set((state) => {
            state.user = null
            state.token = null
            state.companies = []
            state.currentCompany = null
            state.isAuthenticated = false
            state.isLoading = false
            state.error = null
          }),

        setLoading: (loading) =>
          set((state) => {
            state.isLoading = loading
          }),

        setError: (error) =>
          set((state) => {
            state.error = error
          }),
          
        // Utilidades
        checkAuth: () => {
          const state = get()
          return !!(state.token && state.user && tokenService.isTokenValid())
        },

        hasRole: (role: string): boolean => {
          const state = get()
          if (!state.user) return false

          // Verificar rol en currentCompany (incluye empresa virtual para SuperAdmin)
          if (state.currentCompany?.role === role) {
            return true
          }

          // Verificar rol en user.companies (para compatibilidad)
          if (state.currentCompany) {
            const userCompany = state.user.companies?.find(c => c.id === state.currentCompany?.id)
            return userCompany?.role === role
          }

          return false
        },

        hasPermission: (permission: string): boolean => {
          const state = get()
          if (!state.user || !state.currentCompany) return false
          
          const userCompany = state.user.companies?.find(c => c.id === state.currentCompany?.id)
          return userCompany?.permissions.includes(permission) || false
        },

        canAutoRefresh: (): boolean => {
          return authService.canAutoRefresh()
        }
      })),
      {
        name: 'auth-store', // Nombre en localStorage
        // Persistir solo lo necesario (no persistir loading ni error states)
        partialize: (state) => ({
          isAuthenticated: state.isAuthenticated,
          user: state.user,
          currentCompany: state.currentCompany,
          companies: state.companies,
          token: state.token,
        }),
        // Validar datos al hidratar
        onRehydrateStorage: () => (state) => {
          if (state && state.token) {
            // Verificar que el token sigue siendo válido
            if (!tokenService.isTokenValid()) {
              state.isAuthenticated = false
              state.token = null
              state.user = null
              state.companies = []
              state.currentCompany = null
            }
          }
        }
      }
    ),
    { 
      name: 'auth-store' // Nombre en Redux DevTools
    }
  )
)

// Selectores para uso optimizado con tipos específicos
export const selectUser = (state: AuthState) => state.user
export const selectToken = (state: AuthState) => state.token
export const selectIsAuthenticated = (state: AuthState) => state.isAuthenticated
export const selectCurrentCompany = (state: AuthState) => state.currentCompany
export const selectIsLoading = (state: AuthState) => state.isLoading
export const selectError = (state: AuthState) => state.error
export const selectCompanies = (state: AuthState) => state.companies

// Helper para obtener el estado fuera de componentes React
export const getAuthState = () => useAuthStore.getState()

// Utilidades de conveniencia
export const AuthUtils = {
  /**
   * Verifica si el usuario tiene un rol específico en la empresa actual
   */
  hasRole: (role: string): boolean => {
    return useAuthStore.getState().hasRole(role)
  },

  /**
   * Verifica si el usuario tiene un permiso específico
   */
  hasPermission: (permission: string): boolean => {
    return useAuthStore.getState().hasPermission(permission)
  },

  /**
   * Obtiene los roles del usuario en la empresa actual
   */
  getCurrentUserRole: (): string | null => {
    const state = useAuthStore.getState()
    if (!state.user || !state.currentCompany) return null
    
    const userCompany = state.user.companies?.find(c => c.id === state.currentCompany?.id)
    return userCompany?.role || null
  },

  /**
   * Obtiene los permisos del usuario en la empresa actual
   */
  getCurrentUserPermissions: (): string[] => {
    const state = useAuthStore.getState()
    if (!state.user || !state.currentCompany) return []
    
    const userCompany = state.user.companies?.find(c => c.id === state.currentCompany?.id)
    return userCompany?.permissions || []
  },

  /**
   * Verifica si el token puede ser refrescado automáticamente
   */
  canAutoRefresh: (): boolean => {
    return useAuthStore.getState().canAutoRefresh()
  },

  /**
   * Obtiene información de debug del auth state (solo desarrollo)
   */
  getDebugInfo: () => {
    if (!import.meta.env.DEV) {
      return { error: 'Debug info only available in development' }
    }
    
    const state = useAuthStore.getState()
    return {
      isAuthenticated: state.isAuthenticated,
      user: state.user ? {
        id: state.user.id,
        email: state.user.email,
        firstName: state.user.firstName,
        lastName: state.user.lastName
      } : null,
      currentCompany: state.currentCompany ? {
        id: state.currentCompany.id,
        name: state.currentCompany.name,
        plan: state.currentCompany.plan
      } : null,
      hasToken: !!state.token,
      tokenInfo: tokenService.getDebugInfo(),
      canAutoRefresh: state.canAutoRefresh()
    }
  }
}

// Mock de login para desarrollo - REMOVER en producción
export const mockLogin = () => {
  if (!import.meta.env.DEV) {
    console.warn('mockLogin only available in development')
    return
  }

  const mockUser: User = {
    id: '1',
    email: 'demo@test.com',
    firstName: 'Usuario',
    lastName: 'Demo',
    companies: [{
      id: '1',
      name: 'Empresa Demo',
      plan: 'premium',
      role: 'admin',
      permissions: ['read', 'write', 'admin', 'feature:advanced-analytics']
    }],
    createdAt: new Date().toISOString()
  }
  
  const mockCompanies: Company[] = [
    {
      id: '1',
      name: 'Empresa Demo',
      plan: 'premium',
      features: {
        'advanced-analytics': true,
        'dark-theme': true,
        'new-dashboard': true,
        'beta-features': false
      }
    }
  ]
  
  const mockToken = 'mock-jwt-token-' + Date.now()
  
  useAuthStore.getState().setAuth(mockUser, mockToken, mockCompanies)
  console.log('Mock login successful:', mockUser.email)
}