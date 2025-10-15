import type { Request } from 'express';

export interface AuthUser {
  id: string;
  email?: string;
  companyId?: string;
  role?: string;
  permissions?: string[];
  sessionId?: string;
}

export type AuthRequest = Request & {
  user?: AuthUser;
  userId?: string;
  userEmail?: string;
  companyId?: string;
  userRole?: string;
  token?: string;
};

export {
  authMiddleware,
  optionalAuth,
  requireAdmin,
  requireCompanyMembership,
  requireManager,
  requireOwnership,
  requireRole
} from './authMiddleware';
