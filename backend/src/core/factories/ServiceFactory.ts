/**
 * Service Factory - Sprint 2
 * Siguiendo lineamientos nivel 2: factory para creación de servicios
 * Patrón Abstract Factory para instanciación de servicios
 */

import { Container, interfaces } from 'inversify';
import { TYPES, SERVICE_IDENTIFIER } from '../../../container/types';
import { BaseService } from '@/core/base/BaseService';
import { Logger } from 'winston';

export interface ServiceConfig {
  type: symbol;
  scope?: 'Singleton' | 'Transient' | 'Request';
  metadata?: Record<string, any>;
  dependencies?: symbol[];
}

export interface ServiceFactoryOptions {
  container: Container;
  logger: Logger;
  enableCache?: boolean;
  enableMetrics?: boolean;
  enableValidation?: boolean;
}

export class ServiceFactory {
  private static instance: ServiceFactory;
  private serviceRegistry = new Map<string, ServiceConfig>();
  private serviceInstances = new Map<symbol, any>();

  constructor(
    private container: Container,
    private logger: Logger
  ) {
    this.initialize();
  }

  /**
   * Get singleton instance
   */
  static getInstance(container: Container, logger?: Logger): ServiceFactory {
    if (!ServiceFactory.instance) {
      const loggerInstance = logger || container.get<Logger>(TYPES.Logger);
      ServiceFactory.instance = new ServiceFactory(container, loggerInstance);
    }
    return ServiceFactory.instance;
  }

  /**
   * Initialize factory
   */
  private initialize(): void {
    this.logger.info('Service factory initialized');
  }

  /**
   * Register a service configuration
   */
  registerService<T>(
    name: string,
    constructor: interfaces.Newable<T>,
    config: ServiceConfig
  ): void {
    // Store service configuration
    this.serviceRegistry.set(name, config);

    // Bind to container with appropriate scope
    const binding = this.container.bind<T>(config.type).to(constructor);

    switch (config.scope) {
      case 'Singleton':
        binding.inSingletonScope();
        break;
      case 'Transient':
        binding.inTransientScope();
        break;
      case 'Request':
        binding.inRequestScope();
        break;
      default:
        binding.inSingletonScope(); // Default to singleton
    }

    // Add metadata if provided
    if (config.metadata) {
      Object.entries(config.metadata).forEach(([key, value]) => {
        Reflect.defineMetadata(key, value, constructor);
      });
    }

    // Also bind to multi-injection identifier
    this.container.bind(SERVICE_IDENTIFIER.Service).to(constructor);

    this.logger.debug(`Service registered: ${name}`, {
      type: config.type.toString(),
      scope: config.scope || 'Singleton'
    });
  }

  /**
   * Create a service instance
   */
  createService<T>(serviceType: symbol): T {
    try {
      // Check if already cached (for singletons)
      if (this.serviceInstances.has(serviceType)) {
        return this.serviceInstances.get(serviceType);
      }

      // Create new instance from container
      const instance = this.container.get<T>(serviceType);

      // Cache singleton instances
      const config = this.getServiceConfig(serviceType);
      if (config?.scope === 'Singleton' || !config?.scope) {
        this.serviceInstances.set(serviceType, instance);
      }

      this.logger.debug(`Service created: ${serviceType.toString()}`);
      return instance;

    } catch (error) {
      this.logger.error(`Failed to create service: ${serviceType.toString()}`, {
        error: error.message
      });
      throw new Error(`Service creation failed: ${serviceType.toString()}`);
    }
  }

  /**
   * Create multiple services
   */
  createServices<T>(serviceTypes: symbol[]): T[] {
    return serviceTypes.map(type => this.createService<T>(type));
  }

  /**
   * Create service with custom configuration
   */
  createServiceWithConfig<T>(
    constructor: interfaces.Newable<T>,
    config: Partial<ServiceConfig>
  ): T {
    // Create child container for isolated instance
    const childContainer = this.container.createChild();

    // Bind with custom configuration
    const binding = childContainer.bind<T>(Symbol()).to(constructor);

    if (config.scope === 'Singleton') {
      binding.inSingletonScope();
    } else if (config.scope === 'Transient') {
      binding.inTransientScope();
    }

    // Get instance from child container
    const instance = childContainer.get<T>(Symbol());

    this.logger.debug(`Custom service created: ${constructor.name}`);
    return instance;
  }

  /**
   * Get service configuration
   */
  private getServiceConfig(serviceType: symbol): ServiceConfig | undefined {
    for (const [, config] of this.serviceRegistry) {
      if (config.type === serviceType) {
        return config;
      }
    }
    return undefined;
  }

  /**
   * Check if service is registered
   */
  isServiceRegistered(serviceType: symbol): boolean {
    return this.container.isBound(serviceType);
  }

  /**
   * Get all registered services
   */
  getAllServices(): any[] {
    try {
      return this.container.getAll(SERVICE_IDENTIFIER.Service);
    } catch (error) {
      this.logger.warn('No services registered with multi-injection identifier');
      return [];
    }
  }

  /**
   * Get services by metadata
   */
  getServicesByMetadata(metadataKey: string, metadataValue: any): any[] {
    const services = this.getAllServices();
    return services.filter(service => {
      const metadata = Reflect.getMetadata(metadataKey, service.constructor);
      return metadata === metadataValue;
    });
  }

  /**
   * Dispose of a service instance
   */
  disposeService(serviceType: symbol): void {
    if (this.serviceInstances.has(serviceType)) {
      const instance = this.serviceInstances.get(serviceType);

      // Call destroy method if it exists
      if (typeof instance.destroy === 'function') {
        instance.destroy();
      }

      this.serviceInstances.delete(serviceType);
      this.logger.debug(`Service disposed: ${serviceType.toString()}`);
    }
  }

  /**
   * Dispose all services
   */
  disposeAll(): void {
    this.serviceInstances.forEach((instance, type) => {
      this.disposeService(type);
    });
    this.serviceInstances.clear();
    this.logger.info('All services disposed');
  }

  /**
   * Create a service proxy with interceptors
   */
  createServiceProxy<T extends BaseService>(
    service: T,
    interceptors: ServiceInterceptor[]
  ): T {
    return new Proxy(service, {
      get: (target, prop, receiver) => {
        const originalValue = Reflect.get(target, prop, receiver);

        // Only intercept methods
        if (typeof originalValue !== 'function') {
          return originalValue;
        }

        return async (...args: any[]) => {
          // Before interceptors
          for (const interceptor of interceptors) {
            if (interceptor.before) {
              await interceptor.before(prop as string, args);
            }
          }

          try {
            // Call original method
            const result = await originalValue.apply(target, args);

            // After interceptors
            for (const interceptor of interceptors) {
              if (interceptor.after) {
                await interceptor.after(prop as string, result);
              }
            }

            return result;

          } catch (error) {
            // Error interceptors
            for (const interceptor of interceptors) {
              if (interceptor.error) {
                await interceptor.error(prop as string, error);
              }
            }
            throw error;
          }
        };
      }
    });
  }

  /**
   * Reset factory (mainly for testing)
   */
  reset(): void {
    this.disposeAll();
    this.serviceRegistry.clear();
    this.logger.info('Service factory reset');
  }
}

/**
 * Service interceptor interface
 */
export interface ServiceInterceptor {
  before?(method: string, args: any[]): Promise<void> | void;
  after?(method: string, result: any): Promise<void> | void;
  error?(method: string, error: Error): Promise<void> | void;
}

/**
 * Logging interceptor
 */
export class LoggingInterceptor implements ServiceInterceptor {
  constructor(private logger: Logger) {}

  before(method: string, args: any[]): void {
    this.logger.debug(`Calling method: ${method}`, {
      argsCount: args.length
    });
  }

  after(method: string, result: any): void {
    this.logger.debug(`Method completed: ${method}`, {
      hasResult: result !== undefined
    });
  }

  error(method: string, error: Error): void {
    this.logger.error(`Method failed: ${method}`, {
      error: error.message
    });
  }
}

/**
 * Performance interceptor
 */
export class PerformanceInterceptor implements ServiceInterceptor {
  private startTimes = new Map<string, number>();

  constructor(private logger: Logger) {}

  before(method: string): void {
    this.startTimes.set(method, Date.now());
  }

  after(method: string): void {
    const startTime = this.startTimes.get(method);
    if (startTime) {
      const duration = Date.now() - startTime;
      this.startTimes.delete(method);

      if (duration > 1000) {
        this.logger.warn(`Slow method execution: ${method}`, { duration });
      }
    }
  }
}

/**
 * Validation interceptor
 */
export class ValidationInterceptor implements ServiceInterceptor {
  constructor(
    private logger: Logger,
    private validator: (method: string, args: any[]) => boolean
  ) {}

  before(method: string, args: any[]): void {
    if (!this.validator(method, args)) {
      throw new Error(`Validation failed for method: ${method}`);
    }
  }
}

/**
 * Service factory helper functions
 */
export function createServiceFactory(
  container: Container,
  options?: Partial<ServiceFactoryOptions>
): ServiceFactory {
  const logger = options?.logger || container.get<Logger>(TYPES.Logger);
  return ServiceFactory.getInstance(container, logger);
}

/**
 * Decorator to auto-register service with factory
 */
export function RegisterService(config: ServiceConfig) {
  return function <T extends { new(...args: any[]): {} }>(constructor: T) {
    // This will be called when the decorator is applied
    // The actual registration happens when the factory is initialized
    Reflect.defineMetadata('service:config', config, constructor);
    return constructor;
  };
}
