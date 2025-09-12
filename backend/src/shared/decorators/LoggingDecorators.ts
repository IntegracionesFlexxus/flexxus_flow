/**
 * Logging Decorators - Sprint 2
 * Siguiendo lineamientos nivel 2: decoradores para logging automático
 */

import { LoggingContextService } from '@/shared/services/LoggingContextService';
import { container } from '@/container/container';
import { TYPES } from '../../../container/types';

/**
 * Decorator para logging automático de métodos
 */
export function LogMethod(options: {
  level?: 'error' | 'warn' | 'info' | 'debug';
  component?: string;
  includeArgs?: boolean;
  includeResult?: boolean;
  includePerformance?: boolean;
  maskSensitive?: boolean;
} = {}) {
  return function (target: any, propertyName: string, descriptor: PropertyDescriptor) {
    const method = descriptor.value;
    const className = target.constructor.name;
    const componentName = options.component || className;

    descriptor.value = async function (...args: any[]) {
      const loggingContext = container.get<LoggingContextService>(TYPES.LoggingContextService);
      const logger = loggingContext.getComponentLogger(componentName);
      const level = options.level || 'debug';

      const startTime = Date.now();
      const methodName = `${className}.${propertyName}`;

      // Log entrada del método
      if (logger[level]) {
        const logData: any = { method: methodName };

        if (options.includeArgs) {
          logData.arguments = options.maskSensitive ? 
            maskSensitiveData(args) : 
            args;
        }

        logger[level](`Method ${methodName} started`, logData);
      }

      try {
        const result = await method.apply(this, args);
        const duration = Date.now() - startTime;

        // Log salida exitosa
        if (logger[level]) {
          const logData: any = { 
            method: methodName, 
            success: true 
          };

          if (options.includeResult && result !== undefined) {
            logData.result = options.maskSensitive ? 
              maskSensitiveData(result) : 
              result;
          }

          if (options.includePerformance) {
            logData.duration = duration;
          }

          logger[level](`Method ${methodName} completed`, logData);
        }

        // Log performance si toma mucho tiempo
        if (options.includePerformance && duration > 1000) {
          logger.logPerformance(`${methodName}`, { duration });
        }

        return result;
      } catch (error) {
        const duration = Date.now() - startTime;

        // Log error
        logger.logError(error, `Method ${methodName} failed`, {
          method: methodName,
          duration,
          arguments: options.maskSensitive ? maskSensitiveData(args) : args
        });

        throw error;
      }
    };

    return descriptor;
  };
}

/**
 * Decorator para logging de errores
 */
export function LogErrors(options: {
  component?: string;
  includeArgs?: boolean;
  rethrow?: boolean;
} = {}) {
  return function (target: any, propertyName: string, descriptor: PropertyDescriptor) {
    const method = descriptor.value;
    const className = target.constructor.name;
    const componentName = options.component || className;

    descriptor.value = async function (...args: any[]) {
      try {
        return await method.apply(this, args);
      } catch (error) {
        const loggingContext = container.get<LoggingContextService>(TYPES.LoggingContextService);
        const logger = loggingContext.getComponentLogger(componentName);

        const logData: any = {
          method: `${className}.${propertyName}`,
          errorType: error.constructor.name
        };

        if (options.includeArgs) {
          logData.arguments = maskSensitiveData(args);
        }

        logger.logError(error, `Error in ${className}.${propertyName}`, logData);

        if (options.rethrow !== false) {
          throw error;
        }
      }
    };

    return descriptor;
  };
}

/**
 * Decorator para logging de performance
 */
export function LogPerformance(options: {
  component?: string;
  threshold?: number; // ms
  level?: 'warn' | 'info' | 'debug';
  includeMemory?: boolean;
} = {}) {
  return function (target: any, propertyName: string, descriptor: PropertyDescriptor) {
    const method = descriptor.value;
    const className = target.constructor.name;
    const componentName = options.component || className;
    const threshold = options.threshold || 1000;
    const level = options.level || 'info';

    descriptor.value = async function (...args: any[]) {
      const startTime = Date.now();
      const startMemory = options.includeMemory ? process.memoryUsage() : null;

      try {
        const result = await method.apply(this, args);
        const duration = Date.now() - startTime;

        if (duration > threshold) {
          const loggingContext = container.get<LoggingContextService>(TYPES.LoggingContextService);
          const logger = loggingContext.getComponentLogger(componentName);

          const performanceData: any = { duration };

          if (options.includeMemory && startMemory) {
            const endMemory = process.memoryUsage();
            performanceData.memoryDelta = {
              heapUsed: endMemory.heapUsed - startMemory.heapUsed,
              heapTotal: endMemory.heapTotal - startMemory.heapTotal,
              external: endMemory.external - startMemory.external
            };
          }

          logger.logPerformance(`${className}.${propertyName}`, performanceData);
        }

        return result;
      } catch (error) {
        const duration = Date.now() - startTime;
        const loggingContext = container.get<LoggingContextService>(TYPES.LoggingContextService);
        const logger = loggingContext.getComponentLogger(componentName);

        logger.logError(error, `Performance logging failed for ${className}.${propertyName}`, {
          duration,
          method: `${className}.${propertyName}`
        });

        throw error;
      }
    };

    return descriptor;
  };
}

/**
 * Decorator para auditoría automática
 */
export function Audit(options: {
  action?: string;
  type?: string;
  severity?: 'low' | 'medium' | 'high' | 'critical';
  includeArgs?: boolean;
  includeResult?: boolean;
  component?: string;
} = {}) {
  return function (target: any, propertyName: string, descriptor: PropertyDescriptor) {
    const method = descriptor.value;
    const className = target.constructor.name;
    const componentName = options.component || className;

    descriptor.value = async function (...args: any[]) {
      const startTime = Date.now();

      try {
        const result = await method.apply(this, args);
        const duration = Date.now() - startTime;

        // Log auditoría exitosa
        const loggingContext = container.get<LoggingContextService>(TYPES.LoggingContextService);
        const logger = loggingContext.getComponentLogger(componentName);

        const auditData: any = {
          method: `${className}.${propertyName}`,
          action: options.action || propertyName,
          type: options.type || 'method_execution',
          severity: options.severity || 'low',
          success: true,
          duration
        };

        if (options.includeArgs) {
          auditData.arguments = maskSensitiveData(args);
        }

        if (options.includeResult && result !== undefined) {
          auditData.result = maskSensitiveData(result);
        }

        logger.info(`Audit: ${auditData.action} completed successfully`, auditData);

        return result;
      } catch (error) {
        const duration = Date.now() - startTime;

        // Log auditoría con error
        const loggingContext = container.get<LoggingContextService>(TYPES.LoggingContextService);
        const logger = loggingContext.getComponentLogger(componentName);

        const auditData: any = {
          method: `${className}.${propertyName}`,
          action: options.action || propertyName,
          type: options.type || 'method_execution',
          severity: 'high', // Errores son siempre de alta severidad
          success: false,
          duration,
          error: {
            name: error.name,
            message: error.message
          }
        };

        if (options.includeArgs) {
          auditData.arguments = maskSensitiveData(args);
        }

        logger.error(`Audit: ${auditData.action} failed`, auditData);
        throw error;
      }
    };

    return descriptor;
  };
}

/**
 * Decorator para logging condicional
 */
export function LogIf(condition: (context: any, args: any[]) => boolean, options: {
  level?: 'error' | 'warn' | 'info' | 'debug';
  component?: string;
  message?: string;
} = {}) {
  return function (target: any, propertyName: string, descriptor: PropertyDescriptor) {
    const method = descriptor.value;
    const className = target.constructor.name;
    const componentName = options.component || className;
    const level = options.level || 'info';

    descriptor.value = async function (...args: any[]) {
      const loggingContext = container.get<LoggingContextService>(TYPES.LoggingContextService);
      const currentContext = loggingContext.getCurrentContext();

      if (condition(currentContext, args)) {
        const logger = loggingContext.getComponentLogger(componentName);
        const message = options.message || `Conditional log for ${className}.${propertyName}`;

        if (logger[level]) {
          logger[level](message, {
            method: `${className}.${propertyName}`,
            context: currentContext,
            arguments: maskSensitiveData(args)
          });
        }
      }

      return await method.apply(this, args);
    };

    return descriptor;
  };
}

/**
 * Decorator de clase para configurar logging automático
 */
export function LoggingConfig(options: {
  component?: string;
  level?: 'error' | 'warn' | 'info' | 'debug';
  autoLog?: boolean;
  performance?: boolean;
  errors?: boolean;
}) {
  return function <T extends { new (...args: any[]): {} }>(constructor: T) {
    const componentName = options.component || constructor.name;

    // Configurar logging para la clase
    if (options.level) {
      const loggingContext = container.get<LoggingContextService>(TYPES.LoggingContextService);
      loggingContext.setComponentLevel(componentName, options.level);
    }

    // Aplicar decoradores automáticos si está habilitado
    if (options.autoLog) {
      const methodNames = Object.getOwnPropertyNames(constructor.prototype)
        .filter(name => name !== 'constructor' && typeof constructor.prototype[name] === 'function');

      methodNames.forEach(methodName => {
        const descriptor = Object.getOwnPropertyDescriptor(constructor.prototype, methodName);
        if (descriptor && descriptor.value) {
          const decoratorOptions = {
            component: componentName,
            level: options.level || 'debug',
            includeArgs: true,
            includeResult: false,
            includePerformance: options.performance || false
          };

          if (options.errors) {
            LogErrors({ component: componentName })(constructor.prototype, methodName, descriptor);
          }

          if (options.performance) {
            LogPerformance({ component: componentName })(constructor.prototype, methodName, descriptor);
          }

          LogMethod(decoratorOptions)(constructor.prototype, methodName, descriptor);
          Object.defineProperty(constructor.prototype, methodName, descriptor);
        }
      });
    }

    return constructor;
  };
}

/**
 * Funciones auxiliares
 */
function maskSensitiveData(data: any): any {
  const sensitivePatterns = [
    /password/i,
    /token/i,
    /secret/i,
    /key/i,
    /auth/i,
    /credential/i
  ];

  return maskObjectSensitiveFields(data, sensitivePatterns);
}

function maskObjectSensitiveFields(obj: any, patterns: RegExp[]): any {
  if (obj === null || obj === undefined) {
    return obj;
  }

  if (typeof obj !== 'object') {
    return obj;
  }

  if (Array.isArray(obj)) {
    return obj.map(item => maskObjectSensitiveFields(item, patterns));
  }

  const masked: any = {};
  for (const [key, value] of Object.entries(obj)) {
    const isSensitive = patterns.some(pattern => pattern.test(key));

    if (isSensitive) {
      masked[key] = '[MASKED]';
    } else if (typeof value === 'object') {
      masked[key] = maskObjectSensitiveFields(value, patterns);
    } else {
      masked[key] = value;
    }
  }

  return masked;
}
