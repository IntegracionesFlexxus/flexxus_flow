// Pagination Hook - Sprint 19 Frontend Implementation

import { useState, useMemo, useCallback } from 'react';

export interface PaginationConfig {
  initialPage?: number;
  initialPageSize?: number;
  pageSizeOptions?: number[];
  maxPages?: number;
}

export interface PaginationState {
  currentPage: number;
  pageSize: number;
  totalItems: number;
  totalPages: number;
  startIndex: number;
  endIndex: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
  isFirstPage: boolean;
  isLastPage: boolean;
}

export interface PaginationControls {
  goToPage: (page: number) => void;
  goToNextPage: () => void;
  goToPreviousPage: () => void;
  goToFirstPage: () => void;
  goToLastPage: () => void;
  setPageSize: (size: number) => void;
  setTotalItems: (total: number) => void;
  reset: () => void;
}

export interface UsePaginationReturn {
  state: PaginationState;
  controls: PaginationControls;
  getPageItems: <T>(items: T[]) => T[];
  getVisiblePages: (maxVisible?: number) => number[];
}

/**
 * Custom hook for managing pagination state and controls
 */
export function usePagination(
  totalItems: number = 0,
  config: PaginationConfig = {}
): UsePaginationReturn {
  const {
    initialPage = 1,
    initialPageSize = 20,
    pageSizeOptions = [10, 20, 50, 100],
    maxPages = Infinity
  } = config;

  const [currentPage, setCurrentPage] = useState(initialPage);
  const [pageSize, setPageSize] = useState(initialPageSize);
  const [total, setTotal] = useState(totalItems);

  // Calculate derived state
  const state = useMemo((): PaginationState => {
    const totalPages = Math.min(Math.ceil(total / pageSize) || 1, maxPages);
    const safePage = Math.min(Math.max(1, currentPage), totalPages);
    const startIndex = (safePage - 1) * pageSize;
    const endIndex = Math.min(startIndex + pageSize, total);

    return {
      currentPage: safePage,
      pageSize,
      totalItems: total,
      totalPages,
      startIndex,
      endIndex,
      hasNextPage: safePage < totalPages,
      hasPreviousPage: safePage > 1,
      isFirstPage: safePage === 1,
      isLastPage: safePage === totalPages,
    };
  }, [currentPage, pageSize, total, maxPages]);

  // Navigation controls
  const goToPage = useCallback((page: number) => {
    const safePage = Math.min(Math.max(1, page), state.totalPages);
    setCurrentPage(safePage);
  }, [state.totalPages]);

  const goToNextPage = useCallback(() => {
    if (state.hasNextPage) {
      setCurrentPage(prev => prev + 1);
    }
  }, [state.hasNextPage]);

  const goToPreviousPage = useCallback(() => {
    if (state.hasPreviousPage) {
      setCurrentPage(prev => prev - 1);
    }
  }, [state.hasPreviousPage]);

  const goToFirstPage = useCallback(() => {
    setCurrentPage(1);
  }, []);

  const goToLastPage = useCallback(() => {
    setCurrentPage(state.totalPages);
  }, [state.totalPages]);

  const handleSetPageSize = useCallback((size: number) => {
    const validSize = pageSizeOptions.includes(size) ? size : initialPageSize;
    setPageSize(validSize);
    // Adjust current page to maintain position if possible
    const currentStartIndex = (state.currentPage - 1) * state.pageSize;
    const newPage = Math.floor(currentStartIndex / validSize) + 1;
    setCurrentPage(Math.min(newPage, Math.ceil(total / validSize)));
  }, [pageSizeOptions, initialPageSize, state.currentPage, state.pageSize, total]);

  const setTotalItems = useCallback((newTotal: number) => {
    setTotal(newTotal);
    // Adjust current page if it's now out of range
    const newTotalPages = Math.ceil(newTotal / pageSize);
    if (currentPage > newTotalPages && newTotalPages > 0) {
      setCurrentPage(newTotalPages);
    }
  }, [pageSize, currentPage]);

  const reset = useCallback(() => {
    setCurrentPage(initialPage);
    setPageSize(initialPageSize);
    setTotal(0);
  }, [initialPage, initialPageSize]);

  // Helper function to paginate an array
  const getPageItems = useCallback(<T,>(items: T[]): T[] => {
    return items.slice(state.startIndex, state.endIndex);
  }, [state.startIndex, state.endIndex]);

  // Helper function to get visible page numbers for pagination UI
  const getVisiblePages = useCallback((maxVisible: number = 7): number[] => {
    const { currentPage, totalPages } = state;

    if (totalPages <= maxVisible) {
      return Array.from({ length: totalPages }, (_, i) => i + 1);
    }

    const halfVisible = Math.floor(maxVisible / 2);
    let startPage = Math.max(1, currentPage - halfVisible);
    let endPage = Math.min(totalPages, startPage + maxVisible - 1);

    // Adjust if we're near the end
    if (endPage - startPage < maxVisible - 1) {
      startPage = Math.max(1, endPage - maxVisible + 1);
    }

    return Array.from({ length: endPage - startPage + 1 }, (_, i) => startPage + i);
  }, [state]);

  const controls: PaginationControls = {
    goToPage,
    goToNextPage,
    goToPreviousPage,
    goToFirstPage,
    goToLastPage,
    setPageSize: handleSetPageSize,
    setTotalItems,
    reset
  };

  return {
    state,
    controls,
    getPageItems,
    getVisiblePages
  };
}

export default usePagination;