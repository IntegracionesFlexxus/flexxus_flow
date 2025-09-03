import React, { useState, useEffect } from 'react';
import {
  Box,
  Paper,
  Typography,
  Grid,
  Chip,
  IconButton,
  Collapse,
  LinearProgress,
  Tooltip,
  Button,
  Divider
} from '@mui/material';
import {
  Speed as SpeedIcon,
  ExpandMore as ExpandMoreIcon,
  ExpandLess as ExpandLessIcon,
  Refresh as RefreshIcon,
  Info as InfoIcon
} from '@mui/icons-material';
import { useWebVitals, formatMetric, analyzePerformance, type Metric } from '@/utils/webVitals';

// Componente de monitor de performance - MVP Nivel 1
// TODO: En Nivel 2 agregar gráficos históricos y exportación de datos

interface MetricCardProps {
  title: string;
  metric?: Metric;
  description: string;
  threshold: { good: number; poor: number };
}

function MetricCard({ title, metric, description, threshold }: MetricCardProps) {
  const getColor = () => {
    if (!metric) return 'default';
    switch (metric.rating) {
      case 'good': return 'success';
      case 'needs-improvement': return 'warning';
      case 'poor': return 'error';
      default: return 'default';
    }
  };

  const getProgressValue = () => {
    if (!metric) return 0;
    const maxValue = threshold.poor * 1.5;
    return Math.min((metric.value / maxValue) * 100, 100);
  };

  return (
    <Paper sx={{ p: 2, height: '100%' }}>
      <Box display="flex" alignItems="center" justifyContent="space-between" mb={1}>
        <Typography variant="subtitle2" color="text.secondary">
          {title}
        </Typography>
        <Tooltip title={description}>
          <InfoIcon fontSize="small" color="action" />
        </Tooltip>
      </Box>
      
      {metric ? (
        <>
          <Typography variant="h4" gutterBottom>
            {formatMetric(metric)}
          </Typography>
          <LinearProgress
            variant="determinate"
            value={getProgressValue()}
            color={getColor()}
            sx={{ mb: 1, height: 6, borderRadius: 1 }}
          />
          <Chip
            label={metric.rating.replace('-', ' ')}
            color={getColor()}
            size="small"
            sx={{ textTransform: 'capitalize' }}
          />
        </>
      ) : (
        <Typography variant="body2" color="text.secondary">
          Recopilando datos...
        </Typography>
      )}
    </Paper>
  );
}

export function PerformanceMonitor() {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isVisible, setIsVisible] = useState(false);
  const metrics = useWebVitals();
  const analysis = analyzePerformance(metrics);

  // Solo mostrar en desarrollo
  useEffect(() => {
    setIsVisible(process.env.NODE_ENV === 'development');
  }, []);

  if (!isVisible) return null;

  const handleRefresh = () => {
    window.location.reload();
  };

  const getOverallColor = () => {
    if (analysis.rating === 'good') return 'success';
    if (analysis.rating === 'needs-improvement') return 'warning';
    return 'error';
  };

  return (
    <Box
      position="fixed"
      bottom={16}
      right={16}
      zIndex={9999}
      maxWidth={isExpanded ? 600 : 200}
    >
      <Paper elevation={4}>
        {/* Header */}
        <Box
          sx={{
            p: 1.5,
            bgcolor: 'primary.main',
            color: 'primary.contrastText',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            cursor: 'pointer'
          }}
          onClick={() => setIsExpanded(!isExpanded)}
        >
          <Box display="flex" alignItems="center" gap={1}>
            <SpeedIcon fontSize="small" />
            <Typography variant="subtitle2">
              Performance
            </Typography>
            {!isExpanded && (
              <Chip
                label={`${analysis.overallScore.toFixed(0)}%`}
                size="small"
                color={getOverallColor()}
                sx={{ ml: 1 }}
              />
            )}
          </Box>
          <IconButton
            size="small"
            sx={{ color: 'inherit' }}
            onClick={(e) => {
              e.stopPropagation();
              setIsExpanded(!isExpanded);
            }}
          >
            {isExpanded ? <ExpandLessIcon /> : <ExpandMoreIcon />}
          </IconButton>
        </Box>

        {/* Content */}
        <Collapse in={isExpanded}>
          <Box p={2}>
            {/* Overall Score */}
            <Box mb={2}>
              <Typography variant="h6" gutterBottom>
                Score General: {analysis.overallScore.toFixed(0)}%
              </Typography>
              <LinearProgress
                variant="determinate"
                value={analysis.overallScore}
                color={getOverallColor()}
                sx={{ height: 8, borderRadius: 1 }}
              />
              <Box display="flex" gap={1} mt={1}>
                <Chip
                  label={`✅ ${analysis.scores.good}`}
                  size="small"
                  color="success"
                  variant="outlined"
                />
                <Chip
                  label={`⚠️ ${analysis.scores.needsImprovement}`}
                  size="small"
                  color="warning"
                  variant="outlined"
                />
                <Chip
                  label={`❌ ${analysis.scores.poor}`}
                  size="small"
                  color="error"
                  variant="outlined"
                />
              </Box>
            </Box>

            <Divider sx={{ my: 2 }} />

            {/* Metrics Grid */}
            <Grid container spacing={2}>
              <Grid item xs={6}>
                <MetricCard
                  title="FCP"
                  metric={metrics.FCP}
                  description="First Contentful Paint - Tiempo hasta el primer contenido visible"
                  threshold={{ good: 1800, poor: 3000 }}
                />
              </Grid>
              <Grid item xs={6}>
                <MetricCard
                  title="LCP"
                  metric={metrics.LCP}
                  description="Largest Contentful Paint - Tiempo de carga del elemento más grande"
                  threshold={{ good: 2500, poor: 4000 }}
                />
              </Grid>
              <Grid item xs={6}>
                <MetricCard
                  title="FID"
                  metric={metrics.FID}
                  description="First Input Delay - Tiempo de respuesta a la primera interacción"
                  threshold={{ good: 100, poor: 300 }}
                />
              </Grid>
              <Grid item xs={6}>
                <MetricCard
                  title="CLS"
                  metric={metrics.CLS}
                  description="Cumulative Layout Shift - Estabilidad visual de la página"
                  threshold={{ good: 0.1, poor: 0.25 }}
                />
              </Grid>
              <Grid item xs={6}>
                <MetricCard
                  title="TTFB"
                  metric={metrics.TTFB}
                  description="Time to First Byte - Tiempo de respuesta del servidor"
                  threshold={{ good: 800, poor: 1800 }}
                />
              </Grid>
              <Grid item xs={6}>
                <Box
                  sx={{
                    p: 2,
                    height: '100%',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'center',
                    alignItems: 'center',
                    border: '2px dashed',
                    borderColor: 'divider',
                    borderRadius: 1
                  }}
                >
                  <Button
                    startIcon={<RefreshIcon />}
                    onClick={handleRefresh}
                    variant="outlined"
                    size="small"
                  >
                    Refresh
                  </Button>
                </Box>
              </Grid>
            </Grid>

            {/* Info */}
            <Box mt={2} p={1.5} bgcolor="grey.100" borderRadius={1}>
              <Typography variant="caption" color="text.secondary">
                💡 Las métricas se actualizan en tiempo real. Los valores buenos están en verde,
                los que necesitan mejora en amarillo y los pobres en rojo.
              </Typography>
            </Box>
          </Box>
        </Collapse>
      </Paper>
    </Box>
  );
}

// Hook para usar el monitor programáticamente
export function usePerformanceMonitor() {
  const [renderTime, setRenderTime] = useState<number>(0);
  const [updateCount, setUpdateCount] = useState<number>(0);

  useEffect(() => {
    const startTime = performance.now();
    
    return () => {
      const endTime = performance.now();
      const duration = endTime - startTime;
      setRenderTime(duration);
      
      if (process.env.NODE_ENV === 'development') {
        console.log(`Component lifecycle: ${duration.toFixed(2)}ms`);
      }
    };
  });

  useEffect(() => {
    setUpdateCount(prev => prev + 1);
  });

  return {
    renderTime,
    updateCount,
    isFirstRender: updateCount === 1
  };
}

export default PerformanceMonitor;