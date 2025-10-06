/**
 * Document Template Repository - Sprint 19
 * Handles document templates and generation
 */

import { injectable, inject } from 'inversify';
import { PoolClient } from 'pg';
import { TYPES } from '@/container/types';
import { Logger } from 'winston';
import { IDatabaseConnection } from '@/shared/database/interfaces/IDatabaseConnection';
import { CRMBaseRepository } from './CRMBaseRepository';

export interface DocumentTemplate {
  template_id?: number;
  company_id: number;
  template_name: string;
  description?: string;
  template_type: TemplateType;
  template_category?: TemplateCategory;
  template_format?: TemplateFormat;
  template_content: string;
  template_styles?: string;
  variables?: any;
  sections?: any[];
  conditional_sections?: any[];
  page_settings?: any;
  header_template?: string;
  footer_template?: string;
  logo_url?: string;
  color_scheme?: any;
  is_active?: boolean;
  is_default?: boolean;
  times_used?: number;
  last_used_at?: Date;
  version_number?: number;
  parent_template_id?: number;
  tags?: string[];
  metadata?: any;
  created_at?: Date;
  updated_at?: Date;
  created_by?: number;
  updated_by?: number;
}

export interface GeneratedDocument {
  document_id?: number;
  company_id: number;
  template_id?: number;
  document_number?: string;
  document_name?: string;
  document_type: string;
  entity_type: string;
  entity_id: number;
  format: DocumentFormat;
  content?: string;
  file_url?: string;
  file_size?: number;
  status?: DocumentStatus;
  is_final?: boolean;
  generated_at?: Date;
  sent_at?: Date;
  viewed_at?: Date;
  signed_at?: Date;
  delivery_method?: DeliveryMethod;
  recipient_emails?: string[];
  cc_emails?: string[];
  requires_signature?: boolean;
  signature_status?: SignatureStatus;
  signature_data?: any;
  expires_at?: Date;
  is_expired?: boolean;
  view_count?: number;
  download_count?: number;
  last_viewed_at?: Date;
  metadata?: any;
  created_by?: number;
}

export interface DocumentVariable {
  variable_id?: number;
  company_id: number;
  variable_name: string;
  variable_key: string;
  variable_type: VariableType;
  data_source?: DataSource;
  source_entity?: string;
  source_field?: string;
  source_query?: string;
  format_pattern?: string;
  default_value?: string;
  is_required?: boolean;
  validation_rules?: any;
  is_computed?: boolean;
  computation_formula?: string;
  is_active?: boolean;
  description?: string;
  metadata?: any;
}

export interface TemplateVariable {
  key: string;
  type: string;
  label: string;
  required: boolean;
  default_value?: any;
  format?: string;
}

export type TemplateType = 'quote' | 'invoice' | 'contract' | 'proposal' | 'order';
export type TemplateCategory = 'sales' | 'purchase' | 'legal' | 'marketing';
export type TemplateFormat = 'html' | 'markdown' | 'docx';
export type DocumentFormat = 'pdf' | 'html' | 'docx' | 'xlsx';
export type DocumentStatus = 'draft' | 'final' | 'sent' | 'viewed' | 'signed';
export type DeliveryMethod = 'email' | 'download' | 'api';
export type SignatureStatus = 'pending' | 'signed' | 'declined';
export type VariableType = 'text' | 'number' | 'date' | 'currency' | 'boolean' | 'list';
export type DataSource = 'entity' | 'custom' | 'computed';

@injectable()
export class DocumentTemplateRepository extends CRMBaseRepository<DocumentTemplate> {
  constructor(
    @inject(TYPES.CRMDatabaseConnection) db: IDatabaseConnection,
    @inject(TYPES.Logger) logger: Logger
  ) {
    super('document_templates', db, logger);
  }

  /**
   * Save document template
   */
  async saveTemplate(template: DocumentTemplate, userId?: number): Promise<DocumentTemplate> {
    const query = `
      INSERT INTO document_templates (
        company_id, template_name, description, template_type, template_category,
        template_format, template_content, template_styles, variables, sections,
        conditional_sections, page_settings, header_template, footer_template,
        logo_url, color_scheme, is_active, is_default, version_number,
        parent_template_id, tags, metadata, created_by, updated_by
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24)
      RETURNING *
    `;

    const values = [
      template.company_id,
      template.template_name,
      template.description,
      template.template_type,
      template.template_category,
      template.template_format || 'html',
      template.template_content,
      template.template_styles,
      JSON.stringify(template.variables || {}),
      JSON.stringify(template.sections || []),
      JSON.stringify(template.conditional_sections || []),
      JSON.stringify(template.page_settings || {}),
      template.header_template,
      template.footer_template,
      template.logo_url,
      JSON.stringify(template.color_scheme || {}),
      template.is_active ?? true,
      template.is_default || false,
      template.version_number || 1,
      template.parent_template_id,
      template.tags,
      JSON.stringify(template.metadata || {}),
      userId || template.created_by,
      userId || template.updated_by
    ];

    const result = await this.db.query(query, values);
    return result.rows[0];
  }

  /**
   * Update document template
   */
  async updateTemplate(
    templateId: number,
    updates: Partial<DocumentTemplate>,
    userId?: number
  ): Promise<DocumentTemplate> {
    const fields = [];
    const values = [];
    let paramCount = 1;

    Object.entries(updates).forEach(([key, value]) => {
      if (key !== 'template_id' && value !== undefined) {
        fields.push(`${key} = $${paramCount}`);

        const jsonFields = ['variables', 'sections', 'conditional_sections',
                          'page_settings', 'color_scheme', 'metadata'];

        if (jsonFields.includes(key)) {
          values.push(JSON.stringify(value));
        } else {
          values.push(value);
        }
        paramCount++;
      }
    });

    if (userId) {
      fields.push(`updated_by = $${paramCount}`);
      values.push(userId);
      paramCount++;
    }

    fields.push(`updated_at = CURRENT_TIMESTAMP`);
    values.push(templateId);

    const query = `
      UPDATE document_templates
      SET ${fields.join(', ')}
      WHERE template_id = $${paramCount}
      RETURNING *
    `;

    const result = await this.db.query(query, values);
    return result.rows[0];
  }

  /**
   * Get templates by type
   */
  async getTemplatesByType(
    type: TemplateType,
    companyId: number,
    includeInactive: boolean = false
  ): Promise<DocumentTemplate[]> {
    const activeClause = includeInactive ? '' : 'AND is_active = true';

    const query = `
      SELECT * FROM document_templates
      WHERE template_type = $1
        AND company_id = $2
        ${activeClause}
      ORDER BY is_default DESC, template_name
    `;

    const result = await this.db.query(query, [type, companyId]);
    return result.rows;
  }

  /**
   * Get template by ID
   */
  async getTemplateById(templateId: number, companyId: number): Promise<DocumentTemplate | null> {
    const result = await this.db.query(
      `SELECT * FROM document_templates
       WHERE template_id = $1 AND company_id = $2`,
      [templateId, companyId]
    );

    return result.rows[0] || null;
  }

  /**
   * Get default template
   */
  async getDefaultTemplate(
    type: TemplateType,
    companyId: number
  ): Promise<DocumentTemplate | null> {
    const result = await this.db.query(
      `SELECT * FROM document_templates
       WHERE template_type = $1
         AND company_id = $2
         AND is_default = true
         AND is_active = true
       LIMIT 1`,
      [type, companyId]
    );

    return result.rows[0] || null;
  }

  /**
   * Clone template
   */
  async cloneTemplate(
    templateId: number,
    newName: string,
    userId?: number
  ): Promise<DocumentTemplate> {
    const client = await this.db.getClient();

    try {
      await client.query('BEGIN');

      // Get original template
      const originalResult = await client.query(
        `SELECT * FROM document_templates WHERE template_id = $1`,
        [templateId]
      );

      if (originalResult.rows.length === 0) {
        throw new Error('Template not found');
      }

      const original = originalResult.rows[0];

      // Create new version
      const newTemplate: DocumentTemplate = {
        ...original,
        template_id: undefined,
        template_name: newName,
        parent_template_id: templateId,
        version_number: original.version_number + 1,
        is_default: false,
        times_used: 0,
        last_used_at: undefined,
        created_by: userId,
        updated_by: userId
      };

      const savedTemplate = await this.saveTemplate(newTemplate, userId);

      await client.query('COMMIT');
      return savedTemplate;

    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Get template variables
   */
  async getTemplateVariables(templateId: number): Promise<TemplateVariable[]> {
    const template = await this.db.query(
      `SELECT variables FROM document_templates WHERE template_id = $1`,
      [templateId]
    );

    if (template.rows.length === 0) {
      return [];
    }

    const variables = JSON.parse(template.rows[0].variables || '{}');
    return this.extractVariables(variables);
  }

  /**
   * Extract variables from template
   */
  private extractVariables(variables: any): TemplateVariable[] {
    const result: TemplateVariable[] = [];

    if (Array.isArray(variables)) {
      return variables;
    }

    Object.entries(variables).forEach(([key, value]: [string, any]) => {
      if (typeof value === 'object' && value !== null) {
        result.push({
          key,
          type: value.type || 'text',
          label: value.label || key,
          required: value.required || false,
          default_value: value.default,
          format: value.format
        });
      } else {
        result.push({
          key,
          type: 'text',
          label: key,
          required: false
        });
      }
    });

    return result;
  }

  /**
   * Generate document
   */
  async generateDocument(
    document: GeneratedDocument,
    client?: PoolClient
  ): Promise<GeneratedDocument> {
    const queryClient = client || await this.db.getClient();

    try {
      if (!client) await queryClient.query('BEGIN');

      // Generate document number
      const documentNumber = await this.generateDocumentNumber(
        document.company_id,
        document.document_type,
        queryClient
      );

      const query = `
        INSERT INTO generated_documents (
          company_id, template_id, document_number, document_name,
          document_type, entity_type, entity_id, format, content,
          file_url, file_size, status, is_final, delivery_method,
          recipient_emails, cc_emails, requires_signature, expires_at,
          metadata, created_by
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20)
        RETURNING *
      `;

      const values = [
        document.company_id,
        document.template_id,
        documentNumber,
        document.document_name,
        document.document_type,
        document.entity_type,
        document.entity_id,
        document.format,
        document.content,
        document.file_url,
        document.file_size,
        document.status || 'draft',
        document.is_final || false,
        document.delivery_method,
        document.recipient_emails,
        document.cc_emails,
        document.requires_signature || false,
        document.expires_at,
        JSON.stringify(document.metadata || {}),
        document.created_by
      ];

      const result = await queryClient.query(query, values);
      const generatedDoc = result.rows[0];

      // Update template usage
      if (document.template_id) {
        await queryClient.query(
          `UPDATE document_templates
           SET times_used = times_used + 1,
               last_used_at = CURRENT_TIMESTAMP
           WHERE template_id = $1`,
          [document.template_id]
        );
      }

      // Record analytics event
      await this.recordDocumentEvent(
        generatedDoc.document_id,
        'generated',
        document.created_by,
        queryClient
      );

      if (!client) await queryClient.query('COMMIT');
      return generatedDoc;

    } catch (error) {
      if (!client) await queryClient.query('ROLLBACK');
      throw error;
    } finally {
      if (!client) queryClient.release();
    }
  }

  /**
   * Generate document number
   */
  private async generateDocumentNumber(
    companyId: number,
    documentType: string,
    client: PoolClient
  ): Promise<string> {
    const result = await client.query(
      `SELECT COUNT(*) + 1 as next_number
       FROM generated_documents
       WHERE company_id = $1
         AND document_type = $2
         AND EXTRACT(YEAR FROM created_at) = EXTRACT(YEAR FROM CURRENT_DATE)`,
      [companyId, documentType]
    );

    const year = new Date().getFullYear();
    const typePrefix = documentType.substring(0, 3).toUpperCase();
    const number = String(result.rows[0].next_number).padStart(6, '0');

    return `${typePrefix}-${year}-${number}`;
  }

  /**
   * Update document status
   */
  async updateDocumentStatus(
    documentId: number,
    status: DocumentStatus,
    userId?: number
  ): Promise<void> {
    const statusFields: Record<DocumentStatus, string> = {
      draft: '',
      final: 'is_final = true',
      sent: 'sent_at = CURRENT_TIMESTAMP',
      viewed: 'viewed_at = CURRENT_TIMESTAMP, view_count = view_count + 1',
      signed: 'signed_at = CURRENT_TIMESTAMP'
    };

    const additionalUpdate = statusFields[status] ? `, ${statusFields[status]}` : '';

    await this.db.query(
      `UPDATE generated_documents
       SET status = $1 ${additionalUpdate}
       WHERE document_id = $2`,
      [status, documentId]
    );

    // Record event
    await this.recordDocumentEvent(documentId, status, userId);
  }

  /**
   * Record document event
   */
  private async recordDocumentEvent(
    documentId: number,
    eventType: string,
    userId?: number,
    client?: PoolClient
  ): Promise<void> {
    const queryClient = client || this.db;

    await queryClient.query(
      `INSERT INTO document_analytics (
        document_id, event_type, user_id
      )
      VALUES ($1, $2, $3)`,
      [documentId, eventType, userId]
    );
  }

  /**
   * Get document by ID
   */
  async getDocumentById(documentId: number, companyId: number): Promise<GeneratedDocument | null> {
    const result = await this.db.query(
      `SELECT * FROM generated_documents
       WHERE document_id = $1 AND company_id = $2`,
      [documentId, companyId]
    );

    return result.rows[0] || null;
  }

  /**
   * Search documents
   */
  async searchDocuments(criteria: {
    company_id: number;
    document_type?: string;
    entity_type?: string;
    entity_id?: number;
    status?: DocumentStatus;
    date_range?: { start: Date; end: Date };
  }): Promise<GeneratedDocument[]> {
    const conditions = ['company_id = $1'];
    const params: any[] = [criteria.company_id];
    let paramCount = 2;

    if (criteria.document_type) {
      conditions.push(`document_type = $${paramCount}`);
      params.push(criteria.document_type);
      paramCount++;
    }

    if (criteria.entity_type) {
      conditions.push(`entity_type = $${paramCount}`);
      params.push(criteria.entity_type);
      paramCount++;
    }

    if (criteria.entity_id) {
      conditions.push(`entity_id = $${paramCount}`);
      params.push(criteria.entity_id);
      paramCount++;
    }

    if (criteria.status) {
      conditions.push(`status = $${paramCount}`);
      params.push(criteria.status);
      paramCount++;
    }

    if (criteria.date_range) {
      conditions.push(`created_at >= $${paramCount} AND created_at <= $${paramCount + 1}`);
      params.push(criteria.date_range.start, criteria.date_range.end);
      paramCount += 2;
    }

    const query = `
      SELECT * FROM generated_documents
      WHERE ${conditions.join(' AND ')}
      ORDER BY created_at DESC
    `;

    const result = await this.db.query(query, params);
    return result.rows;
  }

  /**
   * Create document variable
   */
  async createDocumentVariable(variable: DocumentVariable): Promise<DocumentVariable> {
    const query = `
      INSERT INTO document_variables (
        company_id, variable_name, variable_key, variable_type,
        data_source, source_entity, source_field, source_query,
        format_pattern, default_value, is_required, validation_rules,
        is_computed, computation_formula, is_active, description, metadata
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17)
      RETURNING *
    `;

    const values = [
      variable.company_id,
      variable.variable_name,
      variable.variable_key,
      variable.variable_type,
      variable.data_source,
      variable.source_entity,
      variable.source_field,
      variable.source_query,
      variable.format_pattern,
      variable.default_value,
      variable.is_required || false,
      JSON.stringify(variable.validation_rules || {}),
      variable.is_computed || false,
      variable.computation_formula,
      variable.is_active ?? true,
      variable.description,
      JSON.stringify(variable.metadata || {})
    ];

    const result = await this.db.query(query, values);
    return result.rows[0];
  }

  /**
   * Get variables by company
   */
  async getVariablesByCompany(companyId: number): Promise<DocumentVariable[]> {
    const result = await this.db.query(
      `SELECT * FROM document_variables
       WHERE company_id = $1 AND is_active = true
       ORDER BY variable_name`,
      [companyId]
    );

    return result.rows;
  }

  /**
   * Track document view
   */
  async trackDocumentView(
    documentId: number,
    viewData: {
      user_id?: number;
      ip_address?: string;
      user_agent?: string;
      session_id?: string;
    }
  ): Promise<void> {
    const client = await this.db.getClient();

    try {
      await client.query('BEGIN');

      // Update view count
      await client.query(
        `UPDATE generated_documents
         SET view_count = view_count + 1,
             last_viewed_at = CURRENT_TIMESTAMP,
             viewed_at = COALESCE(viewed_at, CURRENT_TIMESTAMP)
         WHERE document_id = $1`,
        [documentId]
      );

      // Record analytics
      await client.query(
        `INSERT INTO document_analytics (
          document_id, event_type, user_id, user_ip, user_agent, session_id
        )
        VALUES ($1, $2, $3, $4, $5, $6)`,
        [
          documentId,
          'viewed',
          viewData.user_id,
          viewData.ip_address,
          viewData.user_agent,
          viewData.session_id
        ]
      );

      await client.query('COMMIT');

    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }
}