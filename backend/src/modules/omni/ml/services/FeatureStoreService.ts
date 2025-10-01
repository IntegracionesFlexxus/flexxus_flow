/**
 * Feature Store Service - Sprint 12
 * Service for feature engineering and management
 */

import { injectable, inject } from 'inversify';
import { TYPES } from '@/container/types';
import { FeatureStoreRepository, IFeature, IFeatureValue } from '../repositories/FeatureStoreRepository';
import { FeatureDataType } from '../../types/ml.types';

@injectable()
export class FeatureStoreService {
  constructor(
    @inject(TYPES.FeatureStoreRepository)
    private featureStoreRepository: FeatureStoreRepository,

    @inject(TYPES.LoggerService)
    private logger: any
  ) {}

  /**
   * Register a new feature
   */
  async registerFeature(
    tenantId: string,
    featureGroup: string,
    featureName: string,
    featureType: FeatureDataType,
    options?: {
      description?: string;
      computationLogic?: string;
      defaultValue?: any;
      version?: string;
    }
  ): Promise<IFeature> {
    this.logger.info('Registering feature', { tenantId, featureGroup, featureName });

    return await this.featureStoreRepository.createFeature(
      tenantId,
      featureGroup,
      featureName,
      featureType,
      options
    );
  }

  /**
   * Get feature by ID
   */
  async getFeature(featureId: string, tenantId: string): Promise<IFeature> {
    const feature = await this.featureStoreRepository.getFeature(featureId, tenantId);

    if (!feature) {
      throw new Error(`Feature not found: ${featureId}`);
    }

    return feature;
  }

  /**
   * Get features by group
   */
  async getFeatureGroup(featureGroup: string, tenantId: string): Promise<IFeature[]> {
    return await this.featureStoreRepository.getFeaturesByGroup(featureGroup, tenantId);
  }

  /**
   * Compute and store feature value
   */
  async computeAndStoreFeature(
    featureId: string,
    entityId: string,
    tenantId: string,
    computeFunction?: (feature: IFeature) => Promise<any>
  ): Promise<IFeatureValue> {
    const feature = await this.getFeature(featureId, tenantId);

    let featureValue: any;

    if (computeFunction) {
      // Use provided computation function
      featureValue = await computeFunction(feature);
    } else if (feature.computation_logic) {
      // Use stored computation logic (would need to be evaluated safely)
      featureValue = await this.executeComputationLogic(feature, entityId, tenantId);
    } else if (feature.default_value) {
      // Use default value
      featureValue = feature.default_value;
    } else {
      throw new Error('No computation logic or default value provided for feature');
    }

    return await this.featureStoreRepository.storeFeatureValue(
      featureId,
      entityId,
      featureValue,
      tenantId
    );
  }

  /**
   * Get latest feature value for an entity
   */
  async getFeatureValue(
    featureId: string,
    entityId: string,
    tenantId: string
  ): Promise<any> {
    const featureValue = await this.featureStoreRepository.getFeatureValue(
      featureId,
      entityId,
      tenantId
    );

    if (!featureValue) {
      const feature = await this.getFeature(featureId, tenantId);
      return feature.default_value;
    }

    return featureValue.feature_value;
  }

  /**
   * Get feature history for an entity
   */
  async getFeatureHistory(
    featureId: string,
    entityId: string,
    tenantId: string,
    limit: number = 100
  ): Promise<IFeatureValue[]> {
    return await this.featureStoreRepository.getFeatureHistory(
      featureId,
      entityId,
      tenantId,
      limit
    );
  }

  /**
   * Get all features for an entity
   */
  async getEntityFeatures(
    entityId: string,
    featureGroup: string,
    tenantId: string
  ): Promise<Record<string, any>> {
    const features = await this.getFeatureGroup(featureGroup, tenantId);

    const featureValues: Record<string, any> = {};

    await Promise.all(
      features.map(async (feature) => {
        const value = await this.getFeatureValue(feature.id, entityId, tenantId);
        featureValues[feature.feature_name] = value;
      })
    );

    return featureValues;
  }

  /**
   * Execute computation logic (mock implementation)
   * In production, this would safely evaluate the stored logic
   */
  private async executeComputationLogic(
    feature: IFeature,
    entityId: string,
    tenantId: string
  ): Promise<any> {
    this.logger.debug('Executing computation logic (mock)', {
      featureId: feature.id,
      entityId
    });

    // Mock computation - in production, this would execute the actual logic
    // Could use a sandboxed environment or pre-defined functions
    return Math.random();
  }
}
