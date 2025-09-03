import { create } from 'zustand'
import { devtools, persist } from 'zustand/middleware'
import { immer } from 'zustand/middleware/immer'

// Store de estado global de la aplicación - MVP
// TODO: En Nivel 2 agregar cache de datos y sincronización

// Tipos para las diferentes entidades del sistema
export interface Contact {
  id: string
  name: string
  email: string
  phone?: string
  company?: string
  tags: string[]
}

export interface Message {
  id: string
  from: string
  to: string
  content: string
  timestamp: Date
  channel: 'whatsapp' | 'email' | 'sms' | 'webchat'
  status: 'sent' | 'delivered' | 'read' | 'failed'
}

export interface Workflow {
  id: string
  name: string
  status: 'active' | 'paused' | 'draft'
  triggersCount: number
  actionsCount: number
}

export interface AppSettings {
  language: string
  timezone: string
  dateFormat: string
  currency: string
  notifications: {
    email: boolean
    push: boolean
    sms: boolean
  }
}

export interface AppState {
  // Datos de la aplicación
  contacts: Contact[]
  messages: Message[]
  workflows: Workflow[]
  
  // Configuración
  settings: AppSettings
  
  // Estado de la aplicación
  initialized: boolean
  lastSync: Date | null
  onlineStatus: boolean
  
  // Filtros y búsquedas actuales (para mantener estado entre navegación)
  filters: {
    contacts: Record<string, any>
    messages: Record<string, any>
    workflows: Record<string, any>
  }
  
  // Acciones - Datos
  setContacts: (contacts: Contact[]) => void
  addContact: (contact: Contact) => void
  updateContact: (id: string, data: Partial<Contact>) => void
  deleteContact: (id: string) => void
  
  setMessages: (messages: Message[]) => void
  addMessage: (message: Message) => void
  updateMessageStatus: (id: string, status: Message['status']) => void
  
  setWorkflows: (workflows: Workflow[]) => void
  updateWorkflow: (id: string, data: Partial<Workflow>) => void
  
  // Acciones - Configuración
  updateSettings: (settings: Partial<AppSettings>) => void
  
  // Acciones - Estado
  initialize: () => Promise<void>
  syncData: () => Promise<void>
  setOnlineStatus: (online: boolean) => void
  
  // Acciones - Filtros
  setFilter: (module: 'contacts' | 'messages' | 'workflows', filters: Record<string, any>) => void
  clearFilters: (module?: 'contacts' | 'messages' | 'workflows') => void
  
  // Acciones - Utilidades
  reset: () => void
}

// Estado inicial
const initialSettings: AppSettings = {
  language: 'es',
  timezone: 'America/Mexico_City',
  dateFormat: 'DD/MM/YYYY',
  currency: 'MXN',
  notifications: {
    email: true,
    push: true,
    sms: false
  }
}

export const useAppStore = create<AppState>()(
  devtools(
    persist(
      immer((set, get) => ({
        // Estado inicial
        contacts: [],
        messages: [],
        workflows: [],
        settings: initialSettings,
        initialized: false,
        lastSync: null,
        onlineStatus: navigator.onLine,
        filters: {
          contacts: {},
          messages: {},
          workflows: {}
        },
        
        // Acciones - Contacts
        setContacts: (contacts) =>
          set((state) => {
            state.contacts = contacts
          }),
          
        addContact: (contact) =>
          set((state) => {
            state.contacts.push(contact)
          }),
          
        updateContact: (id, data) =>
          set((state) => {
            const index = state.contacts.findIndex(c => c.id === id)
            if (index !== -1) {
              Object.assign(state.contacts[index], data)
            }
          }),
          
        deleteContact: (id) =>
          set((state) => {
            state.contacts = state.contacts.filter(c => c.id !== id)
          }),
        
        // Acciones - Messages
        setMessages: (messages) =>
          set((state) => {
            state.messages = messages
          }),
          
        addMessage: (message) =>
          set((state) => {
            state.messages.push(message)
          }),
          
        updateMessageStatus: (id, status) =>
          set((state) => {
            const message = state.messages.find(m => m.id === id)
            if (message) {
              message.status = status
            }
          }),
        
        // Acciones - Workflows
        setWorkflows: (workflows) =>
          set((state) => {
            state.workflows = workflows
          }),
          
        updateWorkflow: (id, data) =>
          set((state) => {
            const index = state.workflows.findIndex(w => w.id === id)
            if (index !== -1) {
              Object.assign(state.workflows[index], data)
            }
          }),
        
        // Acciones - Settings
        updateSettings: (newSettings) =>
          set((state) => {
            Object.assign(state.settings, newSettings)
          }),
        
        // Acciones - Estado
        initialize: async () => {
          // Simular carga inicial de datos
          // TODO: En Nivel 2 cargar desde API
          await new Promise(resolve => setTimeout(resolve, 1000))
          
          set((state) => {
            state.initialized = true
            
            // Datos mock para desarrollo
            state.contacts = [
              {
                id: '1',
                name: 'Juan Pérez',
                email: 'juan@example.com',
                phone: '+521234567890',
                company: 'Empresa SA',
                tags: ['cliente', 'vip']
              }
            ]
            
            state.messages = [
              {
                id: '1',
                from: 'sistema',
                to: 'juan@example.com',
                content: 'Mensaje de bienvenida',
                timestamp: new Date(),
                channel: 'email',
                status: 'delivered'
              }
            ]
            
            state.workflows = [
              {
                id: '1',
                name: 'Bienvenida nuevos usuarios',
                status: 'active',
                triggersCount: 1,
                actionsCount: 3
              }
            ]
          })
          
          console.log('App inicializada')
        },
        
        syncData: async () => {
          // Simular sincronización
          // TODO: En Nivel 2 sincronizar con backend
          const startTime = Date.now()
          
          set((state) => {
            state.lastSync = new Date()
          })
          
          await new Promise(resolve => setTimeout(resolve, 2000))
          
          console.log(`Sincronización completada en ${Date.now() - startTime}ms`)
        },
        
        setOnlineStatus: (online) =>
          set((state) => {
            state.onlineStatus = online
            console.log('Estado de conexión:', online ? 'En línea' : 'Sin conexión')
          }),
        
        // Acciones - Filtros
        setFilter: (module, filters) =>
          set((state) => {
            state.filters[module] = filters
          }),
          
        clearFilters: (module) =>
          set((state) => {
            if (module) {
              state.filters[module] = {}
            } else {
              state.filters = {
                contacts: {},
                messages: {},
                workflows: {}
              }
            }
          }),
        
        // Reset completo del store
        reset: () =>
          set((state) => {
            state.contacts = []
            state.messages = []
            state.workflows = []
            state.settings = initialSettings
            state.initialized = false
            state.lastSync = null
            state.filters = {
              contacts: {},
              messages: {},
              workflows: {}
            }
          })
      })),
      {
        name: 'app-store',
        // Persistir solo configuración y filtros
        partialize: (state) => ({
          settings: state.settings,
          filters: state.filters,
          lastSync: state.lastSync
        })
      }
    ),
    { 
      name: 'app-store'
    }
  )
)

// Selectores
export const selectContacts = (state: AppState) => state.contacts
export const selectMessages = (state: AppState) => state.messages
export const selectWorkflows = (state: AppState) => state.workflows
export const selectSettings = (state: AppState) => state.settings
export const selectIsInitialized = (state: AppState) => state.initialized

// Helper para obtener estado fuera de componentes
export const getAppState = () => useAppStore.getState()

// Listener para cambios de conexión
if (typeof window !== 'undefined') {
  window.addEventListener('online', () => {
    getAppState().setOnlineStatus(true)
    // Auto-sync cuando vuelve la conexión
    getAppState().syncData()
  })
  
  window.addEventListener('offline', () => {
    getAppState().setOnlineStatus(false)
  })
}

// TODO: En Nivel 2 agregar:
// - Cache de datos con estrategias de invalidación
// - Optimistic updates
// - Conflict resolution para sincronización
// - Paginación de datos
// - Real-time subscriptions