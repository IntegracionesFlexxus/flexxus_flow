/**
 * CQRS Processor - Sprint 11
 * Implements Command Query Responsibility Segregation pattern
 */

import { injectable, inject } from 'inversify';
import { TYPES } from '@/container/types';
import { Pool } from 'pg';
import { LoggerFactory } from '@/shared/services/logger/LoggerService';
import { EventEmitter } from 'events';
import { EventSourcingEngine, IEvent } from './EventSourcingEngine';

export interface ICommand {
  id: string;
  type: string;
  aggregate_id: string;
  aggregate_type: string;
  payload: Record<string, any>;
  metadata?: Record<string, any>;
  tenant_id?: string;
  user_id?: string;
  correlation_id?: string;
  timestamp: Date;
}

export interface IQuery {
  type: string;
  parameters: Record<string, any>;
  tenant_id?: string;
  user_id?: string;
  pagination?: {
    limit: number;
    offset: number;
  };
  sorting?: {
    field: string;
    direction: 'ASC' | 'DESC';
  }[];
  filters?: Record<string, any>;
}

export interface ICommandResult {
  success: boolean;
  aggregate_id: string;
  events: IEvent[];
  errors?: string[];
  metadata?: Record<string, any>;
  processing_time_ms: number;
}

export interface IQueryResult {
  success: boolean;
  data: any;
  total_count?: number;
  page_info?: {
    has_next_page: boolean;
    has_previous_page: boolean;
    total_pages: number;
  };
  metadata?: Record<string, any>;
  processing_time_ms: number;
}

export interface ICommandHandler {
  handle(command: ICommand): Promise<IEvent[]>;
  canHandle(commandType: string): boolean;
}

export interface IQueryHandler {
  handle(query: IQuery): Promise<any>;
  canHandle(queryType: string): boolean;
}

export interface IAggregate {
  id: string;
  type: string;
  version: number;
  state: Record<string, any>;
  uncommittedEvents: IEvent[];
}

@injectable()
export class CQRSProcessor extends EventEmitter {
  private logger: any;
  private commandHandlers: Map<string, ICommandHandler> = new Map();
  private queryHandlers: Map<string, IQueryHandler> = new Map();
  private aggregateCache: Map<string, IAggregate> = new Map();
  private cacheTimeout = 300000; // 5 minutes

  constructor(
    @inject(TYPES.OmniConnection) private pool: Pool,
    @inject('EventSourcingEngine') private eventSourcingEngine: EventSourcingEngine
  ) {
    super();
    this.logger = LoggerFactory.create({ file: __filename });
  }

  /**
   * Process command
   */
  async processCommand(command: ICommand): Promise<ICommandResult> {
    const startTime = Date.now();

    try {
      // Validate command
      this.validateCommand(command);

      // Find appropriate handler
      const handler = this.findCommandHandler(command.type);
      if (!handler) {
        throw new Error(`No handler found for command type: ${command.type}`);
      }

      // Execute command and get events
      const events = await handler.handle(command);

      // Persist events
      const persistedEvents: IEvent[] = [];
      for (const event of events) {
        const persistedEvent = await this.eventSourcingEngine.appendEvent({
          ...event,
          correlation_id: command.correlation_id,
          causation_id: command.id,
          tenant_id: command.tenant_id
        });
        persistedEvents.push(persistedEvent);
      }

      // Clear aggregate cache
      this.clearAggregateCache(command.aggregate_id);

      const result: ICommandResult = {
        success: true,
        aggregate_id: command.aggregate_id,
        events: persistedEvents,
        processing_time_ms: Date.now() - startTime
      };

      // Emit command processed event
      this.emit('command:processed', {
        command_id: command.id,
        command_type: command.type,
        aggregate_id: command.aggregate_id,
        events_count: persistedEvents.length,
        processing_time: result.processing_time_ms
      });

      this.logger.info('Command processed successfully', {
        command_id: command.id,
        command_type: command.type,
        aggregate_id: command.aggregate_id,
        events_count: persistedEvents.length,
        processing_time: result.processing_time_ms
      });

      return result;
    } catch (error: any) {
      const result: ICommandResult = {
        success: false,
        aggregate_id: command.aggregate_id,
        events: [],
        errors: [error.message],
        processing_time_ms: Date.now() - startTime
      };

      this.emit('command:failed', {
        command_id: command.id,
        command_type: command.type,
        error: error.message
      });

      this.logger.error('Command processing failed', {
        command_id: command.id,
        command_type: command.type,
        error: error.message
      });

      return result;
    }
  }

  /**
   * Process query
   */
  async processQuery(query: IQuery): Promise<IQueryResult> {
    const startTime = Date.now();

    try {
      // Validate query
      this.validateQuery(query);

      // Find appropriate handler
      const handler = this.findQueryHandler(query.type);
      if (!handler) {
        throw new Error(`No handler found for query type: ${query.type}`);
      }

      // Execute query
      const data = await handler.handle(query);

      const result: IQueryResult = {
        success: true,
        data,
        processing_time_ms: Date.now() - startTime
      };

      // Add pagination info if applicable
      if (query.pagination && Array.isArray(data)) {
        const totalCount = await this.getTotalCount(query);
        const totalPages = Math.ceil(totalCount / query.pagination.limit);
        const currentPage = Math.floor(query.pagination.offset / query.pagination.limit) + 1;

        result.total_count = totalCount;
        result.page_info = {
          has_next_page: currentPage < totalPages,
          has_previous_page: currentPage > 1,
          total_pages: totalPages
        };
      }

      this.emit('query:processed', {
        query_type: query.type,
        processing_time: result.processing_time_ms
      });

      this.logger.debug('Query processed successfully', {
        query_type: query.type,
        processing_time: result.processing_time_ms
      });

      return result;
    } catch (error: any) {
      const result: IQueryResult = {
        success: false,
        data: null,
        processing_time_ms: Date.now() - startTime
      };

      this.emit('query:failed', {
        query_type: query.type,
        error: error.message
      });

      this.logger.error('Query processing failed', {
        query_type: query.type,
        error: error.message
      });

      return result;
    }
  }

  /**
   * Load aggregate from event store
   */
  async loadAggregate(aggregateId: string, aggregateType: string): Promise<IAggregate> {
    try {
      const cacheKey = `${aggregateType}:${aggregateId}`;

      // Check cache first
      if (this.aggregateCache.has(cacheKey)) {
        return this.aggregateCache.get(cacheKey)!;
      }

      // Load from event store
      const eventStream = await this.eventSourcingEngine.getEventStream(aggregateId, aggregateType);

      // Reconstruct aggregate state
      let state = eventStream.snapshot?.snapshot_data || {};
      let version = eventStream.snapshot?.version || 0;

      // Apply events to state
      for (const event of eventStream.events) {
        state = this.applyEventToAggregate(state, event, aggregateType);
        version = event.sequence_number!;
      }

      const aggregate: IAggregate = {
        id: aggregateId,
        type: aggregateType,
        version,
        state,
        uncommittedEvents: []
      };

      // Cache aggregate
      this.aggregateCache.set(cacheKey, aggregate);
      setTimeout(() => {
        this.aggregateCache.delete(cacheKey);
      }, this.cacheTimeout);

      return aggregate;
    } catch (error: any) {
      this.logger.error('Failed to load aggregate', error);
      throw error;
    }
  }

  /**
   * Register command handler
   */
  registerCommandHandler(commandType: string, handler: ICommandHandler): void {
    this.commandHandlers.set(commandType, handler);
    this.logger.debug('Command handler registered', { command_type: commandType });
  }

  /**
   * Register query handler
   */
  registerQueryHandler(queryType: string, handler: IQueryHandler): void {
    this.queryHandlers.set(queryType, handler);
    this.logger.debug('Query handler registered', { query_type: queryType });
  }

  /**
   * Create aggregate factory
   */
  createAggregateFactory<T>(
    aggregateType: string,
    createFn: (state: Record<string, any>) => T
  ): (aggregateId: string) => Promise<T> {
    return async (aggregateId: string): Promise<T> => {
      const aggregate = await this.loadAggregate(aggregateId, aggregateType);
      return createFn(aggregate.state);
    };
  }

  /**
   * Create command factory
   */
  createCommand(
    type: string,
    aggregateId: string,
    aggregateType: string,
    payload: Record<string, any>,
    metadata?: Record<string, any>,
    tenantId?: string,
    userId?: string
  ): ICommand {
    return {
      id: this.generateId(),
      type,
      aggregate_id: aggregateId,
      aggregate_type: aggregateType,
      payload,
      metadata,
      tenant_id: tenantId,
      user_id: userId,
      correlation_id: this.generateId(),
      timestamp: new Date()
    };
  }

  /**
   * Create query factory
   */
  createQuery(
    type: string,
    parameters: Record<string, any>,
    tenantId?: string,
    userId?: string,
    pagination?: { limit: number; offset: number }
  ): IQuery {
    return {
      type,
      parameters,
      tenant_id: tenantId,
      user_id: userId,
      pagination
    };
  }

  /**
   * Batch process commands
   */
  async processCommandBatch(commands: ICommand[]): Promise<ICommandResult[]> {
    const results: ICommandResult[] = [];

    // Group commands by aggregate for better performance
    const commandsByAggregate = new Map<string, ICommand[]>();

    commands.forEach(command => {
      const key = `${command.aggregate_type}:${command.aggregate_id}`;
      if (!commandsByAggregate.has(key)) {
        commandsByAggregate.set(key, []);
      }
      commandsByAggregate.get(key)!.push(command);
    });

    // Process commands by aggregate to maintain consistency
    for (const [aggregateKey, aggregateCommands] of commandsByAggregate) {
      for (const command of aggregateCommands) {
        const result = await this.processCommand(command);
        results.push(result);

        // Stop processing if command failed and it's critical
        if (!result.success && command.metadata?.critical) {
          break;
        }
      }
    }

    this.emit('command:batch_processed', {
      total_commands: commands.length,
      successful_commands: results.filter(r => r.success).length,
      failed_commands: results.filter(r => !r.success).length
    });

    return results;
  }

  /**
   * Get aggregate statistics
   */
  async getAggregateStatistics(aggregateType?: string, tenantId?: string): Promise<Record<string, any>> {
    try {
      let query = `
        SELECT
          aggregate_type,
          COUNT(DISTINCT aggregate_id) as total_aggregates,
          COUNT(*) as total_events,
          MAX(sequence_number) as max_sequence,
          MIN(timestamp) as first_event,
          MAX(timestamp) as last_event
        FROM event_store
      `;

      const conditions: string[] = [];
      const values: any[] = [];
      let paramIndex = 1;

      if (aggregateType) {
        conditions.push(`aggregate_type = $${paramIndex}`);
        values.push(aggregateType);
        paramIndex++;
      }

      if (tenantId) {
        conditions.push(`tenant_id = $${paramIndex}`);
        values.push(tenantId);
      }

      if (conditions.length > 0) {
        query += ` WHERE ${conditions.join(' AND ')}`;
      }

      query += ` GROUP BY aggregate_type ORDER BY aggregate_type`;

      const result = await this.pool.query(query, values);

      const statistics: Record<string, any> = {};

      result.rows.forEach(row => {
        statistics[row.aggregate_type] = {
          total_aggregates: parseInt(row.total_aggregates),
          total_events: parseInt(row.total_events),
          max_sequence: parseInt(row.max_sequence),
          first_event: row.first_event,
          last_event: row.last_event,
          events_per_aggregate: parseFloat((parseInt(row.total_events) / parseInt(row.total_aggregates)).toFixed(2))
        };
      });

      return statistics;
    } catch (error: any) {
      this.logger.error('Failed to get aggregate statistics', error);
      return {};
    }
  }

  /**
   * Private helper methods
   */
  private validateCommand(command: ICommand): void {
    if (!command.id || !command.type || !command.aggregate_id || !command.aggregate_type) {
      throw new Error('Command must have id, type, aggregate_id, and aggregate_type');
    }

    if (!command.payload || typeof command.payload !== 'object') {
      throw new Error('Command must have valid payload object');
    }
  }

  private validateQuery(query: IQuery): void {
    if (!query.type) {
      throw new Error('Query must have type');
    }

    if (!query.parameters || typeof query.parameters !== 'object') {
      throw new Error('Query must have valid parameters object');
    }
  }

  private findCommandHandler(commandType: string): ICommandHandler | undefined {
    return this.commandHandlers.get(commandType);
  }

  private findQueryHandler(queryType: string): IQueryHandler | undefined {
    return this.queryHandlers.get(queryType);
  }

  private clearAggregateCache(aggregateId: string): void {
    const keysToDelete: string[] = [];

    this.aggregateCache.forEach((_, key) => {
      if (key.endsWith(`:${aggregateId}`)) {
        keysToDelete.push(key);
      }
    });

    keysToDelete.forEach(key => {
      this.aggregateCache.delete(key);
    });
  }

  private applyEventToAggregate(
    state: Record<string, any>,
    event: IEvent,
    aggregateType: string
  ): Record<string, any> {
    // Default event application logic
    // This should be customized per aggregate type
    const newState = { ...state };

    switch (event.event_type) {
      case 'created':
        return {
          id: event.aggregate_id,
          type: aggregateType,
          ...event.event_data,
          created_at: event.timestamp,
          version: event.sequence_number
        };

      case 'updated':
        return {
          ...newState,
          ...event.event_data,
          updated_at: event.timestamp,
          version: event.sequence_number
        };

      case 'deleted':
        return {
          ...newState,
          deleted: true,
          deleted_at: event.timestamp,
          version: event.sequence_number
        };

      default:
        // Apply event data as state changes
        return {
          ...newState,
          ...event.event_data,
          version: event.sequence_number
        };
    }
  }

  private async getTotalCount(query: IQuery): Promise<number> {
    // This would be implemented based on the specific query handler
    // For now, return a default value
    return 0;
  }

  private generateId(): string {
    return `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Built-in command handlers
   */
  private registerBuiltInHandlers(): void {
    // Generic CRUD command handlers
    this.registerCommandHandler('create_aggregate', new CreateAggregateHandler(this.eventSourcingEngine));
    this.registerCommandHandler('update_aggregate', new UpdateAggregateHandler(this.eventSourcingEngine));
    this.registerCommandHandler('delete_aggregate', new DeleteAggregateHandler(this.eventSourcingEngine));

    // Generic query handlers
    this.registerQueryHandler('get_aggregate', new GetAggregateHandler(this));
    this.registerQueryHandler('list_aggregates', new ListAggregatesHandler(this.pool));
    this.registerQueryHandler('search_aggregates', new SearchAggregatesHandler(this.pool));
  }

  /**
   * Initialize CQRS processor
   */
  async initialize(): Promise<void> {
    this.registerBuiltInHandlers();

    this.logger.info('CQRS Processor initialized');
    this.emit('cqrs:initialized');
  }

  /**
   * Cleanup resources
   */
  async cleanup(): Promise<void> {
    this.commandHandlers.clear();
    this.queryHandlers.clear();
    this.aggregateCache.clear();
    this.removeAllListeners();
    this.logger.info('CQRSProcessor cleaned up');
  }
}

/**
 * Built-in command handlers
 */
class CreateAggregateHandler implements ICommandHandler {
  constructor(private eventSourcingEngine: EventSourcingEngine) {}

  canHandle(commandType: string): boolean {
    return commandType === 'create_aggregate';
  }

  async handle(command: ICommand): Promise<IEvent[]> {
    return [{
      aggregate_id: command.aggregate_id,
      aggregate_type: command.aggregate_type,
      event_type: 'created',
      event_version: 1,
      event_data: command.payload,
      metadata: command.metadata
    }];
  }
}

class UpdateAggregateHandler implements ICommandHandler {
  constructor(private eventSourcingEngine: EventSourcingEngine) {}

  canHandle(commandType: string): boolean {
    return commandType === 'update_aggregate';
  }

  async handle(command: ICommand): Promise<IEvent[]> {
    return [{
      aggregate_id: command.aggregate_id,
      aggregate_type: command.aggregate_type,
      event_type: 'updated',
      event_version: 1,
      event_data: command.payload,
      metadata: command.metadata
    }];
  }
}

class DeleteAggregateHandler implements ICommandHandler {
  constructor(private eventSourcingEngine: EventSourcingEngine) {}

  canHandle(commandType: string): boolean {
    return commandType === 'delete_aggregate';
  }

  async handle(command: ICommand): Promise<IEvent[]> {
    return [{
      aggregate_id: command.aggregate_id,
      aggregate_type: command.aggregate_type,
      event_type: 'deleted',
      event_version: 1,
      event_data: { deleted_by: command.user_id },
      metadata: command.metadata
    }];
  }
}

/**
 * Built-in query handlers
 */
class GetAggregateHandler implements IQueryHandler {
  constructor(private cqrsProcessor: CQRSProcessor) {}

  canHandle(queryType: string): boolean {
    return queryType === 'get_aggregate';
  }

  async handle(query: IQuery): Promise<any> {
    const { aggregate_id, aggregate_type } = query.parameters;
    const aggregate = await this.cqrsProcessor.loadAggregate(aggregate_id, aggregate_type);
    return aggregate.state;
  }
}

class ListAggregatesHandler implements IQueryHandler {
  constructor(private pool: Pool) {}

  canHandle(queryType: string): boolean {
    return queryType === 'list_aggregates';
  }

  async handle(query: IQuery): Promise<any> {
    const { aggregate_type } = query.parameters;

    let sql = `
      SELECT projection_data
      FROM read_projections
      WHERE projection_name = 'aggregate_list'
    `;

    const values: any[] = [];
    let paramIndex = 1;

    if (aggregate_type) {
      sql += ` AND projection_data->>'type' = $${paramIndex}`;
      values.push(aggregate_type);
      paramIndex++;
    }

    if (query.tenant_id) {
      sql += ` AND tenant_id = $${paramIndex}`;
      values.push(query.tenant_id);
      paramIndex++;
    }

    if (query.pagination) {
      sql += ` LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
      values.push(query.pagination.limit, query.pagination.offset);
    }

    const result = await this.pool.query(sql, values);
    return result.rows.map(row => JSON.parse(row.projection_data));
  }
}

class SearchAggregatesHandler implements IQueryHandler {
  constructor(private pool: Pool) {}

  canHandle(queryType: string): boolean {
    return queryType === 'search_aggregates';
  }

  async handle(query: IQuery): Promise<any> {
    // Implementation would depend on specific search requirements
    return [];
  }
}