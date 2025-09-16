/**
 * Error 403 - Forbidden Page
 * Sprint 3 - Error Handling UI
 */

import { Box, Typography, Button, Container, Stack } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { Home, ArrowBack, Lock, ContactSupport } from '@mui/icons-material';
import { useAuthStore } from '@/shared/store/authStore';

export function Error403() {
  const navigate = useNavigate();
  const { user } = useAuthStore();

  const handleGoHome = () => {
    navigate('/');
  };

  const handleGoBack = () => {
    navigate(-1);
  };

  const handleContactSupport = () => {
    // TODO: Implementar contacto con soporte
    window.location.href = 'mailto:soporte@flexxus.com?subject=Solicitud de acceso';
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
        {/* Icono de candado */}
        <Lock
          sx={{
            fontSize: { xs: '4rem', sm: '5rem', md: '6rem' },
            color: 'error.main',
            opacity: 0.8,
            mb: 2
          }}
        />

        {/* Código 403 */}
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
          403
        </Typography>

        {/* Mensaje principal */}
        <Typography
          variant="h4"
          gutterBottom
          sx={{ mt: 2, mb: 1 }}
        >
          Acceso Denegado
        </Typography>

        {/* Descripción */}
        <Typography
          variant="body1"
          color="text.secondary"
          sx={{ mb: 4, maxWidth: 400 }}
        >
          No tienes los permisos necesarios para acceder a este recurso.
          {user && (
            <Typography variant="body2" sx={{ mt: 1 }}>
              Usuario actual: <strong>{user.email}</strong>
            </Typography>
          )}
        </Typography>

        {/* Sugerencias */}
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
            ¿Qué puedes hacer?
          </Typography>
          <Typography variant="body2" color="text.secondary" align="left">
            • Verifica que estás usando la cuenta correcta<br />
            • Solicita acceso a tu administrador<br />
            • Contacta a soporte si crees que es un error
          </Typography>
        </Box>

        {/* Botones de acción */}
        <Stack direction="row" spacing={2} flexWrap="wrap" justifyContent="center">
          <Button
            variant="contained"
            startIcon={<Home />}
            onClick={handleGoHome}
            size="large"
          >
            Ir al inicio
          </Button>

          <Button
            variant="outlined"
            startIcon={<ArrowBack />}
            onClick={handleGoBack}
            size="large"
          >
            Volver atrás
          </Button>

          <Button
            variant="text"
            startIcon={<ContactSupport />}
            onClick={handleContactSupport}
            size="large"
          >
            Contactar soporte
          </Button>
        </Stack>

        {/* Información adicional */}
        <Typography
          variant="caption"
          color="text.secondary"
          sx={{ mt: 4 }}
        >
          Si necesitas acceso urgente, contacta a tu administrador del sistema.
        </Typography>
      </Box>
    </Container>
  );
}

export default Error403;