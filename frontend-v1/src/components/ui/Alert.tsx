import React, { useEffect } from 'react'
import {
  Alert as MuiAlert,
  AlertProps as MuiAlertProps,
  Snackbar,
  SnackbarProps,
  AlertTitle,
  IconButton,
  Collapse,
  Box
} from '@mui/material'
import { Close as CloseIcon } from '@mui/icons-material'

// Componente Alert mejorado - MVP con auto-cerrado
// TODO: En Nivel 2 agregar sistema de notificaciones global con contexto

interface AlertProps extends MuiAlertProps {
  title?: string
  closable?: boolean
  onClose?: () => void
  autoHide?: boolean
  autoHideDuration?: number
}

export const Alert: React.FC<AlertProps> = ({
  title,
  closable = false,
  onClose,
  autoHide = false,
  autoHideDuration = 5000,
  children,
  severity = 'info',
  ...props
}) => {
  const [open, setOpen] = React.useState(true)

  useEffect(() => {
    if (autoHide && open) {
      const timer = setTimeout(() => {
        setOpen(false)
        onClose?.()
      }, autoHideDuration)
      return () => clearTimeout(timer)
    }
  }, [autoHide, autoHideDuration, open, onClose])

  const handleClose = () => {
    setOpen(false)
    onClose?.()
  }

  return (
    <Collapse in={open}>
      <MuiAlert
        severity={severity}
        {...props}
        action={
          closable ? (
            <IconButton
              aria-label="close"
              color="inherit"
              size="small"
              onClick={handleClose}
            >
              <CloseIcon fontSize="inherit" />
            </IconButton>
          ) : props.action
        }
      >
        {title && <AlertTitle>{title}</AlertTitle>}
        {children}
      </MuiAlert>
    </Collapse>
  )
}

// Notificación tipo toast
interface ToastProps extends Omit<SnackbarProps, 'open'> {
  open: boolean
  onClose: () => void
  message: string
  severity?: 'success' | 'info' | 'warning' | 'error'
  duration?: number
  position?: {
    vertical: 'top' | 'bottom'
    horizontal: 'left' | 'center' | 'right'
  }
}

export const Toast: React.FC<ToastProps> = ({
  open,
  onClose,
  message,
  severity = 'info',
  duration = 4000,
  position = { vertical: 'bottom', horizontal: 'center' },
  ...props
}) => {
  return (
    <Snackbar
      open={open}
      autoHideDuration={duration}
      onClose={onClose}
      anchorOrigin={position}
      {...props}
    >
      <MuiAlert
        onClose={onClose}
        severity={severity}
        variant="filled"
        sx={{ width: '100%' }}
      >
        {message}
      </MuiAlert>
    </Snackbar>
  )
}

// Hook para manejar toasts
export const useToast = () => {
  const [toastState, setToastState] = React.useState<{
    open: boolean
    message: string
    severity: 'success' | 'info' | 'warning' | 'error'
  }>({
    open: false,
    message: '',
    severity: 'info'
  })

  const showToast = (
    message: string,
    severity: 'success' | 'info' | 'warning' | 'error' = 'info'
  ) => {
    setToastState({
      open: true,
      message,
      severity
    })
  }

  const hideToast = () => {
    setToastState(prev => ({ ...prev, open: false }))
  }

  const ToastComponent = () => (
    <Toast
      open={toastState.open}
      onClose={hideToast}
      message={toastState.message}
      severity={toastState.severity}
    />
  )

  return {
    showToast,
    hideToast,
    ToastComponent
  }
}

// Alertas predefinidas para casos comunes
export const SuccessAlert: React.FC<Omit<AlertProps, 'severity'>> = (props) => (
  <Alert severity="success" closable autoHide {...props} />
)

export const ErrorAlert: React.FC<Omit<AlertProps, 'severity'>> = (props) => (
  <Alert severity="error" closable {...props} />
)

export const WarningAlert: React.FC<Omit<AlertProps, 'severity'>> = (props) => (
  <Alert severity="warning" closable {...props} />
)

export const InfoAlert: React.FC<Omit<AlertProps, 'severity'>> = (props) => (
  <Alert severity="info" closable {...props} />
)

// Banner de notificación (para la parte superior de la página)
interface BannerProps {
  message: string
  severity?: 'success' | 'info' | 'warning' | 'error'
  action?: React.ReactNode
  onClose?: () => void
  persistent?: boolean
}

export const Banner: React.FC<BannerProps> = ({
  message,
  severity = 'info',
  action,
  onClose,
  persistent = false
}) => {
  const [open, setOpen] = React.useState(true)

  const handleClose = () => {
    setOpen(false)
    onClose?.()
  }

  if (!open) return null

  return (
    <Box
      sx={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        zIndex: (theme) => theme.zIndex.appBar + 1
      }}
    >
      <MuiAlert
        severity={severity}
        sx={{ borderRadius: 0 }}
        action={
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            {action}
            {!persistent && (
              <IconButton
                aria-label="close"
                color="inherit"
                size="small"
                onClick={handleClose}
              >
                <CloseIcon fontSize="inherit" />
              </IconButton>
            )}
          </Box>
        }
      >
        {message}
      </MuiAlert>
    </Box>
  )
}

export default Alert