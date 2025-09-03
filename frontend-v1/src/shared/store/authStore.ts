import { create } from 'zustand'
import { devtools, persist } from 'zustand/middleware'
import { immer } from 'zustand/middleware/immer'

// Store de autenticación - MVP con persistencia en localStorage
// TODO: En Nivel 2 agregar refresh tokens y manejo de sesiones

export interface User {
  id: string
  email: string
  firstName: string
  lastName: string
  avatar?: string
  role?: string // Para sistema de permisos básico
}

export interface Company {
  id: string
  name: string
  plan: string
  features: Record<string, boolean>
}

export interface AuthState {
  // Estado
  isAuthenticated: boolean
  user: User | null
  currentCompany: Company | null
  companies: Company[]
  token: string | null
  
  // Acciones
  login: (user: User, token: string, companies: Company[]) => void
  logout: () => void
  switchCompany: (company: Company) => void
  updateUser: (user: Partial<User>) => void
  setToken: (token: string) => void
  checkAuth: () => boolean
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
        
        // Action: Login
        login: (user, token, companies) =>
          set((state) => {
            state.user = user
            state.token = token
            state.companies = companies
            state.currentCompany = companies[0] || null
            state.isAuthenticated = true
            
            // Log para desarrollo
            console.log('Usuario autenticado:', user.email)
          }),
          
        // Action: Logout
        logout: () =>
          set((state) => {
            state.user = null
            state.token = null
            state.companies = []
            state.currentCompany = null
            state.isAuthenticated = false
            
            // Limpiar localStorage adicional si es necesario
            localStorage.removeItem('returnUrl')
            console.log('Sesión cerrada')
          }),
          
        // Action: Cambiar compañía (multi-tenant)
        switchCompany: (company) =>
          set((state) => {
            state.currentCompany = company
            console.log('Compañía cambiada a:', company.name)
          }),
          
        // Action: Actualizar datos del usuario
        updateUser: (userData) =>
          set((state) => {
            if (state.user) {
              Object.assign(state.user, userData)
            }
          }),
          
        // Action: Actualizar token
        setToken: (token) =>
          set((state) => {
            state.token = token
          }),
          
        // Action: Verificar autenticación
        checkAuth: () => {
          const state = get()
          // Verificación básica para MVP
          // TODO: En Nivel 2 verificar expiración del token
          return !!(state.token && state.user)
        }
      })),
      {
        name: 'auth-store', // Nombre en localStorage
        // Persistir solo lo necesario
        partialize: (state) => ({
          isAuthenticated: state.isAuthenticated,
          user: state.user,
          currentCompany: state.currentCompany,
          companies: state.companies,
          token: state.token,
        }),
      }
    ),
    { 
      name: 'auth-store' // Nombre en Redux DevTools
    }
  )
)

// Selectores para uso optimizado
export const selectUser = (state: AuthState) => state.user
export const selectToken = (state: AuthState) => state.token
export const selectIsAuthenticated = (state: AuthState) => state.isAuthenticated
export const selectCurrentCompany = (state: AuthState) => state.currentCompany

// Helper para obtener el estado fuera de componentes React
export const getAuthState = () => useAuthStore.getState()

// Mock de login para desarrollo - REMOVER en producción
export const mockLogin = () => {
  const mockUser: User = {
    id: '1',
    email: 'demo@test.com',
    firstName: 'Usuario',
    lastName: 'Demo',
    role: 'admin'
  }
  
  const mockCompanies: Company[] = [
    {
      id: '1',
      name: 'Empresa Demo',
      plan: 'premium',
      features: {
        omni: true,
        crm: true,
        workflow: true,
        analytics: true
      }
    }
  ]
  
  const mockToken = 'mock-jwt-token-' + Date.now()
  
  useAuthStore.getState().login(mockUser, mockToken, mockCompanies)
}

// TODO: En Nivel 2 agregar:
// - Refresh token logic
// - Session timeout
// - Remember me functionality
// - OAuth providers state
// - Permission checks