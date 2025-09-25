/**
 * Stage Column Component
 * Represents a single stage column in the pipeline kanban board
 */

import React, { memo, useMemo, useState } from 'react';
import {
  Box,
  Paper,
  Typography,
  Chip,
  IconButton,
  Badge,
  Tooltip,
  Menu,
  MenuItem,
  LinearProgress,
  Collapse,
  Button,
  Divider
} from '@mui/material';
import {
  MoreVert,
  Warning,
  Add,
  ExpandMore,
  ExpandLess,
  TrendingUp,
  Group,
  AttachMoney
} from '@mui/icons-material';
import { Droppable } from 'react-beautiful-dnd';
import { PipelineStage, OpportunityExtended } from '../../types/pipeline.types';
import OpportunityCard from './OpportunityCard';
import { formatCurrency } from '../../utils/formatters';
import usePipelineStore from '../../stores/usePipelineStore';
import usePipelineMetrics from '../../hooks/usePipelineMetrics';

interface StageColumnProps {
  stage: PipelineStage;
  opportunities: OpportunityExtended[];
  cardSize: 'compact' | 'normal' | 'expanded';
  isDropDisabled?: boolean;
  wipLimit?: number;
  onAddOpportunity?: (stageId: number) => void;
  onEditStage?: (stage: PipelineStage) => void;
  onBulkMove?: (opportunityIds: string[], targetStageId: number) => void;
  onEditOpportunity?: (opportunity: OpportunityExtended) => void;
  onChangeOwner?: (opportunity: OpportunityExtended) => void;
  onAddNote?: (opportunity: OpportunityExtended) => void;
}

export const StageColumn: React.FC<StageColumnProps> = memo(({
  stage,
  opportunities,
  cardSize,
  isDropDisabled = false,
  wipLimit,
  onAddOpportunity,
  onEditStage,
  onBulkMove,
  onEditOpportunity,
  onChangeOwner,
  onAddNote
}) => {
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const { isBottleneck, getStageVelocity } = usePipelineMetrics();

  const stageMetrics = useMemo(() => {
    const totalValue = opportunities.reduce((sum, opp) => sum + opp.amount, 0);
    const weightedValue = opportunities.reduce((sum, opp) => sum + opp.weighted_amount, 0);
    const avgDaysInStage = opportunities.length > 0
      ? opportunities.reduce((sum, opp) => sum + (opp.days_in_stage || 0), 0) / opportunities.length
      : 0;

    return {
      count: opportunities.length,
      totalValue,
      weightedValue,
      avgDaysInStage: Math.round(avgDaysInStage)
    };
  }, [opportunities]);

  const isOverWipLimit = wipLimit ? stageMetrics.count > wipLimit : false;
  const hasBottleneck = isBottleneck(stage.stage_id);
  const velocity = getStageVelocity(stage.stage_id);

  const handleMenuOpen = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
  };

  const handleAddOpportunity = () => {
    handleMenuClose();
    onAddOpportunity?.(stage.stage_id);
  };

  const handleEditStage = () => {
    handleMenuClose();
    onEditStage?.(stage);
  };

  const handleBulkMoveAll = (targetStageId: number) => {
    handleMenuClose();
    const oppIds = opportunities.map(o => o.id);
    onBulkMove?.(oppIds, targetStageId);
  };

  const toggleCollapse = () => {
    setIsCollapsed(!isCollapsed);
  };

  const getStageColor = () => {
    if (stage.is_won) return '#4caf50';
    if (stage.is_closed) return '#f44336';
    return stage.stage_color || '#2196f3';
  };

  const getProgressPercentage = () => {
    if (!stage.win_probability) return 0;
    return stage.win_probability;
  };

  return (
    <Box sx={{ minWidth: 300, maxWidth: 350, height: '100%' }}>
      <Paper
        elevation={2}
        sx={{
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          bgcolor: 'background.paper',
          borderTop: '4px solid',
          borderTopColor: getStageColor(),
          overflow: 'hidden'
        }}
      >
        {/* Stage Header */}
        <Box
          sx={{
            p: 2,
            bgcolor: 'grey.50',
            borderBottom: 1,
            borderColor: 'divider'
          }}
        >
          <Box display="flex" alignItems="center" justifyContent="space-between" mb={1}>
            <Box display="flex" alignItems="center" gap={1}>
              <Typography variant="subtitle1" fontWeight="bold">
                {stage.name}
              </Typography>
              <Badge badgeContent={stageMetrics.count} color="primary" />
              {hasBottleneck && (
                <Tooltip title="Bottleneck detected">
                  <Warning sx={{ color: 'warning.main', fontSize: 18 }} />
                </Tooltip>
              )}
              {isOverWipLimit && (
                <Tooltip title={`WIP limit exceeded (${wipLimit})`}>
                  <Chip
                    label="WIP"
                    size="small"
                    color="error"
                    sx={{ height: 20, fontSize: 11 }}
                  />
                </Tooltip>
              )}
            </Box>
            <Box display="flex" alignItems="center">
              <IconButton size="small" onClick={toggleCollapse}>
                {isCollapsed ? <ExpandMore /> : <ExpandLess />}
              </IconButton>
              <IconButton size="small" onClick={handleMenuOpen}>
                <MoreVert fontSize="small" />
              </IconButton>
            </Box>
          </Box>

          {/* Stage Metrics */}
          <Collapse in={!isCollapsed}>
            <Box>
              <Box display="flex" alignItems="center" justifyContent="space-between" mb={0.5}>
                <Typography variant="caption" color="text.secondary">
                  Total Value
                </Typography>
                <Typography variant="body2" fontWeight="medium">
                  {formatCurrency(stageMetrics.totalValue)}
                </Typography>
              </Box>
              {stageMetrics.weightedValue > 0 && (
                <Box display="flex" alignItems="center" justifyContent="space-between" mb={0.5}>
                  <Typography variant="caption" color="text.secondary">
                    Weighted
                  </Typography>
                  <Typography variant="caption">
                    {formatCurrency(stageMetrics.weightedValue)}
                  </Typography>
                </Box>
              )}
              {stageMetrics.avgDaysInStage > 0 && (
                <Box display="flex" alignItems="center" justifyContent="space-between" mb={0.5}>
                  <Typography variant="caption" color="text.secondary">
                    Avg Days
                  </Typography>
                  <Typography variant="caption">
                    {stageMetrics.avgDaysInStage}
                  </Typography>
                </Box>
              )}
              {velocity && (
                <Box display="flex" alignItems="center" justifyContent="space-between" mb={0.5}>
                  <Typography variant="caption" color="text.secondary">
                    Velocity
                  </Typography>
                  <Box display="flex" alignItems="center" gap={0.5}>
                    <TrendingUp sx={{ fontSize: 14, color: velocity.velocity > 0 ? 'success.main' : 'error.main' }} />
                    <Typography variant="caption">
                      {velocity.velocity.toFixed(1)}
                    </Typography>
                  </Box>
                </Box>
              )}

              {/* Win Probability Progress */}
              {!stage.is_closed && (
                <Box mt={1}>
                  <Box display="flex" alignItems="center" justifyContent="space-between" mb={0.5}>
                    <Typography variant="caption" color="text.secondary">
                      Win Probability
                    </Typography>
                    <Typography variant="caption" fontWeight="medium">
                      {stage.win_probability}%
                    </Typography>
                  </Box>
                  <LinearProgress
                    variant="determinate"
                    value={getProgressPercentage()}
                    sx={{
                      height: 4,
                      borderRadius: 2,
                      backgroundColor: 'grey.300'
                    }}
                  />
                </Box>
              )}
            </Box>
          </Collapse>

          {/* Add Opportunity Button */}
          {!stage.is_closed && onAddOpportunity && (
            <Button
              fullWidth
              size="small"
              startIcon={<Add />}
              onClick={handleAddOpportunity}
              sx={{ mt: 1 }}
              variant="outlined"
            >
              Add Opportunity
            </Button>
          )}
        </Box>

        {/* Opportunities List */}
        <Droppable
          droppableId={`stage-${stage.stage_id}`}
          isDropDisabled={isDropDisabled || stage.is_closed}
        >
          {(provided, snapshot) => (
            <Box
              ref={provided.innerRef}
              {...provided.droppableProps}
              sx={{
                flex: 1,
                p: 1,
                overflowY: 'auto',
                bgcolor: snapshot.isDraggingOver ? 'action.hover' : 'background.paper',
                transition: 'background-color 0.2s ease',
                minHeight: 200
              }}
            >
              <Collapse in={!isCollapsed}>
                {opportunities.map((opportunity, index) => (
                  <OpportunityCard
                    key={opportunity.id}
                    opportunity={opportunity}
                    index={index}
                    cardSize={cardSize}
                    onEdit={onEditOpportunity}
                    onChangeOwner={onChangeOwner}
                    onAddNote={onAddNote}
                  />
                ))}
                {provided.placeholder}

                {opportunities.length === 0 && (
                  <Box
                    sx={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      height: 100,
                      color: 'text.secondary',
                      fontSize: 14
                    }}
                  >
                    {snapshot.isDraggingOver ? 'Drop here' : 'No opportunities'}
                  </Box>
                )}
              </Collapse>

              {isCollapsed && (
                <Box textAlign="center" py={2}>
                  <Typography variant="body2" color="text.secondary">
                    {stageMetrics.count} opportunities
                  </Typography>
                </Box>
              )}
            </Box>
          )}
        </Droppable>

        {/* Footer with stage expected duration */}
        {stage.expected_duration_days > 0 && (
          <Box
            sx={{
              p: 1,
              borderTop: 1,
              borderColor: 'divider',
              bgcolor: 'grey.50',
              textAlign: 'center'
            }}
          >
            <Typography variant="caption" color="text.secondary">
              Expected: {stage.expected_duration_days} days
            </Typography>
          </Box>
        )}

        {/* Stage Menu */}
        <Menu
          anchorEl={anchorEl}
          open={Boolean(anchorEl)}
          onClose={handleMenuClose}
          anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
          transformOrigin={{ vertical: 'top', horizontal: 'right' }}
        >
          <MenuItem onClick={handleEditStage}>
            Edit Stage Settings
          </MenuItem>
          {!stage.is_closed && onAddOpportunity && (
            <MenuItem onClick={handleAddOpportunity}>
              <Add fontSize="small" sx={{ mr: 1 }} />
              Add Opportunity
            </MenuItem>
          )}
          <Divider />
          <MenuItem disabled>
            Move All To...
          </MenuItem>
          {/* Add other stages as move targets here */}
          <Divider />
          <MenuItem>
            <Group fontSize="small" sx={{ mr: 1 }} />
            View Stage Report
          </MenuItem>
        </Menu>
      </Paper>
    </Box>
  );
});

StageColumn.displayName = 'StageColumn';

export default StageColumn;