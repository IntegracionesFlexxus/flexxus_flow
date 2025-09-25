/**
 * Pipeline Kanban Board Component
 * Main component for drag-and-drop pipeline management
 */

import React, { useEffect, useState, useMemo, useCallback } from 'react';
import {
  Box,
  Paper,
  Typography,
  Button,
  IconButton,
  ToggleButtonGroup,
  ToggleButton,
  TextField,
  InputAdornment,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Chip,
  Stack,
  CircularProgress,
  Alert,
  Toolbar,
  Tooltip,
  Badge,
  Drawer,
  useTheme,
  useMediaQuery
} from '@mui/material';
import {
  ViewKanban,
  ViewList,
  CalendarMonth,
  Search,
  FilterList,
  Refresh,
  Settings,
  Download,
  Add,
  ViewCompact,
  ViewComfy,
  ViewModule,
  Close
} from '@mui/icons-material';
import { DragDropContext } from 'react-beautiful-dnd';
import usePipelineStore from '../../stores/usePipelineStore';
import usePipelineDragDrop from '../../hooks/usePipelineDragDrop';
import usePipelineMetrics from '../../hooks/usePipelineMetrics';
import useWebSocketUpdates from '../../hooks/useWebSocketUpdates';
import StageColumn from './StageColumn';
import PipelineFiltersPanel from './PipelineFiltersPanel';
import { OpportunityExtended, Priority } from '../../types/pipeline.types';
import { formatCurrency } from '../../utils/formatters';

interface PipelineKanbanBoardProps {
  pipelineId?: number;
  onCreateOpportunity?: (stageId?: number) => void;
  onEditOpportunity?: (opportunity: OpportunityExtended) => void;
  onSettings?: () => void;
}

export const PipelineKanbanBoard: React.FC<PipelineKanbanBoardProps> = ({
  pipelineId,
  onCreateOpportunity,
  onEditOpportunity,
  onSettings
}) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const isTablet = useMediaQuery(theme.breakpoints.down('lg'));

  const {
    pipelines,
    currentPipeline,
    stages,
    opportunities,
    filters,
    isLoading,
    error,
    viewMode,
    cardSize,
    loadPipelines,
    selectPipeline,
    loadOpportunities,
    updateFilters,
    clearFilters,
    setViewMode,
    setCardSize,
    getFilteredOpportunities,
    getOpportunitiesByStage
  } = usePipelineStore();

  const {
    metrics,
    derivedMetrics,
    pipelineHealthScore,
    forceRefresh,
    isLoading: metricsLoading
  } = usePipelineMetrics({ pipelineId });

  const {
    onDragEnd,
    isProcessing
  } = usePipelineDragDrop();

  const {
    isConnected,
    isReconnecting,
    connectionError
  } = useWebSocketUpdates();

  const [filtersOpen, setFiltersOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  // Initialize pipeline
  useEffect(() => {
    if (pipelineId && (!currentPipeline || currentPipeline.pipeline_id !== pipelineId)) {
      selectPipeline(pipelineId);
    } else if (!currentPipeline && !pipelineId) {
      loadPipelines();
    }
  }, [pipelineId, currentPipeline, selectPipeline, loadPipelines]);

  // Handle search
  const handleSearch = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const term = event.target.value;
    setSearchTerm(term);
    updateFilters({ search: term });
  }, [updateFilters]);

  // Handle pipeline change
  const handlePipelineChange = useCallback((event: any) => {
    const id = event.target.value as number;
    selectPipeline(id);
  }, [selectPipeline]);

  // Handle view mode change
  const handleViewModeChange = useCallback((event: React.MouseEvent<HTMLElement>, newMode: string | null) => {
    if (newMode) {
      setViewMode(newMode as 'kanban' | 'list' | 'calendar');
    }
  }, [setViewMode]);

  // Handle card size change
  const handleCardSizeChange = useCallback((event: React.MouseEvent<HTMLElement>, newSize: string | null) => {
    if (newSize) {
      setCardSize(newSize as 'compact' | 'normal' | 'expanded');
    }
  }, [setCardSize]);

  // Calculate summary metrics
  const summaryMetrics = useMemo(() => {
    const filtered = getFilteredOpportunities();
    const openOpps = filtered.filter(o => o.status === 'open');

    return {
      totalOpportunities: filtered.length,
      totalValue: filtered.reduce((sum, o) => sum + o.amount, 0),
      weightedValue: openOpps.reduce((sum, o) => sum + o.weighted_amount, 0),
      avgDealSize: filtered.length > 0 ? filtered.reduce((sum, o) => sum + o.amount, 0) / filtered.length : 0
    };
  }, [getFilteredOpportunities]);

  // Handle export
  const handleExport = useCallback(async () => {
    if (!currentPipeline) return;

    try {
      const blob = await import('../../services/pipelineService').then(module =>
        module.default.exportPipelineData(currentPipeline.pipeline_id, 'excel', filters)
      );
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `pipeline_${currentPipeline.name}_${new Date().toISOString().split('T')[0]}.xlsx`;
      a.click();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Export failed:', error);
    }
  }, [currentPipeline, filters]);

  // Handle stage actions
  const handleAddOpportunity = useCallback((stageId: number) => {
    onCreateOpportunity?.(stageId);
  }, [onCreateOpportunity]);

  const handleEditOpportunity = useCallback((opportunity: OpportunityExtended) => {
    onEditOpportunity?.(opportunity);
  }, [onEditOpportunity]);

  if (isLoading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" height={400}>
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Box p={3}>
        <Alert severity="error">{error}</Alert>
      </Box>
    );
  }

  if (!currentPipeline) {
    return (
      <Box p={3}>
        <Alert severity="info">No pipeline selected. Please select or create a pipeline.</Alert>
      </Box>
    );
  }

  return (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      {/* Header Toolbar */}
      <Paper elevation={0} sx={{ borderRadius: 0 }}>
        <Toolbar>
          <Stack direction="row" spacing={2} alignItems="center" sx={{ flexGrow: 1 }}>
            {/* Pipeline Selector */}
            <FormControl size="small" sx={{ minWidth: 200 }}>
              <Select
                value={currentPipeline.pipeline_id}
                onChange={handlePipelineChange}
                displayEmpty
              >
                {pipelines.map(pipeline => (
                  <MenuItem key={pipeline.pipeline_id} value={pipeline.pipeline_id}>
                    {pipeline.name}
                    {pipeline.is_default && <Chip label="Default" size="small" sx={{ ml: 1 }} />}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            {/* Search */}
            <TextField
              size="small"
              placeholder="Search opportunities..."
              value={searchTerm}
              onChange={handleSearch}
              sx={{ minWidth: 200 }}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <Search fontSize="small" />
                  </InputAdornment>
                )
              }}
            />

            {/* View Mode Toggle */}
            {!isMobile && (
              <ToggleButtonGroup
                value={viewMode}
                exclusive
                onChange={handleViewModeChange}
                size="small"
              >
                <ToggleButton value="kanban" aria-label="kanban view">
                  <Tooltip title="Kanban View">
                    <ViewKanban fontSize="small" />
                  </Tooltip>
                </ToggleButton>
                <ToggleButton value="list" aria-label="list view" disabled>
                  <Tooltip title="List View">
                    <ViewList fontSize="small" />
                  </Tooltip>
                </ToggleButton>
                <ToggleButton value="calendar" aria-label="calendar view" disabled>
                  <Tooltip title="Calendar View">
                    <CalendarMonth fontSize="small" />
                  </Tooltip>
                </ToggleButton>
              </ToggleButtonGroup>
            )}

            {/* Card Size Toggle */}
            {!isMobile && viewMode === 'kanban' && (
              <ToggleButtonGroup
                value={cardSize}
                exclusive
                onChange={handleCardSizeChange}
                size="small"
              >
                <ToggleButton value="compact" aria-label="compact cards">
                  <Tooltip title="Compact">
                    <ViewCompact fontSize="small" />
                  </Tooltip>
                </ToggleButton>
                <ToggleButton value="normal" aria-label="normal cards">
                  <Tooltip title="Normal">
                    <ViewComfy fontSize="small" />
                  </Tooltip>
                </ToggleButton>
                <ToggleButton value="expanded" aria-label="expanded cards">
                  <Tooltip title="Expanded">
                    <ViewModule fontSize="small" />
                  </Tooltip>
                </ToggleButton>
              </ToggleButtonGroup>
            )}
          </Stack>

          {/* Action Buttons */}
          <Stack direction="row" spacing={1}>
            <IconButton onClick={() => setFiltersOpen(true)}>
              <Badge
                badgeContent={Object.keys(filters).filter(k => k !== 'search').length}
                color="primary"
              >
                <FilterList />
              </Badge>
            </IconButton>
            <IconButton onClick={forceRefresh} disabled={metricsLoading}>
              <Refresh />
            </IconButton>
            {!isMobile && (
              <>
                <IconButton onClick={handleExport}>
                  <Download />
                </IconButton>
                {onSettings && (
                  <IconButton onClick={onSettings}>
                    <Settings />
                  </IconButton>
                )}
              </>
            )}
            {onCreateOpportunity && (
              <Button
                variant="contained"
                startIcon={<Add />}
                onClick={() => onCreateOpportunity()}
              >
                New Opportunity
              </Button>
            )}
          </Stack>
        </Toolbar>

        {/* Metrics Bar */}
        <Box
          sx={{
            px: 3,
            py: 1.5,
            borderTop: 1,
            borderColor: 'divider',
            bgcolor: 'grey.50'
          }}
        >
          <Stack direction="row" spacing={4} alignItems="center">
            <Box>
              <Typography variant="caption" color="text.secondary">
                Opportunities
              </Typography>
              <Typography variant="h6">
                {summaryMetrics.totalOpportunities}
              </Typography>
            </Box>
            <Box>
              <Typography variant="caption" color="text.secondary">
                Total Value
              </Typography>
              <Typography variant="h6">
                {formatCurrency(summaryMetrics.totalValue)}
              </Typography>
            </Box>
            <Box>
              <Typography variant="caption" color="text.secondary">
                Weighted Value
              </Typography>
              <Typography variant="h6">
                {formatCurrency(summaryMetrics.weightedValue)}
              </Typography>
            </Box>
            <Box>
              <Typography variant="caption" color="text.secondary">
                Avg Deal Size
              </Typography>
              <Typography variant="h6">
                {formatCurrency(summaryMetrics.avgDealSize)}
              </Typography>
            </Box>
            {pipelineHealthScore !== null && (
              <Box>
                <Typography variant="caption" color="text.secondary">
                  Health Score
                </Typography>
                <Typography
                  variant="h6"
                  color={pipelineHealthScore >= 70 ? 'success.main' : pipelineHealthScore >= 40 ? 'warning.main' : 'error.main'}
                >
                  {pipelineHealthScore}%
                </Typography>
              </Box>
            )}
            <Box sx={{ flexGrow: 1 }} />
            {/* WebSocket Status */}
            <Chip
              size="small"
              label={isConnected ? 'Connected' : isReconnecting ? 'Reconnecting...' : 'Disconnected'}
              color={isConnected ? 'success' : isReconnecting ? 'warning' : 'error'}
              variant="outlined"
            />
          </Stack>
        </Box>
      </Paper>

      {/* Kanban Board */}
      {viewMode === 'kanban' && (
        <Box sx={{ flex: 1, overflowX: 'auto', overflowY: 'hidden', p: 2 }}>
          <DragDropContext onDragEnd={onDragEnd}>
            <Box
              sx={{
                display: 'flex',
                gap: 2,
                height: '100%',
                minWidth: 'fit-content'
              }}
            >
              {stages.map(stage => (
                <StageColumn
                  key={stage.stage_id}
                  stage={stage}
                  opportunities={getOpportunitiesByStage(stage.stage_id)}
                  cardSize={cardSize}
                  isDropDisabled={isProcessing}
                  onAddOpportunity={onCreateOpportunity ? handleAddOpportunity : undefined}
                  onEditOpportunity={handleEditOpportunity}
                />
              ))}
            </Box>
          </DragDropContext>
        </Box>
      )}

      {/* Filters Drawer */}
      <Drawer
        anchor="right"
        open={filtersOpen}
        onClose={() => setFiltersOpen(false)}
        PaperProps={{ sx: { width: isMobile ? '100%' : 400 } }}
      >
        <Box sx={{ p: 2 }}>
          <Stack direction="row" alignItems="center" justifyContent="space-between" mb={2}>
            <Typography variant="h6">Filters</Typography>
            <IconButton onClick={() => setFiltersOpen(false)}>
              <Close />
            </IconButton>
          </Stack>
          <PipelineFiltersPanel
            onClose={() => setFiltersOpen(false)}
          />
        </Box>
      </Drawer>
    </Box>
  );
};

export default PipelineKanbanBoard;