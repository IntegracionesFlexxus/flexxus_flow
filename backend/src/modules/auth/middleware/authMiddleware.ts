// Auth Middleware - Sprint 1 con principios Nivel 2
// Middleware para validación de JWT y autorización
import { Request, Response, NextFunction } from 'express';
import { container } from '@/container/container';
import { IJwtService } from '@/modules/auth/interfaces/IJwtService';
import { ISessionService } from '@/modules/auth/interfaces/ISessionService';
import { TYPES } from '@/container/types';
import { environment } from '@/config/environment';
import { Logger } from 'winston';
/**
 * Extender Request interface para incluir datos de usuario
 * Clean Code: Type safety para datos de autenticación
 */
declare global {
  namespace Express {
    interface Request {
      userId?: string;
      userEmail?: string;
      companyId?: string;
      userRole?: string;
      token?: string;
    }
  }
}
/**
 * Middleware de autenticación JWT
 * SOLID: Single Responsibility - Solo valida tokens
 * Seguridad: Validación completa de tokens con sesiones
 */
export const authMiddleware = async (
  req: Request, 
  res: Response, 
  next: NextFunction
): Promise<void> => {
  const jwtService = container.get<IJwtService>(TYPES.JwtService);
  const sessionService = container.get<ISessionService>(TYPES.SessionService);
  const logger = container.get<Logger>(TYPES.Logger);
  
  try {
    // Extraer token del header
    const token = extractTokenFromHeader(req);
    if (!token) {
      return sendUnauthorizedResponse(res, 'No token provided');
    }
    
    // Verificar token usando JwtService
    const decoded = await jwtService.verifyAccessToken(token);
    
    // Validar sesión
    const tokenHash = jwtService.hashToken(token);
    const sessionValidation = await sessionService.validateSession(tokenHash);
    
    if (!sessionValidation.isValid) {
      logger.warn('Invalid session', {
        userId: decoded.userId,
        sessionId: decoded.sessionId,
        reason: sessionValidation.reason
      });
      return sendUnauthorizedResponse(res, sessionValidation.reason || 'Invalid session');
    }
    
    // Agregar datos del usuario al request
    req.userId = decoded.userId;
    req.userEmail = decoded.email;
    req.companyId = decoded.companyId;
    req.userRole = decoded.role;
    req.token = token;
    
    // Log de acceso
    logAccess(req, decoded, logger);
    next();
  } catch (error) {
    handleAuthError(error, res, logger);
  }
};
/**
 * Middleware de autorización por rol
 * Patrón: Factory para crear middleware específico por rol
 */
export const requireRole = (...allowedRoles: string[]) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.userRole) {
      return sendUnauthorizedResponse(res, 'No role information available');
    }
    if (!allowedRoles.includes(req.userRole)) {
      return sendForbiddenResponse(res, 'Insufficient permissions');
    }
    next();
  };
};
/**
 * Middleware de autorización para admin
 * Clean Code: Alias específico para rol común
 */
export const requireAdmin = requireRole('admin');
/**
 * Middleware de autorización para manager o superior
 */
export const requireManager = requireRole('admin', 'manager');
/**
 * Middleware opcional de autenticación
 * Para rutas que funcionan con o sin autenticación
 */
export const optionalAuth = async (
  req: Request, 
  res: Response, 
  next: NextFunction
): Promise<void> => {
  const jwtService = container.get<IJwtService>(TYPES.JwtService);
  const sessionService = container.get<ISessionService>(TYPES.SessionService);
  
  try {
    const token = extractTokenFromHeader(req);
    if (token) {
      const decoded = await jwtService.verifyAccessToken(token);
      
      // Validar sesión opcionalmente
      const tokenHash = jwtService.hashToken(token);
      const sessionValidation = await sessionService.validateSession(tokenHash);
      
      if (sessionValidation.isValid) {
        req.userId = decoded.userId;
        req.userEmail = decoded.email;
        req.companyId = decoded.companyId;
        req.userRole = decoded.role;
        req.token = token;
      }
    }
    next();
  } catch (error) {
    // Si hay error, continuar sin autenticación
    next();
  }
};
/**
 * Middleware para verificar propiedad de recurso
 * Seguridad: Asegurar que usuario solo accede a sus recursos
 */
export const requireOwnership = (resourceUserIdParam: string = 'userId') => {
  return (req: Request, res: Response, next: NextFunction): void => {
    const resourceUserId = req.params[resourceUserIdParam];
    if (!resourceUserId) {
      return sendBadRequestResponse(res, 'Resource user ID is required');
    }
    if (req.userId !== resourceUserId && req.userRole !== 'admin') {
      return sendForbiddenResponse(res, 'You can only access your own resources');
    }
    next();
  };
};
/**
 * Middleware para verificar pertenencia a empresa
 * Seguridad: Validar acceso a recursos de empresa
 */
export const requireCompanyMembership = (companyIdParam: string = 'companyId') => {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const logger = container.get<Logger>(TYPES.Logger);
    
    try {
      const requestedCompanyId = req.params[companyIdParam] || req.body[companyIdParam];
      if (!requestedCompanyId) {
        return sendBadRequestResponse(res, 'Company ID is required');
      }
      // Admin puede acceder a cualquier empresa
      if (req.userRole === 'admin') {
        return next();
      }
      // Verificar que el usuario pertenece a la empresa
      if (req.companyId !== requestedCompanyId) {
        // TODO: Verificar si usuario tiene acceso a múltiples empresas
        return sendForbiddenResponse(res, 'You do not have access to this company');
      }
      next();
    } catch (error) {
      handleAuthError(error, res, logger);
    }
  };
};
// ========== Funciones auxiliares ==========
/**
 * Extraer token del header Authorization
 * Clean Code: Función pura y reutilizable
 */
function extractTokenFromHeader(req: Request): string | null {
  const authHeader = req.headers.authorization;
  if (!authHeader) {
    return null;
  }
  const parts = authHeader.split(' ');
  if (parts.length !== 2 || parts[0] !== 'Bearer') {
    return null;
  }
  return parts[1];
}
/**
 * Log de acceso para auditoría
 * Seguridad: Registro de accesos para análisis
 */
function logAccess(req: Request, decoded: any, logger: Logger): void {
  logger.info('API Access', {
    userId: decoded.userId,
    email: decoded.email,
    companyId: decoded.companyId,
    role: decoded.role,
    path: req.path,
    method: req.method,
    ip: req.ip,
    userAgent: req.get('user-agent')
  });
}
/**
 * Manejar errores de autenticación
 * Clean Code: Manejo centralizado de errores
 */
function handleAuthError(error: any, res: Response, logger: Logger): void {
  logger.error('Authentication error:', error);
  
  if (error.message === 'Token expired' || error.message === 'Access token expired') {
    return sendUnauthorizedResponse(res, 'Token expired');
  }
  if (error.message === 'Invalid token' || error.message === 'Invalid access token') {
    return sendUnauthorizedResponse(res, 'Invalid token');
  }
  if (error.message === 'Token verification failed') {
    return sendUnauthorizedResponse(res, 'Token verification failed');
  }
  
  sendUnauthorizedResponse(res, 'Authentication failed');
}
/**
 * Enviar respuesta 401 Unauthorized
 * Clean Code: Respuestas consistentes
 */
function sendUnauthorizedResponse(res: Response, message: string): void {
  res.status(401).json({
    success: false,
    error: {
      message,
      statusCode: 401
    }
  });
}
/**
 * Enviar respuesta 403 Forbidden
 */
function sendForbiddenResponse(res: Response, message: string): void {
  res.status(403).json({
    success: false,
    error: {
      message,
      statusCode: 403
    }
  });
}
/**
 * Enviar respuesta 400 Bad Request
 */
function sendBadRequestResponse(res: Response, message: string): void {
  res.status(400).json({
    success: false,
    error: {
      message,
      statusCode: 400
    }
  });
}
