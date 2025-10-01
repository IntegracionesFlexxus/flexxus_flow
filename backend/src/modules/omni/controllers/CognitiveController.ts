/**
 * Cognitive Services Controller - Sprint 12 Fase 4
 * REST API endpoints for cognitive services
 */

import { Request, Response } from 'express';
import { injectable, inject } from 'inversify';
import { TYPES } from '@/container/types';
import { DocumentAIService } from '../cognitive/services/DocumentAIService';
import { VoiceAnalyticsService } from '../cognitive/services/VoiceAnalyticsService';
import { KnowledgeGraphService } from '../cognitive/services/KnowledgeGraphService';
import { Logger } from '@/utils/logger';

@injectable()
export class CognitiveController {
  constructor(
    @inject(TYPES.DocumentAIService)
    private documentService: DocumentAIService,

    @inject(TYPES.VoiceAnalyticsService)
    private voiceService: VoiceAnalyticsService,

    @inject(TYPES.KnowledgeGraphService)
    private knowledgeService: KnowledgeGraphService,

    @inject(TYPES.Logger)
    private logger: Logger
  ) {}

  // Document AI
  async processDocument(req: Request, res: Response): Promise<void> {
    try {
      const { document_id, document_type, document_content, options } = req.body;
      const tenantId = req.user?.tenant_id;

      if (!tenantId || !document_id || !document_type || !document_content) {
        res.status(400).json({ error: 'Missing required fields' });
        return;
      }

      const result = await this.documentService.processDocument(
        tenantId,
        document_id,
        document_type,
        document_content,
        options
      );

      res.json(result);
    } catch (error) {
      this.logger.error('Error processing document', { error });
      res.status(500).json({ error: 'Failed to process document' });
    }
  }

  async getDocumentAnalysis(req: Request, res: Response): Promise<void> {
    try {
      const { documentId } = req.params;
      const tenantId = req.user?.tenant_id;

      if (!tenantId) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }

      const result = await this.documentService.getDocumentAnalysis(documentId, tenantId);
      res.json(result);
    } catch (error) {
      this.logger.error('Error getting document analysis', { error });
      res.status(500).json({ error: 'Failed to get document analysis' });
    }
  }

  // Voice Analytics
  async analyzeVoice(req: Request, res: Response): Promise<void> {
    try {
      const { interaction_id, transcript, options } = req.body;
      const tenantId = req.user?.tenant_id;

      if (!tenantId || !interaction_id || !transcript) {
        res.status(400).json({ error: 'Missing required fields' });
        return;
      }

      const result = await this.voiceService.analyzeVoice(tenantId, interaction_id, transcript, options);
      res.json(result);
    } catch (error) {
      this.logger.error('Error analyzing voice', { error });
      res.status(500).json({ error: 'Failed to analyze voice' });
    }
  }

  async getVoiceAnalysis(req: Request, res: Response): Promise<void> {
    try {
      const { interactionId } = req.params;
      const tenantId = req.user?.tenant_id;

      if (!tenantId) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }

      const result = await this.voiceService.getAnalysis(interactionId, tenantId);
      res.json(result);
    } catch (error) {
      this.logger.error('Error getting voice analysis', { error });
      res.status(500).json({ error: 'Failed to get voice analysis' });
    }
  }

  // Knowledge Graph
  async createEntity(req: Request, res: Response): Promise<void> {
    try {
      const { entity_type, entity_name, properties, options } = req.body;
      const tenantId = req.user?.tenant_id;

      if (!tenantId || !entity_type || !entity_name || !properties) {
        res.status(400).json({ error: 'Missing required fields' });
        return;
      }

      const result = await this.knowledgeService.createEntity(
        tenantId,
        entity_type,
        entity_name,
        properties,
        options
      );
      res.json(result);
    } catch (error) {
      this.logger.error('Error creating entity', { error });
      res.status(500).json({ error: 'Failed to create entity' });
    }
  }

  async createRelationship(req: Request, res: Response): Promise<void> {
    try {
      const { source_entity_id, target_entity_id, relationship_type, options } = req.body;
      const tenantId = req.user?.tenant_id;

      if (!tenantId || !source_entity_id || !target_entity_id || !relationship_type) {
        res.status(400).json({ error: 'Missing required fields' });
        return;
      }

      const result = await this.knowledgeService.createRelationship(
        tenantId,
        source_entity_id,
        target_entity_id,
        relationship_type,
        options
      );
      res.json(result);
    } catch (error) {
      this.logger.error('Error creating relationship', { error });
      res.status(500).json({ error: 'Failed to create relationship' });
    }
  }

  async getConnectedEntities(req: Request, res: Response): Promise<void> {
    try {
      const { entityId } = req.params;
      const { relationship_type } = req.query;
      const tenantId = req.user?.tenant_id;

      if (!tenantId) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }

      const result = await this.knowledgeService.getConnectedEntities(
        entityId,
        tenantId,
        relationship_type as any
      );
      res.json(result);
    } catch (error) {
      this.logger.error('Error getting connected entities', { error });
      res.status(500).json({ error: 'Failed to get connected entities' });
    }
  }

  async searchEntities(req: Request, res: Response): Promise<void> {
    try {
      const { q } = req.query;
      const tenantId = req.user?.tenant_id;

      if (!tenantId || !q) {
        res.status(400).json({ error: 'Missing search query' });
        return;
      }

      const result = await this.knowledgeService.searchEntities(q as string, tenantId);
      res.json(result);
    } catch (error) {
      this.logger.error('Error searching entities', { error });
      res.status(500).json({ error: 'Failed to search entities' });
    }
  }
}
