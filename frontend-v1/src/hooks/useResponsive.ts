/**
 * useResponsive Hook - Dashboard Layout System
 * Hook para detectar y gestionar breakpoints responsivos
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useLayoutStore, Breakpoint } from '@/stores/layoutStore';
import { debounce } from '@/utils/debounce';

// Breakpoint definitions in pixels
export const BREAKPOINTS = {
  mobile: 0,
  tablet: 640,
  desktop: 1024,
  wide: 1440
} as const;

export interface ResponsiveConfig {
  debounceMs?: number;
  updateStore?: boolean;
}

export interface ResponsiveResult {
  breakpoint: Breakpoint;
  width: number;
  height: number;
  isMobile: boolean;
  isTablet: boolean;
  isDesktop: boolean;
  isWide: boolean;
  isLandscape: boolean;
  isPortrait: boolean;
  isTouchDevice: boolean;
  pixelRatio: number;
}

/**
 * Get current breakpoint based on window width
 */
const getBreakpoint = (width: number): Breakpoint => {
  if (width >= BREAKPOINTS.wide) return 'wide';
  if (width >= BREAKPOINTS.desktop) return 'desktop';
  if (width >= BREAKPOINTS.tablet) return 'tablet';
  return 'mobile';
};

/**
 * Check if device supports touch
 */
const checkTouchDevice = (): boolean => {
  return 'ontouchstart' in window || 
    navigator.maxTouchPoints > 0 || 
    // @ts-ignore
    navigator.msMaxTouchPoints > 0;
};

/**
 * Custom hook for responsive design
 */
export const useResponsive = (config: ResponsiveConfig = {}): ResponsiveResult => {
  const { debounceMs = 150, updateStore = true } = config;
  const setCurrentBreakpoint = useLayoutStore(state => state.setCurrentBreakpoint);
  
  const [windowSize, setWindowSize] = useState({
    width: typeof window !== 'undefined' ? window.innerWidth : 1024,
    height: typeof window !== 'undefined' ? window.innerHeight : 768
  });
  
  const [isTouchDevice] = useState(checkTouchDevice());
  
  // Calculate current breakpoint
  const breakpoint = useMemo(
    () => getBreakpoint(windowSize.width),
    [windowSize.width]
  );
  
  // Debounced resize handler
  const handleResize = useCallback(
    debounce(() => {
      setWindowSize({
        width: window.innerWidth,
        height: window.innerHeight
      });
    }, debounceMs),
    [debounceMs]
  );
  
  // Update store when breakpoint changes
  useEffect(() => {
    if (updateStore) {
      setCurrentBreakpoint(breakpoint);
    }
  }, [breakpoint, setCurrentBreakpoint, updateStore]);
  
  // Setup resize listener
  useEffect(() => {
    window.addEventListener('resize', handleResize);
    
    // Also listen for orientation change on mobile
    window.addEventListener('orientationchange', handleResize);
    
    // Initial call
    handleResize();
    
    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('orientationchange', handleResize);
    };
  }, [handleResize]);
  
  // Calculate derived values
  const result: ResponsiveResult = useMemo(() => ({
    breakpoint,
    width: windowSize.width,
    height: windowSize.height,
    isMobile: breakpoint === 'mobile',
    isTablet: breakpoint === 'tablet',
    isDesktop: breakpoint === 'desktop' || breakpoint === 'wide',
    isWide: breakpoint === 'wide',
    isLandscape: windowSize.width > windowSize.height,
    isPortrait: windowSize.height >= windowSize.width,
    isTouchDevice,
    pixelRatio: window.devicePixelRatio || 1
  }), [breakpoint, windowSize, isTouchDevice]);
  
  return result;
};

/**
 * Hook to get media query matches
 */
export const useMediaQuery = (query: string): boolean => {
  const [matches, setMatches] = useState(false);
  
  useEffect(() => {
    const media = window.matchMedia(query);
    
    // Initial check
    setMatches(media.matches);
    
    // Listen for changes
    const listener = (e: MediaQueryListEvent) => {
      setMatches(e.matches);
    };
    
    // Modern browsers
    if (media.addEventListener) {
      media.addEventListener('change', listener);
      return () => media.removeEventListener('change', listener);
    } 
    // Legacy browsers
    else {
      // @ts-ignore
      media.addListener(listener);
      // @ts-ignore
      return () => media.removeListener(listener);
    }
  }, [query]);
  
  return matches;
};

/**
 * Hook to get responsive value based on breakpoint
 */
export const useResponsiveValue = <T>(values: {
  mobile?: T;
  tablet?: T;
  desktop?: T;
  wide?: T;
  default: T;
}): T => {
  const { breakpoint } = useResponsive();
  
  return values[breakpoint] ?? values.default;
};

/**
 * Hook for container queries (element-based responsive)
 */
export const useContainerQuery = (
  ref: React.RefObject<HTMLElement>,
  breakpoints: Record<string, number>
): string | null => {
  const [currentBreakpoint, setCurrentBreakpoint] = useState<string | null>(null);
  
  useEffect(() => {
    if (!ref.current) return;
    
    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const width = entry.contentRect.width;
        
        // Find matching breakpoint
        let matched: string | null = null;
        let maxWidth = 0;
        
        for (const [name, minWidth] of Object.entries(breakpoints)) {
          if (width >= minWidth && minWidth > maxWidth) {
            matched = name;
            maxWidth = minWidth;
          }
        }
        
        setCurrentBreakpoint(matched);
      }
    });
    
    observer.observe(ref.current);
    
    return () => observer.disconnect();
  }, [ref, breakpoints]);
  
  return currentBreakpoint;
};

// Export utility functions
export const utils = {
  getBreakpoint,
  checkTouchDevice,
  BREAKPOINTS
};