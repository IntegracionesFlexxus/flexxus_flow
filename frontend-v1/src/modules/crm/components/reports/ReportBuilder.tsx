import React, { useState, useEffect } from 'react';
import {
  Box,
  Paper,
  Typography,
  Button,
  Stepper,
  Step,
  StepLabel,
  StepContent,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Chip,
  Grid,
  Card,
  CardContent,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Checkbox,
  Divider,
  Alert,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions
} from '@mui/material';
import {
  Add,
  Remove,
  PlayArrow,
  Save,
  Preview,
  TableChart,
  BarChart,
  PieChart,
  ShowChart,
  FilterList,
  Sort
} from '@mui/icons-material';
import { useReportsStore } from '../../stores/reportsStore';

interface ReportField {
  name: string;
  label: string;
  type: 'string' | 'number' | 'date' | 'boolean';
  table: string;
}

interface ReportFilter {
  field: string;
  operator: string;
  value: string;
  type: string;
}

interface ReportSort {
  field: string;
  direction: 'asc' | 'desc';
}

const REPORT_TYPES = [
  { id: 'tabular', name: 'Table Report', icon: <TableChart />, description: 'Data in rows and columns' },
  { id: 'summary', name: 'Summary Report', icon: <BarChart />, description: 'Aggregated data with grouping' },
  { id: 'chart', name: 'Chart Report', icon: <ShowChart />, description: 'Visual data representation' },
  { id: 'dashboard', name: 'Dashboard Report', icon: <PieChart />, description: 'Combined visualizations' }
];

const AVAILABLE_FIELDS: ReportField[] = [
  { name: 'accounts.name', label: 'Account Name', type: 'string', table: 'accounts' },
  { name: 'accounts.industry', label: 'Industry', type: 'string', table: 'accounts' },
  { name: 'accounts.created_at', label: 'Created Date', type: 'date', table: 'accounts' },
  { name: 'leads.first_name', label: 'Lead First Name', type: 'string', table: 'leads' },
  { name: 'leads.last_name', label: 'Lead Last Name', type: 'string', table: 'leads' },
  { name: 'leads.email', label: 'Lead Email', type: 'string', table: 'leads' },
  { name: 'leads.score', label: 'Lead Score', type: 'number', table: 'leads' },
  { name: 'leads.status', label: 'Lead Status', type: 'string', table: 'leads' },
  { name: 'opportunities.name', label: 'Opportunity Name', type: 'string', table: 'opportunities' },
  { name: 'opportunities.amount', label: 'Opportunity Amount', type: 'number', table: 'opportunities' },
  { name: 'opportunities.probability', label: 'Probability', type: 'number', table: 'opportunities' },
  { name: 'opportunities.stage', label: 'Stage', type: 'string', table: 'opportunities' },
  { name: 'opportunities.close_date', label: 'Close Date', type: 'date', table: 'opportunities' },
  { name: 'activities.type', label: 'Activity Type', type: 'string', table: 'activities' },
  { name: 'activities.status', label: 'Activity Status', type: 'string', table: 'activities' },
  { name: 'activities.due_date', label: 'Due Date', type: 'date', table: 'activities' }
];

const FILTER_OPERATORS = {
  string: [
    { value: 'equals', label: 'Equals' },
    { value: 'contains', label: 'Contains' },
    { value: 'starts_with', label: 'Starts with' },
    { value: 'ends_with', label: 'Ends with' },
    { value: 'not_equals', label: 'Not equals' }
  ],
  number: [
    { value: 'equals', label: 'Equals' },
    { value: 'greater_than', label: 'Greater than' },
    { value: 'less_than', label: 'Less than' },
    { value: 'between', label: 'Between' }
  ],
  date: [
    { value: 'equals', label: 'On date' },
    { value: 'after', label: 'After' },
    { value: 'before', label: 'Before' },
    { value: 'between', label: 'Between' }
  ]
};

export const ReportBuilder: React.FC = () => {
  const { loading, error, createReport, executeReport, clearError } = useReportsStore();

  const [activeStep, setActiveStep] = useState(0);
  const [reportName, setReportName] = useState('');
  const [reportDescription, setReportDescription] = useState('');
  const [selectedType, setSelectedType] = useState('');
  const [selectedFields, setSelectedFields] = useState<ReportField[]>([]);
  const [filters, setFilters] = useState<ReportFilter[]>([]);
  const [sorting, setSorting] = useState<ReportSort[]>([]);
  const [previewData, setPreviewData] = useState<any[]>([]);
  const [previewDialog, setPreviewDialog] = useState(false);

  const steps = [
    { label: 'Report Type', description: 'Choose the type of report' },
    { label: 'Data Fields', description: 'Select fields to include' },
    { label: 'Filters & Sorting', description: 'Configure filters and sorting' },
    { label: 'Preview & Save', description: 'Preview and save the report' }
  ];

  const handleNext = () => {
    setActiveStep((prevActiveStep) => prevActiveStep + 1);
  };

  const handleBack = () => {
    setActiveStep((prevActiveStep) => prevActiveStep - 1);
  };

  const handleReset = () => {
    setActiveStep(0);
    setReportName('');
    setReportDescription('');
    setSelectedType('');
    setSelectedFields([]);
    setFilters([]);
    setSorting([]);
    setPreviewData([]);
  };

  const handleFieldToggle = (field: ReportField) => {
    const isSelected = selectedFields.some(f => f.name === field.name);
    if (isSelected) {
      setSelectedFields(selectedFields.filter(f => f.name !== field.name));
    } else {
      setSelectedFields([...selectedFields, field]);
    }
  };

  const handleAddFilter = () => {
    if (selectedFields.length === 0) return;

    const newFilter: ReportFilter = {
      field: selectedFields[0].name,
      operator: 'equals',
      value: '',
      type: selectedFields[0].type
    };
    setFilters([...filters, newFilter]);
  };

  const handleUpdateFilter = (index: number, updates: Partial<ReportFilter>) => {
    const updatedFilters = filters.map((filter, i) =>
      i === index ? { ...filter, ...updates } : filter
    );
    setFilters(updatedFilters);
  };

  const handleRemoveFilter = (index: number) => {
    setFilters(filters.filter((_, i) => i !== index));
  };

  const handleAddSort = () => {
    if (selectedFields.length === 0) return;

    const newSort: ReportSort = {
      field: selectedFields[0].name,
      direction: 'asc'
    };
    setSorting([...sorting, newSort]);
  };

  const handleUpdateSort = (index: number, updates: Partial<ReportSort>) => {
    const updatedSorting = sorting.map((sort, i) =>
      i === index ? { ...sort, ...updates } : sort
    );
    setSorting(updatedSorting);
  };

  const handleRemoveSort = (index: number) => {
    setSorting(sorting.filter((_, i) => i !== index));
  };

  const handlePreview = async () => {
    try {
      const reportConfig = {
        name: reportName,
        description: reportDescription,
        report_type: selectedType,
        query_config: {
          fields: selectedFields.map(f => f.name),
          filters: filters,
          sorting: sorting,
          limit: 100
        }
      };

      const data = await executeReport({ id: 'preview' } as any, reportConfig.query_config);
      setPreviewData(data.slice(0, 10)); // Show first 10 rows
      setPreviewDialog(true);
    } catch (error) {
      console.error('Preview error:', error);
    }
  };

  const handleSave = async () => {
    try {
      const reportDefinition = {
        name: reportName,
        description: reportDescription,
        report_type: selectedType,
        query_config: {
          fields: selectedFields.map(f => f.name),
          filters: filters,
          sorting: sorting
        },
        is_public: false,
        is_scheduled: false
      };

      await createReport(reportDefinition);
      handleReset();
    } catch (error) {
      console.error('Save error:', error);
    }
  };

  const canProceed = (step: number) => {
    switch (step) {
      case 0: return selectedType !== '';
      case 1: return selectedFields.length > 0;
      case 2: return true;
      case 3: return reportName.trim() !== '';
      default: return true;
    }
  };

  const renderStepContent = (step: number) => {
    switch (step) {
      case 0:
        return (
          <Box>
            <Typography variant="h6" gutterBottom>
              Choose Report Type
            </Typography>
            <Grid container spacing={2}>
              {REPORT_TYPES.map((type) => (
                <Grid item xs={12} sm={6} key={type.id}>
                  <Card
                    sx={{
                      cursor: 'pointer',
                      border: selectedType === type.id ? '2px solid' : '1px solid',
                      borderColor: selectedType === type.id ? 'primary.main' : 'divider',
                      '&:hover': { borderColor: 'primary.main' }
                    }}
                    onClick={() => setSelectedType(type.id)}
                  >
                    <CardContent sx={{ textAlign: 'center' }}>
                      <Box mb={1}>{type.icon}</Box>
                      <Typography variant="h6">{type.name}</Typography>
                      <Typography variant="body2" color="textSecondary">
                        {type.description}
                      </Typography>
                    </CardContent>
                  </Card>
                </Grid>
              ))}
            </Grid>
          </Box>
        );

      case 1:
        return (
          <Box>
            <Typography variant="h6" gutterBottom>
              Select Data Fields
            </Typography>
            <Typography variant="body2" color="textSecondary" paragraph>
              Choose the fields you want to include in your report
            </Typography>
            <List>
              {AVAILABLE_FIELDS.map((field) => (
                <ListItem
                  key={field.name}
                  button
                  onClick={() => handleFieldToggle(field)}
                >
                  <ListItemIcon>
                    <Checkbox
                      checked={selectedFields.some(f => f.name === field.name)}
                      edge="start"
                    />
                  </ListItemIcon>
                  <ListItemText
                    primary={field.label}
                    secondary={`${field.table} - ${field.type}`}
                  />
                </ListItem>
              ))}
            </List>
            <Box mt={2}>
              <Typography variant="subtitle2" gutterBottom>
                Selected Fields ({selectedFields.length}):
              </Typography>
              <Box display="flex" flexWrap="wrap" gap={1}>
                {selectedFields.map((field) => (
                  <Chip
                    key={field.name}
                    label={field.label}
                    onDelete={() => handleFieldToggle(field)}
                    size="small"
                  />
                ))}
              </Box>
            </Box>
          </Box>
        );

      case 2:
        return (
          <Box>
            <Typography variant="h6" gutterBottom>
              Configure Filters & Sorting
            </Typography>

            {/* Filters Section */}
            <Box mb={3}>
              <Box display="flex" alignItems="center" justifyContent="space-between" mb={2}>
                <Typography variant="subtitle1">
                  Filters ({filters.length})
                </Typography>
                <Button
                  startIcon={<Add />}
                  onClick={handleAddFilter}
                  disabled={selectedFields.length === 0}
                >
                  Add Filter
                </Button>
              </Box>

              {filters.map((filter, index) => (
                <Paper key={index} sx={{ p: 2, mb: 2 }}>
                  <Grid container spacing={2} alignItems="center">
                    <Grid item xs={12} sm={3}>
                      <FormControl fullWidth size="small">
                        <InputLabel>Field</InputLabel>
                        <Select
                          value={filter.field}
                          label="Field"
                          onChange={(e) => {
                            const field = selectedFields.find(f => f.name === e.target.value);
                            handleUpdateFilter(index, {
                              field: e.target.value,
                              type: field?.type || 'string'
                            });
                          }}
                        >
                          {selectedFields.map((field) => (
                            <MenuItem key={field.name} value={field.name}>
                              {field.label}
                            </MenuItem>
                          ))}
                        </Select>
                      </FormControl>
                    </Grid>
                    <Grid item xs={12} sm={3}>
                      <FormControl fullWidth size="small">
                        <InputLabel>Operator</InputLabel>
                        <Select
                          value={filter.operator}
                          label="Operator"
                          onChange={(e) => handleUpdateFilter(index, { operator: e.target.value })}
                        >
                          {FILTER_OPERATORS[filter.type as keyof typeof FILTER_OPERATORS]?.map((op) => (
                            <MenuItem key={op.value} value={op.value}>
                              {op.label}
                            </MenuItem>
                          ))}
                        </Select>
                      </FormControl>
                    </Grid>
                    <Grid item xs={12} sm={4}>
                      <TextField
                        fullWidth
                        size="small"
                        label="Value"
                        value={filter.value}
                        onChange={(e) => handleUpdateFilter(index, { value: e.target.value })}
                        type={filter.type === 'number' ? 'number' : filter.type === 'date' ? 'date' : 'text'}
                        InputLabelProps={filter.type === 'date' ? { shrink: true } : undefined}
                      />
                    </Grid>
                    <Grid item xs={12} sm={2}>
                      <IconButton
                        onClick={() => handleRemoveFilter(index)}
                        color="error"
                      >
                        <Remove />
                      </IconButton>
                    </Grid>
                  </Grid>
                </Paper>
              ))}
            </Box>

            {/* Sorting Section */}
            <Box>
              <Box display="flex" alignItems="center" justifyContent="space-between" mb={2}>
                <Typography variant="subtitle1">
                  Sorting ({sorting.length})
                </Typography>
                <Button
                  startIcon={<Add />}
                  onClick={handleAddSort}
                  disabled={selectedFields.length === 0}
                >
                  Add Sort
                </Button>
              </Box>

              {sorting.map((sort, index) => (
                <Paper key={index} sx={{ p: 2, mb: 2 }}>
                  <Grid container spacing={2} alignItems="center">
                    <Grid item xs={12} sm={6}>
                      <FormControl fullWidth size="small">
                        <InputLabel>Field</InputLabel>
                        <Select
                          value={sort.field}
                          label="Field"
                          onChange={(e) => handleUpdateSort(index, { field: e.target.value })}
                        >
                          {selectedFields.map((field) => (
                            <MenuItem key={field.name} value={field.name}>
                              {field.label}
                            </MenuItem>
                          ))}
                        </Select>
                      </FormControl>
                    </Grid>
                    <Grid item xs={12} sm={4}>
                      <FormControl fullWidth size="small">
                        <InputLabel>Direction</InputLabel>
                        <Select
                          value={sort.direction}
                          label="Direction"
                          onChange={(e) => handleUpdateSort(index, { direction: e.target.value as 'asc' | 'desc' })}
                        >
                          <MenuItem value="asc">Ascending</MenuItem>
                          <MenuItem value="desc">Descending</MenuItem>
                        </Select>
                      </FormControl>
                    </Grid>
                    <Grid item xs={12} sm={2}>
                      <IconButton
                        onClick={() => handleRemoveSort(index)}
                        color="error"
                      >
                        <Remove />
                      </IconButton>
                    </Grid>
                  </Grid>
                </Paper>
              ))}
            </Box>
          </Box>
        );

      case 3:
        return (
          <Box>
            <Typography variant="h6" gutterBottom>
              Report Details
            </Typography>
            <TextField
              fullWidth
              label="Report Name"
              value={reportName}
              onChange={(e) => setReportName(e.target.value)}
              margin="normal"
              required
            />
            <TextField
              fullWidth
              label="Description"
              value={reportDescription}
              onChange={(e) => setReportDescription(e.target.value)}
              margin="normal"
              multiline
              rows={3}
            />

            <Box mt={3}>
              <Typography variant="subtitle1" gutterBottom>
                Report Summary
              </Typography>
              <Paper sx={{ p: 2, bgcolor: 'grey.50' }}>
                <Typography variant="body2" gutterBottom>
                  <strong>Type:</strong> {REPORT_TYPES.find(t => t.id === selectedType)?.name}
                </Typography>
                <Typography variant="body2" gutterBottom>
                  <strong>Fields:</strong> {selectedFields.length} selected
                </Typography>
                <Typography variant="body2" gutterBottom>
                  <strong>Filters:</strong> {filters.length} configured
                </Typography>
                <Typography variant="body2">
                  <strong>Sorting:</strong> {sorting.length} rules
                </Typography>
              </Paper>
            </Box>

            <Box mt={3}>
              <Button
                variant="outlined"
                startIcon={<Preview />}
                onClick={handlePreview}
                sx={{ mr: 2 }}
              >
                Preview Report
              </Button>
            </Box>
          </Box>
        );

      default:
        return null;
    }
  };

  return (
    <Box>
      {error && (
        <Alert severity="error" onClose={clearError} sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      <Typography variant="h4" fontWeight="bold" gutterBottom>
        Report Builder
      </Typography>

      <Paper sx={{ p: 3 }}>
        <Stepper activeStep={activeStep} orientation="vertical">
          {steps.map((step, index) => (
            <Step key={step.label}>
              <StepLabel>{step.label}</StepLabel>
              <StepContent>
                <Typography variant="body2" color="textSecondary" paragraph>
                  {step.description}
                </Typography>
                {renderStepContent(index)}
                <Box sx={{ mb: 2, mt: 3 }}>
                  <Button
                    variant="contained"
                    onClick={index === steps.length - 1 ? handleSave : handleNext}
                    disabled={!canProceed(index) || loading}
                    sx={{ mr: 1 }}
                    startIcon={index === steps.length - 1 ? <Save /> : undefined}
                  >
                    {index === steps.length - 1 ? 'Save Report' : 'Continue'}
                  </Button>
                  <Button
                    disabled={index === 0}
                    onClick={handleBack}
                    sx={{ mr: 1 }}
                  >
                    Back
                  </Button>
                  {index !== 0 && (
                    <Button onClick={handleReset} color="error">
                      Reset
                    </Button>
                  )}
                </Box>
              </StepContent>
            </Step>
          ))}
        </Stepper>
      </Paper>

      {/* Preview Dialog */}
      <Dialog
        open={previewDialog}
        onClose={() => setPreviewDialog(false)}
        maxWidth="lg"
        fullWidth
      >
        <DialogTitle>Report Preview</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="textSecondary" gutterBottom>
            Showing first 10 rows of {previewData.length} total results
          </Typography>
          {/* Add table or chart visualization based on report type */}
          <Box mt={2}>
            <pre>{JSON.stringify(previewData, null, 2)}</pre>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setPreviewDialog(false)}>Close</Button>
          <Button variant="contained" onClick={handleSave}>
            Save Report
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};