/**
 * ListItemSkeleton Component
 * Loading States - Skeleton para items de lista
 */

import React from 'react';
import {
  List,
  ListItem,
  ListItemAvatar,
  ListItemText,
  ListItemSecondaryAction,
  Skeleton,
  Box,
  Divider,
  Paper
} from '@mui/material';

interface ListItemSkeletonProps {
  count?: number;
  showAvatar?: boolean;
  showSecondaryText?: boolean;
  showActions?: boolean;
  showDivider?: boolean;
  dense?: boolean;
  elevation?: number;
  className?: string;
}

export const ListItemSkeleton: React.FC<ListItemSkeletonProps> = ({
  count = 5,
  showAvatar = true,
  showSecondaryText = true,
  showActions = false,
  showDivider = true,
  dense = false,
  elevation = 0,
  className
}) => {
  const items = Array.from({ length: count });

  const ListItemContent = ({ isLast }: { isLast: boolean }) => (
    <>
      <ListItem dense={dense}>
        {showAvatar && (
          <ListItemAvatar>
            <Skeleton 
              variant="circular" 
              width={40} 
              height={40}
            />
          </ListItemAvatar>
        )}
        <ListItemText
          primary={
            <Skeleton 
              variant="text" 
              width={`${60 + Math.random() * 30}%`}
              height={dense ? 20 : 24}
            />
          }
          secondary={
            showSecondaryText && (
              <Box sx={{ mt: 0.5 }}>
                <Skeleton 
                  variant="text" 
                  width={`${40 + Math.random() * 40}%`}
                  height={16}
                />
              </Box>
            )
          }
        />
        {showActions && (
          <ListItemSecondaryAction>
            <Box sx={{ display: 'flex', gap: 1 }}>
              <Skeleton variant="circular" width={32} height={32} />
              <Skeleton variant="circular" width={32} height={32} />
            </Box>
          </ListItemSecondaryAction>
        )}
      </ListItem>
      {showDivider && !isLast && (
        <Divider variant={showAvatar ? 'inset' : 'fullWidth'} component="li" />
      )}
    </>
  );

  const content = (
    <List className={className}>
      {items.map((_, index) => (
        <ListItemContent 
          key={`list-item-skeleton-${index}`}
          isLast={index === items.length - 1}
        />
      ))}
    </List>
  );

  return elevation > 0 ? (
    <Paper elevation={elevation}>
      {content}
    </Paper>
  ) : content;
};

export default ListItemSkeleton;