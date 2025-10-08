/**
 * NotificationBell Component
 * Campana de notificaciones simplificada
 */

import React from 'react';
import {
  IconButton,
  Badge,
  Tooltip,
  useTheme,
  alpha
} from '@mui/material';
import { Bell, BellOff } from 'lucide-react';
import { keyframes } from '@mui/system';
import { useUIStore } from '@/shared/store';

// Animación de campana
const bellRing = keyframes`
  0% { transform: rotate(0); }
  10% { transform: rotate(14deg); }
  20% { transform: rotate(-8deg); }
  30% { transform: rotate(14deg); }
  40% { transform: rotate(-4deg); }
  50% { transform: rotate(10deg); }
  60% { transform: rotate(0); }
  100% { transform: rotate(0); }
`;

interface NotificationBellProps {
  disabled?: boolean;
  size?: 'small' | 'medium' | 'large';
  showAnimation?: boolean;
}

export const NotificationBell: React.FC<NotificationBellProps> = ({
  disabled = false,
  size = 'medium',
  showAnimation = true
}) => {
  const theme = useTheme();
  const { notifications } = useUIStore();

  // Contar notificaciones activas
  const unreadCount = notifications.length;
  const hasNotifications = unreadCount > 0;
  
  // Manejar click en la campana
  const handleClick = () => {
    // Por ahora solo loggea, se puede expandir en el futuro
    console.log('Notification bell clicked', { unreadCount });
  };

  return (
    <Tooltip title={disabled ? "Notificaciones deshabilitadas" : `${unreadCount} notificaciones`}>
      <span>
        <IconButton
          onClick={handleClick}
          disabled={disabled}
          size={size}
          sx={{
            color: theme.palette.text.secondary,
            '&:hover': {
              backgroundColor: alpha(theme.palette.primary.main, 0.08),
              color: theme.palette.primary.main,
            },
            '&.Mui-disabled': {
              color: theme.palette.action.disabled,
            },
            animation: hasNotifications && showAnimation ? `${bellRing} 2s ease-in-out infinite` : 'none',
          }}
        >
          <Badge
            badgeContent={unreadCount}
            color="error"
            max={99}
            invisible={!hasNotifications || disabled}
          >
            {disabled ? (
              <BellOff size={size === 'small' ? 20 : size === 'large' ? 28 : 24} />
            ) : (
              <Bell size={size === 'small' ? 20 : size === 'large' ? 28 : 24} />
            )}
          </Badge>
        </IconButton>
      </span>
    </Tooltip>
  );
};

export default NotificationBell;