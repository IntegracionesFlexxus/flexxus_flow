// Configuración centralizada de rutas - MVP Nivel 1
// TODO: En Nivel 2 agregar metadata, breadcrumbs, permisos por rol

import { lazy } from 'react'
import { Navigate } from 'react-router-dom'
import { 
  Dashboard as DashboardIcon,
  Message as MessageIcon,
  People as PeopleIcon,
  AccountTree as WorkflowIcon,
  Analytics as AnalyticsIcon
} from '@mui/icons-material'

// Tipos básicos para rutas
export interface RouteConfig {
  path: string
  element?: React.LazyExoticComponent<any> | React.ComponentType<any>
  children?: RouteConfig[]
  protected?: boolean
  redirect?: string
  icon?: React.ReactNode
  label?: string
  showInMenu?: boolean
}

// Lazy load de páginas
const Dashboard = lazy(() => import('@/pages/Dashboard'))
const AuthModule = lazy(() => import('@/modules/auth'))
const OmniModule = lazy(() => import('@/modules/omni'))
const CrmModule = lazy(() => import('@/modules/crm'))
const WorkflowModule = lazy(() => import('@/modules/workflow'))
const AnalyticsModule = lazy(() => import('@/modules/analytics'))

// Configuración de rutas públicas
export const publicRoutes: RouteConfig[] = [
  {
    path: '/auth/*',
    element: AuthModule,
    protected: false
  }
]

// Configuración de rutas protegidas
export const protectedRoutes: RouteConfig[] = [
  {
    path: '/',
    redirect: '/dashboard',
    protected: true
  },
  {
    path: '/dashboard',
    element: Dashboard,
    icon: <DashboardIcon />,
    label: 'Dashboard',
    showInMenu: true,
    protected: true
  },
  {
    path: '/omni/*',
    element: OmniModule,
    icon: <MessageIcon />,
    label: 'Omnicanalidad',
    showInMenu: true,
    protected: true
  },
  {
    path: '/crm/*',
    element: CrmModule,
    icon: <PeopleIcon />,
    label: 'CRM',
    showInMenu: true,
    protected: true
  },
  {
    path: '/workflow/*',
    element: WorkflowModule,
    icon: <WorkflowIcon />,
    label: 'Workflows',
    showInMenu: true,
    protected: true
  },
  {
    path: '/analytics/*',
    element: AnalyticsModule,
    icon: <AnalyticsIcon />,
    label: 'Analytics',
    showInMenu: true,
    protected: true
  }
]

// Helper para obtener rutas del menú
export const getMenuRoutes = () => {
  return protectedRoutes.filter(route => route.showInMenu)
}

// Helper para verificar si ruta está activa
export const isRouteActive = (currentPath: string, routePath: string) => {
  // Remover asterisco para comparación
  const cleanPath = routePath.replace('/*', '')
  return currentPath.startsWith(cleanPath)
}

// TODO: En Nivel 2 agregar:
// - Breadcrumbs automáticos
// - Títulos de página
// - Meta tags para SEO
// - Permisos y roles
// - Rutas anidadas complejas