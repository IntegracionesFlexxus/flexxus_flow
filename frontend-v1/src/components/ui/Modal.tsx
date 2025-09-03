import React from 'react'
import {
  Dialog,
  DialogProps,
  DialogTitle,
  DialogContent,
  DialogActions,
  IconButton,
  Typography,
  Box,
  Slide
} from '@mui/material'
import { TransitionProps } from '@mui/material/transitions'
import { Close as CloseIcon } from '@mui/icons-material'
import { Button } from './Button'

// Transición para el modal
const Transition = React.forwardRef(function Transition(
  props: TransitionProps & {
    children: React.ReactElement<any, any>
  },
  ref: React.Ref<unknown>,
) {
  return <Slide direction="up" ref={ref} {...props} />
})

// Componente Modal/Dialog mejorado - MVP
// TODO: En Nivel 2 agregar más transiciones y tamaños responsivos

interface ModalProps extends Omit<DialogProps, 'open'> {
  open: boolean
  onClose: () => void
  title?: string
  subtitle?: string
  children: React.ReactNode
  actions?: React.ReactNode
  showCloseButton?: boolean
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | 'fullScreen'
  loading?: boolean
  disableBackdropClick?: boolean
}

export const Modal: React.FC<ModalProps> = ({
  open,
  onClose,
  title,
  subtitle,
  children,
  actions,
  showCloseButton = true,
  size = 'sm',
  loading = false,
  disableBackdropClick = false,
  ...props
}) => {
  // Mapear tamaños a maxWidth de Material-UI
  const maxWidth = size === 'fullScreen' ? false : size
  const fullScreen = size === 'fullScreen'

  const handleBackdropClick = (event: any, reason: string) => {
    if (disableBackdropClick && reason === 'backdropClick') {
      return
    }
    onClose()
  }

  return (
    <Dialog
      open={open}
      onClose={handleBackdropClick}
      maxWidth={maxWidth as any}
      fullScreen={fullScreen}
      fullWidth
      TransitionComponent={Transition}
      {...props}
    >
      {(title || showCloseButton) && (
        <DialogTitle>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <Box>
              {title && (
                <Typography variant="h6" component="div">
                  {title}
                </Typography>
              )}
              {subtitle && (
                <Typography variant="body2" color="text.secondary">
                  {subtitle}
                </Typography>
              )}
            </Box>
            {showCloseButton && (
              <IconButton
                aria-label="close"
                onClick={onClose}
                size="small"
                disabled={loading}
                sx={{ ml: 2 }}
              >
                <CloseIcon />
              </IconButton>
            )}
          </Box>
        </DialogTitle>
      )}
      
      <DialogContent dividers>
        {children}
      </DialogContent>
      
      {actions && (
        <DialogActions>
          {actions}
        </DialogActions>
      )}
    </Dialog>
  )
}

// Modal de confirmación predefinido
interface ConfirmModalProps {
  open: boolean
  onClose: () => void
  onConfirm: () => void
  title?: string
  message: string
  confirmText?: string
  cancelText?: string
  confirmColor?: 'primary' | 'error' | 'warning' | 'success'
  loading?: boolean
}

export const ConfirmModal: React.FC<ConfirmModalProps> = ({
  open,
  onClose,
  onConfirm,
  title = 'Confirmar acción',
  message,
  confirmText = 'Confirmar',
  cancelText = 'Cancelar',
  confirmColor = 'primary',
  loading = false
}) => {
  return (
    <Modal
      open={open}
      onClose={onClose}
      title={title}
      size="xs"
      disableBackdropClick={loading}
      actions={
        <>
          <Button 
            onClick={onClose} 
            disabled={loading}
          >
            {cancelText}
          </Button>
          <Button
            variant="contained"
            color={confirmColor}
            onClick={onConfirm}
            loading={loading}
          >
            {confirmText}
          </Button>
        </>
      }
    >
      <Typography>{message}</Typography>
    </Modal>
  )
}

// Modal de información
interface InfoModalProps {
  open: boolean
  onClose: () => void
  title?: string
  message: string
  buttonText?: string
}

export const InfoModal: React.FC<InfoModalProps> = ({
  open,
  onClose,
  title = 'Información',
  message,
  buttonText = 'Entendido'
}) => {
  return (
    <Modal
      open={open}
      onClose={onClose}
      title={title}
      size="xs"
      actions={
        <Button
          variant="contained"
          onClick={onClose}
        >
          {buttonText}
        </Button>
      }
    >
      <Typography>{message}</Typography>
    </Modal>
  )
}

export default Modal