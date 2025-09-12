/**
 * MultiStepProgress Component
 * Loading States - Progress para procesos multi-paso
 */

import React from 'react';
import {
  Box,
  Stepper,
  Step,
  StepLabel,
  StepContent,
  LinearProgress,
  Typography,
  Paper,
  Chip,
  CircularProgress,
  Alert,
  useTheme,
  StepConnector,
  stepConnectorClasses,
  styled
} from '@mui/material';
import {
  CheckCircle,
  Error,
  RadioButtonUnchecked,
  HourglassEmpty
} from '@mui/icons-material';

export interface ProcessStep {
  id: string;
  label: string;
  description?: string;
  status: 'pending' | 'processing' | 'completed' | 'error' | 'skipped';
  progress?: number;
  error?: string;
  startTime?: Date;
  endTime?: Date;
  details?: string[];
}

interface MultiStepProgressProps {
  steps: ProcessStep[];
  orientation?: 'horizontal' | 'vertical';
  showProgress?: boolean;
  showTime?: boolean;
  showDetails?: boolean;
  alternativeLabel?: boolean;
  className?: string;
}

const CustomConnector = styled(StepConnector)(({ theme }) => ({
  [`&.${stepConnectorClasses.alternativeLabel}`]: {
    top: 22,
  },
  [`&.${stepConnectorClasses.active}`]: {
    [`& .${stepConnectorClasses.line}`]: {
      backgroundImage: `linear-gradient(95deg, ${theme.palette.primary.main} 0%, ${theme.palette.primary.light} 50%, ${theme.palette.primary.main} 100%)`,
      animation: 'shimmer 2s infinite'
    },
  },
  [`&.${stepConnectorClasses.completed}`]: {
    [`& .${stepConnectorClasses.line}`]: {
      backgroundImage: `linear-gradient(95deg, ${theme.palette.success.main} 0%, ${theme.palette.success.light} 100%)`,
    },
  },
  [`& .${stepConnectorClasses.line}`]: {
    height: 3,
    border: 0,
    backgroundColor: theme.palette.mode === 'dark' ? theme.palette.grey[800] : '#eaeaf0',
    borderRadius: 1,
  },
  '@keyframes shimmer': {
    '0%': { backgroundPosition: '-200px 0' },
    '100%': { backgroundPosition: '200px 0' }
  }
}));

export const MultiStepProgress: React.FC<MultiStepProgressProps> = ({
  steps,
  orientation = 'vertical',
  showProgress = true,
  showTime = true,
  showDetails = true,
  alternativeLabel = false,
  className
}) => {
  const theme = useTheme();
  
  const activeStep = steps.findIndex(step => 
    step.status === 'processing' || 
    (step.status === 'pending' && steps.findIndex(s => s.status === 'processing') === -1)
  );

  const completedSteps = steps.filter(s => s.status === 'completed').length;
  const totalProgress = (completedSteps / steps.length) * 100;

  const getStepIcon = (step: ProcessStep) => {
    switch (step.status) {
      case 'completed':
        return <CheckCircle color="success" />;
      case 'error':
        return <Error color="error" />;
      case 'processing':
        return <CircularProgress size={20} thickness={4} />;
      case 'skipped':
        return <RadioButtonUnchecked color="disabled" />;
      default:
        return <HourglassEmpty color="action" />;
    }
  };

  const formatDuration = (start?: Date, end?: Date) => {
    if (!start) return null;
    const endTime = end || new Date();
    const duration = endTime.getTime() - start.getTime();
    const seconds = Math.floor(duration / 1000);
    
    if (seconds < 60) return `${seconds}s`;
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ${seconds % 60}s`;
    return `${Math.floor(seconds / 3600)}h ${Math.floor((seconds % 3600) / 60)}m`;
  };

  const getStatusChip = (step: ProcessStep) => {
    const statusConfig = {
      completed: { label: 'Completed', color: 'success' as const },
      error: { label: 'Failed', color: 'error' as const },
      processing: { label: 'Processing', color: 'primary' as const },
      skipped: { label: 'Skipped', color: 'default' as const },
      pending: { label: 'Pending', color: 'default' as const }
    };

    const config = statusConfig[step.status];
    const duration = formatDuration(step.startTime, step.endTime);

    return (
      <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
        <Chip
          label={config.label}
          size="small"
          color={config.color}
          variant={step.status === 'processing' ? 'filled' : 'outlined'}
        />
        {showTime && duration && (
          <Typography variant="caption" color="text.secondary">
            {duration}
          </Typography>
        )}
      </Box>
    );
  };

  return (
    <Paper elevation={1} sx={{ p: 3 }} className={className}>
      {/* Overall Progress */}
      {showProgress && (
        <Box sx={{ mb: 3 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
            <Typography variant="subtitle2" color="text.secondary">
              Overall Progress
            </Typography>
            <Typography variant="subtitle2" color="text.secondary">
              {completedSteps} of {steps.length} completed
            </Typography>
          </Box>
          <LinearProgress
            variant="determinate"
            value={totalProgress}
            sx={{ height: 8, borderRadius: 1 }}
          />
        </Box>
      )}

      {/* Steps */}
      <Stepper 
        activeStep={activeStep} 
        orientation={orientation}
        alternativeLabel={orientation === 'horizontal' && alternativeLabel}
        connector={<CustomConnector />}
      >
        {steps.map((step, index) => (
          <Step key={step.id} completed={step.status === 'completed'}>
            <StepLabel
              error={step.status === 'error'}
              StepIconComponent={() => getStepIcon(step)}
            >
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <Typography variant="subtitle2">
                  {step.label}
                </Typography>
                {getStatusChip(step)}
              </Box>
              {step.description && (
                <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                  {step.description}
                </Typography>
              )}
            </StepLabel>
            
            {orientation === 'vertical' && (
              <StepContent>
                {/* Step Progress */}
                {step.status === 'processing' && step.progress !== undefined && (
                  <Box sx={{ mb: 2 }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                      <Typography variant="caption" color="text.secondary">
                        Progress
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {Math.round(step.progress)}%
                      </Typography>
                    </Box>
                    <LinearProgress
                      variant="determinate"
                      value={step.progress}
                      sx={{ height: 4, borderRadius: 1 }}
                    />
                  </Box>
                )}

                {/* Error Message */}
                {step.status === 'error' && step.error && (
                  <Alert severity="error" sx={{ mb: 2 }}>
                    {step.error}
                  </Alert>
                )}

                {/* Details */}
                {showDetails && step.details && step.details.length > 0 && (
                  <Box sx={{ ml: 2 }}>
                    {step.details.map((detail, idx) => (
                      <Typography
                        key={idx}
                        variant="caption"
                        color="text.secondary"
                        sx={{ display: 'block', mb: 0.5 }}
                      >
                        • {detail}
                      </Typography>
                    ))}
                  </Box>
                )}
              </StepContent>
            )}
          </Step>
        ))}
      </Stepper>
    </Paper>
  );
};

export default MultiStepProgress;