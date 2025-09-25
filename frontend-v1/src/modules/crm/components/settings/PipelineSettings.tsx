/**
 * Pipeline Settings Component - Sprint 18
 * Configuration for pipeline stages, automation rules, and templates
 */

import React, { useState, useEffect } from 'react';
import {
  Box,
  Paper,
  Typography,
  Tabs,
  Tab,
  Grid,
  Card,
  CardContent,
  CardActions,
  Button,
  TextField,
  Switch,
  FormControlLabel,
  IconButton,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  Divider,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Chip,
  Stack,
  Alert,
  Slider,
  InputAdornment,
  Tooltip,
  Fab
} from '@mui/material';
import {
  DragIndicator,
  Edit,
  Delete,
  Add,
  Settings,
  AutoAwesome,
  Rule,
  Email,
  Timer,
  Warning,
  CheckCircle,
  Save,
  Undo
} from '@mui/icons-material';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy
} from '@dnd-kit/sortable';
import {
  useSortable
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import usePipelineStore from '../../stores/usePipelineStore';
import pipelineService from '../../services/pipelineService';

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
      sx={{ height: 'calc(100% - 48px)', overflow: 'auto' }}
    >
      {value === index && <Box sx={{ p: 3 }}>{children}</Box>}
    </Box>
  );
};

interface StageItemProps {
  stage: any;
  onEdit: (stage: any) => void;
  onDelete: (id: number) => void;
}

const SortableStageItem: React.FC<StageItemProps> = ({ stage, onEdit, onDelete }) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging
  } = useSortable({ id: stage.stage_id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1
  };

  return (
    <Card
      ref={setNodeRef}
      style={style}
      sx={{ mb: 2, cursor: 'move' }}
      elevation={isDragging ? 8 : 1}
    >
      <CardContent>
        <Stack direction="row" alignItems="center" spacing={2}>
          <IconButton {...attributes} {...listeners} size="small">
            <DragIndicator />
          </IconButton>
          <Box sx={{ flex: 1 }}>
            <Stack direction="row" alignItems="center" spacing={2}>
              <Box
                sx={{
                  width: 24,
                  height: 24,
                  borderRadius: '50%',
                  bgcolor: stage.color || '#2196f3'
                }}
              />
              <Typography variant="h6">{stage.name}</Typography>
              <Chip
                label={`${stage.probability || 0}%`}
                size="small"
                color="primary"
                variant="outlined"
              />
              {stage.is_closed && (
                <Chip
                  label={stage.is_won ? "Won" : "Lost"}
                  size="small"
                  color={stage.is_won ? "success" : "error"}
                />
              )}
            </Stack>
            {stage.description && (
              <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                {stage.description}
              </Typography>
            )}
          </Box>
          <Stack direction="row">
            <IconButton onClick={() => onEdit(stage)}>
              <Edit />
            </IconButton>
            <IconButton
              onClick={() => onDelete(stage.stage_id)}
              color="error"
              disabled={stage.is_system}
            >
              <Delete />
            </IconButton>
          </Stack>
        </Stack>
      </CardContent>
    </Card>
  );
};

interface AutomationRule {
  id: number;
  name: string;
  trigger: string;
  condition: string;
  action: string;
  enabled: boolean;
}

const PipelineSettings: React.FC = () => {
  const [tabValue, setTabValue] = useState(0);
  const [stageDialogOpen, setStageDialogOpen] = useState(false);
  const [automationDialogOpen, setAutomationDialogOpen] = useState(false);
  const [selectedStage, setSelectedStage] = useState<any>(null);
  const [selectedRule, setSelectedRule] = useState<AutomationRule | null>(null);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  const { stages, loadStages } = usePipelineStore();
  const [localStages, setLocalStages] = useState(stages);
  const [automationRules, setAutomationRules] = useState<AutomationRule[]>([
    {
      id: 1,
      name: 'Auto-assign high-value deals',
      trigger: 'opportunity_created',
      condition: 'amount > 100000',
      action: 'assign_to_senior_rep',
      enabled: true
    },
    {
      id: 2,
      name: 'Notify on stale opportunities',
      trigger: 'daily_check',
      condition: 'days_inactive > 30',
      action: 'send_notification',
      enabled: true
    },
    {
      id: 3,
      name: 'Auto-close lost deals',
      trigger: 'stage_changed',
      condition: 'stage = lost',
      action: 'mark_as_closed_lost',
      enabled: false
    }
  ]);

  const [settings, setSettings] = useState({
    defaultProbabilities: true,
    autoProgressRules: false,
    staleOpportunityDays: 30,
    highValueThreshold: 100000,
    winRateTarget: 50,
    forecastAccuracyTarget: 80,
    emailNotifications: true,
    slackIntegration: false,
    webhooksEnabled: false
  });

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates
    })
  );

  useEffect(() => {
    setLocalStages(stages);
  }, [stages]);

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (active.id !== over?.id) {
      setLocalStages((items) => {
        const oldIndex = items.findIndex(i => i.stage_id === active.id);
        const newIndex = items.findIndex(i => i.stage_id === over?.id);
        const newOrder = arrayMove(items, oldIndex, newIndex);

        // Update order property
        return newOrder.map((stage, index) => ({
          ...stage,
          order: index + 1
        }));
      });
      setHasUnsavedChanges(true);
    }
  };

  const handleEditStage = (stage: any) => {
    setSelectedStage(stage);
    setStageDialogOpen(true);
  };

  const handleDeleteStage = async (stageId: number) => {
    if (window.confirm('Are you sure you want to delete this stage? Opportunities will need to be reassigned.')) {
      setLocalStages(localStages.filter(s => s.stage_id !== stageId));
      setHasUnsavedChanges(true);
    }
  };

  const handleAddStage = () => {
    setSelectedStage(null);
    setStageDialogOpen(true);
  };

  const handleSaveStage = () => {
    if (selectedStage?.stage_id) {
      // Update existing
      setLocalStages(localStages.map(s =>
        s.stage_id === selectedStage.stage_id ? selectedStage : s
      ));
    } else {
      // Add new
      const newStage = {
        ...selectedStage,
        stage_id: Date.now(), // Temporary ID
        order: localStages.length + 1
      };
      setLocalStages([...localStages, newStage]);
    }
    setStageDialogOpen(false);
    setSelectedStage(null);
    setHasUnsavedChanges(true);
  };

  const handleEditRule = (rule: AutomationRule) => {
    setSelectedRule(rule);
    setAutomationDialogOpen(true);
  };

  const handleDeleteRule = (ruleId: number) => {
    setAutomationRules(automationRules.filter(r => r.id !== ruleId));
    setHasUnsavedChanges(true);
  };

  const handleToggleRule = (ruleId: number) => {
    setAutomationRules(automationRules.map(r =>
      r.id === ruleId ? { ...r, enabled: !r.enabled } : r
    ));
    setHasUnsavedChanges(true);
  };

  const handleSaveAllChanges = async () => {
    try {
      // Save stages
      await pipelineService.updateStages(localStages);
      // Save automation rules
      // await pipelineService.updateAutomationRules(automationRules);
      // Save settings
      // await pipelineService.updateSettings(settings);

      setHasUnsavedChanges(false);
      loadStages(); // Reload from server
    } catch (error) {
      console.error('Error saving changes:', error);
    }
  };

  const handleRevertChanges = () => {
    setLocalStages(stages);
    setHasUnsavedChanges(false);
  };

  return (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      {/* Header */}
      <Box sx={{ p: 2, borderBottom: 1, borderColor: 'divider' }}>
        <Stack direction="row" justifyContent="space-between" alignItems="center">
          <Typography variant="h5" fontWeight="bold">
            Pipeline Settings
          </Typography>
          {hasUnsavedChanges && (
            <Stack direction="row" spacing={2}>
              <Alert severity="warning" sx={{ py: 0 }}>
                You have unsaved changes
              </Alert>
              <Button
                variant="outlined"
                startIcon={<Undo />}
                onClick={handleRevertChanges}
              >
                Revert
              </Button>
              <Button
                variant="contained"
                startIcon={<Save />}
                onClick={handleSaveAllChanges}
              >
                Save Changes
              </Button>
            </Stack>
          )}
        </Stack>
      </Box>

      {/* Tabs */}
      <Tabs value={tabValue} onChange={(e, v) => setTabValue(v)} sx={{ px: 2 }}>
        <Tab label="Pipeline Stages" />
        <Tab label="Automation Rules" />
        <Tab label="Templates" />
        <Tab label="General Settings" />
      </Tabs>

      {/* Tab Content */}
      <TabPanel value={tabValue} index={0}>
        {/* Pipeline Stages */}
        <Grid container spacing={3}>
          <Grid item xs={12} md={8}>
            <Typography variant="h6" gutterBottom>
              Sales Pipeline Stages
            </Typography>
            <Typography variant="body2" color="text.secondary" paragraph>
              Drag and drop to reorder stages. The order affects how opportunities progress through your pipeline.
            </Typography>

            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragEnd={handleDragEnd}
            >
              <SortableContext
                items={localStages.map(s => s.stage_id)}
                strategy={verticalListSortingStrategy}
              >
                {localStages.map((stage) => (
                  <SortableStageItem
                    key={stage.stage_id}
                    stage={stage}
                    onEdit={handleEditStage}
                    onDelete={handleDeleteStage}
                  />
                ))}
              </SortableContext>
            </DndContext>

            <Button
              variant="outlined"
              startIcon={<Add />}
              onClick={handleAddStage}
              fullWidth
              sx={{ mt: 2 }}
            >
              Add New Stage
            </Button>
          </Grid>

          <Grid item xs={12} md={4}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Stage Guidelines
                </Typography>
                <Stack spacing={2}>
                  <Alert severity="info">
                    Each stage should represent a clear milestone in your sales process
                  </Alert>
                  <Box>
                    <Typography variant="subtitle2" gutterBottom>
                      Best Practices:
                    </Typography>
                    <List dense>
                      <ListItem>
                        <ListItemText
                          primary="Keep stages between 5-8 for optimal flow"
                          secondary="Too many stages can slow down the process"
                        />
                      </ListItem>
                      <ListItem>
                        <ListItemText
                          primary="Use clear, action-oriented names"
                          secondary="e.g., 'Qualify Lead' instead of 'Qualification'"
                        />
                      </ListItem>
                      <ListItem>
                        <ListItemText
                          primary="Set realistic probabilities"
                          secondary="Based on historical conversion rates"
                        />
                      </ListItem>
                    </List>
                  </Box>
                </Stack>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      </TabPanel>

      <TabPanel value={tabValue} index={1}>
        {/* Automation Rules */}
        <Grid container spacing={3}>
          <Grid item xs={12}>
            <Stack direction="row" justifyContent="space-between" alignItems="center" mb={2}>
              <Box>
                <Typography variant="h6">Automation Rules</Typography>
                <Typography variant="body2" color="text.secondary">
                  Automate repetitive tasks and maintain data quality
                </Typography>
              </Box>
              <Button
                variant="contained"
                startIcon={<Add />}
                onClick={() => {
                  setSelectedRule(null);
                  setAutomationDialogOpen(true);
                }}
              >
                Create Rule
              </Button>
            </Stack>

            <Grid container spacing={2}>
              {automationRules.map((rule) => (
                <Grid item xs={12} md={6} key={rule.id}>
                  <Card>
                    <CardContent>
                      <Stack direction="row" justifyContent="space-between" alignItems="flex-start">
                        <Box sx={{ flex: 1 }}>
                          <Stack direction="row" alignItems="center" spacing={1} mb={1}>
                            <AutoAwesome color="primary" />
                            <Typography variant="h6">{rule.name}</Typography>
                          </Stack>
                          <Stack spacing={1}>
                            <Chip
                              icon={<Timer />}
                              label={`Trigger: ${rule.trigger}`}
                              size="small"
                              variant="outlined"
                            />
                            <Typography variant="body2" color="text.secondary">
                              When: {rule.condition}
                            </Typography>
                            <Typography variant="body2" color="text.secondary">
                              Then: {rule.action}
                            </Typography>
                          </Stack>
                        </Box>
                        <FormControlLabel
                          control={
                            <Switch
                              checked={rule.enabled}
                              onChange={() => handleToggleRule(rule.id)}
                            />
                          }
                          label="Active"
                          labelPlacement="top"
                        />
                      </Stack>
                    </CardContent>
                    <CardActions>
                      <Button size="small" onClick={() => handleEditRule(rule)}>
                        Edit
                      </Button>
                      <Button size="small" color="error" onClick={() => handleDeleteRule(rule.id)}>
                        Delete
                      </Button>
                    </CardActions>
                  </Card>
                </Grid>
              ))}
            </Grid>
          </Grid>
        </Grid>
      </TabPanel>

      <TabPanel value={tabValue} index={2}>
        {/* Templates */}
        <Typography variant="h6" gutterBottom>
          Email & Activity Templates
        </Typography>
        <Alert severity="info">
          Template management coming soon. Configure reusable templates for emails, tasks, and activities.
        </Alert>
      </TabPanel>

      <TabPanel value={tabValue} index={3}>
        {/* General Settings */}
        <Grid container spacing={3}>
          <Grid item xs={12} md={6}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Pipeline Behavior
                </Typography>
                <Stack spacing={3}>
                  <FormControlLabel
                    control={
                      <Switch
                        checked={settings.defaultProbabilities}
                        onChange={(e) => {
                          setSettings({ ...settings, defaultProbabilities: e.target.checked });
                          setHasUnsavedChanges(true);
                        }}
                      />
                    }
                    label="Use default win probabilities for stages"
                  />
                  <FormControlLabel
                    control={
                      <Switch
                        checked={settings.autoProgressRules}
                        onChange={(e) => {
                          setSettings({ ...settings, autoProgressRules: e.target.checked });
                          setHasUnsavedChanges(true);
                        }}
                      />
                    }
                    label="Enable automatic stage progression"
                  />
                  <Box>
                    <Typography gutterBottom>
                      Stale Opportunity Warning (days)
                    </Typography>
                    <Slider
                      value={settings.staleOpportunityDays}
                      onChange={(e, value) => {
                        setSettings({ ...settings, staleOpportunityDays: value as number });
                        setHasUnsavedChanges(true);
                      }}
                      min={7}
                      max={90}
                      valueLabelDisplay="auto"
                      marks={[
                        { value: 7, label: '7' },
                        { value: 30, label: '30' },
                        { value: 60, label: '60' },
                        { value: 90, label: '90' }
                      ]}
                    />
                  </Box>
                </Stack>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} md={6}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Targets & Thresholds
                </Typography>
                <Stack spacing={3}>
                  <TextField
                    label="High-Value Deal Threshold"
                    type="number"
                    value={settings.highValueThreshold}
                    onChange={(e) => {
                      setSettings({ ...settings, highValueThreshold: parseInt(e.target.value) });
                      setHasUnsavedChanges(true);
                    }}
                    InputProps={{
                      startAdornment: <InputAdornment position="start">$</InputAdornment>
                    }}
                    fullWidth
                  />
                  <TextField
                    label="Win Rate Target (%)"
                    type="number"
                    value={settings.winRateTarget}
                    onChange={(e) => {
                      setSettings({ ...settings, winRateTarget: parseInt(e.target.value) });
                      setHasUnsavedChanges(true);
                    }}
                    InputProps={{
                      endAdornment: <InputAdornment position="end">%</InputAdornment>
                    }}
                    fullWidth
                  />
                  <TextField
                    label="Forecast Accuracy Target (%)"
                    type="number"
                    value={settings.forecastAccuracyTarget}
                    onChange={(e) => {
                      setSettings({ ...settings, forecastAccuracyTarget: parseInt(e.target.value) });
                      setHasUnsavedChanges(true);
                    }}
                    InputProps={{
                      endAdornment: <InputAdornment position="end">%</InputAdornment>
                    }}
                    fullWidth
                  />
                </Stack>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Notifications & Integrations
                </Typography>
                <Stack spacing={2}>
                  <FormControlLabel
                    control={
                      <Switch
                        checked={settings.emailNotifications}
                        onChange={(e) => {
                          setSettings({ ...settings, emailNotifications: e.target.checked });
                          setHasUnsavedChanges(true);
                        }}
                      />
                    }
                    label="Email notifications for important events"
                  />
                  <FormControlLabel
                    control={
                      <Switch
                        checked={settings.slackIntegration}
                        onChange={(e) => {
                          setSettings({ ...settings, slackIntegration: e.target.checked });
                          setHasUnsavedChanges(true);
                        }}
                      />
                    }
                    label="Slack integration"
                  />
                  <FormControlLabel
                    control={
                      <Switch
                        checked={settings.webhooksEnabled}
                        onChange={(e) => {
                          setSettings({ ...settings, webhooksEnabled: e.target.checked });
                          setHasUnsavedChanges(true);
                        }}
                      />
                    }
                    label="Enable webhooks for external integrations"
                  />
                </Stack>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      </TabPanel>

      {/* Stage Dialog */}
      <Dialog open={stageDialogOpen} onClose={() => setStageDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>
          {selectedStage?.stage_id ? 'Edit Stage' : 'Add New Stage'}
        </DialogTitle>
        <DialogContent>
          <Stack spacing={3} sx={{ mt: 2 }}>
            <TextField
              label="Stage Name"
              value={selectedStage?.name || ''}
              onChange={(e) => setSelectedStage({ ...selectedStage, name: e.target.value })}
              fullWidth
              required
            />
            <TextField
              label="Description"
              value={selectedStage?.description || ''}
              onChange={(e) => setSelectedStage({ ...selectedStage, description: e.target.value })}
              fullWidth
              multiline
              rows={2}
            />
            <TextField
              label="Win Probability (%)"
              type="number"
              value={selectedStage?.probability || 0}
              onChange={(e) => setSelectedStage({ ...selectedStage, probability: parseInt(e.target.value) })}
              InputProps={{
                endAdornment: <InputAdornment position="end">%</InputAdornment>
              }}
              fullWidth
            />
            <FormControl fullWidth>
              <InputLabel>Stage Type</InputLabel>
              <Select
                value={selectedStage?.type || 'active'}
                onChange={(e) => setSelectedStage({ ...selectedStage, type: e.target.value })}
              >
                <MenuItem value="active">Active</MenuItem>
                <MenuItem value="won">Closed Won</MenuItem>
                <MenuItem value="lost">Closed Lost</MenuItem>
              </Select>
            </FormControl>
            <TextField
              label="Color"
              type="color"
              value={selectedStage?.color || '#2196f3'}
              onChange={(e) => setSelectedStage({ ...selectedStage, color: e.target.value })}
              fullWidth
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setStageDialogOpen(false)}>Cancel</Button>
          <Button onClick={handleSaveStage} variant="contained">
            {selectedStage?.stage_id ? 'Update' : 'Create'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Automation Rule Dialog */}
      <Dialog open={automationDialogOpen} onClose={() => setAutomationDialogOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>
          {selectedRule?.id ? 'Edit Automation Rule' : 'Create Automation Rule'}
        </DialogTitle>
        <DialogContent>
          <Stack spacing={3} sx={{ mt: 2 }}>
            <TextField
              label="Rule Name"
              value={selectedRule?.name || ''}
              onChange={(e) => setSelectedRule({ ...selectedRule!, name: e.target.value })}
              fullWidth
              required
            />
            <FormControl fullWidth>
              <InputLabel>Trigger Event</InputLabel>
              <Select
                value={selectedRule?.trigger || ''}
                onChange={(e) => setSelectedRule({ ...selectedRule!, trigger: e.target.value })}
              >
                <MenuItem value="opportunity_created">Opportunity Created</MenuItem>
                <MenuItem value="stage_changed">Stage Changed</MenuItem>
                <MenuItem value="amount_updated">Amount Updated</MenuItem>
                <MenuItem value="daily_check">Daily Check</MenuItem>
                <MenuItem value="weekly_check">Weekly Check</MenuItem>
              </Select>
            </FormControl>
            <TextField
              label="Condition"
              value={selectedRule?.condition || ''}
              onChange={(e) => setSelectedRule({ ...selectedRule!, condition: e.target.value })}
              fullWidth
              placeholder="e.g., amount > 50000 AND stage = 'Negotiation'"
              helperText="Define when this rule should trigger"
            />
            <FormControl fullWidth>
              <InputLabel>Action</InputLabel>
              <Select
                value={selectedRule?.action || ''}
                onChange={(e) => setSelectedRule({ ...selectedRule!, action: e.target.value })}
              >
                <MenuItem value="assign_to_user">Assign to User</MenuItem>
                <MenuItem value="send_notification">Send Notification</MenuItem>
                <MenuItem value="create_task">Create Task</MenuItem>
                <MenuItem value="update_field">Update Field</MenuItem>
                <MenuItem value="send_email">Send Email</MenuItem>
                <MenuItem value="webhook">Call Webhook</MenuItem>
              </Select>
            </FormControl>
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setAutomationDialogOpen(false)}>Cancel</Button>
          <Button onClick={() => {
            // Save rule logic
            setAutomationDialogOpen(false);
            setHasUnsavedChanges(true);
          }} variant="contained">
            {selectedRule?.id ? 'Update' : 'Create'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default PipelineSettings;