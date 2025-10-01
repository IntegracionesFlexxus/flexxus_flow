/**
 * PipelineManager - Sprint 13
 * Orchestrates ETL pipeline execution and scheduling
 */

import { injectable, inject } from 'inversify';
import { TYPES } from '@/container/types';
import { EventEmitter } from 'events';

interface EtlPipeline {
  id: number;
  pipelineName: string;
  pipelineType: 'aggregation' | 'transformation' | 'calculation' | 'sync' | 'cleanup';
  sourceTables: string[];
  targetTable: string;
  transformations?: any[];
  scheduleCron?: string;
  isActive: boolean;
  companyId?: number;
  priority: number;
  timeoutMinutes: number;
  retryCount: number;
  config?: Record<string, any>;
}

interface EtlExecution {
  id?: number;
  pipelineId: number;
  status: 'pending' | 'running' | 'success' | 'failed' | 'cancelled';
  startedAt?: Date;
  completedAt?: Date;
  recordsProcessed?: number;
  recordsFailed?: number;
  errorMessage?: string;
  metadata?: Record<string, any>;
}

interface ExecutionResult {
  pipelineId: number;
  executionId: number;
  status: 'success' | 'failed';
  recordsExtracted: number;
  recordsTransformed: number;
  recordsLoaded: number;
  recordsFailed: number;
  duration: number;
  error?: string;
  metadata?: Record<string, any>;
}

interface PipelineSchedule {
  pipelineId: number;
  cronExpression: string;
  nextRunAt: Date;
  isActive: boolean;
}

@injectable()
export class PipelineManager extends EventEmitter {
  private runningPipelines: Map<number, AbortController> = new Map();
  private scheduledJobs: Map<number, NodeJS.Timeout> = new Map();

  constructor(
    @inject(TYPES.EtlPipelineRepository) private pipelineRepo: EtlPipelineRepository,
    @inject(TYPES.DataExtractor) private extractor: DataExtractor,
    @inject(TYPES.DataTransformer) private transformer: DataTransformer,
    @inject(TYPES.DataLoader) private loader: DataLoader,
    @inject(TYPES.Logger) private logger: Logger
  ) {
    super();
  }

  /**
   * Execute a pipeline
   */
  async executePipeline(pipelineId: number, manual: boolean = false): Promise<ExecutionResult> {
    const startTime = Date.now();
    let executionId: number | undefined;

    try {
      // Check if pipeline is already running
      if (this.runningPipelines.has(pipelineId)) {
        throw new Error(`Pipeline ${pipelineId} is already running`);
      }

      // Get pipeline configuration
      const pipeline = await this.pipelineRepo.findById(pipelineId);

      if (!pipeline) {
        throw new Error(`Pipeline ${pipelineId} not found`);
      }

      if (!pipeline.isActive && !manual) {
        throw new Error(`Pipeline ${pipelineId} is not active`);
      }

      this.logger.info('Starting pipeline execution', {
        pipelineId,
        pipelineName: pipeline.pipelineName,
        manual
      });

      // Create execution record
      const execution = await this.pipelineRepo.createExecution({
        pipelineId,
        status: 'running',
        startedAt: new Date(),
        metadata: { manual, startTime }
      });

      executionId = execution.id!;

      // Create abort controller for cancellation
      const abortController = new AbortController();
      this.runningPipelines.set(pipelineId, abortController);

      // Emit pipeline started event
      this.emit('pipeline-started', { pipelineId, executionId });

      // Execute ETL stages with timeout
      const timeout = pipeline.timeoutMinutes * 60 * 1000;
      const result = await Promise.race([
        this.runEtlStages(pipeline, executionId, abortController.signal),
        this.createTimeout(timeout, pipelineId)
      ]);

      // Update execution record
      await this.pipelineRepo.updateExecution(executionId, {
        status: 'success',
        completedAt: new Date(),
        recordsProcessed: result.recordsLoaded,
        recordsFailed: result.recordsFailed,
        metadata: result.metadata
      });

      // Update pipeline last run
      await this.pipelineRepo.updateLastRun(pipelineId, true);

      // Emit pipeline completed event
      this.emit('pipeline-completed', { pipelineId, executionId, result });

      this.logger.info('Pipeline execution completed', {
        pipelineId,
        executionId,
        duration: Date.now() - startTime,
        recordsLoaded: result.recordsLoaded
      });

      return {
        ...result,
        pipelineId,
        executionId,
        status: 'success',
        duration: Date.now() - startTime
      };
    } catch (error) {
      this.logger.error('Pipeline execution failed', {
        error,
        pipelineId,
        executionId
      });

      // Update execution record if exists
      if (executionId) {
        await this.pipelineRepo.updateExecution(executionId, {
          status: 'failed',
          completedAt: new Date(),
          errorMessage: error.message
        });
      }

      // Update pipeline last run
      await this.pipelineRepo.updateLastRun(pipelineId, false, error.message);

      // Emit pipeline failed event
      this.emit('pipeline-failed', { pipelineId, executionId, error });

      // Retry if configured
      const pipeline = await this.pipelineRepo.findById(pipelineId);
      if (pipeline && pipeline.retryCount > 0 && !manual) {
        this.logger.info('Retrying pipeline execution', {
          pipelineId,
          retriesRemaining: pipeline.retryCount
        });

        // Implement retry logic here
      }

      return {
        pipelineId,
        executionId: executionId || 0,
        status: 'failed',
        recordsExtracted: 0,
        recordsTransformed: 0,
        recordsLoaded: 0,
        recordsFailed: 0,
        duration: Date.now() - startTime,
        error: error.message
      };
    } finally {
      // Clean up
      this.runningPipelines.delete(pipelineId);
    }
  }

  /**
   * Cancel a running pipeline
   */
  async cancelPipeline(pipelineId: number): Promise<void> {
    try {
      const abortController = this.runningPipelines.get(pipelineId);

      if (!abortController) {
        throw new Error(`Pipeline ${pipelineId} is not running`);
      }

      this.logger.info('Cancelling pipeline execution', { pipelineId });

      abortController.abort();
      this.runningPipelines.delete(pipelineId);

      this.emit('pipeline-cancelled', { pipelineId });
    } catch (error) {
      this.logger.error('Error cancelling pipeline', { error, pipelineId });
      throw error;
    }
  }

  /**
   * Schedule pipeline execution
   */
  async schedulePipeline(pipelineId: number, cronExpression: string): Promise<void> {
    try {
      this.logger.info('Scheduling pipeline', { pipelineId, cronExpression });

      // Parse cron expression and calculate next run
      const nextRunAt = this.calculateNextRun(cronExpression);

      // Update pipeline schedule
      await this.pipelineRepo.update(pipelineId, {
        scheduleCron: cronExpression,
        nextRunAt
      });

      // Cancel existing schedule if any
      this.unschedulePipeline(pipelineId);

      // Create new schedule
      this.createSchedule(pipelineId, cronExpression, nextRunAt);

      this.logger.info('Pipeline scheduled successfully', {
        pipelineId,
        nextRunAt
      });
    } catch (error) {
      this.logger.error('Error scheduling pipeline', { error, pipelineId });
      throw error;
    }
  }

  /**
   * Unschedule pipeline execution
   */
  unschedulePipeline(pipelineId: number): void {
    const timeout = this.scheduledJobs.get(pipelineId);

    if (timeout) {
      clearTimeout(timeout);
      this.scheduledJobs.delete(pipelineId);
      this.logger.info('Pipeline unscheduled', { pipelineId });
    }
  }

  /**
   * Get pipeline status
   */
  getPipelineStatus(pipelineId: number): 'running' | 'scheduled' | 'idle' {
    if (this.runningPipelines.has(pipelineId)) {
      return 'running';
    }

    if (this.scheduledJobs.has(pipelineId)) {
      return 'scheduled';
    }

    return 'idle';
  }

  /**
   * Get all running pipelines
   */
  getRunningPipelines(): number[] {
    return Array.from(this.runningPipelines.keys());
  }

  /**
   * Initialize scheduler for all active pipelines
   */
  async initializeScheduler(companyId?: number): Promise<void> {
    try {
      this.logger.info('Initializing pipeline scheduler', { companyId });

      const pipelines = await this.pipelineRepo.getActivePipelines(companyId);

      for (const pipeline of pipelines) {
        if (pipeline.scheduleCron) {
          const nextRunAt = this.calculateNextRun(pipeline.scheduleCron);
          this.createSchedule(pipeline.id, pipeline.scheduleCron, nextRunAt);
        }
      }

      this.logger.info('Pipeline scheduler initialized', {
        scheduledCount: this.scheduledJobs.size
      });
    } catch (error) {
      this.logger.error('Error initializing scheduler', { error });
      throw error;
    }
  }

  /**
   * Stop all scheduled pipelines
   */
  stopScheduler(): void {
    for (const [pipelineId, timeout] of this.scheduledJobs.entries()) {
      clearTimeout(timeout);
      this.logger.info('Stopped scheduled pipeline', { pipelineId });
    }

    this.scheduledJobs.clear();
    this.logger.info('Scheduler stopped');
  }

  /**
   * Private: Run ETL stages
   */
  private async runEtlStages(
    pipeline: EtlPipeline,
    executionId: number,
    signal: AbortSignal
  ): Promise<{
    recordsExtracted: number;
    recordsTransformed: number;
    recordsLoaded: number;
    recordsFailed: number;
    metadata: Record<string, any>;
  }> {
    // Stage 1: Extract
    this.logger.info('ETL Stage 1: Extract', { pipelineId: pipeline.id });
    const extractResult = await this.extractor.extract(pipeline, signal);

    if (signal.aborted) {
      throw new Error('Pipeline execution cancelled during extraction');
    }

    this.emit('extraction-completed', {
      pipelineId: pipeline.id,
      executionId,
      recordCount: extractResult.recordCount
    });

    // Stage 2: Transform
    this.logger.info('ETL Stage 2: Transform', { pipelineId: pipeline.id });
    const transformResult = await this.transformer.transform(
      extractResult.data,
      pipeline.transformations || [],
      signal
    );

    if (signal.aborted) {
      throw new Error('Pipeline execution cancelled during transformation');
    }

    this.emit('transformation-completed', {
      pipelineId: pipeline.id,
      executionId,
      recordCount: transformResult.recordCount
    });

    // Stage 3: Load
    this.logger.info('ETL Stage 3: Load', { pipelineId: pipeline.id });
    const loadResult = await this.loader.load(
      transformResult.data,
      pipeline.targetTable,
      pipeline.companyId,
      signal
    );

    if (signal.aborted) {
      throw new Error('Pipeline execution cancelled during loading');
    }

    this.emit('loading-completed', {
      pipelineId: pipeline.id,
      executionId,
      recordCount: loadResult.recordsLoaded
    });

    return {
      recordsExtracted: extractResult.recordCount,
      recordsTransformed: transformResult.recordCount,
      recordsLoaded: loadResult.recordsLoaded,
      recordsFailed: loadResult.recordsFailed,
      metadata: {
        extraction: extractResult.metadata,
        transformation: transformResult.metadata,
        loading: loadResult.metadata
      }
    };
  }

  /**
   * Private: Create timeout promise
   */
  private createTimeout(timeoutMs: number, pipelineId: number): Promise<never> {
    return new Promise((_, reject) => {
      setTimeout(() => {
        reject(new Error(`Pipeline ${pipelineId} execution timeout after ${timeoutMs}ms`));
      }, timeoutMs);
    });
  }

  /**
   * Private: Calculate next run time from cron expression
   */
  private calculateNextRun(cronExpression: string): Date {
    // Simplified cron parser - in production use a library like node-cron
    // For now, just add 1 hour
    const now = new Date();
    return new Date(now.getTime() + 60 * 60 * 1000);
  }

  /**
   * Private: Create schedule for pipeline
   */
  private createSchedule(pipelineId: number, cronExpression: string, nextRunAt: Date): void {
    const delay = nextRunAt.getTime() - Date.now();

    const timeout = setTimeout(async () => {
      this.logger.info('Executing scheduled pipeline', { pipelineId });

      try {
        await this.executePipeline(pipelineId, false);

        // Reschedule for next run
        const newNextRunAt = this.calculateNextRun(cronExpression);
        this.createSchedule(pipelineId, cronExpression, newNextRunAt);
      } catch (error) {
        this.logger.error('Scheduled pipeline execution failed', {
          error,
          pipelineId
        });
      }
    }, Math.max(0, delay));

    this.scheduledJobs.set(pipelineId, timeout);
  }
}

interface EtlPipelineRepository {
  findById(id: number): Promise<EtlPipeline | null>;
  getActivePipelines(companyId?: number): Promise<EtlPipeline[]>;
  createExecution(data: Partial<EtlExecution>): Promise<EtlExecution>;
  updateExecution(executionId: number, data: Partial<EtlExecution>): Promise<void>;
  updateLastRun(pipelineId: number, success: boolean, error?: string): Promise<void>;
  update(id: number, data: Partial<EtlPipeline>): Promise<void>;
}

interface DataExtractor {
  extract(pipeline: EtlPipeline, signal: AbortSignal): Promise<{
    data: any[];
    recordCount: number;
    metadata: Record<string, any>;
  }>;
}

interface DataTransformer {
  transform(data: any[], transformations: any[], signal: AbortSignal): Promise<{
    data: any[];
    recordCount: number;
    metadata: Record<string, any>;
  }>;
}

interface DataLoader {
  load(data: any[], targetTable: string, companyId: number | undefined, signal: AbortSignal): Promise<{
    recordsLoaded: number;
    recordsFailed: number;
    metadata: Record<string, any>;
  }>;
}

interface Logger {
  error(message: string, meta?: any): void;
  info(message: string, meta?: any): void;
  warn(message: string, meta?: any): void;
  debug(message: string, meta?: any): void;
}
