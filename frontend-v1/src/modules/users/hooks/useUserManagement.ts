/**
 * useUserManagement Hook - Sprint 3
 * Hook personalizado para lógica de gestión de usuarios
 * Principio SRP: Separación de lógica de negocio del componente
 */

import { useState, useCallback, useMemo } from 'react';
import type { User } from '@modules/users/types';

interface UseUserManagementReturn {
  selectedUsers: Set<string>;
  toggleUserSelection: (userId: string) => void;
  selectAllUsers: (users: User[]) => void;
  clearSelection: () => void;
  isUserSelected: (userId: string) => boolean;
  selectedCount: number;
  hasSelection: boolean;
  getSelectedUsers: (users: User[]) => User[];
}

/**
 * Hook para gestión de selección de usuarios
 * Clean Code: Lógica extraída y reutilizable
 */
export const useUserManagement = (): UseUserManagementReturn => {
  const [selectedUsers, setSelectedUsers] = useState<Set<string>>(new Set());

  /**
   * Alternar selección de un usuario
   */
  const toggleUserSelection = useCallback((userId: string) => {
    setSelectedUsers(prev => {
      const newSet = new Set(prev);
      if (newSet.has(userId)) {
        newSet.delete(userId);
      } else {
        newSet.add(userId);
      }
      return newSet;
    });
  }, []);

  /**
   * Seleccionar todos los usuarios
   */
  const selectAllUsers = useCallback((users: User[]) => {
    setSelectedUsers(new Set(users.map(user => user.id)));
  }, []);

  /**
   * Limpiar selección
   */
  const clearSelection = useCallback(() => {
    setSelectedUsers(new Set());
  }, []);

  /**
   * Verificar si un usuario está seleccionado
   */
  const isUserSelected = useCallback((userId: string) => {
    return selectedUsers.has(userId);
  }, [selectedUsers]);

  /**
   * Obtener usuarios seleccionados
   */
  const getSelectedUsers = useCallback((users: User[]) => {
    return users.filter(user => selectedUsers.has(user.id));
  }, [selectedUsers]);

  // Valores computados
  const selectedCount = selectedUsers.size;
  const hasSelection = selectedCount > 0;

  return {
    selectedUsers,
    toggleUserSelection,
    selectAllUsers,
    clearSelection,
    isUserSelected,
    selectedCount,
    hasSelection,
    getSelectedUsers
  };
};