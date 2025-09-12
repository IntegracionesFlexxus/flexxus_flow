/**
 * Role Management Component - Sprint 3
 * Componente de gestión de roles con RBAC completo
 * Siguiendo principios SOLID y Clean Code del Nivel 2
 */

import React, { useState, useEffect, useCallback, useMemo } from 'react';
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
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { DataTable } from '@/components/ui/DataTable';
import { SearchInput } from '@/components/ui/SearchInput';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { LoadingOverlay } from '@/components/ui/Loading';
import { EmptyState } from '@/components/ui/EmptyState';
import { roleService } from '@/modules/auth/services/roleService';
import { permissionService } from '@/modules/auth/services/permissionService';
import { useAuth } from '@/shared/hooks/useAuth';
import { useDebounce } from '@/shared/hooks/useDebounce';
import {
  Plus,
  Edit,
  Trash2,
  Shield,
  Users,
  Copy,
  Download,
  Upload,
  Settings,
  ChevronDown,
  ChevronRight,
  Search,
  Filter,
  AlertCircle
} from 'lucide-react';

// Types
interface Role {
  id: string;
  name: string;
  description: string;
  permissions: string[];
  userCount?: number;
  isSystem: boolean;
  createdAt: string;
  updatedAt: string;
  createdBy?: string;
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

interface RoleFormData {
  name: string;
  description: string;
  permissions: string[];
  priority?: number;
}

/**
 * RoleManagement Component
 * Gestión completa de roles con interfaz intuitiva
 */
export const RoleManagement: React.FC = () => {
  const queryClient = useQueryClient();
  const { user, hasPermission } = useAuth();

  // Estado local
  const [selectedRole, setSelectedRole] = useState<Role | null>(null);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterBySystem, setFilterBySystem] = useState<boolean | null>(null);
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set());

  const debouncedSearchTerm = useDebounce(searchTerm, 300);

  // Verificar permisos
  const canCreate = hasPermission('roles.create');
  const canEdit = hasPermission('roles.update');
  const canDelete = hasPermission('roles.delete');
  const canAssign = hasPermission('roles.assign');
  const canExport = hasPermission('roles.export');

  // Query para obtener roles
  const {
    data: roles,
    isLoading: rolesLoading,
    error: rolesError
  } = useQuery({
    queryKey: ['roles', debouncedSearchTerm, filterBySystem],
    queryFn: () => roleService.getRoles({
      search: debouncedSearchTerm,
      isSystem: filterBySystem
    }),
    staleTime: 5 * 60 * 1000 // 5 minutos
  });

  // Query para obtener permisos disponibles
  const {
    data: permissions,
    isLoading: permissionsLoading
  } = useQuery({
    queryKey: ['permissions'],
    queryFn: () => permissionService.getAllPermissions(),
    staleTime: 10 * 60 * 1000 // 10 minutos
  });

  // Mutation para crear rol
  const createRoleMutation = useMutation({
    mutationFn: (data: RoleFormData) => roleService.createRole(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['roles'] });
      toast.success('Role created successfully');
      setShowCreateDialog(false);
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to create role');
    }
  });

  // Mutation para actualizar rol
  const updateRoleMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<RoleFormData> }) =>
      roleService.updateRole(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['roles'] });
      toast.success('Role updated successfully');
      setShowEditDialog(false);
      setSelectedRole(null);
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to update role');
    }
  });

  // Mutation para eliminar rol
  const deleteRoleMutation = useMutation({
    mutationFn: (id: string) => roleService.deleteRole(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['roles'] });
      toast.success('Role deleted successfully');
      setShowDeleteDialog(false);
      setSelectedRole(null);
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to delete role');
    }
  });

  // Mutation para duplicar rol
  const duplicateRoleMutation = useMutation({
    mutationFn: (roleId: string) => roleService.duplicateRole(roleId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['roles'] });
      toast.success('Role duplicated successfully');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to duplicate role');
    }
  });

  // Agrupar permisos por categoría
  const groupedPermissions = useMemo(() => {
    if (!permissions) return {};

    return permissions.reduce((acc: Record<string, Permission[]>, permission) => {
      const category = permission.category || 'General';
      if (!acc[category]) {
        acc[category] = [];
      }
      acc[category].push(permission);
      return acc;
    }, {});
  }, [permissions]);

  // Definir columnas de la tabla
  const columns = useMemo(() => [
    {
      key: 'name',
      label: 'Role Name',
      sortable: true,
      render: (role: Role) => (
        <div className="flex items-center gap-2">
          <Shield className="h-4 w-4 text-blue-500" />
          <span className="font-medium">{role.name}</span>
          {role.isSystem && (
            <Badge variant="secondary" className="text-xs">
              System
            </Badge>
          )}
        </div>
      )
    },
    {
      key: 'description',
      label: 'Description',
      render: (role: Role) => (
        <span className="text-sm text-gray-600">{role.description}</span>
      )
    },
    {
      key: 'permissions',
      label: 'Permissions',
      render: (role: Role) => (
        <div className="flex items-center gap-2">
          <Badge variant="outline">
            {role.permissions.length} permissions
          </Badge>
        </div>
      )
    },
    {
      key: 'userCount',
      label: 'Users',
      sortable: true,
      render: (role: Role) => (
        <div className="flex items-center gap-1">
          <Users className="h-4 w-4 text-gray-400" />
          <span>{role.userCount || 0}</span>
        </div>
      )
    },
    {
      key: 'actions',
      label: 'Actions',
      render: (role: Role) => (
        <div className="flex items-center gap-2">
          {canEdit && !role.isSystem && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => handleEditRole(role)}
            >
              <Edit className="h-4 w-4" />
            </Button>
          )}
          {canCreate && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => handleDuplicateRole(role.id)}
            >
              <Copy className="h-4 w-4" />
            </Button>
          )}
          {canDelete && !role.isSystem && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => handleDeleteRole(role)}
              className="text-red-600 hover:text-red-700"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          )}
        </div>
      )
    }
  ], [canEdit, canDelete, canCreate]);

  // Handlers
  const handleEditRole = (role: Role) => {
    setSelectedRole(role);
    setShowEditDialog(true);
  };

  const handleDeleteRole = (role: Role) => {
    setSelectedRole(role);
    setShowDeleteDialog(true);
  };

  const handleDuplicateRole = async (roleId: string) => {
    try {
      await duplicateRoleMutation.mutateAsync(roleId);
    } catch (error) {
      console.error('Error duplicating role:', error);
    }
  };

  const handleExportRoles = async () => {
    try {
      const data = await roleService.exportRoles();
      const blob = new Blob([JSON.stringify(data, null, 2)], {
        type: 'application/json'
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `roles-export-${new Date().toISOString()}.json`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success('Roles exported successfully');
    } catch (error) {
      toast.error('Failed to export roles');
    }
  };

  const toggleCategory = (category: string) => {
    const newExpanded = new Set(expandedCategories);
    if (newExpanded.has(category)) {
      newExpanded.delete(category);
    } else {
      newExpanded.add(category);
    }
    setExpandedCategories(newExpanded);
  };

  // Loading state
  if (rolesLoading || permissionsLoading) {
    return <LoadingOverlay />;
  }

  // Error state
  if (rolesError) {
    return (
      <Card className="w-full">
        <CardContent className="py-10">
          <EmptyState
            icon={AlertCircle}
            title="Error loading roles"
            description="There was an error loading the roles. Please try again."
            action={
              <Button onClick={() => queryClient.invalidateQueries({ queryKey: ['roles'] })}>
                Retry
              </Button>
            }
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
                <Shield className="h-5 w-5" />
                Role Management
              </CardTitle>
              <CardDescription>
                Manage roles and their permissions
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              {canExport && (
                <Button variant="outline" onClick={handleExportRoles}>
                  <Download className="h-4 w-4 mr-2" />
                  Export
                </Button>
              )}
              {canCreate && (
                <Button onClick={() => setShowCreateDialog(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  New Role
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
              placeholder="Search roles..."
              className="flex-1"
            />
            <div className="flex items-center gap-2">
              <Label htmlFor="system-filter" className="text-sm">
                System Roles
              </Label>
              <Switch
                id="system-filter"
                checked={filterBySystem === true}
                onCheckedChange={(checked) => 
                  setFilterBySystem(checked ? true : null)
                }
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Roles Table */}
      <Card>
        <CardContent className="p-0">
          {roles && roles.length > 0 ? (
            <DataTable
              columns={columns}
              data={roles}
              searchable={false}
              pagination
              pageSize={10}
            />
          ) : (
            <EmptyState
              icon={Shield}
              title="No roles found"
              description={searchTerm ? "Try adjusting your search" : "Get started by creating your first role"}
              action={
                canCreate ? (
                  <Button onClick={() => setShowCreateDialog(true)}>
                    <Plus className="h-4 w-4 mr-2" />
                    Create Role
                  </Button>
                ) : undefined
              }
            />
          )}
        </CardContent>
      </Card>

      {/* Create/Edit Dialog */}
      {(showCreateDialog || showEditDialog) && (
        <RoleFormDialog
          role={selectedRole}
          permissions={permissions || []}
          groupedPermissions={groupedPermissions}
          expandedCategories={expandedCategories}
          onToggleCategory={toggleCategory}
          onSave={(data) => {
            if (showEditDialog && selectedRole) {
              updateRoleMutation.mutate({ id: selectedRole.id, data });
            } else {
              createRoleMutation.mutate(data);
            }
          }}
          onCancel={() => {
            setShowCreateDialog(false);
            setShowEditDialog(false);
            setSelectedRole(null);
          }}
          isLoading={createRoleMutation.isPending || updateRoleMutation.isPending}
        />
      )}

      {/* Delete Confirmation */}
      {showDeleteDialog && selectedRole && (
        <ConfirmDialog
          open={showDeleteDialog}
          onOpenChange={setShowDeleteDialog}
          title="Delete Role"
          description={`Are you sure you want to delete the role "${selectedRole.name}"? This action cannot be undone.`}
          onConfirm={() => deleteRoleMutation.mutate(selectedRole.id)}
          onCancel={() => {
            setShowDeleteDialog(false);
            setSelectedRole(null);
          }}
          isLoading={deleteRoleMutation.isPending}
          variant="destructive"
        />
      )}
    </div>
  );
};

/**
 * Role Form Dialog Component
 * Componente de formulario para crear/editar roles
 */
interface RoleFormDialogProps {
  role: Role | null;
  permissions: Permission[];
  groupedPermissions: Record<string, Permission[]>;
  expandedCategories: Set<string>;
  onToggleCategory: (category: string) => void;
  onSave: (data: RoleFormData) => void;
  onCancel: () => void;
  isLoading: boolean;
}

const RoleFormDialog: React.FC<RoleFormDialogProps> = ({
  role,
  permissions,
  groupedPermissions,
  expandedCategories,
  onToggleCategory,
  onSave,
  onCancel,
  isLoading
}) => {
  const [formData, setFormData] = useState<RoleFormData>({
    name: role?.name || '',
    description: role?.description || '',
    permissions: role?.permissions || [],
    priority: role?.priority || 100
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    // Validación
    const newErrors: Record<string, string> = {};
    if (!formData.name.trim()) {
      newErrors.name = 'Role name is required';
    }
    if (!formData.description.trim()) {
      newErrors.description = 'Description is required';
    }
    if (formData.permissions.length === 0) {
      newErrors.permissions = 'At least one permission is required';
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    onSave(formData);
  };

  const togglePermission = (permissionId: string) => {
    setFormData(prev => ({
      ...prev,
      permissions: prev.permissions.includes(permissionId)
        ? prev.permissions.filter(p => p !== permissionId)
        : [...prev.permissions, permissionId]
    }));
    setErrors(prev => ({ ...prev, permissions: '' }));
  };

  const selectAllInCategory = (category: string) => {
    const categoryPermissions = groupedPermissions[category] || [];
    const allSelected = categoryPermissions.every(p =>
      formData.permissions.includes(p.id)
    );

    if (allSelected) {
      // Deselect all
      setFormData(prev => ({
        ...prev,
        permissions: prev.permissions.filter(
          p => !categoryPermissions.some(cp => cp.id === p)
        )
      }));
    } else {
      // Select all
      const newPermissions = categoryPermissions.map(p => p.id);
      setFormData(prev => ({
        ...prev,
        permissions: [...new Set([...prev.permissions, ...newPermissions])]
      }));
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <Card className="w-full max-w-4xl max-h-[90vh] overflow-hidden">
        <CardHeader>
          <CardTitle>
            {role ? 'Edit Role' : 'Create New Role'}
          </CardTitle>
          <CardDescription>
            Define role permissions and access rights
          </CardDescription>
        </CardHeader>
        <CardContent className="overflow-y-auto max-h-[calc(90vh-200px)]">
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Basic Info */}
            <div className="space-y-4">
              <div>
                <Label htmlFor="name">Role Name *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => {
                    setFormData(prev => ({ ...prev, name: e.target.value }));
                    setErrors(prev => ({ ...prev, name: '' }));
                  }}
                  placeholder="e.g., Editor, Viewer"
                  className={errors.name ? 'border-red-500' : ''}
                />
                {errors.name && (
                  <p className="text-sm text-red-500 mt-1">{errors.name}</p>
                )}
              </div>

              <div>
                <Label htmlFor="description">Description *</Label>
                <Input
                  id="description"
                  value={formData.description}
                  onChange={(e) => {
                    setFormData(prev => ({ ...prev, description: e.target.value }));
                    setErrors(prev => ({ ...prev, description: '' }));
                  }}
                  placeholder="Describe the role's purpose"
                  className={errors.description ? 'border-red-500' : ''}
                />
                {errors.description && (
                  <p className="text-sm text-red-500 mt-1">{errors.description}</p>
                )}
              </div>

              <div>
                <Label htmlFor="priority">Priority</Label>
                <Input
                  id="priority"
                  type="number"
                  value={formData.priority}
                  onChange={(e) => {
                    setFormData(prev => ({ 
                      ...prev, 
                      priority: parseInt(e.target.value) || 100 
                    }));
                  }}
                  placeholder="100"
                  min="0"
                  max="999"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Lower numbers have higher priority
                </p>
              </div>
            </div>

            <Separator />

            {/* Permissions */}
            <div>
              <Label>Permissions *</Label>
              {errors.permissions && (
                <p className="text-sm text-red-500 mb-2">{errors.permissions}</p>
              )}
              
              <div className="space-y-2 mt-4 border rounded-lg p-4 max-h-96 overflow-y-auto">
                {Object.entries(groupedPermissions).map(([category, categoryPermissions]) => {
                  const isExpanded = expandedCategories.has(category);
                  const allSelected = categoryPermissions.every(p =>
                    formData.permissions.includes(p.id)
                  );
                  const someSelected = categoryPermissions.some(p =>
                    formData.permissions.includes(p.id)
                  ) && !allSelected;

                  return (
                    <div key={category} className="border rounded-lg">
                      <div
                        className="flex items-center justify-between p-3 cursor-pointer hover:bg-gray-50"
                        onClick={() => onToggleCategory(category)}
                      >
                        <div className="flex items-center gap-2">
                          {isExpanded ? (
                            <ChevronDown className="h-4 w-4" />
                          ) : (
                            <ChevronRight className="h-4 w-4" />
                          )}
                          <span className="font-medium">{category}</span>
                          <Badge variant="secondary" className="text-xs">
                            {categoryPermissions.filter(p =>
                              formData.permissions.includes(p.id)
                            ).length}/{categoryPermissions.length}
                          </Badge>
                        </div>
                        <div
                          onClick={(e) => {
                            e.stopPropagation();
                            selectAllInCategory(category);
                          }}
                        >
                          <Switch
                            checked={allSelected}
                            className={someSelected ? 'data-[state=checked]:bg-blue-300' : ''}
                          />
                        </div>
                      </div>

                      {isExpanded && (
                        <div className="p-3 pt-0 space-y-2">
                          {categoryPermissions.map(permission => (
                            <div
                              key={permission.id}
                              className="flex items-center justify-between py-2 px-3 hover:bg-gray-50 rounded"
                            >
                              <div className="flex-1">
                                <div className="font-medium text-sm">
                                  {permission.name}
                                </div>
                                <div className="text-xs text-gray-500">
                                  {permission.description}
                                </div>
                              </div>
                              <Switch
                                checked={formData.permissions.includes(permission.id)}
                                onCheckedChange={() => togglePermission(permission.id)}
                              />
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Actions */}
            <div className="flex justify-end gap-2 pt-4 border-t">
              <Button
                type="button"
                variant="outline"
                onClick={onCancel}
                disabled={isLoading}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isLoading}>
                {isLoading ? 'Saving...' : role ? 'Update Role' : 'Create Role'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default RoleManagement;