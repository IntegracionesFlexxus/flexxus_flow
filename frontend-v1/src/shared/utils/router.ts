// Utilidades para el sistema de routing - MVP
// TODO: En Nivel 2 agregar navegación programática avanzada

import { NavigateFunction } from 'react-router-dom'

// Helper para navegar con returnUrl
export const navigateWithReturnUrl = (
  navigate: NavigateFunction, 
  to: string, 
  currentPath: string
) => {
  // Guardar la ruta actual para volver después
  localStorage.setItem('returnUrl', currentPath)
  navigate(to)
}

// Helper para navegar después de login
export const navigateAfterLogin = (navigate: NavigateFunction) => {
  const returnUrl = localStorage.getItem('returnUrl')
  if (returnUrl) {
    localStorage.removeItem('returnUrl')
    navigate(returnUrl)
  } else {
    navigate('/dashboard')
  }
}

// Helper para construir rutas con parámetros
export const buildPath = (path: string, params: Record<string, string>) => {
  let finalPath = path
  Object.entries(params).forEach(([key, value]) => {
    finalPath = finalPath.replace(`:${key}`, value)
  })
  return finalPath
}

// Helper para obtener breadcrumbs de la ruta actual
export const getBreadcrumbs = (pathname: string) => {
  const paths = pathname.split('/').filter(Boolean)
  const breadcrumbs = []
  
  let currentPath = ''
  for (const path of paths) {
    currentPath += `/${path}`
    breadcrumbs.push({
      label: path.charAt(0).toUpperCase() + path.slice(1),
      path: currentPath
    })
  }
  
  return breadcrumbs
}

// Helper para verificar si una ruta requiere autenticación
export const isProtectedRoute = (path: string) => {
  const publicPaths = ['/auth', '/login', '/register', '/forgot-password']
  return !publicPaths.some(publicPath => path.startsWith(publicPath))
}

// TODO: En Nivel 2 agregar:
// - Precarga de rutas (prefetch)
// - Historial de navegación personalizado
// - Animaciones de transición
// - Deep linking support
// - Query params management