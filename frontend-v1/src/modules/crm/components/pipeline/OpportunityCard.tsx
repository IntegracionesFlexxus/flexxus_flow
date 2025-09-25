/**
 * Opportunity Card Component
 * Displays opportunity information in pipeline kanban view
 */

import React, { memo, useMemo } from 'react';
import {
  Card,
  CardContent,
  Typography,
  Chip,
  Box,
  LinearProgress,
  IconButton,
  Tooltip,
  Avatar,
  Stack,
  Menu,
  MenuItem,
  Divider
} from '@mui/material';
import {
  AttachMoney,
  CalendarToday,
  Person,
  Business,
  MoreVert,
  Edit,
  PersonAdd,
  Note,
  TrendingUp,
  Warning,
  CheckCircle,
  Error
} from '@mui/icons-material';
import { Draggable } from 'react-beautiful-dnd';
import { OpportunityExtended, Priority } from '../../types/pipeline.types';
import { formatCurrency, formatDate, getDaysUntil } from '../../utils/formatters';

interface OpportunityCardProps {
  opportunity: OpportunityExtended;
  index: number;
  cardSize: 'compact' | 'normal' | 'expanded';
  isDragging?: boolean;
  onEdit?: (opportunity: OpportunityExtended) => void;
  onChangeOwner?: (opportunity: OpportunityExtended) => void;
  onAddNote?: (opportunity: OpportunityExtended) => void;
}

const priorityColors: Record<Priority, string> = {
  critical: '#d32f2f',
  high: '#f57c00',
  medium: '#fbc02d',
  low: '#388e3c'
};

const getHealthIcon = (score?: number) => {
  if (!score) return null;
  if (score >= 70) return <CheckCircle fontSize="small" sx={{ color: 'success.main' }} />;
  if (score >= 40) return <Warning fontSize="small" sx={{ color: 'warning.main' }} />;
  return <Error fontSize="small" sx={{ color: 'error.main' }} />;
};

const getHealthColor = (score?: number) => {
  if (!score) return 'grey.500';
  if (score >= 70) return 'success.main';
  if (score >= 40) return 'warning.main';
  return 'error.main';
};

export const OpportunityCard: React.FC<OpportunityCardProps> = memo(({
  opportunity,
  index,
  cardSize,
  isDragging = false,
  onEdit,
  onChangeOwner,
  onAddNote
}) => {
  const [anchorEl, setAnchorEl] = React.useState<null | HTMLElement>(null);

  const handleMenuOpen = (event: React.MouseEvent<HTMLElement>) => {
    event.stopPropagation();
    setAnchorEl(event.currentTarget);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
  };

  const handleEdit = () => {
    handleMenuClose();
    onEdit?.(opportunity);
  };

  const handleChangeOwner = () => {
    handleMenuClose();
    onChangeOwner?.(opportunity);
  };

  const handleAddNote = () => {
    handleMenuClose();
    onAddNote?.(opportunity);
  };

  const daysUntilClose = useMemo(() => {
    if (!opportunity.expected_close_date) return null;
    return getDaysUntil(opportunity.expected_close_date);
  }, [opportunity.expected_close_date]);

  const engagementProgress = opportunity.engagement_score || 0;

  return (
    <Draggable draggableId={opportunity.id} index={index}>
      {(provided, snapshot) => (
        <Card
          ref={provided.innerRef}
          {...provided.draggableProps}
          {...provided.dragHandleProps}
          sx={{
            mb: 1,
            cursor: 'grab',
            opacity: snapshot.isDragging ? 0.8 : 1,
            transform: snapshot.isDragging ? 'rotate(2deg)' : 'none',
            transition: 'all 0.2s ease',
            boxShadow: snapshot.isDragging ? 6 : 1,
            '&:hover': {
              boxShadow: 3
            },
            borderLeft: '4px solid',
            borderLeftColor: priorityColors[opportunity.priority]
          }}
        >
          <CardContent sx={{ p: cardSize === 'compact' ? 1.5 : 2 }}>
            {/* Header */}
            <Box display="flex" alignItems="flex-start" justifyContent="space-between" mb={1}>
              <Box flex={1}>
                <Typography
                  variant={cardSize === 'compact' ? 'body2' : 'subtitle1'}
                  fontWeight="medium"
                  noWrap
                  sx={{ pr: 1 }}
                >
                  {opportunity.name}
                </Typography>
                {cardSize !== 'compact' && opportunity.account && (
                  <Box display="flex" alignItems="center" gap={0.5} mt={0.5}>
                    <Business fontSize="small" sx={{ color: 'text.secondary', fontSize: 16 }} />
                    <Typography variant="caption" color="text.secondary" noWrap>
                      {opportunity.account.name}
                    </Typography>
                  </Box>
                )}
              </Box>
              <Box display="flex" alignItems="center" gap={0.5}>
                {getHealthIcon(opportunity.health_score)}
                <IconButton size="small" onClick={handleMenuOpen}>
                  <MoreVert fontSize="small" />
                </IconButton>
              </Box>
            </Box>

            {/* Amount and Probability */}
            <Box mb={1}>
              <Box display="flex" alignItems="center" justifyContent="space-between">
                <Typography variant={cardSize === 'compact' ? 'body2' : 'h6'} fontWeight="bold">
                  {formatCurrency(opportunity.amount)}
                </Typography>
                <Chip
                  label={`${opportunity.probability}%`}
                  size="small"
                  color={opportunity.probability >= 70 ? 'success' : 'default'}
                  variant="outlined"
                />
              </Box>
              {cardSize !== 'compact' && opportunity.weighted_amount > 0 && (
                <Typography variant="caption" color="text.secondary">
                  Weighted: {formatCurrency(opportunity.weighted_amount)}
                </Typography>
              )}
            </Box>

            {/* Dates and Days in Stage */}
            {cardSize !== 'compact' && (
              <Stack spacing={0.5} mb={1}>
                {opportunity.expected_close_date && (
                  <Box display="flex" alignItems="center" gap={0.5}>
                    <CalendarToday sx={{ fontSize: 14, color: 'text.secondary' }} />
                    <Typography variant="caption" color="text.secondary">
                      Closes in {daysUntilClose} days
                    </Typography>
                  </Box>
                )}
                {opportunity.days_in_stage !== undefined && opportunity.days_in_stage > 0 && (
                  <Typography variant="caption" color="text.secondary">
                    {opportunity.days_in_stage} days in stage
                  </Typography>
                )}
              </Stack>
            )}

            {/* Priority Badge */}
            <Box display="flex" gap={0.5} mb={1}>
              <Chip
                label={opportunity.priority}
                size="small"
                sx={{
                  backgroundColor: priorityColors[opportunity.priority],
                  color: 'white',
                  fontSize: 11,
                  height: 20
                }}
              />
              {opportunity.deal_type && cardSize === 'expanded' && (
                <Chip
                  label={opportunity.deal_type}
                  size="small"
                  variant="outlined"
                  sx={{ fontSize: 11, height: 20 }}
                />
              )}
            </Box>

            {/* Engagement Score */}
            {cardSize !== 'compact' && engagementProgress > 0 && (
              <Box mb={1}>
                <Box display="flex" alignItems="center" justifyContent="space-between" mb={0.5}>
                  <Typography variant="caption" color="text.secondary">
                    Engagement
                  </Typography>
                  <Typography variant="caption" fontWeight="medium">
                    {engagementProgress}%
                  </Typography>
                </Box>
                <LinearProgress
                  variant="determinate"
                  value={engagementProgress}
                  sx={{
                    height: 4,
                    borderRadius: 2,
                    backgroundColor: 'grey.300',
                    '& .MuiLinearProgress-bar': {
                      backgroundColor: getHealthColor(opportunity.health_score)
                    }
                  }}
                />
              </Box>
            )}

            {/* Stakeholders (Expanded view only) */}
            {cardSize === 'expanded' && opportunity.stakeholders && opportunity.stakeholders.length > 0 && (
              <Box>
                <Typography variant="caption" color="text.secondary" gutterBottom>
                  Stakeholders ({opportunity.stakeholders.length})
                </Typography>
                <Stack direction="row" spacing={0.5} sx={{ mt: 0.5 }}>
                  {opportunity.stakeholders.slice(0, 3).map((stakeholder, idx) => (
                    <Tooltip key={idx} title={stakeholder.contact?.name || 'Unknown'}>
                      <Avatar sx={{ width: 24, height: 24, fontSize: 11 }}>
                        {(stakeholder.contact?.name || 'U')[0]}
                      </Avatar>
                    </Tooltip>
                  ))}
                  {opportunity.stakeholders.length > 3 && (
                    <Avatar sx={{ width: 24, height: 24, fontSize: 11, bgcolor: 'grey.400' }}>
                      +{opportunity.stakeholders.length - 3}
                    </Avatar>
                  )}
                </Stack>
              </Box>
            )}

            {/* Action Menu */}
            <Menu
              anchorEl={anchorEl}
              open={Boolean(anchorEl)}
              onClose={handleMenuClose}
              anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
              transformOrigin={{ vertical: 'top', horizontal: 'right' }}
            >
              <MenuItem onClick={handleEdit}>
                <Edit fontSize="small" sx={{ mr: 1 }} />
                Edit Details
              </MenuItem>
              <MenuItem onClick={handleChangeOwner}>
                <PersonAdd fontSize="small" sx={{ mr: 1 }} />
                Change Owner
              </MenuItem>
              <MenuItem onClick={handleAddNote}>
                <Note fontSize="small" sx={{ mr: 1 }} />
                Add Note
              </MenuItem>
              <Divider />
              <MenuItem>
                <TrendingUp fontSize="small" sx={{ mr: 1 }} />
                View History
              </MenuItem>
            </Menu>
          </CardContent>
        </Card>
      )}
    </Draggable>
  );
});

OpportunityCard.displayName = 'OpportunityCard';

export default OpportunityCard;