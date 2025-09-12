/**
 * Feature Flag Service - Sprint 2
 * Siguiendo lineamientos nivel 2: Servicio centralizado para gestión de feature flags
 * Implementa patrón Adapter para comunicación con backend y gestión de errores
 */

import { api } from './api';

// Types - Principio de Segregación de Interfaces
interface EvaluationContext {
  userId?: string;
  companyId?: string;
  userRole?: string;
  companyPlan?: string;
  userAttributes?: Record<string, any>;
  customAttributes?: Record<string, any>;
}

interface FeatureFlagConfig {
  enabled: boolean;
  rolloutPercentage?: number;
  targetRoles?: string[];
  targetCompanies?: string[];
  metadata?: Record<string, any>;
  conditions?: FeatureFlagCondition[];
  schedule?: {
    startDate?: string;
    endDate?: string;
    timezone?: string;
  };
}

interface FeatureFlagCondition {
  type: 'user_attribute' | 'company_plan' | 'date_range' | 'custom' | 'percentage';
  operator: 'equals' | 'not_equals' | 'in' | 'not_in' | 'greater_than' | 'less_than' | 'contains';
  value: any;
  attribute?: string;
}

interface SingleEvaluationResponse {
  success: boolean;
  data: {
    enabled: boolean;
    config: FeatureFlagConfig;
    evaluationId: string;
    timestamp: string;
  };
  message?: string;
}

interface BatchEvaluationResponse {
  success: boolean;
  data: {
    flags: Record<string, {
      enabled: boolean;
      config: FeatureFlagConfig;
    }>;
    evaluationContext: EvaluationContext;
    evaluationId: string;
    timestamp: string;
  };
  message?: string;
}

interface FeatureFlagManagementResponse {
  success: boolean;
  data?: {
    flag?: FeatureFlagDefinition;
    flags?: FeatureFlagDefinition[];
  };
  message?: string;
}

interface FeatureFlagDefinition {
  id: string;
  name: string;
  description: string;
  type: 'boolean' | 'string' | 'number' | 'json';
  defaultValue: any;
  config: FeatureFlagConfig;
  createdAt: string;
  updatedAt: string;
  createdBy: string;
  tags?: string[];
  environment: 'development' | 'staging' | 'production';
}

interface RequestOptions {
  signal?: AbortSignal;
  timeout?: number;
  retries?: number;
}

/**
 * Servicio principal para gestión de feature flags
 * Siguiendo principios SOLID - Responsabilidad Única para comunicación con API
 */
class FeatureFlagService {
  private readonly baseEndpoint = '/feature-flags';
  private readonly defaultTimeout = 10000; // 10 segundos
  private readonly defaultRetries = 2;

  /**
   * Evalúa un feature flag individual
   * @param {string} flagName - Nombre del feature flag
   * @param {EvaluationContext} context - Contexto de evaluación
   * @param {RequestOptions} options - Opciones de la solicitud
   * @returns {Promise<SingleEvaluationResponse>} Resultado de la evaluación
   */
  async evaluateFlag(
    flagName: string,
    context: EvaluationContext = {},
    options: RequestOptions = {}
  ): Promise<SingleEvaluationResponse> {
    const { signal, timeout = this.defaultTimeout, retries = this.defaultRetries } = options;

    // Validación de entrada
    if (!flagName || typeof flagName !== 'string') {
      throw new Error('Flag name is required and must be a string');
    }

    const requestPayload = {
      flagName: flagName.trim(),
      context: this.sanitizeContext(context),
      timestamp: new Date().toISOString()
    };

    try {
      const response = await this.executeWithRetry(
        () => api.post(
          `${this.baseEndpoint}/${encodeURIComponent(flagName)}/evaluate`,
          requestPayload,
          { 
            signal,
            timeout,
            headers: {
              'Content-Type': 'application/json',
              'X-Feature-Flag-Client': 'web',
              'X-Feature-Flag-Version': '2.0'
            }
          }
        ),
        retries
      );

      return this.processResponse(response.data);
    } catch (error) {
      return this.handleError(error, `evaluating flag ${flagName}`);
    }
  }

  /**
   * Evalúa múltiples feature flags en una sola solicitud
   * @param {string[]} flagNames - Lista de nombres de flags
   * @param {EvaluationContext} context - Contexto de evaluación
   * @param {RequestOptions} options - Opciones de la solicitud
   * @returns {Promise<BatchEvaluationResponse>} Resultado de la evaluación batch
   */
  async evaluateMultipleFlags(
    flagNames: string[],
    context: EvaluationContext = {},
    options: RequestOptions = {}
  ): Promise<BatchEvaluationResponse> {
    const { signal, timeout = this.defaultTimeout, retries = this.defaultRetries } = options;

    // Validación de entrada
    if (!Array.isArray(flagNames) || flagNames.length === 0) {
      throw new Error('Flag names must be a non-empty array');
    }

    const validFlagNames = flagNames.filter(name => name && typeof name === 'string');
    if (validFlagNames.length !== flagNames.length) {
      throw new Error('All flag names must be valid non-empty strings');
    }

    // Optimización: si solo hay un flag, usar evaluación simple
    if (validFlagNames.length === 1) {
      const singleResult = await this.evaluateFlag(validFlagNames[0], context, options);
      return this.convertSingleToBatchResponse(singleResult, validFlagNames[0]);
    }

    const requestPayload = {
      flagNames: validFlagNames.map(name => name.trim()),
      context: this.sanitizeContext(context),
      timestamp: new Date().toISOString(),
      batchSize: validFlagNames.length
    };

    try {
      const response = await this.executeWithRetry(
        () => api.post(
          `${this.baseEndpoint}/evaluate-batch`,
          requestPayload,
          {
            signal,
            timeout,
            headers: {
              'Content-Type': 'application/json',
              'X-Feature-Flag-Client': 'web',
              'X-Feature-Flag-Version': '2.0',
              'X-Batch-Size': validFlagNames.length.toString()
            }
          }
        ),
        retries
      );

      return this.processResponse(response.data);
    } catch (error) {
      return this.handleError(error, `evaluating flags batch [${validFlagNames.join(', ')}]`);
    }
  }

  /**
   * Obtiene la definición de un feature flag
   * @param {string} flagName - Nombre del feature flag
   * @param {RequestOptions} options - Opciones de la solicitud
   * @returns {Promise<FeatureFlagManagementResponse>} Definición del flag
   */
  async getFlagDefinition(
    flagName: string,
    options: RequestOptions = {}
  ): Promise<FeatureFlagManagementResponse> {
    const { signal, timeout = this.defaultTimeout } = options;

    if (!flagName || typeof flagName !== 'string') {
      throw new Error('Flag name is required and must be a string');
    }

    try {
      const response = await api.get(
        `${this.baseEndpoint}/${encodeURIComponent(flagName)}`,
        { signal, timeout }
      );

      return this.processResponse(response.data);
    } catch (error) {
      return this.handleError(error, `getting flag definition for ${flagName}`);
    }
  }

  /**
   * Obtiene todas las definiciones de feature flags
   * @param {Object} filters - Filtros de búsqueda
   * @param {RequestOptions} options - Opciones de la solicitud
   * @returns {Promise<FeatureFlagManagementResponse>} Lista de flags
   */
  async getAllFlags(
    filters: {
      environment?: string;
      tags?: string[];
      enabled?: boolean;
      search?: string;
    } = {},
    options: RequestOptions = {}
  ): Promise<FeatureFlagManagementResponse> {
    const { signal, timeout = this.defaultTimeout } = options;

    try {
      const queryParams = new URLSearchParams();
      
      if (filters.environment) queryParams.set('environment', filters.environment);
      if (filters.enabled !== undefined) queryParams.set('enabled', filters.enabled.toString());
      if (filters.search) queryParams.set('search', filters.search);
      if (filters.tags && filters.tags.length > 0) {
        queryParams.set('tags', filters.tags.join(','));
      }

      const url = queryParams.toString() 
        ? `${this.baseEndpoint}?${queryParams.toString()}`
        : this.baseEndpoint;

      const response = await api.get(url, { signal, timeout });
      return this.processResponse(response.data);
    } catch (error) {
      return this.handleError(error, 'getting all flags');
    }
  }

  /**
   * Registra un evento de feature flag para analytics
   * @param {string} flagName - Nombre del flag
   * @param {string} event - Tipo de evento
   * @param {Object} data - Datos adicionales
   * @returns {Promise<void>}
   */
  async trackEvent(
    flagName: string,
    event: 'view' | 'interaction' | 'conversion' | 'error',
    data: Record<string, any> = {}
  ): Promise<void> {
    // Fire and forget - no esperar respuesta para no afectar performance
    try {
      await api.post(
        `${this.baseEndpoint}/${encodeURIComponent(flagName)}/events`,
        {
          event,
          data,
          timestamp: new Date().toISOString(),
          userAgent: navigator.userAgent,
          url: window.location.href
        },
        { 
          timeout: 5000, // Timeout corto para analytics
          headers: {
            'X-Analytics-Event': event
          }
        }
      );
    } catch (error) {
      // Silenciar errores de analytics para no afectar UX
      if (import.meta.env.DEV) {
        console.warn('Failed to track feature flag event:', error);
      }
    }
  }

  /**
   * Invalida cache de feature flags en el servidor
   * @param {string[]} flagNames - Flags específicos a invalidar (opcional)
   * @returns {Promise<void>}
   */
  async invalidateCache(flagNames?: string[]): Promise<void> {
    try {
      const payload = flagNames ? { flagNames } : {};
      
      await api.post(
        `${this.baseEndpoint}/cache/invalidate`,
        payload,
        { timeout: 5000 }
      );
    } catch (error) {
      console.warn('Failed to invalidate feature flag cache:', error);
    }
  }

  /**
   * Sanitiza el contexto de evaluación removiendo datos sensibles
   * @param {EvaluationContext} context - Contexto original
   * @returns {EvaluationContext} Contexto sanitizado
   */
  private sanitizeContext(context: EvaluationContext): EvaluationContext {
    const sanitized: EvaluationContext = {
      userId: context.userId,
      companyId: context.companyId,
      userRole: context.userRole,
      companyPlan: context.companyPlan
    };

    // Sanitizar atributos de usuario
    if (context.userAttributes) {
      sanitized.userAttributes = {};
      const allowedAttributes = ['email', 'firstName', 'lastName', 'language', 'timezone'];
      
      for (const key of allowedAttributes) {
        if (context.userAttributes[key]) {
          sanitized.userAttributes[key] = context.userAttributes[key];
        }
      }
    }

    // Agregar atributos personalizados si existen
    if (context.customAttributes) {
      sanitized.customAttributes = { ...context.customAttributes };
    }

    return sanitized;
  }

  /**
   * Convierte respuesta simple a formato batch para consistencia
   * @param {SingleEvaluationResponse} singleResponse - Respuesta simple
   * @param {string} flagName - Nombre del flag
   * @returns {BatchEvaluationResponse} Respuesta en formato batch
   */
  private convertSingleToBatchResponse(
    singleResponse: SingleEvaluationResponse,
    flagName: string
  ): BatchEvaluationResponse {
    if (!singleResponse.success) {
      return {
        success: false,
        message: singleResponse.message,
        data: {
          flags: {},
          evaluationContext: {},
          evaluationId: '',
          timestamp: new Date().toISOString()
        }
      };
    }

    return {
      success: true,
      data: {
        flags: {
          [flagName]: {
            enabled: singleResponse.data.enabled,
            config: singleResponse.data.config
          }
        },
        evaluationContext: {},
        evaluationId: singleResponse.data.evaluationId,
        timestamp: singleResponse.data.timestamp
      }
    };
  }

  /**
   * Ejecuta una función con reintentos automáticos
   * @param {Function} fn - Función a ejecutar
   * @param {number} maxRetries - Número máximo de reintentos
   * @returns {Promise<any>} Resultado de la función
   */
  private async executeWithRetry<T>(
    fn: () => Promise<T>,
    maxRetries: number
  ): Promise<T> {
    let lastError: any;
    
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        return await fn();
      } catch (error: any) {
        lastError = error;
        
        // No reintentar en estos casos
        if (error.name === 'AbortError' || 
            error.response?.status === 401 || 
            error.response?.status === 403 ||
            error.response?.status === 400) {
          throw error;
        }
        
        // Si no es el último intento, esperar antes de reintentar
        if (attempt < maxRetries) {
          const delay = Math.min(1000 * Math.pow(2, attempt), 5000); // Backoff exponencial
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
    }
    
    throw lastError;
  }

  /**
   * Procesa la respuesta del servidor
   * @param {any} data - Datos de respuesta
   * @returns {any} Datos procesados
   */
  private processResponse(data: any): any {
    // Validar estructura básica de respuesta
    if (!data || typeof data.success !== 'boolean') {
      throw new Error('Invalid response format from feature flag service');
    }

    return data;
  }

  /**
   * Maneja errores de manera consistente
   * @param {any} error - Error ocurrido
   * @param {string} operation - Operación que falló
   * @returns {any} Respuesta de error formateada
   */
  private handleError(error: any, operation: string): any {
    let errorMessage = `Error ${operation}`;
    let errorCode = 'UNKNOWN_ERROR';

    // Si es una cancelación, retornar un valor por defecto silenciosamente
    if (error.name === 'AbortError' || error.message === 'canceled' || error.code === 'ERR_CANCELED') {
      // No loguear cancelaciones como errores
      if (import.meta.env.DEV) {
        console.debug(`FeatureFlagService: Request canceled for ${operation}`);
      }
      // Retornar respuesta por defecto para cancelaciones
      return {
        success: true,
        data: {
          enabled: false,
          value: null,
          reason: 'Request canceled',
          evaluationTime: 0,
          cacheHit: false
        }
      };
    }

    if (error.response) {
      // Error de respuesta HTTP
      errorCode = `HTTP_${error.response.status}`;
      errorMessage = error.response.data?.message || 
                    `HTTP ${error.response.status} error ${operation}`;
    } else if (error.request) {
      // Error de red
      errorCode = 'NETWORK_ERROR';
      errorMessage = `Network error ${operation}`;
    } else {
      // Error de configuración u otro
      errorMessage = error.message || errorMessage;
    }

    // Log en desarrollo (solo errores reales, no cancelaciones)
    if (import.meta.env.DEV) {
      console.error(`FeatureFlagService Error [${errorCode}]:`, {
        operation,
        error: error.message,
        response: error.response?.data,
        stack: error.stack
      });
    }

    return {
      success: false,
      message: errorMessage,
      code: errorCode,
      data: null
    };
  }
}

// Instancia singleton del servicio
export const featureFlagService = new FeatureFlagService();

// Exports adicionales para typing
export type {
  EvaluationContext,
  FeatureFlagConfig,
  FeatureFlagCondition,
  SingleEvaluationResponse,
  BatchEvaluationResponse,
  FeatureFlagManagementResponse,
  FeatureFlagDefinition,
  RequestOptions
};

export default featureFlagService;