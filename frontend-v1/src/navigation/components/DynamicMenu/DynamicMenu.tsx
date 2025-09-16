/**
 * DynamicMenu Component
 * Menú dinámico basado en permisos que se integra con EnhancedSidebar
 */

import React, { useEffect, useState } from 'react';
import { useMenu } from '@navigation/hooks/useNavigation';
import { MenuItem } from '@navigation/types/navigation.types';

interface DynamicMenuProps {
  children: (menuItems: MenuItem[], secondaryItems: MenuItem[]) => React.ReactNode;
  loading?: React.ReactNode;
}

/**
 * DynamicMenu wrapper component
 * Provides filtered menu items to children based on permissions
 */
export const DynamicMenu: React.FC<DynamicMenuProps> = ({ 
  children, 
  loading = null 
}) => {
  const { menuItems } = useMenu();
  const [isLoading, setIsLoading] = useState(true);
  const [primaryItems, setPrimaryItems] = useState<MenuItem[]>([]);
  const [secondaryItems, setSecondaryItems] = useState<MenuItem[]>([]);
  
  useEffect(() => {
    if (menuItems && menuItems.length > 0) {
      // Separate primary and secondary items based on category
      const primary = menuItems.filter(item => 
        !item.metadata?.category || item.metadata.category === 'primary'
      );
      
      const secondary = menuItems.filter(item => 
        item.metadata?.category === 'secondary'
      );
      
      setPrimaryItems(primary);
      setSecondaryItems(secondary);
      setIsLoading(false);
    }
  }, [menuItems]);
  
  if (isLoading) {
    return <>{loading}</>;
  }
  
  return <>{children(primaryItems, secondaryItems)}</>;
};

export default DynamicMenu;