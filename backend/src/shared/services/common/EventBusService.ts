import { injectable, inject } from 'inversify';
import { EventEmitter } from 'events';
import { IEventBusService } from '@interfaces/IServices';
import { ILoggerService } from '@interfaces/IServices';
import { TYPES } from '@container/types';
// Event handler wrapper for better error handling
type EventHandler = (...args: any[]) => void | Promise<void>;
interface IEventSubscription {
  event: string;
  handler: EventHandler;
  once: boolean;
  subscribedAt: Date;
}
@injectable()
export class EventBusService implements IEventBusService {
  private emitter: EventEmitter;
  private subscriptions: Map<string, Set<IEventSubscription>>;
  private eventStats: Map<string, { emitted: number; errors: number }>;
  constructor(
    @inject(TYPES.LoggerService) private logger: ILoggerService
  ) {
    this.emitter = new EventEmitter();
    this.emitter.setMaxListeners(100); // Increase max listeners
    this.subscriptions = new Map();
    this.eventStats = new Map();
    // Setup error handling
    this.setupErrorHandling();
  }
  private setupErrorHandling(): void {
    this.emitter.on('error', (error: Error) => {
      this.logger.error('EventBus error', error);
    });
  }
  async initialize(): Promise<void> {
    this.logger.info('EventBus Service initialized');
  }
  async shutdown(): Promise<void> {
    this.removeAllListeners();
    this.logger.info('EventBus Service shut down', {
      totalEvents: this.eventStats.size,
      totalSubscriptions: this.getTotalSubscriptions()
    });
  }
  emit(event: string, data: any): void {
    try {
      // Update stats
      const stats = this.eventStats.get(event) || { emitted: 0, errors: 0 };
      stats.emitted++;
      this.eventStats.set(event, stats);
      // Log event emission in debug mode
      this.logger.debug(`Event emitted: ${event}`, { 
        dataType: typeof data,
        listeners: this.emitter.listenerCount(event)
      });
      // Emit the event
      this.emitter.emit(event, data);
    } catch (error) {
      this.handleEventError(event, error as Error);
    }
  }
  on(event: string, handler: EventHandler): void {
    try {
      // Wrap handler for error handling
      const wrappedHandler = this.wrapHandler(event, handler);
      // Subscribe to event
      this.emitter.on(event, wrappedHandler);
      // Track subscription
      this.trackSubscription(event, handler, false);
      this.logger.debug(`Event handler registered: ${event}`);
    } catch (error) {
      this.logger.error(`Failed to register handler for event: ${event}`, error as Error);
    }
  }
  off(event: string, handler: EventHandler): void {
    try {
      this.emitter.off(event, handler);
      // Remove from tracking
      const subs = this.subscriptions.get(event);
      if (subs) {
        subs.forEach(sub => {
          if (sub.handler === handler) {
            subs.delete(sub);
          }
        });
      }
      this.logger.debug(`Event handler removed: ${event}`);
    } catch (error) {
      this.logger.error(`Failed to remove handler for event: ${event}`, error as Error);
    }
  }
  once(event: string, handler: EventHandler): void {
    try {
      // Wrap handler for error handling
      const wrappedHandler = this.wrapHandler(event, handler);
      // Subscribe to event once
      this.emitter.once(event, wrappedHandler);
      // Track subscription
      this.trackSubscription(event, handler, true);
      this.logger.debug(`One-time event handler registered: ${event}`);
    } catch (error) {
      this.logger.error(`Failed to register one-time handler for event: ${event}`, error as Error);
    }
  }
  removeAllListeners(event?: string): void {
    try {
      if (event) {
        this.emitter.removeAllListeners(event);
        this.subscriptions.delete(event);
        this.logger.debug(`All listeners removed for event: ${event}`);
      } else {
        this.emitter.removeAllListeners();
        this.subscriptions.clear();
        this.logger.debug('All event listeners removed');
      }
    } catch (error) {
      this.logger.error('Failed to remove listeners', error as Error);
    }
  }
  // Wrap handler to catch errors
  private wrapHandler(event: string, handler: EventHandler): EventHandler {
    return async (...args: any[]) => {
      try {
        await handler(...args);
      } catch (error) {
        this.handleEventError(event, error as Error);
      }
    };
  }
  private handleEventError(event: string, error: Error): void {
    // Update error stats
    const stats = this.eventStats.get(event) || { emitted: 0, errors: 0 };
    stats.errors++;
    this.eventStats.set(event, stats);
    // Log error
    this.logger.error(`Error in event handler for: ${event}`, error);
    // Re-emit as error event for global handling
    this.emitter.emit('error', error);
  }
  private trackSubscription(event: string, handler: EventHandler, once: boolean): void {
    if (!this.subscriptions.has(event)) {
      this.subscriptions.set(event, new Set());
    }
    this.subscriptions.get(event)!.add({
      event,
      handler,
      once,
      subscribedAt: new Date()
    });
  }
  private getTotalSubscriptions(): number {
    let total = 0;
    this.subscriptions.forEach(subs => {
      total += subs.size;
    });
    return total;
  }
  // Utility methods
  getEventNames(): string[] {
    return this.emitter.eventNames() as string[];
  }
  getListenerCount(event: string): number {
    return this.emitter.listenerCount(event);
  }
  getEventStats(event?: string): any {
    if (event) {
      return this.eventStats.get(event) || { emitted: 0, errors: 0 };
    }
    const allStats: any = {};
    this.eventStats.forEach((stats, eventName) => {
      allStats[eventName] = stats;
    });
    return allStats;
  }
  // Emit and wait for all handlers to complete
  async emitAsync(event: string, data: any): Promise<void> {
    const listeners = this.emitter.listeners(event);
    await Promise.all(
      listeners.map(listener => 
        Promise.resolve(listener(data)).catch(error => 
          this.handleEventError(event, error)
        )
      )
    );
  }
}
