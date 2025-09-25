import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  ListItemSecondaryAction,
  IconButton,
  Switch,
  Typography,
  Box,
  Divider,
  Chip,
  Stack,
  TextField,
  MenuItem,
  Paper,
  Alert,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Grid
} from '@mui/material';
import {
  ExpandMore as ExpandMoreIcon,
  AutoMode as AutoModeIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Add as AddIcon,
  PlayArrow as PlayArrowIcon,
  Schedule as ScheduleIcon,
  BoltIcon
} from '@mui/icons-material';
import taskAutomationService from '../../services/taskAutomationService';
import { AutomationRule } from '../../types/automation.types';
import { useNotification } from '../../../../shared/hooks/useNotification';

interface TaskAutomationRulesProps {
  open: boolean;
  onClose: () => void;
  rules: AutomationRule[];
  onRuleUpdate: () => void;
}

export const TaskAutomationRules: React.FC<TaskAutomationRulesProps> = ({
  open,
  onClose,
  rules,
  onRuleUpdate
}) => {
  const { showNotification } = useNotification();
  const [showRuleForm, setShowRuleForm] = useState(false);
  const [editingRule, setEditingRule] = useState<AutomationRule | null>(null);
  const [formData, setFormData] = useState<Partial<AutomationRule>>({
    name: '',
    description: '',
    triggerType: 'status_change',
    triggerConditions: {},
    actionType: 'create_task',
    actionConfig: {},
    isActive: true,
    priority: 1
  });

  useEffect(() => {
    if (editingRule) {
      setFormData(editingRule);
    }
  }, [editingRule]);

  const handleCreateRule = () => {
    setEditingRule(null);
    setFormData({
      name: '',
      description: '',
      triggerType: 'status_change',
      triggerConditions: {},
      actionType: 'create_task',
      actionConfig: {},
      isActive: true,
      priority: 1
    });
    setShowRuleForm(true);
  };

  const handleEditRule = (rule: AutomationRule) => {
    setEditingRule(rule);
    setShowRuleForm(true);
  };

  const handleSaveRule = async () => {
    try {
      if (!formData.name) {
        showNotification('Rule name is required', 'error');
        return;
      }

      if (editingRule) {
        await taskAutomationService.updateRule(editingRule.id, formData);
        showNotification('Rule updated successfully', 'success');
      } else {
        await taskAutomationService.createRule(formData);
        showNotification('Rule created successfully', 'success');
      }

      setShowRuleForm(false);
      onRuleUpdate();
    } catch (error) {
      showNotification('Failed to save rule', 'error');
    }
  };

  const handleDeleteRule = async (ruleId: number) => {
    try {
      await taskAutomationService.deleteRule(ruleId);
      showNotification('Rule deleted successfully', 'success');
      onRuleUpdate();
    } catch (error) {
      showNotification('Failed to delete rule', 'error');
    }
  };

  const handleToggleRule = async (ruleId: number, enabled: boolean) => {
    try {
      await taskAutomationService.toggleRule(ruleId, enabled);
      onRuleUpdate();
    } catch (error) {
      showNotification('Failed to toggle rule', 'error');
    }
  };

  const handleTestRule = async (ruleId: number) => {
    try {
      await taskAutomationService.triggerRule(ruleId);
      showNotification('Rule triggered successfully', 'success');
    } catch (error) {
      showNotification('Failed to trigger rule', 'error');
    }
  };

  const getTriggerDescription = (rule: AutomationRule): string => {
    switch (rule.triggerType) {
      case 'status_change':
        return `When status changes to ${rule.triggerConditions.new_value}`;
      case 'field_update':
        return `When ${rule.triggerConditions.field} is updated`;
      case 'time_based':
        return `Scheduled: ${rule.schedule}`;
      case 'record_created':
        return `When new ${rule.triggerConditions.entity} is created`;
      default:
        return 'Custom trigger';
    }
  };

  const getActionDescription = (rule: AutomationRule): string => {
    switch (rule.actionType) {
      case 'create_task':
        return `Create task: ${rule.actionConfig.subject || 'New task'}`;
      case 'send_email':
        return `Send email to ${rule.actionConfig.to || 'recipient'}`;
      case 'update_field':
        return `Update ${rule.actionConfig.field} to ${rule.actionConfig.value}`;
      case 'create_activity':
        return `Create ${rule.actionConfig.type || 'activity'}`;
      default:
        return 'Custom action';
    }
  };

  return (
    <>
      <Dialog open={open && !showRuleForm} onClose={onClose} maxWidth="md" fullWidth>
        <DialogTitle>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Typography variant="h6">Task Automation Rules</Typography>
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={handleCreateRule}
              size="small"
            >
              New Rule
            </Button>
          </Box>
        </DialogTitle>
        
        <DialogContent dividers>
          <Alert severity="info" sx={{ mb: 3 }}>
            Automation rules help you streamline your workflow by automatically
            performing actions based on triggers.
          </Alert>

          {rules.length === 0 ? (
            <Paper sx={{ p: 4, textAlign: 'center' }}>
              <AutoModeIcon sx={{ fontSize: 48, color: 'text.secondary', mb: 2 }} />
              <Typography variant="h6" color="text.secondary">
                No automation rules yet
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                Create your first rule to start automating tasks
              </Typography>
              <Button
                variant="outlined"
                startIcon={<AddIcon />}
                onClick={handleCreateRule}
              >
                Create First Rule
              </Button>
            </Paper>
          ) : (
            <List>
              {rules.map(rule => (
                <Accordion key={rule.id}>
                  <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                    <Box sx={{ display: 'flex', alignItems: 'center', width: '100%', pr: 2 }}>
                      <ListItemIcon>
                        <AutoModeIcon color={rule.isActive ? 'primary' : 'disabled'} />
                      </ListItemIcon>
                      <Box sx={{ flex: 1 }}>
                        <Typography variant="subtitle1">{rule.name}</Typography>
                        <Typography variant="body2" color="text.secondary">
                          {rule.description}
                        </Typography>
                      </Box>
                      <Stack direction="row" spacing={1}>
                        {rule.triggerType === 'time_based' && (
                          <Chip
                            icon={<ScheduleIcon />}
                            label="Scheduled"
                            size="small"
                            variant="outlined"
                          />
                        )}
                        <Chip
                          label={rule.isActive ? 'Active' : 'Inactive'}
                          color={rule.isActive ? 'success' : 'default'}
                          size="small"
                        />
                      </Stack>
                    </Box>
                  </AccordionSummary>
                  <AccordionDetails>
                    <Box sx={{ p: 2 }}>
                      <Grid container spacing={2}>
                        <Grid item xs={12} md={6}>
                          <Typography variant="subtitle2" color="text.secondary">
                            Trigger
                          </Typography>
                          <Typography variant="body2">
                            {getTriggerDescription(rule)}
                          </Typography>
                        </Grid>
                        <Grid item xs={12} md={6}>
                          <Typography variant="subtitle2" color="text.secondary">
                            Action
                          </Typography>
                          <Typography variant="body2">
                            {getActionDescription(rule)}
                          </Typography>
                        </Grid>
                        <Grid item xs={12}>
                          <Stack direction="row" spacing={2} sx={{ mt: 1 }}>
                            <Typography variant="caption" color="text.secondary">
                              Executed: {rule.executionCount} times
                            </Typography>
                            {rule.lastExecutedAt && (
                              <Typography variant="caption" color="text.secondary">
                                Last run: {new Date(rule.lastExecutedAt).toLocaleString()}
                              </Typography>
                            )}
                          </Stack>
                        </Grid>
                      </Grid>
                      
                      <Divider sx={{ my: 2 }} />
                      
                      <Stack direction="row" spacing={1} justifyContent="flex-end">
                        <Switch
                          checked={rule.isActive}
                          onChange={(e) => handleToggleRule(rule.id, e.target.checked)}
                        />
                        <IconButton
                          size="small"
                          onClick={() => handleTestRule(rule.id)}
                          disabled={!rule.isActive}
                        >
                          <PlayArrowIcon />
                        </IconButton>
                        <IconButton
                          size="small"
                          onClick={() => handleEditRule(rule)}
                        >
                          <EditIcon />
                        </IconButton>
                        <IconButton
                          size="small"
                          onClick={() => handleDeleteRule(rule.id)}
                          color="error"
                        >
                          <DeleteIcon />
                        </IconButton>
                      </Stack>
                    </Box>
                  </AccordionDetails>
                </Accordion>
              ))}
            </List>
          )}
        </DialogContent>

        <DialogActions>
          <Button onClick={onClose}>Close</Button>
        </DialogActions>
      </Dialog>

      <Dialog open={showRuleForm} onClose={() => setShowRuleForm(false)} maxWidth="sm" fullWidth>
        <DialogTitle>
          {editingRule ? 'Edit Automation Rule' : 'New Automation Rule'}
        </DialogTitle>
        <DialogContent dividers>
          <Grid container spacing={2} sx={{ pt: 1 }}>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Rule Name"
                value={formData.name}
                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                required
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                multiline
                rows={2}
                label="Description"
                value={formData.description}
                onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                select
                fullWidth
                label="Trigger Type"
                value={formData.triggerType}
                onChange={(e) => setFormData(prev => ({ ...prev, triggerType: e.target.value as any }))}
              >
                <MenuItem value="status_change">Status Change</MenuItem>
                <MenuItem value="field_update">Field Update</MenuItem>
                <MenuItem value="time_based">Time Based</MenuItem>
                <MenuItem value="record_created">Record Created</MenuItem>
              </TextField>
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                select
                fullWidth
                label="Action Type"
                value={formData.actionType}
                onChange={(e) => setFormData(prev => ({ ...prev, actionType: e.target.value as any }))}
              >
                <MenuItem value="create_task">Create Task</MenuItem>
                <MenuItem value="send_email">Send Email</MenuItem>
                <MenuItem value="update_field">Update Field</MenuItem>
                <MenuItem value="create_activity">Create Activity</MenuItem>
              </TextField>
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                type="number"
                label="Priority"
                value={formData.priority}
                onChange={(e) => setFormData(prev => ({ ...prev, priority: parseInt(e.target.value) }))}
                helperText="Higher priority rules run first"
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowRuleForm(false)}>Cancel</Button>
          <Button onClick={handleSaveRule} variant="contained">
            {editingRule ? 'Update' : 'Create'}
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
};