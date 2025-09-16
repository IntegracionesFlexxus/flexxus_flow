/**
 * Error 500 - Internal Server Error Page
 * Sprint 3 - Error Handling UI
 */

import { Box, Typography, Button, Container, Stack, Chip } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { Home, Refresh, BugReport, ContentCopy } from '@mui/icons-material';
import { useState, useEffect } from 'react';
import { observabilityService } from '@/shared/services/observabilityService';
import { notify } from '@/shared/store/uiStore';

interface Error500Props {
  errorId?: string;
  message?: string;
  timestamp?: Date;
}

export function Error500({ errorId, message, timestamp }: Error500Props) {
  const navigate = useNavigate();
  const [isRetrying, setIsRetrying] = useState(false);
  const [retryCount, setRetryCount] = useState(0);
  
  // Generar ID de error si no se proporciona
  const errorReference = errorId || `ERR_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  const errorTime = timestamp || new Date();

  useEffect(() => {
    // Log error en observability
    observabilityService.log('error', 'Error 500 page displayed', {
      errorId: errorReference,
      message,
      url: window.location.href
    });
  }, [errorReference, message]);

  const handleRetry = async () => {
    setIsRetrying(true);
    setRetryCount(prev => prev + 1);

    // Simular retry
    await new Promise(resolve => setTimeout(resolve, 1500));

    // Intentar recargar la página anterior
    if (retryCount < 2) {
      window.location.reload();
    } else {
      notify.error('El problema persiste. Por favor, contacta a soporte.');
      setIsRetrying(false);
    }
  };

  const handleGoHome = () => {
    navigate('/');
  };

  const copyErrorId = () => {
    navigator.clipboard.writeText(errorReference);
    notify.success('ID de error copiado al portapapeles');
  };

  return (
    <Container maxWidth="sm">
      <Box
        sx={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: '100vh',
          textAlign: 'center',
          py: 4
        }}
      >
        {/* Icono de error */}
        <BugReport
          sx={{
            fontSize: { xs: '4rem', sm: '5rem', md: '6rem' },
            color: 'error.main',
            opacity: 0.8,
            mb: 2
          }}
        />

        {/* Código 500 */}
        <Typography
          variant="h1"
          sx={{
            fontSize: { xs: '3rem', sm: '4rem', md: '5rem' },
            fontWeight: 'bold',
            color: 'text.secondary',
            opacity: 0.3,
            lineHeight: 1
          }}
        >
          500
        </Typography>

        {/* Mensaje principal */}
        <Typography
          variant="h4"
          gutterBottom
          sx={{ mt: 2, mb: 1 }}
        >
          Error del Servidor
        </Typography>

        {/* Descripción */}
        <Typography
          variant="body1"
          color="text.secondary"
          sx={{ mb: 2, maxWidth: 400 }}
        >
          {message || 'Ha ocurrido un error inesperado en el servidor. Nuestro equipo ha sido notificado y está trabajando para solucionarlo.'}
        </Typography>

        {/* ID de error y timestamp */}
        <Stack direction="column" spacing={1} alignItems="center" sx={{ mb: 3 }}>
          <Chip
            label={`ID: ${errorReference}`}
            size="small"
            onDelete={copyErrorId}
            deleteIcon={<ContentCopy fontSize="small" />}
            sx={{ fontFamily: 'monospace' }}
          />
          <Typography variant="caption" color="text.secondary">
            {errorTime.toLocaleString()}
          </Typography>
        </Stack>

        {/* Estado del sistema */}
        <Box
          sx={{
            bgcolor: 'error.main',
            color: 'error.contrastText',
            borderRadius: 1,
            p: 2,
            mb: 3,
            maxWidth: 400,
            width: '100%',
            opacity: 0.9
          }}
        >
          <Typography variant="subtitle2" gutterBottom>
            ¿Qué está pasando?
          </Typography>
          <Typography variant="body2">
            Estamos experimentando dificultades técnicas temporales.
            Por favor, intenta nuevamente en unos minutos.
          </Typography>
        </Box>

        {/* Indicador de reintentos */}
        {retryCount > 0 && (
          <Chip
            label={`Reintentos: ${retryCount}/3`}
            color="warning"
            size="small"
            sx={{ mb: 2 }}
          />
        )}

        {/* Botones de acción */}
        <Stack direction="row" spacing={2} flexWrap="wrap" justifyContent="center">
          <Button
            variant="contained"
            startIcon={<Refresh />}
            onClick={handleRetry}
            disabled={isRetrying || retryCount >= 3}
            size="large"
          >
            {isRetrying ? 'Reintentando...' : 'Reintentar'}
          </Button>

          <Button
            variant="outlined"
            startIcon={<Home />}
            onClick={handleGoHome}
            size="large"
          >
            Ir al inicio
          </Button>
        </Stack>

        {/* Sugerencias adicionales */}
        <Box sx={{ mt: 4, maxWidth: 400 }}>
          <Typography variant="caption" color="text.secondary" display="block">
            Si el problema persiste:
          </Typography>
          <Typography variant="caption" color="text.secondary">
            • Intenta limpiar la caché del navegador (Ctrl+Shift+R)<br />
            • Verifica tu conexión a internet<br />
            • Contacta a soporte con el ID de error: <strong>{errorReference}</strong>
          </Typography>
        </Box>

        {/* Debug info en desarrollo */}
        {import.meta.env.DEV && (
          <Box
            sx={{
              mt: 3,
              p: 2,
              bgcolor: 'grey.100',
              borderRadius: 1,
              maxWidth: 400,
              width: '100%'
            }}
          >
            <Typography variant="caption" sx={{ fontFamily: 'monospace' }}>
              [DEBUG] Error ID: {errorReference}<br />
              [DEBUG] Timestamp: {errorTime.toISOString()}<br />
              [DEBUG] URL: {window.location.href}
            </Typography>
          </Box>
        )}
      </Box>
    </Container>
  );
}

export default Error500;