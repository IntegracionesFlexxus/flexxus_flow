/**
 * TabNavigation Component
 * Sistema de navegación por tabs con persistencia
 */

import React, { useState } from 'react';
import {
  Box,
  Tabs,
  Tab,
  IconButton,
  Menu,
  MenuItem,
  Tooltip,
  Badge,
  useTheme
} from '@mui/material';
import {
  Close as CloseIcon,
  MoreVert as MoreIcon,
  Home as HomeIcon
} from '@mui/icons-material';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import { useNavigation } from '@navigation/hooks/useNavigation';
import { NavigationTab } from '@navigation/types/navigation.types';

interface TabNavigationProps {
  maxTabs?: number;
  showHomeTab?: boolean;
  onTabChange?: (path: string) => void;
}

/**
 * TabNavigation Component
 */
export const TabNavigation: React.FC<TabNavigationProps> = ({
  maxTabs = 10,
  showHomeTab = true,
  onTabChange
}) => {
  const theme = useTheme();
  const { 
    tabs, 
    activeTab, 
    navigateTo, 
    closeTab, 
    closeAllTabs,
    setActiveTab,
    reorderTabs
  } = useNavigation();
  
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [contextMenuTab, setContextMenuTab] = useState<NavigationTab | null>(null);
  
  // Handle tab click
  const handleTabClick = (tab: NavigationTab) => {
    setActiveTab(tab.id);
    navigateTo(tab.path);
    onTabChange?.(tab.path);
  };
  
  // Handle tab close
  const handleTabClose = async (e: React.MouseEvent, tabId: string) => {
    e.stopPropagation();
    await closeTab(tabId);
  };
  
  // Handle context menu
  const handleContextMenu = (e: React.MouseEvent, tab: NavigationTab) => {
    e.preventDefault();
    setAnchorEl(e.currentTarget);
    setContextMenuTab(tab);
  };
  
  const handleContextMenuClose = () => {
    setAnchorEl(null);
    setContextMenuTab(null);
  };
  
  // Handle drag end
  const handleDragEnd = (result: any) => {
    if (!result.destination) return;
    
    const items = Array.from(tabs);
    const [reorderedItem] = items.splice(result.source.index, 1);
    items.splice(result.destination.index, 0, reorderedItem);
    
    reorderTabs(items);
  };
  
  // Context menu actions
  const handleCloseOthers = async () => {
    if (contextMenuTab) {
      const otherTabs = tabs.filter(t => t.id !== contextMenuTab.id);
      for (const tab of otherTabs) {
        await closeTab(tab.id);
      }
    }
    handleContextMenuClose();
  };
  
  const handleCloseToRight = async () => {
    if (contextMenuTab) {
      const tabIndex = tabs.findIndex(t => t.id === contextMenuTab.id);
      const rightTabs = tabs.slice(tabIndex + 1);
      for (const tab of rightTabs) {
        await closeTab(tab.id);
      }
    }
    handleContextMenuClose();
  };
  
  const handleCloseAll = async () => {
    await closeAllTabs();
    handleContextMenuClose();
  };
  
  // Don't render if no tabs
  if (tabs.length === 0 && !showHomeTab) {
    return null;
  }
  
  return (
    <Box
      sx={{
        borderBottom: 1,
        borderColor: 'divider',
        backgroundColor: theme.palette.background.paper,
        display: 'flex',
        alignItems: 'center',
        px: 1
      }}
    >
      <DragDropContext onDragEnd={handleDragEnd}>
        <Droppable droppableId="tabs" direction="horizontal">
          {(provided) => (
            <Tabs
              ref={provided.innerRef}
              {...provided.droppableProps}
              value={activeTab?.id || false}
              variant="scrollable"
              scrollButtons="auto"
              sx={{
                flex: 1,
                '& .MuiTabs-indicator': {
                  height: 3
                }
              }}
            >
              {/* Home tab */}
              {showHomeTab && (
                <Tab
                  value="home"
                  label={
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                      <HomeIcon fontSize="small" />
                      <span>Dashboard</span>
                    </Box>
                  }
                  onClick={() => {
                    navigateTo('/dashboard');
                    onTabChange?.('/dashboard');
                  }}
                  sx={{
                    minHeight: 40,
                    textTransform: 'none'
                  }}
                />
              )}
              
              {/* Dynamic tabs */}
              {tabs.map((tab, index) => (
                <Draggable key={tab.id} draggableId={tab.id} index={index}>
                  {(provided, snapshot) => (
                    <div
                      ref={provided.innerRef}
                      {...provided.draggableProps}
                      {...provided.dragHandleProps}
                    >
                      <Tab
                        value={tab.id}
                        label={
                          <TabLabel
                            tab={tab}
                            onClose={(e) => handleTabClose(e, tab.id)}
                            onContextMenu={(e) => handleContextMenu(e, tab)}
                            isDragging={snapshot.isDragging}
                          />
                        }
                        onClick={() => handleTabClick(tab)}
                        sx={{
                          minHeight: 40,
                          textTransform: 'none',
                          opacity: snapshot.isDragging ? 0.5 : 1
                        }}
                      />
                    </div>
                  )}
                </Draggable>
              ))}
              {provided.placeholder}
            </Tabs>
          )}
        </Droppable>
      </DragDropContext>
      
      {/* Tab menu button */}
      {tabs.length > 0 && (
        <Tooltip title="Tab options">
          <IconButton
            size="small"
            onClick={(e) => setAnchorEl(e.currentTarget)}
          >
            <MoreIcon fontSize="small" />
          </IconButton>
        </Tooltip>
      )}
      
      {/* Context menu */}
      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleContextMenuClose}
      >
        {contextMenuTab && (
          <>
            <MenuItem onClick={() => {
              closeTab(contextMenuTab.id);
              handleContextMenuClose();
            }}>
              Close Tab
            </MenuItem>
            <MenuItem onClick={handleCloseOthers}>
              Close Other Tabs
            </MenuItem>
            <MenuItem onClick={handleCloseToRight}>
              Close Tabs to the Right
            </MenuItem>
          </>
        )}
        <MenuItem onClick={handleCloseAll}>
          Close All Tabs
        </MenuItem>
      </Menu>
    </Box>
  );
};

/**
 * TabLabel Component
 */
const TabLabel: React.FC<{
  tab: NavigationTab;
  onClose: (e: React.MouseEvent) => void;
  onContextMenu: (e: React.MouseEvent) => void;
  isDragging: boolean;
}> = ({ tab, onClose, onContextMenu, isDragging }) => {
  return (
    <Box
      sx={{
        display: 'flex',
        alignItems: 'center',
        gap: 0.5,
        pr: tab.closable ? 0 : 1
      }}
      onContextMenu={onContextMenu}
    >
      {tab.icon && <Box sx={{ display: 'flex', fontSize: 18 }}>{tab.icon}</Box>}
      
      {tab.dirty ? (
        <Badge
          variant="dot"
          color="warning"
          sx={{
            '& .MuiBadge-badge': {
              right: -3,
              top: 3
            }
          }}
        >
          <span>{tab.label}</span>
        </Badge>
      ) : (
        <span>{tab.label}</span>
      )}
      
      {tab.closable && !isDragging && (
        <IconButton
          size="small"
          onClick={onClose}
          sx={{
            ml: 0.5,
            p: 0.25,
            '&:hover': {
              backgroundColor: 'action.hover'
            }
          }}
        >
          <CloseIcon sx={{ fontSize: 14 }} />
        </IconButton>
      )}
    </Box>
  );
};

export default TabNavigation;