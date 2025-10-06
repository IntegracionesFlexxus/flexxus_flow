/**
 * ML Monitoring Controller - Sprint 12 Fase 4
 * REST API endpoints for ML monitoring and A/B testing
 */

import { Request, Response } from 'express';
import { injectable, inject } from 'inversify';
import { TYPES } from '@/container/types';
import { ModelPerformanceMonitoringService } from '../monitoring/services/ModelPerformanceMonitoringService';
import { DataDriftDetectionService } from '../monitoring/services/DataDriftDetectionService';
import { ABTestingService } from '../monitoring/services/ABTestingService';
import { LoggerFactory } from '@/shared/services/logger/LoggerService';

@injectable()
export class MLMonitoringController {
  constructor(
    @inject(TYPES.ModelPerformanceMonitoringService)
    private performanceService: ModelPerformanceMonitoringService,

    @inject(TYPES.DataDriftDetectionService)
    private driftService: DataDriftDetectionService,

    @inject(TYPES.ABTestingService)
    private abTestService: ABTestingService,

    @inject(TYPES.Logger)
    private logger: Logger
  ) {}

  // Model Performance
  async recordMetrics(req: Request, res: Response): Promise<void> {
    try {
      const { deployment_id, metrics } = req.body;
      const tenantId = req.user?.companyId;

      if (!tenantId || !deployment_id || !metrics) {
        res.status(400).json({ error: 'Missing required fields' });
        return;
      }

      const result = await this.performanceService.recordMetrics(tenantId, deployment_id, metrics);
      res.json(result);
    } catch (error) {
      this.logger.error('Error recording metrics', { error });
      res.status(500).json({ error: 'Failed to record metrics' });
    }
  }

  async getMetricsHistory(req: Request, res: Response): Promise<void> {
    try {
      const { deploymentId } = req.params;
      const limit = req.query.limit ? parseInt(req.query.limit as string) : undefined;
      const tenantId = req.user?.companyId;

      if (!tenantId) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }

      const result = await this.performanceService.getMetricsHistory(deploymentId, tenantId, limit);
      res.json(result);
    } catch (error) {
      this.logger.error('Error getting metrics history', { error });
      res.status(500).json({ error: 'Failed to get metrics history' });
    }
  }

  async getAverageMetrics(req: Request, res: Response): Promise<void> {
    try {
      const { deploymentId } = req.params;
      const hours = req.query.hours ? parseInt(req.query.hours as string) : 24;
      const tenantId = req.user?.companyId;

      if (!tenantId) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }

      const result = await this.performanceService.getAverageMetrics(deploymentId, tenantId, hours);
      res.json(result);
    } catch (error) {
      this.logger.error('Error getting average metrics', { error });
      res.status(500).json({ error: 'Failed to get average metrics' });
    }
  }

  // Drift Detection
  async detectDrift(req: Request, res: Response): Promise<void> {
    try {
      const { deployment_id, baseline_data, current_data } = req.body;
      const tenantId = req.user?.companyId;

      if (!tenantId || !deployment_id || !baseline_data || !current_data) {
        res.status(400).json({ error: 'Missing required fields' });
        return;
      }

      const result = await this.driftService.detectDrift(
        tenantId,
        deployment_id,
        baseline_data,
        current_data
      );
      res.json(result || { message: 'No drift detected' });
    } catch (error) {
      this.logger.error('Error detecting drift', { error });
      res.status(500).json({ error: 'Failed to detect drift' });
    }
  }

  async getUnresolvedDrift(req: Request, res: Response): Promise<void> {
    try {
      const { deploymentId } = req.params;
      const tenantId = req.user?.companyId;

      if (!tenantId) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }

      const result = await this.driftService.getUnresolvedDrift(tenantId, deploymentId);
      res.json(result);
    } catch (error) {
      this.logger.error('Error getting unresolved drift', { error });
      res.status(500).json({ error: 'Failed to get unresolved drift' });
    }
  }

  async acknowledgeDrift(req: Request, res: Response): Promise<void> {
    try {
      const { driftId } = req.params;
      const tenantId = req.user?.companyId;

      if (!tenantId) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }

      await this.driftService.acknowledgeDrift(driftId, tenantId);
      res.json({ message: 'Drift acknowledged' });
    } catch (error) {
      this.logger.error('Error acknowledging drift', { error });
      res.status(500).json({ error: 'Failed to acknowledge drift' });
    }
  }

  async resolveDrift(req: Request, res: Response): Promise<void> {
    try {
      const { driftId } = req.params;
      const tenantId = req.user?.companyId;

      if (!tenantId) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }

      await this.driftService.resolveDrift(driftId, tenantId);
      res.json({ message: 'Drift resolved' });
    } catch (error) {
      this.logger.error('Error resolving drift', { error });
      res.status(500).json({ error: 'Failed to resolve drift' });
    }
  }

  // A/B Testing
  async createABTest(req: Request, res: Response): Promise<void> {
    try {
      const {
        test_name,
        control_deployment_id,
        variant_deployments,
        traffic_split,
        success_metrics,
        options
      } = req.body;
      const tenantId = req.user?.companyId;

      if (!tenantId || !test_name || !control_deployment_id || !variant_deployments || !traffic_split || !success_metrics) {
        res.status(400).json({ error: 'Missing required fields' });
        return;
      }

      const result = await this.abTestService.createTest(
        tenantId,
        test_name,
        control_deployment_id,
        variant_deployments,
        traffic_split,
        success_metrics,
        options
      );
      res.json(result);
    } catch (error) {
      this.logger.error('Error creating A/B test', { error });
      res.status(500).json({ error: 'Failed to create A/B test' });
    }
  }

  async startABTest(req: Request, res: Response): Promise<void> {
    try {
      const { testId } = req.params;
      const tenantId = req.user?.companyId;

      if (!tenantId) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }

      await this.abTestService.startTest(testId, tenantId);
      res.json({ message: 'A/B test started' });
    } catch (error) {
      this.logger.error('Error starting A/B test', { error });
      res.status(500).json({ error: 'Failed to start A/B test' });
    }
  }

  async endABTest(req: Request, res: Response): Promise<void> {
    try {
      const { testId } = req.params;
      const tenantId = req.user?.companyId;

      if (!tenantId) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }

      await this.abTestService.endTest(testId, tenantId);
      res.json({ message: 'A/B test ended' });
    } catch (error) {
      this.logger.error('Error ending A/B test', { error });
      res.status(500).json({ error: 'Failed to end A/B test' });
    }
  }

  async recordABTestResult(req: Request, res: Response): Promise<void> {
    try {
      const { testId } = req.params;
      const { variant, deployment_id, metric_name, metric_value, sample_size } = req.body;
      const tenantId = req.user?.companyId;

      if (!tenantId || !variant || !deployment_id || !metric_name || metric_value === undefined || !sample_size) {
        res.status(400).json({ error: 'Missing required fields' });
        return;
      }

      const result = await this.abTestService.recordResult(
        testId,
        tenantId,
        variant,
        deployment_id,
        metric_name,
        metric_value,
        sample_size
      );
      res.json(result);
    } catch (error) {
      this.logger.error('Error recording A/B test result', { error });
      res.status(500).json({ error: 'Failed to record A/B test result' });
    }
  }

  async getABTestResults(req: Request, res: Response): Promise<void> {
    try {
      const { testId } = req.params;
      const tenantId = req.user?.companyId;

      if (!tenantId) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }

      const result = await this.abTestService.getTestResults(testId, tenantId);
      res.json(result);
    } catch (error) {
      this.logger.error('Error getting A/B test results', { error });
      res.status(500).json({ error: 'Failed to get A/B test results' });
    }
  }

  async getAllABTests(req: Request, res: Response): Promise<void> {
    try {
      const tenantId = req.user?.companyId;

      if (!tenantId) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }

      const result = await this.abTestService.getAllTests(tenantId);
      res.json(result);
    } catch (error) {
      this.logger.error('Error getting all A/B tests', { error });
      res.status(500).json({ error: 'Failed to get all A/B tests' });
    }
  }
}
