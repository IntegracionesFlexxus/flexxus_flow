/**
 * ChannelCard Component
 * Tarjeta individual para mostrar un canal con sus controles
 */

import React from 'react';
import {
  Card,
  CardContent,
  CardActions,
  Box,
  Typography,
  Chip,
  Switch,
  FormControlLabel,
  Button,
  List,
  ListItem,
  ListItemText,
  CircularProgress,
  Tooltip,
  IconButton
} from '@mui/material';
import {
  WhatsApp as WhatsAppIcon,
  Email as EmailIcon,
  Message as MessageIcon,
  Facebook as FacebookIcon,
  Instagram as InstagramIcon,
  Settings as SettingsIcon,
  CheckCircle as CheckCircleIcon,
  Error as ErrorIcon,
  Warning as WarningIcon,
  Refresh as RefreshIcon,
  Delete as DeleteIcon
} from '@mui/icons-material';
import { Channel, ChannelType, ChannelHealthStatus } from '../../types';

interface ChannelCardProps {
  channel: Channel;
  onToggle: (channel: Channel) => void;
  onConfigure: (channel: Channel) => void;
  onDelete?: (channel: Channel) => void;
  onRefreshHealth?: (channel: Channel) => void;
  isToggling?: boolean;
  isDeleting?: boolean;
}

export const ChannelCard: React.FC<ChannelCardProps> = ({
  channel,
  onToggle,
  onConfigure,
  onDelete,
  onRefreshHealth,
  isToggling = false,
  isDeleting = false
}) => {
  // Obtener icono según el tipo de canal
  const getChannelIcon = () => {
    const iconProps = { sx: { fontSize: 40 } };

    switch (channel.channel_type) {
      case ChannelType.WHATSAPP:
        return <WhatsAppIcon {...iconProps} sx={{ ...iconProps.sx, color: '#25D366' }} />;
      case ChannelType.EMAIL:
        return <EmailIcon {...iconProps} sx={{ ...iconProps.sx, color: '#EA4335' }} />;
      case ChannelType.SMS:
        return <MessageIcon {...iconProps} sx={{ ...iconProps.sx, color: '#1976d2' }} />;
      case ChannelType.FACEBOOK:
        return <FacebookIcon {...iconProps} sx={{ ...iconProps.sx, color: '#1877F2' }} />;
      case ChannelType.INSTAGRAM:
        return <InstagramIcon {...iconProps} sx={{ ...iconProps.sx, color: '#E4405F' }} />;
      default:
        return <MessageIcon {...iconProps} />;
    }
  };

  // Obtener estado del chip de salud
  const getHealthChip = () => {
    const status = channel.health_status;
    let icon: React.ReactNode;
    let color: 'success' | 'warning' | 'error' | 'default' = 'default';
    let label = 'Desconocido';

    switch (status) {
      case ChannelHealthStatus.HEALTHY:
        icon = <CheckCircleIcon />;
        color = 'success';
        label = 'Conectado';
        break;
      case ChannelHealthStatus.DEGRADED:
        icon = <WarningIcon />;
        color = 'warning';
        label = 'Degradado';
        break;
      case ChannelHealthStatus.DOWN:
        icon = <ErrorIcon />;
        color = 'error';
        label = 'Desconectado';
        break;
      default:
        icon = <ErrorIcon />;
        label = 'No verificado';
    }

    return (
      <Chip
        icon={icon}
        label={label}
        size="small"
        color={color}
      />
    );
  };

  // Formatear estadísticas
  const formatNumber = (num?: number) => {
    if (num === undefined || num === null) return '0';
    return num.toLocaleString();
  };

  const isConnected = channel.health_status === ChannelHealthStatus.HEALTHY;
  const showStats = channel.is_active && isConnected && channel.stats;

  return (
    <Card
      sx={{
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        position: 'relative',
        border: channel.is_active ? '2px solid' : '1px solid',
        borderColor: channel.is_active ? 'primary.main' : 'divider',
        opacity: isDeleting ? 0.5 : 1,
        transition: 'all 0.3s ease',
        '&:hover': {
          boxShadow: channel.is_active ? 3 : 1
        }
      }}
    >
      <CardContent sx={{ flex: 1 }}>
        {/* Header con icono y estado */}
        <Box sx={{
          display: 'flex',
          alignItems: 'flex-start',
          justifyContent: 'space-between',
          mb: 2
        }}>
          {getChannelIcon()}
          <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
            {getHealthChip()}
            {onRefreshHealth && (
              <Tooltip title="Verificar estado">
                <IconButton
                  size="small"
                  onClick={() => onRefreshHealth(channel)}
                  disabled={isToggling}
                >
                  <RefreshIcon fontSize="small" />
                </IconButton>
              </Tooltip>
            )}
          </Box>
        </Box>

        {/* Nombre y descripción */}
        <Typography variant="h6" gutterBottom>
          {channel.name}
        </Typography>

        {channel.description && (
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            {channel.description}
          </Typography>
        )}

        {/* Estadísticas */}
        {showStats && (
          <List dense>
            <ListItem disablePadding>
              <ListItemText
                primary="Mensajes enviados"
                secondary={formatNumber(channel.stats?.messagesSent)}
              />
            </ListItem>
            <ListItem disablePadding>
              <ListItemText
                primary="Mensajes recibidos"
                secondary={formatNumber(channel.stats?.messagesReceived)}
              />
            </ListItem>
            {channel.stats?.conversationsActive !== undefined && (
              <ListItem disablePadding>
                <ListItemText
                  primary="Conversaciones activas"
                  secondary={formatNumber(channel.stats.conversationsActive)}
                />
              </ListItem>
            )}
          </List>
        )}

        {/* Información adicional cuando está desconectado */}
        {!isConnected && channel.is_active && (
          <Box sx={{ mt: 2 }}>
            <Typography variant="body2" color="warning.main">
              El canal está activo pero no conectado.
              Configura las credenciales para comenzar.
            </Typography>
          </Box>
        )}

        {/* Mostrar última verificación */}
        {channel.last_health_check && (
          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1 }}>
            Última verificación: {new Date(channel.last_health_check).toLocaleString()}
          </Typography>
        )}
      </CardContent>

      {/* Acciones */}
      <CardActions sx={{
        justifyContent: 'space-between',
        px: 2,
        pb: 2,
        borderTop: '1px solid',
        borderColor: 'divider'
      }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <FormControlLabel
            control={
              <Switch
                checked={channel.is_active}
                onChange={() => onToggle(channel)}
                disabled={isToggling || isDeleting}
              />
            }
            label={isToggling ? (
              <CircularProgress size={16} />
            ) : (
              channel.is_active ? 'Activo' : 'Inactivo'
            )}
          />

          {onDelete && (
            <Tooltip title="Eliminar canal">
              <IconButton
                size="small"
                color="error"
                onClick={() => onDelete(channel)}
                disabled={isDeleting || isToggling}
              >
                <DeleteIcon fontSize="small" />
              </IconButton>
            </Tooltip>
          )}
        </Box>

        <Button
          size="small"
          startIcon={<SettingsIcon />}
          variant={channel.is_active && isConnected ? 'outlined' : 'contained'}
          onClick={() => onConfigure(channel)}
          disabled={isDeleting}
        >
          {isConnected ? 'Configurar' : 'Conectar'}
        </Button>
      </CardActions>
    </Card>
  );
};