/**
 * Forecasting Dashboard Component
 * Main dashboard for sales forecasting and predictions
 */

import React, { useEffect, useState, useMemo } from 'react';
import {
  Box,
  Paper,
  Grid,
  Typography,
  Card,
  CardContent,
  Button,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Stack,
  Chip,
  IconButton,
  Tooltip,
  LinearProgress,
  Alert,
  Tab,
  Tabs,
  useTheme
} from '@mui/material';
import {
  TrendingUp,
  TrendingDown,
  Download,
  Refresh,
  Info,
  Assessment,
  Timeline,
  PieChart,
  BarChart
} from '@mui/icons-material';
import {
  LineChart,
  Line,
  BarChart as RechartsBarChart,
  Bar,
  PieChart as RechartsPieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  Legend,
  ResponsiveContainer,
  AreaChart,
  Area,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar
} from 'recharts';
import useForecastStore from '../../stores/useForecastStore';
import usePipelineStore from '../../stores/usePipelineStore';
import ForecastAccuracyChart from './ForecastAccuracyChart';
import { ForecastPeriod, ForecastCategory } from '../../types/pipeline.types';
import { formatCurrency, formatPercentage, formatDate } from '../../utils/formatters';

interface ForecastingDashboardProps {
  periodId?: number;
  onManageSnapshots?: () => void;
}

const COLORS = {
  commit: '#4caf50',
  best_case: '#2196f3',
  pipeline: '#ff9800',
  omitted: '#9e9e9e',
  closed_won: '#4caf50',
  closed_lost: '#f44336'
};

const CATEGORY_LABELS: Record<ForecastCategory, string> = {
  commit: 'Committed',
  best_case: 'Best Case',
  pipeline: 'Pipeline',
  omitted: 'Omitted'
};

export const ForecastingDashboard: React.FC<ForecastingDashboardProps> = ({
  periodId,
  onManageSnapshots
}) => {
  const theme = useTheme();
  const [tabValue, setTabValue] = useState(0);
  const [isExporting, setIsExporting] = useState(false);

  const {
    periods,
    currentPeriod,
    snapshots,
    summary,
    byOwner,
    trends,
    predictions,
    isLoading,
    error,
    loadPeriods,
    selectPeriod,
    loadSummary,
    loadByOwner,
    loadTrends,
    loadPredictions,
    loadHistoricalAccuracy,
    exportForecast,
    getForecastByCategory
  } = useForecastStore();

  const { currentPipeline } = usePipelineStore();

  // Load periods on mount
  useEffect(() => {
    loadPeriods();
    loadHistoricalAccuracy();
  }, []);

  // Select period
  useEffect(() => {
    if (periodId && (!currentPeriod || currentPeriod.period_id !== periodId)) {
      selectPeriod(periodId);
    } else if (!currentPeriod && periods.length > 0) {
      const activePeriod = periods.find(p => p.is_active) || periods[0];
      selectPeriod(activePeriod.period_id);
    }
  }, [periodId, currentPeriod, periods]);

  // Load additional data when period changes
  useEffect(() => {
    if (currentPeriod) {
      loadPredictions(currentPeriod.period_id);

      // Load trends for last 4 periods
      const lastPeriods = periods
        .filter(p => new Date(p.end_date) <= new Date(currentPeriod.end_date))
        .sort((a, b) => new Date(b.end_date).getTime() - new Date(a.end_date).getTime())
        .slice(0, 4)
        .map(p => p.period_id);

      if (lastPeriods.length > 0) {
        loadTrends(lastPeriods);
      }
    }
  }, [currentPeriod]);

  const handlePeriodChange = (event: any) => {
    const id = event.target.value as number;
    selectPeriod(id);
  };

  const handleRefresh = async () => {
    if (currentPeriod) {
      await Promise.all([
        loadSummary(currentPeriod.period_id),
        loadByOwner(currentPeriod.period_id),
        loadPredictions(currentPeriod.period_id)
      ]);
    }
  };

  const handleExport = async (format: 'excel' | 'pdf') => {
    if (!currentPeriod) return;

    setIsExporting(true);
    try {
      await exportForecast(currentPeriod.period_id, format);
    } finally {
      setIsExporting(false);
    }
  };

  // Calculate forecast by category
  const forecastByCategory = useMemo(() => {
    const byCategory = getForecastByCategory();
    return Array.from(byCategory.entries()).map(([category, data]) => ({
      category: CATEGORY_LABELS[category],
      ...data,
      fill: COLORS[category]
    }));
  }, [snapshots]);

  // Calculate pipeline velocity
  const pipelineVelocity = useMemo(() => {
    if (!trends || trends.length === 0) return [];

    return trends.map(trend => ({
      period: trend.period_name,
      forecast: trend.forecast_amount,
      actual: trend.actual_amount,
      accuracy: trend.accuracy
    }));
  }, [trends]);

  // Calculate win rate trends
  const winRateTrends = useMemo(() => {
    if (!byOwner || byOwner.length === 0) return [];

    return byOwner
      .filter(o => o.closed_amount > 0 || o.pipeline_amount > 0)
      .map(owner => ({
        name: owner.owner_name,
        winRate: owner.closed_amount / (owner.closed_amount + o.pipeline_amount) * 100,
        quota: owner.quota || 0,
        attainment: owner.attainment || 0
      }))
      .sort((a, b) => b.winRate - a.winRate)
      .slice(0, 10);
  }, [byOwner]);

  // Calculate confidence metrics
  const confidenceMetrics = useMemo(() => {
    if (!summary) return null;

    const total = summary.total_pipeline;
    if (total === 0) return null;

    return {
      committed: (summary.committed / total) * 100,
      bestCase: (summary.best_case / total) * 100,
      upside: (summary.upside / total) * 100
    };
  }, [summary]);

  if (isLoading && !currentPeriod) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" height={400}>
        <LinearProgress sx={{ width: '50%' }} />
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

  if (!currentPeriod) {
    return (
      <Box p={3}>
        <Alert severity="info">
          No forecast period selected. Please create or select a forecast period.
        </Alert>
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3 }}>
      {/* Header */}
      <Stack direction="row" justifyContent="space-between" alignItems="center" mb={3}>
        <Box>
          <Typography variant="h4" gutterBottom>
            Sales Forecast Dashboard
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {currentPipeline?.name} Pipeline • {formatDate(currentPeriod.start_date)} - {formatDate(currentPeriod.end_date)}
          </Typography>
        </Box>

        <Stack direction="row" spacing={2}>
          <FormControl size="small" sx={{ minWidth: 200 }}>
            <InputLabel>Forecast Period</InputLabel>
            <Select
              value={currentPeriod.period_id}
              onChange={handlePeriodChange}
              label="Forecast Period"
            >
              {periods.map(period => (
                <MenuItem key={period.period_id} value={period.period_id}>
                  {period.name}
                  {period.is_active && <Chip label="Active" size="small" sx={{ ml: 1 }} />}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          <Button
            variant="outlined"
            startIcon={<Refresh />}
            onClick={handleRefresh}
          >
            Refresh
          </Button>

          <Button
            variant="outlined"
            startIcon={<Download />}
            onClick={() => handleExport('excel')}
            disabled={isExporting}
          >
            Export
          </Button>

          {onManageSnapshots && (
            <Button
              variant="contained"
              onClick={onManageSnapshots}
            >
              Manage Snapshots
            </Button>
          )}
        </Stack>
      </Stack>

      {/* Summary Cards */}
      {summary && (
        <Grid container spacing={3} mb={3}>
          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent>
                <Stack spacing={1}>
                  <Typography color="text.secondary" variant="overline">
                    Total Pipeline
                  </Typography>
                  <Typography variant="h5" fontWeight="bold">
                    {formatCurrency(summary.total_pipeline)}
                  </Typography>
                  <Box display="flex" alignItems="center" gap={0.5}>
                    {summary.total_pipeline > 0 ? (
                      <TrendingUp fontSize="small" color="success" />
                    ) : (
                      <TrendingDown fontSize="small" color="error" />
                    )}
                    <Typography variant="caption" color="text.secondary">
                      {snapshots.length} opportunities
                    </Typography>
                  </Box>
                </Stack>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} sm={6} md={3}>
            <Card sx={{ bgcolor: 'success.50' }}>
              <CardContent>
                <Stack spacing={1}>
                  <Typography color="text.secondary" variant="overline">
                    Committed
                  </Typography>
                  <Typography variant="h5" fontWeight="bold" color="success.main">
                    {formatCurrency(summary.committed)}
                  </Typography>
                  <LinearProgress
                    variant="determinate"
                    value={(summary.committed / (summary.total_pipeline || 1)) * 100}
                    sx={{ bgcolor: 'success.100' }}
                    color="success"
                  />
                </Stack>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent>
                <Stack spacing={1}>
                  <Typography color="text.secondary" variant="overline">
                    Best Case
                  </Typography>
                  <Typography variant="h5" fontWeight="bold" color="primary">
                    {formatCurrency(summary.best_case)}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    + {formatCurrency(summary.upside)} upside
                  </Typography>
                </Stack>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent>
                <Stack spacing={1}>
                  <Typography color="text.secondary" variant="overline">
                    Gap to Target
                  </Typography>
                  <Typography
                    variant="h5"
                    fontWeight="bold"
                    color={summary.gap_to_target < 0 ? 'error.main' : 'success.main'}
                  >
                    {formatCurrency(Math.abs(summary.gap_to_target))}
                  </Typography>
                  <Chip
                    label={`${summary.confidence_level}% confidence`}
                    size="small"
                    color={summary.confidence_level >= 80 ? 'success' : summary.confidence_level >= 60 ? 'warning' : 'error'}
                  />
                </Stack>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      )}

      {/* Tabs */}
      <Paper sx={{ mb: 3 }}>
        <Tabs value={tabValue} onChange={(e, v) => setTabValue(v)}>
          <Tab label="Pipeline Overview" icon={<PieChart />} iconPosition="start" />
          <Tab label="Velocity & Trends" icon={<Timeline />} iconPosition="start" />
          <Tab label="Team Performance" icon={<BarChart />} iconPosition="start" />
          <Tab label="Accuracy Analysis" icon={<Assessment />} iconPosition="start" />
        </Tabs>
      </Paper>

      {/* Tab Panels */}
      {tabValue === 0 && (
        <Grid container spacing={3}>
          {/* Forecast by Category */}
          <Grid item xs={12} md={6}>
            <Paper sx={{ p: 2, height: 400 }}>
              <Typography variant="h6" gutterBottom>
                Forecast by Category
              </Typography>
              <ResponsiveContainer width="100%" height="85%">
                <RechartsPieChart>
                  <Pie
                    data={forecastByCategory}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={(entry) => `${entry.category}: ${formatCurrency(entry.amount)}`}
                    outerRadius={100}
                    fill="#8884d8"
                    dataKey="amount"
                  >
                    {forecastByCategory.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.fill} />
                    ))}
                  </Pie>
                  <RechartsTooltip formatter={(value: number) => formatCurrency(value)} />
                  <Legend />
                </RechartsPieChart>
              </ResponsiveContainer>
            </Paper>
          </Grid>

          {/* Confidence Radar */}
          {confidenceMetrics && (
            <Grid item xs={12} md={6}>
              <Paper sx={{ p: 2, height: 400 }}>
                <Typography variant="h6" gutterBottom>
                  Confidence Distribution
                </Typography>
                <ResponsiveContainer width="100%" height="85%">
                  <RadarChart
                    data={[
                      { category: 'Committed', value: confidenceMetrics.committed },
                      { category: 'Best Case', value: confidenceMetrics.bestCase },
                      { category: 'Upside', value: confidenceMetrics.upside }
                    ]}
                  >
                    <PolarGrid />
                    <PolarAngleAxis dataKey="category" />
                    <PolarRadiusAxis angle={90} domain={[0, 100]} />
                    <Radar
                      name="Confidence %"
                      dataKey="value"
                      stroke={theme.palette.primary.main}
                      fill={theme.palette.primary.main}
                      fillOpacity={0.6}
                    />
                    <RechartsTooltip formatter={(value: number) => `${value.toFixed(1)}%`} />
                  </RadarChart>
                </ResponsiveContainer>
              </Paper>
            </Grid>
          )}
        </Grid>
      )}

      {tabValue === 1 && (
        <Grid container spacing={3}>
          {/* Pipeline Velocity */}
          <Grid item xs={12}>
            <Paper sx={{ p: 2, height: 400 }}>
              <Typography variant="h6" gutterBottom>
                Forecast vs Actual Trends
              </Typography>
              <ResponsiveContainer width="100%" height="85%">
                <AreaChart data={pipelineVelocity}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="period" />
                  <YAxis tickFormatter={(value) => abbreviateNumber(value)} />
                  <RechartsTooltip formatter={(value: number) => formatCurrency(value)} />
                  <Legend />
                  <Area
                    type="monotone"
                    dataKey="forecast"
                    stackId="1"
                    stroke={theme.palette.primary.main}
                    fill={theme.palette.primary.light}
                  />
                  <Area
                    type="monotone"
                    dataKey="actual"
                    stackId="2"
                    stroke={theme.palette.success.main}
                    fill={theme.palette.success.light}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </Paper>
          </Grid>
        </Grid>
      )}

      {tabValue === 2 && (
        <Grid container spacing={3}>
          {/* Team Performance */}
          <Grid item xs={12}>
            <Paper sx={{ p: 2, height: 500 }}>
              <Typography variant="h6" gutterBottom>
                Sales Rep Performance
              </Typography>
              <ResponsiveContainer width="100%" height="90%">
                <RechartsBarChart data={byOwner.slice(0, 10)}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="owner_name" angle={-45} textAnchor="end" height={100} />
                  <YAxis tickFormatter={(value) => abbreviateNumber(value)} />
                  <RechartsTooltip formatter={(value: number) => formatCurrency(value)} />
                  <Legend />
                  <Bar dataKey="committed_amount" stackId="a" fill={COLORS.commit} name="Committed" />
                  <Bar dataKey="best_case_amount" stackId="a" fill={COLORS.best_case} name="Best Case" />
                  <Bar dataKey="pipeline_amount" stackId="a" fill={COLORS.pipeline} name="Pipeline" />
                </RechartsBarChart>
              </ResponsiveContainer>
            </Paper>
          </Grid>
        </Grid>
      )}

      {tabValue === 3 && (
        <ForecastAccuracyChart periodId={currentPeriod.period_id} />
      )}
    </Box>
  );
};

// Helper function for abbreviating numbers
const abbreviateNumber = (value: number): string => {
  if (value >= 1000000) {
    return `${(value / 1000000).toFixed(1)}M`;
  } else if (value >= 1000) {
    return `${(value / 1000).toFixed(0)}K`;
  }
  return value.toString();
};

export default ForecastingDashboard;