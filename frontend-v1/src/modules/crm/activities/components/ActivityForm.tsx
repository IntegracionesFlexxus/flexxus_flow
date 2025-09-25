import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  MenuItem,
  Grid,
  FormControlLabel,
  Checkbox,
  Stack,
  Chip,
  Autocomplete,
  Box,
  Typography,
  IconButton,
  Divider
} from '@mui/material';
import {
  Close as CloseIcon,
  Repeat as RepeatIcon,
  AttachFile as AttachFileIcon,
  People as PeopleIcon
} from '@mui/icons-material';
import { DateTimePicker } from '@mui/x-date-pickers/DateTimePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import activityService from '../../services/activityService';
import { Activity } from '../../types/activity.types';
import { useNotification } from '../../../../shared/hooks/useNotification';

interface ActivityFormProps {
  activity?: Activity | null;
  open: boolean;
  onClose: () => void;
  onSave: (activity: Activity) => void;
  defaultType?: string;
  defaultDate?: Date;
}

export const ActivityForm: React.FC<ActivityFormProps> = ({
  activity,
  open,
  onClose,
  onSave,
  defaultType = 'task',
  defaultDate
}) => {
  const { showNotification } = useNotification();
  const [formData, setFormData] = useState<Partial<Activity>>({
    type: defaultType,
    subject: '',
    description: '',
    priority: 'medium',
    status: 'not_started',
    dueDate: defaultDate || new Date(),
    assignedTo: null,
    relatedTo: null,
    relatedToType: null,
    location: '',
    allDay: false,
    reminder: true,
    reminderDate: null,
    tags: [],
    attachments: []
  });
  const [showRecurring, setShowRecurring] = useState(false);
  const [recurringConfig, setRecurringConfig] = useState({
    pattern: 'daily',
    interval: 1,
    endDate: null,
    occurrences: null
  });
  const [attendees, setAttendees] = useState<string[]>([]);
  const [newAttendee, setNewAttendee] = useState('');

  useEffect(() => {
    if (activity) {
      setFormData(activity);
      if (activity.isRecurring) {
        setShowRecurring(true);
      }
      if (activity.attendees) {
        setAttendees(activity.attendees);
      }
    }
  }, [activity]);

  const handleChange = (field: keyof Activity, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSave = async () => {
    try {
      if (!formData.subject) {
        showNotification('Subject is required', 'error');
        return;
      }

      let savedActivity: Activity;
      
      if (showRecurring && !activity) {
        const activities = await activityService.createRecurringActivity(
          { ...formData, attendees },
          recurringConfig as any
        );
        savedActivity = activities[0];
        showNotification(`Created ${activities.length} recurring activities`, 'success');
      } else if (activity) {
        savedActivity = await activityService.updateActivity(activity.id, {
          ...formData,
          attendees
        });
        showNotification('Activity updated successfully', 'success');
      } else {
        savedActivity = await activityService.createActivity({
          ...formData,
          attendees
        });
        showNotification('Activity created successfully', 'success');
      }

      onSave(savedActivity);
      onClose();
    } catch (error) {
      showNotification('Error saving activity', 'error');
    }
  };

  const handleAddAttendee = () => {
    if (newAttendee && !attendees.includes(newAttendee)) {
      setAttendees([...attendees, newAttendee]);
      setNewAttendee('');
    }
  };

  const handleRemoveAttendee = (email: string) => {
    setAttendees(attendees.filter(a => a !== email));
  };

  const getActivityTypeIcon = (type: string) => {
    switch (type) {
      case 'task': return '📋';
      case 'meeting': return '🤝';
      case 'call': return '📞';
      case 'email': return '✉️';
      default: return '📌';
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Typography variant="h6">
            {activity ? 'Edit Activity' : 'New Activity'}
          </Typography>
          <IconButton onClick={onClose}>
            <CloseIcon />
          </IconButton>
        </Box>
      </DialogTitle>
      
      <DialogContent dividers>
        <LocalizationProvider dateAdapter={AdapterDateFns}>
          <Grid container spacing={3}>
            <Grid item xs={12} md={6}>
              <TextField
                select
                fullWidth
                label="Type"
                value={formData.type}
                onChange={(e) => handleChange('type', e.target.value)}
              >
                <MenuItem value="task">{getActivityTypeIcon('task')} Task</MenuItem>
                <MenuItem value="meeting">{getActivityTypeIcon('meeting')} Meeting</MenuItem>
                <MenuItem value="call">{getActivityTypeIcon('call')} Call</MenuItem>
                <MenuItem value="email">{getActivityTypeIcon('email')} Email</MenuItem>
              </TextField>
            </Grid>
            
            <Grid item xs={12} md={6}>
              <TextField
                select
                fullWidth
                label="Priority"
                value={formData.priority}
                onChange={(e) => handleChange('priority', e.target.value)}
              >
                <MenuItem value="low">Low</MenuItem>
                <MenuItem value="medium">Medium</MenuItem>
                <MenuItem value="high">High</MenuItem>
                <MenuItem value="urgent">Urgent</MenuItem>
              </TextField>
            </Grid>

            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Subject"
                value={formData.subject}
                onChange={(e) => handleChange('subject', e.target.value)}
                required
              />
            </Grid>

            <Grid item xs={12}>
              <TextField
                fullWidth
                multiline
                rows={3}
                label="Description"
                value={formData.description}
                onChange={(e) => handleChange('description', e.target.value)}
              />
            </Grid>

            <Grid item xs={12} md={6}>
              <DateTimePicker
                label="Due Date"
                value={formData.dueDate}
                onChange={(value) => handleChange('dueDate', value)}
                renderInput={(params) => <TextField {...params} fullWidth />}
              />
            </Grid>

            <Grid item xs={12} md={6}>
              <TextField
                select
                fullWidth
                label="Status"
                value={formData.status}
                onChange={(e) => handleChange('status', e.target.value)}
              >
                <MenuItem value="not_started">Not Started</MenuItem>
                <MenuItem value="in_progress">In Progress</MenuItem>
                <MenuItem value="completed">Completed</MenuItem>
                <MenuItem value="deferred">Deferred</MenuItem>
                <MenuItem value="cancelled">Cancelled</MenuItem>
              </TextField>
            </Grid>

            {formData.type === 'meeting' && (
              <>
                <Grid item xs={12} md={6}>
                  <TextField
                    fullWidth
                    label="Location"
                    value={formData.location}
                    onChange={(e) => handleChange('location', e.target.value)}
                  />
                </Grid>
                
                <Grid item xs={12} md={6}>
                  <TextField
                    fullWidth
                    label="Meeting Link"
                    value={formData.meetingLink || ''}
                    onChange={(e) => handleChange('meetingLink', e.target.value)}
                    placeholder="https://meet.google.com/..."
                  />
                </Grid>

                <Grid item xs={12}>
                  <Typography variant="subtitle2" sx={{ mb: 1 }}>
                    <PeopleIcon sx={{ fontSize: 16, mr: 1 }} />
                    Attendees
                  </Typography>
                  <Stack direction="row" spacing={1} sx={{ mb: 1 }}>
                    {attendees.map(email => (
                      <Chip
                        key={email}
                        label={email}
                        onDelete={() => handleRemoveAttendee(email)}
                      />
                    ))}
                  </Stack>
                  <Stack direction="row" spacing={1}>
                    <TextField
                      size="small"
                      placeholder="Add attendee email"
                      value={newAttendee}
                      onChange={(e) => setNewAttendee(e.target.value)}
                      onKeyPress={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          handleAddAttendee();
                        }
                      }}
                    />
                    <Button onClick={handleAddAttendee} size="small">
                      Add
                    </Button>
                  </Stack>
                </Grid>
              </>
            )}

            <Grid item xs={12}>
              <FormControlLabel
                control={
                  <Checkbox
                    checked={formData.allDay || false}
                    onChange={(e) => handleChange('allDay', e.target.checked)}
                  />
                }
                label="All Day"
              />
              <FormControlLabel
                control={
                  <Checkbox
                    checked={formData.reminder || false}
                    onChange={(e) => handleChange('reminder', e.target.checked)}
                  />
                }
                label="Set Reminder"
              />
              {!activity && (
                <FormControlLabel
                  control={
                    <Checkbox
                      checked={showRecurring}
                      onChange={(e) => setShowRecurring(e.target.checked)}
                    />
                  }
                  label={
                    <Stack direction="row" spacing={1} alignItems="center">
                      <RepeatIcon sx={{ fontSize: 18 }} />
                      <span>Recurring Activity</span>
                    </Stack>
                  }
                />
              )}
            </Grid>

            {showRecurring && (
              <>
                <Grid item xs={12}>
                  <Divider />
                  <Typography variant="subtitle2" sx={{ mt: 2, mb: 1 }}>
                    Recurrence Settings
                  </Typography>
                </Grid>
                <Grid item xs={12} md={6}>
                  <TextField
                    select
                    fullWidth
                    label="Pattern"
                    value={recurringConfig.pattern}
                    onChange={(e) => setRecurringConfig(prev => ({
                      ...prev,
                      pattern: e.target.value
                    }))}
                    size="small"
                  >
                    <MenuItem value="daily">Daily</MenuItem>
                    <MenuItem value="weekly">Weekly</MenuItem>
                    <MenuItem value="monthly">Monthly</MenuItem>
                    <MenuItem value="yearly">Yearly</MenuItem>
                  </TextField>
                </Grid>
                <Grid item xs={12} md={6}>
                  <TextField
                    fullWidth
                    type="number"
                    label="Every"
                    value={recurringConfig.interval}
                    onChange={(e) => setRecurringConfig(prev => ({
                      ...prev,
                      interval: parseInt(e.target.value)
                    }))}
                    size="small"
                    InputProps={{
                      endAdornment: recurringConfig.pattern === 'daily' ? 'days' :
                                   recurringConfig.pattern === 'weekly' ? 'weeks' :
                                   recurringConfig.pattern === 'monthly' ? 'months' : 'years'
                    }}
                  />
                </Grid>
              </>
            )}

            <Grid item xs={12}>
              <Autocomplete
                multiple
                options={['urgent', 'follow-up', 'client', 'internal', 'review']}
                value={formData.tags || []}
                onChange={(e, value) => handleChange('tags', value)}
                renderInput={(params) => (
                  <TextField
                    {...params}
                    label="Tags"
                    placeholder="Add tags"
                  />
                )}
              />
            </Grid>
          </Grid>
        </LocalizationProvider>
      </DialogContent>

      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button onClick={handleSave} variant="contained">
          {activity ? 'Update' : 'Create'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};