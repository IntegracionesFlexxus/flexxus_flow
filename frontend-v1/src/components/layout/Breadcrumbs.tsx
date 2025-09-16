import React from 'react'
import { 
  Breadcrumbs as MuiBreadcrumbs, 
  Typography, 
  Link,
  Box,
  Chip
} from '@mui/material'
import { 
  NavigateNext as NavigateNextIcon,
  Home as HomeIcon
} from '@mui/icons-material'
import { useNavigate, useLocation, Link as RouterLink } from 'react-router-dom'

// Breadcrumbs component - MVP con navegación básica
// TODO: En Nivel 2 agregar configuración por ruta y meta tags

const Breadcrumbs: React.FC = () => {
  const navigate = useNavigate()
  const location = useLocation()
  
  // Mapeo de rutas a nombres legibles
  // TODO: En Nivel 2 obtener de configuración de rutas
  const routeNameMap: Record<string, string> = {
    '/': 'Inicio',
    '/dashboard': 'Dashboard',
    '/omni': 'Omnicanalidad',
    '/crm': 'CRM',
    '/workflow': 'Workflows',
    '/analytics': 'Analytics',
    '/settings': 'Configuración',
    '/profile': 'Mi Perfil',
    '/support': 'Soporte',
    '/help': 'Ayuda',
    '/ui-demo': 'Demo UI',
    '/state-demo': 'Demo State'
  }
  
  // Generar breadcrumbs desde la ruta actual
  const pathnames = location.pathname.split('/').filter((x) => x)
  
  // Si estamos en dashboard, no mostrar breadcrumbs
  if (location.pathname === '/dashboard' || location.pathname === '/') {
    return null
  }
  
  return (
    <Box sx={{ mb: 2 }}>
      <MuiBreadcrumbs 
        separator={<NavigateNextIcon fontSize="small" />}
        aria-label="breadcrumb"
        sx={{
          '& .MuiBreadcrumbs-separator': {
            mx: 0.5
          }
        }}
      >
        {/* Home/Dashboard siempre presente */}
        <Link
          component={RouterLink}
          to="/dashboard"
          sx={{
            display: 'flex',
            alignItems: 'center',
            color: 'text.primary',
            textDecoration: 'none',
            '&:hover': {
              textDecoration: 'underline',
            },
          }}
        >
          <HomeIcon sx={{ mr: 0.5, fontSize: 20 }} />
          Dashboard
        </Link>
        
        {/* Generar breadcrumbs dinámicamente */}
        {pathnames.map((value, index) => {
          const last = index === pathnames.length - 1
          const to = `/${pathnames.slice(0, index + 1).join('/')}`
          const name = routeNameMap[to] || value.charAt(0).toUpperCase() + value.slice(1)
          
          return last ? (
            <Typography 
              key={to} 
              color="text.primary" 
              sx={{ 
                fontWeight: 600,
                display: 'flex',
                alignItems: 'center'
              }}
            >
              {name}
              {/* Mostrar badge si es página de demo */}
              {(to.includes('demo') || to.includes('test')) && (
                <Chip 
                  label="Dev" 
                  size="small" 
                  sx={{ ml: 1, height: 18 }}
                  color="warning"
                />
              )}
            </Typography>
          ) : (
            <Link
              key={to}
              component={RouterLink}
              to={to}
              sx={{
                color: 'text.primary',
                textDecoration: 'none',
                '&:hover': {
                  textDecoration: 'underline',
                },
              }}
            >
              {name}
            </Link>
          )
        })}
      </MuiBreadcrumbs>
    </Box>
  )
}

export default Breadcrumbs