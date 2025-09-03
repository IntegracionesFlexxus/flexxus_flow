import React from 'react'
import {
  CircularProgress,
  LinearProgress,
  Box,
  Typography,
  Backdrop,
  Skeleton,
  Stack
} from '@mui/material'

// Componentes de carga - MVP con varias opciones
// TODO: En Nivel 2 agregar animaciones personalizadas

interface LoadingProps {
  size?: number | string
  color?: 'primary' | 'secondary' | 'error' | 'info' | 'success' | 'warning' | 'inherit'
  thickness?: number
}

// Spinner circular básico
export const Spinner: React.FC<LoadingProps> = ({
  size = 40,
  color = 'primary',
  thickness = 3.6
}) => {
  return (
    <CircularProgress
      size={size}
      color={color}
      thickness={thickness}
    />
  )
}

// Loading centrado en contenedor
interface CenteredLoadingProps extends LoadingProps {
  minHeight?: string | number
  message?: string
}

export const CenteredLoading: React.FC<CenteredLoadingProps> = ({
  minHeight = '200px',
  message,
  ...props
}) => {
  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight,
        gap: 2
      }}
    >
      <Spinner {...props} />
      {message && (
        <Typography variant="body2" color="text.secondary">
          {message}
        </Typography>
      )}
    </Box>
  )
}

// Loading de página completa
interface PageLoadingProps extends LoadingProps {
  message?: string
}

export const PageLoading: React.FC<PageLoadingProps> = ({
  message = 'Cargando...',
  ...props
}) => {
  return (
    <Box
      sx={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 3,
        bgcolor: 'background.default',
        zIndex: 9999
      }}
    >
      <Spinner size={60} {...props} />
      <Typography variant="h6" color="text.secondary">
        {message}
      </Typography>
    </Box>
  )
}

// Loading overlay (backdrop)
interface LoadingOverlayProps extends LoadingProps {
  open: boolean
  message?: string
  transparent?: boolean
}

export const LoadingOverlay: React.FC<LoadingOverlayProps> = ({
  open,
  message,
  transparent = false,
  ...props
}) => {
  return (
    <Backdrop
      sx={{
        color: '#fff',
        zIndex: (theme) => theme.zIndex.drawer + 1,
        backgroundColor: transparent ? 'rgba(0, 0, 0, 0.3)' : 'rgba(0, 0, 0, 0.7)',
        flexDirection: 'column',
        gap: 2
      }}
      open={open}
    >
      <Spinner color="inherit" size={50} {...props} />
      {message && (
        <Typography variant="body1" color="inherit">
          {message}
        </Typography>
      )}
    </Backdrop>
  )
}

// Barra de progreso
interface ProgressBarProps {
  value?: number
  variant?: 'determinate' | 'indeterminate' | 'buffer' | 'query'
  color?: 'primary' | 'secondary' | 'error' | 'info' | 'success' | 'warning' | 'inherit'
  height?: number
  showLabel?: boolean
}

export const ProgressBar: React.FC<ProgressBarProps> = ({
  value,
  variant = 'indeterminate',
  color = 'primary',
  height = 4,
  showLabel = false
}) => {
  return (
    <Box sx={{ width: '100%' }}>
      <LinearProgress
        variant={variant}
        value={value}
        color={color}
        sx={{ height }}
      />
      {showLabel && value !== undefined && (
        <Box sx={{ mt: 1, textAlign: 'center' }}>
          <Typography variant="body2" color="text.secondary">
            {`${Math.round(value)}%`}
          </Typography>
        </Box>
      )}
    </Box>
  )
}

// Skeleton loader para contenido
interface ContentSkeletonProps {
  lines?: number
  showAvatar?: boolean
  showImage?: boolean
}

export const ContentSkeleton: React.FC<ContentSkeletonProps> = ({
  lines = 3,
  showAvatar = false,
  showImage = false
}) => {
  return (
    <Stack spacing={1}>
      {showAvatar && (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <Skeleton variant="circular" width={40} height={40} />
          <Box sx={{ flex: 1 }}>
            <Skeleton variant="text" width="60%" />
            <Skeleton variant="text" width="40%" />
          </Box>
        </Box>
      )}
      
      {showImage && (
        <Skeleton variant="rectangular" height={200} />
      )}
      
      <Skeleton variant="text" sx={{ fontSize: '1.5rem' }} width="40%" />
      
      {Array.from({ length: lines }).map((_, index) => (
        <Skeleton
          key={index}
          variant="text"
          width={index === lines - 1 ? "80%" : "100%"}
        />
      ))}
    </Stack>
  )
}

// Componente de carga inline (para botones, inputs, etc)
export const InlineLoading: React.FC<LoadingProps> = ({
  size = 20,
  ...props
}) => {
  return (
    <Box sx={{ display: 'inline-flex', alignItems: 'center', gap: 1 }}>
      <Spinner size={size} {...props} />
    </Box>
  )
}

export default {
  Spinner,
  CenteredLoading,
  PageLoading,
  LoadingOverlay,
  ProgressBar,
  ContentSkeleton,
  InlineLoading
}