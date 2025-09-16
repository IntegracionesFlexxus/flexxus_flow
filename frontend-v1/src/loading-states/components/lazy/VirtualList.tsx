/**
 * VirtualList Component
 * Loading States - Lista virtualizada para grandes datasets
 */

import React, { useRef, useState, useEffect, useCallback, CSSProperties } from 'react';
import { Box, Typography } from '@mui/material';
import { useIntersectionObserver } from '@/utils/performance';

interface VirtualListProps<T> {
  items: T[];
  itemHeight: number | ((index: number) => number);
  renderItem: (item: T, index: number) => React.ReactNode;
  height: number | string;
  overscan?: number;
  getItemKey?: (item: T, index: number) => string | number;
  onScroll?: (scrollTop: number) => void;
  emptyMessage?: string;
  className?: string;
}

export function VirtualList<T>({
  items,
  itemHeight,
  renderItem,
  height,
  overscan = 3,
  getItemKey = (_, index) => index,
  onScroll,
  emptyMessage = 'No items to display',
  className
}: VirtualListProps<T>) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [scrollTop, setScrollTop] = useState(0);
  const [containerHeight, setContainerHeight] = useState(
    typeof height === 'number' ? height : 0
  );

  // Calcular altura de items
  const getItemOffset = useCallback((index: number) => {
    if (typeof itemHeight === 'number') {
      return index * itemHeight;
    }
    let offset = 0;
    for (let i = 0; i < index; i++) {
      offset += itemHeight(i);
    }
    return offset;
  }, [itemHeight]);

  const getItemHeight = useCallback((index: number) => {
    return typeof itemHeight === 'number' ? itemHeight : itemHeight(index);
  }, [itemHeight]);

  // Calcular altura total
  const totalHeight = useCallback(() => {
    if (typeof itemHeight === 'number') {
      return items.length * itemHeight;
    }
    return items.reduce((acc, _, index) => acc + itemHeight(index), 0);
  }, [items, itemHeight]);

  // Calcular items visibles
  const getVisibleRange = useCallback(() => {
    const total = totalHeight();
    let startIndex = 0;
    let endIndex = items.length - 1;
    let accHeight = 0;

    // Encontrar primer item visible
    for (let i = 0; i < items.length; i++) {
      const offset = getItemOffset(i);
      if (offset + getItemHeight(i) > scrollTop) {
        startIndex = Math.max(0, i - overscan);
        break;
      }
    }

    // Encontrar último item visible
    for (let i = startIndex; i < items.length; i++) {
      if (accHeight > containerHeight + scrollTop) {
        endIndex = Math.min(items.length - 1, i + overscan);
        break;
      }
      accHeight += getItemHeight(i);
    }

    return { startIndex, endIndex };
  }, [
    items.length,
    scrollTop,
    containerHeight,
    overscan,
    getItemOffset,
    getItemHeight,
    totalHeight
  ]);

  // Actualizar altura del contenedor
  useEffect(() => {
    if (containerRef.current && typeof height === 'string') {
      const rect = containerRef.current.getBoundingClientRect();
      setContainerHeight(rect.height);
    }
  }, [height]);

  // Manejar scroll
  const handleScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
    const newScrollTop = e.currentTarget.scrollTop;
    setScrollTop(newScrollTop);
    onScroll?.(newScrollTop);
  }, [onScroll]);

  // Renderizar items visibles
  const { startIndex, endIndex } = getVisibleRange();
  const visibleItems = items.slice(startIndex, endIndex + 1);
  const offsetY = getItemOffset(startIndex);

  if (items.length === 0) {
    return (
      <Box
        sx={{
          height,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
        }}
        className={className}
      >
        <Typography color="text.secondary">
          {emptyMessage}
        </Typography>
      </Box>
    );
  }

  return (
    <Box
      ref={containerRef}
      sx={{
        height,
        overflow: 'auto',
        position: 'relative'
      }}
      onScroll={handleScroll}
      className={className}
    >
      {/* Spacer para mantener scroll */}
      <Box
        sx={{
          height: totalHeight(),
          position: 'relative'
        }}
      >
        {/* Items visibles */}
        <Box
          sx={{
            transform: `translateY(${offsetY}px)`,
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0
          }}
        >
          {visibleItems.map((item, index) => {
            const actualIndex = startIndex + index;
            const itemKey = getItemKey(item, actualIndex);
            const height = getItemHeight(actualIndex);

            return (
              <Box
                key={itemKey}
                sx={{
                  height,
                  overflow: 'hidden'
                }}
              >
                {renderItem(item, actualIndex)}
              </Box>
            );
          })}
        </Box>
      </Box>
    </Box>
  );
}

export default VirtualList;