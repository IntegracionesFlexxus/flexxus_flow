/**
 * Document Generation Service Interface
 * Sprint 20 - Product & Quote Module
 */

export interface IDocumentGenerationService {
  /**
   * Generate PDF for a quote
   */
  generateQuotePDF(quoteId: number, templateId?: number): Promise<Buffer>;

  /**
   * Generate PDF for an invoice
   */
  generateInvoicePDF(invoiceId: number, templateId?: number): Promise<Buffer>;

  /**
   * Create a new document template
   */
  createTemplate(data: any): Promise<any>;

  /**
   * Update an existing template
   */
  updateTemplate(id: number, data: any): Promise<any>;

  /**
   * Get template by ID
   */
  getTemplate(id: number): Promise<any>;

  /**
   * Get default template by type
   */
  getDefaultTemplate(type: string): Promise<any>;

  /**
   * List all templates with optional filters
   */
  listTemplates(filters?: any): Promise<any[]>;

  /**
   * Get document versions for an entity
   */
  getDocumentVersions(entityType: string, entityId: number): Promise<any[]>;

  /**
   * Get latest document version
   */
  getLatestVersion(entityType: string, entityId: number): Promise<any>;
}
