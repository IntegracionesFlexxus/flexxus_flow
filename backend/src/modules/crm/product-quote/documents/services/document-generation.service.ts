import { injectable, inject } from 'tsyringe';
import { IDocumentGenerationService } from '../interfaces/IDocumentGenerationService';
import { Pool } from 'pg';
import { AppError } from '../../../../../shared/errors/AppError';
import * as fs from 'fs/promises';
import * as path from 'path';

@injectable()
export class DocumentGenerationService implements IDocumentGenerationService {
  constructor(
    @inject('DatabasePool')
    private pool: Pool
  ) {}

  async generateQuotePDF(quoteId: number, templateId?: number): Promise<Buffer> {
    try {
      // Obtener datos de la cotización
      const quoteData = await this.getQuoteData(quoteId);
      if (!quoteData) {
        throw new AppError('Quote not found', 404);
      }

      // Obtener template
      const template = templateId
        ? await this.getTemplate(templateId)
        : await this.getDefaultTemplate('quote');

      // Generar HTML simple por ahora (sin Puppeteer)
      const html = this.generateHTML(template.content, quoteData);

      // Por ahora retornamos el HTML como Buffer
      // En producción, aquí se generaría el PDF con Puppeteer
      const buffer = Buffer.from(html, 'utf8');

      // Guardar versión del documento
      await this.saveDocumentVersion({
        document_type: 'quote',
        entity_type: 'quote',
        entity_id: quoteId,
        file_name: `quote_${quoteData.quote_number}.pdf`,
        file_size: buffer.length,
        content_data: buffer.toString('base64'),
        generated_from_template: templateId || null
      });

      return buffer;
    } catch (error) {
      if (error instanceof AppError) throw error;
      throw new AppError(`Failed to generate quote PDF: ${error.message}`, 500);
    }
  }

  async generateInvoicePDF(invoiceId: number, templateId?: number): Promise<Buffer> {
    try {
      const invoiceData = await this.getInvoiceData(invoiceId);
      if (!invoiceData) {
        throw new AppError('Invoice not found', 404);
      }

      const template = templateId
        ? await this.getTemplate(templateId)
        : await this.getDefaultTemplate('invoice');

      const html = this.generateHTML(template.content, invoiceData);
      const buffer = Buffer.from(html, 'utf8');

      await this.saveDocumentVersion({
        document_type: 'invoice',
        entity_type: 'invoice',
        entity_id: invoiceId,
        file_name: `invoice_${invoiceData.invoice_number}.pdf`,
        file_size: buffer.length,
        content_data: buffer.toString('base64'),
        generated_from_template: templateId || null
      });

      return buffer;
    } catch (error) {
      if (error instanceof AppError) throw error;
      throw new AppError(`Failed to generate invoice PDF: ${error.message}`, 500);
    }
  }

  async createTemplate(data: any): Promise<any> {
    const result = await this.pool.query(`
      INSERT INTO document_templates (
        company_id, template_name, template_type, description,
        content, styles, settings, is_active, created_by
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      RETURNING *
    `, [
      data.company_id || 1,
      data.template_name,
      data.template_type,
      data.description,
      data.content,
      data.styles,
      JSON.stringify(data.settings || {}),
      data.is_active !== false,
      data.created_by
    ]);

    return result.rows[0];
  }

  async updateTemplate(id: number, data: any): Promise<any> {
    const fields = [];
    const values = [];
    let paramCount = 1;

    Object.entries(data).forEach(([key, value]) => {
      if (key !== 'template_id' && key !== 'created_at') {
        fields.push(`${key} = $${paramCount}`);
        values.push(value);
        paramCount++;
      }
    });

    if (fields.length === 0) {
      throw new AppError('No fields to update', 400);
    }

    values.push(id);

    const result = await this.pool.query(`
      UPDATE document_templates
      SET ${fields.join(', ')}, updated_at = CURRENT_TIMESTAMP
      WHERE template_id = $${paramCount}
      RETURNING *
    `, values);

    if (result.rows.length === 0) {
      throw new AppError('Template not found', 404);
    }

    return result.rows[0];
  }

  async getTemplate(id: number): Promise<any> {
    const result = await this.pool.query(
      'SELECT * FROM document_templates WHERE template_id = $1',
      [id]
    );

    if (result.rows.length === 0) {
      throw new AppError('Template not found', 404);
    }

    return result.rows[0];
  }

  async getDefaultTemplate(type: string): Promise<any> {
    const result = await this.pool.query(
      'SELECT * FROM document_templates WHERE template_type = $1 AND is_default = true LIMIT 1',
      [type]
    );

    if (result.rows.length === 0) {
      return this.getBasicTemplate(type);
    }

    return result.rows[0];
  }

  async listTemplates(filters?: any): Promise<any[]> {
    let query = 'SELECT * FROM document_templates WHERE 1=1';
    const params = [];
    let paramCount = 1;

    if (filters?.template_type) {
      query += ` AND template_type = $${paramCount}`;
      params.push(filters.template_type);
      paramCount++;
    }

    if (filters?.is_active !== undefined) {
      query += ` AND is_active = $${paramCount}`;
      params.push(filters.is_active);
      paramCount++;
    }

    query += ' ORDER BY created_at DESC';

    const result = await this.pool.query(query, params);
    return result.rows;
  }

  async getDocumentVersions(entityType: string, entityId: number): Promise<any[]> {
    const result = await this.pool.query(`
      SELECT dv.*, gd.document_number, gd.document_status
      FROM document_versions dv
      INNER JOIN generated_documents gd ON dv.document_id = gd.document_id
      WHERE dv.entity_type = $1 AND dv.entity_id = $2
      ORDER BY dv.version_number DESC
    `, [entityType, entityId]);

    return result.rows;
  }

  async getLatestVersion(entityType: string, entityId: number): Promise<any> {
    const result = await this.pool.query(`
      SELECT dv.*, gd.document_number, gd.document_status
      FROM document_versions dv
      INNER JOIN generated_documents gd ON dv.document_id = gd.document_id
      WHERE dv.entity_type = $1 AND dv.entity_id = $2
      ORDER BY dv.version_number DESC
      LIMIT 1
    `, [entityType, entityId]);

    return result.rows[0] || null;
  }

  private async getQuoteData(quoteId: number): Promise<any> {
    const client = await this.pool.connect();

    try {
      const quoteResult = await client.query(`
        SELECT q.*,
               'Customer Name' as customer_name,
               'customer@email.com' as customer_email,
               '555-1234' as customer_phone,
               'Customer Address' as customer_address,
               'Contact Name' as contact_name,
               'Salesperson' as salesperson_name
        FROM quotes q
        WHERE q.quote_id = $1
      `, [quoteId]);

      if (quoteResult.rows.length === 0) {
        return null;
      }

      const quote = quoteResult.rows[0];

      const itemsResult = await client.query(`
        SELECT qi.*, p.name as product_name, p.sku
        FROM quote_line_items qi
        LEFT JOIN products p ON qi.product_id = p.product_id
        WHERE qi.quote_id = $1
        ORDER BY qi.line_number
      `, [quoteId]);

      quote.items = itemsResult.rows;

      // Formatear fechas y números
      quote.formatted_date = new Date(quote.quote_date).toLocaleDateString();
      quote.formatted_expiry = new Date(quote.expiry_date).toLocaleDateString();
      quote.formatted_subtotal = this.formatCurrency(quote.subtotal, quote.currency);
      quote.formatted_total = this.formatCurrency(quote.total_amount, quote.currency);

      return quote;
    } finally {
      client.release();
    }
  }

  private async getInvoiceData(invoiceId: number): Promise<any> {
    return {
      invoice_number: `INV-${invoiceId}`,
      invoice_date: new Date(),
      customer_name: 'Customer Name',
      items: [],
      formatted_total: '$0.00'
    };
  }

  private generateHTML(template: string, data: any): string {
    // Simple template replacement
    let html = template;

    Object.keys(data).forEach(key => {
      const regex = new RegExp(`{{${key}}}`, 'g');
      html = html.replace(regex, data[key] || '');
    });

    // Handle items loop
    if (data.items && Array.isArray(data.items)) {
      const itemsHTML = data.items.map(item => `
        <tr>
          <td>${item.sku || ''}</td>
          <td>${item.product_name || ''}</td>
          <td>${item.quantity || 0}</td>
          <td>${item.unit_price || 0}</td>
          <td>${item.line_total || 0}</td>
        </tr>
      `).join('');

      html = html.replace(/{{#each items}}[\s\S]*?{{\/each}}/g, itemsHTML);
    }

    return html;
  }

  private async saveDocumentVersion(data: any): Promise<void> {
    const client = await this.pool.connect();

    try {
      await client.query('BEGIN');

      let documentId;
      const existingDoc = await client.query(
        'SELECT document_id FROM generated_documents WHERE entity_type = $1 AND entity_id = $2',
        [data.entity_type, data.entity_id]
      );

      if (existingDoc.rows.length > 0) {
        documentId = existingDoc.rows[0].document_id;
      } else {
        const newDoc = await client.query(`
          INSERT INTO generated_documents (
            company_id, document_type, entity_type, entity_id,
            document_number, document_status, created_by
          ) VALUES ($1, $2, $3, $4, $5, $6, $7)
          RETURNING document_id
        `, [1, data.document_type, data.entity_type, data.entity_id,
            `DOC-${Date.now()}`, 'generated', 1]);

        documentId = newDoc.rows[0].document_id;
      }

      const versionResult = await client.query(
        'SELECT MAX(version_number) as max_version FROM document_versions WHERE document_id = $1',
        [documentId]
      );

      const versionNumber = (versionResult.rows[0].max_version || 0) + 1;

      await client.query(`
        INSERT INTO document_versions (
          document_id, version_number, document_type,
          entity_type, entity_id, file_name, file_size,
          content_data, generated_from_template, is_final,
          created_by
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
      `, [
        documentId, versionNumber, data.document_type,
        data.entity_type, data.entity_id, data.file_name,
        data.file_size, data.content_data, data.generated_from_template,
        false, 1
      ]);

      await client.query('COMMIT');
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  private getBasicTemplate(type: string): any {
    const templates = {
      quote: {
        content: `
          <!DOCTYPE html>
          <html>
          <head>
            <style>
              body { font-family: Arial, sans-serif; }
              .header { text-align: center; margin-bottom: 30px; }
              .company-info { margin-bottom: 20px; }
              .customer-info { margin-bottom: 30px; }
              table { width: 100%; border-collapse: collapse; }
              th, td { padding: 10px; text-align: left; border-bottom: 1px solid #ddd; }
              .total { font-weight: bold; font-size: 1.2em; }
            </style>
          </head>
          <body>
            <div class="header">
              <h1>QUOTE</h1>
              <p>{{quote_number}}</p>
              <p>Date: {{formatted_date}} | Valid Until: {{formatted_expiry}}</p>
            </div>

            <div class="customer-info">
              <h3>Bill To:</h3>
              <p>{{customer_name}}</p>
              <p>{{customer_email}}</p>
              <p>{{customer_phone}}</p>
            </div>

            <table>
              <thead>
                <tr>
                  <th>Item</th>
                  <th>Description</th>
                  <th>Quantity</th>
                  <th>Unit Price</th>
                  <th>Total</th>
                </tr>
              </thead>
              <tbody>
                {{#each items}}
                <tr>
                  <td>{{sku}}</td>
                  <td>{{product_name}}</td>
                  <td>{{quantity}}</td>
                  <td>{{unit_price}}</td>
                  <td>{{line_total}}</td>
                </tr>
                {{/each}}
              </tbody>
            </table>

            <div class="totals">
              <p>Subtotal: {{formatted_subtotal}}</p>
              <p>Tax: {{tax_amount}}</p>
              <p class="total">Total: {{formatted_total}}</p>
            </div>
          </body>
          </html>
        `,
        styles: '',
        settings: {}
      },
      invoice: {
        content: '<html><body><h1>Invoice</h1></body></html>',
        styles: '',
        settings: {}
      }
    };

    return templates[type] || templates.quote;
  }

  private formatCurrency(amount: number, currency = 'USD'): string {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency
    }).format(amount);
  }
}