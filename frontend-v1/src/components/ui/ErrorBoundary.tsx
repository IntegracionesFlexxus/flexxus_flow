import React, { Component, ErrorInfo, ReactNode } from 'react';
import { Box, Typography, Button, Container, Alert } from '@mui/material';
import { AlertTriangle, RefreshCw } from 'lucide-react';

// Error Boundary para capturar errores - MVP Nivel 1
// TODO: En Nivel 2 agregar logging a servicio externo (Sentry)

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
    };
  }

  static getDerivedStateFromError(error: Error): State {
    // Actualizar estado para mostrar UI de error
    return {
      hasError: true,
      error,
      errorInfo: null,
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // Log del error
    console.error('Error capturado por ErrorBoundary:', error, errorInfo);
    
    // Actualizar estado con información del error
    this.setState({
      error,
      errorInfo,
    });
    
    // Callback opcional para manejo personalizado
    this.props.onError?.(error, errorInfo);
    
    // TODO: En Nivel 2 enviar a servicio de logging
    // logErrorToService(error, errorInfo);
  }

  handleReset = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
    });
    
    // Recargar la página como último recurso
    // window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      // Si se proporciona un fallback personalizado, usarlo
      if (this.props.fallback) {
        return <>{this.props.fallback}</>;
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
              minHeight: '400px',
              textAlign: 'center',
              py: 4,
            }}
          >
            <AlertTriangle size={64} color="#f44336" />
            
            <Typography variant="h4" sx={{ mt: 2, mb: 1 }}>
              ¡Ups! Algo salió mal
            </Typography>
            
            <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
              Ha ocurrido un error inesperado. Por favor, intenta recargar la página.
            </Typography>
            
            {/* Mostrar detalles del error en desarrollo */}
            {process.env.NODE_ENV === 'development' && this.state.error && (
              <Alert severity="error" sx={{ width: '100%', mb: 3, textAlign: 'left' }}>
                <Typography variant="subtitle2" sx={{ fontWeight: 'bold' }}>
                  {this.state.error.name}: {this.state.error.message}
                </Typography>
                {this.state.errorInfo && (
                  <Typography 
                    variant="caption" 
                    component="pre" 
                    sx={{ 
                      mt: 1,
                      whiteSpace: 'pre-wrap',
                      wordBreak: 'break-word',
                      fontFamily: 'monospace',
                    }}
                  >
                    {this.state.errorInfo.componentStack}
                  </Typography>
                )}
              </Alert>
            )}
            
            <Box sx={{ display: 'flex', gap: 2 }}>
              <Button
                variant="contained"
                startIcon={<RefreshCw size={20} />}
                onClick={() => window.location.reload()}
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
          </Box>
        </Container>
      );
    }

    return this.props.children;
  }
}

// Hook para usar con componentes funcionales
export const useErrorHandler = () => {
  const [error, setError] = React.useState<Error | null>(null);

  React.useEffect(() => {
    if (error) {
      throw error;
    }
  }, [error]);

  const resetError = () => setError(null);
  const captureError = (error: Error) => setError(error);

  return { resetError, captureError };
};

// Componente de Error para rutas
export const RouteError: React.FC = () => {
  return (
    <Container maxWidth="sm">
      <Box
        sx={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: '60vh',
          textAlign: 'center',
        }}
      >
        <Typography variant="h1" sx={{ fontSize: '6rem', fontWeight: 'bold', color: 'text.secondary' }}>
          404
        </Typography>
        
        <Typography variant="h5" sx={{ mt: 2, mb: 1 }}>
          Página no encontrada
        </Typography>
        
        <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
          La página que estás buscando no existe o ha sido movida.
        </Typography>
        
        <Button
          variant="contained"
          onClick={() => window.location.href = '/'}
        >
          Volver al inicio
        </Button>
      </Box>
    </Container>
  );
};

export default ErrorBoundary;