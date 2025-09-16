/**
 * @module ObservabilityService
 * @description Servicio de observabilidad y métricas - Nivel 3
 * Implementa telemetría, métricas, logs y trazas siguiendo lineamientos de calidad
 * 
 * @example
 * ```typescript
 * // Rastrear evento
 * observabilityService.track('user_login', { method: 'email' });
 * 
 * // Medir performance
 * const timer = observabilityService.startTimer('api_call');
 * await apiCall();
 * timer.end();
 * 
 * // Log estructurado
 * observabilityService.log('info', 'User action', { userId, action });
 * ```
 */

import { api } from './api';

/**
 * Niveles de log disponibles
 */
export type LogLevel = 'debug' | 'info' | 'warn' | 'error' | 'fatal';

/**
 * Tipos de métricas soportadas
 */
export type MetricType = 'counter' | 'gauge' | 'histogram' | 'summary';

/**
 * Categorías de eventos para tracking
 */
export type EventCategory = 
  | 'user_interaction'
  | 'navigation'
  | 'api_call'
  | 'error'
  | 'performance'
  | 'security'
  | 'business';

/**
 * Interfaz para eventos de tracking
 */
export interface TrackingEvent {
  name: string;
  category: EventCategory;
  properties?: Record<string, any>;
  timestamp: Date;
  sessionId: string;
  userId?: string;
}

/**
 * Interfaz para métricas
 */
export interface Metric {
  name: string;
  type: MetricType;
  value: number;
  tags?: Record<string, string>;
  timestamp: Date;
}

/**
 * Interfaz para logs estructurados
 */
export interface LogEntry {
  level: LogLevel;
  message: string;
  context?: Record<string, any>;
  timestamp: Date;
  source: string;
  traceId?: string;
  spanId?: string;
}

/**
 * Interfaz para información de error
 */
export interface ErrorInfo {
  message: string;
  stack?: string;
  type: string;
  context?: Record<string, any>;
  userId?: string;
  sessionId: string;
  timestamp: Date;
  url: string;
  userAgent: string;
}

/**
 * Interfaz para métricas de rendimiento
 */
export interface PerformanceMetrics {
  navigation: PerformanceNavigationTiming;
  resources: PerformanceResourceTiming[];
  memory?: MemoryInfo;
  fps?: number;
  connectionType?: string;
}

interface MemoryInfo {
  usedJSHeapSize: number;
  totalJSHeapSize: number;
  jsHeapSizeLimit: number;
}

/**
 * Timer para medir duración de operaciones
 */
export class PerformanceTimer {
  private startTime: number;
  private endTime?: number;
  private marks: Map<string, number> = new Map();

  constructor(
    private name: string,
    private service: ObservabilityService
  ) {
    this.startTime = performance.now();
    performance.mark(`${name}-start`);
  }

  /**
   * Marca un punto intermedio en la medición
   */
  mark(label: string): void {
    const now = performance.now();
    this.marks.set(label, now - this.startTime);
    performance.mark(`${this.name}-${label}`);
  }

  /**
   * Finaliza la medición y envía la métrica
   */
  end(metadata?: Record<string, any>): number {
    this.endTime = performance.now();
    const duration = this.endTime - this.startTime;
    
    performance.mark(`${this.name}-end`);
    performance.measure(
      this.name,
      `${this.name}-start`,
      `${this.name}-end`
    );

    // Enviar métrica
    this.service.metric(this.name, duration, 'histogram', {
      ...metadata,
      marks: Object.fromEntries(this.marks)
    });

    return duration;
  }

  /**
   * Obtiene la duración actual sin finalizar
   */
  getDuration(): number {
    return performance.now() - this.startTime;
  }
}

/**
 * Servicio principal de observabilidad
 * @class ObservabilityService
 * @singleton
 */
class ObservabilityService {
  private sessionId: string;
  private userId?: string;
  private buffer: Array<TrackingEvent | Metric | LogEntry> = [];
  private bufferSize = 50;
  private flushInterval = 30000; // 30 segundos
  private flushTimer?: NodeJS.Timeout;
  private errorQueue: ErrorInfo[] = [];
  private metricsCache = new Map<string, Metric[]>();
  private isEnabled = true;
  private debugMode = false;
  private endpoint = '/telemetry';
  private apiKey?: string;

  constructor() {
    this.sessionId = this.generateSessionId();
    this.initializeService();
    
    // Solo inicializar si el servicio está habilitado
    if (this.isEnabled) {
      this.setupErrorHandlers();
      this.startPeriodicFlush();
      this.collectInitialMetrics();
    } else {
      console.info('[Observability] Service is disabled');
    }
  }

  /**
   * Inicializa el servicio con configuración
   * @private
   */
  private initializeService(): void {
    // Cargar configuración desde localStorage o env
    const config = this.loadConfiguration();
    this.isEnabled = config.enabled ?? true;
    this.debugMode = config.debug ?? false;
    this.endpoint = config.endpoint ?? '/telemetry';
    this.apiKey = config.apiKey;
    
    if (this.debugMode) {
      console.info('[Observability] Service initialized', {
        sessionId: this.sessionId,
        enabled: this.isEnabled
      });
    }
  }

  /**
   * Configura manejadores de errores globales
   * @private
   */
  private setupErrorHandlers(): void {
    // Error handler global
    window.addEventListener('error', (event) => {
      this.captureError(event.error || new Error(event.message), {
        filename: event.filename,
        lineno: event.lineno,
        colno: event.colno
      });
    });

    // Promise rejection handler
    window.addEventListener('unhandledrejection', (event) => {
      this.captureError(
        new Error(`Unhandled Promise Rejection: ${event.reason}`),
        { promise: true }
      );
    });
  }

  /**
   * Rastrea un evento de usuario o sistema
   * @param {string} eventName - Nombre del evento
   * @param {Record<string, any>} properties - Propiedades del evento
   * @param {EventCategory} category - Categoría del evento
   */
  track(
    eventName: string,
    properties?: Record<string, any>,
    category: EventCategory = 'user_interaction'
  ): void {
    if (!this.isEnabled) return;

    const event: TrackingEvent = {
      name: eventName,
      category,
      properties: {
        ...properties,
        url: window.location.href,
        referrer: document.referrer,
        viewport: {
          width: window.innerWidth,
          height: window.innerHeight
        }
      },
      timestamp: new Date(),
      sessionId: this.sessionId,
      userId: this.userId
    };

    this.addToBuffer(event);

    if (this.debugMode) {
      console.log('[Observability] Event tracked:', event);
    }

    // Eventos críticos se envían inmediatamente
    if (category === 'error' || category === 'security') {
      this.flush();
    }
  }

  /**
   * Registra una métrica
   * @param {string} name - Nombre de la métrica
   * @param {number} value - Valor de la métrica
   * @param {MetricType} type - Tipo de métrica
   * @param {Record<string, string>} tags - Tags adicionales
   */
  metric(
    name: string,
    value: number,
    type: MetricType = 'gauge',
    tags?: Record<string, string>
  ): void {
    if (!this.isEnabled) return;

    const metric: Metric = {
      name,
      type,
      value,
      tags: {
        ...tags,
        environment: import.meta.env.MODE || 'development'
      },
      timestamp: new Date()
    };

    this.addToBuffer(metric);
    this.updateMetricsCache(metric);

    if (this.debugMode) {
      console.log('[Observability] Metric recorded:', metric);
    }
  }

  /**
   * Registra un log estructurado
   * @param {LogLevel} level - Nivel del log
   * @param {string} message - Mensaje del log
   * @param {Record<string, any>} context - Contexto adicional
   */
  log(
    level: LogLevel,
    message: string,
    context?: Record<string, any>
  ): void {
    if (!this.isEnabled) return;
    if (level === 'debug' && !this.debugMode) return;

    const logEntry: LogEntry = {
      level,
      message,
      context,
      timestamp: new Date(),
      source: 'frontend',
      traceId: this.generateTraceId(),
      spanId: this.generateSpanId()
    };

    this.addToBuffer(logEntry);

    // Logs de error y fatal se envían inmediatamente
    if (level === 'error' || level === 'fatal') {
      this.flush();
    }

    // También loguear en consola en modo debug
    if (this.debugMode) {
      const consoleMethod = level === 'error' || level === 'fatal' ? 'error' :
                          level === 'warn' ? 'warn' : 'log';
      console[consoleMethod](`[${level.toUpperCase()}]`, message, context);
    }
  }

  /**
   * Captura un error con contexto
   * @param {Error} error - Error a capturar
   * @param {Record<string, any>} context - Contexto adicional
   */
  captureError(error: Error, context?: Record<string, any>): void {
    if (!this.isEnabled) return;

    const errorInfo: ErrorInfo = {
      message: error.message,
      stack: error.stack,
      type: error.name,
      context,
      userId: this.userId,
      sessionId: this.sessionId,
      timestamp: new Date(),
      url: window.location.href,
      userAgent: navigator.userAgent
    };

    this.errorQueue.push(errorInfo);
    
    // Log del error
    this.log('error', error.message, {
      stack: error.stack,
      ...context
    });

    // Track del evento de error
    this.track('error_occurred', {
      errorType: error.name,
      errorMessage: error.message,
      ...context
    }, 'error');

    // Enviar inmediatamente errores críticos
    if (this.errorQueue.length >= 5) {
      this.flushErrors();
    }
  }

  /**
   * Inicia un timer de performance
   * @param {string} name - Nombre de la operación a medir
   * @returns {PerformanceTimer} Timer para la medición
   */
  startTimer(name: string): PerformanceTimer {
    return new PerformanceTimer(name, this);
  }

  /**
   * Mide el rendimiento de una función asíncrona
   * @param {string} name - Nombre de la operación
   * @param {Function} fn - Función a medir
   * @returns {Promise<T>} Resultado de la función
   */
  async measureAsync<T>(
    name: string,
    fn: () => Promise<T>,
    metadata?: Record<string, any>
  ): Promise<T> {
    const timer = this.startTimer(name);
    
    try {
      const result = await fn();
      timer.end({ ...metadata, status: 'success' });
      return result;
    } catch (error) {
      timer.end({ ...metadata, status: 'error', error: (error as Error).message });
      throw error;
    }
  }

  /**
   * Recopila métricas de rendimiento del navegador
   */
  collectPerformanceMetrics(): PerformanceMetrics {
    const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
    const resources = performance.getEntriesByType('resource') as PerformanceResourceTiming[];
    
    const metrics: PerformanceMetrics = {
      navigation,
      resources: resources.slice(0, 100), // Limitar a 100 recursos
    };

    // Memory info (si está disponible)
    if ('memory' in performance) {
      metrics.memory = (performance as any).memory;
    }

    // Connection info
    if ('connection' in navigator) {
      metrics.connectionType = (navigator as any).connection.effectiveType;
    }

    // FPS calculation
    let fps = 0;
    let lastTime = performance.now();
    const measureFPS = () => {
      const currentTime = performance.now();
      fps = 1000 / (currentTime - lastTime);
      lastTime = currentTime;
    };
    requestAnimationFrame(measureFPS);
    metrics.fps = fps;

    return metrics;
  }

  /**
   * Recopila métricas de Web Vitals
   */
  collectWebVitals(): void {
    // Largest Contentful Paint (LCP)
    new PerformanceObserver((entryList) => {
      const entries = entryList.getEntries();
      const lastEntry = entries[entries.length - 1];
      this.metric('web_vitals_lcp', lastEntry.startTime, 'gauge');
    }).observe({ type: 'largest-contentful-paint', buffered: true });

    // First Input Delay (FID)
    new PerformanceObserver((entryList) => {
      const entries = entryList.getEntries();
      entries.forEach((entry: any) => {
        this.metric('web_vitals_fid', entry.processingStart - entry.startTime, 'gauge');
      });
    }).observe({ type: 'first-input', buffered: true });

    // Cumulative Layout Shift (CLS)
    let clsValue = 0;
    new PerformanceObserver((entryList) => {
      const entries = entryList.getEntries();
      entries.forEach((entry: any) => {
        if (!entry.hadRecentInput) {
          clsValue += entry.value;
          this.metric('web_vitals_cls', clsValue, 'gauge');
        }
      });
    }).observe({ type: 'layout-shift', buffered: true });
  }

  /**
   * Establece el ID de usuario actual
   */
  setUserId(userId: string | undefined): void {
    this.userId = userId;
    this.track('user_identified', { userId });
  }

  /**
   * Obtiene el ID de sesión actual
   */
  getSessionId(): string {
    return this.sessionId;
  }

  /**
   * Habilita o deshabilita el servicio
   */
  setEnabled(enabled: boolean): void {
    this.isEnabled = enabled;
    if (!enabled) {
      this.flush(); // Enviar datos pendientes antes de deshabilitar
    }
  }

  /**
   * Habilita o deshabilita el modo debug
   */
  setDebugMode(debug: boolean): void {
    this.debugMode = debug;
  }

  /**
   * Obtiene métricas agregadas
   */
  getAggregatedMetrics(): Record<string, any> {
    const aggregated: Record<string, any> = {};
    
    this.metricsCache.forEach((metrics, name) => {
      const values = metrics.map(m => m.value);
      aggregated[name] = {
        count: values.length,
        sum: values.reduce((a, b) => a + b, 0),
        avg: values.reduce((a, b) => a + b, 0) / values.length,
        min: Math.min(...values),
        max: Math.max(...values),
        last: values[values.length - 1]
      };
    });

    return aggregated;
  }

  /**
   * Añade un elemento al buffer
   * @private
   */
  private addToBuffer(item: TrackingEvent | Metric | LogEntry): void {
    this.buffer.push(item);
    
    if (this.buffer.length >= this.bufferSize) {
      this.flush();
    }
  }

  /**
   * Actualiza el caché de métricas
   * @private
   */
  private updateMetricsCache(metric: Metric): void {
    if (!this.metricsCache.has(metric.name)) {
      this.metricsCache.set(metric.name, []);
    }
    
    const metrics = this.metricsCache.get(metric.name)!;
    metrics.push(metric);
    
    // Mantener solo las últimas 100 métricas por nombre
    if (metrics.length > 100) {
      metrics.shift();
    }
  }

  /**
   * Envía los datos del buffer al servidor
   * @private
   */
  private async flush(): Promise<void> {
    if (this.buffer.length === 0 && this.errorQueue.length === 0) return;
    if (!this.isEnabled) return;

    const dataToSend = {
      events: this.buffer.filter(item => 'category' in item),
      metrics: this.buffer.filter(item => 'type' in item && 'value' in item),
      logs: this.buffer.filter(item => 'level' in item),
      errors: this.errorQueue,
      sessionId: this.sessionId,
      userId: this.userId,
      timestamp: new Date()
    };

    try {
      await api.post(this.endpoint, dataToSend, {
        headers: {
          'X-Telemetry-Key': this.apiKey,
          'X-Session-Id': this.sessionId
        }
      });

      // Limpiar buffers después de envío exitoso
      this.buffer = [];
      this.errorQueue = [];
      
      if (this.debugMode) {
        console.log('[Observability] Data flushed successfully', dataToSend);
      }
    } catch (error) {
      console.error('[Observability] Failed to flush data:', error);
      
      // Guardar en localStorage como fallback
      this.saveToLocalStorage(dataToSend);
    }
  }

  /**
   * Envía errores acumulados
   * @private
   */
  private async flushErrors(): Promise<void> {
    if (this.errorQueue.length === 0) return;

    try {
      await api.post(`${this.endpoint}/errors`, {
        errors: this.errorQueue,
        sessionId: this.sessionId,
        userId: this.userId
      });

      this.errorQueue = [];
    } catch (error) {
      console.error('[Observability] Failed to flush errors:', error);
    }
  }

  /**
   * Guarda datos en localStorage como fallback
   * @private
   */
  private saveToLocalStorage(data: any): void {
    try {
      const stored = localStorage.getItem('observability_buffer') || '[]';
      const buffer = JSON.parse(stored);
      buffer.push(data);
      
      // Limitar tamaño del buffer local
      if (buffer.length > 10) {
        buffer.shift();
      }
      
      localStorage.setItem('observability_buffer', JSON.stringify(buffer));
    } catch (error) {
      console.error('[Observability] Failed to save to localStorage:', error);
    }
  }

  /**
   * Intenta reenviar datos almacenados localmente
   * @private
   */
  private async retryStoredData(): Promise<void> {
    try {
      const stored = localStorage.getItem('observability_buffer');
      if (!stored) return;

      const buffer = JSON.parse(stored);
      for (const data of buffer) {
        await api.post(this.endpoint, data);
      }

      localStorage.removeItem('observability_buffer');
    } catch (error) {
      console.error('[Observability] Failed to retry stored data:', error);
    }
  }

  /**
   * Inicia el flush periódico
   * @private
   */
  private startPeriodicFlush(): void {
    this.flushTimer = setInterval(() => {
      this.flush();
      this.retryStoredData();
    }, this.flushInterval);
  }

  /**
   * Recopila métricas iniciales
   * @private
   */
  private collectInitialMetrics(): void {
    // Esperar a que la página cargue completamente
    if (document.readyState === 'complete') {
      this.onPageLoad();
    } else {
      window.addEventListener('load', () => this.onPageLoad());
    }

    // Recopilar Web Vitals
    this.collectWebVitals();
  }

  /**
   * Maneja el evento de carga de página
   * @private
   */
  private onPageLoad(): void {
    const performanceMetrics = this.collectPerformanceMetrics();
    
    // Métricas de navegación
    if (performanceMetrics.navigation) {
      const nav = performanceMetrics.navigation;
      this.metric('page_load_time', nav.loadEventEnd - nav.fetchStart, 'histogram');
      this.metric('dom_content_loaded', nav.domContentLoadedEventEnd - nav.fetchStart, 'histogram');
      this.metric('time_to_first_byte', nav.responseStart - nav.fetchStart, 'histogram');
    }

    // Track page view
    this.track('page_view', {
      title: document.title,
      path: window.location.pathname,
      loadTime: performanceMetrics.navigation?.loadEventEnd - performanceMetrics.navigation?.fetchStart
    }, 'navigation');
  }

  /**
   * Carga la configuración del servicio
   * @private
   */
  private loadConfiguration(): Record<string, any> {
    try {
      const stored = localStorage.getItem('observability_config');
      if (stored) {
        return JSON.parse(stored);
      }
    } catch (error) {
      console.error('[Observability] Failed to load configuration:', error);
    }

    return {
      enabled: import.meta.env.VITE_TELEMETRY_ENABLED !== 'false',
      debug: import.meta.env.DEV,
      endpoint: import.meta.env.VITE_TELEMETRY_ENDPOINT || '/telemetry',
      apiKey: import.meta.env.VITE_TELEMETRY_KEY
    };
  }

  /**
   * Genera un ID de sesión único
   * @private
   */
  private generateSessionId(): string {
    return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Genera un ID de traza único
   * @private
   */
  private generateTraceId(): string {
    return `trace_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Genera un ID de span único
   * @private
   */
  private generateSpanId(): string {
    return `span_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Limpia recursos al destruir el servicio
   */
  cleanup(): void {
    if (this.flushTimer) {
      clearInterval(this.flushTimer);
    }
    
    // Enviar datos pendientes
    this.flush();
    
    // Track session end
    this.track('session_end', {
      duration: Date.now() - parseInt(this.sessionId.split('_')[1])
    }, 'navigation');
  }
}

// Instancia singleton del servicio
export const observabilityService = new ObservabilityService();

// Auto-cleanup al cerrar la página
window.addEventListener('beforeunload', () => {
  observabilityService.cleanup();
});

export default observabilityService;