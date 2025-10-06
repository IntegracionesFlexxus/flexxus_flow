/**
 * Predictive Analytics Controller - Sprint 12 Fase 3
 * REST API endpoints for predictive analytics features
 */

import { Request, Response } from 'express';
import { injectable, inject } from 'inversify';
import { TYPES } from '@/container/types';
import { CustomerBehaviorPredictionService } from '../analytics/predictions/CustomerBehaviorPredictionService';
import { AnomalyDetectionService } from '../analytics/anomaly/AnomalyDetectionService';
import { DemandForecastingService } from '../analytics/forecasting/DemandForecastingService';
import { LoggerFactory } from '@/shared/services/logger/LoggerService';

@injectable()
export class PredictiveAnalyticsController {
  constructor(
    @inject(TYPES.CustomerBehaviorPredictionService)
    private customerPredictionService: CustomerBehaviorPredictionService,

    @inject(TYPES.AnomalyDetectionService)
    private anomalyService: AnomalyDetectionService,

    @inject(TYPES.DemandForecastingService)
    private forecastingService: DemandForecastingService,

    @inject(TYPES.Logger)
    private logger: Logger
  ) {}

  // ==================== Customer Behavior Predictions ====================

  /**
   * POST /api/omni/predictive-analytics/customers/:customerId/churn-risk
   */
  async predictChurnRisk(req: Request, res: Response): Promise<void> {
    try {
      const { customerId } = req.params;
      const { deployment_id } = req.body;
      const tenantId = req.user?.companyId;

      if (!tenantId) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }

      const prediction = await this.customerPredictionService.predictChurnRisk(
        customerId,
        tenantId,
        deployment_id
      );

      res.json(prediction);
    } catch (error) {
      this.logger.error('Error predicting churn risk', { error });
      res.status(500).json({ error: 'Failed to predict churn risk' });
    }
  }

  /**
   * POST /api/omni/predictive-analytics/customers/:customerId/next-purchase
   */
  async predictNextPurchase(req: Request, res: Response): Promise<void> {
    try {
      const { customerId } = req.params;
      const { deployment_id } = req.body;
      const tenantId = req.user?.companyId;

      if (!tenantId) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }

      const prediction = await this.customerPredictionService.predictNextPurchase(
        customerId,
        tenantId,
        deployment_id
      );

      res.json(prediction);
    } catch (error) {
      this.logger.error('Error predicting next purchase', { error });
      res.status(500).json({ error: 'Failed to predict next purchase' });
    }
  }

  /**
   * POST /api/omni/predictive-analytics/customers/:customerId/engagement
   */
  async predictEngagement(req: Request, res: Response): Promise<void> {
    try {
      const { customerId } = req.params;
      const { deployment_id } = req.body;
      const tenantId = req.user?.companyId;

      if (!tenantId) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }

      const prediction = await this.customerPredictionService.predictEngagement(
        customerId,
        tenantId,
        deployment_id
      );

      res.json(prediction);
    } catch (error) {
      this.logger.error('Error predicting engagement', { error });
      res.status(500).json({ error: 'Failed to predict engagement' });
    }
  }

  /**
   * POST /api/omni/predictive-analytics/customers/:customerId/satisfaction
   */
  async predictSatisfaction(req: Request, res: Response): Promise<void> {
    try {
      const { customerId } = req.params;
      const { deployment_id } = req.body;
      const tenantId = req.user?.companyId;

      if (!tenantId) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }

      const prediction = await this.customerPredictionService.predictSatisfaction(
        customerId,
        tenantId,
        deployment_id
      );

      res.json(prediction);
    } catch (error) {
      this.logger.error('Error predicting satisfaction', { error });
      res.status(500).json({ error: 'Failed to predict satisfaction' });
    }
  }

  /**
   * GET /api/omni/predictive-analytics/customers/:customerId/predictions
   */
  async getCustomerPredictions(req: Request, res: Response): Promise<void> {
    try {
      const { customerId } = req.params;
      const tenantId = req.user?.companyId;

      if (!tenantId) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }

      const predictions = await this.customerPredictionService.getCustomerPredictions(
        customerId,
        tenantId
      );

      res.json(predictions);
    } catch (error) {
      this.logger.error('Error getting customer predictions', { error });
      res.status(500).json({ error: 'Failed to get customer predictions' });
    }
  }

  /**
   * POST /api/omni/predictive-analytics/predictions/:predictionId/actual-outcome
   */
  async recordActualOutcome(req: Request, res: Response): Promise<void> {
    try {
      const { predictionId } = req.params;
      const { actual_outcome } = req.body;
      const tenantId = req.user?.companyId;

      if (!tenantId || !actual_outcome) {
        res.status(400).json({ error: 'Missing required fields' });
        return;
      }

      await this.customerPredictionService.recordActualOutcome(
        predictionId,
        tenantId,
        actual_outcome
      );

      res.json({ message: 'Actual outcome recorded successfully' });
    } catch (error) {
      this.logger.error('Error recording actual outcome', { error });
      res.status(500).json({ error: 'Failed to record actual outcome' });
    }
  }

  // ==================== Anomaly Detection ====================

  /**
   * POST /api/omni/predictive-analytics/anomalies/detect/behavioral
   */
  async detectBehavioralAnomaly(req: Request, res: Response): Promise<void> {
    try {
      const { entity_type, entity_id, current_metrics, options } = req.body;
      const tenantId = req.user?.companyId;

      if (!tenantId || !entity_type || !entity_id || !current_metrics) {
        res.status(400).json({ error: 'Missing required fields' });
        return;
      }

      const anomaly = await this.anomalyService.detectBehavioralAnomaly(
        entity_type,
        entity_id,
        tenantId,
        current_metrics,
        options
      );

      res.json(anomaly || { message: 'No anomaly detected' });
    } catch (error) {
      this.logger.error('Error detecting behavioral anomaly', { error });
      res.status(500).json({ error: 'Failed to detect behavioral anomaly' });
    }
  }

  /**
   * POST /api/omni/predictive-analytics/anomalies/detect/performance
   */
  async detectPerformanceAnomaly(req: Request, res: Response): Promise<void> {
    try {
      const { entity_type, entity_id, performance_metrics, options } = req.body;
      const tenantId = req.user?.companyId;

      if (!tenantId || !entity_type || !entity_id || !performance_metrics) {
        res.status(400).json({ error: 'Missing required fields' });
        return;
      }

      const anomaly = await this.anomalyService.detectPerformanceAnomaly(
        entity_type,
        entity_id,
        tenantId,
        performance_metrics,
        options
      );

      res.json(anomaly || { message: 'No anomaly detected' });
    } catch (error) {
      this.logger.error('Error detecting performance anomaly', { error });
      res.status(500).json({ error: 'Failed to detect performance anomaly' });
    }
  }

  /**
   * POST /api/omni/predictive-analytics/anomalies/detect/data-quality
   */
  async detectDataQualityAnomaly(req: Request, res: Response): Promise<void> {
    try {
      const { entity_type, entity_id, data_metrics } = req.body;
      const tenantId = req.user?.companyId;

      if (!tenantId || !entity_type || !entity_id || !data_metrics) {
        res.status(400).json({ error: 'Missing required fields' });
        return;
      }

      const anomaly = await this.anomalyService.detectDataQualityAnomaly(
        entity_type,
        entity_id,
        tenantId,
        data_metrics
      );

      res.json(anomaly || { message: 'No anomaly detected' });
    } catch (error) {
      this.logger.error('Error detecting data quality anomaly', { error });
      res.status(500).json({ error: 'Failed to detect data quality anomaly' });
    }
  }

  /**
   * POST /api/omni/predictive-analytics/anomalies/detect/security
   */
  async detectSecurityAnomaly(req: Request, res: Response): Promise<void> {
    try {
      const { entity_type, entity_id, security_metrics } = req.body;
      const tenantId = req.user?.companyId;

      if (!tenantId || !entity_type || !entity_id || !security_metrics) {
        res.status(400).json({ error: 'Missing required fields' });
        return;
      }

      const anomaly = await this.anomalyService.detectSecurityAnomaly(
        entity_type,
        entity_id,
        tenantId,
        security_metrics
      );

      res.json(anomaly || { message: 'No anomaly detected' });
    } catch (error) {
      this.logger.error('Error detecting security anomaly', { error });
      res.status(500).json({ error: 'Failed to detect security anomaly' });
    }
  }

  /**
   * GET /api/omni/predictive-analytics/anomalies/unresolved
   */
  async getUnresolvedAnomalies(req: Request, res: Response): Promise<void> {
    try {
      const tenantId = req.user?.companyId;
      const limit = req.query.limit ? parseInt(req.query.limit as string) : undefined;

      if (!tenantId) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }

      const anomalies = await this.anomalyService.getUnresolvedAnomalies(tenantId, limit);

      res.json(anomalies);
    } catch (error) {
      this.logger.error('Error getting unresolved anomalies', { error });
      res.status(500).json({ error: 'Failed to get unresolved anomalies' });
    }
  }

  /**
   * GET /api/omni/predictive-analytics/anomalies/severity/:severity
   */
  async getAnomaliesBySeverity(req: Request, res: Response): Promise<void> {
    try {
      const { severity } = req.params;
      const tenantId = req.user?.companyId;
      const limit = req.query.limit ? parseInt(req.query.limit as string) : undefined;

      if (!tenantId) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }

      const anomalies = await this.anomalyService.getAnomaliesBySeverity(
        severity as any,
        tenantId,
        limit
      );

      res.json(anomalies);
    } catch (error) {
      this.logger.error('Error getting anomalies by severity', { error });
      res.status(500).json({ error: 'Failed to get anomalies by severity' });
    }
  }

  /**
   * POST /api/omni/predictive-analytics/anomalies/:anomalyId/acknowledge
   */
  async acknowledgeAnomaly(req: Request, res: Response): Promise<void> {
    try {
      const { anomalyId } = req.params;
      const tenantId = req.user?.companyId;

      if (!tenantId) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }

      await this.anomalyService.acknowledgeAnomaly(anomalyId, tenantId);

      res.json({ message: 'Anomaly acknowledged successfully' });
    } catch (error) {
      this.logger.error('Error acknowledging anomaly', { error });
      res.status(500).json({ error: 'Failed to acknowledge anomaly' });
    }
  }

  /**
   * POST /api/omni/predictive-analytics/anomalies/:anomalyId/resolve
   */
  async resolveAnomaly(req: Request, res: Response): Promise<void> {
    try {
      const { anomalyId } = req.params;
      const { is_false_positive } = req.body;
      const tenantId = req.user?.companyId;

      if (!tenantId) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }

      await this.anomalyService.resolveAnomaly(anomalyId, tenantId, is_false_positive || false);

      res.json({ message: 'Anomaly resolved successfully' });
    } catch (error) {
      this.logger.error('Error resolving anomaly', { error });
      res.status(500).json({ error: 'Failed to resolve anomaly' });
    }
  }

  // ==================== Demand Forecasting ====================

  /**
   * POST /api/omni/predictive-analytics/forecast/demand
   */
  async forecastDemand(req: Request, res: Response): Promise<void> {
    try {
      const { resource_type, options } = req.body;
      const tenantId = req.user?.companyId;

      if (!tenantId || !resource_type || !options?.horizon) {
        res.status(400).json({ error: 'Missing required fields' });
        return;
      }

      const forecasts = await this.forecastingService.forecastDemand(
        resource_type,
        tenantId,
        options
      );

      res.json(forecasts);
    } catch (error) {
      this.logger.error('Error forecasting demand', { error });
      res.status(500).json({ error: 'Failed to forecast demand' });
    }
  }

  /**
   * GET /api/omni/predictive-analytics/forecast/:resourceType
   */
  async getForecastsByResourceType(req: Request, res: Response): Promise<void> {
    try {
      const { resourceType } = req.params;
      const tenantId = req.user?.companyId;
      const limit = req.query.limit ? parseInt(req.query.limit as string) : undefined;

      if (!tenantId) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }

      const forecasts = await this.forecastingService.getForecastsByResourceType(
        resourceType,
        tenantId,
        limit
      );

      res.json(forecasts);
    } catch (error) {
      this.logger.error('Error getting forecasts', { error });
      res.status(500).json({ error: 'Failed to get forecasts' });
    }
  }

  /**
   * POST /api/omni/predictive-analytics/forecast/:forecastId/actual-demand
   */
  async recordActualDemand(req: Request, res: Response): Promise<void> {
    try {
      const { forecastId } = req.params;
      const { actual_demand } = req.body;
      const tenantId = req.user?.companyId;

      if (!tenantId || actual_demand === undefined) {
        res.status(400).json({ error: 'Missing required fields' });
        return;
      }

      const accuracy = await this.forecastingService.recordActualDemand(
        forecastId,
        tenantId,
        actual_demand
      );

      res.json({ message: 'Actual demand recorded successfully', accuracy });
    } catch (error) {
      this.logger.error('Error recording actual demand', { error });
      res.status(500).json({ error: 'Failed to record actual demand' });
    }
  }

  /**
   * GET /api/omni/predictive-analytics/forecast/:resourceType/accuracy
   */
  async getForecastAccuracy(req: Request, res: Response): Promise<void> {
    try {
      const { resourceType } = req.params;
      const tenantId = req.user?.companyId;

      if (!tenantId) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }

      const accuracy = await this.forecastingService.getForecastAccuracy(
        resourceType,
        tenantId
      );

      res.json(accuracy);
    } catch (error) {
      this.logger.error('Error getting forecast accuracy', { error });
      res.status(500).json({ error: 'Failed to get forecast accuracy' });
    }
  }
}
