// Shared Hooks Index - Sprint 19 Frontend Implementation

export { useDebounce, useDebouncedCallback } from './useDebounce';
export { usePagination } from './usePagination';
export { useWebSocket, useSimpleWebSocket } from './useWebSocket';

export type {
  PaginationConfig,
  PaginationState,
  PaginationControls,
  UsePaginationReturn
} from './usePagination';

export type {
  WebSocketConfig,
  WebSocketState,
  WebSocketControls
} from './useWebSocket';