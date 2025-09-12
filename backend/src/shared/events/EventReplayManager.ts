/**
 * Event Replay Manager
 * Sprint 4 - Sistema de replay de eventos para recuperación y debugging
 */
import { injectable, inject } from 'inversify';
import { TYPES } from '@container/types';
import { IEventStore, StoredEvent } from './interfaces/IEventStore';
import { EventBus, DomainEvent } from './EventBus';
import { Logger } from 'winston';
export interface ReplayOptions {
  fromDate: Date;
  toDate?: Date;
  eventTypes?: string[];
  aggregateIds?: string[];
  speed?: number; // Velocidad de replay (1 = normal, 2 = doble velocidad, etc.)
  dryRun?: boolean; // Si true, no ejecuta los eventos, solo los registra
}
export interface ReplayResult {
  totalEvents: number;
  processedEvents: number;
  failedEvents: number;
  skippedEvents: number;
  duration: number;
  errors: Array<{ event: StoredEvent; error: string }>;
}
@injectable()
export class EventReplayManager {
  private logger?: Logger;
  private isReplaying: boolean = false;
  private currentReplay?: ReplayOptions;
  private replayHandlers: Map<string, Function[]> = new Map();
  constructor(
    @inject(TYPES.EventStore) private eventStore: IEventStore,
    @inject(TYPES.EventBus) private eventBus: EventBus
  ) {}
  setLogger(logger: Logger): void {
    this.logger = logger;
  }
  /**
   * Registra un handler específico para replay
   */
  registerReplayHandler(eventType: string, handler: Function): void {
    if (!this.replayHandlers.has(eventType)) {
      this.replayHandlers.set(eventType, []);
    }
    this.replayHandlers.get(eventType)!.push(handler);
  }
  /**
   * Ejecuta un replay de eventos
   */
  async replay(options: ReplayOptions): Promise<ReplayResult> {
    if (this.isReplaying) {
      throw new Error('A replay is already in progress');
    }
    this.isReplaying = true;
    this.currentReplay = options;
    const startTime = Date.now();
    const result: ReplayResult = {
      totalEvents: 0,
      processedEvents: 0,
      failedEvents: 0,
      skippedEvents: 0,
      duration: 0,
      errors: []
    };
    try {
      if (this.logger) {
        this.logger.info('Starting event replay', {
          fromDate: options.fromDate,
          toDate: options.toDate,
          eventTypes: options.eventTypes,
          dryRun: options.dryRun
        });
      }
      // Obtener eventos para replay
      const events = await this.eventStore.getEventsForReplay(
        options.fromDate,
        options.toDate
      );
      // Filtrar eventos según opciones
      const filteredEvents = this.filterEvents(events, options);
      result.totalEvents = filteredEvents.length;
      // Procesar eventos
      for (const event of filteredEvents) {
        try {
          const shouldProcess = await this.shouldProcessEvent(event, options);
          if (!shouldProcess) {
            result.skippedEvents++;
            continue;
          }
          if (!options.dryRun) {
            await this.processReplayEvent(event, options.speed || 1);
          } else {
            if (this.logger) {
              this.logger.debug('Dry run - would process event', {
                eventId: event.id,
                eventName: event.eventName
              });
            }
          }
          result.processedEvents++;
          // Progreso cada 100 eventos
          if (result.processedEvents % 100 === 0) {
            if (this.logger) {
              this.logger.info('Replay progress', {
                processed: result.processedEvents,
                total: result.totalEvents,
                percentage: Math.round((result.processedEvents / result.totalEvents) * 100)
              });
            }
          }
        } catch (error) {
          result.failedEvents++;
          result.errors.push({
            event,
            error: error.message
          });
          if (this.logger) {
            this.logger.error('Failed to replay event', {
              eventId: event.id,
              error: error.message
            });
          }
        }
      }
      result.duration = Date.now() - startTime;
      if (this.logger) {
        this.logger.info('Event replay completed', {
          ...result,
          errors: result.errors.length
        });
      }
      return result;
    } finally {
      this.isReplaying = false;
      this.currentReplay = undefined;
    }
  }
  /**
   * Replay de un agregado específico
   */
  async replayAggregate(aggregateId: string, toVersion?: number): Promise<any> {
    try {
      // Obtener snapshot si existe
      const snapshot = await this.eventStore.getSnapshot(aggregateId);
      let aggregateState = snapshot ? snapshot.data : {};
      let fromVersion = snapshot ? snapshot.version + 1 : 0;
      // Obtener eventos después del snapshot
      const events = await this.eventStore.getEventsByAggregate(aggregateId);
      // Filtrar eventos según versión
      const eventsToReplay = events.filter(e => {
        const eventVersion = e.streamVersion || 0;
        return eventVersion >= fromVersion && 
               (!toVersion || eventVersion <= toVersion);
      });
      // Aplicar eventos al estado
      for (const event of eventsToReplay) {
        aggregateState = await this.applyEventToAggregate(
          aggregateState, 
          event
        );
      }
      if (this.logger) {
        this.logger.info('Aggregate replayed', {
          aggregateId,
          eventsReplayed: eventsToReplay.length,
          finalVersion: eventsToReplay[eventsToReplay.length - 1]?.streamVersion
        });
      }
      return aggregateState;
    } catch (error) {
      if (this.logger) {
        this.logger.error('Failed to replay aggregate', {
          aggregateId,
          error: error.message
        });
      }
      throw error;
    }
  }
  /**
   * Pausa el replay actual
   */
  pause(): void {
    if (!this.isReplaying) {
      throw new Error('No replay in progress');
    }
    // Implementar lógica de pausa
    if (this.logger) {
      this.logger.info('Replay paused');
    }
  }
  /**
   * Reanuda el replay pausado
   */
  resume(): void {
    if (!this.isReplaying) {
      throw new Error('No replay in progress');
    }
    // Implementar lógica de reanudación
    if (this.logger) {
      this.logger.info('Replay resumed');
    }
  }
  /**
   * Cancela el replay actual
   */
  cancel(): void {
    if (!this.isReplaying) {
      throw new Error('No replay in progress');
    }
    this.isReplaying = false;
    this.currentReplay = undefined;
    if (this.logger) {
      this.logger.warn('Replay cancelled');
    }
  }
  /**
   * Filtra eventos según opciones de replay
   */
  private filterEvents(
    events: StoredEvent[], 
    options: ReplayOptions
  ): StoredEvent[] {
    return events.filter(event => {
      // Filtrar por tipo de evento
      if (options.eventTypes && !options.eventTypes.includes(event.eventName)) {
        return false;
      }
      // Filtrar por aggregate IDs
      if (options.aggregateIds && !options.aggregateIds.includes(event.aggregateId)) {
        return false;
      }
      return true;
    });
  }
  /**
   * Determina si un evento debe ser procesado
   */
  private async shouldProcessEvent(
    event: StoredEvent, 
    options: ReplayOptions
  ): Promise<boolean> {
    // Aquí se pueden agregar validaciones adicionales
    // Por ejemplo, verificar si el evento ya fue procesado, etc.
    return true;
  }
  /**
   * Procesa un evento durante el replay
   */
  private async processReplayEvent(
    event: StoredEvent, 
    speed: number
  ): Promise<void> {
    // Aplicar delay basado en la velocidad
    if (speed < 1) {
      const delay = Math.round((1 / speed) * 100);
      await this.sleep(delay);
    }
    // Verificar si hay handlers específicos de replay
    const replayHandlers = this.replayHandlers.get(event.eventName);
    if (replayHandlers && replayHandlers.length > 0) {
      // Usar handlers de replay
      for (const handler of replayHandlers) {
        await handler(event);
      }
    } else {
      // Usar el event bus normal
      const domainEvent: DomainEvent = {
        eventName: event.eventName,
        aggregateId: event.aggregateId,
        occurredAt: event.occurredAt,
        payload: event.payload,
        metadata: {
          ...event.metadata,
          isReplay: true,
          originalEventId: event.id
        }
      };
      await this.eventBus.publish(domainEvent);
    }
    // Marcar evento como procesado en el replay
    await this.eventStore.markAsProcessed(event.id);
  }
  /**
   * Aplica un evento al estado de un agregado
   */
  private async applyEventToAggregate(
    state: any, 
    event: StoredEvent
  ): Promise<any> {
    // Esta función debe ser extendida según el tipo de agregado
    // Por ahora, aplicación genérica
    const newState = { ...state };
    switch (event.eventName) {
      case 'user.created':
        return { ...newState, ...event.payload, version: event.streamVersion };
      case 'user.updated':
        return { ...newState, ...event.payload, version: event.streamVersion };
      case 'user.deleted':
        return { ...newState, deleted: true, version: event.streamVersion };
      default:
        // Aplicación genérica: merge del payload
        return { ...newState, ...event.payload, version: event.streamVersion };
    }
  }
  /**
   * Función auxiliar para delays
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
  /**
   * Obtiene estadísticas del replay actual
   */
  getReplayStatus(): {
    isReplaying: boolean;
    options?: ReplayOptions;
  } {
    return {
      isReplaying: this.isReplaying,
      options: this.currentReplay
    };
  }
}
