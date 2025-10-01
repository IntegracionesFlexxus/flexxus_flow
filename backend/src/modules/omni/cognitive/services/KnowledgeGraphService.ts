/**
 * Knowledge Graph Service - Sprint 12 Fase 4
 * Business logic for knowledge graph management
 */

import { injectable, inject } from 'inversify';
import { TYPES } from '@/container/types';
import {
  KnowledgeGraphRepository,
  IKnowledgeEntity,
  IKnowledgeRelationship
} from '../repositories/KnowledgeGraphRepository';
import { EntityType, RelationshipType } from '../../types/cognitive.types';
import { Logger } from '@/utils/logger';

@injectable()
export class KnowledgeGraphService {
  constructor(
    @inject(TYPES.KnowledgeGraphRepository)
    private knowledgeRepo: KnowledgeGraphRepository,

    @inject(TYPES.Logger)
    private logger: Logger
  ) {}

  async createEntity(
    tenantId: string,
    entityType: EntityType,
    entityName: string,
    properties: Record<string, any>,
    options?: {
      entityDescription?: string;
      confidenceScore?: number;
    }
  ): Promise<IKnowledgeEntity> {
    try {
      return await this.knowledgeRepo.createEntity(
        tenantId,
        entityType,
        entityName,
        properties,
        options
      );
    } catch (error) {
      this.logger.error('Error creating entity', { entityName, tenantId, error });
      throw new Error('Failed to create entity');
    }
  }

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
    try {
      return await this.knowledgeRepo.createRelationship(
        tenantId,
        sourceEntityId,
        targetEntityId,
        relationshipType,
        options
      );
    } catch (error) {
      this.logger.error('Error creating relationship', { sourceEntityId, targetEntityId, error });
      throw new Error('Failed to create relationship');
    }
  }

  async getConnectedEntities(
    entityId: string,
    tenantId: string,
    relationshipType?: RelationshipType
  ): Promise<Array<{ entity: IKnowledgeEntity; relationship: IKnowledgeRelationship }>> {
    try {
      return await this.knowledgeRepo.findConnectedEntities(entityId, tenantId, relationshipType);
    } catch (error) {
      this.logger.error('Error getting connected entities', { entityId, tenantId, error });
      throw new Error('Failed to get connected entities');
    }
  }

  async searchEntities(searchTerm: string, tenantId: string): Promise<IKnowledgeEntity[]> {
    try {
      return await this.knowledgeRepo.searchEntitiesByName(searchTerm, tenantId);
    } catch (error) {
      this.logger.error('Error searching entities', { searchTerm, tenantId, error });
      throw new Error('Failed to search entities');
    }
  }
}
