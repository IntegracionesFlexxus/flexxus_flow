// Quote Service - Sprint 19 Frontend Implementation

import {
  Quote,
  QuoteLineItem,
  QuoteTotals,
  QuoteSection,
  CreateLineItemDto,
  DocumentTemplate,
  DocumentGenerationRequest,
  DocumentGenerationResult,
  ApiResponse,
  PaginatedResponse,
  CreateDto,
  UpdateDto
} from '../../shared/types';

// API Endpoints
const ENDPOINTS = {
  QUOTES: '/api/crm/quotes',
  QUOTE_ITEMS: (id: number) => `/api/crm/quotes/${id}/items`,
  QUOTE_SECTIONS: (id: number) => `/api/crm/quotes/${id}/sections`,
  QUOTE_TOTALS: (id: number) => `/api/crm/quotes/${id}/totals`,
  QUOTE_SUBMIT_APPROVAL: (id: number) => `/api/crm/quotes/${id}/submit-approval`,
  QUOTE_GENERATE_DOCUMENT: (id: number) => `/api/crm/quotes/${id}/generate-document`,
  QUOTE_DUPLICATE: (id: number) => `/api/crm/quotes/${id}/duplicate`,
  QUOTE_VERSIONS: (id: number) => `/api/crm/quotes/${id}/versions`,
  QUOTE_CONVERT: (id: number) => `/api/crm/quotes/${id}/convert`,
  DOCUMENT_TEMPLATES: '/api/crm/documents/templates'
};

class QuoteService {
  private baseUrl: string;

  constructor(baseUrl: string = '') {
    this.baseUrl = baseUrl;
  }

  /**
   * Get quotes with pagination and filtering
   */
  async getQuotes(params?: {
    page?: number;
    limit?: number;
    status?: string[];
    customerId?: number;
    assignedTo?: number;
    dateFrom?: string;
    dateTo?: string;
    search?: string;
  }): Promise<PaginatedResponse<Quote>> {
    const queryParams = new URLSearchParams();

    if (params?.page) queryParams.append('page', params.page.toString());
    if (params?.limit) queryParams.append('limit', params.limit.toString());
    if (params?.status?.length) queryParams.append('status', params.status.join(','));
    if (params?.customerId) queryParams.append('customerId', params.customerId.toString());
    if (params?.assignedTo) queryParams.append('assignedTo', params.assignedTo.toString());
    if (params?.dateFrom) queryParams.append('dateFrom', params.dateFrom);
    if (params?.dateTo) queryParams.append('dateTo', params.dateTo);
    if (params?.search) queryParams.append('search', params.search);

    const response = await fetch(`${this.baseUrl}${ENDPOINTS.QUOTES}?${queryParams}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.getAuthToken()}`
      }
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch quotes: ${response.statusText}`);
    }

    return await response.json();
  }

  /**
   * Get single quote by ID
   */
  async getQuote(id: number): Promise<Quote> {
    const response = await fetch(`${this.baseUrl}${ENDPOINTS.QUOTES}/${id}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.getAuthToken()}`
      }
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch quote: ${response.statusText}`);
    }

    const data: ApiResponse<Quote> = await response.json();
    return data.data;
  }

  /**
   * Create new quote
   */
  async createQuote(quoteData: CreateDto<Quote>): Promise<Quote> {
    const response = await fetch(`${this.baseUrl}${ENDPOINTS.QUOTES}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.getAuthToken()}`
      },
      body: JSON.stringify(quoteData)
    });

    if (!response.ok) {
      throw new Error(`Failed to create quote: ${response.statusText}`);
    }

    const data: ApiResponse<Quote> = await response.json();
    return data.data;
  }

  /**
   * Update existing quote
   */
  async updateQuote(id: number, updates: UpdateDto<Quote>): Promise<Quote> {
    const response = await fetch(`${this.baseUrl}${ENDPOINTS.QUOTES}/${id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.getAuthToken()}`
      },
      body: JSON.stringify(updates)
    });

    if (!response.ok) {
      throw new Error(`Failed to update quote: ${response.statusText}`);
    }

    const data: ApiResponse<Quote> = await response.json();
    return data.data;
  }

  /**
   * Delete quote
   */
  async deleteQuote(id: number): Promise<void> {
    const response = await fetch(`${this.baseUrl}${ENDPOINTS.QUOTES}/${id}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${this.getAuthToken()}`
      }
    });

    if (!response.ok) {
      throw new Error(`Failed to delete quote: ${response.statusText}`);
    }
  }

  /**
   * Duplicate quote
   */
  async duplicateQuote(id: number, options?: {
    newTitle?: string;
    copyLineItems?: boolean;
    resetDates?: boolean;
  }): Promise<Quote> {
    const response = await fetch(`${this.baseUrl}${ENDPOINTS.QUOTE_DUPLICATE(id)}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.getAuthToken()}`
      },
      body: JSON.stringify(options || {})
    });

    if (!response.ok) {
      throw new Error(`Failed to duplicate quote: ${response.statusText}`);
    }

    const data: ApiResponse<Quote> = await response.json();
    return data.data;
  }

  /**
   * Get quote versions
   */
  async getQuoteVersions(id: number): Promise<Quote[]> {
    const response = await fetch(`${this.baseUrl}${ENDPOINTS.QUOTE_VERSIONS(id)}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.getAuthToken()}`
      }
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch quote versions: ${response.statusText}`);
    }

    const data: ApiResponse<Quote[]> = await response.json();
    return data.data;
  }

  /**
   * Create new quote version
   */
  async createQuoteVersion(id: number, versionData?: { description?: string }): Promise<Quote> {
    const response = await fetch(`${this.baseUrl}${ENDPOINTS.QUOTE_VERSIONS(id)}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.getAuthToken()}`
      },
      body: JSON.stringify(versionData || {})
    });

    if (!response.ok) {
      throw new Error(`Failed to create quote version: ${response.statusText}`);
    }

    const data: ApiResponse<Quote> = await response.json();
    return data.data;
  }

  /**
   * Add line item to quote
   */
  async addLineItem(quoteId: number, item: CreateLineItemDto): Promise<QuoteLineItem> {
    const response = await fetch(`${this.baseUrl}${ENDPOINTS.QUOTE_ITEMS(quoteId)}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.getAuthToken()}`
      },
      body: JSON.stringify(item)
    });

    if (!response.ok) {
      throw new Error(`Failed to add line item: ${response.statusText}`);
    }

    const data: ApiResponse<QuoteLineItem> = await response.json();
    return data.data;
  }

  /**
   * Update line item
   */
  async updateLineItem(quoteId: number, itemId: number, updates: Partial<QuoteLineItem>): Promise<QuoteLineItem> {
    const response = await fetch(`${this.baseUrl}${ENDPOINTS.QUOTE_ITEMS(quoteId)}/${itemId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.getAuthToken()}`
      },
      body: JSON.stringify(updates)
    });

    if (!response.ok) {
      throw new Error(`Failed to update line item: ${response.statusText}`);
    }

    const data: ApiResponse<QuoteLineItem> = await response.json();
    return data.data;
  }

  /**
   * Remove line item from quote
   */
  async removeLineItem(quoteId: number, itemId: number): Promise<void> {
    const response = await fetch(`${this.baseUrl}${ENDPOINTS.QUOTE_ITEMS(quoteId)}/${itemId}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${this.getAuthToken()}`
      }
    });

    if (!response.ok) {
      throw new Error(`Failed to remove line item: ${response.statusText}`);
    }
  }

  /**
   * Reorder line items
   */
  async reorderLineItems(quoteId: number, itemOrders: Array<{ id: number; sortOrder: number }>): Promise<void> {
    const response = await fetch(`${this.baseUrl}${ENDPOINTS.QUOTE_ITEMS(quoteId)}/reorder`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.getAuthToken()}`
      },
      body: JSON.stringify({ itemOrders })
    });

    if (!response.ok) {
      throw new Error(`Failed to reorder line items: ${response.statusText}`);
    }
  }

  /**
   * Add section to quote
   */
  async addSection(quoteId: number, section: Omit<QuoteSection, 'id' | 'quoteId'>): Promise<QuoteSection> {
    const response = await fetch(`${this.baseUrl}${ENDPOINTS.QUOTE_SECTIONS(quoteId)}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.getAuthToken()}`
      },
      body: JSON.stringify(section)
    });

    if (!response.ok) {
      throw new Error(`Failed to add section: ${response.statusText}`);
    }

    const data: ApiResponse<QuoteSection> = await response.json();
    return data.data;
  }

  /**
   * Update section
   */
  async updateSection(quoteId: number, sectionId: number, updates: Partial<QuoteSection>): Promise<QuoteSection> {
    const response = await fetch(`${this.baseUrl}${ENDPOINTS.QUOTE_SECTIONS(quoteId)}/${sectionId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.getAuthToken()}`
      },
      body: JSON.stringify(updates)
    });

    if (!response.ok) {
      throw new Error(`Failed to update section: ${response.statusText}`);
    }

    const data: ApiResponse<QuoteSection> = await response.json();
    return data.data;
  }

  /**
   * Remove section from quote
   */
  async removeSection(quoteId: number, sectionId: number): Promise<void> {
    const response = await fetch(`${this.baseUrl}${ENDPOINTS.QUOTE_SECTIONS(quoteId)}/${sectionId}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${this.getAuthToken()}`
      }
    });

    if (!response.ok) {
      throw new Error(`Failed to remove section: ${response.statusText}`);
    }
  }

  /**
   * Calculate quote totals
   */
  async calculateTotals(quoteId: number): Promise<QuoteTotals> {
    const response = await fetch(`${this.baseUrl}${ENDPOINTS.QUOTE_TOTALS(quoteId)}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.getAuthToken()}`
      }
    });

    if (!response.ok) {
      throw new Error(`Failed to calculate quote totals: ${response.statusText}`);
    }

    const data: ApiResponse<QuoteTotals> = await response.json();
    return data.data;
  }

  /**
   * Submit quote for approval
   */
  async submitForApproval(quoteId: number, comments?: string): Promise<{ processId: number }> {
    const response = await fetch(`${this.baseUrl}${ENDPOINTS.QUOTE_SUBMIT_APPROVAL(quoteId)}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.getAuthToken()}`
      },
      body: JSON.stringify({ comments })
    });

    if (!response.ok) {
      throw new Error(`Failed to submit quote for approval: ${response.statusText}`);
    }

    const data: ApiResponse<{ processId: number }> = await response.json();
    return data.data;
  }

  /**
   * Convert quote to order
   */
  async convertToOrder(quoteId: number): Promise<{ orderId: number }> {
    const response = await fetch(`${this.baseUrl}${ENDPOINTS.QUOTE_CONVERT(quoteId)}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.getAuthToken()}`
      }
    });

    if (!response.ok) {
      throw new Error(`Failed to convert quote to order: ${response.statusText}`);
    }

    const data: ApiResponse<{ orderId: number }> = await response.json();
    return data.data;
  }

  /**
   * Generate document from quote
   */
  async generateDocument(quoteId: number, request: DocumentGenerationRequest): Promise<DocumentGenerationResult> {
    const response = await fetch(`${this.baseUrl}${ENDPOINTS.QUOTE_GENERATE_DOCUMENT(quoteId)}`, {
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
   * Get document templates
   */
  async getDocumentTemplates(type?: 'quote' | 'proposal' | 'contract'): Promise<DocumentTemplate[]> {
    const queryParams = new URLSearchParams();
    if (type) {
      queryParams.append('type', type);
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
   * Send quote via email
   */
  async sendQuoteEmail(quoteId: number, emailData: {
    to: string[];
    cc?: string[];
    bcc?: string[];
    subject: string;
    message: string;
    includeAttachments?: boolean;
    templateId?: number;
  }): Promise<void> {
    const response = await fetch(`${this.baseUrl}${ENDPOINTS.QUOTES}/${quoteId}/send-email`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.getAuthToken()}`
      },
      body: JSON.stringify(emailData)
    });

    if (!response.ok) {
      throw new Error(`Failed to send quote email: ${response.statusText}`);
    }
  }

  /**
   * Get quote activity log
   */
  async getQuoteActivityLog(quoteId: number): Promise<any[]> {
    const response = await fetch(`${this.baseUrl}${ENDPOINTS.QUOTES}/${quoteId}/activity`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.getAuthToken()}`
      }
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch quote activity log: ${response.statusText}`);
    }

    const data: ApiResponse<any[]> = await response.json();
    return data.data;
  }

  /**
   * Bulk operations on quotes
   */
  async bulkUpdateQuotes(updates: Array<{ id: number; data: Partial<Quote> }>): Promise<void> {
    const response = await fetch(`${this.baseUrl}${ENDPOINTS.QUOTES}/bulk-update`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.getAuthToken()}`
      },
      body: JSON.stringify({ updates })
    });

    if (!response.ok) {
      throw new Error(`Failed to bulk update quotes: ${response.statusText}`);
    }
  }

  /**
   * Export quotes to file
   */
  async exportQuotes(params: {
    format: 'csv' | 'excel' | 'pdf';
    quoteIds?: number[];
    filters?: any;
    columns?: string[];
  }): Promise<Blob> {
    const queryParams = new URLSearchParams({
      format: params.format
    });

    if (params.quoteIds) {
      queryParams.append('quoteIds', params.quoteIds.join(','));
    }
    if (params.filters) {
      queryParams.append('filters', JSON.stringify(params.filters));
    }
    if (params.columns) {
      queryParams.append('columns', params.columns.join(','));
    }

    const response = await fetch(`${this.baseUrl}${ENDPOINTS.QUOTES}/export?${queryParams}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${this.getAuthToken()}`
      }
    });

    if (!response.ok) {
      throw new Error(`Failed to export quotes: ${response.statusText}`);
    }

    return await response.blob();
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
    console.error('QuoteService Error:', error);
    throw error;
  }
}

// Export singleton instance
export const quoteService = new QuoteService();
export default quoteService;