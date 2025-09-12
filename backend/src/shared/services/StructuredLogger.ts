/**
 * @module StructuredLogger
 * @category Services
 * @description Servicio de logging estructurado con soporte para contextos, métricas y rotación de archivos.
 * Implementa logging contextual con niveles configurables y múltiples transportes (consola, archivo, externo).
 * 
 * Sprint 2 - Nivel 3: Logging estructurado con:
 * - Contexto de request/usuario/compañía
 * - Rotación automática de archivos
 * - Logs separados por tipo (application, error, security)
 * - Métricas de sistema (memoria, CPU)
 * - Formatos configurables (JSON/texto)
 * - Manejo de excepciones y promesas rechazadas
 * 
 * @example
 * ```typescript
 * // Crear logger con contexto
 * const logger = structuredLogger.withContext({
 *   requestId: 'req_123',
 *   userId: 'user_456',
 *   companyId: 'comp_789'
 * });
 * 
 * // Log con métricas de performance
 * logger.logPerformance('database_query', {
 *   duration: 150,
 *   memoryUsage: { heapUsed: 50000000, heapTotal: 100000000, external: 5000000 }
 * });
 * 
 * // Log de error con stack trace
 * logger.logError(new Error('Database connection failed'), 'Failed to connect to database');
 * ```
 * 
 * @see {@link https://github.com/winstonjs/winston}
 * @since 1.0.0
 */

import { injectable, inject } from 'inversify';
import winston, { Logger as WinstonLogger, createLogger, transports, format } from 'winston';
import { TYPES } from '../../../container/types';
import { getCurrentLoggingConfig } from '@/config/audit';
import { environment } from '@/config/environment';
import DailyRotateFile from 'winston-daily-rotate-file';
import path from 'path';
import { ILoggerService } from '@/shared/services/logger/LoggerService';

/**
 * @interface LogContext
 * @description Contexto de logging que acompaña cada entrada de log.
 * @property {string} [requestId] - ID único de la solicitud HTTP
 * @property {string} [userId] - ID del usuario autenticado
 * @property {string} [companyId] - ID de la compañía del usuario
 * @property {string} [sessionId] - ID de la sesión actual
 * @property {string} [ip] - Dirección IP del cliente
 * @property {string} [userAgent] - User agent del navegador/cliente
 * @property {string} [endpoint] - Endpoint de API accedido
 * @property {string} [method] - Método HTTP (GET, POST, etc.)
 * @property {string} [role] - Rol del usuario en el sistema
 * @property {string} [traceId] - ID de trace para rastreo distribuido
 * @property {string} [spanId] - ID de span para rastreo distribuido
 */
export interface LogContext {
  requestId?: string;
  userId?: string;
  companyId?: string;
  sessionId?: string;
  ip?: string;
  userAgent?: string;
  endpoint?: string;
  method?: string;
  role?: string;
  traceId?: string;
  spanId?: string;
}

export interface PerformanceMetrics {
  duration: number;
  memoryUsage?: {
    heapUsed: number;
    heapTotal: number;
    external: number;
  };
  cpuUsage?: {
    user: number;
    system: number;
  };
}

export interface LogEntry {
  level: 'error' | 'warn' | 'info' | 'debug';
  message: string;
  context?: LogContext;
  data?: Record<string, any>;
  error?: {
    name: string;
    message: string;
    stack?: string;
    code?: string;
  };
  performance?: PerformanceMetrics;
  metadata?: Record<string, any>;
  timestamp: Date;
}

/**
 * @class StructuredLogger
 * @description Servicio principal de logging estructurado con soporte para múltiples transportes y contextos.
 * Proporciona métodos especializados para diferentes tipos de eventos (errores, performance, seguridad).
 * 
 * @remarks
 * El logger soporta múltiples transportes simultáneos:
 * - Consola: Para desarrollo con formato legible
 * - Archivos: Con rotación diaria y retención configurable
 * - Base de datos: Para consultas y análisis (futuro)
 * - Servicios externos: Para integración con plataformas de logging (futuro)
 * 
 * @example
 * ```typescript
 * const logger = container.get<StructuredLogger>(TYPES.StructuredLogger);
 * 
 * // Log simple
 * logger.info('User logged in', { userId: 'user123' });
 * 
 * // Log con contexto persistente
 * logger.setContext('req_123', { userId: 'user123', companyId: 'comp456' });
 * logger.info('Processing request'); // Incluirá el contexto automáticamente
 * ```
 */
@injectable()
export class StructuredLogger {
  private logger: WinstonLogger;
  private config = getCurrentLoggingConfig();
  private activeContexts = new Map<string, LogContext>();

  constructor(
    @inject(TYPES.LoggerService) private logger: ILoggerService
  ) {
    this.logger = this.createLogger();
    this.logger.info('Structured logger initialized', {
      config: this.config,
      environment: environment.nodeEnv
    });
  }

  /**
   * @method error
   * @description Registra un mensaje de error.
   * @param {string} message - Mensaje de error
   * @param {Record<string, any>} [data] - Datos adicionales para incluir en el log
   * @param {LogContext} [context] - Contexto específico para este log
   * 
   * @example
   * ```typescript
   * logger.error('Database connection failed', 
   *   { host: 'localhost', port: 5432 },
   *   { requestId: 'req_123' }
   * );
   * ```
   */
  error(message: string, data?: Record<string, any>, context?: LogContext): void {
    this.log('error', message, data, context);
  }

  warn(message: string, data?: Record<string, any>, context?: LogContext): void {
    this.log('warn', message, data, context);
  }

  info(message: string, data?: Record<string, any>, context?: LogContext): void {
    this.log('info', message, data, context);
  }

  debug(message: string, data?: Record<string, any>, context?: LogContext): void {
    this.log('debug', message, data, context);
  }

  /**
   * @method logError
   * @description Registra un objeto Error con información completa incluyendo stack trace.
   * @param {Error} error - Objeto Error a registrar
   * @param {string} [message] - Mensaje descriptivo adicional
   * @param {Record<string, any>} [data] - Datos adicionales
   * @param {LogContext} [context] - Contexto del log
   * 
   * @remarks
   * El stack trace solo se incluye si está habilitado en la configuración.
   * En producción generalmente se omite por seguridad.
   * 
   * @example
   * ```typescript
   * try {
   *   await database.connect();
   * } catch (error) {
   *   logger.logError(error, 'Failed to connect to database', 
   *     { retries: 3, timeout: 5000 }
   *   );
   * }
   * ```
   */
  logError(error: Error, message?: string, data?: Record<string, any>, context?: LogContext): void {
    const errorData = {
      name: error.name,
      message: error.message,
      stack: this.config.context.includeStack ? error.stack : undefined,
      code: (error as any).code
    };

    this.log('error', message || error.message, {
      ...data,
      error: errorData
    }, context);
  }

  /**
   * @method logPerformance
   * @description Registra métricas de rendimiento de una operación.
   * @param {string} operation - Nombre de la operación medida
   * @param {PerformanceMetrics} metrics - Métricas de rendimiento
   * @param {LogContext} [context] - Contexto del log
   * @param {Record<string, any>} [data] - Datos adicionales
   * 
   * @remarks
   * Automáticamente usa nivel 'warn' si la duración excede 1 segundo.
   * 
   * @example
   * ```typescript
   * const start = Date.now();
   * const result = await database.query(sql);
   * 
   * logger.logPerformance('database_query', {
   *   duration: Date.now() - start,
   *   memoryUsage: process.memoryUsage(),
   *   cpuUsage: process.cpuUsage()
   * }, context, { query: sql, rows: result.length });
   * ```
   */
  logPerformance(
    operation: string,
    metrics: PerformanceMetrics,
    context?: LogContext,
    data?: Record<string, any>
  ): void {
    const level = metrics.duration > 1000 ? 'warn' : 'info'; // Warn si toma más de 1 segundo

    this.log(level, `Performance: ${operation}`, {
      ...data,
      performance: metrics,
      operation
    }, context);
  }

  logRequest(
    method: string,
    url: string,
    statusCode: number,
    duration: number,
    context?: LogContext,
    data?: Record<string, any>
  ): void {
    const level = statusCode >= 400 ? 'warn' : statusCode >= 500 ? 'error' : 'info';

    this.log(level, `${method} ${url} ${statusCode}`, {
      ...data,
      http: {
        method,
        url,
        statusCode,
        duration
      }
    }, context);
  }

  /**
   * @method logSecurity
   * @description Registra eventos de seguridad con severidad.
   * @param {string} event - Descripción del evento de seguridad
   * @param {'low' | 'medium' | 'high' | 'critical'} severity - Severidad del evento
   * @param {LogContext} [context] - Contexto del log
   * @param {Record<string, any>} [data] - Datos adicionales del evento
   * 
   * @remarks
   * Los eventos de seguridad se guardan en un archivo separado para auditoría.
   * Los eventos 'critical' y 'high' se registran como errores.
   * 
   * @example
   * ```typescript
   * logger.logSecurity(
   *   'Multiple failed login attempts detected',
   *   'high',
   *   { ip: '192.168.1.1', userId: 'user123' },
   *   { attempts: 5, timeWindow: '5m' }
   * );
   * ```
   * 
   * @security
   * Estos logs deben preservarse durante el período de retención legal requerido.
   */
  logSecurity(
    event: string,
    severity: 'low' | 'medium' | 'high' | 'critical',
    context?: LogContext,
    data?: Record<string, any>
  ): void {
    const level = severity === 'critical' || severity === 'high' ? 'error' : 'warn';

    this.log(level, `Security: ${event}`, {
      ...data,
      security: {
        event,
        severity
      }
    }, context);
  }

  logDatabase(
    operation: string,
    table: string,
    duration: number,
    context?: LogContext,
    data?: Record<string, any>
  ): void {
    const level = duration > 500 ? 'warn' : 'debug'; // Warn si query toma más de 500ms

    this.log(level, `DB: ${operation} on ${table}`, {
      ...data,
      database: {
        operation,
        table,
        duration
      }
    }, context);
  }

  logBusinessEvent(
    event: string,
    context?: LogContext,
    data?: Record<string, any>
  ): void {
    this.log('info', `Business: ${event}`, {
      ...data,
      business: {
        event
      }
    }, context);
  }

  /**
   * @method setContext
   * @description Establece un contexto persistente para un requestId específico.
   * @param {string} requestId - ID único de la solicitud
   * @param {LogContext} context - Contexto a asociar con el requestId
   * 
   * @remarks
   * El contexto se mantiene hasta que se llame a clearContext().
   * Útil para mantener contexto a través de múltiples logs en la misma solicitud.
   * 
   * @example
   * ```typescript
   * // En middleware de autenticación
   * logger.setContext(req.id, {
   *   requestId: req.id,
   *   userId: req.user.id,
   *   companyId: req.user.companyId,
   *   ip: req.ip
   * });
   * ```
   */
  setContext(requestId: string, context: LogContext): void {
    this.activeContexts.set(requestId, context);
  }

  getContext(requestId: string): LogContext | undefined {
    return this.activeContexts.get(requestId);
  }

  clearContext(requestId: string): void {
    this.activeContexts.delete(requestId);
  }

  /**
   * @method withContext
   * @description Crea un logger con contexto predefinido para todos los métodos.
   * @param {LogContext} context - Contexto a aplicar a todos los logs
   * @returns {Object} Objeto con todos los métodos de logging con contexto aplicado
   * 
   * @remarks
   * Útil para crear un logger específico para una solicitud o flujo de trabajo.
   * El contexto proporcionado se fusiona con cualquier contexto adicional en cada llamada.
   * 
   * @example
   * ```typescript
   * const requestLogger = logger.withContext({
   *   requestId: 'req_123',
   *   userId: 'user_456',
   *   companyId: 'comp_789'
   * });
   * 
   * // Todos estos logs incluirán el contexto automáticamente
   * requestLogger.info('Processing started');
   * requestLogger.debug('Validating input');
   * requestLogger.error('Processing failed');
   * ```
   */
  withContext(context: LogContext) {
    return {
      error: (message: string, data?: Record<string, any>) => 
        this.error(message, data, context),
      warn: (message: string, data?: Record<string, any>) => 
        this.warn(message, data, context),
      info: (message: string, data?: Record<string, any>) => 
        this.info(message, data, context),
      debug: (message: string, data?: Record<string, any>) => 
        this.debug(message, data, context),
      logError: (error: Error, message?: string, data?: Record<string, any>) =>
        this.logError(error, message, data, context),
      logPerformance: (operation: string, metrics: PerformanceMetrics, data?: Record<string, any>) =>
        this.logPerformance(operation, metrics, context, data),
      logRequest: (method: string, url: string, statusCode: number, duration: number, data?: Record<string, any>) =>
        this.logRequest(method, url, statusCode, duration, context, data),
      logSecurity: (event: string, severity: 'low' | 'medium' | 'high' | 'critical', data?: Record<string, any>) =>
        this.logSecurity(event, severity, context, data),
      logDatabase: (operation: string, table: string, duration: number, data?: Record<string, any>) =>
        this.logDatabase(operation, table, duration, context, data),
      logBusinessEvent: (event: string, data?: Record<string, any>) =>
        this.logBusinessEvent(event, context, data)
    };
  }

  /**
   * @method getMetrics
   * @description Obtiene métricas actuales del sistema de logging.
   * @returns {Record<string, any>} Métricas del logger
   * @returns {number} activeContexts - Número de contextos activos
   * @returns {Object} config - Configuración actual del logger
   * @returns {number} transports - Número de transportes activos
   * @returns {string} level - Nivel de log actual
   * 
   * @example
   * ```typescript
   * const metrics = logger.getMetrics();
   * this.logger.info(`Active contexts: ${metrics.activeContexts}`);
   * this.logger.info(`Current log level: ${metrics.level}`);
   * ```
   */
  getMetrics(): Record<string, any> {
    return {
      activeContexts: this.activeContexts.size,
      config: this.config,
      transports: this.logger.transports.length,
      level: this.logger.level
    };
  }

  /**
   * @method setLevel
   * @description Cambia dinámicamente el nivel de logging.
   * @param {'error' | 'warn' | 'info' | 'debug'} level - Nuevo nivel de log
   * 
   * @remarks
   * Los cambios de nivel afectan inmediatamente a todos los transportes.
   * Útil para aumentar el detalle de logs en debugging sin reiniciar.
   * 
   * @example
   * ```typescript
   * // Aumentar detalle temporalmente para debugging
   * logger.setLevel('debug');
   * // ... investigar problema ...
   * logger.setLevel('info'); // Restaurar nivel normal
   * ```
   */
  setLevel(level: 'error' | 'warn' | 'info' | 'debug'): void {
    this.logger.level = level;
    this.logger.info('Log level changed', { newLevel: level });
  }

  /**
   * @method log
   * @private
   * @description Método interno principal para procesar todos los logs.
   * @param {'error' | 'warn' | 'info' | 'debug'} level - Nivel del log
   * @param {string} message - Mensaje a registrar
   * @param {Record<string, any>} [data] - Datos adicionales
   * @param {LogContext} [context] - Contexto del log
   * 
   * @remarks
   * Fusiona contextos, añade métricas del sistema si está habilitado,
   * y envía el log a todos los transportes configurados.
   */
  private log(
    level: 'error' | 'warn' | 'info' | 'debug',
    message: string,
    data?: Record<string, any>,
    context?: LogContext
  ): void {
    // Combinar contexto activo con contexto proporcionado
    const fullContext = this.mergeContexts(context);

    const logEntry: Record<string, any> = {
      message,
      timestamp: new Date().toISOString(),
      level,
      ...this.formatContext(fullContext),
      ...data
    };

    // Agregar metadata del sistema si está habilitado
    if (this.config.context.includePerformance) {
      logEntry.system = this.getSystemMetrics();
    }

    this.logger.log(level, message, logEntry);
  }

  private mergeContexts(providedContext?: LogContext): LogContext {
    const requestId = providedContext?.requestId;
    const activeContext = requestId ? this.activeContexts.get(requestId) : undefined;

    return {
      ...activeContext,
      ...providedContext
    };
  }

  private formatContext(context?: LogContext): Record<string, any> {
    if (!context) return {};

    const formatted: Record<string, any> = {};

    if (this.config.context.includeRequestId && context.requestId) {
      formatted.requestId = context.requestId;
    }

    if (this.config.context.includeUserId && context.userId) {
      formatted.userId = context.userId;
    }

    if (this.config.context.includeCompanyId && context.companyId) {
      formatted.companyId = context.companyId;
    }

    // Agregar otros campos de contexto
    Object.entries(context).forEach(([key, value]) => {
      if (value && !formatted[key]) {
        formatted[key] = value;
      }
    });

    return formatted;
  }

  private getSystemMetrics(): Record<string, any> {
    const memUsage = process.memoryUsage();
    const cpuUsage = process.cpuUsage();

    return {
      memory: {
        heapUsed: Math.round(memUsage.heapUsed / 1024 / 1024), // MB
        heapTotal: Math.round(memUsage.heapTotal / 1024 / 1024), // MB
        external: Math.round(memUsage.external / 1024 / 1024) // MB
      },
      cpu: {
        user: cpuUsage.user,
        system: cpuUsage.system
      },
      uptime: process.uptime(),
      pid: process.pid
    };
  }

  private createLogger(): WinstonLogger {
    const loggerTransports: winston.transport[] = [];

    // Console transport (desarrollo)
    if (this.config.enableConsole) {
      loggerTransports.push(
        new transports.Console({
          format: this.getConsoleFormat(),
          level: this.config.level
        })
      );
    }

    // File transport
    if (this.config.enableFile) {
      // Application logs con rotación diaria
      loggerTransports.push(
        new DailyRotateFile({
          filename: path.join(process.cwd(), 'logs', 'application-%DATE%.log'),
          datePattern: 'YYYY-MM-DD',
          maxFiles: '30d',
          maxSize: '100m',
          format: this.getFileFormat(),
          level: this.config.level
        })
      );

      // Error logs separados
      loggerTransports.push(
        new DailyRotateFile({
          filename: path.join(process.cwd(), 'logs', 'error-%DATE%.log'),
          datePattern: 'YYYY-MM-DD',
          maxFiles: '90d',
          maxSize: '100m',
          format: this.getFileFormat(),
          level: 'error'
        })
      );

      // Security logs separados
      loggerTransports.push(
        new DailyRotateFile({
          filename: path.join(process.cwd(), 'logs', 'security-%DATE%.log'),
          datePattern: 'YYYY-MM-DD',
          maxFiles: '365d',
          maxSize: '50m',
          format: this.getFileFormat(),
          level: 'warn',
          // Solo logs que contengan eventos de seguridad
          filter: (info: any) => info.security !== undefined
        })
      );
    }

    // Database transport (implementación futura)
    if (this.config.enableDatabase) {
      // loggerTransports.push(new DatabaseTransport());
    }

    // External service transport (implementación futura)
    if (this.config.enableExternal) {
      // loggerTransports.push(new ExternalServiceTransport());
    }

    return createLogger({
      level: this.config.level,
      defaultMeta: {
        service: 'flexxus-flow-backend',
        environment: environment.nodeEnv,
        version: environment.version,
        hostname: require('os').hostname(),
        pid: process.pid
      },
      transports: loggerTransports,
      // Manejar excepciones no capturadas
      exceptionHandlers: this.config.enableFile ? [
        new DailyRotateFile({
          filename: path.join(process.cwd(), 'logs', 'exceptions-%DATE%.log'),
          datePattern: 'YYYY-MM-DD',
          maxFiles: '90d',
          maxSize: '50m'
        })
      ] : undefined,
      // Manejar rechazos de promesas no manejados
      rejectionHandlers: this.config.enableFile ? [
        new DailyRotateFile({
          filename: path.join(process.cwd(), 'logs', 'rejections-%DATE%.log'),
          datePattern: 'YYYY-MM-DD',
          maxFiles: '90d',
          maxSize: '50m'
        })
      ] : undefined,
      exitOnError: false
    });
  }

  private getConsoleFormat() {
    if (this.config.format === 'json') {
      return format.combine(
        format.timestamp(),
        format.errors({ stack: true }),
        format.json()
      );
    }

    return format.combine(
      format.colorize(),
      format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
      format.errors({ stack: true }),
      format.printf(({ timestamp, level, message, ...meta }) => {
        const metaStr = Object.keys(meta).length ? JSON.stringify(meta, null, 2) : '';
        return `${timestamp} [${level}] ${message} ${metaStr}`;
      })
    );
  }

  private getFileFormat() {
    return format.combine(
      format.timestamp(),
      format.errors({ stack: true }),
      format.json()
    );
  }

  /**
   * @method destroy
   * @description Limpia recursos y cierra transportes antes de cerrar la aplicación.
   * @returns {Promise<void>}
   * 
   * @remarks
   * Debe llamarse durante el shutdown de la aplicación para asegurar
   * que todos los logs pendientes se escriban correctamente.
   * 
   * @example
   * ```typescript
   * process.on('SIGTERM', async () => {
   *   await logger.destroy();
   *   process.exit(0);
   * });
   * ```
   */
  async destroy(): Promise<void> {
    // Limpiar contextos activos
    this.activeContexts.clear();

    // Cerrar transports
    await new Promise<void>((resolve) => {
      this.logger.on('finish', resolve);
      this.logger.end();
    });

    this.logger.info('Structured logger destroyed');
  }

  /**
   * @property winston
   * @description Acceso directo al logger Winston subyacente para compatibilidad.
   * @returns {WinstonLogger} Instancia de Winston logger
   * 
   * @remarks
   * Proporciona acceso directo a Winston para casos de uso avanzados
   * o integración con librerías que esperan un logger Winston.
   */
  get winston(): WinstonLogger {
    return this.logger;
  }

  // Métodos de compatibilidad con Winston
  isDebugEnabled(): boolean {
    return this.logger.isDebugEnabled();
  }

  isInfoEnabled(): boolean {
    return this.logger.isInfoEnabled();
  }

  isWarnEnabled(): boolean {
    return this.logger.isWarnEnabled();
  }

  isErrorEnabled(): boolean {
    return this.logger.isErrorEnabled();
  }
}
