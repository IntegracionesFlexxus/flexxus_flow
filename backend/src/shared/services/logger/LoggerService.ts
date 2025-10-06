/**
 * LoggerService - Sistema de Logging Empresarial Seguro
 * Reemplaza todos los console.log con logging estructurado y sanitizado
 * Previene exposición de información sensible en producción
 */
import winston from 'winston';
import { injectable, inject, optional } from 'inversify';
import { TYPES } from '@/container/types';
import DailyRotateFile from 'winston-daily-rotate-file';
import { environment } from '@/config/environment';
export interface ILoggerService {
  info(message: string, meta?: any): void;
  error(message: string, error?: Error | any, meta?: any): void;
  warn(message: string, meta?: any): void;
  debug(message: string, meta?: any): void;
  audit(action: string, meta?: any): void;
  performance(operation: string, duration: number, meta?: any): void;
  security(event: string, meta?: any): void;
  setContext(key: string, value: any): void;
  clearContext(): void;
  child(context: Record<string, any>): ILoggerService;
}
/**
 * LoggerService seguro que previene exposición de información sensible
 * Implementa sanitización automática y logging estructurado
 */
@injectable()
export class LoggerService implements ILoggerService {
  private logger: winston.Logger;
  private context: Map<string, any> = new Map();
  private readonly sensitivePatterns: RegExp[];
  private readonly sensitiveKeys: string[];
  private readonly isProduction: boolean;
  private readonly isDevelopment: boolean;
  constructor(
    @inject(TYPES.Logger) @optional() existingLogger?: winston.Logger
  ) {
    this.isProduction = environment.nodeEnv === 'production';
    this.isDevelopment = environment.nodeEnv === 'development';
    // Patrones de información sensible
    this.sensitiveKeys = [
      'password', 'passwd', 'pwd', 'secret', 'token', 'apikey', 'api_key',
      'auth', 'authorization', 'cookie', 'session', 'credit', 'card',
      'cvv', 'ssn', 'pin', 'private', 'credential', 'key', 'cert',
      'certificate', 'oauth', 'bearer', 'refresh_token', 'access_token',
      'client_secret', 'client_id', 'encryption', 'salt', 'hash'
    ];
    this.sensitivePatterns = [
      /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/gi, // Email
      /\b(?:\d{4}[-\s]?){3}\d{4}\b/g, // Credit card
      /\b\d{3}-\d{2}-\d{4}\b/g, // SSN
      /Bearer\s+[A-Za-z0-9\-._~+\/]+=*/gi, // Bearer tokens
      /Basic\s+[A-Za-z0-9+\/]+=*/gi, // Basic auth
      /mongodb(\+srv)?:\/\/[^"'\s]+/gi, // MongoDB URI
      /postgres:\/\/[^"'\s]+/gi, // PostgreSQL URI
      /mysql:\/\/[^"'\s]+/gi, // MySQL URI
      /redis:\/\/[^"'\s]+/gi, // Redis URI
    ];
    // Usar logger existente o crear uno nuevo
    this.logger = existingLogger || this.createLogger();
  }
  private createLogger(): winston.Logger {
    const transports = this.getTransports();
    return winston.createLogger({
      level: this.getLogLevel(),
      format: this.getLogFormat(),
      transports,
      exitOnError: false,
      silent: environment.nodeEnv === 'test'
    });
  }
  private getLogLevel(): string {
    if (this.isProduction) return 'error';
    if (this.isDevelopment) return 'debug';
    return 'info';
  }
  private getLogFormat(): winston.Logform.Format {
    const formats = [
      winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss.SSS' }),
      winston.format.errors({ stack: true }),
      winston.format.splat()
    ];
    if (!this.isProduction) {
      formats.push(winston.format.colorize());
    }
    formats.push(
      winston.format.printf(({ timestamp, level, message, ...meta }) => {
        // Sanitizar ANTES de formatear
        const sanitizedMeta = this.sanitize(meta);
        const contextData = Object.fromEntries(this.context);
        // En producción, usar JSON para mejor parsing
        if (this.isProduction) {
          return JSON.stringify({
            timestamp,
            level,
            message: this.sanitizeString(String(message)),
            ...sanitizedMeta,
            context: this.sanitize(contextData)
          });
        }
        // En desarrollo, formato legible
        let log = `${timestamp} [${level}] ${message}`;
        if (Object.keys(sanitizedMeta).length > 0) {
          log += ` ${JSON.stringify(sanitizedMeta, null, 2)}`;
        }
        return log;
      })
    );
    return winston.format.combine(...formats);
  }
  private getTransports(): winston.transport[] {
    const transports: winston.transport[] = [];
    if (this.isProduction) {
      // En producción, NO escribir a consola excepto errores críticos
      transports.push(
        new winston.transports.Console({
          level: 'error',
          format: winston.format.simple(),
          silent: false
        })
      );
      // Archivo para errores con rotación diaria
      transports.push(
        new DailyRotateFile({
          filename: 'logs/error-%DATE%.log',
          datePattern: 'YYYY-MM-DD',
          level: 'error',
          maxSize: '20m',
          maxFiles: '14d',
          format: winston.format.json()
        })
      );
      // Archivo para todos los logs con rotación
      transports.push(
        new DailyRotateFile({
          filename: 'logs/combined-%DATE%.log',
          datePattern: 'YYYY-MM-DD',
          maxSize: '100m',
          maxFiles: '30d',
          format: winston.format.json()
        })
      );
      // Archivo específico para auditoría (nunca se rota)
      transports.push(
        new winston.transports.File({
          filename: 'logs/audit.log',
          level: 'info',
          format: winston.format.json()
        })
      );
    } else {
      // En desarrollo, mostrar todo en consola
      transports.push(
        new winston.transports.Console({
          format: winston.format.combine(
            winston.format.colorize({ all: true }),
            winston.format.simple()
          )
        })
      );
    }
    return transports;
  }
  /**
   * Sanitiza cualquier objeto removiendo información sensible
   */
  private sanitize(data: any, depth: number = 0): any {
    // Prevenir recursión infinita
    if (depth > 10) return '[MAX_DEPTH_EXCEEDED]';
    if (data === null || data === undefined) return data;
    // Para strings, aplicar sanitización
    if (typeof data === 'string') {
      return this.sanitizeString(data);
    }
    // Para errores, preservar stack pero sanitizar mensaje
    if (data instanceof Error) {
      return {
        name: data.name,
        message: this.sanitizeString(data.message),
        stack: this.isProduction ? '[REDACTED]' : data.stack
      };
    }
    // Para arrays
    if (Array.isArray(data)) {
      return data.map(item => this.sanitize(item, depth + 1));
    }
    // Para objetos
    if (typeof data === 'object') {
      const sanitized: any = {};
      for (const key in data) {
        // Verificar si la clave es sensible
        const lowerKey = key.toLowerCase();
        const isSensitive = this.sensitiveKeys.some(
          sensitive => lowerKey.includes(sensitive)
        );
        if (isSensitive) {
          sanitized[key] = '[REDACTED]';
        } else {
          // Recursivamente sanitizar el valor
          sanitized[key] = this.sanitize(data[key], depth + 1);
        }
      }
      return sanitized;
    }
    return data;
  }
  /**
   * Sanitiza strings removiendo patrones sensibles
   */
  private sanitizeString(str: string): string {
    if (!str || typeof str !== 'string') return str;
    let sanitized = str;
    // Aplicar cada patrón de sanitización
    for (const pattern of this.sensitivePatterns) {
      sanitized = sanitized.replace(pattern, '[REDACTED]');
    }
    // Verificar palabras clave sensibles en el contenido
    for (const key of this.sensitiveKeys) {
      const regex = new RegExp(`\\b${key}\\s*[:=]\\s*["']?[^"'\\s]+["']?`, 'gi');
      sanitized = sanitized.replace(regex, `${key}=[REDACTED]`);
    }
    return sanitized;
  }
  /**
   * Log de información general (solo en desarrollo)
   */
  info(message: string, meta?: any): void {
    // En producción, NO logear info para evitar exposición
    if (!this.isProduction) {
      this.logger.info(this.sanitizeString(message), this.sanitize(meta));
    }
  }
  /**
   * Log de errores (siempre se registra)
   */
  error(message: string, error?: Error | any, meta?: any): void {
    const errorData = error instanceof Error ? {
      name: error.name,
      message: this.sanitizeString(error.message),
      stack: this.isProduction ? '[REDACTED]' : error.stack
    } : this.sanitize(error);
    this.logger.error(this.sanitizeString(message), {
      error: errorData,
      ...this.sanitize(meta)
    });
  }
  /**
   * Log de advertencias
   */
  warn(message: string, meta?: any): void {
    this.logger.warn(this.sanitizeString(message), this.sanitize(meta));
  }
  /**
   * Log de debug (solo en desarrollo)
   */
  debug(message: string, meta?: any): void {
    if (!this.isProduction) {
      this.logger.debug(this.sanitizeString(message), this.sanitize(meta));
    }
  }
  /**
   * Log de auditoría (siempre se registra para compliance)
   */
  audit(action: string, meta?: any): void {
    this.logger.info('[AUDIT]', {
      action: this.sanitizeString(action),
      timestamp: new Date().toISOString(),
      ...this.sanitize(meta),
      context: this.sanitize(Object.fromEntries(this.context))
    });
  }
  /**
   * Log de performance
   */
  performance(operation: string, duration: number, meta?: any): void {
    const logData = {
      operation: this.sanitizeString(operation),
      duration_ms: duration,
      ...this.sanitize(meta)
    };
    // En producción, solo logear operaciones lentas
    if (this.isProduction && duration < 1000) {
      return;
    }
    this.logger.info('[PERFORMANCE]', logData);
  }
  /**
   * Log de eventos de seguridad (siempre se registra)
   */
  security(event: string, meta?: any): void {
    this.logger.warn('[SECURITY]', {
      event: this.sanitizeString(event),
      timestamp: new Date().toISOString(),
      ...this.sanitize(meta),
      context: this.sanitize(Object.fromEntries(this.context))
    });
  }
  /**
   * Establecer contexto persistente para los logs
   */
  setContext(key: string, value: any): void {
    this.context.set(key, this.sanitize(value));
  }
  /**
   * Limpiar contexto
   */
  clearContext(): void {
    this.context.clear();
  }
  /**
   * Crear un child logger con contexto adicional
   */
  child(context: Record<string, any>): ILoggerService {
    const childLogger = new LoggerService(this.logger);
    // Copiar contexto padre
    for (const [key, value] of this.context) {
      childLogger.setContext(key, value);
    }
    // Agregar nuevo contexto
    for (const [key, value] of Object.entries(context)) {
      childLogger.setContext(key, value);
    }
    return childLogger;
  }
}
/**
 * Factory para crear loggers con contexto específico
 */
export class LoggerFactory {
  static create(context?: Record<string, any>): ILoggerService {
    const logger = new LoggerService();
    if (context) {
      for (const [key, value] of Object.entries(context)) {
        logger.setContext(key, value);
      }
    }
    return logger;
  }
  static createForClass(className: string): ILoggerService {
    return LoggerFactory.create({ class: className });
  }
  static createForModule(moduleName: string): ILoggerService {
    return LoggerFactory.create({ module: moduleName });
  }
}
