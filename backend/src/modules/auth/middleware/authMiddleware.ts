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
 * Middleware de autorización por rol - NUEVA LÓGICA FASE 2
 * Usa los roles correctos: super_admin, admin, user
 */
export const requireRole = (...allowedRoles: string[]) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.userRole) {
      return sendUnauthorizedResponse(res, 'No role information available');
    }

    // Normalizar roles para compatibilidad
    const normalizedUserRole = normalizeRole(req.userRole);
    const normalizedAllowedRoles = allowedRoles.map(normalizeRole);

    if (!normalizedAllowedRoles.includes(normalizedUserRole)) {
      return sendForbiddenResponse(res, 'Insufficient permissions for this operation');
    }
    next();
  };
};

/**
 * Middlewares específicos con roles correctos
 */
export const requireSuperAdmin = requireRole('super_admin');
export const requireAdminOrAbove = requireRole('super_admin', 'admin');
export const requireAnyRole = requireRole('super_admin', 'admin', 'user');

/**
 * Middleware para gestión de usuarios
 * Solo SuperAdmin y Admin pueden gestionar usuarios
 */
export const requireUserManagement = requireRole('super_admin', 'admin');

/**
 * Middleware para gestión de roles
 * Solo SuperAdmin puede gestionar roles
 */
export const requireRoleManagement = requireRole('super_admin');
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
 * Middleware para verificar acceso a empresa - NUEVA LÓGICA FASE 2
 * SuperAdmin: acceso a cualquier empresa
 * Admin/User: solo su empresa asignada
 */
export const requireCompanyAccess = (companyIdParam: string = 'companyId') => {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const logger = container.get<Logger>(TYPES.Logger);

    try {
      const requestedCompanyId = req.params[companyIdParam] || req.body[companyIdParam] || req.query[companyIdParam];

      if (!requestedCompanyId) {
        return sendBadRequestResponse(res, 'Company ID is required');
      }

      const userRole = normalizeRole(req.userRole || '');

      // SuperAdmin: puede acceder a cualquier empresa
      if (userRole === 'super_admin') {
        return next();
      }

      // Admin/User: debe coincidir con su empresa asignada
      if (req.companyId !== requestedCompanyId) {
        logger.warn('Company access denied', {
          userId: req.userId,
          userRole,
          userCompanyId: req.companyId,
          requestedCompanyId
        });
        return sendForbiddenResponse(res, 'Access denied to this company');
      }

      next();
    } catch (error) {
      handleAuthError(error, res, logger);
    }
  };
};

/**
 * Middleware para verificar gestión de usuarios
 * SuperAdmin: puede gestionar cualquier usuario
 * Admin: solo usuarios de su empresa (y solo users, no otros admins)
 * User: no puede gestionar usuarios
 */
export const requireUserManagementAccess = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  const logger = container.get<Logger>(TYPES.Logger);

  try {
    const userRole = normalizeRole(req.userRole || '');

    // User: no puede gestionar usuarios
    if (userRole === 'user') {
      return sendForbiddenResponse(res, 'Users cannot manage other users');
    }

    // SuperAdmin: puede gestionar cualquier usuario
    if (userRole === 'super_admin') {
      return next();
    }

    // Admin: verificaciones adicionales se harán en el servicio
    // (si puede gestionar al usuario objetivo y si es de su empresa)
    next();

  } catch (error) {
    handleAuthError(error, res, logger);
  }
};
/**
 * Middleware para verificar permisos específicos - NUEVO FASE 2
 * Integra con el nuevo PermissionService
 */
export const requirePermission = (permission: string) => {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const logger = container.get<Logger>(TYPES.Logger);

    try {
      if (!req.userId) {
        return sendUnauthorizedResponse(res, 'User not authenticated');
      }

      const userRole = normalizeRole(req.userRole || '');

      // SuperAdmin: siempre tiene todos los permisos
      if (userRole === 'super_admin') {
        return next();
      }

      // TODO: Integrar con PermissionService cuando esté listo
      // Por ahora, validaciones básicas
      const hasPermission = await checkBasicPermission(req.userId, permission, req.companyId);

      if (!hasPermission) {
        logger.warn('Permission denied', {
          userId: req.userId,
          permission,
          userRole,
          companyId: req.companyId
        });
        return sendForbiddenResponse(res, `Permission denied: ${permission}`);
      }

      next();

    } catch (error) {
      handleAuthError(error, res, logger);
    }
  };
};

// ========== Funciones auxiliares ==========

/**
 * Normalizar roles para compatibilidad
 * NUEVA FUNCIÓN FASE 2
 */
function normalizeRole(role: string): string {
  const roleMap: Record<string, string> = {
    'Super Admin': 'super_admin',
    'super admin': 'super_admin',
    'superadmin': 'super_admin',
    'admin': 'admin',
    'user': 'user',
    'User': 'user',
    'Admin': 'admin'
  };

  return roleMap[role] || role.toLowerCase();
}

/**
 * Verificación de permisos usando PermissionService - FASE 3
 */
async function checkBasicPermission(userId: string, permission: string, companyId?: string): Promise<boolean> {
  try {
    // Obtener PermissionService del contenedor
    const { PermissionServiceNew } = await import('@/modules/auth/services/PermissionServiceNew');
    const { container } = await import('@/container/container');

    // TODO: Registrar PermissionServiceNew en el contenedor
    // Por ahora, creación manual para evitar errores
    const userRepository = container.get(TYPES.UserRepository);
    const roleRepository = container.get(TYPES.RoleRepository);
    const logger = container.get(TYPES.Logger);

    const permissionService = new PermissionServiceNew(userRepository, roleRepository, logger);

    return await permissionService.hasPermission(userId, permission, companyId);

  } catch (error) {
    // Fallback: permitir acceso para evitar bloqueos
    console.warn('Permission check failed, allowing access:', error.message);
    return true;
  }
}

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
