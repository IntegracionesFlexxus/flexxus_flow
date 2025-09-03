import React from 'react';
import { Box, Chip, Typography, Tooltip, CircularProgress } from '@mui/material';
import {
  WifiOff,
  Wifi,
  CloudOff,
  Cloud,
  Sync,
  Error as ErrorIcon
} from '@mui/icons-material';
import { useRealtimeStore } from '@/shared/store/realtimeStore';
import { ConnectionStatus } from '@/config/websocket.config';

// Indicador de conexión real-time - MVP Nivel 1
// TODO: En Nivel 2 agregar animaciones, detalles de latencia, diagnósticos

interface ConnectionIndicatorProps {
  variant?: 'chip' | 'icon' | 'detailed';
  showLabel?: boolean;
  size?: 'small' | 'medium' | 'large';
}

export function ConnectionIndicator({
  variant = 'chip',
  showLabel = true,
  size = 'small'
}: ConnectionIndicatorProps) {
  const { connectionStatus, reconnectAttempts, stats } = useRealtimeStore();

  const getStatusColor = () => {
    switch (connectionStatus) {
      case ConnectionStatus.CONNECTED:
        return 'success';
      case ConnectionStatus.CONNECTING:
      case ConnectionStatus.RECONNECTING:
        return 'warning';
      case ConnectionStatus.DISCONNECTED:
        return 'default';
      case ConnectionStatus.ERROR:
        return 'error';
      default:
        return 'default';
    }
  };

  const getStatusIcon = () => {
    switch (connectionStatus) {
      case ConnectionStatus.CONNECTED:
        return <Wifi fontSize={size} />;
      case ConnectionStatus.CONNECTING:
        return <CircularProgress size={size === 'small' ? 14 : size === 'medium' ? 20 : 24} />;
      case ConnectionStatus.RECONNECTING:
        return <Sync className="animate-spin" fontSize={size} />;
      case ConnectionStatus.DISCONNECTED:
        return <WifiOff fontSize={size} />;
      case ConnectionStatus.ERROR:
        return <ErrorIcon fontSize={size} />;
      default:
        return <CloudOff fontSize={size} />;
    }
  };

  const getStatusLabel = () => {
    switch (connectionStatus) {
      case ConnectionStatus.CONNECTED:
        return 'Conectado';
      case ConnectionStatus.CONNECTING:
        return 'Conectando...';
      case ConnectionStatus.RECONNECTING:
        return `Reconectando... (${reconnectAttempts})`;
      case ConnectionStatus.DISCONNECTED:
        return 'Desconectado';
      case ConnectionStatus.ERROR:
        return 'Error de conexión';
      default:
        return 'Desconocido';
    }
  };

  const getTooltipContent = () => {
    return (
      <Box>
        <Typography variant="body2" fontWeight="bold">
          Estado: {getStatusLabel()}
        </Typography>
        {connectionStatus === ConnectionStatus.CONNECTED && (
          <>
            <Typography variant="caption" display="block">
              Mensajes recibidos: {stats.messagesReceived}
            </Typography>
            <Typography variant="caption" display="block">
              Mensajes enviados: {stats.messagesSent}
            </Typography>
          </>
        )}
        {reconnectAttempts > 0 && (
          <Typography variant="caption" display="block">
            Intentos de reconexión: {reconnectAttempts}
          </Typography>
        )}
      </Box>
    );
  };

  if (variant === 'icon') {
    return (
      <Tooltip title={getTooltipContent()}>
        <Box
          sx={{
            display: 'inline-flex',
            alignItems: 'center',
            color: `${getStatusColor()}.main`
          }}
        >
          {getStatusIcon()}
        </Box>
      </Tooltip>
    );
  }

  if (variant === 'detailed') {
    return (
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          gap: 1,
          p: 1,
          borderRadius: 1,
          bgcolor: 'background.paper',
          border: '1px solid',
          borderColor: `${getStatusColor()}.main`
        }}
      >
        <Box sx={{ color: `${getStatusColor()}.main` }}>
          {getStatusIcon()}
        </Box>
        <Box>
          <Typography variant="caption" fontWeight="bold">
            {getStatusLabel()}
          </Typography>
          {connectionStatus === ConnectionStatus.CONNECTED && (
            <Typography variant="caption" display="block" color="text.secondary">
              {stats.messagesReceived} recibidos | {stats.messagesSent} enviados
            </Typography>
          )}
        </Box>
      </Box>
    );
  }

  // Variant: chip (default)
  return (
    <Tooltip title={getTooltipContent()}>
      <Chip
        icon={getStatusIcon()}
        label={showLabel ? getStatusLabel() : undefined}
        color={getStatusColor()}
        size={size}
        variant="outlined"
      />
    </Tooltip>
  );
}

// Mini indicador para barra de estado
export function ConnectionStatusDot() {
  const connectionStatus = useRealtimeStore(state => state.connectionStatus);

  const getColor = () => {
    switch (connectionStatus) {
      case ConnectionStatus.CONNECTED:
        return '#4caf50';
      case ConnectionStatus.CONNECTING:
      case ConnectionStatus.RECONNECTING:
        return '#ff9800';
      case ConnectionStatus.ERROR:
        return '#f44336';
      default:
        return '#9e9e9e';
    }
  };

  const isAnimating = connectionStatus === ConnectionStatus.CONNECTING ||
                      connectionStatus === ConnectionStatus.RECONNECTING;

  return (
    <Tooltip title={`Estado: ${connectionStatus}`}>
      <Box
        sx={{
          width: 8,
          height: 8,
          borderRadius: '50%',
          bgcolor: getColor(),
          animation: isAnimating ? 'pulse 1.5s infinite' : 'none',
          '@keyframes pulse': {
            '0%': { opacity: 1 },
            '50%': { opacity: 0.4 },
            '100%': { opacity: 1 }
          }
        }}
      />
    </Tooltip>
  );
}

// Banner de reconexión
export function ReconnectionBanner() {
  const { connectionStatus, reconnectAttempts } = useRealtimeStore();

  if (connectionStatus !== ConnectionStatus.RECONNECTING &&
      connectionStatus !== ConnectionStatus.ERROR) {
    return null;
  }

  return (
    <Box
      sx={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bgcolor: connectionStatus === ConnectionStatus.ERROR ? 'error.main' : 'warning.main',
        color: 'white',
        p: 1,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 1,
        zIndex: 9999
      }}
    >
      {connectionStatus === ConnectionStatus.RECONNECTING ? (
        <>
          <CircularProgress size={16} color="inherit" />
          <Typography variant="body2">
            Reconectando... Intento {reconnectAttempts}
          </Typography>
        </>
      ) : (
        <>
          <ErrorIcon fontSize="small" />
          <Typography variant="body2">
            Error de conexión. Por favor verifica tu internet.
          </Typography>
        </>
      )}
    </Box>
  );
}

export default ConnectionIndicator;