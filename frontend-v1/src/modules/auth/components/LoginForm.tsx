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

// Formulario de login - MVP Nivel 1
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
      email: '',
      password: '',
      rememberMe: false
    }
  });

  const onSubmit = async (data: LoginFormData) => {
    try {
      setApiError(null);
      
      // TODO: Reemplazar con llamada real a API
      // Simulación de login
      if (data.email === 'admin@flexxus.com' && data.password === 'admin123') {
        // Mock user and companies data
        const mockUser = {
          id: '550e8400-e29b-41d4-a716-446655440000',
          email: data.email,
          firstName: 'Admin',
          lastName: 'Usuario',
          role: 'admin'
        };

        const mockCompanies = [{
          id: '12345678-1234-1234-1234-123456789012',
          name: 'Flexxus Demo Company',
          plan: 'professional',
          features: {
            omni: true,
            crm: true,
            workflow: true,
            analytics: true
          }
        }];

        const mockToken = 'mock-jwt-token-' + Date.now();
        
        login(mockUser, mockToken, mockCompanies);
        navigate('/dashboard');
      } else {
        throw new Error('Credenciales inválidas');
      }
    } catch (error: any) {
      const message = error?.response?.data?.message || error.message || 'Error al iniciar sesión';
      
      // Manejo de errores específicos
      if (error?.response?.status === 401) {
        setError('email', { message: 'Email o contraseña incorrectos' });
        setError('password', { message: 'Email o contraseña incorrectos' });
      } else if (error?.response?.status === 429) {
        setApiError('Demasiados intentos. Por favor espera unos minutos.');
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
            <strong>Demo:</strong> admin@flexxus.com / admin123
          </Typography>
        </Alert>
      )}
    </Box>
  );
}

export default LoginForm;