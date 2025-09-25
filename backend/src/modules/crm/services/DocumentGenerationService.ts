/**
 * Document Generation Service - Sprint 19
 * Handles PDF generation, templates, and document management
 */

import { injectable, inject } from 'inversify';
import { Pool } from 'pg';
import { TYPES } from '@/container/types';
import { Logger } from 'winston';
import puppeteer from 'puppeteer';
import Handlebars from 'handlebars';
import { promises as fs } from 'fs';
import path from 'path';

export interface DocumentTemplate {
  template_id?: number;
  company_id: number;
  template_name: string;
  template_type: 'quote' | 'invoice' | 'proposal' | 'contract' | 'report';
  template_category?: string;
  html_content: string;
  css_styles?: string;
  header_content?: string;
  footer_content?: string;
  page_settings?: {
    format?: string;
    margin?: any;
    orientation?: 'portrait' | 'landscape';
  };
  is_default: boolean;
  is_active: boolean;
  version: number;
  metadata?: any;
}

export interface GeneratedDocument {
  document_id?: number;
  company_id: number;
  template_id?: number;
  entity_type: string;
  entity_id: number;
  document_name: string;
  document_type: string;
  file_path: string;
  file_size?: number;
  mime_type: string;
  generation_data?: any;
  generated_by?: number;
  is_finalized: boolean;
  created_at?: Date;
}

export interface DocumentGenerationRequest {
  company_id: number;
  template_id?: number;
  entity_type: string;
  entity_id: number;
  document_name?: string;
  data?: any;
  options?: {
    format?: 'pdf' | 'html';
    orientation?: 'portrait' | 'landscape';
    margin?: any;
    header?: boolean;
    footer?: boolean;
    watermark?: string;
  };
  generated_by?: number;
}

export interface TemplateVariable {
  variable_name: string;
  variable_type: 'text' | 'number' | 'date' | 'currency' | 'boolean' | 'image' | 'table';
  description?: string;
  default_value?: any;
  is_required: boolean;
}

@injectable()
export class DocumentGenerationService {
  private templatesCache: Map<number, DocumentTemplate> = new Map();
  private readonly TEMPLATE_CACHE_TTL = 10 * 60 * 1000; // 10 minutes

  constructor(
    @inject(TYPES.CrmConnection) private pool: Pool,
    @inject(TYPES.Logger) private logger: Logger
  ) {
    this.registerHandlebarsHelpers();
  }

  /**
   * Generate document from template
   */
  async generateDocument(request: DocumentGenerationRequest): Promise<GeneratedDocument> {
    const startTime = Date.now();
    const client = await this.pool.connect();

    try {
      await client.query('BEGIN');

      // Get or use default template
      let template: DocumentTemplate;
      if (request.template_id) {
        template = await this.getTemplate(request.template_id);
      } else {
        template = await this.getDefaultTemplate(request.company_id, request.entity_type);
      }

      if (!template) {
        throw new Error(`No template found for ${request.entity_type}`);
      }

      // Get entity data
      const entityData = await this.getEntityData(request.entity_type, request.entity_id);

      // Merge with provided data
      const templateData = {
        ...entityData,
        ...request.data,
        _meta: {
          generation_date: new Date(),
          generated_by: request.generated_by,
          template_name: template.template_name
        }
      };

      // Generate document name if not provided
      const documentName = request.document_name ||
        `${request.entity_type}_${request.entity_id}_${Date.now()}`;

      // Compile and render template
      const renderedHtml = await this.renderTemplate(template, templateData);

      // Generate PDF or return HTML
      let filePath: string;
      let mimeType: string;
      let fileSize: number;

      if (request.options?.format === 'html') {
        filePath = await this.saveHtmlFile(documentName, renderedHtml);
        mimeType = 'text/html';
        fileSize = Buffer.byteLength(renderedHtml, 'utf8');
      } else {
        const pdfBuffer = await this.generatePDF(renderedHtml, {
          ...template.page_settings,
          ...request.options
        });
        filePath = await this.savePdfFile(documentName, pdfBuffer);
        mimeType = 'application/pdf';
        fileSize = pdfBuffer.length;
      }

      // Save document record
      const documentQuery = `
        INSERT INTO generated_documents (
          company_id, template_id, entity_type, entity_id,
          document_name, document_type, file_path, file_size,
          mime_type, generation_data, generated_by, is_finalized
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
        RETURNING *
      `;

      const documentResult = await client.query(documentQuery, [
        request.company_id,
        template.template_id,
        request.entity_type,
        request.entity_id,
        documentName,
        template.template_type,
        filePath,
        fileSize,
        mimeType,
        JSON.stringify(templateData),
        request.generated_by,
        false // Not finalized by default
      ]);

      await client.query('COMMIT');

      const duration = Date.now() - startTime;
      this.logger.info('Document generated successfully', {
        document_id: documentResult.rows[0].document_id,
        entity_type: request.entity_type,
        entity_id: request.entity_id,
        duration_ms: duration,
        file_size: fileSize
      });

      return documentResult.rows[0];

    } catch (error) {
      await client.query('ROLLBACK');
      this.logger.error('Error generating document', { error, request });
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Create or update document template
   */
  async upsertTemplate(template: DocumentTemplate): Promise<DocumentTemplate> {
    const client = await this.pool.connect();

    try {
      await client.query('BEGIN');

      if (template.template_id) {
        // Update existing template - create new version
        const versionQuery = `
          SELECT MAX(version) as max_version
          FROM document_templates
          WHERE template_id = $1
        `;
        const versionResult = await client.query(versionQuery, [template.template_id]);
        const newVersion = (versionResult.rows[0].max_version || 0) + 1;

        const updateQuery = `
          UPDATE document_templates
          SET html_content = $2, css_styles = $3, header_content = $4,
              footer_content = $5, page_settings = $6, version = $7,
              updated_at = NOW()
          WHERE template_id = $1
          RETURNING *
        `;

        const result = await client.query(updateQuery, [
          template.template_id,
          template.html_content,
          template.css_styles,
          template.header_content,
          template.footer_content,
          JSON.stringify(template.page_settings || {}),
          newVersion
        ]);

        await client.query('COMMIT');

        // Clear cache
        this.templatesCache.delete(template.template_id);

        return result.rows[0];

      } else {
        // Create new template
        const insertQuery = `
          INSERT INTO document_templates (
            company_id, template_name, template_type, template_category,
            html_content, css_styles, header_content, footer_content,
            page_settings, is_default, is_active, version, metadata
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
          RETURNING *
        `;

        const result = await client.query(insertQuery, [
          template.company_id,
          template.template_name,
          template.template_type,
          template.template_category,
          template.html_content,
          template.css_styles,
          template.header_content,
          template.footer_content,
          JSON.stringify(template.page_settings || {}),
          template.is_default,
          template.is_active,
          1, // Initial version
          JSON.stringify(template.metadata || {})
        ]);

        await client.query('COMMIT');
        return result.rows[0];
      }

    } catch (error) {
      await client.query('ROLLBACK');
      this.logger.error('Error upserting template', { error, template });
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Get template by ID with caching
   */
  async getTemplate(template_id: number): Promise<DocumentTemplate> {
    // Check cache first
    const cached = this.templatesCache.get(template_id);
    if (cached) {
      return cached;
    }

    const client = await this.pool.connect();

    try {
      const query = `
        SELECT * FROM document_templates
        WHERE template_id = $1 AND is_active = true
      `;

      const result = await client.query(query, [template_id]);

      if (result.rows.length === 0) {
        throw new Error(`Template ${template_id} not found`);
      }

      const template = result.rows[0];

      // Cache template
      this.templatesCache.set(template_id, template);

      return template;

    } catch (error) {
      this.logger.error('Error getting template', { error, template_id });
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Get default template for entity type
   */
  async getDefaultTemplate(company_id: number, entity_type: string): Promise<DocumentTemplate> {
    const client = await this.pool.connect();

    try {
      const query = `
        SELECT * FROM document_templates
        WHERE company_id = $1
          AND template_type = $2
          AND is_default = true
          AND is_active = true
        ORDER BY version DESC
        LIMIT 1
      `;

      const result = await client.query(query, [company_id, entity_type]);

      if (result.rows.length === 0) {
        throw new Error(`No default template found for ${entity_type}`);
      }

      return result.rows[0];

    } catch (error) {
      this.logger.error('Error getting default template', { error, company_id, entity_type });
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Get entity data for template
   */
  private async getEntityData(entity_type: string, entity_id: number): Promise<any> {
    const client = await this.pool.connect();

    try {
      let query: string;
      let params: any[] = [entity_id];

      switch (entity_type) {
        case 'quote':
          query = `
            SELECT
              q.*,
              a.name as account_name,
              a.billing_address,
              a.shipping_address,
              c.first_name || ' ' || c.last_name as contact_name,
              c.email as contact_email,
              c.phone as contact_phone,
              u.first_name || ' ' || u.last_name as owner_name,
              (
                SELECT json_agg(
                  json_build_object(
                    'line_item_id', qli.line_item_id,
                    'product_name', qli.product_name,
                    'product_code', qli.product_code,
                    'description', qli.description,
                    'quantity', qli.quantity,
                    'unit_price', qli.unit_price,
                    'discount_percentage', qli.discount_percentage,
                    'discount_amount', qli.discount_amount,
                    'tax_rate', qli.tax_rate,
                    'tax_amount', qli.tax_amount,
                    'line_total', qli.line_total
                  )
                )
                FROM quote_line_items qli
                WHERE qli.quote_id = q.quote_id
                ORDER BY qli.sort_order
              ) as line_items
            FROM quotes q
            LEFT JOIN accounts a ON q.account_id = a.account_id
            LEFT JOIN contacts c ON q.contact_id = c.contact_id
            LEFT JOIN users u ON q.created_by = u.user_id
            WHERE q.quote_id = $1
          `;
          break;

        default:
          throw new Error(`Unsupported entity type: ${entity_type}`);
      }

      const result = await client.query(query, params);

      if (result.rows.length === 0) {
        throw new Error(`${entity_type} ${entity_id} not found`);
      }

      return result.rows[0];

    } catch (error) {
      this.logger.error('Error getting entity data', { error, entity_type, entity_id });
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Render template with data
   */
  private async renderTemplate(template: DocumentTemplate, data: any): Promise<string> {
    try {
      // Combine CSS and HTML
      const fullHtml = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="UTF-8">
          <style>
            ${template.css_styles || this.getDefaultStyles()}
          </style>
        </head>
        <body>
          ${template.header_content || ''}
          <div class="content">
            ${template.html_content}
          </div>
          ${template.footer_content || ''}
        </body>
        </html>
      `;

      // Compile and render with Handlebars
      const compiledTemplate = Handlebars.compile(fullHtml);
      return compiledTemplate(data);

    } catch (error) {
      this.logger.error('Error rendering template', { error, template_id: template.template_id });
      throw error;
    }
  }

  /**
   * Generate PDF from HTML using Puppeteer
   */
  private async generatePDF(html: string, options: any = {}): Promise<Buffer> {
    let browser: puppeteer.Browser | null = null;

    try {
      browser = await puppeteer.launch({
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox']
      });

      const page = await browser.newPage();
      await page.setContent(html, { waitUntil: 'networkidle0' });

      const pdfOptions: puppeteer.PDFOptions = {
        format: options.format || 'A4',
        margin: options.margin || {
          top: '20mm',
          right: '15mm',
          bottom: '20mm',
          left: '15mm'
        },
        printBackground: true,
        preferCSSPageSize: true
      };

      const pdfBuffer = await page.pdf(pdfOptions);
      return pdfBuffer;

    } catch (error) {
      this.logger.error('Error generating PDF', { error });
      throw error;
    } finally {
      if (browser) {
        await browser.close();
      }
    }
  }

  /**
   * Save PDF file to storage
   */
  private async savePdfFile(documentName: string, pdfBuffer: Buffer): Promise<string> {
    const documentsDir = path.join(process.cwd(), 'storage', 'documents');
    await fs.mkdir(documentsDir, { recursive: true });

    const fileName = `${documentName}_${Date.now()}.pdf`;
    const filePath = path.join(documentsDir, fileName);

    await fs.writeFile(filePath, pdfBuffer);
    return filePath;
  }

  /**
   * Save HTML file to storage
   */
  private async saveHtmlFile(documentName: string, html: string): Promise<string> {
    const documentsDir = path.join(process.cwd(), 'storage', 'documents');
    await fs.mkdir(documentsDir, { recursive: true });

    const fileName = `${documentName}_${Date.now()}.html`;
    const filePath = path.join(documentsDir, fileName);

    await fs.writeFile(filePath, html, 'utf8');
    return filePath;
  }

  /**
   * Get document by ID
   */
  async getDocument(document_id: number): Promise<GeneratedDocument | null> {
    const client = await this.pool.connect();

    try {
      const query = `
        SELECT gd.*, dt.template_name
        FROM generated_documents gd
        LEFT JOIN document_templates dt ON gd.template_id = dt.template_id
        WHERE gd.document_id = $1
      `;

      const result = await client.query(query, [document_id]);
      return result.rows[0] || null;

    } catch (error) {
      this.logger.error('Error getting document', { error, document_id });
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * List documents for entity
   */
  async listDocuments(
    company_id: number,
    entity_type?: string,
    entity_id?: number,
    limit = 20,
    offset = 0
  ): Promise<{ data: GeneratedDocument[]; total: number }> {
    const client = await this.pool.connect();

    try {
      let whereConditions = ['gd.company_id = $1'];
      let params: any[] = [company_id];
      let paramCount = 2;

      if (entity_type) {
        whereConditions.push(`gd.entity_type = $${paramCount}`);
        params.push(entity_type);
        paramCount++;
      }

      if (entity_id) {
        whereConditions.push(`gd.entity_id = $${paramCount}`);
        params.push(entity_id);
        paramCount++;
      }

      const whereClause = whereConditions.join(' AND ');

      // Count total
      const countQuery = `
        SELECT COUNT(*)
        FROM generated_documents gd
        WHERE ${whereClause}
      `;

      const countResult = await client.query(countQuery, params);
      const total = parseInt(countResult.rows[0].count);

      // Get data
      const dataQuery = `
        SELECT gd.*, dt.template_name
        FROM generated_documents gd
        LEFT JOIN document_templates dt ON gd.template_id = dt.template_id
        WHERE ${whereClause}
        ORDER BY gd.created_at DESC
        LIMIT $${paramCount} OFFSET $${paramCount + 1}
      `;

      params.push(limit, offset);
      const dataResult = await client.query(dataQuery, params);

      return {
        data: dataResult.rows,
        total
      };

    } catch (error) {
      this.logger.error('Error listing documents', { error, company_id });
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Finalize document (make it read-only)
   */
  async finalizeDocument(document_id: number): Promise<GeneratedDocument> {
    const client = await this.pool.connect();

    try {
      const query = `
        UPDATE generated_documents
        SET is_finalized = true, updated_at = NOW()
        WHERE document_id = $1
        RETURNING *
      `;

      const result = await client.query(query, [document_id]);

      if (result.rows.length === 0) {
        throw new Error(`Document ${document_id} not found`);
      }

      this.logger.info('Document finalized', { document_id });
      return result.rows[0];

    } catch (error) {
      this.logger.error('Error finalizing document', { error, document_id });
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Extract template variables from HTML content
   */
  extractTemplateVariables(htmlContent: string): TemplateVariable[] {
    const variables: TemplateVariable[] = [];
    const handlebarsRegex = /\{\{[^}]+\}\}/g;
    const matches = htmlContent.match(handlebarsRegex);

    if (matches) {
      const uniqueVars = [...new Set(matches)];

      uniqueVars.forEach(match => {
        const varName = match.replace(/[{}]/g, '').trim();
        if (!varName.startsWith('#') && !varName.startsWith('/')) {
          variables.push({
            variable_name: varName,
            variable_type: 'text',
            description: `Variable: ${varName}`,
            is_required: false
          });
        }
      });
    }

    return variables;
  }

  /**
   * Register Handlebars helpers
   */
  private registerHandlebarsHelpers(): void {
    // Currency formatting helper
    Handlebars.registerHelper('currency', function(amount: number, currency = 'ARS') {
      if (typeof amount !== 'number') return amount;

      return new Intl.NumberFormat('es-AR', {
        style: 'currency',
        currency: currency
      }).format(amount);
    });

    // Date formatting helper
    Handlebars.registerHelper('formatDate', function(date: Date, format = 'dd/MM/yyyy') {
      if (!date) return '';

      const d = new Date(date);
      return d.toLocaleDateString('es-AR');
    });

    // Math helpers
    Handlebars.registerHelper('multiply', function(a: number, b: number) {
      return (a || 0) * (b || 0);
    });

    Handlebars.registerHelper('add', function(a: number, b: number) {
      return (a || 0) + (b || 0);
    });

    // Conditional helper
    Handlebars.registerHelper('ifEquals', function(arg1: any, arg2: any, options: any) {
      return (arg1 == arg2) ? options.fn(this) : options.inverse(this);
    });
  }

  /**
   * Get default CSS styles
   */
  private getDefaultStyles(): string {
    return `
      body {
        font-family: 'Arial', sans-serif;
        font-size: 12px;
        line-height: 1.4;
        color: #333;
        margin: 0;
        padding: 0;
      }

      .content {
        padding: 20px;
      }

      h1, h2, h3 {
        color: #2c3e50;
        margin-bottom: 10px;
      }

      table {
        width: 100%;
        border-collapse: collapse;
        margin-bottom: 20px;
      }

      th, td {
        border: 1px solid #ddd;
        padding: 8px;
        text-align: left;
      }

      th {
        background-color: #f2f2f2;
        font-weight: bold;
      }

      .text-right {
        text-align: right;
      }

      .text-center {
        text-align: center;
      }

      .total-row {
        font-weight: bold;
        background-color: #f9f9f9;
      }
    `;
  }
}