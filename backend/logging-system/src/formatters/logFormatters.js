const winston = require('winston');
const chalk = require('chalk');

// Formato para desarrollo (colorido y legible)
const developmentFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.errors({ stack: true }),
  winston.format.splat(),
  winston.format.printf(({ timestamp, level, message, ...metadata }) => {
    let msg = `${timestamp} [${level.toUpperCase()}]: ${message}`;
    
    // Agregar metadata si existe
    if (Object.keys(metadata).length > 0) {
      // Excluir stack trace del metadata general
      const { stack, ...cleanMetadata } = metadata;
      
      if (Object.keys(cleanMetadata).length > 0) {
        msg += `\n  ${chalk.gray(JSON.stringify(cleanMetadata, null, 2))}`;
      }
      
      // Agregar stack trace si existe
      if (stack) {
        msg += `\n${chalk.red(stack)}`;
      }
    }
    
    return msg;
  })
);

// Formato para producción (JSON estructurado)
const productionFormat = winston.format.combine(
  winston.format.timestamp(),
  winston.format.errors({ stack: true }),
  winston.format.splat(),
  winston.format.json()
);

// Formato para archivos (JSON con metadata completa)
const fileFormat = winston.format.combine(
  winston.format.timestamp(),
  winston.format.errors({ stack: true }),
  winston.format.splat(),
  winston.format.uncolorize(),
  winston.format.json()
);

// Formato simplificado para consola
const simpleFormat = winston.format.combine(
  winston.format.timestamp({ format: 'HH:mm:ss' }),
  winston.format.printf(({ timestamp, level, message }) => {
    return `${timestamp} ${level}: ${message}`;
  })
);

// Formato para logs de acceso HTTP
const httpFormat = winston.format.combine(
  winston.format.timestamp(),
  winston.format.json(),
  winston.format.printf((info) => {
    const { timestamp, level, message, ...meta } = info;
    
    // Extraer información HTTP si existe
    const httpInfo = {
      timestamp,
      level,
      method: meta.method || 'N/A',
      url: meta.url || meta.path || 'N/A',
      status: meta.status || meta.statusCode || 'N/A',
      responseTime: meta.responseTime || meta.duration || 'N/A',
      ip: meta.ip || meta.remoteAddr || 'N/A',
      userAgent: meta.userAgent || 'N/A'
    };
    
    return JSON.stringify(httpInfo);
  })
);

// Formato para logs de error con contexto
const errorFormat = winston.format.combine(
  winston.format.timestamp(),
  winston.format.errors({ stack: true }),
  winston.format.json(),
  winston.format.printf((info) => {
    const error = {
      timestamp: info.timestamp,
      level: info.level,
      message: info.message,
      error: {
        name: info.name || 'Error',
        message: info.message,
        stack: info.stack,
        code: info.code,
        statusCode: info.statusCode
      },
      context: {
        service: info.service,
        userId: info.userId,
        requestId: info.requestId,
        ...info.metadata
      }
    };
    
    return JSON.stringify(error);
  })
);

// Formato para métricas de performance
const performanceFormat = winston.format.combine(
  winston.format.timestamp(),
  winston.format.json(),
  winston.format.printf((info) => {
    const metric = {
      timestamp: info.timestamp,
      level: info.level,
      operation: info.operation || 'unknown',
      duration: info.duration || 0,
      success: info.success !== undefined ? info.success : true,
      metadata: info.metadata || {}
    };
    
    return JSON.stringify(metric);
  })
);

// Formato para auditoría
const auditFormat = winston.format.combine(
  winston.format.timestamp(),
  winston.format.json(),
  winston.format.printf((info) => {
    const audit = {
      timestamp: info.timestamp,
      level: info.level,
      action: info.action,
      user: info.user || 'system',
      resource: info.resource,
      result: info.result || 'success',
      details: info.details || {},
      ip: info.ip,
      userAgent: info.userAgent
    };
    
    return JSON.stringify(audit);
  })
);

// Selector de formato según ambiente y tipo
function getFormat(type = 'default', environment = 'development') {
  const formats = {
    development: {
      default: developmentFormat,
      file: fileFormat,
      http: httpFormat,
      error: developmentFormat,
      performance: developmentFormat,
      audit: developmentFormat
    },
    production: {
      default: productionFormat,
      file: fileFormat,
      http: httpFormat,
      error: errorFormat,
      performance: performanceFormat,
      audit: auditFormat
    },
    test: {
      default: simpleFormat,
      file: fileFormat,
      http: simpleFormat,
      error: simpleFormat,
      performance: simpleFormat,
      audit: simpleFormat
    }
  };

  const envFormats = formats[environment] || formats.development;
  return envFormats[type] || envFormats.default;
}

module.exports = {
  developmentFormat,
  productionFormat,
  fileFormat,
  simpleFormat,
  httpFormat,
  errorFormat,
  performanceFormat,
  auditFormat,
  getFormat
};