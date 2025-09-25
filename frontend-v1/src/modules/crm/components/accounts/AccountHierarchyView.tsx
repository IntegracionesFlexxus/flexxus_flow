/**
 * Account Hierarchy View - Sprint 17
 * Simple hierarchy view component for account relationships
 */

import React, { useState } from 'react';
import {
  Box,
  Paper,
  Typography,
  Button,
  Card,
  CardContent,
  Stack,
  Chip,
  Grid,
  Alert,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Collapse,
  IconButton
} from '@mui/material';
import {
  ExpandMore as ExpandMoreIcon,
  ChevronRight as ChevronRightIcon,
  Add as AddIcon,
  Business as BusinessIcon,
  AccountTree as HierarchyIcon
} from '@mui/icons-material';
import { useAccountHierarchy } from '../../hooks/useAccountHierarchy';
import type { HierarchyNode } from '../../types';

interface AccountHierarchyViewProps {
  accountId: number;
}

export const AccountHierarchyView: React.FC<AccountHierarchyViewProps> = ({ accountId }) => {
  const { hierarchy, hierarchyMetrics, loadingHierarchy } = useAccountHierarchy(accountId);
  const [expandedNodes, setExpandedNodes] = useState<Set<number>>(new Set([accountId]));

  const toggleNode = (nodeId: number) => {
    const newExpanded = new Set(expandedNodes);
    if (newExpanded.has(nodeId)) {
      newExpanded.delete(nodeId);
    } else {
      newExpanded.add(nodeId);
    }
    setExpandedNodes(newExpanded);
  };

  const renderNode = (node: HierarchyNode, depth: number = 0): React.ReactNode => {
    if (!node) return null;

    const hasChildren = node.children && node.children.length > 0;
    const isExpanded = expandedNodes.has(node.account_id);

    return (
      <Box key={node.account_id}>
        <ListItem
          sx={{
            pl: depth * 4,
            '&:hover': { bgcolor: 'action.hover' }
          }}
        >
          {hasChildren && (
            <IconButton
              size="small"
              onClick={() => toggleNode(node.account_id)}
              sx={{ mr: 1 }}
            >
              {isExpanded ? <ExpandMoreIcon /> : <ChevronRightIcon />}
            </IconButton>
          )}
          {!hasChildren && <Box sx={{ width: 40 }} />}

          <ListItemIcon>
            <BusinessIcon color="primary" />
          </ListItemIcon>

          <ListItemText
            primary={node.account_name}
            secondary={`Level ${node.level} ${node.children_count > 0 ? `• ${node.children_count} subsidiaries` : ''}`}
          />

          {node.health_grade && (
            <Chip
              label={node.health_grade}
              size="small"
              color={
                node.health_grade === 'A' ? 'success' :
                node.health_grade === 'B' ? 'primary' :
                node.health_grade === 'C' ? 'warning' : 'error'
              }
            />
          )}
        </ListItem>

        {hasChildren && isExpanded && (
          <Collapse in={isExpanded}>
            {node.children?.map(child => renderNode(child, depth + 1))}
          </Collapse>
        )}
      </Box>
    );
  };

  if (loadingHierarchy) {
    return (
      <Paper sx={{ p: 3 }}>
        <Typography>Loading hierarchy...</Typography>
      </Paper>
    );
  }

  return (
    <Grid container spacing={3}>
      {/* Metrics */}
      {hierarchyMetrics && (
        <Grid item xs={12}>
          <Grid container spacing={2}>
            <Grid item xs={6} md={3}>
              <Card>
                <CardContent>
                  <Typography variant="caption" color="textSecondary">
                    Total Subsidiaries
                  </Typography>
                  <Typography variant="h4" fontWeight="bold">
                    {hierarchyMetrics.total_subsidiaries || 0}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={6} md={3}>
              <Card>
                <CardContent>
                  <Typography variant="caption" color="textSecondary">
                    Combined Revenue
                  </Typography>
                  <Typography variant="h5" fontWeight="bold">
                    ${((hierarchyMetrics.total_revenue || 0) / 1000000).toFixed(1)}M
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={6} md={3}>
              <Card>
                <CardContent>
                  <Typography variant="caption" color="textSecondary">
                    Total Employees
                  </Typography>
                  <Typography variant="h4" fontWeight="bold">
                    {(hierarchyMetrics.total_employees || 0).toLocaleString()}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={6} md={3}>
              <Card>
                <CardContent>
                  <Typography variant="caption" color="textSecondary">
                    At Risk
                  </Typography>
                  <Typography variant="h4" fontWeight="bold" color="error.main">
                    {hierarchyMetrics.at_risk_subsidiaries || 0}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
          </Grid>
        </Grid>
      )}

      {/* Hierarchy View */}
      <Grid item xs={12}>
        <Paper sx={{ p: 3 }}>
          <Stack direction="row" alignItems="center" spacing={2} mb={2}>
            <HierarchyIcon color="primary" />
            <Typography variant="h6">
              Account Hierarchy
            </Typography>
            <Button
              variant="outlined"
              size="small"
              startIcon={<AddIcon />}
              sx={{ ml: 'auto' }}
            >
              Add Relationship
            </Button>
          </Stack>

          {hierarchy ? (
            <List>
              {renderNode(hierarchy)}
            </List>
          ) : (
            <Alert severity="info">
              No hierarchy relationships found for this account.
            </Alert>
          )}
        </Paper>
      </Grid>
    </Grid>
  );
};

export default AccountHierarchyView;