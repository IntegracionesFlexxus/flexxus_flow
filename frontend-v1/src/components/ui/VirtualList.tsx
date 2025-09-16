import React, { useRef, useState, useEffect, useCallback } from 'react';
import { Box } from '@mui/material';

// Componente de lista virtual para optimizar listas largas - MVP Nivel 1
// TODO: En Nivel 2 usar react-window o react-virtualized

interface VirtualListProps<T> {
  items: T[];
  itemHeight: number | ((index: number) => number);
  renderItem: (item: T, index: number) => React.ReactNode;
  height?: number | string;
  overscan?: number; // Número de items extra a renderizar fuera de viewport
  onScroll?: (scrollTop: number) => void;
  className?: string;
  estimatedItemSize?: number; // Para items de altura variable
}

export function VirtualList<T>({
  items,
  itemHeight,
  renderItem,
  height = 400,
  overscan = 3,
  onScroll,
  className,
  estimatedItemSize = 50,
}: VirtualListProps<T>) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [scrollTop, setScrollTop] = useState(0);
  const [containerHeight, setContainerHeight] = useState(
    typeof height === 'number' ? height : 400
  );

  // Calcular altura del item
  const getItemHeight = useCallback(
    (index: number) => {
      return typeof itemHeight === 'function' ? itemHeight(index) : itemHeight;
    },
    [itemHeight]
  );

  // Calcular altura total
  const getTotalHeight = useCallback(() => {
    if (typeof itemHeight === 'number') {
      return items.length * itemHeight;
    }
    
    // Para alturas variables, calcular suma
    let total = 0;
    for (let i = 0; i < items.length; i++) {
      total += getItemHeight(i);
    }
    return total;
  }, [items.length, itemHeight, getItemHeight]);

  // Calcular items visibles
  const getVisibleRange = useCallback(() => {
    const totalHeight = getTotalHeight();
    
    if (typeof itemHeight === 'number') {
      // Altura fija - cálculo simple
      const startIndex = Math.max(0, Math.floor(scrollTop / itemHeight) - overscan);
      const endIndex = Math.min(
        items.length - 1,
        Math.ceil((scrollTop + containerHeight) / itemHeight) + overscan
      );
      
      return { startIndex, endIndex };
    } else {
      // Altura variable - búsqueda lineal (simplificado para MVP)
      let accumulatedHeight = 0;
      let startIndex = 0;
      let endIndex = items.length - 1;
      
      // Encontrar startIndex
      for (let i = 0; i < items.length; i++) {
        const height = getItemHeight(i);
        if (accumulatedHeight + height > scrollTop - overscan * estimatedItemSize) {
          startIndex = i;
          break;
        }
        accumulatedHeight += height;
      }
      
      // Encontrar endIndex
      accumulatedHeight = 0;
      for (let i = startIndex; i < items.length; i++) {
        if (accumulatedHeight > containerHeight + overscan * estimatedItemSize) {
          endIndex = i;
          break;
        }
        accumulatedHeight += getItemHeight(i);
      }
      
      return { startIndex, endIndex };
    }
  }, [scrollTop, containerHeight, items.length, itemHeight, overscan, getItemHeight, getTotalHeight, estimatedItemSize]);

  // Calcular offset para items visibles
  const getItemOffset = useCallback(
    (index: number) => {
      if (typeof itemHeight === 'number') {
        return index * itemHeight;
      }
      
      // Altura variable - calcular suma hasta index
      let offset = 0;
      for (let i = 0; i < index; i++) {
        offset += getItemHeight(i);
      }
      return offset;
    },
    [itemHeight, getItemHeight]
  );

  // Handle scroll
  const handleScroll = useCallback(
    (e: React.UIEvent<HTMLDivElement>) => {
      const newScrollTop = e.currentTarget.scrollTop;
      setScrollTop(newScrollTop);
      onScroll?.(newScrollTop);
    },
    [onScroll]
  );

  // Update container height on resize
  useEffect(() => {
    const updateHeight = () => {
      if (containerRef.current && typeof height === 'string') {
        setContainerHeight(containerRef.current.clientHeight);
      }
    };

    updateHeight();
    window.addEventListener('resize', updateHeight);
    
    return () => {
      window.removeEventListener('resize', updateHeight);
    };
  }, [height]);

  const { startIndex, endIndex } = getVisibleRange();
  const totalHeight = getTotalHeight();
  const visibleItems = items.slice(startIndex, endIndex + 1);

  return (
    <Box
      ref={containerRef}
      className={className}
      sx={{
        height,
        overflow: 'auto',
        position: 'relative',
      }}
      onScroll={handleScroll}
    >
      {/* Spacer para mantener scroll height */}
      <Box
        sx={{
          height: totalHeight,
          position: 'relative',
        }}
      >
        {/* Items visibles */}
        {visibleItems.map((item, index) => {
          const actualIndex = startIndex + index;
          const itemOffset = getItemOffset(actualIndex);
          const itemHeightValue = getItemHeight(actualIndex);

          return (
            <Box
              key={actualIndex}
              sx={{
                position: 'absolute',
                top: itemOffset,
                left: 0,
                right: 0,
                height: itemHeightValue,
              }}
            >
              {renderItem(item, actualIndex)}
            </Box>
          );
        })}
      </Box>
    </Box>
  );
}

// Hook para usar con listas virtuales
export function useVirtualList<T>(
  items: T[],
  options: Omit<VirtualListProps<T>, 'items' | 'renderItem'>
) {
  const [scrollPosition, setScrollPosition] = useState(0);
  const [isScrolling, setIsScrolling] = useState(false);
  const scrollTimeout = useRef<NodeJS.Timeout>();

  const handleScroll = useCallback((scrollTop: number) => {
    setScrollPosition(scrollTop);
    setIsScrolling(true);

    // Debounce para detectar fin de scroll
    clearTimeout(scrollTimeout.current);
    scrollTimeout.current = setTimeout(() => {
      setIsScrolling(false);
    }, 150);
  }, []);

  useEffect(() => {
    return () => {
      if (scrollTimeout.current) {
        clearTimeout(scrollTimeout.current);
      }
    };
  }, []);

  return {
    scrollPosition,
    isScrolling,
    handleScroll,
    listProps: {
      ...options,
      onScroll: handleScroll,
    },
  };
}

// Componente simplificado para listas con altura fija
interface SimpleVirtualListProps<T> {
  items: T[];
  itemHeight: number;
  renderItem: (item: T, index: number) => React.ReactNode;
  height?: number;
  className?: string;
}

export function SimpleVirtualList<T>({
  items,
  itemHeight,
  renderItem,
  height = 400,
  className,
}: SimpleVirtualListProps<T>) {
  return (
    <VirtualList
      items={items}
      itemHeight={itemHeight}
      renderItem={renderItem}
      height={height}
      className={className}
      overscan={3}
    />
  );
}

export default VirtualList;