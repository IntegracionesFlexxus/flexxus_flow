/**
 * Service Decorators - Sprint 2
 * Siguiendo lineamientos nivel 2: decoradores para servicios
 * Implementación de aspectos transversales mediante decoradores
 */

import 'reflect-metadata';
import { injectable } from 'inversify';
import { METADATA_KEY } from '@/container/types';

/**
 * Transactional decorator for methods that require database transactions
 */
export function Transactional(options?: {
  isolationLevel?: 'READ_UNCOMMITTED' | 'READ_COMMITTED' | 'REPEATABLE_READ' | 'SERIALIZABLE';
  readOnly?: boolean;
}) {
  return function (
    target: any,
    propertyKey: string,
    descriptor: PropertyDescriptor
  ) {
    const originalMethod = descriptor.value;

    descriptor.value = async function (...args: any[]) {
      const transactionOptions = options || {};

      // Get transaction manager from the service instance
      const transactionManager = (this as any).transactionManager;

      if (!transactionManager) {
        // If no transaction manager, execute without transaction
        return originalMethod.apply(this, args);
      }

      // Start transaction
      return transactionManager.transaction(async (entityManager: any) => {
        // Store entity manager in context for nested operations
        (this as any).currentTransaction = entityManager;

        try {
          const result = await originalMethod.apply(this, args);
          return result;
        } finally {
          // Clean up transaction context
          delete (this as any).currentTransaction;
        }
      }, transactionOptions);
    };

    // Store metadata about the transaction
    Reflect.defineMetadata(
      METADATA_KEY.Transactional,
      options || {},
      target,
      propertyKey
    );

    return descriptor;
  };
}

/**
 * Cacheable decorator for methods that can be cached
 */
export function Cacheable(options?: {
  ttl?: number; // Time to live in seconds
  key?: (...args: any[]) => string; // Custom key generator
  condition?: (...args: any[]) => boolean; // Condition to cache
}) {
  return function (
    target: any,
    propertyKey: string,
    descriptor: PropertyDescriptor
  ) {
    const originalMethod = descriptor.value;

    descriptor.value = async function (...args: any[]) {
      const cacheService = (this as any).cacheService;

      if (!cacheService) {
        // If no cache service, execute without caching
        return originalMethod.apply(this, args);
      }

      // Generate cache key
      const keyGenerator = options?.key || (() => `${target.constructor.name}:${propertyKey}:${JSON.stringify(args)}`);
      const cacheKey = keyGenerator(...args);

      // Check condition
      const shouldCache = options?.condition ? options.condition(...args) : true;
      if (!shouldCache) {
        return originalMethod.apply(this, args);
      }

      // Try to get from cache
      const cached = await cacheService.get(cacheKey);
      if (cached !== undefined && cached !== null) {
        return cached;
      }

      // Execute method and cache result
      const result = await originalMethod.apply(this, args);

      if (result !== undefined && result !== null) {
        await cacheService.set(cacheKey, result, options?.ttl || 300);
      }

      return result;
    };

    // Store metadata about caching
    Reflect.defineMetadata(
      METADATA_KEY.Cacheable,
      options || {},
      target,
      propertyKey
    );

    return descriptor;
  };
}

/**
 * Retry decorator for methods that should be retried on failure
 */
export function Retry(options?: {
  maxAttempts?: number;
  delay?: number; // Initial delay in ms
  backoff?: 'fixed' | 'exponential' | 'linear';
  retryCondition?: (error: Error) => boolean;
}) {
  return function (
    target: any,
    propertyKey: string,
    descriptor: PropertyDescriptor
  ) {
    const originalMethod = descriptor.value;
    const maxAttempts = options?.maxAttempts || 3;
    const initialDelay = options?.delay || 1000;
    const backoff = options?.backoff || 'exponential';

    descriptor.value = async function (...args: any[]) {
      let lastError: Error;

      for (let attempt = 1; attempt <= maxAttempts; attempt++) {
        try {
          return await originalMethod.apply(this, args);
        } catch (error) {
          lastError = error;

          // Check if we should retry
          if (options?.retryCondition && !options.retryCondition(error)) {
            throw error;
          }

          if (attempt < maxAttempts) {
            // Calculate delay
            let delay = initialDelay;
            if (backoff === 'exponential') {
              delay = initialDelay * Math.pow(2, attempt - 1);
            } else if (backoff === 'linear') {
              delay = initialDelay * attempt;
            }

            // Wait before retry
            await new Promise(resolve => setTimeout(resolve, delay));

            // Log retry attempt
            const logger = (this as any).logger;
            if (logger) {
              logger.warn(`Retrying ${propertyKey}, attempt ${attempt + 1}/${maxAttempts}`, {
                error: error.message,
                delay
              });
            }
          }
        }
      }

      throw lastError!;
    };

    // Store metadata about retry
    Reflect.defineMetadata(
      METADATA_KEY.Retry,
      options || {},
      target,
      propertyKey
    );

    return descriptor;
  };
}

/**
 * Timeout decorator for methods with execution time limit
 */
export function Timeout(milliseconds: number) {
  return function (
    target: any,
    propertyKey: string,
    descriptor: PropertyDescriptor
  ) {
    const originalMethod = descriptor.value;

    descriptor.value = async function (...args: any[]) {
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => {
          reject(new Error(`Method ${propertyKey} timed out after ${milliseconds}ms`));
        }, milliseconds);
      });

      const methodPromise = originalMethod.apply(this, args);

      return Promise.race([methodPromise, timeoutPromise]);
    };

    // Store metadata about timeout
    Reflect.defineMetadata(
      METADATA_KEY.Timeout,
      milliseconds,
      target,
      propertyKey
    );

    return descriptor;
  };
}

/**
 * Circuit breaker decorator for fault tolerance
 */
export function CircuitBreaker(options?: {
  threshold?: number; // Number of failures before opening
  timeout?: number; // Time in ms before trying to close
  fallback?: (...args: any[]) => any; // Fallback method
}) {
  const states = new Map<string, {
    state: 'closed' | 'open' | 'half-open';
    failures: number;
    lastFailTime?: number;
  }>();

  return function (
    target: any,
    propertyKey: string,
    descriptor: PropertyDescriptor
  ) {
    const originalMethod = descriptor.value;
    const threshold = options?.threshold || 5;
    const timeout = options?.timeout || 60000;
    const circuitKey = `${target.constructor.name}:${propertyKey}`;

    descriptor.value = async function (...args: any[]) {
      // Get or initialize circuit state
      let circuit = states.get(circuitKey);
      if (!circuit) {
        circuit = { state: 'closed', failures: 0 };
        states.set(circuitKey, circuit);
      }

      // Check circuit state
      if (circuit.state === 'open') {
        // Check if enough time has passed to try again
        if (circuit.lastFailTime && Date.now() - circuit.lastFailTime > timeout) {
          circuit.state = 'half-open';
        } else {
          // Circuit is open, use fallback or throw
          if (options?.fallback) {
            return options.fallback.apply(this, args);
          }
          throw new Error(`Circuit breaker is open for ${propertyKey}`);
        }
      }

      try {
        const result = await originalMethod.apply(this, args);

        // Success - reset or close circuit
        if (circuit.state === 'half-open') {
          circuit.state = 'closed';
        }
        circuit.failures = 0;

        return result;
      } catch (error) {
        circuit.failures++;
        circuit.lastFailTime = Date.now();

        if (circuit.failures >= threshold) {
          circuit.state = 'open';

          // Log circuit opening
          const logger = (this as any).logger;
          if (logger) {
            logger.error(`Circuit breaker opened for ${propertyKey}`, {
              failures: circuit.failures,
              error: error.message
            });
          }
        }

        throw error;
      }
    };

    // Store metadata about circuit breaker
    Reflect.defineMetadata(
      METADATA_KEY.Circuit,
      options || {},
      target,
      propertyKey
    );

    return descriptor;
  };
}

/**
 * Validate decorator for input validation
 */
export function Validate(schema: any) {
  return function (
    target: any,
    propertyKey: string,
    descriptor: PropertyDescriptor
  ) {
    const originalMethod = descriptor.value;

    descriptor.value = async function (...args: any[]) {
      const validationService = (this as any).validationService;

      if (validationService && schema) {
        // Validate arguments against schema
        const validationResult = await validationService.validate(args[0], schema);

        if (!validationResult.isValid) {
          throw new Error(`Validation failed: ${JSON.stringify(validationResult.errors)}`);
        }
      }

      return originalMethod.apply(this, args);
    };

    // Store metadata about validation
    Reflect.defineMetadata(
      METADATA_KEY.Validator,
      schema,
      target,
      propertyKey
    );

    return descriptor;
  };
}

/**
 * Log decorator for method logging
 */
export function Log(options?: {
  level?: 'debug' | 'info' | 'warn' | 'error';
  includeArgs?: boolean;
  includeResult?: boolean;
  includeTime?: boolean;
}) {
  return function (
    target: any,
    propertyKey: string,
    descriptor: PropertyDescriptor
  ) {
    const originalMethod = descriptor.value;
    const level = options?.level || 'debug';

    descriptor.value = async function (...args: any[]) {
      const logger = (this as any).logger;
      const startTime = options?.includeTime ? Date.now() : null;

      if (logger) {
        const logData: any = { method: propertyKey };
        if (options?.includeArgs) {
          logData.args = args;
        }
        logger[level](`Calling ${propertyKey}`, logData);
      }

      try {
        const result = await originalMethod.apply(this, args);

        if (logger) {
          const logData: any = { method: propertyKey };
          if (options?.includeResult) {
            logData.result = result;
          }
          if (options?.includeTime && startTime) {
            logData.duration = Date.now() - startTime;
          }
          logger[level](`Completed ${propertyKey}`, logData);
        }

        return result;
      } catch (error) {
        if (logger) {
          logger.error(`Failed ${propertyKey}`, {
            method: propertyKey,
            error: error.message,
            duration: options?.includeTime && startTime ? Date.now() - startTime : undefined
          });
        }
        throw error;
      }
    };

    // Store metadata about logging
    Reflect.defineMetadata(
      METADATA_KEY.Log,
      options || {},
      target,
      propertyKey
    );

    return descriptor;
  };
}

/**
 * Performance decorator for performance monitoring
 */
export function Performance(threshold?: number) {
  return function (
    target: any,
    propertyKey: string,
    descriptor: PropertyDescriptor
  ) {
    const originalMethod = descriptor.value;
    const performanceThreshold = threshold || 1000; // Default 1 second

    descriptor.value = async function (...args: any[]) {
      const startTime = Date.now();
      const startMemory = process.memoryUsage();

      try {
        const result = await originalMethod.apply(this, args);

        const duration = Date.now() - startTime;
        const endMemory = process.memoryUsage();

        if (duration > performanceThreshold) {
          const logger = (this as any).logger;
          if (logger) {
            logger.warn(`Performance warning for ${propertyKey}`, {
              duration,
              memoryDelta: {
                heapUsed: endMemory.heapUsed - startMemory.heapUsed,
                external: endMemory.external - startMemory.external
              }
            });
          }
        }

        return result;
      } catch (error) {
        const duration = Date.now() - startTime;
        const logger = (this as any).logger;
        if (logger) {
          logger.error(`Performance measurement failed for ${propertyKey}`, {
            duration,
            error: error.message
          });
        }
        throw error;
      }
    };

    // Store metadata about performance monitoring
    Reflect.defineMetadata(
      METADATA_KEY.Performance,
      threshold,
      target,
      propertyKey
    );

    return descriptor;
  };
}

/**
 * Service class decorator for dependency injection and metadata
 */
export function Service(options?: {
  name?: string;
  scope?: 'singleton' | 'transient' | 'request';
  tags?: string[];
}) {
  return function <T extends { new(...args: any[]): {} }>(constructor: T) {
    // Apply injectable decorator
    injectable()(constructor);

    // Store service metadata
    if (options) {
      Reflect.defineMetadata('service:options', options, constructor);
    }

    return constructor;
  };
}
