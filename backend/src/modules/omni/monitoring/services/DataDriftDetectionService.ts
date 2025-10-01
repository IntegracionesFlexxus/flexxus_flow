/**
 * Data Drift Detection Service - Sprint 12 Fase 4
 * Business logic for detecting data and concept drift
 */

import { injectable, inject } from 'inversify';
import { TYPES } from '@/container/types';
import { DriftDetectionRepository, IDriftDetection } from '../repositories/DriftDetectionRepository';
import { DriftType, DriftSeverity } from '../../types/monitoring.types';
import { Logger } from '@/utils/logger';

@injectable()
export class DataDriftDetectionService {
  constructor(
    @inject(TYPES.DriftDetectionRepository)
    private driftRepo: DriftDetectionRepository,

    @inject(TYPES.Logger)
    private logger: Logger
  ) {}

  async detectDrift(
    tenantId: string,
    deploymentId: string,
    baselineData: Record<string, any>[],
    currentData: Record<string, any>[]
  ): Promise<IDriftDetection | null> {
    try {
      const driftAnalysis = this.calculateDrift(baselineData, currentData);

      if (driftAnalysis.driftScore > 0.3) {
        return await this.driftRepo.create(
          tenantId,
          deploymentId,
          DriftType.DATA_DRIFT,
          driftAnalysis.severity,
          driftAnalysis.driftScore,
          {
            affectedFeatures: driftAnalysis.affectedFeatures,
            statisticalTests: driftAnalysis.statisticalTests
          }
        );
      }

      return null;
    } catch (error) {
      this.logger.error('Error detecting drift', { deploymentId, tenantId, error });
      throw new Error('Failed to detect drift');
    }
  }

  async getUnresolvedDrift(tenantId: string, deploymentId?: string): Promise<IDriftDetection[]> {
    try {
      return await this.driftRepo.findUnresolved(tenantId, deploymentId);
    } catch (error) {
      this.logger.error('Error getting unresolved drift', { tenantId, error });
      throw new Error('Failed to get unresolved drift');
    }
  }

  async acknowledgeDrift(driftId: string, tenantId: string): Promise<void> {
    try {
      await this.driftRepo.acknowledge(driftId, tenantId);
    } catch (error) {
      this.logger.error('Error acknowledging drift', { driftId, tenantId, error });
      throw new Error('Failed to acknowledge drift');
    }
  }

  async resolveDrift(driftId: string, tenantId: string): Promise<void> {
    try {
      await this.driftRepo.resolve(driftId, tenantId);
    } catch (error) {
      this.logger.error('Error resolving drift', { driftId, tenantId, error });
      throw new Error('Failed to resolve drift');
    }
  }

  private calculateDrift(baseline: Record<string, any>[], current: Record<string, any>[]) {
    // Mock drift calculation - in production, use KS test, PSI, etc.
    const driftScore = Math.random() * 0.5;

    return {
      driftScore,
      severity:
        driftScore > 0.7
          ? DriftSeverity.CRITICAL
          : driftScore > 0.5
            ? DriftSeverity.HIGH
            : driftScore > 0.3
              ? DriftSeverity.MEDIUM
              : DriftSeverity.LOW,
      affectedFeatures: ['feature_1', 'feature_2'],
      statisticalTests: {
        ks_test: { statistic: 0.15, p_value: 0.02 }
      }
    };
  }
}
