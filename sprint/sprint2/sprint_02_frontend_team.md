---
title: "Sprint 02 - Frontend Team"
tipo: "funcionalidad"
estado: "vigente"
prioridad: "alta"
tags: ["frontend", "react", "typescript", "auth", "multi-tenancy", "feature-flags", "ui"]
responsable: "Frontend Team"
fecha_inicio: "2024-01-15"
fecha_fin: "2024-01-28"
dependencias: ["sprint_01_frontend_team", "sprint_02_backend_team"]
version: "1.0"
sprint: 2
---

# Sprint 02 - Frontend Team

## Información del Sprint
- **Duración:** Semanas 3-4 (2 semanas)
- **Equipo:** Frontend Team (4 desarrolladores)
- **Objetivo:** Implementar sistema completo de autenticación multi-empresa y gestión de feature flags

## Objetivos Específicos

### Objetivo Principal
Desarrollar interfaces completas para autenticación multi-empresa, implementar sistema de feature flags en frontend y crear componentes de gestión de usuarios y empresas.

### Objetivos Técnicos
1. Implementar formularios de login y registro con validación
2. Crear sistema de company selector para usuarios multi-empresa
3. Implementar feature flag evaluation en componentes
4. Desarrollar componentes de gestión de perfil de usuario
5. Establecer guards de autenticación y autorización
6. Crear sistema de notificaciones y feedback visual

## Tareas Detalladas

### 1. Páginas de Autenticación

#### 1.1 Login Page: modules/auth/pages/LoginPage.tsx
```typescript
import React, { useState } from 'react';
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
  Checkbox
} from '@mui/material';
import { Link as RouterLink } from 'react-router-dom';
import { Eye, EyeOff, Lock, Mail } from 'lucide-react';

// Hooks
import { useAuth } from '@shared/hooks/useAuth';

// Components
import { LoadingOverlay } from '@components/ui/LoadingOverlay';

interface LoginFormData {
  email: string;
  password: string;
  rememberMe: boolean;
}

const loginSchema = yup.object({
  email: yup
    .string()
    .email('Ingresa un email válido')
    .required('El email es requerido'),
  password: yup
    .string()
    .min(6, 'La contraseña debe tener al menos 6 caracteres')
    .required('La contraseña es requerida'),
  rememberMe: yup.boolean()
});

export const LoginPage: React.FC = () => {
  const [showPassword, setShowPassword] = useState(false);
  const { login, isLoading } = useAuth();

  const {
    register,
    handleSubmit,
    formState: { errors },
    setError
  } = useForm<LoginFormData>({
    resolver: yupResolver(loginSchema),
    defaultValues: {
      rememberMe: false
    }
  });

  const onSubmit = async (data: LoginFormData) => {
    try {
      await login({
        email: data.email,
        password: data.password
      });
    } catch (error: any) {
      setError('root', {
        type: 'manual',
        message: error.message || 'Error al iniciar sesión'
      });
    }
  };

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
            p: 4,
            border: '1px solid',
            borderColor: 'divider',
            borderRadius: 2
          }}
        >
          {/* Header */}
          <Box sx={{ mb: 4, textAlign: 'center' }}>
            <Typography variant="h4" component="h1" gutterBottom>
              Iniciar Sesión
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Ingresa tus credenciales para acceder al sistema
            </Typography>
          </Box>

          {/* Error Alert */}
          {errors.root && (
            <Alert severity="error" sx={{ mb: 3 }}>
              {errors.root.message}
            </Alert>
          )}

          {/* Login Form */}
          <Box component="form" onSubmit={handleSubmit(onSubmit)} noValidate>
            <TextField
              {...register('email')}
              fullWidth
              label="Email"
              type="email"
              autoComplete="email"
              autoFocus
              error={!!errors.email}
              helperText={errors.email?.message}
              InputProps={{
                startAdornment: <Mail size={20} style={{ marginRight: 8 }} />
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
              InputProps={{
                startAdornment: <Lock size={20} style={{ marginRight: 8 }} />,
                endAdornment: (
                  <Button
                    onClick={() => setShowPassword(!showPassword)}
                    sx={{ minWidth: 'auto', p: 1 }}
                  >
                    {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                  </Button>
                )
              }}
              sx={{ mb: 2 }}
            />

            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
              <FormControlLabel
                control={<Checkbox {...register('rememberMe')} />}
                label="Recordarme"
              />
              <Link component={RouterLink} to="/auth/forgot-password" variant="body2">
                ¿Olvidaste tu contraseña?
              </Link>
            </Box>

            <Button
              type="submit"
              fullWidth
              variant="contained"
              size="large"
              disabled={isLoading}
              sx={{ mb: 3, py: 1.5 }}
            >
              {isLoading ? 'Iniciando sesión...' : 'Iniciar Sesión'}
            </Button>

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
              sx={{ py: 1.5 }}
            >
              Crear Cuenta
            </Button>
          </Box>
        </Paper>
      </Box>

      {isLoading && <LoadingOverlay />}
    </Container>
  );
};
```

#### 1.2 Company Selector: modules/auth/pages/CompanySelector.tsx
```typescript
import React, { useState } from 'react';
import {
  Container,
  Paper,
  Box,
  Typography,
  Card,
  CardContent,
  CardActionArea,
  Button,
  Chip,
  Grid,
  Avatar
} from '@mui/material';
import { Building, Users, Crown, CheckCircle } from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';

// Hooks
import { useAuthStore } from '@shared/store/authStore';
import { useUIStore } from '@shared/store/uiStore';

interface Company {
  id: string;
  name: string;
  plan: string;
  userCount?: number;
  role: string;
}

export const CompanySelector: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { companies, switchCompany } = useAuthStore();
  const { addNotification } = useUIStore();
  const [selectedCompany, setSelectedCompany] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Get companies from location state (passed from login)
  const availableCompanies = location.state?.companies || companies;

  const handleCompanySelect = async (company: Company) => {
    if (isLoading) return;

    setIsLoading(true);
    setSelectedCompany(company.id);

    try {
      // Switch company context
      await switchCompany(company);
      
      addNotification({
        type: 'success',
        title: 'Empresa seleccionada',
        message: `Bienvenido a ${company.name}`,
        autoClose: true
      });

      // Navigate to dashboard
      navigate('/dashboard');
      
    } catch (error) {
      addNotification({
        type: 'error',
        title: 'Error',
        message: 'No se pudo cambiar de empresa',
        autoClose: true
      });
      setSelectedCompany(null);
    } finally {
      setIsLoading(false);
    }
  };

  const getPlanColor = (plan: string) => {
    switch (plan.toLowerCase()) {
      case 'enterprise': return 'error';
      case 'professional': return 'warning';
      case 'basic': return 'info';
      default: return 'default';
    }
  };

  const getRoleIcon = (role: string) => {
    switch (role.toLowerCase()) {
      case 'admin': return <Crown size={16} />;
      case 'manager': return <Users size={16} />;
      default: return <Building size={16} />;
    }
  };

  return (
    <Container component="main" maxWidth="md">
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
            p: 4,
            border: '1px solid',
            borderColor: 'divider',
            borderRadius: 2
          }}
        >
          {/* Header */}
          <Box sx={{ mb: 4, textAlign: 'center' }}>
            <Typography variant="h4" component="h1" gutterBottom>
              Seleccionar Empresa
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Tienes acceso a múltiples empresas. Selecciona una para continuar.
            </Typography>
          </Box>

          {/* Company Cards */}
          <Grid container spacing={3} sx={{ mb: 4 }}>
            {availableCompanies.map((company: Company) => (
              <Grid item xs={12} sm={6} md={4} key={company.id}>
                <Card
                  sx={{
                    position: 'relative',
                    transition: 'all 0.2s ease-in-out',
                    ...(selectedCompany === company.id && {
                      transform: 'translateY(-4px)',
                      boxShadow: 4,
                      borderColor: 'primary.main'
                    })
                  }}
                >
                  <CardActionArea
                    onClick={() => handleCompanySelect(company)}
                    disabled={isLoading}
                    sx={{ p: 0 }}
                  >
                    <CardContent sx={{ textAlign: 'center', p: 3 }}>
                      {/* Company Avatar */}
                      <Avatar
                        sx={{
                          width: 60,
                          height: 60,
                          mx: 'auto',
                          mb: 2,
                          bgcolor: 'primary.main'
                        }}
                      >
                        {company.name.charAt(0).toUpperCase()}
                      </Avatar>

                      {/* Company Name */}
                      <Typography variant="h6" gutterBottom noWrap>
                        {company.name}
                      </Typography>

                      {/* Plan Badge */}
                      <Chip
                        label={company.plan}
                        color={getPlanColor(company.plan)}
                        size="small"
                        sx={{ mb: 2 }}
                      />

                      {/* Role Info */}
                      <Box
                        sx={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: 1,
                          color: 'text.secondary'
                        }}
                      >
                        {getRoleIcon(company.role)}
                        <Typography variant="body2" color="inherit">
                          {company.role}
                        </Typography>
                      </Box>

                      {/* Loading/Selected State */}
                      {selectedCompany === company.id && isLoading && (
                        <Box
                          sx={{
                            position: 'absolute',
                            top: 12,
                            right: 12,
                            color: 'primary.main'
                          }}
                        >
                          <CheckCircle size={20} />
                        </Box>
                      )}
                    </CardContent>
                  </CardActionArea>
                </Card>
              </Grid>
            ))}
          </Grid>

          {/* Footer */}
          <Box sx={{ textAlign: 'center' }}>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              ¿No encuentras tu empresa?
            </Typography>
            <Button
              variant="text"
              onClick={() => navigate('/auth/login')}
              disabled={isLoading}
            >
              Volver al inicio de sesión
            </Button>
          </Box>
        </Paper>
      </Box>
    </Container>
  );
};
```

### 2. Feature Flag System

#### 2.1 Feature Flag Hook: shared/hooks/useFeatureFlag.ts
```typescript
import { useState, useEffect, useCallback } from 'react';
import { useAuthStore } from '@shared/store/authStore';
import { api } from '@shared/services/api';

interface FeatureFlagConfig {
  [key: string]: any;
}

interface UseFeatureFlagResult {
  isEnabled: boolean;
  config: FeatureFlagConfig | null;
  isLoading: boolean;
  error: string | null;
  refresh: () => void;
}

// Cache para feature flags
const flagCache = new Map<string, { value: boolean; config: any; timestamp: number }>();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutos

export const useFeatureFlag = (featureName: string): UseFeatureFlagResult => {
  const [isEnabled, setIsEnabled] = useState(false);
  const [config, setConfig] = useState<FeatureFlagConfig | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const { currentCompany, user } = useAuthStore();

  const checkFeatureFlag = useCallback(async () => {
    if (!currentCompany || !user) {
      setIsEnabled(false);
      setConfig(null);
      setIsLoading(false);
      return;
    }

    const cacheKey = `${currentCompany.id}:${featureName}`;
    const cached = flagCache.get(cacheKey);
    
    // Check cache
    if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
      setIsEnabled(cached.value);
      setConfig(cached.config);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const response = await api.get(`/feature-flags/${featureName}/evaluate`);
      const { enabled, config: flagConfig } = response.data.data;

      // Update cache
      flagCache.set(cacheKey, {
        value: enabled,
        config: flagConfig,
        timestamp: Date.now()
      });

      setIsEnabled(enabled);
      setConfig(flagConfig);
    } catch (err: any) {
      setError(err.message || 'Error checking feature flag');
      setIsEnabled(false);
      setConfig(null);
    } finally {
      setIsLoading(false);
    }
  }, [featureName, currentCompany, user]);

  const refresh = useCallback(() => {
    if (currentCompany) {
      const cacheKey = `${currentCompany.id}:${featureName}`;
      flagCache.delete(cacheKey);
    }
    checkFeatureFlag();
  }, [checkFeatureFlag, currentCompany, featureName]);

  useEffect(() => {
    checkFeatureFlag();
  }, [checkFeatureFlag]);

  return {
    isEnabled,
    config,
    isLoading,
    error,
    refresh
  };
};

// Hook para múltiples feature flags
export const useFeatureFlags = (featureNames: string[]) => {
  const [flags, setFlags] = useState<Record<string, boolean>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const { currentCompany } = useAuthStore();

  useEffect(() => {
    if (!currentCompany) {
      setFlags({});
      setIsLoading(false);
      return;
    }

    const checkMultipleFlags = async () => {
      setIsLoading(true);
      setError(null);

      try {
        const response = await api.post('/feature-flags/evaluate-multiple', {
          features: featureNames
        });
        
        setFlags(response.data.data);
      } catch (err: any) {
        setError(err.message || 'Error checking feature flags');
        setFlags({});
      } finally {
        setIsLoading(false);
      }
    };

    checkMultipleFlags();
  }, [featureNames, currentCompany]);

  return { flags, isLoading, error };
};
```

#### 2.2 Feature Flag Component: components/ui/FeatureFlag.tsx
```typescript
import React from 'react';
import { useFeatureFlag } from '@shared/hooks/useFeatureFlag';
import { Box, Skeleton } from '@mui/material';

interface FeatureFlagProps {
  feature: string;
  children: React.ReactNode;
  fallback?: React.ReactNode;
  loadingComponent?: React.ReactNode;
}

export const FeatureFlag: React.FC<FeatureFlagProps> = ({
  feature,
  children,
  fallback = null,
  loadingComponent
}) => {
  const { isEnabled, isLoading, error } = useFeatureFlag(feature);

  if (isLoading) {
    return loadingComponent || <Skeleton variant="rectangular" height={40} />;
  }

  if (error) {
    console.warn(`Feature flag error for ${feature}:`, error);
    return fallback;
  }

  return isEnabled ? <>{children}</> : <>{fallback}</>;
};

// HOC para feature flags
export const withFeatureFlag = (featureName: string, fallback?: React.ComponentType) => {
  return function <T extends {}>(Component: React.ComponentType<T>) {
    return function FeatureFlaggedComponent(props: T) {
      const { isEnabled, isLoading } = useFeatureFlag(featureName);

      if (isLoading) {
        return <Skeleton variant="rectangular" height={200} />;
      }

      if (!isEnabled) {
        return fallback ? React.createElement(fallback, props) : null;
      }

      return React.createElement(Component, props);
    };
  };
};
```

### 3. Auth Guards y Protection

#### 3.3 Auth Guard Component: shared/components/AuthGuard.tsx
```typescript
import React, { useEffect, useState } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { Box, CircularProgress, Typography } from '@mui/material';
import { useAuthStore } from '@shared/store/authStore';
import { authService } from '@modules/auth/services/authService';

interface AuthGuardProps {
  children: React.ReactNode;
  requireAuth?: boolean;
  roles?: string[];
}

export const AuthGuard: React.FC<AuthGuardProps> = ({ 
  children, 
  requireAuth = true,
  roles 
}) => {
  const location = useLocation();
  const { isAuthenticated, user, currentCompany, setAuth } = useAuthStore();
  const [isLoading, setIsLoading] = useState(true);
  const [isValidating, setIsValidating] = useState(false);

  useEffect(() => {
    const validateAuth = async () => {
      // Si no requiere auth, no validar
      if (!requireAuth) {
        setIsLoading(false);
        return;
      }

      // Si ya está autenticado y tiene empresa, todo ok
      if (isAuthenticated && user && currentCompany) {
        // Validar roles si se especifican
        if (roles && roles.length > 0) {
          const userCompany = user.companies?.find(c => c.id === currentCompany.id);
          if (!userCompany || !roles.includes(userCompany.role)) {
            setIsLoading(false);
            return;
          }
        }
        setIsLoading(false);
        return;
      }

      // Si tiene token almacenado, intentar validar
      const token = localStorage.getItem('auth-token');
      if (token && !isValidating) {
        setIsValidating(true);
        try {
          const response = await authService.validateToken(token);
          setAuth(response.user, token, response.companies);
        } catch (error) {
          // Token inválido, limpiar storage
          localStorage.removeItem('auth-token');
          localStorage.removeItem('auth-store');
        } finally {
          setIsValidating(false);
        }
      }

      setIsLoading(false);
    };

    validateAuth();
  }, [isAuthenticated, user, currentCompany, requireAuth, roles, setAuth, isValidating]);

  // Loading state
  if (isLoading || isValidating) {
    return (
      <Box
        sx={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: '100vh',
          gap: 2
        }}
      >
        <CircularProgress />
        <Typography variant="body2" color="text.secondary">
          Validando sesión...
        </Typography>
      </Box>
    );
  }

  // No requiere auth
  if (!requireAuth) {
    return <>{children}</>;
  }

  // No autenticado - redirigir a login
  if (!isAuthenticated || !user) {
    return (
      <Navigate 
        to="/auth/login" 
        state={{ from: location.pathname }} 
        replace 
      />
    );
  }

  // Autenticado pero necesita seleccionar empresa
  if (!currentCompany && user.companies && user.companies.length > 1) {
    return (
      <Navigate 
        to="/auth/company-selector" 
        state={{ companies: user.companies }} 
        replace 
      />
    );
  }

  // Validar roles si se especifican
  if (roles && roles.length > 0) {
    const userCompany = user.companies?.find(c => c.id === currentCompany?.id);
    if (!userCompany || !roles.includes(userCompany.role)) {
      return (
        <Box
          sx={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            minHeight: '100vh',
            textAlign: 'center'
          }}
        >
          <Typography variant="h5" gutterBottom>
            Acceso Denegado
          </Typography>
          <Typography variant="body1" color="text.secondary">
            No tienes permisos para acceder a esta sección.
          </Typography>
        </Box>
      );
    }
  }

  return <>{children}</>;
};
```

### 4. User Profile y Company Management

#### 4.1 User Profile Component: modules/auth/components/UserProfile.tsx
```typescript
import React, { useState } from 'react';
import {
  Box,
  Paper,
  Typography,
  TextField,
  Button,
  Avatar,
  Grid,
  Divider,
  Alert,
  IconButton,
  FormControl,
  InputLabel,
  Select,
  MenuItem
} from '@mui/material';
import { Camera, Save, User } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';

// Hooks
import { useAuthStore } from '@shared/store/authStore';
import { useUIStore } from '@shared/store/uiStore';

interface ProfileFormData {
  firstName: string;
  lastName: string;
  email: string;
  timezone: string;
  language: string;
}

const profileSchema = yup.object({
  firstName: yup
    .string()
    .min(2, 'El nombre debe tener al menos 2 caracteres')
    .required('El nombre es requerido'),
  lastName: yup
    .string()
    .min(2, 'El apellido debe tener al menos 2 caracteres')
    .required('El apellido es requerido'),
  email: yup
    .string()
    .email('Ingresa un email válido')
    .required('El email es requerido'),
  timezone: yup.string().required('Selecciona una zona horaria'),
  language: yup.string().required('Selecciona un idioma')
});

const timezones = [
  { value: 'America/Argentina/Buenos_Aires', label: 'Buenos Aires (GMT-3)' },
  { value: 'America/Mexico_City', label: 'Ciudad de México (GMT-6)' },
  { value: 'America/New_York', label: 'Nueva York (GMT-5)' },
  { value: 'Europe/Madrid', label: 'Madrid (GMT+1)' }
];

const languages = [
  { value: 'es', label: 'Español' },
  { value: 'en', label: 'English' },
  { value: 'pt', label: 'Português' }
];

export const UserProfile: React.FC = () => {
  const { user, updateUser } = useAuthStore();
  const { addNotification } = useUIStore();
  const [isLoading, setIsLoading] = useState(false);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isDirty },
    reset
  } = useForm<ProfileFormData>({
    resolver: yupResolver(profileSchema),
    defaultValues: {
      firstName: user?.firstName || '',
      lastName: user?.lastName || '',
      email: user?.email || '',
      timezone: user?.timezone || 'America/Argentina/Buenos_Aires',
      language: user?.language || 'es'
    }
  });

  const handleAvatarChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      // Validar tamaño (max 2MB)
      if (file.size > 2 * 1024 * 1024) {
        addNotification({
          type: 'error',
          title: 'Error',
          message: 'La imagen debe ser menor a 2MB',
          autoClose: true
        });
        return;
      }

      // Crear preview
      const reader = new FileReader();
      reader.onload = (e) => {
        setAvatarPreview(e.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const onSubmit = async (data: ProfileFormData) => {
    setIsLoading(true);

    try {
      // Actualizar perfil
      await updateUser(data);
      
      addNotification({
        type: 'success',
        title: 'Perfil actualizado',
        message: 'Tus datos se han guardado correctamente',
        autoClose: true
      });

      reset(data);
    } catch (error: any) {
      addNotification({
        type: 'error',
        title: 'Error',
        message: error.message || 'No se pudo actualizar el perfil',
        autoClose: true
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Box sx={{ maxWidth: 800, mx: 'auto' }}>
      <Paper sx={{ p: 4 }}>
        <Typography variant="h5" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <User size={24} />
          Perfil de Usuario
        </Typography>

        <Divider sx={{ mb: 3 }} />

        <Box component="form" onSubmit={handleSubmit(onSubmit)}>
          {/* Avatar Section */}
          <Box sx={{ mb: 4, textAlign: 'center' }}>
            <Box sx={{ position: 'relative', display: 'inline-block' }}>
              <Avatar
                src={avatarPreview || user?.avatar}
                sx={{ width: 120, height: 120, mx: 'auto', mb: 2 }}
              >
                {user?.firstName?.charAt(0)}{user?.lastName?.charAt(0)}
              </Avatar>
              <IconButton
                component="label"
                sx={{
                  position: 'absolute',
                  bottom: 8,
                  right: 8,
                  bgcolor: 'primary.main',
                  color: 'white',
                  '&:hover': { bgcolor: 'primary.dark' }
                }}
              >
                <Camera size={20} />
                <input
                  type="file"
                  hidden
                  accept="image/*"
                  onChange={handleAvatarChange}
                />
              </IconButton>
            </Box>
            <Typography variant="body2" color="text.secondary">
              Haz clic en el ícono para cambiar tu foto de perfil
            </Typography>
          </Box>

          {/* Form Fields */}
          <Grid container spacing={3}>
            <Grid item xs={12} sm={6}>
              <TextField
                {...register('firstName')}
                fullWidth
                label="Nombre"
                error={!!errors.firstName}
                helperText={errors.firstName?.message}
              />
            </Grid>
            
            <Grid item xs={12} sm={6}>
              <TextField
                {...register('lastName')}
                fullWidth
                label="Apellido"
                error={!!errors.lastName}
                helperText={errors.lastName?.message}
              />
            </Grid>
            
            <Grid item xs={12}>
              <TextField
                {...register('email')}
                fullWidth
                label="Email"
                type="email"
                error={!!errors.email}
                helperText={errors.email?.message}
              />
            </Grid>
            
            <Grid item xs={12} sm={6}>
              <FormControl fullWidth error={!!errors.timezone}>
                <InputLabel>Zona Horaria</InputLabel>
                <Select
                  {...register('timezone')}
                  label="Zona Horaria"
                >
                  {timezones.map((tz) => (
                    <MenuItem key={tz.value} value={tz.value}>
                      {tz.label}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            
            <Grid item xs={12} sm={6}>
              <FormControl fullWidth error={!!errors.language}>
                <InputLabel>Idioma</InputLabel>
                <Select
                  {...register('language')}
                  label="Idioma"
                >
                  {languages.map((lang) => (
                    <MenuItem key={lang.value} value={lang.value}>
                      {lang.label}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
          </Grid>

          {/* Action Buttons */}
          <Box sx={{ mt: 4, display: 'flex', gap: 2 }}>
            <Button
              type="submit"
              variant="contained"
              startIcon={<Save size={20} />}
              disabled={isLoading || !isDirty}
              sx={{ minWidth: 140 }}
            >
              {isLoading ? 'Guardando...' : 'Guardar Cambios'}
            </Button>
            
            <Button
              type="button"
              variant="outlined"
              onClick={() => reset()}
              disabled={isLoading || !isDirty}
            >
              Cancelar
            </Button>
          </Box>

          {isDirty && (
            <Alert severity="info" sx={{ mt: 2 }}>
              Tienes cambios sin guardar. Asegúrate de hacer clic en "Guardar Cambios" para confirmar las modificaciones.
            </Alert>
          )}
        </Box>
      </Paper>
    </Box>
  );
};
```

### 5. Notification System

#### 5.1 Notification Provider: components/ui/NotificationProvider.tsx
```typescript
import React from 'react';
import { Snackbar, Alert, Slide, SlideProps } from '@mui/material';
import { useUIStore } from '@shared/store/uiStore';

function SlideTransition(props: SlideProps) {
  return <Slide {...props} direction="down" />;
}

export const NotificationProvider: React.FC = () => {
  const { notifications, removeNotification } = useUIStore();

  const handleClose = (notificationId: string) => {
    removeNotification(notificationId);
  };

  return (
    <>
      {notifications.map((notification) => (
        <Snackbar
          key={notification.id}
          open={true}
          autoHideDuration={notification.autoClose ? (notification.duration || 5000) : null}
          onClose={() => handleClose(notification.id)}
          anchorOrigin={{ vertical: 'top', horizontal: 'right' }}
          TransitionComponent={SlideTransition}
          sx={{ mt: 8 }} // Adjust for AppBar
        >
          <Alert
            onClose={() => handleClose(notification.id)}
            severity={notification.type}
            variant="filled"
            sx={{ minWidth: 300 }}
          >
            {notification.title && (
              <strong>{notification.title}: </strong>
            )}
            {notification.message}
          </Alert>
        </Snackbar>
      ))}
    </>
  );
};
```

## Criterios de Aceptación

### Funcionales
- [ ] Login funcionando con validación de campos
- [ ] Company selector para usuarios multi-empresa
- [ ] Feature flags evaluándose correctamente en componentes
- [ ] User profile con actualización de datos
- [ ] Guards de autenticación protegiendo rutas privadas
- [ ] Sistema de notificaciones funcionando

### Técnicos
- [ ] Formularios con validación usando react-hook-form + yup
- [ ] Feature flag evaluation con caching para performance
- [ ] Auth guards con loading states apropiados
- [ ] Component re-renders optimizados
- [ ] Error handling robusto en todos los flujos
- [ ] TypeScript tipos definidos correctamente

### UI/UX
- [ ] Interfaces responsive en desktop y mobile
- [ ] Loading states y feedback visual apropiado
- [ ] Error messages claros y accionables
- [ ] Navegación intuitiva entre estados de auth
- [ ] Transiciones suaves entre pantallas
- [ ] Accesibilidad básica implementada

### Seguridad
- [ ] Tokens almacenados de forma segura
- [ ] Auth guards validando permisos correctamente
- [ ] Input sanitization en formularios
- [ ] Error messages no exponiendo información sensible
- [ ] Session cleanup al logout

## Riesgos y Mitigaciones

### Riesgo: Feature flag cache inconsistency
**Mitigación:** TTL corto y refresh manual cuando sea necesario

### Riesgo: Auth token expiry durante uso activo
**Mitigación:** Refresh token automático y manejo graceful de expiry

### Riesgo: Memory leaks por subscriptions no limpiadas
**Mitigación:** Cleanup apropiado en useEffect hooks

## Entregables

### Pages & Components
1. **LoginPage** - Formulario de login con validación
2. **RegisterPage** - Formulario de registro de usuario
3. **CompanySelector** - Selección de empresa para usuarios multi-empresa
4. **UserProfile** - Gestión de perfil de usuario
5. **AuthGuard** - Protección de rutas con validación de roles

### Hooks & Services
1. **useAuth** - Hook principal de autenticación
2. **useFeatureFlag** - Hook para evaluación de feature flags
3. **authService** - API calls para autenticación
4. **tokenService** - Gestión de JWT tokens

### UI Components
1. **FeatureFlag** - Component wrapper para feature flags
2. **NotificationProvider** - Sistema de notificaciones
3. **LoadingOverlay** - Component de loading global
4. **ProtectedRoute** - HOC para protección de rutas

### Utils & Types
1. **Auth types** - Interfaces TypeScript para auth
2. **Validation schemas** - Yup schemas para formularios
3. **Storage utils** - Utilidades para localStorage seguro

## Dependencies

### Externas
- Backend APIs del Backend Team (Sprint 2)
- JWT token validation working
- Feature flag evaluation endpoints

### Internas
- UI Store del Sprint 1
- API service configuration del Sprint 1
- Routing setup del Sprint 1
- Material-UI theme del Sprint 1