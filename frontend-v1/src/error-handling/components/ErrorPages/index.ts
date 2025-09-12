/**
 * Error Pages Exports
 * Sprint 3 - Error Handling UI
 */

export { default as Error403 } from './Error403';
export { default as Error500 } from './Error500';
export { default as Error503 } from './Error503';

// Re-exportar Error404 desde su ubicación actual
export { default as Error404 } from '@/pages/NotFound';