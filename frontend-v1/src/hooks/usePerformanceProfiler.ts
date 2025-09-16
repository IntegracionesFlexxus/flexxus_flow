import { useEffect, useRef, useState, useCallback } from 'react';

// Hook para perfilado de componentes - MVP Nivel 1
// TODO: En Nivel 2 integrar con React DevTools Profiler API

interface PerformanceMetrics {
  renderCount: number;
  lastRenderTime: number;
  averageRenderTime: number;
  maxRenderTime: number;
  minRenderTime: number;
  totalRenderTime: number;
  mounted: boolean;
  mountTime?: number;
}

interface UsePerformanceProfilerOptions {
  componentName?: string;
  logToConsole?: boolean;
  warnThreshold?: number; // ms para advertencia
}

export function usePerformanceProfiler(
  options: UsePerformanceProfilerOptions = {}
) {
  const {
    componentName = 'Component',
    logToConsole = process.env.NODE_ENV === 'development',
    warnThreshold = 16.67 // ~60 FPS
  } = options;

  const [metrics, setMetrics] = useState<PerformanceMetrics>({
    renderCount: 0,
    lastRenderTime: 0,
    averageRenderTime: 0,
    maxRenderTime: 0,
    minRenderTime: Infinity,
    totalRenderTime: 0,
    mounted: false
  });

  const renderStartTime = useRef<number>(0);
  const mountStartTime = useRef<number>(0);
  const renderTimes = useRef<number[]>([]);

  // Medir tiempo de montaje
  useEffect(() => {
    mountStartTime.current = performance.now();
    
    return () => {
      const mountTime = performance.now() - mountStartTime.current;
      
      if (logToConsole) {
        console.log(`🔧 ${componentName} unmounted after ${mountTime.toFixed(2)}ms`);
      }
    };
  }, []);

  // Medir tiempo de render
  useEffect(() => {
    const renderTime = performance.now() - renderStartTime.current;
    
    if (renderStartTime.current > 0) {
      renderTimes.current.push(renderTime);
      
      setMetrics(prev => {
        const newCount = prev.renderCount + 1;
        const newTotal = prev.totalRenderTime + renderTime;
        const newAverage = newTotal / newCount;
        
        const updated: PerformanceMetrics = {
          renderCount: newCount,
          lastRenderTime: renderTime,
          averageRenderTime: newAverage,
          maxRenderTime: Math.max(prev.maxRenderTime, renderTime),
          minRenderTime: Math.min(prev.minRenderTime, renderTime),
          totalRenderTime: newTotal,
          mounted: true,
          mountTime: prev.mountTime || (performance.now() - mountStartTime.current)
        };

        // Log si está habilitado
        if (logToConsole) {
          const emoji = renderTime > warnThreshold ? '⚠️' : '✅';
          console.log(
            `${emoji} ${componentName} render #${newCount}: ${renderTime.toFixed(2)}ms ` +
            `(avg: ${newAverage.toFixed(2)}ms)`
          );
        }

        // Advertencia si el render es muy lento
        if (renderTime > warnThreshold * 2) {
          console.warn(
            `❌ ${componentName} render took ${renderTime.toFixed(2)}ms - ` +
            `consider optimization!`
          );
        }

        return updated;
      });
    }
    
    renderStartTime.current = performance.now();
  });

  // Reset metrics
  const resetMetrics = useCallback(() => {
    setMetrics({
      renderCount: 0,
      lastRenderTime: 0,
      averageRenderTime: 0,
      maxRenderTime: 0,
      minRenderTime: Infinity,
      totalRenderTime: 0,
      mounted: true
    });
    renderTimes.current = [];
  }, []);

  // Get performance summary
  const getPerformanceSummary = useCallback(() => {
    const percentiles = calculatePercentiles(renderTimes.current);
    
    return {
      ...metrics,
      percentiles,
      rating: getRating(metrics.averageRenderTime),
      suggestion: getSuggestion(metrics)
    };
  }, [metrics]);

  return {
    metrics,
    resetMetrics,
    getPerformanceSummary,
    isSlowRender: metrics.lastRenderTime > warnThreshold,
    renderTimes: renderTimes.current
  };
}

// Hook para medir operaciones asíncronas
export function useAsyncPerformance() {
  const [operations, setOperations] = useState<Map<string, number>>(new Map());
  
  const startOperation = useCallback((operationName: string) => {
    const startTime = performance.now();
    setOperations(prev => new Map(prev).set(operationName, startTime));
    
    return () => {
      const endTime = performance.now();
      const duration = endTime - startTime;
      
      setOperations(prev => {
        const updated = new Map(prev);
        updated.delete(operationName);
        return updated;
      });
      
      if (process.env.NODE_ENV === 'development') {
        console.log(`⏱️ ${operationName}: ${duration.toFixed(2)}ms`);
      }
      
      return duration;
    };
  }, []);

  const measureAsync = useCallback(async <T,>(
    operationName: string,
    asyncFn: () => Promise<T>
  ): Promise<T> => {
    const startTime = performance.now();
    
    try {
      const result = await asyncFn();
      const duration = performance.now() - startTime;
      
      if (process.env.NODE_ENV === 'development') {
        console.log(`⏱️ ${operationName}: ${duration.toFixed(2)}ms`);
      }
      
      return result;
    } catch (error) {
      const duration = performance.now() - startTime;
      console.error(`❌ ${operationName} failed after ${duration.toFixed(2)}ms`, error);
      throw error;
    }
  }, []);

  return {
    startOperation,
    measureAsync,
    activeOperations: Array.from(operations.keys())
  };
}

// Hook para detectar memory leaks
export function useMemoryMonitor(componentName = 'Component') {
  const objectRefs = useRef<WeakSet<object>>(new WeakSet());
  const listenerCount = useRef(0);
  const timerCount = useRef(0);

  // Track object references
  const trackObject = useCallback((obj: object) => {
    objectRefs.current.add(obj);
  }, []);

  // Track event listeners
  const addEventListener = useCallback((
    target: EventTarget,
    type: string,
    listener: EventListenerOrEventListenerObject,
    options?: boolean | AddEventListenerOptions
  ) => {
    listenerCount.current++;
    target.addEventListener(type, listener, options);
    
    return () => {
      listenerCount.current--;
      target.removeEventListener(type, listener, options);
    };
  }, []);

  // Track timers
  const setTimer = useCallback((
    callback: () => void,
    delay: number,
    type: 'timeout' | 'interval' = 'timeout'
  ) => {
    timerCount.current++;
    
    const id = type === 'timeout' 
      ? setTimeout(() => {
          timerCount.current--;
          callback();
        }, delay)
      : setInterval(callback, delay);
    
    return () => {
      timerCount.current--;
      if (type === 'timeout') {
        clearTimeout(id as NodeJS.Timeout);
      } else {
        clearInterval(id as NodeJS.Timeout);
      }
    };
  }, []);

  // Check for leaks on unmount
  useEffect(() => {
    return () => {
      if (process.env.NODE_ENV === 'development') {
        if (listenerCount.current > 0) {
          console.warn(
            `⚠️ ${componentName} has ${listenerCount.current} active event listeners on unmount`
          );
        }
        if (timerCount.current > 0) {
          console.warn(
            `⚠️ ${componentName} has ${timerCount.current} active timers on unmount`
          );
        }
      }
    };
  }, [componentName]);

  return {
    trackObject,
    addEventListener,
    setTimer,
    stats: {
      listeners: listenerCount.current,
      timers: timerCount.current
    }
  };
}

// Helpers
function calculatePercentiles(times: number[]) {
  if (times.length === 0) return { p50: 0, p75: 0, p90: 0, p99: 0 };
  
  const sorted = [...times].sort((a, b) => a - b);
  const p50 = sorted[Math.floor(sorted.length * 0.5)];
  const p75 = sorted[Math.floor(sorted.length * 0.75)];
  const p90 = sorted[Math.floor(sorted.length * 0.9)];
  const p99 = sorted[Math.floor(sorted.length * 0.99)];
  
  return { p50, p75, p90, p99 };
}

function getRating(averageTime: number): 'excellent' | 'good' | 'fair' | 'poor' {
  if (averageTime < 8) return 'excellent';
  if (averageTime < 16.67) return 'good';
  if (averageTime < 33) return 'fair';
  return 'poor';
}

function getSuggestion(metrics: PerformanceMetrics): string {
  if (metrics.averageRenderTime > 50) {
    return 'Consider using React.memo or useMemo to optimize renders';
  }
  if (metrics.renderCount > 100) {
    return 'High render count detected - check for unnecessary state updates';
  }
  if (metrics.maxRenderTime > 100) {
    return 'Some renders are very slow - profile with React DevTools';
  }
  return 'Performance is good';
}

export default {
  usePerformanceProfiler,
  useAsyncPerformance,
  useMemoryMonitor
};