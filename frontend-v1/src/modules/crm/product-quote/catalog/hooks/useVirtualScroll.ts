// useVirtualScroll Hook - Sprint 19 Frontend Implementation

import { useState, useEffect, useCallback, useMemo, useRef } from 'react';

interface VirtualScrollItem {
  index: number;
  offsetTop: number;
  height: number;
}

interface UseVirtualScrollOptions {
  itemHeight?: number | ((index: number) => number);
  overscan?: number;
  scrollingDelay?: number;
  getItemHeight?: (index: number, data?: any) => number;
}

interface UseVirtualScrollReturn {
  // Container props
  containerRef: React.RefObject<HTMLDivElement>;
  wrapperStyle: React.CSSProperties;
  innerStyle: React.CSSProperties;

  // Visible items
  visibleItems: VirtualScrollItem[];
  startIndex: number;
  endIndex: number;

  // Scroll state
  isScrolling: boolean;
  scrollTop: number;
  scrollDirection: 'up' | 'down' | null;

  // Actions
  scrollToIndex: (index: number, align?: 'start' | 'center' | 'end' | 'auto') => void;
  scrollToTop: () => void;
  scrollToBottom: () => void;

  // Measurements
  totalHeight: number;
  visibleHeight: number;
  measureItem: (index: number, height: number) => void;
  resetMeasurements: () => void;
}

export const useVirtualScroll = <T = any>(
  items: T[],
  options: UseVirtualScrollOptions = {}
): UseVirtualScrollReturn => {
  const {
    itemHeight = 50,
    overscan = 5,
    scrollingDelay = 150,
    getItemHeight
  } = options;

  // Refs
  const containerRef = useRef<HTMLDivElement>(null);
  const isScrollingTimeoutRef = useRef<NodeJS.Timeout>();

  // State
  const [scrollTop, setScrollTop] = useState(0);
  const [isScrolling, setIsScrolling] = useState(false);
  const [visibleHeight, setVisibleHeight] = useState(0);
  const [measuredHeights, setMeasuredHeights] = useState<Map<number, number>>(new Map());
  const [scrollDirection, setScrollDirection] = useState<'up' | 'down' | null>(null);

  // Calculate item height
  const getCalculatedItemHeight = useCallback((index: number): number => {
    if (getItemHeight) {
      return getItemHeight(index, items[index]);
    }

    if (measuredHeights.has(index)) {
      return measuredHeights.get(index)!;
    }

    if (typeof itemHeight === 'function') {
      return itemHeight(index);
    }

    return itemHeight;
  }, [itemHeight, getItemHeight, items, measuredHeights]);

  // Calculate total height and item positions
  const { totalHeight, itemPositions } = useMemo(() => {
    let totalHeight = 0;
    const itemPositions: VirtualScrollItem[] = [];

    for (let i = 0; i < items.length; i++) {
      const height = getCalculatedItemHeight(i);
      itemPositions.push({
        index: i,
        offsetTop: totalHeight,
        height
      });
      totalHeight += height;
    }

    return { totalHeight, itemPositions };
  }, [items.length, getCalculatedItemHeight]);

  // Calculate visible range
  const { startIndex, endIndex } = useMemo(() => {
    if (!visibleHeight || itemPositions.length === 0) {
      return { startIndex: 0, endIndex: 0 };
    }

    const viewportBottom = scrollTop + visibleHeight;

    // Find first visible item
    let startIndex = 0;
    for (let i = 0; i < itemPositions.length; i++) {
      if (itemPositions[i].offsetTop + itemPositions[i].height >= scrollTop) {
        startIndex = Math.max(0, i - overscan);
        break;
      }
    }

    // Find last visible item
    let endIndex = itemPositions.length - 1;
    for (let i = startIndex; i < itemPositions.length; i++) {
      if (itemPositions[i].offsetTop > viewportBottom) {
        endIndex = Math.min(itemPositions.length - 1, i + overscan);
        break;
      }
    }

    return { startIndex, endIndex };
  }, [scrollTop, visibleHeight, itemPositions, overscan]);

  // Get visible items
  const visibleItems = useMemo(() => {
    return itemPositions.slice(startIndex, endIndex + 1);
  }, [itemPositions, startIndex, endIndex]);

  // Handle scroll events
  const handleScroll = useCallback((event: Event) => {
    const target = event.target as HTMLDivElement;
    const newScrollTop = target.scrollTop;

    // Determine scroll direction
    if (newScrollTop > scrollTop) {
      setScrollDirection('down');
    } else if (newScrollTop < scrollTop) {
      setScrollDirection('up');
    }

    setScrollTop(newScrollTop);
    setIsScrolling(true);

    // Clear existing timeout
    if (isScrollingTimeoutRef.current) {
      clearTimeout(isScrollingTimeoutRef.current);
    }

    // Set scrolling to false after delay
    isScrollingTimeoutRef.current = setTimeout(() => {
      setIsScrolling(false);
      setScrollDirection(null);
    }, scrollingDelay);
  }, [scrollTop, scrollingDelay]);

  // Handle resize
  const handleResize = useCallback(() => {
    if (containerRef.current) {
      setVisibleHeight(containerRef.current.clientHeight);
    }
  }, []);

  // Setup event listeners
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    // Initial measurements
    setVisibleHeight(container.clientHeight);

    // Add event listeners
    container.addEventListener('scroll', handleScroll, { passive: true });
    window.addEventListener('resize', handleResize);

    return () => {
      container.removeEventListener('scroll', handleScroll);
      window.removeEventListener('resize', handleResize);

      if (isScrollingTimeoutRef.current) {
        clearTimeout(isScrollingTimeoutRef.current);
      }
    };
  }, [handleScroll, handleResize]);

  // Scroll actions
  const scrollToIndex = useCallback((
    index: number,
    align: 'start' | 'center' | 'end' | 'auto' = 'auto'
  ) => {
    if (!containerRef.current || index < 0 || index >= items.length) return;

    const item = itemPositions[index];
    if (!item) return;

    const containerHeight = containerRef.current.clientHeight;
    let targetScrollTop = item.offsetTop;

    switch (align) {
      case 'start':
        targetScrollTop = item.offsetTop;
        break;
      case 'center':
        targetScrollTop = item.offsetTop - (containerHeight - item.height) / 2;
        break;
      case 'end':
        targetScrollTop = item.offsetTop - containerHeight + item.height;
        break;
      case 'auto':
        // Only scroll if item is not fully visible
        const itemBottom = item.offsetTop + item.height;
        const viewportBottom = scrollTop + containerHeight;

        if (item.offsetTop < scrollTop) {
          // Item is above viewport
          targetScrollTop = item.offsetTop;
        } else if (itemBottom > viewportBottom) {
          // Item is below viewport
          targetScrollTop = itemBottom - containerHeight;
        } else {
          // Item is already visible, no need to scroll
          return;
        }
        break;
    }

    // Clamp to valid range
    targetScrollTop = Math.max(0, Math.min(targetScrollTop, totalHeight - containerHeight));

    containerRef.current.scrollTo({
      top: targetScrollTop,
      behavior: 'smooth'
    });
  }, [items.length, itemPositions, scrollTop, totalHeight]);

  const scrollToTop = useCallback(() => {
    if (containerRef.current) {
      containerRef.current.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }, []);

  const scrollToBottom = useCallback(() => {
    if (containerRef.current) {
      const maxScrollTop = totalHeight - containerRef.current.clientHeight;
      containerRef.current.scrollTo({ top: maxScrollTop, behavior: 'smooth' });
    }
  }, [totalHeight]);

  // Measure item height (for dynamic heights)
  const measureItem = useCallback((index: number, height: number) => {
    setMeasuredHeights(prev => {
      const newMap = new Map(prev);
      newMap.set(index, height);
      return newMap;
    });
  }, []);

  const resetMeasurements = useCallback(() => {
    setMeasuredHeights(new Map());
  }, []);

  // Container styles
  const wrapperStyle: React.CSSProperties = {
    height: '100%',
    overflow: 'auto',
    position: 'relative'
  };

  const innerStyle: React.CSSProperties = {
    height: totalHeight,
    position: 'relative'
  };

  return {
    // Container props
    containerRef,
    wrapperStyle,
    innerStyle,

    // Visible items
    visibleItems,
    startIndex,
    endIndex,

    // Scroll state
    isScrolling,
    scrollTop,
    scrollDirection,

    // Actions
    scrollToIndex,
    scrollToTop,
    scrollToBottom,

    // Measurements
    totalHeight,
    visibleHeight,
    measureItem,
    resetMeasurements
  };
};

export default useVirtualScroll;