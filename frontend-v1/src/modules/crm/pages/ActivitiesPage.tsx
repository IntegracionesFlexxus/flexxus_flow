import React, { useState, useEffect, useCallback } from 'react';
import {
  Box,
  Paper,
  Typography,
  Button,
  Tabs,
  Tab,
  IconButton,
  Menu,
  MenuItem,
  Chip,
  Stack,
  TextField,
  InputAdornment
} from '@mui/material';
import {
  Add as AddIcon,
  Search as SearchIcon,
  FilterList as FilterIcon,
  Download as DownloadIcon,
  ViewList as ViewListIcon,
  CalendarMonth as CalendarIcon,
  ViewKanban as KanbanIcon,
  MoreVert as MoreVertIcon
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import activityService from '../services/activityService';
import { Activity, ActivityFilter } from '../types/activity.types';
import { CalendarView } from '../activities/components/CalendarView';
import TaskManager from '../activities/components/TaskManager';
import { ActivityForm } from '../activities/components/ActivityForm';
import { useNotification } from '../../../shared/hooks/useNotification';

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
      id={`activities-tabpanel-${index}`}
      aria-labelledby={`activities-tab-${index}`}
      {...other}
    >
      {value === index && <Box sx={{ p: 3 }}>{children}</Box>}
    </div>
  );
}

export const ActivitiesPage: React.FC = () => {
  const navigate = useNavigate();
  const { showNotification } = useNotification();
  const [tabValue, setTabValue] = useState(0);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchText, setSearchText] = useState('');
  const [filters, setFilters] = useState<ActivityFilter>({});
  const [viewMode, setViewMode] = useState<'list' | 'calendar' | 'kanban'>('list');
  const [showActivityForm, setShowActivityForm] = useState(false);
  const [selectedActivity, setSelectedActivity] = useState<Activity | null>(null);
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [stats, setStats] = useState<any>(null);

  useEffect(() => {
    loadActivities();
    loadStats();
  }, [filters]);

  const loadActivities = async () => {
    try {
      setLoading(true);
      const data = await activityService.getActivities(filters);
      setActivities(data);
    } catch (error) {
      showNotification('Error loading activities', 'error');
    } finally {
      setLoading(false);
    }
  };

  const loadStats = async () => {
    try {
      const data = await activityService.getStats(filters);
      setStats(data);
    } catch (error) {
      console.error('Error loading stats:', error);
    }
  };

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
    const typeMap = ['all', 'task', 'meeting', 'call', 'email'];
    setFilters(prev => ({
      ...prev,
      type: newValue === 0 ? undefined : typeMap[newValue]
    }));
  };

  const handleSearch = (event: React.ChangeEvent<HTMLInputElement>) => {
    setSearchText(event.target.value);
    setFilters(prev => ({
      ...prev,
      search: event.target.value
    }));
  };

  const handleCreateActivity = () => {
    setSelectedActivity(null);
    setShowActivityForm(true);
  };

  const handleEditActivity = (activity: Activity) => {
    setSelectedActivity(activity);
    setShowActivityForm(true);
  };

  const handleDeleteActivity = async (id: number) => {
    try {
      await activityService.deleteActivity(id);
      showNotification('Activity deleted successfully', 'success');
      loadActivities();
    } catch (error) {
      showNotification('Error deleting activity', 'error');
    }
  };

  const handleExport = async (format: 'csv' | 'excel') => {
    try {
      const blob = await activityService.exportActivities(format, filters);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `activities.${format === 'csv' ? 'csv' : 'xlsx'}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
      showNotification('Activities exported successfully', 'success');
    } catch (error) {
      showNotification('Error exporting activities', 'error');
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
      <Stack direction="row" spacing={2} sx={{ mb: 3 }}>
        <Paper sx={{ p: 2, flex: 1 }}>
          <Typography variant="h6">{stats.totalActivities}</Typography>
          <Typography variant="body2" color="text.secondary">
            Total Activities
          </Typography>
        </Paper>
        <Paper sx={{ p: 2, flex: 1 }}>
          <Typography variant="h6">{stats.completedToday}</Typography>
          <Typography variant="body2" color="text.secondary">
            Completed Today
          </Typography>
        </Paper>
        <Paper sx={{ p: 2, flex: 1 }}>
          <Typography variant="h6">{stats.upcomingWeek}</Typography>
          <Typography variant="body2" color="text.secondary">
            Upcoming This Week
          </Typography>
        </Paper>
        <Paper sx={{ p: 2, flex: 1 }}>
          <Typography variant="h6">{stats.overdue}</Typography>
          <Typography variant="body2" color="text.secondary">
            Overdue
          </Typography>
        </Paper>
      </Stack>
    );
  };

  return (
    <Box sx={{ p: 3 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4">Activities</Typography>
        <Stack direction="row" spacing={2}>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={handleCreateActivity}
          >
            New Activity
          </Button>
          <IconButton onClick={handleMenuOpen}>
            <MoreVertIcon />
          </IconButton>
          <Menu
            anchorEl={anchorEl}
            open={Boolean(anchorEl)}
            onClose={handleMenuClose}
          >
            <MenuItem onClick={() => { handleExport('csv'); handleMenuClose(); }}>
              <DownloadIcon sx={{ mr: 1 }} /> Export as CSV
            </MenuItem>
            <MenuItem onClick={() => { handleExport('excel'); handleMenuClose(); }}>
              <DownloadIcon sx={{ mr: 1 }} /> Export as Excel
            </MenuItem>
            <MenuItem onClick={() => { navigate('/crm/activities/templates'); handleMenuClose(); }}>
              Manage Templates
            </MenuItem>
            <MenuItem onClick={() => { navigate('/crm/automation/rules'); handleMenuClose(); }}>
              Automation Rules
            </MenuItem>
          </Menu>
        </Stack>
      </Box>

      {renderStats()}

      <Paper sx={{ mb: 3 }}>
        <Box sx={{ p: 2, display: 'flex', gap: 2, alignItems: 'center' }}>
          <TextField
            placeholder="Search activities..."
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
            <IconButton
              color={viewMode === 'list' ? 'primary' : 'default'}
              onClick={() => setViewMode('list')}
            >
              <ViewListIcon />
            </IconButton>
            <IconButton
              color={viewMode === 'calendar' ? 'primary' : 'default'}
              onClick={() => setViewMode('calendar')}
            >
              <CalendarIcon />
            </IconButton>
            <IconButton
              color={viewMode === 'kanban' ? 'primary' : 'default'}
              onClick={() => setViewMode('kanban')}
            >
              <KanbanIcon />
            </IconButton>
          </Stack>
        </Box>

        <Tabs value={tabValue} onChange={handleTabChange} aria-label="activity tabs">
          <Tab label="All" />
          <Tab label="Tasks" />
          <Tab label="Meetings" />
          <Tab label="Calls" />
          <Tab label="Emails" />
        </Tabs>

        <TabPanel value={tabValue} index={tabValue}>
          {viewMode === 'calendar' ? (
            <CalendarView
              activities={activities}
              onActivityClick={handleEditActivity}
              onActivityCreate={handleCreateActivity}
            />
          ) : viewMode === 'kanban' ? (
            <TaskManager
              activities={activities.filter(a => a.type === 'task')}
              onActivityUpdate={loadActivities}
              onActivityClick={handleEditActivity}
            />
          ) : (
            <Box>
              {activities.map(activity => (
                <Paper key={activity.id} sx={{ p: 2, mb: 2 }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Box>
                      <Typography variant="h6">{activity.subject}</Typography>
                      <Typography variant="body2" color="text.secondary">
                        {activity.type} • {new Date(activity.dueDate || activity.scheduledAt).toLocaleDateString()}
                      </Typography>
                    </Box>
                    <Stack direction="row" spacing={1}>
                      <Chip
                        label={activity.status}
                        size="small"
                        color={activity.status === 'completed' ? 'success' : 'default'}
                      />
                      <Chip
                        label={activity.priority}
                        size="small"
                        color={activity.priority === 'high' ? 'error' : 'default'}
                      />
                      <IconButton size="small" onClick={() => handleEditActivity(activity)}>
                        <MoreVertIcon />
                      </IconButton>
                    </Stack>
                  </Box>
                </Paper>
              ))}
            </Box>
          )}
        </TabPanel>
      </Paper>

      {showActivityForm && (
        <ActivityForm
          activity={selectedActivity}
          open={showActivityForm}
          onClose={() => setShowActivityForm(false)}
          onSave={() => {
            setShowActivityForm(false);
            loadActivities();
          }}
        />
      )}
    </Box>
  );
};