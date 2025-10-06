/**
 * Base Service - Sprint 2
 * Siguiendo lineamientos nivel 2: clase base para servicios de dominio
 * Arquitectura de servicios con separación de capas
 */

import { injectable, inject } from 'inversify';
import { Logger } from 'winston';
import { TYPES } from '@/container/types';
import { EventBus } from '@/shared/services/EventBus';
import { ValidatorService } from '@/shared/services/ValidationService';
import { AuditService } from '@/shared/services/AuditService';
import { CacheService } from '@/shared/services/CacheService';
import { environment } from '@/config/environment';

export interface ServiceContext {
  userId?: string;
  companyId?: string;
  requestId?: string;
  sessionId?: string;
  correlationId?: string;
  metadata?: Record<string, any>;
}

export interface ServiceOptions {
  enableCache?: boolean;
  enableAudit?: boolean;
  enableValidation?: boolean;
  enableEvents?: boolean;
  cachePrefix?: string;
  cacheTTL?: number;
}

export interface ServiceResult<T> {
  success: boolean;
  data?: T;
  error?: ServiceError;
  metadata?: Record<string, any>;
}

export interface ServiceError {
  code: string;
  message: string;
  details?: Record<string, any>;
  stack?: string;
}

export interface PaginationOptions {
  page: number;
  limit: number;
  sortBy?: string;
  sortOrder?: 'ASC' | 'DESC';
}

export interface PaginatedResult<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  hasNext: boolean;
  hasPrevious: boolean;
}

@injectable()
export abstract class BaseService<TEntity = any> {
  protected serviceName: string;
  protected options: ServiceOptions;
  protected context: ServiceContext = {};

  constructor(
    @inject(TYPES.Logger) protected logger: Logger,
    @inject(TYPES.EventBus) protected eventBus: EventBus,
    @inject(TYPES.ValidationService) protected validationService: ValidatorService,
    @inject(TYPES.AuditService) protected auditService: AuditService,
    @inject(TYPES.CacheService) protected cacheService: CacheService
  ) {
    this.serviceName = this.constructor.name;
    this.options = this.getDefaultOptions();
    this.initialize();
  }

  /**
   * Initialize service
   */
  protected initialize(): void {
    this.logger.info(`${this.serviceName} initialized`, {
      options: this.options
    });
  }

  /**
   * Get default service options
   */
  protected getDefaultOptions(): ServiceOptions {
    return {
      enableCache: true,
      enableAudit: true,
      enableValidation: true,
      enableEvents: true,
      cachePrefix: this.serviceName.toLowerCase(),
      cacheTTL: 300 // 5 minutes
    };
  }

  /**
   * Set service context
   */
  public setContext(context: ServiceContext): void {
    this.context = { ...this.context, ...context };
  }

  /**
   * Clear service context
   */
  public clearContext(): void {
    this.context = {};
  }

  /**
   * Execute service operation with error handling
   */
  protected async executeOperation<T>(
    operation: string,
    handler: () => Promise<T>,
    options?: Partial<ServiceOptions>
  ): Promise<ServiceResult<T>> {
    const startTime = Date.now();
    const operationId = `${this.serviceName}.${operation}`;
    const mergedOptions = { ...this.options, ...options };

    try {
      // Log operation start
      this.logger.debug(`Starting operation: ${operationId}`, {
        context: this.context
      });

      // Execute the operation
      const result = await handler();

      // Audit if enabled
      if (mergedOptions.enableAudit) {
        await this.auditOperation(operation, 'success', { result });
      }

      // Emit event if enabled
      if (mergedOptions.enableEvents) {
        await this.emitEvent(`${operation}.success`, { result });
      }

      // Log operation success
      const duration = Date.now() - startTime;
      this.logger.info(`Operation completed: ${operationId}`, {
        duration,
        context: this.context
      });

      return {
        success: true,
        data: result,
        metadata: {
          operation: operationId,
          duration,
          timestamp: new Date().toISOString()
        }
      };

    } catch (error) {
      // Log operation failure
      const err = error as Error & { code?: string; details?: any };
      const duration = Date.now() - startTime;
      this.logger.error(`Operation failed: ${operationId}`, {
        error: err.message,
        stack: err.stack,
        duration,
        context: this.context
      });

      // Audit if enabled
      if (mergedOptions.enableAudit) {
        await this.auditOperation(operation, 'failure', { error: err.message });
      }

      // Emit event if enabled
      if (mergedOptions.enableEvents) {
        await this.emitEvent(`${operation}.failure`, { error: err.message });
      }

      return {
        success: false,
        error: {
          code: err.code || 'OPERATION_ERROR',
          message: err.message,
          details: err.details,
          stack: environment.isDevelopment ? err.stack : undefined
        },
        metadata: {
          operation: operationId,
          duration,
          timestamp: new Date().toISOString()
        }
      };
    }
  }

  /**
   * Validate data using validation service
   */
  protected async validate<T>(
    data: T,
    schema: any,
    options?: Record<string, any>
  ): Promise<void> {
    if (this.options.enableValidation) {
      const validationResult = await this.validationService.validate(data, schema, options);

      if (!validationResult.isValid) {
        throw new Error(`Validation failed: ${JSON.stringify(validationResult.errors)}`);
      }
    }
  }

  /**
   * Get from cache or execute
   */
  protected async getFromCacheOrExecute<T>(
    key: string,
    executor: () => Promise<T>,
    ttl?: number
  ): Promise<T> {
    if (!this.options.enableCache) {
      return executor();
    }

    const cacheKey = this.buildCacheKey(key);

    // Try to get from cache
    const cached = await this.cacheService.get<T>(cacheKey);
    if (cached) {
      this.logger.debug(`Cache hit: ${cacheKey}`);
      return cached;
    }

    // Execute and cache
    this.logger.debug(`Cache miss: ${cacheKey}`);
    const result = await executor();

    await this.cacheService.set(
      cacheKey,
      result,
      ttl || this.options.cacheTTL
    );

    return result;
  }

  /**
   * Invalidate cache
   */
  protected async invalidateCache(patterns: string[]): Promise<void> {
    if (!this.options.enableCache) {
      return;
    }

    for (const pattern of patterns) {
      const cachePattern = this.buildCacheKey(pattern);
      await this.cacheService.delete(cachePattern);
      this.logger.debug(`Cache invalidated: ${cachePattern}`);
    }
  }

  /**
   * Build cache key
   */
  protected buildCacheKey(key: string): string {
    const prefix = this.options.cachePrefix || this.serviceName.toLowerCase();
    const companyId = this.context.companyId || 'global';
    return `${prefix}:${companyId}:${key}`;
  }

  /**
   * Emit domain event
   */
  protected async emitEvent(
    eventName: string,
    payload: any,
    options?: Record<string, any>
  ): Promise<void> {
    if (!this.options.enableEvents) {
      return;
    }

    const event = {
      name: `${this.serviceName}.${eventName}`,
      payload,
      context: this.context,
      timestamp: new Date(),
      ...options
    };

    await this.eventBus.publish(event as any);

    this.logger.debug(`Event emitted: ${event.name}`, {
      context: this.context
    });
  }

  /**
   * Audit operation
   */
  protected async auditOperation(
    operation: string,
    status: 'success' | 'failure',
    details?: Record<string, any>
  ): Promise<void> {
    if (!this.options.enableAudit) {
      return;
    }

    await this.auditService.logActivity({
      action: `${this.serviceName}.${operation}`,
      entityType: 'service_operation',
      entityId: this.context.requestId || 'unknown',
      userId: this.context.userId,
      companyId: this.context.companyId,
      sessionId: this.context.sessionId,
      description: status === 'failure' ? 'Operation failed' : 'Operation completed',
      metadata: {
        ...details,
        status,
        service: this.serviceName,
        operation
      }
    });
  }

  /**
   * Paginate results
   */
  protected paginate<T>(
    items: T[],
    total: number,
    options: PaginationOptions
  ): PaginatedResult<T> {
    const { page, limit } = options;
    const totalPages = Math.ceil(total / limit);

    return {
      data: items,
      total,
      page,
      limit,
      totalPages,
      hasNext: page < totalPages,
      hasPrevious: page > 1
    };
  }

  /**
   * Handle transaction
   */
  protected async withTransaction<T>(
    handler: (transaction: any) => Promise<T>
  ): Promise<T> {
    // This would be implemented with actual transaction manager
    // For now, just execute the handler
    return handler(null);
  }

  /**
   * Retry operation with exponential backoff
   */
  protected async retryOperation<T>(
    operation: () => Promise<T>,
    maxRetries: number = 3,
    backoffMultiplier: number = 2
  ): Promise<T> {
    let lastError: Error;
    let delay = 1000; // Start with 1 second

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        return await operation();
      } catch (error) {
        const err = error as Error;
        lastError = err;

        this.logger.warn(`Operation failed, attempt ${attempt}/${maxRetries}`, {
          error: err.message,
          service: this.serviceName
        });

        if (attempt < maxRetries) {
          await this.sleep(delay);
          delay *= backoffMultiplier;
        }
      }
    }

    throw lastError!;
  }

  /**
   * Sleep utility
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Batch process items
   */
  protected async batchProcess<TInput, TOutput>(
    items: TInput[],
    processor: (batch: TInput[]) => Promise<TOutput[]>,
    batchSize: number = 100
  ): Promise<TOutput[]> {
    const results: TOutput[] = [];

    for (let i = 0; i < items.length; i += batchSize) {
      const batch = items.slice(i, i + batchSize);
      const batchResults = await processor(batch);
      results.push(...batchResults);

      this.logger.debug(`Processed batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(items.length / batchSize)}`, {
        service: this.serviceName
      });
    }

    return results;
  }

  /**
   * Parallel process with concurrency limit
   */
  protected async parallelProcess<TInput, TOutput>(
    items: TInput[],
    processor: (item: TInput) => Promise<TOutput>,
    concurrency: number = 10
  ): Promise<TOutput[]> {
    const results: TOutput[] = [];
    const executing: Promise<void>[] = [];

    for (const item of items) {
      const promise = processor(item).then(result => {
        results.push(result);
      });

      executing.push(promise);

      if (executing.length >= concurrency) {
        await Promise.race(executing);
        executing.splice(executing.findIndex(p => p), 1);
      }
    }

    await Promise.all(executing);
    return results;
  }

  /**
   * Check if service is healthy
   */
  public async healthCheck(): Promise<{
    healthy: boolean;
    service: string;
    details: Record<string, any>;
  }> {
    return {
      healthy: true,
      service: this.serviceName,
      details: {
        cacheEnabled: this.options.enableCache,
        auditEnabled: this.options.enableAudit,
        eventsEnabled: this.options.enableEvents
      }
    };
  }
}
