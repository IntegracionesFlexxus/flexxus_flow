/**
 * Protected Route Component
 * Sprint 19 - Route protection with permission validation
 */

import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { Box, Typography, Button, Alert } from '@mui/material';
import { LockOutlined } from '@mui/icons-material';
import { useAuthStore } from '@/shared/store';
import { hasPermission, hasAnyPermission, hasAllPermissions, ProductQuotePermission } from '../config/permissions';

interface ProtectedRouteProps {
  children: React.ReactNode;
  permission?: ProductQuotePermission;
  permissions?: ProductQuotePermission[];
  requireAll?: boolean;
  fallback?: React.ReactNode;
  redirectTo?: string;
}

/**
 * ProtectedRoute Component
 * Protects routes based on user permissions
 */
export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({
  children,
  permission,
  permissions = [],
  requireAll = false,
  fallback,
  redirectTo = '/unauthorized'
}) => {
  const location = useLocation();
  const { user, isAuthenticated } = useAuthStore();

  // Check if user is authenticated
  if (!isAuthenticated || !user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // Get user permissions (adapt this based on your user model)
  const userPermissions = user.permissions || [];
  const userRole = user.role || '';

  // Combine single permission with permissions array
  const requiredPermissions = permission ? [permission] : permissions;

  // If no permissions are required, allow access
  if (requiredPermissions.length === 0) {
    return <>{children}</>;
  }

  // Check permissions based on requireAll flag
  let hasAccess = false;

  // Admin always has access
  if (userRole === 'admin') {
    hasAccess = true;
  } else if (requireAll) {
    hasAccess = hasAllPermissions(userPermissions, requiredPermissions);
  } else {
    hasAccess = hasAnyPermission(userPermissions, requiredPermissions);
  }

  // If user doesn't have access
  if (!hasAccess) {
    // If custom fallback is provided, render it
    if (fallback) {
      return <>{fallback}</>;
    }

    // Otherwise show unauthorized page or redirect
    if (redirectTo === '/unauthorized') {
      return <UnauthorizedPage />;
    }

    return <Navigate to={redirectTo} replace />;
  }

  // User has access, render children
  return <>{children}</>;
};

/**
 * Unauthorized Page Component
 * Default page shown when user lacks permissions
 */
const UnauthorizedPage: React.FC = () => {
  const navigate = useNavigate();

  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '60vh',
        textAlign: 'center',
        p: 3
      }}
    >
      <LockOutlined
        sx={{
          fontSize: 64,
          color: 'text.secondary',
          mb: 2
        }}
      />

      <Typography variant="h4" gutterBottom>
        Access Denied
      </Typography>

      <Typography variant="body1" color="text.secondary" sx={{ mb: 4 }}>
        You don't have permission to access this page.
        <br />
        Please contact your administrator if you need access.
      </Typography>

      <Alert severity="warning" sx={{ mb: 3, maxWidth: 500 }}>
        If you believe you should have access to this page, your permissions
        may need to be updated by an administrator.
      </Alert>

      <Box sx={{ display: 'flex', gap: 2 }}>
        <Button
          variant="contained"
          onClick={() => window.history.back()}
        >
          Go Back
        </Button>

        <Button
          variant="outlined"
          onClick={() => navigate('/crm')}
        >
          Go to CRM Dashboard
        </Button>
      </Box>
    </Box>
  );
};

// Import navigate hook
import { useNavigate } from 'react-router-dom';

/**
 * Hook to check permissions programmatically
 */
export const usePermissionCheck = () => {
  const { user, isAuthenticated } = useAuthStore();
  const userPermissions = user?.permissions || [];
  const userRole = user?.role || '';

  const checkPermission = (permission: ProductQuotePermission): boolean => {
    if (!isAuthenticated || !user) return false;
    if (userRole === 'admin') return true;
    return hasPermission(userPermissions, permission);
  };

  const checkAnyPermission = (permissions: ProductQuotePermission[]): boolean => {
    if (!isAuthenticated || !user) return false;
    if (userRole === 'admin') return true;
    return hasAnyPermission(userPermissions, permissions);
  };

  const checkAllPermissions = (permissions: ProductQuotePermission[]): boolean => {
    if (!isAuthenticated || !user) return false;
    if (userRole === 'admin') return true;
    return hasAllPermissions(userPermissions, permissions);
  };

  return {
    checkPermission,
    checkAnyPermission,
    checkAllPermissions,
    hasAccess: isAuthenticated,
    isAdmin: userRole === 'admin'
  };
};

export default ProtectedRoute;