// Document Generation Hook - Sprint 19 Frontend Implementation

import { useState, useCallback } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';

// Types
interface DocumentGenerationRequest {
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

interface DocumentGenerationResult {
  id: number;
  fileName: string;
  url: string;
  format: string;
  size: number;
  pages?: number;
  generatedAt: string;
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

interface PreviewRequest {
  templateId: number;
  variables: Record<string, any>;
  format?: 'html' | 'pdf';
}

export const useDocumentGeneration = () => {
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Generate single document
  const generateDocumentMutation = useMutation({
    mutationFn: async (request: DocumentGenerationRequest): Promise<DocumentGenerationResult> => {
      const response = await fetch('/api/crm/documents/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(request),
      });

      if (!response.ok) {
        throw new Error('Failed to generate document');
      }

      return response.json();
    },
    onMutate: () => {
      setIsGenerating(true);
      setError(null);
    },
    onSuccess: () => {
      setIsGenerating(false);
    },
    onError: (error: Error) => {
      setIsGenerating(false);
      setError(error.message);
    },
  });

  // Batch generation
  const batchGenerateMutation = useMutation({
    mutationFn: async (request: BatchGenerationRequest) => {
      const response = await fetch('/api/crm/documents/batch-generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(request),
      });

      if (!response.ok) {
        throw new Error('Failed to generate documents');
      }

      return response.json();
    },
  });

  // Preview document
  const previewDocumentMutation = useMutation({
    mutationFn: async (request: PreviewRequest) => {
      const response = await fetch('/api/crm/documents/preview', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(request),
      });

      if (!response.ok) {
        throw new Error('Failed to generate preview');
      }

      return response.json();
    },
  });

  // Regenerate document
  const regenerateDocumentMutation = useMutation({
    mutationFn: async (request: DocumentGenerationRequest) => {
      const response = await fetch('/api/crm/documents/regenerate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(request),
      });

      if (!response.ok) {
        throw new Error('Failed to regenerate document');
      }

      return response.json();
    },
  });

  // Validate variables
  const validateVariables = useCallback(async (templateId: number, variables: Record<string, any>) => {
    try {
      const response = await fetch(`/api/crm/documents/templates/${templateId}/validate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ variables }),
      });

      if (!response.ok) {
        throw new Error('Failed to validate variables');
      }

      return response.json();
    } catch (error) {
      console.error('Variable validation error:', error);
      return { valid: false, errors: {} };
    }
  }, []);

  // Generate document
  const generateDocument = useCallback(async (request: DocumentGenerationRequest) => {
    try {
      return await generateDocumentMutation.mutateAsync(request);
    } catch (error) {
      console.error('Document generation error:', error);
      throw error;
    }
  }, [generateDocumentMutation]);

  // Batch generate
  const batchGenerate = useCallback(async (request: BatchGenerationRequest) => {
    try {
      return await batchGenerateMutation.mutateAsync(request);
    } catch (error) {
      console.error('Batch generation error:', error);
      throw error;
    }
  }, [batchGenerateMutation]);

  // Preview document
  const previewDocument = useCallback(async (request: PreviewRequest) => {
    try {
      return await previewDocumentMutation.mutateAsync(request);
    } catch (error) {
      console.error('Preview generation error:', error);
      throw error;
    }
  }, [previewDocumentMutation]);

  // Regenerate document
  const regenerateDocument = useCallback(async (request: DocumentGenerationRequest) => {
    try {
      return await regenerateDocumentMutation.mutateAsync(request);
    } catch (error) {
      console.error('Document regeneration error:', error);
      throw error;
    }
  }, [regenerateDocumentMutation]);

  return {
    // State
    isGenerating: isGenerating || generateDocumentMutation.isPending,
    error: error || generateDocumentMutation.error?.message || null,

    // Batch state
    isBatchGenerating: batchGenerateMutation.isPending,
    batchError: batchGenerateMutation.error?.message || null,

    // Preview state
    isPreviewing: previewDocumentMutation.isPending,
    previewError: previewDocumentMutation.error?.message || null,

    // Actions
    generateDocument,
    batchGenerate,
    previewDocument,
    regenerateDocument,
    validateVariables,

    // Reset functions
    clearError: () => setError(null),
    resetGeneration: () => {
      setIsGenerating(false);
      setError(null);
      generateDocumentMutation.reset();
    },
  };
};