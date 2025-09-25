import React, { useEffect, useState } from 'react';
import {
  Grid,
  Box,
  Typography,
  Card,
  CardContent,
  Button,
  ToggleButton,
  ToggleButtonGroup,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  TextField,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Alert,
  CircularProgress
} from '@mui/material';
import {
  Add,
  Refresh,
  FilterList,
  Settings,
  Assessment,
  CalendarToday
} from '@mui/icons-material';
import { useDashboardStore } from '../../stores/dashboardStore';
import { KpiCard } from './KpiCard';

interface KpiFilters {
  category: string;
  status: string;
  period: string;
  search: string;
}

export const KpiDashboard: React.FC = () => {
  const {
    kpis,
    kpiDashboard,
    loading,
    error,
    fetchKpis,
    fetchKpiDashboard,
    calculateKpi,
    fetchKpiTrends,
    clearError
  } = useDashboardStore();

  const [filters, setFilters] = useState<KpiFilters>({
    category: 'all',
    status: 'all',
    period: 'monthly',
    search: ''
  });

  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [filterDialogOpen, setFilterDialogOpen] = useState(false);
  const [refreshing, setRefreshing] = useState<number | null>(null);

  useEffect(() => {
    fetchKpis();
    fetchKpiDashboard();
  }, []);

  const handleRefreshKpi = async (kpiId: number) => {
    setRefreshing(kpiId);
    try {
      await calculateKpi(kpiId);
      await fetchKpiDashboard(); // Refresh to get updated values
    } finally {
      setRefreshing(null);
    }
  };

  const handleViewTrends = (kpiId: number) => {
    fetchKpiTrends(kpiId, filters.period, 30);
    // Navigate to trends view or open trends dialog
  };

  const handleManageAlerts = (kpiId: number) => {
    // Open alerts management dialog
    console.log('Manage alerts for KPI:', kpiId);
  };

  const handleConfigure = (kpiId: number) => {
    // Open KPI configuration dialog
    console.log('Configure KPI:', kpiId);
  };

  const filteredKpis = kpis.filter(kpi => {
    if (filters.category !== 'all' && kpi.category !== filters.category) return false;
    if (filters.status !== 'all' && kpi.status !== filters.status) return false;
    if (filters.search && !kpi.name.toLowerCase().includes(filters.search.toLowerCase())) return false;
    return true;
  });

  const getKpiSnapshot = (kpiId: number) => {
    if (!kpiDashboard?.snapshots) return null;
    return kpiDashboard.snapshots.find((s: any) => s.kpi_id === kpiId);
  };

  const getKpiTrend = (kpiId: number) => {
    const snapshot = getKpiSnapshot(kpiId);
    if (!snapshot || !snapshot.previous_value) return null;

    const current = snapshot.value;
    const previous = snapshot.previous_value;
    const change = ((current - previous) / previous) * 100;

    return {
      direction: change > 0 ? 'up' : change < 0 ? 'down' : 'stable' as const,
      percentage: Math.abs(change),
      period: 'previous period'
    };
  };

  const getKpiAlerts = (kpiId: number) => {
    if (!kpiDashboard?.alerts) return [];
    return kpiDashboard.alerts.filter((alert: any) => alert.kpi_id === kpiId);
  };

  const getKpiColor = (kpi: any, snapshot: any) => {
    if (!snapshot) return 'primary';

    const alerts = getKpiAlerts(kpi.id);
    if (alerts.some((a: any) => a.severity === 'critical')) return 'error';
    if (alerts.some((a: any) => a.severity === 'warning')) return 'warning';

    if (kpi.target_value) {
      const progress = (snapshot.value / kpi.target_value) * 100;
      if (progress >= 90) return 'success';
      if (progress >= 70) return 'info';
      if (progress >= 50) return 'warning';
      return 'error';
    }

    return 'primary';
  };

  if (loading && !kpis.length) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight={400}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h4" fontWeight="bold">
          KPI Dashboard
        </Typography>
        <Box display="flex" gap={1}>
          <Button
            startIcon={<Add />}
            variant="contained"
            onClick={() => console.log('Create KPI')}
          >
            New KPI
          </Button>
          <IconButton onClick={() => setFilterDialogOpen(true)}>
            <FilterList />
          </IconButton>
          <IconButton onClick={() => fetchKpiDashboard()}>
            <Refresh />
          </IconButton>
        </Box>
      </Box>

      {error && (
        <Alert severity="error" onClose={clearError} sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      {/* Summary Cards */}
      {kpiDashboard?.summary && (
        <Grid container spacing={3} mb={3}>
          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent>
                <Box display="flex" alignItems="center">
                  <Assessment color="primary" sx={{ mr: 2 }} />
                  <Box>
                    <Typography variant="h5" fontWeight="bold">
                      {kpiDashboard.summary.total_kpis}
                    </Typography>
                    <Typography variant="body2" color="textSecondary">
                      Total KPIs
                    </Typography>
                  </Box>
                </Box>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent>
                <Box display="flex" alignItems="center">
                  <Settings color="success" sx={{ mr: 2 }} />
                  <Box>
                    <Typography variant="h5" fontWeight="bold" color="success.main">
                      {kpiDashboard.summary.on_target}
                    </Typography>
                    <Typography variant="body2" color="textSecondary">
                      On Target
                    </Typography>
                  </Box>
                </Box>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent>
                <Box display="flex" alignItems="center">
                  <Assessment color="warning" sx={{ mr: 2 }} />
                  <Box>
                    <Typography variant="h5" fontWeight="bold" color="warning.main">
                      {kpiDashboard.summary.at_risk}
                    </Typography>
                    <Typography variant="body2" color="textSecondary">
                      At Risk
                    </Typography>
                  </Box>
                </Box>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent>
                <Box display="flex" alignItems="center">
                  <CalendarToday color="info" sx={{ mr: 2 }} />
                  <Box>
                    <Typography variant="h5" fontWeight="bold" color="info.main">
                      {kpiDashboard.summary.last_updated ?
                        new Date(kpiDashboard.summary.last_updated).toLocaleDateString() :
                        'N/A'
                      }
                    </Typography>
                    <Typography variant="body2" color="textSecondary">
                      Last Updated
                    </Typography>
                  </Box>
                </Box>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      )}

      {/* Filters */}
      <Box display="flex" gap={2} mb={3} alignItems="center">
        <ToggleButtonGroup
          value={viewMode}
          exclusive
          onChange={(_, value) => value && setViewMode(value)}
          size="small"
        >
          <ToggleButton value="grid">Grid</ToggleButton>
          <ToggleButton value="list">List</ToggleButton>
        </ToggleButtonGroup>

        <FormControl size="small" sx={{ minWidth: 120 }}>
          <InputLabel>Category</InputLabel>
          <Select
            value={filters.category}
            label="Category"
            onChange={(e) => setFilters({ ...filters, category: e.target.value })}
          >
            <MenuItem value="all">All Categories</MenuItem>
            <MenuItem value="sales">Sales</MenuItem>
            <MenuItem value="marketing">Marketing</MenuItem>
            <MenuItem value="service">Service</MenuItem>
            <MenuItem value="financial">Financial</MenuItem>
          </Select>
        </FormControl>

        <FormControl size="small" sx={{ minWidth: 120 }}>
          <InputLabel>Status</InputLabel>
          <Select
            value={filters.status}
            label="Status"
            onChange={(e) => setFilters({ ...filters, status: e.target.value })}
          >
            <MenuItem value="all">All Status</MenuItem>
            <MenuItem value="active">Active</MenuItem>
            <MenuItem value="inactive">Inactive</MenuItem>
            <MenuItem value="archived">Archived</MenuItem>
          </Select>
        </FormControl>

        <TextField
          size="small"
          placeholder="Search KPIs..."
          value={filters.search}
          onChange={(e) => setFilters({ ...filters, search: e.target.value })}
          sx={{ flexGrow: 1, maxWidth: 300 }}
        />
      </Box>

      {/* KPI Grid */}
      <Grid container spacing={3}>
        {filteredKpis.map((kpi) => {
          const snapshot = getKpiSnapshot(kpi.id);
          const trend = getKpiTrend(kpi.id);
          const alerts = getKpiAlerts(kpi.id);
          const color = getKpiColor(kpi, snapshot);

          return (
            <Grid
              item
              xs={12}
              sm={viewMode === 'grid' ? 6 : 12}
              md={viewMode === 'grid' ? 4 : 12}
              lg={viewMode === 'grid' ? 3 : 12}
              key={kpi.id}
            >
              <Box position="relative">
                {refreshing === kpi.id && (
                  <Box
                    position="absolute"
                    top="50%"
                    left="50%"
                    zIndex={2}
                    sx={{ transform: 'translate(-50%, -50%)' }}
                  >
                    <CircularProgress size={24} />
                  </Box>
                )}
                <KpiCard
                  id={kpi.id}
                  name={kpi.name}
                  description={kpi.description}
                  currentValue={snapshot?.value || 0}
                  targetValue={kpi.target_value}
                  unit={kpi.unit}
                  format={kpi.format}
                  trend={trend}
                  alerts={alerts}
                  color={color}
                  size={viewMode === 'grid' ? 'medium' : 'small'}
                  onViewDetails={(id) => console.log('View details', id)}
                  onViewTrends={handleViewTrends}
                  onManageAlerts={handleManageAlerts}
                  onConfigure={handleConfigure}
                />
                <Box position="absolute" top={8} left={8}>
                  <IconButton
                    size="small"
                    onClick={() => handleRefreshKpi(kpi.id)}
                    disabled={refreshing === kpi.id}
                  >
                    <Refresh fontSize="small" />
                  </IconButton>
                </Box>
              </Box>
            </Grid>
          );
        })}
      </Grid>

      {/* Filter Dialog */}
      <Dialog open={filterDialogOpen} onClose={() => setFilterDialogOpen(false)}>
        <DialogTitle>Advanced Filters</DialogTitle>
        <DialogContent>
          <Box display="flex" flexDirection="column" gap={2} pt={1}>
            <FormControl fullWidth>
              <InputLabel>Period</InputLabel>
              <Select
                value={filters.period}
                label="Period"
                onChange={(e) => setFilters({ ...filters, period: e.target.value })}
              >
                <MenuItem value="daily">Daily</MenuItem>
                <MenuItem value="weekly">Weekly</MenuItem>
                <MenuItem value="monthly">Monthly</MenuItem>
                <MenuItem value="quarterly">Quarterly</MenuItem>
                <MenuItem value="yearly">Yearly</MenuItem>
              </Select>
            </FormControl>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setFilterDialogOpen(false)}>Cancel</Button>
          <Button variant="contained" onClick={() => setFilterDialogOpen(false)}>
            Apply Filters
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};