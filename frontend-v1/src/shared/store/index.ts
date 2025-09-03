// Exportación centralizada del State Management - MVP
// TODO: En Nivel 2 agregar middleware y DevTools mejorados

// Stores
export { useAuthStore, selectUser, selectToken, selectIsAuthenticated, selectCurrentCompany, getAuthState, mockLogin } from './authStore'
export { useUIStore, selectSidebarOpen, selectNotifications, selectGlobalLoading, selectDarkMode, getUIState, notify } from './uiStore'
export { useAppStore, selectContacts, selectMessages, selectWorkflows, selectSettings, selectIsInitialized, getAppState } from './appStore'

// Custom Hooks
export {
  useAuth,
  useNotifications,
  useLoading,
  useModal,
  useSidebar,
  useAppInit,
  useContacts,
  useSettings
} from './hooks'

// Types - Re-exportar tipos útiles
export type { User, Company, AuthState } from './authStore'
export type { Notification, UIState } from './uiStore'
export type { Contact, Message, Workflow, AppSettings, AppState } from './appStore'