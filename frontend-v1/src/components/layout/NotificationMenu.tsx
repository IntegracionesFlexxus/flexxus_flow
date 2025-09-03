import React, { useState } from 'react'
import {
  IconButton,
  Badge,
  Menu,
  MenuItem,
  ListItemText,
  ListItemAvatar,
  Avatar,
  Typography,
  Box,
  Button,
  Divider,
  Chip,
  List,
  ListItem
} from '@mui/material'
import {
  Notifications as NotificationsIcon,
  NotificationsNone as NotificationsNoneIcon,
  Email as EmailIcon,
  Warning as WarningIcon,
  Info as InfoIcon,
  CheckCircle as CheckCircleIcon,
  Error as ErrorIcon,
  MarkEmailRead as MarkReadIcon
} from '@mui/icons-material'
import { formatDistanceToNow } from 'date-fns'
import { es } from 'date-fns/locale'

// NotificationMenu component - MVP con notificaciones básicas
// TODO: En Nivel 2 conectar con WebSocket para tiempo real

interface Notification {
  id: string
  type: 'info' | 'success' | 'warning' | 'error' | 'message'
  title: string
  message: string
  timestamp: Date
  read: boolean
  avatar?: string
  action?: {
    label: string
    url: string
  }
}

const NotificationMenu: React.FC = () => {
  // Estado del menú
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null)
  const open = Boolean(anchorEl)
  
  // Notificaciones mock para MVP
  // TODO: En Nivel 2 obtener de store/API
  const [notifications, setNotifications] = useState<Notification[]>([
    {
      id: '1',
      type: 'message',
      title: 'Nuevo mensaje',
      message: 'Tienes un nuevo mensaje de Juan Pérez',
      timestamp: new Date(Date.now() - 1000 * 60 * 5), // 5 minutos
      read: false
    },
    {
      id: '2',
      type: 'success',
      title: 'Workflow completado',
      message: 'El workflow "Bienvenida" se ejecutó correctamente',
      timestamp: new Date(Date.now() - 1000 * 60 * 30), // 30 minutos
      read: false
    },
    {
      id: '3',
      type: 'warning',
      title: 'Límite de contactos',
      message: 'Has alcanzado el 80% de tu límite mensual',
      timestamp: new Date(Date.now() - 1000 * 60 * 60 * 2), // 2 horas
      read: true
    }
  ])
  
  const unreadCount = notifications.filter(n => !n.read).length
  
  const handleClick = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget)
  }
  
  const handleClose = () => {
    setAnchorEl(null)
  }
  
  const handleMarkAllRead = () => {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })))
  }
  
  const handleMarkRead = (id: string) => {
    setNotifications(prev => 
      prev.map(n => n.id === id ? { ...n, read: true } : n)
    )
  }
  
  const getIcon = (type: string) => {
    switch (type) {
      case 'message':
        return <EmailIcon />
      case 'success':
        return <CheckCircleIcon color="success" />
      case 'warning':
        return <WarningIcon color="warning" />
      case 'error':
        return <ErrorIcon color="error" />
      default:
        return <InfoIcon color="info" />
    }
  }
  
  const getTimeAgo = (date: Date) => {
    return formatDistanceToNow(date, { 
      addSuffix: true,
      locale: es 
    })
  }
  
  return (
    <>
      <IconButton
        onClick={handleClick}
        size="large"
        aria-label={`${unreadCount} notificaciones nuevas`}
        color="inherit"
      >
        <Badge badgeContent={unreadCount} color="error">
          {unreadCount > 0 ? <NotificationsIcon /> : <NotificationsNoneIcon />}
        </Badge>
      </IconButton>
      
      <Menu
        anchorEl={anchorEl}
        open={open}
        onClose={handleClose}
        onClick={handleClose}
        transformOrigin={{ horizontal: 'right', vertical: 'top' }}
        anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
        PaperProps={{
          elevation: 0,
          sx: {
            overflow: 'visible',
            filter: 'drop-shadow(0px 2px 8px rgba(0,0,0,0.32))',
            mt: 1.5,
            maxWidth: 420,
            width: '100%',
            maxHeight: 500,
            '&:before': {
              content: '""',
              display: 'block',
              position: 'absolute',
              top: 0,
              right: 14,
              width: 10,
              height: 10,
              bgcolor: 'background.paper',
              transform: 'translateY(-50%) rotate(45deg)',
              zIndex: 0,
            },
          },
        }}
      >
        {/* Header */}
        <Box sx={{ 
          px: 2, 
          py: 1.5, 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'space-between' 
        }}>
          <Typography variant="h6">
            Notificaciones
          </Typography>
          {unreadCount > 0 && (
            <Button
              size="small"
              startIcon={<MarkReadIcon />}
              onClick={(e) => {
                e.stopPropagation()
                handleMarkAllRead()
              }}
            >
              Marcar todas
            </Button>
          )}
        </Box>
        
        <Divider />
        
        {/* Notifications List */}
        {notifications.length === 0 ? (
          <Box sx={{ p: 3, textAlign: 'center' }}>
            <NotificationsNoneIcon sx={{ fontSize: 48, color: 'text.secondary' }} />
            <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
              No tienes notificaciones
            </Typography>
          </Box>
        ) : (
          <List sx={{ p: 0, maxHeight: 350, overflow: 'auto' }}>
            {notifications.map((notification) => (
              <ListItem
                key={notification.id}
                alignItems="flex-start"
                onClick={() => handleMarkRead(notification.id)}
                sx={{
                  bgcolor: notification.read ? 'transparent' : 'action.hover',
                  cursor: 'pointer',
                  '&:hover': {
                    bgcolor: 'action.selected',
                  },
                  borderBottom: '1px solid',
                  borderColor: 'divider'
                }}
              >
                <ListItemAvatar>
                  <Avatar sx={{ bgcolor: 'transparent', color: 'text.primary' }}>
                    {getIcon(notification.type)}
                  </Avatar>
                </ListItemAvatar>
                <ListItemText
                  primary={
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Typography variant="body1" fontWeight={notification.read ? 400 : 600}>
                        {notification.title}
                      </Typography>
                      {!notification.read && (
                        <Chip 
                          label="Nueva" 
                          size="small" 
                          color="primary"
                          sx={{ height: 16 }}
                        />
                      )}
                    </Box>
                  }
                  secondary={
                    <>
                      <Typography
                        component="span"
                        variant="body2"
                        color="text.primary"
                        sx={{ display: 'block' }}
                      >
                        {notification.message}
                      </Typography>
                      <Typography
                        component="span"
                        variant="caption"
                        color="text.secondary"
                      >
                        {getTimeAgo(notification.timestamp)}
                      </Typography>
                    </>
                  }
                />
              </ListItem>
            ))}
          </List>
        )}
        
        <Divider />
        
        {/* Footer */}
        <Box sx={{ p: 1, textAlign: 'center' }}>
          <Button size="small" fullWidth>
            Ver todas las notificaciones
          </Button>
        </Box>
      </Menu>
    </>
  )
}

export default NotificationMenu