/**
 * User Management Page - Sprint 3
 * Página principal de gestión de usuarios
 * Implementación siguiendo lineamientos Nivel 2: SOLID, Clean Code, componentes puros
 */

import React, { useState, useCallback, useMemo } from 'react';
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
  Tab,
  Tabs,
  Stack,
  Badge,
  Tooltip,
  Alert
} from '@mui/material';
import {
  Search,
  UserPlus,
  MoreVertical,
  Edit,
  Shield,
  Mail,
  Trash2,
  Filter,
  RefreshCw,
  CheckCircle,
  XCircle,
  Clock
} from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

// Components
import { DataTable } from '@/components/ui/DataTable';
import { UserInviteDialog } from '@modules/users/components/UserInviteDialog';
import { UserEditDialog } from '@modules/users/components/UserEditDialog';
import { PermissionDialog } from '@modules/users/components/PermissionDialog';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { LoadingOverlay } from '@/components/ui/Loading';

// Services & Hooks
import { userService } from '@modules/users/services/userService';
import { invitationService } from '@modules/users/services/invitationService';
import { roleService } from '@modules/auth/services/roleService';
import { companyService } from '@modules/auth/services/companyService';
import { useUserManagement } from '@modules/users/hooks/useUserManagement';
import { useAuthStore } from '@/shared/store/authStore';
import { useUIStore } from '@/shared/store/uiStore';
import { useFeatureFlag } from '@/shared/hooks/useFeatureFlag';

// Types
import type { 
  User, 
  UserInvitation, 
  UserFilters
} from '@modules/users/types';

// Enums (imported as values, not types)
import { 
  UserStatus,
  UserRole,
  InvitationStatus 
} from '@modules/users/types';

// Constants
const TABS = {
  USERS: 0,
  INVITATIONS: 1
} as const;

const STATUS_COLORS: Record<UserStatus, 'success' | 'error' | 'warning' | 'default'> = {
  [UserStatus.ACTIVE]: 'success',
  [UserStatus.INACTIVE]: 'default',
  [UserStatus.SUSPENDED]: 'error',
  [UserStatus.PENDING]: 'warning'
};

const INVITATION_STATUS_COLORS: Record<InvitationStatus, 'info' | 'success' | 'error' | 'warning' | 'default'> = {
  [InvitationStatus.PENDING]: 'info',
  [InvitationStatus.ACCEPTED]: 'success',
  [InvitationStatus.EXPIRED]: 'error',
  [InvitationStatus.CANCELLED]: 'default',
  [InvitationStatus.REJECTED]: 'warning'
};

/**
 * UserManagement Component
 * Principios SOLID aplicados:
 * - S: Responsabilidad única para gestión de usuarios
 * - O: Abierto para extensión mediante hooks y componentes
 * - D: Inversión de dependencias con servicios inyectados
 */
export const UserManagement: React.FC = () => {
  // State management
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedTab, setSelectedTab] = useState(TABS.USERS);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [selectedInvitation, setSelectedInvitation] = useState<UserInvitation | null>(null);
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [filters, setFilters] = useState<UserFilters>({});
  
  // Dialog state (Clean Code: estado agrupado por contexto)
  const [dialogs, setDialogs] = useState({
    invite: false,
    edit: false,
    create: false,
    permissions: false,
    delete: false,
    bulkInvite: false
  });

  // Store hooks
  const { currentCompany, user: currentUser } = useAuthStore();
  const { addNotification } = useUIStore();
  const queryClient = useQueryClient();

  // Validación de permisos basada en el rol del usuario - Sincronizado con backend
  // SuperAdmin se detecta por múltiples formatos de rol (compatibilidad con AuthService)
  const isSuperAdmin =
    // Roles en la empresa actual
    ['Super Admin', 'super_admin', 'super admin', 'superadmin'].includes(currentCompany?.role || '') ||
    // Roles del usuario actual
    ['Super Admin', 'super_admin', 'super admin', 'superadmin'].includes(currentUser?.role || '') ||
    // CompanyId virtual del SuperAdmin
    currentCompany?.id === '00000000-0000-0000-0000-000000000000';
  const canManageUsers = isSuperAdmin || ['admin', 'manager', 'Admin', 'Manager'].includes(currentCompany?.role || currentUser?.role || '');
  const canInviteUsers = canManageUsers; // Sincronizado con canManageUsers para consistencia
  const { isEnabled: canManagePermissions } = useFeatureFlag('permission_management', { defaultValue: true });

  // Custom hook para lógica de negocio (Principio SRP)
  const {
    selectedUsers,
    toggleUserSelection,
    selectAllUsers,
    clearSelection
  } = useUserManagement();

  // Debug logs detallados para diagnóstico
  console.log('🏢 Current Company:', currentCompany);
  console.log('👤 Current User:', currentUser);
  console.log('🔍 Super Admin Detection:', {
    currentCompanyRole: currentCompany?.role,
    currentUserRole: currentUser?.role,
    currentCompanyId: currentCompany?.id,
    roleInCompany: ['Super Admin', 'super_admin', 'super admin', 'superadmin'].includes(currentCompany?.role || ''),
    roleInUser: ['Super Admin', 'super_admin', 'super admin', 'superadmin'].includes(currentUser?.role || ''),
    virtualCompanyId: currentCompany?.id === '00000000-0000-0000-0000-000000000000',
    finalResult: isSuperAdmin
  });
  console.log('👑 Is SuperAdmin:', isSuperAdmin);
  console.log('🚦 Can Manage Users:', canManageUsers);
  console.log('📝 Dialogs state:', dialogs);
  console.log('🔍 Query enabled condition:', {
    isSuperAdmin,
    hasCompanyId: !!currentCompany?.id,
    canManageUsers,
    finalEnabled: (isSuperAdmin || !!currentCompany?.id) && canManageUsers
  });

  // Query: Fetch users
  const {
    data: usersData,
    isLoading: isLoadingUsers,
    error: usersError,
    refetch: refetchUsers
  } = useQuery({
    queryKey: ['users', currentCompany?.id, filters, isSuperAdmin],
    queryFn: () => {
      console.log('🚀 [UserManagement] queryFn executing', {
        isSuperAdmin,
        currentCompanyId: currentCompany?.id,
        filters
      });

      if (isSuperAdmin) {
        console.log('👑 [UserManagement] SuperAdmin query - using company ID:', currentCompany?.id || 'superadmin-all-users');
        // SuperAdmin: Usar el companyId virtual del AuthService o uno especial
        const superAdminCompanyId =
          currentCompany?.id === '00000000-0000-0000-0000-000000000000' ? currentCompany.id :
          currentCompany?.id === 'superadmin-company' ? currentCompany.id :
          'superadmin-all-users';
        return userService.getCompanyUsers(superAdminCompanyId, filters);
      }

      console.log('👤 [UserManagement] Normal user query - using company ID:', currentCompany!.id);
      return userService.getCompanyUsers(currentCompany!.id, filters);
    },
    enabled: (isSuperAdmin || !!currentCompany?.id) && canManageUsers,
    staleTime: 30000, // 30 seconds
    gcTime: 5 * 60 * 1000 // 5 minutes
  });

  console.log('⏳ Loading Users:', isLoadingUsers);
  console.log('❌ Users Error:', usersError);

  // Query: Fetch invitations
  const {
    data: invitationsData,
    isLoading: isLoadingInvitations,
    refetch: refetchInvitations
  } = useQuery({
    queryKey: ['invitations', currentCompany?.id],
    queryFn: () => invitationService.getCompanyInvitations(currentCompany!.id),
    enabled: !!currentCompany?.id && canInviteUsers && selectedTab === TABS.INVITATIONS,
    staleTime: 30000
  });

  // Query: Fetch roles
  const {
    data: rolesData,
    isLoading: isLoadingRoles
  } = useQuery({
    queryKey: ['roles', currentCompany?.id],
    queryFn: () => roleService.getRoles(currentCompany?.id),
    enabled: !!currentCompany?.id,
    staleTime: 5 * 60 * 1000 // 5 minutos
  });

  // Query: Fetch companies
  const {
    data: companiesData,
    isLoading: isLoadingCompanies
  } = useQuery({
    queryKey: ['companies'],
    queryFn: () => companyService.getUserCompanies(),
    staleTime: 5 * 60 * 1000 // 5 minutos
  });

  // Auto-update authStore with companies if currentCompany is null (SuperAdmin case)
  React.useEffect(() => {
    if (companiesData && companiesData.length > 0 && !currentCompany && !isLoadingCompanies) {
      console.log('🔄 [UserManagement] Auto-updating authStore with companies:', companiesData);

      const { switchCompany } = useAuthStore.getState();

      // Use switchCompany to update the current company
      switchCompany(companiesData[0]);
    }
  }, [companiesData, currentCompany, isLoadingCompanies]);

  // Mutations
  const deleteUserMutation = useMutation({
    mutationFn: (userId: string) => {
      console.log('🔥 [deleteUserMutation] Llamando userService.deleteUser con ID:', userId);
      console.log('🔍 [deleteUserMutation] Tipo de userId:', typeof userId);
      return userService.deleteUser(userId);
    },
    onSuccess: () => {
      console.log('✅ [deleteUserMutation] Usuario eliminado exitosamente');
      queryClient.invalidateQueries({ queryKey: ['users'] });
      addNotification({
        type: 'success',
        title: 'Usuario eliminado',
        message: 'El usuario ha sido eliminado exitosamente'
      });
      closeDialog('delete');
    },
    onError: (error: any) => {
      console.error('❌ [deleteUserMutation] Error al eliminar usuario:', {
        error,
        response: error.response,
        message: error.response?.data?.message,
        status: error.response?.status
      });
      addNotification({
        type: 'error',
        title: 'Error al eliminar usuario',
        message: error.response?.data?.message || 'Ocurrió un error inesperado'
      });
    }
  });

  const resendInvitationMutation = useMutation({
    mutationFn: invitationService.resendInvitation,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['invitations'] });
      addNotification({
        type: 'success',
        title: 'Invitación reenviada',
        message: 'La invitación ha sido enviada nuevamente'
      });
    },
    onError: (error: any) => {
      addNotification({
        type: 'error',
        title: 'Error al reenviar invitación',
        message: error.response?.data?.message || 'No se pudo reenviar la invitación'
      });
    }
  });

  const cancelInvitationMutation = useMutation({
    mutationFn: invitationService.cancelInvitation,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['invitations'] });
      addNotification({
        type: 'info',
        title: 'Invitación cancelada',
        message: 'La invitación ha sido cancelada'
      });
    }
  });

  // Memoized values (Performance optimization)
  const users = useMemo(() => {
    const usersList = usersData?.data?.users || [];
    // Debug log para verificar la estructura de los usuarios
    if (usersList.length > 0) {
      console.log('🔍 [UserManagement] Estructura del primer usuario:', usersList[0]);
      console.log('🔑 [UserManagement] Propiedades del primer usuario:', Object.keys(usersList[0]));
    }
    return usersList;
  }, [usersData]);
  const invitations = useMemo(() => invitationsData || [], [invitationsData]);
  
  const filteredUsers = useMemo(() => {
    if (!searchTerm) return users;
    const term = searchTerm.toLowerCase();
    return users.filter(user => 
      user.email.toLowerCase().includes(term) ||
      user.firstName.toLowerCase().includes(term) ||
      user.lastName.toLowerCase().includes(term)
    );
  }, [users, searchTerm]);

  const filteredInvitations = useMemo(() => {
    if (!searchTerm) return invitations;
    const term = searchTerm.toLowerCase();
    return invitations.filter(invitation =>
      invitation.email.toLowerCase().includes(term)
    );
  }, [invitations, searchTerm]);

  // Handlers (Clean Code: funciones con nombres descriptivos)
  const handleOpenDialog = useCallback((dialog: keyof typeof dialogs) => {
    console.log('Opening dialog:', dialog);
    setDialogs(prev => ({ ...prev, [dialog]: true }));
  }, []);

  const closeDialog = useCallback((dialog: keyof typeof dialogs) => {
    setDialogs(prev => ({ ...prev, [dialog]: false }));
    if (dialog === 'edit' || dialog === 'create' || dialog === 'permissions' || dialog === 'delete') {
      setSelectedUser(null);
    }
  }, []);

  const handleMenuClick = useCallback((event: React.MouseEvent<HTMLElement>, user: User) => {
    event.stopPropagation();
    console.log('📌 [handleMenuClick] Usuario recibido para el menú:', user);
    console.log('🔑 [handleMenuClick] Propiedades del usuario:', Object.keys(user));
    console.log('🆔 [handleMenuClick] ID del usuario:', user.id);
    setSelectedUser(user);
    setAnchorEl(event.currentTarget);
  }, []);

  const handleMenuClose = useCallback(() => {
    setAnchorEl(null);
  }, []);

  const handleOpenEditDialog = useCallback(() => {
    console.log('🖊️ [UserManagement.handleOpenEditDialog] Abriendo diálogo de edición');
    console.log('👤 [UserManagement.handleOpenEditDialog] Usuario seleccionado para editar:', selectedUser);
    console.log('🆔 [UserManagement.handleOpenEditDialog] ID del usuario:', selectedUser?.id);
    console.log('🔑 [UserManagement.handleOpenEditDialog] Propiedades del usuario:', selectedUser ? Object.keys(selectedUser) : 'No user');
    console.log('📧 [UserManagement.handleOpenEditDialog] Email del usuario:', selectedUser?.email);

    handleOpenDialog('edit');
    handleMenuClose();
  }, [handleOpenDialog, handleMenuClose, selectedUser]);

  const handleManagePermissions = useCallback(() => {
    handleOpenDialog('permissions');
    handleMenuClose();
  }, [handleOpenDialog, handleMenuClose]);

  const handleDeleteUser = useCallback(() => {
    handleOpenDialog('delete');
    handleMenuClose();
  }, [handleOpenDialog, handleMenuClose]);

  const handleConfirmDelete = useCallback(() => {
    // Debug logs para rastrear el problema de eliminación
    console.log('🗑️ [UserManagement.handleConfirmDelete] Iniciando eliminación de usuario');
    console.log('👤 [UserManagement.handleConfirmDelete] Usuario seleccionado:', selectedUser);
    console.log('🆔 [UserManagement.handleConfirmDelete] ID del usuario:', selectedUser?.id);
    console.log('📧 [UserManagement.handleConfirmDelete] Email del usuario:', selectedUser?.email);

    if (selectedUser) {
      console.log('✅ [UserManagement.handleConfirmDelete] Usuario válido, llamando deleteUserMutation');
      deleteUserMutation.mutate(selectedUser.id);
    } else {
      console.error('❌ [UserManagement.handleConfirmDelete] No hay usuario seleccionado');
    }
  }, [selectedUser, deleteUserMutation]);

  const handleCreateUser = useCallback(async (userData: any) => {
    console.log('🚀 [Frontend] Starting user creation...');
    console.log('📦 [Frontend] User data to send:', userData);
    console.log('🏢 [Frontend] Current company:', currentCompany);
    console.log('👤 [Frontend] Current user:', currentUser);
    console.log('🔐 [Frontend] Access token:', localStorage.getItem('auth_access_token')?.substring(0, 50) + '...');
    
    try {
      console.log('📡 [Frontend] Calling userService.createUser...');
      const result = await userService.createUser(currentCompany!.id, userData);
      console.log('✅ [Frontend] User created successfully:', result);
      
      queryClient.invalidateQueries({ queryKey: ['users'] });
      addNotification({
        type: 'success',
        title: 'Usuario creado',
        message: 'El usuario ha sido creado exitosamente'
      });
      closeDialog('create');
    } catch (error: any) {
      console.error('❌ [Frontend] Error creating user:', {
        error: error,
        response: error.response,
        status: error.response?.status,
        data: error.response?.data,
        headers: error.response?.headers
      });
      
      addNotification({
        type: 'error',
        title: 'Error al crear usuario',
        message: error.response?.data?.message || 'No se pudo crear el usuario'
      });
      throw error;
    }
  }, [currentCompany, currentUser, queryClient, addNotification]);

  const handleEditUser = useCallback(async (userData: any) => {
    if (!selectedUser) return;
    try {
      await userService.updateUser(selectedUser.id, userData);
      queryClient.invalidateQueries({ queryKey: ['users'] });
      addNotification({
        type: 'success',
        title: 'Usuario actualizado',
        message: 'El usuario ha sido actualizado exitosamente'
      });
      closeDialog('edit');
    } catch (error: any) {
      addNotification({
        type: 'error',
        title: 'Error al actualizar usuario',
        message: error.response?.data?.message || 'No se pudo actualizar el usuario'
      });
      throw error;
    }
  }, [selectedUser, queryClient, addNotification]);

  const handleTabChange = useCallback((_: React.SyntheticEvent, newValue: number) => {
    setSelectedTab(newValue);
    setSearchTerm('');
    clearSelection();
  }, [clearSelection]);

  // Table columns definition
  const userColumns = useMemo(() => [
    {
      key: 'user',
      header: 'Usuario',
      sortable: true,
      render: (user: User) => (
        <Stack direction="row" spacing={2} alignItems="center">
          <Avatar 
            src={user.avatar} 
            alt={`${user.firstName || ''} ${user.lastName || ''}`}
            sx={{ width: 40, height: 40 }}
          >
            {user.firstName?.[0] || user.email?.[0] || 'U'}{user.lastName?.[0] || ''}
          </Avatar>
          <Box>
            <Typography variant="body2" fontWeight={500}>
              {user.firstName || ''} {user.lastName || ''}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              {user.email}
            </Typography>
          </Box>
        </Stack>
      )
    },
    {
      key: 'role',
      header: 'Rol',
      sortable: true,
      render: (user: User) => (
        <Chip 
          label={user.role.replace('_', ' ')} 
          size="small"
          color="primary"
          variant="outlined"
        />
      )
    },
    {
      key: 'status',
      header: 'Estado',
      sortable: true,
      render: (user: User) => (
        <Chip 
          label={user.status} 
          size="small"
          color={STATUS_COLORS[user.status]}
        />
      )
    },
    {
      key: 'lastLogin',
      header: 'Último acceso',
      sortable: true,
      render: (user: User) => (
        <Typography variant="caption">
          {user.lastLoginAt 
            ? new Date(user.lastLoginAt).toLocaleDateString()
            : 'Nunca'}
        </Typography>
      )
    },
    {
      key: 'actions',
      header: '',
      render: (user: User) => {
        // Debug log para cada usuario en la tabla
        console.log('🔍 [userColumns.actions] Usuario en la tabla:', {
          email: user.email,
          id: user.id,
          hasId: 'id' in user,
          allKeys: Object.keys(user)
        });
        return (
          <IconButton
            size="small"
            onClick={(e) => handleMenuClick(e, user)}
            disabled={user.id === currentUser?.id}
          >
            <MoreVertical size={16} />
          </IconButton>
        );
      }
    }
  ], [handleMenuClick, currentUser]);

  const invitationColumns = useMemo(() => [
    {
      key: 'email',
      header: 'Email',
      sortable: true,
      render: (invitation: UserInvitation) => (
        <Typography variant="body2">{invitation.email}</Typography>
      )
    },
    {
      key: 'role',
      header: 'Rol',
      render: (invitation: UserInvitation) => (
        <Chip 
          label={invitation.roleName} 
          size="small"
          color="primary"
          variant="outlined"
        />
      )
    },
    {
      key: 'status',
      header: 'Estado',
      render: (invitation: UserInvitation) => (
        <Chip 
          icon={
            invitation.status === InvitationStatus.PENDING ? <Clock size={14} /> :
            invitation.status === InvitationStatus.ACCEPTED ? <CheckCircle size={14} /> :
            invitation.status === InvitationStatus.EXPIRED ? <XCircle size={14} /> :
            undefined
          }
          label={invitation.status} 
          size="small"
          color={INVITATION_STATUS_COLORS[invitation.status]}
        />
      )
    },
    {
      key: 'invitedBy',
      header: 'Invitado por',
      render: (invitation: UserInvitation) => (
        <Typography variant="caption">{invitation.invitedByName}</Typography>
      )
    },
    {
      key: 'expiresAt',
      header: 'Expira',
      render: (invitation: UserInvitation) => (
        <Typography variant="caption">
          {new Date(invitation.expiresAt).toLocaleDateString()}
        </Typography>
      )
    },
    {
      key: 'actions',
      header: '',
      render: (invitation: UserInvitation) => (
        <Stack direction="row" spacing={1}>
          {invitation.status === InvitationStatus.PENDING && (
            <>
              <Tooltip title="Reenviar invitación">
                <IconButton
                  size="small"
                  onClick={() => resendInvitationMutation.mutate(invitation.id)}
                  disabled={resendInvitationMutation.isLoading}
                >
                  <Mail size={16} />
                </IconButton>
              </Tooltip>
              <Tooltip title="Cancelar invitación">
                <IconButton
                  size="small"
                  onClick={() => cancelInvitationMutation.mutate(invitation.id)}
                  disabled={cancelInvitationMutation.isLoading}
                >
                  <XCircle size={16} />
                </IconButton>
              </Tooltip>
            </>
          )}
        </Stack>
      )
    }
  ], [resendInvitationMutation, cancelInvitationMutation]);

  // Error handling
  if (usersError) {
    return (
      <Box p={3}>
        <Alert severity="error">
          Error al cargar usuarios. Por favor, intenta nuevamente.
        </Alert>
      </Box>
    );
  }

  return (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      {/* Header */}
      <Paper sx={{ p: 3, mb: 2 }}>
        <Stack direction="row" justifyContent="space-between" alignItems="center" mb={3}>
          <Typography variant="h5" fontWeight={600}>
            Gestión de Usuarios
          </Typography>
          
          <Stack direction="row" spacing={2}>
            <Button
              variant="contained"
              color="primary"
              startIcon={<UserPlus />}
              onClick={() => handleOpenDialog('create')}
            >
              Crear Usuario
            </Button>
            {canInviteUsers && (
              <Button
                variant="outlined"
                color="primary"
                startIcon={<Mail />}
                onClick={() => handleOpenDialog('invite')}
              >
                Invitar Usuario
              </Button>
            )}
          </Stack>
        </Stack>

        {/* Search and Filters */}
        <Stack direction="row" spacing={2} alignItems="center">
          <TextField
            size="small"
            placeholder="Buscar usuarios o invitaciones..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <Search size={20} />
                </InputAdornment>
              )
            }}
            sx={{ flexGrow: 1, maxWidth: 400 }}
          />
          
          <Button
            variant="text"
            startIcon={<Filter />}
            onClick={() => {/* TODO: Implement filters */}}
          >
            Filtros
          </Button>

          <IconButton onClick={() => {
            refetchUsers();
            refetchInvitations();
          }}>
            <RefreshCw />
          </IconButton>
        </Stack>
      </Paper>

      {/* Tabs */}
      <Paper sx={{ flexGrow: 1, display: 'flex', flexDirection: 'column' }}>
        <Tabs 
          value={selectedTab} 
          onChange={handleTabChange}
          sx={{ borderBottom: 1, borderColor: 'divider', px: 2 }}
        >
          <Tab 
            label={
              <Badge badgeContent={users.length} color="primary" max={999}>
                Usuarios
              </Badge>
            } 
          />
          {canInviteUsers && (
            <Tab 
              label={
                <Badge 
                  badgeContent={invitations.filter(i => i.status === InvitationStatus.PENDING).length} 
                  color="warning" 
                  max={999}
                >
                  Invitaciones
                </Badge>
              } 
            />
          )}
        </Tabs>

        {/* Content */}
        <Box sx={{ flexGrow: 1, position: 'relative', overflow: 'auto' }}>
          {isLoadingUsers || isLoadingInvitations ? (
            <LoadingOverlay />
          ) : (
            <>
              {selectedTab === TABS.USERS && (
                <DataTable
                  data={filteredUsers}
                  columns={userColumns}
                  onRowClick={(user) => setSelectedUser(user)}
                  selectable
                  selectedRows={selectedUsers}
                  onSelectRow={toggleUserSelection}
                  onSelectAll={selectAllUsers}
                />
              )}
              
              {selectedTab === TABS.INVITATIONS && canInviteUsers && (
                <DataTable
                  data={filteredInvitations}
                  columns={invitationColumns}
                />
              )}
            </>
          )}
        </Box>
      </Paper>

      {/* Action Menu */}
      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleMenuClose}
      >
        <MenuItem onClick={handleOpenEditDialog}>
          <Edit size={16} style={{ marginRight: 8 }} />
          Editar Usuario
        </MenuItem>
        {canManagePermissions && (
          <MenuItem onClick={handleManagePermissions}>
            <Shield size={16} style={{ marginRight: 8 }} />
            Gestionar Permisos
          </MenuItem>
        )}
        <MenuItem onClick={handleDeleteUser} sx={{ color: 'error.main' }}>
          <Trash2 size={16} style={{ marginRight: 8 }} />
          Eliminar Usuario
        </MenuItem>
      </Menu>

      {/* Dialogs */}
      {dialogs.invite && (
        <UserInviteDialog
          open={dialogs.invite}
          onClose={() => closeDialog('invite')}
          companyId={currentCompany?.id || ''}
        />
      )}

      {dialogs.edit && selectedUser && (
        <UserEditDialog
          open={dialogs.edit}
          onClose={() => closeDialog('edit')}
          user={(() => {
            console.log('🎭 [UserEditDialog] Pasando usuario al diálogo:', selectedUser);
            console.log('🆔 [UserEditDialog] ID del usuario:', selectedUser.id);
            console.log('🔑 [UserEditDialog] Todas las propiedades:', Object.keys(selectedUser));
            console.log('🆔 [UserEditDialog] Role ID:', selectedUser.roleId);
            return selectedUser;
          })()}
          mode="edit"
          companyId={currentCompany?.id}
          onSave={handleEditUser}
          roles={rolesData || []}
          companies={(() => {
            console.log('🏢 [UserManagement] Companies data:', companiesData);
            console.log('🏭 [UserManagement] Current company:', currentCompany);
            return companiesData || [];
          })()}
        />
      )}

      {dialogs.create && (
        <UserEditDialog
          open={dialogs.create}
          onClose={() => closeDialog('create')}
          mode="create"
          companyId={currentCompany?.id || ''}
          onSave={handleCreateUser}
          roles={rolesData || []}
          companies={companiesData || []}
        />
      )}

      {dialogs.permissions && selectedUser && canManagePermissions && (
        <PermissionDialog
          open={dialogs.permissions}
          onClose={() => closeDialog('permissions')}
          userId={selectedUser.id}
          userName={`${selectedUser.firstName} ${selectedUser.lastName}`}
        />
      )}

      {dialogs.delete && selectedUser && (
        <ConfirmDialog
          open={dialogs.delete}
          title="Eliminar Usuario"
          message={`¿Estás seguro de que deseas eliminar al usuario ${selectedUser.firstName} ${selectedUser.lastName}? Esta acción no se puede deshacer.`}
          confirmText="Eliminar"
          confirmColor="error"
          onConfirm={handleConfirmDelete}
          onCancel={() => closeDialog('delete')}
          loading={deleteUserMutation.isLoading}
        />
      )}
    </Box>
  );
};

export default UserManagement;