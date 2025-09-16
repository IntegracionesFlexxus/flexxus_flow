const envLoader = require('../loaders/envLoader');

// Configuración del servidor por ambiente
class ServerConfig {
  constructor() {
    this.environment = envLoader.get('NODE_ENV', 'development');
    this.config = this.loadConfig();
  }

  // Cargar configuración según ambiente
  loadConfig() {
    const baseConfig = {
      // Configuración base común
      app: {
        name: envLoader.get('APP_NAME', 'Flexxus Flow'),
        version: '1.0.0',
        description: 'Sistema de gestión omnicanal'
      },
      
      server: {
        port: envLoader.getNumber('PORT', 3000),
        host: envLoader.get('HOST', 'localhost'),
        bodyLimit: '10mb',
        requestTimeout: 30000
      },

      cors: {
        origin: envLoader.getArray('CORS_ORIGIN', ',', ['http://localhost:3000']),
        credentials: envLoader.getBoolean('CORS_CREDENTIALS', true),
        methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
        allowedHeaders: ['Content-Type', 'Authorization', 'X-API-Key'],
        maxAge: 86400
      },

      rateLimit: {
        windowMs: envLoader.getNumber('RATE_LIMIT_WINDOW_MS', 60000),
        max: envLoader.getNumber('RATE_LIMIT_MAX_REQUESTS', 100),
        skipSuccessfulRequests: envLoader.getBoolean('RATE_LIMIT_SKIP_SUCCESSFUL_REQUESTS', false),
        message: 'Demasiadas peticiones, por favor intente más tarde'
      },

      pagination: {
        defaultLimit: envLoader.getNumber('PAGINATION_DEFAULT_LIMIT', 20),
        maxLimit: envLoader.getNumber('PAGINATION_MAX_LIMIT', 100)
      },

      uploads: {
        directory: envLoader.get('UPLOAD_DIR', 'uploads'),
        maxFileSize: envLoader.getNumber('MAX_FILE_SIZE', 10485760), // 10MB
        allowedTypes: envLoader.getArray('ALLOWED_FILE_TYPES', ',', [
          'jpg', 'jpeg', 'png', 'pdf', 'doc', 'docx', 'xls', 'xlsx'
        ])
      },

      timezone: envLoader.get('TIMEZONE', 'America/Mexico_City'),
      defaultLanguage: envLoader.get('DEFAULT_LANGUAGE', 'es')
    };

    // Configuraciones específicas por ambiente
    const environmentConfigs = {
      development: {
        ...baseConfig,
        debug: true,
        server: {
          ...baseConfig.server,
          host: 'localhost'
        },
        cors: {
          ...baseConfig.cors,
          origin: true // Permitir cualquier origen en desarrollo
        },
        rateLimit: {
          ...baseConfig.rateLimit,
          max: 1000 // Más permisivo en desarrollo
        }
      },

      production: {
        ...baseConfig,
        debug: false,
        server: {
          ...baseConfig.server,
          host: '0.0.0.0',
          requestTimeout: 60000
        },
        cors: {
          ...baseConfig.cors,
          origin: envLoader.getArray('CORS_ORIGIN', ',') // Estricto en producción
        },
        compression: {
          enabled: true,
          level: 6
        }
      },

      test: {
        ...baseConfig,
        debug: false,
        server: {
          ...baseConfig.server,
          port: 0 // Puerto aleatorio para tests
        },
        rateLimit: {
          ...baseConfig.rateLimit,
          max: 10000 // Sin límite real en tests
        }
      },

      staging: {
        ...baseConfig,
        debug: true,
        server: {
          ...baseConfig.server,
          host: '0.0.0.0'
        }
      }
    };

    return environmentConfigs[this.environment] || environmentConfigs.development;
  }

  // Obtener configuración completa
  getAll() {
    return this.config;
  }

  // Obtener sección específica
  get(section) {
    return this.config[section];
  }

  // Obtener valor específico usando path
  getValue(path) {
    const keys = path.split('.');
    let value = this.config;

    for (const key of keys) {
      if (value && typeof value === 'object' && key in value) {
        value = value[key];
      } else {
        return undefined;
      }
    }

    return value;
  }

  // Verificar si una característica está habilitada
  isFeatureEnabled(feature) {
    const featureKey = `FEATURE_${feature.toUpperCase()}`;
    return envLoader.getBoolean(featureKey, false);
  }

  // Obtener configuración de features
  getFeatures() {
    const features = {};
    const env = process.env;

    for (const key in env) {
      if (key.startsWith('FEATURE_')) {
        const featureName = key.replace('FEATURE_', '').toLowerCase();
        features[featureName] = env[key] === 'true';
      }
    }

    return features;
  }

  // Recargar configuración
  reload() {
    envLoader.reload();
    this.config = this.loadConfig();
  }

  // Obtener resumen de configuración
  getSummary() {
    return {
      environment: this.environment,
      app: this.config.app,
      server: {
        port: this.config.server.port,
        host: this.config.server.host
      },
      features: this.getFeatures(),
      debug: this.config.debug || false
    };
  }
}

// Singleton instance
const serverConfig = new ServerConfig();

module.exports = serverConfig;