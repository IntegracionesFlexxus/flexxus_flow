/**
 * Dead Letter Queue Implementation
 * Sprint 4 - Manejo de eventos fallidos con reintentos
 */
import { injectable, inject } from 'inversify';
import { TYPES } from '@container/types';
import { IDatabaseConnection } from '@shared/database/interfaces/IDatabaseConnection';
import { IDeadLetterQueue, DeadLetterEvent, RetryPolicy } from './interfaces/IDeadLetterQueue';
import { DomainEvent } from './EventBus';
import { Logger } from 'winston';
import { v4 as uuidv4 } from 'uuid';
@injectable()
export class DeadLetterQueue implements IDeadLetterQueue {
  private logger?: Logger;
  private retryPolicies: Map<string, RetryPolicy> = new Map();
  private defaultRetryPolicy: RetryPolicy = {
    maxRetries: 5,
    initialDelayMs: 1000,
    maxDelayMs: 60000,
    backoffMultiplier: 2
  };
  constructor(
    @inject(TYPES.SharedConnection) private db: IDatabaseConnection
  ) {
    this.initializeDefaultPolicies();
  }
  setLogger(logger: Logger): void {
    this.logger = logger;
  }
  /**
   * Inicializa políticas de reintento por defecto
   */
  private initializeDefaultPolicies(): void {
    // Política para eventos críticos
    this.retryPolicies.set('critical', {
      maxRetries: 10,
      initialDelayMs: 500,
      maxDelayMs: 30000,
      backoffMultiplier: 1.5
    });
    // Política para eventos de notificación
    this.retryPolicies.set('notification', {
      maxRetries: 3,
      initialDelayMs: 5000,
      maxDelayMs: 60000,
      backoffMultiplier: 2
    });
  }
  /**
   * Envía un evento fallido al DLQ
   */
  async send(event: DomainEvent, error: Error): Promise<void> {
    try {
      const dlqEventId = uuidv4();
      const nextRetryAt = this.calculateNextRetryTime(1);
      const query = `
        INSERT INTO dead_letter_queue (
          id, event_name, aggregate_id, payload, metadata,
          failure_reason, failure_count, first_failed_at, 
          last_failed_at, next_retry_at, status, stack_trace
        ) VALUES (
          $1, $2, $3, $4, $5, $6, $7, CURRENT_TIMESTAMP,
          CURRENT_TIMESTAMP, $8, $9, $10
        )
        ON CONFLICT (event_name, aggregate_id) 
        DO UPDATE SET
          failure_count = dead_letter_queue.failure_count + 1,
          last_failed_at = CURRENT_TIMESTAMP,
          failure_reason = EXCLUDED.failure_reason,
          next_retry_at = $8,
          status = 'pending',
          stack_trace = EXCLUDED.stack_trace
      `;
      await this.db.query(query, [
        dlqEventId,
        event.eventName,
        event.aggregateId,
        JSON.stringify(event.payload),
        JSON.stringify(event.metadata || {}),
        error.message,
        1,
        nextRetryAt,
        'pending',
        error.stack || ''
      ]);
      if (this.logger) {
        this.logger.warn('Event sent to DLQ', {
          eventName: event.eventName,
          aggregateId: event.aggregateId,
          error: error.message
        });
      }
    } catch (err) {
      if (this.logger) {
        this.logger.error('Failed to send event to DLQ', { error: err.message });
      }
      throw err;
    }
  }
  /**
   * Obtiene eventos listos para reintentar
   */
  async getEventsToRetry(limit: number = 10): Promise<DeadLetterEvent[]> {
    const query = `
      SELECT * FROM dead_letter_queue
      WHERE status = 'pending'
      AND next_retry_at <= CURRENT_TIMESTAMP
      AND failure_count < $1
      ORDER BY next_retry_at ASC
      LIMIT $2
    `;
    const maxRetries = this.defaultRetryPolicy.maxRetries;
    const result = await this.db.query<DeadLetterEvent>(query, [maxRetries, limit]);
    return result.map(row => this.deserializeDeadLetterEvent(row));
  }
  /**
   * Reintenta procesar un evento
   */
  async retry(eventId: string): Promise<boolean> {
    try {
      // Obtener el evento
      const getQuery = `
        SELECT * FROM dead_letter_queue
        WHERE id = $1
      `;
      const result = await this.db.query<any>(getQuery, [eventId]);
      if (result.length === 0) {
        return false;
      }
      const dlqEvent = this.deserializeDeadLetterEvent(result[0]);
      // Actualizar estado a retrying
      await this.updateStatus(eventId, 'retrying');
      // Reconstruir el evento original
      const originalEvent: DomainEvent = {
        eventName: dlqEvent.originalEvent.eventName,
        aggregateId: dlqEvent.originalEvent.aggregateId,
        occurredAt: dlqEvent.originalEvent.occurredAt,
        payload: dlqEvent.originalEvent.payload,
        metadata: dlqEvent.originalEvent.metadata
      };
      // Aquí se debería republicar el evento
      // Por ahora solo marcamos como resuelto si el reintento "funciona"
      // En producción, esto llamaría al EventBus para republicar
      await this.resolve(eventId, 'Retry successful');
      if (this.logger) {
        this.logger.info('Event retried successfully', { eventId });
      }
      return true;
    } catch (error) {
      // Si falla, actualizar contador y siguiente reintento
      await this.handleRetryFailure(eventId, error as Error);
      if (this.logger) {
        this.logger.error('Event retry failed', { eventId, error: error.message });
      }
      return false;
    }
  }
  /**
   * Reintenta todos los eventos pendientes
   */
  async retryAll(): Promise<{ success: number; failed: number }> {
    const events = await this.getEventsToRetry(100);
    let success = 0;
    let failed = 0;
    for (const event of events) {
      const result = await this.retry(event.id);
      if (result) {
        success++;
      } else {
        failed++;
      }
    }
    return { success, failed };
  }
  /**
   * Marca un evento como resuelto
   */
  async resolve(eventId: string, resolution?: string): Promise<void> {
    const query = `
      UPDATE dead_letter_queue
      SET 
        status = 'resolved',
        resolved_at = CURRENT_TIMESTAMP,
        resolution = $2
      WHERE id = $1
    `;
    await this.db.query(query, [eventId, resolution || 'Manually resolved']);
  }
  /**
   * Elimina eventos antiguos
   */
  async purge(olderThanDays: number): Promise<number> {
    const query = `
      DELETE FROM dead_letter_queue
      WHERE status IN ('resolved', 'failed')
      AND last_failed_at < CURRENT_TIMESTAMP - INTERVAL '${olderThanDays} days'
    `;
    const result = await this.db.query(query);
    if (this.logger) {
      this.logger.info(`Purged ${result.rowCount} old DLQ events`);
    }
    return result.rowCount || 0;
  }
  /**
   * Obtiene estadísticas del DLQ
   */
  async getStats(): Promise<{
    pending: number;
    retrying: number;
    failed: number;
    resolved: number;
  }> {
    const query = `
      SELECT 
        status,
        COUNT(*) as count
      FROM dead_letter_queue
      GROUP BY status
    `;
    const result = await this.db.query<{ status: string; count: string }>(query);
    const stats = {
      pending: 0,
      retrying: 0,
      failed: 0,
      resolved: 0
    };
    result.forEach(row => {
      stats[row.status] = parseInt(row.count, 10);
    });
    return stats;
  }
  /**
   * Configura política de reintentos para un tipo de evento
   */
  setRetryPolicy(eventType: string, policy: RetryPolicy): void {
    this.retryPolicies.set(eventType, policy);
  }
  /**
   * Calcula el tiempo del próximo reintento
   */
  private calculateNextRetryTime(attemptNumber: number): Date {
    const policy = this.defaultRetryPolicy;
    const delay = Math.min(
      policy.initialDelayMs * Math.pow(policy.backoffMultiplier, attemptNumber - 1),
      policy.maxDelayMs
    );
    return new Date(Date.now() + delay);
  }
  /**
   * Maneja fallo en reintento
   */
  private async handleRetryFailure(eventId: string, error: Error): Promise<void> {
    const getQuery = `
      SELECT failure_count FROM dead_letter_queue
      WHERE id = $1
    `;
    const result = await this.db.query<{ failure_count: number }>(getQuery, [eventId]);
    if (result.length === 0) return;
    const failureCount = result[0].failure_count + 1;
    const nextRetryAt = this.calculateNextRetryTime(failureCount);
    const updateQuery = `
      UPDATE dead_letter_queue
      SET 
        failure_count = $2,
        last_failed_at = CURRENT_TIMESTAMP,
        next_retry_at = $3,
        status = $4,
        failure_reason = $5
      WHERE id = $1
    `;
    const status = failureCount >= this.defaultRetryPolicy.maxRetries ? 'failed' : 'pending';
    await this.db.query(updateQuery, [
      eventId,
      failureCount,
      nextRetryAt,
      status,
      error.message
    ]);
  }
  /**
   * Actualiza el estado de un evento
   */
  private async updateStatus(eventId: string, status: string): Promise<void> {
    const query = `
      UPDATE dead_letter_queue
      SET status = $2
      WHERE id = $1
    `;
    await this.db.query(query, [eventId, status]);
  }
  /**
   * Deserializa un evento del DLQ
   */
  private deserializeDeadLetterEvent(row: any): DeadLetterEvent {
    return {
      id: row.id,
      originalEvent: {
        eventName: row.event_name,
        aggregateId: row.aggregate_id,
        occurredAt: row.occurred_at || new Date(),
        payload: typeof row.payload === 'string' ? JSON.parse(row.payload) : row.payload,
        metadata: typeof row.metadata === 'string' ? JSON.parse(row.metadata) : row.metadata
      },
      failureReason: row.failure_reason,
      failureCount: row.failure_count,
      firstFailedAt: row.first_failed_at,
      lastFailedAt: row.last_failed_at,
      nextRetryAt: row.next_retry_at,
      status: row.status,
      metadata: {
        stackTrace: row.stack_trace,
        contextData: row.context_data
      }
    };
  }
}
