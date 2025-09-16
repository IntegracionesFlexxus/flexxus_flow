// Auth Middleware - Sprint 1 con principios Nivel 2
// Middleware para validación de JWT y autorización

import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { container } from '../../../container/container';
import { IAuthService } from '../interfaces/IAuthService';
import { TYPES } from '../../../container/types';
import { environment } from '../../../config/environment';
import winston from 'winston';

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
 * Seguridad: Validación completa de tokens
 */
export const authMiddleware = async (
  req: Request, 
  res: Response, 
  next: NextFunction
): Promise<void> => {
  try {
    // Extraer token del header
    const token = extractTokenFromHeader(req);
    
    if (!token) {
      return sendUnauthorizedResponse(res, 'No token provided');
    }

    // Verificar token
    const decoded = await verifyToken(token);
    
    // Agregar datos del usuario al request
    req.userId = decoded.userId;
    req.userEmail = decoded.email;
    req.companyId = decoded.companyId;
    req.userRole = decoded.role;
    req.token = token;
    
    // Log de acceso
    logAccess(req, decoded);
    
    next();
  } catch (error) {
    handleAuthError(error, res);
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
  try {
    const token = extractTokenFromHeader(req);
    
    if (token) {
      const decoded = await verifyToken(token);
      req.userId = decoded.userId;
      req.userEmail = decoded.email;
      req.companyId = decoded.companyId;
      req.userRole = decoded.role;
      req.token = token;
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
      handleAuthError(error, res);
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
 * Verificar y decodificar token JWT
 * Seguridad: Validación completa con manejo de errores
 */
async function verifyToken(token: string): Promise<any> {
  try {
    return jwt.verify(token, environment.jwt.secret);
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      throw new Error('Token expired');
    }
    if (error instanceof jwt.JsonWebTokenError) {
      throw new Error('Invalid token');
    }
    throw error;
  }
}

/**
 * Log de acceso para auditoría
 * Seguridad: Registro de accesos para análisis
 */
function logAccess(req: Request, decoded: any): void {
  const logger = container.get<winston.Logger>(TYPES.Logger);
  
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
function handleAuthError(error: any, res: Response): void {
  const logger = container.get<winston.Logger>(TYPES.Logger);
  logger.error('Authentication error:', error);
  
  if (error.message === 'Token expired') {
    return sendUnauthorizedResponse(res, 'Token expired');
  }
  
  if (error.message === 'Invalid token') {
    return sendUnauthorizedResponse(res, 'Invalid token');
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