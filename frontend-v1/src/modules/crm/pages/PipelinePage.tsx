/**
 * Pipeline Page - Sprint 15
 * Main page for pipeline management with drag & drop
 */

import React, { useState } from 'react';
import {
  Box,
  Typography,
  Button,
  Paper,
  ToggleButton,
  ToggleButtonGroup,
  Stack,
  Chip,
  Grid,
  Card,
  CardContent,
  CircularProgress
} from '@mui/material';
import {
  ViewKanban as KanbanIcon,
  ViewList as ListIcon,
  Add as AddIcon,
  FilterList as FilterIcon,
  TrendingUp as TrendingIcon
} from '@mui/icons-material';
import { PipelineBoard } from '../components/opportunities/PipelineBoard';
import { usePipeline } from '../hooks/usePipeline';
import { useCRMStore, usePipelineStore } from '../stores';
import { formatCurrency, formatPercentage } from '../utils/formatters';

const PipelinePage: React.FC = () => {
  console.log('🚀 [PipelinePage] INICIO DE RENDER - Component rendering');
  const [viewMode, setViewMode] = useState<'kanban' | 'list'>('kanban');
  const [isFormOpen, setIsFormOpen] = useState(false);

  // Debug logger
  const DEBUG = true; // Forzamos debug para diagnóstico
  const logPageEvent = (event: string, data?: any) => {
    if (DEBUG) {
      console.log(`📄 [PipelinePage] ${event}`, data || '');
    }
  };

  // Log component lifecycle
  React.useEffect(() => {
    console.log('🎯 [PipelinePage] useEffect - Component mounted');
    logPageEvent('Component mounted');
    return () => {
      console.log('🔚 [PipelinePage] useEffect - Component unmounted');
      logPageEvent('Component unmounted');
    };
  }, []);

  console.log('🔍 [PipelinePage] ANTES de llamar usePipeline');

  const {
    stages,
    opportunities,
    metrics,
    forecast,
    loading,
    error, // Add error from hook
    handleDragEnd,
    createOpportunity,
    markAsWon,
    markAsLost
  } = usePipeline();

  console.log('✅ [PipelinePage] DESPUÉS de llamar usePipeline', {
    loading,
    error,
    stagesLength: stages?.length,
    opportunitiesLength: opportunities?.length
  });

  // Log data state changes
  React.useEffect(() => {
    logPageEvent('Data state changed', {
      loading,
      hasStages: stages?.length > 0,
      stagesCount: stages?.length,
      hasOpportunities: opportunities?.length > 0,
      opportunitiesCount: opportunities?.length,
      hasMetrics: !!metrics,
      error: error?.message
    });
  }, [loading, stages, opportunities, metrics, error]);

  const { setSelectedOpportunity } = useCRMStore();
  const { isCompactView, toggleCompactView, getTotalPipelineValue, getWeightedPipelineValue } = usePipelineStore();

  const handleOpportunityClick = (opportunity: any) => {
    setSelectedOpportunity(opportunity);
  };

  const handleStageAction = (stage: any, action: string) => {
    switch (action) {
      case 'add_opportunity':
        setIsFormOpen(true);
        break;
      case 'view_details':
        // Navigate to stage details
        break;
      case 'export':
        // Export opportunities
        break;
    }
  };

  // Handle error state
  if (error) {
    logPageEvent('Rendering error state', {
      message: error?.message,
      status: error?.response?.status,
      data: error?.response?.data
    });

    return (
      <Box sx={{ p: 3, textAlign: 'center' }}>
        <Typography color="error" variant="h5" gutterBottom>
          Error al cargar el pipeline
        </Typography>
        <Typography variant="body1" sx={{ mt: 1, mb: 3 }} color="text.secondary">
          {error?.response?.data?.message || error?.message || 'Error desconocido'}
        </Typography>
        {error?.response?.status && (
          <Typography variant="body2" sx={{ mb: 2 }} color="text.secondary">
            Código de error: {error.response.status}
          </Typography>
        )}
        <Stack direction="row" spacing={2} justifyContent="center">
          <Button
            variant="contained"
            onClick={() => window.location.reload()}
            startIcon={<TrendingIcon />}
          >
            Recargar página
          </Button>
          <Button
            variant="outlined"
            onClick={() => {
              logPageEvent('Debug info requested');
              console.group('🔍 Debug Information');
              console.log('Error object:', error);
              console.log('Error response:', error?.response);
              console.log('Error config:', error?.config);
              console.groupEnd();
              alert('Revisa la consola para más información de debug');
            }}
          >
            Ver información de debug
          </Button>
        </Stack>
      </Box>
    );
  }

  if (loading) {
    logPageEvent('Rendering loading state');
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <CircularProgress />
      </Box>
    );
  }

  const totalValue = getTotalPipelineValue();
  const weightedValue = getWeightedPipelineValue();

  logPageEvent('Rendering pipeline view', {
    viewMode,
    stagesCount: stages?.length,
    opportunitiesCount: opportunities?.length,
    totalValue,
    weightedValue
  });

  return (
    <Box sx={{ p: 3 }}>
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Box>
          <Typography variant="h4" fontWeight="bold" gutterBottom>
            Pipeline de Ventas
          </Typography>
          <Typography variant="body1" color="textSecondary">
            Gestiona tus oportunidades a través del proceso de ventas
          </Typography>
        </Box>
        <Stack direction="row" spacing={2}>
          <ToggleButtonGroup
            value={viewMode}
            exclusive
            onChange={(_, value) => value && setViewMode(value)}
            size="small"
          >
            <ToggleButton value="kanban">
              <KanbanIcon />
            </ToggleButton>
            <ToggleButton value="list">
              <ListIcon />
            </ToggleButton>
          </ToggleButtonGroup>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => setIsFormOpen(true)}
          >
            Nueva Oportunidad
          </Button>
        </Stack>
      </Box>

      {/* Metrics Cards */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Box>
                  <Typography color="textSecondary" gutterBottom variant="body2">
                    Valor Total
                  </Typography>
                  <Typography variant="h5" fontWeight="bold">
                    {formatCurrency(totalValue)}
                  </Typography>
                  <Typography variant="caption" color="textSecondary">
                    {opportunities.length} oportunidades
                  </Typography>
                </Box>
                <TrendingIcon sx={{ fontSize: 40, color: 'primary.main', opacity: 0.3 }} />
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Box>
                  <Typography color="textSecondary" gutterBottom variant="body2">
                    Valor Ponderado
                  </Typography>
                  <Typography variant="h5" fontWeight="bold" color="success.main">
                    {formatCurrency(weightedValue)}
                  </Typography>
                  <Typography variant="caption" color="textSecondary">
                    Basado en probabilidad
                  </Typography>
                </Box>
                <Typography variant="h3" sx={{ opacity: 0.2 }}>
                  {formatPercentage(metrics?.win_rate || 0)}
                </Typography>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box>
                <Typography color="textSecondary" gutterBottom variant="body2">
                  Forecast
                </Typography>
                <Typography variant="h5" fontWeight="bold" color="primary.main">
                  {formatCurrency(forecast?.commit || 0)}
                </Typography>
                <Box sx={{ display: 'flex', gap: 1, mt: 1 }}>
                  <Chip label={`Pipeline: ${formatCurrency(forecast?.pipeline || 0)}`} size="small" />
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box>
                <Typography color="textSecondary" gutterBottom variant="body2">
                  Tasa de Conversión
                </Typography>
                <Typography variant="h5" fontWeight="bold">
                  {formatPercentage(metrics?.win_rate || 0, 1)}
                </Typography>
                <Typography variant="caption" color="textSecondary">
                  Promedio: {formatCurrency(metrics?.avg_deal_size || 0)}
                </Typography>
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Filter Bar */}
      <Paper sx={{ p: 2, mb: 3 }}>
        <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', alignItems: 'center' }}>
          <Button startIcon={<FilterIcon />} size="small">
            Filtros
          </Button>
          <Chip label="Este mes" onDelete={() => {}} />
          <Chip label="Mi pipeline" onDelete={() => {}} />
          <Button
            size="small"
            onClick={() => toggleCompactView()}
          >
            {isCompactView ? 'Vista Expandida' : 'Vista Compacta'}
          </Button>
        </Box>
      </Paper>

      {/* Pipeline Board */}
      {viewMode === 'kanban' ? (
        <PipelineBoard
          stages={stages}
          opportunities={opportunities}
          onDragEnd={handleDragEnd}
          onOpportunityClick={handleOpportunityClick}
          onStageAction={handleStageAction}
          isCompact={isCompactView}
        />
      ) : (
        <Paper sx={{ p: 2 }}>
          <Typography variant="body1" color="textSecondary">
            Vista de lista en desarrollo...
          </Typography>
        </Paper>
      )}

      {/* Stage Summary */}
      <Paper sx={{ mt: 3, p: 2 }}>
        <Typography variant="h6" gutterBottom>
          Resumen por Etapa
        </Typography>
        <Grid container spacing={2}>
          {stages.map(stage => {
            const stageOpps = opportunities.filter(o => o.stage_id === stage.id);
            const stageTotal = stageOpps.reduce((sum, o) => sum + o.amount, 0);

            return (
              <Grid item xs={12} sm={6} md={4} lg={2} key={stage.id}>
                <Box sx={{ textAlign: 'center' }}>
                  <Typography variant="subtitle2" color="textSecondary">
                    {stage.name}
                  </Typography>
                  <Typography variant="h6" fontWeight="bold">
                    {formatCurrency(stageTotal)}
                  </Typography>
                  <Typography variant="caption" color="textSecondary">
                    {stageOpps.length} oportunidad{stageOpps.length !== 1 ? 'es' : ''}
                  </Typography>
                </Box>
              </Grid>
            );
          })}
        </Grid>
      </Paper>
    </Box>
  );
};

export default PipelinePage;