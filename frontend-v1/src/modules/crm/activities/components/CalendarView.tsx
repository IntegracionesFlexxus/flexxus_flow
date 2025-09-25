/**
 * CalendarView Component - Sprint 21
 * Advanced calendar view with drag & drop, multiple views, and integrations
 */

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Box,
  Paper,
  Typography,
  Button,
  ButtonGroup,
  IconButton,
  Grid,
  Card,
  CardContent,
  Avatar,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Tooltip,
  Badge,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Drawer,
  Divider,
  Switch,
  FormControlLabel,
  LinearProgress,
  Menu,
  Fab
} from '@mui/material';
import {
  ChevronLeft,
  ChevronRight,
  Today,
  ViewDay,
  ViewWeek,
  ViewModule,
  Add as AddIcon,
  Event as EventIcon,
  Call as CallIcon,
  Email as EmailIcon,
  Assignment as TaskIcon,
  Person as PersonIcon,
  Business as BusinessIcon,
  LocationOn as LocationIcon,
  Videocam as VideoIcon,
  Refresh as RefreshIcon,
  FilterList as FilterIcon,
  Settings as SettingsIcon,
  Schedule as ScheduleIcon,
  Notifications as NotificationIcon,
  Loop as RecurringIcon
} from '@mui/icons-material';
import { DatePicker, TimePicker } from '@mui/x-date-pickers';
import { Activity } from '../../types/activity.types';
import { useActivities } from '../hooks/useActivities';
import { useCalendarIntegration } from '../hooks/useCalendarIntegration';
import { ActivityDialog } from './ActivityDialog';
import { formatDate, formatTime } from '../../../../shared/utils/dateUtils';

// Calendar Types
interface CalendarViewProps {
  view?: 'month' | 'week' | 'day' | 'agenda';
  userId?: number;
  teamId?: number;
  showWeekends?: boolean;
  showIntegrations?: boolean;
  onActivityCreate?: (activity: Partial<Activity>) => void;
  onActivityUpdate?: (id: number, updates: Partial<Activity>) => void;
  onViewChange?: (view: string) => void;
  dragAndDrop?: boolean;
  integrations?: CalendarIntegration[];
}

interface CalendarEvent {
  id: number | string;
  title: string;
  start: Date;
  end: Date;
  allDay?: boolean;
  type: 'call' | 'email' | 'meeting' | 'task' | 'event';
  status?: string;
  priority?: string;
  location?: string;
  attendees?: string[];
  color?: string;
  isExternal?: boolean;
  provider?: string;
  activity?: Activity;
}

interface CalendarIntegration {
  id: number;
  provider: 'google' | 'outlook' | 'apple';
  name: string;
  email: string;
  enabled: boolean;
  color: string;
}

interface TimeSlot {
  time: string;
  hour: number;
  events: CalendarEvent[];
}

// Constants
const HOURS_IN_DAY = 24;
const DAYS_IN_WEEK = 7;
const CALENDAR_COLORS = {
  call: '#34A853',
  email: '#EA4335',
  meeting: '#4285F4',
  task: '#FBBC04',
  event: '#9E9E9E'
};

const TIME_SLOTS = Array.from({ length: HOURS_IN_DAY }, (_, i) => ({
  hour: i,
  time: `${i.toString().padStart(2, '0')}:00`
}));

export const CalendarView: React.FC<CalendarViewProps> = ({
  view: initialView = 'month',
  userId,
  teamId,
  showWeekends = true,
  showIntegrations = true,
  onActivityCreate,
  onActivityUpdate,
  onViewChange,
  dragAndDrop = true,
  integrations = []
}) => {
  // State
  const [currentView, setCurrentView] = useState<'month' | 'week' | 'day' | 'agenda'>(initialView);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null);
  const [activityDialogOpen, setActivityDialogOpen] = useState(false);
  const [quickCreateOpen, setQuickCreateOpen] = useState(false);
  const [filterDrawerOpen, setFilterDrawerOpen] = useState(false);
  const [filters, setFilters] = useState({
    types: ['call', 'email', 'meeting', 'task', 'event'],
    statuses: ['pending', 'in_progress', 'completed'],
    users: userId ? [userId] : [],
    integrations: integrations.filter(i => i.enabled).map(i => i.id)
  });
  const [draggedEvent, setDraggedEvent] = useState<CalendarEvent | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Hooks
  const { activities, loading, error, fetchActivities, updateActivity } = useActivities();
  const { syncCalendar, getAvailableSlots } = useCalendarIntegration();

  // Computed values
  const calendarEvents = useMemo(() => {
    const events: CalendarEvent[] = [];

    // Convert activities to calendar events
    activities.forEach(activity => {
      if (filters.types.includes(activity.type) && filters.statuses.includes(activity.status)) {
        events.push({
          id: activity.id,
          title: activity.subject,
          start: new Date(activity.start_time || activity.due_date),
          end: new Date(activity.end_time || activity.due_date),
          allDay: activity.all_day || false,
          type: activity.type,
          status: activity.status,
          priority: activity.priority,
          location: activity.location,
          attendees: activity.attendees?.map(a => a.email),
          color: CALENDAR_COLORS[activity.type] || '#9E9E9E',
          activity
        });
      }
    });

    // Add external calendar events
    if (showIntegrations) {
      integrations
        .filter(i => i.enabled && filters.integrations.includes(i.id))
        .forEach(integration => {
          // External events would be fetched from integration
          // This is a placeholder for demonstration
        });
    }

    return events;
  }, [activities, filters, integrations, showIntegrations]);

  const monthDays = useMemo(() => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const startDate = new Date(firstDay);
    startDate.setDate(startDate.getDate() - firstDay.getDay());

    const days = [];
    const current = new Date(startDate);

    while (current <= lastDay || current.getDay() !== 0) {
      days.push(new Date(current));
      current.setDate(current.getDate() + 1);
    }

    return days;
  }, [currentDate]);

  const weekDays = useMemo(() => {
    const startOfWeek = new Date(currentDate);
    startOfWeek.setDate(currentDate.getDate() - currentDate.getDay());

    return Array.from({ length: 7 }, (_, i) => {
      const day = new Date(startOfWeek);
      day.setDate(startOfWeek.getDate() + i);
      return day;
    });
  }, [currentDate]);

  // Handlers
  const handleViewChange = (newView: 'month' | 'week' | 'day' | 'agenda') => {
    setCurrentView(newView);
    onViewChange?.(newView);
  };

  const handleDateChange = (direction: 'prev' | 'next' | 'today') => {
    const newDate = new Date(currentDate);

    switch (direction) {
      case 'prev':
        if (currentView === 'month') {
          newDate.setMonth(newDate.getMonth() - 1);
        } else if (currentView === 'week') {
          newDate.setDate(newDate.getDate() - 7);
        } else if (currentView === 'day') {
          newDate.setDate(newDate.getDate() - 1);
        }
        break;
      case 'next':
        if (currentView === 'month') {
          newDate.setMonth(newDate.getMonth() + 1);
        } else if (currentView === 'week') {
          newDate.setDate(newDate.getDate() + 7);
        } else if (currentView === 'day') {
          newDate.setDate(newDate.getDate() + 1);
        }
        break;
      case 'today':
        return setCurrentDate(new Date());
    }

    setCurrentDate(newDate);
  };

  const handleEventClick = (event: CalendarEvent) => {
    setSelectedEvent(event);
    setActivityDialogOpen(true);
  };

  const handleDateClick = (date: Date) => {
    setSelectedDate(date);
    setQuickCreateOpen(true);
  };

  const handleQuickCreate = async (type: string) => {
    if (!selectedDate) return;

    const newActivity: Partial<Activity> = {
      type: type as any,
      subject: `New ${type}`,
      start_time: selectedDate.toISOString(),
      end_time: new Date(selectedDate.getTime() + 60 * 60 * 1000).toISOString(),
      assigned_to: userId
    };

    onActivityCreate?.(newActivity);
    setQuickCreateOpen(false);
  };

  const handleDragStart = (event: React.DragEvent, calendarEvent: CalendarEvent) => {
    if (!dragAndDrop) return;
    setDraggedEvent(calendarEvent);
    event.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (event: React.DragEvent) => {
    if (!dragAndDrop || !draggedEvent) return;
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = async (event: React.DragEvent, date: Date, hour?: number) => {
    event.preventDefault();
    if (!dragAndDrop || !draggedEvent || !draggedEvent.activity) return;

    const newStart = new Date(date);
    if (hour !== undefined) {
      newStart.setHours(hour);
    }

    const duration = draggedEvent.end.getTime() - draggedEvent.start.getTime();
    const newEnd = new Date(newStart.getTime() + duration);

    await updateActivity(draggedEvent.activity.id, {
      start_time: newStart.toISOString(),
      end_time: newEnd.toISOString()
    });

    setDraggedEvent(null);
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      await fetchActivities();

      // Sync with external calendars
      if (showIntegrations) {
        for (const integration of integrations.filter(i => i.enabled)) {
          await syncCalendar(integration.id);
        }
      }
    } finally {
      setIsRefreshing(false);
    }
  };

  const handleFilterChange = (filterType: string, value: any) => {
    setFilters(prev => ({
      ...prev,
      [filterType]: value
    }));
  };

  // Render methods
  const renderHeader = () => (
    <Box sx={{ p: 2, borderBottom: 1, borderColor: 'divider' }}>
      <Grid container alignItems="center" spacing={2}>
        <Grid item>
          <ButtonGroup variant="outlined" size="small">
            <IconButton onClick={() => handleDateChange('prev')}>
              <ChevronLeft />
            </IconButton>
            <Button onClick={() => handleDateChange('today')}>
              Today
            </Button>
            <IconButton onClick={() => handleDateChange('next')}>
              <ChevronRight />
            </IconButton>
          </ButtonGroup>
        </Grid>

        <Grid item xs>
          <Typography variant="h5">
            {currentView === 'month' && currentDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
            {currentView === 'week' && `Week of ${weekDays[0].toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`}
            {currentView === 'day' && currentDate.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}
          </Typography>
        </Grid>

        <Grid item>
          <ButtonGroup variant="outlined" size="small">
            <Button
              variant={currentView === 'month' ? 'contained' : 'outlined'}
              onClick={() => handleViewChange('month')}
            >
              <ViewModule fontSize="small" />
            </Button>
            <Button
              variant={currentView === 'week' ? 'contained' : 'outlined'}
              onClick={() => handleViewChange('week')}
            >
              <ViewWeek fontSize="small" />
            </Button>
            <Button
              variant={currentView === 'day' ? 'contained' : 'outlined'}
              onClick={() => handleViewChange('day')}
            >
              <ViewDay fontSize="small" />
            </Button>
            <Button
              variant={currentView === 'agenda' ? 'contained' : 'outlined'}
              onClick={() => handleViewChange('agenda')}
            >
              <EventIcon fontSize="small" />
            </Button>
          </ButtonGroup>
        </Grid>

        <Grid item>
          <IconButton onClick={() => setFilterDrawerOpen(true)}>
            <Badge badgeContent={Object.keys(filters).length} color="primary">
              <FilterIcon />
            </Badge>
          </IconButton>
          <IconButton onClick={handleRefresh} disabled={isRefreshing}>
            <RefreshIcon className={isRefreshing ? 'rotating' : ''} />
          </IconButton>
        </Grid>
      </Grid>
    </Box>
  );

  const renderMonthView = () => (
    <Box sx={{ height: 'calc(100% - 80px)', overflow: 'auto', p: 2 }}>
      <Grid container spacing={0.5}>
        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day, index) => (
          <Grid item xs key={day} sx={{ width: `${100 / 7}%` }}>
            <Typography
              variant="subtitle2"
              align="center"
              sx={{
                py: 1,
                fontWeight: 'bold',
                borderBottom: 1,
                borderColor: 'divider'
              }}
            >
              {day}
            </Typography>
          </Grid>
        ))}

        {monthDays.map((day, index) => {
          const isCurrentMonth = day.getMonth() === currentDate.getMonth();
          const isToday = day.toDateString() === new Date().toDateString();
          const dayEvents = calendarEvents.filter(event =>
            event.start.toDateString() === day.toDateString()
          );

          return (
            <Grid
              item
              xs
              key={index}
              sx={{ width: `${100 / 7}%` }}
            >
              <Paper
                sx={{
                  height: 120,
                  p: 0.5,
                  bgcolor: isToday ? 'primary.light' : isCurrentMonth ? 'background.paper' : 'grey.50',
                  opacity: isCurrentMonth ? 1 : 0.6,
                  cursor: 'pointer',
                  '&:hover': {
                    bgcolor: isToday ? 'primary.light' : 'action.hover'
                  }
                }}
                onClick={() => handleDateClick(day)}
                onDragOver={handleDragOver}
                onDrop={(e) => handleDrop(e, day)}
              >
                <Typography
                  variant="caption"
                  sx={{
                    fontWeight: isToday ? 'bold' : 'normal',
                    color: isToday ? 'primary.contrastText' : 'text.primary'
                  }}
                >
                  {day.getDate()}
                </Typography>

                <Box sx={{ mt: 0.5, overflow: 'hidden', height: 90 }}>
                  {dayEvents.slice(0, 3).map((event, eventIndex) => (
                    <Chip
                      key={event.id}
                      label={event.title}
                      size="small"
                      sx={{
                        bgcolor: event.color,
                        color: 'white',
                        height: 20,
                        fontSize: '0.65rem',
                        width: '100%',
                        justifyContent: 'flex-start',
                        mb: 0.25,
                        cursor: dragAndDrop ? 'move' : 'pointer'
                      }}
                      onClick={(e) => {
                        e.stopPropagation();
                        handleEventClick(event);
                      }}
                      draggable={dragAndDrop}
                      onDragStart={(e) => handleDragStart(e, event)}
                    />
                  ))}
                  {dayEvents.length > 3 && (
                    <Typography variant="caption" sx={{ fontSize: '0.65rem' }}>
                      +{dayEvents.length - 3} more
                    </Typography>
                  )}
                </Box>
              </Paper>
            </Grid>
          );
        })}
      </Grid>
    </Box>
  );

  const renderWeekView = () => (
    <Box sx={{ height: 'calc(100% - 80px)', overflow: 'auto', p: 2 }}>
      <Grid container spacing={0.5}>
        <Grid item xs={1}>
          {/* Time column */}
          <Box sx={{ height: 50 }} /> {/* Header spacer */}
          {TIME_SLOTS.map(slot => (
            <Box
              key={slot.hour}
              sx={{
                height: 60,
                borderTop: 1,
                borderColor: 'divider',
                pr: 1,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'flex-end'
              }}
            >
              <Typography variant="caption">{slot.time}</Typography>
            </Box>
          ))}
        </Grid>

        {weekDays.map((day, dayIndex) => {
          const isToday = day.toDateString() === new Date().toDateString();
          const dayEvents = calendarEvents.filter(event =>
            event.start.toDateString() === day.toDateString()
          );

          return (
            <Grid item xs key={dayIndex} sx={{ width: `${85 / 7}%` }}>
              <Box
                sx={{
                  height: 50,
                  borderBottom: 2,
                  borderColor: isToday ? 'primary.main' : 'divider',
                  p: 1,
                  bgcolor: isToday ? 'primary.light' : 'background.paper'
                }}
              >
                <Typography variant="subtitle2" align="center">
                  {day.toLocaleDateString('en-US', { weekday: 'short' })}
                </Typography>
                <Typography variant="h6" align="center">
                  {day.getDate()}
                </Typography>
              </Box>

              {TIME_SLOTS.map(slot => {
                const slotEvents = dayEvents.filter(event => {
                  const eventHour = event.start.getHours();
                  return eventHour === slot.hour;
                });

                return (
                  <Box
                    key={slot.hour}
                    sx={{
                      height: 60,
                      borderTop: 1,
                      borderRight: 1,
                      borderColor: 'divider',
                      position: 'relative',
                      cursor: 'pointer',
                      '&:hover': {
                        bgcolor: 'action.hover'
                      }
                    }}
                    onClick={() => {
                      const clickDate = new Date(day);
                      clickDate.setHours(slot.hour);
                      handleDateClick(clickDate);
                    }}
                    onDragOver={handleDragOver}
                    onDrop={(e) => handleDrop(e, day, slot.hour)}
                  >
                    {slotEvents.map((event, eventIndex) => (
                      <Box
                        key={event.id}
                        sx={{
                          position: 'absolute',
                          top: 2,
                          left: 2,
                          right: 2,
                          bgcolor: event.color,
                          color: 'white',
                          p: 0.5,
                          borderRadius: 1,
                          fontSize: '0.7rem',
                          cursor: dragAndDrop ? 'move' : 'pointer',
                          zIndex: eventIndex
                        }}
                        onClick={(e) => {
                          e.stopPropagation();
                          handleEventClick(event);
                        }}
                        draggable={dragAndDrop}
                        onDragStart={(e) => handleDragStart(e, event)}
                      >
                        <Typography variant="caption" sx={{ fontSize: '0.65rem' }}>
                          {event.title}
                        </Typography>
                      </Box>
                    ))}
                  </Box>
                );
              })}
            </Grid>
          );
        })}
      </Grid>
    </Box>
  );

  const renderDayView = () => {
    const dayEvents = calendarEvents.filter(event =>
      event.start.toDateString() === currentDate.toDateString()
    );

    return (
      <Box sx={{ height: 'calc(100% - 80px)', overflow: 'auto', p: 2 }}>
        <Grid container>
          <Grid item xs={2}>
            {/* Time column */}
            {TIME_SLOTS.map(slot => (
              <Box
                key={slot.hour}
                sx={{
                  height: 80,
                  borderTop: 1,
                  borderColor: 'divider',
                  pr: 2,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'flex-end'
                }}
              >
                <Typography variant="body2">{slot.time}</Typography>
              </Box>
            ))}
          </Grid>

          <Grid item xs={10}>
            {TIME_SLOTS.map(slot => {
              const slotEvents = dayEvents.filter(event => {
                const eventHour = event.start.getHours();
                return eventHour === slot.hour;
              });

              return (
                <Box
                  key={slot.hour}
                  sx={{
                    height: 80,
                    borderTop: 1,
                    borderRight: 1,
                    borderColor: 'divider',
                    position: 'relative',
                    cursor: 'pointer',
                    '&:hover': {
                      bgcolor: 'action.hover'
                    }
                  }}
                  onClick={() => {
                    const clickDate = new Date(currentDate);
                    clickDate.setHours(slot.hour);
                    handleDateClick(clickDate);
                  }}
                  onDragOver={handleDragOver}
                  onDrop={(e) => handleDrop(e, currentDate, slot.hour)}
                >
                  {slotEvents.map((event, eventIndex) => (
                    <Box
                      key={event.id}
                      sx={{
                        position: 'absolute',
                        top: 4,
                        left: 4,
                        right: 4,
                        bgcolor: event.color,
                        color: 'white',
                        p: 1,
                        borderRadius: 1,
                        cursor: dragAndDrop ? 'move' : 'pointer',
                        zIndex: eventIndex
                      }}
                      onClick={(e) => {
                        e.stopPropagation();
                        handleEventClick(event);
                      }}
                      draggable={dragAndDrop}
                      onDragStart={(e) => handleDragStart(e, event)}
                    >
                      <Typography variant="subtitle2">{event.title}</Typography>
                      {event.location && (
                        <Box sx={{ display: 'flex', alignItems: 'center', mt: 0.5 }}>
                          <LocationIcon fontSize="small" sx={{ mr: 0.5 }} />
                          <Typography variant="caption">{event.location}</Typography>
                        </Box>
                      )}
                      {event.attendees && event.attendees.length > 0 && (
                        <Box sx={{ display: 'flex', alignItems: 'center', mt: 0.5 }}>
                          <PersonIcon fontSize="small" sx={{ mr: 0.5 }} />
                          <Typography variant="caption">
                            {event.attendees.length} attendee{event.attendees.length !== 1 ? 's' : ''}
                          </Typography>
                        </Box>
                      )}
                    </Box>
                  ))}
                </Box>
              );
            })}
          </Grid>
        </Grid>
      </Box>
    );
  };

  const renderAgendaView = () => {
    const upcomingEvents = calendarEvents
      .filter(event => event.start >= new Date())
      .sort((a, b) => a.start.getTime() - b.start.getTime())
      .slice(0, 50);

    return (
      <Box sx={{ height: 'calc(100% - 80px)', overflow: 'auto', p: 2 }}>
        <List>
          {upcomingEvents.map((event, index) => {
            const isFirstOfDay = index === 0 ||
              event.start.toDateString() !== upcomingEvents[index - 1].start.toDateString();

            return (
              <React.Fragment key={event.id}>
                {isFirstOfDay && (
                  <ListItem>
                    <Typography variant="subtitle1" sx={{ fontWeight: 'bold' }}>
                      {event.start.toLocaleDateString('en-US', {
                        weekday: 'long',
                        month: 'long',
                        day: 'numeric'
                      })}
                    </Typography>
                  </ListItem>
                )}

                <ListItem
                  button
                  onClick={() => handleEventClick(event)}
                  sx={{
                    mb: 1,
                    bgcolor: 'background.paper',
                    borderRadius: 1,
                    border: 1,
                    borderColor: 'divider',
                    borderLeft: 4,
                    borderLeftColor: event.color
                  }}
                >
                  <ListItemIcon>
                    {event.type === 'call' && <CallIcon />}
                    {event.type === 'email' && <EmailIcon />}
                    {event.type === 'meeting' && <EventIcon />}
                    {event.type === 'task' && <TaskIcon />}
                  </ListItemIcon>
                  <ListItemText
                    primary={event.title}
                    secondary={
                      <Box>
                        <Typography variant="caption" component="span">
                          {formatTime(event.start)} - {formatTime(event.end)}
                        </Typography>
                        {event.location && (
                          <Typography variant="caption" component="span" sx={{ ml: 2 }}>
                            <LocationIcon fontSize="small" sx={{ verticalAlign: 'middle' }} />
                            {event.location}
                          </Typography>
                        )}
                      </Box>
                    }
                  />
                  <Chip
                    label={event.status}
                    size="small"
                    color={event.status === 'completed' ? 'success' : 'default'}
                  />
                </ListItem>
              </React.Fragment>
            );
          })}
        </List>
      </Box>
    );
  };

  const renderQuickCreateDialog = () => (
    <Dialog open={quickCreateOpen} onClose={() => setQuickCreateOpen(false)}>
      <DialogTitle>
        Quick Create Activity
        {selectedDate && (
          <Typography variant="caption" display="block">
            {selectedDate.toLocaleDateString('en-US', {
              weekday: 'long',
              month: 'long',
              day: 'numeric',
              year: 'numeric'
            })}
          </Typography>
        )}
      </DialogTitle>
      <DialogContent>
        <Grid container spacing={2}>
          <Grid item xs={6}>
            <Card
              sx={{ cursor: 'pointer', '&:hover': { bgcolor: 'action.hover' } }}
              onClick={() => handleQuickCreate('meeting')}
            >
              <CardContent sx={{ textAlign: 'center' }}>
                <EventIcon fontSize="large" color="primary" />
                <Typography>Meeting</Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={6}>
            <Card
              sx={{ cursor: 'pointer', '&:hover': { bgcolor: 'action.hover' } }}
              onClick={() => handleQuickCreate('call')}
            >
              <CardContent sx={{ textAlign: 'center' }}>
                <CallIcon fontSize="large" color="success" />
                <Typography>Call</Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={6}>
            <Card
              sx={{ cursor: 'pointer', '&:hover': { bgcolor: 'action.hover' } }}
              onClick={() => handleQuickCreate('task')}
            >
              <CardContent sx={{ textAlign: 'center' }}>
                <TaskIcon fontSize="large" color="warning" />
                <Typography>Task</Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={6}>
            <Card
              sx={{ cursor: 'pointer', '&:hover': { bgcolor: 'action.hover' } }}
              onClick={() => handleQuickCreate('email')}
            >
              <CardContent sx={{ textAlign: 'center' }}>
                <EmailIcon fontSize="large" color="error" />
                <Typography>Email</Typography>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      </DialogContent>
    </Dialog>
  );

  const renderFilterDrawer = () => (
    <Drawer
      anchor="right"
      open={filterDrawerOpen}
      onClose={() => setFilterDrawerOpen(false)}
    >
      <Box sx={{ width: 300, p: 2 }}>
        <Typography variant="h6" gutterBottom>
          Calendar Filters
        </Typography>
        <Divider sx={{ mb: 2 }} />

        <FormControl fullWidth sx={{ mb: 2 }}>
          <InputLabel>Activity Types</InputLabel>
          <Select
            multiple
            value={filters.types}
            onChange={(e) => handleFilterChange('types', e.target.value)}
          >
            <MenuItem value="call">Calls</MenuItem>
            <MenuItem value="email">Emails</MenuItem>
            <MenuItem value="meeting">Meetings</MenuItem>
            <MenuItem value="task">Tasks</MenuItem>
            <MenuItem value="event">Events</MenuItem>
          </Select>
        </FormControl>

        <FormControl fullWidth sx={{ mb: 2 }}>
          <InputLabel>Status</InputLabel>
          <Select
            multiple
            value={filters.statuses}
            onChange={(e) => handleFilterChange('statuses', e.target.value)}
          >
            <MenuItem value="pending">Pending</MenuItem>
            <MenuItem value="in_progress">In Progress</MenuItem>
            <MenuItem value="completed">Completed</MenuItem>
            <MenuItem value="cancelled">Cancelled</MenuItem>
          </Select>
        </FormControl>

        {showIntegrations && integrations.length > 0 && (
          <>
            <Typography variant="subtitle2" gutterBottom>
              Calendar Integrations
            </Typography>
            {integrations.map(integration => (
              <FormControlLabel
                key={integration.id}
                control={
                  <Switch
                    checked={filters.integrations.includes(integration.id)}
                    onChange={(e) => {
                      const newIntegrations = e.target.checked
                        ? [...filters.integrations, integration.id]
                        : filters.integrations.filter(id => id !== integration.id);
                      handleFilterChange('integrations', newIntegrations);
                    }}
                  />
                }
                label={
                  <Box sx={{ display: 'flex', alignItems: 'center' }}>
                    <Box
                      sx={{
                        width: 12,
                        height: 12,
                        borderRadius: '50%',
                        bgcolor: integration.color,
                        mr: 1
                      }}
                    />
                    {integration.name}
                  </Box>
                }
              />
            ))}
          </>
        )}

        <Button
          fullWidth
          variant="outlined"
          onClick={() => setFilterDrawerOpen(false)}
          sx={{ mt: 2 }}
        >
          Apply Filters
        </Button>
      </Box>
    </Drawer>
  );

  if (loading && !calendarEvents.length) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}>
        <LinearProgress sx={{ width: '50%' }} />
      </Box>
    );
  }

  if (error) {
    return (
      <Box sx={{ p: 3, textAlign: 'center' }}>
        <Typography color="error">Error loading calendar: {error}</Typography>
        <Button onClick={handleRefresh} sx={{ mt: 2 }}>
          Retry
        </Button>
      </Box>
    );
  }

  return (
    <Paper sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      {isRefreshing && <LinearProgress sx={{ position: 'absolute', top: 0, width: '100%' }} />}

      {renderHeader()}

      {currentView === 'month' && renderMonthView()}
      {currentView === 'week' && renderWeekView()}
      {currentView === 'day' && renderDayView()}
      {currentView === 'agenda' && renderAgendaView()}

      {renderQuickCreateDialog()}
      {renderFilterDrawer()}

      {/* Activity Dialog */}
      {selectedEvent && (
        <ActivityDialog
          open={activityDialogOpen}
          onClose={() => {
            setActivityDialogOpen(false);
            setSelectedEvent(null);
          }}
          activity={selectedEvent.activity}
          onSave={(updates) => {
            if (selectedEvent.activity) {
              onActivityUpdate?.(selectedEvent.activity.id, updates);
            }
            setActivityDialogOpen(false);
          }}
        />
      )}

      {/* Floating Action Button */}
      <Fab
        color="primary"
        sx={{
          position: 'absolute',
          bottom: 16,
          right: 16
        }}
        onClick={() => {
          setSelectedDate(new Date());
          setQuickCreateOpen(true);
        }}
      >
        <AddIcon />
      </Fab>
    </Paper>
  );
};

export default CalendarView;