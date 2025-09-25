// useWorkflowBuilder - Workflow building operations hook
import { useState, useCallback, useEffect } from 'react';
import {
  ApprovalWorkflow,
  ApprovalStep,
  ApprovalApprover,
  WorkflowCondition,
  EscalationRule,
  WorkflowCanvas,
  WorkflowNode,
  WorkflowEdge
} from '../../shared/types';
import { workflowValidator, ValidationResult } from '../workflows/workflowValidator';
import { workflowTemplates, WorkflowTemplate } from '../workflows/workflowTemplates';

interface WorkflowBuilderState {
  workflow: Partial<ApprovalWorkflow>;
  canvas: WorkflowCanvas;
  selectedNodeId: string | null;
  selectedStepId: number | null;
  isDirty: boolean;
  validationResult: ValidationResult | null;
}

interface UseWorkflowBuilderReturn {
  // State
  state: WorkflowBuilderState;

  // Workflow operations
  initializeWorkflow: (workflow?: ApprovalWorkflow) => void;
  updateWorkflowInfo: (info: Partial<ApprovalWorkflow>) => void;
  addStep: (step?: Partial<ApprovalStep>) => ApprovalStep;
  updateStep: (stepId: number, updates: Partial<ApprovalStep>) => void;
  deleteStep: (stepId: number) => void;
  reorderSteps: (fromIndex: number, toIndex: number) => void;

  // Approver operations
  addApprover: (stepId: number, approver: Partial<ApprovalApprover>) => void;
  updateApprover: (stepId: number, approverId: number, updates: Partial<ApprovalApprover>) => void;
  deleteApprover: (stepId: number, approverId: number) => void;

  // Condition operations
  addCondition: (condition: Partial<WorkflowCondition>) => void;
  updateCondition: (conditionId: number, updates: Partial<WorkflowCondition>) => void;
  deleteCondition: (conditionId: number) => void;

  // Escalation operations
  addEscalationRule: (stepId: number, rule: Partial<EscalationRule>) => void;
  updateEscalationRule: (stepId: number, ruleId: number, updates: Partial<EscalationRule>) => void;
  deleteEscalationRule: (stepId: number, ruleId: number) => void;

  // Canvas operations
  updateCanvas: (canvas: WorkflowCanvas) => void;
  selectNode: (nodeId: string | null) => void;
  addNode: (type: WorkflowNode['type'], position: { x: number; y: number }) => void;
  deleteNode: (nodeId: string) => void;
  connectNodes: (sourceId: string, targetId: string) => void;

  // Template operations
  applyTemplate: (template: WorkflowTemplate) => void;
  saveAsTemplate: (name: string, description: string) => WorkflowTemplate;

  // Validation
  validate: () => ValidationResult;
  getFieldErrors: (field: string) => string[];

  // Utility
  reset: () => void;
  canSave: () => boolean;
  getWorkflowSummary: () => string;
  exportWorkflow: () => string;
  importWorkflow: (data: string) => void;
}

const createInitialState = (): WorkflowBuilderState => ({
  workflow: {
    name: '',
    description: '',
    type: 'sequential',
    triggerEvent: 'quote_created',
    conditions: [],
    steps: [],
    isActive: true,
    isDefault: false,
    priority: 1,
    companyId: 1,
    createdBy: 1
  },
  canvas: {
    nodes: [],
    edges: [],
    viewport: { x: 0, y: 0, zoom: 1 }
  },
  selectedNodeId: null,
  selectedStepId: null,
  isDirty: false,
  validationResult: null
});

export const useWorkflowBuilder = (initialWorkflow?: ApprovalWorkflow): UseWorkflowBuilderReturn => {
  const [state, setState] = useState<WorkflowBuilderState>(createInitialState);

  // Initialize with existing workflow
  useEffect(() => {
    if (initialWorkflow) {
      initializeWorkflow(initialWorkflow);
    }
  }, [initialWorkflow]);

  // Auto-validate on changes
  useEffect(() => {
    if (state.isDirty) {
      const validationResult = workflowValidator.validateWorkflow(state.workflow);
      setState(prev => ({ ...prev, validationResult }));
    }
  }, [state.workflow, state.isDirty]);

  // Generate canvas from workflow steps
  const generateCanvasFromWorkflow = useCallback((workflow: Partial<ApprovalWorkflow>): WorkflowCanvas => {
    const nodes: WorkflowNode[] = [];
    const edges: WorkflowEdge[] = [];

    // Add start node
    nodes.push({
      id: 'start',
      type: 'start',
      position: { x: 50, y: 100 },
      data: { label: 'Start' }
    });

    // Add step nodes
    workflow.steps?.forEach((step, index) => {
      const nodeId = `step-${step.id}`;
      nodes.push({
        id: nodeId,
        type: 'approval_step',
        position: { x: 250 + index * 200, y: 100 },
        data: {
          label: step.name,
          stepId: step.id,
          config: {
            type: step.type,
            approvers: step.approvers,
            timeoutHours: step.timeoutHours
          }
        }
      });

      // Connect to previous node
      const sourceId = index === 0 ? 'start' : `step-${workflow.steps![index - 1].id}`;
      edges.push({
        id: `edge-${sourceId}-${nodeId}`,
        source: sourceId,
        target: nodeId
      });
    });

    // Add end node
    const endNodeId = 'end';
    nodes.push({
      id: endNodeId,
      type: 'end',
      position: { x: 250 + (workflow.steps?.length || 0) * 200, y: 100 },
      data: { label: 'End' }
    });

    // Connect last step to end
    if (workflow.steps && workflow.steps.length > 0) {
      const lastStepId = `step-${workflow.steps[workflow.steps.length - 1].id}`;
      edges.push({
        id: `edge-${lastStepId}-${endNodeId}`,
        source: lastStepId,
        target: endNodeId
      });
    }

    return {
      nodes,
      edges,
      viewport: { x: 0, y: 0, zoom: 1 }
    };
  }, []);

  // Workflow operations
  const initializeWorkflow = useCallback((workflow?: ApprovalWorkflow) => {
    const initialWorkflowData = workflow || createInitialState().workflow;
    const canvas = generateCanvasFromWorkflow(initialWorkflowData);

    setState({
      workflow: { ...initialWorkflowData },
      canvas,
      selectedNodeId: null,
      selectedStepId: null,
      isDirty: false,
      validationResult: null
    });
  }, [generateCanvasFromWorkflow]);

  const updateWorkflowInfo = useCallback((info: Partial<ApprovalWorkflow>) => {
    setState(prev => ({
      ...prev,
      workflow: { ...prev.workflow, ...info },
      isDirty: true
    }));
  }, []);

  const addStep = useCallback((stepData?: Partial<ApprovalStep>): ApprovalStep => {
    const newStep: ApprovalStep = {
      id: Date.now(),
      workflowId: 0,
      name: stepData?.name || `Step ${(state.workflow.steps?.length || 0) + 1}`,
      description: stepData?.description || '',
      stepNumber: (state.workflow.steps?.length || 0) + 1,
      type: stepData?.type || 'single',
      approvers: stepData?.approvers || [],
      isRequired: stepData?.isRequired ?? true,
      timeoutHours: stepData?.timeoutHours || 24,
      ...stepData
    };

    setState(prev => {
      const updatedWorkflow = {
        ...prev.workflow,
        steps: [...(prev.workflow.steps || []), newStep]
      };

      return {
        ...prev,
        workflow: updatedWorkflow,
        canvas: generateCanvasFromWorkflow(updatedWorkflow),
        isDirty: true
      };
    });

    return newStep;
  }, [state.workflow.steps, generateCanvasFromWorkflow]);

  const updateStep = useCallback((stepId: number, updates: Partial<ApprovalStep>) => {
    setState(prev => {
      const updatedWorkflow = {
        ...prev.workflow,
        steps: prev.workflow.steps?.map(step =>
          step.id === stepId ? { ...step, ...updates } : step
        ) || []
      };

      return {
        ...prev,
        workflow: updatedWorkflow,
        canvas: generateCanvasFromWorkflow(updatedWorkflow),
        isDirty: true
      };
    });
  }, [generateCanvasFromWorkflow]);

  const deleteStep = useCallback((stepId: number) => {
    setState(prev => {
      const updatedSteps = prev.workflow.steps?.filter(step => step.id !== stepId) || [];

      // Reorder step numbers
      updatedSteps.forEach((step, index) => {
        step.stepNumber = index + 1;
      });

      const updatedWorkflow = {
        ...prev.workflow,
        steps: updatedSteps
      };

      return {
        ...prev,
        workflow: updatedWorkflow,
        canvas: generateCanvasFromWorkflow(updatedWorkflow),
        selectedStepId: prev.selectedStepId === stepId ? null : prev.selectedStepId,
        isDirty: true
      };
    });
  }, [generateCanvasFromWorkflow]);

  const reorderSteps = useCallback((fromIndex: number, toIndex: number) => {
    setState(prev => {
      const steps = [...(prev.workflow.steps || [])];
      const [movedStep] = steps.splice(fromIndex, 1);
      steps.splice(toIndex, 0, movedStep);

      // Update step numbers
      steps.forEach((step, index) => {
        step.stepNumber = index + 1;
      });

      const updatedWorkflow = {
        ...prev.workflow,
        steps
      };

      return {
        ...prev,
        workflow: updatedWorkflow,
        canvas: generateCanvasFromWorkflow(updatedWorkflow),
        isDirty: true
      };
    });
  }, [generateCanvasFromWorkflow]);

  // Approver operations
  const addApprover = useCallback((stepId: number, approverData: Partial<ApprovalApprover>) => {
    const newApprover: ApprovalApprover = {
      id: Date.now(),
      stepId,
      type: approverData.type || 'user',
      isRequired: approverData.isRequired ?? true,
      canDelegate: approverData.canDelegate ?? true,
      ...approverData
    };

    updateStep(stepId, {
      approvers: [
        ...(state.workflow.steps?.find(s => s.id === stepId)?.approvers || []),
        newApprover
      ]
    });
  }, [state.workflow.steps, updateStep]);

  const updateApprover = useCallback((stepId: number, approverId: number, updates: Partial<ApprovalApprover>) => {
    const step = state.workflow.steps?.find(s => s.id === stepId);
    if (!step) return;

    const updatedApprovers = step.approvers.map(approver =>
      approver.id === approverId ? { ...approver, ...updates } : approver
    );

    updateStep(stepId, { approvers: updatedApprovers });
  }, [state.workflow.steps, updateStep]);

  const deleteApprover = useCallback((stepId: number, approverId: number) => {
    const step = state.workflow.steps?.find(s => s.id === stepId);
    if (!step) return;

    const updatedApprovers = step.approvers.filter(approver => approver.id !== approverId);
    updateStep(stepId, { approvers: updatedApprovers });
  }, [state.workflow.steps, updateStep]);

  // Condition operations
  const addCondition = useCallback((conditionData: Partial<WorkflowCondition>) => {
    const newCondition: WorkflowCondition = {
      id: Date.now(),
      field: conditionData.field || 'amount',
      operator: conditionData.operator || 'greater_than',
      value: conditionData.value || 0,
      ...conditionData
    };

    setState(prev => ({
      ...prev,
      workflow: {
        ...prev.workflow,
        conditions: [...(prev.workflow.conditions || []), newCondition]
      },
      isDirty: true
    }));
  }, []);

  const updateCondition = useCallback((conditionId: number, updates: Partial<WorkflowCondition>) => {
    setState(prev => ({
      ...prev,
      workflow: {
        ...prev.workflow,
        conditions: prev.workflow.conditions?.map(condition =>
          condition.id === conditionId ? { ...condition, ...updates } : condition
        ) || []
      },
      isDirty: true
    }));
  }, []);

  const deleteCondition = useCallback((conditionId: number) => {
    setState(prev => ({
      ...prev,
      workflow: {
        ...prev.workflow,
        conditions: prev.workflow.conditions?.filter(condition => condition.id !== conditionId) || []
      },
      isDirty: true
    }));
  }, []);

  // Escalation operations
  const addEscalationRule = useCallback((stepId: number, ruleData: Partial<EscalationRule>) => {
    const newRule: EscalationRule = {
      id: Date.now(),
      stepId,
      triggerAfterHours: ruleData.triggerAfterHours || 24,
      action: ruleData.action || 'notify',
      ...ruleData
    };

    const step = state.workflow.steps?.find(s => s.id === stepId);
    if (!step) return;

    updateStep(stepId, {
      escalationRules: [...(step.escalationRules || []), newRule]
    });
  }, [state.workflow.steps, updateStep]);

  const updateEscalationRule = useCallback((stepId: number, ruleId: number, updates: Partial<EscalationRule>) => {
    const step = state.workflow.steps?.find(s => s.id === stepId);
    if (!step) return;

    const updatedRules = step.escalationRules?.map(rule =>
      rule.id === ruleId ? { ...rule, ...updates } : rule
    ) || [];

    updateStep(stepId, { escalationRules: updatedRules });
  }, [state.workflow.steps, updateStep]);

  const deleteEscalationRule = useCallback((stepId: number, ruleId: number) => {
    const step = state.workflow.steps?.find(s => s.id === stepId);
    if (!step) return;

    const updatedRules = step.escalationRules?.filter(rule => rule.id !== ruleId) || [];
    updateStep(stepId, { escalationRules: updatedRules });
  }, [state.workflow.steps, updateStep]);

  // Canvas operations
  const updateCanvas = useCallback((canvas: WorkflowCanvas) => {
    setState(prev => ({
      ...prev,
      canvas,
      isDirty: true
    }));
  }, []);

  const selectNode = useCallback((nodeId: string | null) => {
    setState(prev => ({
      ...prev,
      selectedNodeId: nodeId,
      selectedStepId: nodeId?.startsWith('step-') ?
        parseInt(nodeId.replace('step-', '')) : null
    }));
  }, []);

  const addNode = useCallback((type: WorkflowNode['type'], position: { x: number; y: number }) => {
    const nodeId = `${type}-${Date.now()}`;
    const newNode: WorkflowNode = {
      id: nodeId,
      type,
      position,
      data: { label: type.charAt(0).toUpperCase() + type.slice(1) }
    };

    setState(prev => ({
      ...prev,
      canvas: {
        ...prev.canvas,
        nodes: [...prev.canvas.nodes, newNode]
      },
      isDirty: true
    }));
  }, []);

  const deleteNode = useCallback((nodeId: string) => {
    setState(prev => ({
      ...prev,
      canvas: {
        ...prev.canvas,
        nodes: prev.canvas.nodes.filter(node => node.id !== nodeId),
        edges: prev.canvas.edges.filter(edge =>
          edge.source !== nodeId && edge.target !== nodeId
        )
      },
      selectedNodeId: prev.selectedNodeId === nodeId ? null : prev.selectedNodeId,
      isDirty: true
    }));
  }, []);

  const connectNodes = useCallback((sourceId: string, targetId: string) => {
    const edgeId = `edge-${sourceId}-${targetId}`;
    const newEdge: WorkflowEdge = {
      id: edgeId,
      source: sourceId,
      target: targetId
    };

    setState(prev => ({
      ...prev,
      canvas: {
        ...prev.canvas,
        edges: [...prev.canvas.edges, newEdge]
      },
      isDirty: true
    }));
  }, []);

  // Template operations
  const applyTemplate = useCallback((template: WorkflowTemplate) => {
    const workflowFromTemplate = {
      ...template.workflow,
      id: undefined,
      createdAt: undefined,
      updatedAt: undefined,
      createdBy: state.workflow.createdBy,
      companyId: state.workflow.companyId
    };

    initializeWorkflow(workflowFromTemplate as ApprovalWorkflow);
  }, [state.workflow.createdBy, state.workflow.companyId, initializeWorkflow]);

  const saveAsTemplate = useCallback((name: string, description: string): WorkflowTemplate => {
    const template: WorkflowTemplate = {
      id: `custom-${Date.now()}`,
      name,
      description,
      category: 'general',
      difficulty: 'intermediate',
      estimatedSetupTime: 15,
      tags: ['custom'],
      workflow: {
        ...state.workflow,
        name,
        description
      } as Omit<ApprovalWorkflow, 'id' | 'companyId' | 'createdAt' | 'updatedAt' | 'createdBy'>
    };

    return template;
  }, [state.workflow]);

  // Validation
  const validate = useCallback((): ValidationResult => {
    return workflowValidator.validateWorkflow(state.workflow);
  }, [state.workflow]);

  const getFieldErrors = useCallback((field: string): string[] => {
    if (!state.validationResult) return [];

    return state.validationResult.errors
      .filter(error => error.field === field)
      .map(error => error.message);
  }, [state.validationResult]);

  // Utility
  const reset = useCallback(() => {
    setState(createInitialState());
  }, []);

  const canSave = useCallback((): boolean => {
    if (!state.isDirty) return false;

    const validation = validate();
    return validation.isValid;
  }, [state.isDirty, validate]);

  const getWorkflowSummary = useCallback((): string => {
    const { workflow } = state;
    const stepCount = workflow.steps?.length || 0;
    const approverCount = workflow.steps?.reduce((total, step) =>
      total + step.approvers.length, 0) || 0;

    return `${workflow.name || 'Untitled'} - ${stepCount} steps, ${approverCount} approvers`;
  }, [state.workflow]);

  const exportWorkflow = useCallback((): string => {
    return JSON.stringify(state.workflow, null, 2);
  }, [state.workflow]);

  const importWorkflow = useCallback((data: string) => {
    try {
      const imported = JSON.parse(data);
      initializeWorkflow(imported);
    } catch (error) {
      console.error('Failed to import workflow:', error);
      throw new Error('Invalid workflow data');
    }
  }, [initializeWorkflow]);

  return {
    // State
    state,

    // Workflow operations
    initializeWorkflow,
    updateWorkflowInfo,
    addStep,
    updateStep,
    deleteStep,
    reorderSteps,

    // Approver operations
    addApprover,
    updateApprover,
    deleteApprover,

    // Condition operations
    addCondition,
    updateCondition,
    deleteCondition,

    // Escalation operations
    addEscalationRule,
    updateEscalationRule,
    deleteEscalationRule,

    // Canvas operations
    updateCanvas,
    selectNode,
    addNode,
    deleteNode,
    connectNodes,

    // Template operations
    applyTemplate,
    saveAsTemplate,

    // Validation
    validate,
    getFieldErrors,

    // Utility
    reset,
    canSave,
    getWorkflowSummary,
    exportWorkflow,
    importWorkflow
  };
};