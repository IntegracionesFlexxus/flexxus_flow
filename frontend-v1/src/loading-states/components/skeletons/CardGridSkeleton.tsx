/**
 * CardGridSkeleton Component
 * Loading States - Skeleton para grids de cards
 */

import React from 'react';
import {
  Grid,
  Card,
  CardContent,
  CardActions,
  Skeleton,
  Box,
  useTheme,
  useMediaQuery
} from '@mui/material';

interface CardGridSkeletonProps {
  count?: number;
  columns?: { xs?: number; sm?: number; md?: number; lg?: number };
  showImage?: boolean;
  showActions?: boolean;
  imageHeight?: number;
  className?: string;
}

export const CardGridSkeleton: React.FC<CardGridSkeletonProps> = ({
  count = 6,
  columns = { xs: 12, sm: 6, md: 4, lg: 3 },
  showImage = true,
  showActions = true,
  imageHeight = 140,
  className
}) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  const CardItemSkeleton = () => (
    <Card sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      {showImage && (
        <Skeleton 
          variant="rectangular" 
          height={imageHeight}
          animation="wave"
        />
      )}
      <CardContent sx={{ flexGrow: 1 }}>
        <Skeleton variant="text" width="60%" height={32} sx={{ mb: 1 }} />
        <Skeleton variant="text" width="100%" />
        <Skeleton variant="text" width="100%" />
        <Skeleton variant="text" width="80%" />
        
        <Box sx={{ mt: 2, display: 'flex', gap: 1 }}>
          <Skeleton variant="rounded" width={60} height={20} />
          <Skeleton variant="rounded" width={60} height={20} />
        </Box>
      </CardContent>
      {showActions && (
        <CardActions sx={{ px: 2, pb: 2 }}>
          <Skeleton variant="rounded" width={80} height={36} />
          <Box sx={{ flexGrow: 1 }} />
          <Skeleton variant="circular" width={36} height={36} />
        </CardActions>
      )}
    </Card>
  );

  return (
    <Grid container spacing={isMobile ? 2 : 3} className={className}>
      {Array.from({ length: count }).map((_, index) => (
        <Grid item key={`card-skeleton-${index}`} {...columns}>
          <CardItemSkeleton />
        </Grid>
      ))}
    </Grid>
  );
};

export default CardGridSkeleton;