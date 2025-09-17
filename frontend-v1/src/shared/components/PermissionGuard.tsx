import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuthStore } from '@/shared/store/authStore';
import { useRoleValidation } from '@/shared/hooks/useRoleValidation';
import { Box, Typography, Alert } from '@mui/material';

interface PermissionGuardProps {
  children: React.ReactNode;
  permission?: string;
  requireSuperAdmin?: boolean;
  fallback?: React.ReactNode;
  redirectTo?: string;
}

/**
 * PermissionGuard - Protege rutas basado en permisos
 * Solo permite acceso si el usuario tiene el permiso requerido
 */
export const PermissionGuard: React.FC<PermissionGuardProps> = ({
  children,
  permission,
  requireSuperAdmin = false,
  fallback,
  redirectTo = '/dashboard'
}) => {
  const { user, isAuthenticated, currentCompany } = useAuthStore();
  const { isSuperAdmin } = useRoleValidation();

  // Debug logs
  console.log('🛡️ [PermissionGuard] Checking access:', {
    requireSuperAdmin,
    isSuperAdmin: isSuperAdmin(),
    currentCompany,
    permission,
    isAuthenticated
  });

  // Si no está autenticado, redirigir a login
  if (!isAuthenticated) {
    return <Navigate to="/auth/login" replace />;
  }

  // Si requiere SuperAdmin específicamente
  if (requireSuperAdmin && !isSuperAdmin()) {
    if (fallback) {
      return <>{fallback}</>;
    }

    return (
      <Box sx={{ p: 3 }}>
        <Alert severity="error">
          <Typography variant="h6" gutterBottom>
            Acceso Restringido
          </Typography>
          <Typography>
            Esta sección está disponible únicamente para SuperAdministradores.
          </Typography>
        </Alert>
      </Box>
    );
  }

  // Si requiere un permiso específico (para futuras implementaciones)
  if (permission) {
    // TODO: Implementar verificación de permisos específicos
    // Por ahora, solo verificamos SuperAdmin
    if (!isSuperAdmin()) {
      if (fallback) {
        return <>{fallback}</>;
      }

      return (
        <Box sx={{ p: 3 }}>
          <Alert severity="error">
            <Typography variant="h6" gutterBottom>
              Permisos Insuficientes
            </Typography>
            <Typography>
              No tienes los permisos necesarios para acceder a esta sección.
            </Typography>
          </Alert>
        </Box>
      );
    }
  }

  return <>{children}</>;
};

export default PermissionGuard;