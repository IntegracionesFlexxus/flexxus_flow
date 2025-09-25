/**
 * Permission Middleware - Sprint 19
 * Middleware for permission-based authorization
 */

import { Request, Response, NextFunction } from 'express';
import { container } from '@/container/container';
import { TYPES } from '@/container/types';
import { Logger } from 'winston';

/**
 * Product Quote Permissions - Sprint 19
 */
export const PRODUCT_QUOTE_PERMISSIONS = {
  // Products
  PRODUCT_VIEW: 'product_quote.products.view',
  PRODUCT_CREATE: 'product_quote.products.create',
  PRODUCT_UPDATE: 'product_quote.products.update',
  PRODUCT_DELETE: 'product_quote.products.delete',
  PRODUCT_IMPORT: 'product_quote.products.import',
  PRODUCT_EXPORT: 'product_quote.products.export',

  // Categories
  CATEGORY_VIEW: 'product_quote.categories.view',
  CATEGORY_MANAGE: 'product_quote.categories.manage',

  // Pricing
  PRICING_VIEW: 'product_quote.pricing.view',
  PRICING_RULES_CREATE: 'product_quote.pricing.rules.create',
  PRICING_RULES_UPDATE: 'product_quote.pricing.rules.update',
  PRICING_RULES_DELETE: 'product_quote.pricing.rules.delete',
  PRICING_OVERRIDE: 'product_quote.pricing.override',

  // Quotes
  QUOTE_VIEW: 'product_quote.quotes.view',
  QUOTE_CREATE: 'product_quote.quotes.create',
  QUOTE_UPDATE: 'product_quote.quotes.update',
  QUOTE_DELETE: 'product_quote.quotes.delete',
  QUOTE_APPROVE: 'product_quote.quotes.approve',
  QUOTE_EXPORT: 'product_quote.quotes.export',

  // Documents
  DOCUMENT_VIEW: 'product_quote.documents.view',
  DOCUMENT_GENERATE: 'product_quote.documents.generate',
  TEMPLATE_MANAGE: 'product_quote.documents.templates.manage',

  // Approvals
  APPROVAL_VIEW: 'product_quote.approvals.view',
  APPROVAL_APPROVE: 'product_quote.approvals.approve',
  APPROVAL_DELEGATE: 'product_quote.approvals.delegate',
  WORKFLOW_MANAGE: 'product_quote.approvals.workflows.manage',

  // Revenue
  REVENUE_VIEW: 'product_quote.revenue.view',
  REVENUE_MANAGE: 'product_quote.revenue.manage'
} as const;

/**
 * Role-based permission mapping
 */
const ROLE_PERMISSIONS: Record<string, string[]> = {
  admin: Object.values(PRODUCT_QUOTE_PERMISSIONS),

  sales_manager: [
    PRODUCT_QUOTE_PERMISSIONS.PRODUCT_VIEW,
    PRODUCT_QUOTE_PERMISSIONS.PRODUCT_CREATE,
    PRODUCT_QUOTE_PERMISSIONS.PRODUCT_UPDATE,
    PRODUCT_QUOTE_PERMISSIONS.CATEGORY_VIEW,
    PRODUCT_QUOTE_PERMISSIONS.PRICING_VIEW,
    PRODUCT_QUOTE_PERMISSIONS.PRICING_RULES_CREATE,
    PRODUCT_QUOTE_PERMISSIONS.PRICING_RULES_UPDATE,
    PRODUCT_QUOTE_PERMISSIONS.PRICING_OVERRIDE,
    PRODUCT_QUOTE_PERMISSIONS.QUOTE_VIEW,
    PRODUCT_QUOTE_PERMISSIONS.QUOTE_CREATE,
    PRODUCT_QUOTE_PERMISSIONS.QUOTE_UPDATE,
    PRODUCT_QUOTE_PERMISSIONS.QUOTE_DELETE,
    PRODUCT_QUOTE_PERMISSIONS.QUOTE_APPROVE,
    PRODUCT_QUOTE_PERMISSIONS.QUOTE_EXPORT,
    PRODUCT_QUOTE_PERMISSIONS.DOCUMENT_VIEW,
    PRODUCT_QUOTE_PERMISSIONS.DOCUMENT_GENERATE,
    PRODUCT_QUOTE_PERMISSIONS.APPROVAL_VIEW,
    PRODUCT_QUOTE_PERMISSIONS.APPROVAL_APPROVE,
    PRODUCT_QUOTE_PERMISSIONS.APPROVAL_DELEGATE,
    PRODUCT_QUOTE_PERMISSIONS.REVENUE_VIEW
  ],

  sales_rep: [
    PRODUCT_QUOTE_PERMISSIONS.PRODUCT_VIEW,
    PRODUCT_QUOTE_PERMISSIONS.CATEGORY_VIEW,
    PRODUCT_QUOTE_PERMISSIONS.PRICING_VIEW,
    PRODUCT_QUOTE_PERMISSIONS.QUOTE_VIEW,
    PRODUCT_QUOTE_PERMISSIONS.QUOTE_CREATE,
    PRODUCT_QUOTE_PERMISSIONS.QUOTE_UPDATE,
    PRODUCT_QUOTE_PERMISSIONS.DOCUMENT_VIEW,
    PRODUCT_QUOTE_PERMISSIONS.DOCUMENT_GENERATE,
    PRODUCT_QUOTE_PERMISSIONS.APPROVAL_VIEW
  ],

  viewer: [
    PRODUCT_QUOTE_PERMISSIONS.PRODUCT_VIEW,
    PRODUCT_QUOTE_PERMISSIONS.CATEGORY_VIEW,
    PRODUCT_QUOTE_PERMISSIONS.PRICING_VIEW,
    PRODUCT_QUOTE_PERMISSIONS.QUOTE_VIEW,
    PRODUCT_QUOTE_PERMISSIONS.DOCUMENT_VIEW,
    PRODUCT_QUOTE_PERMISSIONS.APPROVAL_VIEW,
    PRODUCT_QUOTE_PERMISSIONS.REVENUE_VIEW
  ]
};

/**
 * Check if user has required permission
 */
const hasPermission = (
  userRole: string,
  userPermissions: string[],
  requiredPermission: string
): boolean => {
  // Admin always has access
  if (userRole === 'admin') {
    return true;
  }

  // Check role-based permissions
  const rolePermissions = ROLE_PERMISSIONS[userRole] || [];
  if (rolePermissions.includes(requiredPermission)) {
    return true;
  }

  // Check user-specific permissions
  return userPermissions.includes(requiredPermission);
};

/**
 * Permission middleware factory
 * Creates middleware that checks for specific permission
 *
 * @param permission - Required permission string
 * @param options - Additional options
 */
export const checkPermission = (
  permission: string,
  options: {
    requireAll?: boolean;
    customErrorMessage?: string;
  } = {}
) => {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const logger = container.get<Logger>(TYPES.Logger);

    try {
      // Check if user is authenticated (assumes authMiddleware ran first)
      if (!req.userId) {
        logger.warn('Permission check attempted without authentication', {
          path: req.path,
          method: req.method
        });

        res.status(401).json({
          error: 'Authentication required',
          code: 'UNAUTHORIZED'
        });
        return;
      }

      // Get user role and permissions from request
      // These should be set by authMiddleware
      const userRole = req.userRole || '';
      const userPermissions = (req as any).userPermissions || [];

      // Check permission
      const hasAccess = hasPermission(userRole, userPermissions, permission);

      if (!hasAccess) {
        logger.warn('Permission denied', {
          userId: req.userId,
          userRole,
          requiredPermission: permission,
          path: req.path,
          method: req.method
        });

        res.status(403).json({
          error: options.customErrorMessage || 'Insufficient permissions',
          code: 'FORBIDDEN',
          requiredPermission: permission
        });
        return;
      }

      // Log successful permission check
      logger.debug('Permission granted', {
        userId: req.userId,
        userRole,
        permission,
        path: req.path
      });

      next();
    } catch (error) {
      logger.error('Error in permission middleware', {
        error: error.message,
        stack: error.stack,
        permission,
        path: req.path
      });

      res.status(500).json({
        error: 'Internal server error',
        code: 'PERMISSION_CHECK_ERROR'
      });
    }
  };
};

/**
 * Check multiple permissions
 *
 * @param permissions - Array of required permissions
 * @param requireAll - If true, all permissions are required; if false, any permission is sufficient
 */
export const checkPermissions = (
  permissions: string[],
  requireAll: boolean = false
) => {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const logger = container.get<Logger>(TYPES.Logger);

    try {
      // Check if user is authenticated
      if (!req.userId) {
        logger.warn('Permission check attempted without authentication', {
          path: req.path,
          method: req.method
        });

        res.status(401).json({
          error: 'Authentication required',
          code: 'UNAUTHORIZED'
        });
        return;
      }

      const userRole = req.userRole || '';
      const userPermissions = (req as any).userPermissions || [];

      // Admin always has access
      if (userRole === 'admin') {
        next();
        return;
      }

      let hasAccess = false;

      if (requireAll) {
        // All permissions required
        hasAccess = permissions.every(permission =>
          hasPermission(userRole, userPermissions, permission)
        );
      } else {
        // Any permission sufficient
        hasAccess = permissions.some(permission =>
          hasPermission(userRole, userPermissions, permission)
        );
      }

      if (!hasAccess) {
        logger.warn('Multiple permission check failed', {
          userId: req.userId,
          userRole,
          requiredPermissions: permissions,
          requireAll,
          path: req.path,
          method: req.method
        });

        res.status(403).json({
          error: 'Insufficient permissions',
          code: 'FORBIDDEN',
          requiredPermissions: permissions,
          requireAll
        });
        return;
      }

      logger.debug('Multiple permissions granted', {
        userId: req.userId,
        userRole,
        permissions,
        path: req.path
      });

      next();
    } catch (error) {
      logger.error('Error in permissions middleware', {
        error: error.message,
        stack: error.stack,
        permissions,
        path: req.path
      });

      res.status(500).json({
        error: 'Internal server error',
        code: 'PERMISSION_CHECK_ERROR'
      });
    }
  };
};

/**
 * Role-based middleware
 * Checks if user has one of the specified roles
 *
 * @param roles - Array of allowed roles
 */
export const requireRole = (roles: string[]) => {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const logger = container.get<Logger>(TYPES.Logger);

    try {
      // Check if user is authenticated
      if (!req.userId) {
        logger.warn('Role check attempted without authentication', {
          path: req.path,
          method: req.method
        });

        res.status(401).json({
          error: 'Authentication required',
          code: 'UNAUTHORIZED'
        });
        return;
      }

      const userRole = req.userRole || '';

      if (!roles.includes(userRole)) {
        logger.warn('Role requirement not met', {
          userId: req.userId,
          userRole,
          requiredRoles: roles,
          path: req.path,
          method: req.method
        });

        res.status(403).json({
          error: 'Insufficient role privileges',
          code: 'FORBIDDEN',
          requiredRoles: roles
        });
        return;
      }

      logger.debug('Role requirement met', {
        userId: req.userId,
        userRole,
        path: req.path
      });

      next();
    } catch (error) {
      logger.error('Error in role middleware', {
        error: error.message,
        stack: error.stack,
        roles,
        path: req.path
      });

      res.status(500).json({
        error: 'Internal server error',
        code: 'ROLE_CHECK_ERROR'
      });
    }
  };
};

/**
 * Convenience middleware for admin-only routes
 */
export const adminOnly = requireRole(['admin']);

/**
 * Convenience middleware for manager-level access
 */
export const managerAccess = requireRole(['admin', 'sales_manager']);

export default checkPermission;