// Templates Hook - Sprint 19 Frontend Implementation

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useCallback } from 'react';

// Types
interface DocumentTemplate {
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

interface TemplateVariable {
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

interface TemplateStyles {
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

interface TemplateSettings {
  pageSize: string;
  orientation: string;
  headerFooter: boolean;
  watermark: boolean;
}

interface CreateTemplateDto {
  name: string;
  description: string;
  category: string;
  language: string;
  content: string;
  variables: TemplateVariable[];
  styles: TemplateStyles;
  settings: TemplateSettings;
  tags?: string[];
}

interface UpdateTemplateDto extends Partial<CreateTemplateDto> {
  id: number;
}

interface TemplateCategory {
  id: string;
  name: string;
  description: string;
  icon: string;
  templateCount: number;
}

export const useTemplates = (category?: string, entityType?: string) => {
  const queryClient = useQueryClient();

  // Build query key
  const queryKey = ['templates', { category, entityType }];

  // Fetch templates
  const {
    data: templates,
    isLoading,
    error,
    refetch
  } = useQuery({
    queryKey,
    queryFn: async (): Promise<DocumentTemplate[]> => {
      const params = new URLSearchParams();
      if (category) params.append('category', category);
      if (entityType) params.append('entityType', entityType);

      const response = await fetch(`/api/crm/documents/templates?${params}`);

      if (!response.ok) {
        throw new Error('Failed to fetch templates');
      }

      return response.json();
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  // Fetch template categories
  const { data: categories } = useQuery({
    queryKey: ['template-categories'],
    queryFn: async (): Promise<TemplateCategory[]> => {
      const response = await fetch('/api/crm/documents/templates/categories');

      if (!response.ok) {
        throw new Error('Failed to fetch categories');
      }

      return response.json();
    },
    staleTime: 30 * 60 * 1000, // 30 minutes
  });

  // Create template mutation
  const createTemplateMutation = useMutation({
    mutationFn: async (data: CreateTemplateDto): Promise<DocumentTemplate> => {
      const response = await fetch('/api/crm/documents/templates', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        throw new Error('Failed to create template');
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['templates'] });
      queryClient.invalidateQueries({ queryKey: ['template-categories'] });
    },
  });

  // Update template mutation
  const updateTemplateMutation = useMutation({
    mutationFn: async (data: UpdateTemplateDto): Promise<DocumentTemplate> => {
      const { id, ...updateData } = data;
      const response = await fetch(`/api/crm/documents/templates/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updateData),
      });

      if (!response.ok) {
        throw new Error('Failed to update template');
      }

      return response.json();
    },
    onSuccess: (updatedTemplate) => {
      queryClient.invalidateQueries({ queryKey: ['templates'] });
      queryClient.setQueryData(['template', updatedTemplate.id], updatedTemplate);
    },
  });

  // Delete template mutation
  const deleteTemplateMutation = useMutation({
    mutationFn: async (templateId: number): Promise<void> => {
      const response = await fetch(`/api/crm/documents/templates/${templateId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Failed to delete template');
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['templates'] });
      queryClient.invalidateQueries({ queryKey: ['template-categories'] });
    },
  });

  // Duplicate template mutation
  const duplicateTemplateMutation = useMutation({
    mutationFn: async ({ templateId, newName }: { templateId: number; newName: string }): Promise<DocumentTemplate> => {
      const response = await fetch(`/api/crm/documents/templates/${templateId}/duplicate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ name: newName }),
      });

      if (!response.ok) {
        throw new Error('Failed to duplicate template');
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['templates'] });
    },
  });

  // Get single template
  const getTemplate = useCallback(async (templateId: number): Promise<DocumentTemplate> => {
    // Check cache first
    const cachedTemplate = queryClient.getQueryData(['template', templateId]);
    if (cachedTemplate) {
      return cachedTemplate as DocumentTemplate;
    }

    const response = await fetch(`/api/crm/documents/templates/${templateId}`);

    if (!response.ok) {
      throw new Error('Failed to fetch template');
    }

    const template = await response.json();

    // Cache the result
    queryClient.setQueryData(['template', templateId], template);

    return template;
  }, [queryClient]);

  // Get template variables
  const getTemplateVariables = useCallback(async (templateId: number): Promise<TemplateVariable[]> => {
    const response = await fetch(`/api/crm/documents/templates/${templateId}/variables`);

    if (!response.ok) {
      throw new Error('Failed to fetch template variables');
    }

    return response.json();
  }, []);

  // Update template variables
  const updateTemplateVariables = useCallback(async (templateId: number, variables: TemplateVariable[]): Promise<void> => {
    const response = await fetch(`/api/crm/documents/templates/${templateId}/variables`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ variables }),
    });

    if (!response.ok) {
      throw new Error('Failed to update template variables');
    }

    // Invalidate related queries
    queryClient.invalidateQueries({ queryKey: ['template', templateId] });
    queryClient.invalidateQueries({ queryKey: ['templates'] });
  }, [queryClient]);

  // Import template
  const importTemplate = useCallback(async (file: File): Promise<DocumentTemplate> => {
    const formData = new FormData();
    formData.append('template', file);

    const response = await fetch('/api/crm/documents/templates/import', {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      throw new Error('Failed to import template');
    }

    const importedTemplate = await response.json();

    // Invalidate queries
    queryClient.invalidateQueries({ queryKey: ['templates'] });

    return importedTemplate;
  }, [queryClient]);

  // Export template
  const exportTemplate = useCallback(async (templateId: number): Promise<Blob> => {
    const response = await fetch(`/api/crm/documents/templates/${templateId}/export`);

    if (!response.ok) {
      throw new Error('Failed to export template');
    }

    return response.blob();
  }, []);

  // Public interface
  return {
    // Data
    templates: templates || [],
    categories: categories || [],

    // Loading states
    isLoading,
    isCreating: createTemplateMutation.isPending,
    isUpdating: updateTemplateMutation.isPending,
    isDeleting: deleteTemplateMutation.isPending,
    isDuplicating: duplicateTemplateMutation.isPending,

    // Errors
    error: error?.message || null,
    createError: createTemplateMutation.error?.message || null,
    updateError: updateTemplateMutation.error?.message || null,
    deleteError: deleteTemplateMutation.error?.message || null,
    duplicateError: duplicateTemplateMutation.error?.message || null,

    // Actions
    createTemplate: createTemplateMutation.mutateAsync,
    updateTemplate: updateTemplateMutation.mutateAsync,
    deleteTemplate: deleteTemplateMutation.mutateAsync,
    duplicateTemplate: (templateId: number, newName: string) =>
      duplicateTemplateMutation.mutateAsync({ templateId, newName }),

    // Utility functions
    getTemplate,
    getTemplateVariables,
    updateTemplateVariables,
    importTemplate,
    exportTemplate,
    refetch,

    // Reset functions
    resetCreateTemplate: createTemplateMutation.reset,
    resetUpdateTemplate: updateTemplateMutation.reset,
    resetDeleteTemplate: deleteTemplateMutation.reset,
    resetDuplicateTemplate: duplicateTemplateMutation.reset,
  };
};