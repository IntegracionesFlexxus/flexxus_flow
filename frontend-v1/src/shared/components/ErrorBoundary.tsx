import React, { Component, ErrorInfo, ReactNode } from 'react'
import { Box, Typography, Button, Container, Paper } from '@mui/material'
import { Warning, Refresh } from '@mui/icons-material'

// Error Boundary para capturar errores de React - MVP
// TODO: En Nivel 2 agregar envío de errores a servicio de logging

interface Props {
  children: ReactNode
  fallback?: ReactNode
}

interface State {
  hasError: boolean
  error: Error | null
  errorInfo: ErrorInfo | null
}

class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null
    }
  }
  
  static getDerivedStateFromError(error: Error): State {
    // Actualizar el estado para mostrar la UI de error
    return {
      hasError: true,
      error,
      errorInfo: null
    }
  }
  
  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // Log del error para servicios de monitoreo
    console.error('ErrorBoundary capturó:', error, errorInfo)
    
    // TODO: En Nivel 2 enviar a servicio de logging
    // logErrorToService(error, errorInfo)
    
    this.setState({
      error,
      errorInfo
    })
  }
  
  handleReset = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null
    })
    
    // Recargar la página como último recurso
    window.location.reload()
  }
  
  render() {
    if (this.state.hasError) {
      // Si se proporciona un fallback personalizado, usarlo
      if (this.props.fallback) {
        return this.props.fallback
      }
      
      // UI de error por defecto
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
              <Warning 
                sx={{ 
                  fontSize: '4rem',
                  color: 'error.main',
                  opacity: 0.8,
                  mb: 2
                }} 
              />
              
              {/* Mensaje de error */}
              <Typography variant="h5" gutterBottom>
                Algo salió mal
              </Typography>
              
              <Typography 
                variant="body2" 
                color="text.secondary" 
                sx={{ mb: 3 }}
              >
                Ha ocurrido un error inesperado. Por favor, intenta recargar la página.
              </Typography>
              
              {/* Mostrar detalles en desarrollo */}
              {import.meta.env.DEV && this.state.error && (
                <Box 
                  sx={{ 
                    mt: 2,
                    mb: 3,
                    p: 2,
                    bgcolor: 'grey.100',
                    borderRadius: 1,
                    textAlign: 'left',
                    maxHeight: '150px',
                    overflow: 'auto'
                  }}
                >
                  <Typography 
                    variant="caption" 
                    component="div"
                    sx={{ fontFamily: 'monospace', color: 'error.main' }}
                  >
                    {this.state.error.toString()}
                  </Typography>
                  {this.state.errorInfo && (
                    <Typography 
                      variant="caption" 
                      component="pre"
                      sx={{ 
                        fontFamily: 'monospace',
                        fontSize: '0.7rem',
                        mt: 1
                      }}
                    >
                      {this.state.errorInfo.componentStack}
                    </Typography>
                  )}
                </Box>
              )}
              
              {/* Botón de reinicio */}
              <Button
                variant="contained"
                startIcon={<Refresh />}
                onClick={this.handleReset}
              >
                Recargar página
              </Button>
            </Paper>
          </Box>
        </Container>
      )
    }
    
    return this.props.children
  }
}

export default ErrorBoundary