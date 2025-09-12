/// <reference types="vite/client" />

// Definición de tipos para variables de entorno
interface ImportMetaEnv {
  // Application
  readonly VITE_APP_NAME: string
  readonly VITE_APP_VERSION: string
  readonly VITE_APP_ENV: 'development' | 'production' | 'test'
  
  // API Configuration
  readonly VITE_API_URL: string
  readonly VITE_API_BASE_URL: string
  readonly VITE_API_TIMEOUT: string
  readonly VITE_ENV: 'development' | 'production' | 'test'
  
  // WebSocket Configuration
  readonly VITE_WS_URL: string
  readonly VITE_WS_RECONNECT_ATTEMPTS: string
  readonly VITE_WS_RECONNECT_DELAY: string
  
  // Feature Flags
  readonly VITE_FEATURE_FLAGS_CACHE_TTL: string
  readonly VITE_FEATURE_FLAGS_BATCH_ENABLED: string
  readonly VITE_FEATURE_FLAGS_DEBUG: string
  readonly VITE_FEATURE_FLAGS_FALLBACK_ON_ERROR: string
  readonly VITE_FEATURE_FLAGS_MAX_RETRIES: string
  readonly VITE_FEATURE_FLAGS_TIMEOUT: string
  readonly VITE_FEATURE_FLAGS_TRACKING: string
  
  // Telemetry
  readonly VITE_TELEMETRY_ENABLED: string
  readonly VITE_TELEMETRY_ENDPOINT: string
  readonly VITE_TELEMETRY_KEY: string
  
  // Build
  readonly VITE_BUILD_TIME: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}