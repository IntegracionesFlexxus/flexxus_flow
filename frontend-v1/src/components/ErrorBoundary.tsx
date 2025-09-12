import React, { Component, ErrorInfo, ReactNode } from 'react'
import { Box, Typography, Button, Container, Paper, Alert } from '@mui/material'
import { Warning, Refresh } from '@mui/icons-material'

// Error Boundary unificado - Combina las mejores características de ambas versiones
// TODO: En Nivel 2 agregar envío de errores a servicio de logging (Sentry)

interface Props {
  children: ReactNode
  fallback?: ReactNode
  onError?: (error: Error, errorInfo: ErrorInfo) => void
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
    
    // Actualizar estado con información del error
    this.setState({
      error,
      errorInfo
    })
    
    // Callback opcional para manejo personalizado
    this.props.onError?.(error, errorInfo)
    
    // TODO: En Nivel 2 enviar a servicio de logging
    // logErrorToService(error, errorInfo)
  }
  
  handleReset = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null
    })
  }
  
  handleReload = () => {
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
                <Alert 
                  severity="error" 
                  sx={{ 
                    mt: 2,
                    mb: 3,
                    textAlign: 'left',
                    maxHeight: '200px',
                    overflow: 'auto'
                  }}
                >
                  <Typography 
                    variant="caption" 
                    component="div"
                    sx={{ fontFamily: 'monospace', fontWeight: 'bold' }}
                  >
                    {this.state.error.name}: {this.state.error.message}
                  </Typography>
                  {this.state.errorInfo && (
                    <Typography 
                      variant="caption" 
                      component="pre"
                      sx={{ 
                        fontFamily: 'monospace',
                        fontSize: '0.7rem',
                        mt: 1,
                        whiteSpace: 'pre-wrap',
                        wordBreak: 'break-word'
                      }}
                    >
                      {this.state.errorInfo.componentStack}
                    </Typography>
                  )}
                </Alert>
              )}
              
              {/* Botones de acción */}
              <Box sx={{ display: 'flex', gap: 2, justifyContent: 'center' }}>
                <Button
                  variant="contained"
                  startIcon={<Refresh />}
                  onClick={this.handleReload}
                >
                  Recargar página
                </Button>
                
                <Button
                  variant="outlined"
                  onClick={this.handleReset}
                >
                  Intentar de nuevo
                </Button>
              </Box>
            </Paper>
          </Box>
        </Container>
      )
    }
    
    return this.props.children
  }
}

// Hook para usar con componentes funcionales
export const useErrorHandler = () => {
  const [error, setError] = React.useState<Error | null>(null)

  React.useEffect(() => {
    if (error) {
      throw error
    }
  }, [error])

  const resetError = () => setError(null)
  const captureError = (error: Error) => setError(error)

  return { resetError, captureError }
}

export default ErrorBoundary