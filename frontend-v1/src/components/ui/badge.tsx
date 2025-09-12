import React from 'react';
import { Chip, ChipProps } from '@mui/material';

export interface BadgeProps extends Omit<ChipProps, 'variant'> {
  variant?: 'default' | 'secondary' | 'destructive' | 'outline';
  children?: React.ReactNode;
}

export const Badge: React.FC<BadgeProps> = ({
  variant = 'default',
  children,
  label,
  ...props
}) => {
  const getColor = () => {
    switch (variant) {
      case 'secondary':
        return 'secondary';
      case 'destructive':
        return 'error';
      case 'outline':
        return 'default';
      default:
        return 'primary';
    }
  };

  const getVariant = () => {
    return variant === 'outline' ? 'outlined' : 'filled';
  };

  return (
    <Chip
      label={label || children}
      color={getColor()}
      variant={getVariant()}
      size="small"
      {...props}
    />
  );
};

export default Badge;