/**
 * Enhanced Event Bus
 * Sprint 4 - Event Bus con persistencia, DLQ y replay
 */
import { injectable, inject } from 'inversify';
import { EventBus, DomainEvent, IEventBus } from './EventBus';
import { IEventStore } from './interfaces/IEventStore';
import { IDeadLetterQueue } from './interfaces/IDeadLetterQueue';
import { EventReplayManager } from './EventReplayManager';
import { TYPES } from '@container/types';
import { Logger } from 'winston';
import { v4 as uuidv4 } from 'uuid';
export interface EventBusConfig {
  persistEvents?: boolean;
  enableDLQ?: boolean;
  enableReplay?: boolean;
  batchSize?: number;
  maxRetries?: number;
}
export interface CircuitBreakerConfig {
  threshold: number;
  timeout: number;
  resetTimeout: number;
}
enum CircuitState {
  CLOSED = 'closed',
  OPEN = 'open',
  HALF_OPEN = 'half-open'
}
class CircuitBreaker {
  private state: CircuitState = CircuitState.CLOSED;
  private failures: number = 0;
  private nextAttempt: Date = new Date();
  private successCount: number = 0;
  constructor(private config: CircuitBreakerConfig) {}
  async execute<T>(fn: () => Promise<T>): Promise<T> {
    if (this.state === CircuitState.OPEN) {
      if (new Date() < this.nextAttempt) {
        throw new Error('Circuit breaker is OPEN');
      }
      this.state = CircuitState.HALF_OPEN;
    }
    try {
      const result = await fn();
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure();
      throw error;
    }
  }
  private onSuccess(): void {
    this.failures = 0;
    if (this.state === CircuitState.HALF_OPEN) {
      this.successCount++;
      if (this.successCount >= 3) {
        this.state = CircuitState.CLOSED;
        this.successCount = 0;
      }
    }
  }
  private onFailure(): void {
    this.failures++;
    this.successCount = 0;
    if (this.failures >= this.config.threshold) {
      this.state = CircuitState.OPEN;
      this.nextAttempt = new Date(Date.now() + this.config.resetTimeout);
    }
  }
  getState(): CircuitState {
    return this.state;
  }
}
@injectable()
export class EnhancedEventBus extends EventBus {
  private config: EventBusConfig;
  private circuitBreakers: Map<string, CircuitBreaker> = new Map();
  private eventHandlers: Map<string, Set<Function>> = new Map();
  private eventStore?: IEventStore;
  private dlq?: IDeadLetterQueue;
  private replayManager?: EventReplayManager;
  private logger?: Logger;
  private batchQueue: DomainEvent[] = [];
  private batchTimer?: NodeJS.Timeout;
  constructor() {
    super();
    this.config = {
      persistEvents: true,
      enableDLQ: true,
      enableReplay: true,
      batchSize: 10,
      maxRetries: 3
    };
  }
  /**
   * Inicializa el Event Bus con sus dependencias
   */
  initialize(
    eventStore: IEventStore,
    dlq: IDeadLetterQueue,
    replayManager: EventReplayManager,
    logger: Logger,
    config?: EventBusConfig
  ): void {
    this.eventStore = eventStore;
    this.dlq = dlq;
    this.replayManager = replayManager;
    this.logger = logger;
    if (config) {
      this.config = { ...this.config, ...config };
    }
    // Configurar el logger en las dependencias
    if (this.eventStore && 'setLogger' in this.eventStore) {
      (this.eventStore as any).setLogger(logger);
    }
    if (this.dlq && 'setLogger' in this.dlq) {
      (this.dlq as any).setLogger(logger);
    }
    if (this.replayManager) {
      this.replayManager.setLogger(logger);
    }
    this.logger?.info('Enhanced Event Bus initialized', this.config);
  }
  /**
   * Publica un evento con persistencia y manejo de errores
   */
  async publish(event: DomainEvent): Promise<void> {
    const streamId = this.generateStreamId(event);
    try {
      // Circuit breaker por tipo de evento
      const breaker = this.getOrCreateCircuitBreaker(event.eventName);
      await breaker.execute(async () => {
        // Persistir si está habilitado
        if (this.config.persistEvents && this.eventStore) {
          await this.eventStore.append(event, streamId);
        }
        // Publicar usando el EventBus base
        await super.publish(event);
        // Ejecutar handlers adicionales
        await this.executeHandlers(event);
      });
      this.logger?.debug('Event published successfully', {
        eventName: event.eventName,
        aggregateId: event.aggregateId
      });
    } catch (error) {
      await this.handlePublishError(event, error as Error);
    }
  }
  /**
   * Publica múltiples eventos en batch
   */
  async publishBatch(events: DomainEvent[]): Promise<void> {
    this.batchQueue.push(...events);
    if (this.batchQueue.length >= this.config.batchSize!) {
      await this.processBatch();
    } else {
      // Programar procesamiento del batch
      if (!this.batchTimer) {
        this.batchTimer = setTimeout(() => this.processBatch(), 1000);
      }
    }
  }
  /**
   * Suscribe un handler mejorado con retry logic
   */
  subscribeEnhanced(
    eventName: string,
    handler: (event: DomainEvent) => Promise<void>,
    options?: { maxRetries?: number; retryDelay?: number }
  ): void {
    const enhancedHandler = async (event: DomainEvent) => {
      let attempts = 0;
      const maxRetries = options?.maxRetries || this.config.maxRetries || 3;
      const retryDelay = options?.retryDelay || 1000;
      while (attempts <= maxRetries) {
        try {
          await handler(event);
          return;
        } catch (error) {
          attempts++;
          if (attempts > maxRetries) {
            // Enviar a DLQ
            if (this.config.enableDLQ && this.dlq) {
              await this.dlq.send(event, error as Error);
            }
            throw error;
          }
          // Esperar antes de reintentar
          await this.sleep(retryDelay * attempts);
          this.logger?.warn(`Retrying event handler (attempt ${attempts}/${maxRetries})`, {
            eventName,
            error: (error as Error).message
          });
        }
      }
    };
    // Registrar handler
    if (!this.eventHandlers.has(eventName)) {
      this.eventHandlers.set(eventName, new Set());
    }
    this.eventHandlers.get(eventName)!.add(enhancedHandler);
    // También registrar en el EventBus base
    super.subscribe(eventName, enhancedHandler);
  }
  /**
   * Replay de eventos
   */
  async replay(options: {
    fromDate: Date;
    toDate?: Date;
    eventTypes?: string[];
    aggregateIds?: string[];
  }): Promise<void> {
    if (!this.config.enableReplay || !this.replayManager) {
      throw new Error('Replay is not enabled');
    }
    const result = await this.replayManager.replay({
      ...options,
      dryRun: false
    });
    this.logger?.info('Replay completed', result);
  }
  /**
   * Procesa eventos del DLQ
   */
  async processDLQ(): Promise<{ success: number; failed: number }> {
    if (!this.config.enableDLQ || !this.dlq) {
      throw new Error('DLQ is not enabled');
    }
    return await this.dlq.retryAll();
  }
  /**
   * Obtiene estadísticas del Event Bus
   */
  async getStats(): Promise<{
    circuitBreakers: Map<string, string>;
    dlqStats?: any;
    batchQueueSize: number;
  }> {
    const stats: any = {
      circuitBreakers: new Map(),
      batchQueueSize: this.batchQueue.length
    };
    // Estado de circuit breakers
    this.circuitBreakers.forEach((breaker, eventName) => {
      stats.circuitBreakers.set(eventName, breaker.getState());
    });
    // Estadísticas del DLQ
    if (this.dlq) {
      stats.dlqStats = await this.dlq.getStats();
    }
    return stats;
  }
  /**
   * Procesa el batch de eventos
   */
  private async processBatch(): Promise<void> {
    if (this.batchQueue.length === 0) return;
    const batch = [...this.batchQueue];
    this.batchQueue = [];
    if (this.batchTimer) {
      clearTimeout(this.batchTimer);
      this.batchTimer = undefined;
    }
    try {
      // Procesar eventos en paralelo
      await Promise.all(
        batch.map(event => this.publish(event))
      );
      this.logger?.info(`Batch processed: ${batch.length} events`);
    } catch (error) {
      this.logger?.error('Batch processing failed', error);
      // Reintentar eventos fallidos individualmente
      for (const event of batch) {
        try {
          await this.publish(event);
        } catch (err) {
          // Ya manejado por publish
        }
      }
    }
  }
  /**
   * Ejecuta handlers registrados
   */
  private async executeHandlers(event: DomainEvent): Promise<void> {
    const handlers = this.eventHandlers.get(event.eventName);
    if (!handlers) return;
    const promises = Array.from(handlers).map(handler =>
      handler(event).catch(error => {
        this.logger?.error('Handler execution failed', {
          eventName: event.eventName,
          error: error.message
        });
      })
    );
    await Promise.all(promises);
  }
  /**
   * Maneja errores de publicación
   */
  private async handlePublishError(event: DomainEvent, error: Error): Promise<void> {
    this.logger?.error('Failed to publish event', {
      eventName: event.eventName,
      aggregateId: event.aggregateId,
      error: error.message
    });
    // Enviar a DLQ si está habilitado
    if (this.config.enableDLQ && this.dlq) {
      try {
        await this.dlq.send(event, error);
      } catch (dlqError) {
        this.logger?.error('Failed to send to DLQ', dlqError);
      }
    }
    throw error;
  }
  /**
   * Obtiene o crea un circuit breaker para un tipo de evento
   */
  private getOrCreateCircuitBreaker(eventName: string): CircuitBreaker {
    if (!this.circuitBreakers.has(eventName)) {
      this.circuitBreakers.set(eventName, new CircuitBreaker({
        threshold: 5,
        timeout: 10000,
        resetTimeout: 30000
      }));
    }
    return this.circuitBreakers.get(eventName)!;
  }
  /**
   * Genera un ID de stream para un evento
   */
  private generateStreamId(event: DomainEvent): string {
    return `${event.eventName}-${event.aggregateId}`;
  }
  /**
   * Función auxiliar para delays
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
  /**
   * Limpia recursos al cerrar
   */
  async shutdown(): Promise<void> {
    // Procesar batch pendiente
    if (this.batchQueue.length > 0) {
      await this.processBatch();
    }
    // Limpiar timers
    if (this.batchTimer) {
      clearTimeout(this.batchTimer);
    }
    this.logger?.info('Enhanced Event Bus shut down');
  }
}
