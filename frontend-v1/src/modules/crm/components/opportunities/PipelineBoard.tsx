/**
 * Pipeline Board Component - Sprint 15
 * Kanban board with drag & drop for opportunity pipeline management
 */

import React from 'react';
import {
  Box,
  Paper,
  Typography,
  Card,
  CardContent,
  Chip,
  Avatar,
  LinearProgress,
  IconButton,
  Menu,
  MenuItem
} from '@mui/material';
import { MoreVert as MoreIcon } from '@mui/icons-material';
import { DragDropContext, Droppable, Draggable, DropResult } from 'react-beautiful-dnd';
import { formatCurrency, formatPercentage } from '../../utils/formatters';
import type { Opportunity, OpportunityStage } from '../../types';

interface PipelineBoardProps {
  stages: OpportunityStage[];
  opportunities: Opportunity[];
  onDragEnd: (result: DropResult) => void;
  onOpportunityClick?: (opportunity: Opportunity) => void;
  onStageAction?: (stage: OpportunityStage, action: string) => void;
  isCompact?: boolean;
}

export const PipelineBoard: React.FC<PipelineBoardProps> = ({
  stages,
  opportunities,
  onDragEnd,
  onOpportunityClick,
  onStageAction,
  isCompact = false
}) => {
  const [anchorEl, setAnchorEl] = React.useState<null | HTMLElement>(null);
  const [selectedStage, setSelectedStage] = React.useState<OpportunityStage | null>(null);

  const handleStageMenuOpen = (event: React.MouseEvent<HTMLElement>, stage: OpportunityStage) => {
    setAnchorEl(event.currentTarget);
    setSelectedStage(stage);
  };

  const handleStageMenuClose = () => {
    setAnchorEl(null);
    setSelectedStage(null);
  };

  const handleStageAction = (action: string) => {
    if (selectedStage && onStageAction) {
      onStageAction(selectedStage, action);
    }
    handleStageMenuClose();
  };

  const getStageColor = (probability: number) => {
    if (probability >= 80) return '#4caf50';
    if (probability >= 60) return '#2196f3';
    if (probability >= 40) return '#ff9800';
    if (probability >= 20) return '#f44336';
    return '#9e9e9e';
  };

  return (
    <DragDropContext onDragEnd={onDragEnd}>
      <Box
        sx={{
          display: 'flex',
          gap: 2,
          overflowX: 'auto',
          p: 2,
          minHeight: isCompact ? 400 : 600
        }}
      >
        {stages.map((stage) => {
          const stageOpportunities = opportunities.filter(opp => opp.stage_id === stage.id);
          const totalAmount = stageOpportunities.reduce((sum, opp) => sum + opp.amount, 0);

          return (
            <Paper
              key={stage.id}
              sx={{
                minWidth: isCompact ? 250 : 300,
                maxWidth: isCompact ? 250 : 300,
                backgroundColor: '#f5f5f5',
                display: 'flex',
                flexDirection: 'column'
              }}
            >
              {/* Stage Header */}
              <Box
                sx={{
                  p: 2,
                  borderBottom: 2,
                  borderColor: getStageColor(stage.probability),
                  backgroundColor: 'white'
                }}
              >
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Typography variant="h6" fontWeight="bold">
                    {stage.name}
                  </Typography>
                  <IconButton
                    size="small"
                    onClick={(e) => handleStageMenuOpen(e, stage)}
                  >
                    <MoreIcon />
                  </IconButton>
                </Box>

                <Box sx={{ mt: 1 }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                    <Typography variant="body2" color="textSecondary">
                      {stageOpportunities.length} oportunidad{stageOpportunities.length !== 1 ? 'es' : ''}
                    </Typography>
                    <Typography variant="body2" fontWeight="bold">
                      {formatCurrency(totalAmount)}
                    </Typography>
                  </Box>
                  <LinearProgress
                    variant="determinate"
                    value={stage.probability}
                    sx={{
                      mt: 1,
                      height: 6,
                      borderRadius: 3,
                      backgroundColor: 'grey.300',
                      '& .MuiLinearProgress-bar': {
                        backgroundColor: getStageColor(stage.probability)
                      }
                    }}
                  />
                  <Typography variant="caption" color="textSecondary">
                    {formatPercentage(stage.probability)} probabilidad
                  </Typography>
                </Box>
              </Box>

              {/* Opportunities List */}
              <Droppable droppableId={stage.id.toString()}>
                {(provided, snapshot) => (
                  <Box
                    ref={provided.innerRef}
                    {...provided.droppableProps}
                    sx={{
                      flex: 1,
                      p: 1,
                      minHeight: 200,
                      backgroundColor: snapshot.isDraggingOver ? 'action.hover' : 'transparent',
                      transition: 'background-color 0.2s'
                    }}
                  >
                    {stageOpportunities.map((opportunity, index) => (
                      <Draggable
                        key={opportunity.id}
                        draggableId={opportunity.id.toString()}
                        index={index}
                      >
                        {(provided, snapshot) => (
                          <Card
                            ref={provided.innerRef}
                            {...provided.draggableProps}
                            {...provided.dragHandleProps}
                            onClick={() => onOpportunityClick?.(opportunity)}
                            sx={{
                              mb: 1,
                              cursor: 'pointer',
                              opacity: snapshot.isDragging ? 0.5 : 1,
                              transform: snapshot.isDragging ? 'rotate(2deg)' : 'none',
                              transition: 'all 0.2s',
                              '&:hover': {
                                boxShadow: 2,
                                transform: 'translateY(-2px)'
                              }
                            }}
                          >
                            <CardContent sx={{ p: isCompact ? 1.5 : 2, '&:last-child': { pb: isCompact ? 1.5 : 2 } }}>
                              <Typography
                                variant={isCompact ? 'body2' : 'subtitle2'}
                                fontWeight="bold"
                                gutterBottom
                                sx={{
                                  overflow: 'hidden',
                                  textOverflow: 'ellipsis',
                                  whiteSpace: 'nowrap'
                                }}
                              >
                                {opportunity.name}
                              </Typography>

                              <Typography
                                variant="caption"
                                color="textSecondary"
                                sx={{
                                  display: 'block',
                                  overflow: 'hidden',
                                  textOverflow: 'ellipsis',
                                  whiteSpace: 'nowrap',
                                  mb: 1
                                }}
                              >
                                {opportunity.account_name}
                              </Typography>

                              <Typography
                                variant={isCompact ? 'body2' : 'h6'}
                                color="primary"
                                fontWeight="bold"
                              >
                                {formatCurrency(opportunity.amount)}
                              </Typography>

                              {!isCompact && (
                                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mt: 2 }}>
                                  <Chip
                                    label={`${opportunity.probability || stage.probability}%`}
                                    size="small"
                                    color="primary"
                                    variant="outlined"
                                  />
                                  {opportunity.owner && (
                                    <Avatar
                                      sx={{ width: 24, height: 24 }}
                                      src={opportunity.owner.avatar}
                                    >
                                      {opportunity.owner.name?.[0]}
                                    </Avatar>
                                  )}
                                </Box>
                              )}

                              {opportunity.close_date && (
                                <Typography variant="caption" color="textSecondary" sx={{ display: 'block', mt: 1 }}>
                                  Cierre: {new Date(opportunity.close_date).toLocaleDateString('es-AR')}
                                </Typography>
                              )}
                            </CardContent>
                          </Card>
                        )}
                      </Draggable>
                    ))}
                    {provided.placeholder}
                  </Box>
                )}
              </Droppable>
            </Paper>
          );
        })}
      </Box>

      {/* Stage Action Menu */}
      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleStageMenuClose}
      >
        <MenuItem onClick={() => handleStageAction('add_opportunity')}>
          Agregar Oportunidad
        </MenuItem>
        <MenuItem onClick={() => handleStageAction('view_details')}>
          Ver Detalles
        </MenuItem>
        <MenuItem onClick={() => handleStageAction('export')}>
          Exportar Oportunidades
        </MenuItem>
      </Menu>
    </DragDropContext>
  );
};