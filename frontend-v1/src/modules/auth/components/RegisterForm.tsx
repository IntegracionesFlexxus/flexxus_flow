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
  CircularProgress,
  Stepper,
  Step,
  StepLabel,
  Grid
} from '@mui/material';
import {
  Visibility,
  VisibilityOff,
  Email,
  Lock,
  Person,
  Business,
  Phone
} from '@mui/icons-material';

// Formulario de registro - MVP Nivel 1
// TODO: En Nivel 2 agregar verificación email, términos y condiciones, OAuth

interface RegisterFormData {
  // Paso 1 - Información personal
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  
  // Paso 2 - Seguridad
  password: string;
  confirmPassword: string;
  
  // Paso 3 - Empresa
  companyName: string;
  companyRole?: string;
  companySize?: string;
  
  acceptTerms: boolean;
}

const steps = ['Información Personal', 'Seguridad', 'Empresa'];

export function RegisterForm() {
  const navigate = useNavigate();
  const [activeStep, setActiveStep] = useState(0);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    watch,
    trigger,
    getValues
  } = useForm<RegisterFormData>({
    mode: 'onChange',
    defaultValues: {
      firstName: '',
      lastName: '',
      email: '',
      phone: '',
      password: '',
      confirmPassword: '',
      companyName: '',
      companyRole: '',
      companySize: '',
      acceptTerms: false
    }
  });

  const password = watch('password');

  const handleNext = async () => {
    let fieldsToValidate: (keyof RegisterFormData)[] = [];
    
    switch (activeStep) {
      case 0:
        fieldsToValidate = ['firstName', 'lastName', 'email'];
        break;
      case 1:
        fieldsToValidate = ['password', 'confirmPassword'];
        break;
      case 2:
        fieldsToValidate = ['companyName', 'acceptTerms'];
        break;
    }

    const isValid = await trigger(fieldsToValidate);
    
    if (isValid) {
      setActiveStep(prev => prev + 1);
    }
  };

  const handleBack = () => {
    setActiveStep(prev => prev - 1);
  };

  const onSubmit = async (data: RegisterFormData) => {
    try {
      setApiError(null);
      
      // TODO: Reemplazar con llamada real a API
      console.log('Registro:', data);
      
      // Simulación de registro exitoso
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      // Redirigir a login con mensaje de éxito
      navigate('/auth/login', { 
        state: { message: 'Registro exitoso. Por favor inicia sesión.' }
      });
    } catch (error: any) {
      const message = error?.response?.data?.message || 'Error al registrar usuario';
      setApiError(message);
    }
  };

  const renderStepContent = () => {
    switch (activeStep) {
      case 0:
        return (
          <Grid container spacing={2}>
            <Grid item xs={12} sm={6}>
              <TextField
                {...register('firstName', {
                  required: 'El nombre es requerido',
                  minLength: {
                    value: 2,
                    message: 'El nombre debe tener al menos 2 caracteres'
                  }
                })}
                fullWidth
                label="Nombre"
                autoComplete="given-name"
                error={!!errors.firstName}
                helperText={errors.firstName?.message}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <Person color="action" />
                    </InputAdornment>
                  ),
                }}
                disabled={isSubmitting}
              />
            </Grid>
            
            <Grid item xs={12} sm={6}>
              <TextField
                {...register('lastName', {
                  required: 'El apellido es requerido',
                  minLength: {
                    value: 2,
                    message: 'El apellido debe tener al menos 2 caracteres'
                  }
                })}
                fullWidth
                label="Apellido"
                autoComplete="family-name"
                error={!!errors.lastName}
                helperText={errors.lastName?.message}
                disabled={isSubmitting}
              />
            </Grid>

            <Grid item xs={12}>
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
            </Grid>

            <Grid item xs={12}>
              <TextField
                {...register('phone', {
                  pattern: {
                    value: /^[+]?[(]?[0-9]{3}[)]?[-\s.]?[0-9]{3}[-\s.]?[0-9]{4,6}$/,
                    message: 'Número de teléfono inválido'
                  }
                })}
                fullWidth
                label="Teléfono (Opcional)"
                type="tel"
                autoComplete="tel"
                error={!!errors.phone}
                helperText={errors.phone?.message}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <Phone color="action" />
                    </InputAdornment>
                  ),
                }}
                disabled={isSubmitting}
              />
            </Grid>
          </Grid>
        );

      case 1:
        return (
          <Grid container spacing={2}>
            <Grid item xs={12}>
              <TextField
                {...register('password', {
                  required: 'La contraseña es requerida',
                  minLength: {
                    value: 8,
                    message: 'La contraseña debe tener al menos 8 caracteres'
                  },
                  pattern: {
                    value: /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)[a-zA-Z\d@$!%*?&]{8,}$/,
                    message: 'Debe contener mayúsculas, minúsculas y números'
                  }
                })}
                fullWidth
                label="Contraseña"
                type={showPassword ? 'text' : 'password'}
                autoComplete="new-password"
                error={!!errors.password}
                helperText={errors.password?.message || 'Mínimo 8 caracteres, con mayúsculas, minúsculas y números'}
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
            </Grid>

            <Grid item xs={12}>
              <TextField
                {...register('confirmPassword', {
                  required: 'Por favor confirma tu contraseña',
                  validate: value => value === password || 'Las contraseñas no coinciden'
                })}
                fullWidth
                label="Confirmar Contraseña"
                type={showConfirmPassword ? 'text' : 'password'}
                autoComplete="new-password"
                error={!!errors.confirmPassword}
                helperText={errors.confirmPassword?.message}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <Lock color="action" />
                    </InputAdornment>
                  ),
                  endAdornment: (
                    <InputAdornment position="end">
                      <IconButton
                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                        edge="end"
                        disabled={isSubmitting}
                      >
                        {showConfirmPassword ? <VisibilityOff /> : <Visibility />}
                      </IconButton>
                    </InputAdornment>
                  ),
                }}
                disabled={isSubmitting}
              />
            </Grid>
          </Grid>
        );

      case 2:
        return (
          <Grid container spacing={2}>
            <Grid item xs={12}>
              <TextField
                {...register('companyName', {
                  required: 'El nombre de la empresa es requerido'
                })}
                fullWidth
                label="Nombre de la Empresa"
                autoComplete="organization"
                error={!!errors.companyName}
                helperText={errors.companyName?.message}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <Business color="action" />
                    </InputAdornment>
                  ),
                }}
                disabled={isSubmitting}
              />
            </Grid>

            <Grid item xs={12} sm={6}>
              <TextField
                {...register('companyRole')}
                fullWidth
                label="Cargo (Opcional)"
                autoComplete="organization-title"
                disabled={isSubmitting}
              />
            </Grid>

            <Grid item xs={12} sm={6}>
              <TextField
                {...register('companySize')}
                fullWidth
                label="Tamaño de Empresa"
                select
                SelectProps={{ native: true }}
                disabled={isSubmitting}
              >
                <option value="">Seleccionar</option>
                <option value="1-10">1-10 empleados</option>
                <option value="11-50">11-50 empleados</option>
                <option value="51-200">51-200 empleados</option>
                <option value="201-500">201-500 empleados</option>
                <option value="500+">500+ empleados</option>
              </TextField>
            </Grid>

            <Grid item xs={12}>
              <FormControlLabel
                control={
                  <Checkbox
                    {...register('acceptTerms', {
                      required: 'Debes aceptar los términos y condiciones'
                    })}
                    color="primary"
                    disabled={isSubmitting}
                  />
                }
                label={
                  <Typography variant="body2">
                    Acepto los{' '}
                    <Link to="/terms" target="_blank" style={{ textDecoration: 'none' }}>
                      términos y condiciones
                    </Link>
                    {' '}y la{' '}
                    <Link to="/privacy" target="_blank" style={{ textDecoration: 'none' }}>
                      política de privacidad
                    </Link>
                  </Typography>
                }
              />
              {errors.acceptTerms && (
                <Typography variant="caption" color="error">
                  {errors.acceptTerms.message}
                </Typography>
              )}
            </Grid>
          </Grid>
        );

      default:
        return null;
    }
  };

  return (
    <Box component="form" onSubmit={handleSubmit(onSubmit)} noValidate>
      <Typography variant="h4" component="h1" gutterBottom align="center">
        Crear Cuenta
      </Typography>
      
      <Typography variant="body2" color="text.secondary" align="center" mb={3}>
        Únete a Flexxus y transforma tu comunicación
      </Typography>

      <Stepper activeStep={activeStep} sx={{ mb: 4 }}>
        {steps.map((label) => (
          <Step key={label}>
            <StepLabel>{label}</StepLabel>
          </Step>
        ))}
      </Stepper>

      {apiError && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setApiError(null)}>
          {apiError}
        </Alert>
      )}

      {renderStepContent()}

      <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 3 }}>
        <Button
          disabled={activeStep === 0 || isSubmitting}
          onClick={handleBack}
          sx={{ mr: 1 }}
        >
          Atrás
        </Button>
        
        {activeStep === steps.length - 1 ? (
          <Button
            type="submit"
            variant="contained"
            disabled={isSubmitting}
          >
            {isSubmitting ? (
              <CircularProgress size={24} color="inherit" />
            ) : (
              'Registrarse'
            )}
          </Button>
        ) : (
          <Button
            variant="contained"
            onClick={handleNext}
            disabled={isSubmitting}
          >
            Siguiente
          </Button>
        )}
      </Box>

      <Box textAlign="center" mt={3}>
        <Typography variant="body2" color="text.secondary">
          ¿Ya tienes cuenta?{' '}
          <Link to="/auth/login" style={{ textDecoration: 'none' }}>
            <Typography component="span" variant="body2" color="primary">
              Inicia sesión aquí
            </Typography>
          </Link>
        </Typography>
      </Box>
    </Box>
  );
}

export default RegisterForm;