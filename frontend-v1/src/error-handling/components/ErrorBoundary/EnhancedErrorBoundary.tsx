/**
 * Enhanced Error Boundary - Sprint 3
 * Error Boundary mejorado con logging, retry y diferentes tipos de error
 */

import React, { Component, ErrorInfo, ReactNode } from 'react';
import { Box, Typography, Button, Container, Paper, Stack, Chip } from '@mui/material';
import { Warning, Refresh, BugReport, CloudOff, Block } from '@mui/icons-material';
import { observabilityService } from '@/shared/services/observabilityService';
import { useErrorStore } from '@/error-handling/stores/errorStore';
import { isRecoverableError } from '@/shared/utils/errorHandler';

type ErrorType = 'chunk' | 'network' | 'permission' | 'runtime' | 'unknown';

interface Props {
  children: ReactNode;
  fallback?: (error: Error, retry: () => void) => ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
  isolate?: boolean; // Si true, no propaga el error hacia arriba
  showDetails?: boolean; // Mostrar detalles en producción
  context?: string; // Contexto para logging
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
  errorType: ErrorType;
  retryCount: number;
  isRetrying: boolean;
}

export class EnhancedErrorBoundary extends Component<Props, State> {
  private retryTimeoutId: NodeJS.Timeout | null = null;

  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      errorType: 'unknown',
      retryCount: 0,
      isRetrying: false
    };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    const errorType = EnhancedErrorBoundary.detectErrorType(error);
    
    return {
      hasError: true,
      error,
      errorType
    };
  }

  static detectErrorType(error: Error): ErrorType {
    const message = error.message.toLowerCase();
    const name = error.name.toLowerCase();

    // Error de chunk/lazy loading
    if (
      message.includes('loading chunk') ||
      message.includes('failed to fetch dynamically imported module') ||
      name.includes('chunkloaderror')
    ) {
      return 'chunk';
    }

    // Error de red
    if (
      message.includes('network') ||
      message.includes('fetch') ||
      name.includes('networkerror')
    ) {
      return 'network';
    }

    // Error de permisos
    if (
      message.includes('permission') ||
      message.includes('unauthorized') ||
      message.includes('forbidden')
    ) {
      return 'permission';
    }

    // Error de runtime
    if (
      name.includes('typeerror') ||
      name.includes('referenceerror') ||
      name.includes('syntaxerror')
    ) {
      return 'runtime';
    }

    return 'unknown';
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // Log en observability service
    observabilityService.captureError(error, {
      ...errorInfo,
      context: this.props.context,
      errorBoundary: true,
      retryCount: this.state.retryCount
    });

    // Agregar al error store
    const errorStore = useErrorStore.getState();
    errorStore.addError(error, this.props.context || 'ErrorBoundary');

    // Callback opcional
    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }

    this.setState({
      error,
      errorInfo
    });

    // Auto-retry para errores de chunk después de 2 segundos
    if (this.state.errorType === 'chunk' && this.state.retryCount < 3) {
      this.retryTimeoutId = setTimeout(() => {
        this.handleRetry();
      }, 2000);
    }
  }

  componentWillUnmount() {
    if (this.retryTimeoutId) {
      clearTimeout(this.retryTimeoutId);
    }
  }

  handleRetry = async () => {
    this.setState({ isRetrying: true });

    // Limpiar cache de módulos si es error de chunk
    if (this.state.errorType === 'chunk') {
      // Recargar módulos dinámicos
      if ('caches' in window) {
        try {
          const names = await caches.keys();
          await Promise.all(names.map(name => caches.delete(name)));
        } catch (e) {
          console.error('Error clearing caches:', e);
        }
      }
    }

    // Pequeño delay para feedback visual
    setTimeout(() => {
      this.setState(prevState => ({
        hasError: false,
        error: null,
        errorInfo: null,
        retryCount: prevState.retryCount + 1,
        isRetrying: false
      }));
    }, 500);
  };

  handleReload = () => {
    window.location.reload();
  };

  renderErrorUI() {
    const { error, errorType, retryCount, isRetrying } = this.state;
    const { fallback, showDetails } = this.props;

    // Si hay fallback personalizado, usarlo
    if (fallback && error) {
      return fallback(error, this.handleRetry);
    }

    // Determinar icono y colores según tipo de error
    const getErrorIcon = () => {
      switch (errorType) {
        case 'chunk':
          return <CloudOff sx={{ fontSize: '4rem', color: 'warning.main' }} />;
        case 'network':
          return <CloudOff sx={{ fontSize: '4rem', color: 'info.main' }} />;
        case 'permission':
          return <Block sx={{ fontSize: '4rem', color: 'error.main' }} />;
        case 'runtime':
          return <BugReport sx={{ fontSize: '4rem', color: 'error.main' }} />;
        default:
          return <Warning sx={{ fontSize: '4rem', color: 'error.main' }} />;
      }
    };

    const getErrorMessage = () => {
      switch (errorType) {
        case 'chunk':
          return 'Error al cargar recursos de la aplicación';
        case 'network':
          return 'Error de conexión';
        case 'permission':
          return 'No tienes permisos para acceder a este recurso';
        case 'runtime':
          return 'Ha ocurrido un error en la aplicación';
        default:
          return 'Algo salió mal';
      }
    };

    const getErrorDescription = () => {
      switch (errorType) {
        case 'chunk':
          return 'Puede ser necesario limpiar la caché del navegador o recargar la página.';
        case 'network':
          return 'Verifica tu conexión a internet e intenta nuevamente.';
        case 'permission':
          return 'Contacta a tu administrador si crees que deberías tener acceso.';
        case 'runtime':
          return 'Hemos registrado el error y estamos trabajando para solucionarlo.';
        default:
          return 'Por favor, intenta recargar la página o contacta a soporte si el problema persiste.';
      }
    };

    const isRecoverable = error ? isRecoverableError(error) : true;

    return (
      <Container maxWidth="sm">
        <Box
          sx={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            minHeight: '100vh',
            py: 4
          }}
        >
          <Paper
            elevation={3}
            sx={{
              p: 4,
              textAlign: 'center',
              width: '100%',
              position: 'relative'
            }}
          >
            {/* Indicador de reintentos */}
            {retryCount > 0 && (
              <Chip
                label={`Reintento ${retryCount}/3`}
                size="small"
                color="warning"
                sx={{ position: 'absolute', top: 16, right: 16 }}
              />
            )}

            {/* Icono según tipo de error */}
            {getErrorIcon()}

            {/* Mensaje principal */}
            <Typography variant="h5" gutterBottom sx={{ mt: 2 }}>
              {getErrorMessage()}
            </Typography>

            {/* Descripción */}
            <Typography
              variant="body2"
              color="text.secondary"
              sx={{ mb: 3 }}
            >
              {getErrorDescription()}
            </Typography>

            {/* Detalles del error (desarrollo o si showDetails es true) */}
            {(import.meta.env.DEV || showDetails) && error && (
              <Box
                sx={{
                  mt: 2,
                  mb: 3,
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
                  component="div"
                  sx={{ fontFamily: 'monospace', color: 'error.main' }}
                >
                  {error.toString()}
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
              </Box>
            )}

            {/* Botones de acción */}
            <Stack direction="row" spacing={2} justifyContent="center">
              {isRecoverable && retryCount < 3 && (
                <Button
                  variant="contained"
                  startIcon={<Refresh />}
                  onClick={this.handleRetry}
                  disabled={isRetrying}
                >
                  {isRetrying ? 'Reintentando...' : 'Reintentar'}
                </Button>
              )}
              
              <Button
                variant={isRecoverable ? 'outlined' : 'contained'}
                onClick={this.handleReload}
              >
                Recargar página
              </Button>
            </Stack>

            {/* Información adicional */}
            {errorType === 'chunk' && (
              <Typography
                variant="caption"
                color="text.secondary"
                sx={{ mt: 2, display: 'block' }}
              >
                Tip: Si el problema persiste, intenta limpiar la caché del navegador (Ctrl+Shift+R)
              </Typography>
            )}
          </Paper>
        </Box>
      </Container>
    );
  }

  render() {
    if (this.state.hasError) {
      // Si isolate es true, renderizar error UI sin propagar
      if (this.props.isolate) {
        return this.renderErrorUI();
      }

      // Propagar error si no es recuperable
      if (this.state.error && !isRecoverableError(this.state.error)) {
        throw this.state.error;
      }

      return this.renderErrorUI();
    }

    return this.props.children;
  }
}

export default EnhancedErrorBoundary;