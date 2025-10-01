/**
 * Prediction Controller - Sprint 12
 * REST API endpoints for ML predictions
 */

import { Request, Response } from 'express';
import { injectable, inject } from 'inversify';
import { TYPES } from '@/container/types';
import { PredictionService } from '../ml/services/PredictionService';

@injectable()
export class PredictionController {
  constructor(
    @inject(TYPES.PredictionService)
    private predictionService: PredictionService
  ) {}

  /**
   * POST /api/omni/predictions
   * Make a prediction
   */
  async createPrediction(req: Request, res: Response): Promise<void> {
    try {
      const tenantId = req.user?.tenant_id || req.headers['x-tenant-id'] as string;
      const { deployment_id, input_features } = req.body;

      if (!deployment_id || !input_features) {
        res.status(400).json({
          success: false,
          error: 'deployment_id and input_features are required'
        });
        return;
      }

      const result = await this.predictionService.predict(
        deployment_id,
        input_features,
        tenantId
      );

      res.status(200).json({
        success: true,
        data: result
      });
    } catch (error: any) {
      res.status(400).json({
        success: false,
        error: error.message
      });
    }
  }

  /**
   * GET /api/omni/predictions/:id
   * Get prediction by ID
   */
  async getPrediction(req: Request, res: Response): Promise<void> {
    try {
      const tenantId = req.user?.tenant_id || req.headers['x-tenant-id'] as string;
      const { id } = req.params;

      const prediction = await this.predictionService.getPrediction(id, tenantId);

      res.status(200).json({
        success: true,
        data: prediction
      });
    } catch (error: any) {
      res.status(404).json({
        success: false,
        error: error.message
      });
    }
  }

  /**
   * GET /api/omni/deployments/:deploymentId/predictions
   * Get predictions for a deployment
   */
  async getDeploymentPredictions(req: Request, res: Response): Promise<void> {
    try {
      const tenantId = req.user?.tenant_id || req.headers['x-tenant-id'] as string;
      const { deploymentId } = req.params;
      const limit = parseInt(req.query.limit as string) || 100;

      const predictions = await this.predictionService.getDeploymentPredictions(
        deploymentId,
        tenantId,
        limit
      );

      res.status(200).json({
        success: true,
        data: predictions,
        count: predictions.length
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  /**
   * GET /api/omni/deployments/:deploymentId/statistics
   * Get prediction statistics for a deployment
   */
  async getDeploymentStatistics(req: Request, res: Response): Promise<void> {
    try {
      const tenantId = req.user?.tenant_id || req.headers['x-tenant-id'] as string;
      const { deploymentId } = req.params;

      const statistics = await this.predictionService.getDeploymentStatistics(
        deploymentId,
        tenantId
      );

      res.status(200).json({
        success: true,
        data: statistics
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  /**
   * POST /api/omni/predictions/batch
   * Create batch prediction job
   */
  async createBatchPrediction(req: Request, res: Response): Promise<void> {
    try {
      const tenantId = req.user?.tenant_id || req.headers['x-tenant-id'] as string;
      const userId = req.user?.id;
      const { deployment_id, input_data_path } = req.body;

      if (!deployment_id || !input_data_path) {
        res.status(400).json({
          success: false,
          error: 'deployment_id and input_data_path are required'
        });
        return;
      }

      const jobId = await this.predictionService.batchPredict(
        deployment_id,
        input_data_path,
        tenantId,
        userId
      );

      res.status(202).json({
        success: true,
        data: {
          job_id: jobId,
          status: 'queued'
        }
      });
    } catch (error: any) {
      res.status(400).json({
        success: false,
        error: error.message
      });
    }
  }
}
