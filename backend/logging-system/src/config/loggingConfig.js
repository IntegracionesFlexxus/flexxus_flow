// Configuración del sistema de logging
// TODO: Mover a variables de entorno en Nivel 2

const config = {
  // Nivel de log por ambiente
  levels: {
    development: 'debug',
    production: 'info',
    test: 'error',
    staging: 'debug'
  },

  // Configuración de archivos
  files: {
    directory: './logs',
    maxSize: '20m',        // Tamaño máximo por archivo
    maxFiles: '14d',       // Retención de 14 días
    datePattern: 'YYYY-MM-DD',
    zippedArchive: true    // Comprimir archivos antiguos
  },

  // Niveles personalizados (compatibles con npm)
  customLevels: {
    levels: {
      error: 0,
      warn: 1,
      info: 2,
      http: 3,
      verbose: 4,
      debug: 5,
      silly: 6
    },
    colors: {
      error: 'red',
      warn: 'yellow',
      info: 'green',
      http: 'magenta',
      verbose: 'cyan',
      debug: 'blue',
      silly: 'grey'
    }
  },

  // Configuración por tipo de log
  categories: {
    app: {
      filename: 'app',
      level: 'info'
    },
    error: {
      filename: 'error',
      level: 'error'
    },
    access: {
      filename: 'access',
      level: 'http'
    },
    database: {
      filename: 'database',
      level: 'debug'
    },
    security: {
      filename: 'security',
      level: 'warn'
    },
    performance: {
      filename: 'performance',
      level: 'info'
    }
  },

  // Configuración de consola
  console: {
    enabled: true,
    prettyPrint: true,
    colorize: true,
    timestamp: true
  },

  // Metadatos por defecto
  defaultMeta: {
    service: 'flexxus-backend',
    version: '1.0.0'
  },

  // Configuración de Morgan (HTTP logging)
  morgan: {
    format: 'combined',
    skip: (req, res) => {
      // Skip health checks en producción
      return process.env.NODE_ENV === 'production' && req.url === '/health';
    }
  }
};

// Obtener configuración según ambiente
function getConfig(environment = 'development') {
  return {
    ...config,
    level: config.levels[environment] || 'info',
    environment
  };
}

module.exports = {
  config,
  getConfig
};