/**
 * Audit Logger Middleware - Sprint 2
 * Siguiendo lineamientos nivel 2: middleware automático de auditoría
 */

import { Request, Response, NextFunction } from 'express';
import { container } from '@/container/container';
import { TYPES } from '../../../container/types';
import { AuditService, AuditContext, AuditEventData } from '@/shared/services/AuditService';
import { StructuredLogger } from '@/shared/services/StructuredLogger';
import { environment } from '@/config/environment';
import { v4 as uuidv4 } from 'uuid';

export interface AuditMiddlewareOptions {
  excludePaths?: (string | RegExp)[];
  excludeMethods?: string[];
  includeRequestBody?: boolean;
  includeResponseBody?: boolean;
  sensitiveFields?: string[];
  auditLevel?: 'minimal' | 'standard' | 'comprehensive';
  performanceThreshold?: number; // ms
}

export interface RequestWithAudit extends Request {
  audit: {
    requestId: string;
    startTime: number;
    context: AuditContext;
  };
}

const defaultOptions: AuditMiddlewareOptions = {
  excludePaths: [
    '/health',
    '/metrics',
    '/favicon.ico',
    /^\/assets\//,
    /^\/static\//
  ],
  excludeMethods: ['OPTIONS'],
  includeRequestBody: true,
  includeResponseBody: false,
  sensitiveFields: ['password', 'token', 'secret', 'key'],
  auditLevel: 'standard',
  performanceThreshold: 1000
};

/**
 * Middleware principal de auditoría
 */
export const auditLogger = (options: AuditMiddlewareOptions = {}): any => {
  const config = { ...defaultOptions, ...options };

  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const auditService = container.get<AuditService>(TYPES.AuditService);
    const logger = container.get<StructuredLogger>(TYPES.StructuredLogger);

    // Verificar si debe excluirse esta request
    if (shouldExcludeRequest(req, config)) {
      return next();
    }

    // Inicializar contexto de auditoría
    const requestId = req.get('X-Request-ID') || uuidv4();
    const startTime = Date.now();

    const context: AuditContext = {
      requestId,
      userId: req.user?.id,
      companyId: req.user?.companyId,
      sessionId: req.user?.sessionId,
      ip: getClientIP(req),
      userAgent: req.get('User-Agent'),
      endpoint: req.path,
      method: req.method,
      role: req.user?.role
    };

    // Extender la request con información de auditoría
    (req as RequestWithAudit).audit = {
      requestId,
      startTime,
      context
    };

    // Establecer contexto en el logger
    logger.setContext(requestId, context);

    // Establecer header de request ID
    res.set('X-Request-ID', requestId);

    // Interceptar la respuesta para auditar
    const originalSend = res.send;
    const originalJson = res.json;
    let responseBody: any;
    let responseSent = false;

    res.send = function(data: any): Response {
      if (!responseSent) {
        responseBody = data;
        responseSent = true;
        auditRequest(req as RequestWithAudit, res, responseBody, auditService, logger, config);
      }
      return originalSend.call(this, data);
    };

    res.json = function(data: any): Response {
      if (!responseSent) {
        responseBody = data;
        responseSent = true;
        auditRequest(req as RequestWithAudit, res, responseBody, auditService, logger, config);
      }
      return originalJson.call(this, data);
    };

    // Manejar casos donde no se llama send/json
    res.on('finish', () => {
      if (!responseSent) {
        responseSent = true;
        auditRequest(req as RequestWithAudit, res, null, auditService, logger, config);
      }

      // Limpiar contexto
      logger.clearContext(requestId);
    });

    next();
  };
};

/**
 * Middleware específico para endpoints de autenticación
 */
export const auditAuthEndpoint = () => {
  return auditLogger({
    auditLevel: 'comprehensive',
    includeRequestBody: true,
    includeResponseBody: false, // No incluir tokens
    sensitiveFields: ['password', 'token', 'refreshToken', 'secret']
  });
};

/**
 * Middleware específico para endpoints administrativos
 */
export const auditAdminEndpoint = () => {
  return auditLogger({
    auditLevel: 'comprehensive',
    includeRequestBody: true,
    includeResponseBody: true,
    performanceThreshold: 500
  });
};

/**
 * Middleware específico para endpoints de datos sensibles
 */
export const auditSensitiveEndpoint = () => {
  return auditLogger({
    auditLevel: 'comprehensive',
    includeRequestBody: true,
    includeResponseBody: true,
    sensitiveFields: [
      'password', 'token', 'secret', 'key', 'ssn', 'taxId',
      'creditCard', 'bankAccount', 'phone', 'address'
    ]
  });
};

/**
 * Middleware para auditar cambios de datos
 */
export const auditDataChanges = () => {
  return auditLogger({
    auditLevel: 'comprehensive',
    includeRequestBody: true,
    includeResponseBody: true
  });
};

/**
 * Crear middleware de auditoría condicional
 */
export const conditionalAuditLogger = (
  condition: (req: Request) => boolean,
  options: AuditMiddlewareOptions = {}
) => {
  const auditMiddleware = auditLogger(options);

  return (req: Request, res: Response, next: NextFunction) => {
    if (condition(req)) {
      return auditMiddleware(req, res, next);
    }
    next();
  };
};

/**
 * Middleware para capturar errores en auditoría
 */
export const auditErrorHandler = () => {
  return async (error: Error, req: Request, res: Response, next: NextFunction): Promise<void> => {
    const auditService = container.get<AuditService>(TYPES.AuditService);
    const logger = container.get<StructuredLogger>(TYPES.StructuredLogger);

    const requestWithAudit = req as RequestWithAudit;
    const context = requestWithAudit.audit?.context || createMinimalContext(req);

    // Auditar el error
    await auditService.auditError('application_error', context, error, {
      endpoint: req.path,
      method: req.method,
      statusCode: res.statusCode,
      requestBody: sanitizeObject(req.body, defaultOptions.sensitiveFields || [])
    });

    // Log estructurado del error
    logger.logError(error, 'Request processing error', {
      endpoint: req.path,
      method: req.method,
      statusCode: res.statusCode
    }, context);

    next(error);
  };
};

/**
 * Funciones auxiliares
 */
function shouldExcludeRequest(req: Request, config: AuditMiddlewareOptions): boolean {
  // Excluir por método
  if (config.excludeMethods?.includes(req.method)) {
    return true;
  }

  // Excluir por path
  if (config.excludePaths) {
    return config.excludePaths.some(path => {
      if (typeof path === 'string') {
        return req.path === path;
      }
      return path.test(req.path);
    });
  }

  return false;
}

function getClientIP(req: Request): string {
  return (
    req.ip ||
    req.get('X-Forwarded-For') ||
    req.get('X-Real-IP') ||
    req.connection?.remoteAddress ||
    req.socket?.remoteAddress ||
    'unknown'
  );
}

async function auditRequest(
  req: RequestWithAudit,
  res: Response,
  responseBody: any,
  auditService: AuditService,
  logger: StructuredLogger,
  config: AuditMiddlewareOptions
): Promise<void> {
  try {
    const duration = Date.now() - req.audit.startTime;
    const context = req.audit.context;

    // Determinar tipo de evento basado en el endpoint y método
    const eventType = determineEventType(req);

    // Determinar acción basada en el método y resultado
    const action = determineAction(req, res);

    // Preparar datos para auditoría
    const auditData: AuditEventData = {
      type: eventType,
      action,
      severity: determineSeverity(req, res),
      context,
      details: {
        method: req.method,
        endpoint: req.path,
        statusCode: res.statusCode,
        userAgent: req.get('User-Agent'),
        query: req.query,
        params: req.params
      },
      performance: {
        duration,
        memoryUsage: process.memoryUsage()
      },
      metadata: {
        headers: sanitizeHeaders(req.headers),
        responseSize: getResponseSize(responseBody)
      }
    };

    // Incluir request body si está configurado
    if (config.includeRequestBody && req.body && Object.keys(req.body).length > 0) {
      auditData.payload = sanitizeObject(req.body, config.sensitiveFields || []);
    }

    // Incluir response body si está configurado
    if (config.includeResponseBody && responseBody) {
      auditData.response = sanitizeObject(responseBody, config.sensitiveFields || []);
    }

    // Auditar el evento
    await auditService.audit(auditData);

    // Log estructurado de la request
    logger.logRequest(
      req.method,
      req.path,
      res.statusCode,
      duration,
      context,
      {
        query: req.query,
        params: req.params,
        responseSize: getResponseSize(responseBody)
      }
    );

    // Log de performance si excede el threshold
    if (duration > (config.performanceThreshold || 1000)) {
      logger.logPerformance(
        `${req.method} ${req.path}`,
        { duration, memoryUsage: process.memoryUsage() },
        context,
        { statusCode: res.statusCode }
      );
    }

  } catch (error) {
    logger.logError(error, 'Failed to audit request', {
      endpoint: req.path,
      method: req.method
    }, req.audit.context);
  }
}

function determineEventType(req: RequestWithAudit): any {
  const path = req.path.toLowerCase();

  if (path.includes('/auth/')) return 'authentication';
  if (path.includes('/admin/')) return 'system_configuration';
  if (path.includes('/users/') || path.includes('/user/')) return 'user_management';
  if (path.includes('/companies/') || path.includes('/company/')) return 'company_management';
  if (path.includes('/feature-flags/')) return 'feature_flag_change';
  if (path.includes('/upload/') || path.includes('/file/')) return 'file_operation';

  // Determinar por método HTTP
  if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(req.method)) {
    return 'data_modification';
  }

  return 'api_access';
}

function determineAction(req: RequestWithAudit, res: Response): string {
  const method = req.method.toLowerCase();
  const path = req.path.toLowerCase();
  const statusCode = res.statusCode;

  // Acciones específicas por endpoint
  if (path.includes('/auth/login')) {
    return statusCode < 400 ? 'login_success' : 'login_failed';
  }
  if (path.includes('/auth/logout')) return 'logout';
  if (path.includes('/auth/register')) return 'register';

  // Acciones por método HTTP
  switch (method) {
    case 'post': return 'create';
    case 'put': return 'update';
    case 'patch': return 'partial_update';
    case 'delete': return 'delete';
    case 'get': return 'read';
    default: return `${method}_request`;
  }
}

function determineSeverity(req: RequestWithAudit, res: Response): any {
  const statusCode = res.statusCode;
  const path = req.path.toLowerCase();

  // Eventos críticos
  if (path.includes('/admin/') || path.includes('/system/')) {
    return 'critical';
  }

  // Basado en status code
  if (statusCode >= 500) return 'critical';
  if (statusCode >= 400) return 'high';
  if (statusCode >= 300) return 'medium';

  return 'low';
}

function sanitizeObject(obj: any, sensitiveFields: string[]): any {
  if (!obj || typeof obj !== 'object') return obj;

  const sanitized: any = Array.isArray(obj) ? [] : {};

  for (const [key, value] of Object.entries(obj)) {
    const keyLower = key.toLowerCase();

    // Remover campos sensibles
    if (sensitiveFields.some(field => keyLower.includes(field.toLowerCase()))) {
      sanitized[key] = '[REDACTED]';
      continue;
    }

    // Recursivo para objetos anidados
    if (value && typeof value === 'object') {
      sanitized[key] = sanitizeObject(value, sensitiveFields);
    } else {
      sanitized[key] = value;
    }
  }

  return sanitized;
}

function sanitizeHeaders(headers: Record<string, any>): Record<string, any> {
  const sensitiveHeaders = ['authorization', 'cookie', 'x-api-key', 'x-auth-token'];
  const sanitized: Record<string, any> = {};

  for (const [key, value] of Object.entries(headers)) {
    if (sensitiveHeaders.includes(key.toLowerCase())) {
      sanitized[key] = '[REDACTED]';
    } else {
      sanitized[key] = value;
    }
  }

  return sanitized;
}

function getResponseSize(responseBody: any): number {
  if (!responseBody) return 0;

  try {
    return JSON.stringify(responseBody).length;
  } catch {
    return String(responseBody).length;
  }
}

function createMinimalContext(req: Request): AuditContext {
  return {
    requestId: uuidv4(),
    userId: req.user?.id,
    companyId: req.user?.companyId,
    ip: getClientIP(req),
    userAgent: req.get('User-Agent'),
    endpoint: req.path,
    method: req.method,
    role: req.user?.role
  };
}

/**
 * Presets de configuración para diferentes casos de uso
 */
export const AuditPresets = {
  // Auditoría mínima para desarrollo
  minimal: auditLogger({
    auditLevel: 'minimal',
    includeRequestBody: false,
    includeResponseBody: false,
    excludePaths: ['/health', '/metrics', /^\/assets\//, /^\/static\//]
  }),

  // Auditoría estándar para producción
  standard: auditLogger({
    auditLevel: 'standard',
    includeRequestBody: true,
    includeResponseBody: false,
    performanceThreshold: 1000
  }),

  // Auditoría comprehensiva para compliance
  comprehensive: auditLogger({
    auditLevel: 'comprehensive',
    includeRequestBody: true,
    includeResponseBody: true,
    performanceThreshold: 500,
    sensitiveFields: [
      'password', 'token', 'secret', 'key', 'ssn', 'taxId',
      'creditCard', 'bankAccount', 'phone', 'address'
    ]
  }),

  // Solo para endpoints críticos
  security: auditLogger({
    auditLevel: 'comprehensive',
    includeRequestBody: true,
    includeResponseBody: true,
    excludeMethods: ['GET', 'OPTIONS'],
    performanceThreshold: 100
  })
};
