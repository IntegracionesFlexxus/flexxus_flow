/**
 * Feature Store Repository - Sprint 12
 * Data access layer for feature engineering and storage
 */

import { injectable, inject } from 'inversify';
import { Pool } from 'pg';
import { TYPES } from '@/container/types';
import { FeatureDataType } from '../../types/ml.types';

export interface IFeature {
  id: string;
  tenant_id: string;
  feature_group: string;
  feature_name: string;
  feature_type: FeatureDataType;
  description?: string;
  computation_logic?: string;
  default_value?: any;
  is_active: boolean;
  version: string;
  created_at: Date;
  updated_at: Date;
  feature_values?: any[]; // Historical values for trend analysis
}

export interface IFeatureValue {
  id: string;
  feature_id: string;
  entity_id: string;
  feature_value: any;
  computed_at: Date;
  tenant_id: string;
}

@injectable()
export class FeatureStoreRepository {
  constructor(
    @inject(TYPES.OmniConnection)
    private db: Pool
  ) {}

  async createFeature(
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
    const query = `
      INSERT INTO feature_store (
        tenant_id, feature_group, feature_name, feature_type,
        description, computation_logic, default_value, version
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING *
    `;

    const values = [
      tenantId,
      featureGroup,
      featureName,
      featureType,
      options?.description,
      options?.computationLogic,
      options?.defaultValue ? JSON.stringify(options.defaultValue) : null,
      options?.version || '1.0'
    ];

    const result = await this.db.query(query, values);
    return this.mapToFeature(result.rows[0]);
  }

  async getFeature(featureId: string, tenantId: string): Promise<IFeature | null> {
    const query = 'SELECT * FROM feature_store WHERE id = $1 AND tenant_id = $2';
    const result = await this.db.query(query, [featureId, tenantId]);
    return result.rows[0] ? this.mapToFeature(result.rows[0]) : null;
  }

  async getFeaturesByGroup(featureGroup: string, tenantId: string): Promise<IFeature[]> {
    const query = `
      SELECT * FROM feature_store
      WHERE feature_group = $1 AND tenant_id = $2 AND is_active = true
      ORDER BY feature_name
    `;
    const result = await this.db.query(query, [featureGroup, tenantId]);
    return result.rows.map(row => this.mapToFeature(row));
  }

  async storeFeatureValue(
    featureId: string,
    entityId: string,
    featureValue: any,
    tenantId: string
  ): Promise<IFeatureValue> {
    const query = `
      INSERT INTO feature_values (feature_id, entity_id, feature_value, tenant_id)
      VALUES ($1, $2, $3, $4)
      RETURNING *
    `;

    const values = [
      featureId,
      entityId,
      JSON.stringify(featureValue),
      tenantId
    ];

    const result = await this.db.query(query, values);
    return this.mapToFeatureValue(result.rows[0]);
  }

  async getFeatureValue(
    featureId: string,
    entityId: string,
    tenantId: string
  ): Promise<IFeatureValue | null> {
    const query = `
      SELECT * FROM feature_values
      WHERE feature_id = $1 AND entity_id = $2 AND tenant_id = $3
      ORDER BY computed_at DESC
      LIMIT 1
    `;
    const result = await this.db.query(query, [featureId, entityId, tenantId]);
    return result.rows[0] ? this.mapToFeatureValue(result.rows[0]) : null;
  }

  async getFeatureHistory(
    featureId: string,
    entityId: string,
    tenantId: string,
    limit: number = 100
  ): Promise<IFeatureValue[]> {
    const query = `
      SELECT * FROM feature_values
      WHERE feature_id = $1 AND entity_id = $2 AND tenant_id = $3
      ORDER BY computed_at DESC
      LIMIT $4
    `;
    const result = await this.db.query(query, [featureId, entityId, tenantId, limit]);
    return result.rows.map(row => this.mapToFeatureValue(row));
  }

  private mapToFeature(row: any): IFeature {
    return {
      id: row.id,
      tenant_id: row.tenant_id,
      feature_group: row.feature_group,
      feature_name: row.feature_name,
      feature_type: row.feature_type,
      description: row.description,
      computation_logic: row.computation_logic,
      default_value: row.default_value,
      is_active: row.is_active,
      version: row.version,
      created_at: row.created_at,
      updated_at: row.updated_at
    };
  }

  private mapToFeatureValue(row: any): IFeatureValue {
    return {
      id: row.id,
      feature_id: row.feature_id,
      entity_id: row.entity_id,
      feature_value: row.feature_value,
      computed_at: row.computed_at,
      tenant_id: row.tenant_id
    };
  }
}
