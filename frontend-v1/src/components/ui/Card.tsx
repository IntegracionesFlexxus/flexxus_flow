import React from 'react'
import { 
  Card as MuiCard, 
  CardProps as MuiCardProps,
  CardContent,
  CardActions,
  CardHeader,
  CardMedia,
  Typography,
  Box,
  Skeleton
} from '@mui/material'

// Componente Card mejorado - MVP con estados de carga
// TODO: En Nivel 2 agregar animaciones y más variantes

interface CardProps extends MuiCardProps {
  title?: string
  subtitle?: string
  loading?: boolean
  image?: string
  imageHeight?: number
  actions?: React.ReactNode
  children?: React.ReactNode
  clickable?: boolean
  selected?: boolean
}

export const Card: React.FC<CardProps> = ({
  title,
  subtitle,
  loading = false,
  image,
  imageHeight = 140,
  actions,
  children,
  clickable = false,
  selected = false,
  sx,
  ...props
}) => {
  const cardStyles = {
    ...(clickable && {
      cursor: 'pointer',
      transition: 'all 0.3s ease',
      '&:hover': {
        transform: 'translateY(-4px)',
        boxShadow: 3
      }
    }),
    ...(selected && {
      borderColor: 'primary.main',
      borderWidth: 2,
      borderStyle: 'solid'
    }),
    ...sx
  }

  if (loading) {
    return (
      <MuiCard sx={cardStyles} {...props}>
        {image && <Skeleton variant="rectangular" height={imageHeight} />}
        <CardContent>
          {title && <Skeleton variant="text" width="60%" />}
          {subtitle && <Skeleton variant="text" width="40%" />}
          <Skeleton variant="text" />
          <Skeleton variant="text" />
          <Skeleton variant="text" width="80%" />
        </CardContent>
      </MuiCard>
    )
  }

  return (
    <MuiCard sx={cardStyles} {...props}>
      {image && (
        <CardMedia
          component="img"
          height={imageHeight}
          image={image}
          alt={title}
        />
      )}
      
      {(title || subtitle) && (
        <CardHeader
          title={title}
          subheader={subtitle}
        />
      )}
      
      {children && (
        <CardContent>
          {children}
        </CardContent>
      )}
      
      {actions && (
        <CardActions>
          {actions}
        </CardActions>
      )}
    </MuiCard>
  )
}

// Card de estadísticas predefinida
interface StatCardProps {
  title: string
  value: string | number
  subtitle?: string
  icon?: React.ReactNode
  color?: 'primary' | 'secondary' | 'error' | 'warning' | 'info' | 'success'
  loading?: boolean
  onClick?: () => void
}

export const StatCard: React.FC<StatCardProps> = ({
  title,
  value,
  subtitle,
  icon,
  color = 'primary',
  loading = false,
  onClick
}) => {
  if (loading) {
    return (
      <MuiCard sx={{ cursor: onClick ? 'pointer' : 'default' }}>
        <CardContent>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
            <Skeleton variant="text" width="40%" />
            <Skeleton variant="circular" width={40} height={40} />
          </Box>
          <Skeleton variant="text" width="60%" height={40} />
          <Skeleton variant="text" width="50%" />
        </CardContent>
      </MuiCard>
    )
  }

  return (
    <MuiCard 
      onClick={onClick}
      sx={{ 
        cursor: onClick ? 'pointer' : 'default',
        transition: 'transform 0.2s',
        '&:hover': onClick ? {
          transform: 'translateY(-2px)',
          boxShadow: 2
        } : {}
      }}
    >
      <CardContent>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
          <Typography color="text.secondary" variant="body2">
            {title}
          </Typography>
          {icon && (
            <Box sx={{ color: `${color}.main` }}>
              {icon}
            </Box>
          )}
        </Box>
        <Typography variant="h4" sx={{ color: `${color}.main`, mb: 1 }}>
          {value}
        </Typography>
        {subtitle && (
          <Typography variant="caption" color="text.secondary">
            {subtitle}
          </Typography>
        )}
      </CardContent>
    </MuiCard>
  )
}

// Card simple para información
export const InfoCard: React.FC<CardProps> = (props) => (
  <Card 
    {...props}
    sx={{
      bgcolor: 'info.50',
      borderLeft: 4,
      borderColor: 'info.main',
      ...props.sx
    }}
  />
)

// Re-exportar componentes de MUI para uso consistente
export { CardContent, CardHeader, CardActions, CardMedia } from '@mui/material'

export const CardTitle: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <Typography variant="h6" component="div">
    {children}
  </Typography>
)

export const CardDescription: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <Typography variant="body2" color="text.secondary">
    {children}
  </Typography>
)

export default Card