/**
 * SmartBreadcrumbs Component
 * Sistema de breadcrumbs contextual con metadatos
 */

import React, { useMemo } from 'react';
import { 
  Breadcrumbs as MuiBreadcrumbs, 
  Typography, 
  Link,
  Box,
  Chip,
  Menu,
  MenuItem,
  IconButton
} from '@mui/material';
import { 
  NavigateNext as NavigateNextIcon,
  Home as HomeIcon,
  ExpandMore as ExpandMoreIcon
} from '@mui/icons-material';
import { Link as RouterLink } from 'react-router-dom';
import { useNavigation } from '@navigation/hooks/useNavigation';
import { BreadcrumbItem } from '@navigation/types/navigation.types';

interface SmartBreadcrumbsProps {
  maxItems?: number;
  showHome?: boolean;
  separator?: React.ReactNode;
  className?: string;
}

/**
 * SmartBreadcrumbs Component
 * Enhanced breadcrumbs with dropdown navigation and metadata
 */
export const SmartBreadcrumbs: React.FC<SmartBreadcrumbsProps> = ({
  maxItems = 8,
  showHome = true,
  separator = <NavigateNextIcon fontSize="small" />,
  className
}) => {
  const { breadcrumbs, navigateTo } = useNavigation();
  const [anchorEl, setAnchorEl] = React.useState<null | HTMLElement>(null);
  const [dropdownItems, setDropdownItems] = React.useState<BreadcrumbItem[]>([]);
  
  // Process breadcrumbs for display
  const displayBreadcrumbs = useMemo(() => {
    let items = [...breadcrumbs];
    
    // Add home if not present and showHome is true
    if (showHome && items.length > 0 && items[0].path !== '/dashboard') {
      items.unshift({
        label: 'Dashboard',
        path: '/dashboard',
        icon: <HomeIcon sx={{ mr: 0.5, fontSize: 20 }} />
      });
    }
    
    // Handle max items with ellipsis
    if (items.length > maxItems) {
      const firstItem = items[0];
      const lastItems = items.slice(-(maxItems - 2));
      const hiddenItems = items.slice(1, items.length - (maxItems - 2));
      
      return {
        first: firstItem,
        hidden: hiddenItems,
        visible: lastItems,
        showEllipsis: true
      };
    }
    
    return {
      first: null,
      hidden: [],
      visible: items,
      showEllipsis: false
    };
  }, [breadcrumbs, maxItems, showHome]);
  
  // Handle dropdown menu
  const handleDropdownClick = (event: React.MouseEvent<HTMLElement>, items: BreadcrumbItem[]) => {
    setAnchorEl(event.currentTarget);
    setDropdownItems(items);
  };
  
  const handleDropdownClose = () => {
    setAnchorEl(null);
    setDropdownItems([]);
  };
  
  const handleDropdownItemClick = (path: string) => {
    navigateTo(path);
    handleDropdownClose();
  };
  
  // Don't render if no breadcrumbs or on dashboard
  if (breadcrumbs.length === 0 || 
      (breadcrumbs.length === 1 && breadcrumbs[0].path === '/dashboard')) {
    return null;
  }
  
  return (
    <Box className={className} sx={{ mb: 2 }}>
      <MuiBreadcrumbs 
        separator={separator}
        aria-label="breadcrumb"
        sx={{
          '& .MuiBreadcrumbs-separator': {
            mx: 0.5
          }
        }}
      >
        {/* First item if using ellipsis */}
        {displayBreadcrumbs.showEllipsis && displayBreadcrumbs.first && (
          <BreadcrumbLink item={displayBreadcrumbs.first} onClick={navigateTo} />
        )}
        
        {/* Ellipsis dropdown for hidden items */}
        {displayBreadcrumbs.showEllipsis && displayBreadcrumbs.hidden.length > 0 && (
          <>
            <IconButton
              size="small"
              onClick={(e) => handleDropdownClick(e, displayBreadcrumbs.hidden)}
              sx={{ p: 0.5 }}
            >
              <ExpandMoreIcon fontSize="small" />
            </IconButton>
            <Menu
              anchorEl={anchorEl}
              open={Boolean(anchorEl)}
              onClose={handleDropdownClose}
            >
              {dropdownItems.map((item, index) => (
                <MenuItem
                  key={index}
                  onClick={() => handleDropdownItemClick(item.path)}
                >
                  {item.icon}
                  {item.label}
                </MenuItem>
              ))}
            </Menu>
          </>
        )}
        
        {/* Visible items */}
        {displayBreadcrumbs.visible.map((item, index) => {
          const isLast = index === displayBreadcrumbs.visible.length - 1;
          
          if (isLast) {
            return (
              <Typography 
                key={item.path}
                color="text.primary" 
                sx={{ 
                  fontWeight: 600,
                  display: 'flex',
                  alignItems: 'center'
                }}
              >
                {item.icon}
                {item.label}
                {/* Show metadata chip if available */}
                {item.metadata?.entity && (
                  <Chip 
                    label={item.metadata.entity}
                    size="small" 
                    sx={{ ml: 1, height: 18 }}
                    color="primary"
                    variant="outlined"
                  />
                )}
              </Typography>
            );
          }
          
          return (
            <BreadcrumbLink 
              key={item.path} 
              item={item} 
              onClick={navigateTo} 
            />
          );
        })}
      </MuiBreadcrumbs>
    </Box>
  );
};

/**
 * BreadcrumbLink Component
 */
const BreadcrumbLink: React.FC<{
  item: BreadcrumbItem;
  onClick: (path: string) => void;
}> = ({ item, onClick }) => {
  return (
    <Link
      component={RouterLink}
      to={item.path}
      onClick={(e: React.MouseEvent) => {
        e.preventDefault();
        onClick(item.path);
      }}
      sx={{
        display: 'flex',
        alignItems: 'center',
        color: 'text.primary',
        textDecoration: 'none',
        '&:hover': {
          textDecoration: 'underline',
        },
      }}
    >
      {item.icon}
      {item.label}
    </Link>
  );
};

export default SmartBreadcrumbs;