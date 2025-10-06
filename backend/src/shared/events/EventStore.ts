/**
 * Event Store Implementation
 * Sprint 4 - Persistencia de eventos con PostgreSQL
 */
import { injectable, inject } from 'inversify';
import { TYPES } from '@container/types';
import { IDatabaseConnection } from '@shared/database/interfaces/IDatabaseConnection';
import { IEventStore, StoredEvent, EventStream } from './interfaces/IEventStore';
import { DomainEvent } from './EventBus';
import { Logger } from 'winston';
import { v4 as uuidv4 } from 'uuid';
@injectable()
export class EventStore implements IEventStore {
  private logger?: Logger;
  constructor(
    @inject(TYPES.SharedConnection) private db: IDatabaseConnection
  ) {}
  setLogger(logger: Logger): void {
    this.logger = logger;
  }
  /**
   * Guarda un evento en el store
   */
  async append(event: DomainEvent, streamId: string): Promise<StoredEvent> {
    try {
      // Obtener versión actual del stream
      const versionQuery = `
        SELECT COALESCE(MAX(stream_version), 0) as current_version
        FROM event_store
        WHERE stream_id = $1
      `;
      const versionResult = await this.db.query<{ current_version: number }>(
        versionQuery, 
        [streamId]
      );
      const nextVersion = versionResult[0].current_version + 1;
      const eventId = uuidv4();
      // Insertar evento
      const insertQuery = `
        INSERT INTO event_store (
          id, stream_id, stream_version, event_name, aggregate_id,
          payload, metadata, occurred_at, stored_at
        ) VALUES (
          $1, $2, $3, $4, $5, $6, $7, $8, CURRENT_TIMESTAMP
        )
        RETURNING *
      `;
      const result = await this.db.query<StoredEvent>(insertQuery, [
        eventId,
        streamId,
        nextVersion,
        event.eventName,
        event.aggregateId,
        JSON.stringify(event.payload),
        JSON.stringify(event.metadata || {}),
        event.occurredAt
      ]);
      const storedEvent = result.rows[0];
      if (this.logger) {
        this.logger.info('Event stored', {
          eventId,
          eventName: event.eventName,
          streamId,
          version: nextVersion
        });
      }
      return storedEvent;
    } catch (error) {
      if (this.logger) {
        this.logger.error('Failed to store event', { error: error.message });
      }
      throw error;
    }
  }
  /**
   * Obtiene eventos de un stream específico
   */
  async getEvents(streamId: string, fromVersion?: number): Promise<StoredEvent[]> {
    const query = `
      SELECT * FROM event_store
      WHERE stream_id = $1
      ${fromVersion ? 'AND stream_version >= $2' : ''}
      ORDER BY stream_version ASC
    `;
    const params = fromVersion ? [streamId, fromVersion] : [streamId];
    const result = await this.db.query<StoredEvent>(query, params);
    return result.rows.map(this.deserializeEvent);
  }
  /**
   * Obtiene eventos por ID de agregado
   */
  async getEventsByAggregate(
    aggregateId: string, 
    fromDate?: Date
  ): Promise<StoredEvent[]> {
    const query = `
      SELECT * FROM event_store
      WHERE aggregate_id = $1
      ${fromDate ? 'AND occurred_at >= $2' : ''}
      ORDER BY occurred_at ASC
    `;
    const params = fromDate ? [aggregateId, fromDate] : [aggregateId];
    const result = await this.db.query<StoredEvent>(query, params);
    return result.rows.map(this.deserializeEvent);
  }
  /**
   * Obtiene eventos para replay
   */
  async getEventsForReplay(
    fromDate: Date, 
    toDate?: Date
  ): Promise<StoredEvent[]> {
    const query = `
      SELECT * FROM event_store
      WHERE occurred_at >= $1
      ${toDate ? 'AND occurred_at <= $2' : ''}
      AND processed_at IS NOT NULL
      ORDER BY occurred_at ASC
    `;
    const params = toDate ? [fromDate, toDate] : [fromDate];
    const result = await this.db.query<StoredEvent>(query, params);
    return result.rows.map(this.deserializeEvent);
  }
  /**
   * Marca un evento como procesado
   */
  async markAsProcessed(eventId: string): Promise<void> {
    const query = `
      UPDATE event_store
      SET processed_at = CURRENT_TIMESTAMP
      WHERE id = $1
    `;
    await this.db.query(query, [eventId]);
  }
  /**
   * Obtiene eventos fallidos para reintento
   */
  async getFailedEvents(limit: number = 100): Promise<StoredEvent[]> {
    const query = `
      SELECT * FROM event_store
      WHERE error IS NOT NULL
      AND retry_count < 5
      ORDER BY stored_at ASC
      LIMIT $1
    `;
    const result = await this.db.query<StoredEvent>(query, [limit]);
    return result.rows.map(this.deserializeEvent);
  }
  /**
   * Incrementa el contador de reintentos
   */
  async incrementRetryCount(eventId: string, error: string): Promise<void> {
    const query = `
      UPDATE event_store
      SET 
        retry_count = COALESCE(retry_count, 0) + 1,
        error = $2,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $1
    `;
    await this.db.query(query, [eventId, error]);
  }
  /**
   * Obtiene el último snapshot de un agregado
   */
  async getSnapshot(aggregateId: string): Promise<any> {
    const query = `
      SELECT * FROM event_snapshots
      WHERE aggregate_id = $1
      ORDER BY version DESC
      LIMIT 1
    `;
    const result = await this.db.query<{
      aggregate_id: string;
      snapshot_data: any;
      version: number;
      created_at: Date;
    }>(query, [aggregateId]);
    if (result.rows.length === 0) {
      return null;
    }
    return {
      data: result.rows[0].snapshot_data,
      version: result.rows[0].version,
      createdAt: result.rows[0].created_at
    };
  }
  /**
   * Guarda un snapshot
   */
  async saveSnapshot(
    aggregateId: string, 
    snapshot: any, 
    version: number
  ): Promise<void> {
    const query = `
      INSERT INTO event_snapshots (
        aggregate_id, snapshot_data, version, created_at
      ) VALUES ($1, $2, $3, CURRENT_TIMESTAMP)
      ON CONFLICT (aggregate_id, version) 
      DO UPDATE SET 
        snapshot_data = EXCLUDED.snapshot_data,
        created_at = CURRENT_TIMESTAMP
    `;
    await this.db.query(query, [
      aggregateId,
      JSON.stringify(snapshot),
      version
    ]);
    if (this.logger) {
      this.logger.info('Snapshot saved', { aggregateId, version });
    }
  }
  /**
   * Deserializa un evento desde la base de datos
   */
  private deserializeEvent(row: any): StoredEvent {
    return {
      id: row.id,
      streamId: row.stream_id,
      streamVersion: row.stream_version,
      eventName: row.event_name,
      aggregateId: row.aggregate_id,
      occurredAt: row.occurred_at,
      payload: typeof row.payload === 'string' ? JSON.parse(row.payload) : row.payload,
      metadata: typeof row.metadata === 'string' ? JSON.parse(row.metadata) : row.metadata,
      storedAt: row.stored_at,
      processedAt: row.processed_at,
      retryCount: row.retry_count,
      error: row.error
    };
  }
}
