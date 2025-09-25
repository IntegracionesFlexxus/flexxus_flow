import React, { useState, useEffect } from 'react';
import {
  Box,
  Paper,
  Typography,
  Button,
  Tabs,
  Tab,
  Stack,
  Chip,
  LinearProgress,
  IconButton,
  Menu,
  MenuItem,
  TextField,
  InputAdornment
} from '@mui/material';
import {
  Add as AddIcon,
  Search as SearchIcon,
  FilterList as FilterIcon,
  AutoMode as AutomationIcon,
  Assessment as AssessmentIcon,
  MoreVert as MoreVertIcon,
  Timer as TimerIcon,
  CheckCircle as CheckCircleIcon
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import TaskManager from '../activities/components/TaskManager';
import { TaskAutomationRules } from '../activities/components/TaskAutomationRules';
import activityService from '../services/activityService';
import taskAutomationService from '../services/taskAutomationService';
import { Activity, ActivityFilter } from '../types/activity.types';
import { AutomationRule } from '../types/automation.types';
import { useNotification } from '../../../shared/hooks/useNotification';

interface TaskStats {
  total: number;
  completed: number;
  inProgress: number;
  notStarted: number;
  overdue: number;
  completionRate: number;
  averageCompletionTime: number;
  todayCompleted: number;
  weeklyTarget: number;
  weeklyCompleted: number;
}

export const TasksPage: React.FC = () => {
  const navigate = useNavigate();
  const { showNotification } = useNotification();
  const [tasks, setTasks] = useState<Activity[]>([]);
  const [automationRules, setAutomationRules] = useState<AutomationRule[]>([]);
  const [stats, setStats] = useState<TaskStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [tabValue, setTabValue] = useState(0);
  const [searchText, setSearchText] = useState('');
  const [filters, setFilters] = useState<ActivityFilter>({
    type: 'task'
  });
  const [showAutomationDialog, setShowAutomationDialog] = useState(false);
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [viewMode, setViewMode] = useState<'kanban' | 'list'>('kanban');

  useEffect(() => {
    loadTasks();
    loadAutomationRules();
    loadTaskStats();
  }, [filters]);

  const loadTasks = async () => {
    try {
      setLoading(true);
      const data = await activityService.getActivities({
        ...filters,
        type: 'task'
      });
      setTasks(data);
    } catch (error) {
      showNotification('Error loading tasks', 'error');
    } finally {
      setLoading(false);
    }
  };

  const loadAutomationRules = async () => {
    try {
      const data = await taskAutomationService.getRules(true);
      setAutomationRules(data.filter(rule => 
        rule.actionType === 'create_task' || 
        rule.triggerType === 'task_completed'
      ));
    } catch (error) {
      console.error('Error loading automation rules:', error);
    }
  };

  const loadTaskStats = async () => {
    try {
      const data = await activityService.getStats({ type: 'task' });
      setStats(data);
    } catch (error) {
      console.error('Error loading task stats:', error);
    }
  };

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
    const statusMap = ['all', 'not_started', 'in_progress', 'completed', 'overdue'];
    setFilters(prev => ({
      ...prev,
      status: newValue === 0 ? undefined : statusMap[newValue]
    }));
  };

  const handleSearch = (event: React.ChangeEvent<HTMLInputElement>) => {
    setSearchText(event.target.value);
    setFilters(prev => ({
      ...prev,
      search: event.target.value
    }));
  };

  const handleBulkComplete = async (taskIds: number[]) => {
    try {
      await activityService.bulkUpdateActivities(taskIds, { status: 'completed' });
      showNotification(`${taskIds.length} tasks marked as completed`, 'success');
      loadTasks();
      loadTaskStats();
    } catch (error) {
      showNotification('Error completing tasks', 'error');
    }
  };

  const handleMenuOpen = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
  };

  const renderStats = () => {
    if (!stats) return null;

    return (
      <Paper sx={{ p: 3, mb: 3 }}>
        <Typography variant="h6" sx={{ mb: 2 }}>Task Overview</Typography>
        <Stack spacing={3}>
          <Box>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
              <Typography variant="body2" color="text.secondary">
                Weekly Progress
              </Typography>
              <Typography variant="body2">
                {stats.weeklyCompleted} / {stats.weeklyTarget}
              </Typography>
            </Box>
            <LinearProgress
              variant="determinate"
              value={(stats.weeklyCompleted / stats.weeklyTarget) * 100}
              sx={{ height: 8, borderRadius: 4 }}
            />
          </Box>

          <Stack direction="row" spacing={2}>
            <Paper variant="outlined" sx={{ p: 2, flex: 1 }}>
              <Stack direction="row" spacing={1} alignItems="center">
                <CheckCircleIcon color="success" />
                <Box>
                  <Typography variant="h5">{stats.completed}</Typography>
                  <Typography variant="caption" color="text.secondary">
                    Completed
                  </Typography>
                </Box>
              </Stack>
            </Paper>
            <Paper variant="outlined" sx={{ p: 2, flex: 1 }}>
              <Stack direction="row" spacing={1} alignItems="center">
                <TimerIcon color="warning" />
                <Box>
                  <Typography variant="h5">{stats.inProgress}</Typography>
                  <Typography variant="caption" color="text.secondary">
                    In Progress
                  </Typography>
                </Box>
              </Stack>
            </Paper>
            <Paper variant="outlined" sx={{ p: 2, flex: 1 }}>
              <Stack direction="row" spacing={1} alignItems="center">
                <AssessmentIcon color="error" />
                <Box>
                  <Typography variant="h5">{stats.overdue}</Typography>
                  <Typography variant="caption" color="text.secondary">
                    Overdue
                  </Typography>
                </Box>
              </Stack>
            </Paper>
          </Stack>

          <Box sx={{ display: 'flex', gap: 3 }}>
            <Box>
              <Typography variant="body2" color="text.secondary">
                Completion Rate
              </Typography>
              <Typography variant="h6">
                {Math.round(stats.completionRate)}%
              </Typography>
            </Box>
            <Box>
              <Typography variant="body2" color="text.secondary">
                Today's Completed
              </Typography>
              <Typography variant="h6">
                {stats.todayCompleted}
              </Typography>
            </Box>
            <Box>
              <Typography variant="body2" color="text.secondary">
                Avg. Completion Time
              </Typography>
              <Typography variant="h6">
                {Math.round(stats.averageCompletionTime)} hrs
              </Typography>
            </Box>
          </Box>
        </Stack>
      </Paper>
    );
  };

  const renderAutomationStatus = () => {
    const activeRules = automationRules.filter(rule => rule.isActive).length;
    return (
      <Paper sx={{ p: 2, mb: 3 }}>
        <Stack direction="row" spacing={2} alignItems="center">
          <AutomationIcon color="primary" />
          <Box sx={{ flex: 1 }}>
            <Typography variant="subtitle2">
              Task Automation
            </Typography>
            <Typography variant="caption" color="text.secondary">
              {activeRules} active rules automating your tasks
            </Typography>
          </Box>
          <Button
            variant="outlined"
            size="small"
            onClick={() => setShowAutomationDialog(true)}
          >
            Manage Rules
          </Button>
        </Stack>
      </Paper>
    );
  };

  return (
    <Box sx={{ p: 3 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4">Tasks</Typography>
        <Stack direction="row" spacing={2}>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => {}}
          >
            New Task
          </Button>
          <Button
            variant="outlined"
            startIcon={<AutomationIcon />}
            onClick={() => setShowAutomationDialog(true)}
          >
            Automation
          </Button>
          <IconButton onClick={handleMenuOpen}>
            <MoreVertIcon />
          </IconButton>
          <Menu
            anchorEl={anchorEl}
            open={Boolean(anchorEl)}
            onClose={handleMenuClose}
          >
            <MenuItem onClick={() => { navigate('/crm/activities/templates'); handleMenuClose(); }}>
              Task Templates
            </MenuItem>
            <MenuItem onClick={() => { navigate('/crm/reports/tasks'); handleMenuClose(); }}>
              Task Reports
            </MenuItem>
            <MenuItem onClick={() => { handleMenuClose(); }}>
              Export Tasks
            </MenuItem>
          </Menu>
        </Stack>
      </Box>

      {renderStats()}
      {renderAutomationStatus()}

      <Paper>
        <Box sx={{ p: 2, display: 'flex', gap: 2, alignItems: 'center', borderBottom: 1, borderColor: 'divider' }}>
          <TextField
            placeholder="Search tasks..."
            value={searchText}
            onChange={handleSearch}
            size="small"
            sx={{ flex: 1 }}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon />
                </InputAdornment>
              )
            }}
          />
          <Stack direction="row" spacing={1}>
            <Chip
              label="Kanban"
              onClick={() => setViewMode('kanban')}
              color={viewMode === 'kanban' ? 'primary' : 'default'}
            />
            <Chip
              label="List"
              onClick={() => setViewMode('list')}
              color={viewMode === 'list' ? 'primary' : 'default'}
            />
          </Stack>
          <IconButton>
            <FilterIcon />
          </IconButton>
        </Box>

        <Tabs value={tabValue} onChange={handleTabChange} aria-label="task status tabs">
          <Tab label={`All (${tasks.length})`} />
          <Tab label="Not Started" />
          <Tab label="In Progress" />
          <Tab label="Completed" />
          <Tab label="Overdue" />
        </Tabs>

        <Box sx={{ p: 3, minHeight: 400 }}>
          {loading ? (
            <LinearProgress />
          ) : (
            <TaskManager
              activities={tasks}
              viewMode={viewMode}
              onActivityUpdate={loadTasks}
              onActivityClick={(task) => {}}
              onBulkComplete={handleBulkComplete}
            />
          )}
        </Box>
      </Paper>

      {showAutomationDialog && (
        <TaskAutomationRules
          open={showAutomationDialog}
          onClose={() => setShowAutomationDialog(false)}
          rules={automationRules}
          onRuleUpdate={loadAutomationRules}
        />
      )}
    </Box>
  );
};