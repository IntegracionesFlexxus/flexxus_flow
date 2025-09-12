/**
 * Application Error Classes - Sprint 2
 * Siguiendo lineamientos nivel 2: error handling centralizado y tipado
 */
export enum ErrorCode {
  // Authentication & Authorization
  UNAUTHORIZED = 'UNAUTHORIZED',
  FORBIDDEN = 'FORBIDDEN',
  TOKEN_EXPIRED = 'TOKEN_EXPIRED',
  TOKEN_INVALID = 'TOKEN_INVALID',
  SESSION_INVALID = 'SESSION_INVALID',
  INSUFFICIENT_PERMISSIONS = 'INSUFFICIENT_PERMISSIONS',
  // Validation
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  INVALID_INPUT = 'INVALID_INPUT',
  MISSING_REQUIRED_FIELD = 'MISSING_REQUIRED_FIELD',
  // Resources
  RESOURCE_NOT_FOUND = 'RESOURCE_NOT_FOUND',
  RESOURCE_ALREADY_EXISTS = 'RESOURCE_ALREADY_EXISTS',
  RESOURCE_CONFLICT = 'RESOURCE_CONFLICT',
  // Business Logic
  BUSINESS_RULE_VIOLATION = 'BUSINESS_RULE_VIOLATION',
  OPERATION_NOT_ALLOWED = 'OPERATION_NOT_ALLOWED',
  QUOTA_EXCEEDED = 'QUOTA_EXCEEDED',
  FEATURE_NOT_AVAILABLE = 'FEATURE_NOT_AVAILABLE',
  // Rate Limiting
  RATE_LIMIT_EXCEEDED = 'RATE_LIMIT_EXCEEDED',
  TOO_MANY_REQUESTS = 'TOO_MANY_REQUESTS',
  // System
  INTERNAL_SERVER_ERROR = 'INTERNAL_SERVER_ERROR',
  SERVICE_UNAVAILABLE = 'SERVICE_UNAVAILABLE',
  DATABASE_ERROR = 'DATABASE_ERROR',
  EXTERNAL_SERVICE_ERROR = 'EXTERNAL_SERVICE_ERROR',
  // Multi-tenancy
  COMPANY_ACCESS_DENIED = 'COMPANY_ACCESS_DENIED',
  COMPANY_NOT_FOUND = 'COMPANY_NOT_FOUND',
  USER_NOT_IN_COMPANY = 'USER_NOT_IN_COMPANY'
}
export interface ErrorDetails {
  code: ErrorCode;
  message: string;
  statusCode: number;
  details?: Record<string, any>;
  metadata?: Record<string, any>;
}
/**
 * Base application error class
 */
export class AppError extends Error {
  public readonly code: ErrorCode;
  public readonly statusCode: number;
  public readonly isOperational: boolean;
  public readonly details?: Record<string, any>;
  public readonly metadata?: Record<string, any>;
  public readonly timestamp: Date;
  constructor(
    code: ErrorCode,
    message: string,
    statusCode: number = 500,
    isOperational: boolean = true,
    details?: Record<string, any>,
    metadata?: Record<string, any>
  ) {
    super(message);
    this.name = this.constructor.name;
    this.code = code;
    this.statusCode = statusCode;
    this.isOperational = isOperational;
    this.details = details;
    this.metadata = metadata;
    this.timestamp = new Date();
    // Capture stack trace
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, this.constructor);
    }
  }
  public toJSON() {
    return {
      name: this.name,
      code: this.code,
      message: this.message,
      statusCode: this.statusCode,
      details: this.details,
      metadata: this.metadata,
      timestamp: this.timestamp,
      stack: this.stack
    };
  }
}
/**
 * Authentication related errors
 */
export class AuthenticationError extends AppError {
  constructor(
    message: string = 'Authentication required',
    code: ErrorCode = ErrorCode.UNAUTHORIZED,
    details?: Record<string, any>
  ) {
    super(code, message, 401, true, details);
  }
}
export class AuthorizationError extends AppError {
  constructor(
    message: string = 'Insufficient permissions',
    code: ErrorCode = ErrorCode.FORBIDDEN,
    details?: Record<string, any>
  ) {
    super(code, message, 403, true, details);
  }
}
export class TokenError extends AppError {
  constructor(
    message: string = 'Invalid token',
    code: ErrorCode = ErrorCode.TOKEN_INVALID,
    details?: Record<string, any>
  ) {
    super(code, message, 401, true, details);
  }
}
/**
 * Validation related errors
 */
export class ValidationError extends AppError {
  constructor(
    message: string = 'Validation failed',
    details?: Record<string, any>,
    validationErrors?: Array<{ field: string; message: string }>
  ) {
    super(
      ErrorCode.VALIDATION_ERROR, 
      message, 
      400, 
      true, 
      { 
        ...details, 
        validationErrors 
      }
    );
  }
}
/**
 * Resource related errors
 */
export class NotFoundError extends AppError {
  constructor(
    resource: string = 'Resource',
    message?: string,
    details?: Record<string, any>
  ) {
    super(
      ErrorCode.RESOURCE_NOT_FOUND,
      message || `${resource} not found`,
      404,
      true,
      { resource, ...details }
    );
  }
}
export class ConflictError extends AppError {
  constructor(
    message: string = 'Resource already exists',
    details?: Record<string, any>
  ) {
    super(ErrorCode.RESOURCE_ALREADY_EXISTS, message, 409, true, details);
  }
}
/**
 * Business logic related errors
 */
export class BusinessRuleError extends AppError {
  constructor(
    message: string = 'Business rule violation',
    details?: Record<string, any>
  ) {
    super(ErrorCode.BUSINESS_RULE_VIOLATION, message, 400, true, details);
  }
}
export class QuotaExceededError extends AppError {
  constructor(
    quotaType: string,
    currentValue: number,
    maxValue: number,
    message?: string
  ) {
    super(
      ErrorCode.QUOTA_EXCEEDED,
      message || `${quotaType} quota exceeded`,
      429,
      true,
      {
        quotaType,
        currentValue,
        maxValue
      }
    );
  }
}
export class FeatureNotAvailableError extends AppError {
  constructor(
    feature: string,
    message?: string,
    details?: Record<string, any>
  ) {
    super(
      ErrorCode.FEATURE_NOT_AVAILABLE,
      message || `Feature '${feature}' is not available`,
      403,
      true,
      { feature, ...details }
    );
  }
}
/**
 * Rate limiting related errors
 */
export class RateLimitError extends AppError {
  constructor(
    limit: number,
    windowMs: number,
    retryAfter: number,
    message?: string
  ) {
    super(
      ErrorCode.RATE_LIMIT_EXCEEDED,
      message || 'Rate limit exceeded',
      429,
      true,
      {
        limit,
        windowMs,
        retryAfter
      }
    );
  }
}
/**
 * Multi-tenancy related errors
 */
export class CompanyAccessError extends AppError {
  constructor(
    companyId: string,
    message?: string,
    details?: Record<string, any>
  ) {
    super(
      ErrorCode.COMPANY_ACCESS_DENIED,
      message || 'Access denied to company resource',
      403,
      true,
      { companyId, ...details }
    );
  }
}
/**
 * System related errors
 */
export class DatabaseError extends AppError {
  constructor(
    message: string = 'Database operation failed',
    originalError?: Error,
    details?: Record<string, any>
  ) {
    super(
      ErrorCode.DATABASE_ERROR,
      message,
      500,
      true,
      {
        originalError: originalError?.message,
        ...details
      }
    );
  }
}
export class ExternalServiceError extends AppError {
  constructor(
    serviceName: string,
    message?: string,
    statusCode: number = 502,
    details?: Record<string, any>
  ) {
    super(
      ErrorCode.EXTERNAL_SERVICE_ERROR,
      message || `External service '${serviceName}' error`,
      statusCode,
      true,
      { serviceName, ...details }
    );
  }
}
/**
 * Error factory for common patterns
 */
export class ErrorFactory {
  static unauthorized(message?: string, details?: Record<string, any>) {
    return new AuthenticationError(message, ErrorCode.UNAUTHORIZED, details);
  }
  static forbidden(message?: string, details?: Record<string, any>) {
    return new AuthorizationError(message, ErrorCode.FORBIDDEN, details);
  }
  static notFound(resource: string, identifier?: string) {
    const message = identifier 
      ? `${resource} with identifier '${identifier}' not found`
      : `${resource} not found`;
    return new NotFoundError(resource, message, { identifier });
  }
  static validation(message: string, errors: Array<{ field: string; message: string }>) {
    return new ValidationError(message, undefined, errors);
  }
  static conflict(resource: string, field?: string, value?: any) {
    const message = field 
      ? `${resource} with ${field} '${value}' already exists`
      : `${resource} already exists`;
    return new ConflictError(message, { resource, field, value });
  }
  static businessRule(rule: string, message: string, details?: Record<string, any>) {
    return new BusinessRuleError(message, { rule, ...details });
  }
  static rateLimit(limit: number, windowMs: number, retryAfter: number) {
    return new RateLimitError(limit, windowMs, retryAfter);
  }
  static companyAccess(companyId: string, userId?: string) {
    return new CompanyAccessError(companyId, undefined, { userId });
  }
  static internal(message: string = 'Internal server error', originalError?: Error) {
    return new AppError(
      ErrorCode.INTERNAL_SERVER_ERROR,
      message,
      500,
      false,
      { originalError: originalError?.message },
      { stack: originalError?.stack }
    );
  }
}
