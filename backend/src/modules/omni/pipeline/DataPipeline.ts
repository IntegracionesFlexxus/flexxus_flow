/**
 * Data Pipeline - Sprint 08
 * ETL and data processing pipeline for analytics
 */

import { injectable, inject } from 'inversify';
import { TYPES } from '@/container/types';
import { Pool } from 'pg';
import { Queue, Worker, Job } from 'bullmq';
import {
  IPipeline,
  IPipelineExecution,
  IETLJob,
  ITransformation
} from './interfaces/IPipeline';
import { LoggerFactory } from '@/shared/services/logger/LoggerService';
import { EventEmitter } from 'events';
import * as cron from 'node-cron';

@injectable()
export class DataPipeline extends EventEmitter {
  private logger: any;
  private pipelines: Map<string, IPipeline> = new Map();
  private schedules: Map<string, cron.ScheduledTask> = new Map();
  private etlQueue: Queue;
  private etlWorker: Worker;
  private transformations: Map<string, ITransformation> = new Map();

  constructor(
    @inject(TYPES.AnalyticsConnection) private analyticsPool: Pool,
    @inject(TYPES.OmniConnection) private omniPool: Pool,
    @inject(TYPES.RedisClient) private redis: any
  ) {
    super();
    this.logger = LoggerFactory.create({ file: __filename });
    this.initializeQueue();
    this.registerTransformations();
    this.loadPipelines();
  }

  /**
   * Initialize ETL queue
   */
  private initializeQueue(): void {
    this.etlQueue = new Queue('etl-jobs', {
      connection: this.redis
    });

    this.etlWorker = new Worker(
      'etl-jobs',
      async (job: Job) => await this.processETLJob(job),
      {
        connection: this.redis,
        concurrency: 3
      }
    );

    this.etlWorker.on('completed', (job) => {
      this.logger.info('ETL job completed', { jobId: job.id });
      this.emit('job-completed', job.id);
    });

    this.etlWorker.on('failed', (job, err) => {
      this.logger.error('ETL job failed', { jobId: job?.id, error: err });
      this.emit('job-failed', job?.id, err);
    });
  }

  /**
   * Register built-in transformations
   */
  private registerTransformations(): void {
    // Aggregate transformation
    this.transformations.set('aggregate', {
      name: 'aggregate',
      type: 'aggregation',
      execute: async (data: any[], params: any) => {
        const { groupBy, metrics } = params;
        const grouped = new Map();

        data.forEach(row => {
          const key = groupBy.map((field: string) => row[field]).join(':');
          if (!grouped.has(key)) {
            grouped.set(key, []);
          }
          grouped.get(key).push(row);
        });

        const result = [];
        grouped.forEach((rows, key) => {
          const aggregated: any = {};
          groupBy.forEach((field: string, index: number) => {
            aggregated[field] = key.split(':')[index];
          });

          metrics.forEach((metric: any) => {
            const values = rows.map((r: any) => r[metric.field]);
            switch (metric.function) {
              case 'sum':
                aggregated[metric.alias] = values.reduce((a: number, b: number) => a + b, 0);
                break;
              case 'avg':
                aggregated[metric.alias] = values.reduce((a: number, b: number) => a + b, 0) / values.length;
                break;
              case 'count':
                aggregated[metric.alias] = values.length;
                break;
              case 'min':
                aggregated[metric.alias] = Math.min(...values);
                break;
              case 'max':
                aggregated[metric.alias] = Math.max(...values);
                break;
            }
          });

          result.push(aggregated);
        });

        return result;
      }
    });

    // Filter transformation
    this.transformations.set('filter', {
      name: 'filter',
      type: 'filter',
      execute: async (data: any[], params: any) => {
        const { conditions } = params;
        return data.filter(row => {
          return conditions.every((condition: any) => {
            const value = row[condition.field];
            switch (condition.operator) {
              case 'eq':
                return value === condition.value;
              case 'neq':
                return value !== condition.value;
              case 'gt':
                return value > condition.value;
              case 'gte':
                return value >= condition.value;
              case 'lt':
                return value < condition.value;
              case 'lte':
                return value <= condition.value;
              case 'contains':
                return String(value).includes(condition.value);
              case 'in':
                return condition.value.includes(value);
              default:
                return true;
            }
          });
        });
      }
    });

    // Map transformation
    this.transformations.set('map', {
      name: 'map',
      type: 'mapping',
      execute: async (data: any[], params: any) => {
        const { mappings } = params;
        return data.map(row => {
          const mapped: any = {};
          mappings.forEach((mapping: any) => {
            if (mapping.type === 'rename') {
              mapped[mapping.to] = row[mapping.from];
            } else if (mapping.type === 'compute') {
              // Simple expression evaluation
              mapped[mapping.to] = this.evaluateExpression(mapping.expression, row);
            } else {
              mapped[mapping.to] = row[mapping.from];
            }
          });
          return mapped;
        });
      }
    });

    // Join transformation
    this.transformations.set('join', {
      name: 'join',
      type: 'join',
      execute: async (data: any[], params: any) => {
        const { rightData, leftKey, rightKey, type = 'inner' } = params;
        const rightMap = new Map();
        
        rightData.forEach((row: any) => {
          const key = row[rightKey];
          if (!rightMap.has(key)) {
            rightMap.set(key, []);
          }
          rightMap.get(key).push(row);
        });

        const result = [];
        data.forEach(leftRow => {
          const key = leftRow[leftKey];
          const rightRows = rightMap.get(key) || [];

          if (rightRows.length > 0) {
            rightRows.forEach(rightRow => {
              result.push({ ...leftRow, ...rightRow });
            });
          } else if (type === 'left') {
            result.push(leftRow);
          }
        });

        return result;
      }
    });

    this.logger.info('Transformations registered', { count: this.transformations.size });
  }

  /**
   * Create a new pipeline
   */
  async createPipeline(
    companyId: string,
    pipeline: Partial<IPipeline>
  ): Promise<IPipeline> {
    try {
      const query = `
        INSERT INTO data_pipelines (
          company_id, name, description, type,
          source_config, transform_config, destination_config,
          schedule, is_active, metadata
        ) VALUES (
          $1, $2, $3, $4, $5, $6, $7, $8, $9, $10
        ) RETURNING *;
      `;

      const result = await this.analyticsPool.query(query, [
        companyId,
        pipeline.name,
        pipeline.description,
        pipeline.type || 'etl',
        JSON.stringify(pipeline.source_config),
        JSON.stringify(pipeline.transform_config),
        JSON.stringify(pipeline.destination_config),
        pipeline.schedule,
        pipeline.is_active !== false,
        JSON.stringify(pipeline.metadata || {})
      ]);

      const newPipeline = this.mapRowToPipeline(result.rows[0]);
      this.pipelines.set(newPipeline.id, newPipeline);

      // Schedule if active
      if (newPipeline.is_active && newPipeline.schedule) {
        this.schedulePipeline(newPipeline);
      }

      this.logger.info('Pipeline created', { id: newPipeline.id, name: newPipeline.name });
      return newPipeline;
    } catch (error: any) {
      this.logger.error('Failed to create pipeline', error);
      throw error;
    }
  }

  /**
   * Execute a pipeline
   */
  async execute(
    pipelineId: string,
    params?: any
  ): Promise<IPipelineExecution> {
    const pipeline = this.pipelines.get(pipelineId);
    if (!pipeline) {
      throw new Error(`Pipeline ${pipelineId} not found`);
    }

    const execution: IPipelineExecution = {
      id: this.generateId(),
      pipeline_id: pipelineId,
      status: 'running',
      started_at: new Date(),
      parameters: params || {},
      logs: [],
      metrics: {
        rows_processed: 0,
        rows_failed: 0,
        duration_ms: 0
      }
    };

    try {
      // Record execution start
      await this.recordExecution(execution);
      this.emit('pipeline-started', execution);

      // Extract
      this.log(execution, 'info', 'Starting extraction phase');
      const extractedData = await this.extract(pipeline.source_config);
      this.log(execution, 'info', `Extracted ${extractedData.length} rows`);
      execution.metrics.rows_processed = extractedData.length;

      // Transform
      this.log(execution, 'info', 'Starting transformation phase');
      const transformedData = await this.transform(
        extractedData,
        pipeline.transform_config
      );
      this.log(execution, 'info', `Transformed ${transformedData.length} rows`);

      // Load
      this.log(execution, 'info', 'Starting load phase');
      await this.load(transformedData, pipeline.destination_config);
      this.log(execution, 'info', 'Load phase completed');

      // Update execution
      execution.status = 'completed';
      execution.completed_at = new Date();
      execution.metrics.duration_ms = 
        execution.completed_at.getTime() - execution.started_at.getTime();

      await this.updateExecution(execution);
      this.emit('pipeline-completed', execution);

      return execution;
    } catch (error: any) {
      this.log(execution, 'error', `Pipeline failed: ${error.message}`);
      execution.status = 'failed';
      execution.error = error.message;
      execution.completed_at = new Date();
      execution.metrics.duration_ms = 
        execution.completed_at.getTime() - execution.started_at.getTime();

      await this.updateExecution(execution);
      this.emit('pipeline-failed', execution, error);

      throw error;
    }
  }

  /**
   * Extract data from source
   */
  private async extract(sourceConfig: any): Promise<any[]> {
    const { type, config } = sourceConfig;

    switch (type) {
      case 'database':
        return await this.extractFromDatabase(config);
      case 'api':
        return await this.extractFromAPI(config);
      case 'file':
        return await this.extractFromFile(config);
      default:
        throw new Error(`Unknown source type: ${type}`);
    }
  }

  /**
   * Extract from database
   */
  private async extractFromDatabase(config: any): Promise<any[]> {
    const { connection, query, parameters = [] } = config;
    let pool: Pool;

    switch (connection) {
      case 'omni':
        pool = this.omniPool;
        break;
      case 'analytics':
        pool = this.analyticsPool;
        break;
      default:
        throw new Error(`Unknown connection: ${connection}`);
    }

    const result = await pool.query(query, parameters);
    return result.rows;
  }

  /**
   * Extract from API
   */
  private async extractFromAPI(config: any): Promise<any[]> {
    // Mock API extraction
    const { endpoint, method = 'GET', headers = {}, params = {} } = config;
    
    // In real implementation, would make HTTP request
    this.logger.info('Mock API extraction', { endpoint, method });
    
    // Return mock data
    return [
      { id: 1, value: 100, timestamp: new Date() },
      { id: 2, value: 200, timestamp: new Date() },
      { id: 3, value: 300, timestamp: new Date() }
    ];
  }

  /**
   * Extract from file
   */
  private async extractFromFile(config: any): Promise<any[]> {
    // Mock file extraction
    const { path, format = 'json' } = config;
    
    this.logger.info('Mock file extraction', { path, format });
    
    // Return mock data
    return [
      { id: 1, name: 'Item 1', count: 10 },
      { id: 2, name: 'Item 2', count: 20 },
      { id: 3, name: 'Item 3', count: 30 }
    ];
  }

  /**
   * Transform data
   */
  private async transform(
    data: any[],
    transformConfig: any
  ): Promise<any[]> {
    let result = data;
    const { steps = [] } = transformConfig;

    for (const step of steps) {
      const transformation = this.transformations.get(step.type);
      if (!transformation) {
        throw new Error(`Unknown transformation: ${step.type}`);
      }

      result = await transformation.execute(result, step.params);
    }

    return result;
  }

  /**
   * Load data to destination
   */
  private async load(
    data: any[],
    destinationConfig: any
  ): Promise<void> {
    const { type, config } = destinationConfig;

    switch (type) {
      case 'database':
        await this.loadToDatabase(data, config);
        break;
      case 'cache':
        await this.loadToCache(data, config);
        break;
      case 'webhook':
        await this.loadToWebhook(data, config);
        break;
      default:
        throw new Error(`Unknown destination type: ${type}`);
    }
  }

  /**
   * Load to database
   */
  private async loadToDatabase(data: any[], config: any): Promise<void> {
    const { connection, table, mode = 'append' } = config;
    let pool: Pool;

    switch (connection) {
      case 'omni':
        pool = this.omniPool;
        break;
      case 'analytics':
        pool = this.analyticsPool;
        break;
      default:
        throw new Error(`Unknown connection: ${connection}`);
    }

    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      // Clear table if replace mode
      if (mode === 'replace') {
        await client.query(`TRUNCATE TABLE ${table}`);
      }

      // Insert data
      for (const row of data) {
        const keys = Object.keys(row);
        const values = Object.values(row);
        const placeholders = keys.map((_, i) => `$${i + 1}`).join(', ');

        const query = `
          INSERT INTO ${table} (${keys.join(', ')})
          VALUES (${placeholders})
          ON CONFLICT DO NOTHING;
        `;

        await client.query(query, values);
      }

      await client.query('COMMIT');
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Load to cache
   */
  private async loadToCache(data: any[], config: any): Promise<void> {
    const { key, ttl = 3600 } = config;
    await this.redis.setex(key, ttl, JSON.stringify(data));
  }

  /**
   * Load to webhook
   */
  private async loadToWebhook(data: any[], config: any): Promise<void> {
    // Mock webhook call
    const { url, headers = {} } = config;
    this.logger.info('Mock webhook load', { url, dataCount: data.length });
    // In real implementation, would make HTTP POST request
  }

  /**
   * Schedule a pipeline
   */
  private schedulePipeline(pipeline: IPipeline): void {
    if (!pipeline.schedule || !cron.validate(pipeline.schedule)) {
      return;
    }

    const task = cron.schedule(pipeline.schedule, async () => {
      try {
        await this.execute(pipeline.id);
      } catch (error) {
        this.logger.error('Scheduled pipeline failed', {
          pipelineId: pipeline.id,
          error
        });
      }
    });

    this.schedules.set(pipeline.id, task);
    task.start();

    this.logger.info('Pipeline scheduled', {
      pipelineId: pipeline.id,
      schedule: pipeline.schedule
    });
  }

  /**
   * Process ETL job
   */
  private async processETLJob(job: Job): Promise<void> {
    const { pipelineId, params } = job.data;
    await this.execute(pipelineId, params);
  }

  /**
   * Evaluate simple expression
   */
  private evaluateExpression(expression: string, context: any): any {
    // Very simple expression evaluator
    let result = expression;
    Object.keys(context).forEach(key => {
      result = result.replace(new RegExp(`\\$\\{${key}\\}`, 'g'), context[key]);
    });
    return result;
  }

  /**
   * Log execution message
   */
  private log(
    execution: IPipelineExecution,
    level: 'info' | 'warn' | 'error',
    message: string
  ): void {
    execution.logs.push({
      timestamp: new Date(),
      level,
      message
    });
  }

  /**
   * Record execution
   */
  private async recordExecution(execution: IPipelineExecution): Promise<void> {
    const query = `
      INSERT INTO pipeline_executions (
        id, pipeline_id, status, started_at,
        parameters, logs, metrics
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7
      );
    `;

    await this.analyticsPool.query(query, [
      execution.id,
      execution.pipeline_id,
      execution.status,
      execution.started_at,
      JSON.stringify(execution.parameters),
      JSON.stringify(execution.logs),
      JSON.stringify(execution.metrics)
    ]);
  }

  /**
   * Update execution
   */
  private async updateExecution(execution: IPipelineExecution): Promise<void> {
    const query = `
      UPDATE pipeline_executions SET
        status = $2,
        completed_at = $3,
        logs = $4,
        metrics = $5,
        error = $6
      WHERE id = $1;
    `;

    await this.analyticsPool.query(query, [
      execution.id,
      execution.status,
      execution.completed_at,
      JSON.stringify(execution.logs),
      JSON.stringify(execution.metrics),
      execution.error
    ]);
  }

  /**
   * Map row to pipeline
   */
  private mapRowToPipeline(row: any): IPipeline {
    return {
      id: row.id,
      company_id: row.company_id,
      name: row.name,
      description: row.description,
      type: row.type,
      source_config: row.source_config,
      transform_config: row.transform_config,
      destination_config: row.destination_config,
      schedule: row.schedule,
      is_active: row.is_active,
      last_run_at: row.last_run_at ? new Date(row.last_run_at) : undefined,
      next_run_at: row.next_run_at ? new Date(row.next_run_at) : undefined,
      metadata: row.metadata,
      created_at: new Date(row.created_at),
      updated_at: new Date(row.updated_at)
    };
  }

  /**
   * Load pipelines
   */
  private async loadPipelines(): Promise<void> {
    try {
      const query = 'SELECT * FROM data_pipelines WHERE is_active = true;';
      const result = await this.analyticsPool.query(query);

      result.rows.forEach(row => {
        const pipeline = this.mapRowToPipeline(row);
        this.pipelines.set(pipeline.id, pipeline);
        
        if (pipeline.schedule) {
          this.schedulePipeline(pipeline);
        }
      });

      this.logger.info('Pipelines loaded', { count: this.pipelines.size });
    } catch (error: any) {
      this.logger.error('Failed to load pipelines', error);
    }
  }

  /**
   * Generate ID
   */
  private generateId(): string {
    return `exec_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Cleanup resources
   */
  async cleanup(): Promise<void> {
    // Stop all schedules
    this.schedules.forEach(task => task.stop());
    this.schedules.clear();

    // Close queue and worker
    await this.etlWorker.close();
    await this.etlQueue.close();

    this.removeAllListeners();
    this.pipelines.clear();
    this.transformations.clear();
    
    this.logger.info('DataPipeline cleaned up');
  }
}