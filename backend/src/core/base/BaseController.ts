/**
 * Base Controller
 * Base class for all controllers with common functionality
 */

import { injectable, inject, optional } from 'inversify';
import { Request, Response, NextFunction } from 'express';
import { Logger } from 'winston';
import { TYPES } from '@/container/types';
import { AppError } from '@/shared/errors/AppError';

export interface ControllerOptions {
  enableLogging?: boolean;
  enableMetrics?: boolean;
  enableCaching?: boolean;
}

@injectable()
export abstract class BaseController {
  protected logger?: Logger;
  protected options: ControllerOptions;

  constructor(
    @inject(TYPES.Logger) @optional() logger?: Logger
  ) {
    this.logger = logger;
    this.options = {
      enableLogging: true,
      enableMetrics: false,
      enableCaching: false
    };
  }

  /**
   * Wrap async route handlers to catch errors
   */
  protected asyncHandler = (fn: Function) => {
    return (req: Request, res: Response, next: NextFunction) => {
      Promise.resolve(fn(req, res, next)).catch(next);
    };
  };

  /**
   * Send success response
   */
  protected sendSuccess(
    res: Response,
    data: any = null,
    message: string = 'Success',
    statusCode: number = 200
  ): Response {
    return res.status(statusCode).json({
      success: true,
      message,
      data,
      timestamp: new Date().toISOString()
    });
  }

  /**
   * Send error response
   */
  protected sendError(
    res: Response,
    error: Error | AppError,
    statusCode?: number
  ): Response {
    const status = statusCode || (error instanceof AppError ? error.statusCode : 500);
    const message = error.message || 'Internal Server Error';
    
    if (this.logger) {
      this.logger.error('Controller error:', {
        error: error.message,
        stack: error.stack,
        statusCode: status
      });
    }

    return res.status(status).json({
      success: false,
      message,
      error: process.env.NODE_ENV === 'development' ? error.stack : undefined,
      timestamp: new Date().toISOString()
    });
  }

  /**
   * Send paginated response
   */
  protected sendPaginated(
    res: Response,
    data: any[],
    page: number,
    limit: number,
    total: number,
    message: string = 'Success'
  ): Response {
    const totalPages = Math.ceil(total / limit);
    
    return res.status(200).json({
      success: true,
      message,
      data,
      pagination: {
        page,
        limit,
        total,
        totalPages,
        hasNext: page < totalPages,
        hasPrev: page > 1
      },
      timestamp: new Date().toISOString()
    });
  }

  /**
   * Validate request parameters
   */
  protected validateParams(
    params: any,
    required: string[],
    optional: string[] = []
  ): void {
    // Check required parameters
    for (const param of required) {
      if (!params[param]) {
        throw new AppError(`Missing required parameter: ${param}`, 400);
      }
    }

    // Check for unknown parameters
    const allowedParams = [...required, ...optional];
    const providedParams = Object.keys(params);
    
    for (const param of providedParams) {
      if (!allowedParams.includes(param)) {
        throw new AppError(`Unknown parameter: ${param}`, 400);
      }
    }
  }

  /**
   * Parse pagination parameters from request
   */
  protected getPagination(req: Request): { page: number; limit: number; offset: number } {
    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit as string) || 10));
    const offset = (page - 1) * limit;

    return { page, limit, offset };
  }

  /**
   * Parse sorting parameters from request
   */
  protected getSorting(req: Request, allowedFields: string[]): { sortBy: string; sortOrder: 'ASC' | 'DESC' } {
    const sortBy = (req.query.sortBy as string) || 'createdAt';
    const sortOrder = ((req.query.sortOrder as string)?.toUpperCase() || 'DESC') as 'ASC' | 'DESC';

    if (!allowedFields.includes(sortBy)) {
      throw new AppError(`Invalid sort field: ${sortBy}`, 400);
    }

    if (!['ASC', 'DESC'].includes(sortOrder)) {
      throw new AppError('Sort order must be ASC or DESC', 400);
    }

    return { sortBy, sortOrder };
  }

  /**
   * Parse filter parameters from request
   */
  protected getFilters(req: Request, allowedFilters: string[]): Record<string, any> {
    const filters: Record<string, any> = {};

    for (const filter of allowedFilters) {
      if (req.query[filter] !== undefined) {
        filters[filter] = req.query[filter];
      }
    }

    return filters;
  }

  /**
   * Get user from request (assumes auth middleware has been applied)
   */
  protected getUser(req: Request): any {
    return (req as any).user;
  }

  /**
   * Get user ID from request
   */
  protected getUserId(req: Request): string {
    const user = this.getUser(req);
    if (!user || !user.id) {
      throw new AppError('User not authenticated', 401);
    }
    return user.id;
  }

  /**
   * Get company ID from request
   */
  protected getCompanyId(req: Request): string {
    const user = this.getUser(req);
    if (!user || !user.companyId) {
      throw new AppError('Company not found', 400);
    }
    return user.companyId;
  }

  /**
   * Log controller action
   */
  protected logAction(action: string, data?: any): void {
    if (this.logger && this.options.enableLogging) {
      this.logger.info(`Controller action: ${action}`, data);
    }
  }

  /**
   * Handle file upload
   */
  protected handleFileUpload(req: Request, fieldName: string = 'file'): Express.Multer.File | undefined {
    if (!req.files) {
      return undefined;
    }

    if (Array.isArray(req.files)) {
      return req.files[0];
    }

    return req.files[fieldName]?.[0];
  }

  /**
   * Validate UUID format
   */
  protected validateUUID(id: string, fieldName: string = 'id'): void {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(id)) {
      throw new AppError(`Invalid ${fieldName} format`, 400);
    }
  }

  /**
   * Validate email format
   */
  protected validateEmail(email: string): void {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      throw new AppError('Invalid email format', 400);
    }
  }

  /**
   * Sanitize input to prevent XSS
   */
  protected sanitizeInput(input: string): string {
    return input
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#x27;')
      .replace(/\//g, '&#x2F;');
  }

  /**
   * Get client IP address
   */
  protected getClientIp(req: Request): string {
    return (req.headers['x-forwarded-for'] as string)?.split(',')[0] ||
           (req.headers['x-real-ip'] as string) ||
           req.socket.remoteAddress ||
           'unknown';
  }

  /**
   * Get user agent
   */
  protected getUserAgent(req: Request): string {
    return req.headers['user-agent'] || 'unknown';
  }
}