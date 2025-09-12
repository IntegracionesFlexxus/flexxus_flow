/**
 * StatusBadge Component - Sprint 3
 * Badge de estado reutilizable con variantes y animaciones
 * Implementación con principios SOLID y Clean Code
 */

import React, { useMemo } from 'react';
import {
  Chip,
  Badge,
  Box,
  Typography,
  Tooltip,
  useTheme,
  alpha,
  ChipProps
} from '@mui/material';
import {
  CheckCircle,
  XCircle,
  AlertCircle,
  Clock,
  RefreshCw,
  Pause,
  Play,
  Loader,
  Zap,
  TrendingUp,
  TrendingDown,
  Minus,
  Lock,
  Unlock,
  Eye,
  EyeOff,
  User,
  UserCheck,
  UserX,
  Shield,
  ShieldCheck,
  ShieldOff,
  Circle,
  CircleDot
} from 'lucide-react';

export type StatusType = 
  | 'success' 
  | 'error' 
  | 'warning' 
  | 'info' 
  | 'pending'
  | 'active'
  | 'inactive'
  | 'processing'
  | 'completed'
  | 'cancelled'
  | 'paused'
  | 'draft'
  | 'published'
  | 'archived'
  | 'locked'
  | 'unlocked'
  | 'online'
  | 'offline'
  | 'available'
  | 'unavailable'
  | 'custom';

export interface StatusConfig {
  label: string;
  color?: 'default' | 'primary' | 'secondary' | 'error' | 'info' | 'success' | 'warning';
  backgroundColor?: string;
  textColor?: string;
  icon?: React.ReactNode;
  tooltip?: string;
  pulse?: boolean;
  variant?: 'filled' | 'outlined' | 'dot';
}

export interface StatusBadgeProps extends Omit<ChipProps, 'color' | 'label'> {
  status: StatusType | string;
  label?: string;
  customConfig?: StatusConfig;
  size?: 'small' | 'medium' | 'large';
  variant?: 'chip' | 'badge' | 'dot' | 'text';
  showIcon?: boolean;
  showLabel?: boolean;
  pulse?: boolean;
  interactive?: boolean;
  tooltip?: string;
  onClick?: () => void;
  customIcon?: React.ReactNode;
  uppercase?: boolean;
}

/**
 * Default status configurations
 * Clean Code: Configuración centralizada
 */
const defaultStatusConfigs: Record<StatusType, StatusConfig> = {
  success: {
    label: 'Exitoso',
    color: 'success',
    icon: <CheckCircle size={16} />,
    tooltip: 'Operación completada exitosamente'
  },
  error: {
    label: 'Error',
    color: 'error',
    icon: <XCircle size={16} />,
    tooltip: 'Se produjo un error'
  },
  warning: {
    label: 'Advertencia',
    color: 'warning',
    icon: <AlertCircle size={16} />,
    tooltip: 'Requiere atención'
  },
  info: {
    label: 'Información',
    color: 'info',
    icon: <AlertCircle size={16} />,
    tooltip: 'Información importante'
  },
  pending: {
    label: 'Pendiente',
    color: 'warning',
    icon: <Clock size={16} />,
    tooltip: 'En espera de procesamiento'
  },
  active: {
    label: 'Activo',
    color: 'success',
    icon: <Play size={16} />,
    tooltip: 'Actualmente activo',
    pulse: true
  },
  inactive: {
    label: 'Inactivo',
    color: 'default',
    icon: <Pause size={16} />,
    tooltip: 'Actualmente inactivo'
  },
  processing: {
    label: 'Procesando',
    color: 'info',
    icon: <Loader size={16} />,
    tooltip: 'En proceso',
    pulse: true
  },
  completed: {
    label: 'Completado',
    color: 'success',
    icon: <CheckCircle size={16} />,
    tooltip: 'Proceso completado'
  },
  cancelled: {
    label: 'Cancelado',
    color: 'error',
    icon: <XCircle size={16} />,
    tooltip: 'Proceso cancelado'
  },
  paused: {
    label: 'Pausado',
    color: 'warning',
    icon: <Pause size={16} />,
    tooltip: 'Temporalmente pausado'
  },
  draft: {
    label: 'Borrador',
    color: 'default',
    icon: <CircleDot size={16} />,
    tooltip: 'Guardado como borrador'
  },
  published: {
    label: 'Publicado',
    color: 'success',
    icon: <Eye size={16} />,
    tooltip: 'Visible públicamente'
  },
  archived: {
    label: 'Archivado',
    color: 'default',
    icon: <CircleDot size={16} />,
    tooltip: 'Archivado'
  },
  locked: {
    label: 'Bloqueado',
    color: 'error',
    icon: <Lock size={16} />,
    tooltip: 'Acceso bloqueado'
  },
  unlocked: {
    label: 'Desbloqueado',
    color: 'success',
    icon: <Unlock size={16} />,
    tooltip: 'Acceso permitido'
  },
  online: {
    label: 'En línea',
    color: 'success',
    icon: <Circle size={16} />,
    tooltip: 'Conectado',
    pulse: true
  },
  offline: {
    label: 'Fuera de línea',
    color: 'default',
    icon: <Circle size={16} />,
    tooltip: 'Desconectado'
  },
  available: {
    label: 'Disponible',
    color: 'success',
    icon: <CheckCircle size={16} />,
    tooltip: 'Disponible'
  },
  unavailable: {
    label: 'No disponible',
    color: 'error',
    icon: <XCircle size={16} />,
    tooltip: 'No disponible'
  },
  custom: {
    label: 'Custom',
    color: 'default'
  }
};

/**
 * StatusBadge Component
 * Principios aplicados:
 * - S: Responsabilidad única de mostrar estados
 * - O: Extensible con configuraciones personalizadas
 * - L: Sustituible por cualquier componente de estado
 * - I: Interface simple con props opcionales
 * - D: Depende de configuraciones abstractas
 */
export const StatusBadge: React.FC<StatusBadgeProps> = ({
  status,
  label: customLabel,
  customConfig,
  size = 'medium',
  variant = 'chip',
  showIcon = true,
  showLabel = true,
  pulse: customPulse,
  interactive = false,
  tooltip: customTooltip,
  onClick,
  customIcon,
  uppercase = false,
  ...chipProps
}) => {
  const theme = useTheme();

  /**
   * Get status configuration
   */
  const config = useMemo((): StatusConfig => {
    if (customConfig) {
      return customConfig;
    }
    
    const defaultConfig = defaultStatusConfigs[status as StatusType] || defaultStatusConfigs.custom;
    return {
      ...defaultConfig,
      label: customLabel || defaultConfig.label,
      icon: customIcon || defaultConfig.icon
    };
  }, [status, customConfig, customLabel, customIcon]);

  /**
   * Get size styles
   */
  const getSizeStyles = () => {
    switch (size) {
      case 'small':
        return {
          fontSize: '0.7rem',
          height: 20,
          iconSize: 12,
          dotSize: 8
        };
      case 'large':
        return {
          fontSize: '0.95rem',
          height: 32,
          iconSize: 20,
          dotSize: 12
        };
      default:
        return {
          fontSize: '0.8rem',
          height: 24,
          iconSize: 16,
          dotSize: 10
        };
    }
  };

  const sizeStyles = getSizeStyles();
  const shouldPulse = customPulse !== undefined ? customPulse : config.pulse;
  const tooltipText = customTooltip || config.tooltip;

  /**
   * Get color styles
   */
  const getColorStyles = () => {
    if (config.backgroundColor && config.textColor) {
      return {
        backgroundColor: config.backgroundColor,
        color: config.textColor
      };
    }

    const colors = {
      success: { bg: theme.palette.success.main, text: theme.palette.success.contrastText },
      error: { bg: theme.palette.error.main, text: theme.palette.error.contrastText },
      warning: { bg: theme.palette.warning.main, text: theme.palette.warning.contrastText },
      info: { bg: theme.palette.info.main, text: theme.palette.info.contrastText },
      primary: { bg: theme.palette.primary.main, text: theme.palette.primary.contrastText },
      secondary: { bg: theme.palette.secondary.main, text: theme.palette.secondary.contrastText },
      default: { bg: theme.palette.grey[500], text: theme.palette.common.white }
    };

    const colorConfig = colors[config.color || 'default'];
    return {
      backgroundColor: alpha(colorConfig.bg, variant === 'chip' ? 1 : 0.15),
      color: variant === 'chip' ? colorConfig.text : colorConfig.bg
    };
  };

  const colorStyles = getColorStyles();

  /**
   * Render dot variant
   */
  const renderDot = () => (
    <Box
      sx={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 0.5
      }}
    >
      <Box
        sx={{
          width: sizeStyles.dotSize,
          height: sizeStyles.dotSize,
          borderRadius: '50%',
          backgroundColor: colorStyles.backgroundColor,
          animation: shouldPulse ? 'pulse 1.5s infinite' : 'none',
          '@keyframes pulse': {
            '0%, 100%': { opacity: 1 },
            '50%': { opacity: 0.4 }
          }
        }}
      />
      {showLabel && (
        <Typography
          variant="body2"
          sx={{
            fontSize: sizeStyles.fontSize,
            color: colorStyles.color,
            textTransform: uppercase ? 'uppercase' : 'none'
          }}
        >
          {config.label}
        </Typography>
      )}
    </Box>
  );

  /**
   * Render text variant
   */
  const renderText = () => (
    <Box
      sx={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 0.5
      }}
    >
      {showIcon && config.icon && (
        <Box sx={{ display: 'flex', alignItems: 'center' }}>
          {React.cloneElement(config.icon as React.ReactElement, {
            size: sizeStyles.iconSize,
            color: colorStyles.color
          })}
        </Box>
      )}
      {showLabel && (
        <Typography
          variant="body2"
          sx={{
            fontSize: sizeStyles.fontSize,
            color: colorStyles.color,
            fontWeight: 500,
            textTransform: uppercase ? 'uppercase' : 'none'
          }}
        >
          {config.label}
        </Typography>
      )}
    </Box>
  );

  /**
   * Render badge variant
   */
  const renderBadge = () => (
    <Badge
      color={config.color as any}
      variant="dot"
      sx={{
        '& .MuiBadge-dot': {
          width: sizeStyles.dotSize,
          height: sizeStyles.dotSize,
          animation: shouldPulse ? 'pulse 1.5s infinite' : 'none'
        }
      }}
    >
      {showLabel && (
        <Typography
          variant="body2"
          sx={{
            fontSize: sizeStyles.fontSize,
            textTransform: uppercase ? 'uppercase' : 'none'
          }}
        >
          {config.label}
        </Typography>
      )}
    </Badge>
  );

  /**
   * Render chip variant
   */
  const renderChip = () => (
    <Chip
      label={showLabel ? config.label : undefined}
      icon={showIcon && config.icon ? config.icon as React.ReactElement : undefined}
      size={size === 'large' ? 'medium' : 'small'}
      color={config.color as any}
      onClick={interactive || onClick ? onClick : undefined}
      sx={{
        height: sizeStyles.height,
        fontSize: sizeStyles.fontSize,
        textTransform: uppercase ? 'uppercase' : 'none',
        animation: shouldPulse ? 'pulse 1.5s infinite' : 'none',
        '@keyframes pulse': {
          '0%, 100%': { opacity: 1 },
          '50%': { opacity: 0.7 }
        },
        '& .MuiChip-icon': {
          marginLeft: showLabel ? undefined : 0,
          marginRight: showLabel ? undefined : 0
        },
        ...(!showLabel && { paddingLeft: 1, paddingRight: 1 })
      }}
      {...chipProps}
    />
  );

  /**
   * Render content based on variant
   */
  const renderContent = () => {
    switch (variant) {
      case 'dot':
        return renderDot();
      case 'text':
        return renderText();
      case 'badge':
        return renderBadge();
      default:
        return renderChip();
    }
  };

  const content = renderContent();

  // Wrap with tooltip if provided
  if (tooltipText) {
    return (
      <Tooltip title={tooltipText} arrow>
        <Box sx={{ display: 'inline-flex' }}>
          {content}
        </Box>
      </Tooltip>
    );
  }

  return content;
};

/**
 * Status utilities
 * Clean Code: Funciones helper para trabajar con estados
 */
export const StatusUtils = {
  /**
   * Get color for status
   */
  getStatusColor: (status: StatusType): string => {
    const config = defaultStatusConfigs[status];
    const colorMap: Record<string, string> = {
      success: '#4caf50',
      error: '#f44336',
      warning: '#ff9800',
      info: '#2196f3',
      primary: '#1976d2',
      secondary: '#dc004e',
      default: '#9e9e9e'
    };
    return colorMap[config?.color || 'default'];
  },

  /**
   * Check if status is positive
   */
  isPositiveStatus: (status: StatusType): boolean => {
    const positiveStatuses: StatusType[] = [
      'success', 'active', 'completed', 'published', 
      'unlocked', 'online', 'available'
    ];
    return positiveStatuses.includes(status);
  },

  /**
   * Check if status is negative
   */
  isNegativeStatus: (status: StatusType): boolean => {
    const negativeStatuses: StatusType[] = [
      'error', 'cancelled', 'locked', 'offline', 'unavailable'
    ];
    return negativeStatuses.includes(status);
  },

  /**
   * Check if status is neutral
   */
  isNeutralStatus: (status: StatusType): boolean => {
    const neutralStatuses: StatusType[] = [
      'inactive', 'draft', 'archived', 'paused'
    ];
    return neutralStatuses.includes(status);
  },

  /**
   * Check if status is in progress
   */
  isInProgressStatus: (status: StatusType): boolean => {
    const inProgressStatuses: StatusType[] = [
      'pending', 'processing'
    ];
    return inProgressStatuses.includes(status);
  }
};

export default StatusBadge;