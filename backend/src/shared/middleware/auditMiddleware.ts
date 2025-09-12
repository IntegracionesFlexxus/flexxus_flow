/**
 * Audit Middleware - Sprint 2
 * Siguiendo lineamientos nivel 2: middleware de auditoría para compliance y seguridad
 */

import { Request, Response, NextFunction } from 'express';
import { container } from '@/container/container';
import { TYPES } from '../../../container/types';
import { Logger } from 'winston';
import { environment } from '@/config/environment';

// Audit event types
export enum AuditEventType {
  LOGIN = 'login',
  LOGOUT = 'logout',
  DATA_ACCESS = 'data_access',
  DATA_MODIFICATION = 'data_modification',
  PERMISSION_DENIED = 'permission_denied',
  FEATURE_FLAG_ACCESS = 'feature_flag_access',
  API_ACCESS = 'api_access',
  SENSITIVE_ACTION = 'sensitive_action',
  EXPORT_DATA = 'export_data',
  ADMIN_ACTION = 'admin_action',
  SECURITY_EVENT = 'security_event'
}

// Audit log entry interface
export interface AuditLogEntry {
  id?: string;
  eventType: AuditEventType;
  userId?: string;
  companyId?: string;
  sessionId?: string;
  ipAddress: string;
  userAgent: string;
  method: string;
  path: string;
  requestId?: string;
  timestamp: Date;
  details: {
    statusCode?: number;
    responseTime?: number;
    resourceId?: string;
    resourceType?: string;
    changes?: Record<string, any>;
    oldValues?: Record<string, any>;
    newValues?: Record<string, any>;
    reason?: string;
    metadata?: Record<string, any>;
  };
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  compliance: {
    gdpr: boolean;
    sox: boolean;
    pci: boolean;
    hipaa: boolean;
  };
}

// Extend Request interface
declare global {
  namespace Express {
    interface Request {
      auditContext?: {
        eventType: AuditEventType;
        resourceId?: string;
        resourceType?: string;
        riskLevel?: 'low' | 'medium' | 'high' | 'critical';
        metadata?: Record<string, any>;
        skipAudit?: boolean;
      };
    }
  }
}

/**
 * Main audit middleware for logging all API requests
 */
export const auditRequest = (options?: {
  skipPaths?: string[];
  skipMethods?: string[];
  sensitiveEndpoints?: string[];
  logRequestBody?: boolean;
  logResponseBody?: boolean;
  maxBodySize?: number;
}) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    const logger = container.get<Logger>(TYPES.Logger);
    const startTime = Date.now();

    // Skip audit for certain paths/methods if configured
    if (options?.skipPaths?.some(path => req.path.includes(path))) {
      next();
      return;
    }

    if (options?.skipMethods?.includes(req.method)) {
      next();
      return;
    }

    // Skip if explicitly marked to skip audit
    if (req.auditContext?.skipAudit) {
      next();
      return;
    }

    // Determine risk level based on endpoint
    let riskLevel: 'low' | 'medium' | 'high' | 'critical' = 'low';

    if (options?.sensitiveEndpoints?.some(endpoint => req.path.includes(endpoint))) {
      riskLevel = 'high';
    }

    if (req.path.includes('/admin/') || req.path.includes('/export/')) {
      riskLevel = 'critical';
    }

    if (['POST', 'PUT', 'DELETE', 'PATCH'].includes(req.method)) {
      riskLevel = riskLevel === 'low' ? 'medium' : riskLevel;
    }

    // Capture response for audit
    const originalSend = res.send;
    let responseBody: any;
    let statusCode: number;

    res.send = function(data: any) {
      statusCode = res.statusCode;
      if (options?.logResponseBody && data && data.length < (options.maxBodySize || 1024)) {
        try {
          responseBody = typeof data === 'string' ? JSON.parse(data) : data;
          // Remove sensitive fields from response logging
          if (responseBody && typeof responseBody === 'object') {
            const sanitized = { ...responseBody };
            delete sanitized.token;
            delete sanitized.password;
            delete sanitized.accessToken;
            delete sanitized.refreshToken;
            responseBody = sanitized;
          }
        } catch (error) {
          responseBody = '[Response parsing error]';
        }
      }
      return originalSend.call(this, data);
    };

    // Log completion after response is sent
    res.on('finish', () => {
      const responseTime = Date.now() - startTime;

      const auditEntry: AuditLogEntry = {
        eventType: req.auditContext?.eventType || AuditEventType.API_ACCESS,
        userId: req.user?.id,
        companyId: req.user?.companyId,
        sessionId: req.user?.sessionId,
        ipAddress: getClientIP(req),
        userAgent: req.get('User-Agent') || 'Unknown',
        method: req.method,
        path: req.path,
        requestId: req.requestId,
        timestamp: new Date(),
        details: {
          statusCode,
          responseTime,
          resourceId: req.auditContext?.resourceId,
          resourceType: req.auditContext?.resourceType,
          metadata: {
            query: Object.keys(req.query).length > 0 ? req.query : undefined,
            params: Object.keys(req.params).length > 0 ? req.params : undefined,
            requestBody: options?.logRequestBody && req.body && 
                        JSON.stringify(req.body).length < (options.maxBodySize || 1024) ? 
                        sanitizeRequestBody(req.body) : undefined,
            responseBody: options?.logResponseBody ? responseBody : undefined,
            contentLength: res.get('content-length'),
            ...req.auditContext?.metadata
          }
        },
        riskLevel: req.auditContext?.riskLevel || riskLevel,
        compliance: {
          gdpr: isGDPRApplicable(req),
          sox: isSOXApplicable(req),
          pci: isPCIApplicable(req),
          hipaa: isHIPAAApplicable(req)
        }
      };

      // Log audit entry
      if (shouldLogAuditEntry(auditEntry)) {
        logAuditEntry(logger, auditEntry);
      }

      // Store in database if needed (async)
      if (shouldStoreAuditEntry(auditEntry)) {
        storeAuditEntry(auditEntry).catch(error => {
          logger.error('Failed to store audit entry', {
            error: error.message,
            auditEventType: auditEntry.eventType,
            userId: auditEntry.userId,
            path: auditEntry.path
          });
        });
      }
    });

    next();
  };
};

/**
 * Middleware for auditing sensitive actions
 */
export const auditSensitiveAction = (actionType: string, options?: {
  resourceType?: string;
  riskLevel?: 'low' | 'medium' | 'high' | 'critical';
  requireJustification?: boolean;
  metadata?: Record<string, any>;
}) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    const logger = container.get<Logger>(TYPES.Logger);

    // Require justification for high-risk actions
    if (options?.requireJustification && !req.body.justification) {
      logger.warn('Sensitive action attempted without justification', {
        actionType,
        userId: req.user?.id,
        path: req.path,
        method: req.method
      });

      res.status(400).json({
        success: false,
        message: 'Justification required for this action',
        code: 'JUSTIFICATION_REQUIRED'
      });
      return;
    }

    // Set audit context
    req.auditContext = {
      eventType: AuditEventType.SENSITIVE_ACTION,
      resourceType: options?.resourceType,
      riskLevel: options?.riskLevel || 'high',
      metadata: {
        actionType,
        justification: req.body.justification,
        ...options?.metadata
      }
    };

    // Log immediate audit for critical actions
    if (options?.riskLevel === 'critical') {
      logger.warn('Critical action initiated', {
        actionType,
        userId: req.user?.id,
        companyId: req.user?.companyId,
        path: req.path,
        method: req.method,
        ipAddress: getClientIP(req),
        justification: req.body.justification
      });
    }

    next();
  };
};

/**
 * Middleware for auditing data modifications
 */
export const auditDataModification = (options?: {
  resourceType: string;
  captureOldValues?: boolean;
  sensitiveFields?: string[];
}) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    // Set audit context for data modification
    req.auditContext = {
      eventType: AuditEventType.DATA_MODIFICATION,
      resourceType: options?.resourceType,
      riskLevel: 'medium',
      metadata: {
        modifiedFields: options?.sensitiveFields?.filter(field => 
          req.body && req.body.hasOwnProperty(field)
        ),
        hasSensitiveFields: options?.sensitiveFields?.some(field => 
          req.body && req.body.hasOwnProperty(field)
        )
      }
    };

    // Increase risk level if sensitive fields are being modified
    if (req.auditContext.metadata?.hasSensitiveFields) {
      req.auditContext.riskLevel = 'high';
    }

    next();
  };
};

/**
 * Middleware for auditing permission denials
 */
export const auditPermissionDenied = (reason: string, requiredPermission?: string) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    const logger = container.get<Logger>(TYPES.Logger);

    const auditEntry: AuditLogEntry = {
      eventType: AuditEventType.PERMISSION_DENIED,
      userId: req.user?.id,
      companyId: req.user?.companyId,
      sessionId: req.user?.sessionId,
      ipAddress: getClientIP(req),
      userAgent: req.get('User-Agent') || 'Unknown',
      method: req.method,
      path: req.path,
      requestId: req.requestId,
      timestamp: new Date(),
      details: {
        reason,
        metadata: {
          requiredPermission,
          userRole: req.user?.role,
          userPermissions: req.user?.permissions
        }
      },
      riskLevel: 'medium',
      compliance: {
        gdpr: isGDPRApplicable(req),
        sox: isSOXApplicable(req),
        pci: isPCIApplicable(req),
        hipaa: isHIPAAApplicable(req)
      }
    };

    logger.warn('Permission denied', auditEntry);

    // Store permission denial for security analysis
    storeAuditEntry(auditEntry).catch(error => {
      logger.error('Failed to store permission denial audit', {
        error: error.message,
        userId: req.user?.id
      });
    });

    next();
  };
};

/**
 * Helper functions
 */
function getClientIP(req: Request): string {
  return (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() ||
         req.headers['x-real-ip'] as string ||
         req.connection.remoteAddress ||
         req.socket.remoteAddress ||
         'unknown';
}

function sanitizeRequestBody(body: any): any {
  if (!body || typeof body !== 'object') return body;

  const sanitized = { ...body };
  const sensitiveFields = [
    'password', 'token', 'accessToken', 'refreshToken', 'secret',
    'apiKey', 'privateKey', 'creditCard', 'ssn', 'socialSecurityNumber'
  ];

  sensitiveFields.forEach(field => {
    if (sanitized[field]) {
      sanitized[field] = '[REDACTED]';
    }
  });

  return sanitized;
}

function shouldLogAuditEntry(entry: AuditLogEntry): boolean {
  // Always log high and critical risk events
  if (['high', 'critical'].includes(entry.riskLevel)) return true;

  // Log errors (4xx, 5xx status codes)
  if (entry.details.statusCode && entry.details.statusCode >= 400) return true;

  // Log authentication-related events
  if ([AuditEventType.LOGIN, AuditEventType.LOGOUT, AuditEventType.PERMISSION_DENIED].includes(entry.eventType)) {
    return true;
  }

  // Log data modifications
  if (entry.eventType === AuditEventType.DATA_MODIFICATION) return true;

  // For production, only log medium+ risk events
  if (environment.nodeEnv === 'production') {
    return entry.riskLevel !== 'low';
  }

  // In development, log everything
  return true;
}

function shouldStoreAuditEntry(entry: AuditLogEntry): boolean {
  // Always store high and critical risk events
  if (['high', 'critical'].includes(entry.riskLevel)) return true;

  // Store compliance-related events
  if (Object.values(entry.compliance).some(applicable => applicable)) return true;

  // Store authentication and permission events
  if ([
    AuditEventType.LOGIN, 
    AuditEventType.LOGOUT, 
    AuditEventType.PERMISSION_DENIED,
    AuditEventType.DATA_MODIFICATION,
    AuditEventType.SENSITIVE_ACTION
  ].includes(entry.eventType)) {
    return true;
  }

  return false;
}

function logAuditEntry(logger: Logger, entry: AuditLogEntry): void {
  const logLevel = entry.riskLevel === 'critical' ? 'error' : 
                   entry.riskLevel === 'high' ? 'warn' : 'info';

  logger.log(logLevel, 'Audit Event', {
    auditEvent: entry.eventType,
    userId: entry.userId,
    companyId: entry.companyId,
    riskLevel: entry.riskLevel,
    method: entry.method,
    path: entry.path,
    statusCode: entry.details.statusCode,
    responseTime: entry.details.responseTime,
    ipAddress: entry.ipAddress,
    compliance: entry.compliance,
    details: entry.details
  });
}

async function storeAuditEntry(entry: AuditLogEntry): Promise<void> {
  // TODO: Implement database storage
  // This would typically use an audit repository to store in database
  // For now, we'll use structured logging which can be ingested by log aggregation systems

  const logger = container.get<Logger>(TYPES.Logger);
  logger.info('Audit Entry for Storage', {
    type: 'AUDIT_STORAGE',
    entry: {
      ...entry,
      // Ensure timestamp is ISO string for better parsing
      timestamp: entry.timestamp.toISOString()
    }
  });
}

function isGDPRApplicable(req: Request): boolean {
  // Check if request involves personal data or EU users
  const personalDataEndpoints = ['/users/', '/profile/', '/personal/'];
  return personalDataEndpoints.some(endpoint => req.path.includes(endpoint)) ||
         req.user !== undefined; // Any authenticated request involves personal data
}

function isSOXApplicable(req: Request): boolean {
  // Check if request involves financial data
  const financialEndpoints = ['/billing/', '/payments/', '/transactions/', '/reports/financial'];
  return financialEndpoints.some(endpoint => req.path.includes(endpoint));
}

function isPCIApplicable(req: Request): boolean {
  // Check if request involves payment card data
  const paymentEndpoints = ['/payments/', '/cards/', '/billing/'];
  return paymentEndpoints.some(endpoint => req.path.includes(endpoint));
}

function isHIPAAApplicable(req: Request): boolean {
  // Check if request involves health information
  const healthEndpoints = ['/health/', '/medical/', '/patient/'];
  return healthEndpoints.some(endpoint => req.path.includes(endpoint));
}

/**
 * Utility function to create audit context
 */
export const createAuditContext = (
  eventType: AuditEventType,
  options?: {
    resourceId?: string;
    resourceType?: string;
    riskLevel?: 'low' | 'medium' | 'high' | 'critical';
    metadata?: Record<string, any>;
  }
) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    req.auditContext = {
      eventType,
      ...options
    };
    next();
  };
};
