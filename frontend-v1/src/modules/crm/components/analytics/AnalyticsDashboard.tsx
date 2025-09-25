import React, { useEffect, useState } from 'react';
import {
  Grid,
  Box,
  Typography,
  CircularProgress,
  Alert,
  Paper,
  ToggleButton,
  ToggleButtonGroup
} from '@mui/material';
import { CalendarMonth, DateRange } from '@mui/icons-material';
import { useAnalyticsStore } from '../../stores/analyticsStore';
import { MetricsCard } from './MetricsCard';
import { RevenueChart } from './RevenueChart';
import { ConversionFunnel } from './ConversionFunnel';

export const AnalyticsDashboard: React.FC = () => {
  const {
    metrics,
    revenueTrend,
    conversionFunnel,
    loading,
    error,
    fetchMetrics,
    fetchRevenueTrend,
    fetchConversionFunnel,
    clearError
  } = useAnalyticsStore();

  const [period, setPeriod] = useState<string>('monthly');

  useEffect(() => {
    // Load initial data
    fetchMetrics();
    fetchRevenueTrend(period);
    fetchConversionFunnel();
  }, []);

  useEffect(() => {
    // Reload revenue trend when period changes
    fetchRevenueTrend(period);
  }, [period]);

  const handlePeriodChange = (
    event: React.MouseEvent<HTMLElement>,
    newPeriod: string | null
  ) => {
    if (newPeriod !== null) {
      setPeriod(newPeriod);
    }
  };

  if (loading && !metrics) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight={400}>
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Alert
        severity="error"
        onClose={clearError}
        sx={{ mb: 2 }}
      >
        {error}
      </Alert>
    );
  }

  return (
    <Box>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h4" fontWeight="bold">
          Analytics Dashboard
        </Typography>
        <ToggleButtonGroup
          value={period}
          exclusive
          onChange={handlePeriodChange}
          size="small"
        >
          <ToggleButton value="daily">
            <DateRange sx={{ mr: 1 }} fontSize="small" />
            Daily
          </ToggleButton>
          <ToggleButton value="weekly">
            <CalendarMonth sx={{ mr: 1 }} fontSize="small" />
            Weekly
          </ToggleButton>
          <ToggleButton value="monthly">
            <CalendarMonth sx={{ mr: 1 }} fontSize="small" />
            Monthly
          </ToggleButton>
        </ToggleButtonGroup>
      </Box>

      {metrics && (
        <>
          {/* Key Metrics */}
          <Grid container spacing={3} mb={3}>
            <Grid item xs={12} sm={6} md={3}>
              <MetricsCard
                title="Total Revenue"
                value={metrics.salesMetrics.totalRevenue}
                unit="$"
                change={12.5}
                trend="up"
                color="success"
              />
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <MetricsCard
                title="Average Deal Size"
                value={metrics.salesMetrics.averageDealSize}
                unit="$"
                change={5.2}
                trend="up"
                color="primary"
              />
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <MetricsCard
                title="Win Rate"
                value={metrics.salesMetrics.winRate}
                unit="%"
                change={-3.1}
                trend="down"
                color="warning"
              />
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <MetricsCard
                title="Sales Cycle"
                value={Math.round(metrics.salesMetrics.salesCycle)}
                unit="days"
                change={-8.7}
                trend="down"
                color="info"
              />
            </Grid>
          </Grid>

          {/* Lead Metrics */}
          <Typography variant="h6" gutterBottom sx={{ mt: 2 }}>
            Lead Performance
          </Typography>
          <Grid container spacing={3} mb={3}>
            <Grid item xs={12} sm={6} md={3}>
              <MetricsCard
                title="Total Leads"
                value={metrics.leadMetrics.totalLeads}
                change={15.3}
                trend="up"
              />
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <MetricsCard
                title="Conversion Rate"
                value={metrics.leadMetrics.conversionRate}
                unit="%"
                change={2.8}
                trend="up"
              />
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <MetricsCard
                title="Average Score"
                value={Math.round(metrics.leadMetrics.averageScore)}
                change={4.1}
                trend="up"
              />
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <MetricsCard
                title="Top Source"
                value={metrics.leadMetrics.topSources[0]?.source || 'N/A'}
                change={0}
                trend="stable"
              />
            </Grid>
          </Grid>

          {/* Activity Metrics */}
          <Typography variant="h6" gutterBottom sx={{ mt: 2 }}>
            Activity Summary
          </Typography>
          <Grid container spacing={3} mb={3}>
            <Grid item xs={12} sm={6} md={3}>
              <MetricsCard
                title="Total Activities"
                value={metrics.activityMetrics.totalActivities}
                change={8.9}
                trend="up"
              />
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <MetricsCard
                title="Completion Rate"
                value={metrics.activityMetrics.completionRate}
                unit="%"
                change={3.5}
                trend="up"
              />
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <MetricsCard
                title="Overdue"
                value={metrics.activityMetrics.overdueCount}
                change={-12.3}
                trend="down"
                color="error"
              />
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <MetricsCard
                title="Upcoming"
                value={metrics.activityMetrics.upcomingCount}
                change={5.7}
                trend="up"
              />
            </Grid>
          </Grid>

          {/* Charts */}
          <Grid container spacing={3}>
            {/* Revenue Chart */}
            <Grid item xs={12} md={8}>
              {revenueTrend.length > 0 && (
                <RevenueChart
                  data={revenueTrend}
                  title={`Revenue Trend (${period})`}
                  height={350}
                />
              )}
            </Grid>

            {/* Conversion Funnel */}
            <Grid item xs={12} md={4}>
              {conversionFunnel.length > 0 && (
                <ConversionFunnel data={conversionFunnel} />
              )}
            </Grid>

            {/* Pipeline Metrics */}
            <Grid item xs={12}>
              <Paper sx={{ p: 3 }}>
                <Typography variant="h6" gutterBottom>
                  Pipeline Overview
                </Typography>
                <Grid container spacing={3}>
                  <Grid item xs={12} sm={6} md={3}>
                    <Box>
                      <Typography variant="body2" color="textSecondary" gutterBottom>
                        Total Pipeline Value
                      </Typography>
                      <Typography variant="h5" fontWeight="bold">
                        ${metrics.pipelineMetrics.totalValue.toLocaleString()}
                      </Typography>
                    </Box>
                  </Grid>
                  <Grid item xs={12} sm={6} md={3}>
                    <Box>
                      <Typography variant="body2" color="textSecondary" gutterBottom>
                        Weighted Value
                      </Typography>
                      <Typography variant="h5" fontWeight="bold">
                        ${metrics.pipelineMetrics.weightedValue.toLocaleString()}
                      </Typography>
                    </Box>
                  </Grid>
                  <Grid item xs={12} sm={6} md={3}>
                    <Box>
                      <Typography variant="body2" color="textSecondary" gutterBottom>
                        Forecast
                      </Typography>
                      <Typography variant="h5" fontWeight="bold">
                        ${metrics.pipelineMetrics.forecast.toLocaleString()}
                      </Typography>
                    </Box>
                  </Grid>
                  <Grid item xs={12} sm={6} md={3}>
                    <Box>
                      <Typography variant="body2" color="textSecondary" gutterBottom>
                        Active Stages
                      </Typography>
                      <Typography variant="h5" fontWeight="bold">
                        {metrics.pipelineMetrics.stageDistribution.length}
                      </Typography>
                    </Box>
                  </Grid>
                </Grid>
              </Paper>
            </Grid>
          </Grid>
        </>
      )}
    </Box>
  );
};