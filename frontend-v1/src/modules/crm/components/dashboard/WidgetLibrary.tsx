import React, { useState } from 'react';
import {
  Box,
  Grid,
  Card,
  CardContent,
  CardActions,
  Typography,
  Button,
  Chip,
  TextField,
  InputAdornment,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  IconButton,
  Tooltip
} from '@mui/material';
import {
  Search,
  Add,
  Preview,
  Assessment,
  BarChart,
  PieChart,
  ShowChart,
  TableChart,
  Dashboard,
  TrendingUp,
  Timeline,
  DonutLarge
} from '@mui/icons-material';

interface WidgetTemplate {
  id: string;
  name: string;
  description: string;
  category: string;
  icon: React.ReactNode;
  previewImage?: string;
  defaultConfig: any;
  requirements: string[];
  difficulty: 'Easy' | 'Medium' | 'Advanced';
  tags: string[];
}

interface WidgetLibraryProps {
  onAddWidget: (template: WidgetTemplate) => void;
  onPreviewWidget?: (template: WidgetTemplate) => void;
}

const WIDGET_TEMPLATES: WidgetTemplate[] = [
  {
    id: 'sales_metrics_card',
    name: 'Sales Metrics Card',
    description: 'Display key sales metrics with trend indicators and comparisons',
    category: 'Sales',
    icon: <Assessment />,
    defaultConfig: {
      metric: 'total_revenue',
      unit: '$',
      format: 'currency',
      showTrend: true,
      period: 'monthly'
    },
    requirements: ['Sales data access'],
    difficulty: 'Easy',
    tags: ['metrics', 'sales', 'revenue', 'trends']
  },
  {
    id: 'revenue_line_chart',
    name: 'Revenue Trend Chart',
    description: 'Line chart showing revenue trends over time with comparison periods',
    category: 'Charts',
    icon: <ShowChart />,
    defaultConfig: {
      chartType: 'line',
      period: 'monthly',
      showComparison: true,
      dataPoints: 12
    },
    requirements: ['Historical sales data'],
    difficulty: 'Medium',
    tags: ['chart', 'revenue', 'trends', 'comparison']
  },
  {
    id: 'lead_conversion_funnel',
    name: 'Lead Conversion Funnel',
    description: 'Visualize the conversion process from leads to customers',
    category: 'Analytics',
    icon: <BarChart />,
    defaultConfig: {
      stages: ['lead', 'qualified', 'opportunity', 'proposal', 'closed_won'],
      showPercentages: true,
      colorScheme: 'gradient'
    },
    requirements: ['Lead tracking data'],
    difficulty: 'Medium',
    tags: ['funnel', 'conversion', 'leads', 'analytics']
  },
  {
    id: 'kpi_dashboard_card',
    name: 'KPI Dashboard Card',
    description: 'Comprehensive KPI display with targets, alerts, and performance indicators',
    category: 'KPI',
    icon: <Dashboard />,
    defaultConfig: {
      kpiId: null,
      showTarget: true,
      showTrend: true,
      showAlerts: true,
      size: 'medium'
    },
    requirements: ['KPI definitions'],
    difficulty: 'Easy',
    tags: ['kpi', 'targets', 'performance', 'alerts']
  },
  {
    id: 'pipeline_distribution_pie',
    name: 'Pipeline Distribution',
    description: 'Pie chart showing distribution of opportunities across pipeline stages',
    category: 'Charts',
    icon: <PieChart />,
    defaultConfig: {
      chartType: 'pie',
      showLabels: true,
      showValues: true,
      colorScheme: 'material'
    },
    requirements: ['Pipeline data'],
    difficulty: 'Easy',
    tags: ['pie chart', 'pipeline', 'distribution', 'opportunities']
  },
  {
    id: 'activity_timeline',
    name: 'Activity Timeline',
    description: 'Timeline view of recent activities and interactions',
    category: 'Activity',
    icon: <Timeline />,
    defaultConfig: {
      maxItems: 20,
      timeRange: '7d',
      groupBy: 'date',
      showAvatars: true
    },
    requirements: ['Activity logs'],
    difficulty: 'Advanced',
    tags: ['timeline', 'activities', 'recent', 'interactions']
  },
  {
    id: 'top_accounts_table',
    name: 'Top Accounts Table',
    description: 'Table displaying top accounts by revenue, activity, or custom criteria',
    category: 'Data',
    icon: <TableChart />,
    defaultConfig: {
      sortBy: 'revenue',
      maxRows: 10,
      showThumbnails: true,
      columns: ['name', 'revenue', 'industry', 'last_activity']
    },
    requirements: ['Account data'],
    difficulty: 'Medium',
    tags: ['table', 'accounts', 'ranking', 'data']
  },
  {
    id: 'performance_gauge',
    name: 'Performance Gauge',
    description: 'Circular gauge displaying performance metrics against targets',
    category: 'Gauges',
    icon: <DonutLarge />,
    defaultConfig: {
      metric: 'quota_attainment',
      min: 0,
      max: 150,
      target: 100,
      unit: '%'
    },
    requirements: ['Performance data'],
    difficulty: 'Medium',
    tags: ['gauge', 'performance', 'quota', 'targets']
  }
];

export const WidgetLibrary: React.FC<WidgetLibraryProps> = ({
  onAddWidget,
  onPreviewWidget
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedDifficulty, setSelectedDifficulty] = useState('all');
  const [previewDialog, setPreviewDialog] = useState<WidgetTemplate | null>(null);

  const categories = ['all', ...Array.from(new Set(WIDGET_TEMPLATES.map(w => w.category)))];
  const difficulties = ['all', 'Easy', 'Medium', 'Advanced'];

  const filteredTemplates = WIDGET_TEMPLATES.filter(template => {
    const matchesSearch = template.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         template.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         template.tags.some(tag => tag.toLowerCase().includes(searchTerm.toLowerCase()));

    const matchesCategory = selectedCategory === 'all' || template.category === selectedCategory;
    const matchesDifficulty = selectedDifficulty === 'all' || template.difficulty === selectedDifficulty;

    return matchesSearch && matchesCategory && matchesDifficulty;
  });

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'Easy': return 'success';
      case 'Medium': return 'warning';
      case 'Advanced': return 'error';
      default: return 'default';
    }
  };

  const handlePreview = (template: WidgetTemplate) => {
    setPreviewDialog(template);
    onPreviewWidget?.(template);
  };

  const handleAdd = (template: WidgetTemplate) => {
    onAddWidget(template);
    setPreviewDialog(null);
  };

  return (
    <Box>
      {/* Filters */}
      <Box mb={3}>
        <Grid container spacing={2} alignItems="center">
          <Grid item xs={12} md={4}>
            <TextField
              fullWidth
              size="small"
              placeholder="Search widgets..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <Search />
                  </InputAdornment>
                )
              }}
            />
          </Grid>
          <Grid item xs={12} sm={6} md={4}>
            <FormControl fullWidth size="small">
              <InputLabel>Category</InputLabel>
              <Select
                value={selectedCategory}
                label="Category"
                onChange={(e) => setSelectedCategory(e.target.value)}
              >
                {categories.map(category => (
                  <MenuItem key={category} value={category}>
                    {category === 'all' ? 'All Categories' : category}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12} sm={6} md={4}>
            <FormControl fullWidth size="small">
              <InputLabel>Difficulty</InputLabel>
              <Select
                value={selectedDifficulty}
                label="Difficulty"
                onChange={(e) => setSelectedDifficulty(e.target.value)}
              >
                {difficulties.map(difficulty => (
                  <MenuItem key={difficulty} value={difficulty}>
                    {difficulty === 'all' ? 'All Difficulties' : difficulty}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
        </Grid>
      </Box>

      {/* Widget Grid */}
      <Grid container spacing={3}>
        {filteredTemplates.map((template) => (
          <Grid item xs={12} sm={6} md={4} lg={3} key={template.id}>
            <Card
              sx={{
                height: '100%',
                display: 'flex',
                flexDirection: 'column',
                transition: 'transform 0.2s, box-shadow 0.2s',
                '&:hover': {
                  transform: 'translateY(-4px)',
                  boxShadow: 4
                }
              }}
            >
              <CardContent sx={{ flexGrow: 1 }}>
                <Box display="flex" alignItems="center" mb={1}>
                  <Box
                    display="flex"
                    alignItems="center"
                    justifyContent="center"
                    width={40}
                    height={40}
                    bgcolor="primary.light"
                    borderRadius="50%"
                    mr={1}
                  >
                    {template.icon}
                  </Box>
                  <Typography variant="h6" component="div">
                    {template.name}
                  </Typography>
                </Box>

                <Typography variant="body2" color="textSecondary" paragraph>
                  {template.description}
                </Typography>

                <Box mb={2}>
                  <Chip
                    label={template.category}
                    size="small"
                    variant="outlined"
                    sx={{ mr: 1 }}
                  />
                  <Chip
                    label={template.difficulty}
                    size="small"
                    color={getDifficultyColor(template.difficulty) as any}
                  />
                </Box>

                {template.requirements.length > 0 && (
                  <Box>
                    <Typography variant="caption" color="textSecondary" display="block">
                      Requirements:
                    </Typography>
                    <Typography variant="body2" fontSize="0.75rem">
                      {template.requirements.join(', ')}
                    </Typography>
                  </Box>
                )}
              </CardContent>

              <CardActions sx={{ justifyContent: 'space-between', pt: 0 }}>
                <Box>
                  <Tooltip title="Preview widget">
                    <IconButton
                      size="small"
                      onClick={() => handlePreview(template)}
                    >
                      <Preview />
                    </IconButton>
                  </Tooltip>
                </Box>
                <Button
                  size="small"
                  variant="contained"
                  startIcon={<Add />}
                  onClick={() => handleAdd(template)}
                >
                  Add
                </Button>
              </CardActions>
            </Card>
          </Grid>
        ))}
      </Grid>

      {filteredTemplates.length === 0 && (
        <Box
          display="flex"
          flexDirection="column"
          alignItems="center"
          justifyContent="center"
          minHeight={200}
          textAlign="center"
        >
          <Search sx={{ fontSize: 64, color: 'grey.300', mb: 2 }} />
          <Typography variant="h6" color="textSecondary" gutterBottom>
            No widgets found
          </Typography>
          <Typography variant="body2" color="textSecondary">
            Try adjusting your search criteria or filters
          </Typography>
        </Box>
      )}

      {/* Preview Dialog */}
      <Dialog
        open={Boolean(previewDialog)}
        onClose={() => setPreviewDialog(null)}
        maxWidth="md"
        fullWidth
      >
        {previewDialog && (
          <>
            <DialogTitle>
              <Box display="flex" alignItems="center">
                {previewDialog.icon}
                <Typography variant="h6" ml={1}>
                  {previewDialog.name}
                </Typography>
              </Box>
            </DialogTitle>
            <DialogContent>
              <Typography variant="body1" paragraph>
                {previewDialog.description}
              </Typography>

              <Box mb={2}>
                <Typography variant="subtitle2" gutterBottom>
                  Category: {previewDialog.category}
                </Typography>
                <Typography variant="subtitle2" gutterBottom>
                  Difficulty: {previewDialog.difficulty}
                </Typography>
              </Box>

              <Box mb={2}>
                <Typography variant="subtitle2" gutterBottom>
                  Requirements:
                </Typography>
                {previewDialog.requirements.map((req, index) => (
                  <Chip
                    key={index}
                    label={req}
                    size="small"
                    variant="outlined"
                    sx={{ mr: 1, mb: 1 }}
                  />
                ))}
              </Box>

              <Box mb={2}>
                <Typography variant="subtitle2" gutterBottom>
                  Tags:
                </Typography>
                {previewDialog.tags.map((tag, index) => (
                  <Chip
                    key={index}
                    label={tag}
                    size="small"
                    sx={{ mr: 1, mb: 1 }}
                  />
                ))}
              </Box>

              {/* Preview area - could show actual widget preview */}
              <Box
                height={200}
                bgcolor="grey.50"
                borderRadius={1}
                display="flex"
                alignItems="center"
                justifyContent="center"
                flexDirection="column"
              >
                {previewDialog.icon}
                <Typography variant="body2" color="textSecondary" mt={1}>
                  Widget Preview
                </Typography>
              </Box>
            </DialogContent>
            <DialogActions>
              <Button onClick={() => setPreviewDialog(null)}>
                Close
              </Button>
              <Button
                variant="contained"
                startIcon={<Add />}
                onClick={() => handleAdd(previewDialog)}
              >
                Add to Dashboard
              </Button>
            </DialogActions>
          </>
        )}
      </Dialog>
    </Box>
  );
};