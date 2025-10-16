/**
 * WebSocket Indicator Component
 * Indicador visual del estado de conexión WebSocket
 */

import React from 'react';
import { Box, Tooltip, IconButton, Typography } from '@mui/material';
import {
  Wifi as WifiIcon,
  WifiOff as WifiOffIcon,
  Sync as SyncIcon,
  Error as ErrorIcon
} from '@mui/icons-material';
import { useWebSocketContext } from '../../contexts/WebSocketContext';
import { ConnectionStatus } from '../../services/websocket/OmniWebSocketClient';

interface WebSocketIndicatorProps {
  showLabel?: boolean;
  size?: 'small' | 'medium' | 'large';
}

export function WebSocketIndicator({ showLabel = false, size = 'small' }: WebSocketIndicatorProps) {
  const { status, isConnected, reconnect } = useWebSocketContext();

  const getStatusConfig = () => {
    switch (status) {
      case ConnectionStatus.CONNECTED:
        return {
          icon: <WifiIcon fontSize={size} />,
          color: '#4caf50',
          label: 'Conectado',
          tooltip: 'WebSocket conectado - Tiempo real activo'
        };
      case ConnectionStatus.CONNECTING:
        return {
          icon: <SyncIcon fontSize={size} className="rotating" />,
          color: '#ff9800',
          label: 'Conectando...',
          tooltip: 'Conectando al servidor WebSocket...'
        };
      case ConnectionStatus.RECONNECTING:
        return {
          icon: <SyncIcon fontSize={size} className="rotating" />,
          color: '#ff9800',
          label: 'Reconectando...',
          tooltip: 'Intentando reconectar...'
        };
      case ConnectionStatus.ERROR:
        return {
          icon: <ErrorIcon fontSize={size} />,
          color: '#f44336',
          label: 'Error',
          tooltip: 'Error de conexión - Click para reintentar'
        };
      case ConnectionStatus.DISCONNECTED:
      default:
        return {
          icon: <WifiOffIcon fontSize={size} />,
          color: '#9e9e9e',
          label: 'Desconectado',
          tooltip: 'WebSocket desconectado - Click para conectar'
        };
    }
  };

  const config = getStatusConfig();

  const handleClick = () => {
    if (!isConnected) {
      reconnect();
    }
  };

  if (showLabel) {
    return (
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          gap: 1,
          padding: '4px 12px',
          borderRadius: '16px',
          backgroundColor: `${config.color}20`,
          border: `1px solid ${config.color}40`,
          cursor: !isConnected ? 'pointer' : 'default',
          transition: 'all 0.2s',
          '&:hover': !isConnected ? {
            backgroundColor: `${config.color}30`,
            transform: 'scale(1.02)'
          } : {}
        }}
        onClick={handleClick}
      >
        <Box
          sx={{
            color: config.color,
            display: 'flex',
            alignItems: 'center',
            '& .rotating': {
              animation: 'rotate 1s linear infinite'
            },
            '@keyframes rotate': {
              '0%': { transform: 'rotate(0deg)' },
              '100%': { transform: 'rotate(360deg)' }
            }
          }}
        >
          {config.icon}
        </Box>
        <Typography
          variant="body2"
          sx={{
            color: config.color,
            fontWeight: 500,
            fontSize: '0.875rem'
          }}
        >
          {config.label}
        </Typography>
      </Box>
    );
  }

  return (
    <Tooltip title={config.tooltip} arrow>
      <IconButton
        size={size}
        onClick={handleClick}
        disabled={isConnected}
        sx={{
          color: config.color,
          '& .rotating': {
            animation: 'rotate 1s linear infinite'
          },
          '@keyframes rotate': {
            '0%': { transform: 'rotate(0deg)' },
            '100%': { transform: 'rotate(360deg)' }
          },
          '&:hover': {
            backgroundColor: `${config.color}10`
          }
        }}
      >
        {config.icon}
      </IconButton>
    </Tooltip>
  );
}

/**
 * Connection Status Badge
 * Badge pequeño para mostrar solo el estado
 */
interface ConnectionStatusBadgeProps {
  size?: number;
}

export function ConnectionStatusBadge({ size = 8 }: ConnectionStatusBadgeProps) {
  const { status } = useWebSocketContext();

  const getColor = () => {
    switch (status) {
      case ConnectionStatus.CONNECTED:
        return '#4caf50';
      case ConnectionStatus.CONNECTING:
      case ConnectionStatus.RECONNECTING:
        return '#ff9800';
      case ConnectionStatus.ERROR:
        return '#f44336';
      case ConnectionStatus.DISCONNECTED:
      default:
        return '#9e9e9e';
    }
  };

  const isAnimated = status === ConnectionStatus.CONNECTING || status === ConnectionStatus.RECONNECTING;

  return (
    <Box
      sx={{
        width: size,
        height: size,
        borderRadius: '50%',
        backgroundColor: getColor(),
        animation: isAnimated ? 'pulse 1.5s ease-in-out infinite' : 'none',
        '@keyframes pulse': {
          '0%, 100%': { opacity: 1 },
          '50%': { opacity: 0.5 }
        }
      }}
    />
  );
}
