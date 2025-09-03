---
title: "Sprint 01 - Frontend Team"
tipo: "funcionalidad"
estado: "vigente"
prioridad: "alta"
tags: ["frontend", "react", "typescript", "vite", "ui", "arquitectura"]
responsable: "Frontend Team"
fecha_inicio: "2024-01-01"
fecha_fin: "2024-01-14"
dependencias: []
version: "1.0"
sprint: 1
---

# Sprint 01 - Frontend Team

## Información del Sprint
- **Duración:** Semanas 1-2 (2 semanas)
- **Equipo:** Frontend Team (4 desarrolladores)
- **Objetivo:** Establecer la base del frontend con React TypeScript y arquitectura modular

## Objetivos Específicos

### Objetivo Principal
Crear la estructura completa del frontend con React + TypeScript, establecer herramientas de desarrollo, routing modular y componentes base para el desarrollo del sistema.

### Objetivos Técnicos
1. Configurar proyecto React con TypeScript usando Vite
2. Implementar routing architecture para módulos
3. Configurar UI component library y theme system
4. Establecer state management architecture
5. Configurar herramientas de desarrollo y linting
6. Crear layout base y navegación modular

## Tareas Detalladas

### 1. React + TypeScript Project Setup

#### 1.1 Inicialización del Proyecto
```bash
# Crear proyecto con Vite (mejor performance que CRA)
npm create vite@latest frontend -- --template react-ts
cd frontend

# Instalar dependencias adicionales
npm install react-router-dom @types/react-router-dom
npm install @mui/material @emotion/react @emotion/styled
npm install @mui/icons-material @mui/lab
npm install axios react-query @tanstack/react-query
npm install zustand immer
npm install react-hook-form @hookform/resolvers yup
npm install lucide-react
npm install socket.io-client @types/socket.io-client

# Dependencias de desarrollo
npm install --save-dev @typescript-eslint/eslint-plugin
npm install --save-dev @typescript-eslint/parser
npm install --save-dev eslint-plugin-react
npm install --save-dev eslint-plugin-react-hooks
npm install --save-dev prettier eslint-config-prettier
npm install --save-dev husky lint-staged
npm install --save-dev @testing-library/react @testing-library/jest-dom
npm install --save-dev @testing-library/user-event
npm install --save-dev @vitejs/plugin-react
```

#### 1.2 Estructura de Directorios
```
src/
├── components/              # Componentes reutilizables
│   ├── ui/                 # Componentes base (buttons, inputs, etc.)
│   ├── layout/             # Componentes de layout
│   ├── forms/              # Componentes de formularios
│   └── charts/             # Componentes de visualización
├── modules/                # Módulos por dominio
│   ├── auth/              # Módulo autenticación
│   │   ├── components/    # Componentes específicos
│   │   ├── pages/         # Páginas del módulo
│   │   ├── hooks/         # Hooks personalizados
│   │   ├── services/      # Servicios API
│   │   ├── types/         # Tipos TypeScript
│   │   └── index.ts       # Exportaciones
│   ├── omni/              # Módulo omnicanalidad
│   ├── crm/               # Módulo CRM
│   ├── workflow/          # Módulo workflows
│   └── analytics/         # Módulo analytics
├── shared/                # Recursos compartidos
│   ├── hooks/             # Hooks reutilizables
│   ├── services/          # Servicios compartidos
│   ├── utils/             # Utilidades
│   ├── constants/         # Constantes
│   ├── types/             # Tipos globales
│   └── store/             # Estado global
├── assets/                # Recursos estáticos
│   ├── images/
│   ├── icons/
│   └── fonts/
├── styles/                # Estilos globales
│   ├── globals.css
│   ├── variables.css
│   └── themes/
├── App.tsx                # Componente principal
├── main.tsx               # Punto de entrada
└── vite-env.d.ts          # Definiciones Vite
```

### 2. Configuración TypeScript y herramientas

#### 2.1 tsconfig.json
```json
{
  "compilerOptions": {
    "target": "ES2020",
    "useDefineForClassFields": true,
    "lib": ["ES2020", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "skipLibCheck": true,
    "moduleResolution": "bundler",
    "allowImportingTsExtensions": true,
    "resolveJsonModule": true,
    "isolatedModules": true,
    "noEmit": true,
    "jsx": "react-jsx",
    "strict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noFallthroughCasesInSwitch": true,
    "baseUrl": "./src",
    "paths": {
      "@/*": ["*"],
      "@components/*": ["components/*"],
      "@modules/*": ["modules/*"],
      "@shared/*": ["shared/*"],
      "@assets/*": ["assets/*"],
      "@styles/*": ["styles/*"]
    }
  },
  "include": ["src"],
  "references": [{ "path": "./tsconfig.node.json" }]
}
```

#### 2.2 Vite Configuration: vite.config.ts
```typescript
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@components': path.resolve(__dirname, './src/components'),
      '@modules': path.resolve(__dirname, './src/modules'),
      '@shared': path.resolve(__dirname, './src/shared'),
      '@assets': path.resolve(__dirname, './src/assets'),
      '@styles': path.resolve(__dirname, './src/styles')
    }
  },
  server: {
    port: 3000,
    host: true,
    proxy: {
      '/api': {
        target: 'http://localhost:3001',
        changeOrigin: true,
        secure: false
      }
    }
  },
  build: {
    outDir: 'dist',
    sourcemap: true
  }
})
```

#### 2.3 ESLint Configuration: .eslintrc.cjs
```javascript
module.exports = {
  root: true,
  env: { browser: true, es2020: true },
  extends: [
    'eslint:recommended',
    '@typescript-eslint/recommended',
    'plugin:react-hooks/recommended',
    'plugin:react/recommended',
    'plugin:react/jsx-runtime',
    'prettier'
  ],
  ignorePatterns: ['dist', '.eslintrc.cjs'],
  parser: '@typescript-eslint/parser',
  plugins: ['react-refresh', '@typescript-eslint'],
  rules: {
    'react-refresh/only-export-components': [
      'warn',
      { allowConstantExport: true },
    ],
    '@typescript-eslint/no-unused-vars': 'error',
    'react/prop-types': 'off',
    'react/react-in-jsx-scope': 'off'
  },
  settings: {
    react: {
      version: 'detect'
    }
  }
}
```

### 3. Routing Architecture para Módulos

#### 3.1 App Router Setup: App.tsx
```typescript
import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { ThemeProvider } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';

// Theme
import { theme } from '@styles/theme';

// Layout
import { MainLayout } from '@components/layout/MainLayout';
import { AuthLayout } from '@components/layout/AuthLayout';

// Modules (lazy loaded)
import { AuthModule } from '@modules/auth';
import { OmniModule } from '@modules/omni';
import { CrmModule } from '@modules/crm';
import { WorkflowModule } from '@modules/workflow';
import { AnalyticsModule } from '@modules/analytics';

// Guards
import { ProtectedRoute } from '@shared/components/ProtectedRoute';
import { AuthGuard } from '@shared/components/AuthGuard';

// Create query client
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 minutes
      retry: 3,
      refetchOnWindowFocus: false,
    },
  },
});

const App: React.FC = () => {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider theme={theme}>
        <CssBaseline />
        <Router>
          <Routes>
            {/* Public routes */}
            <Route path="/auth/*" element={
              <AuthLayout>
                <AuthModule />
              </AuthLayout>
            } />
            
            {/* Protected routes */}
            <Route path="/" element={
              <AuthGuard>
                <MainLayout />
              </AuthGuard>
            }>
              <Route index element={<Navigate to="/dashboard" replace />} />
              <Route path="dashboard" element={<div>Dashboard</div>} />
              <Route path="omni/*" element={<OmniModule />} />
              <Route path="crm/*" element={<CrmModule />} />
              <Route path="workflow/*" element={<WorkflowModule />} />
              <Route path="analytics/*" element={<AnalyticsModule />} />
            </Route>
            
            {/* 404 */}
            <Route path="*" element={<div>Page Not Found</div>} />
          </Routes>
        </Router>
        <ReactQueryDevtools initialIsOpen={false} />
      </ThemeProvider>
    </QueryClientProvider>
  );
};

export default App;
```

#### 3.2 Module Router Example: modules/auth/index.tsx
```typescript
import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';

// Pages
import { LoginPage } from './pages/LoginPage';
import { RegisterPage } from './pages/RegisterPage';
import { ForgotPasswordPage } from './pages/ForgotPasswordPage';
import { CompanySelector } from './pages/CompanySelector';

export const AuthModule: React.FC = () => {
  return (
    <Routes>
      <Route index element={<Navigate to="login" replace />} />
      <Route path="login" element={<LoginPage />} />
      <Route path="register" element={<RegisterPage />} />
      <Route path="forgot-password" element={<ForgotPasswordPage />} />
      <Route path="company-selector" element={<CompanySelector />} />
    </Routes>
  );
};
```

### 4. UI Component Library Setup

#### 4.1 Material-UI Theme: styles/theme.ts
```typescript
import { createTheme } from '@mui/material/styles';

// Color palette personalizada
const palette = {
  primary: {
    main: '#1976d2',
    light: '#42a5f5',
    dark: '#1565c0',
    contrastText: '#ffffff',
  },
  secondary: {
    main: '#dc004e',
    light: '#ff5983',
    dark: '#9a0036',
    contrastText: '#ffffff',
  },
  background: {
    default: '#f5f5f5',
    paper: '#ffffff',
  },
  text: {
    primary: '#212121',
    secondary: '#757575',
  },
};

// Typography personalizada
const typography = {
  fontFamily: '"Inter", "Roboto", "Helvetica", "Arial", sans-serif',
  h1: {
    fontSize: '2.5rem',
    fontWeight: 600,
    lineHeight: 1.2,
  },
  h2: {
    fontSize: '2rem',
    fontWeight: 600,
    lineHeight: 1.3,
  },
  h3: {
    fontSize: '1.75rem',
    fontWeight: 600,
    lineHeight: 1.4,
  },
  h4: {
    fontSize: '1.5rem',
    fontWeight: 600,
    lineHeight: 1.4,
  },
  h5: {
    fontSize: '1.25rem',
    fontWeight: 600,
    lineHeight: 1.5,
  },
  h6: {
    fontSize: '1rem',
    fontWeight: 600,
    lineHeight: 1.6,
  },
  body1: {
    fontSize: '1rem',
    lineHeight: 1.6,
  },
  body2: {
    fontSize: '0.875rem',
    lineHeight: 1.6,
  },
};

// Spacing personalizado
const spacing = 8;

export const theme = createTheme({
  palette,
  typography,
  spacing,
  shape: {
    borderRadius: 8,
  },
  components: {
    MuiButton: {
      styleOverrides: {
        root: {
          textTransform: 'none',
          borderRadius: 8,
          padding: '10px 20px',
          fontSize: '0.875rem',
          fontWeight: 600,
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
          borderRadius: 12,
        },
      },
    },
    MuiTextField: {
      defaultProps: {
        variant: 'outlined',
        size: 'medium',
      },
    },
  },
});
```

#### 4.2 Base UI Components

**Button Component: components/ui/Button.tsx**
```typescript
import React from 'react';
import { Button as MuiButton, ButtonProps as MuiButtonProps } from '@mui/material';
import { LoaderCircle } from 'lucide-react';

interface ButtonProps extends Omit<MuiButtonProps, 'startIcon' | 'endIcon'> {
  loading?: boolean;
  icon?: React.ReactNode;
  iconPosition?: 'start' | 'end';
}

export const Button: React.FC<ButtonProps> = ({
  loading = false,
  icon,
  iconPosition = 'start',
  children,
  disabled,
  ...props
}) => {
  const isDisabled = disabled || loading;
  
  const startIcon = loading ? (
    <LoaderCircle size={16} className="animate-spin" />
  ) : (
    iconPosition === 'start' ? icon : undefined
  );
  
  const endIcon = loading ? undefined : (
    iconPosition === 'end' ? icon : undefined
  );

  return (
    <MuiButton
      {...props}
      disabled={isDisabled}
      startIcon={startIcon}
      endIcon={endIcon}
    >
      {children}
    </MuiButton>
  );
};
```

**Input Component: components/ui/Input.tsx**
```typescript
import React from 'react';
import { TextField, TextFieldProps } from '@mui/material';
import { Controller, useFormContext, FieldPath, FieldValues } from 'react-hook-form';

interface InputProps<T extends FieldValues = FieldValues> extends Omit<TextFieldProps, 'name'> {
  name: FieldPath<T>;
  label: string;
  rules?: object;
}

export const Input = <T extends FieldValues = FieldValues>({
  name,
  label,
  rules,
  ...props
}: InputProps<T>) => {
  const { control } = useFormContext<T>();

  return (
    <Controller
      name={name}
      control={control}
      rules={rules}
      render={({ field, fieldState: { error } }) => (
        <TextField
          {...field}
          {...props}
          label={label}
          error={!!error}
          helperText={error?.message}
          fullWidth
          margin="normal"
        />
      )}
    />
  );
};
```

### 5. State Management Architecture

#### 5.1 Zustand Store Setup: shared/store/authStore.ts
```typescript
import { create } from 'zustand';
import { devtools, persist } from 'zustand/middleware';
import { immer } from 'zustand/middleware/immer';

interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  avatar?: string;
}

interface Company {
  id: string;
  name: string;
  plan: string;
  features: Record<string, boolean>;
}

interface AuthState {
  // State
  isAuthenticated: boolean;
  user: User | null;
  currentCompany: Company | null;
  companies: Company[];
  token: string | null;
  
  // Actions
  login: (user: User, token: string, companies: Company[]) => void;
  logout: () => void;
  switchCompany: (company: Company) => void;
  updateUser: (user: Partial<User>) => void;
  setToken: (token: string) => void;
}

export const useAuthStore = create<AuthState>()(
  devtools(
    persist(
      immer((set) => ({
        // Initial state
        isAuthenticated: false,
        user: null,
        currentCompany: null,
        companies: [],
        token: null,
        
        // Actions
        login: (user, token, companies) =>
          set((state) => {
            state.user = user;
            state.token = token;
            state.companies = companies;
            state.currentCompany = companies[0] || null;
            state.isAuthenticated = true;
          }),
          
        logout: () =>
          set((state) => {
            state.user = null;
            state.token = null;
            state.companies = [];
            state.currentCompany = null;
            state.isAuthenticated = false;
          }),
          
        switchCompany: (company) =>
          set((state) => {
            state.currentCompany = company;
          }),
          
        updateUser: (userData) =>
          set((state) => {
            if (state.user) {
              Object.assign(state.user, userData);
            }
          }),
          
        setToken: (token) =>
          set((state) => {
            state.token = token;
          }),
      })),
      {
        name: 'auth-store',
        partialize: (state) => ({
          isAuthenticated: state.isAuthenticated,
          user: state.user,
          currentCompany: state.currentCompany,
          companies: state.companies,
          token: state.token,
        }),
      }
    ),
    { name: 'auth-store' }
  )
);
```

#### 5.2 Global UI Store: shared/store/uiStore.ts
```typescript
import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import { immer } from 'zustand/middleware/immer';

interface Notification {
  id: string;
  type: 'success' | 'error' | 'warning' | 'info';
  title: string;
  message: string;
  autoClose?: boolean;
  duration?: number;
}

interface UIState {
  // Sidebar
  sidebarOpen: boolean;
  sidebarCollapsed: boolean;
  
  // Loading states
  globalLoading: boolean;
  loadingText?: string;
  
  // Notifications
  notifications: Notification[];
  
  // Modals
  modals: Record<string, boolean>;
  
  // Actions
  toggleSidebar: () => void;
  collapseSidebar: (collapsed: boolean) => void;
  setGlobalLoading: (loading: boolean, text?: string) => void;
  addNotification: (notification: Omit<Notification, 'id'>) => void;
  removeNotification: (id: string) => void;
  openModal: (modalId: string) => void;
  closeModal: (modalId: string) => void;
}

export const useUIStore = create<UIState>()(
  devtools(
    immer((set, get) => ({
      // Initial state
      sidebarOpen: true,
      sidebarCollapsed: false,
      globalLoading: false,
      loadingText: undefined,
      notifications: [],
      modals: {},
      
      // Actions
      toggleSidebar: () =>
        set((state) => {
          state.sidebarOpen = !state.sidebarOpen;
        }),
        
      collapseSidebar: (collapsed) =>
        set((state) => {
          state.sidebarCollapsed = collapsed;
        }),
        
      setGlobalLoading: (loading, text) =>
        set((state) => {
          state.globalLoading = loading;
          state.loadingText = text;
        }),
        
      addNotification: (notification) =>
        set((state) => {
          const id = Date.now().toString();
          state.notifications.push({ ...notification, id });
        }),
        
      removeNotification: (id) =>
        set((state) => {
          state.notifications = state.notifications.filter((n) => n.id !== id);
        }),
        
      openModal: (modalId) =>
        set((state) => {
          state.modals[modalId] = true;
        }),
        
      closeModal: (modalId) =>
        set((state) => {
          state.modals[modalId] = false;
        }),
    })),
    { name: 'ui-store' }
  )
);
```

### 6. Layout Components

#### 6.1 Main Layout: components/layout/MainLayout.tsx
```typescript
import React from 'react';
import { Outlet } from 'react-router-dom';
import { Box, AppBar, Toolbar, IconButton, Typography } from '@mui/material';
import { Menu, Bell, User } from 'lucide-react';

// Components
import { Sidebar } from './Sidebar';
import { UserMenu } from './UserMenu';
import { NotificationMenu } from './NotificationMenu';

// Store
import { useUIStore } from '@shared/store/uiStore';
import { useAuthStore } from '@shared/store/authStore';

export const MainLayout: React.FC = () => {
  const { sidebarOpen, toggleSidebar } = useUIStore();
  const { currentCompany } = useAuthStore();

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh' }}>
      {/* App Bar */}
      <AppBar
        position="fixed"
        sx={{
          zIndex: (theme) => theme.zIndex.drawer + 1,
          backgroundColor: 'white',
          color: 'text.primary',
          boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
        }}
      >
        <Toolbar>
          <IconButton
            edge="start"
            color="inherit"
            onClick={toggleSidebar}
            sx={{ mr: 2 }}
          >
            <Menu />
          </IconButton>
          
          <Typography variant="h6" noWrap component="div" sx={{ flexGrow: 1 }}>
            {currentCompany?.name || 'Sistema de Gestión'}
          </Typography>
          
          {/* Notifications */}
          <NotificationMenu />
          
          {/* User Menu */}
          <UserMenu />
        </Toolbar>
      </AppBar>

      {/* Sidebar */}
      <Sidebar open={sidebarOpen} />

      {/* Main Content */}
      <Box
        component="main"
        sx={{
          flexGrow: 1,
          p: 3,
          mt: '64px', // AppBar height
          ml: sidebarOpen ? '240px' : '0px',
          transition: 'margin-left 0.3s ease',
        }}
      >
        <Outlet />
      </Box>
    </Box>
  );
};
```

#### 6.2 Sidebar: components/layout/Sidebar.tsx
```typescript
import React from 'react';
import {
  Drawer,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  ListItemButton,
  Divider,
  Toolbar,
} from '@mui/material';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  MessageSquare,
  Users,
  Workflow,
  BarChart3,
  Settings,
} from 'lucide-react';

interface SidebarProps {
  open: boolean;
}

const menuItems = [
  {
    text: 'Dashboard',
    icon: <LayoutDashboard size={20} />,
    path: '/dashboard',
  },
  {
    text: 'Omnicanalidad',
    icon: <MessageSquare size={20} />,
    path: '/omni',
  },
  {
    text: 'CRM',
    icon: <Users size={20} />,
    path: '/crm',
  },
  {
    text: 'Workflows',
    icon: <Workflow size={20} />,
    path: '/workflow',
  },
  {
    text: 'Analytics',
    icon: <BarChart3 size={20} />,
    path: '/analytics',
  },
];

export const Sidebar: React.FC<SidebarProps> = ({ open }) => {
  const navigate = useNavigate();
  const location = useLocation();

  const isActive = (path: string) => {
    return location.pathname.startsWith(path);
  };

  return (
    <Drawer
      variant="persistent"
      anchor="left"
      open={open}
      sx={{
        width: 240,
        flexShrink: 0,
        '& .MuiDrawer-paper': {
          width: 240,
          boxSizing: 'border-box',
        },
      }}
    >
      <Toolbar /> {/* Spacer for AppBar */}
      
      <List>
        {menuItems.map((item) => (
          <ListItem key={item.text} disablePadding>
            <ListItemButton
              onClick={() => navigate(item.path)}
              selected={isActive(item.path)}
              sx={{
                '&.Mui-selected': {
                  backgroundColor: 'primary.50',
                  color: 'primary.main',
                  '&:hover': {
                    backgroundColor: 'primary.100',
                  },
                },
              }}
            >
              <ListItemIcon
                sx={{
                  color: isActive(item.path) ? 'primary.main' : 'inherit',
                }}
              >
                {item.icon}
              </ListItemIcon>
              <ListItemText primary={item.text} />
            </ListItemButton>
          </ListItem>
        ))}
      </List>
      
      <Divider />
      
      <List>
        <ListItem disablePadding>
          <ListItemButton onClick={() => navigate('/settings')}>
            <ListItemIcon>
              <Settings size={20} />
            </ListItemIcon>
            <ListItemText primary="Configuración" />
          </ListItemButton>
        </ListItem>
      </List>
    </Drawer>
  );
};
```

### 7. API Services Setup

#### 7.1 Axios Configuration: shared/services/api.ts
```typescript
import axios, { AxiosInstance, AxiosRequestConfig, AxiosResponse } from 'axios';
import { useAuthStore } from '@shared/store/authStore';
import { useUIStore } from '@shared/store/uiStore';

// Create axios instance
const api: AxiosInstance = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:3001/api/v1',
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor
api.interceptors.request.use(
  (config: AxiosRequestConfig) => {
    const token = useAuthStore.getState().token;
    const currentCompany = useAuthStore.getState().currentCompany;
    
    if (token) {
      config.headers = {
        ...config.headers,
        Authorization: `Bearer ${token}`,
      };
    }
    
    if (currentCompany) {
      config.headers = {
        ...config.headers,
        'X-Company-ID': currentCompany.id,
      };
    }
    
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor
api.interceptors.response.use(
  (response: AxiosResponse) => {
    return response;
  },
  (error) => {
    const { addNotification } = useUIStore.getState();
    
    // Handle 401 - Unauthorized
    if (error.response?.status === 401) {
      const { logout } = useAuthStore.getState();
      logout();
      window.location.href = '/auth/login';
      return Promise.reject(error);
    }
    
    // Handle other errors
    const message = error.response?.data?.message || 'Ha ocurrido un error inesperado';
    addNotification({
      type: 'error',
      title: 'Error',
      message,
      autoClose: true,
      duration: 5000,
    });
    
    return Promise.reject(error);
  }
);

export { api };

// API Response Types
export interface ApiResponse<T = any> {
  success: boolean;
  data: T;
  message?: string;
}

export interface PaginatedResponse<T> extends ApiResponse<T[]> {
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}
```

#### 7.2 Auth Service: modules/auth/services/authService.ts
```typescript
import { api, ApiResponse } from '@shared/services/api';

export interface LoginRequest {
  email: string;
  password: string;
}

export interface LoginResponse {
  user: {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
    avatar?: string;
  };
  token: string;
  companies: Array<{
    id: string;
    name: string;
    plan: string;
    features: Record<string, boolean>;
  }>;
}

export interface RegisterRequest {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  companyName: string;
}

export const authService = {
  async login(data: LoginRequest): Promise<LoginResponse> {
    const response = await api.post<ApiResponse<LoginResponse>>('/auth/login', data);
    return response.data.data;
  },

  async register(data: RegisterRequest): Promise<LoginResponse> {
    const response = await api.post<ApiResponse<LoginResponse>>('/auth/register', data);
    return response.data.data;
  },

  async logout(): Promise<void> {
    await api.post('/auth/logout');
  },

  async refreshToken(): Promise<{ token: string }> {
    const response = await api.post<ApiResponse<{ token: string }>>('/auth/refresh');
    return response.data.data;
  },

  async forgotPassword(email: string): Promise<void> {
    await api.post('/auth/forgot-password', { email });
  },

  async resetPassword(token: string, password: string): Promise<void> {
    await api.post('/auth/reset-password', { token, password });
  },
};
```

### 8. Custom Hooks

#### 8.1 Auth Hook: shared/hooks/useAuth.ts
```typescript
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '@shared/store/authStore';
import { useUIStore } from '@shared/store/uiStore';
import { authService, LoginRequest, RegisterRequest } from '@modules/auth/services/authService';

export const useAuth = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { login: setAuth, logout: clearAuth, isAuthenticated } = useAuthStore();
  const { addNotification } = useUIStore();

  const loginMutation = useMutation({
    mutationFn: authService.login,
    onSuccess: (data) => {
      setAuth(data.user, data.token, data.companies);
      addNotification({
        type: 'success',
        title: 'Bienvenido',
        message: `Hola ${data.user.firstName}!`,
        autoClose: true,
      });
      navigate('/dashboard');
    },
    onError: (error: any) => {
      addNotification({
        type: 'error',
        title: 'Error de autenticación',
        message: error.response?.data?.message || 'Credenciales incorrectas',
        autoClose: true,
      });
    },
  });

  const registerMutation = useMutation({
    mutationFn: authService.register,
    onSuccess: (data) => {
      setAuth(data.user, data.token, data.companies);
      addNotification({
        type: 'success',
        title: 'Registro exitoso',
        message: 'Tu cuenta ha sido creada correctamente',
        autoClose: true,
      });
      navigate('/dashboard');
    },
    onError: (error: any) => {
      addNotification({
        type: 'error',
        title: 'Error de registro',
        message: error.response?.data?.message || 'Error al crear la cuenta',
        autoClose: true,
      });
    },
  });

  const logout = async () => {
    try {
      await authService.logout();
    } catch (error) {
      // Logout even if API call fails
    }
    
    clearAuth();
    queryClient.clear();
    navigate('/auth/login');
  };

  return {
    isAuthenticated,
    login: loginMutation.mutate,
    register: registerMutation.mutate,
    logout,
    isLoading: loginMutation.isPending || registerMutation.isPending,
  };
};
```

## Criterios de Aceptación

### Funcionales
- [ ] Proyecto React + TypeScript compilando sin errores
- [ ] Routing modular funcionando para todos los módulos
- [ ] Material-UI theme aplicado correctamente
- [ ] State management con Zustand funcionando
- [ ] API service configurado con interceptors
- [ ] Layout responsive con sidebar funcional

### Técnicos
- [ ] Hot reload funcionando en desarrollo
- [ ] ESLint y Prettier configurados y funcionando
- [ ] TypeScript strict mode sin errores
- [ ] Bundle size optimizado (< 2MB gzipped)
- [ ] Vite build generando assets optimizados
- [ ] Source maps habilitados para debugging

### UI/UX
- [ ] Layout responsivo funcionando en desktop y mobile
- [ ] Theme customizado aplicado consistentemente  
- [ ] Componentes base funcionando correctamente
- [ ] Navegación intuitiva entre módulos
- [ ] Loading states y error handling básico
- [ ] Accesibilidad básica implementada

### Performance
- [ ] First contentful paint < 2 segundos
- [ ] Lazy loading de módulos funcionando
- [ ] Re-renders innecesarios minimizados
- [ ] Network requests optimizados
- [ ] Memory leaks controlados

## Entregables

### Código Base
1. **Estructura completa del proyecto** con todos los módulos
2. **Routing system** con lazy loading y guards
3. **UI component library** con theme personalizado
4. **State management** con Zustand stores
5. **API service layer** con interceptors y tipos
6. **Layout components** responsivos
7. **Custom hooks** para funcionalidad común
8. **Auth system** básico implementado

### Configuración
1. **Vite configuration** optimizada para desarrollo y producción
2. **TypeScript configuration** con paths y strict mode
3. **ESLint y Prettier** rules configuradas
4. **Environment variables** setup
5. **Package.json scripts** para desarrollo y deployment

### Documentación
1. **Component documentation** con ejemplos de uso
2. **Development guide** para nuevos desarrolladores
3. **Style guide** para consistency
4. **API integration guide** para conectar con backend

## Testing Strategy

### Unit Tests (Setup básico)
- Component rendering
- Custom hooks functionality
- Store state management
- Utility functions

### Integration Tests
- Routing navigation
- API service integration
- Form submissions
- Authentication flow

### E2E Tests (Setup preparatorio)
- User login/logout flow
- Module navigation
- Responsive behavior

## Dependencies

### Externas
- Node.js 18+ para desarrollo
- Backend API endpoints (del Backend Team)
- Design system specifications

### Internas
- Backend Team debe exponer APIs básicas
- Auth endpoints funcionando
- CORS configurado apropiadamente