import React from 'react';
import {
  Card,
  CardContent,
  CardActions,
  Typography,
  Box,
  LinearProgress,
  Chip,
  IconButton,
  Menu,
  MenuItem,
  useTheme,
  alpha
} from '@mui/material';
import {
  MoreVert,
  TrendingUp,
  TrendingDown,
  TrendingFlat,
  Timeline,
  Notifications,
  Settings
} from '@mui/icons-material';

interface KpiAlert {
  id: number;
  type: 'warning' | 'critical' | 'info';
  message: string;
  threshold_value: number;
  triggered_at: string;
}

interface KpiCardProps {
  id: number;
  name: string;
  description?: string;
  currentValue: number;
  targetValue?: number;
  unit: string;
  format: 'number' | 'percentage' | 'currency' | 'duration';
  trend?: {
    direction: 'up' | 'down' | 'stable';
    percentage: number;
    period: string;
  };
  alerts?: KpiAlert[];
  color?: 'primary' | 'secondary' | 'success' | 'warning' | 'error' | 'info';
  size?: 'small' | 'medium' | 'large';
  onViewDetails?: (kpiId: number) => void;
  onViewTrends?: (kpiId: number) => void;
  onManageAlerts?: (kpiId: number) => void;
  onConfigure?: (kpiId: number) => void;
}

export const KpiCard: React.FC<KpiCardProps> = ({
  id,
  name,
  description,
  currentValue,
  targetValue,
  unit,
  format,
  trend,
  alerts = [],
  color = 'primary',
  size = 'medium',
  onViewDetails,
  onViewTrends,
  onManageAlerts,
  onConfigure
}) => {
  const theme = useTheme();
  const [anchorEl, setAnchorEl] = React.useState<null | HTMLElement>(null);
  const open = Boolean(anchorEl);

  const handleClick = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  const formatValue = (value: number) => {
    switch (format) {
      case 'currency':
        return new Intl.NumberFormat('en-US', {
          style: 'currency',
          currency: 'USD',
          minimumFractionDigits: 0,
          maximumFractionDigits: 2
        }).format(value);
      case 'percentage':
        return `${value.toFixed(1)}%`;
      case 'duration':
        return `${Math.round(value)} ${unit}`;
      case 'number':
      default:
        return value.toLocaleString();
    }
  };

  const getProgressValue = () => {
    if (!targetValue) return 0;
    return Math.min((currentValue / targetValue) * 100, 100);
  };

  const getTrendIcon = () => {
    if (!trend) return null;
    switch (trend.direction) {
      case 'up':
        return <TrendingUp fontSize="small" color="success" />;
      case 'down':
        return <TrendingDown fontSize="small" color="error" />;
      default:
        return <TrendingFlat fontSize="small" color="disabled" />;
    }
  };

  const getActiveAlerts = () => {
    return alerts.filter(alert => {
      const alertTime = new Date(alert.triggered_at);
      const now = new Date();
      const hoursDiff = (now.getTime() - alertTime.getTime()) / (1000 * 60 * 60);
      return hoursDiff < 24; // Active if triggered in last 24 hours
    });
  };

  const activeAlerts = getActiveAlerts();
  const hasAlerts = activeAlerts.length > 0;

  const cardHeight = {
    small: 180,
    medium: 220,
    large: 280
  }[size];

  return (
    <Card
      sx={{
        height: cardHeight,
        position: 'relative',
        cursor: onViewDetails ? 'pointer' : 'default',
        transition: 'all 0.3s ease',
        '&:hover': onViewDetails ? {
          transform: 'translateY(-2px)',
          boxShadow: theme.shadows[8]
        } : {},
        ...(hasAlerts && {
          border: `2px solid ${theme.palette.warning.main}`,
          backgroundColor: alpha(theme.palette.warning.main, 0.05)
        })
      }}
      onClick={() => onViewDetails?.(id)}
    >
      {hasAlerts && (
        <Box
          position="absolute"
          top={8}
          right={8}
          zIndex={1}
        >
          <Chip
            icon={<Notifications />}
            label={activeAlerts.length}
            size="small"
            color="warning"
            variant="filled"
          />
        </Box>
      )}

      <CardContent sx={{ pb: 1 }}>
        <Box display="flex" justifyContent="space-between" alignItems="flex-start" mb={1}>
          <Typography variant="h6" component="div" sx={{ flexGrow: 1, pr: 1 }}>
            {name}
          </Typography>
          <IconButton
            size="small"
            onClick={(e) => {
              e.stopPropagation();
              handleClick(e);
            }}
          >
            <MoreVert />
          </IconButton>
        </Box>

        {description && (
          <Typography variant="body2" color="textSecondary" gutterBottom>
            {description}
          </Typography>
        )}

        <Box mt={2} mb={2}>
          <Typography variant="h3" component="div" color={`${color}.main`}>
            {formatValue(currentValue)}
          </Typography>
          {unit && !['$', 'USD', '%'].includes(unit) && (
            <Typography variant="subtitle2" color="textSecondary">
              {unit}
            </Typography>
          )}
        </Box>

        {targetValue && (
          <Box mb={2}>
            <Box display="flex" justifyContent="space-between" mb={1}>
              <Typography variant="caption" color="textSecondary">
                Target: {formatValue(targetValue)}
              </Typography>
              <Typography variant="caption" color="textSecondary">
                {getProgressValue().toFixed(1)}%
              </Typography>
            </Box>
            <LinearProgress
              variant="determinate"
              value={getProgressValue()}
              color={color}
              sx={{ height: 8, borderRadius: 4 }}
            />
          </Box>
        )}

        {trend && (
          <Box display="flex" alignItems="center" mt={1}>
            {getTrendIcon()}
            <Typography
              variant="caption"
              color={trend.direction === 'up' ? 'success.main' :
                     trend.direction === 'down' ? 'error.main' : 'textSecondary'}
              ml={0.5}
            >
              {trend.percentage > 0 ? '+' : ''}{trend.percentage.toFixed(1)}% vs {trend.period}
            </Typography>
          </Box>
        )}
      </CardContent>

      <CardActions sx={{ pt: 0, justifyContent: 'flex-end' }}>
        {onViewTrends && (
          <IconButton
            size="small"
            onClick={(e) => {
              e.stopPropagation();
              onViewTrends(id);
            }}
            title="View Trends"
          >
            <Timeline />
          </IconButton>
        )}
      </CardActions>

      <Menu
        anchorEl={anchorEl}
        open={open}
        onClose={handleClose}
        onClick={(e) => e.stopPropagation()}
      >
        <MenuItem onClick={() => { onViewDetails?.(id); handleClose(); }}>
          View Details
        </MenuItem>
        <MenuItem onClick={() => { onViewTrends?.(id); handleClose(); }}>
          View Trends
        </MenuItem>
        <MenuItem onClick={() => { onManageAlerts?.(id); handleClose(); }}>
          Manage Alerts
        </MenuItem>
        <MenuItem onClick={() => { onConfigure?.(id); handleClose(); }}>
          <Settings fontSize="small" sx={{ mr: 1 }} />
          Configure
        </MenuItem>
      </Menu>
    </Card>
  );
};