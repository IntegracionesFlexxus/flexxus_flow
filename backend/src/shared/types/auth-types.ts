/**
 * Authentication & Authorization Types
 * Tipos para autenticación y autorización
 * Refactor TypeScript Strict Types - Phase 1
 */

import { Request } from 'express';

/**
 * Usuario autenticado en el sistema
 */
export interface AuthUser {
  id: string;
  email: string;
  companyId: string;
  role: string;
  sessionId: string;
  permissions?: string[];
}

/**
 * Información del dispositivo del usuario
 */
export interface DeviceInfo {
  ip: string;
  userAgent: string;
  deviceFingerprint?: string;
}

/**
 * Resultado de validación de sesión
 */
export interface SessionValidation {
  isValid: boolean;
  session?: any;
  reason?: string;
}

/**
 * Opciones para verificación de ownership
 */
export interface OwnershipCheckOptions {
  resourceType?: string;
  idParam?: string;
  ownershipChecker?: (req: Request, resourceId: string) => Promise<boolean>;
}

/**
 * Opciones para feature flags
 */
export interface FeatureFlagOptions {
  errorMessage?: string;
  skipForRoles?: string[];
  environment?: string;
  failSafe?: boolean;
}

/**
 * Opciones para rate limiting
 */
export interface RateLimitOptions {
  maxRequests?: number;
  windowMs?: number;
  skipSuccessfulRequests?: boolean;
  keyGenerator?: (req: Request) => string;
}

/**
 * Opciones para middleware de roles
 */
export interface RequireRoleOptions {
  strict?: boolean;
  errorMessage?: string;
}

/**
 * Opciones para middleware de permisos
 */
export interface RequirePermissionOptions {
  requireAll?: boolean;
  errorMessage?: string;
}

/**
 * Opciones para middleware de scope
 */
export interface RequireScopeOptions {
  errorMessage?: string;
}

/**
 * Entrada en el store de rate limit
 */
export interface RateLimitEntry {
  count: number;
  resetTime: number;
}

/**
 * Opciones para authorization middleware
 */
export interface AuthorizationOptions {
  permission?: string | string[];
  role?: string | string[];
  scope?: 'global' | 'company' | 'team' | 'self';
}

/**
 * Opciones para API versioning
 */
export interface ApiVersionOptions {
  headerName?: string;
  defaultVersion?: string;
}

/**
 * Opciones para MFA
 */
export interface MfaOptions {
  errorMessage?: string;
  allowGracePeriod?: boolean;
}
