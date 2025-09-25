import React, { useState, useEffect } from 'react';
import {
  Box,
  Grid,
  Paper,
  Typography,
  Button,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Card,
  CardContent,
  CardActions,
  Chip,
  Menu,
  Alert,
  Divider,
  Switch,
  FormControlLabel
} from '@mui/material';
import {
  Add,
  Edit,
  Delete,
  Save,
  Cancel,
  DragIndicator,
  Settings,
  Visibility,
  MoreVert,
  Dashboard,
  Assessment,
  BarChart,
  PieChart,
  ShowChart,
  TableChart
} from '@mui/icons-material';
import { useDashboardStore } from '../../stores/dashboardStore';

interface WidgetType {
  id: string;
  name: string;
  icon: React.ReactNode;
  category: string;
  description: string;
}

interface DashboardBuilderProps {
  dashboardId?: number;
  onSave?: (dashboardId: number) => void;
  onCancel?: () => void;
}

const WIDGET_TYPES: WidgetType[] = [
  { id: 'metrics_card', name: 'Metrics Card', icon: <Assessment />, category: 'Analytics', description: 'Display key metrics with trends' },
  { id: 'revenue_chart', name: 'Revenue Chart', icon: <ShowChart />, category: 'Charts', description: 'Line chart showing revenue trends' },
  { id: 'conversion_funnel', name: 'Conversion Funnel', icon: <BarChart />, category: 'Analytics', description: 'Conversion funnel visualization' },
  { id: 'kpi_card', name: 'KPI Card', icon: <Dashboard />, category: 'KPI', description: 'Key Performance Indicator display' },
  { id: 'pie_chart', name: 'Pie Chart', icon: <PieChart />, category: 'Charts', description: 'Pie chart for data distribution' },
  { id: 'data_table', name: 'Data Table', icon: <TableChart />, category: 'Data', description: 'Tabular data display' }
];

export const DashboardBuilder: React.FC<DashboardBuilderProps> = ({
  dashboardId,
  onSave,
  onCancel
}) => {
  const {
    currentDashboard,
    widgets,
    loading,
    error,
    selectDashboard,
    createDashboard,
    updateDashboard,
    addWidget,
    updateWidget,
    deleteWidget,
    clearError
  } = useDashboardStore();

  const [isEditing, setIsEditing] = useState(!dashboardId);
  const [dashboardName, setDashboardName] = useState('');
  const [dashboardDescription, setDashboardDescription] = useState('');
  const [isPublic, setIsPublic] = useState(false);
  const [widgetDialogOpen, setWidgetDialogOpen] = useState(false);
  const [selectedWidgetType, setSelectedWidgetType] = useState<string>('');
  const [widgetMenuAnchor, setWidgetMenuAnchor] = useState<null | HTMLElement>(null);
  const [selectedWidget, setSelectedWidget] = useState<any>(null);

  useEffect(() => {
    if (dashboardId) {
      selectDashboard(dashboardId);
    }
  }, [dashboardId]);

  useEffect(() => {
    if (currentDashboard) {
      setDashboardName(currentDashboard.name);
      setDashboardDescription(currentDashboard.description || '');
      setIsPublic(currentDashboard.is_public || false);
    }
  }, [currentDashboard]);

  const handleSaveDashboard = async () => {
    try {
      const dashboardData = {
        name: dashboardName,
        description: dashboardDescription,
        is_public: isPublic,
        layout: { columns: 12, rows: 'auto' },
        settings: {}
      };

      let savedDashboardId = dashboardId;

      if (dashboardId) {
        await updateDashboard(dashboardId, dashboardData);
      } else {
        const newDashboard = await createDashboard(dashboardData);
        savedDashboardId = newDashboard.id;
      }

      setIsEditing(false);
      onSave?.(savedDashboardId!);
    } catch (error) {
      console.error('Error saving dashboard:', error);
    }
  };

  const handleAddWidget = async () => {
    if (!selectedWidgetType || !currentDashboard) return;

    const widgetType = WIDGET_TYPES.find(w => w.id === selectedWidgetType);
    if (!widgetType) return;

    const newWidget = {
      widget_type: selectedWidgetType,
      title: widgetType.name,
      position_x: 0,
      position_y: 0,
      width: 4,
      height: 3,
      config: getDefaultWidgetConfig(selectedWidgetType),
      is_visible: true
    };

    try {
      await addWidget(currentDashboard.id, newWidget);
      setWidgetDialogOpen(false);
      setSelectedWidgetType('');
    } catch (error) {
      console.error('Error adding widget:', error);
    }
  };

  const getDefaultWidgetConfig = (type: string) => {
    switch (type) {
      case 'metrics_card':
        return {
          metric: 'total_revenue',
          unit: '$',
          format: 'currency',
          showTrend: true
        };
      case 'revenue_chart':
        return {
          period: 'monthly',
          showComparison: true,
          chartType: 'line'
        };
      case 'conversion_funnel':
        return {
          stages: ['lead', 'opportunity', 'proposal', 'won'],
          showPercentages: true
        };
      case 'kpi_card':
        return {
          kpiId: null,
          showTarget: true,
          showTrend: true
        };
      default:
        return {};
    }
  };

  const handleWidgetMenuClick = (event: React.MouseEvent<HTMLElement>, widget: any) => {
    setWidgetMenuAnchor(event.currentTarget);
    setSelectedWidget(widget);
  };

  const handleWidgetMenuClose = () => {
    setWidgetMenuAnchor(null);
    setSelectedWidget(null);
  };

  const handleDeleteWidget = async () => {
    if (!selectedWidget) return;

    try {
      await deleteWidget(selectedWidget.id);
      handleWidgetMenuClose();
    } catch (error) {
      console.error('Error deleting widget:', error);
    }
  };

  const renderWidget = (widget: any) => {
    const widgetType = WIDGET_TYPES.find(w => w.id === widget.widget_type);

    return (
      <Grid item xs={widget.width || 4} key={widget.id}>
        <Card
          sx={{
            height: `${(widget.height || 3) * 100}px`,
            position: 'relative',
            '&:hover .widget-actions': {
              opacity: 1
            }
          }}
        >
          <CardContent>
            <Box display="flex" alignItems="center" justifyContent="space-between" mb={1}>
              <Typography variant="h6" component="div">
                {widget.title}
              </Typography>
              <Box
                className="widget-actions"
                sx={{ opacity: 0, transition: 'opacity 0.3s' }}
              >
                <IconButton size="small">
                  <DragIndicator />
                </IconButton>
                <IconButton
                  size="small"
                  onClick={(e) => handleWidgetMenuClick(e, widget)}
                >
                  <MoreVert />
                </IconButton>
              </Box>
            </Box>

            <Box
              display="flex"
              alignItems="center"
              justifyContent="center"
              height="80%"
              bgcolor="grey.50"
              borderRadius={1}
            >
              {widgetType?.icon}
              <Typography variant="body2" color="textSecondary" ml={1}>
                {widgetType?.name || widget.widget_type}
              </Typography>
            </Box>
          </CardContent>
        </Card>
      </Grid>
    );
  };

  return (
    <Box>
      {error && (
        <Alert severity="error" onClose={clearError} sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      {/* Dashboard Header */}
      <Box mb={3}>
        {isEditing ? (
          <Box>
            <TextField
              fullWidth
              label="Dashboard Name"
              value={dashboardName}
              onChange={(e) => setDashboardName(e.target.value)}
              margin="normal"
              required
            />
            <TextField
              fullWidth
              label="Description"
              value={dashboardDescription}
              onChange={(e) => setDashboardDescription(e.target.value)}
              margin="normal"
              multiline
              rows={2}
            />
            <FormControlLabel
              control={
                <Switch
                  checked={isPublic}
                  onChange={(e) => setIsPublic(e.target.checked)}
                />
              }
              label="Make dashboard public"
            />
            <Box mt={2}>
              <Button
                variant="contained"
                onClick={handleSaveDashboard}
                startIcon={<Save />}
                sx={{ mr: 1 }}
                disabled={!dashboardName.trim()}
              >
                Save Dashboard
              </Button>
              <Button
                variant="outlined"
                onClick={() => {
                  setIsEditing(false);
                  onCancel?.();
                }}
                startIcon={<Cancel />}
              >
                Cancel
              </Button>
            </Box>
          </Box>
        ) : (
          <Box display="flex" justifyContent="space-between" alignItems="center">
            <Box>
              <Typography variant="h4" fontWeight="bold">
                {currentDashboard?.name || 'Dashboard'}
              </Typography>
              {currentDashboard?.description && (
                <Typography variant="body1" color="textSecondary">
                  {currentDashboard.description}
                </Typography>
              )}
            </Box>
            <Box>
              <Button
                startIcon={<Edit />}
                onClick={() => setIsEditing(true)}
                sx={{ mr: 1 }}
              >
                Edit
              </Button>
              <Button
                variant="contained"
                startIcon={<Add />}
                onClick={() => setWidgetDialogOpen(true)}
              >
                Add Widget
              </Button>
            </Box>
          </Box>
        )}
      </Box>

      {/* Dashboard Content */}
      {currentDashboard && !isEditing && (
        <Paper sx={{ p: 2 }}>
          {widgets.length > 0 ? (
            <Grid container spacing={3}>
              {widgets.map(renderWidget)}
            </Grid>
          ) : (
            <Box
              display="flex"
              flexDirection="column"
              alignItems="center"
              justifyContent="center"
              minHeight={300}
              textAlign="center"
            >
              <Dashboard sx={{ fontSize: 64, color: 'grey.300', mb: 2 }} />
              <Typography variant="h6" color="textSecondary" gutterBottom>
                No widgets added yet
              </Typography>
              <Typography variant="body2" color="textSecondary" mb={2}>
                Add your first widget to get started with your dashboard
              </Typography>
              <Button
                variant="contained"
                startIcon={<Add />}
                onClick={() => setWidgetDialogOpen(true)}
              >
                Add Widget
              </Button>
            </Box>
          )}
        </Paper>
      )}

      {/* Widget Selection Dialog */}
      <Dialog
        open={widgetDialogOpen}
        onClose={() => setWidgetDialogOpen(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>Add Widget</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="textSecondary" gutterBottom>
            Choose a widget type to add to your dashboard
          </Typography>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            {WIDGET_TYPES.map((widgetType) => (
              <Grid item xs={12} sm={6} md={4} key={widgetType.id}>
                <Card
                  sx={{
                    cursor: 'pointer',
                    border: selectedWidgetType === widgetType.id ? '2px solid' : '1px solid',
                    borderColor: selectedWidgetType === widgetType.id ? 'primary.main' : 'divider',
                    '&:hover': {
                      borderColor: 'primary.main'
                    }
                  }}
                  onClick={() => setSelectedWidgetType(widgetType.id)}
                >
                  <CardContent sx={{ textAlign: 'center' }}>
                    <Box mb={1}>{widgetType.icon}</Box>
                    <Typography variant="subtitle2" gutterBottom>
                      {widgetType.name}
                    </Typography>
                    <Chip label={widgetType.category} size="small" sx={{ mb: 1 }} />
                    <Typography variant="caption" display="block" color="textSecondary">
                      {widgetType.description}
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
            ))}
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setWidgetDialogOpen(false)}>Cancel</Button>
          <Button
            variant="contained"
            onClick={handleAddWidget}
            disabled={!selectedWidgetType}
          >
            Add Widget
          </Button>
        </DialogActions>
      </Dialog>

      {/* Widget Context Menu */}
      <Menu
        anchorEl={widgetMenuAnchor}
        open={Boolean(widgetMenuAnchor)}
        onClose={handleWidgetMenuClose}
      >
        <MenuItem onClick={() => console.log('Edit widget', selectedWidget)}>
          <Edit sx={{ mr: 1 }} /> Edit Widget
        </MenuItem>
        <MenuItem onClick={() => console.log('Duplicate widget', selectedWidget)}>
          <Settings sx={{ mr: 1 }} /> Configure
        </MenuItem>
        <Divider />
        <MenuItem onClick={handleDeleteWidget} sx={{ color: 'error.main' }}>
          <Delete sx={{ mr: 1 }} /> Delete Widget
        </MenuItem>
      </Menu>
    </Box>
  );
};