/**
 * Permission Store
 * Cache y gestión de permisos del usuario
 */

import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import { immer } from 'zustand/middleware/immer';
import type { PermissionState } from '@navigation/types/navigation.types';

interface PermissionStore extends PermissionState {
  // Sync actions
  setUserPermissions: (permissions: string[]) => void;
  setRolePermissions: (permissions: string[]) => void;
  calculateEffectivePermissions: () => void;
  syncPermissions: () => Promise<void>;
  
  // Check actions
  hasPermission: (permission: string) => boolean;
  hasAnyPermission: (permissions: string[]) => boolean;
  hasAllPermissions: (permissions: string[]) => boolean;
  canAccess: (resource: string, action?: string) => boolean;
  
  // Cache actions
  cachePermissionCheck: (permission: string, result: boolean) => void;
  clearCache: () => void;
  
  // Utils
  reset: () => void;
}

const initialState: PermissionState = {
  userPermissions: [],
  rolePermissions: [],
  effectivePermissions: new Set(),
  permissionMatrix: new Map(),
  lastSync: null,
  isSyncing: false
};

export const usePermissionStore = create<PermissionStore>()(
  devtools(
    immer((set, get) => ({
      ...initialState,
      
      // Sync actions
      setUserPermissions: (permissions) => set((state) => {
        state.userPermissions = permissions;
        get().calculateEffectivePermissions();
      }),
      
      setRolePermissions: (permissions) => set((state) => {
        state.rolePermissions = permissions;
        get().calculateEffectivePermissions();
      }),
      
      calculateEffectivePermissions: () => set((state) => {
        const allPermissions = new Set<string>();
        
        // Add user permissions
        state.userPermissions.forEach(p => allPermissions.add(p));
        
        // Add role permissions
        state.rolePermissions.forEach(p => allPermissions.add(p));
        
        // Add wildcard expansions
        allPermissions.forEach(permission => {
          // Handle wildcards like 'admin.*'
          if (permission.includes('*')) {
            const prefix = permission.replace('*', '');
            // This would need actual permission list to expand properly
            // For now, just keep the wildcard
          }
        });
        
        state.effectivePermissions = allPermissions;
        
        // Clear cache when permissions change
        state.permissionMatrix.clear();
      }),
      
      syncPermissions: async () => {
        set((state) => {
          state.isSyncing = true;
        });
        
        try {
          // Get permissions from authStore
          const { useAuthStore } = await import('@/shared/store/authStore');
          const authState = useAuthStore.getState();
          
          if (authState.user?.companies && authState.currentCompany) {
            const currentCompanyData = authState.user.companies.find(
              c => c.id === authState.currentCompany?.id
            );
            
            if (currentCompanyData?.permissions) {
              set((state) => {
                state.rolePermissions = currentCompanyData.permissions;
                state.lastSync = new Date();
              });
              get().calculateEffectivePermissions();
            }
          }
        } catch (error) {
          console.error('Failed to sync permissions:', error);
        } finally {
          set((state) => {
            state.isSyncing = false;
          });
        }
      },
      
      // Check actions
      hasPermission: (permission) => {
        const state = get();
        
        // Check cache first
        if (state.permissionMatrix.has(permission)) {
          return state.permissionMatrix.get(permission) || false;
        }
        
        // Check exact match
        if (state.effectivePermissions.has(permission)) {
          state.cachePermissionCheck(permission, true);
          return true;
        }
        
        // Check wildcards
        for (const effectivePermission of state.effectivePermissions) {
          if (effectivePermission.includes('*')) {
            const regex = new RegExp(
              '^' + effectivePermission.replace('.', '\\.').replace('*', '.*') + '$'
            );
            if (regex.test(permission)) {
              state.cachePermissionCheck(permission, true);
              return true;
            }
          }
        }
        
        // Check admin override
        if (state.effectivePermissions.has('admin.*') || 
            state.effectivePermissions.has('*')) {
          state.cachePermissionCheck(permission, true);
          return true;
        }
        
        state.cachePermissionCheck(permission, false);
        return false;
      },
      
      hasAnyPermission: (permissions) => {
        return permissions.some(p => get().hasPermission(p));
      },
      
      hasAllPermissions: (permissions) => {
        return permissions.every(p => get().hasPermission(p));
      },
      
      canAccess: (resource, action = 'view') => {
        const permission = `${resource}.${action}`;
        return get().hasPermission(permission);
      },
      
      // Cache actions
      cachePermissionCheck: (permission, result) => set((state) => {
        state.permissionMatrix.set(permission, result);
      }),
      
      clearCache: () => set((state) => {
        state.permissionMatrix.clear();
      }),
      
      // Utils
      reset: () => set(() => ({
        ...initialState,
        effectivePermissions: new Set(),
        permissionMatrix: new Map()
      }))
    })),
    { name: 'permission-store' }
  )
);

// Helper functions
export const checkPermission = (permission: string): boolean => {
  return usePermissionStore.getState().hasPermission(permission);
};

export const checkAnyPermission = (permissions: string[]): boolean => {
  return usePermissionStore.getState().hasAnyPermission(permissions);
};

export const checkAllPermissions = (permissions: string[]): boolean => {
  return usePermissionStore.getState().hasAllPermissions(permissions);
};

export const canAccess = (resource: string, action?: string): boolean => {
  return usePermissionStore.getState().canAccess(resource, action);
};