/**
 * WebSocket Authentication Middleware
 * Sprint 4 - Autenticación JWT para conexiones WebSocket
 */
import { Socket } from 'socket.io';
import { ExtendedError } from 'socket.io/dist/namespace';
import { container } from '@/container/container';
import { TYPES } from '@/container/types';
import { IJwtService } from '@/modules/auth/interfaces/IJwtService';
import { Logger } from 'winston';
import { AuthenticatedSocket, WebSocketErrorCodes } from '@/modules/websocket/types/websocket.types';
/**
 * Middleware de autenticación para Socket.io
 * Reutiliza el JwtService existente
 */
export const socketAuthMiddleware = async (
  socket: Socket,
  next: (err?: ExtendedError) => void
): Promise<void> => {
  const logger = container.get<Logger>(TYPES.Logger);
  const jwtService = container.get<IJwtService>(TYPES.JwtService);
  try {
    // Obtener token de diferentes fuentes
    const token = extractToken(socket);
    if (!token) {
      logger.warn('WebSocket connection attempt without token', {
        socketId: socket.id,
        ip: socket.handshake.address
      });
      return next(createAuthError('No token provided', WebSocketErrorCodes.AUTHENTICATION_FAILED));
    }
    // Verificar token usando el servicio existente
    const payload = await jwtService.verifyAccessToken(token);
    // Validar payload
    if (!payload.userId || !payload.companyId) {
      logger.warn('WebSocket token missing required fields', {
        socketId: socket.id,
        payload
      });
      return next(createAuthError('Invalid token payload', WebSocketErrorCodes.AUTHENTICATION_FAILED));
    }
    // Extender el socket con información de autenticación
    const authenticatedSocket = socket as AuthenticatedSocket;
    authenticatedSocket.userId = payload.userId;
    authenticatedSocket.companyId = payload.companyId;
    authenticatedSocket.email = payload.email;
    authenticatedSocket.role = payload.role;
    authenticatedSocket.permissions = payload.permissions || [];
    authenticatedSocket.sessionId = payload.sessionId;
    // Log de conexión exitosa
    logger.info('WebSocket authenticated', {
      socketId: socket.id,
      userId: payload.userId,
      companyId: payload.companyId,
      email: payload.email,
      role: payload.role
    });
    next();
  } catch (error) {
    logger.error('WebSocket authentication error', {
      socketId: socket.id,
      error: error.message,
      stack: error.stack
    });
    // Manejar diferentes tipos de error
    if (error.message?.includes('expired')) {
      return next(createAuthError('Token expired', WebSocketErrorCodes.AUTHENTICATION_FAILED));
    }
    if (error.message?.includes('invalid')) {
      return next(createAuthError('Invalid token', WebSocketErrorCodes.AUTHENTICATION_FAILED));
    }
    return next(createAuthError('Authentication failed', WebSocketErrorCodes.AUTHENTICATION_FAILED));
  }
};
/**
 * Extrae el token de diferentes fuentes
 */
function extractToken(socket: Socket): string | null {
  // 1. Intentar desde auth en handshake (recomendado)
  if (socket.handshake.auth?.token) {
    return socket.handshake.auth.token;
  }
  // 2. Intentar desde headers
  const authHeader = socket.handshake.headers.authorization;
  if (authHeader) {
    const parts = authHeader.split(' ');
    if (parts.length === 2 && parts[0] === 'Bearer') {
      return parts[1];
    }
  }
  // 3. Intentar desde query params (menos seguro)
  if (socket.handshake.query?.token) {
    return socket.handshake.query.token as string;
  }
  return null;
}
/**
 * Crea un error de autenticación formateado
 */
function createAuthError(message: string, code: string): ExtendedError {
  const error = new Error(message) as ExtendedError;
  error.data = { code, message };
  return error;
}
/**
 * Middleware para verificar permisos en eventos específicos
 */
export const requirePermission = (permission: string) => {
  return (socket: AuthenticatedSocket, next: (err?: Error) => void) => {
    if (!socket.permissions?.includes(permission)) {
      const logger = container.get<Logger>(TYPES.Logger);
      logger.warn('WebSocket permission denied', {
        socketId: socket.id,
        userId: socket.userId,
        requiredPermission: permission,
        userPermissions: socket.permissions
      });
      return next(new Error(`Permission denied: ${permission}`));
    }
    next();
  };
};
/**
 * Middleware para verificar rol en eventos específicos
 */
export const requireRole = (...allowedRoles: string[]) => {
  return (socket: AuthenticatedSocket, next: (err?: Error) => void) => {
    if (!allowedRoles.includes(socket.role)) {
      const logger = container.get<Logger>(TYPES.Logger);
      logger.warn('WebSocket role denied', {
        socketId: socket.id,
        userId: socket.userId,
        requiredRoles: allowedRoles,
        userRole: socket.role
      });
      return next(new Error(`Insufficient role: requires ${allowedRoles.join(' or ')}`));
    }
    next();
  };
};
