import { injectable, inject } from 'inversify';
import { Request, Response, NextFunction } from 'express';
import { IErrorHandlerService, ILoggerService } from '@interfaces/IServices';
import { IConfig } from '@interfaces/IConfig';
import { TYPES } from '@container/types';

// Base error class for operational errors
export class AppError extends Error {
  public readonly isOperational: boolean;
  public readonly statusCode: number;
  public readonly code?: string;

  constructor(
    message: string,
    statusCode: number = 500,
    isOperational: boolean = true,
    code?: string
  ) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = isOperational;
    this.code = code;
    
    Error.captureStackTrace(this, this.constructor);
  }
}

// Specific error classes following Open/Closed Principle
export class ValidationError extends AppError {
  constructor(message: string, details?: any) {
    super(message, 400, true, 'VALIDATION_ERROR');
    (this as any).details = details;
  }
}

export class AuthenticationError extends AppError {
  constructor(message: string = 'Authentication failed') {
    super(message, 401, true, 'AUTHENTICATION_ERROR');
  }
}

export class AuthorizationError extends AppError {
  constructor(message: string = 'Access denied') {
    super(message, 403, true, 'AUTHORIZATION_ERROR');
  }
}

export class NotFoundError extends AppError {
  constructor(resource: string = 'Resource') {
    super(`${resource} not found`, 404, true, 'NOT_FOUND');
  }
}

export class ConflictError extends AppError {
  constructor(message: string) {
    super(message, 409, true, 'CONFLICT');
  }
}

export class RateLimitError extends AppError {
  constructor(message: string = 'Too many requests') {
    super(message, 429, true, 'RATE_LIMIT_EXCEEDED');
  }
}

export class DatabaseError extends AppError {
  constructor(message: string, originalError?: any) {
    super(message, 500, false, 'DATABASE_ERROR');
    (this as any).originalError = originalError;
  }
}

export class ExternalServiceError extends AppError {
  constructor(service: string, originalError?: any) {
    super(`External service error: ${service}`, 503, false, 'EXTERNAL_SERVICE_ERROR');
    (this as any).service = service;
    (this as any).originalError = originalError;
  }
}

// Circuit breaker for handling repeated failures
class CircuitBreaker {
  private failures: number = 0;
  private lastFailureTime?: number;
  private state: 'CLOSED' | 'OPEN' | 'HALF_OPEN' = 'CLOSED';
  
  constructor(
    private readonly threshold: number = 5,
    private readonly timeout: number = 60000
  ) {}

  recordSuccess(): void {
    this.failures = 0;
    this.state = 'CLOSED';
  }

  recordFailure(): void {
    this.failures++;
    this.lastFailureTime = Date.now();
    
    if (this.failures >= this.threshold) {
      this.state = 'OPEN';
    }
  }

  canAttempt(): boolean {
    if (this.state === 'CLOSED') return true;
    
    if (this.state === 'OPEN' && this.lastFailureTime) {
      if (Date.now() - this.lastFailureTime > this.timeout) {
        this.state = 'HALF_OPEN';
        return true;
      }
      return false;
    }
    
    return this.state === 'HALF_OPEN';
  }

  getState(): string {
    return this.state;
  }
}

@injectable()
export class ErrorHandlerService implements IErrorHandlerService {
  private circuitBreakers: Map<string, CircuitBreaker> = new Map();

  constructor(
    @inject(TYPES.LoggerService) private logger: ILoggerService,
    @inject(TYPES.Config) private config: IConfig
  ) {}

  handleError(error: Error, req?: Request, res?: Response): void {
    // Log the error
    this.logError(error, { 
      url: req?.url,
      method: req?.method,
      ip: req?.ip,
      userAgent: req?.get('user-agent')
    });

    // If no response object, just log and return
    if (!res) {
      return;
    }

    // Prepare error response
    const errorResponse = this.prepareErrorResponse(error);

    // Send response
    res.status(errorResponse.statusCode).json(errorResponse);
  }

  handleAsync(fn: Function): Function {
    return (req: Request, res: Response, next: NextFunction) => {
      Promise.resolve(fn(req, res, next)).catch((error) => {
        this.handleError(error, req, res);
      });
    };
  }

  isOperationalError(error: Error): boolean {
    if (error instanceof AppError) {
      return error.isOperational;
    }
    return false;
  }

  logError(error: Error, context?: any): void {
    const errorInfo = {
      message: error.message,
      stack: error.stack,
      context,
      timestamp: new Date().toISOString()
    };

    if (this.isOperationalError(error)) {
      this.logger.warn('Operational error occurred', errorInfo);
    } else {
      this.logger.error('System error occurred', error, errorInfo);
    }
  }

  private prepareErrorResponse(error: Error): any {
    // Default error response
    let statusCode = 500;
    let message = 'Internal server error';
    let code = 'INTERNAL_ERROR';
    let details = undefined;

    if (error instanceof AppError) {
      statusCode = error.statusCode;
      message = error.message;
      code = error.code || code;
      details = (error as any).details;
    } else if (error.name === 'ValidationError') {
      statusCode = 400;
      message = error.message;
      code = 'VALIDATION_ERROR';
    } else if (error.name === 'CastError') {
      statusCode = 400;
      message = 'Invalid data format';
      code = 'CAST_ERROR';
    }

    const response: any = {
      success: false,
      error: {
        code,
        message,
        timestamp: new Date().toISOString()
      }
    };

    // Include details in development mode
    if (this.config.isDevelopment()) {
      response.error.details = details;
      response.error.stack = error.stack;
    }

    return { ...response, statusCode };
  }

  // Retry mechanism with exponential backoff
  async retry<T>(
    fn: () => Promise<T>,
    options: { maxAttempts?: number; delay?: number; backoff?: number } = {}
  ): Promise<T> {
    const { maxAttempts = 3, delay = 1000, backoff = 2 } = options;
    let lastError: Error | undefined;

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        return await fn();
      } catch (error) {
        lastError = error as Error;
        this.logger.warn(`Retry attempt ${attempt} failed`, { error: lastError.message });
        
        if (attempt < maxAttempts) {
          const waitTime = delay * Math.pow(backoff, attempt - 1);
          await new Promise(resolve => setTimeout(resolve, waitTime));
        }
      }
    }

    throw lastError;
  }

  // Circuit breaker wrapper
  async withCircuitBreaker<T>(
    key: string,
    fn: () => Promise<T>,
    options: { threshold?: number; timeout?: number } = {}
  ): Promise<T> {
    if (!this.circuitBreakers.has(key)) {
      this.circuitBreakers.set(key, new CircuitBreaker(options.threshold, options.timeout));
    }

    const breaker = this.circuitBreakers.get(key)!;

    if (!breaker.canAttempt()) {
      throw new ExternalServiceError(key);
    }

    try {
      const result = await fn();
      breaker.recordSuccess();
      return result;
    } catch (error) {
      breaker.recordFailure();
      throw error;
    }
  }

  // Create error middleware for Express
  createErrorMiddleware() {
    return (error: Error, req: Request, res: Response, next: NextFunction) => {
      // Delegate to handleError
      this.handleError(error, req, res);
    };
  }

  // Create async handler wrapper for Express routes
  createAsyncHandler() {
    return (fn: Function) => {
      return (req: Request, res: Response, next: NextFunction) => {
        Promise.resolve(fn(req, res, next)).catch(next);
      };
    };
  }
}