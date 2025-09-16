import { QueryClient } from '@tanstack/react-query';

// Configuración de React Query para caché optimizado - MVP Nivel 1
// TODO: En Nivel 2 agregar persistencia de caché y sincronización offline

// Tiempos de caché por tipo de dato
const CACHE_TIMES = {
  // Datos que cambian raramente
  STATIC: {
    staleTime: 60 * 60 * 1000, // 1 hora
    cacheTime: 24 * 60 * 60 * 1000, // 24 horas
  },
  // Datos de configuración
  CONFIG: {
    staleTime: 30 * 60 * 1000, // 30 minutos
    cacheTime: 60 * 60 * 1000, // 1 hora
  },
  // Datos de usuario/sesión
  USER: {
    staleTime: 10 * 60 * 1000, // 10 minutos
    cacheTime: 30 * 60 * 1000, // 30 minutos
  },
  // Datos que cambian frecuentemente
  DYNAMIC: {
    staleTime: 1 * 60 * 1000, // 1 minuto
    cacheTime: 5 * 60 * 1000, // 5 minutos
  },
  // Datos en tiempo real (casi sin caché)
  REALTIME: {
    staleTime: 0, // Siempre stale
    cacheTime: 30 * 1000, // 30 segundos
  },
};

// Cliente de React Query con configuración optimizada
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Configuración por defecto para queries
      staleTime: CACHE_TIMES.DYNAMIC.staleTime,
      cacheTime: CACHE_TIMES.DYNAMIC.cacheTime,
      
      // Retry con backoff exponencial
      retry: (failureCount, error: any) => {
        // No reintentar en errores 4xx
        if (error?.response?.status >= 400 && error?.response?.status < 500) {
          return false;
        }
        // Máximo 3 reintentos para otros errores
        return failureCount < 3;
      },
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
      
      // Refetch configuration
      refetchOnWindowFocus: false, // Evitar refetch excesivo
      refetchOnReconnect: 'always',
      refetchOnMount: true,
      
      // Network mode
      networkMode: 'online', // Solo funciona online (por ahora)
    },
    mutations: {
      // Configuración para mutations
      retry: 1,
      retryDelay: 1000,
      
      // Callbacks globales
      onError: (error: any) => {
        console.error('Mutation error:', error);
        // TODO: En Nivel 2 agregar notificación al usuario
      },
    },
  },
});

// Query keys factory para consistencia
export const queryKeys = {
  // Auth
  auth: {
    all: ['auth'] as const,
    user: () => [...queryKeys.auth.all, 'user'] as const,
    companies: () => [...queryKeys.auth.all, 'companies'] as const,
    permissions: () => [...queryKeys.auth.all, 'permissions'] as const,
  },
  
  // Omnichannel
  omni: {
    all: ['omni'] as const,
    conversations: (filters?: any) => 
      [...queryKeys.omni.all, 'conversations', filters] as const,
    conversation: (id: string) => 
      [...queryKeys.omni.all, 'conversation', id] as const,
    messages: (conversationId: string) => 
      [...queryKeys.omni.all, 'messages', conversationId] as const,
  },
  
  // CRM
  crm: {
    all: ['crm'] as const,
    contacts: (filters?: any) => 
      [...queryKeys.crm.all, 'contacts', filters] as const,
    contact: (id: string) => 
      [...queryKeys.crm.all, 'contact', id] as const,
    companies: (filters?: any) => 
      [...queryKeys.crm.all, 'companies', filters] as const,
    company: (id: string) => 
      [...queryKeys.crm.all, 'company', id] as const,
  },
  
  // Workflows
  workflow: {
    all: ['workflow'] as const,
    list: (filters?: any) => 
      [...queryKeys.workflow.all, 'list', filters] as const,
    detail: (id: string) => 
      [...queryKeys.workflow.all, 'detail', id] as const,
    executions: (workflowId: string) => 
      [...queryKeys.workflow.all, 'executions', workflowId] as const,
  },
  
  // Analytics
  analytics: {
    all: ['analytics'] as const,
    dashboard: (period?: string) => 
      [...queryKeys.analytics.all, 'dashboard', period] as const,
    reports: (type: string, filters?: any) => 
      [...queryKeys.analytics.all, 'reports', type, filters] as const,
    metrics: (metric: string, period?: string) => 
      [...queryKeys.analytics.all, 'metrics', metric, period] as const,
  },
  
  // Settings
  settings: {
    all: ['settings'] as const,
    general: () => [...queryKeys.settings.all, 'general'] as const,
    notifications: () => [...queryKeys.settings.all, 'notifications'] as const,
    integrations: () => [...queryKeys.settings.all, 'integrations'] as const,
  },
};

// Funciones helper para invalidación de caché
export const invalidateQueries = {
  // Invalidar todo el caché de un módulo
  module: (module: keyof typeof queryKeys) => {
    queryClient.invalidateQueries({ queryKey: queryKeys[module].all });
  },
  
  // Invalidar queries específicas
  specific: (queryKey: readonly unknown[]) => {
    queryClient.invalidateQueries({ queryKey });
  },
  
  // Invalidar todo (usar con cuidado)
  all: () => {
    queryClient.invalidateQueries();
  },
};

// Funciones para prefetch de datos
export const prefetchQueries = {
  // Prefetch de datos de usuario al login
  userSession: async () => {
    // Prefetch datos del usuario
    await queryClient.prefetchQuery({
      queryKey: queryKeys.auth.user(),
      queryFn: async () => {
        // TODO: Implementar llamada real a API
        return Promise.resolve({});
      },
      staleTime: CACHE_TIMES.USER.staleTime,
    });
    
    // Prefetch empresas
    await queryClient.prefetchQuery({
      queryKey: queryKeys.auth.companies(),
      queryFn: async () => {
        // TODO: Implementar llamada real a API
        return Promise.resolve([]);
      },
      staleTime: CACHE_TIMES.CONFIG.staleTime,
    });
  },
  
  // Prefetch de datos del dashboard
  dashboard: async () => {
    await queryClient.prefetchQuery({
      queryKey: queryKeys.analytics.dashboard('today'),
      queryFn: async () => {
        // TODO: Implementar llamada real a API
        return Promise.resolve({});
      },
      staleTime: CACHE_TIMES.DYNAMIC.staleTime,
    });
  },
};

// Configuración de caché por tipo
export const getCacheConfig = (type: keyof typeof CACHE_TIMES) => {
  return CACHE_TIMES[type];
};

// Hook para usar configuración de caché
export const useCacheConfig = (type: keyof typeof CACHE_TIMES = 'DYNAMIC') => {
  return CACHE_TIMES[type];
};

export default queryClient;