/**
 * Unified Authentication & Authorization Middleware
 * Consolidación de auth.ts, authMiddleware.ts y authorizationMiddleware.ts
 * Sprint 2-3 - Siguiendo principios SOLID y Clean Code
 */

import { Request, Response, NextFunction } from 'express';
import { injectable, inject, optional } from 'inversify';
import { container } from '@/container/container';
import { TYPES } from '@/container/types';
import { IJwtService } from '@/modules/auth/interfaces/IJwtService';
import { ISessionService } from '@/modules/auth/interfaces/ISessionService';
import { IFeatureFlagService } from '@/modules/feature-flags/interfaces/IFeatureFlagService';
import { PermissionService } from '@/modules/auth/services/PermissionService';
import { Logger } from 'winston';
import { environment } from '@/config/environment';
import { AppError } from '@shared/errors/AppError';

// Extend Request interface to include user context
declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string;
        email: string;
        companyId: string;
        role: string;
        sessionId: string;
        permissions?: string[];
      };
      // Backward compatibility properties for controllers that access directly
      userId?: string;
      userEmail?: string;
      companyId?: string;
      userRole?: string;
      requestId?: string;
      startTime?: number;
    }
  }
}

/**
 * Main authentication middleware that validates JWT and session
 */
export const authenticateToken = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  const logger = container.get<Logger>(TYPES.Logger);
  const jwtService = container.get<IJwtService>(TYPES.JwtService);
  const sessionService = container.get<ISessionService>(TYPES.SessionService);

  const startTime = Date.now();

  try {
    // DEVELOPMENT ONLY: Bypass auth for testing
    if (process.env.NODE_ENV === 'development' && process.env.DEV_AUTH_BYPASS === 'true') {
      const authHeader = req.headers.authorization;
      if (!authHeader || authHeader === 'Bearer test-token' || authHeader === 'Bearer test-token-123') {
        const devCompanyId = req.headers['x-company-id'] as string || '0a8e08a1-fdad-4caa-b90e-d8d791fa82ee';
        const devUserId = '9366a549-ed26-43af-9711-07c214c2d481';
        const devEmail = 'demo@flexxus.com';
        const devRole = 'admin';

        req.user = {
          id: devUserId,
          email: devEmail,
          companyId: devCompanyId,
          role: devRole,
          sessionId: 'dev-session',
          permissions: ['*']
        };

        // Set properties directly for backward compatibility
        req.userId = devUserId;
        req.userEmail = devEmail;
        req.companyId = devCompanyId;
        req.userRole = devRole;

        next();
        return;
      }
    }

    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

    if (!token) {
      logger.warn('Authentication failed - no token provided', {
        path: req.path,
        method: req.method,
        ip: req.ip,
        userAgent: req.get('User-Agent')?.substring(0, 100)
      });

      res.status(401).json({
        success: false,
        message: 'Access token required',
        code: 'TOKEN_REQUIRED'
      });
      return;
    }

    // Verify JWT token
    const payload = await jwtService.verifyAccessToken(token);

    // Validate session
    const tokenHash = jwtService.hashToken(token);
    const sessionValidation = await sessionService.validateSession(tokenHash);

    if (!sessionValidation.isValid || !sessionValidation.session) {
      logger.warn('Authentication failed - invalid session', {
        userId: payload.userId,
        sessionId: payload.sessionId,
        reason: sessionValidation.reason,
        path: req.path,
        ip: req.ip
      });

      res.status(401).json({
        success: false,
        message: 'Invalid or expired session',
        code: 'SESSION_INVALID'
      });
      return;
    }

    // Set user context (both in req.user and directly for backward compatibility)
    req.user = {
      id: payload.userId,
      email: payload.email,
      companyId: payload.companyId,
      role: payload.role,
      sessionId: payload.sessionId
    };

    // Set properties directly on req for backward compatibility with existing controllers
    req.userId = payload.userId;
    req.userEmail = payload.email;
    req.companyId = payload.companyId;
    req.userRole = payload.role;

    // Set database context for RLS (Row Level Security)
    try {
      // These would be set on the database connection
      await setDatabaseContext(req.user.id, req.user.companyId);
    } catch (dbError) {
      logger.warn('Failed to set database context', {
        userId: req.user.id,
        companyId: req.user.companyId,
        error: dbError.message
      });
      // Continue without failing - RLS context is optional
    }

    // Log successful authentication
    const authTime = Date.now() - startTime;
    logger.debug('Authentication successful', {
      userId: payload.userId,
      companyId: payload.companyId,
      sessionId: payload.sessionId,
      authTime,
      path: req.path
    });

    next();

  } catch (error) {
    const authTime = Date.now() - startTime;
    logger.warn('Authentication failed', {
      error: error.message,
      authTime,
      path: req.path,
      method: req.method,
      ip: req.ip,
      userAgent: req.get('User-Agent')?.substring(0, 100)
    });

    // Different error messages based on error type
    let message = 'Invalid or expired token';
    let code = 'TOKEN_INVALID';

    if (error.message.includes('expired')) {
      message = 'Token has expired';
      code = 'TOKEN_EXPIRED';
    } else if (error.message.includes('malformed')) {
      message = 'Malformed token';
      code = 'TOKEN_MALFORMED';
    }

    res.status(401).json({
      success: false,
      message,
      code
    });
  }
};

/**
 * Optional authentication middleware - sets user context if token is provided
 */
export const optionalAuthentication = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  const authHeader = req.headers.authorization;
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    // No token provided, continue without authentication
    next();
    return;
  }

  try {
    // Try to authenticate but don't fail if it doesn't work
    await authenticateToken(req, res, () => {
      next();
    });
  } catch (error) {
    // Continue without authentication on error
    next();
  }
};

/**
 * Mapeo de roles en español a códigos en inglés (para usuarios legacy)
 */
const ROLE_NAME_TO_CODE_MAP: Record<string, string> = {
  'super admin': 'super_admin',
  'superadmin': 'super_admin',
  'administrador': 'admin',
  'administrator': 'admin',
  'gerente': 'manager',
  'manager': 'manager',
  'usuario': 'user',
  'user': 'user',
  'viewer': 'viewer',
  'visualizador': 'viewer',
  'editor': 'editor',
  'owner': 'owner',
  'propietario': 'owner'
};

/**
 * Normalizar nombre de rol a código
 */
function normalizeRoleToCode(role: string): string {
  const normalized = role.toLowerCase().trim();
  return ROLE_NAME_TO_CODE_MAP[normalized] || normalized;
}

/**
 * Role-based authorization middleware
 */
export const requireRole = (allowedRoles: string | string[], options?: {
  strict?: boolean;
  errorMessage?: string;
}) => {
  const roles = Array.isArray(allowedRoles) ? allowedRoles : [allowedRoles];

  return (req: Request, res: Response, next: NextFunction): void => {
    console.log('\n========================================');
    console.log('🛡️ [Backend RequireRole] Middleware called');
    console.log('📍 [Backend RequireRole] Path:', req.path);
    console.log('📋 [Backend RequireRole] Method:', req.method);
    console.log('🎯 [Backend RequireRole] Required roles:', roles);
    console.log('👤 [Backend RequireRole] User context:', req.user);

    if (!req.user) {
      console.log('❌ [Backend RequireRole] No user context - authentication required');
      console.log('========================================\n');

      res.status(401).json({
        success: false,
        message: 'Authentication required',
        code: 'AUTH_REQUIRED'
      });
      return;
    }

    // Normalizar rol del usuario usando el mapeo de fallback
    const userRoleCode = normalizeRoleToCode(req.user.role || '');
    const normalizedRoles = roles.map(role => normalizeRoleToCode(role));

    console.log('🔍 [Backend RequireRole] User role (original):', req.user.role);
    console.log('🔍 [Backend RequireRole] User role (normalized to code):', userRoleCode);
    console.log('🔍 [Backend RequireRole] Required roles (normalized):', normalizedRoles);
    console.log('🔍 [Backend RequireRole] Role check result:', normalizedRoles.includes(userRoleCode));

    if (!normalizedRoles.includes(userRoleCode)) {
      console.log('❌ [Backend RequireRole] AUTHORIZATION FAILED');
      console.log('  User role code:', userRoleCode);
      console.log('  Required role codes:', normalizedRoles);
      console.log('========================================\n');

      const logger = container.get<Logger>(TYPES.Logger);
      logger.warn('Authorization failed - insufficient role', {
        userId: req.user.id,
        userRole: req.user.role,
        userRoleCode,
        requiredRoles: roles,
        path: req.path,
        method: req.method
      });

      const message = options?.errorMessage || 'Insufficient permissions';

      res.status(403).json({
        success: false,
        message,
        code: 'INSUFFICIENT_PERMISSIONS',
        required: roles
      });
      return;
    }

    console.log('✅ [Backend RequireRole] Authorization passed');
    console.log('========================================\n');
    next();
  };
};

/**
 * Company ownership validation middleware
 */
export const requireCompanyAccess = (resourceCompanyIdExtractor?: (req: Request) => string) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({
        success: false,
        message: 'Authentication required',
        code: 'AUTH_REQUIRED'
      });
      return;
    }

    // Extract company ID from request
    let resourceCompanyId: string;

    if (resourceCompanyIdExtractor) {
      resourceCompanyId = resourceCompanyIdExtractor(req);
    } else {
      // Default extraction methods
      resourceCompanyId = 
        req.params.companyId || 
        req.body.companyId || 
        req.query.companyId as string;
    }

    if (!resourceCompanyId) {
      res.status(400).json({
        success: false,
        message: 'Company ID required in request',
        code: 'COMPANY_ID_REQUIRED'
      });
      return;
    }

    if (req.user.companyId !== resourceCompanyId) {
      const logger = container.get<Logger>(TYPES.Logger);
      logger.warn('Authorization failed - company access denied', {
        userId: req.user.id,
        userCompanyId: req.user.companyId,
        requestedCompanyId: resourceCompanyId,
        path: req.path,
        method: req.method
      });

      res.status(403).json({
        success: false,
        message: 'Access denied to this company resource',
        code: 'COMPANY_ACCESS_DENIED'
      });
      return;
    }

    next();
  };
};

/**
 * Feature flag validation middleware
 */
export const requireFeatureFlag = (featureName: string, options?: {
  errorMessage?: string;
  skipForRoles?: string[];
  environment?: string;
  failSafe?: boolean;
}) => {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    if (!req.user) {
      res.status(401).json({
        success: false,
        message: 'Authentication required',
        code: 'AUTH_REQUIRED'
      });
      return;
    }

    const logger = container.get<Logger>(TYPES.Logger);

    try {
      // Skip feature flag check for certain roles
      if (options?.skipForRoles && options.skipForRoles.includes(req.user.role)) {
        logger.debug('Skipping feature flag check for privileged role', {
          featureName,
          userId: req.user.id,
          userRole: req.user.role
        });
        next();
        return;
      }

      const featureFlagService = container.get<IFeatureFlagService>(TYPES.FeatureFlagService);

      const evaluation = await featureFlagService.isEnabled(featureName, {
        userId: req.user.id,
        companyId: req.user.companyId,
        userRole: req.user.role,
        environment: options?.environment || environment.nodeEnv || 'production',
        userAttributes: {
          role: req.user.role,
          email: req.user.email
        },
        ipAddress: req.ip,
        deviceInfo: {
          userAgent: req.get('User-Agent')
        }
      });

      if (!evaluation.enabled) {
        logger.info('Feature flag blocked request', {
          featureName,
          userId: req.user.id,
          companyId: req.user.companyId,
          reason: evaluation.reason,
          path: req.path,
          method: req.method
        });

        const message = options?.errorMessage || 'Feature not available';

        res.status(403).json({
          success: false,
          message,
          code: 'FEATURE_NOT_AVAILABLE',
          feature: featureName
        });
        return;
      }

      logger.debug('Feature flag allowed request', {
        featureName,
        userId: req.user.id,
        evaluationTime: evaluation.evaluationTime,
        path: req.path
      });

      next();

    } catch (error) {
      logger.error('Feature flag middleware error', {
        featureName,
        userId: req.user.id,
        companyId: req.user.companyId,
        error: error.message,
        path: req.path
      });

      if (options?.failSafe !== false) {
        // Default behavior: allow request to proceed on error (fail-safe)
        logger.warn('Allowing request due to feature flag error (fail-safe)', {
          featureName,
          path: req.path
        });
        next();
      } else {
        res.status(500).json({
          success: false,
          message: 'Internal server error',
          code: 'INTERNAL_ERROR'
        });
      }
    }
  };
};

/**
 * Permission-based authorization middleware
 */
export const requirePermission = (permission: string | string[], options?: {
  requireAll?: boolean;
  errorMessage?: string;
}) => {
  const permissions = Array.isArray(permission) ? permission : [permission];

  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    if (!req.user) {
      res.status(401).json({
        success: false,
        message: 'Authentication required',
        code: 'AUTH_REQUIRED'
      });
      return;
    }

    const logger = container.get<Logger>(TYPES.Logger);

    try {
      // Get user permissions (this would typically come from a user service)
      const userPermissions = await getUserPermissions(req.user.id, req.user.companyId);

      const hasPermission = options?.requireAll 
        ? permissions.every(perm => userPermissions.includes(perm))
        : permissions.some(perm => userPermissions.includes(perm));

      if (!hasPermission) {
        logger.warn('Authorization failed - insufficient permissions', {
          userId: req.user.id,
          requiredPermissions: permissions,
          userPermissions,
          path: req.path,
          method: req.method
        });

        const message = options?.errorMessage || 'Insufficient permissions';

        res.status(403).json({
          success: false,
          message,
          code: 'INSUFFICIENT_PERMISSIONS',
          required: permissions
        });
        return;
      }

      // Add permissions to user object for later use
      req.user.permissions = userPermissions;
      next();

    } catch (error) {
      logger.error('Permission check error', {
        userId: req.user.id,
        requiredPermissions: permissions,
        error: error.message,
        path: req.path
      });

      res.status(500).json({
        success: false,
        message: 'Internal server error',
        code: 'INTERNAL_ERROR'
      });
    }
  };
};

/**
 * Request context middleware - adds request ID and timing
 */
export const addRequestContext = (req: Request, res: Response, next: NextFunction): void => {
  // Generate unique request ID
  req.requestId = req.get('x-request-id') || generateRequestId();
  req.startTime = Date.now();

  // Set response headers
  res.set('x-request-id', req.requestId);

  // Add request ID to all logs in this request
  const logger = container.get<Logger>(TYPES.Logger);
  logger.debug('Request started', {
    requestId: req.requestId,
    method: req.method,
    path: req.path,
    ip: req.ip,
    userAgent: req.get('User-Agent')?.substring(0, 100)
  });

  next();
};

/**
 * API versioning middleware
 */
export const requireApiVersion = (supportedVersions: string[], options?: {
  headerName?: string;
  defaultVersion?: string;
}) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    const headerName = options?.headerName || 'api-version';
    const requestedVersion = req.get(headerName) || options?.defaultVersion;

    if (!requestedVersion) {
      res.status(400).json({
        success: false,
        message: `API version required in ${headerName} header`,
        code: 'API_VERSION_REQUIRED',
        supportedVersions
      });
      return;
    }

    if (!supportedVersions.includes(requestedVersion)) {
      res.status(400).json({
        success: false,
        message: `Unsupported API version: ${requestedVersion}`,
        code: 'API_VERSION_UNSUPPORTED',
        supportedVersions
      });
      return;
    }

    // Add version info to request
    (req as any).apiVersion = requestedVersion;
    res.set('api-version', requestedVersion);

    next();
  };
};

/**
 * Helper functions
 */
async function setDatabaseContext(userId: string, companyId: string): Promise<void> {
  // This would set session variables for Row Level Security
  // Implementation depends on database connection management
  const db = container.get(TYPES.SharedConnection);

  if (db && typeof db.query === 'function') {
    await db.query(`SELECT set_config('app.current_user_id', $1, true)`, [userId]);
    await db.query(`SELECT set_config('app.current_company_id', $1, true)`, [companyId]);
  }
}

async function getUserPermissions(userId: string, companyId: string): Promise<string[]> {
  // This would typically fetch from a user/role service
  // For now, return empty array as placeholder
  return [];
}

function generateRequestId(): string {
  return `req_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
}

/**
 * API Key Authentication
 * Para servicios externos o integraciones
 */
export const authenticateApiKey = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const apiKey = req.headers['x-api-key'] as string;

    if (!apiKey) {
      res.status(401).json({
        success: false,
        message: 'API key required',
        code: 'API_KEY_REQUIRED'
      });
      return;
    }

    // TODO: Implement proper API key validation service
    // For now, check against environment
    if (apiKey !== process.env.API_KEY) {
      const logger = container.get<Logger>(TYPES.Logger);
      logger.warn('Invalid API key attempt', {
        path: req.path,
        method: req.method,
        ip: req.ip
      });

      res.status(401).json({
        success: false,
        message: 'Invalid API key',
        code: 'API_KEY_INVALID'
      });
      return;
    }

    next();
  } catch (error) {
    const logger = container.get<Logger>(TYPES.Logger);
    logger.error('API key authentication error', {
      error: error.message,
      path: req.path
    });

    res.status(500).json({
      success: false,
      message: 'Internal server error',
      code: 'INTERNAL_ERROR'
    });
  }
};

/**
 * Rate limiting middleware
 * Enhanced version with per-user and per-IP tracking
 */
const rateLimitStore = new Map<string, { count: number; resetTime: number }>();

export const rateLimit = (options?: {
  maxRequests?: number;
  windowMs?: number;
  skipSuccessfulRequests?: boolean;
  keyGenerator?: (req: Request) => string;
}) => {
  const maxRequests = options?.maxRequests || 100;
  const windowMs = options?.windowMs || 60000; // 1 minute default

  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const key = options?.keyGenerator 
      ? options.keyGenerator(req)
      : req.user?.id || req.ip || 'anonymous';

    const now = Date.now();
    const userRequests = rateLimitStore.get(key);

    if (!userRequests || userRequests.resetTime < now) {
      rateLimitStore.set(key, { count: 1, resetTime: now + windowMs });
      return next();
    }

    if (userRequests.count >= maxRequests) {
      const retryAfter = Math.ceil((userRequests.resetTime - now) / 1000);
      res.set('Retry-After', retryAfter.toString());
      res.set('X-RateLimit-Limit', maxRequests.toString());
      res.set('X-RateLimit-Remaining', '0');
      res.set('X-RateLimit-Reset', new Date(userRequests.resetTime).toISOString());

      const logger = container.get<Logger>(TYPES.Logger);
      logger.warn('Rate limit exceeded', {
        key,
        path: req.path,
        method: req.method
      });

      res.status(429).json({
        success: false,
        message: 'Too many requests',
        code: 'RATE_LIMIT_EXCEEDED',
        retryAfter
      });
      return;
    }

    userRequests.count++;
    res.set('X-RateLimit-Limit', maxRequests.toString());
    res.set('X-RateLimit-Remaining', (maxRequests - userRequests.count).toString());
    res.set('X-RateLimit-Reset', new Date(userRequests.resetTime).toISOString());

    next();
  };
};

/**
 * Ownership validation middleware
 * Check if user owns or has access to a resource
 */
export const requireOwnership = (options?: {
  resourceType?: string;
  idParam?: string;
  ownershipChecker?: (req: Request, resourceId: string) => Promise<boolean>;
}) => {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    if (!req.user) {
      res.status(401).json({
        success: false,
        message: 'Authentication required',
        code: 'AUTH_REQUIRED'
      });
      return;
    }

    const resourceType = options?.resourceType || 'resource';
    const idParam = options?.idParam || 'id';
    const resourceId = req.params[idParam];

    if (!resourceId) {
      res.status(400).json({
        success: false,
        message: `${resourceType} ID required`,
        code: 'RESOURCE_ID_REQUIRED'
      });
      return;
    }

    // Check ownership
    let isOwner = false;

    if (options?.ownershipChecker) {
      isOwner = await options.ownershipChecker(req, resourceId);
    } else {
      // Default ownership check based on resource type
      if (resourceType === 'user') {
        isOwner = resourceId === req.user.id;
      } else if (resourceType === 'company') {
        isOwner = resourceId === req.user.companyId;
      }
      // Add more default checks as needed
    }

    if (!isOwner) {
      const logger = container.get<Logger>(TYPES.Logger);
      logger.warn('Ownership check failed', {
        userId: req.user.id,
        resourceType,
        resourceId,
        path: req.path
      });

      res.status(403).json({
        success: false,
        message: 'Access denied - not resource owner',
        code: 'OWNERSHIP_REQUIRED'
      });
      return;
    }

    next();
  };
};

/**
 * Scope-based authorization
 * Check access scope (global, company, team, self)
 */
export const requireScope = (scope: 'global' | 'company' | 'team' | 'self', options?: {
  errorMessage?: string;
}) => {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    if (!req.user) {
      res.status(401).json({
        success: false,
        message: 'Authentication required',
        code: 'AUTH_REQUIRED'
      });
      return;
    }

    let hasScope = false;
    const logger = container.get<Logger>(TYPES.Logger);

    switch (scope) {
      case 'global':
        // Check if user has global admin permissions
        hasScope = req.user.permissions?.includes('admin.*') || 
                  req.user.permissions?.includes('*') ||
                  req.user.role === 'super_admin';
        break;

      case 'company':
        // Check if user belongs to the company
        hasScope = !!req.user.companyId;
        break;

      case 'team':
        // Check if resource belongs to user's team
        const teamId = req.params.teamId || req.body.teamId || req.query.teamId;
        if (!teamId) {
          hasScope = false;
        } else {
          // TODO: Implement actual team membership check
          hasScope = true;
        }
        break;

      case 'self':
        // Check if resource belongs to the user
        const userId = req.params.userId || req.body.userId || req.query.userId;
        hasScope = userId === req.user.id;
        break;
    }

    if (!hasScope) {
      logger.warn('Scope check failed', {
        userId: req.user.id,
        requiredScope: scope,
        path: req.path
      });

      const message = options?.errorMessage || `Access denied - ${scope} scope required`;

      res.status(403).json({
        success: false,
        message,
        code: 'SCOPE_REQUIRED',
        requiredScope: scope
      });
      return;
    }

    next();
  };
};

/**
 * MFA verification middleware
 * Require multi-factor authentication for sensitive operations
 */
export const requireMFA = (options?: {
  errorMessage?: string;
  allowGracePeriod?: boolean;
}) => {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    if (!req.user) {
      res.status(401).json({
        success: false,
        message: 'Authentication required',
        code: 'AUTH_REQUIRED'
      });
      return;
    }

    // Check for MFA token in headers or session
    const mfaToken = req.headers['x-mfa-token'] || 
                    req.body.mfaToken ||
                    (req as any).session?.mfaVerified;

    if (!mfaToken) {
      const logger = container.get<Logger>(TYPES.Logger);
      logger.warn('MFA required but not provided', {
        userId: req.user.id,
        path: req.path
      });

      const message = options?.errorMessage || 'MFA verification required';

      res.status(403).json({
        success: false,
        message,
        code: 'MFA_REQUIRED',
        mfaRequired: true
      });
      return;
    }

    // TODO: Implement actual MFA token verification
    // For now, just check if token exists

    next();
  };
};

/**
 * Extract token from various sources
 */
export const extractToken = (req: Request): string | null => {
  // Check Authorization header
  const authHeader = req.headers.authorization;
  if (authHeader) {
    const parts = authHeader.split(' ');
    if (parts.length === 2 && parts[0] === 'Bearer') {
      return parts[1];
    }
  }

  // Check x-access-token header
  const accessToken = req.headers['x-access-token'] as string;
  if (accessToken) {
    return accessToken;
  }

  // Check cookies
  if (req.cookies && req.cookies.token) {
    return req.cookies.token;
  }

  // Check query parameter (not recommended for production)
  if (req.query.token && typeof req.query.token === 'string') {
    return req.query.token;
  }

  return null;
};

/**
 * Combine multiple middleware functions
 */
export const createAuthChain = (...middlewares: Array<(req: Request, res: Response, next: NextFunction) => void>) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    const runMiddleware = (index: number): void => {
      if (index >= middlewares.length) {
        next();
        return;
      }

      const middleware = middlewares[index];
      middleware(req, res, (error?: any) => {
        if (error) {
          next(error);
          return;
        }
        runMiddleware(index + 1);
      });
    };

    runMiddleware(0);
  };
};

/**
 * AuthMiddleware Class
 * Provides all authentication/authorization methods as a class
 * For dependency injection compatibility
 */
@injectable()
export class AuthMiddleware {
  constructor(
    @inject(TYPES.JwtService) private jwtService: IJwtService,
    @inject(TYPES.SessionService) private sessionService: ISessionService,
    @inject(TYPES.Logger) private logger: Logger,
    @inject(TYPES.PermissionService) @optional() private permissionService?: PermissionService
  ) {}

  // Main authentication
  authenticate = authenticateToken;

  // Optional authentication  
  optionalAuthenticate = optionalAuthentication;

  // Role-based authorization
  requireRole = requireRole;
  requireAnyRole = (roles: string[]) => requireRole(roles);

  // Permission-based authorization
  requirePermission = requirePermission;
  requireAnyPermission = (permissions: string[]) => requirePermission(permissions, { requireAll: false });
  requireAllPermissions = (permissions: string[]) => requirePermission(permissions, { requireAll: true });

  // Scope-based authorization
  requireScope = requireScope;

  // Ownership validation
  requireOwnership = requireOwnership;

  // Company access validation
  requireCompanyAccess = requireCompanyAccess;

  // Feature flags
  requireFeatureFlag = requireFeatureFlag;

  // API key authentication
  authenticateApiKey = authenticateApiKey;

  // Rate limiting
  rateLimit = rateLimit;

  // MFA verification
  requireMFA = requireMFA;

  // Helper methods
  extractToken = extractToken;
}

/**
 * Factory function to create AuthMiddleware instance
 * For backward compatibility with authorizationMiddleware.ts usage
 */
export const createAuthorizationMiddleware = (containerInstance?: any) => {
  const c = containerInstance || container;

  // If the container has AuthMiddleware registered, use it
  if (c.isBound(TYPES.AuthMiddleware)) {
    return c.get<AuthMiddleware>(TYPES.AuthMiddleware);
  }

  // Otherwise, return the exported functions
  return {
    requirePermission,
    requireAnyPermission: (permissions: string[]) => requirePermission(permissions, { requireAll: false }),
    requireAllPermissions: (permissions: string[]) => requirePermission(permissions, { requireAll: true }),
    requireRole,
    requireAnyRole: (roles: string[]) => requireRole(roles),
    requireOwnership,
    requireScope,
    authorize: (options: any) => {
      // Create a custom middleware based on options
      return async (req: Request, res: Response, next: NextFunction) => {
        // Implement authorization logic based on options
        if (options.permission) {
          return requirePermission(options.permission)(req, res, next);
        }
        if (options.role) {
          return requireRole(options.role)(req, res, next);
        }
        if (options.scope) {
          return requireScope(options.scope)(req, res, next);
        }
        next();
      };
    }
  };
};
