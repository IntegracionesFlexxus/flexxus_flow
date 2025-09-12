/**
 * EmptyState Component - Sprint 3
 * Componente para estados vacíos reutilizable
 * Implementación con principios SOLID y Clean Code
 */

import React from 'react';
import {
  Box,
  Typography,
  Button,
  Stack,
  Paper,
  useTheme,
  alpha,
  SvgIcon
} from '@mui/material';
import {
  Inbox,
  Search,
  FileText,
  Users,
  FolderOpen,
  Database,
  Cloud,
  Wifi,
  AlertCircle,
  Plus,
  Upload,
  Download,
  RefreshCw,
  Filter,
  Settings,
  ShoppingCart,
  Calendar,
  Mail,
  MessageSquare,
  Image,
  Music,
  Video,
  Archive,
  Package,
  Briefcase,
  BookOpen,
  Cpu,
  Globe,
  Heart,
  Home,
  Map,
  Phone,
  Shield,
  Star,
  Zap,
  Coffee
} from 'lucide-react';

export interface EmptyStateAction {
  label: string;
  onClick: () => void;
  variant?: 'text' | 'outlined' | 'contained';
  color?: 'primary' | 'secondary' | 'error' | 'info' | 'success' | 'warning';
  icon?: React.ReactNode;
}

export interface EmptyStateProps {
  // Content
  title?: string;
  description?: string;
  icon?: React.ReactNode;
  iconType?: 'default' | 'search' | 'error' | 'no-data' | 'no-results' | 'no-access' | 'maintenance' | 'custom';
  image?: string;
  // Actions
  primaryAction?: EmptyStateAction;
  secondaryAction?: EmptyStateAction;
  actions?: EmptyStateAction[];
  // Styling
  variant?: 'default' | 'compact' | 'card' | 'minimal';
  size?: 'small' | 'medium' | 'large';
  orientation?: 'vertical' | 'horizontal';
  showBorder?: boolean;
  backgroundColor?: string;
  maxWidth?: string | number;
  height?: string | number;
  // Features
  animate?: boolean;
  children?: React.ReactNode;
}

/**
 * EmptyState Component
 * Principios aplicados:
 * - S: Responsabilidad única de mostrar estados vacíos
 * - O: Extensible con diferentes variantes y acciones
 * - I: Interface simple y clara
 * - D: No depende de implementaciones concretas
 */
export const EmptyState: React.FC<EmptyStateProps> = ({
  // Content
  title,
  description,
  icon,
  iconType = 'default',
  image,
  // Actions
  primaryAction,
  secondaryAction,
  actions = [],
  // Styling
  variant = 'default',
  size = 'medium',
  orientation = 'vertical',
  showBorder = false,
  backgroundColor,
  maxWidth = 400,
  height,
  // Features
  animate = true,
  children
}) => {
  const theme = useTheme();

  /**
   * Get default icon based on type
   * Clean Code: Función pura para obtener icono
   */
  const getDefaultIcon = () => {
    const iconSize = size === 'small' ? 48 : size === 'large' ? 96 : 64;
    const iconColor = theme.palette.text.secondary;
    const iconProps = {
      size: iconSize,
      color: iconColor,
      strokeWidth: 1.5
    };

    if (icon) return icon;

    switch (iconType) {
      case 'search':
        return <Search {...iconProps} />;
      case 'error':
        return <AlertCircle {...iconProps} color={theme.palette.error.main} />;
      case 'no-data':
        return <Database {...iconProps} />;
      case 'no-results':
        return <FileText {...iconProps} />;
      case 'no-access':
        return <Shield {...iconProps} />;
      case 'maintenance':
        return <Settings {...iconProps} />;
      default:
        return <Inbox {...iconProps} />;
    }
  };

  /**
   * Get size styles
   */
  const getSizeStyles = () => {
    switch (size) {
      case 'small':
        return {
          padding: theme.spacing(2),
          titleVariant: 'h6' as const,
          descriptionVariant: 'body2' as const,
          spacing: 1.5
        };
      case 'large':
        return {
          padding: theme.spacing(6),
          titleVariant: 'h4' as const,
          descriptionVariant: 'body1' as const,
          spacing: 3
        };
      default:
        return {
          padding: theme.spacing(4),
          titleVariant: 'h5' as const,
          descriptionVariant: 'body1' as const,
          spacing: 2
        };
    }
  };

  /**
   * Get variant styles
   */
  const getVariantStyles = () => {
    const baseStyles = {
      display: 'flex',
      flexDirection: orientation === 'horizontal' ? 'row' : 'column' as any,
      alignItems: 'center',
      justifyContent: 'center',
      textAlign: orientation === 'horizontal' ? 'left' : 'center' as any,
      gap: theme.spacing(getSizeStyles().spacing),
      width: '100%',
      maxWidth,
      margin: '0 auto',
      height: height || 'auto',
      minHeight: size === 'large' ? 400 : size === 'small' ? 200 : 300
    };

    switch (variant) {
      case 'card':
        return {
          ...baseStyles,
          backgroundColor: backgroundColor || theme.palette.background.paper,
          borderRadius: theme.shape.borderRadius,
          boxShadow: theme.shadows[1],
          padding: getSizeStyles().padding
        };
      case 'compact':
        return {
          ...baseStyles,
          padding: theme.spacing(2),
          minHeight: 'auto'
        };
      case 'minimal':
        return {
          ...baseStyles,
          padding: 0,
          minHeight: 'auto',
          gap: theme.spacing(1)
        };
      default:
        return {
          ...baseStyles,
          backgroundColor: backgroundColor || 'transparent',
          border: showBorder ? `1px solid ${theme.palette.divider}` : 'none',
          borderRadius: showBorder ? theme.shape.borderRadius : 0,
          padding: getSizeStyles().padding
        };
    }
  };

  const styles = getSizeStyles();
  const variantStyles = getVariantStyles();

  /**
   * Render actions
   */
  const renderActions = () => {
    const allActions = [
      ...(primaryAction ? [{ ...primaryAction, variant: 'contained' as const }] : []),
      ...(secondaryAction ? [{ ...secondaryAction, variant: 'outlined' as const }] : []),
      ...actions
    ];

    if (allActions.length === 0) return null;

    return (
      <Stack
        direction={orientation === 'horizontal' ? 'column' : 'row'}
        spacing={1}
        sx={{ mt: styles.spacing }}
      >
        {allActions.map((action, index) => (
          <Button
            key={index}
            variant={action.variant || 'text'}
            color={action.color || 'primary'}
            onClick={action.onClick}
            startIcon={action.icon}
          >
            {action.label}
          </Button>
        ))}
      </Stack>
    );
  };

  /**
   * Render icon with animation
   */
  const renderIcon = () => {
    const iconElement = image ? (
      <Box
        component="img"
        src={image}
        alt={title || 'Empty state'}
        sx={{
          width: size === 'small' ? 120 : size === 'large' ? 240 : 180,
          height: 'auto',
          opacity: 0.8
        }}
      />
    ) : (
      getDefaultIcon()
    );

    return (
      <Box
        sx={{
          position: 'relative',
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          animation: animate ? 'fadeIn 0.5s ease-in' : 'none',
          '@keyframes fadeIn': {
            from: { opacity: 0, transform: 'translateY(-10px)' },
            to: { opacity: 1, transform: 'translateY(0)' }
          }
        }}
      >
        {/* Background circle */}
        {!image && variant !== 'minimal' && (
          <Box
            sx={{
              position: 'absolute',
              width: size === 'small' ? 80 : size === 'large' ? 160 : 120,
              height: size === 'small' ? 80 : size === 'large' ? 160 : 120,
              borderRadius: '50%',
              backgroundColor: alpha(theme.palette.primary.main, 0.08),
              animation: animate ? 'pulse 2s infinite' : 'none',
              '@keyframes pulse': {
                '0%': { transform: 'scale(1)', opacity: 0.5 },
                '50%': { transform: 'scale(1.05)', opacity: 0.3 },
                '100%': { transform: 'scale(1)', opacity: 0.5 }
              }
            }}
          />
        )}
        {iconElement}
      </Box>
    );
  };

  const Container = variant === 'card' ? Paper : Box;

  return (
    <Container sx={variantStyles}>
      {/* Icon/Image */}
      {(icon || iconType || image) && renderIcon()}

      {/* Content */}
      <Box
        sx={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: orientation === 'horizontal' ? 'flex-start' : 'center',
          gap: theme.spacing(1),
          flex: orientation === 'horizontal' ? 1 : 'none'
        }}
      >
        {title && (
          <Typography
            variant={styles.titleVariant}
            color="text.primary"
            fontWeight={500}
            sx={{
              animation: animate ? 'slideIn 0.5s ease-in 0.1s both' : 'none',
              '@keyframes slideIn': {
                from: { opacity: 0, transform: 'translateX(-10px)' },
                to: { opacity: 1, transform: 'translateX(0)' }
              }
            }}
          >
            {title}
          </Typography>
        )}

        {description && (
          <Typography
            variant={styles.descriptionVariant}
            color="text.secondary"
            sx={{
              maxWidth: 500,
              animation: animate ? 'slideIn 0.5s ease-in 0.2s both' : 'none'
            }}
          >
            {description}
          </Typography>
        )}

        {/* Custom content */}
        {children && (
          <Box sx={{ mt: styles.spacing }}>
            {children}
          </Box>
        )}

        {/* Actions */}
        {renderActions()}
      </Box>
    </Container>
  );
};

/**
 * Preset empty states for common scenarios
 * Clean Code: Funciones helper para casos comunes
 */
export const EmptyStatePresets = {
  noData: (props?: Partial<EmptyStateProps>) => ({
    title: 'No hay datos disponibles',
    description: 'Aún no hay información para mostrar en esta sección.',
    iconType: 'no-data' as const,
    ...props
  }),

  noResults: (props?: Partial<EmptyStateProps>) => ({
    title: 'Sin resultados',
    description: 'No se encontraron resultados que coincidan con tu búsqueda.',
    iconType: 'no-results' as const,
    ...props
  }),

  searchEmpty: (searchTerm?: string, props?: Partial<EmptyStateProps>) => ({
    title: 'Sin resultados de búsqueda',
    description: searchTerm 
      ? `No se encontraron resultados para "${searchTerm}"`
      : 'Intenta con diferentes términos de búsqueda',
    iconType: 'search' as const,
    ...props
  }),

  error: (message?: string, props?: Partial<EmptyStateProps>) => ({
    title: 'Ocurrió un error',
    description: message || 'No se pudo cargar la información. Por favor, intenta nuevamente.',
    iconType: 'error' as const,
    primaryAction: {
      label: 'Reintentar',
      onClick: () => window.location.reload(),
      icon: <RefreshCw size={18} />
    },
    ...props
  }),

  noAccess: (props?: Partial<EmptyStateProps>) => ({
    title: 'Acceso restringido',
    description: 'No tienes permisos para ver esta información.',
    iconType: 'no-access' as const,
    ...props
  }),

  maintenance: (props?: Partial<EmptyStateProps>) => ({
    title: 'En mantenimiento',
    description: 'Esta sección está temporalmente en mantenimiento. Por favor, vuelve más tarde.',
    iconType: 'maintenance' as const,
    ...props
  }),

  comingSoon: (props?: Partial<EmptyStateProps>) => ({
    title: 'Próximamente',
    description: 'Esta funcionalidad estará disponible pronto.',
    icon: <Zap size={64} color="#FFB800" />,
    ...props
  })
};

export default EmptyState;