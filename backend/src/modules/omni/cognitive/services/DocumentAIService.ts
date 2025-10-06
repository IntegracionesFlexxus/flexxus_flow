/**
 * Document AI Service - Sprint 12 Fase 4
 * Business logic for intelligent document processing
 */

import { injectable, inject } from 'inversify';
import { TYPES } from '@/container/types';
import { DocumentAIRepository, IDocumentAnalysis } from '../repositories/DocumentAIRepository';
import { DocumentType, ProcessingStatus } from '../../types/cognitive.types';
import { LoggerFactory } from '@/shared/services/logger/LoggerService';

@injectable()
export class DocumentAIService {
  constructor(
    @inject(TYPES.DocumentAIRepository)
    private documentRepo: DocumentAIRepository,

    @inject(TYPES.Logger)
    private logger: Logger
  ) {}

  async processDocument(
    tenantId: string,
    documentId: string,
    documentType: DocumentType,
    documentContent: string,
    options?: {
      originalFilename?: string;
      storagePath?: string;
      processingModel?: string;
    }
  ): Promise<IDocumentAnalysis> {
    try {
      // Create document analysis record
      const analysis = await this.documentRepo.create(tenantId, documentId, documentType, options);

      // Update status to processing
      await this.documentRepo.updateStatus(analysis.id, tenantId, ProcessingStatus.PROCESSING);

      // Simulate document processing (in production, call actual ML model)
      const { extractedText, extractedEntities, confidenceScores } = this.mockDocumentProcessing(
        documentContent,
        documentType
      );

      // Update with results
      await this.documentRepo.updateExtractionResults(
        analysis.id,
        tenantId,
        extractedText,
        extractedEntities,
        confidenceScores
      );

      return (await this.documentRepo.findById(analysis.id, tenantId))!;
    } catch (error) {
      this.logger.error('Error processing document', { documentId, tenantId, error });
      throw new Error('Failed to process document');
    }
  }

  async getDocumentAnalysis(documentId: string, tenantId: string): Promise<IDocumentAnalysis | null> {
    return await this.documentRepo.findByDocumentId(documentId, tenantId);
  }

  private mockDocumentProcessing(content: string, type: DocumentType) {
    return {
      extractedText: content,
      extractedEntities: {
        persons: [],
        organizations: [],
        dates: [],
        amounts: []
      },
      confidenceScores: {
        text_extraction: 0.95,
        entity_recognition: 0.88
      }
    };
  }
}
