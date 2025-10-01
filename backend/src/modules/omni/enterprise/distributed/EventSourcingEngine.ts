/**
 * Event Sourcing Engine - Sprint 11
 * Manages event store, snapshots, and event replay for audit and state reconstruction
 */

import { injectable, inject } from 'inversify';
import { TYPES } from '@/container/types';
import { Pool } from 'pg';
import { LoggerFactory } from '@/shared/services/logger/LoggerService';
import { EventEmitter } from 'events';

export interface IEvent {
  id?: string;
  aggregate_id: string;
  aggregate_type: string;
  event_type: string;
  event_version: number;
  event_data: Record<string, any>;
  metadata?: Record<string, any>;
  sequence_number?: number;
  tenant_id?: string;
  correlation_id?: string;
  causation_id?: string;
  timestamp?: Date;
  processed?: boolean;
}

export interface ISnapshot {
  id?: string;
  aggregate_id: string;
  aggregate_type: string;
  snapshot_data: Record<string, any>;
  version: number;
  tenant_id?: string;
  created_at?: Date;
}

export interface IEventStream {
  aggregate_id: string;
  aggregate_type: string;
  events: IEvent[];
  current_version: number;
  snapshot?: ISnapshot;
}

export interface IEventQuery {
  aggregate_id?: string;
  aggregate_type?: string;
  event_type?: string;
  tenant_id?: string;
  from_sequence?: number;
  to_sequence?: number;
  from_timestamp?: Date;
  to_timestamp?: Date;
  correlation_id?: string;
  limit?: number;
  offset?: number;
}

export interface IEventProjection {
  name: string;
  aggregate_id: string;
  data: Record<string, any>;
  version: number;
  last_updated: Date;
}

@injectable()
export class EventSourcingEngine extends EventEmitter {
  private logger: any;
  private snapshotThreshold = 10; // Create snapshot every N events
  private eventHandlers: Map<string, Function[]> = new Map();
  private projectionHandlers: Map<string, Function> = new Map();

  constructor(
    @inject(TYPES.OmniConnection) private pool: Pool
  ) {
    super();
    this.logger = LoggerFactory.create({ file: __filename });
  }

  /**
   * Append event to event store
   */
  async appendEvent(event: Omit<IEvent, 'id' | 'sequence_number' | 'timestamp'>): Promise<IEvent> {
    const startTime = Date.now();

    try {
      // Validate event
      this.validateEvent(event);

      // Use stored procedure for atomic append
      const query = `
        SELECT append_event($1, $2, $3, $4, $5, $6) as event_id;
      `;

      const result = await this.pool.query(query, [
        event.aggregate_id,
        event.aggregate_type,
        event.event_type,
        JSON.stringify(event.event_data),
        event.tenant_id,
        event.correlation_id
      ]);

      const eventId = result.rows[0].event_id;

      // Get the complete event
      const createdEvent = await this.getEvent(eventId);

      if (!createdEvent) {
        throw new Error('Failed to retrieve created event');
      }

      // Process event handlers
      await this.processEventHandlers(createdEvent);

      // Update projections
      await this.updateProjections(createdEvent);

      // Check if snapshot is needed
      await this.checkSnapshotCreation(event.aggregate_id, event.aggregate_type);

      // Emit event
      this.emit('event:appended', {
        event_id: eventId,
        aggregate_id: event.aggregate_id,
        event_type: event.event_type,
        processing_time: Date.now() - startTime
      });

      this.logger.info('Event appended successfully', {
        event_id: eventId,
        aggregate_id: event.aggregate_id,
        event_type: event.event_type,
        processing_time: Date.now() - startTime
      });

      return createdEvent;
    } catch (error: any) {
      this.logger.error('Failed to append event', error);
      throw error;
    }
  }

  /**
   * Append multiple events as a batch (transaction)
   */
  async appendEvents(events: Omit<IEvent, 'id' | 'sequence_number' | 'timestamp'>[]): Promise<IEvent[]> {
    const client = await this.pool.connect();

    try {
      await client.query('BEGIN');

      const appendedEvents: IEvent[] = [];

      for (const event of events) {
        const query = `
          SELECT append_event($1, $2, $3, $4, $5, $6) as event_id;
        `;

        const result = await client.query(query, [
          event.aggregate_id,
          event.aggregate_type,
          event.event_type,
          JSON.stringify(event.event_data),
          event.tenant_id,
          event.correlation_id
        ]);

        const eventId = result.rows[0].event_id;
        const createdEvent = await this.getEvent(eventId, client);

        if (createdEvent) {
          appendedEvents.push(createdEvent);
        }
      }

      await client.query('COMMIT');

      // Process all events after commit
      for (const event of appendedEvents) {
        await this.processEventHandlers(event);
        await this.updateProjections(event);
      }

      this.emit('events:batch_appended', {
        count: appendedEvents.length,
        aggregate_ids: [...new Set(appendedEvents.map(e => e.aggregate_id))]
      });

      return appendedEvents;
    } catch (error: any) {
      await client.query('ROLLBACK');
      this.logger.error('Failed to append event batch', error);
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Get event stream for aggregate
   */
  async getEventStream(
    aggregateId: string,
    aggregateType: string,
    fromVersion?: number
  ): Promise<IEventStream> {
    try {
      // Get latest snapshot if available
      const snapshot = await this.getLatestSnapshot(aggregateId, aggregateType);

      // Determine starting point
      const startVersion = Math.max(fromVersion || 0, snapshot?.version || 0);

      // Get events after snapshot
      const query = `
        SELECT * FROM event_store
        WHERE aggregate_id = $1
          AND aggregate_type = $2
          AND sequence_number > $3
        ORDER BY sequence_number ASC;
      `;

      const result = await this.pool.query(query, [aggregateId, aggregateType, startVersion]);

      const events = result.rows.map(row => ({
        ...row,
        event_data: JSON.parse(row.event_data),
        metadata: row.metadata ? JSON.parse(row.metadata) : {}
      }));

      const currentVersion = events.length > 0
        ? events[events.length - 1].sequence_number
        : snapshot?.version || 0;

      return {
        aggregate_id: aggregateId,
        aggregate_type: aggregateType,
        events,
        current_version: currentVersion,
        snapshot
      };
    } catch (error: any) {
      this.logger.error('Failed to get event stream', error);
      throw error;
    }
  }

  /**
   * Query events with filters
   */
  async queryEvents(query: IEventQuery): Promise<IEvent[]> {
    try {
      const conditions: string[] = [];
      const values: any[] = [];
      let paramIndex = 1;

      if (query.aggregate_id) {
        conditions.push(`aggregate_id = $${paramIndex}`);
        values.push(query.aggregate_id);
        paramIndex++;
      }

      if (query.aggregate_type) {
        conditions.push(`aggregate_type = $${paramIndex}`);
        values.push(query.aggregate_type);
        paramIndex++;
      }

      if (query.event_type) {
        conditions.push(`event_type = $${paramIndex}`);
        values.push(query.event_type);
        paramIndex++;
      }

      if (query.tenant_id) {
        conditions.push(`tenant_id = $${paramIndex}`);
        values.push(query.tenant_id);
        paramIndex++;
      }

      if (query.from_sequence) {
        conditions.push(`sequence_number >= $${paramIndex}`);
        values.push(query.from_sequence);
        paramIndex++;
      }

      if (query.to_sequence) {
        conditions.push(`sequence_number <= $${paramIndex}`);
        values.push(query.to_sequence);
        paramIndex++;
      }

      if (query.from_timestamp) {
        conditions.push(`timestamp >= $${paramIndex}`);
        values.push(query.from_timestamp);
        paramIndex++;
      }

      if (query.to_timestamp) {
        conditions.push(`timestamp <= $${paramIndex}`);
        values.push(query.to_timestamp);
        paramIndex++;
      }

      if (query.correlation_id) {
        conditions.push(`correlation_id = $${paramIndex}`);
        values.push(query.correlation_id);
        paramIndex++;
      }

      let sql = `
        SELECT * FROM event_store
        ${conditions.length > 0 ? 'WHERE ' + conditions.join(' AND ') : ''}
        ORDER BY sequence_number ASC
      `;

      if (query.limit) {
        sql += ` LIMIT $${paramIndex}`;
        values.push(query.limit);
        paramIndex++;
      }

      if (query.offset) {
        sql += ` OFFSET $${paramIndex}`;
        values.push(query.offset);
      }

      const result = await this.pool.query(sql, values);

      return result.rows.map(row => ({
        ...row,
        event_data: JSON.parse(row.event_data),
        metadata: row.metadata ? JSON.parse(row.metadata) : {}
      }));
    } catch (error: any) {
      this.logger.error('Failed to query events', error);
      throw error;
    }
  }

  /**
   * Create snapshot
   */
  async createSnapshot(snapshot: Omit<ISnapshot, 'id' | 'created_at'>): Promise<ISnapshot> {
    try {
      const query = `
        INSERT INTO aggregate_snapshots (
          aggregate_id,
          aggregate_type,
          snapshot_data,
          version,
          tenant_id
        ) VALUES ($1, $2, $3, $4, $5)
        RETURNING *;
      `;

      const result = await this.pool.query(query, [
        snapshot.aggregate_id,
        snapshot.aggregate_type,
        JSON.stringify(snapshot.snapshot_data),
        snapshot.version,
        snapshot.tenant_id
      ]);

      const createdSnapshot = result.rows[0];

      // Clean up old snapshots (keep last 5)
      await this.cleanupOldSnapshots(snapshot.aggregate_id, snapshot.aggregate_type);

      this.emit('snapshot:created', {
        aggregate_id: snapshot.aggregate_id,
        version: snapshot.version
      });

      this.logger.info('Snapshot created successfully', {
        aggregate_id: snapshot.aggregate_id,
        version: snapshot.version
      });

      return {
        ...createdSnapshot,
        snapshot_data: JSON.parse(createdSnapshot.snapshot_data)
      };
    } catch (error: any) {
      this.logger.error('Failed to create snapshot', error);
      throw error;
    }
  }

  /**
   * Get latest snapshot
   */
  async getLatestSnapshot(aggregateId: string, aggregateType: string): Promise<ISnapshot | null> {
    try {
      const query = `
        SELECT * FROM aggregate_snapshots
        WHERE aggregate_id = $1 AND aggregate_type = $2
        ORDER BY version DESC
        LIMIT 1;
      `;

      const result = await this.pool.query(query, [aggregateId, aggregateType]);

      if (result.rows.length === 0) {
        return null;
      }

      const snapshot = result.rows[0];
      return {
        ...snapshot,
        snapshot_data: JSON.parse(snapshot.snapshot_data)
      };
    } catch (error: any) {
      this.logger.error('Failed to get latest snapshot', error);
      return null;
    }
  }

  /**
   * Replay events to reconstruct aggregate state
   */
  async replayEvents(
    aggregateId: string,
    aggregateType: string,
    toVersion?: number
  ): Promise<Record<string, any>> {
    try {
      const eventStream = await this.getEventStream(aggregateId, aggregateType);

      // Start with snapshot if available
      let state = eventStream.snapshot?.snapshot_data || {};

      // Apply events to reconstruct state
      const eventsToApply = toVersion
        ? eventStream.events.filter(e => e.sequence_number! <= toVersion)
        : eventStream.events;

      for (const event of eventsToApply) {
        state = this.applyEventToState(state, event);
      }

      this.logger.debug('Events replayed successfully', {
        aggregate_id: aggregateId,
        events_applied: eventsToApply.length,
        final_version: toVersion || eventStream.current_version
      });

      return state;
    } catch (error: any) {
      this.logger.error('Failed to replay events', error);
      throw error;
    }
  }

  /**
   * Register event handler
   */
  registerEventHandler(eventType: string, handler: Function): void {
    if (!this.eventHandlers.has(eventType)) {
      this.eventHandlers.set(eventType, []);
    }

    this.eventHandlers.get(eventType)!.push(handler);

    this.logger.debug('Event handler registered', { event_type: eventType });
  }

  /**
   * Register projection handler
   */
  registerProjectionHandler(projectionName: string, handler: Function): void {
    this.projectionHandlers.set(projectionName, handler);

    this.logger.debug('Projection handler registered', { projection_name: projectionName });
  }

  /**
   * Get projection
   */
  async getProjection(projectionName: string, aggregateId: string): Promise<IEventProjection | null> {
    try {
      const query = `
        SELECT * FROM read_projections
        WHERE projection_name = $1 AND aggregate_id = $2;
      `;

      const result = await this.pool.query(query, [projectionName, aggregateId]);

      if (result.rows.length === 0) {
        return null;
      }

      const projection = result.rows[0];
      return {
        name: projection.projection_name,
        aggregate_id: projection.aggregate_id,
        data: JSON.parse(projection.projection_data),
        version: projection.version,
        last_updated: projection.last_updated
      };
    } catch (error: any) {
      this.logger.error('Failed to get projection', error);
      return null;
    }
  }

  /**
   * Rebuild projection from events
   */
  async rebuildProjection(projectionName: string, aggregateId?: string): Promise<void> {
    try {
      const handler = this.projectionHandlers.get(projectionName);
      if (!handler) {
        throw new Error(`No handler registered for projection: ${projectionName}`);
      }

      // Get events to process
      const query: IEventQuery = aggregateId ? { aggregate_id: aggregateId } : {};
      const events = await this.queryEvents(query);

      // Group events by aggregate
      const eventsByAggregate = new Map<string, IEvent[]>();
      events.forEach(event => {
        if (!eventsByAggregate.has(event.aggregate_id)) {
          eventsByAggregate.set(event.aggregate_id, []);
        }
        eventsByAggregate.get(event.aggregate_id)!.push(event);
      });

      // Rebuild projections
      for (const [aggId, aggEvents] of eventsByAggregate) {
        await this.rebuildSingleProjection(projectionName, aggId, aggEvents, handler);
      }

      this.logger.info('Projection rebuilt successfully', {
        projection_name: projectionName,
        aggregates_processed: eventsByAggregate.size
      });
    } catch (error: any) {
      this.logger.error('Failed to rebuild projection', error);
      throw error;
    }
  }

  /**
   * Private helper methods
   */
  private validateEvent(event: Partial<IEvent>): void {
    if (!event.aggregate_id || !event.aggregate_type || !event.event_type) {
      throw new Error('Event must have aggregate_id, aggregate_type, and event_type');
    }

    if (!event.event_data || typeof event.event_data !== 'object') {
      throw new Error('Event must have valid event_data object');
    }
  }

  private async getEvent(eventId: string, client?: any): Promise<IEvent | null> {
    const connection = client || this.pool;

    const query = `SELECT * FROM event_store WHERE id = $1`;
    const result = await connection.query(query, [eventId]);

    if (result.rows.length === 0) {
      return null;
    }

    const event = result.rows[0];
    return {
      ...event,
      event_data: JSON.parse(event.event_data),
      metadata: event.metadata ? JSON.parse(event.metadata) : {}
    };
  }

  private async processEventHandlers(event: IEvent): Promise<void> {
    const handlers = this.eventHandlers.get(event.event_type) || [];

    for (const handler of handlers) {
      try {
        await handler(event);
      } catch (error: any) {
        this.logger.error('Event handler failed', {
          event_type: event.event_type,
          event_id: event.id,
          error: error.message
        });
      }
    }
  }

  private async updateProjections(event: IEvent): Promise<void> {
    for (const [projectionName, handler] of this.projectionHandlers) {
      try {
        await this.updateSingleProjection(projectionName, event, handler);
      } catch (error: any) {
        this.logger.error('Projection update failed', {
          projection_name: projectionName,
          event_id: event.id,
          error: error.message
        });
      }
    }
  }

  private async updateSingleProjection(
    projectionName: string,
    event: IEvent,
    handler: Function
  ): Promise<void> {
    // Get current projection
    const currentProjection = await this.getProjection(projectionName, event.aggregate_id);

    // Apply event to projection
    const updatedData = await handler(currentProjection?.data || {}, event);

    // Save updated projection
    const query = `
      INSERT INTO read_projections (
        projection_name,
        aggregate_id,
        projection_data,
        version,
        tenant_id
      ) VALUES ($1, $2, $3, $4, $5)
      ON CONFLICT (projection_name, aggregate_id)
      DO UPDATE SET
        projection_data = EXCLUDED.projection_data,
        version = EXCLUDED.version,
        last_updated = CURRENT_TIMESTAMP;
    `;

    await this.pool.query(query, [
      projectionName,
      event.aggregate_id,
      JSON.stringify(updatedData),
      event.sequence_number,
      event.tenant_id
    ]);
  }

  private async rebuildSingleProjection(
    projectionName: string,
    aggregateId: string,
    events: IEvent[],
    handler: Function
  ): Promise<void> {
    let projectionData = {};

    // Apply all events in sequence
    for (const event of events) {
      projectionData = await handler(projectionData, event);
    }

    // Save final projection
    const lastEvent = events[events.length - 1];
    if (lastEvent) {
      const query = `
        INSERT INTO read_projections (
          projection_name,
          aggregate_id,
          projection_data,
          version,
          tenant_id
        ) VALUES ($1, $2, $3, $4, $5)
        ON CONFLICT (projection_name, aggregate_id)
        DO UPDATE SET
          projection_data = EXCLUDED.projection_data,
          version = EXCLUDED.version,
          last_updated = CURRENT_TIMESTAMP;
      `;

      await this.pool.query(query, [
        projectionName,
        aggregateId,
        JSON.stringify(projectionData),
        lastEvent.sequence_number,
        lastEvent.tenant_id
      ]);
    }
  }

  private async checkSnapshotCreation(aggregateId: string, aggregateType: string): Promise<void> {
    // Get current event count since last snapshot
    const latestSnapshot = await this.getLatestSnapshot(aggregateId, aggregateType);
    const startVersion = latestSnapshot?.version || 0;

    const query = `
      SELECT COUNT(*) as event_count
      FROM event_store
      WHERE aggregate_id = $1
        AND aggregate_type = $2
        AND sequence_number > $3;
    `;

    const result = await this.pool.query(query, [aggregateId, aggregateType, startVersion]);
    const eventCount = parseInt(result.rows[0].event_count);

    if (eventCount >= this.snapshotThreshold) {
      // Create snapshot
      const currentState = await this.replayEvents(aggregateId, aggregateType);

      await this.createSnapshot({
        aggregate_id: aggregateId,
        aggregate_type: aggregateType,
        snapshot_data: currentState,
        version: startVersion + eventCount
      });
    }
  }

  private async cleanupOldSnapshots(aggregateId: string, aggregateType: string): Promise<void> {
    const query = `
      DELETE FROM aggregate_snapshots
      WHERE aggregate_id = $1
        AND aggregate_type = $2
        AND id NOT IN (
          SELECT id FROM aggregate_snapshots
          WHERE aggregate_id = $1 AND aggregate_type = $2
          ORDER BY version DESC
          LIMIT 5
        );
    `;

    await this.pool.query(query, [aggregateId, aggregateType]);
  }

  private applyEventToState(state: Record<string, any>, event: IEvent): Record<string, any> {
    // Basic event application - should be customized per aggregate type
    const newState = { ...state };

    switch (event.event_type) {
      case 'created':
        return { ...event.event_data, id: event.aggregate_id };

      case 'updated':
        return { ...newState, ...event.event_data };

      case 'deleted':
        return { ...newState, deleted: true, deleted_at: event.timestamp };

      default:
        // Apply event data as state changes
        return { ...newState, ...event.event_data };
    }
  }

  /**
   * Cleanup resources
   */
  async cleanup(): Promise<void> {
    this.eventHandlers.clear();
    this.projectionHandlers.clear();
    this.removeAllListeners();
    this.logger.info('EventSourcingEngine cleaned up');
  }
}