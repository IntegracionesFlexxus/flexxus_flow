/**
 * useRoleValidation Hook
 * Hook especializado para validaciones de jerarquía de roles
 * Implementa las reglas de negocio para SuperAdmin/Admin/User
 */

import { useCallback } from 'react';
import { useAuthGuard } from '@/shared/hooks/useAuth';
import type { Role, Permission } from '@/modules/users/types';

interface RoleValidationHook {
  // Validaciones de edición de roles
  canEditRole: (role: Role) => boolean;
  canDeleteRole: (role: Role) => boolean;
  canCreateRole: () => boolean;

  // Validaciones de permisos
  canAssignPermission: (permission: Permission) => boolean;
  canViewAllCompanies: () => boolean;
  canManageCompanyUsers: () => boolean;

  // Validaciones de jerarquía
  isSuperAdmin: () => boolean;
  isCompanyAdmin: () => boolean;
  isCompanyUser: () => boolean;

  // Utilidades de scope
  getPermittedActions: (context: 'roles' | 'users' | 'companies') => string[];
  shouldFilterByCompany: () => boolean;

  // Mensajes de feedback
  getAccessDeniedMessage: (action: string) => string;
  getPermissionRequiredMessage: (permission: string) => string;
}

/**
 * Hook para validaciones de roles según jerarquía del sistema
 */
export const useRoleValidation = (): RoleValidationHook => {
  const { hasPermission, hasRole, user } = useAuthGuard();

  // Verificar roles por jerarquía
  const isSuperAdmin = useCallback(() => {
    return hasRole('Super Admin') || hasRole('super_admin');
  }, [hasRole]);

  const isCompanyAdmin = useCallback(() => {
    return hasRole('admin') || hasRole('company_admin');
  }, [hasRole]);

  const isCompanyUser = useCallback(() => {
    return hasRole('user') || hasRole('company_user');
  }, [hasRole]);

  // Validaciones de roles
  const canEditRole = useCallback((role: Role) => {
    // SuperAdmin puede editar todos los roles
    if (isSuperAdmin()) return true;

    // Admin puede editar roles de su empresa (no del sistema)
    if (isCompanyAdmin()) {
      return !role.isSystemRole;
    }

    // User no puede editar roles
    return false;
  }, [isSuperAdmin, isCompanyAdmin]);

  const canDeleteRole = useCallback((role: Role) => {
    // SuperAdmin puede eliminar roles no críticos del sistema
    if (isSuperAdmin()) {
      // No permitir eliminar roles críticos del sistema
      const criticalRoles = ['super_admin', 'admin', 'user'];
      return !criticalRoles.includes(role.name.toLowerCase());
    }

    // Admin puede eliminar roles personalizados de su empresa
    if (isCompanyAdmin()) {
      return !role.isSystemRole;
    }

    // User no puede eliminar roles
    return false;
  }, [isSuperAdmin, isCompanyAdmin]);

  const canCreateRole = useCallback(() => {
    // SuperAdmin y Admin pueden crear roles
    return isSuperAdmin() || isCompanyAdmin();
  }, [isSuperAdmin, isCompanyAdmin]);

  // Validaciones de permisos
  const canAssignPermission = useCallback((permission: Permission) => {
    // SuperAdmin puede asignar cualquier permiso
    if (isSuperAdmin()) return true;

    // Admin puede asignar permisos que él tiene
    if (isCompanyAdmin()) {
      return hasPermission(permission.name);
    }

    // User no puede asignar permisos
    return false;
  }, [isSuperAdmin, isCompanyAdmin, hasPermission]);

  const canViewAllCompanies = useCallback(() => {
    return isSuperAdmin();
  }, [isSuperAdmin]);

  const canManageCompanyUsers = useCallback(() => {
    return isSuperAdmin() || hasPermission('admin.users.companies.manage') || hasPermission('admin.companies.view');
  }, [isSuperAdmin, hasPermission]);

  // Utilidades de scope
  const shouldFilterByCompany = useCallback(() => {
    // SuperAdmin no necesita filtro por empresa
    return !isSuperAdmin();
  }, [isSuperAdmin]);

  const getPermittedActions = useCallback((context: 'roles' | 'users' | 'companies') => {
    const actions: string[] = [];

    switch (context) {
      case 'roles':
        if (canCreateRole()) actions.push('create');
        actions.push('view'); // Todos pueden ver roles
        if (isSuperAdmin() || isCompanyAdmin()) actions.push('edit');
        if (isSuperAdmin() || isCompanyAdmin()) actions.push('delete');
        break;

      case 'users':
        if (isSuperAdmin() || hasPermission('admin.users.view')) actions.push('view');
        if (isSuperAdmin() || hasPermission('admin.users.create')) actions.push('create');
        if (isSuperAdmin() || hasPermission('admin.users.edit')) actions.push('edit');
        if (isSuperAdmin() || hasPermission('admin.users.delete')) actions.push('delete');
        break;

      case 'companies':
        if (canViewAllCompanies()) actions.push('view_all');
        if (isSuperAdmin()) actions.push('create', 'edit', 'delete');
        actions.push('view_own'); // Todos pueden ver su empresa
        break;
    }

    return actions;
  }, [canCreateRole, isSuperAdmin, isCompanyAdmin, hasPermission, canViewAllCompanies]);

  // Mensajes de feedback
  const getAccessDeniedMessage = useCallback((action: string) => {
    const currentRole = isSuperAdmin() ? 'SuperAdmin' : isCompanyAdmin() ? 'Admin' : 'Usuario';

    switch (action) {
      case 'view_companies':
        return `Solo los SuperAdministradores pueden ver todas las empresas. Tu rol actual es: ${currentRole}`;
      case 'edit_roles':
        return `No tienes permisos para editar roles. Los Admins solo pueden editar roles de su empresa.`;
      case 'delete_roles':
        return `No tienes permisos para eliminar roles. Contacta con tu administrador.`;
      case 'create_roles':
        return `Solo los Administradores pueden crear roles personalizados.`;
      case 'assign_permissions':
        return `No puedes asignar permisos que no posees. Contacta con tu SuperAdmin.`;
      default:
        return `No tienes permisos para realizar esta acción. Tu rol actual: ${currentRole}`;
    }
  }, [isSuperAdmin, isCompanyAdmin]);

  const getPermissionRequiredMessage = useCallback((permission: string) => {
    return `Se requiere el permiso "${permission}" para realizar esta acción. Contacta con tu administrador para obtener los permisos necesarios.`;
  }, []);

  return {
    // Validaciones de edición
    canEditRole,
    canDeleteRole,
    canCreateRole,

    // Validaciones de permisos
    canAssignPermission,
    canViewAllCompanies,
    canManageCompanyUsers,

    // Validaciones de jerarquía
    isSuperAdmin,
    isCompanyAdmin,
    isCompanyUser,

    // Utilidades
    getPermittedActions,
    shouldFilterByCompany,

    // Mensajes de feedback
    getAccessDeniedMessage,
    getPermissionRequiredMessage
  };
};

export default useRoleValidation;