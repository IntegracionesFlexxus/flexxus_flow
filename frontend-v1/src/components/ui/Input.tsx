import React from 'react'
import { TextField, TextFieldProps, InputAdornment } from '@mui/material'
import { Visibility, VisibilityOff } from '@mui/icons-material'
import { IconButton } from '@mui/material'

// Componente Input básico - MVP con soporte para contraseñas
// TODO: En Nivel 2 agregar máscaras, validación en tiempo real

interface InputProps extends Omit<TextFieldProps, 'variant'> {
  icon?: React.ReactNode
  iconPosition?: 'start' | 'end'
}

export const Input: React.FC<InputProps> = ({
  icon,
  iconPosition = 'start',
  ...props
}) => {
  // Construir InputProps si hay icono
  const inputProps = icon ? {
    [iconPosition === 'start' ? 'startAdornment' : 'endAdornment']: (
      <InputAdornment position={iconPosition}>
        {icon}
      </InputAdornment>
    )
  } : undefined

  return (
    <TextField
      variant="outlined"
      fullWidth
      margin="normal"
      {...props}
      InputProps={{
        ...inputProps,
        ...props.InputProps
      }}
    />
  )
}

// Componente de Input para contraseñas con toggle de visibilidad
interface PasswordInputProps extends Omit<InputProps, 'type'> {
  showPassword?: boolean
  onTogglePassword?: () => void
}

export const PasswordInput: React.FC<PasswordInputProps> = ({
  showPassword: externalShowPassword,
  onTogglePassword,
  ...props
}) => {
  // Estado interno si no se controla externamente
  const [internalShowPassword, setInternalShowPassword] = React.useState(false)
  
  const showPassword = externalShowPassword !== undefined 
    ? externalShowPassword 
    : internalShowPassword
    
  const handleToggle = () => {
    if (onTogglePassword) {
      onTogglePassword()
    } else {
      setInternalShowPassword(!internalShowPassword)
    }
  }

  return (
    <TextField
      {...props}
      type={showPassword ? 'text' : 'password'}
      variant="outlined"
      fullWidth
      margin="normal"
      InputProps={{
        ...props.InputProps,
        endAdornment: (
          <InputAdornment position="end">
            <IconButton
              aria-label="toggle password visibility"
              onClick={handleToggle}
              edge="end"
              size="small"
            >
              {showPassword ? <VisibilityOff /> : <Visibility />}
            </IconButton>
          </InputAdornment>
        ),
      }}
    />
  )
}

// Input de búsqueda predefinido
export const SearchInput: React.FC<InputProps> = (props) => (
  <Input
    placeholder="Buscar..."
    {...props}
    InputProps={{
      ...props.InputProps,
      sx: {
        borderRadius: 2,
        ...props.InputProps?.sx
      }
    }}
  />
)

export default Input