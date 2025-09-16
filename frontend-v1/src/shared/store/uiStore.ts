import { create } from 'zustand'
import { devtools } from 'zustand/middleware'
import { immer } from 'zustand/middleware/immer'

// Store para estado UI global - MVP
// TODO: En Nivel 2 agregar preferencias de usuario y temas

export interface Notification {
  id: string
  type: 'success' | 'error' | 'warning' | 'info'
  title: string
  message: string
  autoClose?: boolean
  duration?: number
}

export interface Modal {
  id: string
  open: boolean
  data?: any // Datos opcionales para el modal
}

export interface UIState {
  // Sidebar
  sidebarOpen: boolean
  sidebarCollapsed: boolean
  
  // Loading states
  globalLoading: boolean
  loadingText?: string
  loadingTasks: Set<string> // Para múltiples tareas de loading
  
  // Notificaciones
  notifications: Notification[]
  
  // Modals
  modals: Record<string, boolean>
  modalData: Record<string, any>
  
  // Tema (preparación para Nivel 2)
  darkMode: boolean
  
  // Acciones - Sidebar
  toggleSidebar: () => void
  setSidebarOpen: (open: boolean) => void
  collapseSidebar: (collapsed: boolean) => void
  
  // Acciones - Loading
  setGlobalLoading: (loading: boolean, text?: string) => void
  startLoading: (taskId: string) => void
  stopLoading: (taskId: string) => void
  isLoading: (taskId?: string) => boolean
  
  // Acciones - Notificaciones
  addNotification: (notification: Omit<Notification, 'id'>) => void
  removeNotification: (id: string) => void
  clearNotifications: () => void
  
  // Acciones - Modals
  openModal: (modalId: string, data?: any) => void
  closeModal: (modalId: string) => void
  isModalOpen: (modalId: string) => boolean
  getModalData: (modalId: string) => any
  
  // Acciones - Tema
  toggleDarkMode: () => void
  setDarkMode: (dark: boolean) => void
}

export const useUIStore = create<UIState>()(
  devtools(
    immer((set, get) => ({
      // Estado inicial
      sidebarOpen: true,
      sidebarCollapsed: false,
      globalLoading: false,
      loadingText: undefined,
      loadingTasks: new Set(),
      notifications: [],
      modals: {},
      modalData: {},
      darkMode: false, // Por defecto tema claro
      
      // Acciones - Sidebar
      toggleSidebar: () =>
        set((state) => {
          state.sidebarOpen = !state.sidebarOpen
        }),
        
      setSidebarOpen: (open) =>
        set((state) => {
          state.sidebarOpen = open
        }),
        
      collapseSidebar: (collapsed) =>
        set((state) => {
          state.sidebarCollapsed = collapsed
        }),
        
      // Acciones - Loading
      setGlobalLoading: (loading, text) =>
        set((state) => {
          state.globalLoading = loading
          state.loadingText = text
        }),
        
      startLoading: (taskId) =>
        set((state) => {
          state.loadingTasks.add(taskId)
        }),
        
      stopLoading: (taskId) =>
        set((state) => {
          state.loadingTasks.delete(taskId)
        }),
        
      isLoading: (taskId) => {
        const state = get()
        if (taskId) {
          return state.loadingTasks.has(taskId)
        }
        return state.loadingTasks.size > 0 || state.globalLoading
      },
        
      // Acciones - Notificaciones
      addNotification: (notification) =>
        set((state) => {
          const id = Date.now().toString() + Math.random().toString(36)
          const newNotification = { ...notification, id }
          state.notifications.push(newNotification)
          
          // Auto-cerrar si está configurado
          if (notification.autoClose !== false) {
            const duration = notification.duration || 5000
            setTimeout(() => {
              get().removeNotification(id)
            }, duration)
          }
        }),
        
      removeNotification: (id) =>
        set((state) => {
          state.notifications = state.notifications.filter((n) => n.id !== id)
        }),
        
      clearNotifications: () =>
        set((state) => {
          state.notifications = []
        }),
        
      // Acciones - Modals
      openModal: (modalId, data) =>
        set((state) => {
          state.modals[modalId] = true
          if (data !== undefined) {
            state.modalData[modalId] = data
          }
        }),
        
      closeModal: (modalId) =>
        set((state) => {
          state.modals[modalId] = false
          // Limpiar data del modal después de cerrar
          delete state.modalData[modalId]
        }),
        
      isModalOpen: (modalId) => {
        return get().modals[modalId] || false
      },
      
      getModalData: (modalId) => {
        return get().modalData[modalId]
      },
        
      // Acciones - Tema
      toggleDarkMode: () =>
        set((state) => {
          state.darkMode = !state.darkMode
          // TODO: En Nivel 2 aplicar tema al DOM
          console.log('Modo oscuro:', !state.darkMode)
        }),
        
      setDarkMode: (dark) =>
        set((state) => {
          state.darkMode = dark
        }),
    })),
    { 
      name: 'ui-store' // Nombre en Redux DevTools
    }
  )
)

// Selectores útiles
export const selectSidebarOpen = (state: UIState) => state.sidebarOpen
export const selectNotifications = (state: UIState) => state.notifications
export const selectGlobalLoading = (state: UIState) => state.globalLoading
export const selectDarkMode = (state: UIState) => state.darkMode

// Helpers para uso fuera de componentes
export const getUIState = () => useUIStore.getState()

// Helper para mostrar notificaciones rápidamente
export const notify = {
  success: (message: string, title = 'Éxito') => {
    getUIState().addNotification({ type: 'success', title, message })
  },
  error: (message: string, title = 'Error') => {
    getUIState().addNotification({ type: 'error', title, message })
  },
  warning: (message: string, title = 'Advertencia') => {
    getUIState().addNotification({ type: 'warning', title, message })
  },
  info: (message: string, title = 'Información') => {
    getUIState().addNotification({ type: 'info', title, message })
  }
}

// TODO: En Nivel 2 agregar:
// - Persistencia de preferencias UI
// - Breakpoints responsivos en el store
// - Estado de formularios globales
// - Historial de navegación
// - Configuración de accesibilidad