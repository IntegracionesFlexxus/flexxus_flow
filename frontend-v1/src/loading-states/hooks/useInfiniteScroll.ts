/**
 * useInfiniteScroll Hook
 * Loading States - Hook para implementar scroll infinito
 */

import { useState, useEffect, useCallback, useRef } from 'react';

interface UseInfiniteScrollOptions<T> {
  fetchMore: (page: number, pageSize: number) => Promise<{
    data: T[];
    hasMore: boolean;
    total?: number;
  }>;
  pageSize?: number;
  threshold?: number;
  initialPage?: number;
  enabled?: boolean;
  onError?: (error: Error) => void;
  onSuccess?: (data: T[], page: number) => void;
}

interface UseInfiniteScrollReturn<T> {
  items: T[];
  loading: boolean;
  error: Error | null;
  hasMore: boolean;
  page: number;
  total: number | null;
  loadMore: () => Promise<void>;
  reset: () => void;
  refresh: () => Promise<void>;
  isLoadingMore: boolean;
}

export function useInfiniteScroll<T>({
  fetchMore,
  pageSize = 20,
  threshold = 100,
  initialPage = 1,
  enabled = true,
  onError,
  onSuccess
}: UseInfiniteScrollOptions<T>): UseInfiniteScrollReturn<T> {
  const [items, setItems] = useState<T[]>([]);
  const [page, setPage] = useState(initialPage);
  const [loading, setLoading] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [hasMore, setHasMore] = useState(true);
  const [total, setTotal] = useState<number | null>(null);
  
  const loadingRef = useRef(false);
  const observerRef = useRef<IntersectionObserver | null>(null);
  const sentinelRef = useRef<HTMLDivElement | null>(null);

  // Cargar más items
  const loadMore = useCallback(async () => {
    if (loadingRef.current || !hasMore || !enabled) return;

    loadingRef.current = true;
    setIsLoadingMore(true);
    setError(null);

    try {
      const result = await fetchMore(page, pageSize);
      
      setItems(prev => [...prev, ...result.data]);
      setHasMore(result.hasMore);
      setTotal(result.total || null);
      setPage(prev => prev + 1);
      
      onSuccess?.(result.data, page);
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to load more items');
      setError(error);
      onError?.(error);
    } finally {
      loadingRef.current = false;
      setIsLoadingMore(false);
    }
  }, [page, pageSize, hasMore, enabled, fetchMore, onSuccess, onError]);

  // Cargar inicial
  const loadInitial = useCallback(async () => {
    if (!enabled) return;

    setLoading(true);
    setError(null);
    loadingRef.current = true;

    try {
      const result = await fetchMore(initialPage, pageSize);
      
      setItems(result.data);
      setHasMore(result.hasMore);
      setTotal(result.total || null);
      setPage(initialPage + 1);
      
      onSuccess?.(result.data, initialPage);
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to load items');
      setError(error);
      onError?.(error);
    } finally {
      setLoading(false);
      loadingRef.current = false;
    }
  }, [enabled, initialPage, pageSize, fetchMore, onSuccess, onError]);

  // Reset
  const reset = useCallback(() => {
    setItems([]);
    setPage(initialPage);
    setLoading(false);
    setIsLoadingMore(false);
    setError(null);
    setHasMore(true);
    setTotal(null);
    loadingRef.current = false;
  }, [initialPage]);

  // Refresh
  const refresh = useCallback(async () => {
    reset();
    await loadInitial();
  }, [reset, loadInitial]);

  // Configurar IntersectionObserver
  useEffect(() => {
    if (!enabled) return;

    observerRef.current = new IntersectionObserver(
      (entries) => {
        const [entry] = entries;
        if (entry.isIntersecting && hasMore && !loadingRef.current) {
          loadMore();
        }
      },
      {
        rootMargin: `${threshold}px`
      }
    );

    return () => {
      observerRef.current?.disconnect();
    };
  }, [enabled, hasMore, threshold, loadMore]);

  // Observar sentinel
  useEffect(() => {
    const sentinel = sentinelRef.current;
    const observer = observerRef.current;

    if (sentinel && observer) {
      observer.observe(sentinel);
    }

    return () => {
      if (sentinel && observer) {
        observer.unobserve(sentinel);
      }
    };
  }, [items]);

  // Cargar inicial
  useEffect(() => {
    loadInitial();
  }, []);

  return {
    items,
    loading,
    error,
    hasMore,
    page,
    total,
    loadMore,
    reset,
    refresh,
    isLoadingMore
  };
}

/**
 * Hook para infinite scroll con cursor
 */
interface UseInfiniteScrollCursorOptions<T> {
  fetchMore: (cursor?: string) => Promise<{
    data: T[];
    nextCursor?: string;
    hasMore: boolean;
  }>;
  enabled?: boolean;
  onError?: (error: Error) => void;
  onSuccess?: (data: T[]) => void;
}

export function useInfiniteScrollCursor<T>({
  fetchMore,
  enabled = true,
  onError,
  onSuccess
}: UseInfiniteScrollCursorOptions<T>) {
  const [items, setItems] = useState<T[]>([]);
  const [cursor, setCursor] = useState<string | undefined>(undefined);
  const [loading, setLoading] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [hasMore, setHasMore] = useState(true);
  
  const loadingRef = useRef(false);

  const loadMore = useCallback(async () => {
    if (loadingRef.current || !hasMore || !enabled) return;

    loadingRef.current = true;
    const isInitial = cursor === undefined;
    
    if (isInitial) {
      setLoading(true);
    } else {
      setIsLoadingMore(true);
    }
    
    setError(null);

    try {
      const result = await fetchMore(cursor);
      
      if (isInitial) {
        setItems(result.data);
      } else {
        setItems(prev => [...prev, ...result.data]);
      }
      
      setCursor(result.nextCursor);
      setHasMore(result.hasMore);
      
      onSuccess?.(result.data);
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to load items');
      setError(error);
      onError?.(error);
    } finally {
      loadingRef.current = false;
      setLoading(false);
      setIsLoadingMore(false);
    }
  }, [cursor, hasMore, enabled, fetchMore, onSuccess, onError]);

  const reset = useCallback(() => {
    setItems([]);
    setCursor(undefined);
    setLoading(false);
    setIsLoadingMore(false);
    setError(null);
    setHasMore(true);
    loadingRef.current = false;
  }, []);

  const refresh = useCallback(async () => {
    reset();
    await loadMore();
  }, [reset, loadMore]);

  useEffect(() => {
    if (enabled && items.length === 0) {
      loadMore();
    }
  }, [enabled]);

  return {
    items,
    loading,
    error,
    hasMore,
    cursor,
    loadMore,
    reset,
    refresh,
    isLoadingMore
  };
}

export default useInfiniteScroll;