// Document Generation Module - Sprint 19 Frontend Implementation
// Export all document generation components, hooks, and utilities

// Pages
export { default as DocumentGeneratorPage } from './pages/DocumentGeneratorPage';
export { default as TemplateManagementPage } from './pages/TemplateManagementPage';
export { default as DocumentHistoryPage } from './pages/DocumentHistoryPage';
export { default as RevenueRecognitionPage } from './pages/RevenueRecognitionPage';

// Components
export { default as DocumentGenerator } from './components/DocumentGenerator';
export { default as TemplateEditor } from './components/TemplateEditor';
export { default as DocumentPreviewer } from './components/DocumentPreviewer';
export { default as TemplateGallery } from './components/TemplateGallery';
export { default as DocumentSender } from './components/DocumentSender';

// Hooks
export { useDocumentGeneration } from './hooks/useDocumentGeneration';
export { useTemplates } from './hooks/useTemplates';
export { useTemplateEditor } from './hooks/useTemplateEditor';

// Templates
export { default as quoteTemplate } from './templates/quoteTemplate';
export { default as invoiceTemplate } from './templates/invoiceTemplate';

// Generators
export { default as PDFGenerator, pdfGenerator, PDFUtils } from './generators/pdfGenerator';
export { default as ExcelGenerator, excelGenerator, ExcelUtils } from './generators/excelGenerator';

// Types
export interface DocumentTemplate {
  id: number;
  name: string;
  description: string;
  category: string;
  language: string;
  content: string;
  variables: TemplateVariable[];
  styles: TemplateStyles;
  settings: TemplateSettings;
  isSystem: boolean;
  isActive: boolean;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  usageCount: number;
  rating: number;
  tags: string[];
  thumbnail?: string;
}

export interface TemplateVariable {
  name: string;
  type: 'text' | 'number' | 'date' | 'currency' | 'percentage' | 'image' | 'url' | 'email';
  label: string;
  description?: string;
  required: boolean;
  defaultValue?: any;
  validation?: {
    min?: number;
    max?: number;
    pattern?: string;
  };
  options?: string[];
}

export interface TemplateStyles {
  fonts: {
    heading: string;
    body: string;
  };
  colors: {
    primary: string;
    secondary: string;
    text: string;
  };
  layout: {
    margin: string;
    spacing: string;
  };
}

export interface TemplateSettings {
  pageSize: string;
  orientation: string;
  headerFooter: boolean;
  watermark: boolean;
}

export interface GeneratedDocument {
  id: number;
  templateId: number;
  templateName: string;
  entityType: string;
  entityId: number;
  entityName: string;
  fileName: string;
  originalFileName: string;
  url: string;
  format: 'pdf' | 'word' | 'excel' | 'html';
  size: number;
  status: 'generated' | 'sent' | 'viewed' | 'downloaded' | 'archived';
  generatedAt: string;
  generatedBy: number;
  generatedByName: string;
  variables: Record<string, any>;
  downloadCount: number;
  viewCount: number;
  lastAccessed?: string;
  sentAt?: string;
  sentTo?: string[];
  tags: string[];
  version: number;
  parentDocumentId?: number;
  pages?: number;
  content?: string;
}

export interface DocumentGenerationRequest {
  templateId: number;
  entityType: string;
  entityId: number;
  variables: Record<string, any>;
  format?: 'pdf' | 'word' | 'excel' | 'html';
  options?: {
    includeAttachments?: boolean;
    watermark?: boolean;
    protection?: boolean;
    digitalSignature?: boolean;
  };
  customBranding?: {
    logo?: string;
    colors?: {
      primary: string;
      secondary: string;
    };
    fonts?: {
      heading: string;
      body: string;
    };
  };
  language?: string;
  fileName?: string;
}

export interface DocumentGenerationResult {
  id: number;
  fileName: string;
  url: string;
  format: string;
  size: number;
  pages?: number;
  generatedAt: string;
  variables: Record<string, any>;
}

// Utility functions
export const DocumentUtils = {
  /**
   * Format file size in human readable format
   */
  formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  },

  /**
   * Get file extension from format
   */
  getFileExtension(format: string): string {
    const extensions = {
      pdf: '.pdf',
      word: '.docx',
      excel: '.xlsx',
      html: '.html'
    };
    return extensions[format as keyof typeof extensions] || '.pdf';
  },

  /**
   * Get MIME type from format
   */
  getMimeType(format: string): string {
    const mimeTypes = {
      pdf: 'application/pdf',
      word: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      excel: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      html: 'text/html'
    };
    return mimeTypes[format as keyof typeof mimeTypes] || 'application/pdf';
  },

  /**
   * Generate unique file name
   */
  generateFileName(baseName: string, format: string, timestamp?: Date): string {
    const cleanName = baseName.replace(/[^a-zA-Z0-9]/g, '_').toLowerCase();
    const dateStr = (timestamp || new Date()).toISOString().split('T')[0];
    const extension = this.getFileExtension(format);
    return `${cleanName}_${dateStr}${extension}`;
  },

  /**
   * Validate template variables
   */
  validateTemplateVariables(
    variables: TemplateVariable[],
    values: Record<string, any>
  ): { valid: boolean; errors: Record<string, string> } {
    const errors: Record<string, string> = {};

    variables.forEach(variable => {
      const value = values[variable.name];

      // Check required fields
      if (variable.required && (value === undefined || value === null || value === '')) {
        errors[variable.name] = `${variable.label} is required`;
        return;
      }

      // Skip validation if value is empty and not required
      if (!value && !variable.required) return;

      // Type validation
      switch (variable.type) {
        case 'email':
          const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
          if (!emailRegex.test(value)) {
            errors[variable.name] = 'Invalid email format';
          }
          break;
        case 'url':
          try {
            new URL(value);
          } catch {
            errors[variable.name] = 'Invalid URL format';
          }
          break;
        case 'number':
        case 'currency':
        case 'percentage':
          if (isNaN(Number(value))) {
            errors[variable.name] = 'Must be a valid number';
          }
          break;
        case 'date':
          if (isNaN(Date.parse(value))) {
            errors[variable.name] = 'Invalid date format';
          }
          break;
      }

      // Validation rules
      if (variable.validation) {
        const numValue = Number(value);
        if (variable.validation.min !== undefined && numValue < variable.validation.min) {
          errors[variable.name] = `Must be at least ${variable.validation.min}`;
        }
        if (variable.validation.max !== undefined && numValue > variable.validation.max) {
          errors[variable.name] = `Must be no more than ${variable.validation.max}`;
        }
        if (variable.validation.pattern) {
          const regex = new RegExp(variable.validation.pattern);
          if (!regex.test(value)) {
            errors[variable.name] = 'Invalid format';
          }
        }
      }
    });

    return {
      valid: Object.keys(errors).length === 0,
      errors
    };
  },

  /**
   * Extract variables from template content
   */
  extractVariablesFromTemplate(content: string): string[] {
    const variableRegex = /\{\{([^}]+)\}\}/g;
    const variables: string[] = [];
    let match;

    while ((match = variableRegex.exec(content)) !== null) {
      const variableName = match[1].trim();
      if (!variables.includes(variableName)) {
        variables.push(variableName);
      }
    }

    return variables;
  },

  /**
   * Format currency
   */
  formatCurrency(amount: number, currency: string = 'USD'): string {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency
    }).format(amount);
  },

  /**
   * Format date
   */
  formatDate(date: string | Date, locale: string = 'en-US'): string {
    return new Date(date).toLocaleDateString(locale);
  },

  /**
   * Format percentage
   */
  formatPercentage(value: number): string {
    return `${(value * 100).toFixed(1)}%`;
  }
};

export default {
  // Pages
  DocumentGeneratorPage,
  TemplateManagementPage,
  DocumentHistoryPage,
  RevenueRecognitionPage,

  // Components
  DocumentGenerator,
  TemplateEditor,
  DocumentPreviewer,
  TemplateGallery,
  DocumentSender,

  // Hooks
  useDocumentGeneration,
  useTemplates,
  useTemplateEditor,

  // Templates
  quoteTemplate,
  invoiceTemplate,

  // Generators
  PDFGenerator,
  pdfGenerator,
  PDFUtils,
  ExcelGenerator,
  excelGenerator,
  ExcelUtils,

  // Utilities
  DocumentUtils
};