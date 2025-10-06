/**
 * Customer Behavior Prediction Service - Sprint 12 Fase 3
 * Business logic for predicting customer behavior patterns
 */

import { injectable, inject } from 'inversify';
import { TYPES } from '@/container/types';
import { CustomerPredictionRepository, ICustomerPrediction } from './CustomerPredictionRepository';
import { FeatureStoreService } from '../../ml/services/FeatureStoreService';
import { PredictionService } from '../../ml/services/PredictionService';
import { BehaviorPredictionType } from '../../types/prediction.types';
import { LoggerFactory } from '@/shared/services/logger/LoggerService';

@injectable()
export class CustomerBehaviorPredictionService {
  constructor(
    @inject(TYPES.CustomerPredictionRepository)
    private customerPredictionRepo: CustomerPredictionRepository,

    @inject(TYPES.FeatureStoreService)
    private featureStoreService: FeatureStoreService,

    @inject(TYPES.PredictionService)
    private predictionService: PredictionService,

    @inject(TYPES.Logger)
    private logger: Logger
  ) {}

  /**
   * Predict churn risk for a customer
   */
  async predictChurnRisk(
    customerId: string,
    tenantId: string,
    deploymentId?: string
  ): Promise<ICustomerPrediction> {
    try {
      // Extract features from feature store
      const featureId = `customer_${customerId}`;
      const features = await this.featureStoreService.getFeature(
        featureId,
        tenantId
      );

      // Use ML model or fallback to heuristic
      let predictionValue: Record<string, any>;
      let confidenceScore: number;

      if (deploymentId) {
        const mlPrediction = await this.predictionService.predict(
          deploymentId,
          features as any,
          tenantId
        );

        predictionValue = {
          churn_probability: (mlPrediction as any).value || 0,
          risk_level: this.calculateRiskLevel((mlPrediction as any).value || 0)
        };
        confidenceScore = mlPrediction.confidence_score || 0.8;
      } else {
        // Heuristic fallback
        predictionValue = this.calculateChurnHeuristic(features.feature_values);
        confidenceScore = 0.6;
      }

      // Calculate prediction horizon (30 days)
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 30);

      return await this.customerPredictionRepo.create(
        customerId,
        tenantId,
        BehaviorPredictionType.CHURN_RISK,
        predictionValue,
        confidenceScore,
        features.feature_values,
        {
          predictionHorizon: 30,
          modelVersion: deploymentId || 'heuristic-v1',
          expiresAt
        }
      );
    } catch (error) {
      this.logger.error('Error predicting churn risk', { customerId, tenantId, error });
      throw new Error('Failed to predict churn risk');
    }
  }

  /**
   * Predict next purchase timing and category
   */
  async predictNextPurchase(
    customerId: string,
    tenantId: string,
    deploymentId?: string
  ): Promise<ICustomerPrediction> {
    try {
      const featureId = `customer_${customerId}`;
      const features = await this.featureStoreService.getFeature(
        featureId,
        tenantId
      );

      let predictionValue: Record<string, any>;
      let confidenceScore: number;

      if (deploymentId) {
        const mlPrediction = await this.predictionService.predict(
          deploymentId,
          features as any,
          tenantId
        );

        predictionValue = (mlPrediction as any).value || {};
        confidenceScore = mlPrediction.confidence_score || 0.75;
      } else {
        predictionValue = this.calculateNextPurchaseHeuristic(features as any);
        confidenceScore = 0.55;
      }

      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 90);

      return await this.customerPredictionRepo.create(
        customerId,
        tenantId,
        BehaviorPredictionType.NEXT_PURCHASE,
        predictionValue,
        confidenceScore,
        features.feature_values,
        {
          predictionHorizon: 90,
          modelVersion: deploymentId || 'heuristic-v1',
          expiresAt
        }
      );
    } catch (error) {
      this.logger.error('Error predicting next purchase', { customerId, tenantId, error });
      throw new Error('Failed to predict next purchase');
    }
  }

  /**
   * Predict customer engagement level
   */
  async predictEngagement(
    customerId: string,
    tenantId: string,
    deploymentId?: string
  ): Promise<ICustomerPrediction> {
    try {
      const featureId = `customer_${customerId}`;
      const features = await this.featureStoreService.getFeature(
        featureId,
        tenantId
      );

      let predictionValue: Record<string, any>;
      let confidenceScore: number;

      if (deploymentId) {
        const mlPrediction = await this.predictionService.predict(
          deploymentId,
          features as any,
          tenantId
        );

        predictionValue = {
          engagement_score: (mlPrediction as any).value || 0,
          engagement_level: this.calculateEngagementLevel((mlPrediction as any).value || 0)
        };
        confidenceScore = mlPrediction.confidence_score || 0.8;
      } else {
        predictionValue = this.calculateEngagementHeuristic(features as any);
        confidenceScore = 0.65;
      }

      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 7);

      return await this.customerPredictionRepo.create(
        customerId,
        tenantId,
        BehaviorPredictionType.ENGAGEMENT,
        predictionValue,
        confidenceScore,
        features.feature_values,
        {
          predictionHorizon: 7,
          modelVersion: deploymentId || 'heuristic-v1',
          expiresAt
        }
      );
    } catch (error) {
      this.logger.error('Error predicting engagement', { customerId, tenantId, error });
      throw new Error('Failed to predict engagement');
    }
  }

  /**
   * Predict customer satisfaction
   */
  async predictSatisfaction(
    customerId: string,
    tenantId: string,
    deploymentId?: string
  ): Promise<ICustomerPrediction> {
    try {
      const featureId = `customer_${customerId}`;
      const features = await this.featureStoreService.getFeature(
        featureId,
        tenantId
      );

      let predictionValue: Record<string, any>;
      let confidenceScore: number;

      if (deploymentId) {
        const mlPrediction = await this.predictionService.predict(
          deploymentId,
          features as any,
          tenantId
        );

        predictionValue = {
          satisfaction_score: mlPrediction.prediction_value,
          nps_category: this.calculateNPSCategory(mlPrediction.prediction_value as number)
        };
        confidenceScore = mlPrediction.confidence_score || 0.75;
      } else {
        predictionValue = this.calculateSatisfactionHeuristic(features.feature_values);
        confidenceScore = 0.6;
      }

      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 14);

      return await this.customerPredictionRepo.create(
        customerId,
        tenantId,
        BehaviorPredictionType.SATISFACTION,
        predictionValue,
        confidenceScore,
        features.feature_values,
        {
          predictionHorizon: 14,
          modelVersion: deploymentId || 'heuristic-v1',
          expiresAt
        }
      );
    } catch (error) {
      this.logger.error('Error predicting satisfaction', { customerId, tenantId, error });
      throw new Error('Failed to predict satisfaction');
    }
  }

  /**
   * Get predictions for a customer
   */
  async getCustomerPredictions(
    customerId: string,
    tenantId: string
  ): Promise<ICustomerPrediction[]> {
    try {
      return await this.customerPredictionRepo.findByCustomerId(customerId, tenantId);
    } catch (error) {
      this.logger.error('Error getting customer predictions', { customerId, tenantId, error });
      throw new Error('Failed to get customer predictions');
    }
  }

  /**
   * Record actual outcome for prediction accuracy tracking
   */
  async recordActualOutcome(
    predictionId: string,
    tenantId: string,
    actualOutcome: Record<string, any>
  ): Promise<void> {
    try {
      await this.customerPredictionRepo.recordActualOutcome(predictionId, tenantId, actualOutcome);
    } catch (error) {
      this.logger.error('Error recording actual outcome', { predictionId, tenantId, error });
      throw new Error('Failed to record actual outcome');
    }
  }

  // ==================== Private Heuristic Methods ====================

  private calculateChurnHeuristic(features: Record<string, any>): Record<string, any> {
    // Simple heuristic based on recency, frequency, monetary value
    const daysSinceLastPurchase = features.days_since_last_purchase || 180;
    const purchaseFrequency = features.purchase_frequency || 0;
    const supportTickets = features.support_tickets_last_90d || 0;

    let churnProbability = 0;

    // Recency factor
    if (daysSinceLastPurchase > 90) churnProbability += 0.3;
    if (daysSinceLastPurchase > 180) churnProbability += 0.2;

    // Frequency factor
    if (purchaseFrequency < 1) churnProbability += 0.2;

    // Support issues factor
    if (supportTickets > 3) churnProbability += 0.3;

    churnProbability = Math.min(churnProbability, 1.0);

    return {
      churn_probability: churnProbability,
      risk_level: this.calculateRiskLevel(churnProbability)
    };
  }

  private calculateNextPurchaseHeuristic(features: Record<string, any>): Record<string, any> {
    const avgDaysBetweenPurchases = features.avg_days_between_purchases || 60;
    const lastPurchaseCategory = features.last_purchase_category || 'unknown';

    return {
      estimated_days: Math.round(avgDaysBetweenPurchases),
      likely_category: lastPurchaseCategory,
      estimated_value: features.avg_order_value || 0
    };
  }

  private calculateEngagementHeuristic(features: Record<string, any>): Record<string, any> {
    const loginFrequency = features.logins_last_30d || 0;
    const sessionDuration = features.avg_session_duration_minutes || 0;
    const interactionCount = features.interactions_last_30d || 0;

    let engagementScore = 0;

    if (loginFrequency > 15) engagementScore += 0.4;
    else if (loginFrequency > 5) engagementScore += 0.2;

    if (sessionDuration > 15) engagementScore += 0.3;
    else if (sessionDuration > 5) engagementScore += 0.15;

    if (interactionCount > 20) engagementScore += 0.3;
    else if (interactionCount > 10) engagementScore += 0.15;

    return {
      engagement_score: Math.min(engagementScore, 1.0),
      engagement_level: this.calculateEngagementLevel(engagementScore)
    };
  }

  private calculateSatisfactionHeuristic(features: Record<string, any>): Record<string, any> {
    const npsScore = features.last_nps_score || 7;
    const csatScore = features.last_csat_score || 3.5;
    const complaintCount = features.complaints_last_90d || 0;

    // Normalize to 0-1 scale
    let satisfactionScore = (npsScore / 10) * 0.5 + (csatScore / 5) * 0.3;

    if (complaintCount > 0) satisfactionScore -= 0.2;

    satisfactionScore = Math.max(0, Math.min(1, satisfactionScore));

    return {
      satisfaction_score: satisfactionScore,
      nps_category: this.calculateNPSCategory(satisfactionScore * 10)
    };
  }

  private calculateRiskLevel(probability: number): string {
    if (probability >= 0.7) return 'high';
    if (probability >= 0.4) return 'medium';
    return 'low';
  }

  private calculateEngagementLevel(score: number): string {
    if (score >= 0.7) return 'high';
    if (score >= 0.4) return 'medium';
    return 'low';
  }

  private calculateNPSCategory(score: number): string {
    if (score >= 9) return 'promoter';
    if (score >= 7) return 'passive';
    return 'detractor';
  }
}
