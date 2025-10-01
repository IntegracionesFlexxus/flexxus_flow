/**
 * ML Model Service - Sprint 12
 * Business logic for ML model management
 */

import { injectable, inject } from 'inversify';
import { TYPES } from '@/container/types';
import { MLModelRepository } from '../repositories/MLModelRepository';
import { IMLModel, CreateMLModelDTO, UpdateMLModelDTO } from '../../interfaces/IMLModel';
import { MLModelStatus, MLModelType, PerformanceMetrics } from '../../types/ml.types';

@injectable()
export class MLModelService {
  constructor(
    @inject(TYPES.MLModelRepository)
    private mlModelRepository: MLModelRepository,

    @inject(TYPES.LoggerService)
    private logger: any
  ) {}

  /**
   * Create a new ML model
   */
  async createModel(tenantId: string, data: CreateMLModelDTO, userId?: string): Promise<IMLModel> {
    this.logger.info('Creating ML model', { tenantId, modelName: data.name });

    if (!data.name || !data.display_name || !data.model_type || !data.framework) {
      throw new Error('Missing required fields: name, display_name, model_type, framework');
    }

    try {
      const model = await this.mlModelRepository.create(tenantId, data, userId);
      this.logger.info('ML model created successfully', { modelId: model.id });
      return model;
    } catch (error) {
      this.logger.error('Failed to create ML model', { error, tenantId, data });
      throw new Error(`Failed to create ML model: ${error}`);
    }
  }

  /**
   * Get model by ID
   */
  async getModel(modelId: string, tenantId: string): Promise<IMLModel> {
    const model = await this.mlModelRepository.findById(modelId, tenantId);

    if (!model) {
      throw new Error(`ML model not found: ${modelId}`);
    }

    return model;
  }

  /**
   * List all models with optional filters
   */
  async listModels(
    tenantId: string,
    filters?: { status?: MLModelStatus; model_type?: MLModelType }
  ): Promise<IMLModel[]> {
    return await this.mlModelRepository.findAll(tenantId, filters);
  }

  /**
   * Update model
   */
  async updateModel(modelId: string, tenantId: string, data: UpdateMLModelDTO): Promise<IMLModel> {
    this.logger.info('Updating ML model', { modelId, tenantId });

    const model = await this.mlModelRepository.update(modelId, tenantId, data);

    if (!model) {
      throw new Error(`ML model not found: ${modelId}`);
    }

    return model;
  }

  /**
   * Delete model
   */
  async deleteModel(modelId: string, tenantId: string): Promise<void> {
    this.logger.info('Deleting ML model', { modelId, tenantId });

    const deleted = await this.mlModelRepository.delete(modelId, tenantId);

    if (!deleted) {
      throw new Error(`ML model not found: ${modelId}`);
    }
  }

  /**
   * Start model training
   */
  async trainModel(modelId: string, tenantId: string): Promise<void> {
    this.logger.info('Starting model training', { modelId, tenantId });

    const model = await this.getModel(modelId, tenantId);

    if (model.status === MLModelStatus.TRAINING) {
      throw new Error('Model is already training');
    }

    // Update status to training
    await this.mlModelRepository.updateStatus(modelId, tenantId, MLModelStatus.TRAINING);

    // Here would go the actual training logic
    // For now, we just mock it
    this.logger.info('Model training initiated (mock)', { modelId });
  }

  /**
   * Deploy model (change status)
   */
  async deployModel(modelId: string, tenantId: string): Promise<void> {
    this.logger.info('Deploying model', { modelId, tenantId });

    const model = await this.getModel(modelId, tenantId);

    if (model.status !== MLModelStatus.TESTING && model.status !== MLModelStatus.VALIDATION) {
      throw new Error('Model must be tested or validated before deployment');
    }

    await this.mlModelRepository.updateStatus(modelId, tenantId, MLModelStatus.DEPLOYED);
    this.logger.info('Model deployed successfully', { modelId });
  }

  /**
   * Update model performance metrics
   */
  async updatePerformanceMetrics(
    modelId: string,
    tenantId: string,
    metrics: PerformanceMetrics
  ): Promise<void> {
    this.logger.info('Updating model performance metrics', { modelId, tenantId });

    await this.mlModelRepository.updatePerformanceMetrics(modelId, tenantId, metrics);
  }

  /**
   * Archive model
   */
  async archiveModel(modelId: string, tenantId: string): Promise<void> {
    this.logger.info('Archiving model', { modelId, tenantId });

    await this.mlModelRepository.updateStatus(modelId, tenantId, MLModelStatus.ARCHIVED);
  }

  /**
   * Get model statistics
   */
  async getModelStatistics(modelId: string, tenantId: string): Promise<any> {
    const model = await this.getModel(modelId, tenantId);

    return {
      model_id: model.id,
      model_name: model.name,
      status: model.status,
      performance_metrics: model.performance_metrics,
      created_at: model.created_at,
      deployed_at: model.deployed_at,
      model_size_bytes: model.model_size_bytes
    };
  }
}
