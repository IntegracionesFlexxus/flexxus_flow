/**
 * Forecast Accuracy Chart Component
 * Displays historical forecast accuracy and trends
 */

import React, { useEffect, useMemo } from 'react';
import {
  Box,
  Paper,
  Typography,
  Grid,
  Card,
  CardContent,
  Chip,
  Stack,
  LinearProgress,
  Alert
} from '@mui/material';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  ComposedChart,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ReferenceLine,
  Cell
} from 'recharts';
import useForecastStore from '../../stores/useForecastStore';
import { formatCurrency, formatPercentage } from '../../utils/formatters';

interface ForecastAccuracyChartProps {
  periodId: number;
}

const getAccuracyColor = (accuracy: number): string => {
  if (accuracy >= 90) return '#4caf50';
  if (accuracy >= 75) return '#8bc34a';
  if (accuracy >= 60) return '#ffeb3b';
  if (accuracy >= 45) return '#ff9800';
  return '#f44336';
};

const getAccuracyLabel = (accuracy: number): string => {
  if (accuracy >= 90) return 'Excellent';
  if (accuracy >= 75) return 'Good';
  if (accuracy >= 60) return 'Fair';
  if (accuracy >= 45) return 'Poor';
  return 'Very Poor';
};

export const ForecastAccuracyChart: React.FC<ForecastAccuracyChartProps> = ({ periodId }) => {
  const {
    accuracy,
    historicalAccuracy,
    trends,
    loadAccuracy,
    loadHistoricalAccuracy,
    calculateAccuracy
  } = useForecastStore();

  useEffect(() => {
    loadAccuracy(periodId);
    calculateAccuracy(periodId);
  }, [periodId]);

  // Process historical data
  const historicalData = useMemo(() => {
    if (!historicalAccuracy || historicalAccuracy.length === 0) return [];

    return historicalAccuracy
      .sort((a, b) => a.period_id - b.period_id)
      .map((acc) => ({
        period: `Period ${acc.period_id}`,
        forecast: acc.forecast_amount,
        actual: acc.actual_amount,
        variance: acc.variance,
        accuracy: acc.accuracy_percentage,
        color: getAccuracyColor(acc.accuracy_percentage)
      }));
  }, [historicalAccuracy]);

  // Current period accuracy
  const currentAccuracy = useMemo(() => {
    const current = accuracy.find(a => a.period_id === periodId);
    if (!current) return null;

    const isOverForecast = current.variance > 0;
    const variancePercent = Math.abs(current.variance / current.forecast_amount) * 100;

    return {
      ...current,
      isOverForecast,
      variancePercent,
      color: getAccuracyColor(current.accuracy_percentage),
      label: getAccuracyLabel(current.accuracy_percentage)
    };
  }, [accuracy, periodId]);

  // Accuracy trend analysis
  const accuracyTrend = useMemo(() => {
    if (!historicalAccuracy || historicalAccuracy.length < 2) return null;

    const recentAccuracy = historicalAccuracy
      .sort((a, b) => b.period_id - a.period_id)
      .slice(0, 3);

    const avgRecent = recentAccuracy.reduce((sum, a) => sum + a.accuracy_percentage, 0) / recentAccuracy.length;

    const olderAccuracy = historicalAccuracy
      .sort((a, b) => b.period_id - a.period_id)
      .slice(3, 6);

    if (olderAccuracy.length === 0) return null;

    const avgOlder = olderAccuracy.reduce((sum, a) => sum + a.accuracy_percentage, 0) / olderAccuracy.length;

    const improvement = avgRecent - avgOlder;

    return {
      current: avgRecent,
      previous: avgOlder,
      improvement,
      isImproving: improvement > 0
    };
  }, [historicalAccuracy]);

  // Variance breakdown
  const varianceBreakdown = useMemo(() => {
    if (!trends || trends.length === 0) return [];

    return trends.map(trend => ({
      period: trend.period_name,
      overForecast: Math.max(0, trend.actual_amount - trend.forecast_amount),
      underForecast: Math.max(0, trend.forecast_amount - trend.actual_amount),
      accuracy: trend.accuracy
    }));
  }, [trends]);

  if (!currentAccuracy && (!historicalAccuracy || historicalAccuracy.length === 0)) {
    return (
      <Box p={3}>
        <Alert severity="info">
          No accuracy data available. Accuracy is calculated after periods close.
        </Alert>
      </Box>
    );
  }

  return (
    <Grid container spacing={3}>
      {/* Current Period Accuracy */}
      {currentAccuracy && (
        <Grid item xs={12}>
          <Grid container spacing={3}>
            <Grid item xs={12} md={3}>
              <Card>
                <CardContent>
                  <Typography color="text.secondary" variant="overline" gutterBottom>
                    Current Accuracy
                  </Typography>
                  <Typography variant="h3" fontWeight="bold" color={currentAccuracy.color}>
                    {currentAccuracy.accuracy_percentage.toFixed(1)}%
                  </Typography>
                  <Chip
                    label={currentAccuracy.label}
                    size="small"
                    sx={{ bgcolor: currentAccuracy.color, color: 'white', mt: 1 }}
                  />
                </CardContent>
              </Card>
            </Grid>

            <Grid item xs={12} md={3}>
              <Card>
                <CardContent>
                  <Typography color="text.secondary" variant="overline" gutterBottom>
                    Forecast Amount
                  </Typography>
                  <Typography variant="h5" fontWeight="medium">
                    {formatCurrency(currentAccuracy.forecast_amount)}
                  </Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                    Original forecast
                  </Typography>
                </CardContent>
              </Card>
            </Grid>

            <Grid item xs={12} md={3}>
              <Card>
                <CardContent>
                  <Typography color="text.secondary" variant="overline" gutterBottom>
                    Actual Amount
                  </Typography>
                  <Typography variant="h5" fontWeight="medium">
                    {formatCurrency(currentAccuracy.actual_amount)}
                  </Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                    Closed won deals
                  </Typography>
                </CardContent>
              </Card>
            </Grid>

            <Grid item xs={12} md={3}>
              <Card sx={{ bgcolor: currentAccuracy.isOverForecast ? 'success.50' : 'error.50' }}>
                <CardContent>
                  <Typography color="text.secondary" variant="overline" gutterBottom>
                    Variance
                  </Typography>
                  <Typography
                    variant="h5"
                    fontWeight="medium"
                    color={currentAccuracy.isOverForecast ? 'success.main' : 'error.main'}
                  >
                    {currentAccuracy.isOverForecast ? '+' : '-'}
                    {formatCurrency(Math.abs(currentAccuracy.variance))}
                  </Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                    {currentAccuracy.variancePercent.toFixed(1)}% {currentAccuracy.isOverForecast ? 'over' : 'under'} forecast
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
          </Grid>
        </Grid>
      )}

      {/* Accuracy Trend */}
      {accuracyTrend && (
        <Grid item xs={12} md={4}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Accuracy Trend
              </Typography>
              <Stack spacing={2}>
                <Box>
                  <Stack direction="row" justifyContent="space-between" alignItems="center">
                    <Typography variant="body2" color="text.secondary">
                      Recent Average
                    </Typography>
                    <Typography variant="h6">
                      {accuracyTrend.current.toFixed(1)}%
                    </Typography>
                  </Stack>
                  <LinearProgress
                    variant="determinate"
                    value={accuracyTrend.current}
                    sx={{ height: 8, borderRadius: 4 }}
                  />
                </Box>
                <Box>
                  <Stack direction="row" justifyContent="space-between" alignItems="center">
                    <Typography variant="body2" color="text.secondary">
                      Previous Average
                    </Typography>
                    <Typography variant="body1">
                      {accuracyTrend.previous.toFixed(1)}%
                    </Typography>
                  </Stack>
                </Box>
                <Chip
                  label={`${accuracyTrend.isImproving ? '+' : ''}${accuracyTrend.improvement.toFixed(1)}% ${accuracyTrend.isImproving ? 'improvement' : 'decline'}`}
                  color={accuracyTrend.isImproving ? 'success' : 'error'}
                  variant="outlined"
                />
              </Stack>
            </CardContent>
          </Card>
        </Grid>
      )}

      {/* Historical Accuracy Chart */}
      <Grid item xs={12} md={accuracyTrend ? 8 : 12}>
        <Paper sx={{ p: 2, height: 400 }}>
          <Typography variant="h6" gutterBottom>
            Historical Forecast Accuracy
          </Typography>
          <ResponsiveContainer width="100%" height="90%">
            <ComposedChart data={historicalData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="period" />
              <YAxis yAxisId="amount" orientation="left" tickFormatter={(v) => `${(v/1000000).toFixed(1)}M`} />
              <YAxis yAxisId="accuracy" orientation="right" domain={[0, 100]} tickFormatter={(v) => `${v}%`} />
              <Tooltip
                formatter={(value: number, name: string) => {
                  if (name === 'Accuracy') return `${value.toFixed(1)}%`;
                  return formatCurrency(value);
                }}
              />
              <Legend />
              <Bar yAxisId="amount" dataKey="forecast" fill="#8884d8" name="Forecast" />
              <Bar yAxisId="amount" dataKey="actual" fill="#82ca9d" name="Actual" />
              <Line
                yAxisId="accuracy"
                type="monotone"
                dataKey="accuracy"
                stroke="#ff7300"
                strokeWidth={3}
                name="Accuracy"
                dot={{ r: 6 }}
              />
              <ReferenceLine yAxisId="accuracy" y={80} stroke="green" strokeDasharray="3 3" />
            </ComposedChart>
          </ResponsiveContainer>
        </Paper>
      </Grid>

      {/* Variance Breakdown */}
      {varianceBreakdown.length > 0 && (
        <Grid item xs={12}>
          <Paper sx={{ p: 2, height: 350 }}>
            <Typography variant="h6" gutterBottom>
              Forecast Variance Analysis
            </Typography>
            <ResponsiveContainer width="100%" height="90%">
              <BarChart data={varianceBreakdown}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="period" />
                <YAxis tickFormatter={(v) => `${(v/1000000).toFixed(1)}M`} />
                <Tooltip formatter={(value: number) => formatCurrency(value)} />
                <Legend />
                <Bar dataKey="overForecast" stackId="a" fill="#4caf50" name="Over Forecast" />
                <Bar dataKey="underForecast" stackId="a" fill="#f44336" name="Under Forecast" />
              </BarChart>
            </ResponsiveContainer>
          </Paper>
        </Grid>
      )}

      {/* Insights */}
      <Grid item xs={12}>
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Accuracy Insights
            </Typography>
            <Stack spacing={2}>
              {currentAccuracy && currentAccuracy.accuracy_percentage < 75 && (
                <Alert severity="warning">
                  Forecast accuracy is below target (75%). Consider reviewing forecast methodology and assumptions.
                </Alert>
              )}
              {accuracyTrend && !accuracyTrend.isImproving && (
                <Alert severity="info">
                  Forecast accuracy has declined compared to previous periods. Review recent changes in sales process or market conditions.
                </Alert>
              )}
              {currentAccuracy && currentAccuracy.isOverForecast && (
                <Alert severity="success">
                  Actual results exceeded forecast by {currentAccuracy.variancePercent.toFixed(1)}%. Team is performing above expectations.
                </Alert>
              )}
              {varianceBreakdown.some(v => v.accuracy < 60) && (
                <Alert severity="error">
                  Some periods show significant variance (&gt;40%). Consider implementing more conservative forecasting approach.
                </Alert>
              )}
            </Stack>
          </CardContent>
        </Card>
      </Grid>
    </Grid>
  );
};

export default ForecastAccuracyChart;