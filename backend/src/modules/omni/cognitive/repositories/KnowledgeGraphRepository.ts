/**
 * Knowledge Graph Repository - Sprint 12 Fase 4
 * Data access layer for knowledge graph entities and relationships
 */

import { injectable, inject } from 'inversify';
import { Pool } from 'pg';
import { TYPES } from '@/container/types';
import { EntityType, RelationshipType } from '../../types/cognitive.types';

export interface IKnowledgeEntity {
  id: string;
  tenant_id: string;
  entity_type: EntityType;
  entity_name: string;
  entity_description?: string;
  properties: Record<string, any>;
  confidence_score?: number;
  source_references?: string[];
  created_at: Date;
  updated_at: Date;
}

export interface IKnowledgeRelationship {
  id: string;
  tenant_id: string;
  source_entity_id: string;
  target_entity_id: string;
  relationship_type: RelationshipType;
  relationship_properties?: Record<string, any>;
  confidence_score?: number;
  created_at: Date;
}

@injectable()
export class KnowledgeGraphRepository {
  constructor(
    @inject(TYPES.OmniConnection)
    private db: Pool
  ) {}

  // ==================== Entity Operations ====================

  async createEntity(
    tenantId: string,
    entityType: EntityType,
    entityName: string,
    properties: Record<string, any>,
    options?: {
      entityDescription?: string;
      confidenceScore?: number;
      sourceReferences?: string[];
    }
  ): Promise<IKnowledgeEntity> {
    const query = `
      INSERT INTO knowledge_entities (
        tenant_id, entity_type, entity_name, entity_description,
        properties, confidence_score, source_references
      ) VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING *
    `;

    const values = [
      tenantId,
      entityType,
      entityName,
      options?.entityDescription,
      JSON.stringify(properties),
      options?.confidenceScore,
      options?.sourceReferences ? JSON.stringify(options.sourceReferences) : null
    ];

    const result = await this.db.query(query, values);
    return this.mapToEntity(result.rows[0]);
  }

  async findEntityById(id: string, tenantId: string): Promise<IKnowledgeEntity | null> {
    const query = 'SELECT * FROM knowledge_entities WHERE id = $1 AND tenant_id = $2';
    const result = await this.db.query(query, [id, tenantId]);
    return result.rows[0] ? this.mapToEntity(result.rows[0]) : null;
  }

  async findEntitiesByType(
    entityType: EntityType,
    tenantId: string,
    limit: number = 100
  ): Promise<IKnowledgeEntity[]> {
    const query = `
      SELECT * FROM knowledge_entities
      WHERE entity_type = $1 AND tenant_id = $2
      ORDER BY created_at DESC
      LIMIT $3
    `;
    const result = await this.db.query(query, [entityType, tenantId, limit]);
    return result.rows.map(row => this.mapToEntity(row));
  }

  async searchEntitiesByName(
    searchTerm: string,
    tenantId: string,
    limit: number = 50
  ): Promise<IKnowledgeEntity[]> {
    const query = `
      SELECT * FROM knowledge_entities
      WHERE tenant_id = $1
        AND entity_name ILIKE $2
      ORDER BY confidence_score DESC NULLS LAST, created_at DESC
      LIMIT $3
    `;
    const result = await this.db.query(query, [tenantId, `%${searchTerm}%`, limit]);
    return result.rows.map(row => this.mapToEntity(row));
  }

  async updateEntity(
    id: string,
    tenantId: string,
    updates: {
      entityName?: string;
      entityDescription?: string;
      properties?: Record<string, any>;
      confidenceScore?: number;
    }
  ): Promise<void> {
    const fields: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;

    if (updates.entityName !== undefined) {
      fields.push(`entity_name = $${paramIndex++}`);
      values.push(updates.entityName);
    }
    if (updates.entityDescription !== undefined) {
      fields.push(`entity_description = $${paramIndex++}`);
      values.push(updates.entityDescription);
    }
    if (updates.properties !== undefined) {
      fields.push(`properties = $${paramIndex++}`);
      values.push(JSON.stringify(updates.properties));
    }
    if (updates.confidenceScore !== undefined) {
      fields.push(`confidence_score = $${paramIndex++}`);
      values.push(updates.confidenceScore);
    }

    if (fields.length === 0) return;

    fields.push(`updated_at = CURRENT_TIMESTAMP`);
    values.push(id, tenantId);

    const query = `
      UPDATE knowledge_entities
      SET ${fields.join(', ')}
      WHERE id = $${paramIndex++} AND tenant_id = $${paramIndex++}
    `;

    await this.db.query(query, values);
  }

  async deleteEntity(id: string, tenantId: string): Promise<void> {
    // Delete relationships first
    await this.db.query(
      'DELETE FROM knowledge_relationships WHERE (source_entity_id = $1 OR target_entity_id = $1) AND tenant_id = $2',
      [id, tenantId]
    );

    // Delete entity
    await this.db.query(
      'DELETE FROM knowledge_entities WHERE id = $1 AND tenant_id = $2',
      [id, tenantId]
    );
  }

  // ==================== Relationship Operations ====================

  async createRelationship(
    tenantId: string,
    sourceEntityId: string,
    targetEntityId: string,
    relationshipType: RelationshipType,
    options?: {
      relationshipProperties?: Record<string, any>;
      confidenceScore?: number;
    }
  ): Promise<IKnowledgeRelationship> {
    const query = `
      INSERT INTO knowledge_relationships (
        tenant_id, source_entity_id, target_entity_id,
        relationship_type, relationship_properties, confidence_score
      ) VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING *
    `;

    const values = [
      tenantId,
      sourceEntityId,
      targetEntityId,
      relationshipType,
      options?.relationshipProperties ? JSON.stringify(options.relationshipProperties) : null,
      options?.confidenceScore
    ];

    const result = await this.db.query(query, values);
    return this.mapToRelationship(result.rows[0]);
  }

  async findRelationshipsByEntity(
    entityId: string,
    tenantId: string,
    direction: 'outgoing' | 'incoming' | 'both' = 'both'
  ): Promise<IKnowledgeRelationship[]> {
    let whereClause: string;

    if (direction === 'outgoing') {
      whereClause = 'source_entity_id = $1';
    } else if (direction === 'incoming') {
      whereClause = 'target_entity_id = $1';
    } else {
      whereClause = '(source_entity_id = $1 OR target_entity_id = $1)';
    }

    const query = `
      SELECT * FROM knowledge_relationships
      WHERE ${whereClause} AND tenant_id = $2
      ORDER BY created_at DESC
    `;

    const result = await this.db.query(query, [entityId, tenantId]);
    return result.rows.map(row => this.mapToRelationship(row));
  }

  async findRelationshipsByType(
    relationshipType: RelationshipType,
    tenantId: string,
    limit: number = 100
  ): Promise<IKnowledgeRelationship[]> {
    const query = `
      SELECT * FROM knowledge_relationships
      WHERE relationship_type = $1 AND tenant_id = $2
      ORDER BY created_at DESC
      LIMIT $3
    `;
    const result = await this.db.query(query, [relationshipType, tenantId, limit]);
    return result.rows.map(row => this.mapToRelationship(row));
  }

  async deleteRelationship(id: string, tenantId: string): Promise<void> {
    await this.db.query(
      'DELETE FROM knowledge_relationships WHERE id = $1 AND tenant_id = $2',
      [id, tenantId]
    );
  }

  // ==================== Graph Queries ====================

  /**
   * Find connected entities (1 hop)
   */
  async findConnectedEntities(
    entityId: string,
    tenantId: string,
    relationshipType?: RelationshipType
  ): Promise<Array<{ entity: IKnowledgeEntity; relationship: IKnowledgeRelationship }>> {
    const query = `
      SELECT e.*, r.*,
             e.id as entity_id, r.id as relationship_id
      FROM knowledge_relationships r
      INNER JOIN knowledge_entities e
        ON (r.source_entity_id = $1 AND r.target_entity_id = e.id)
        OR (r.target_entity_id = $1 AND r.source_entity_id = e.id)
      WHERE r.tenant_id = $2 AND e.tenant_id = $2
        ${relationshipType ? 'AND r.relationship_type = $3' : ''}
      ORDER BY r.confidence_score DESC NULLS LAST
    `;

    const params = relationshipType ? [entityId, tenantId, relationshipType] : [entityId, tenantId];
    const result = await this.db.query(query, params);

    return result.rows.map(row => ({
      entity: this.mapToEntity({
        id: row.entity_id,
        tenant_id: row.tenant_id,
        entity_type: row.entity_type,
        entity_name: row.entity_name,
        entity_description: row.entity_description,
        properties: row.properties,
        confidence_score: row.confidence_score,
        source_references: row.source_references,
        created_at: row.created_at,
        updated_at: row.updated_at
      }),
      relationship: this.mapToRelationship({
        id: row.relationship_id,
        tenant_id: row.tenant_id,
        source_entity_id: row.source_entity_id,
        target_entity_id: row.target_entity_id,
        relationship_type: row.relationship_type,
        relationship_properties: row.relationship_properties,
        confidence_score: row.confidence_score,
        created_at: row.created_at
      })
    }));
  }

  // ==================== Private Mappers ====================

  private mapToEntity(row: any): IKnowledgeEntity {
    return {
      id: row.id,
      tenant_id: row.tenant_id,
      entity_type: row.entity_type,
      entity_name: row.entity_name,
      entity_description: row.entity_description,
      properties: row.properties || {},
      confidence_score: row.confidence_score ? parseFloat(row.confidence_score) : undefined,
      source_references: row.source_references,
      created_at: row.created_at,
      updated_at: row.updated_at
    };
  }

  private mapToRelationship(row: any): IKnowledgeRelationship {
    return {
      id: row.id,
      tenant_id: row.tenant_id,
      source_entity_id: row.source_entity_id,
      target_entity_id: row.target_entity_id,
      relationship_type: row.relationship_type,
      relationship_properties: row.relationship_properties,
      confidence_score: row.confidence_score ? parseFloat(row.confidence_score) : undefined,
      created_at: row.created_at
    };
  }
}
