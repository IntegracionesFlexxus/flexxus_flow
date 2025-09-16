/**
 * Login Page Component - Sprint 2
 * Siguiendo lineamientos nivel 2: Funciones documentadas y validación robusta
 * Página de inicio de sesión con validación de formularios y feedback visual
 */

import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';
import {
  Container,
  Paper,
  Box,
  Typography,
  TextField,
  Button,
  Link,
  Alert,
  Divider,
  FormControlLabel,
  Checkbox,
  InputAdornment,
  IconButton,
  CircularProgress
} from '@mui/material';
import { Link as RouterLink, useNavigate, useLocation } from 'react-router-dom';
import { Visibility, VisibilityOff, Lock, Mail } from '@mui/icons-material';

// Hooks
import { useAuth } from '@/shared/hooks/useAuth';
import { useNotification } from '@/shared/hooks/useNotification';

// Components
import { LoadingOverlay } from '@/components/ui/Loading';

// Types
interface LoginFormData {
  email: string;
  password: string;
  rememberMe: boolean;
}

interface LocationState {
  from?: string;
  message?: string;
}

// Validation schema
const loginSchema = yup.object({
  email: yup
    .string()
    .email('Ingresa un email válido')
    .required('El email es requerido')
    .max(255, 'El email no puede exceder 255 caracteres'),
  password: yup
    .string()
    .min(6, 'La contraseña debe tener al menos 6 caracteres')
    .required('La contraseña es requerida')
    .max(128, 'La contraseña no puede exceder 128 caracteres'),
  rememberMe: yup.boolean()
});

/**
 * Componente de página de inicio de sesión
 * Maneja el formulario de login con validación y autenticación
 * @returns {React.FC} Componente de página de login
 */
export const LoginPage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { login, isLoading, error: authError } = useAuth();
  const notification = useNotification();
  
  const [showPassword, setShowPassword] = useState(false);
  const [loginAttempts, setLoginAttempts] = useState(0);
  const [isBlocked, setIsBlocked] = useState(false);

  const locationState = location.state as LocationState;
  
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    setError,
    clearErrors
  } = useForm<LoginFormData>({
    resolver: yupResolver(loginSchema),
    defaultValues: {
      email: '',
      password: '',
      rememberMe: false
    },
    mode: 'onBlur' // Validar en blur para mejor UX
  });

  /**
   * Maneja el envío del formulario de login
   * @param {LoginFormData} data - Datos del formulario
   */
  const onSubmit = async (data: LoginFormData) => {
    // Verificar si está bloqueado por múltiples intentos
    if (isBlocked) {
      notification.error(
        'Cuenta bloqueada',
        'Demasiados intentos fallidos. Por favor, intenta más tarde.'
      );
      return;
    }

    clearErrors();
    
    try {
      const result = await login({
        email: data.email.toLowerCase().trim(), // Normalizar email
        password: data.password,
        rememberMe: data.rememberMe
      });

      if (result.success) {
        // Reset intentos al login exitoso
        setLoginAttempts(0);
        
        notification.success(
          'Bienvenido',
          `Hola ${result.user.firstName || 'Usuario'}!`
        );

        // Redirigir según el contexto
        if (result.companies && result.companies.length > 1) {
          // Usuario multi-empresa - redirigir a selector
          navigate('/auth/company-selector', {
            state: { companies: result.companies }
          });
        } else {
          // Usuario con una empresa - ir al dashboard
          const redirectTo = locationState?.from || '/dashboard';
          navigate(redirectTo, { replace: true });
        }
      }
    } catch (error: any) {
      // Incrementar contador de intentos fallidos
      const newAttempts = loginAttempts + 1;
      setLoginAttempts(newAttempts);

      // Bloquear después de 5 intentos
      if (newAttempts >= 5) {
        setIsBlocked(true);
        setTimeout(() => {
          setIsBlocked(false);
          setLoginAttempts(0);
        }, 30000); // Desbloquear después de 30 segundos
      }

      // Manejar diferentes tipos de error
      const errorMessage = error.response?.data?.message || error.message;
      
      if (error.response?.status === 401) {
        setError('root', {
          type: 'manual',
          message: 'Credenciales incorrectas. Verifica tu email y contraseña.'
        });
      } else if (error.response?.status === 423) {
        setError('root', {
          type: 'manual',
          message: 'Tu cuenta está bloqueada. Contacta al administrador.'
        });
      } else if (error.response?.status === 429) {
        setError('root', {
          type: 'manual',
          message: 'Demasiados intentos. Por favor, intenta más tarde.'
        });
      } else {
        setError('root', {
          type: 'manual',
          message: errorMessage || 'Error al iniciar sesión. Por favor, intenta nuevamente.'
        });
      }
    }
  };

  /**
   * Toggle para mostrar/ocultar contraseña
   */
  const handleTogglePassword = () => {
    setShowPassword(!showPassword);
  };

  /**
   * Maneja el click del mouse para prevenir propagación
   */
  const handleMouseDownPassword = (event: React.MouseEvent<HTMLButtonElement>) => {
    event.preventDefault();
  };

  // Mostrar mensaje si viene de una redirección
  useEffect(() => {
    if (locationState?.message) {
      notification.info(
        'Información',
        locationState.message
      );
    }
  }, [locationState, notification]);

  return (
    <Container component="main" maxWidth="sm">
      <Box
        sx={{
          minHeight: '100vh',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          py: 4
        }}
      >
        <Paper
          elevation={0}
          sx={{
            p: { xs: 3, sm: 4 },
            border: '1px solid',
            borderColor: 'divider',
            borderRadius: 2,
            backgroundColor: 'background.paper'
          }}
        >
          {/* Header */}
          <Box sx={{ mb: 4, textAlign: 'center' }}>
            <Lock
              sx={{
                fontSize: 40,
                color: 'primary.main',
                mb: 2
              }}
            />
            <Typography 
              variant="h4" 
              component="h1" 
              gutterBottom
              sx={{ fontWeight: 600 }}
            >
              Iniciar Sesión
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Ingresa tus credenciales para acceder al sistema
            </Typography>
          </Box>

          {/* Location State Message */}
          {locationState?.from && (
            <Alert severity="info" sx={{ mb: 3 }}>
              Debes iniciar sesión para acceder a esa página
            </Alert>
          )}

          {/* Error Alert */}
          {errors.root && (
            <Alert 
              severity="error" 
              sx={{ mb: 3 }}
              onClose={() => clearErrors('root')}
            >
              {errors.root.message}
            </Alert>
          )}

          {/* Blocked Alert */}
          {isBlocked && (
            <Alert severity="warning" sx={{ mb: 3 }}>
              Cuenta temporalmente bloqueada por múltiples intentos fallidos.
              Por favor, espera 30 segundos.
            </Alert>
          )}

          {/* Login Form */}
          <Box 
            component="form" 
            onSubmit={handleSubmit(onSubmit)} 
            noValidate
          >
            <TextField
              {...register('email')}
              fullWidth
              label="Email"
              type="email"
              autoComplete="email"
              autoFocus
              error={!!errors.email}
              helperText={errors.email?.message}
              disabled={isSubmitting || isBlocked}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <Mail color="action" />
                  </InputAdornment>
                )
              }}
              sx={{ mb: 2 }}
            />

            <TextField
              {...register('password')}
              fullWidth
              label="Contraseña"
              type={showPassword ? 'text' : 'password'}
              autoComplete="current-password"
              error={!!errors.password}
              helperText={errors.password?.message}
              disabled={isSubmitting || isBlocked}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <Lock color="action" />
                  </InputAdornment>
                ),
                endAdornment: (
                  <InputAdornment position="end">
                    <IconButton
                      aria-label="toggle password visibility"
                      onClick={handleTogglePassword}
                      onMouseDown={handleMouseDownPassword}
                      edge="end"
                      disabled={isSubmitting || isBlocked}
                    >
                      {showPassword ? <VisibilityOff /> : <Visibility />}
                    </IconButton>
                  </InputAdornment>
                )
              }}
              sx={{ mb: 2 }}
            />

            <Box 
              sx={{ 
                display: 'flex', 
                justifyContent: 'space-between', 
                alignItems: 'center', 
                mb: 3,
                flexWrap: 'wrap',
                gap: 1
              }}
            >
              <FormControlLabel
                control={
                  <Checkbox 
                    {...register('rememberMe')} 
                    color="primary"
                    disabled={isSubmitting || isBlocked}
                  />
                }
                label="Recordarme"
                sx={{ mr: 'auto' }}
              />
              <Link 
                component={RouterLink} 
                to="/auth/forgot-password" 
                variant="body2"
                sx={{
                  textDecoration: 'none',
                  '&:hover': {
                    textDecoration: 'underline'
                  }
                }}
              >
                ¿Olvidaste tu contraseña?
              </Link>
            </Box>

            <Button
              type="submit"
              fullWidth
              variant="contained"
              size="large"
              disabled={isSubmitting || isLoading || isBlocked}
              sx={{ 
                mb: 3, 
                py: 1.5,
                position: 'relative'
              }}
            >
              {isSubmitting || isLoading ? (
                <>
                  <CircularProgress 
                    size={20} 
                    sx={{ 
                      position: 'absolute',
                      left: '50%',
                      marginLeft: '-10px'
                    }} 
                  />
                  <span style={{ opacity: 0 }}>Iniciando sesión...</span>
                </>
              ) : (
                'Iniciar Sesión'
              )}
            </Button>

            {/* Attempts Counter */}
            {loginAttempts > 0 && loginAttempts < 5 && (
              <Alert severity="warning" sx={{ mb: 3 }}>
                Intento {loginAttempts} de 5. La cuenta se bloqueará temporalmente después de 5 intentos fallidos.
              </Alert>
            )}

            <Divider sx={{ mb: 3 }}>
              <Typography variant="body2" color="text.secondary">
                ¿No tienes una cuenta?
              </Typography>
            </Divider>

            <Button
              component={RouterLink}
              to="/auth/register"
              fullWidth
              variant="outlined"
              size="large"
              disabled={isSubmitting || isLoading}
              sx={{ py: 1.5 }}
            >
              Crear Cuenta
            </Button>
          </Box>

          {/* Footer */}
          <Box sx={{ mt: 4, textAlign: 'center' }}>
            <Typography variant="caption" color="text.secondary">
              Al iniciar sesión, aceptas nuestros{' '}
              <Link 
                component={RouterLink} 
                to="/terms" 
                sx={{ textDecoration: 'none' }}
              >
                Términos de Servicio
              </Link>
              {' y '}
              <Link 
                component={RouterLink} 
                to="/privacy" 
                sx={{ textDecoration: 'none' }}
              >
                Política de Privacidad
              </Link>
            </Typography>
          </Box>
        </Paper>
      </Box>

      {/* Loading Overlay */}
      {(isSubmitting || isLoading) && <LoadingOverlay />}
    </Container>
  );
};

export default LoginPage;