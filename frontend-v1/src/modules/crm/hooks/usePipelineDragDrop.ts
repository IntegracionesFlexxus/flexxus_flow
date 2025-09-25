/**
 * Pipeline Drag & Drop Hook
 * Handles drag and drop functionality for pipeline kanban board
 */

import { useCallback, useState } from 'react';
import { DragDropContext, DragStart, DragUpdate, DropResult } from 'react-beautiful-dnd';
import usePipelineStore from '../stores/usePipelineStore';
import { OpportunityExtended } from '../types/pipeline.types';
import { useNotification } from '../../../shared/hooks/useNotification';

interface DragState {
  isDragging: boolean;
  draggingId: string | null;
  sourceStageId: number | null;
  destinationStageId: number | null;
}

interface ValidationResult {
  isValid: boolean;
  message?: string;
}

export const usePipelineDragDrop = () => {
  const { showNotification } = useNotification();
  const {
    moveOpportunity,
    stages,
    opportunities,
    updateOpportunity
  } = usePipelineStore();

  const [dragState, setDragState] = useState<DragState>({
    isDragging: false,
    draggingId: null,
    sourceStageId: null,
    destinationStageId: null
  });

  const [isProcessing, setIsProcessing] = useState(false);

  // Validate if opportunity can be moved to target stage
  const validateMove = useCallback((
    opportunity: OpportunityExtended,
    targetStageId: number
  ): ValidationResult => {
    const targetStage = stages.find(s => s.stage_id === targetStageId);

    if (!targetStage) {
      return { isValid: false, message: 'Invalid target stage' };
    }

    // Check if moving to closed stage without required fields
    if (targetStage.is_closed && !opportunity.expected_close_date) {
      return {
        isValid: false,
        message: 'Please set an expected close date before moving to closed stage'
      };
    }

    // Check if moving backwards from closed stage
    const currentStage = stages.find(s => s.stage_id === opportunity.stage_id);
    if (currentStage?.is_closed && !targetStage.is_closed) {
      return {
        isValid: false,
        message: 'Cannot move opportunity back from closed stage'
      };
    }

    // Check stage order for non-closed stages
    if (!currentStage?.is_closed && !targetStage.is_closed) {
      const skipCount = Math.abs(targetStage.stage_order - currentStage.stage_order);
      if (skipCount > 2) {
        return {
          isValid: true,
          message: `Warning: Skipping ${skipCount - 1} stages`
        };
      }
    }

    return { isValid: true };
  }, [stages]);

  const onDragStart = useCallback((start: DragStart) => {
    const { draggableId, source } = start;
    const sourceStageId = parseInt(source.droppableId.replace('stage-', ''));

    setDragState({
      isDragging: true,
      draggingId: draggableId,
      sourceStageId,
      destinationStageId: null
    });

    // Add dragging class to body for global styles
    document.body.classList.add('dragging');
  }, []);

  const onDragUpdate = useCallback((update: DragUpdate) => {
    const { destination } = update;

    if (destination) {
      const destStageId = parseInt(destination.droppableId.replace('stage-', ''));
      setDragState(prev => ({
        ...prev,
        destinationStageId: destStageId
      }));
    } else {
      setDragState(prev => ({
        ...prev,
        destinationStageId: null
      }));
    }
  }, []);

  const onDragEnd = useCallback(async (result: DropResult) => {
    const { draggableId, source, destination } = result;

    // Clean up
    document.body.classList.remove('dragging');
    setDragState({
      isDragging: false,
      draggingId: null,
      sourceStageId: null,
      destinationStageId: null
    });

    // Dropped outside of list
    if (!destination) {
      return;
    }

    // Dropped in same position
    if (
      source.droppableId === destination.droppableId &&
      source.index === destination.index
    ) {
      return;
    }

    const sourceStageId = parseInt(source.droppableId.replace('stage-', ''));
    const destStageId = parseInt(destination.droppableId.replace('stage-', ''));

    // If moved within same stage, just reorder (if needed)
    if (sourceStageId === destStageId) {
      // Could implement reordering logic here if needed
      return;
    }

    const opportunity = opportunities.find(o => o.id === draggableId);
    if (!opportunity) {
      showNotification('error', 'Opportunity not found');
      return;
    }

    // Validate move
    const validation = validateMove(opportunity, destStageId);
    if (!validation.isValid) {
      showNotification('error', validation.message || 'Invalid move');
      return;
    }

    if (validation.message) {
      showNotification('warning', validation.message);
    }

    // Perform the move
    setIsProcessing(true);

    try {
      // Optimistic update
      updateOpportunity(draggableId, { stage_id: destStageId });

      // Get stage names for notification
      const sourceStage = stages.find(s => s.stage_id === sourceStageId);
      const destStage = stages.find(s => s.stage_id === destStageId);

      // Server update
      await moveOpportunity(
        draggableId,
        destStageId,
        `Moved from ${sourceStage?.name} to ${destStage?.name}`
      );

      showNotification(
        'success',
        `${opportunity.name} moved to ${destStage?.name}`
      );

      // Track activity if OMNI module is available
      // TODO: Uncomment when @omni/activity-tracker module is available
      // try {
      //   const { trackActivity } = await import('@omni/activity-tracker');
      //   await trackActivity({
      //     type: 'opportunity_stage_change',
      //     entityId: opportunity.id,
      //     data: {
      //       from: sourceStage?.name,
      //       to: destStage?.name,
      //       opportunity_name: opportunity.name,
      //       amount: opportunity.amount
      //     }
      //   });
      // } catch (e) {
      //   // OMNI module not available, continue without tracking
      // }
    } catch (error: any) {
      // Revert optimistic update on error
      updateOpportunity(draggableId, { stage_id: sourceStageId });
      showNotification('error', error.message || 'Failed to move opportunity');
    } finally {
      setIsProcessing(false);
    }
  }, [opportunities, stages, moveOpportunity, updateOpportunity, validateMove, showNotification]);

  // Helper function to check if a stage can accept drops
  const canDropInStage = useCallback((stageId: number): boolean => {
    if (!dragState.isDragging || !dragState.draggingId) {
      return true;
    }

    const opportunity = opportunities.find(o => o.id === dragState.draggingId);
    if (!opportunity) {
      return false;
    }

    const validation = validateMove(opportunity, stageId);
    return validation.isValid;
  }, [dragState, opportunities, validateMove]);

  // Helper to get drag handle props
  const getDragHandleProps = useCallback((opportunityId: string) => ({
    'data-testid': `drag-handle-${opportunityId}`,
    'aria-label': 'Drag to move opportunity',
    style: { cursor: isProcessing ? 'not-allowed' : 'grab' }
  }), [isProcessing]);

  // Helper to get droppable props for a stage
  const getDroppableProps = useCallback((stageId: number) => ({
    droppableId: `stage-${stageId}`,
    isDropDisabled: isProcessing || !canDropInStage(stageId),
    type: 'OPPORTUNITY'
  }), [isProcessing, canDropInStage]);

  // Helper to get draggable props for an opportunity
  const getDraggableProps = useCallback((opportunity: OpportunityExtended, index: number) => ({
    draggableId: opportunity.id,
    index,
    isDragDisabled: isProcessing
  }), [isProcessing]);

  return {
    // State
    dragState,
    isProcessing,

    // Handlers
    onDragStart,
    onDragUpdate,
    onDragEnd,

    // Helpers
    canDropInStage,
    getDragHandleProps,
    getDroppableProps,
    getDraggableProps,

    // Validation
    validateMove
  };
};

export default usePipelineDragDrop;