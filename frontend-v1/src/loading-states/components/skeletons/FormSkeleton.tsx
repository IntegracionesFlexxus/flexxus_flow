/**
 * FormSkeleton Component
 * Loading States - Skeleton para formularios
 */

import React from 'react';
import {
  Box,
  Skeleton,
  Grid,
  Paper,
  useTheme
} from '@mui/material';

interface FormFieldConfig {
  type: 'text' | 'select' | 'checkbox' | 'radio' | 'switch' | 'date' | 'textarea';
  width?: 'full' | 'half' | 'third' | 'quarter';
  label?: boolean;
}

interface FormSkeletonProps {
  fields?: FormFieldConfig[] | number;
  showTitle?: boolean;
  showActions?: boolean;
  columns?: 1 | 2 | 3;
  spacing?: number;
  elevation?: number;
  className?: string;
}

export const FormSkeleton: React.FC<FormSkeletonProps> = ({
  fields = 6,
  showTitle = true,
  showActions = true,
  columns = 1,
  spacing = 3,
  elevation = 1,
  className
}) => {
  const theme = useTheme();

  // Generar configuración de campos si se pasa un número
  const fieldConfigs: FormFieldConfig[] = typeof fields === 'number'
    ? Array.from({ length: fields }).map((_, i) => ({
        type: i % 3 === 0 ? 'select' : 'text',
        width: 'full',
        label: true
      }))
    : fields;

  const getFieldWidth = (width?: string) => {
    switch (width) {
      case 'half': return 6;
      case 'third': return 4;
      case 'quarter': return 3;
      default: return 12;
    }
  };

  const renderFieldSkeleton = (field: FormFieldConfig, index: number) => {
    const gridWidth = columns > 1 ? getFieldWidth(field.width) : 12;

    return (
      <Grid item xs={12} sm={gridWidth} key={`field-${index}`}>
        <Box>
          {field.label !== false && (
            <Skeleton 
              variant="text" 
              width={100} 
              height={20} 
              sx={{ mb: 1 }}
            />
          )}
          {field.type === 'textarea' ? (
            <Skeleton 
              variant="rounded" 
              width="100%" 
              height={100}
            />
          ) : field.type === 'checkbox' || field.type === 'switch' ? (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Skeleton 
                variant="rounded" 
                width={24} 
                height={24}
              />
              <Skeleton 
                variant="text" 
                width={120} 
                height={24}
              />
            </Box>
          ) : field.type === 'radio' ? (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
              {[1, 2, 3].map(i => (
                <Box key={i} sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Skeleton variant="circular" width={20} height={20} />
                  <Skeleton variant="text" width={80} height={24} />
                </Box>
              ))}
            </Box>
          ) : (
            <Skeleton 
              variant="rounded" 
              width="100%" 
              height={56}
            />
          )}
        </Box>
      </Grid>
    );
  };

  return (
    <Paper elevation={elevation} sx={{ p: 3 }} className={className}>
      {showTitle && (
        <Box sx={{ mb: 4 }}>
          <Skeleton variant="text" width={200} height={40} />
          <Skeleton variant="text" width="60%" height={20} sx={{ mt: 1 }} />
        </Box>
      )}

      <Grid container spacing={spacing}>
        {fieldConfigs.map((field, index) => renderFieldSkeleton(field, index))}
      </Grid>

      {showActions && (
        <Box sx={{ 
          mt: 4, 
          pt: 3, 
          borderTop: `1px solid ${theme.palette.divider}`,
          display: 'flex', 
          gap: 2, 
          justifyContent: 'flex-end' 
        }}>
          <Skeleton variant="rounded" width={100} height={40} />
          <Skeleton variant="rounded" width={120} height={40} />
        </Box>
      )}
    </Paper>
  );
};

export default FormSkeleton;