import React, { useState } from 'react'
import {
  IconButton,
  Avatar,
  Menu,
  MenuItem,
  ListItemIcon,
  ListItemText,
  Divider,
  Typography,
  Box,
  Chip
} from '@mui/material'
import {
  Person as PersonIcon,
  Settings as SettingsIcon,
  Logout as LogoutIcon,
  Business as BusinessIcon,
  SwitchAccount as SwitchAccountIcon
} from '@mui/icons-material'
import { useNavigate } from 'react-router-dom'

// Store
import { useAuth, useModal } from '@/shared/store'

// UserMenu component - MVP con funcionalidades básicas
// TODO: En Nivel 2 agregar cambio de empresa y más opciones

const UserMenu: React.FC = () => {
  const navigate = useNavigate()
  const { user, currentCompany, logout } = useAuth()
  const companyModal = useModal('company-selector')
  
  // Estado del menú
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null)
  const open = Boolean(anchorEl)
  
  const handleClick = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget)
  }
  
  const handleClose = () => {
    setAnchorEl(null)
  }
  
  const handleProfile = () => {
    navigate('/profile')
    handleClose()
  }
  
  const handleSettings = () => {
    navigate('/settings')
    handleClose()
  }
  
  const handleSwitchCompany = () => {
    companyModal.open()
    handleClose()
  }
  
  const handleLogout = () => {
    logout()
    handleClose()
  }
  
  // Obtener iniciales del usuario
  const getUserInitials = () => {
    if (!user) return '?'
    const firstInitial = user.firstName?.[0] || ''
    const lastInitial = user.lastName?.[0] || ''
    return (firstInitial + lastInitial).toUpperCase() || user.email[0].toUpperCase()
  }
  
  // Obtener color del avatar basado en el rol
  const getAvatarColor = () => {
    if (!user?.role) return 'default'
    switch (user.role) {
      case 'admin': return 'error'
      case 'manager': return 'primary'
      default: return 'default'
    }
  }
  
  if (!user) return null
  
  return (
    <>
      <IconButton
        onClick={handleClick}
        size="small"
        sx={{ ml: 2 }}
        aria-controls={open ? 'user-menu' : undefined}
        aria-haspopup="true"
        aria-expanded={open ? 'true' : undefined}
      >
        <Avatar 
          sx={{ 
            width: 32, 
            height: 32, 
            bgcolor: `${getAvatarColor()}.main`,
            fontSize: '0.875rem'
          }}
        >
          {getUserInitials()}
        </Avatar>
      </IconButton>
      
      <Menu
        id="user-menu"
        anchorEl={anchorEl}
        open={open}
        onClose={handleClose}
        onClick={handleClose}
        transformOrigin={{ horizontal: 'right', vertical: 'top' }}
        anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
        PaperProps={{
          elevation: 0,
          sx: {
            overflow: 'visible',
            filter: 'drop-shadow(0px 2px 8px rgba(0,0,0,0.32))',
            mt: 1.5,
            minWidth: 280,
            '& .MuiAvatar-root': {
              width: 32,
              height: 32,
              ml: -0.5,
              mr: 1,
            },
            '&:before': {
              content: '""',
              display: 'block',
              position: 'absolute',
              top: 0,
              right: 14,
              width: 10,
              height: 10,
              bgcolor: 'background.paper',
              transform: 'translateY(-50%) rotate(45deg)',
              zIndex: 0,
            },
          },
        }}
      >
        {/* User Info Header */}
        <Box sx={{ px: 2, py: 1.5 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Avatar sx={{ bgcolor: `${getAvatarColor()}.main` }}>
              {getUserInitials()}
            </Avatar>
            <Box>
              <Typography variant="body1" fontWeight={600}>
                {user.firstName} {user.lastName}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {user.email}
              </Typography>
              {user.role && (
                <Chip 
                  label={user.role} 
                  size="small" 
                  sx={{ mt: 0.5 }}
                  color={getAvatarColor() as any}
                />
              )}
            </Box>
          </Box>
        </Box>
        
        <Divider />
        
        {/* Company Info */}
        {currentCompany && (
          <>
            <MenuItem onClick={handleSwitchCompany}>
              <ListItemIcon>
                <BusinessIcon fontSize="small" />
              </ListItemIcon>
              <ListItemText 
                primary={currentCompany.name}
                secondary={`Plan: ${currentCompany.plan}`}
              />
              <SwitchAccountIcon fontSize="small" color="action" />
            </MenuItem>
            <Divider />
          </>
        )}
        
        {/* Menu Options */}
        <MenuItem onClick={handleProfile}>
          <ListItemIcon>
            <PersonIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText>Mi Perfil</ListItemText>
        </MenuItem>
        
        <MenuItem onClick={handleSettings}>
          <ListItemIcon>
            <SettingsIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText>Configuración</ListItemText>
        </MenuItem>
        
        <Divider />
        
        <MenuItem onClick={handleLogout}>
          <ListItemIcon>
            <LogoutIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText>Cerrar Sesión</ListItemText>
        </MenuItem>
      </Menu>
    </>
  )
}

export default UserMenu