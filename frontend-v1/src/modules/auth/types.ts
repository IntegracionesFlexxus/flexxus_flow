/**
 * Auth Module Exports - Sprint 2
 * Exporta todos los componentes, hooks y servicios del módulo de autenticación
 */

// Pages
export { LoginPage } from './pages/LoginPage';
export { CompanySelector } from './pages/CompanySelector';

// Components
export * from './components';

// Services
export { authService } from './services/authService';

// Types
export interface LoginCredentials {
  email: string;
  password: string;
  rememberMe?: boolean;
}

export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  avatar?: string;
  role?: string;
  companies?: Company[];
  preferences?: UserPreferences;
}

export interface Company {
  id: string;
  name: string;
  logo?: string;
  plan: 'basic' | 'professional' | 'enterprise';
  role: 'admin' | 'manager' | 'user' | 'viewer';
  isDefault?: boolean;
  lastAccessed?: string;
  status?: 'active' | 'suspended' | 'trial';
  trialDaysLeft?: number;
}

export interface UserPreferences {
  theme?: 'light' | 'dark' | 'auto';
  language?: string;
  timezone?: string;
  notifications?: {
    email: boolean;
    push: boolean;
    sms: boolean;
  };
}