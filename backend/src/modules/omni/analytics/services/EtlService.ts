/**
 * EtlService - Sprint 13
 * Service for ETL pipeline management
 */

import { injectable, inject } from 'inversify';
import { TYPES } from '@/container/types';
import type {
  EtlPipeline,
  CreateEtlPipelineDto,
  UpdateEtlPipelineDto,
  EtlExecution,
  ExecutionResult
} from '../types/analytics.types';

@injectable()
export class EtlService {
  constructor(
    @inject(TYPES.EtlPipelineRepository) private pipelineRepo: EtlPipelineRepository,
    @inject(TYPES.PipelineManager) private manager: PipelineManager,
    @inject(TYPES.Logger) private logger: Logger
  ) {}

  async createPipeline(data: CreateEtlPipelineDto, companyId?: number): Promise<EtlPipeline> {
    try {
      this.logger.info('Creating ETL pipeline', { name: data.pipelineName, companyId });
      return await this.pipelineRepo.create(data, companyId);
    } catch (error) {
      this.logger.error('Error creating pipeline', { error });
      throw new Error(`Failed to create pipeline: ${error.message}`);
    }
  }

  async runPipeline(pipelineId: number): Promise<ExecutionResult> {
    try {
      this.logger.info('Running ETL pipeline', { pipelineId });
      return await this.manager.executePipeline(pipelineId, true);
    } catch (error) {
      this.logger.error('Error running pipeline', { error, pipelineId });
      throw new Error(`Failed to run pipeline: ${error.message}`);
    }
  }

  async schedulePipeline(pipelineId: number, cronExpression: string): Promise<void> {
    try {
      this.logger.info('Scheduling pipeline', { pipelineId, cronExpression });
      await this.manager.schedulePipeline(pipelineId, cronExpression);
    } catch (error) {
      this.logger.error('Error scheduling pipeline', { error, pipelineId });
      throw new Error(`Failed to schedule pipeline: ${error.message}`);
    }
  }

  async getPipelineStatus(pipelineId: number): Promise<string> {
    try {
      return this.manager.getPipelineStatus(pipelineId);
    } catch (error) {
      this.logger.error('Error getting pipeline status', { error, pipelineId });
      throw new Error(`Failed to get pipeline status: ${error.message}`);
    }
  }

  async getExecutionHistory(pipelineId: number, limit: number = 10): Promise<EtlExecution[]> {
    try {
      return await this.pipelineRepo.getExecutionHistory(pipelineId, limit);
    } catch (error) {
      this.logger.error('Error getting execution history', { error, pipelineId });
      throw new Error(`Failed to get execution history: ${error.message}`);
    }
  }

  async updatePipeline(id: number, data: UpdateEtlPipelineDto): Promise<EtlPipeline> {
    try {
      await this.pipelineRepo.update(id, data);
      const updated = await this.pipelineRepo.findById(id);
      if (!updated) throw new Error('Pipeline not found');
      return updated;
    } catch (error) {
      this.logger.error('Error updating pipeline', { error, id });
      throw new Error(`Failed to update pipeline: ${error.message}`);
    }
  }
}

interface EtlPipelineRepository {
  create(data: CreateEtlPipelineDto, companyId?: number): Promise<EtlPipeline>;
  findById(id: number): Promise<EtlPipeline | null>;
  update(id: number, data: UpdateEtlPipelineDto): Promise<void>;
  getExecutionHistory(pipelineId: number, limit: number): Promise<EtlExecution[]>;
}

interface PipelineManager {
  executePipeline(pipelineId: number, manual: boolean): Promise<ExecutionResult>;
  schedulePipeline(pipelineId: number, cronExpression: string): Promise<void>;
  getPipelineStatus(pipelineId: number): string;
}

interface Logger {
  error(message: string, meta?: any): void;
  info(message: string, meta?: any): void;
}
