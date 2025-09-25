// useQuoteVersioning - Sprint 19 Frontend Implementation
// Version control for quotes

import { useState, useCallback } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { quoteService } from '../services/quoteService';
import { Quote } from '../../shared/types';

interface UseQuoteVersioningReturn {
  versions: Quote[];
  isLoading: boolean;
  error: string | null;
  loadVersions: (quoteId: number) => Promise<void>;
  createVersion: (quoteId: number, description?: string) => Promise<Quote>;
  restoreVersion: (quoteId: number, versionId: number) => Promise<void>;
}

export const useQuoteVersioning = (quoteId: number): UseQuoteVersioningReturn => {
  const queryClient = useQueryClient();

  const [versions, setVersions] = useState<Quote[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadVersions = useCallback(async (id: number) => {
    setIsLoading(true);
    setError(null);

    try {
      const versionData = await quoteService.getQuoteVersions(id);
      setVersions(versionData);
    } catch (err) {
      console.error('Failed to load versions:', err);
      setError(err instanceof Error ? err.message : 'Failed to load versions');
    } finally {
      setIsLoading(false);
    }
  }, []);

  const createVersionMutation = useMutation({
    mutationFn: ({ quoteId, description }: { quoteId: number; description?: string }) =>
      quoteService.createQuoteVersion(quoteId, { description }),
    onSuccess: (newVersion) => {
      setVersions(prev => [newVersion, ...prev]);
      queryClient.invalidateQueries({ queryKey: ['quotes'] });
      queryClient.invalidateQueries({ queryKey: ['quote', quoteId] });
    }
  });

  const createVersion = useCallback(async (id: number, description?: string) => {
    const result = await createVersionMutation.mutateAsync({ quoteId: id, description });
    return result;
  }, [createVersionMutation]);

  const restoreVersion = useCallback(async (id: number, versionId: number) => {
    // Implementation would restore a version - placeholder
    console.log('Restore version:', id, versionId);
  }, []);

  return {
    versions,
    isLoading: isLoading || createVersionMutation.isPending,
    error,
    loadVersions,
    createVersion,
    restoreVersion
  };
};