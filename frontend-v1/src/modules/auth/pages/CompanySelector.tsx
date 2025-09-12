/**
 * Company Selector Component - Sprint 2
 * Siguiendo lineamientos nivel 2: Gestión multi-empresa con validación
 * Selector de empresa para usuarios con acceso a múltiples organizaciones
 */

import React, { useState, useEffect } from 'react';
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
  Avatar,
  Alert,
  Skeleton,
  Tooltip,
  Badge,
  IconButton
} from '@mui/material';
import { 
  Business, 
  People, 
  AdminPanelSettings, 
  CheckCircle,
  Star,
  ArrowBack,
  Refresh,
  Info
} from '@mui/icons-material';
import { useNavigate, useLocation } from 'react-router-dom';

// Hooks
import { useAuth } from '@/shared/hooks/useAuth';
import { useNotification } from '@/shared/hooks/useNotification';

// Types
interface Company {
  id: string;
  name: string;
  logo?: string;
  plan: 'basic' | 'professional' | 'enterprise';
  userCount?: number;
  role: 'admin' | 'manager' | 'user' | 'viewer';
  isDefault?: boolean;
  lastAccessed?: string;
  status?: 'active' | 'suspended' | 'trial';
  trialDaysLeft?: number;
}

interface LocationState {
  companies?: Company[];
  returnTo?: string;
}

/**
 * Obtiene el color del chip según el plan
 * @param {string} plan - Plan de la empresa
 * @returns {string} Color para el chip de Material-UI
 */
const getPlanColor = (plan: string): 'default' | 'primary' | 'secondary' | 'error' | 'info' | 'success' | 'warning' => {
  const colorMap: Record<string, 'default' | 'primary' | 'secondary' | 'error' | 'info' | 'success' | 'warning'> = {
    enterprise: 'error',
    professional: 'warning',
    basic: 'info'
  };
  return colorMap[plan.toLowerCase()] || 'default';
};

/**
 * Obtiene el ícono según el rol del usuario
 * @param {string} role - Rol del usuario en la empresa
 * @returns {React.ReactNode} Icono correspondiente al rol
 */
const getRoleIcon = (role: string): React.ReactNode => {
  switch (role.toLowerCase()) {
    case 'admin':
      return <AdminPanelSettings fontSize="small" />;
    case 'manager':
      return <People fontSize="small" />;
    default:
      return <Business fontSize="small" />;
  }
};

/**
 * Obtiene el label del rol en español
 * @param {string} role - Rol del usuario
 * @returns {string} Label del rol
 */
const getRoleLabel = (role: string): string => {
  const roleMap: Record<string, string> = {
    admin: 'Administrador',
    manager: 'Gerente',
    user: 'Usuario',
    viewer: 'Observador'
  };
  return roleMap[role.toLowerCase()] || role;
};

/**
 * Componente de selector de empresa para usuarios multi-empresa
 * Permite seleccionar la empresa activa cuando el usuario tiene acceso a múltiples
 * @returns {React.FC} Componente de selector de empresa
 */
export const CompanySelector: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, companies: authCompanies, switchCompany, refreshCompanies } = useAuth();
  const { showNotification } = useNotification();
  
  const [selectedCompany, setSelectedCompany] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [error, setError] = useState<string | null>(null);

  const locationState = location.state as LocationState;

  /**
   * Inicializa las empresas disponibles
   */
  useEffect(() => {
    // Usar empresas del location state si están disponibles (viene del login)
    // De lo contrario usar las del store de auth
    const availableCompanies = locationState?.companies || authCompanies || [];
    
    // Ordenar empresas: default primero, luego por último acceso
    const sortedCompanies = [...availableCompanies].sort((a, b) => {
      if (a.isDefault) return -1;
      if (b.isDefault) return 1;
      if (a.lastAccessed && b.lastAccessed) {
        return new Date(b.lastAccessed).getTime() - new Date(a.lastAccessed).getTime();
      }
      return 0;
    });
    
    setCompanies(sortedCompanies);
    
    // Si no hay empresas, mostrar error
    if (sortedCompanies.length === 0) {
      setError('No se encontraron empresas asociadas a tu cuenta');
    }
    
    // Si solo hay una empresa, seleccionarla automáticamente
    if (sortedCompanies.length === 1) {
      handleCompanySelect(sortedCompanies[0]);
    }
  }, [locationState, authCompanies]);

  /**
   * Maneja la selección de una empresa
   * @param {Company} company - Empresa seleccionada
   */
  const handleCompanySelect = async (company: Company) => {
    if (isLoading) return;

    // Validar si la empresa está suspendida
    if (company.status === 'suspended') {
      showNotification({
        type: 'error',
        title: 'Empresa suspendida',
        message: 'Esta empresa está temporalmente suspendida. Contacta al administrador.'
      });
      return;
    }

    // Advertencia si está en periodo de prueba
    if (company.status === 'trial' && company.trialDaysLeft && company.trialDaysLeft <= 7) {
      showNotification({
        type: 'warning',
        title: 'Periodo de prueba',
        message: `Esta empresa está en periodo de prueba. Quedan ${company.trialDaysLeft} días.`
      });
    }

    setIsLoading(true);
    setSelectedCompany(company.id);
    setError(null);

    try {
      // Cambiar contexto de empresa
      await switchCompany(company);
      
      // Notificación de éxito
      showNotification({
        type: 'success',
        title: 'Empresa seleccionada',
        message: `Bienvenido a ${company.name}`
      });

      // Navegar al destino
      const returnTo = locationState?.returnTo || '/dashboard';
      navigate(returnTo, { replace: true });
      
    } catch (error: any) {
      const errorMessage = error.response?.data?.message || error.message;
      
      showNotification({
        type: 'error',
        title: 'Error al cambiar de empresa',
        message: errorMessage || 'No se pudo cambiar de empresa. Intenta nuevamente.'
      });
      
      setSelectedCompany(null);
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Actualiza la lista de empresas
   */
  const handleRefresh = async () => {
    if (isRefreshing) return;

    setIsRefreshing(true);
    setError(null);

    try {
      const updatedCompanies = await refreshCompanies();
      setCompanies(updatedCompanies);
      
      showNotification({
        type: 'info',
        title: 'Lista actualizada',
        message: 'La lista de empresas ha sido actualizada'
      });
    } catch (error: any) {
      showNotification({
        type: 'error',
        title: 'Error al actualizar',
        message: 'No se pudo actualizar la lista de empresas'
      });
    } finally {
      setIsRefreshing(false);
    }
  };

  /**
   * Vuelve al login
   */
  const handleBackToLogin = () => {
    navigate('/auth/login', { replace: true });
  };

  // Mostrar skeleton mientras carga
  if (companies.length === 0 && !error) {
    return (
      <Container component="main" maxWidth="md">
        <Box sx={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Grid container spacing={3}>
            {[1, 2, 3].map((i) => (
              <Grid item xs={12} sm={6} md={4} key={i}>
                <Skeleton variant="rectangular" height={200} sx={{ borderRadius: 2 }} />
              </Grid>
            ))}
          </Grid>
        </Box>
      </Container>
    );
  }

  return (
    <Container component="main" maxWidth="lg">
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
            <Business
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
              Seleccionar Empresa
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {user?.firstName ? `Hola ${user.firstName}, ` : ''}
              tienes acceso a {companies.length} empresa{companies.length !== 1 ? 's' : ''}.
              Selecciona una para continuar.
            </Typography>
          </Box>

          {/* Error Alert */}
          {error && (
            <Alert 
              severity="error" 
              sx={{ mb: 3 }}
              action={
                <Button color="inherit" size="small" onClick={handleRefresh}>
                  Reintentar
                </Button>
              }
            >
              {error}
            </Alert>
          )}

          {/* Company Cards Grid */}
          <Grid container spacing={3} sx={{ mb: 4 }}>
            {companies.map((company) => (
              <Grid item xs={12} sm={6} md={4} key={company.id}>
                <Card
                  sx={{
                    position: 'relative',
                    height: '100%',
                    transition: 'all 0.2s ease-in-out',
                    opacity: isLoading && selectedCompany !== company.id ? 0.5 : 1,
                    ...(selectedCompany === company.id && {
                      transform: 'translateY(-4px)',
                      boxShadow: 4,
                      borderColor: 'primary.main',
                      borderWidth: 2,
                      borderStyle: 'solid'
                    }),
                    ...(company.status === 'suspended' && {
                      opacity: 0.6,
                      filter: 'grayscale(100%)'
                    })
                  }}
                >
                  {/* Default Badge */}
                  {company.isDefault && (
                    <Tooltip title="Empresa por defecto">
                      <Star 
                        sx={{ 
                          position: 'absolute', 
                          top: 8, 
                          right: 8, 
                          color: 'warning.main',
                          zIndex: 1
                        }} 
                      />
                    </Tooltip>
                  )}

                  <CardActionArea
                    onClick={() => handleCompanySelect(company)}
                    disabled={isLoading || company.status === 'suspended'}
                    sx={{ 
                      height: '100%',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'stretch',
                      justifyContent: 'flex-start'
                    }}
                  >
                    <CardContent 
                      sx={{ 
                        textAlign: 'center', 
                        p: 3,
                        height: '100%',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: 2
                      }}
                    >
                      {/* Company Avatar/Logo */}
                      <Box sx={{ display: 'flex', justifyContent: 'center' }}>
                        {company.logo ? (
                          <Avatar
                            src={company.logo}
                            sx={{
                              width: 80,
                              height: 80,
                              border: '2px solid',
                              borderColor: 'divider'
                            }}
                          />
                        ) : (
                          <Avatar
                            sx={{
                              width: 80,
                              height: 80,
                              bgcolor: 'primary.main',
                              fontSize: '2rem',
                              fontWeight: 'bold'
                            }}
                          >
                            {company.name.substring(0, 2).toUpperCase()}
                          </Avatar>
                        )}
                      </Box>

                      {/* Company Name */}
                      <Typography 
                        variant="h6" 
                        component="h2"
                        sx={{ 
                          fontWeight: 600,
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap'
                        }}
                      >
                        {company.name}
                      </Typography>

                      {/* Plan Badge */}
                      <Box sx={{ display: 'flex', justifyContent: 'center', gap: 1 }}>
                        <Chip
                          label={company.plan.toUpperCase()}
                          color={getPlanColor(company.plan)}
                          size="small"
                          variant="filled"
                        />
                        {company.status === 'trial' && company.trialDaysLeft && (
                          <Chip
                            label={`${company.trialDaysLeft} días`}
                            color="warning"
                            size="small"
                            variant="outlined"
                          />
                        )}
                      </Box>

                      {/* Role and User Count */}
                      <Box
                        sx={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: 2,
                          color: 'text.secondary',
                          mt: 'auto'
                        }}
                      >
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                          {getRoleIcon(company.role)}
                          <Typography variant="body2" color="inherit">
                            {getRoleLabel(company.role)}
                          </Typography>
                        </Box>
                        {company.userCount && (
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                            <People fontSize="small" />
                            <Typography variant="body2" color="inherit">
                              {company.userCount}
                            </Typography>
                          </Box>
                        )}
                      </Box>

                      {/* Loading/Selected Indicator */}
                      {selectedCompany === company.id && isLoading && (
                        <CheckCircle 
                          sx={{
                            position: 'absolute',
                            bottom: 12,
                            right: 12,
                            color: 'primary.main'
                          }}
                        />
                      )}

                      {/* Suspended Overlay */}
                      {company.status === 'suspended' && (
                        <Box
                          sx={{
                            position: 'absolute',
                            top: 0,
                            left: 0,
                            right: 0,
                            bottom: 0,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            backgroundColor: 'rgba(0, 0, 0, 0.7)',
                            borderRadius: 1
                          }}
                        >
                          <Typography variant="body1" color="white">
                            SUSPENDIDA
                          </Typography>
                        </Box>
                      )}
                    </CardContent>
                  </CardActionArea>
                </Card>
              </Grid>
            ))}
          </Grid>

          {/* Footer Actions */}
          <Box 
            sx={{ 
              display: 'flex', 
              justifyContent: 'space-between',
              alignItems: 'center',
              flexWrap: 'wrap',
              gap: 2 
            }}
          >
            <Button
              variant="text"
              startIcon={<ArrowBack />}
              onClick={handleBackToLogin}
              disabled={isLoading}
            >
              Volver al inicio de sesión
            </Button>

            <Box sx={{ display: 'flex', gap: 2 }}>
              <Tooltip title="Actualizar lista de empresas">
                <IconButton
                  onClick={handleRefresh}
                  disabled={isRefreshing || isLoading}
                  color="primary"
                >
                  <Refresh />
                </IconButton>
              </Tooltip>

              <Tooltip title="¿Necesitas ayuda?">
                <IconButton
                  onClick={() => navigate('/help')}
                  disabled={isLoading}
                  color="primary"
                >
                  <Info />
                </IconButton>
              </Tooltip>
            </Box>
          </Box>

          {/* Help Text */}
          <Box sx={{ mt: 3, textAlign: 'center' }}>
            <Typography variant="caption" color="text.secondary">
              ¿No encuentras tu empresa o tienes problemas para acceder?{' '}
              <Button
                variant="text"
                size="small"
                onClick={() => navigate('/contact')}
                disabled={isLoading}
                sx={{ textTransform: 'none' }}
              >
                Contacta al soporte
              </Button>
            </Typography>
          </Box>
        </Paper>
      </Box>
    </Container>
  );
};

export default CompanySelector;