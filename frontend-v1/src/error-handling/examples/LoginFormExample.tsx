/**
 * Login Form Example - Sprint 3
 * Ejemplo de integración del sistema de Error Handling UI
 * Demuestra: validación de formularios, manejo de errores, retry mechanism
 */

import { useState } from 'react';
import {
  Box,
  TextField,
  Button,
  Paper,
  Typography,
  Alert,
  Stack
} from '@mui/material';
import { Login, Email, Lock } from '@mui/icons-material';
import { useFormValidation } from '@/error-handling/hooks/useFormValidation';
import { useErrorHandler } from '@/error-handling/hooks/useErrorHandler';
import { RetryButton } from '@/error-handling/components/RetryButton/RetryButton';
import { useAuthStore } from '@/shared/store/authStore';
import { useNavigate } from 'react-router-dom';
import { notify } from '@/shared/store/uiStore';

export function LoginFormExample() {
  const navigate = useNavigate();
  const { login } = useAuthStore();
  const { handleError, handleAsync } = useErrorHandler();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [loginError, setLoginError] = useState<string | null>(null);

  // Configuración de validación del formulario
  const {
    fieldStates,
    getFieldProps,
    validateAll,
    isValid,
    setError
  } = useFormValidation({
    fields: {
      email: {
        required: true,
        email: true,
        custom: [
          {
            validate: (value) => {
              // Ejemplo: bloquear dominios no permitidos
              const blockedDomains = ['temp-mail.com', 'guerrillamail.com'];
              const domain = value.split('@')[1];
              return !blockedDomains.includes(domain);
            },
            message: 'Por favor usa un email corporativo válido'
          }
        ]
      },
      password: {
        required: true,
        minLength: 8,
        custom: [
          {
            validate: (value) => {
              // Validación de complejidad
              const hasUpperCase = /[A-Z]/.test(value);
              const hasLowerCase = /[a-z]/.test(value);
              const hasNumbers = /\d/.test(value);
              const hasSpecialChar = /[!@#$%^&*]/.test(value);
              
              return hasUpperCase && hasLowerCase && hasNumbers && hasSpecialChar;
            },
            message: 'La contraseña debe contener mayúsculas, minúsculas, números y caracteres especiales'
          }
        ]
      }
    },
    mode: 'onBlur',
    debounceMs: 500
  });

  // Función de login con retry
  const handleLogin = async () => {
    setLoginError(null);
    
    // Validar formulario
    const isFormValid = await validateAll();
    if (!isFormValid) {
      notify.warning('Por favor corrige los errores del formulario');
      return;
    }

    setIsSubmitting(true);

    try {
      // Simular llamada a API con posible error
      const result = await handleAsync(
        async () => {
          // Simular delay de red
          await new Promise(resolve => setTimeout(resolve, 1000));
          
          // Simular diferentes escenarios de error (para demo)
          const random = Math.random();
          if (random < 0.3) {
            throw new Error('Credenciales inválidas');
          } else if (random < 0.4) {
            throw new Error('Servicio temporalmente no disponible');
          }
          
          // Login exitoso
          return await login(
            fieldStates.email.value,
            fieldStates.password.value
          );
        },
        {
          context: 'Login',
          retry: async () => {
            // Función de retry
            return await login(
              fieldStates.email.value,
              fieldStates.password.value
            );
          },
          autoRetry: true,
          maxRetries: 3
        }
      );

      if (result) {
        notify.success('¡Bienvenido de vuelta!');
        navigate('/dashboard');
      }
    } catch (error) {
      const errorResult = handleError(error, {
        context: 'Login',
        silent: true
      });
      
      setLoginError(errorResult.message);
      
      // Errores específicos de validación
      if (errorResult.code === 'VALIDATION_ERROR' && errorResult.details) {
        if (errorResult.details.email) {
          setError('email', errorResult.details.email);
        }
        if (errorResult.details.password) {
          setError('password', errorResult.details.password);
        }
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Box
      sx={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        bgcolor: 'background.default'
      }}
    >
      <Paper
        elevation={3}
        sx={{
          p: 4,
          maxWidth: 400,
          width: '100%'
        }}
      >
        <Stack spacing={3}>
          {/* Header */}
          <Box textAlign="center">
            <Login sx={{ fontSize: 48, color: 'primary.main', mb: 2 }} />
            <Typography variant="h4" gutterBottom>
              Iniciar Sesión
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Ejemplo con Error Handling UI
            </Typography>
          </Box>

          {/* Error general */}
          {loginError && (
            <Alert severity="error" onClose={() => setLoginError(null)}>
              {loginError}
            </Alert>
          )}

          {/* Campo Email */}
          <TextField
            {...getFieldProps('email')}
            label="Email"
            type="email"
            fullWidth
            autoComplete="email"
            InputProps={{
              startAdornment: <Email sx={{ mr: 1, color: 'action.active' }} />
            }}
            error={!!fieldStates.email?.error && fieldStates.email?.touched}
          />

          {/* Campo Password */}
          <TextField
            {...getFieldProps('password')}
            label="Contraseña"
            type="password"
            fullWidth
            autoComplete="current-password"
            InputProps={{
              startAdornment: <Lock sx={{ mr: 1, color: 'action.active' }} />
            }}
            error={!!fieldStates.password?.error && fieldStates.password?.touched}
          />

          {/* Botones */}
          <Stack spacing={2}>
            {/* Botón normal de login */}
            <Button
              variant="contained"
              fullWidth
              size="large"
              onClick={handleLogin}
              disabled={isSubmitting || !isValid}
            >
              {isSubmitting ? 'Iniciando sesión...' : 'Iniciar Sesión'}
            </Button>

            {/* RetryButton para demostración */}
            {loginError && (
              <RetryButton
                variant="outlined"
                fullWidth
                onRetry={handleLogin}
                maxRetries={3}
                autoRetry
                autoRetryDelay={3000}
                onSuccess={() => {
                  notify.success('Login exitoso después de reintentos');
                  navigate('/dashboard');
                }}
                onMaxRetriesReached={() => {
                  notify.error('Máximo de intentos alcanzado. Por favor, contacta a soporte.');
                }}
              >
                Reintentar Login
              </RetryButton>
            )}
          </Stack>

          {/* Info de demo */}
          <Alert severity="info">
            <Typography variant="caption">
              <strong>Demo Error Handling:</strong><br />
              • Validación en tiempo real<br />
              • Manejo de errores de red<br />
              • Retry automático con backoff<br />
              • Notificaciones integradas
            </Typography>
          </Alert>
        </Stack>
      </Paper>
    </Box>
  );
}

export default LoginFormExample;