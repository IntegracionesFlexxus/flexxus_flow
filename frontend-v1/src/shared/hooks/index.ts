// Exportación centralizada de Custom Hooks
// Nivel 1 - MVP con funcionalidad básica

// Hook de autenticación y autorización
export { useAuth } from './useAuth';

// Hook para persistencia local
export { 
  useLocalStorage, 
  useUserPreferences, 
  useFormDraft 
} from './useLocalStorage';

// Hooks de optimización de rendimiento
export { 
  useDebounce, 
  useDebouncedCallback, 
  useDebouncedSearch,
  useThrottle 
} from './useDebounce';

// Hooks para operaciones asíncronas
export { 
  useAsync, 
  useAsyncParallel, 
  usePolling 
} from './useAsync';

// Hook para WebSocket y tiempo real
export { 
  useWebSocket, 
  useChatWebSocket 
} from './useWebSocket';

// Hooks para manejo de formularios
export { 
  useForm, 
  useField, 
  validators 
} from './useForm';

// Hooks para notificaciones y feedback UI
export { 
  useNotification,
  useGlobalNotification,
  initializeGlobalNotifications,
  useToast
} from './useNotification';

// Re-export de tipos útiles
export type { Notification } from './useNotification';