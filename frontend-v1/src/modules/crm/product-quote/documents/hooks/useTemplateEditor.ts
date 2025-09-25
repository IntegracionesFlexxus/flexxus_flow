// Template Editor Hook - Sprint 19 Frontend Implementation

import { useState, useCallback, useRef } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';

// Types
interface TemplateData {
  id?: number;
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

interface EditorHistory {
  content: string;
  timestamp: number;
}

export const useTemplateEditor = () => {
  const queryClient = useQueryClient();

  // State
  const [currentTemplate, setCurrentTemplate] = useState<TemplateData | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // History for undo/redo
  const [history, setHistory] = useState<EditorHistory[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);

  // Auto-save timer
  const autoSaveTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Default template structure
  const getDefaultTemplate = (): TemplateData => ({
    name: 'New Template',
    description: '',
    category: 'quote',
    language: 'en',
    content: '<h1>New Template</h1><p>Start editing your template here...</p>',
    variables: [],
    styles: {
      fonts: {
        heading: 'Arial',
        body: 'Arial'
      },
      colors: {
        primary: '#3B82F6',
        secondary: '#6B7280',
        text: '#1F2937'
      },
      layout: {
        margin: '20px',
        spacing: '16px'
      }
    },
    settings: {
      pageSize: 'A4',
      orientation: 'portrait',
      headerFooter: true,
      watermark: false
    },
    tags: []
  });

  // Save template mutation
  const saveTemplateMutation = useMutation({
    mutationFn: async (templateData: TemplateData) => {
      const url = templateData.id
        ? `/api/crm/documents/templates/${templateData.id}`
        : '/api/crm/documents/templates';

      const method = templateData.id ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(templateData),
      });

      if (!response.ok) {
        throw new Error('Failed to save template');
      }

      return response.json();
    },
    onSuccess: (savedTemplate) => {
      setCurrentTemplate(savedTemplate);
      setHasUnsavedChanges(false);
      setError(null);

      // Update cache
      queryClient.invalidateQueries({ queryKey: ['templates'] });
      queryClient.setQueryData(['template', savedTemplate.id], savedTemplate);
    },
    onError: (error: Error) => {
      setError(error.message);
    },
  });

  // Preview template mutation
  const previewTemplateMutation = useMutation({
    mutationFn: async (templateData: TemplateData) => {
      const response = await fetch('/api/crm/documents/templates/preview', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(templateData),
      });

      if (!response.ok) {
        throw new Error('Failed to generate preview');
      }

      return response.json();
    },
  });

  // Load template
  const loadTemplate = useCallback(async (templateId: number) => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/crm/documents/templates/${templateId}`);

      if (!response.ok) {
        throw new Error('Failed to load template');
      }

      const template = await response.json();

      setCurrentTemplate(template);
      setIsEditing(true);
      setHasUnsavedChanges(false);

      // Initialize history
      setHistory([{ content: template.content, timestamp: Date.now() }]);
      setHistoryIndex(0);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load template');
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Create new template
  const createNewTemplate = useCallback(() => {
    const newTemplate = getDefaultTemplate();
    setCurrentTemplate(newTemplate);
    setIsEditing(true);
    setHasUnsavedChanges(false);

    // Initialize history
    setHistory([{ content: newTemplate.content, timestamp: Date.now() }]);
    setHistoryIndex(0);
  }, []);

  // Update template content
  const updateTemplate = useCallback((updates: Partial<TemplateData>) => {
    setCurrentTemplate(prev => {
      if (!prev) return null;

      const updated = { ...prev, ...updates };

      // Add to history if content changed
      if (updates.content && updates.content !== prev.content) {
        setHistory(prevHistory => {
          const newHistory = prevHistory.slice(0, historyIndex + 1);
          newHistory.push({ content: updates.content!, timestamp: Date.now() });
          return newHistory.slice(-50); // Keep last 50 entries
        });
        setHistoryIndex(prev => prev + 1);
      }

      return updated;
    });

    setHasUnsavedChanges(true);

    // Auto-save after 5 seconds of inactivity
    if (autoSaveTimerRef.current) {
      clearTimeout(autoSaveTimerRef.current);
    }

    autoSaveTimerRef.current = setTimeout(() => {
      if (currentTemplate && hasUnsavedChanges) {
        saveTemplate(currentTemplate);
      }
    }, 5000);
  }, [currentTemplate, hasUnsavedChanges, historyIndex]);

  // Save template
  const saveTemplate = useCallback(async (templateData: TemplateData) => {
    try {
      await saveTemplateMutation.mutateAsync(templateData);

      // Clear auto-save timer
      if (autoSaveTimerRef.current) {
        clearTimeout(autoSaveTimerRef.current);
        autoSaveTimerRef.current = null;
      }
    } catch (error) {
      console.error('Failed to save template:', error);
    }
  }, [saveTemplateMutation]);

  // Preview template
  const previewTemplate = useCallback(async (templateData: TemplateData) => {
    try {
      return await previewTemplateMutation.mutateAsync(templateData);
    } catch (error) {
      console.error('Failed to preview template:', error);
      throw error;
    }
  }, [previewTemplateMutation]);

  // Undo
  const undo = useCallback(() => {
    if (historyIndex > 0) {
      const newIndex = historyIndex - 1;
      const historyItem = history[newIndex];

      setCurrentTemplate(prev => {
        if (!prev) return null;
        return { ...prev, content: historyItem.content };
      });

      setHistoryIndex(newIndex);
      setHasUnsavedChanges(true);
    }
  }, [history, historyIndex]);

  // Redo
  const redo = useCallback(() => {
    if (historyIndex < history.length - 1) {
      const newIndex = historyIndex + 1;
      const historyItem = history[newIndex];

      setCurrentTemplate(prev => {
        if (!prev) return null;
        return { ...prev, content: historyItem.content };
      });

      setHistoryIndex(newIndex);
      setHasUnsavedChanges(true);
    }
  }, [history, historyIndex]);

  // Can undo/redo
  const canUndo = historyIndex > 0;
  const canRedo = historyIndex < history.length - 1;

  // Discard changes
  const discardChanges = useCallback(() => {
    if (currentTemplate?.id) {
      loadTemplate(currentTemplate.id);
    } else {
      setCurrentTemplate(null);
      setIsEditing(false);
    }
    setHasUnsavedChanges(false);

    // Clear auto-save timer
    if (autoSaveTimerRef.current) {
      clearTimeout(autoSaveTimerRef.current);
      autoSaveTimerRef.current = null;
    }
  }, [currentTemplate?.id, loadTemplate]);

  // Close editor
  const closeEditor = useCallback(() => {
    setCurrentTemplate(null);
    setIsEditing(false);
    setHasUnsavedChanges(false);
    setHistory([]);
    setHistoryIndex(-1);

    // Clear auto-save timer
    if (autoSaveTimerRef.current) {
      clearTimeout(autoSaveTimerRef.current);
      autoSaveTimerRef.current = null;
    }
  }, []);

  // Get template variables from content
  const extractVariables = useCallback((content: string): string[] => {
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
  }, []);

  // Auto-detect and suggest variables
  const suggestVariables = useCallback((content: string): TemplateVariable[] => {
    const extractedVars = extractVariables(content);
    const existingVarNames = currentTemplate?.variables.map(v => v.name) || [];

    return extractedVars
      .filter(varName => !existingVarNames.includes(varName))
      .map(varName => ({
        name: varName,
        type: 'text' as const,
        label: varName.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
        required: false
      }));
  }, [currentTemplate?.variables, extractVariables]);

  // Cleanup on unmount
  React.useEffect(() => {
    return () => {
      if (autoSaveTimerRef.current) {
        clearTimeout(autoSaveTimerRef.current);
      }
    };
  }, []);

  return {
    // State
    currentTemplate,
    isEditing,
    hasUnsavedChanges,
    isLoading,
    error,

    // History
    canUndo,
    canRedo,

    // Loading states
    isSaving: saveTemplateMutation.isPending,
    isPreviewing: previewTemplateMutation.isPending,

    // Actions
    loadTemplate,
    createNewTemplate,
    updateTemplate,
    saveTemplate,
    previewTemplate,
    undo,
    redo,
    discardChanges,
    closeEditor,

    // Utilities
    extractVariables,
    suggestVariables,

    // Errors
    saveError: saveTemplateMutation.error?.message || null,
    previewError: previewTemplateMutation.error?.message || null,
  };
};