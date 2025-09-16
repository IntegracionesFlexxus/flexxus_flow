/**
 * Feature Flags Configuration - Sprint 2
 * Siguiendo lineamientos nivel 2: Configuración centralizada y validada
 * Configuración de feature flags con validación de variables de entorno
 */

// Types para configuración
interface FeatureFlagEnvironmentConfig {
  apiBaseUrl: string;
  defaultCacheTtl: number;
  batchEvaluationEnabled: boolean;
  debugMode: boolean;
  fallbackOnError: boolean;
  maxRetries: number;
  requestTimeout: number;
  trackingEnabled: boolean;
  environment: 'development' | 'staging' | 'production';
}

interface FeatureFlagDefaults {
  [key: string]: {
    defaultValue: boolean;
    description: string;
    category: string;
  };
}

/**
 * Configuración de feature flags desde variables de entorno
 * Siguiendo principio de configuración centralizada
 */
const getFeatureFlagConfig = (): FeatureFlagEnvironmentConfig => {
  // Validar variables de entorno requeridas
  const requiredEnvVars = ['VITE_API_BASE_URL'];
  const missingVars = requiredEnvVars.filter(varName => !import.meta.env[varName]);
  
  if (missingVars.length > 0) {
    throw new Error(`Missing required environment variables: ${missingVars.join(', ')}`);
  }

  return {
    apiBaseUrl: import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001',
    defaultCacheTtl: parseInt(import.meta.env.VITE_FEATURE_FLAGS_CACHE_TTL) || 300000, // 5 minutos
    batchEvaluationEnabled: import.meta.env.VITE_FEATURE_FLAGS_BATCH_ENABLED !== 'false',
    debugMode: import.meta.env.VITE_FEATURE_FLAGS_DEBUG === 'true' || 
               import.meta.env.NODE_ENV === 'development',
    fallbackOnError: import.meta.env.VITE_FEATURE_FLAGS_FALLBACK_ON_ERROR !== 'false',
    maxRetries: parseInt(import.meta.env.VITE_FEATURE_FLAGS_MAX_RETRIES) || 2,
    requestTimeout: parseInt(import.meta.env.VITE_FEATURE_FLAGS_TIMEOUT) || 10000, // 10 segundos
    trackingEnabled: import.meta.env.VITE_FEATURE_FLAGS_TRACKING === 'true',
    environment: (import.meta.env.NODE_ENV as any) || 'development'
  };
};

/**
 * Definiciones de feature flags conocidos con valores por defecto
 * Facilita el desarrollo y testing
 */
export const FEATURE_FLAG_DEFAULTS: FeatureFlagDefaults = {
  // Funcionalidades de autenticación
  'auth-v2': {
    defaultValue: false,
    description: 'Nueva versión del sistema de autenticación',
    category: 'authentication'
  },
  'multi-factor-auth': {
    defaultValue: false,
    description: 'Autenticación de múltiples factores',
    category: 'authentication'
  },
  'social-login': {
    defaultValue: false,
    description: 'Login con redes sociales',
    category: 'authentication'
  },

  // Dashboard y UI
  'new-dashboard': {
    defaultValue: false,
    description: 'Nuevo diseño del dashboard principal',
    category: 'ui'
  },
  'dark-theme': {
    defaultValue: true,
    description: 'Tema oscuro en la interfaz',
    category: 'ui'
  },
  'compact-sidebar': {
    defaultValue: false,
    description: 'Sidebar compacto',
    category: 'ui'
  },

  // Funcionalidades beta
  'beta-features': {
    defaultValue: false,
    description: 'Acceso a funcionalidades en beta',
    category: 'beta'
  },
  'experimental-search': {
    defaultValue: false,
    description: 'Motor de búsqueda experimental',
    category: 'beta'
  },
  'advanced-analytics': {
    defaultValue: false,
    description: 'Analytics avanzados',
    category: 'beta'
  },

  // Integraciones
  'third-party-integrations': {
    defaultValue: false,
    description: 'Integraciones con servicios externos',
    category: 'integrations'
  },
  'webhook-support': {
    defaultValue: false,
    description: 'Soporte para webhooks',
    category: 'integrations'
  },
  'api-v2': {
    defaultValue: false,
    description: 'Nueva versión de la API',
    category: 'integrations'
  },

  // Performance y optimizaciones
  'lazy-loading': {
    defaultValue: true,
    description: 'Carga lazy de componentes',
    category: 'performance'
  },
  'virtual-scrolling': {
    defaultValue: false,
    description: 'Scroll virtual para listas grandes',
    category: 'performance'
  },
  'service-worker': {
    defaultValue: false,
    description: 'Service Worker para cache',
    category: 'performance'
  },

  // Funcionalidades de negocio
  'advanced-reports': {
    defaultValue: false,
    description: 'Reportes avanzados',
    category: 'business'
  },
  'bulk-operations': {
    defaultValue: false,
    description: 'Operaciones en lote',
    category: 'business'
  },
  'export-features': {
    defaultValue: true,
    description: 'Funcionalidades de exportación',
    category: 'business'
  }
};

/**
 * Configuración de categorías de feature flags
 */
export const FEATURE_FLAG_CATEGORIES = {
  authentication: {
    name: 'Autenticación',
    description: 'Funcionalidades relacionadas con autenticación y seguridad',
    color: '#f44336'
  },
  ui: {
    name: 'Interfaz de Usuario',
    description: 'Cambios en la interfaz y experiencia de usuario',
    color: '#2196f3'
  },
  beta: {
    name: 'Funcionalidades Beta',
    description: 'Funcionalidades experimentales en pruebas',
    color: '#ff9800'
  },
  integrations: {
    name: 'Integraciones',
    description: 'Integraciones con servicios externos y APIs',
    color: '#4caf50'
  },
  performance: {
    name: 'Performance',
    description: 'Optimizaciones de rendimiento',
    color: '#9c27b0'
  },
  business: {
    name: 'Negocio',
    description: 'Funcionalidades de lógica de negocio',
    color: '#607d8b'
  }
};

/**
 * Configuración de seguridad para feature flags
 */
export const SECURITY_CONFIG = {
  // Flags que requieren roles específicos
  roleBasedFlags: {
    'admin-panel': ['admin', 'super_admin'],
    'advanced-reports': ['admin', 'manager'],
    'bulk-operations': ['admin', 'manager'],
    'system-settings': ['admin']
  },

  // Flags que requieren planes específicos
  planBasedFlags: {
    'advanced-analytics': ['professional', 'enterprise'],
    'third-party-integrations': ['enterprise'],
    'webhook-support': ['professional', 'enterprise'],
    'api-v2': ['enterprise']
  },

  // Flags sensibles que requieren logging adicional
  sensitiveFlags: [
    'admin-panel',
    'system-settings',
    'bulk-operations',
    'third-party-integrations'
  ]
};

/**
 * Configuración exportada
 */
let config: FeatureFlagEnvironmentConfig;

try {
  config = getFeatureFlagConfig();
} catch (error) {
  console.error('Error loading feature flag configuration:', error);
  // Configuración de fallback para desarrollo
  config = {
    apiBaseUrl: 'http://localhost:3001',
    defaultCacheTtl: 300000,
    batchEvaluationEnabled: true,
    debugMode: true,
    fallbackOnError: true,
    maxRetries: 2,
    requestTimeout: 10000,
    trackingEnabled: false,
    environment: 'development'
  };
}

export const featureFlagConfig = config;

/**
 * Utilidades para trabajar con feature flags
 */
export const FeatureFlagUtils = {
  /**
   * Verifica si un flag es sensible
   */
  isSensitiveFlag(flagName: string): boolean {
    return SECURITY_CONFIG.sensitiveFlags.includes(flagName);
  },

  /**
   * Obtiene los roles requeridos para un flag
   */
  getRequiredRoles(flagName: string): string[] {
    return SECURITY_CONFIG.roleBasedFlags[flagName] || [];
  },

  /**
   * Obtiene los planes requeridos para un flag
   */
  getRequiredPlans(flagName: string): string[] {
    return SECURITY_CONFIG.planBasedFlags[flagName] || [];
  },

  /**
   * Obtiene la configuración por defecto de un flag
   */
  getDefaultConfig(flagName: string) {
    return FEATURE_FLAG_DEFAULTS[flagName] || {
      defaultValue: false,
      description: 'Feature flag no documentado',
      category: 'uncategorized'
    };
  },

  /**
   * Obtiene flags por categoría
   */
  getFlagsByCategory(category: string): string[] {
    return Object.entries(FEATURE_FLAG_DEFAULTS)
      .filter(([_, config]) => config.category === category)
      .map(([flagName]) => flagName);
  },

  /**
   * Valida nombre de feature flag
   */
  isValidFlagName(flagName: string): boolean {
    return /^[a-z][a-z0-9-]*[a-z0-9]$/.test(flagName);
  },

  /**
   * Genera clave de cache para un flag
   */
  generateCacheKey(flagName: string, userId?: string, companyId?: string): string {
    return `ff:${flagName}:${userId || 'anon'}:${companyId || 'default'}`;
  }
};

// Validación inicial de configuración
if (config.debugMode) {
  console.log('[FeatureFlags] Configuration loaded:', {
    environment: config.environment,
    apiBaseUrl: config.apiBaseUrl,
    batchEvaluationEnabled: config.batchEvaluationEnabled,
    debugMode: config.debugMode
  });
}

export default featureFlagConfig;