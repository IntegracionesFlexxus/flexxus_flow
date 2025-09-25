/**
 * Opportunity Dialog Component - Sprint 18
 * Comprehensive form for creating and editing opportunities
 */

import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Grid,
  Stack,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Tabs,
  Tab,
  Box,
  Typography,
  Chip,
  Autocomplete,
  InputAdornment,
  IconButton,
  Alert,
  CircularProgress,
  FormControlLabel,
  Switch,
  Divider,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Avatar,
  AvatarGroup,
  Tooltip,
  Paper
} from '@mui/material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import {
  Info,
  AttachMoney,
  Business,
  Person,
  Email,
  Phone,
  CalendarToday,
  Description,
  Timeline,
  Assessment,
  Flag,
  Label,
  Attachment,
  Close,
  Save,
  Psychology,
  TrendingUp,
  Warning
} from '@mui/icons-material';
import usePipelineStore from '../../stores/usePipelineStore';
import { OpportunityExtended, Priority } from '../../types/pipeline.types';
import { formatCurrency, formatPercentage } from '../../utils/formatters';

interface OpportunityDialogProps {
  open: boolean;
  onClose: () => void;
  opportunity?: OpportunityExtended | null;
  stageId?: number;
  onSave?: (opportunity: Partial<OpportunityExtended>) => void;
}

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

const TabPanel: React.FC<TabPanelProps> = ({ children, value, index }) => {
  return (
    <Box
      role="tabpanel"
      hidden={value !== index}
      sx={{ pt: 3 }}
    >
      {value === index && children}
    </Box>
  );
};

const OpportunityDialog: React.FC<OpportunityDialogProps> = ({
  open,
  onClose,
  opportunity,
  stageId,
  onSave
}) => {
  const [tabValue, setTabValue] = useState(0);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [aiPredictions, setAiPredictions] = useState<any>(null);
  const [formData, setFormData] = useState<Partial<OpportunityExtended>>({
    name: '',
    account_id: '',
    stage_id: stageId || 0,
    amount: 0,
    probability: 0,
    expected_close_date: null,
    owner_id: '',
    priority: 'medium' as Priority,
    description: '',
    tags: [],
    custom_fields: {}
  });

  const { stages, accounts, users } = usePipelineStore();

  useEffect(() => {
    if (opportunity) {
      setFormData({
        ...opportunity,
        tags: opportunity.tags || [],
        custom_fields: opportunity.custom_fields || {}
      });
      // Load AI predictions for existing opportunity
      loadAIPredictions(opportunity.opportunity_id);
    } else if (stageId) {
      const stage = stages.find(s => s.stage_id === stageId);
      setFormData(prev => ({
        ...prev,
        stage_id: stageId,
        probability: stage?.probability || 0
      }));
    }
  }, [opportunity, stageId, stages]);

  const loadAIPredictions = async (opportunityId: string) => {
    try {
      // Mock AI predictions - in real implementation, call the service
      setAiPredictions({
        winProbability: 65,
        estimatedCloseDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        healthScore: 72,
        riskFactors: ['No recent activity', 'Decision maker not engaged'],
        recommendations: ['Schedule follow-up meeting', 'Share ROI analysis']
      });
    } catch (error) {
      console.error('Error loading AI predictions:', error);
    }
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.name?.trim()) {
      newErrors.name = 'Opportunity name is required';
    }
    if (!formData.account_id) {
      newErrors.account = 'Account is required';
    }
    if (!formData.amount || formData.amount <= 0) {
      newErrors.amount = 'Valid amount is required';
    }
    if (!formData.expected_close_date) {
      newErrors.close_date = 'Expected close date is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validateForm()) {
      setTabValue(0); // Switch to basic info tab if validation fails
      return;
    }

    setLoading(true);
    try {
      await onSave?.(formData);
      onClose();
    } catch (error) {
      console.error('Error saving opportunity:', error);
      setErrors({ submit: 'Failed to save opportunity' });
    } finally {
      setLoading(false);
    }
  };

  const handleFieldChange = (field: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
    // Clear error for this field
    if (errors[field]) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
    }
  };

  const handleStageChange = (newStageId: number) => {
    const stage = stages.find(s => s.stage_id === newStageId);
    handleFieldChange('stage_id', newStageId);
    if (stage && !opportunity) {
      // Only update probability for new opportunities
      handleFieldChange('probability', stage.probability || 0);
    }
  };

  return (
    <LocalizationProvider dateAdapter={AdapterDateFns}>
      <Dialog
        open={open}
        onClose={onClose}
        maxWidth="md"
        fullWidth
        PaperProps={{ sx: { height: '90vh' } }}
      >
        <DialogTitle sx={{ pb: 0 }}>
          <Stack direction="row" justifyContent="space-between" alignItems="center">
            <Typography variant="h6">
              {opportunity ? 'Edit Opportunity' : 'New Opportunity'}
            </Typography>
            <IconButton onClick={onClose} size="small">
              <Close />
            </IconButton>
          </Stack>
        </DialogTitle>

        <DialogContent sx={{ pb: 0 }}>
          {errors.submit && (
            <Alert severity="error" onClose={() => setErrors({})} sx={{ mb: 2 }}>
              {errors.submit}
            </Alert>
          )}

          <Tabs value={tabValue} onChange={(e, v) => setTabValue(v)} sx={{ borderBottom: 1, borderColor: 'divider' }}>
            <Tab label="Basic Info" icon={<Info />} iconPosition="start" />
            <Tab label="Details" icon={<Description />} iconPosition="start" />
            <Tab label="AI Insights" icon={<Psychology />} iconPosition="start" />
            <Tab label="Activity" icon={<Timeline />} iconPosition="start" disabled={!opportunity} />
          </Tabs>

          <TabPanel value={tabValue} index={0}>
            {/* Basic Information */}
            <Grid container spacing={3}>
              <Grid item xs={12}>
                <TextField
                  label="Opportunity Name"
                  value={formData.name}
                  onChange={(e) => handleFieldChange('name', e.target.value)}
                  fullWidth
                  required
                  error={!!errors.name}
                  helperText={errors.name}
                  autoFocus
                />
              </Grid>

              <Grid item xs={12} md={6}>
                <Autocomplete
                  options={accounts || []}
                  getOptionLabel={(option) => option.name}
                  value={accounts?.find(a => a.account_id === formData.account_id) || null}
                  onChange={(e, value) => handleFieldChange('account_id', value?.account_id)}
                  renderInput={(params) => (
                    <TextField
                      {...params}
                      label="Account"
                      required
                      error={!!errors.account}
                      helperText={errors.account}
                      InputProps={{
                        ...params.InputProps,
                        startAdornment: <Business sx={{ mr: 1, color: 'text.secondary' }} />
                      }}
                    />
                  )}
                />
              </Grid>

              <Grid item xs={12} md={6}>
                <FormControl fullWidth required>
                  <InputLabel>Stage</InputLabel>
                  <Select
                    value={formData.stage_id || ''}
                    onChange={(e) => handleStageChange(e.target.value as number)}
                    label="Stage"
                  >
                    {stages.map((stage) => (
                      <MenuItem key={stage.stage_id} value={stage.stage_id}>
                        <Stack direction="row" alignItems="center" spacing={1}>
                          <Box
                            sx={{
                              width: 12,
                              height: 12,
                              borderRadius: '50%',
                              bgcolor: stage.color || '#2196f3'
                            }}
                          />
                          <span>{stage.name}</span>
                          <Chip label={`${stage.probability}%`} size="small" variant="outlined" />
                        </Stack>
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>

              <Grid item xs={12} md={4}>
                <TextField
                  label="Deal Value"
                  type="number"
                  value={formData.amount}
                  onChange={(e) => handleFieldChange('amount', parseFloat(e.target.value))}
                  fullWidth
                  required
                  error={!!errors.amount}
                  helperText={errors.amount}
                  InputProps={{
                    startAdornment: <InputAdornment position="start">$</InputAdornment>
                  }}
                />
              </Grid>

              <Grid item xs={12} md={4}>
                <TextField
                  label="Probability"
                  type="number"
                  value={formData.probability}
                  onChange={(e) => handleFieldChange('probability', parseInt(e.target.value))}
                  fullWidth
                  InputProps={{
                    endAdornment: <InputAdornment position="end">%</InputAdornment>
                  }}
                  inputProps={{ min: 0, max: 100 }}
                />
              </Grid>

              <Grid item xs={12} md={4}>
                <TextField
                  label="Weighted Value"
                  value={formatCurrency((formData.amount || 0) * (formData.probability || 0) / 100)}
                  fullWidth
                  disabled
                  InputProps={{
                    startAdornment: <InputAdornment position="start">$</InputAdornment>
                  }}
                />
              </Grid>

              <Grid item xs={12} md={6}>
                <DatePicker
                  label="Expected Close Date"
                  value={formData.expected_close_date ? new Date(formData.expected_close_date) : null}
                  onChange={(date) => handleFieldChange('expected_close_date', date?.toISOString())}
                  slotProps={{
                    textField: {
                      fullWidth: true,
                      required: true,
                      error: !!errors.close_date,
                      helperText: errors.close_date
                    }
                  }}
                />
              </Grid>

              <Grid item xs={12} md={6}>
                <FormControl fullWidth>
                  <InputLabel>Priority</InputLabel>
                  <Select
                    value={formData.priority || 'medium'}
                    onChange={(e) => handleFieldChange('priority', e.target.value)}
                    label="Priority"
                  >
                    <MenuItem value="critical">
                      <Stack direction="row" alignItems="center" spacing={1}>
                        <Flag sx={{ color: 'error.main' }} />
                        <span>Critical</span>
                      </Stack>
                    </MenuItem>
                    <MenuItem value="high">
                      <Stack direction="row" alignItems="center" spacing={1}>
                        <Flag sx={{ color: 'warning.main' }} />
                        <span>High</span>
                      </Stack>
                    </MenuItem>
                    <MenuItem value="medium">
                      <Stack direction="row" alignItems="center" spacing={1}>
                        <Flag sx={{ color: 'info.main' }} />
                        <span>Medium</span>
                      </Stack>
                    </MenuItem>
                    <MenuItem value="low">
                      <Stack direction="row" alignItems="center" spacing={1}>
                        <Flag sx={{ color: 'text.secondary' }} />
                        <span>Low</span>
                      </Stack>
                    </MenuItem>
                  </Select>
                </FormControl>
              </Grid>

              <Grid item xs={12}>
                <Autocomplete
                  options={users || []}
                  getOptionLabel={(option) => option.name}
                  value={users?.find(u => u.user_id === formData.owner_id) || null}
                  onChange={(e, value) => handleFieldChange('owner_id', value?.user_id)}
                  renderInput={(params) => (
                    <TextField
                      {...params}
                      label="Owner"
                      InputProps={{
                        ...params.InputProps,
                        startAdornment: <Person sx={{ mr: 1, color: 'text.secondary' }} />
                      }}
                    />
                  )}
                />
              </Grid>
            </Grid>
          </TabPanel>

          <TabPanel value={tabValue} index={1}>
            {/* Additional Details */}
            <Grid container spacing={3}>
              <Grid item xs={12}>
                <TextField
                  label="Description"
                  value={formData.description}
                  onChange={(e) => handleFieldChange('description', e.target.value)}
                  fullWidth
                  multiline
                  rows={4}
                  placeholder="Provide details about this opportunity..."
                />
              </Grid>

              <Grid item xs={12}>
                <Autocomplete
                  multiple
                  freeSolo
                  options={['enterprise', 'startup', 'government', 'nonprofit']}
                  value={formData.tags || []}
                  onChange={(e, value) => handleFieldChange('tags', value)}
                  renderInput={(params) => (
                    <TextField
                      {...params}
                      label="Tags"
                      placeholder="Add tags..."
                      helperText="Press Enter to add custom tags"
                    />
                  )}
                  renderTags={(value, getTagProps) =>
                    value.map((option, index) => (
                      <Chip
                        label={option}
                        size="small"
                        color="primary"
                        variant="outlined"
                        {...getTagProps({ index })}
                      />
                    ))
                  }
                />
              </Grid>

              <Grid item xs={12}>
                <Typography variant="subtitle2" gutterBottom>
                  Custom Fields
                </Typography>
                <Stack spacing={2}>
                  <TextField
                    label="Competitor"
                    value={formData.custom_fields?.competitor || ''}
                    onChange={(e) => handleFieldChange('custom_fields', {
                      ...formData.custom_fields,
                      competitor: e.target.value
                    })}
                    fullWidth
                  />
                  <TextField
                    label="Lead Source"
                    value={formData.custom_fields?.lead_source || ''}
                    onChange={(e) => handleFieldChange('custom_fields', {
                      ...formData.custom_fields,
                      lead_source: e.target.value
                    })}
                    fullWidth
                  />
                  <FormControlLabel
                    control={
                      <Switch
                        checked={formData.custom_fields?.requires_approval || false}
                        onChange={(e) => handleFieldChange('custom_fields', {
                          ...formData.custom_fields,
                          requires_approval: e.target.checked
                        })}
                      />
                    }
                    label="Requires approval for closing"
                  />
                </Stack>
              </Grid>

              <Grid item xs={12}>
                <Paper variant="outlined" sx={{ p: 2 }}>
                  <Typography variant="subtitle2" gutterBottom>
                    Contact Information
                  </Typography>
                  <Stack spacing={2}>
                    <TextField
                      label="Primary Contact"
                      value={formData.custom_fields?.primary_contact || ''}
                      onChange={(e) => handleFieldChange('custom_fields', {
                        ...formData.custom_fields,
                        primary_contact: e.target.value
                      })}
                      fullWidth
                      InputProps={{
                        startAdornment: <Person sx={{ mr: 1, color: 'text.secondary' }} />
                      }}
                    />
                    <Stack direction="row" spacing={2}>
                      <TextField
                        label="Email"
                        value={formData.custom_fields?.contact_email || ''}
                        onChange={(e) => handleFieldChange('custom_fields', {
                          ...formData.custom_fields,
                          contact_email: e.target.value
                        })}
                        fullWidth
                        InputProps={{
                          startAdornment: <Email sx={{ mr: 1, color: 'text.secondary' }} />
                        }}
                      />
                      <TextField
                        label="Phone"
                        value={formData.custom_fields?.contact_phone || ''}
                        onChange={(e) => handleFieldChange('custom_fields', {
                          ...formData.custom_fields,
                          contact_phone: e.target.value
                        })}
                        fullWidth
                        InputProps={{
                          startAdornment: <Phone sx={{ mr: 1, color: 'text.secondary' }} />
                        }}
                      />
                    </Stack>
                  </Stack>
                </Paper>
              </Grid>
            </Grid>
          </TabPanel>

          <TabPanel value={tabValue} index={2}>
            {/* AI Insights */}
            {aiPredictions ? (
              <Grid container spacing={3}>
                <Grid item xs={12} md={6}>
                  <Paper variant="outlined" sx={{ p: 2 }}>
                    <Stack spacing={2}>
                      <Typography variant="subtitle2" color="primary">
                        AI Predictions
                      </Typography>
                      <Box>
                        <Typography variant="body2" color="text.secondary">
                          Win Probability
                        </Typography>
                        <Stack direction="row" alignItems="center" spacing={2}>
                          <Typography variant="h4">
                            {aiPredictions.winProbability}%
                          </Typography>
                          <TrendingUp color="success" />
                        </Stack>
                      </Box>
                      <Box>
                        <Typography variant="body2" color="text.secondary">
                          Estimated Close Date
                        </Typography>
                        <Typography variant="body1">
                          {new Date(aiPredictions.estimatedCloseDate).toLocaleDateString()}
                        </Typography>
                      </Box>
                      <Box>
                        <Typography variant="body2" color="text.secondary">
                          Health Score
                        </Typography>
                        <Stack direction="row" alignItems="center" spacing={1}>
                          <Typography variant="h6">
                            {aiPredictions.healthScore}/100
                          </Typography>
                          <Chip
                            label={aiPredictions.healthScore > 70 ? 'Healthy' : 'At Risk'}
                            color={aiPredictions.healthScore > 70 ? 'success' : 'warning'}
                            size="small"
                          />
                        </Stack>
                      </Box>
                    </Stack>
                  </Paper>
                </Grid>

                <Grid item xs={12} md={6}>
                  <Paper variant="outlined" sx={{ p: 2 }}>
                    <Typography variant="subtitle2" color="error" gutterBottom>
                      Risk Factors
                    </Typography>
                    <List dense>
                      {aiPredictions.riskFactors.map((risk: string, index: number) => (
                        <ListItem key={index}>
                          <ListItemIcon>
                            <Warning color="warning" fontSize="small" />
                          </ListItemIcon>
                          <ListItemText primary={risk} />
                        </ListItem>
                      ))}
                    </List>
                  </Paper>
                </Grid>

                <Grid item xs={12}>
                  <Paper variant="outlined" sx={{ p: 2 }}>
                    <Typography variant="subtitle2" color="success.main" gutterBottom>
                      Recommended Actions
                    </Typography>
                    <Stack spacing={1}>
                      {aiPredictions.recommendations.map((rec: string, index: number) => (
                        <Alert key={index} severity="info" icon={<Psychology />}>
                          {rec}
                        </Alert>
                      ))}
                    </Stack>
                  </Paper>
                </Grid>
              </Grid>
            ) : (
              <Box sx={{ textAlign: 'center', py: 4 }}>
                <CircularProgress />
                <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
                  Loading AI insights...
                </Typography>
              </Box>
            )}
          </TabPanel>

          <TabPanel value={tabValue} index={3}>
            {/* Activity Timeline */}
            <Alert severity="info">
              Activity timeline will show recent interactions, emails, calls, and meetings related to this opportunity.
            </Alert>
          </TabPanel>
        </DialogContent>

        <DialogActions sx={{ px: 3, py: 2 }}>
          <Button onClick={onClose} disabled={loading}>
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            variant="contained"
            disabled={loading}
            startIcon={loading ? <CircularProgress size={20} /> : <Save />}
          >
            {opportunity ? 'Update' : 'Create'} Opportunity
          </Button>
        </DialogActions>
      </Dialog>
    </LocalizationProvider>
  );
};

export default OpportunityDialog;