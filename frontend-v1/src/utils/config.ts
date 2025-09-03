// Configuración centralizada para el MVP
// TODO: En Nivel 2 agregar validación de variables de entorno

export const config = {
  // API URL - usa variable de entorno o valor por defecto
  apiUrl: import.meta.env.VITE_API_URL || 'http://localhost:3001/api/v1',
  
  // Ambiente
  env: import.meta.env.VITE_ENV || 'development',
  
  // Configuraciones hardcodeadas temporalmente
  // TODO: Mover a .env en Nivel 2
  app: {
    name: 'Flexxus Flow',
    version: '1.0.0',
    description: 'Sistema de Gestión Omnicanal',
  },
  
  // Timeouts y límites
  // TODO: Hacer configurables en Nivel 2
  api: {
    timeout: 30000, // 30 segundos
    retryAttempts: 3,
  },
  
  // Features flags básicos
  // TODO: Implementar sistema completo de feature flags en Nivel 2
  features: {
    enableWebsocket: false,
    enableAnalytics: false,
    enableNotifications: false,
  },
  
  // Configuración de desarrollo
  isDevelopment: () => config.env === 'development',
  isProduction: () => config.env === 'production',
}

export default config