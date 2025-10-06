/**
 * A/B Testing Service - Sprint 12 Fase 4
 * Business logic for A/B testing ML models
 */

import { injectable, inject } from 'inversify';
import { TYPES } from '@/container/types';
import { ABTestRepository, IABTest, IABTestResult } from '../repositories/ABTestRepository';
import { TestStatus, TestVariant } from '../../types/monitoring.types';
import { LoggerFactory } from '@/shared/services/logger/LoggerService';

@injectable()
export class ABTestingService {
  constructor(
    @inject(TYPES.ABTestRepository)
    private abTestRepo: ABTestRepository,

    @inject(TYPES.Logger)
    private logger: Logger
  ) {}

  async createTest(
    tenantId: string,
    testName: string,
    controlDeploymentId: string,
    variantDeployments: Record<string, string>,
    trafficSplit: Record<string, number>,
    successMetrics: string[],
    options?: {
      description?: string;
      createdBy?: string;
    }
  ): Promise<IABTest> {
    try {
      return await this.abTestRepo.createTest(
        tenantId,
        testName,
        controlDeploymentId,
        variantDeployments,
        trafficSplit,
        successMetrics,
        options
      );
    } catch (error) {
      this.logger.error('Error creating A/B test', { testName, tenantId, error });
      throw new Error('Failed to create A/B test');
    }
  }

  async startTest(testId: string, tenantId: string): Promise<void> {
    try {
      await this.abTestRepo.startTest(testId, tenantId);
    } catch (error) {
      this.logger.error('Error starting A/B test', { testId, tenantId, error });
      throw new Error('Failed to start A/B test');
    }
  }

  async endTest(testId: string, tenantId: string): Promise<void> {
    try {
      await this.abTestRepo.endTest(testId, tenantId);
    } catch (error) {
      this.logger.error('Error ending A/B test', { testId, tenantId, error });
      throw new Error('Failed to end A/B test');
    }
  }

  async recordResult(
    testId: string,
    tenantId: string,
    variant: TestVariant,
    deploymentId: string,
    metricName: string,
    metricValue: number,
    sampleSize: number
  ): Promise<IABTestResult> {
    try {
      return await this.abTestRepo.recordResult(
        testId,
        tenantId,
        variant,
        deploymentId,
        metricName,
        metricValue,
        sampleSize
      );
    } catch (error) {
      this.logger.error('Error recording A/B test result', { testId, tenantId, error });
      throw new Error('Failed to record A/B test result');
    }
  }

  async getTestResults(testId: string, tenantId: string) {
    try {
      return await this.abTestRepo.getAggregatedResults(testId, tenantId);
    } catch (error) {
      this.logger.error('Error getting A/B test results', { testId, tenantId, error });
      throw new Error('Failed to get A/B test results');
    }
  }

  async getAllTests(tenantId: string): Promise<IABTest[]> {
    try {
      return await this.abTestRepo.findAll(tenantId);
    } catch (error) {
      this.logger.error('Error getting all A/B tests', { tenantId, error });
      throw new Error('Failed to get all A/B tests');
    }
  }
}
