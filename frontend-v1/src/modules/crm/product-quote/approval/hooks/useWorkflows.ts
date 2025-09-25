// useWorkflows - Workflow management hook
import { useState, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ApprovalWorkflow } from '../../shared/types';
import { approvalService } from '../services/approvalService';
import { workflowValidator, ValidationResult } from '../workflows/workflowValidator';

interface UseWorkflowsReturn {
  // State
  workflows: ApprovalWorkflow[];
  loading: boolean;
  error: string | null;
  validationResults: Map<number, ValidationResult>;

  // Actions
  createWorkflow: (workflow: Omit<ApprovalWorkflow, 'id' | 'createdAt' | 'updatedAt'>) => Promise<ApprovalWorkflow>;
  updateWorkflow: (id: number, updates: Partial<ApprovalWorkflow>) => Promise<ApprovalWorkflow>;
  deleteWorkflow: (id: number) => Promise<void>;
  duplicateWorkflow: (id: number, newName?: string) => Promise<ApprovalWorkflow>;
  testWorkflow: (id: number, testData: any) => Promise<any>;
  validateWorkflow: (workflow: Partial<ApprovalWorkflow>) => ValidationResult;
  getWorkflowById: (id: number) => ApprovalWorkflow | undefined;
  getWorkflowsByType: (type: string) => ApprovalWorkflow[];
  getActiveWorkflows: () => ApprovalWorkflow[];
  refreshWorkflows: () => void;
}

export const useWorkflows = (): UseWorkflowsReturn => {
  const queryClient = useQueryClient();
  const [validationResults, setValidationResults] = useState<Map<number, ValidationResult>>(new Map());

  const WORKFLOWS_KEY = ['workflows'];

  // Workflows query
  const {
    data: workflows = [],
    isLoading,
    error: queryError,
    refetch: refetchWorkflows
  } = useQuery({
    queryKey: WORKFLOWS_KEY,
    queryFn: () => approvalService.getApprovalWorkflows(),
    staleTime: 300000, // 5 minutes
    refetchOnWindowFocus: true
  });

  // Create workflow mutation
  const createWorkflowMutation = useMutation({
    mutationFn: (workflow: Omit<ApprovalWorkflow, 'id' | 'createdAt' | 'updatedAt'>) => {
      // Validate before creating
      const validation = workflowValidator.validateWorkflow(workflow);
      if (!validation.isValid) {
        throw new Error(`Validation failed: ${validation.errors.map(e => e.message).join(', ')}`);
      }
      return approvalService.createApprovalWorkflow(workflow);
    },
    onSuccess: (newWorkflow) => {
      queryClient.invalidateQueries({ queryKey: WORKFLOWS_KEY });
      // Store validation results
      const validation = workflowValidator.validateWorkflow(newWorkflow);
      setValidationResults(prev => new Map(prev).set(newWorkflow.id, validation));
    },
    onError: (error) => {
      console.error('Failed to create workflow:', error);
    }
  });

  // Update workflow mutation
  const updateWorkflowMutation = useMutation({
    mutationFn: ({ id, updates }: { id: number; updates: Partial<ApprovalWorkflow> }) => {
      // Get current workflow and merge updates for validation
      const currentWorkflow = workflows.find(w => w.id === id);
      if (currentWorkflow) {
        const updatedWorkflow = { ...currentWorkflow, ...updates };
        const validation = workflowValidator.validateWorkflow(updatedWorkflow);

        // Store validation results
        setValidationResults(prev => new Map(prev).set(id, validation));

        if (!validation.isValid) {
          // Allow update but warn user
          console.warn('Workflow validation warnings:', validation.errors);
        }
      }

      return approvalService.updateApprovalWorkflow(id, updates);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: WORKFLOWS_KEY });
    },
    onError: (error) => {
      console.error('Failed to update workflow:', error);
    }
  });

  // Delete workflow mutation
  const deleteWorkflowMutation = useMutation({
    mutationFn: (id: number) => approvalService.deleteApprovalWorkflow(id),
    onSuccess: (_, deletedId) => {
      queryClient.invalidateQueries({ queryKey: WORKFLOWS_KEY });
      // Remove validation results
      setValidationResults(prev => {
        const newMap = new Map(prev);
        newMap.delete(deletedId);
        return newMap;
      });
    },
    onError: (error) => {
      console.error('Failed to delete workflow:', error);
    }
  });

  // Duplicate workflow mutation
  const duplicateWorkflowMutation = useMutation({
    mutationFn: ({ id, newName }: { id: number; newName?: string }) => {
      const originalWorkflow = workflows.find(w => w.id === id);
      if (!originalWorkflow) {
        throw new Error('Workflow not found');
      }

      const duplicatedWorkflow: Omit<ApprovalWorkflow, 'id' | 'createdAt' | 'updatedAt'> = {
        ...originalWorkflow,
        name: newName || `${originalWorkflow.name} (Copy)`,
        isActive: false, // Duplicated workflows start as inactive
        isDefault: false // Can't have multiple default workflows
      };

      // Remove id, createdAt, updatedAt from the duplicated workflow
      delete (duplicatedWorkflow as any).id;
      delete (duplicatedWorkflow as any).createdAt;
      delete (duplicatedWorkflow as any).updatedAt;

      return approvalService.createApprovalWorkflow(duplicatedWorkflow);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: WORKFLOWS_KEY });
    },
    onError: (error) => {
      console.error('Failed to duplicate workflow:', error);
    }
  });

  // Test workflow mutation
  const testWorkflowMutation = useMutation({
    mutationFn: ({ id, testData }: { id: number; testData: any }) =>
      approvalService.testApprovalWorkflow(id, testData),
    onError: (error) => {
      console.error('Failed to test workflow:', error);
    }
  });

  // Action functions
  const createWorkflow = useCallback(async (
    workflow: Omit<ApprovalWorkflow, 'id' | 'createdAt' | 'updatedAt'>
  ): Promise<ApprovalWorkflow> => {
    return await createWorkflowMutation.mutateAsync(workflow);
  }, [createWorkflowMutation]);

  const updateWorkflow = useCallback(async (
    id: number,
    updates: Partial<ApprovalWorkflow>
  ): Promise<ApprovalWorkflow> => {
    return await updateWorkflowMutation.mutateAsync({ id, updates });
  }, [updateWorkflowMutation]);

  const deleteWorkflow = useCallback(async (id: number): Promise<void> => {
    await deleteWorkflowMutation.mutateAsync(id);
  }, [deleteWorkflowMutation]);

  const duplicateWorkflow = useCallback(async (
    id: number,
    newName?: string
  ): Promise<ApprovalWorkflow> => {
    return await duplicateWorkflowMutation.mutateAsync({ id, newName });
  }, [duplicateWorkflowMutation]);

  const testWorkflow = useCallback(async (id: number, testData: any): Promise<any> => {
    return await testWorkflowMutation.mutateAsync({ id, testData });
  }, [testWorkflowMutation]);

  const validateWorkflow = useCallback((workflow: Partial<ApprovalWorkflow>): ValidationResult => {
    return workflowValidator.validateWorkflow(workflow);
  }, []);

  const getWorkflowById = useCallback((id: number): ApprovalWorkflow | undefined => {
    return workflows.find(workflow => workflow.id === id);
  }, [workflows]);

  const getWorkflowsByType = useCallback((type: string): ApprovalWorkflow[] => {
    return workflows.filter(workflow => workflow.type === type);
  }, [workflows]);

  const getActiveWorkflows = useCallback((): ApprovalWorkflow[] => {
    return workflows.filter(workflow => workflow.isActive);
  }, [workflows]);

  const refreshWorkflows = useCallback(() => {
    refetchWorkflows();
  }, [refetchWorkflows]);

  // Validate all workflows on load
  useState(() => {
    workflows.forEach(workflow => {
      const validation = workflowValidator.validateWorkflow(workflow);
      setValidationResults(prev => new Map(prev).set(workflow.id, validation));
    });
  });

  // Compute loading and error states
  const loading = isLoading ||
                 createWorkflowMutation.isPending ||
                 updateWorkflowMutation.isPending ||
                 deleteWorkflowMutation.isPending ||
                 duplicateWorkflowMutation.isPending ||
                 testWorkflowMutation.isPending;

  const error = queryError?.message ||
               createWorkflowMutation.error?.message ||
               updateWorkflowMutation.error?.message ||
               deleteWorkflowMutation.error?.message ||
               duplicateWorkflowMutation.error?.message ||
               testWorkflowMutation.error?.message ||
               null;

  return {
    // State
    workflows,
    loading,
    error,
    validationResults,

    // Actions
    createWorkflow,
    updateWorkflow,
    deleteWorkflow,
    duplicateWorkflow,
    testWorkflow,
    validateWorkflow,
    getWorkflowById,
    getWorkflowsByType,
    getActiveWorkflows,
    refreshWorkflows
  };
};