import React from 'react';
import {
  Card,
  CardContent,
  CardHeader,
  Box,
  Typography,
  LinearProgress,
  useTheme
} from '@mui/material';

interface ConversionFunnelProps {
  data: Array<{
    stage: string;
    count: number;
    conversion_rate?: number;
    percentage_of_total?: number;
  }>;
  title?: string;
}

export const ConversionFunnel: React.FC<ConversionFunnelProps> = ({
  data,
  title = 'Conversion Funnel'
}) => {
  const theme = useTheme();

  const maxCount = Math.max(...data.map(d => d.count));

  const getFunnelWidth = (count: number, index: number) => {
    // Create a funnel effect - each stage is slightly narrower
    const baseWidth = (count / maxCount) * 100;
    const funnelFactor = 100 - (index * 5); // Reduce width by 5% for each stage
    return Math.max(baseWidth * (funnelFactor / 100), 20); // Minimum 20% width
  };

  const getColor = (index: number) => {
    const colors = [
      theme.palette.primary.main,
      theme.palette.info.main,
      theme.palette.success.main,
      theme.palette.warning.main,
      theme.palette.secondary.main,
      theme.palette.error.main
    ];
    return colors[index % colors.length];
  };

  return (
    <Card sx={{ height: '100%' }}>
      <CardHeader
        title={title}
        titleTypographyProps={{ variant: 'h6' }}
      />
      <CardContent>
        <Box>
          {data.map((stage, index) => (
            <Box key={stage.stage} mb={3}>
              <Box display="flex" justifyContent="space-between" mb={1}>
                <Typography variant="body2" fontWeight="medium">
                  {stage.stage}
                </Typography>
                <Typography variant="body2" color="textSecondary">
                  {stage.count.toLocaleString()}
                </Typography>
              </Box>

              <Box position="relative">
                <LinearProgress
                  variant="determinate"
                  value={getFunnelWidth(stage.count, index)}
                  sx={{
                    height: 32,
                    borderRadius: 1,
                    backgroundColor: theme.palette.grey[200],
                    '& .MuiLinearProgress-bar': {
                      backgroundColor: getColor(index),
                      borderRadius: 1
                    }
                  }}
                />
                <Box
                  position="absolute"
                  top="50%"
                  left={8}
                  sx={{
                    transform: 'translateY(-50%)',
                    color: 'white',
                    fontWeight: 'medium',
                    fontSize: '0.875rem',
                    textShadow: '0 1px 2px rgba(0,0,0,0.3)'
                  }}
                >
                  {stage.percentage_of_total
                    ? `${stage.percentage_of_total.toFixed(1)}%`
                    : `${((stage.count / maxCount) * 100).toFixed(1)}%`}
                </Box>
              </Box>

              {stage.conversion_rate !== undefined && index < data.length - 1 && (
                <Box mt={1} display="flex" alignItems="center" justifyContent="center">
                  <Typography
                    variant="caption"
                    color="textSecondary"
                    sx={{
                      backgroundColor: theme.palette.grey[100],
                      px: 1,
                      py: 0.5,
                      borderRadius: 1
                    }}
                  >
                    {stage.conversion_rate.toFixed(1)}% conversion to next stage
                  </Typography>
                </Box>
              )}
            </Box>
          ))}
        </Box>
      </CardContent>
    </Card>
  );
};