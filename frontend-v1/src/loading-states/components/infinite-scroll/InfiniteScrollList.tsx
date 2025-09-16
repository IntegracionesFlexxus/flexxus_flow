/**
 * InfiniteScrollList Component
 * Loading States - Lista con scroll infinito
 */

import React, { useRef, useEffect } from 'react';
import {
  List,
  ListItem,
  Box,
  CircularProgress,
  Typography,
  Button,
  Alert,
  Paper
} from '@mui/material';
import { Refresh, ExpandMore } from '@mui/icons-material';
import { ListItemSkeleton } from '@/loading-states/components/skeletons/ListItemSkeleton';

interface InfiniteScrollListProps<T> {
  items: T[];
  renderItem: (item: T, index: number) => React.ReactNode;
  loading?: boolean;
  loadingMore?: boolean;
  hasMore?: boolean;
  error?: Error | null;
  onLoadMore?: () => void;
  onRefresh?: () => void;
  getItemKey?: (item: T, index: number) => string | number;
  emptyMessage?: string;
  endMessage?: string;
  threshold?: number;
  skeletonCount?: number;
  showRefreshButton?: boolean;
  manualLoadMore?: boolean;
  elevation?: number;
  className?: string;
}

export function InfiniteScrollList<T>({
  items,
  renderItem,
  loading = false,
  loadingMore = false,
  hasMore = false,
  error = null,
  onLoadMore,
  onRefresh,
  getItemKey = (_, index) => index,
  emptyMessage = 'No items found',
  endMessage = 'No more items to load',
  threshold = 100,
  skeletonCount = 5,
  showRefreshButton = false,
  manualLoadMore = false,
  elevation = 0,
  className
}: InfiniteScrollListProps<T>) {
  const sentinelRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Setup intersection observer para auto-load
  useEffect(() => {
    if (manualLoadMore || !onLoadMore || !hasMore || loadingMore) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          onLoadMore();
        }
      },
      {
        root: containerRef.current,
        rootMargin: `${threshold}px`,
        threshold: 0.1
      }
    );

    const sentinel = sentinelRef.current;
    if (sentinel) {
      observer.observe(sentinel);
    }

    return () => {
      if (sentinel) {
        observer.unobserve(sentinel);
      }
    };
  }, [hasMore, loadingMore, onLoadMore, threshold, manualLoadMore]);

  // Loading inicial
  if (loading && items.length === 0) {
    return (
      <ListItemSkeleton
        count={skeletonCount}
        showAvatar
        showSecondaryText
        elevation={elevation}
        className={className}
      />
    );
  }

  // Empty state
  if (!loading && !error && items.length === 0) {
    return (
      <Paper elevation={elevation} className={className}>
        <Box
          sx={{
            p: 4,
            textAlign: 'center',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: 2
          }}
        >
          <Typography color="text.secondary">
            {emptyMessage}
          </Typography>
          {showRefreshButton && onRefresh && (
            <Button
              startIcon={<Refresh />}
              onClick={onRefresh}
              variant="outlined"
            >
              Refresh
            </Button>
          )}
        </Box>
      </Paper>
    );
  }

  const ListContent = () => (
    <>
      <List>
        {items.map((item, index) => (
          <ListItem key={getItemKey(item, index)} divider={index < items.length - 1}>
            {renderItem(item, index)}
          </ListItem>
        ))}
      </List>

      {/* Error state */}
      {error && (
        <Alert
          severity="error"
          sx={{ m: 2 }}
          action={
            onLoadMore && (
              <Button size="small" onClick={onLoadMore}>
                Retry
              </Button>
            )
          }
        >
          {error.message || 'Failed to load items'}
        </Alert>
      )}

      {/* Loading more indicator */}
      {loadingMore && (
        <Box sx={{ p: 2, display: 'flex', justifyContent: 'center' }}>
          <CircularProgress size={24} />
        </Box>
      )}

      {/* Manual load more button */}
      {manualLoadMore && hasMore && !loadingMore && (
        <Box sx={{ p: 2, textAlign: 'center' }}>
          <Button
            variant="outlined"
            startIcon={<ExpandMore />}
            onClick={onLoadMore}
            disabled={loadingMore}
          >
            Load More
          </Button>
        </Box>
      )}

      {/* End message */}
      {!hasMore && items.length > 0 && (
        <Box sx={{ p: 2, textAlign: 'center' }}>
          <Typography variant="body2" color="text.secondary">
            {endMessage}
          </Typography>
        </Box>
      )}

      {/* Sentinel for auto-loading */}
      {!manualLoadMore && hasMore && (
        <div ref={sentinelRef} style={{ height: 1 }} />
      )}
    </>
  );

  return (
    <Box ref={containerRef} className={className}>
      {elevation > 0 ? (
        <Paper elevation={elevation}>
          <ListContent />
        </Paper>
      ) : (
        <ListContent />
      )}
    </Box>
  );
}

export default InfiniteScrollList;