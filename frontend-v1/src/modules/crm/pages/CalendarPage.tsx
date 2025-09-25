import React, { useState, useEffect } from 'react';
import {
  Box,
  Paper,
  Typography,
  Button,
  IconButton,
  Stack,
  Drawer,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Switch,
  Divider,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  MenuItem
} from '@mui/material';
import {
  Add as AddIcon,
  Settings as SettingsIcon,
  Sync as SyncIcon,
  Google as GoogleIcon,
  Microsoft as MicrosoftIcon,
  FilterList as FilterIcon,
  Today as TodayIcon,
  ChevronLeft as ChevronLeftIcon,
  ChevronRight as ChevronRightIcon
} from '@mui/icons-material';
import { CalendarView } from '../activities/components/CalendarView';
import { CalendarIntegrationSettings } from '../activities/components/CalendarIntegrationSettings';
import calendarService from '../services/calendarService';
import activityService from '../services/activityService';
import { Activity } from '../types/activity.types';
import { CalendarIntegration } from '../types/calendar.types';
import { useNotification } from '../../../shared/hooks/useNotification';

export const CalendarPage: React.FC = () => {
  const { showNotification } = useNotification();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [viewType, setViewType] = useState<'month' | 'week' | 'day' | 'agenda'>('month');
  const [activities, setActivities] = useState<Activity[]>([]);
  const [integrations, setIntegrations] = useState<CalendarIntegration[]>([]);
  const [loading, setLoading] = useState(true);
  const [showSettings, setShowSettings] = useState(false);
  const [showFilterDrawer, setShowFilterDrawer] = useState(false);
  const [filters, setFilters] = useState({
    types: [] as string[],
    statuses: [] as string[],
    showCompleted: true
  });
  const [showIntegrationDialog, setShowIntegrationDialog] = useState(false);
  const [selectedProvider, setSelectedProvider] = useState<'google' | 'outlook'>('google');

  useEffect(() => {
    loadCalendarData();
    loadIntegrations();
  }, [currentDate, viewType, filters]);

  const loadCalendarData = async () => {
    try {
      setLoading(true);
      const startDate = getViewStartDate();
      const endDate = getViewEndDate();
      
      const data = await activityService.getCalendarActivities(
        startDate.toISOString(),
        endDate.toISOString(),
        filters
      );
      setActivities(data);
    } catch (error) {
      showNotification('Error loading calendar data', 'error');
    } finally {
      setLoading(false);
    }
  };

  const loadIntegrations = async () => {
    try {
      const data = await calendarService.getIntegrations();
      setIntegrations(data);
    } catch (error) {
      console.error('Error loading integrations:', error);
    }
  };

  const getViewStartDate = (): Date => {
    const date = new Date(currentDate);
    switch (viewType) {
      case 'month':
        date.setDate(1);
        date.setDate(date.getDate() - date.getDay());
        break;
      case 'week':
        date.setDate(date.getDate() - date.getDay());
        break;
      case 'day':
        break;
      case 'agenda':
        break;
    }
    date.setHours(0, 0, 0, 0);
    return date;
  };

  const getViewEndDate = (): Date => {
    const date = new Date(currentDate);
    switch (viewType) {
      case 'month':
        date.setMonth(date.getMonth() + 1);
        date.setDate(0);
        date.setDate(date.getDate() + (6 - date.getDay()));
        break;
      case 'week':
        date.setDate(date.getDate() + (6 - date.getDay()));
        break;
      case 'day':
        break;
      case 'agenda':
        date.setDate(date.getDate() + 30);
        break;
    }
    date.setHours(23, 59, 59, 999);
    return date;
  };

  const handleNavigate = (direction: 'prev' | 'next' | 'today') => {
    const newDate = new Date(currentDate);
    switch (direction) {
      case 'prev':
        if (viewType === 'month') newDate.setMonth(newDate.getMonth() - 1);
        else if (viewType === 'week') newDate.setDate(newDate.getDate() - 7);
        else if (viewType === 'day') newDate.setDate(newDate.getDate() - 1);
        break;
      case 'next':
        if (viewType === 'month') newDate.setMonth(newDate.getMonth() + 1);
        else if (viewType === 'week') newDate.setDate(newDate.getDate() + 7);
        else if (viewType === 'day') newDate.setDate(newDate.getDate() + 1);
        break;
      case 'today':
        setCurrentDate(new Date());
        return;
    }
    setCurrentDate(newDate);
  };

  const handleIntegrateCalendar = async () => {
    try {
      const { authUrl } = await calendarService.initializeOAuth(selectedProvider);
      window.location.href = authUrl;
    } catch (error) {
      showNotification('Error initializing calendar integration', 'error');
    }
  };

  const handleSyncCalendar = async (integrationId: number) => {
    try {
      const result = await calendarService.syncCalendar(integrationId);
      showNotification(
        `Synced ${result.imported} imported, ${result.exported} exported`,
        'success'
      );
      loadCalendarData();
    } catch (error) {
      showNotification('Error syncing calendar', 'error');
    }
  };

  const getDateRangeText = (): string => {
    const options: Intl.DateTimeFormatOptions = { year: 'numeric', month: 'long' };
    if (viewType === 'month') {
      return currentDate.toLocaleDateString('en-US', options);
    } else if (viewType === 'week') {
      const start = getViewStartDate();
      const end = getViewEndDate();
      return `${start.toLocaleDateString()} - ${end.toLocaleDateString()}`;
    } else if (viewType === 'day') {
      return currentDate.toLocaleDateString('en-US', { 
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });
    }
    return '';
  };

  return (
    <Box sx={{ display: 'flex', height: 'calc(100vh - 64px)' }}>
      <Box sx={{ flex: 1, p: 3 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
          <Stack direction="row" spacing={2} alignItems="center">
            <Typography variant="h4">Calendar</Typography>
            <Typography variant="h6" color="text.secondary">
              {getDateRangeText()}
            </Typography>
          </Stack>
          
          <Stack direction="row" spacing={2}>
            <Button
              variant="outlined"
              startIcon={<TodayIcon />}
              onClick={() => handleNavigate('today')}
            >
              Today
            </Button>
            <IconButton onClick={() => handleNavigate('prev')}>
              <ChevronLeftIcon />
            </IconButton>
            <IconButton onClick={() => handleNavigate('next')}>
              <ChevronRightIcon />
            </IconButton>
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={() => {}}
            >
              New Event
            </Button>
            <IconButton onClick={() => setShowFilterDrawer(true)}>
              <FilterIcon />
            </IconButton>
            <IconButton onClick={() => setShowSettings(true)}>
              <SettingsIcon />
            </IconButton>
          </Stack>
        </Box>

        <Paper sx={{ p: 2, mb: 2 }}>
          <Stack direction="row" spacing={1}>
            {(['month', 'week', 'day', 'agenda'] as const).map(view => (
              <Button
                key={view}
                variant={viewType === view ? 'contained' : 'text'}
                onClick={() => setViewType(view)}
                size="small"
              >
                {view.charAt(0).toUpperCase() + view.slice(1)}
              </Button>
            ))}
          </Stack>
        </Paper>

        {integrations.length > 0 && (
          <Paper sx={{ p: 2, mb: 2 }}>
            <Stack direction="row" spacing={2} alignItems="center">
              <Typography variant="subtitle2">Connected Calendars:</Typography>
              {integrations.map(integration => (
                <Chip
                  key={integration.id}
                  icon={integration.provider === 'google' ? <GoogleIcon /> : <MicrosoftIcon />}
                  label={integration.email}
                  onDelete={() => handleSyncCalendar(integration.id)}
                  deleteIcon={<SyncIcon />}
                />
              ))}
            </Stack>
          </Paper>
        )}

        <Paper sx={{ height: 'calc(100% - 200px)', overflow: 'auto' }}>
          <CalendarView
            activities={activities}
            viewType={viewType}
            currentDate={currentDate}
            onActivityClick={(activity) => {}}
            onActivityCreate={() => {}}
            onDateClick={(date) => setCurrentDate(date)}
          />
        </Paper>
      </Box>

      <Drawer
        anchor="right"
        open={showFilterDrawer}
        onClose={() => setShowFilterDrawer(false)}
      >
        <Box sx={{ width: 300, p: 3 }}>
          <Typography variant="h6" sx={{ mb: 3 }}>Filters</Typography>
          
          <Typography variant="subtitle2" sx={{ mb: 1 }}>Activity Types</Typography>
          <List>
            {['task', 'meeting', 'call', 'email'].map(type => (
              <ListItem key={type}>
                <ListItemIcon>
                  <Switch
                    checked={filters.types.includes(type)}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setFilters(prev => ({
                          ...prev,
                          types: [...prev.types, type]
                        }));
                      } else {
                        setFilters(prev => ({
                          ...prev,
                          types: prev.types.filter(t => t !== type)
                        }));
                      }
                    }}
                  />
                </ListItemIcon>
                <ListItemText primary={type.charAt(0).toUpperCase() + type.slice(1)} />
              </ListItem>
            ))}
          </List>

          <Divider sx={{ my: 2 }} />

          <ListItem>
            <ListItemIcon>
              <Switch
                checked={filters.showCompleted}
                onChange={(e) => setFilters(prev => ({
                  ...prev,
                  showCompleted: e.target.checked
                }))}
              />
            </ListItemIcon>
            <ListItemText primary="Show Completed" />
          </ListItem>
        </Box>
      </Drawer>

      {showSettings && (
        <CalendarIntegrationSettings
          open={showSettings}
          onClose={() => setShowSettings(false)}
          integrations={integrations}
          onIntegrationUpdate={loadIntegrations}
        />
      )}

      <Dialog
        open={showIntegrationDialog}
        onClose={() => setShowIntegrationDialog(false)}
      >
        <DialogTitle>Connect Calendar</DialogTitle>
        <DialogContent>
          <TextField
            select
            fullWidth
            label="Provider"
            value={selectedProvider}
            onChange={(e) => setSelectedProvider(e.target.value as 'google' | 'outlook')}
            sx={{ mt: 2 }}
          >
            <MenuItem value="google">Google Calendar</MenuItem>
            <MenuItem value="outlook">Microsoft Outlook</MenuItem>
          </TextField>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowIntegrationDialog(false)}>Cancel</Button>
          <Button onClick={handleIntegrateCalendar} variant="contained">
            Connect
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};