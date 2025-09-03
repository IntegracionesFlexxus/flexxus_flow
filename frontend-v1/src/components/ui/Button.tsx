import React from 'react'
import { Button as MuiButton, ButtonProps as MuiButtonProps, CircularProgress } from '@mui/material'

// Componente Button extendido - MVP con loading state
// TODO: En Nivel 2 agregar más variantes y animaciones

interface ButtonProps extends Omit<MuiButtonProps, 'startIcon' | 'endIcon'> {
  loading?: boolean
  icon?: React.ReactNode
  iconPosition?: 'start' | 'end'
}

export const Button: React.FC<ButtonProps> = ({
  loading = false,
  icon,
  iconPosition = 'start',
  children,
  disabled,
  size = 'medium',
  ...props
}) => {
  const isDisabled = disabled || loading
  
  // Determinar tamaño del spinner según el tamaño del botón
  const spinnerSize = size === 'small' ? 16 : size === 'large' ? 24 : 20
  
  const startIcon = loading ? (
    <CircularProgress size={spinnerSize} color="inherit" />
  ) : (
    iconPosition === 'start' ? icon : undefined
  )
  
  const endIcon = loading ? undefined : (
    iconPosition === 'end' ? icon : undefined
  )

  return (
    <MuiButton
      {...props}
      size={size}
      disabled={isDisabled}
      startIcon={startIcon}
      endIcon={endIcon}
    >
      {children}
    </MuiButton>
  )
}

// Exportar variantes predefinidas para uso rápido
export const PrimaryButton: React.FC<ButtonProps> = (props) => (
  <Button variant="contained" color="primary" {...props} />
)

export const SecondaryButton: React.FC<ButtonProps> = (props) => (
  <Button variant="outlined" color="primary" {...props} />
)

export const DangerButton: React.FC<ButtonProps> = (props) => (
  <Button variant="contained" color="error" {...props} />
)

export const SuccessButton: React.FC<ButtonProps> = (props) => (
  <Button variant="contained" color="success" {...props} />
)

export default Button