import { lazy, Suspense, useEffect } from 'react'
import { BrowserRouter as Router, Routes, Route, Navigate, Link } from 'react-router-dom'
import { ThemeProvider, createTheme } from '@mui/material/styles'
import CssBaseline from '@mui/material/CssBaseline'
import { CircularProgress, Box, Typography, Button } from '@mui/material'

// Shared components (no lazy load for layout y error handling)
import Layout from './shared/components/Layout'
import AuthLayout from './components/layout/AuthLayout'
import ErrorBoundary from './shared/components/ErrorBoundary'
import RouteGuard from './shared/components/RouteGuard'
import NotificationProvider from './shared/components/NotificationProvider'

// Performance monitoring - Solo en desarrollo
import { initWebVitals, logWebVitals } from './utils/webVitals'
import PerformanceMonitor from './components/dev/PerformanceMonitor'

// Loading component for lazy loading
const LoadingFallback = () => (
  <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
    <CircularProgress />
  </Box>
)

// Lazy load pages and modules - MVP con lazy loading básico
// TODO: En Nivel 2 agregar retry logic y preload
const Dashboard = lazy(() => import('./pages/Dashboard'))
const NotFound = lazy(() => import('./pages/NotFound'))
const ErrorPage = lazy(() => import('./pages/ErrorPage'))
const UIComponentsDemo = lazy(() => import('./pages/UIComponentsDemo'))
const StateManagementDemo = lazy(() => import('./pages/StateManagementDemo'))
const AuthModule = lazy(() => import('./modules/auth'))
const OmniModule = lazy(() => import('./modules/omni'))
const CrmModule = lazy(() => import('./modules/crm'))
const WorkflowModule = lazy(() => import('./modules/workflow'))
const AnalyticsModule = lazy(() => import('./modules/analytics'))

// Importar tema personalizado
import { theme } from './styles/theme'

// App principal con arquitectura modular y lazy loading
function App() {
  // Inicializar Web Vitals en desarrollo
  useEffect(() => {
    if (process.env.NODE_ENV === 'development') {
      initWebVitals();
      logWebVitals();
    }
  }, []);

  return (
    <ErrorBoundary>
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
              <Route path="omni/*" element={<OmniModule />} />
              <Route path="crm/*" element={<CrmModule />} />
              <Route path="workflow/*" element={<WorkflowModule />} />
              <Route path="analytics/*" element={<AnalyticsModule />} />
            </Route>
            
            {/* Ruta 404 */}
            <Route path="*" element={<NotFound />} />
          </Routes>
          </Suspense>
        </Router>
        {/* Performance Monitor - Solo en desarrollo */}
        {process.env.NODE_ENV === 'development' && <PerformanceMonitor />}
      </ThemeProvider>
    </ErrorBoundary>
  )
}


export default App