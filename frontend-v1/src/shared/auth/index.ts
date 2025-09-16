/**
 * Auth System - Sprint 2
 * Siguiendo lineamientos nivel 2: Export centralizado del sistema completo de autenticación
 * Punto de entrada principal para todo el sistema de Auth Guards y autenticación
 */

// Hooks principales
export { useAuth, useAuthGuard, useAuthDebug } from '@/shared/hooks/useAuth';

// Componentes y Guards
export { 
  AuthGuard, 
  ProtectedRoute, 
  withAuthGuard, 
  ConditionalRender,
  useRouteGuard
} from '@/shared/components/AuthGuard';

// Store y estado
export { 
  useAuthStore,
  selectUser,
  selectToken,
  selectIsAuthenticated,
  selectCurrentCompany,
  selectIsLoading,
  selectError,
  selectCompanies,
  getAuthState,
  AuthUtils,
  mockLogin,
  type User,
  type UserCompany,
  type Company,
  type AuthState
} from '@/shared/store/authStore';

// Servicios
export { 
  authService,
  type LoginCredentials,
  type RegisterData,
  type ValidationResponse,
  type RefreshTokenResponse,
  type ForgotPasswordRequest,
  type ResetPasswordRequest,
  type ChangePasswordRequest
} from '@/modules/auth/services/authService';

export { 
  tokenService,
  type TokenPayload,
  type TokenStorage
} from '@/shared/services/tokenService';

// Utilidades de conveniencia para uso común
export const AuthSystem = {
  // Hooks
  useAuth,
  useAuthGuard,
  useAuthDebug,
  useRouteGuard,
  
  // Componentes
  AuthGuard,
  ProtectedRoute,
  ConditionalRender,
  withAuthGuard,
  
  // Servicios
  authService,
  tokenService,
  
  // Store
  useAuthStore,
  AuthUtils,
  
  // Utilidades
  mockLogin: mockLogin
};

export default AuthSystem;