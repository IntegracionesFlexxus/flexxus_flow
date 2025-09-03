import React, { useState } from 'react'
import { Outlet } from 'react-router-dom'
import {
  Box,
  AppBar,
  Toolbar,
  IconButton,
  Typography,
  useTheme,
  useMediaQuery,
  Container
} from '@mui/material'
import {
  Menu as MenuIcon,
  MenuOpen as MenuOpenIcon
} from '@mui/icons-material'

// Components
import Sidebar from './Sidebar'
import UserMenu from './UserMenu'
import NotificationMenu from './NotificationMenu'
import Breadcrumbs from './Breadcrumbs'
import Footer from './Footer'

// Store
import { useUIStore, useAuthStore } from '@/shared/store'

// Layout principal con diseño responsivo - MVP
// TODO: En Nivel 2 agregar más breakpoints y animaciones

const MainLayout: React.FC = () => {
  const theme = useTheme()
  const isMobile = useMediaQuery(theme.breakpoints.down('md'))
  const isTablet = useMediaQuery(theme.breakpoints.down('lg'))
  
  // Store hooks
  const { sidebarOpen, setSidebarOpen, sidebarCollapsed, collapseSidebar } = useUIStore()
  const { currentCompany } = useAuthStore()
  
  // Estado local para mobile drawer
  const [mobileOpen, setMobileOpen] = useState(false)
  
  // Handlers
  const handleDrawerToggle = () => {
    if (isMobile) {
      setMobileOpen(!mobileOpen)
    } else {
      setSidebarOpen(!sidebarOpen)
    }
  }
  
  const handleCollapsedToggle = () => {
    if (!isMobile) {
      collapseSidebar(!sidebarCollapsed)
    }
  }
  
  // Calcular ancho del contenido basado en estado del sidebar
  const getContentMargin = () => {
    if (isMobile) return 0
    if (!sidebarOpen) return 0
    if (sidebarCollapsed) return 64 // Mini drawer width
    return 240 // Full drawer width
  }
  
  return (
    <Box sx={{ display: 'flex', minHeight: '100vh', bgcolor: 'background.default' }}>
      {/* AppBar / Header */}
      <AppBar
        position="fixed"
        elevation={0}
        sx={{
          zIndex: (theme) => theme.zIndex.drawer + 1,
          backgroundColor: 'background.paper',
          color: 'text.primary',
          borderBottom: '1px solid',
          borderColor: 'divider',
          transition: theme.transitions.create(['width', 'margin'], {
            easing: theme.transitions.easing.sharp,
            duration: theme.transitions.duration.leavingScreen,
          }),
        }}
      >
        <Toolbar>
          {/* Menu Toggle */}
          <IconButton
            color="inherit"
            aria-label="toggle drawer"
            edge="start"
            onClick={handleDrawerToggle}
            sx={{ mr: 2 }}
          >
            {sidebarOpen && !isMobile ? <MenuOpenIcon /> : <MenuIcon />}
          </IconButton>
          
          {/* Logo/Title */}
          <Typography 
            variant="h6" 
            noWrap 
            component="div" 
            sx={{ 
              flexGrow: 0,
              mr: 4,
              fontWeight: 600,
              display: { xs: 'none', sm: 'block' }
            }}
          >
            Flexxus Flow
          </Typography>
          
          {/* Company Name */}
          <Typography 
            variant="body1" 
            noWrap 
            sx={{ 
              flexGrow: 1,
              color: 'text.secondary',
              display: { xs: 'none', md: 'block' }
            }}
          >
            {currentCompany?.name || 'Selecciona una empresa'}
          </Typography>
          
          {/* Spacer */}
          <Box sx={{ flexGrow: 1 }} />
          
          {/* Right Side Actions */}
          <NotificationMenu />
          <UserMenu />
        </Toolbar>
      </AppBar>
      
      {/* Sidebar */}
      <Sidebar 
        open={isMobile ? mobileOpen : sidebarOpen}
        collapsed={!isMobile && sidebarCollapsed}
        variant={isMobile ? 'temporary' : 'persistent'}
        onClose={() => setMobileOpen(false)}
        onCollapseToggle={handleCollapsedToggle}
      />
      
      {/* Main Content Area */}
      <Box
        component="main"
        sx={{
          flexGrow: 1,
          minHeight: '100vh',
          display: 'flex',
          flexDirection: 'column',
          transition: theme.transitions.create('margin', {
            easing: theme.transitions.easing.sharp,
            duration: theme.transitions.duration.leavingScreen,
          }),
          marginLeft: `${getContentMargin()}px`,
        }}
      >
        {/* Toolbar spacer */}
        <Toolbar />
        
        {/* Breadcrumbs */}
        <Container maxWidth={false} sx={{ mt: 2 }}>
          <Breadcrumbs />
        </Container>
        
        {/* Page Content */}
        <Container 
          maxWidth={false} 
          sx={{ 
            flex: 1,
            py: 3,
            px: { xs: 2, sm: 3, md: 4 }
          }}
        >
          <Outlet />
        </Container>
        
        {/* Footer */}
        <Footer />
      </Box>
    </Box>
  )
}

export default MainLayout