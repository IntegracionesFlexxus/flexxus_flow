import { Box, Typography, Button, Container, Paper } from '@mui/material'
import { useNavigate, useRouteError } from 'react-router-dom'
import { Warning, Refresh, Home } from '@mui/icons-material'

// Página de error genérica - MVP para manejo de errores
// TODO: En Nivel 2 agregar reporte de errores y logging

function ErrorPage() {
  const navigate = useNavigate()
  const error = useRouteError() as any
  
  // Determinar mensaje de error
  const getErrorMessage = () => {
    if (error?.statusText) return error.statusText
    if (error?.message) return error.message
    return 'Ha ocurrido un error inesperado'
  }
  
  const handleRefresh = () => {
    window.location.reload()
  }
  
  return (
    <Container maxWidth="sm">
      <Box 
        sx={{ 
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: '100vh'
        }}
      >
        <Paper 
          elevation={3} 
          sx={{ 
            p: 4, 
            textAlign: 'center',
            width: '100%'
          }}
        >
          {/* Icono de error */}
          <Box 
            sx={{ 
              display: 'flex',
              justifyContent: 'center',
              mb: 3
            }}
          >
            <Warning 
              sx={{ 
                fontSize: '4rem',
                color: 'error.main',
                opacity: 0.8
              }} 
            />
          </Box>
          
          {/* Título */}
          <Typography variant="h4" gutterBottom>
            ¡Oops! Algo salió mal
          </Typography>
          
          {/* Mensaje de error */}
          <Typography 
            variant="body1" 
            color="text.secondary" 
            sx={{ mb: 1 }}
          >
            {getErrorMessage()}
          </Typography>
          
          {/* Detalles técnicos en desarrollo */}
          {import.meta.env.DEV && error?.stack && (
            <Box 
              sx={{ 
                mt: 2,
                p: 2,
                bgcolor: 'grey.100',
                borderRadius: 1,
                textAlign: 'left',
                maxHeight: '200px',
                overflow: 'auto'
              }}
            >
              <Typography 
                variant="caption" 
                component="pre"
                sx={{ fontFamily: 'monospace' }}
              >
                {error.stack}
              </Typography>
            </Box>
          )}
          
          {/* Botones de acción */}
          <Box 
            sx={{ 
              display: 'flex', 
              gap: 2, 
              justifyContent: 'center',
              mt: 4 
            }}
          >
            <Button
              variant="contained"
              startIcon={<Refresh />}
              onClick={handleRefresh}
            >
              Reintentar
            </Button>
            
            <Button
              variant="outlined"
              startIcon={<Home />}
              onClick={() => navigate('/')}
            >
              Ir al inicio
            </Button>
          </Box>
          
          {/* Información de contacto */}
          <Typography 
            variant="caption" 
            color="text.secondary" 
            sx={{ mt: 3, display: 'block' }}
          >
            Si el problema persiste, contacta a soporte técnico
          </Typography>
        </Paper>
      </Box>
    </Container>
  )
}

export default ErrorPage