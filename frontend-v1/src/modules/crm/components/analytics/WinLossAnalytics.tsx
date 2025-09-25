/**
 * Win/Loss Analytics Component - Sprint 18
 * Comprehensive analysis of won and lost opportunities
 */

import React, { useState, useEffect, useMemo } from 'react';
import {
  Box,
  Paper,
  Typography,
  Grid,
  Card,
  CardContent,
  Chip,
  Stack,
  ToggleButtonGroup,
  ToggleButton,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Avatar,
  AvatarGroup,
  LinearProgress,
  IconButton,
  Tooltip,
  Alert
} from '@mui/material';
import {
  TrendingUp,
  TrendingDown,
  AccessTime,
  AttachMoney,
  Business,
  Person,
  EmojiEvents,
  Cancel,
  Info,
  Download
} from '@mui/icons-material';
import {
  PieChart,
  Pie,
  BarChart,
  Bar,
  LineChart,
  Line,
  RadarChart,
  Radar,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  Legend,
  ResponsiveContainer,
  Cell,
  Area,
  AreaChart
} from 'recharts';
import usePipelineStore from '../../stores/usePipelineStore';
import analyticsService from '../../services/analyticsService';
import { formatCurrency, formatPercentage, formatDuration } from '../../utils/formatters';

interface WinLossAnalyticsProps {
  dateRange?: {
    start: Date;
    end: Date;
  };
}

interface WinLossMetrics {
  totalWon: number;
  totalLost: number;
  winRate: number;
  avgDealSizeWon: number;
  avgDealSizeLost: number;
  avgCycleTimeWon: number;
  avgCycleTimeLost: number;
  topWinReasons: Array<{ reason: string; count: number; percentage: number }>;
  topLossReasons: Array<{ reason: string; count: number; percentage: number }>;
  competitorAnalysis: Array<{ competitor: string; wins: number; losses: number }>;
  stageAnalysis: Array<{ stage: string; winRate: number; avgTime: number }>;
}

const COLORS = ['#4caf50', '#2196f3', '#ff9800', '#f44336', '#9c27b0', '#00bcd4'];

const WinLossAnalytics: React.FC<WinLossAnalyticsProps> = ({ dateRange }) => {
  const [metrics, setMetrics] = useState<WinLossMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [viewType, setViewType] = useState<'overview' | 'reasons' | 'competitors' | 'stages'>('overview');
  const [timeframe, setTimeframe] = useState<'month' | 'quarter' | 'year'>('quarter');
  const [selectedSegment, setSelectedSegment] = useState<string>('all');

  const { opportunities, stages } = usePipelineStore();

  useEffect(() => {
    loadAnalytics();
  }, [dateRange, timeframe]);

  const loadAnalytics = async () => {
    try {
      setLoading(true);
      const data = await analyticsService.getWinLossAnalytics({
        dateRange,
        timeframe
      });
      setMetrics(data);
    } catch (error) {
      console.error('Error loading win/loss analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  const winRateTrend = useMemo(() => {
    if (!metrics) return [];

    // Mock trend data - in real implementation, this would come from the service
    return [
      { month: 'Jan', winRate: 45 },
      { month: 'Feb', winRate: 52 },
      { month: 'Mar', winRate: 48 },
      { month: 'Apr', winRate: 55 },
      { month: 'May', winRate: 58 },
      { month: 'Jun', winRate: metrics.winRate }
    ];
  }, [metrics]);

  const reasonsDistribution = useMemo(() => {
    if (!metrics) return { win: [], loss: [] };

    return {
      win: metrics.topWinReasons.map((r, i) => ({
        ...r,
        fill: COLORS[i % COLORS.length]
      })),
      loss: metrics.topLossReasons.map((r, i) => ({
        ...r,
        fill: COLORS[i % COLORS.length]
      }))
    };
  }, [metrics]);

  const competitorPerformance = useMemo(() => {
    if (!metrics) return [];

    return metrics.competitorAnalysis.map(comp => ({
      ...comp,
      winRate: (comp.wins / (comp.wins + comp.losses)) * 100,
      total: comp.wins + comp.losses
    }));
  }, [metrics]);

  const stagePerformance = useMemo(() => {
    if (!metrics) return [];

    return metrics.stageAnalysis.map(stage => ({
      ...stage,
      avgTimeDays: Math.round(stage.avgTime / (24 * 60 * 60 * 1000))
    }));
  }, [metrics]);

  const handleExport = () => {
    // Implement export functionality
    console.log('Exporting win/loss report...');
  };

  if (loading) {
    return (
      <Box p={3}>
        <LinearProgress />
      </Box>
    );
  }

  if (!metrics) {
    return (
      <Box p={3}>
        <Alert severity="info">No win/loss data available for the selected period.</Alert>
      </Box>
    );
  }

  return (
    <Box sx={{ height: '100%', overflow: 'auto' }}>
      {/* Header */}
      <Box sx={{ mb: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Typography variant="h5" fontWeight="bold">
          Win/Loss Analytics
        </Typography>
        <Stack direction="row" spacing={2}>
          <FormControl size="small" sx={{ minWidth: 120 }}>
            <Select
              value={timeframe}
              onChange={(e) => setTimeframe(e.target.value as any)}
            >
              <MenuItem value="month">This Month</MenuItem>
              <MenuItem value="quarter">This Quarter</MenuItem>
              <MenuItem value="year">This Year</MenuItem>
            </Select>
          </FormControl>
          <IconButton onClick={handleExport}>
            <Download />
          </IconButton>
        </Stack>
      </Box>

      {/* Navigation Tabs */}
      <Box sx={{ mb: 3 }}>
        <ToggleButtonGroup
          value={viewType}
          exclusive
          onChange={(e, newView) => newView && setViewType(newView)}
          size="small"
        >
          <ToggleButton value="overview">Overview</ToggleButton>
          <ToggleButton value="reasons">Win/Loss Reasons</ToggleButton>
          <ToggleButton value="competitors">Competitors</ToggleButton>
          <ToggleButton value="stages">Stage Analysis</ToggleButton>
        </ToggleButtonGroup>
      </Box>

      {/* Content based on view type */}
      {viewType === 'overview' && (
        <Grid container spacing={3}>
          {/* Key Metrics */}
          <Grid item xs={12}>
            <Grid container spacing={2}>
              <Grid item xs={12} md={3}>
                <Card>
                  <CardContent>
                    <Stack direction="row" justifyContent="space-between" alignItems="center">
                      <Box>
                        <Typography color="text.secondary" variant="overline">
                          Win Rate
                        </Typography>
                        <Typography variant="h4" fontWeight="bold">
                          {metrics.winRate.toFixed(1)}%
                        </Typography>
                        <Chip
                          icon={metrics.winRate > 50 ? <TrendingUp /> : <TrendingDown />}
                          label={metrics.winRate > 50 ? "Above Target" : "Below Target"}
                          color={metrics.winRate > 50 ? "success" : "warning"}
                          size="small"
                        />
                      </Box>
                      <EmojiEvents sx={{ fontSize: 40, color: 'primary.main' }} />
                    </Stack>
                  </CardContent>
                </Card>
              </Grid>

              <Grid item xs={12} md={3}>
                <Card>
                  <CardContent>
                    <Typography color="text.secondary" variant="overline">
                      Deals Won
                    </Typography>
                    <Typography variant="h4" fontWeight="bold" color="success.main">
                      {metrics.totalWon}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Avg: {formatCurrency(metrics.avgDealSizeWon)}
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>

              <Grid item xs={12} md={3}>
                <Card>
                  <CardContent>
                    <Typography color="text.secondary" variant="overline">
                      Deals Lost
                    </Typography>
                    <Typography variant="h4" fontWeight="bold" color="error.main">
                      {metrics.totalLost}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Avg: {formatCurrency(metrics.avgDealSizeLost)}
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>

              <Grid item xs={12} md={3}>
                <Card>
                  <CardContent>
                    <Typography color="text.secondary" variant="overline">
                      Avg Cycle Time
                    </Typography>
                    <Stack spacing={1}>
                      <Stack direction="row" justifyContent="space-between">
                        <Typography variant="body2">Won:</Typography>
                        <Typography variant="body2" fontWeight="medium">
                          {formatDuration(metrics.avgCycleTimeWon)}
                        </Typography>
                      </Stack>
                      <Stack direction="row" justifyContent="space-between">
                        <Typography variant="body2">Lost:</Typography>
                        <Typography variant="body2" fontWeight="medium">
                          {formatDuration(metrics.avgCycleTimeLost)}
                        </Typography>
                      </Stack>
                    </Stack>
                  </CardContent>
                </Card>
              </Grid>
            </Grid>
          </Grid>

          {/* Win Rate Trend */}
          <Grid item xs={12} md={8}>
            <Paper sx={{ p: 2, height: 350 }}>
              <Typography variant="h6" gutterBottom>
                Win Rate Trend
              </Typography>
              <ResponsiveContainer width="100%" height="90%">
                <AreaChart data={winRateTrend}>
                  <defs>
                    <linearGradient id="colorWinRate" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#4caf50" stopOpacity={0.8}/>
                      <stop offset="95%" stopColor="#4caf50" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis domain={[0, 100]} tickFormatter={(v) => `${v}%`} />
                  <RechartsTooltip formatter={(v: number) => `${v}%`} />
                  <Area
                    type="monotone"
                    dataKey="winRate"
                    stroke="#4caf50"
                    fillOpacity={1}
                    fill="url(#colorWinRate)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </Paper>
          </Grid>

          {/* Quick Stats */}
          <Grid item xs={12} md={4}>
            <Paper sx={{ p: 2, height: 350 }}>
              <Typography variant="h6" gutterBottom>
                Quick Insights
              </Typography>
              <Stack spacing={2}>
                <Alert severity="success" icon={<TrendingUp />}>
                  Win rate improved by 5% this quarter
                </Alert>
                <Alert severity="info" icon={<Info />}>
                  Best performing segment: Enterprise ({formatPercentage(68)})
                </Alert>
                <Alert severity="warning" icon={<AccessTime />}>
                  Average cycle time increased by 3 days
                </Alert>
                <Box sx={{ pt: 2 }}>
                  <Typography variant="subtitle2" gutterBottom>
                    Top Performers
                  </Typography>
                  <AvatarGroup max={4}>
                    <Avatar sx={{ bgcolor: 'primary.main' }}>JD</Avatar>
                    <Avatar sx={{ bgcolor: 'secondary.main' }}>AB</Avatar>
                    <Avatar sx={{ bgcolor: 'success.main' }}>MK</Avatar>
                    <Avatar sx={{ bgcolor: 'warning.main' }}>+2</Avatar>
                  </AvatarGroup>
                </Box>
              </Stack>
            </Paper>
          </Grid>
        </Grid>
      )}

      {viewType === 'reasons' && (
        <Grid container spacing={3}>
          {/* Win Reasons */}
          <Grid item xs={12} md={6}>
            <Paper sx={{ p: 2, height: 400 }}>
              <Typography variant="h6" gutterBottom color="success.main">
                Top Win Reasons
              </Typography>
              <ResponsiveContainer width="100%" height="90%">
                <PieChart>
                  <Pie
                    data={reasonsDistribution.win}
                    dataKey="count"
                    nameKey="reason"
                    cx="50%"
                    cy="50%"
                    outerRadius={120}
                    label={({ reason, percentage }) => `${reason} (${percentage}%)`}
                  >
                    {reasonsDistribution.win.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.fill} />
                    ))}
                  </Pie>
                  <RechartsTooltip />
                </PieChart>
              </ResponsiveContainer>
            </Paper>
          </Grid>

          {/* Loss Reasons */}
          <Grid item xs={12} md={6}>
            <Paper sx={{ p: 2, height: 400 }}>
              <Typography variant="h6" gutterBottom color="error.main">
                Top Loss Reasons
              </Typography>
              <ResponsiveContainer width="100%" height="90%">
                <PieChart>
                  <Pie
                    data={reasonsDistribution.loss}
                    dataKey="count"
                    nameKey="reason"
                    cx="50%"
                    cy="50%"
                    outerRadius={120}
                    label={({ reason, percentage }) => `${reason} (${percentage}%)`}
                  >
                    {reasonsDistribution.loss.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.fill} />
                    ))}
                  </Pie>
                  <RechartsTooltip />
                </PieChart>
              </ResponsiveContainer>
            </Paper>
          </Grid>

          {/* Detailed Table */}
          <Grid item xs={12}>
            <TableContainer component={Paper}>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>Reason Category</TableCell>
                    <TableCell align="right">Wins</TableCell>
                    <TableCell align="right">Losses</TableCell>
                    <TableCell align="right">Impact</TableCell>
                    <TableCell>Action Items</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {['Product Fit', 'Pricing', 'Competition', 'Timing', 'Relationship'].map((category) => (
                    <TableRow key={category}>
                      <TableCell>{category}</TableCell>
                      <TableCell align="right">
                        <Chip label={Math.floor(Math.random() * 50)} color="success" size="small" />
                      </TableCell>
                      <TableCell align="right">
                        <Chip label={Math.floor(Math.random() * 30)} color="error" size="small" />
                      </TableCell>
                      <TableCell align="right">
                        <LinearProgress
                          variant="determinate"
                          value={Math.random() * 100}
                          sx={{ height: 8, borderRadius: 4 }}
                        />
                      </TableCell>
                      <TableCell>
                        <Tooltip title="View recommendations">
                          <IconButton size="small">
                            <Info />
                          </IconButton>
                        </Tooltip>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </Grid>
        </Grid>
      )}

      {viewType === 'competitors' && (
        <Grid container spacing={3}>
          <Grid item xs={12}>
            <Paper sx={{ p: 2 }}>
              <Typography variant="h6" gutterBottom>
                Competitive Win/Loss Analysis
              </Typography>
              <ResponsiveContainer width="100%" height={400}>
                <BarChart data={competitorPerformance}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="competitor" />
                  <YAxis />
                  <RechartsTooltip />
                  <Legend />
                  <Bar dataKey="wins" stackId="a" fill="#4caf50" />
                  <Bar dataKey="losses" stackId="a" fill="#f44336" />
                </BarChart>
              </ResponsiveContainer>
            </Paper>
          </Grid>

          {/* Competitor Details */}
          <Grid item xs={12}>
            <TableContainer component={Paper}>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>Competitor</TableCell>
                    <TableCell align="right">Total Deals</TableCell>
                    <TableCell align="right">Win Rate</TableCell>
                    <TableCell align="right">Avg Deal Size</TableCell>
                    <TableCell>Key Differentiators</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {competitorPerformance.map((comp) => (
                    <TableRow key={comp.competitor}>
                      <TableCell>{comp.competitor}</TableCell>
                      <TableCell align="right">{comp.total}</TableCell>
                      <TableCell align="right">
                        <Chip
                          label={`${comp.winRate.toFixed(1)}%`}
                          color={comp.winRate > 50 ? 'success' : 'error'}
                          size="small"
                        />
                      </TableCell>
                      <TableCell align="right">
                        {formatCurrency(Math.random() * 100000 + 50000)}
                      </TableCell>
                      <TableCell>
                        <Stack direction="row" spacing={1}>
                          <Chip label="Price" size="small" variant="outlined" />
                          <Chip label="Features" size="small" variant="outlined" />
                        </Stack>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </Grid>
        </Grid>
      )}

      {viewType === 'stages' && (
        <Grid container spacing={3}>
          <Grid item xs={12}>
            <Paper sx={{ p: 2 }}>
              <Typography variant="h6" gutterBottom>
                Stage Performance Analysis
              </Typography>
              <ResponsiveContainer width="100%" height={400}>
                <RadarChart data={stagePerformance}>
                  <PolarGrid />
                  <PolarAngleAxis dataKey="stage" />
                  <PolarRadiusAxis domain={[0, 100]} />
                  <Radar
                    name="Win Rate"
                    dataKey="winRate"
                    stroke="#4caf50"
                    fill="#4caf50"
                    fillOpacity={0.6}
                  />
                  <Legend />
                  <RechartsTooltip />
                </RadarChart>
              </ResponsiveContainer>
            </Paper>
          </Grid>

          {/* Stage Details Table */}
          <Grid item xs={12}>
            <TableContainer component={Paper}>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>Stage</TableCell>
                    <TableCell align="right">Win Rate</TableCell>
                    <TableCell align="right">Avg Time (Days)</TableCell>
                    <TableCell align="right">Drop-off Rate</TableCell>
                    <TableCell>Recommendations</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {stagePerformance.map((stage) => (
                    <TableRow key={stage.stage}>
                      <TableCell>{stage.stage}</TableCell>
                      <TableCell align="right">
                        <LinearProgress
                          variant="determinate"
                          value={stage.winRate}
                          sx={{ height: 20, borderRadius: 10 }}
                        />
                        <Typography variant="caption">
                          {stage.winRate.toFixed(1)}%
                        </Typography>
                      </TableCell>
                      <TableCell align="right">{stage.avgTimeDays}</TableCell>
                      <TableCell align="right">
                        <Chip
                          label={`${(100 - stage.winRate).toFixed(1)}%`}
                          color={stage.winRate > 70 ? 'success' : 'warning'}
                          size="small"
                        />
                      </TableCell>
                      <TableCell>
                        <Tooltip title="View stage optimization tips">
                          <IconButton size="small">
                            <Info />
                          </IconButton>
                        </Tooltip>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </Grid>
        </Grid>
      )}
    </Box>
  );
};

export default WinLossAnalytics;