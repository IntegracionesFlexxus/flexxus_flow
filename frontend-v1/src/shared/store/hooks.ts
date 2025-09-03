import { useEffect } from 'react'
import { useAuthStore } from './authStore'
import { useUIStore, notify } from './uiStore'
import { useAppStore } from './appStore'
import { useNavigate } from 'react-router-dom'

// Hooks personalizados para el manejo del state - MVP
// TODO: En Nivel 2 agregar más hooks especializados

/**
 * Hook para manejar autenticación
 */
export const useAuth = () => {
  const navigate = useNavigate()
  const {
    isAuthenticated,
    user,
    token,
    currentCompany,
    login: storeLogin,
    logout: storeLogout,
    checkAuth
  } = useAuthStore()
  
  const login = async (email: string, password: string) => {
    try {
      // TODO: En Nivel 2 conectar con API real
      // Simulación de login para MVP
      if (email === 'admin@test.com' && password === 'admin123') {
        const mockUser = {
          id: '1',
          email,
          firstName: 'Admin',
          lastName: 'User',
          role: 'admin'
        }
        
        const mockCompanies = [{
          id: '1',
          name: 'Empresa Demo',
          plan: 'premium',
          features: {
            omni: true,
            crm: true,
            workflow: true,
            analytics: true
          }
        }]
        
        const mockToken = 'jwt-token-' + Date.now()
        
        storeLogin(mockUser, mockToken, mockCompanies)
        notify.success('Bienvenido ' + mockUser.firstName)
        
        // Navegar a returnUrl o dashboard
        const returnUrl = localStorage.getItem('returnUrl')
        if (returnUrl) {
          localStorage.removeItem('returnUrl')
          navigate(returnUrl)
        } else {
          navigate('/dashboard')
        }
        
        return true
      } else {
        notify.error('Credenciales inválidas')
        return false
      }
    } catch (error) {
      notify.error('Error al iniciar sesión')
      return false
    }
  }
  
  const logout = () => {
    storeLogout()
    notify.info('Sesión cerrada')
    navigate('/auth/login')
  }
  
  return {
    isAuthenticated,
    user,
    token,
    currentCompany,
    login,
    logout,
    checkAuth
  }
}

/**
 * Hook para manejar notificaciones
 */
export const useNotifications = () => {
  const { notifications, addNotification, removeNotification, clearNotifications } = useUIStore()
  
  return {
    notifications,
    notify: {
      success: (message: string, title?: string) => 
        addNotification({ type: 'success', title: title || 'Éxito', message }),
      error: (message: string, title?: string) => 
        addNotification({ type: 'error', title: title || 'Error', message }),
      warning: (message: string, title?: string) => 
        addNotification({ type: 'warning', title: title || 'Advertencia', message }),
      info: (message: string, title?: string) => 
        addNotification({ type: 'info', title: title || 'Información', message }),
    },
    remove: removeNotification,
    clear: clearNotifications
  }
}

/**
 * Hook para manejar loading states
 */
export const useLoading = (taskId?: string) => {
  const { 
    globalLoading, 
    loadingText, 
    startLoading, 
    stopLoading, 
    isLoading,
    setGlobalLoading 
  } = useUIStore()
  
  const start = (text?: string) => {
    if (taskId) {
      startLoading(taskId)
    } else {
      setGlobalLoading(true, text)
    }
  }
  
  const stop = () => {
    if (taskId) {
      stopLoading(taskId)
    } else {
      setGlobalLoading(false)
    }
  }
  
  // Auto-cleanup en desmontaje
  useEffect(() => {
    return () => {
      if (taskId && isLoading(taskId)) {
        stopLoading(taskId)
      }
    }
  }, [taskId])
  
  return {
    isLoading: taskId ? isLoading(taskId) : globalLoading,
    loadingText,
    start,
    stop
  }
}

/**
 * Hook para manejar modals
 */
export const useModal = (modalId: string) => {
  const { openModal, closeModal, isModalOpen, getModalData } = useUIStore()
  
  const open = (data?: any) => openModal(modalId, data)
  const close = () => closeModal(modalId)
  const isOpen = isModalOpen(modalId)
  const data = getModalData(modalId)
  
  return {
    isOpen,
    data,
    open,
    close
  }
}

/**
 * Hook para manejar sidebar
 */
export const useSidebar = () => {
  const { 
    sidebarOpen, 
    sidebarCollapsed, 
    toggleSidebar, 
    setSidebarOpen, 
    collapseSidebar 
  } = useUIStore()
  
  return {
    isOpen: sidebarOpen,
    isCollapsed: sidebarCollapsed,
    toggle: toggleSidebar,
    setOpen: setSidebarOpen,
    setCollapsed: collapseSidebar
  }
}

/**
 * Hook para inicialización de la app
 */
export const useAppInit = () => {
  const { initialized, initialize } = useAppStore()
  const { isAuthenticated } = useAuthStore()
  
  useEffect(() => {
    if (isAuthenticated && !initialized) {
      initialize().catch(error => {
        console.error('Error inicializando app:', error)
        notify.error('Error al cargar datos de la aplicación')
      })
    }
  }, [isAuthenticated, initialized, initialize])
  
  return initialized
}

/**
 * Hook para datos de contactos
 */
export const useContacts = () => {
  const { 
    contacts, 
    setContacts, 
    addContact, 
    updateContact, 
    deleteContact,
    filters,
    setFilter
  } = useAppStore()
  
  // Aplicar filtros localmente
  const filteredContacts = contacts.filter(contact => {
    const contactFilters = filters.contacts
    
    if (contactFilters.search) {
      const search = contactFilters.search.toLowerCase()
      if (!contact.name.toLowerCase().includes(search) &&
          !contact.email.toLowerCase().includes(search)) {
        return false
      }
    }
    
    if (contactFilters.tags && contactFilters.tags.length > 0) {
      if (!contact.tags.some(tag => contactFilters.tags.includes(tag))) {
        return false
      }
    }
    
    return true
  })
  
  return {
    contacts: filteredContacts,
    allContacts: contacts,
    filters: filters.contacts,
    setFilter: (newFilters: Record<string, any>) => setFilter('contacts', newFilters),
    addContact,
    updateContact,
    deleteContact,
    setContacts
  }
}

/**
 * Hook para preferencias de usuario
 */
export const useSettings = () => {
  const { settings, updateSettings } = useAppStore()
  const { darkMode, setDarkMode } = useUIStore()
  
  const updatePreferences = (newSettings: Record<string, any>) => {
    updateSettings(newSettings)
    
    // Aplicar tema si cambió
    if ('darkMode' in newSettings) {
      setDarkMode(newSettings.darkMode)
    }
    
    notify.success('Preferencias actualizadas')
  }
  
  return {
    settings: { ...settings, darkMode },
    updatePreferences
  }
}

// TODO: En Nivel 2 agregar:
// - usePermissions para verificar permisos
// - useRealtime para suscripciones WebSocket
// - usePagination para manejo de paginación
// - useForm para estado de formularios
// - useDebounce para búsquedas
// - useLocalStorage para persistencia adicional