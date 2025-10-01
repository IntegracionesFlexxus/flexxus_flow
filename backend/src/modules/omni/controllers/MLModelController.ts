/**
 * ML Model Controller - Sprint 12
 * REST API endpoints for ML model management
 */

import { Request, Response } from 'express';
import { injectable, inject } from 'inversify';
import { TYPES } from '@/container/types';
import { MLModelService } from '../ml/services/MLModelService';
import { CreateMLModelDTO, UpdateMLModelDTO } from '../interfaces/IMLModel';

@injectable()
export class MLModelController {
  constructor(
    @inject(TYPES.MLModelService)
    private mlModelService: MLModelService
  ) {}

  /**
   * POST /api/omni/ml/models
   * Create a new ML model
   */
  async createModel(req: Request, res: Response): Promise<void> {
    try {
      const tenantId = req.user?.tenant_id || req.headers['x-tenant-id'] as string;
      const userId = req.user?.id;

      const modelData: CreateMLModelDTO = req.body;

      const model = await this.mlModelService.createModel(tenantId, modelData, userId);

      res.status(201).json({
        success: true,
        data: model
      });
    } catch (error: any) {
      res.status(400).json({
        success: false,
        error: error.message
      });
    }
  }

  /**
   * GET /api/omni/ml/models/:id
   * Get ML model by ID
   */
  async getModel(req: Request, res: Response): Promise<void> {
    try {
      const tenantId = req.user?.tenant_id || req.headers['x-tenant-id'] as string;
      const { id } = req.params;

      const model = await this.mlModelService.getModel(id, tenantId);

      res.status(200).json({
        success: true,
        data: model
      });
    } catch (error: any) {
      res.status(404).json({
        success: false,
        error: error.message
      });
    }
  }

  /**
   * GET /api/omni/ml/models
   * List all models with optional filters
   */
  async listModels(req: Request, res: Response): Promise<void> {
    try {
      const tenantId = req.user?.tenant_id || req.headers['x-tenant-id'] as string;
      const { status, model_type } = req.query;

      const filters: any = {};
      if (status) filters.status = status;
      if (model_type) filters.model_type = model_type;

      const models = await this.mlModelService.listModels(tenantId, filters);

      res.status(200).json({
        success: true,
        data: models,
        count: models.length
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  /**
   * PUT /api/omni/ml/models/:id
   * Update ML model
   */
  async updateModel(req: Request, res: Response): Promise<void> {
    try {
      const tenantId = req.user?.tenant_id || req.headers['x-tenant-id'] as string;
      const { id } = req.params;
      const updateData: UpdateMLModelDTO = req.body;

      const model = await this.mlModelService.updateModel(id, tenantId, updateData);

      res.status(200).json({
        success: true,
        data: model
      });
    } catch (error: any) {
      res.status(400).json({
        success: false,
        error: error.message
      });
    }
  }

  /**
   * DELETE /api/omni/ml/models/:id
   * Delete ML model
   */
  async deleteModel(req: Request, res: Response): Promise<void> {
    try {
      const tenantId = req.user?.tenant_id || req.headers['x-tenant-id'] as string;
      const { id } = req.params;

      await this.mlModelService.deleteModel(id, tenantId);

      res.status(200).json({
        success: true,
        message: 'Model deleted successfully'
      });
    } catch (error: any) {
      res.status(400).json({
        success: false,
        error: error.message
      });
    }
  }

  /**
   * POST /api/omni/ml/models/:id/train
   * Start model training
   */
  async trainModel(req: Request, res: Response): Promise<void> {
    try {
      const tenantId = req.user?.tenant_id || req.headers['x-tenant-id'] as string;
      const { id } = req.params;

      await this.mlModelService.trainModel(id, tenantId);

      res.status(200).json({
        success: true,
        message: 'Model training started'
      });
    } catch (error: any) {
      res.status(400).json({
        success: false,
        error: error.message
      });
    }
  }

  /**
   * POST /api/omni/ml/models/:id/deploy
   * Deploy model
   */
  async deployModel(req: Request, res: Response): Promise<void> {
    try {
      const tenantId = req.user?.tenant_id || req.headers['x-tenant-id'] as string;
      const { id } = req.params;

      await this.mlModelService.deployModel(id, tenantId);

      res.status(200).json({
        success: true,
        message: 'Model deployed successfully'
      });
    } catch (error: any) {
      res.status(400).json({
        success: false,
        error: error.message
      });
    }
  }

  /**
   * GET /api/omni/ml/models/:id/statistics
   * Get model statistics
   */
  async getModelStatistics(req: Request, res: Response): Promise<void> {
    try {
      const tenantId = req.user?.tenant_id || req.headers['x-tenant-id'] as string;
      const { id } = req.params;

      const statistics = await this.mlModelService.getModelStatistics(id, tenantId);

      res.status(200).json({
        success: true,
        data: statistics
      });
    } catch (error: any) {
      res.status(400).json({
        success: false,
        error: error.message
      });
    }
  }
}
