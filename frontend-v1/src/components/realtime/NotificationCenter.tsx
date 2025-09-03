import React, { useState } from 'react';
import {
  Box,
  IconButton,
  Badge,
  Popover,
  Typography,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  ListItemSecondaryAction,
  Button,
  Divider,
  Chip,
  Alert,
  Tabs,
  Tab
} from '@mui/material';
import {
  Notifications,
  NotificationsOff,
  Info,
  CheckCircle,
  Warning,
  Error as ErrorIcon,
  Close,
  MarkEmailRead,
  ClearAll,
  Settings
} from '@mui/icons-material';
import { formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';
import { useRealtimeStore } from '@/shared/store/realtimeStore';
import { useNotifications } from '@/services/notification.service';

// Centro de notificaciones - MVP Nivel 1
// TODO: En Nivel 2 agregar filtros, búsqueda, agrupación por fecha

export function NotificationCenter() {
  const [anchorEl, setAnchorEl] = useState<HTMLButtonElement | null>(null);
  const [tabValue, setTabValue] = useState(0);
  const [showSettings, setShowSettings] = useState(false);
  
  const {
    notifications,
    unreadNotifications,
    markNotificationAsRead,
    markAllNotificationsAsRead,
    removeNotification,
    clearNotifications
  } = useRealtimeStore();

  const { permission, requestPermission, isSupported } = useNotifications();

  const handleClick = (event: React.MouseEvent<HTMLButtonElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleClose = () => {
    setAnchorEl(null);
    setShowSettings(false);
  };

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
  };

  const getIcon = (type: string) => {
    switch (type) {
      case 'info':
        return <Info color="info" />;
      case 'success':
        return <CheckCircle color="success" />;
      case 'warning':
        return <Warning color="warning" />;
      case 'error':
        return <ErrorIcon color="error" />;
      default:
        return <Info />;
    }
  };

  const filteredNotifications = tabValue === 0 
    ? notifications 
    : notifications.filter(n => !n.read);

  const open = Boolean(anchorEl);

  return (
    <>
      <IconButton onClick={handleClick} color="inherit">
        <Badge badgeContent={unreadNotifications} color="error">
          <Notifications />
        </Badge>
      </IconButton>

      <Popover
        open={open}
        anchorEl={anchorEl}
        onClose={handleClose}
        anchorOrigin={{
          vertical: 'bottom',
          horizontal: 'right',
        }}
        transformOrigin={{
          vertical: 'top',
          horizontal: 'right',
        }}
      >
        <Box sx={{ width: 400, maxHeight: 600 }}>
          {/* Header */}
          <Box
            sx={{
              p: 2,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              borderBottom: 1,
              borderColor: 'divider'
            }}
          >
            <Typography variant="h6">
              Notificaciones
            </Typography>
            <Box>
              <IconButton size="small" onClick={() => setShowSettings(!showSettings)}>
                <Settings fontSize="small" />
              </IconButton>
              <IconButton size="small" onClick={handleClose}>
                <Close fontSize="small" />
              </IconButton>
            </Box>
          </Box>

          {/* Settings Panel */}
          {showSettings && (
            <Box sx={{ p: 2, bgcolor: 'grey.50', borderBottom: 1, borderColor: 'divider' }}>
              <Typography variant="subtitle2" gutterBottom>
                Configuración de Notificaciones
              </Typography>
              
              {isSupported ? (
                permission === 'granted' ? (
                  <Alert severity="success" sx={{ mt: 1 }}>
                    Notificaciones del navegador activadas
                  </Alert>
                ) : permission === 'denied' ? (
                  <Alert severity="error" sx={{ mt: 1 }}>
                    Notificaciones del navegador bloqueadas
                  </Alert>
                ) : (
                  <Button
                    variant="outlined"
                    size="small"
                    onClick={requestPermission}
                    sx={{ mt: 1 }}
                  >
                    Activar notificaciones del navegador
                  </Button>
                )
              ) : (
                <Alert severity="warning" sx={{ mt: 1 }}>
                  Tu navegador no soporta notificaciones
                </Alert>
              )}
            </Box>
          )}

          {/* Tabs */}
          <Tabs
            value={tabValue}
            onChange={handleTabChange}
            sx={{ borderBottom: 1, borderColor: 'divider' }}
          >
            <Tab label={`Todas (${notifications.length})`} />
            <Tab label={`No leídas (${unreadNotifications})`} />
          </Tabs>

          {/* Actions */}
          <Box
            sx={{
              p: 1,
              display: 'flex',
              gap: 1,
              borderBottom: 1,
              borderColor: 'divider'
            }}
          >
            <Button
              size="small"
              startIcon={<MarkEmailRead />}
              onClick={markAllNotificationsAsRead}
              disabled={unreadNotifications === 0}
            >
              Marcar como leídas
            </Button>
            <Button
              size="small"
              startIcon={<ClearAll />}
              onClick={clearNotifications}
              disabled={notifications.length === 0}
            >
              Limpiar todo
            </Button>
          </Box>

          {/* Notifications List */}
          <List sx={{ maxHeight: 400, overflow: 'auto', p: 0 }}>
            {filteredNotifications.length === 0 ? (
              <Box sx={{ p: 3, textAlign: 'center' }}>
                <NotificationsOff sx={{ fontSize: 48, color: 'text.disabled' }} />
                <Typography variant="body2" color="text.secondary">
                  No hay notificaciones
                </Typography>
              </Box>
            ) : (
              filteredNotifications.map((notification) => (
                <ListItem
                  key={notification.id}
                  divider
                  sx={{
                    bgcolor: notification.read ? 'transparent' : 'action.hover',
                    '&:hover': { bgcolor: 'action.hover' }
                  }}
                  onClick={() => !notification.read && markNotificationAsRead(notification.id)}
                >
                  <ListItemIcon>
                    {getIcon(notification.type)}
                  </ListItemIcon>
                  
                  <ListItemText
                    primary={
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Typography variant="subtitle2">
                          {notification.title}
                        </Typography>
                        {!notification.read && (
                          <Chip label="Nueva" size="small" color="primary" />
                        )}
                      </Box>
                    }
                    secondary={
                      <>
                        {notification.message && (
                          <Typography variant="body2" color="text.secondary">
                            {notification.message}
                          </Typography>
                        )}
                        <Typography variant="caption" color="text.disabled">
                          {formatDistanceToNow(notification.timestamp, {
                            addSuffix: true,
                            locale: es
                          })}
                        </Typography>
                      </>
                    }
                  />
                  
                  <ListItemSecondaryAction>
                    <IconButton
                      edge="end"
                      size="small"
                      onClick={(e) => {
                        e.stopPropagation();
                        removeNotification(notification.id);
                      }}
                    >
                      <Close fontSize="small" />
                    </IconButton>
                  </ListItemSecondaryAction>
                </ListItem>
              ))
            )}
          </List>

          {/* Footer */}
          {notifications.length > 5 && (
            <Box
              sx={{
                p: 1,
                textAlign: 'center',
                borderTop: 1,
                borderColor: 'divider'
              }}
            >
              <Button size="small">
                Ver todas las notificaciones
              </Button>
            </Box>
          )}
        </Box>
      </Popover>
    </>
  );
}

// Toast de notificación
export function NotificationToast() {
  const notifications = useRealtimeStore(state => state.notifications);
  const removeNotification = useRealtimeStore(state => state.removeNotification);
  
  // Mostrar solo las últimas 3 notificaciones no leídas
  const toastNotifications = notifications
    .filter(n => !n.read)
    .slice(0, 3);

  if (toastNotifications.length === 0) return null;

  return (
    <Box
      sx={{
        position: 'fixed',
        bottom: 16,
        right: 16,
        zIndex: 9999,
        display: 'flex',
        flexDirection: 'column',
        gap: 1,
        maxWidth: 400
      }}
    >
      {toastNotifications.map(notification => (
        <Alert
          key={notification.id}
          severity={notification.type}
          onClose={() => removeNotification(notification.id)}
          sx={{
            boxShadow: 2,
            animation: 'slideIn 0.3s ease-out',
            '@keyframes slideIn': {
              from: {
                transform: 'translateX(100%)',
                opacity: 0
              },
              to: {
                transform: 'translateX(0)',
                opacity: 1
              }
            }
          }}
        >
          <Typography variant="subtitle2">{notification.title}</Typography>
          {notification.message && (
            <Typography variant="body2">{notification.message}</Typography>
          )}
        </Alert>
      ))}
    </Box>
  );
}

export default NotificationCenter;