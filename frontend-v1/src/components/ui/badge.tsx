import React from 'react';
import { Chip, ChipProps } from '@mui/material';

export interface BadgeProps {
  variant?: 'default' | 'secondary' | 'destructive' | 'outline';
  children?: React.ReactNode;
  label?: React.ReactNode;
  size?: ChipProps['size'];
  className?: string;
  onClick?: () => void;
  onDelete?: () => void;
  icon?: React.ReactElement;
  deleteIcon?: React.ReactElement;
  sx?: ChipProps['sx'];
}

export const Badge: React.FC<BadgeProps> = ({
  variant = 'default',
  children,
  label,
  size = 'small',
  className,
  onClick,
  onDelete,
  icon,
  deleteIcon,
  sx
}) => {
  const getColor = (): ChipProps['color'] => {
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

  const getVariant = (): ChipProps['variant'] => {
    return variant === 'outline' ? 'outlined' : 'filled';
  };

  return (
    <Chip
      label={label || children}
      color={getColor()}
      variant={getVariant()}
      size={size}
      className={className}
      onClick={onClick}
      onDelete={onDelete}
      icon={icon}
      deleteIcon={deleteIcon}
      sx={sx}
    />
  );
};

export default Badge;