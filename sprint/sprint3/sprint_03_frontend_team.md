---
title: "Sprint 03 - Frontend Team"
tipo: "funcionalidad"
estado: "vigente"
prioridad: "alta"
tags: ["frontend", "react", "typescript", "rbac", "usuarios", "roles", "ui", "admin"]
responsable: "Frontend Team"
fecha_inicio: "2024-01-29"
fecha_fin: "2024-02-11"
dependencias: ["sprint_02_frontend_team", "sprint_03_backend_team"]
version: "1.0"
sprint: 3
---

# Sprint 03 - Frontend Team

## Información del Sprint
- **Duración:** Semanas 5-6 (2 semanas)
- **Equipo:** Frontend Team (4 desarrolladores)
- **Objetivo:** Implementar interfaces de administración de usuarios, roles, permisos e invitaciones

## Objetivos Específicos

### Objetivo Principal
Desarrollar interfaces completas para administración de usuarios con sistema RBAC, gestión de invitaciones, configuración de empresas y preferencias de usuario.

### Objetivos Técnicos
1. Crear interfaces de gestión de usuarios con roles y permisos
2. Implementar sistema completo de invitaciones con workflow visual
3. Desarrollar configuración avanzada de empresas y preferencias
4. Crear componentes reutilizables para administración
5. Implementar data tables avanzadas con filtering y sorting
6. Establecer notification system para acciones administrativas

## Tareas Detalladas

### 1. User Management Interface

#### 1.1 User List Page: modules/auth/pages/UserManagement.tsx
```typescript
import React, { useState, useEffect } from 'react';
import {
  Box,
  Paper,
  Typography,
  Button,
  TextField,
  InputAdornment,
  Chip,
  Avatar,
  IconButton,
  Menu,
  MenuItem,
  Dialog,
  Tab,
  Tabs
} from '@mui/material';
import {
  Search,
  UserPlus,
  MoreVertical,
  Edit,
  Shield,
  Mail,
  Trash2,
  Filter
} from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

// Components
import { DataTable } from '@components/ui/DataTable';
import { UserInviteDialog } from '../components/UserInviteDialog';
import { UserEditDialog } from '../components/UserEditDialog';
import { PermissionDialog } from '../components/PermissionDialog';
import { ConfirmDialog } from '@components/ui/ConfirmDialog';

// Services
import { userService } from '../services/userService';
import { invitationService } from '../services/invitationService';

// Hooks
import { useAuthStore } from '@shared/store/authStore';
import { useUIStore } from '@shared/store/uiStore';
import { useFeatureFlag } from '@shared/hooks/useFeatureFlag';

interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  avatar?: string;
  role: string;
  status: string;
  lastLoginAt?: Date;
  createdAt: Date;
}

export const UserManagement: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedTab, setSelectedTab] = useState(0);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [dialogOpen, setDialogOpen] = useState<{
    invite: boolean;
    edit: boolean;
    permissions: boolean;
    delete: boolean;
  }>({
    invite: false,
    edit: false,
    permissions: false,
    delete: false
  });

  const { currentCompany } = useAuthStore();
  const { addNotification } = useUIStore();
  const queryClient = useQueryClient();
  
  // Feature flags
  const { isEnabled: canManageUsers } = useFeatureFlag('user_management');
  const { isEnabled: canInviteUsers } = useFeatureFlag('user_invitations');

  // Fetch users
  const { data: users = [], isLoading } = useQuery({
    queryKey: ['users', currentCompany?.id],
    queryFn: () => userService.getCompanyUsers(currentCompany!.id),
    enabled: !!currentCompany?.id
  });

  // Fetch invitations
  const { data: invitations = [] } = useQuery({
    queryKey: ['invitations', currentCompany?.id],
    queryFn: () => invitationService.getCompanyInvitations(currentCompany!.id),
    enabled: !!currentCompany?.id && canInviteUsers
  });

  // Delete user mutation
  const deleteUserMutation = useMutation({
    mutationFn: (userId: string) => userService.deleteUser(userId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      addNotification({
        type: 'success',
        title: 'Usuario eliminado',
        message: 'El usuario ha sido eliminado exitosamente',
        autoClose: true
      });
      setDialogOpen(prev => ({ ...prev, delete: false }));
      setSelectedUser(null);
    },
    onError: (error: any) => {
      addNotification({
        type: 'error',
        title: 'Error',
        message: error.message || 'No se pudo eliminar el usuario',
        autoClose: true
      });
    }
  });

  const handleMenuClick = (event: React.MouseEvent<HTMLElement>, user: User) => {
    event.stopPropagation();
    setSelectedUser(user);
    setAnchorEl(event.currentTarget);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
  };

  const handleEditUser = () => {
    setDialogOpen(prev => ({ ...prev, edit: true }));
    handleMenuClose();
  };

  const handleManagePermissions = () => {
    setDialogOpen(prev => ({ ...prev, permissions: true }));
    handleMenuClose();
  };

  const handleDeleteUser = () => {
    setDialogOpen(prev => ({ ...prev, delete: true }));
    handleMenuClose();
  };

  const handleResendInvitation = async (invitationId: string) => {
    try {
      await invitationService.resendInvitation(invitationId);
      addNotification({
        type: 'success',
        title: 'Invitación reenviada',
        message: 'La invitación ha sido enviada nuevamente',
        autoClose: true
      });
    } catch (error: any) {
      addNotification({
        type: 'error',
        title: 'Error',
        message: error.message || 'No se pudo reenviar la invitación',
        autoClose: true
      });
    }
  };

  const userColumns = [
    {
      id: 'user',
      label: 'Usuario',
      render: (user: User) => (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <Avatar src={user.avatar} sx={{ width: 40, height: 40 }}>
            {user.firstName.charAt(0)}{user.lastName.charAt(0)}
          </Avatar>
          <Box>
            <Typography variant="body2" fontWeight={500}>
              {user.firstName} {user.lastName}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {user.email}
            </Typography>
          </Box>
        </Box>
      )
    },
    {
      id: 'role',
      label: 'Rol',
      render: (user: User) => (
        <Chip 
          label={user.role}
          size="small"
          color="primary"
          variant="outlined"
        />
      )
    },
    {
      id: 'status',
      label: 'Estado',
      render: (user: User) => (
        <Chip
          label={user.status}
          size="small"
          color={user.status === 'active' ? 'success' : 'default'}
        />
      )
    },
    {
      id: 'lastLogin',
      label: 'Último acceso',
      render: (user: User) => (
        <Typography variant="body2" color="text.secondary">
          {user.lastLoginAt 
            ? new Date(user.lastLoginAt).toLocaleDateString()
            : 'Nunca'
          }
        </Typography>
      )
    },
    {
      id: 'actions',
      label: 'Acciones',
      render: (user: User) => (
        <IconButton
          size="small"
          onClick={(e) => handleMenuClick(e, user)}
        >
          <MoreVertical size={16} />
        </IconButton>
      )
    }
  ];

  const invitationColumns = [
    {
      id: 'user',
      label: 'Usuario invitado',
      render: (invitation: any) => (
        <Box>
          <Typography variant="body2" fontWeight={500}>
            {invitation.firstName} {invitation.lastName}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {invitation.email}
          </Typography>
        </Box>
      )
    },
    {
      id: 'role',
      label: 'Rol',
      render: (invitation: any) => (
        <Chip 
          label={invitation.roleName}
          size="small"
          color="primary"
          variant="outlined"
        />
      )
    },
    {
      id: 'status',
      label: 'Estado',
      render: (invitation: any) => (
        <Chip
          label={invitation.status}
          size="small"
          color={
            invitation.status === 'pending' ? 'warning' :
            invitation.status === 'accepted' ? 'success' :
            'default'
          }
        />
      )
    },
    {
      id: 'invitedAt',
      label: 'Enviado',
      render: (invitation: any) => (
        <Typography variant="body2" color="text.secondary">
          {new Date(invitation.invitedAt).toLocaleDateString()}
        </Typography>
      )
    },
    {
      id: 'actions',
      label: 'Acciones',
      render: (invitation: any) => (
        invitation.status === 'pending' && (
          <Button
            size="small"
            startIcon={<Mail size={16} />}
            onClick={() => handleResendInvitation(invitation.id)}
          >
            Reenviar
          </Button>
        )
      )
    }
  ];

  const filteredUsers = users.filter(user =>
    user.firstName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.lastName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (!canManageUsers) {
    return (
      <Box sx={{ textAlign: 'center', py: 8 }}>
        <Typography variant="h6" color="text.secondary">
          No tienes permisos para gestionar usuarios
        </Typography>
      </Box>
    );
  }

  return (
    <Box>
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" component="h1">
          Gestión de Usuarios
        </Typography>
        
        {canInviteUsers && (
          <Button
            variant="contained"
            startIcon={<UserPlus size={20} />}
            onClick={() => setDialogOpen(prev => ({ ...prev, invite: true }))}
          >
            Invitar Usuario
          </Button>
        )}
      </Box>

      {/* Search and Filters */}
      <Paper sx={{ p: 2, mb: 3 }}>
        <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
          <TextField
            placeholder="Buscar usuarios..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <Search size={20} />
                </InputAdornment>
              )
            }}
            sx={{ minWidth: 300 }}
          />
          
          <Button
            startIcon={<Filter size={16} />}
            variant="outlined"
            size="small"
          >
            Filtros
          </Button>
        </Box>
      </Paper>

      {/* Tabs */}
      <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 2 }}>
        <Tabs value={selectedTab} onChange={(_, value) => setSelectedTab(value)}>
          <Tab label={`Usuarios (${filteredUsers.length})`} />
          {canInviteUsers && (
            <Tab label={`Invitaciones (${invitations.length})`} />
          )}
        </Tabs>
      </Box>

      {/* Content */}
      {selectedTab === 0 && (
        <DataTable
          columns={userColumns}
          data={filteredUsers}
          loading={isLoading}
          emptyMessage="No se encontraron usuarios"
        />
      )}

      {selectedTab === 1 && canInviteUsers && (
        <DataTable
          columns={invitationColumns}
          data={invitations}
          loading={false}
          emptyMessage="No hay invitaciones pendientes"
        />
      )}

      {/* Context Menu */}
      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleMenuClose}
      >
        <MenuItem onClick={handleEditUser}>
          <Edit size={16} style={{ marginRight: 8 }} />
          Editar usuario
        </MenuItem>
        <MenuItem onClick={handleManagePermissions}>
          <Shield size={16} style={{ marginRight: 8 }} />
          Permisos
        </MenuItem>
        <MenuItem onClick={handleDeleteUser} sx={{ color: 'error.main' }}>
          <Trash2 size={16} style={{ marginRight: 8 }} />
          Eliminar
        </MenuItem>
      </Menu>

      {/* Dialogs */}
      {canInviteUsers && (
        <UserInviteDialog
          open={dialogOpen.invite}
          onClose={() => setDialogOpen(prev => ({ ...prev, invite: false }))}
        />
      )}

      <UserEditDialog
        open={dialogOpen.edit}
        user={selectedUser}
        onClose={() => {
          setDialogOpen(prev => ({ ...prev, edit: false }));
          setSelectedUser(null);
        }}
      />

      <PermissionDialog
        open={dialogOpen.permissions}
        user={selectedUser}
        onClose={() => {
          setDialogOpen(prev => ({ ...prev, permissions: false }));
          setSelectedUser(null);
        }}
      />

      <ConfirmDialog
        open={dialogOpen.delete}
        title="Eliminar Usuario"
        message={`¿Estás seguro de que deseas eliminar a ${selectedUser?.firstName} ${selectedUser?.lastName}? Esta acción no se puede deshacer.`}
        confirmLabel="Eliminar"
        onConfirm={() => selectedUser && deleteUserMutation.mutate(selectedUser.id)}
        onCancel={() => {
          setDialogOpen(prev => ({ ...prev, delete: false }));
          setSelectedUser(null);
        }}
        loading={deleteUserMutation.isPending}
        severity="error"
      />
    </Box>
  );
};
```

### 2. Company Settings Interface (Continuación)

#### 2.1 Company Settings Page: modules/auth/pages/CompanySettings.tsx (Continuación)
```typescript
        </Grid>
        
        <Grid item xs={12}>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <FormControlLabel
              control={<Switch defaultChecked />}
              label="Requerir mayúsculas"
            />
            <FormControlLabel
              control={<Switch defaultChecked />}
              label="Requerir minúsculas"
            />
            <FormControlLabel
              control={<Switch defaultChecked />}
              label="Requerir números"
            />
            <FormControlLabel
              control={<Switch />}
              label="Requerir símbolos especiales"
            />
          </Box>
        </Grid>
      </Grid>

      <Divider sx={{ my: 4 }} />

      <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        <Shield size={20} />
        Configuración de Sesiones
      </Typography>
      
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} md={6}>
          <TextField
            label="Sesiones concurrentes máximas"
            type="number"
            fullWidth
            defaultValue={3}
            inputProps={{ min: 1, max: 10 }}
            helperText="Número máximo de sesiones activas por usuario"
          />
        </Grid>
        
        <Grid item xs={12} md={6}>
          <TextField
            label="Tiempo de inactividad (minutos)"
            type="number"
            fullWidth
            defaultValue={30}
            inputProps={{ min: 5, max: 480 }}
            helperText="Tiempo antes de cerrar sesión por inactividad"
          />
        </Grid>
        
        <Grid item xs={12}>
          <FormControlLabel
            control={<Switch />}
            label="Requerir MFA para administradores"
          />
        </Grid>
      </Grid>

      <Divider sx={{ my: 4 }} />

      <Typography variant="h6" gutterBottom>
        Configuración de Invitaciones
      </Typography>
      
      <Grid container spacing={3}>
        <Grid item xs={12} md={6}>
          <TextField
            label="Días de expiración por defecto"
            type="number"
            fullWidth
            defaultValue={7}
            inputProps={{ min: 1, max: 30 }}
          />
        </Grid>
        
        <Grid item xs={12}>
          <FormControlLabel
            control={<Switch />}
            label="Requerir dominio de email coincidente"
          />
        </Grid>
        
        <Grid item xs={12}>
          <TextField
            label="Dominios permitidos"
            fullWidth
            placeholder="ejemplo.com, empresa.com"
            helperText="Separar múltiples dominios con comas"
          />
        </Grid>
      </Grid>

      <Box sx={{ mt: 4, display: 'flex', justifyContent: 'flex-end' }}>
        <LoadingButton
          variant="contained"
          startIcon={<Save size={20} />}
          loading={false}
        >
          Guardar Configuración de Seguridad
        </LoadingButton>
      </Box>
    </Box>
  );

  const renderNotificationSettings = () => (
    <Box>
      <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        <Bell size={20} />
        Notificaciones del Sistema
      </Typography>
      
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mb: 4 }}>
        <FormControlLabel
          control={<Switch defaultChecked />}
          label="Notificar nuevos usuarios"
        />
        <FormControlLabel
          control={<Switch defaultChecked />}
          label="Notificar cambios de permisos"
        />
        <FormControlLabel
          control={<Switch />}
          label="Notificar intentos de acceso fallidos"
        />
        <FormControlLabel
          control={<Switch defaultChecked />}
          label="Notificar cambios en configuración"
        />
      </Box>

      <Divider sx={{ my: 4 }} />

      <Typography variant="h6" gutterBottom>
        Notificaciones por Email
      </Typography>
      
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mb: 4 }}>
        <FormControlLabel
          control={<Switch defaultChecked />}
          label="Reportes semanales"
        />
        <FormControlLabel
          control={<Switch />}
          label="Alertas de seguridad"
        />
        <FormControlLabel
          control={<Switch />}
          label="Notificaciones de mantenimiento"
        />
      </Box>

      <Box sx={{ display: 'flex', justifyContent: 'flex-end' }}>
        <LoadingButton
          variant="contained"
          startIcon={<Save size={20} />}
          loading={false}
        >
          Guardar Notificaciones
        </LoadingButton>
      </Box>
    </Box>
  );

  const renderBrandingSettings = () => (
    <Box>
      <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        <Palette size={20} />
        Personalización de Marca
      </Typography>
      
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} md={6}>
          <Typography variant="body2" gutterBottom>
            Color Primario
          </Typography>
          <ColorPicker
            color="#1976d2"
            onChange={(color) => console.log('Primary color:', color)}
          />
        </Grid>
        
        <Grid item xs={12} md={6}>
          <Typography variant="body2" gutterBottom>
            Color Secundario
          </Typography>
          <ColorPicker
            color="#dc004e"
            onChange={(color) => console.log('Secondary color:', color)}
          />
        </Grid>
      </Grid>

      <Typography variant="h6" gutterBottom>
        Configuración de Email
      </Typography>
      
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12}>
          <TextField
            label="Remitente por defecto"
            fullWidth
            defaultValue="noreply@empresa.com"
            helperText="Email que aparecerá como remitente en las notificaciones"
          />
        </Grid>
        
        <Grid item xs={12}>
          <TextField
            label="Firma de email"
            multiline
            rows={4}
            fullWidth
            placeholder="Saludos,
El equipo de [Nombre de la empresa]"
          />
        </Grid>
      </Grid>

      <Box sx={{ display: 'flex', justifyContent: 'flex-end' }}>
        <LoadingButton
          variant="contained"
          startIcon={<Save size={20} />}
          loading={false}
        >
          Guardar Personalización
        </LoadingButton>
      </Box>
    </Box>
  );

  const tabs = [
    { label: 'Información General', icon: Building },
    { label: 'Seguridad', icon: Shield },
    { label: 'Notificaciones', icon: Bell },
    { label: 'Personalización', icon: Palette }
  ];

  return (
    <Box>
      <Typography variant="h4" component="h1" gutterBottom>
        Configuración de la Empresa
      </Typography>

      <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}>
        <Tabs value={selectedTab} onChange={(_, value) => setSelectedTab(value)}>
          {tabs.map((tab, index) => (
            <Tab
              key={index}
              label={tab.label}
              icon={<tab.icon size={20} />}
              iconPosition="start"
            />
          ))}
        </Tabs>
      </Box>

      <Paper sx={{ p: 4 }}>
        {selectedTab === 0 && renderBasicSettings()}
        {selectedTab === 1 && renderSecuritySettings()}
        {selectedTab === 2 && renderNotificationSettings()}
        {selectedTab === 3 && renderBrandingSettings()}
      </Paper>
    </Box>
  );
};
```

### 3. Role & Permission Management

#### 3.1 Permission Dialog: modules/auth/components/PermissionDialog.tsx
```typescript
import React, { useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  Box,
  Chip,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Checkbox,
  FormControlLabel,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  ListItemSecondary,
  Divider,
  Alert,
  Grid
} from '@mui/material';
import { Shield, User, Building, Settings, BarChart3 } from 'lucide-react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

// Services
import { roleService } from '../services/roleService';
import { userService } from '../services/userService';

// Hooks
import { useUIStore } from '@shared/store/uiStore';

interface User {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  role: string;
}

interface Permission {
  id: string;
  name: string;
  displayName: string;
  description: string;
  module: string;
  category: string;
}

interface Role {
  id: string;
  name: string;
  displayName: string;
  description: string;
  permissions: Permission[];
}

interface PermissionDialogProps {
  open: boolean;
  user: User | null;
  onClose: () => void;
}

export const PermissionDialog: React.FC<PermissionDialogProps> = ({
  open,
  user,
  onClose
}) => {
  const [selectedRole, setSelectedRole] = useState('');
  const [customPermissions, setCustomPermissions] = useState<string[]>([]);
  const [useCustomPermissions, setUseCustomPermissions] = useState(false);

  const { addNotification } = useUIStore();
  const queryClient = useQueryClient();

  // Fetch roles and permissions
  const { data: roles = [] } = useQuery({
    queryKey: ['roles'],
    queryFn: roleService.getRoles,
    enabled: open
  });

  const { data: allPermissions = [] } = useQuery({
    queryKey: ['permissions'],
    queryFn: roleService.getPermissions,
    enabled: open
  });

  const { data: userPermissions = [] } = useQuery({
    queryKey: ['user-permissions', user?.id],
    queryFn: () => userService.getUserPermissions(user!.id),
    enabled: open && !!user?.id
  });

  // Update user permissions mutation
  const updatePermissionsMutation = useMutation({
    mutationFn: (data: { roleId?: string; customPermissions?: string[] }) =>
      userService.updateUserPermissions(user!.id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      queryClient.invalidateQueries({ queryKey: ['user-permissions'] });
      addNotification({
        type: 'success',
        title: 'Permisos actualizados',
        message: 'Los permisos del usuario han sido actualizados',
        autoClose: true
      });
      onClose();
    },
    onError: (error: any) => {
      addNotification({
        type: 'error',
        title: 'Error',
        message: error.message || 'No se pudieron actualizar los permisos',
        autoClose: true
      });
    }
  });

  React.useEffect(() => {
    if (user && open) {
      // Initialize form with current user data
      const currentRole = roles.find(role => role.name === user.role);
      setSelectedRole(currentRole?.id || '');
      setCustomPermissions(userPermissions.map(p => p.id));
      setUseCustomPermissions(false);
    }
  }, [user, open, roles, userPermissions]);

  const handlePermissionToggle = (permissionId: string) => {
    setCustomPermissions(prev => 
      prev.includes(permissionId)
        ? prev.filter(id => id !== permissionId)
        : [...prev, permissionId]
    );
  };

  const handleSave = () => {
    const updateData = useCustomPermissions
      ? { customPermissions }
      : { roleId: selectedRole };
    
    updatePermissionsMutation.mutate(updateData);
  };

  const getPermissionsByModule = (permissions: Permission[]) => {
    return permissions.reduce((acc, permission) => {
      if (!acc[permission.module]) {
        acc[permission.module] = [];
      }
      acc[permission.module].push(permission);
      return acc;
    }, {} as Record<string, Permission[]>);
  };

  const getModuleIcon = (module: string) => {
    switch (module.toLowerCase()) {
      case 'auth':
        return User;
      case 'company':
        return Building;
      case 'system':
        return Settings;
      case 'analytics':
        return BarChart3;
      default:
        return Shield;
    }
  };

  const selectedRoleData = roles.find(role => role.id === selectedRole);
  const permissionsByModule = getPermissionsByModule(allPermissions);

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="md"
      fullWidth
    >
      <DialogTitle>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <Shield size={24} />
          <Box>
            <Typography variant="h6">
              Gestionar Permisos
            </Typography>
            {user && (
              <Typography variant="body2" color="text.secondary">
                {user.firstName} {user.lastName} ({user.email})
              </Typography>
            )}
          </Box>
        </Box>
      </DialogTitle>

      <DialogContent dividers>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
          {/* Role Selection */}
          <Box>
            <FormControlLabel
              control={
                <Checkbox
                  checked={!useCustomPermissions}
                  onChange={(e) => setUseCustomPermissions(!e.target.checked)}
                />
              }
              label="Usar rol predefinido"
            />
            
            {!useCustomPermissions && (
              <FormControl fullWidth sx={{ mt: 2 }}>
                <InputLabel>Seleccionar Rol</InputLabel>
                <Select
                  value={selectedRole}
                  label="Seleccionar Rol"
                  onChange={(e) => setSelectedRole(e.target.value)}
                >
                  {roles.map((role) => (
                    <MenuItem key={role.id} value={role.id}>
                      <Box>
                        <Typography variant="body2" fontWeight={500}>
                          {role.displayName}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {role.description}
                        </Typography>
                      </Box>
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            )}

            {selectedRoleData && !useCustomPermissions && (
              <Box sx={{ mt: 2 }}>
                <Typography variant="body2" color="text.secondary" gutterBottom>
                  Permisos incluidos en este rol:
                </Typography>
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                  {selectedRoleData.permissions.map((permission) => (
                    <Chip
                      key={permission.id}
                      label={permission.displayName}
                      size="small"
                      variant="outlined"
                    />
                  ))}
                </Box>
              </Box>
            )}
          </Box>

          {/* Custom Permissions */}
          <Box>
            <FormControlLabel
              control={
                <Checkbox
                  checked={useCustomPermissions}
                  onChange={(e) => setUseCustomPermissions(e.target.checked)}
                />
              }
              label="Configurar permisos personalizados"
            />

            {useCustomPermissions && (
              <Box sx={{ mt: 2 }}>
                <Alert severity="info" sx={{ mb: 2 }}>
                  Los permisos personalizados ignoran las configuraciones de rol.
                  Asegúrate de otorgar todos los permisos necesarios.
                </Alert>

                {Object.entries(permissionsByModule).map(([module, permissions]) => {
                  const ModuleIcon = getModuleIcon(module);
                  
                  return (
                    <Box key={module} sx={{ mb: 3 }}>
                      <Typography 
                        variant="h6" 
                        sx={{ 
                          display: 'flex', 
                          alignItems: 'center', 
                          gap: 1,
                          mb: 1
                        }}
                      >
                        <ModuleIcon size={20} />
                        {module.charAt(0).toUpperCase() + module.slice(1)}
                      </Typography>

                      <List dense>
                        {permissions.map((permission) => (
                          <ListItem
                            key={permission.id}
                            sx={{ pl: 4 }}
                          >
                            <ListItemIcon>
                              <Checkbox
                                checked={customPermissions.includes(permission.id)}
                                onChange={() => handlePermissionToggle(permission.id)}
                              />
                            </ListItemIcon>
                            <ListItemText
                              primary={permission.displayName}
                              secondary={permission.description}
                            />
                          </ListItem>
                        ))}
                      </List>
                      
                      {Object.keys(permissionsByModule).indexOf(module) < 
                       Object.keys(permissionsByModule).length - 1 && (
                        <Divider />
                      )}
                    </Box>
                  );
                })}
              </Box>
            )}
          </Box>
        </Box>
      </DialogContent>

      <DialogActions sx={{ p: 3 }}>
        <Button onClick={onClose}>
          Cancelar
        </Button>
        <Button
          variant="contained"
          onClick={handleSave}
          disabled={
            updatePermissionsMutation.isPending ||
            (!useCustomPermissions && !selectedRole) ||
            (useCustomPermissions && customPermissions.length === 0)
          }
        >
          {updatePermissionsMutation.isPending ? 'Guardando...' : 'Guardar Permisos'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};
```

### 4. Reusable Components

#### 4.1 DataTable Component: components/ui/DataTable.tsx
```typescript
import React, { useState } from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TablePagination,
  Paper,
  Box,
  Typography,
  CircularProgress,
  Checkbox,
  TableSortLabel,
  Chip
} from '@mui/material';
import { Empty } from 'lucide-react';

interface Column {
  id: string;
  label: string;
  minWidth?: number;
  align?: 'left' | 'center' | 'right';
  format?: (value: any) => string;
  render?: (item: any) => React.ReactNode;
  sortable?: boolean;
}

interface DataTableProps {
  columns: Column[];
  data: any[];
  loading?: boolean;
  emptyMessage?: string;
  selectable?: boolean;
  selectedItems?: string[];
  onSelectionChange?: (selectedIds: string[]) => void;
  onSort?: (columnId: string, direction: 'asc' | 'desc') => void;
  sortColumn?: string;
  sortDirection?: 'asc' | 'desc';
  pagination?: {
    page: number;
    rowsPerPage: number;
    total: number;
    onPageChange: (page: number) => void;
    onRowsPerPageChange: (rowsPerPage: number) => void;
  };
}

export const DataTable: React.FC<DataTableProps> = ({
  columns,
  data,
  loading = false,
  emptyMessage = 'No hay datos disponibles',
  selectable = false,
  selectedItems = [],
  onSelectionChange,
  onSort,
  sortColumn,
  sortDirection,
  pagination
}) => {
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);

  const handleSelectAll = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (onSelectionChange) {
      if (event.target.checked) {
        const allIds = data.map(item => item.id);
        onSelectionChange(allIds);
      } else {
        onSelectionChange([]);
      }
    }
  };

  const handleSelect = (id: string) => {
    if (onSelectionChange) {
      const newSelection = selectedItems.includes(id)
        ? selectedItems.filter(item => item !== id)
        : [...selectedItems, id];
      onSelectionChange(newSelection);
    }
  };

  const handleSort = (columnId: string) => {
    if (onSort) {
      const newDirection = 
        sortColumn === columnId && sortDirection === 'asc' ? 'desc' : 'asc';
      onSort(columnId, newDirection);
    }
  };

  const handleChangePage = (_: unknown, newPage: number) => {
    if (pagination) {
      pagination.onPageChange(newPage);
    } else {
      setPage(newPage);
    }
  };

  const handleChangeRowsPerPage = (event: React.ChangeEvent<HTMLInputElement>) => {
    const newRowsPerPage = parseInt(event.target.value, 10);
    if (pagination) {
      pagination.onRowsPerPageChange(newRowsPerPage);
      pagination.onPageChange(0);
    } else {
      setRowsPerPage(newRowsPerPage);
      setPage(0);
    }
  };

  const currentPage = pagination?.page ?? page;
  const currentRowsPerPage = pagination?.rowsPerPage ?? rowsPerPage;
  const totalItems = pagination?.total ?? data.length;

  // For client-side pagination
  const displayData = pagination 
    ? data 
    : data.slice(currentPage * currentRowsPerPage, currentPage * currentRowsPerPage + currentRowsPerPage);

  if (loading) {
    return (
      <Box sx={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        minHeight: 200 
      }}>
        <CircularProgress />
      </Box>
    );
  }

  if (data.length === 0) {
    return (
      <Paper sx={{ p: 4 }}>
        <Box sx={{ 
          textAlign: 'center', 
          py: 4,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 2
        }}>
          <Empty size={48} color="#ccc" />
          <Typography variant="h6" color="text.secondary">
            {emptyMessage}
          </Typography>
        </Box>
      </Paper>
    );
  }

  const isAllSelected = data.length > 0 && selectedItems.length === data.length;
  const isPartiallySelected = selectedItems.length > 0 && selectedItems.length < data.length;

  return (
    <Paper sx={{ width: '100%', overflow: 'hidden' }}>
      <TableContainer>
        <Table stickyHeader>
          <TableHead>
            <TableRow>
              {selectable && (
                <TableCell padding="checkbox">
                  <Checkbox
                    indeterminate={isPartiallySelected}
                    checked={isAllSelected}
                    onChange={handleSelectAll}
                  />
                </TableCell>
              )}
              {columns.map((column) => (
                <TableCell
                  key={column.id}
                  align={column.align}
                  style={{ minWidth: column.minWidth }}
                >
                  {column.sortable !== false && onSort ? (
                    <TableSortLabel
                      active={sortColumn === column.id}
                      direction={sortColumn === column.id ? sortDirection : 'asc'}
                      onClick={() => handleSort(column.id)}
                    >
                      {column.label}
                    </TableSortLabel>
                  ) : (
                    column.label
                  )}
                </TableCell>
              ))}
            </TableRow>
          </TableHead>
          <TableBody>
            {displayData.map((row) => (
              <TableRow 
                key={row.id} 
                hover 
                selected={selectedItems.includes(row.id)}
              >
                {selectable && (
                  <TableCell padding="checkbox">
                    <Checkbox
                      checked={selectedItems.includes(row.id)}
                      onChange={() => handleSelect(row.id)}
                    />
                  </TableCell>
                )}
                {columns.map((column) => (
                  <TableCell key={column.id} align={column.align}>
                    {column.render 
                      ? column.render(row)
                      : column.format 
                        ? column.format(row[column.id])
                        : row[column.id]
                    }
                  </TableCell>
                ))}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
      <TablePagination
        rowsPerPageOptions={[5, 10, 25]}
        component="div"
        count={totalItems}
        rowsPerPage={currentRowsPerPage}
        page={currentPage}
        onPageChange={handleChangePage}
        onRowsPerPageChange={handleChangeRowsPerPage}
      />
    </Paper>
  );
};
```

#### 4.2 ColorPicker Component: components/ui/ColorPicker.tsx
```typescript
import React, { useState } from 'react';
import {
  Box,
  Button,
  Popover,
  Typography,
  TextField,
  Grid
} from '@mui/material';
import { Palette } from 'lucide-react';

interface ColorPickerProps {
  color: string;
  onChange: (color: string) => void;
  label?: string;
}

const PRESET_COLORS = [
  '#1976d2', '#dc004e', '#9c27b0', '#673ab7',
  '#3f51b5', '#2196f3', '#03a9f4', '#00bcd4',
  '#009688', '#4caf50', '#8bc34a', '#cddc39',
  '#ffeb3b', '#ffc107', '#ff9800', '#ff5722'
];

export const ColorPicker: React.FC<ColorPickerProps> = ({
  color,
  onChange,
  label
}) => {
  const [anchorEl, setAnchorEl] = useState<HTMLButtonElement | null>(null);
  const [inputColor, setInputColor] = useState(color);

  const handleClick = (event: React.MouseEvent<HTMLButtonElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  const handleColorSelect = (selectedColor: string) => {
    onChange(selectedColor);
    setInputColor(selectedColor);
    handleClose();
  };

  const handleInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const newColor = event.target.value;
    setInputColor(newColor);
    
    // Validate hex color
    if (/^#[0-9A-F]{6}$/i.test(newColor)) {
      onChange(newColor);
    }
  };

  const open = Boolean(anchorEl);

  return (
    <Box>
      {label && (
        <Typography variant="body2" gutterBottom>
          {label}
        </Typography>
      )}
      
      <Button
        onClick={handleClick}
        variant="outlined"
        startIcon={<Palette size={16} />}
        sx={{
          '&::before': {
            content: '""',
            width: 20,
            height: 20,
            backgroundColor: color,
            borderRadius: 1,
            marginRight: 1,
            border: '1px solid #ccc'
          }
        }}
      >
        {color.toUpperCase()}
      </Button>

      <Popover
        open={open}
        anchorEl={anchorEl}
        onClose={handleClose}
        anchorOrigin={{
          vertical: 'bottom',
          horizontal: 'left',
        }}
      >
        <Box sx={{ p: 2, width: 240 }}>
          <Typography variant="h6" gutterBottom>
            Seleccionar Color
          </Typography>
          
          <TextField
            fullWidth
            label="Código HEX"
            value={inputColor}
            onChange={handleInputChange}
            sx={{ mb: 2 }}
            placeholder="#1976d2"
          />
          
          <Typography variant="body2" gutterBottom>
            Colores predefinidos:
          </Typography>
          
          <Grid container spacing={1}>
            {PRESET_COLORS.map((presetColor) => (
              <Grid item xs={3} key={presetColor}>
                <Box
                  sx={{
                    width: 40,
                    height: 40,
                    backgroundColor: presetColor,
                    border: color === presetColor ? '2px solid #000' : '1px solid #ccc',
                    cursor: 'pointer',
                    borderRadius: 1,
                    '&:hover': {
                      transform: 'scale(1.1)'
                    }
                  }}
                  onClick={() => handleColorSelect(presetColor)}
                />
              </Grid>
            ))}
          </Grid>
        </Box>
      </Popover>
    </Box>
  );
};
```

## 5. Services Layer

### 5.1 User Service: modules/auth/services/userService.ts
```typescript
import { apiClient } from '@shared/api/client';

export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  avatar?: string;
  role: string;
  status: string;
  lastLoginAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateUserData {
  email: string;
  firstName: string;
  lastName: string;
  roleId: string;
  companyId: string;
}

export interface UpdateUserData {
  firstName?: string;
  lastName?: string;
  roleId?: string;
  status?: string;
}

export interface UpdatePermissionsData {
  roleId?: string;
  customPermissions?: string[];
}

class UserService {
  async getCompanyUsers(companyId: string): Promise<User[]> {
    const response = await apiClient.get(`/companies/${companyId}/users`);
    return response.data;
  }

  async getUser(userId: string): Promise<User> {
    const response = await apiClient.get(`/users/${userId}`);
    return response.data;
  }

  async createUser(userData: CreateUserData): Promise<User> {
    const response = await apiClient.post('/users', userData);
    return response.data;
  }

  async updateUser(userId: string, userData: UpdateUserData): Promise<User> {
    const response = await apiClient.patch(`/users/${userId}`, userData);
    return response.data;
  }

  async deleteUser(userId: string): Promise<void> {
    await apiClient.delete(`/users/${userId}`);
  }

  async getUserPermissions(userId: string): Promise<any[]> {
    const response = await apiClient.get(`/users/${userId}/permissions`);
    return response.data;
  }

  async updateUserPermissions(userId: string, data: UpdatePermissionsData): Promise<void> {
    await apiClient.patch(`/users/${userId}/permissions`, data);
  }

  async switchCompany(companyId: string): Promise<any> {
    const response = await apiClient.post('/auth/switch-company', { companyId });
    return response.data;
  }
}

export const userService = new UserService();
```

### 5.2 Invitation Service: modules/auth/services/invitationService.ts
```typescript
import { apiClient } from '@shared/api/client';

export interface Invitation {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  roleId: string;
  roleName: string;
  status: 'pending' | 'accepted' | 'expired';
  expiresAt: Date;
  invitedAt: Date;
  invitedById: string;
  welcomeMessage?: string;
}

export interface SendInvitationData {
  email: string;
  firstName: string;
  lastName: string;
  roleId: string;
  welcomeMessage?: string;
  expiryDays: number;
}

class InvitationService {
  async getCompanyInvitations(companyId: string): Promise<Invitation[]> {
    const response = await apiClient.get(`/companies/${companyId}/invitations`);
    return response.data;
  }

  async sendInvitation(companyId: string, data: SendInvitationData): Promise<Invitation> {
    const response = await apiClient.post(`/companies/${companyId}/invitations`, data);
    return response.data;
  }

  async resendInvitation(invitationId: string): Promise<void> {
    await apiClient.post(`/invitations/${invitationId}/resend`);
  }

  async cancelInvitation(invitationId: string): Promise<void> {
    await apiClient.delete(`/invitations/${invitationId}`);
  }

  async acceptInvitation(token: string, userData: { password: string }): Promise<any> {
    const response = await apiClient.post(`/invitations/accept/${token}`, userData);
    return response.data;
  }
}

export const invitationService = new InvitationService();
```

## Testing Requirements

### Unit Tests
- [ ] UserManagement component rendering y funcionalidad
- [ ] UserInviteDialog form validation y submission
- [ ] PermissionDialog permission management
- [ ] DataTable component con diferentes configuraciones
- [ ] CompanySettings form handling
- [ ] ColorPicker component interaction

### Integration Tests
- [ ] User management workflow completo
- [ ] Invitation process end-to-end
- [ ] Permission changes reflection
- [ ] Company settings persistence
- [ ] Role assignment functionality

### E2E Tests
- [ ] Complete user management flow
- [ ] Invitation sending y acceptance
- [ ] Permission management workflow
- [ ] Company configuration changes
- [ ] Multi-company user switching

## Performance Requirements

### Component Optimization
- [ ] React.memo para componentes pesados
- [ ] useMemo para calculations costosos
- [ ] useCallback para event handlers
- [ ] Lazy loading para dialogs grandes
- [ ] Virtualization para listas grandes

### Bundle Optimization
- [ ] Code splitting por rutas
- [ ] Dynamic imports para componentes pesados
- [ ] Tree shaking verification
- [ ] Bundle size analysis

## Accessibility Requirements

### WCAG Compliance
- [ ] Keyboard navigation completa
- [ ] Screen reader compatibility
- [ ] Color contrast validation
- [ ] Focus management en dialogs
- [ ] ARIA labels appropriate

### Mobile Responsiveness
- [ ] Touch-friendly interfaces
- [ ] Responsive tables con horizontal scroll
- [ ] Mobile-optimized dialogs
- [ ] Proper viewport configuration

## Documentation Requirements

### Component Documentation
- [ ] PropTypes/TypeScript interfaces
- [ ] Usage examples
- [ ] Storybook stories
- [ ] API documentation

### User Documentation
- [ ] Admin user guide
- [ ] Permission management guide
- [ ] Company setup walkthrough
- [ ] Troubleshooting guide

## Sprint Success Criteria

### Must Have
- [x] Complete user management interface funcionando
- [x] User invitation system con email notifications
- [x] Basic permission management interface
- [x] Company settings básica funcionando
- [x] Responsive design en mobile y desktop

### Should Have
- [x] Advanced permission management con roles personalizados
- [x] Company branding configuration
- [x] Security settings interface
- [x] Notification preferences

### Could Have
- [ ] Advanced user analytics dashboard
- [ ] Bulk user operations
- [ ] User activity monitoring
- [ ] Advanced company reporting

El Sprint 3 establece las bases sólidas para la administración de usuarios y configuración del sistema, preparando el terreno para los módulos de funcionalidad específica en sprints posteriores.
