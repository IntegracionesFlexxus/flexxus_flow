// Error Handler Middleware - Sprint 1 con manejo robusto
// Middleware central para manejo de errores

import { Request, Response, NextFunction } from 'express';
import winston from 'winston';
import { container } from '../../container/container';
import { TYPES } from '../../container/types';
import { environment } from '../../config/environment';

/**
 * Custom Error Class
 * Patrón: Error Object para errores consistentes
 */
export class AppError extends Error {
  public readonly statusCode: number;
  public readonly isOperational: boolean;
  public readonly details?: any;

  constructor(
    message: string,
    statusCode: number = 500,
    isOperational: boolean = true,
    details?: any
  ) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = isOperational;
    this.details = details;
    
    // Mantener stack trace
    Error.captureStackTrace(this, this.constructor);
  }
}

/**
 * Error Handler Middleware
 * SOLID: Single Responsibility - Solo maneja errores
 * Clean Code: Manejo consistente de diferentes tipos de errores
 */
export const errorHandler = (
  err: Error | AppError,
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  const logger = container.get<winston.Logger>(TYPES.Logger);
  
  // Default values
  let statusCode = 500;
  let message = 'Internal server error';
  let details = undefined;
  let isOperational = false;

  // Handle different error types
  if (err instanceof AppError) {
    statusCode = err.statusCode;
    message = err.message;
    details = err.details;
    isOperational = err.isOperational;
  } else if (err.name === 'ValidationError') {
    // Mongoose/Joi validation errors
    statusCode = 400;
    message = 'Validation error';
    details = err.message;
    isOperational = true;
  } else if (err.name === 'UnauthorizedError') {
    // JWT errors
    statusCode = 401;
    message = 'Unauthorized';
    isOperational = true;
  } else if (err.name === 'CastError') {
    // Database casting errors
    statusCode = 400;
    message = 'Invalid data format';
    isOperational = true;
  }

  // Log error
  const errorLog = {
    message: err.message,
    statusCode,
    isOperational,
    stack: err.stack,
    method: req.method,
    url: req.originalUrl,
    ip: req.ip,
    userAgent: req.get('User-Agent'),
    userId: (req as any).userId,
    companyId: (req as any).companyId
  };

  if (statusCode >= 500) {
    logger.error('Server Error:', errorLog);
  } else {
    logger.warn('Client Error:', errorLog);
  }

  // Prepare response
  const errorResponse: any = {
    success: false,
    error: {
      message,
      statusCode
    }
  };

  // Add details in development
  if (environment.nodeEnv === 'development') {
    errorResponse.error.details = details;
    errorResponse.error.stack = err.stack;
  }

  // Add request ID if available
  if ((req as any).id) {
    errorResponse.requestId = (req as any).id;
  }

  // Send error response
  res.status(statusCode).json(errorResponse);

  // If not operational error in production, shut down gracefully
  if (!isOperational && environment.nodeEnv === 'production') {
    logger.error('Non-operational error detected, shutting down gracefully');
    process.exit(1);
  }
};