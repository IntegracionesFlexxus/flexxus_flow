/**
 * Error Handler Middleware - Sprint 2
 * Siguiendo lineamientos nivel 2: manejo centralizado de errores
 * Enhanced from Sprint 1 with comprehensive error handling and typed responses
 */

import { Request, Response, NextFunction } from 'express';
import { Logger } from 'winston';
import { container } from '@/container/container';
import { TYPES } from '@/container/types';
import { AppError, ErrorCode } from '@/shared/errors/AppError';
import { ValidationError as ClassValidatorError } from 'class-validator';
import { environment } from '@/config/environment';

export interface ErrorResponse {
  success: false;
  message: string;
  code: string;
  details?: Record<string, any>;
  requestId?: string;
  timestamp: string;
  path: string;
  method: string;
}

/**
 * Main error handling middleware
 */
export const errorHandler = (
  error: Error,
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  const logger = container.get<Logger>(TYPES.Logger);

  // Skip if response already sent
  if (res.headersSent) {
    return next(error);
  }

  // Convert error to AppError if needed
  const appError = convertToAppError(error);

  // Log error with appropriate level
  logError(logger, appError, req);

  // Create error response
  const errorResponse = createErrorResponse(appError, req);

  // Set additional headers for debugging (non-production only)
  if (environment.nodeEnv !== 'production') {
    res.set('X-Error-Code', appError.code);
    res.set('X-Error-Timestamp', appError.timestamp.toISOString());
  }

  // Send error response
  res.status(appError.statusCode).json(errorResponse);
};

/**
 * 404 Not Found handler
 */
export const notFoundHandler = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  const error = new AppError(
    ErrorCode.RESOURCE_NOT_FOUND,
    `Route ${req.method} ${req.path} not found`,
    404,
    true,
    {
      method: req.method,
      path: req.path,
      headers: req.headers
    }
  );

  next(error);
};

/**
 * Async error wrapper for controllers
 */
export const asyncHandler = (fn: Function) => {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

/**
 * Validation error handler for class-validator
 */
export const handleValidationErrors = (
  errors: ClassValidatorError[]
): AppError => {
  const validationErrors = errors.map(error => ({
    field: error.property,
    message: Object.values(error.constraints || {}).join(', ')
  }));

  return new AppError(
    ErrorCode.VALIDATION_ERROR,
    'Request validation failed',
    400,
    true,
    {
      validationErrors,
      errorCount: validationErrors.length
    }
  );
};

/**
 * Database error handler
 */
export const handleDatabaseError = (error: any): AppError => {
  const logger = container.get<Logger>(TYPES.Logger);

  logger.error('Database error occurred', {
    name: error.name,
    message: error.message,
    code: error.code,
    detail: error.detail,
    constraint: error.constraint,
    table: error.table,
    column: error.column
  });

  // PostgreSQL specific error handling
  switch (error.code) {
    case '23505': // Unique violation
      return new AppError(
        ErrorCode.RESOURCE_ALREADY_EXISTS,
        'Resource already exists',
        409,
        true,
        {
          constraint: error.constraint,
          detail: error.detail
        }
      );

    case '23503': // Foreign key violation
      return new AppError(
        ErrorCode.BUSINESS_RULE_VIOLATION,
        'Cannot perform operation due to existing references',
        400,
        true,
        {
          constraint: error.constraint,
          detail: error.detail
        }
      );

    case '23502': // Not null violation
      return new AppError(
        ErrorCode.VALIDATION_ERROR,
        'Required field missing',
        400,
        true,
        {
          column: error.column,
          detail: error.detail
        }
      );

    case '42P01': // Table does not exist
      return new AppError(
        ErrorCode.DATABASE_ERROR,
        'Database schema error',
        500,
        false,
        {
          detail: error.detail
        }
      );

    case 'ECONNREFUSED':
      return new AppError(
        ErrorCode.DATABASE_ERROR,
        'Database connection failed',
        503,
        false,
        {
          detail: 'Database server is not accessible'
        }
      );

    default:
      return new AppError(
        ErrorCode.DATABASE_ERROR,
        'Database operation failed',
        500,
        false,
        {
          originalError: error.message,
          code: error.code
        }
      );
  }
};

/**
 * JWT error handler
 */
export const handleJWTError = (error: any): AppError => {
  switch (error.name) {
    case 'JsonWebTokenError':
      return new AppError(
        ErrorCode.TOKEN_INVALID,
        'Invalid token format',
        401,
        true,
        { originalError: error.message }
      );

    case 'TokenExpiredError':
      return new AppError(
        ErrorCode.TOKEN_EXPIRED,
        'Token has expired',
        401,
        true,
        {
          expiredAt: error.expiredAt,
          originalError: error.message
        }
      );

    case 'NotBeforeError':
      return new AppError(
        ErrorCode.TOKEN_INVALID,
        'Token not active yet',
        401,
        true,
        {
          notBefore: error.date,
          originalError: error.message
        }
      );

    default:
      return new AppError(
        ErrorCode.TOKEN_INVALID,
        'Token verification failed',
        401,
        true,
        { originalError: error.message }
      );
  }
};

/**
 * Convert various error types to AppError
 */
function convertToAppError(error: any): AppError {
  // Already an AppError
  if (error instanceof AppError) {
    return error;
  }

  // Legacy AppError from Sprint 1 (compatibility)
  if (error.statusCode && error.isOperational !== undefined) {
    return new AppError(
      ErrorCode.INTERNAL_SERVER_ERROR,
      error.message,
      error.statusCode,
      error.isOperational,
      error.details
    );
  }

  // Class-validator validation errors
  if (Array.isArray(error) && error[0] instanceof ClassValidatorError) {
    return handleValidationErrors(error as ClassValidatorError[]);
  }

  // JWT errors
  if (error.name && ['JsonWebTokenError', 'TokenExpiredError', 'NotBeforeError'].includes(error.name)) {
    return handleJWTError(error);
  }

  // Database errors (PostgreSQL, MySQL, etc.)
  if (error.code && typeof error.code === 'string') {
    return handleDatabaseError(error);
  }

  // Axios/HTTP client errors
  if (error.response && error.config) {
    return new AppError(
      ErrorCode.EXTERNAL_SERVICE_ERROR,
      `External service error: ${error.message}`,
      error.response.status >= 500 ? 502 : error.response.status,
      true,
      {
        service: error.config.baseURL || error.config.url,
        statusCode: error.response.status,
        responseData: error.response.data
      }
    );
  }

  // Generic Error objects
  if (error instanceof Error) {
    // Check for specific error patterns
    if (error.message.includes('ENOTFOUND')) {
      return new AppError(
        ErrorCode.EXTERNAL_SERVICE_ERROR,
        'External service unavailable',
        503,
        true,
        { originalError: error.message }
      );
    }

    if (error.message.includes('ECONNREFUSED')) {
      return new AppError(
        ErrorCode.SERVICE_UNAVAILABLE,
        'Service connection failed',
        503,
        true,
        { originalError: error.message }
      );
    }

    if (error.message.includes('timeout')) {
      return new AppError(
        ErrorCode.SERVICE_UNAVAILABLE,
        'Service timeout',
        504,
        true,
        { originalError: error.message }
      );
    }
  }

  // Unknown error - treat as internal server error
  return new AppError(
    ErrorCode.INTERNAL_SERVER_ERROR,
    'An unexpected error occurred',
    500,
    false,
    {
      originalError: error?.message || 'Unknown error',
      errorType: typeof error,
      errorName: error?.name
    }
  );
}

/**
 * Log error with appropriate level and context
 */
function logError(logger: Logger, error: AppError, req: Request): void {
  const logContext = {
    errorCode: error.code,
    statusCode: error.statusCode,
    message: error.message,
    isOperational: error.isOperational,
    requestId: req.requestId,
    method: req.method,
    path: req.path,
    userAgent: req.get('User-Agent'),
    ip: req.ip,
    userId: req.user?.id,
    companyId: req.user?.companyId,
    details: error.details,
    metadata: error.metadata,
    timestamp: error.timestamp
  };

  // Log level based on error type and status code
  if (!error.isOperational || error.statusCode >= 500) {
    logger.error('Unhandled error', {
      ...logContext,
      stack: error.stack
    });
  } else if (error.statusCode >= 400) {
    logger.warn('Client error', logContext);
  } else {
    logger.info('Error handled', logContext);
  }
}

/**
 * Create standardized error response
 */
function createErrorResponse(error: AppError, req: Request): ErrorResponse {
  const baseResponse: ErrorResponse = {
    success: false,
    message: error.message,
    code: error.code,
    requestId: req.requestId,
    timestamp: error.timestamp.toISOString(),
    path: req.path,
    method: req.method
  };

  // Include details in development/staging
  if (environment.nodeEnv !== 'production' && error.details) {
    baseResponse.details = error.details;
  }

  // Include validation errors
  if (error.code === ErrorCode.VALIDATION_ERROR && error.details?.validationErrors) {
    baseResponse.details = {
      validationErrors: error.details.validationErrors
    };
  }

  // Include quota information for quota exceeded errors
  if (error.code === ErrorCode.QUOTA_EXCEEDED && error.details) {
    baseResponse.details = {
      quotaType: error.details.quotaType,
      currentValue: error.details.currentValue,
      maxValue: error.details.maxValue
    };
  }

  // Include retry information for rate limiting errors
  if (error.code === ErrorCode.RATE_LIMIT_EXCEEDED && error.details) {
    baseResponse.details = {
      retryAfter: error.details.retryAfter,
      limit: error.details.limit,
      windowMs: error.details.windowMs
    };
  }

  return baseResponse;
}

/**
 * Health check error handler
 */
export const healthCheckErrorHandler = (
  error: Error,
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  // For health checks, always return simple response
  res.status(503).json({
    success: false,
    message: 'Service unavailable',
    timestamp: new Date().toISOString()
  });
};

/**
 * Error handler for middleware chain
 */
export const errorMiddleware = () => {
  return [
    // Not found handler (should be last route)
    notFoundHandler,
    // Error handler (should be last middleware)
    errorHandler
  ];
};
