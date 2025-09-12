/**
 * Error 503 - Service Unavailable Page
 * Sprint 3 - Error Handling UI
 */

import { Box, Typography, Button, Container, Stack, LinearProgress } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { Home, Refresh, CloudOff, Schedule } from '@mui/icons-material';
import { useState, useEffect } from 'react';
import { observabilityService } from '@/shared/services/observabilityService';

interface Error503Props {
  retryAfter?: number; // Segundos hasta el próximo intento
  maintenanceMode?: boolean;
  estimatedTime?: string;
}

export function Error503({ 
  retryAfter = 30, 
  maintenanceMode = false,
  estimatedTime 
}: Error503Props) {
  const navigate = useNavigate();
  const [timeRemaining, setTimeRemaining] = useState(retryAfter);
  const [isAutoRetrying, setIsAutoRetrying] = useState(!maintenanceMode);

  useEffect(() => {
    // Log del error
    observabilityService.log('warn', 'Service unavailable', {
      maintenanceMode,
      retryAfter,
      url: window.location.href
    });
  }, [maintenanceMode, retryAfter]);

  useEffect(() => {
    if (!isAutoRetrying || timeRemaining <= 0) return;

    const timer = setInterval(() => {
      setTimeRemaining(prev => {
        if (prev <= 1) {
          // Auto-retry
          window.location.reload();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [isAutoRetrying, timeRemaining]);

  const handleManualRetry = () => {
    window.location.reload();
  };

  const handleGoHome = () => {
    navigate('/');
  };

  const handleCancelAutoRetry = () => {
    setIsAutoRetrying(false);
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return mins > 0 ? `${mins}m ${secs}s` : `${secs}s`;
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
        {/* Icono según modo */}
        {maintenanceMode ? (
          <Schedule
            sx={{
              fontSize: { xs: '4rem', sm: '5rem', md: '6rem' },
              color: 'warning.main',
              opacity: 0.8,
              mb: 2
            }}
          />
        ) : (
          <CloudOff
            sx={{
              fontSize: { xs: '4rem', sm: '5rem', md: '6rem' },
              color: 'info.main',
              opacity: 0.8,
              mb: 2
            }}
          />
        )}

        {/* Código 503 */}
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
          503
        </Typography>

        {/* Mensaje principal */}
        <Typography
          variant="h4"
          gutterBottom
          sx={{ mt: 2, mb: 1 }}
        >
          {maintenanceMode ? 'Sistema en Mantenimiento' : 'Servicio No Disponible'}
        </Typography>

        {/* Descripción */}
        <Typography
          variant="body1"
          color="text.secondary"
          sx={{ mb: 3, maxWidth: 400 }}
        >
          {maintenanceMode 
            ? 'Estamos realizando mejoras en el sistema. Volveremos pronto.'
            : 'El servicio está temporalmente sobrecargado o en mantenimiento.'
          }
        </Typography>

        {/* Tiempo estimado si está en mantenimiento */}
        {maintenanceMode && estimatedTime && (
          <Box
            sx={{
              bgcolor: 'warning.main',
              color: 'warning.contrastText',
              borderRadius: 1,
              p: 2,
              mb: 3,
              maxWidth: 400,
              width: '100%'
            }}
          >
            <Typography variant="subtitle2" gutterBottom>
              Tiempo estimado de retorno
            </Typography>
            <Typography variant="h6">
              {estimatedTime}
            </Typography>
          </Box>
        )}

        {/* Progress bar y auto-retry */}
        {!maintenanceMode && isAutoRetrying && timeRemaining > 0 && (
          <Box sx={{ width: '100%', maxWidth: 400, mb: 3 }}>
            <Typography variant="body2" color="text.secondary" gutterBottom>
              Reintentando automáticamente en {formatTime(timeRemaining)}
            </Typography>
            <LinearProgress 
              variant="determinate" 
              value={((retryAfter - timeRemaining) / retryAfter) * 100}
              sx={{ height: 8, borderRadius: 1 }}
            />
            <Button
              size="small"
              onClick={handleCancelAutoRetry}
              sx={{ mt: 1 }}
            >
              Cancelar auto-retry
            </Button>
          </Box>
        )}

        {/* Información del estado */}
        <Box
          sx={{
            bgcolor: 'background.paper',
            borderRadius: 1,
            p: 2,
            mb: 3,
            border: 1,
            borderColor: 'divider',
            maxWidth: 400,
            width: '100%'
          }}
        >
          <Typography variant="subtitle2" gutterBottom>
            Estado del Sistema
          </Typography>
          <Stack spacing={1} alignItems="flex-start">
            <Typography variant="body2" color="text.secondary">
              • API: {maintenanceMode ? '🟡 Mantenimiento' : '🔴 No disponible'}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              • Base de datos: {maintenanceMode ? '🟡 Mantenimiento' : '⚪ Desconocido'}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              • Servicios: {maintenanceMode ? '🟡 Pausados' : '🔴 Limitados'}
            </Typography>
          </Stack>
        </Box>

        {/* Botones de acción */}
        <Stack direction="row" spacing={2} flexWrap="wrap" justifyContent="center">
          {!maintenanceMode && (
            <Button
              variant="contained"
              startIcon={<Refresh />}
              onClick={handleManualRetry}
              disabled={isAutoRetrying}
              size="large"
            >
              Reintentar ahora
            </Button>
          )}

          <Button
            variant={maintenanceMode ? 'contained' : 'outlined'}
            startIcon={<Home />}
            onClick={handleGoHome}
            size="large"
          >
            Ir al inicio
          </Button>
        </Stack>

        {/* Sugerencias */}
        <Box sx={{ mt: 4, maxWidth: 400 }}>
          <Typography variant="caption" color="text.secondary" display="block">
            Mientras tanto, puedes:
          </Typography>
          <Typography variant="caption" color="text.secondary">
            • Revisar el estado del sistema en nuestra página de status<br />
            • Seguirnos en redes sociales para actualizaciones<br />
            • Contactar a soporte si es urgente
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
              [DEBUG] Maintenance: {maintenanceMode ? 'Yes' : 'No'}<br />
              [DEBUG] Retry After: {retryAfter}s<br />
              [DEBUG] Auto Retry: {isAutoRetrying ? 'Yes' : 'No'}
            </Typography>
          </Box>
        )}
      </Box>
    </Container>
  );
}

export default Error503;