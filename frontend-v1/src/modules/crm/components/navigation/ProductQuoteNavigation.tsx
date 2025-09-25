/**
 * Product Quote Navigation Component
 * Sprint 19 - Navigation integration for CRM module
 */

import React from 'react';
import { NavLink } from 'react-router-dom';
import {
  Package,
  DollarSign,
  FileText,
  FileSignature,
  CheckCircle,
  BarChart3,
  ShoppingCart,
  Calculator,
  FileCheck,
  Workflow
} from 'lucide-react';

interface NavigationItem {
  title: string;
  path: string;
  icon: React.ReactNode;
  badge?: number;
  children?: NavigationItem[];
}

interface ProductQuoteNavigationProps {
  basePath?: string;
  pendingApprovals?: number;
  className?: string;
}

export const ProductQuoteNavigation: React.FC<ProductQuoteNavigationProps> = ({
  basePath = '/crm/product-quote',
  pendingApprovals = 0,
  className = ''
}) => {
  const navigationItems: NavigationItem[] = [
    {
      title: 'Product Catalog',
      path: `${basePath}/catalog`,
      icon: <Package className="w-5 h-5" />,
      children: [
        {
          title: 'All Products',
          path: `${basePath}/catalog`,
          icon: <ShoppingCart className="w-4 h-4" />
        },
        {
          title: 'Categories',
          path: `${basePath}/catalog/categories`,
          icon: <Package className="w-4 h-4" />
        }
      ]
    },
    {
      title: 'Pricing',
      path: `${basePath}/pricing`,
      icon: <DollarSign className="w-5 h-5" />,
      children: [
        {
          title: 'Dashboard',
          path: `${basePath}/pricing`,
          icon: <BarChart3 className="w-4 h-4" />
        },
        {
          title: 'Pricing Rules',
          path: `${basePath}/pricing/rules`,
          icon: <Calculator className="w-4 h-4" />
        },
        {
          title: 'Price Simulator',
          path: `${basePath}/pricing/simulator`,
          icon: <DollarSign className="w-4 h-4" />
        }
      ]
    },
    {
      title: 'Quotes',
      path: `${basePath}/quotes`,
      icon: <FileText className="w-5 h-5" />,
      children: [
        {
          title: 'All Quotes',
          path: `${basePath}/quotes`,
          icon: <FileText className="w-4 h-4" />
        },
        {
          title: 'New Quote',
          path: `${basePath}/quotes/new`,
          icon: <FileSignature className="w-4 h-4" />
        },
        {
          title: 'Compare Quotes',
          path: `${basePath}/quotes/compare`,
          icon: <FileCheck className="w-4 h-4" />
        }
      ]
    },
    {
      title: 'Documents',
      path: `${basePath}/documents`,
      icon: <FileSignature className="w-5 h-5" />,
      children: [
        {
          title: 'Generate',
          path: `${basePath}/documents`,
          icon: <FileSignature className="w-4 h-4" />
        },
        {
          title: 'Templates',
          path: `${basePath}/documents/templates`,
          icon: <FileText className="w-4 h-4" />
        },
        {
          title: 'History',
          path: `${basePath}/documents/history`,
          icon: <FileCheck className="w-4 h-4" />
        },
        {
          title: 'Revenue Recognition',
          path: `${basePath}/documents/revenue`,
          icon: <DollarSign className="w-4 h-4" />
        }
      ]
    },
    {
      title: 'Approvals',
      path: `${basePath}/approvals`,
      icon: <CheckCircle className="w-5 h-5" />,
      badge: pendingApprovals,
      children: [
        {
          title: 'Dashboard',
          path: `${basePath}/approvals`,
          icon: <CheckCircle className="w-4 h-4" />,
          badge: pendingApprovals
        },
        {
          title: 'Workflows',
          path: `${basePath}/approvals/workflows`,
          icon: <Workflow className="w-4 h-4" />
        },
        {
          title: 'History',
          path: `${basePath}/approvals/history`,
          icon: <FileCheck className="w-4 h-4" />
        }
      ]
    }
  ];

  const renderNavItem = (item: NavigationItem, level = 0) => {
    const hasChildren = item.children && item.children.length > 0;

    if (hasChildren) {
      return (
        <div key={item.path} className="nav-group">
          <div className="flex items-center justify-between px-3 py-2 text-sm font-medium text-gray-600">
            <div className="flex items-center gap-2">
              {item.icon}
              <span>{item.title}</span>
            </div>
            {item.badge && item.badge > 0 && (
              <span className="px-2 py-1 text-xs text-white bg-red-500 rounded-full">
                {item.badge}
              </span>
            )}
          </div>
          <div className="ml-4">
            {item.children?.map(child => renderNavItem(child, level + 1))}
          </div>
        </div>
      );
    }

    return (
      <NavLink
        key={item.path}
        to={item.path}
        className={({ isActive }) =>
          `flex items-center gap-2 px-3 py-2 text-sm rounded-lg transition-colors ${
            level > 0 ? 'ml-4' : ''
          } ${
            isActive
              ? 'bg-blue-50 text-blue-600 font-medium'
              : 'text-gray-700 hover:bg-gray-50 hover:text-gray-900'
          }`
        }
      >
        {item.icon}
        <span className="flex-1">{item.title}</span>
        {item.badge && item.badge > 0 && (
          <span className="px-2 py-1 text-xs text-white bg-red-500 rounded-full">
            {item.badge}
          </span>
        )}
      </NavLink>
    );
  };

  return (
    <nav className={`product-quote-navigation space-y-1 ${className}`}>
      <div className="mb-4">
        <h3 className="px-3 text-xs font-semibold tracking-wider text-gray-500 uppercase">
          Product & Quote Management
        </h3>
      </div>
      {navigationItems.map(item => renderNavItem(item))}
    </nav>
  );
};

export default ProductQuoteNavigation;