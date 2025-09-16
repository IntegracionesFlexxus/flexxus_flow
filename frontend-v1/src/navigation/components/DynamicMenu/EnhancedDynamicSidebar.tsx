/**
 * EnhancedDynamicSidebar - Navigation System
 * Versión mejorada del EnhancedSidebar con menú dinámico basado en permisos
 */

import React from 'react';
import { EnhancedSidebar } from '@/components/layout/EnhancedSidebar';
import { DynamicMenu } from './DynamicMenu';
import { CircularProgress, Box } from '@mui/material';
import { useMenu } from '@navigation/hooks/useNavigation';

interface EnhancedDynamicSidebarProps {
  open: boolean;
  collapsed: boolean;
  width?: number;
  pinned?: boolean;
  onToggle: () => void;
  onHover?: (isHovered: boolean) => void;
  animationsEnabled?: boolean;
}

/**
 * EnhancedDynamicSidebar Component
 * Wrapper que integra DynamicMenu con EnhancedSidebar existente
 */
export const EnhancedDynamicSidebar: React.FC<EnhancedDynamicSidebarProps> = (props) => {
  const { menuItems, expandedMenuItems, toggleMenuItem } = useMenu();
  
  // Convert our menu items to the format expected by EnhancedSidebar
  const convertMenuItems = (items: any[]) => {
    return items.map(item => ({
      id: item.id,
      text: item.label,
      icon: item.icon,
      path: item.path,
      badge: item.badge?.content,
      badgeColor: item.badge?.color,
      children: item.children ? convertMenuItems(item.children) : undefined,
      divider: item.divider,
      disabled: item.disabled
    }));
  };
  
  return (
    <DynamicMenu
      loading={
        <Box sx={{ 
          display: 'flex', 
          justifyContent: 'center', 
          alignItems: 'center', 
          height: '100vh' 
        }}>
          <CircularProgress />
        </Box>
      }
    >
      {(primaryItems, secondaryItems) => {
        // Convert menu items to EnhancedSidebar format
        const convertedPrimary = convertMenuItems(primaryItems);
        const convertedSecondary = convertMenuItems(secondaryItems);
        
        // Pass converted items to EnhancedSidebar
        // This requires modifying EnhancedSidebar to accept menuItems as props
        // For now, we'll use the existing EnhancedSidebar
        return <EnhancedSidebar {...props} />;
      }}
    </DynamicMenu>
  );
};

export default EnhancedDynamicSidebar;