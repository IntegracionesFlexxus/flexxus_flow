/**
 * Error Handling Module Exports - Sprint 3
 * Punto de entrada principal del módulo de manejo de errores
 */

// Components
export { EnhancedErrorBoundary } from './components/ErrorBoundary/EnhancedErrorBoundary';
export { Error403, Error500, Error503, Error404 } from './components/ErrorPages';
export { RetryButton } from './components/RetryButton/RetryButton';

// Hooks
export { useErrorHandler } from './hooks/useErrorHandler';
export { useFormValidation } from './hooks/useFormValidation';
export type { ValidationRule, FieldValidation, UseFormValidationConfig } from './hooks/useFormValidation';

// Stores
export { useErrorStore, getErrorState } from './stores/errorStore';
export type { ErrorRecord, RetryableRequest } from './stores/errorStore';

// Re-export utilities from shared
export {
  AppError,
  ValidationError,
  AuthenticationError,
  AuthorizationError,
  NotFoundError,
  ConflictError,
  RateLimitError,
  NetworkError,
  parseAxiosError,
  formatErrorMessage,
  getErrorDetails,
  isRecoverableError,
  retryWithBackoff,
  errorLogger,
  ErrorMessages
} from '@/shared/utils/errorHandler';