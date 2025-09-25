import React, { useState, useEffect } from 'react';
import {
  Box,
  Container,
  Typography,
  Button,
  Grid,
  Card,
  CardContent,
  CardActions,
  IconButton,
  Menu,
  MenuItem,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Alert,
  Fab,
  Divider,
  Switch,
  FormControlLabel
} from '@mui/material';
import {
  Add,
  MoreVert,
  Edit,
  Delete,
  ContentCopy,
  Share,
  Visibility,
  Settings,
  Star,
  StarBorder,
  Public,
  Lock,
  Dashboard as DashboardIcon
} from '@mui/icons-material';
import { DashboardBuilder } from '../components/dashboard/DashboardBuilder';
import { WidgetLibrary } from '../components/dashboard/WidgetLibrary';
import { useDashboardStore } from '../stores/dashboardStore';

export const DashboardPage: React.FC = () => {
  const {
    dashboards,
    currentDashboard,
    loading,
    error,
    fetchDashboards,
    selectDashboard,
    deleteDashboard,
    cloneDashboard,
    setDefaultDashboard,
    clearError
  } = useDashboardStore();

  const [view, setView] = useState<'list' | 'builder' | 'viewer' | 'widgets'>('list');
  const [selectedDashboardId, setSelectedDashboardId] = useState<number | null>(null);
  const [menuAnchor, setMenuAnchor] = useState<null | HTMLElement>(null);
  const [menuDashboard, setMenuDashboard] = useState<any>(null);
  const [deleteDialog, setDeleteDialog] = useState(false);
  const [showOnlyPublic, setShowOnlyPublic] = useState(false);

  useEffect(() => {
    fetchDashboards();
  }, []);

  const filteredDashboards = dashboards.filter(dashboard => {
    if (showOnlyPublic) {
      return dashboard.is_public;
    }
    return true;
  });

  const handleMenuClick = (event: React.MouseEvent<HTMLElement>, dashboard: any) => {
    setMenuAnchor(event.currentTarget);
    setMenuDashboard(dashboard);
    event.stopPropagation();
  };

  const handleMenuClose = () => {
    setMenuAnchor(null);
    setMenuDashboard(null);
  };

  const handleViewDashboard = (dashboard: any) => {
    setSelectedDashboardId(dashboard.id);
    setView('builder'); // Use builder as viewer for now
    selectDashboard(dashboard.id);
    handleMenuClose();
  };

  const handleEditDashboard = (dashboard: any) => {
    setSelectedDashboardId(dashboard.id);
    setView('builder');
    selectDashboard(dashboard.id);
    handleMenuClose();
  };

  const handleCloneDashboard = async (dashboard: any) => {
    try {
      await cloneDashboard(dashboard.id, `${dashboard.name} (Copy)`);
      await fetchDashboards();
    } catch (error) {
      console.error('Clone error:', error);
    }
    handleMenuClose();
  };

  const handleSetDefault = async (dashboard: any) => {
    try {
      await setDefaultDashboard(dashboard.id);
      await fetchDashboards();
    } catch (error) {
      console.error('Set default error:', error);
    }
    handleMenuClose();
  };

  const handleDeleteDashboard = async () => {
    if (!menuDashboard) return;

    try {
      await deleteDashboard(menuDashboard.id);
      await fetchDashboards();
      setDeleteDialog(false);
    } catch (error) {
      console.error('Delete error:', error);
    }
    handleMenuClose();
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString();
  };

  const getWidgetCount = (dashboard: any) => {
    return dashboard.widgets?.length || 0;
  };

  if (view === 'builder') {
    return (
      <Container maxWidth="xl">
        <Box py={2}>
          <Button
            onClick={() => {
              setView('list');
              setSelectedDashboardId(null);
            }}
            sx={{ mb: 2 }}
          >
            ← Back to Dashboards
          </Button>
          <DashboardBuilder
            dashboardId={selectedDashboardId || undefined}
            onSave={() => {
              setView('list');
              setSelectedDashboardId(null);
              fetchDashboards();
            }}
            onCancel={() => {
              setView('list');
              setSelectedDashboardId(null);
            }}
          />
        </Box>
      </Container>
    );
  }

  if (view === 'widgets') {
    return (
      <Container maxWidth="xl">
        <Box py={2}>
          <Button
            onClick={() => setView('list')}
            sx={{ mb: 2 }}
          >
            ← Back to Dashboards
          </Button>
          <Typography variant="h4" fontWeight="bold" gutterBottom>
            Widget Library
          </Typography>
          <WidgetLibrary
            onAddWidget={(template) => {
              console.log('Add widget template:', template);
              // Would typically open dashboard builder with this widget
            }}
            onPreviewWidget={(template) => {
              console.log('Preview widget:', template);
            }}
          />
        </Box>
      </Container>
    );
  }

  return (
    <Container maxWidth="xl">
      <Box py={3}>
        {error && (
          <Alert severity="error" onClose={clearError} sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        {/* Header */}
        <Box display="flex" justifyContent="space-between" alignItems="center" mb={4}>
          <Box>
            <Typography variant="h3" fontWeight="bold" gutterBottom>
              Custom Dashboards
            </Typography>
            <Typography variant="h6" color="textSecondary">
              Create and manage personalized dashboard views
            </Typography>
          </Box>
          <Box display="flex" gap={1}>
            <Button
              variant="outlined"
              onClick={() => setView('widgets')}
            >
              Widget Library
            </Button>
            <Button
              variant="contained"
              size="large"
              startIcon={<Add />}
              onClick={() => setView('builder')}
            >
              Create Dashboard
            </Button>
          </Box>
        </Box>

        {/* Filters */}
        <Box mb={3}>
          <FormControlLabel
            control={
              <Switch
                checked={showOnlyPublic}
                onChange={(e) => setShowOnlyPublic(e.target.checked)}
              />
            }
            label="Show only public dashboards"
          />
        </Box>

        {/* Dashboards Grid */}
        {filteredDashboards.length > 0 ? (
          <Grid container spacing={3}>
            {filteredDashboards.map((dashboard) => (
              <Grid item xs={12} sm={6} md={4} key={dashboard.id}>
                <Card
                  sx={{
                    height: '100%',
                    display: 'flex',
                    flexDirection: 'column',
                    cursor: 'pointer',
                    position: 'relative',
                    transition: 'transform 0.2s, box-shadow 0.2s',
                    '&:hover': {
                      transform: 'translateY(-4px)',
                      boxShadow: 4
                    },
                    ...(dashboard.is_default && {
                      border: '2px solid',
                      borderColor: 'primary.main'
                    })
                  }}
                  onClick={() => handleViewDashboard(dashboard)}
                >
                  {dashboard.is_default && (
                    <Chip
                      label="Default"
                      color="primary"
                      size="small"
                      sx={{
                        position: 'absolute',
                        top: 8,
                        left: 8,
                        zIndex: 1
                      }}
                    />
                  )}

                  <CardContent sx={{ flexGrow: 1, pt: dashboard.is_default ? 5 : undefined }}>
                    <Box display="flex" justifyContent="space-between" alignItems="flex-start" mb={1}>
                      <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
                        <DashboardIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
                        {dashboard.name}
                      </Typography>
                      <IconButton
                        size="small"
                        onClick={(e) => handleMenuClick(e, dashboard)}
                        sx={{ ml: 1 }}
                      >
                        <MoreVert />
                      </IconButton>
                    </Box>

                    <Typography variant="body2" color="textSecondary" paragraph>
                      {dashboard.description || 'No description available'}
                    </Typography>

                    <Box mb={2} display="flex" gap={1} flexWrap="wrap">
                      <Chip
                        label={dashboard.is_public ? 'Public' : 'Private'}
                        size="small"
                        icon={dashboard.is_public ? <Public /> : <Lock />}
                        color={dashboard.is_public ? 'success' : 'default'}
                        variant="outlined"
                      />
                      {getWidgetCount(dashboard) > 0 && (
                        <Chip
                          label={`${getWidgetCount(dashboard)} widgets`}
                          size="small"
                          variant="outlined"
                        />
                      )}
                    </Box>

                    <Box>
                      <Typography variant="caption" color="textSecondary" display="block">
                        Created: {formatDate(dashboard.created_at)}
                      </Typography>
                      <Typography variant="caption" color="textSecondary" display="block">
                        Modified: {formatDate(dashboard.updated_at)}
                      </Typography>
                    </Box>
                  </CardContent>

                  <CardActions sx={{ justifyContent: 'space-between', pt: 0 }}>
                    <Button
                      size="small"
                      startIcon={<Visibility />}
                      onClick={(e) => {
                        e.stopPropagation();
                        handleViewDashboard(dashboard);
                      }}
                    >
                      View
                    </Button>
                    <Button
                      size="small"
                      startIcon={<Edit />}
                      onClick={(e) => {
                        e.stopPropagation();
                        handleEditDashboard(dashboard);
                      }}
                    >
                      Edit
                    </Button>
                  </CardActions>
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
            <DashboardIcon sx={{ fontSize: 64, color: 'grey.300', mb: 2 }} />
            <Typography variant="h5" color="textSecondary" gutterBottom>
              {showOnlyPublic ? 'No Public Dashboards' : 'No Dashboards Created'}
            </Typography>
            <Typography variant="body1" color="textSecondary" mb={3}>
              {showOnlyPublic
                ? 'No public dashboards are available for viewing'
                : 'Create your first dashboard to organize your metrics and KPIs'
              }
            </Typography>
            <Button
              variant="contained"
              size="large"
              startIcon={<Add />}
              onClick={() => setView('builder')}
            >
              Create Dashboard
            </Button>
          </Box>
        )}

        {/* Floating Action Button */}
        {filteredDashboards.length > 0 && (
          <Fab
            color="primary"
            aria-label="add dashboard"
            sx={{ position: 'fixed', bottom: 16, right: 16 }}
            onClick={() => setView('builder')}
          >
            <Add />
          </Fab>
        )}

        {/* Context Menu */}
        <Menu
          anchorEl={menuAnchor}
          open={Boolean(menuAnchor)}
          onClose={handleMenuClose}
        >
          <MenuItem onClick={() => handleViewDashboard(menuDashboard)}>
            <Visibility sx={{ mr: 1 }} />
            View Dashboard
          </MenuItem>
          <MenuItem onClick={() => handleEditDashboard(menuDashboard)}>
            <Edit sx={{ mr: 1 }} />
            Edit Dashboard
          </MenuItem>
          <MenuItem onClick={() => handleCloneDashboard(menuDashboard)}>
            <ContentCopy sx={{ mr: 1 }} />
            Clone Dashboard
          </MenuItem>
          <Divider />
          <MenuItem onClick={() => handleSetDefault(menuDashboard)}>
            {menuDashboard?.is_default ? <Star sx={{ mr: 1 }} /> : <StarBorder sx={{ mr: 1 }} />}
            {menuDashboard?.is_default ? 'Remove Default' : 'Set as Default'}
          </MenuItem>
          <MenuItem onClick={() => console.log('Share dashboard')}>
            <Share sx={{ mr: 1 }} />
            Share Dashboard
          </MenuItem>
          <MenuItem onClick={() => console.log('Dashboard settings')}>
            <Settings sx={{ mr: 1 }} />
            Settings
          </MenuItem>
          <Divider />
          <MenuItem
            onClick={() => setDeleteDialog(true)}
            sx={{ color: 'error.main' }}
          >
            <Delete sx={{ mr: 1 }} />
            Delete Dashboard
          </MenuItem>
        </Menu>

        {/* Delete Confirmation Dialog */}
        <Dialog open={deleteDialog} onClose={() => setDeleteDialog(false)}>
          <DialogTitle>Delete Dashboard</DialogTitle>
          <DialogContent>
            <Typography>
              Are you sure you want to delete "{menuDashboard?.name}"? This action cannot be undone.
            </Typography>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setDeleteDialog(false)}>Cancel</Button>
            <Button onClick={handleDeleteDashboard} color="error" variant="contained">
              Delete
            </Button>
          </DialogActions>
        </Dialog>
      </Box>
    </Container>
  );
};