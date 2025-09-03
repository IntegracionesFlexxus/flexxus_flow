// Environment configuration helper - MVP Nivel 1
// TODO: En Nivel 2 agregar validación de esquema, encriptación de valores sensibles

interface EnvConfig {
  // Application
  APP_NAME: string;
  APP_VERSION: string;
  APP_ENV: 'development' | 'staging' | 'production';
  IS_DEV: boolean;
  IS_PROD: boolean;
  
  // API
  API_BASE_URL: string;
  API_TIMEOUT: number;
  
  // WebSocket
  WS_URL: string;
  WS_RECONNECT_ATTEMPTS: number;
  WS_RECONNECT_DELAY: number;
  
  // Auth
  AUTH_TOKEN_KEY: string;
  AUTH_REFRESH_TOKEN_KEY: string;
  AUTH_SESSION_TIMEOUT: number;
  
  // Storage
  STORAGE_PREFIX: string;
  
  // Feature Flags
  FEATURES: {
    NOTIFICATIONS: boolean;
    REAL_TIME: boolean;
    ANALYTICS: boolean;
    DEBUG: boolean;
  };
  
  // External Services
  GOOGLE_ANALYTICS_ID?: string;
  SENTRY_DSN?: string;
  INTERCOM_APP_ID?: string;
  
  // Build
  BUILD_SOURCEMAP: boolean;
  BUILD_MINIFY: boolean;
  
  // Public URL
  PUBLIC_URL: string;
}

// Helper para parsear booleanos de env
const parseBoolean = (value: string | undefined, defaultValue = false): boolean => {
  if (!value) return defaultValue;
  return value.toLowerCase() === 'true';
};

// Helper para parsear números de env
const parseNumber = (value: string | undefined, defaultValue: number): number => {
  const num = Number(value);
  return isNaN(num) ? defaultValue : num;
};

// Configuración del entorno
const config: EnvConfig = {
  // Application
  APP_NAME: import.meta.env.VITE_APP_NAME || 'Flexxus Flow',
  APP_VERSION: import.meta.env.VITE_APP_VERSION || '1.0.0',
  APP_ENV: (import.meta.env.VITE_APP_ENV || 'development') as EnvConfig['APP_ENV'],
  IS_DEV: import.meta.env.DEV,
  IS_PROD: import.meta.env.PROD,
  
  // API
  API_BASE_URL: import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001/api',
  API_TIMEOUT: parseNumber(import.meta.env.VITE_API_TIMEOUT, 30000),
  
  // WebSocket
  WS_URL: import.meta.env.VITE_WS_URL || 'ws://localhost:3001',
  WS_RECONNECT_ATTEMPTS: parseNumber(import.meta.env.VITE_WS_RECONNECT_ATTEMPTS, 5),
  WS_RECONNECT_DELAY: parseNumber(import.meta.env.VITE_WS_RECONNECT_DELAY, 5000),
  
  // Auth
  AUTH_TOKEN_KEY: import.meta.env.VITE_AUTH_TOKEN_KEY || 'flexxus_token',
  AUTH_REFRESH_TOKEN_KEY: import.meta.env.VITE_AUTH_REFRESH_TOKEN_KEY || 'flexxus_refresh_token',
  AUTH_SESSION_TIMEOUT: parseNumber(import.meta.env.VITE_AUTH_SESSION_TIMEOUT, 3600000),
  
  // Storage
  STORAGE_PREFIX: import.meta.env.VITE_STORAGE_PREFIX || 'flexxus_',
  
  // Feature Flags
  FEATURES: {
    NOTIFICATIONS: parseBoolean(import.meta.env.VITE_FEATURE_NOTIFICATIONS, true),
    REAL_TIME: parseBoolean(import.meta.env.VITE_FEATURE_REAL_TIME, true),
    ANALYTICS: parseBoolean(import.meta.env.VITE_FEATURE_ANALYTICS, false),
    DEBUG: parseBoolean(import.meta.env.VITE_FEATURE_DEBUG, import.meta.env.DEV),
  },
  
  // External Services
  GOOGLE_ANALYTICS_ID: import.meta.env.VITE_GOOGLE_ANALYTICS_ID,
  SENTRY_DSN: import.meta.env.VITE_SENTRY_DSN,
  INTERCOM_APP_ID: import.meta.env.VITE_INTERCOM_APP_ID,
  
  // Build
  BUILD_SOURCEMAP: parseBoolean(import.meta.env.VITE_BUILD_SOURCEMAP, false),
  BUILD_MINIFY: parseBoolean(import.meta.env.VITE_BUILD_MINIFY, true),
  
  // Public URL
  PUBLIC_URL: import.meta.env.VITE_PUBLIC_URL || '/',
};

// Validar configuración requerida
const validateConfig = () => {
  const required = [
    'APP_NAME',
    'API_BASE_URL',
    'WS_URL',
  ];
  
  const missing = required.filter(key => !config[key as keyof EnvConfig]);
  
  if (missing.length > 0) {
    console.error('[Config] Missing required environment variables:', missing);
    if (config.IS_PROD) {
      throw new Error(`Missing required configuration: ${missing.join(', ')}`);
    }
  }
};

// Log configuration in development
if (config.IS_DEV && config.FEATURES.DEBUG) {
  console.log('[Config] Environment configuration:', {
    APP_ENV: config.APP_ENV,
    API_BASE_URL: config.API_BASE_URL,
    WS_URL: config.WS_URL,
    FEATURES: config.FEATURES,
  });
}

// Validate on load
validateConfig();

// Helper functions
export const isDevelopment = () => config.IS_DEV;
export const isProduction = () => config.IS_PROD;
export const isStaging = () => config.APP_ENV === 'staging';
export const getEnvironment = () => config.APP_ENV;
export const isFeatureEnabled = (feature: keyof typeof config.FEATURES) => config.FEATURES[feature];

// Export configuration
export default config;