import React, { useState } from 'react';
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
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Alert,
  Stack,
  Chip
} from '@mui/material';
import {
  Google as GoogleIcon,
  Microsoft as MicrosoftIcon,
  Delete as DeleteIcon,
  Sync as SyncIcon,
  Add as AddIcon,
  Settings as SettingsIcon
} from '@mui/icons-material';
import calendarService from '../../services/calendarService';
import { CalendarIntegration } from '../../types/calendar.types';
import { useNotification } from '../../../../shared/hooks/useNotification';

interface CalendarIntegrationSettingsProps {
  open: boolean;
  onClose: () => void;
  integrations: CalendarIntegration[];
  onIntegrationUpdate: () => void;
}

export const CalendarIntegrationSettings: React.FC<CalendarIntegrationSettingsProps> = ({
  open,
  onClose,
  integrations,
  onIntegrationUpdate
}) => {
  const { showNotification } = useNotification();
  const [selectedProvider, setSelectedProvider] = useState<'google' | 'outlook'>('google');
  const [syncSettings, setSyncSettings] = useState<Record<number, any>>({});

  const handleAddIntegration = async () => {
    try {
      const { authUrl } = await calendarService.initializeOAuth(selectedProvider);
      window.location.href = authUrl;
    } catch (error) {
      showNotification('Failed to initialize calendar integration', 'error');
    }
  };

  const handleRemoveIntegration = async (integrationId: number) => {
    try {
      await calendarService.removeIntegration(integrationId);
      showNotification('Integration removed successfully', 'success');
      onIntegrationUpdate();
    } catch (error) {
      showNotification('Failed to remove integration', 'error');
    }
  };

  const handleSyncNow = async (integrationId: number) => {
    try {
      const result = await calendarService.syncCalendar(integrationId);
      showNotification(
        `Sync complete: ${result.imported} imported, ${result.exported} exported`,
        'success'
      );
      onIntegrationUpdate();
    } catch (error) {
      showNotification('Sync failed', 'error');
    }
  };

  const handleToggleSync = async (integrationId: number, enabled: boolean) => {
    try {
      await calendarService.updateIntegrationSettings(integrationId, {
        syncEnabled: enabled
      });
      onIntegrationUpdate();
    } catch (error) {
      showNotification('Failed to update settings', 'error');
    }
  };

  const handleSyncDirectionChange = async (integrationId: number, direction: 'import' | 'export' | 'both') => {
    try {
      await calendarService.updateIntegrationSettings(integrationId, {
        syncDirection: direction
      });
      onIntegrationUpdate();
    } catch (error) {
      showNotification('Failed to update sync direction', 'error');
    }
  };

  const getProviderIcon = (provider: string) => {
    switch (provider) {
      case 'google':
        return <GoogleIcon />;
      case 'outlook':
        return <MicrosoftIcon />;
      default:
        return <SettingsIcon />;
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>Calendar Integration Settings</DialogTitle>
      
      <DialogContent dividers>
        <Alert severity="info" sx={{ mb: 3 }}>
          Connect your external calendars to sync events and manage your schedule in one place.
        </Alert>

        <Typography variant="h6" sx={{ mb: 2 }}>Connected Calendars</Typography>
        
        {integrations.length === 0 ? (
          <Typography color="text.secondary" sx={{ mb: 3, textAlign: 'center' }}>
            No calendars connected yet
          </Typography>
        ) : (
          <List>
            {integrations.map(integration => (
              <React.Fragment key={integration.id}>
                <ListItem>
                  <ListItemIcon>
                    {getProviderIcon(integration.provider)}
                  </ListItemIcon>
                  <ListItemText
                    primary={integration.email}
                    secondary={
                      <Stack direction="row" spacing={1} sx={{ mt: 1 }}>
                        <Chip
                          label={integration.syncDirection}
                          size="small"
                          color="primary"
                          variant="outlined"
                        />
                        {integration.lastSyncAt && (
                          <Chip
                            label={`Last sync: ${new Date(integration.lastSyncAt).toLocaleString()}`}
                            size="small"
                            variant="outlined"
                          />
                        )}
                      </Stack>
                    }
                  />
                  <ListItemSecondaryAction>
                    <Stack direction="row" spacing={1} alignItems="center">
                      <Switch
                        checked={integration.syncEnabled}
                        onChange={(e) => handleToggleSync(integration.id, e.target.checked)}
                      />
                      <IconButton
                        onClick={() => handleSyncNow(integration.id)}
                        disabled={!integration.syncEnabled}
                      >
                        <SyncIcon />
                      </IconButton>
                      <IconButton
                        onClick={() => handleRemoveIntegration(integration.id)}
                        color="error"
                      >
                        <DeleteIcon />
                      </IconButton>
                    </Stack>
                  </ListItemSecondaryAction>
                </ListItem>
                
                {integration.syncEnabled && (
                  <Box sx={{ px: 3, pb: 2 }}>
                    <FormControl size="small" sx={{ minWidth: 200 }}>
                      <InputLabel>Sync Direction</InputLabel>
                      <Select
                        value={integration.syncDirection}
                        label="Sync Direction"
                        onChange={(e) => handleSyncDirectionChange(
                          integration.id,
                          e.target.value as 'import' | 'export' | 'both'
                        )}
                      >
                        <MenuItem value="import">Import only</MenuItem>
                        <MenuItem value="export">Export only</MenuItem>
                        <MenuItem value="both">Two-way sync</MenuItem>
                      </Select>
                    </FormControl>
                  </Box>
                )}
                <Divider />
              </React.Fragment>
            ))}
          </List>
        )}

        <Box sx={{ mt: 3 }}>
          <Typography variant="h6" sx={{ mb: 2 }}>Add New Calendar</Typography>
          <Stack direction="row" spacing={2}>
            <FormControl sx={{ minWidth: 200 }}>
              <InputLabel>Provider</InputLabel>
              <Select
                value={selectedProvider}
                label="Provider"
                onChange={(e) => setSelectedProvider(e.target.value as 'google' | 'outlook')}
              >
                <MenuItem value="google">
                  <Stack direction="row" spacing={1} alignItems="center">
                    <GoogleIcon sx={{ fontSize: 20 }} />
                    <span>Google Calendar</span>
                  </Stack>
                </MenuItem>
                <MenuItem value="outlook">
                  <Stack direction="row" spacing={1} alignItems="center">
                    <MicrosoftIcon sx={{ fontSize: 20 }} />
                    <span>Outlook Calendar</span>
                  </Stack>
                </MenuItem>
              </Select>
            </FormControl>
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={handleAddIntegration}
            >
              Connect Calendar
            </Button>
          </Stack>
        </Box>

        <Box sx={{ mt: 4 }}>
          <Typography variant="subtitle2" color="text.secondary">
            Note: When connecting a calendar, you'll be redirected to the provider's
            authentication page. After granting permissions, you'll be redirected back
            to this application.
          </Typography>
        </Box>
      </DialogContent>

      <DialogActions>
        <Button onClick={onClose}>Close</Button>
      </DialogActions>
    </Dialog>
  );
};