import React, { useState } from 'react';
import {
  Box,
  Container,
  Tabs,
  Tab,
  Paper,
  Typography,
  Button,
  Grid,
  Card,
  CardContent,
  IconButton,
  Menu,
  MenuItem,
  Fab
} from '@mui/material';
import {
  Analytics,
  Dashboard,
  Assessment,
  Timeline,
  TrendingUp,
  Settings,
  Add,
  MoreVert,
  Refresh
} from '@mui/icons-material';
import { AnalyticsDashboard } from '../components/analytics/AnalyticsDashboard';
import { KpiDashboard } from '../components/kpi/KpiDashboard';
import { DashboardBuilder } from '../components/dashboard/DashboardBuilder';
import { useAnalyticsStore } from '../stores/analyticsStore';
import { useDashboardStore } from '../stores/dashboardStore';

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props;

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`analytics-tabpanel-${index}`}
      aria-labelledby={`analytics-tab-${index}`}
      {...other}
    >
      {value === index && <Box sx={{ pt: 3 }}>{children}</Box>}
    </div>
  );
}

function a11yProps(index: number) {
  return {
    id: `analytics-tab-${index}`,
    'aria-controls': `analytics-tabpanel-${index}`
  };
}

export const AnalyticsPage: React.FC = () => {
  const [currentTab, setCurrentTab] = useState(0);
  const [menuAnchor, setMenuAnchor] = useState<null | HTMLElement>(null);
  const [showDashboardBuilder, setShowDashboardBuilder] = useState(false);

  const { fetchMetrics, fetchRevenueTrend, fetchConversionFunnel } = useAnalyticsStore();
  const { dashboards, fetchDashboards } = useDashboardStore();

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setCurrentTab(newValue);
  };

  const handleRefreshAll = () => {
    switch (currentTab) {
      case 0:
        fetchMetrics();
        fetchRevenueTrend('monthly');
        fetchConversionFunnel();
        break;
      case 1:
        // Refresh KPI data
        break;
      case 2:
        fetchDashboards();
        break;
    }
    setMenuAnchor(null);
  };

  const handleMenuClick = (event: React.MouseEvent<HTMLElement>) => {
    setMenuAnchor(event.currentTarget);
  };

  const handleMenuClose = () => {
    setMenuAnchor(null);
  };

  const QuickStatsCards = () => (
    <Grid container spacing={3} mb={3}>
      <Grid item xs={12} sm={6} md={3}>
        <Card sx={{ bgcolor: 'primary.main', color: 'white' }}>
          <CardContent>
            <Box display="flex" alignItems="center" justifyContent="space-between">
              <Box>
                <Typography variant="h4" fontWeight="bold">
                  24.5K
                </Typography>
                <Typography variant="body2">
                  Total Revenue
                </Typography>
              </Box>
              <TrendingUp sx={{ fontSize: 40, opacity: 0.8 }} />
            </Box>
          </CardContent>
        </Card>
      </Grid>
      <Grid item xs={12} sm={6} md={3}>
        <Card sx={{ bgcolor: 'success.main', color: 'white' }}>
          <CardContent>
            <Box display="flex" alignItems="center" justifyContent="space-between">
              <Box>
                <Typography variant="h4" fontWeight="bold">
                  156
                </Typography>
                <Typography variant="body2">
                  Active KPIs
                </Typography>
              </Box>
              <Assessment sx={{ fontSize: 40, opacity: 0.8 }} />
            </Box>
          </CardContent>
        </Card>
      </Grid>
      <Grid item xs={12} sm={6} md={3}>
        <Card sx={{ bgcolor: 'info.main', color: 'white' }}>
          <CardContent>
            <Box display="flex" alignItems="center" justifyContent="space-between">
              <Box>
                <Typography variant="h4" fontWeight="bold">
                  12
                </Typography>
                <Typography variant="body2">
                  Dashboards
                </Typography>
              </Box>
              <Dashboard sx={{ fontSize: 40, opacity: 0.8 }} />
            </Box>
          </CardContent>
        </Card>
      </Grid>
      <Grid item xs={12} sm={6} md={3}>
        <Card sx={{ bgcolor: 'warning.main', color: 'white' }}>
          <CardContent>
            <Box display="flex" alignItems="center" justifyContent="space-between">
              <Box>
                <Typography variant="h4" fontWeight="bold">
                  89%
                </Typography>
                <Typography variant="body2">
                  Target Achievement
                </Typography>
              </Box>
              <Timeline sx={{ fontSize: 40, opacity: 0.8 }} />
            </Box>
          </CardContent>
        </Card>
      </Grid>
    </Grid>
  );

  const PageHeader = () => (
    <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
      <Box>
        <Typography variant="h3" fontWeight="bold" gutterBottom>
          Analytics & Insights
        </Typography>
        <Typography variant="h6" color="textSecondary">
          Monitor your business performance and make data-driven decisions
        </Typography>
      </Box>
      <Box display="flex" gap={1}>
        <Button
          variant="outlined"
          startIcon={<Refresh />}
          onClick={handleRefreshAll}
        >
          Refresh
        </Button>
        <IconButton onClick={handleMenuClick}>
          <MoreVert />
        </IconButton>
      </Box>
    </Box>
  );

  if (showDashboardBuilder) {
    return (
      <Container maxWidth="xl">
        <DashboardBuilder
          onSave={() => setShowDashboardBuilder(false)}
          onCancel={() => setShowDashboardBuilder(false)}
        />
      </Container>
    );
  }

  return (
    <Container maxWidth="xl">
      <Box py={3}>
        <PageHeader />

        <QuickStatsCards />

        <Paper sx={{ width: '100%' }}>
          <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
            <Tabs value={currentTab} onChange={handleTabChange} aria-label="analytics tabs">
              <Tab
                icon={<Analytics />}
                label="Analytics Overview"
                {...a11yProps(0)}
                sx={{ minHeight: 72 }}
              />
              <Tab
                icon={<Assessment />}
                label="KPI Dashboard"
                {...a11yProps(1)}
                sx={{ minHeight: 72 }}
              />
              <Tab
                icon={<Dashboard />}
                label="Custom Dashboards"
                {...a11yProps(2)}
                sx={{ minHeight: 72 }}
              />
            </Tabs>
          </Box>

          <TabPanel value={currentTab} index={0}>
            <AnalyticsDashboard />
          </TabPanel>

          <TabPanel value={currentTab} index={1}>
            <KpiDashboard />
          </TabPanel>

          <TabPanel value={currentTab} index={2}>
            <Box>
              {dashboards.length > 0 ? (
                <Grid container spacing={3}>
                  {dashboards.map((dashboard) => (
                    <Grid item xs={12} sm={6} md={4} key={dashboard.id}>
                      <Card
                        sx={{
                          cursor: 'pointer',
                          transition: 'transform 0.2s',
                          '&:hover': {
                            transform: 'translateY(-4px)',
                            boxShadow: 4
                          }
                        }}
                      >
                        <CardContent>
                          <Typography variant="h6" gutterBottom>
                            {dashboard.name}
                          </Typography>
                          <Typography variant="body2" color="textSecondary" paragraph>
                            {dashboard.description || 'No description available'}
                          </Typography>
                          <Box display="flex" justifyContent="space-between" alignItems="center">
                            <Typography variant="caption" color="textSecondary">
                              {dashboard.widgets?.length || 0} widgets
                            </Typography>
                            <Button size="small">
                              View Dashboard
                            </Button>
                          </Box>
                        </CardContent>
                      </Card>
                    </Grid>
                  ))}
                </Grid>
              ) : (
                <Box
                  display="flex"
                  flexDirection="column"
                  alignItems="center"
                  justifyContent="center"
                  minHeight={400}
                  textAlign="center"
                >
                  <Dashboard sx={{ fontSize: 64, color: 'grey.300', mb: 2 }} />
                  <Typography variant="h5" color="textSecondary" gutterBottom>
                    No Custom Dashboards
                  </Typography>
                  <Typography variant="body1" color="textSecondary" mb={3}>
                    Create your first custom dashboard to organize your metrics and KPIs
                  </Typography>
                  <Button
                    variant="contained"
                    size="large"
                    startIcon={<Add />}
                    onClick={() => setShowDashboardBuilder(true)}
                  >
                    Create Dashboard
                  </Button>
                </Box>
              )}
            </Box>
          </TabPanel>
        </Paper>

        {/* Floating Action Button for Dashboard Builder */}
        {currentTab === 2 && dashboards.length > 0 && (
          <Fab
            color="primary"
            aria-label="add dashboard"
            sx={{ position: 'fixed', bottom: 16, right: 16 }}
            onClick={() => setShowDashboardBuilder(true)}
          >
            <Add />
          </Fab>
        )}

        {/* Action Menu */}
        <Menu
          anchorEl={menuAnchor}
          open={Boolean(menuAnchor)}
          onClose={handleMenuClose}
        >
          <MenuItem onClick={handleRefreshAll}>
            <Refresh sx={{ mr: 1 }} />
            Refresh Data
          </MenuItem>
          <MenuItem onClick={() => console.log('Export analytics')}>
            Export Analytics
          </MenuItem>
          <MenuItem onClick={() => console.log('Schedule reports')}>
            Schedule Reports
          </MenuItem>
          <MenuItem onClick={() => console.log('Settings')}>
            <Settings sx={{ mr: 1 }} />
            Analytics Settings
          </MenuItem>
        </Menu>
      </Box>
    </Container>
  );
};