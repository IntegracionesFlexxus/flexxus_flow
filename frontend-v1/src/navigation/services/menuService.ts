/**
 * Menu Service
 * Generación dinámica de menús basada en permisos
 */

import { MenuItem } from '@navigation/types/navigation.types';
import { checkPermission } from '@navigation/stores/permissionStore';
import { 
  Dashboard as DashboardIcon,
  Message as MessageIcon,
  People as PeopleIcon,
  AccountTree as WorkflowIcon,
  Analytics as AnalyticsIcon,
  Business as BusinessIcon,
  Settings as SettingsIcon,
  Security as SecurityIcon,
  Group as GroupIcon,
  Flag as FlagIcon,
  Support as SupportIcon,
  Help as HelpIcon
} from '@mui/icons-material';

class MenuService {
  private static instance: MenuService;
  
  private constructor() {}
  
  static getInstance(): MenuService {
    if (!MenuService.instance) {
      MenuService.instance = new MenuService();
    }
    return MenuService.instance;
  }
  
  /**
   * Get complete menu structure
   */
  getMenuItems(): MenuItem[] {
    const menuConfig = this.getMenuConfig();
    return this.filterAndProcessMenu(menuConfig);
  }
  
  /**
   * Get menu configuration
   * This defines all possible menu items
   */
  private getMenuConfig(): MenuItem[] {
    return [
      {
        id: 'dashboard',
        label: 'Dashboard',
        path: '/dashboard',
        icon: "icon",
        permission: 'dashboard.view',
        metadata: {
          module: 'core',
          priority: 1
        }
      },
      {
        id: 'omni',
        label: 'Omnicanalidad',
        path: '/omni',
        icon: "icon",
        permission: 'omni.access',
        metadata: {
          module: 'omni',
          priority: 2
        },
        children: [
          {
            id: 'omni-whatsapp',
            label: 'WhatsApp',
            path: '/omni/whatsapp',
            permission: 'omni.whatsapp.view'
          },
          {
            id: 'omni-email',
            label: 'Email',
            path: '/omni/email',
            permission: 'omni.email.view'
          },
          {
            id: 'omni-chat',
            label: 'Chat Web',
            path: '/omni/chat',
            permission: 'omni.chat.view'
          }
        ]
      },
      {
        id: 'crm',
        label: 'CRM',
        path: '/crm',
        icon: "icon",
        permission: 'crm.access',
        metadata: {
          module: 'crm',
          priority: 3
        },
        children: [
          {
            id: 'crm-contacts',
            label: 'Contactos',
            path: '/crm/contacts',
            permission: 'crm.contacts.view'
          },
          {
            id: 'crm-companies',
            label: 'Empresas',
            path: '/crm/companies',
            permission: 'crm.companies.view'
          },
          {
            id: 'crm-deals',
            label: 'Oportunidades',
            path: '/crm/deals',
            permission: 'crm.deals.view'
          }
        ]
      },
      {
        id: 'workflow',
        label: 'Workflows',
        path: '/workflow',
        icon: "icon",
        permission: 'workflow.access',
        metadata: {
          module: 'workflow',
          priority: 4
        },
        children: [
          {
            id: 'workflow-list',
            label: 'Lista',
            path: '/workflow/list',
            permission: 'workflow.list.view'
          },
          {
            id: 'workflow-builder',
            label: 'Constructor',
            path: '/workflow/builder',
            permission: 'workflow.builder.access'
          },
          {
            id: 'workflow-templates',
            label: 'Plantillas',
            path: '/workflow/templates',
            permission: 'workflow.templates.view'
          }
        ]
      },
      {
        id: 'analytics',
        label: 'Analytics',
        path: '/analytics',
        icon: "icon",
        permission: 'analytics.view',
        metadata: {
          module: 'analytics',
          priority: 5
        }
      },
      {
        id: 'divider-1',
        label: '',
        path: '',
        divider: true,
        metadata: {
          priority: 10
        }
      },
      {
        id: 'admin',
        label: 'Administración',
        path: '/admin',
        icon: "icon",
        permission: 'admin.access',
        metadata: {
          module: 'admin',
          category: 'admin',
          priority: 11
        },
        children: [
          {
            id: 'admin-users',
            label: 'Usuarios',
            path: '/users',
            icon: "icon",
            permission: 'admin.users.view'
          },
          {
            id: 'admin-roles',
            label: 'Roles',
            path: '/roles',
            icon: "icon",
            permission: '*'
          },
          {
            id: 'admin-companies',
            label: 'Empresas',
            path: '/companies',
            icon: "icon",
            permission: 'admin.companies.view'
          },
          {
            id: 'admin-features',
            label: 'Feature Flags',
            path: '/feature-flags',
            icon: "icon",
            permission: 'admin.features.view'
          }
        ]
      },
      {
        id: 'divider-2',
        label: '',
        path: '',
        divider: true,
        metadata: {
          priority: 20
        }
      },
      {
        id: 'settings',
        label: 'Configuración',
        path: '/settings',
        icon: "icon",
        metadata: {
          module: 'settings',
          category: 'secondary',
          priority: 21
        }
      },
      {
        id: 'support',
        label: 'Soporte',
        path: '/support',
        icon: "icon",
        metadata: {
          module: 'support',
          category: 'secondary',
          priority: 22
        }
      },
      {
        id: 'help',
        label: 'Ayuda',
        path: '/help',
        icon: "icon",
        metadata: {
          module: 'help',
          category: 'secondary',
          priority: 23
        }
      }
    ];
  }
  
  /**
   * Filter menu items by permissions and process
   */
  private filterAndProcessMenu(items: MenuItem[]): MenuItem[] {
    return items
      .filter(item => {
        // Keep dividers
        if (item.divider) return true;
        
        // Check permission if defined
        if (item.permission) {
          return checkPermission(item.permission);
        }
        
        // If no permission required, include it
        return true;
      })
      .map(item => {
        // Process children recursively
        if (item.children) {
          const filteredChildren = this.filterAndProcessMenu(item.children);
          
          // If no children are accessible, hide parent
          if (filteredChildren.length === 0 && item.permission) {
            return null;
          }
          
          return {
            ...item,
            children: filteredChildren
          };
        }
        
        return item;
      })
      .filter(Boolean) as MenuItem[]; // Remove nulls
  }
  
  /**
   * Get menu items for specific category
   */
  getMenuByCategory(category: string): MenuItem[] {
    const allItems = this.getMenuItems();
    return allItems.filter(item => 
      item.metadata?.category === category
    );
  }
  
  /**
   * Get menu items for specific module
   */
  getMenuByModule(module: string): MenuItem[] {
    const allItems = this.getMenuItems();
    return allItems.filter(item => 
      item.metadata?.module === module
    );
  }
  
  /**
   * Sort menu items by priority
   */
  sortMenuByPriority(items: MenuItem[]): MenuItem[] {
    return [...items].sort((a, b) => {
      const priorityA = a.metadata?.priority ?? 999;
      const priorityB = b.metadata?.priority ?? 999;
      return priorityA - priorityB;
    });
  }
  
  /**
   * Add dynamic badges to menu items
   */
  async addDynamicBadges(items: MenuItem[]): Promise<MenuItem[]> {
    // This would fetch badge data from backend
    // For now, return items as-is
    // In real implementation:
    // - Fetch notification counts
    // - Fetch pending items
    // - Update badges accordingly
    
    return items.map(item => {
      // Example: Add badge to omni menu
      if (item.id === 'omni') {
        return {
          ...item,
          badge: {
            content: 5,
            color: 'error' as const
          }
        };
      }
      
      // Example: Add "New" badge to CRM
      if (item.id === 'crm') {
        return {
          ...item,
          badge: {
            content: 'New',
            color: 'info' as const
          }
        };
      }
      
      return item;
    });
  }
  
  /**
   * Search menu items
   */
  searchMenuItems(query: string, items?: MenuItem[]): MenuItem[] {
    const menuItems = items || this.getMenuItems();
    const results: MenuItem[] = [];
    const lowerQuery = query.toLowerCase();
    
    const searchRecursive = (items: MenuItem[]) => {
      items.forEach(item => {
        if (item.divider) return;
        
        if (item.label.toLowerCase().includes(lowerQuery)) {
          results.push(item);
        }
        
        if (item.children) {
          searchRecursive(item.children);
        }
      });
    };
    
    searchRecursive(menuItems);
    return results;
  }
}

// Export singleton instance
export const menuService = MenuService.getInstance();