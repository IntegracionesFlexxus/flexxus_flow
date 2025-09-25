import React from 'react';
import { Card, CardContent, Typography, Box, Chip } from '@mui/material';
import { TrendingUp, TrendingDown, TrendingFlat } from '@mui/icons-material';

interface MetricsCardProps {
  title: string;
  value: number | string;
  unit?: string;
  change?: number;
  trend?: 'up' | 'down' | 'stable';
  color?: 'primary' | 'secondary' | 'success' | 'warning' | 'error';
  onClick?: () => void;
}

export const MetricsCard: React.FC<MetricsCardProps> = ({
  title,
  value,
  unit,
  change,
  trend = 'stable',
  color = 'primary',
  onClick
}) => {
  const getTrendIcon = () => {
    switch (trend) {
      case 'up':
        return <TrendingUp fontSize="small" />;
      case 'down':
        return <TrendingDown fontSize="small" />;
      default:
        return <TrendingFlat fontSize="small" />;
    }
  };

  const getTrendColor = () => {
    if (trend === 'up') return 'success';
    if (trend === 'down') return 'error';
    return 'default';
  };

  const formatValue = () => {
    if (typeof value === 'number') {
      if (unit === '$' || unit === 'USD') {
        return `$${value.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;
      }
      if (unit === '%') {
        return `${value.toFixed(1)}%`;
      }
      return value.toLocaleString();
    }
    return value;
  };

  return (
    <Card
      sx={{
        height: '100%',
        cursor: onClick ? 'pointer' : 'default',
        transition: 'all 0.3s ease',
        '&:hover': onClick ? {
          transform: 'translateY(-2px)',
          boxShadow: 3
        } : {}
      }}
      onClick={onClick}
    >
      <CardContent>
        <Typography variant="subtitle2" color="textSecondary" gutterBottom>
          {title}
        </Typography>

        <Box display="flex" alignItems="baseline" mb={1}>
          <Typography variant="h4" component="div" color={`${color}.main`}>
            {formatValue()}
          </Typography>
          {unit && !['$', 'USD', '%'].includes(unit) && (
            <Typography variant="subtitle1" color="textSecondary" ml={1}>
              {unit}
            </Typography>
          )}
        </Box>

        {change !== undefined && (
          <Chip
            icon={getTrendIcon()}
            label={`${change > 0 ? '+' : ''}${change.toFixed(1)}%`}
            size="small"
            color={getTrendColor()}
            variant="outlined"
          />
        )}
      </CardContent>
    </Card>
  );
};