import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { useNavigate, Link } from 'react-router-dom';
import {
  Box,
  TextField,
  Button,
  Typography,
  Alert,
  InputAdornment,
  IconButton,
  Checkbox,
  FormControlLabel,
  CircularProgress
} from '@mui/material';
import {
  Visibility,
  VisibilityOff,
  Email,
  Lock
} from '@mui/icons-material';
import { useAuthStore } from '@/shared/store/authStore';
import { authService } from '@/modules/auth/services/authService';

// Formulario de login con integración a API real
// Incluye valores por defecto para pruebas
// TODO: En Nivel 2 agregar OAuth, 2FA, captcha

interface LoginFormData {
  email: string;
  password: string;
  rememberMe: boolean;
}

export function LoginForm() {
  const navigate = useNavigate();
  const { login } = useAuthStore();
  const [showPassword, setShowPassword] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    setError
  } = useForm<LoginFormData>({
    defaultValues: {
      email: 'juan.perez@test.agrosoft.com',
      password: 'Test123456!',
      rememberMe: false
    }
  });

  const onSubmit = async (data: LoginFormData) => {
    try {
      setApiError(null);

      // Llamada real a la API de autenticación
      const response = await authService.login({
        email: data.email,
        password: data.password,
        rememberMe: data.rememberMe
      });

      if (response.success && response.data) {
        // Almacenar datos del usuario y empresas en el store
        login(
          response.data.user,
          response.data.accessToken,
          response.data.companies
        );

        // Redirigir según el contexto
        if (response.data.companies && response.data.companies.length > 1) {
          // Usuario multi-empresa - redirigir a selector de empresa
          navigate('/auth/company-selector', {
            state: { companies: response.data.companies }
          });
        } else {
          // Usuario con una empresa - ir directo al dashboard
          navigate('/dashboard');
        }
      } else {
        throw new Error(response.message || 'Error en la autenticación');
      }
    } catch (error: any) {
      const message = error?.response?.data?.message || error.message || 'Error al iniciar sesión';

      // Manejo de errores específicos según código de estado HTTP
      if (error?.response?.status === 401) {
        setError('email', { message: 'Email o contraseña incorrectos' });
        setError('password', { message: 'Email o contraseña incorrectos' });
        setApiError('Credenciales inválidas. Por favor verifica tu email y contraseña.');
      } else if (error?.response?.status === 423) {
        setApiError('Tu cuenta está bloqueada. Por favor contacta al administrador.');
      } else if (error?.response?.status === 429) {
        setApiError('Demasiados intentos. Por favor espera unos minutos.');
      } else if (error?.response?.status === 404) {
        setApiError('Usuario no encontrado. Por favor verifica tu email.');
      } else if (error?.response?.status === 400) {
        setApiError('Datos de entrada inválidos. Por favor verifica tu información.');
      } else if (error?.response?.status >= 500) {
        setApiError('Error del servidor. Por favor intenta más tarde.');
      } else {
        setApiError(message);
      }
    }
  };

  return (
    <Box component="form" onSubmit={handleSubmit(onSubmit)} noValidate>
      <Typography variant="h4" component="h1" gutterBottom align="center">
        Iniciar Sesión
      </Typography>
      
      <Typography variant="body2" color="text.secondary" align="center" mb={3}>
        Bienvenido de nuevo a Flexxus
      </Typography>

      {apiError && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setApiError(null)}>
          {apiError}
        </Alert>
      )}

      <TextField
        {...register('email', {
          required: 'El email es requerido',
          pattern: {
            value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
            message: 'Email inválido'
          }
        })}
        fullWidth
        label="Email"
        type="email"
        autoComplete="email"
        margin="normal"
        error={!!errors.email}
        helperText={errors.email?.message}
        InputProps={{
          startAdornment: (
            <InputAdornment position="start">
              <Email color="action" />
            </InputAdornment>
          ),
        }}
        disabled={isSubmitting}
      />

      <TextField
        {...register('password', {
          required: 'La contraseña es requerida',
          minLength: {
            value: 6,
            message: 'La contraseña debe tener al menos 6 caracteres'
          }
        })}
        fullWidth
        label="Contraseña"
        type={showPassword ? 'text' : 'password'}
        autoComplete="current-password"
        margin="normal"
        error={!!errors.password}
        helperText={errors.password?.message}
        InputProps={{
          startAdornment: (
            <InputAdornment position="start">
              <Lock color="action" />
            </InputAdornment>
          ),
          endAdornment: (
            <InputAdornment position="end">
              <IconButton
                onClick={() => setShowPassword(!showPassword)}
                edge="end"
                disabled={isSubmitting}
              >
                {showPassword ? <VisibilityOff /> : <Visibility />}
              </IconButton>
            </InputAdornment>
          ),
        }}
        disabled={isSubmitting}
      />

      <Box display="flex" justifyContent="space-between" alignItems="center" mt={1} mb={2}>
        <FormControlLabel
          control={
            <Checkbox
              {...register('rememberMe')}
              color="primary"
              disabled={isSubmitting}
            />
          }
          label="Recordarme"
        />
        
        <Link to="/auth/forgot-password" style={{ textDecoration: 'none' }}>
          <Typography variant="body2" color="primary">
            ¿Olvidaste tu contraseña?
          </Typography>
        </Link>
      </Box>

      <Button
        type="submit"
        fullWidth
        variant="contained"
        size="large"
        disabled={isSubmitting}
        sx={{ mb: 2 }}
      >
        {isSubmitting ? (
          <CircularProgress size={24} color="inherit" />
        ) : (
          'Iniciar Sesión'
        )}
      </Button>

      <Box textAlign="center">
        <Typography variant="body2" color="text.secondary">
          ¿No tienes cuenta?{' '}
          <Link to="/auth/register" style={{ textDecoration: 'none' }}>
            <Typography component="span" variant="body2" color="primary">
              Regístrate aquí
            </Typography>
          </Link>
        </Typography>
      </Box>

      {/* Demo credentials hint - Solo para desarrollo */}
      {import.meta.env.DEV && (
        <Alert severity="info" sx={{ mt: 2 }}>
          <Typography variant="caption">
            <strong>Credenciales de prueba:</strong> juan.perez@test.agrosoft.com / Test123456!
          </Typography>
        </Alert>
      )}
    </Box>
  );
}

export default LoginForm;