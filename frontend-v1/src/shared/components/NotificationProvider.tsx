import React from 'react'
import { Snackbar, Alert, Stack } from '@mui/material'
import { useUIStore } from '@/shared/store'

// Provider de notificaciones globales - MVP
// TODO: En Nivel 2 agregar queue de notificaciones y persistencia

export const NotificationProvider: React.FC = () => {
  const { notifications, removeNotification } = useUIStore()
  
  // Mostrar máximo 3 notificaciones a la vez
  const visibleNotifications = notifications.slice(0, 3)
  
  return (
    <Stack
      spacing={1}
      sx={{
        position: 'fixed',
        top: 16,
        right: 16,
        zIndex: 9999,
        maxWidth: 400
      }}
    >
      {visibleNotifications.map((notification) => (
        <Snackbar
          key={notification.id}
          open={true}
          autoHideDuration={notification.duration || 5000}
          onClose={() => removeNotification(notification.id)}
          anchorOrigin={{ vertical: 'top', horizontal: 'right' }}
        >
          <Alert
            onClose={() => removeNotification(notification.id)}
            severity={notification.type}
            variant="filled"
            sx={{
              width: '100%',
              boxShadow: 3
            }}
          >
            <strong>{notification.title}</strong>
            {notification.message && (
              <div>{notification.message}</div>
            )}
          </Alert>
        </Snackbar>
      ))}
    </Stack>
  )
}

export default NotificationProvider