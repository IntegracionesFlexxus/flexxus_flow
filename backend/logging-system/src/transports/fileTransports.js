const winston = require('winston');
const DailyRotateFile = require('winston-daily-rotate-file');
const path = require('path');
const fs = require('fs');

// Crear directorio de logs si no existe
function ensureLogDirectory(logDir) {
  if (!fs.existsSync(logDir)) {
    fs.mkdirSync(logDir, { recursive: true });
    console.log(`✓ Directorio de logs creado: ${logDir}`);
  }
}

// Crear transport con rotación diaria
function createRotatingTransport(options) {
  const {
    filename,
    dirname = './logs',
    datePattern = 'YYYY-MM-DD',
    maxSize = '20m',
    maxFiles = '14d',
    level = 'info',
    format,
    zippedArchive = true
  } = options;

  ensureLogDirectory(dirname);

  return new DailyRotateFile({
    filename: `${filename}-%DATE%.log`,
    dirname,
    datePattern,
    maxSize,
    maxFiles,
    level,
    format,
    zippedArchive,
    handleExceptions: true,
    handleRejections: true
  });
}

// Transport para logs generales
function createAppTransport(config, format) {
  return createRotatingTransport({
    filename: 'app',
    dirname: config.files.directory,
    datePattern: config.files.datePattern,
    maxSize: config.files.maxSize,
    maxFiles: config.files.maxFiles,
    level: 'info',
    format,
    zippedArchive: config.files.zippedArchive
  });
}

// Transport para logs de error
function createErrorTransport(config, format) {
  return createRotatingTransport({
    filename: 'error',
    dirname: config.files.directory,
    datePattern: config.files.datePattern,
    maxSize: config.files.maxSize,
    maxFiles: config.files.maxFiles,
    level: 'error',
    format,
    zippedArchive: config.files.zippedArchive
  });
}

// Transport para logs de acceso HTTP
function createAccessTransport(config, format) {
  return createRotatingTransport({
    filename: 'access',
    dirname: config.files.directory,
    datePattern: config.files.datePattern,
    maxSize: config.files.maxSize,
    maxFiles: '7d', // Menos retención para logs de acceso
    level: 'http',
    format,
    zippedArchive: config.files.zippedArchive
  });
}

// Transport para logs de base de datos
function createDatabaseTransport(config, format) {
  return createRotatingTransport({
    filename: 'database',
    dirname: config.files.directory,
    datePattern: config.files.datePattern,
    maxSize: config.files.maxSize,
    maxFiles: config.files.maxFiles,
    level: 'debug',
    format,
    zippedArchive: config.files.zippedArchive
  });
}

// Transport para logs de seguridad
function createSecurityTransport(config, format) {
  return createRotatingTransport({
    filename: 'security',
    dirname: config.files.directory,
    datePattern: config.files.datePattern,
    maxSize: config.files.maxSize,
    maxFiles: '30d', // Mayor retención para seguridad
    level: 'warn',
    format,
    zippedArchive: config.files.zippedArchive
  });
}

// Transport para logs de performance
function createPerformanceTransport(config, format) {
  return createRotatingTransport({
    filename: 'performance',
    dirname: config.files.directory,
    datePattern: config.files.datePattern,
    maxSize: config.files.maxSize,
    maxFiles: '7d',
    level: 'info',
    format,
    zippedArchive: config.files.zippedArchive
  });
}

// Transport combinado (todos los logs en un archivo)
function createCombinedTransport(config, format) {
  return createRotatingTransport({
    filename: 'combined',
    dirname: config.files.directory,
    datePattern: config.files.datePattern,
    maxSize: '50m', // Archivo más grande para combined
    maxFiles: config.files.maxFiles,
    level: 'debug',
    format,
    zippedArchive: config.files.zippedArchive
  });
}

// Crear todos los transports según configuración
function createAllTransports(config, formats) {
  const transports = [];

  // Console transport
  if (config.console.enabled) {
    transports.push(
      new winston.transports.Console({
        level: config.level,
        format: formats.console,
        handleExceptions: true,
        handleRejections: true
      })
    );
  }

  // File transports
  transports.push(
    createAppTransport(config, formats.file),
    createErrorTransport(config, formats.file),
    createAccessTransport(config, formats.http),
    createDatabaseTransport(config, formats.file),
    createSecurityTransport(config, formats.file),
    createPerformanceTransport(config, formats.performance)
  );

  // Combined transport solo en desarrollo
  if (config.environment === 'development') {
    transports.push(createCombinedTransport(config, formats.file));
  }

  return transports;
}

// Obtener información de archivos de log
function getLogFiles(logDir = './logs') {
  if (!fs.existsSync(logDir)) {
    return [];
  }

  const files = fs.readdirSync(logDir);
  const logFiles = [];

  files.forEach(file => {
    const filePath = path.join(logDir, file);
    const stats = fs.statSync(filePath);
    
    logFiles.push({
      name: file,
      path: filePath,
      size: stats.size,
      sizeInMB: (stats.size / (1024 * 1024)).toFixed(2),
      created: stats.birthtime,
      modified: stats.mtime,
      isCompressed: file.endsWith('.gz')
    });
  });

  return logFiles.sort((a, b) => b.modified - a.modified);
}

// Limpiar logs antiguos manualmente
function cleanOldLogs(logDir = './logs', daysToKeep = 30) {
  if (!fs.existsSync(logDir)) {
    return { cleaned: 0, errors: [] };
  }

  const now = Date.now();
  const maxAge = daysToKeep * 24 * 60 * 60 * 1000;
  let cleaned = 0;
  const errors = [];

  const files = fs.readdirSync(logDir);
  
  files.forEach(file => {
    try {
      const filePath = path.join(logDir, file);
      const stats = fs.statSync(filePath);
      const age = now - stats.mtime.getTime();
      
      if (age > maxAge) {
        fs.unlinkSync(filePath);
        cleaned++;
        console.log(`✓ Eliminado: ${file}`);
      }
    } catch (error) {
      errors.push({ file, error: error.message });
    }
  });

  return { cleaned, errors };
}

module.exports = {
  ensureLogDirectory,
  createRotatingTransport,
  createAppTransport,
  createErrorTransport,
  createAccessTransport,
  createDatabaseTransport,
  createSecurityTransport,
  createPerformanceTransport,
  createCombinedTransport,
  createAllTransports,
  getLogFiles,
  cleanOldLogs
};