/**
 * Permission Matrix Component - Sprint 3
 * Matriz visual de permisos para asignación intuitiva
 * Siguiendo principios SOLID y Clean Code del Nivel 2
 */

import React, { useState, useMemo, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent
} from '@/components/ui/Card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { SearchInput } from '@/components/ui/SearchInput';
import { LoadingOverlay } from '@/components/ui/Loading';
import { EmptyState } from '@/components/ui/EmptyState';
import { roleService } from '@/modules/auth/services/roleService';
import { permissionService } from '@/modules/auth/services/permissionService';
import { useAuth } from '@/shared/hooks/useAuth';
import {
  Grid,
  Shield,
  Users,
  Check,
  X,
  Save,
  RefreshCw,
  Filter,
  Download,
  Upload,
  Eye,
  EyeOff,
  ChevronRight,
  ChevronDown,
  AlertCircle,
  Info
} from 'lucide-react';

// Types
interface Role {
  id: string;
  name: string;
  description: string;
  permissions: string[];
  userCount?: number;
  isSystem: boolean;
  priority?: number;
}

interface Permission {
  id: string;
  name: string;
  resource: string;
  action: string;
  description: string;
  category?: string;
}

interface PermissionGroup {
  category: string;
  permissions: Permission[];
  expanded?: boolean;
}

interface MatrixCell {
  roleId: string;
  permissionId: string;
  hasPermission: boolean;
  inherited?: boolean;
  isDirty?: boolean;
}

interface MatrixChanges {
  additions: Array<{ roleId: string; permissionId: string }>;
  removals: Array<{ roleId: string; permissionId: string }>;
}

/**
 * PermissionMatrix Component
 * Matriz visual para gestión de permisos por rol
 */
export const PermissionMatrix: React.FC = () => {
  const queryClient = useQueryClient();
  const { hasPermission } = useAuth();

  // Estado local
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedRoles, setSelectedRoles] = useState<Set<string>>(new Set());
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set());
  const [showSystemRoles, setShowSystemRoles] = useState(false);
  const [viewMode, setViewMode] = useState<'edit' | 'view'>('edit');
  const [changes, setChanges] = useState<MatrixChanges>({
    additions: [],
    removals: []
  });
  const [isDirty, setIsDirty] = useState(false);

  // Verificar permisos
  const canEdit = hasPermission('permissions.update');
  const canExport = hasPermission('permissions.export');

  // Query para obtener roles
  const {
    data: roles,
    isLoading: rolesLoading
  } = useQuery({
    queryKey: ['roles', showSystemRoles],
    queryFn: () => roleService.getRoles({ isSystem: showSystemRoles ? null : false }),
    staleTime: 5 * 60 * 1000
  });

  // Query para obtener permisos
  const {
    data: permissions,
    isLoading: permissionsLoading
  } = useQuery({
    queryKey: ['permissions'],
    queryFn: () => permissionService.getAllPermissions(),
    staleTime: 10 * 60 * 1000
  });

  // Query para obtener matriz de permisos
  const {
    data: permissionMatrix,
    isLoading: matrixLoading
  } = useQuery({
    queryKey: ['permission-matrix'],
    queryFn: () => permissionService.getPermissionMatrix(),
    staleTime: 5 * 60 * 1000
  });

  // Mutation para actualizar permisos
  const updatePermissionsMutation = useMutation({
    mutationFn: async (changes: MatrixChanges) => {
      const promises = [];

      // Procesar adiciones
      for (const addition of changes.additions) {
        promises.push(
          roleService.addPermissionToRole(addition.roleId, addition.permissionId)
        );
      }

      // Procesar remociones
      for (const removal of changes.removals) {
        promises.push(
          roleService.removePermissionFromRole(removal.roleId, removal.permissionId)
        );
      }

      return Promise.all(promises);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['roles'] });
      queryClient.invalidateQueries({ queryKey: ['permission-matrix'] });
      toast.success('Permissions updated successfully');
      setChanges({ additions: [], removals: [] });
      setIsDirty(false);
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to update permissions');
    }
  });

  // Filtrar roles basado en selección
  const filteredRoles = useMemo(() => {
    if (!roles) return [];
    
    if (selectedRoles.size === 0) return roles;
    
    return roles.filter(role => selectedRoles.has(role.id));
  }, [roles, selectedRoles]);

  // Agrupar permisos por categoría
  const groupedPermissions = useMemo(() => {
    if (!permissions) return [];

    const grouped = permissions.reduce((acc: Record<string, Permission[]>, permission) => {
      const category = permission.category || 'General';
      if (!acc[category]) {
        acc[category] = [];
      }
      acc[category].push(permission);
      return acc;
    }, {});

    return Object.entries(grouped).map(([category, perms]) => ({
      category,
      permissions: perms,
      expanded: expandedCategories.has(category)
    }));
  }, [permissions, expandedCategories]);

  // Filtrar permisos por búsqueda
  const filteredPermissions = useMemo(() => {
    if (!searchTerm) return groupedPermissions;

    return groupedPermissions.map(group => ({
      ...group,
      permissions: group.permissions.filter(
        p => p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
             p.description.toLowerCase().includes(searchTerm.toLowerCase())
      )
    })).filter(group => group.permissions.length > 0);
  }, [groupedPermissions, searchTerm]);

  // Verificar si un rol tiene un permiso (incluyendo cambios pendientes)
  const hasPermission = useCallback((roleId: string, permissionId: string): boolean => {
    // Verificar cambios pendientes
    const isAddition = changes.additions.some(
      a => a.roleId === roleId && a.permissionId === permissionId
    );
    const isRemoval = changes.removals.some(
      r => r.roleId === roleId && r.permissionId === permissionId
    );

    if (isAddition) return true;
    if (isRemoval) return false;

    // Verificar estado original
    const role = roles?.find(r => r.id === roleId);
    return role?.permissions.includes(permissionId) || false;
  }, [roles, changes]);

  // Toggle permission para un rol
  const togglePermission = useCallback((roleId: string, permissionId: string) => {
    if (viewMode === 'view' || !canEdit) return;

    const currentState = hasPermission(roleId, permissionId);
    const role = roles?.find(r => r.id === roleId);
    const originalState = role?.permissions.includes(permissionId) || false;

    setChanges(prev => {
      const newChanges = { ...prev };

      if (currentState) {
        // Removing permission
        if (originalState) {
          // Was originally true, now removing
          newChanges.removals.push({ roleId, permissionId });
        } else {
          // Was added in this session, now reverting
          newChanges.additions = newChanges.additions.filter(
            a => !(a.roleId === roleId && a.permissionId === permissionId)
          );
        }
      } else {
        // Adding permission
        if (!originalState) {
          // Was originally false, now adding
          newChanges.additions.push({ roleId, permissionId });
        } else {
          // Was removed in this session, now reverting
          newChanges.removals = newChanges.removals.filter(
            r => !(r.roleId === roleId && r.permissionId === permissionId)
          );
        }
      }

      return newChanges;
    });

    setIsDirty(true);
  }, [hasPermission, roles, viewMode, canEdit]);

  // Toggle all permissions en una categoría para un rol
  const toggleCategoryForRole = useCallback((roleId: string, category: PermissionGroup) => {
    if (viewMode === 'view' || !canEdit) return;

    const allEnabled = category.permissions.every(p => hasPermission(roleId, p.id));

    category.permissions.forEach(permission => {
      const currentState = hasPermission(roleId, permission.id);
      if (allEnabled && currentState) {
        togglePermission(roleId, permission.id);
      } else if (!allEnabled && !currentState) {
        togglePermission(roleId, permission.id);
      }
    });
  }, [hasPermission, togglePermission, viewMode, canEdit]);

  // Toggle all permissions para un rol
  const toggleAllForRole = useCallback((roleId: string) => {
    if (viewMode === 'view' || !canEdit) return;

    const allPermissions = permissions || [];
    const allEnabled = allPermissions.every(p => hasPermission(roleId, p.id));

    allPermissions.forEach(permission => {
      const currentState = hasPermission(roleId, permission.id);
      if (allEnabled && currentState) {
        togglePermission(roleId, permission.id);
      } else if (!allEnabled && !currentState) {
        togglePermission(roleId, permission.id);
      }
    });
  }, [permissions, hasPermission, togglePermission, viewMode, canEdit]);

  // Toggle expansión de categoría
  const toggleCategory = useCallback((category: string) => {
    setExpandedCategories(prev => {
      const newSet = new Set(prev);
      if (newSet.has(category)) {
        newSet.delete(category);
      } else {
        newSet.add(category);
      }
      return newSet;
    });
  }, []);

  // Guardar cambios
  const handleSaveChanges = async () => {
    if (changes.additions.length === 0 && changes.removals.length === 0) {
      toast.info('No changes to save');
      return;
    }

    await updatePermissionsMutation.mutateAsync(changes);
  };

  // Cancelar cambios
  const handleCancelChanges = () => {
    setChanges({ additions: [], removals: [] });
    setIsDirty(false);
    toast.info('Changes discarded');
  };

  // Exportar matriz
  const handleExportMatrix = async () => {
    try {
      const exportData = {
        roles: filteredRoles.map(r => ({
          id: r.id,
          name: r.name,
          permissions: r.permissions
        })),
        permissions: permissions?.map(p => ({
          id: p.id,
          name: p.name,
          category: p.category
        })),
        timestamp: new Date().toISOString()
      };

      const blob = new Blob([JSON.stringify(exportData, null, 2)], {
        type: 'application/json'
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `permission-matrix-${new Date().toISOString()}.json`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success('Matrix exported successfully');
    } catch (error) {
      toast.error('Failed to export matrix');
    }
  };

  // Loading state
  if (rolesLoading || permissionsLoading || matrixLoading) {
    return <LoadingOverlay />;
  }

  // Empty state
  if (!roles || roles.length === 0) {
    return (
      <Card>
        <CardContent className="py-10">
          <EmptyState
            icon={Shield}
            title="No roles available"
            description="Create roles first to manage permissions"
          />
        </CardContent>
      </Card>
    );
  }

  if (!permissions || permissions.length === 0) {
    return (
      <Card>
        <CardContent className="py-10">
          <EmptyState
            icon={Grid}
            title="No permissions defined"
            description="Permissions need to be configured in the system"
          />
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Grid className="h-5 w-5" />
                Permission Matrix
              </CardTitle>
              <CardDescription>
                Visual permission assignment across roles
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              {/* View Mode Toggle */}
              <div className="flex items-center gap-2 mr-4">
                <Button
                  variant={viewMode === 'edit' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setViewMode('edit')}
                  disabled={!canEdit}
                >
                  <Eye className="h-4 w-4 mr-1" />
                  Edit
                </Button>
                <Button
                  variant={viewMode === 'view' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setViewMode('view')}
                >
                  <EyeOff className="h-4 w-4 mr-1" />
                  View
                </Button>
              </div>

              {/* Actions */}
              {isDirty && (
                <>
                  <Button
                    variant="outline"
                    onClick={handleCancelChanges}
                    disabled={updatePermissionsMutation.isPending}
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={handleSaveChanges}
                    disabled={updatePermissionsMutation.isPending}
                  >
                    <Save className="h-4 w-4 mr-2" />
                    Save Changes
                  </Button>
                </>
              )}
              {canExport && (
                <Button variant="outline" onClick={handleExportMatrix}>
                  <Download className="h-4 w-4 mr-2" />
                  Export
                </Button>
              )}
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Filters */}
      <Card>
        <CardContent className="py-4">
          <div className="flex items-center gap-4">
            <SearchInput
              value={searchTerm}
              onChange={setSearchTerm}
              placeholder="Search permissions..."
              className="flex-1"
            />
            <div className="flex items-center gap-2">
              <Label htmlFor="system-roles" className="text-sm">
                Show System Roles
              </Label>
              <Switch
                id="system-roles"
                checked={showSystemRoles}
                onCheckedChange={setShowSystemRoles}
              />
            </div>
            {filteredRoles.length !== roles?.length && (
              <Badge variant="secondary">
                {filteredRoles.length} of {roles?.length} roles
              </Badge>
            )}
          </div>

          {/* Role Filter */}
          <div className="mt-4">
            <Label className="text-sm mb-2 block">Filter Roles</Label>
            <div className="flex flex-wrap gap-2">
              {roles?.map(role => (
                <Badge
                  key={role.id}
                  variant={selectedRoles.has(role.id) ? 'default' : 'outline'}
                  className="cursor-pointer"
                  onClick={() => {
                    const newSelection = new Set(selectedRoles);
                    if (newSelection.has(role.id)) {
                      newSelection.delete(role.id);
                    } else {
                      newSelection.add(role.id);
                    }
                    setSelectedRoles(newSelection);
                  }}
                >
                  {role.name}
                  {role.isSystem && ' (System)'}
                </Badge>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Pending Changes Indicator */}
      {isDirty && (
        <Card className="border-yellow-200 bg-yellow-50">
          <CardContent className="py-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <AlertCircle className="h-4 w-4 text-yellow-600" />
                <span className="text-sm font-medium text-yellow-900">
                  You have unsaved changes
                </span>
                <Badge variant="secondary" className="ml-2">
                  {changes.additions.length} additions
                </Badge>
                <Badge variant="secondary">
                  {changes.removals.length} removals
                </Badge>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Permission Matrix */}
      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="sticky left-0 bg-gray-50 p-4 text-left text-sm font-medium text-gray-900">
                    Permissions / Roles
                  </th>
                  {filteredRoles.map(role => (
                    <th
                      key={role.id}
                      className="p-4 text-center text-sm font-medium text-gray-900 min-w-[120px]"
                    >
                      <div className="flex flex-col items-center gap-1">
                        <span>{role.name}</span>
                        {role.isSystem && (
                          <Badge variant="secondary" className="text-xs">
                            System
                          </Badge>
                        )}
                        {role.userCount !== undefined && (
                          <span className="text-xs text-gray-500">
                            {role.userCount} users
                          </span>
                        )}
                        {viewMode === 'edit' && canEdit && !role.isSystem && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="mt-1"
                            onClick={() => toggleAllForRole(role.id)}
                          >
                            Toggle All
                          </Button>
                        )}
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filteredPermissions.map((group, groupIndex) => (
                  <React.Fragment key={group.category}>
                    {/* Category Header */}
                    <tr className="bg-gray-100 border-t">
                      <td
                        className="sticky left-0 bg-gray-100 p-3 font-medium text-sm cursor-pointer"
                        onClick={() => toggleCategory(group.category)}
                      >
                        <div className="flex items-center gap-2">
                          {group.expanded ? (
                            <ChevronDown className="h-4 w-4" />
                          ) : (
                            <ChevronRight className="h-4 w-4" />
                          )}
                          <span>{group.category}</span>
                          <Badge variant="secondary" className="text-xs">
                            {group.permissions.length}
                          </Badge>
                        </div>
                      </td>
                      {filteredRoles.map(role => (
                        <td key={role.id} className="text-center p-3">
                          {viewMode === 'edit' && canEdit && !role.isSystem && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => toggleCategoryForRole(role.id, group)}
                            >
                              Toggle
                            </Button>
                          )}
                        </td>
                      ))}
                    </tr>

                    {/* Category Permissions */}
                    {group.expanded && group.permissions.map((permission, permIndex) => (
                      <tr
                        key={permission.id}
                        className={`border-b hover:bg-gray-50 ${
                          permIndex % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'
                        }`}
                      >
                        <td className="sticky left-0 bg-inherit p-3">
                          <div className="flex flex-col">
                            <span className="text-sm font-medium">
                              {permission.name}
                            </span>
                            <span className="text-xs text-gray-500">
                              {permission.description}
                            </span>
                          </div>
                        </td>
                        {filteredRoles.map(role => {
                          const hasIt = hasPermission(role.id, permission.id);
                          const isChanged = 
                            changes.additions.some(
                              a => a.roleId === role.id && a.permissionId === permission.id
                            ) ||
                            changes.removals.some(
                              r => r.roleId === role.id && r.permissionId === permission.id
                            );

                          return (
                            <td key={role.id} className="text-center p-3">
                              {viewMode === 'edit' && canEdit && !role.isSystem ? (
                                <Switch
                                  checked={hasIt}
                                  onCheckedChange={() => togglePermission(role.id, permission.id)}
                                  className={isChanged ? 'ring-2 ring-yellow-400' : ''}
                                />
                              ) : (
                                <div className="flex justify-center">
                                  {hasIt ? (
                                    <Check className="h-5 w-5 text-green-600" />
                                  ) : (
                                    <X className="h-5 w-5 text-gray-400" />
                                  )}
                                </div>
                              )}
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </React.Fragment>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Legend */}
      <Card>
        <CardContent className="py-3">
          <div className="flex items-center gap-6 text-sm">
            <div className="flex items-center gap-2">
              <Info className="h-4 w-4 text-gray-500" />
              <span className="text-gray-600">Legend:</span>
            </div>
            <div className="flex items-center gap-2">
              <Check className="h-4 w-4 text-green-600" />
              <span>Permission Granted</span>
            </div>
            <div className="flex items-center gap-2">
              <X className="h-4 w-4 text-gray-400" />
              <span>Permission Denied</span>
            </div>
            {isDirty && (
              <div className="flex items-center gap-2">
                <div className="h-4 w-4 ring-2 ring-yellow-400 rounded" />
                <span>Modified (Unsaved)</span>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default PermissionMatrix;