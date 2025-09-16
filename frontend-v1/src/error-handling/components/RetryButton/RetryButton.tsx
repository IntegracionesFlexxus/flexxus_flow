/**
 * RetryButton Component - Sprint 3
 * Botón de retry con indicador de progreso y límite de intentos
 */

import { Button, CircularProgress, Chip, ButtonProps } from '@mui/material';
import { Refresh } from '@mui/icons-material';
import { useState, useCallback, useEffect } from 'react';
import { retryWithBackoff } from '@/shared/utils/errorHandler';

interface RetryButtonProps extends Omit<ButtonProps, 'onClick'> {
  onRetry: () => Promise<any>;
  maxRetries?: number;
  backoffMs?: number;
  onSuccess?: (result: any) => void;
  onError?: (error: Error) => void;
  onMaxRetriesReached?: () => void;
  autoRetry?: boolean;
  autoRetryDelay?: number;
  showRetryCount?: boolean;
  resetOnSuccess?: boolean;
}

export function RetryButton({
  onRetry,
  maxRetries = 3,
  backoffMs = 1000,
  onSuccess,
  onError,
  onMaxRetriesReached,
  autoRetry = false,
  autoRetryDelay = 5000,
  showRetryCount = true,
  resetOnSuccess = true,
  children = 'Reintentar',
  disabled,
  ...buttonProps
}: RetryButtonProps) {
  const [isRetrying, setIsRetrying] = useState(false);
  const [retryCount, setRetryCount] = useState(0);
  const [autoRetryTimer, setAutoRetryTimer] = useState<NodeJS.Timeout | null>(null);
  const [countdown, setCountdown] = useState<number | null>(null);

  // Limpiar timer al desmontar
  useEffect(() => {
    return () => {
      if (autoRetryTimer) {
        clearTimeout(autoRetryTimer);
      }
    };
  }, [autoRetryTimer]);

  // Auto-retry logic
  useEffect(() => {
    if (autoRetry && retryCount > 0 && retryCount < maxRetries && !isRetrying) {
      const delay = autoRetryDelay * Math.pow(2, retryCount - 1); // Exponential backoff
      
      // Iniciar countdown
      let timeLeft = Math.floor(delay / 1000);
      setCountdown(timeLeft);
      
      const countdownInterval = setInterval(() => {
        timeLeft--;
        setCountdown(timeLeft);
        
        if (timeLeft <= 0) {
          clearInterval(countdownInterval);
          setCountdown(null);
        }
      }, 1000);

      // Programar retry
      const timer = setTimeout(() => {
        clearInterval(countdownInterval);
        handleRetry();
      }, delay);

      setAutoRetryTimer(timer);

      return () => {
        clearTimeout(timer);
        clearInterval(countdownInterval);
      };
    }
  }, [autoRetry, retryCount, isRetrying, maxRetries, autoRetryDelay]);

  const handleRetry = useCallback(async () => {
    if (retryCount >= maxRetries) {
      if (onMaxRetriesReached) {
        onMaxRetriesReached();
      }
      return;
    }

    setIsRetrying(true);
    
    // Cancelar auto-retry si está activo
    if (autoRetryTimer) {
      clearTimeout(autoRetryTimer);
      setAutoRetryTimer(null);
      setCountdown(null);
    }

    try {
      const result = await retryWithBackoff(
        onRetry,
        1, // Solo 1 intento aquí
        backoffMs * Math.pow(2, retryCount)
      );

      // Éxito
      if (resetOnSuccess) {
        setRetryCount(0);
      }
      
      if (onSuccess) {
        onSuccess(result);
      }
    } catch (error) {
      // Error
      setRetryCount(prev => prev + 1);
      
      if (onError) {
        onError(error as Error);
      }
      
      // Verificar si alcanzamos el máximo
      if (retryCount + 1 >= maxRetries && onMaxRetriesReached) {
        onMaxRetriesReached();
      }
    } finally {
      setIsRetrying(false);
    }
  }, [
    retryCount,
    maxRetries,
    onRetry,
    backoffMs,
    onSuccess,
    onError,
    onMaxRetriesReached,
    resetOnSuccess,
    autoRetryTimer
  ]);

  const isDisabled = disabled || isRetrying || retryCount >= maxRetries;

  const getButtonText = () => {
    if (isRetrying) {
      return 'Reintentando...';
    }
    
    if (countdown !== null && countdown > 0) {
      return `Reintentando en ${countdown}s`;
    }
    
    if (retryCount >= maxRetries) {
      return 'Máximo de intentos alcanzado';
    }
    
    return children;
  };

  return (
    <>
      <Button
        {...buttonProps}
        onClick={handleRetry}
        disabled={isDisabled}
        startIcon={
          isRetrying ? (
            <CircularProgress size={20} color="inherit" />
          ) : (
            <Refresh />
          )
        }
      >
        {getButtonText()}
      </Button>
      
      {showRetryCount && retryCount > 0 && (
        <Chip
          label={`${retryCount}/${maxRetries}`}
          size="small"
          color={retryCount >= maxRetries ? 'error' : 'warning'}
          sx={{ ml: 1 }}
        />
      )}
    </>
  );
}

export default RetryButton;