/**
 * Document AI Repository - Sprint 12 Fase 4
 * Data access layer for intelligent document processing
 */

import { injectable, inject } from 'inversify';
import { Pool } from 'pg';
import { TYPES } from '@/container/types';
import { DocumentType, ProcessingStatus } from '../../types/cognitive.types';

export interface IDocumentAnalysis {
  id: string;
  tenant_id: string;
  document_id: string;
  document_type: DocumentType;
  original_filename?: string;
  storage_path?: string;
  extracted_text?: string;
  extracted_entities: Record<string, any>;
  confidence_scores: Record<string, number>;
  processing_status: ProcessingStatus;
  processing_model?: string;
  processing_started_at?: Date;
  processing_completed_at?: Date;
  error_message?: string;
  metadata?: Record<string, any>;
  created_at: Date;
}

@injectable()
export class DocumentAIRepository {
  constructor(
    @inject(TYPES.OmniConnection)
    private db: Pool
  ) {}

  async create(
    tenantId: string,
    documentId: string,
    documentType: DocumentType,
    options?: {
      originalFilename?: string;
      storagePath?: string;
      processingModel?: string;
      metadata?: Record<string, any>;
    }
  ): Promise<IDocumentAnalysis> {
    const query = `
      INSERT INTO document_analysis (
        tenant_id, document_id, document_type, original_filename,
        storage_path, processing_model, metadata
      ) VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING *
    `;

    const values = [
      tenantId,
      documentId,
      documentType,
      options?.originalFilename,
      options?.storagePath,
      options?.processingModel,
      options?.metadata ? JSON.stringify(options.metadata) : null
    ];

    const result = await this.db.query(query, values);
    return this.mapToDocumentAnalysis(result.rows[0]);
  }

  async findById(id: string, tenantId: string): Promise<IDocumentAnalysis | null> {
    const query = 'SELECT * FROM document_analysis WHERE id = $1 AND tenant_id = $2';
    const result = await this.db.query(query, [id, tenantId]);
    return result.rows[0] ? this.mapToDocumentAnalysis(result.rows[0]) : null;
  }

  async findByDocumentId(documentId: string, tenantId: string): Promise<IDocumentAnalysis | null> {
    const query = 'SELECT * FROM document_analysis WHERE document_id = $1 AND tenant_id = $2';
    const result = await this.db.query(query, [documentId, tenantId]);
    return result.rows[0] ? this.mapToDocumentAnalysis(result.rows[0]) : null;
  }

  async findByStatus(
    status: ProcessingStatus,
    tenantId: string,
    limit: number = 100
  ): Promise<IDocumentAnalysis[]> {
    const query = `
      SELECT * FROM document_analysis
      WHERE processing_status = $1 AND tenant_id = $2
      ORDER BY created_at DESC
      LIMIT $3
    `;
    const result = await this.db.query(query, [status, tenantId, limit]);
    return result.rows.map(row => this.mapToDocumentAnalysis(row));
  }

  async findByDocumentType(
    documentType: DocumentType,
    tenantId: string,
    limit: number = 100
  ): Promise<IDocumentAnalysis[]> {
    const query = `
      SELECT * FROM document_analysis
      WHERE document_type = $1 AND tenant_id = $2
      ORDER BY created_at DESC
      LIMIT $3
    `;
    const result = await this.db.query(query, [documentType, tenantId, limit]);
    return result.rows.map(row => this.mapToDocumentAnalysis(row));
  }

  async updateStatus(
    id: string,
    tenantId: string,
    status: ProcessingStatus,
    errorMessage?: string
  ): Promise<void> {
    const query = `
      UPDATE document_analysis
      SET processing_status = $1,
          processing_started_at = CASE WHEN $1 = 'processing' THEN CURRENT_TIMESTAMP ELSE processing_started_at END,
          processing_completed_at = CASE WHEN $1 IN ('completed', 'failed') THEN CURRENT_TIMESTAMP ELSE processing_completed_at END,
          error_message = $2
      WHERE id = $3 AND tenant_id = $4
    `;
    await this.db.query(query, [status, errorMessage, id, tenantId]);
  }

  async updateExtractionResults(
    id: string,
    tenantId: string,
    extractedText: string,
    extractedEntities: Record<string, any>,
    confidenceScores: Record<string, number>
  ): Promise<void> {
    const query = `
      UPDATE document_analysis
      SET extracted_text = $1,
          extracted_entities = $2,
          confidence_scores = $3,
          processing_status = 'completed',
          processing_completed_at = CURRENT_TIMESTAMP
      WHERE id = $4 AND tenant_id = $5
    `;
    await this.db.query(query, [
      extractedText,
      JSON.stringify(extractedEntities),
      JSON.stringify(confidenceScores),
      id,
      tenantId
    ]);
  }

  private mapToDocumentAnalysis(row: any): IDocumentAnalysis {
    return {
      id: row.id,
      tenant_id: row.tenant_id,
      document_id: row.document_id,
      document_type: row.document_type,
      original_filename: row.original_filename,
      storage_path: row.storage_path,
      extracted_text: row.extracted_text,
      extracted_entities: row.extracted_entities || {},
      confidence_scores: row.confidence_scores || {},
      processing_status: row.processing_status,
      processing_model: row.processing_model,
      processing_started_at: row.processing_started_at,
      processing_completed_at: row.processing_completed_at,
      error_message: row.error_message,
      metadata: row.metadata,
      created_at: row.created_at
    };
  }
}
