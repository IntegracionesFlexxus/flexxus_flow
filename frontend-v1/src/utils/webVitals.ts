// Web Vitals y métricas de performance - MVP Nivel 1
// TODO: En Nivel 2 agregar reportes automáticos y analytics

export interface Metric {
  name: string;
  value: number;
  rating: 'good' | 'needs-improvement' | 'poor';
  timestamp: number;
}

export interface WebVitalsMetrics {
  FCP?: Metric; // First Contentful Paint
  LCP?: Metric; // Largest Contentful Paint
  FID?: Metric; // First Input Delay
  CLS?: Metric; // Cumulative Layout Shift
  TTFB?: Metric; // Time to First Byte
  INP?: Metric; // Interaction to Next Paint
}

// Umbrales basados en Web Vitals estándares
const THRESHOLDS = {
  FCP: { good: 1800, poor: 3000 },
  LCP: { good: 2500, poor: 4000 },
  FID: { good: 100, poor: 300 },
  CLS: { good: 0.1, poor: 0.25 },
  TTFB: { good: 800, poor: 1800 },
  INP: { good: 200, poor: 500 }
};

// Calificar métrica
function rateMetric(name: keyof typeof THRESHOLDS, value: number): Metric['rating'] {
  const threshold = THRESHOLDS[name];
  if (value <= threshold.good) return 'good';
  if (value <= threshold.poor) return 'needs-improvement';
  return 'poor';
}

// Listener de métricas
type MetricListener = (metric: Metric) => void;
const listeners = new Set<MetricListener>();

// Agregar listener
export function onMetric(callback: MetricListener) {
  listeners.add(callback);
  return () => listeners.delete(callback);
}

// Emitir métrica a todos los listeners
function emitMetric(metric: Metric) {
  listeners.forEach(listener => listener(metric));
}

// Recolector de métricas usando Performance Observer API
class MetricsCollector {
  private metrics: WebVitalsMetrics = {};
  private observer?: PerformanceObserver;

  constructor() {
    this.init();
  }

  private init() {
    // Observar paint metrics (FCP, LCP)
    if (typeof window !== 'undefined' && 'PerformanceObserver' in window) {
      try {
        // Observer para FCP y LCP
        const paintObserver = new PerformanceObserver((entryList) => {
          for (const entry of entryList.getEntries()) {
            if (entry.name === 'first-contentful-paint') {
              const metric: Metric = {
                name: 'FCP',
                value: entry.startTime,
                rating: rateMetric('FCP', entry.startTime),
                timestamp: Date.now()
              };
              this.metrics.FCP = metric;
              emitMetric(metric);
            }
            
            if (entry.entryType === 'largest-contentful-paint') {
              const metric: Metric = {
                name: 'LCP',
                value: entry.startTime,
                rating: rateMetric('LCP', entry.startTime),
                timestamp: Date.now()
              };
              this.metrics.LCP = metric;
              emitMetric(metric);
            }
          }
        });

        paintObserver.observe({ 
          entryTypes: ['paint', 'largest-contentful-paint'] 
        });

        // Observer para FID
        const fidObserver = new PerformanceObserver((entryList) => {
          for (const entry of entryList.getEntries()) {
            if (entry.entryType === 'first-input') {
              const value = (entry as any).processingStart - entry.startTime;
              const metric: Metric = {
                name: 'FID',
                value,
                rating: rateMetric('FID', value),
                timestamp: Date.now()
              };
              this.metrics.FID = metric;
              emitMetric(metric);
            }
          }
        });

        fidObserver.observe({ entryTypes: ['first-input'] });

        // Observer para CLS
        let clsValue = 0;
        let clsEntries: PerformanceEntry[] = [];
        
        const clsObserver = new PerformanceObserver((entryList) => {
          for (const entry of entryList.getEntries()) {
            if ((entry as any).hadRecentInput) continue;
            
            clsEntries.push(entry);
            clsValue += (entry as any).value;
            
            const metric: Metric = {
              name: 'CLS',
              value: clsValue,
              rating: rateMetric('CLS', clsValue),
              timestamp: Date.now()
            };
            this.metrics.CLS = metric;
            emitMetric(metric);
          }
        });

        clsObserver.observe({ entryTypes: ['layout-shift'] });

        // TTFB
        this.measureTTFB();

      } catch (error) {
        console.warn('Performance Observer not supported:', error);
      }
    }

    // Escuchar eventos de navegación para resetear métricas
    if (typeof window !== 'undefined') {
      window.addEventListener('popstate', () => this.reset());
    }
  }

  private measureTTFB() {
    if (typeof window !== 'undefined' && window.performance && window.performance.timing) {
      const timing = window.performance.timing;
      const ttfb = timing.responseStart - timing.navigationStart;
      
      if (ttfb > 0) {
        const metric: Metric = {
          name: 'TTFB',
          value: ttfb,
          rating: rateMetric('TTFB', ttfb),
          timestamp: Date.now()
        };
        this.metrics.TTFB = metric;
        emitMetric(metric);
      }
    }
  }

  getMetrics(): WebVitalsMetrics {
    return { ...this.metrics };
  }

  reset() {
    this.metrics = {};
  }

  destroy() {
    if (this.observer) {
      this.observer.disconnect();
    }
    listeners.clear();
  }
}

// Instancia singleton
let collector: MetricsCollector | null = null;

// Inicializar recolector
export function initWebVitals() {
  if (!collector) {
    collector = new MetricsCollector();
  }
  return collector;
}

// Obtener métricas actuales
export function getWebVitals(): WebVitalsMetrics {
  if (!collector) {
    collector = new MetricsCollector();
  }
  return collector.getMetrics();
}

// Hook para React
import { useState, useEffect } from 'react';

export function useWebVitals() {
  const [metrics, setMetrics] = useState<WebVitalsMetrics>({});

  useEffect(() => {
    // Inicializar recolector
    const collector = initWebVitals();
    
    // Actualizar estado con métricas actuales
    setMetrics(collector.getMetrics());
    
    // Subscribirse a nuevas métricas
    const unsubscribe = onMetric((metric) => {
      setMetrics(prev => ({
        ...prev,
        [metric.name]: metric
      }));
    });

    return unsubscribe;
  }, []);

  return metrics;
}

// Reportar métricas a consola (desarrollo)
export function logWebVitals() {
  if (process.env.NODE_ENV === 'development') {
    onMetric((metric) => {
      const emoji = metric.rating === 'good' ? '✅' : 
                   metric.rating === 'needs-improvement' ? '⚠️' : '❌';
      console.log(`${emoji} ${metric.name}: ${metric.value.toFixed(2)}ms (${metric.rating})`);
    });
  }
}

// Helper para formatear métricas
export function formatMetric(metric?: Metric): string {
  if (!metric) return 'N/A';
  
  const value = metric.name === 'CLS' 
    ? metric.value.toFixed(3)
    : `${metric.value.toFixed(0)}ms`;
    
  return value;
}

// Analizar todas las métricas y devolver resumen
export function analyzePerformance(metrics: WebVitalsMetrics) {
  const scores = {
    good: 0,
    needsImprovement: 0,
    poor: 0,
    total: 0
  };

  Object.values(metrics).forEach(metric => {
    if (metric) {
      scores.total++;
      if (metric.rating === 'good') scores.good++;
      else if (metric.rating === 'needs-improvement') scores.needsImprovement++;
      else scores.poor++;
    }
  });

  const overallScore = scores.total > 0
    ? (scores.good / scores.total) * 100
    : 0;

  return {
    scores,
    overallScore,
    rating: overallScore >= 75 ? 'good' : 
           overallScore >= 50 ? 'needs-improvement' : 'poor'
  };
}

export default {
  initWebVitals,
  getWebVitals,
  onMetric,
  useWebVitals,
  logWebVitals,
  formatMetric,
  analyzePerformance
};