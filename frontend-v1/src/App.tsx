import { lazy, Suspense, useEffect } from 'react'
import { BrowserRouter as Router, Routes, Route, Navigate, Link } from 'react-router-dom'
import { ThemeProvider, createTheme } from '@mui/material/styles'
import CssBaseline from '@mui/material/CssBaseline'
import { CircularProgress, Box, Typography, Button } from '@mui/material'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ReactQueryDevtools } from '@tanstack/react-query-devtools'

// Shared components (no lazy load for layout y error handling)
import Layout from './shared/components/Layout'
import AuthLayout from './components/layout/AuthLayout'
import ErrorBoundary from './components/ErrorBoundary'
import RouteGuard from './shared/components/RouteGuard'
import NotificationProvider from './shared/components/NotificationProvider'

// Error Handling - Sprint 3
import { EnhancedErrorBoundary } from './error-handling'

// Performance monitoring - Solo en desarrollo
import { initWebVitals, logWebVitals } from './utils/webVitals'
import PerformanceMonitor from './components/dev/PerformanceMonitor'

// WebSocket initialization for Omni module
import { useWebSocket } from './modules/omni/hooks'

// Loading component for lazy loading
const LoadingFallback = () => {
  console.log('🔄 LoadingFallback: Showing loading indicator for lazy module');
  return (
    <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
      <CircularProgress />
    </Box>
  );
}

// Lazy load pages and modules - MVP con lazy loading básico
// TODO: En Nivel 2 agregar retry logic y preload
const Dashboard = lazy(() => import('./pages/Dashboard'))
const NotFound = lazy(() => import('./pages/NotFound'))
const ErrorPage = lazy(() => import('./pages/ErrorPage'))

// Error pages - Sprint 3
const Error403 = lazy(() => import('./error-handling/components/ErrorPages/Error403'))
const Error500 = lazy(() => import('./error-handling/components/ErrorPages/Error500'))
const Error503 = lazy(() => import('./error-handling/components/ErrorPages/Error503'))
const UIComponentsDemo = lazy(() => import('./pages/UIComponentsDemo'))
const StateManagementDemo = lazy(() => import('./pages/StateManagementDemo'))
const AuthModule = lazy(() => import('./modules/auth'))
// const UsersModule = lazy(() => import('./modules/users'))
import UsersModule from './modules/users'

// Debug log
console.log('📱 App.tsx: UsersModule imported:', UsersModule)
const RolesModule = lazy(() => {
  console.log('🎭 App: Attempting to lazy load RolesModule');
  return import('./modules/roles')
    .then(module => {
      console.log('🎭 App: RolesModule loaded successfully', module);
      return module;
    })
    .catch(error => {
      console.error('🎭 App: Failed to load RolesModule', error);
      throw error;
    });
})
const CompaniesModule = lazy(() => import('./modules/companies'))
const FeatureFlagsModule = lazy(() => import('./modules/feature-flags'))
const OmniModule = lazy(() => import('./modules/omni'))
const CrmModule = lazy(() => import('./modules/crm'))
const WorkflowModule = lazy(() => import('./modules/workflow'))
const AnalyticsModule = lazy(() => import('./modules/analytics'))

// Importar tema personalizado
import { theme } from './styles/theme'

// Crear instancia de QueryClient
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 minutos
      retry: 3,
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
      refetchOnWindowFocus: false
    },
    mutations: {
      retry: 1
    }
  }
})

// App principal con arquitectura modular y lazy loading
function App() {
  // Inicializar WebSocket para módulo Omni
  useWebSocket();

  // Inicializar Web Vitals en desarrollo
  useEffect(() => {
    if (import.meta.env.DEV) {
      initWebVitals();
      logWebVitals();
    }
  }, []);

  return (
    <EnhancedErrorBoundary context="App Root">
      <QueryClientProvider client={queryClient}>
        <ThemeProvider theme={theme}>
          <CssBaseline />
          <NotificationProvider />
          <Router>
            <Suspense fallback={<LoadingFallback />}>
            <Routes>
            {/* Rutas de autenticación - AuthLayout se maneja dentro del módulo */}
            <Route path="/auth/*" element={<AuthModule />} />
            
            {/* Rutas protegidas con Layout compartido */}
            <Route
              path="/"
              element={
                <RouteGuard>
                  <Layout />
                </RouteGuard>
              }
            >
              {/* Dashboard principal */}
              <Route index element={<Navigate to="/dashboard" replace />} />
              <Route path="dashboard" element={<Dashboard />} />
              
              {/* Páginas demo - Solo desarrollo */}
              <Route path="ui-demo" element={<UIComponentsDemo />} />
              <Route path="state-demo" element={<StateManagementDemo />} />
              
              {/* Módulos de la aplicación con lazy loading */}
              <Route path="users/*" element={<UsersModule />} />
              <Route path="roles/*" element={<RolesModule />} />
              <Route path="companies/*" element={<CompaniesModule />} />
              <Route path="feature-flags/*" element={<FeatureFlagsModule />} />
              <Route path="omni/*" element={<OmniModule />} />
              <Route path="crm/*" element={<CrmModule />} />
              <Route path="workflow/*" element={<WorkflowModule />} />
              <Route path="analytics/*" element={<AnalyticsModule />} />
            </Route>
            
            {/* Rutas de error - Sprint 3 */}
            <Route path="/error/403" element={<Error403 />} />
            <Route path="/error/500" element={<Error500 />} />
            <Route path="/error/503" element={<Error503 />} />
            
            {/* Ruta 404 */}
            <Route path="*" element={<NotFound />} />
          </Routes>
            </Suspense>
          </Router>
          {/* Performance Monitor - Solo en desarrollo */}
          {import.meta.env.DEV && <PerformanceMonitor />}
          {/* React Query Devtools - Solo en desarrollo */}
          {import.meta.env.DEV && <ReactQueryDevtools initialIsOpen={false} />}
        </ThemeProvider>
      </QueryClientProvider>
    </EnhancedErrorBoundary>
  )
}


export default App