/**
 * Anomaly Detection Service - Sprint 12 Fase 3
 * Business logic for detecting anomalies in system metrics and customer behavior
 */

import { injectable, inject } from 'inversify';
import { TYPES } from '@/container/types';
import { AnomalyRepository, IAnomaly } from './AnomalyRepository';
import { FeatureStoreService } from '../../ml/services/FeatureStoreService';
import { PredictionService } from '../../ml/services/PredictionService';
import { AnomalyType, AnomalySeverity } from '../../types/prediction.types';
import { Logger } from '@/utils/logger';

interface DetectionResult {
  isAnomaly: boolean;
  anomalyScore: number;
  severity: AnomalySeverity;
  description?: string;
}

@injectable()
export class AnomalyDetectionService {
  constructor(
    @inject(TYPES.AnomalyRepository)
    private anomalyRepo: AnomalyRepository,

    @inject(TYPES.FeatureStoreService)
    private featureStoreService: FeatureStoreService,

    @inject(TYPES.PredictionService)
    private predictionService: PredictionService,

    @inject(TYPES.Logger)
    private logger: Logger
  ) {}

  /**
   * Detect behavioral anomalies for an entity (customer, agent, etc.)
   */
  async detectBehavioralAnomaly(
    entityType: string,
    entityId: string,
    tenantId: string,
    currentMetrics: Record<string, any>,
    options?: {
      deploymentId?: string;
      detectionModel?: string;
      threshold?: number;
    }
  ): Promise<IAnomaly | null> {
    try {
      // Get historical features
      const historicalFeatures = await this.featureStoreService.getFeatures(
        tenantId,
        entityType,
        entityId
      );

      let detectionResult: DetectionResult;

      if (options?.deploymentId) {
        // Use ML model for detection
        const mlPrediction = await this.predictionService.predict(
          options.deploymentId,
          currentMetrics,
          tenantId
        );

        detectionResult = {
          isAnomaly: (mlPrediction.prediction_value as number) > (options.threshold || 0.7),
          anomalyScore: mlPrediction.prediction_value as number,
          severity: this.calculateSeverity(mlPrediction.prediction_value as number),
          description: 'ML-based behavioral anomaly detected'
        };
      } else {
        // Use statistical methods (Z-score)
        detectionResult = this.detectUsingZScore(
          currentMetrics,
          historicalFeatures.feature_values,
          options?.threshold || 3.0
        );
      }

      if (detectionResult.isAnomaly) {
        return await this.anomalyRepo.create(
          entityType,
          entityId,
          AnomalyType.BEHAVIORAL,
          detectionResult.anomalyScore,
          detectionResult.severity,
          currentMetrics,
          tenantId,
          {
            description: detectionResult.description,
            detectionModel: options?.detectionModel || 'z-score-v1'
          }
        );
      }

      return null;
    } catch (error) {
      this.logger.error('Error detecting behavioral anomaly', { entityType, entityId, tenantId, error });
      throw new Error('Failed to detect behavioral anomaly');
    }
  }

  /**
   * Detect performance anomalies in system metrics
   */
  async detectPerformanceAnomaly(
    entityType: string,
    entityId: string,
    tenantId: string,
    performanceMetrics: Record<string, any>,
    options?: {
      deploymentId?: string;
      threshold?: number;
    }
  ): Promise<IAnomaly | null> {
    try {
      const historicalFeatures = await this.featureStoreService.getFeatures(
        tenantId,
        `${entityType}_performance`,
        entityId
      );

      let detectionResult: DetectionResult;

      if (options?.deploymentId) {
        const mlPrediction = await this.predictionService.predict(
          options.deploymentId,
          performanceMetrics,
          tenantId
        );

        detectionResult = {
          isAnomaly: (mlPrediction.prediction_value as number) > (options.threshold || 0.7),
          anomalyScore: mlPrediction.prediction_value as number,
          severity: this.calculateSeverity(mlPrediction.prediction_value as number),
          description: 'Performance degradation detected'
        };
      } else {
        // Use IQR method for performance metrics
        detectionResult = this.detectUsingIQR(
          performanceMetrics,
          historicalFeatures.feature_values
        );
      }

      if (detectionResult.isAnomaly) {
        return await this.anomalyRepo.create(
          entityType,
          entityId,
          AnomalyType.PERFORMANCE,
          detectionResult.anomalyScore,
          detectionResult.severity,
          performanceMetrics,
          tenantId,
          {
            description: detectionResult.description,
            detectionModel: 'iqr-v1'
          }
        );
      }

      return null;
    } catch (error) {
      this.logger.error('Error detecting performance anomaly', { entityType, entityId, tenantId, error });
      throw new Error('Failed to detect performance anomaly');
    }
  }

  /**
   * Detect data quality anomalies
   */
  async detectDataQualityAnomaly(
    entityType: string,
    entityId: string,
    tenantId: string,
    dataMetrics: Record<string, any>
  ): Promise<IAnomaly | null> {
    try {
      const detectionResult = this.detectDataQualityIssues(dataMetrics);

      if (detectionResult.isAnomaly) {
        return await this.anomalyRepo.create(
          entityType,
          entityId,
          AnomalyType.DATA_QUALITY,
          detectionResult.anomalyScore,
          detectionResult.severity,
          dataMetrics,
          tenantId,
          {
            description: detectionResult.description,
            detectionModel: 'data-quality-rules-v1'
          }
        );
      }

      return null;
    } catch (error) {
      this.logger.error('Error detecting data quality anomaly', { entityType, entityId, tenantId, error });
      throw new Error('Failed to detect data quality anomaly');
    }
  }

  /**
   * Detect security anomalies
   */
  async detectSecurityAnomaly(
    entityType: string,
    entityId: string,
    tenantId: string,
    securityMetrics: Record<string, any>
  ): Promise<IAnomaly | null> {
    try {
      const detectionResult = this.detectSecurityIssues(securityMetrics);

      if (detectionResult.isAnomaly) {
        return await this.anomalyRepo.create(
          entityType,
          entityId,
          AnomalyType.SECURITY,
          detectionResult.anomalyScore,
          detectionResult.severity,
          securityMetrics,
          tenantId,
          {
            description: detectionResult.description,
            detectionModel: 'security-rules-v1'
          }
        );
      }

      return null;
    } catch (error) {
      this.logger.error('Error detecting security anomaly', { entityType, entityId, tenantId, error });
      throw new Error('Failed to detect security anomaly');
    }
  }

  /**
   * Get unresolved anomalies
   */
  async getUnresolvedAnomalies(tenantId: string, limit?: number): Promise<IAnomaly[]> {
    try {
      return await this.anomalyRepo.findUnresolved(tenantId, limit);
    } catch (error) {
      this.logger.error('Error getting unresolved anomalies', { tenantId, error });
      throw new Error('Failed to get unresolved anomalies');
    }
  }

  /**
   * Get anomalies by severity
   */
  async getAnomaliesBySeverity(
    severity: AnomalySeverity,
    tenantId: string,
    limit?: number
  ): Promise<IAnomaly[]> {
    try {
      return await this.anomalyRepo.findBySeverity(severity, tenantId, limit);
    } catch (error) {
      this.logger.error('Error getting anomalies by severity', { severity, tenantId, error });
      throw new Error('Failed to get anomalies by severity');
    }
  }

  /**
   * Acknowledge an anomaly
   */
  async acknowledgeAnomaly(anomalyId: string, tenantId: string): Promise<void> {
    try {
      await this.anomalyRepo.acknowledge(anomalyId, tenantId);
    } catch (error) {
      this.logger.error('Error acknowledging anomaly', { anomalyId, tenantId, error });
      throw new Error('Failed to acknowledge anomaly');
    }
  }

  /**
   * Resolve an anomaly
   */
  async resolveAnomaly(
    anomalyId: string,
    tenantId: string,
    isFalsePositive: boolean = false
  ): Promise<void> {
    try {
      await this.anomalyRepo.resolve(anomalyId, tenantId, isFalsePositive);
    } catch (error) {
      this.logger.error('Error resolving anomaly', { anomalyId, tenantId, error });
      throw new Error('Failed to resolve anomaly');
    }
  }

  // ==================== Private Detection Methods ====================

  /**
   * Z-score based anomaly detection
   */
  private detectUsingZScore(
    currentMetrics: Record<string, any>,
    historicalMetrics: Record<string, any>,
    threshold: number = 3.0
  ): DetectionResult {
    const anomalyScores: number[] = [];
    const anomalousFeatures: string[] = [];

    for (const [key, value] of Object.entries(currentMetrics)) {
      if (typeof value !== 'number') continue;

      const historicalValues = historicalMetrics[`${key}_history`] as number[] || [];
      if (historicalValues.length < 2) continue;

      const mean = historicalValues.reduce((a, b) => a + b, 0) / historicalValues.length;
      const variance = historicalValues.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / historicalValues.length;
      const stdDev = Math.sqrt(variance);

      if (stdDev === 0) continue;

      const zScore = Math.abs((value - mean) / stdDev);
      anomalyScores.push(zScore);

      if (zScore > threshold) {
        anomalousFeatures.push(key);
      }
    }

    const maxZScore = Math.max(...anomalyScores, 0);
    const isAnomaly = maxZScore > threshold;
    const normalizedScore = Math.min(maxZScore / 5, 1.0); // Normalize to 0-1

    return {
      isAnomaly,
      anomalyScore: normalizedScore,
      severity: this.calculateSeverity(normalizedScore),
      description: isAnomaly
        ? `Z-score anomaly detected in features: ${anomalousFeatures.join(', ')}`
        : undefined
    };
  }

  /**
   * IQR (Interquartile Range) based anomaly detection
   */
  private detectUsingIQR(
    currentMetrics: Record<string, any>,
    historicalMetrics: Record<string, any>
  ): DetectionResult {
    const anomalyScores: number[] = [];
    const anomalousFeatures: string[] = [];

    for (const [key, value] of Object.entries(currentMetrics)) {
      if (typeof value !== 'number') continue;

      const historicalValues = historicalMetrics[`${key}_history`] as number[] || [];
      if (historicalValues.length < 4) continue;

      const sorted = [...historicalValues].sort((a, b) => a - b);
      const q1 = sorted[Math.floor(sorted.length * 0.25)];
      const q3 = sorted[Math.floor(sorted.length * 0.75)];
      const iqr = q3 - q1;

      const lowerBound = q1 - 1.5 * iqr;
      const upperBound = q3 + 1.5 * iqr;

      if (value < lowerBound || value > upperBound) {
        const distanceFromBound = Math.min(
          Math.abs(value - lowerBound),
          Math.abs(value - upperBound)
        );
        const normalizedDistance = Math.min(distanceFromBound / (iqr || 1), 1.0);
        anomalyScores.push(normalizedDistance);
        anomalousFeatures.push(key);
      }
    }

    const maxScore = Math.max(...anomalyScores, 0);
    const isAnomaly = anomalyScores.length > 0;

    return {
      isAnomaly,
      anomalyScore: maxScore,
      severity: this.calculateSeverity(maxScore),
      description: isAnomaly
        ? `IQR outliers detected in features: ${anomalousFeatures.join(', ')}`
        : undefined
    };
  }

  /**
   * Data quality issue detection
   */
  private detectDataQualityIssues(dataMetrics: Record<string, any>): DetectionResult {
    let anomalyScore = 0;
    const issues: string[] = [];

    // Check for null/missing values
    const nullRate = dataMetrics.null_value_rate || 0;
    if (nullRate > 0.1) {
      anomalyScore += 0.3;
      issues.push(`High null value rate: ${(nullRate * 100).toFixed(1)}%`);
    }

    // Check for duplicate records
    const duplicateRate = dataMetrics.duplicate_rate || 0;
    if (duplicateRate > 0.05) {
      anomalyScore += 0.2;
      issues.push(`High duplicate rate: ${(duplicateRate * 100).toFixed(1)}%`);
    }

    // Check for data freshness
    const dataAgeDays = dataMetrics.data_age_days || 0;
    if (dataAgeDays > 7) {
      anomalyScore += 0.3;
      issues.push(`Stale data: ${dataAgeDays} days old`);
    }

    // Check for schema violations
    const schemaViolations = dataMetrics.schema_violations || 0;
    if (schemaViolations > 0) {
      anomalyScore += 0.2;
      issues.push(`${schemaViolations} schema violations`);
    }

    anomalyScore = Math.min(anomalyScore, 1.0);

    return {
      isAnomaly: anomalyScore > 0.3,
      anomalyScore,
      severity: this.calculateSeverity(anomalyScore),
      description: issues.length > 0 ? issues.join('; ') : undefined
    };
  }

  /**
   * Security issue detection
   */
  private detectSecurityIssues(securityMetrics: Record<string, any>): DetectionResult {
    let anomalyScore = 0;
    const issues: string[] = [];

    // Check failed login attempts
    const failedLogins = securityMetrics.failed_login_attempts || 0;
    if (failedLogins > 5) {
      anomalyScore += 0.4;
      issues.push(`High failed login attempts: ${failedLogins}`);
    }

    // Check suspicious IP access
    const suspiciousIPs = securityMetrics.suspicious_ip_count || 0;
    if (suspiciousIPs > 0) {
      anomalyScore += 0.3;
      issues.push(`${suspiciousIPs} suspicious IP addresses detected`);
    }

    // Check unusual access patterns
    const unusualAccessHour = securityMetrics.access_hour;
    if (unusualAccessHour !== undefined && (unusualAccessHour < 6 || unusualAccessHour > 22)) {
      anomalyScore += 0.2;
      issues.push(`Unusual access time: ${unusualAccessHour}:00`);
    }

    // Check privilege escalation attempts
    const privilegeEscalation = securityMetrics.privilege_escalation_attempts || 0;
    if (privilegeEscalation > 0) {
      anomalyScore += 0.5;
      issues.push(`${privilegeEscalation} privilege escalation attempts`);
    }

    anomalyScore = Math.min(anomalyScore, 1.0);

    return {
      isAnomaly: anomalyScore > 0.3,
      anomalyScore,
      severity: this.calculateSeverity(anomalyScore),
      description: issues.length > 0 ? issues.join('; ') : undefined
    };
  }

  /**
   * Calculate severity based on anomaly score
   */
  private calculateSeverity(anomalyScore: number): AnomalySeverity {
    if (anomalyScore >= 0.8) return AnomalySeverity.CRITICAL;
    if (anomalyScore >= 0.6) return AnomalySeverity.HIGH;
    if (anomalyScore >= 0.4) return AnomalySeverity.MEDIUM;
    return AnomalySeverity.LOW;
  }
}
