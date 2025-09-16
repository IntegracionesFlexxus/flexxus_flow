/**
 * ConfirmDialog Component - Sprint 3
 * Diálogo de confirmación reutilizable
 * Implementación con principios SOLID y Clean Code
 */

import React, { useCallback } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  Box,
  IconButton,
  Alert,
  CircularProgress,
  Stack
} from '@mui/material';
import { LoadingButton } from '@mui/lab';
import {
  AlertTriangle,
  Info,
  CheckCircle,
  XCircle,
  X,
  AlertCircle,
  Trash2,
  Save,
  Shield
} from 'lucide-react';

export interface ConfirmDialogProps {
  open: boolean;
  title: string;
  message: string | React.ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  onConfirm: () => void | Promise<void>;
  onCancel: () => void;
  severity?: 'success' | 'info' | 'warning' | 'error';
  loading?: boolean;
  showIcon?: boolean;
  maxWidth?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  destructive?: boolean;
  disableBackdropClick?: boolean;
  confirmButtonProps?: any;
  cancelButtonProps?: any;
  additionalActions?: React.ReactNode;
}

/**
 * ConfirmDialog Component
 * Principios aplicados:
 * - S: Responsabilidad única de confirmación
 * - O: Abierto para extensión con props
 * - I: Interface simple y clara
 * - D: No depende de implementaciones concretas
 */
export const ConfirmDialog: React.FC<ConfirmDialogProps> = ({
  open,
  title,
  message,
  confirmLabel = 'Confirmar',
  cancelLabel = 'Cancelar',
  onConfirm,
  onCancel,
  severity = 'info',
  loading = false,
  showIcon = true,
  maxWidth = 'sm',
  destructive = false,
  disableBackdropClick = false,
  confirmButtonProps = {},
  cancelButtonProps = {},
  additionalActions
}) => {
  const [isProcessing, setIsProcessing] = React.useState(false);

  /**
   * Get icon based on severity
   * Clean Code: Función pura para obtener el icono
   */
  const getIcon = useCallback(() => {
    const iconSize = 48;
    const iconProps = {
      size: iconSize,
      style: { marginBottom: 8 }
    };

    switch (severity) {
      case 'success':
        return <CheckCircle {...iconProps} color="#4caf50" />;
      case 'warning':
        return <AlertTriangle {...iconProps} color="#ff9800" />;
      case 'error':
        return <XCircle {...iconProps} color="#f44336" />;
      default:
        return <Info {...iconProps} color="#2196f3" />;
    }
  }, [severity]);

  /**
   * Get button color based on severity
   */
  const getButtonColor = useCallback(() => {
    if (destructive) return 'error';
    
    switch (severity) {
      case 'error':
        return 'error';
      case 'warning':
        return 'warning';
      case 'success':
        return 'success';
      default:
        return 'primary';
    }
  }, [severity, destructive]);

  /**
   * Handle confirmation
   * Clean Code: Manejo async/await limpio
   */
  const handleConfirm = useCallback(async () => {
    setIsProcessing(true);
    try {
      await onConfirm();
    } catch (error) {
      console.error('Error in confirmation:', error);
    } finally {
      setIsProcessing(false);
    }
  }, [onConfirm]);

  /**
   * Handle dialog close
   */
  const handleClose = useCallback((event: any, reason?: string) => {
    if (disableBackdropClick && reason === 'backdropClick') {
      return;
    }
    if (!loading && !isProcessing) {
      onCancel();
    }
  }, [disableBackdropClick, loading, isProcessing, onCancel]);

  const isLoading = loading || isProcessing;

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      maxWidth={maxWidth}
      fullWidth
      PaperProps={{
        sx: {
          minWidth: 320
        }
      }}
    >
      <DialogTitle>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Typography variant="h6" component="div">
            {title}
          </Typography>
          {!isLoading && (
            <IconButton
              size="small"
              onClick={onCancel}
              sx={{ ml: 2 }}
            >
              <X size={20} />
            </IconButton>
          )}
        </Box>
      </DialogTitle>

      <DialogContent>
        <Stack spacing={2} alignItems="center">
          {showIcon && (
            <Box sx={{ textAlign: 'center', pt: 1 }}>
              {getIcon()}
            </Box>
          )}
          
          {typeof message === 'string' ? (
            <Typography 
              variant="body1" 
              align="center"
              color="text.secondary"
            >
              {message}
            </Typography>
          ) : (
            message
          )}

          {destructive && (
            <Alert severity="warning" sx={{ mt: 2 }}>
              <Typography variant="body2">
                Esta acción no se puede deshacer
              </Typography>
            </Alert>
          )}
        </Stack>
      </DialogContent>

      <DialogActions sx={{ px: 3, pb: 2 }}>
        {additionalActions}
        
        <Button
          onClick={onCancel}
          disabled={isLoading}
          {...cancelButtonProps}
        >
          {cancelLabel}
        </Button>
        
        <LoadingButton
          onClick={handleConfirm}
          loading={isLoading}
          loadingPosition="start"
          variant="contained"
          color={getButtonColor()}
          {...confirmButtonProps}
        >
          {confirmLabel}
        </LoadingButton>
      </DialogActions>
    </Dialog>
  );
};

/**
 * Hook helper para usar el diálogo de confirmación
 * Clean Code: Abstracción para facilitar el uso
 */
export const useConfirmDialog = () => {
  const [dialogState, setDialogState] = React.useState({
    open: false,
    title: '',
    message: '',
    onConfirm: () => {},
    severity: 'info' as ConfirmDialogProps['severity']
  });

  const showConfirm = useCallback((options: Partial<ConfirmDialogProps>) => {
    setDialogState({
      open: true,
      title: options.title || 'Confirmar acción',
      message: options.message || '¿Estás seguro?',
      onConfirm: options.onConfirm || (() => {}),
      severity: options.severity || 'info'
    });
  }, []);

  const hideConfirm = useCallback(() => {
    setDialogState(prev => ({ ...prev, open: false }));
  }, []);

  return {
    dialogState,
    showConfirm,
    hideConfirm
  };
};

export default ConfirmDialog;