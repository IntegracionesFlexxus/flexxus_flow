// Document Service - Sprint 19 Frontend Implementation

import {
  DocumentTemplate,
  DocumentGenerationRequest,
  DocumentGenerationResult,
  TemplateVariable,
  ApiResponse,
  CreateDto,
  UpdateDto
} from '../../shared/types';

// API Endpoints
const ENDPOINTS = {
  DOCUMENT_TEMPLATES: '/api/crm/documents/templates',
  GENERATE_DOCUMENT: '/api/crm/documents/generate',
  BATCH_GENERATE: '/api/crm/documents/batch-generate',
  TEMPLATE_PREVIEW: (id: number) => `/api/crm/documents/templates/${id}/preview`,
  TEMPLATE_VARIABLES: (id: number) => `/api/crm/documents/templates/${id}/variables`,
  GENERATED_DOCUMENTS: '/api/crm/documents/generated',
  REVENUE_SCHEDULES: '/api/crm/documents/revenue-schedules'
};

interface GeneratedDocument {
  id: number;
  templateId: number;
  entityType: string;
  entityId: number;
  fileName: string;
  url: string;
  format: string;
  size: number;
  generatedAt: string;
  generatedBy: number;
  variables: Record<string, any>;
}

interface BatchGenerationRequest {
  templateId: number;
  entities: Array<{
    entityType: string;
    entityId: number;
    variables?: Record<string, any>;
  }>;
  format?: 'pdf' | 'word' | 'html';
  mergeDocuments?: boolean;
}

interface BatchGenerationResult {
  success: number;
  failed: number;
  documents: DocumentGenerationResult[];
  errors: Array<{
    entityId: number;
    error: string;
  }>;
  mergedDocumentUrl?: string;
}

class DocumentService {
  private baseUrl: string;

  constructor(baseUrl: string = '') {
    this.baseUrl = baseUrl;
  }

  /**
   * Get all document templates
   */
  async getDocumentTemplates(filters?: {
    type?: 'quote' | 'proposal' | 'contract' | 'invoice';
    format?: 'pdf' | 'word' | 'html';
    active?: boolean;
    companyId?: number;
  }): Promise<DocumentTemplate[]> {
    const queryParams = new URLSearchParams();
    if (filters?.type) {
      queryParams.append('type', filters.type);
    }
    if (filters?.format) {
      queryParams.append('format', filters.format);
    }
    if (filters?.active !== undefined) {
      queryParams.append('active', filters.active.toString());
    }
    if (filters?.companyId) {
      queryParams.append('companyId', filters.companyId.toString());
    }

    const response = await fetch(`${this.baseUrl}${ENDPOINTS.DOCUMENT_TEMPLATES}?${queryParams}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.getAuthToken()}`
      }
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch document templates: ${response.statusText}`);
    }

    const data: ApiResponse<DocumentTemplate[]> = await response.json();
    return data.data;
  }

  /**
   * Get single document template
   */
  async getDocumentTemplate(id: number): Promise<DocumentTemplate> {
    const response = await fetch(`${this.baseUrl}${ENDPOINTS.DOCUMENT_TEMPLATES}/${id}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.getAuthToken()}`
      }
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch document template: ${response.statusText}`);
    }

    const data: ApiResponse<DocumentTemplate> = await response.json();
    return data.data;
  }

  /**
   * Create new document template
   */
  async createDocumentTemplate(templateData: CreateDto<DocumentTemplate>): Promise<DocumentTemplate> {
    const response = await fetch(`${this.baseUrl}${ENDPOINTS.DOCUMENT_TEMPLATES}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.getAuthToken()}`
      },
      body: JSON.stringify(templateData)
    });

    if (!response.ok) {
      throw new Error(`Failed to create document template: ${response.statusText}`);
    }

    const data: ApiResponse<DocumentTemplate> = await response.json();
    return data.data;
  }

  /**
   * Update document template
   */
  async updateDocumentTemplate(id: number, updates: UpdateDto<DocumentTemplate>): Promise<DocumentTemplate> {
    const response = await fetch(`${this.baseUrl}${ENDPOINTS.DOCUMENT_TEMPLATES}/${id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.getAuthToken()}`
      },
      body: JSON.stringify(updates)
    });

    if (!response.ok) {
      throw new Error(`Failed to update document template: ${response.statusText}`);
    }

    const data: ApiResponse<DocumentTemplate> = await response.json();
    return data.data;
  }

  /**
   * Delete document template
   */
  async deleteDocumentTemplate(id: number): Promise<void> {
    const response = await fetch(`${this.baseUrl}${ENDPOINTS.DOCUMENT_TEMPLATES}/${id}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${this.getAuthToken()}`
      }
    });

    if (!response.ok) {
      throw new Error(`Failed to delete document template: ${response.statusText}`);
    }
  }

  /**
   * Clone document template
   */
  async cloneDocumentTemplate(id: number, newName?: string): Promise<DocumentTemplate> {
    const response = await fetch(`${this.baseUrl}${ENDPOINTS.DOCUMENT_TEMPLATES}/${id}/clone`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.getAuthToken()}`
      },
      body: JSON.stringify({ name: newName })
    });

    if (!response.ok) {
      throw new Error(`Failed to clone document template: ${response.statusText}`);
    }

    const data: ApiResponse<DocumentTemplate> = await response.json();
    return data.data;
  }

  /**
   * Preview document template with sample data
   */
  async previewTemplate(
    templateId: number,
    sampleData: Record<string, any>,
    format?: 'pdf' | 'html'
  ): Promise<{ url: string; previewType: 'inline' | 'download' }> {
    const response = await fetch(`${this.baseUrl}${ENDPOINTS.TEMPLATE_PREVIEW(templateId)}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.getAuthToken()}`
      },
      body: JSON.stringify({
        sampleData,
        format: format || 'html'
      })
    });

    if (!response.ok) {
      throw new Error(`Failed to preview template: ${response.statusText}`);
    }

    const data: ApiResponse<{ url: string; previewType: 'inline' | 'download' }> = await response.json();
    return data.data;
  }

  /**
   * Get template variables with their metadata
   */
  async getTemplateVariables(templateId: number): Promise<TemplateVariable[]> {
    const response = await fetch(`${this.baseUrl}${ENDPOINTS.TEMPLATE_VARIABLES(templateId)}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.getAuthToken()}`
      }
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch template variables: ${response.statusText}`);
    }

    const data: ApiResponse<TemplateVariable[]> = await response.json();
    return data.data;
  }

  /**
   * Validate template syntax and variables
   */
  async validateTemplate(templateContent: string, variables: TemplateVariable[]): Promise<{
    isValid: boolean;
    errors: Array<{ line: number; column: number; message: string }>;
    warnings: Array<{ line: number; column: number; message: string }>;
    unusedVariables: string[];
    missingVariables: string[];
  }> {
    const response = await fetch(`${this.baseUrl}${ENDPOINTS.DOCUMENT_TEMPLATES}/validate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.getAuthToken()}`
      },
      body: JSON.stringify({ content: templateContent, variables })
    });

    if (!response.ok) {
      throw new Error(`Failed to validate template: ${response.statusText}`);
    }

    const data: ApiResponse<any> = await response.json();
    return data.data;
  }

  /**
   * Generate document from template
   */
  async generateDocument(request: DocumentGenerationRequest): Promise<DocumentGenerationResult> {
    const response = await fetch(`${this.baseUrl}${ENDPOINTS.GENERATE_DOCUMENT}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.getAuthToken()}`
      },
      body: JSON.stringify(request)
    });

    if (!response.ok) {
      throw new Error(`Failed to generate document: ${response.statusText}`);
    }

    const data: ApiResponse<DocumentGenerationResult> = await response.json();
    return data.data;
  }

  /**
   * Generate multiple documents in batch
   */
  async batchGenerateDocuments(request: BatchGenerationRequest): Promise<BatchGenerationResult> {
    const response = await fetch(`${this.baseUrl}${ENDPOINTS.BATCH_GENERATE}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.getAuthToken()}`
      },
      body: JSON.stringify(request)
    });

    if (!response.ok) {
      throw new Error(`Failed to batch generate documents: ${response.statusText}`);
    }

    const data: ApiResponse<BatchGenerationResult> = await response.json();
    return data.data;
  }

  /**
   * Get generated documents history
   */
  async getGeneratedDocuments(filters?: {
    templateId?: number;
    entityType?: string;
    entityId?: number;
    generatedBy?: number;
    dateFrom?: string;
    dateTo?: string;
    page?: number;
    limit?: number;
  }): Promise<{ documents: GeneratedDocument[]; total: number }> {
    const queryParams = new URLSearchParams();
    if (filters?.templateId) {
      queryParams.append('templateId', filters.templateId.toString());
    }
    if (filters?.entityType) {
      queryParams.append('entityType', filters.entityType);
    }
    if (filters?.entityId) {
      queryParams.append('entityId', filters.entityId.toString());
    }
    if (filters?.generatedBy) {
      queryParams.append('generatedBy', filters.generatedBy.toString());
    }
    if (filters?.dateFrom) {
      queryParams.append('dateFrom', filters.dateFrom);
    }
    if (filters?.dateTo) {
      queryParams.append('dateTo', filters.dateTo);
    }
    if (filters?.page) {
      queryParams.append('page', filters.page.toString());
    }
    if (filters?.limit) {
      queryParams.append('limit', filters.limit.toString());
    }

    const response = await fetch(`${this.baseUrl}${ENDPOINTS.GENERATED_DOCUMENTS}?${queryParams}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.getAuthToken()}`
      }
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch generated documents: ${response.statusText}`);
    }

    const data: ApiResponse<{ documents: GeneratedDocument[]; total: number }> = await response.json();
    return data.data;
  }

  /**
   * Download generated document
   */
  async downloadDocument(documentId: number): Promise<Blob> {
    const response = await fetch(`${this.baseUrl}${ENDPOINTS.GENERATED_DOCUMENTS}/${documentId}/download`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${this.getAuthToken()}`
      }
    });

    if (!response.ok) {
      throw new Error(`Failed to download document: ${response.statusText}`);
    }

    return await response.blob();
  }

  /**
   * Delete generated document
   */
  async deleteGeneratedDocument(documentId: number): Promise<void> {
    const response = await fetch(`${this.baseUrl}${ENDPOINTS.GENERATED_DOCUMENTS}/${documentId}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${this.getAuthToken()}`
      }
    });

    if (!response.ok) {
      throw new Error(`Failed to delete generated document: ${response.statusText}`);
    }
  }

  /**
   * Send document via email
   */
  async sendDocumentEmail(documentId: number, emailData: {
    to: string[];
    cc?: string[];
    bcc?: string[];
    subject: string;
    message: string;
    attachOriginal?: boolean;
  }): Promise<void> {
    const response = await fetch(`${this.baseUrl}${ENDPOINTS.GENERATED_DOCUMENTS}/${documentId}/send-email`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.getAuthToken()}`
      },
      body: JSON.stringify(emailData)
    });

    if (!response.ok) {
      throw new Error(`Failed to send document email: ${response.statusText}`);
    }
  }

  /**
   * Convert document format
   */
  async convertDocument(
    documentId: number,
    targetFormat: 'pdf' | 'word' | 'html'
  ): Promise<DocumentGenerationResult> {
    const response = await fetch(`${this.baseUrl}${ENDPOINTS.GENERATED_DOCUMENTS}/${documentId}/convert`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.getAuthToken()}`
      },
      body: JSON.stringify({ targetFormat })
    });

    if (!response.ok) {
      throw new Error(`Failed to convert document: ${response.statusText}`);
    }

    const data: ApiResponse<DocumentGenerationResult> = await response.json();
    return data.data;
  }

  /**
   * Merge multiple documents
   */
  async mergeDocuments(
    documentIds: number[],
    mergeOptions?: {
      title?: string;
      addPageBreaks?: boolean;
      includeToc?: boolean;
      format?: 'pdf' | 'word';
    }
  ): Promise<DocumentGenerationResult> {
    const response = await fetch(`${this.baseUrl}${ENDPOINTS.GENERATED_DOCUMENTS}/merge`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.getAuthToken()}`
      },
      body: JSON.stringify({
        documentIds,
        ...mergeOptions
      })
    });

    if (!response.ok) {
      throw new Error(`Failed to merge documents: ${response.statusText}`);
    }

    const data: ApiResponse<DocumentGenerationResult> = await response.json();
    return data.data;
  }

  /**
   * Get document generation queue status
   */
  async getGenerationQueueStatus(): Promise<{
    pending: number;
    processing: number;
    completed: number;
    failed: number;
    estimatedWaitTime: number;
  }> {
    const response = await fetch(`${this.baseUrl}${ENDPOINTS.GENERATE_DOCUMENT}/queue-status`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.getAuthToken()}`
      }
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch queue status: ${response.statusText}`);
    }

    const data: ApiResponse<any> = await response.json();
    return data.data;
  }

  /**
   * Upload template assets (images, fonts, etc.)
   */
  async uploadTemplateAsset(
    templateId: number,
    file: File,
    assetType: 'image' | 'font' | 'css'
  ): Promise<{ id: number; url: string; path: string }> {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('assetType', assetType);

    const response = await fetch(`${this.baseUrl}${ENDPOINTS.DOCUMENT_TEMPLATES}/${templateId}/assets`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.getAuthToken()}`
      },
      body: formData
    });

    if (!response.ok) {
      throw new Error(`Failed to upload template asset: ${response.statusText}`);
    }

    const data: ApiResponse<{ id: number; url: string; path: string }> = await response.json();
    return data.data;
  }

  /**
   * Get template assets
   */
  async getTemplateAssets(templateId: number): Promise<Array<{
    id: number;
    name: string;
    type: string;
    url: string;
    size: number;
    uploadedAt: string;
  }>> {
    const response = await fetch(`${this.baseUrl}${ENDPOINTS.DOCUMENT_TEMPLATES}/${templateId}/assets`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.getAuthToken()}`
      }
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch template assets: ${response.statusText}`);
    }

    const data: ApiResponse<any[]> = await response.json();
    return data.data;
  }

  /**
   * Export template package (template + assets)
   */
  async exportTemplatePackage(templateId: number): Promise<Blob> {
    const response = await fetch(`${this.baseUrl}${ENDPOINTS.DOCUMENT_TEMPLATES}/${templateId}/export`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${this.getAuthToken()}`
      }
    });

    if (!response.ok) {
      throw new Error(`Failed to export template package: ${response.statusText}`);
    }

    return await response.blob();
  }

  /**
   * Import template package
   */
  async importTemplatePackage(file: File, overwriteExisting?: boolean): Promise<DocumentTemplate> {
    const formData = new FormData();
    formData.append('package', file);
    if (overwriteExisting !== undefined) {
      formData.append('overwriteExisting', overwriteExisting.toString());
    }

    const response = await fetch(`${this.baseUrl}${ENDPOINTS.DOCUMENT_TEMPLATES}/import`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.getAuthToken()}`
      },
      body: formData
    });

    if (!response.ok) {
      throw new Error(`Failed to import template package: ${response.statusText}`);
    }

    const data: ApiResponse<DocumentTemplate> = await response.json();
    return data.data;
  }

  /**
   * Get authentication token from storage or context
   */
  private getAuthToken(): string {
    // This should be implemented based on your auth system
    return localStorage.getItem('authToken') || '';
  }

  /**
   * Handle API errors consistently
   */
  private handleError(error: any): never {
    console.error('DocumentService Error:', error);
    throw error;
  }
}

// Export singleton instance
export const documentService = new DocumentService();
export default documentService;