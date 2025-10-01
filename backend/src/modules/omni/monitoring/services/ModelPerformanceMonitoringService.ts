/**
 * Model Performance Monitoring Service - Sprint 12 Fase 4
 * Business logic for monitoring ML model performance
 */

import { injectable, inject } from 'inversify';
import { TYPES } from '@/container/types';
import { ModelMonitoringRepository, IModelMetrics } from '../repositories/ModelMonitoringRepository';
import { Logger } from '@/utils/logger';

@injectable()
export class ModelPerformanceMonitoringService {
  constructor(
    @inject(TYPES.ModelMonitoringRepository)
    private monitoringRepo: ModelMonitoringRepository,

    @inject(TYPES.Logger)
    private logger: Logger
  ) {}

  async recordMetrics(
    tenantId: string,
    deploymentId: string,
    metrics: {
      accuracy?: number;
      precision?: number;
      recall?: number;
      f1Score?: number;
      aucRoc?: number;
      latencyMs?: number;
      throughputRps?: number;
      errorRate?: number;
      customMetrics?: Record<string, number>;
      sampleSize?: number;
    }
  ): Promise<IModelMetrics> {
    try {
      return await this.monitoringRepo.recordMetrics(tenantId, deploymentId, metrics);
    } catch (error) {
      this.logger.error('Error recording metrics', { deploymentId, tenantId, error });
      throw new Error('Failed to record metrics');
    }
  }

  async getMetricsHistory(
    deploymentId: string,
    tenantId: string,
    limit?: number
  ): Promise<IModelMetrics[]> {
    try {
      return await this.monitoringRepo.findByDeploymentId(deploymentId, tenantId, limit);
    } catch (error) {
      this.logger.error('Error getting metrics history', { deploymentId, tenantId, error });
      throw new Error('Failed to get metrics history');
    }
  }

  async getAverageMetrics(
    deploymentId: string,
    tenantId: string,
    hours: number = 24
  ): Promise<Partial<IModelMetrics>> {
    try {
      return await this.monitoringRepo.getAverageMetrics(deploymentId, tenantId, hours);
    } catch (error) {
      this.logger.error('Error getting average metrics', { deploymentId, tenantId, error });
      throw new Error('Failed to get average metrics');
    }
  }

  async getLatestMetrics(
    deploymentId: string,
    tenantId: string
  ): Promise<IModelMetrics | null> {
    try {
      return await this.monitoringRepo.getLatestMetrics(deploymentId, tenantId);
    } catch (error) {
      this.logger.error('Error getting latest metrics', { deploymentId, tenantId, error });
      throw new Error('Failed to get latest metrics');
    }
  }
}
