/**
 * Territory Assignment Component - Sprint 17
 * Manage account territory assignment
 */

import React, { useState } from 'react';
import {
  Box,
  Paper,
  Typography,
  Button,
  Grid,
  Card,
  CardContent,
  Stack,
  Chip,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  TextField,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Alert,
  LinearProgress,
  List,
  ListItem,
  ListItemText,
  ListItemAvatar,
  Avatar,
  IconButton
} from '@mui/material';
import {
  Map as TerritoryIcon,
  Assignment as AssignIcon,
  TrendingUp as PerformanceIcon,
  People as TeamIcon,
  Edit as EditIcon,
  LocationOn as LocationIcon,
  Business as IndustryIcon
} from '@mui/icons-material';
import { useAccountTerritory } from '../../hooks/useAccountTerritory';
import type { Territory } from '../../types';

interface TerritoryAssignmentProps {
  accountId: number;
}

export const TerritoryAssignment: React.FC<TerritoryAssignmentProps> = ({ accountId }) => {
  const [assignDialogOpen, setAssignDialogOpen] = useState(false);
  const [selectedTerritoryId, setSelectedTerritoryId] = useState<number | null>(null);
  const [assignmentReason, setAssignmentReason] = useState('');

  const {
    territory,
    territories,
    territoryPerformance,
    loadingTerritory,
    loadingTerritories,
    isAssigning,
    assignTerritory,
    refetchTerritory,
    getTerritoryColor,
    getTerritoryBadgeStyle,
    formatTerritoryMetrics
  } = useAccountTerritory(accountId);

  const handleAssignTerritory = async () => {
    if (!selectedTerritoryId) return;

    await assignTerritory({
      accountId,
      territoryId: selectedTerritoryId,
      reason: assignmentReason
    });

    setAssignDialogOpen(false);
    setSelectedTerritoryId(null);
    setAssignmentReason('');
    refetchTerritory();
  };

  const getTerritoryTypeIcon = (type?: string) => {
    switch (type) {
      case 'geographic':
        return <LocationIcon />;
      case 'industry':
        return <IndustryIcon />;
      default:
        return <TerritoryIcon />;
    }
  };

  if (loadingTerritory) {
    return (
      <Paper sx={{ p: 3 }}>
        <Typography>Loading territory information...</Typography>
        <LinearProgress sx={{ mt: 2 }} />
      </Paper>
    );
  }

  const metrics = territory ? formatTerritoryMetrics(territory) : null;

  return (
    <Grid container spacing={3}>
      {/* Current Territory */}
      <Grid item xs={12}>
        <Paper sx={{ p: 3 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
            <Typography variant="h6">
              Current Territory Assignment
            </Typography>
            <Button
              variant="outlined"
              startIcon={<AssignIcon />}
              onClick={() => setAssignDialogOpen(true)}
            >
              {territory ? 'Change Territory' : 'Assign Territory'}
            </Button>
          </Box>

          {territory ? (
            <Grid container spacing={3}>
              <Grid item xs={12} md={6}>
                <Card>
                  <CardContent>
                    <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 2 }}>
                      <Avatar sx={{ bgcolor: getTerritoryColor(territory.type), width: 48, height: 48 }}>
                        {getTerritoryTypeIcon(territory.type)}
                      </Avatar>
                      <Box sx={{ flexGrow: 1 }}>
                        <Typography variant="h6" gutterBottom>
                          {territory.name}
                        </Typography>
                        <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1 }}>
                          <Chip
                            label={territory.type}
                            size="small"
                            sx={getTerritoryBadgeStyle(territory)}
                          />
                          <Chip
                            label={territory.status}
                            size="small"
                            color={territory.status === 'active' ? 'success' : 'default'}
                          />
                        </Stack>
                        <Typography variant="body2" color="textSecondary">
                          Code: {territory.code}
                        </Typography>
                      </Box>
                    </Box>
                  </CardContent>
                </Card>
              </Grid>

              <Grid item xs={12} md={6}>
                <Card>
                  <CardContent>
                    <Typography variant="subtitle2" gutterBottom>
                      Territory Owner
                    </Typography>
                    {territory.owner ? (
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Avatar sx={{ width: 32, height: 32 }}>
                          {territory.owner.name[0]}
                        </Avatar>
                        <Box>
                          <Typography variant="body2">
                            {territory.owner.name}
                          </Typography>
                          <Typography variant="caption" color="textSecondary">
                            {territory.owner.email}
                          </Typography>
                        </Box>
                      </Box>
                    ) : (
                      <Typography variant="body2" color="textSecondary">
                        No owner assigned
                      </Typography>
                    )}
                  </CardContent>
                </Card>
              </Grid>
            </Grid>
          ) : (
            <Alert severity="info">
              This account is not assigned to any territory yet.
            </Alert>
          )}
        </Paper>
      </Grid>

      {/* Territory Metrics */}
      {territory && metrics && (
        <Grid item xs={12}>
          <Typography variant="h6" gutterBottom>
            Territory Performance
          </Typography>
          <Grid container spacing={2}>
            <Grid item xs={6} md={3}>
              <Card>
                <CardContent>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <BusinessIcon sx={{ color: 'primary.main' }} />
                    <Box>
                      <Typography variant="caption" color="textSecondary">
                        Accounts
                      </Typography>
                      <Typography variant="h6" fontWeight="bold">
                        {metrics.accounts}
                      </Typography>
                    </Box>
                  </Box>
                </CardContent>
              </Card>
            </Grid>

            <Grid item xs={6} md={3}>
              <Card>
                <CardContent>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <TerritoryIcon sx={{ color: 'success.main' }} />
                    <Box>
                      <Typography variant="caption" color="textSecondary">
                        Coverage
                      </Typography>
                      <Typography variant="h6" fontWeight="bold">
                        {metrics.coverage}
                      </Typography>
                    </Box>
                  </Box>
                </CardContent>
              </Card>
            </Grid>

            <Grid item xs={6} md={3}>
              <Card>
                <CardContent>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <PerformanceIcon sx={{ color: 'warning.main' }} />
                    <Box>
                      <Typography variant="caption" color="textSecondary">
                        Performance
                      </Typography>
                      <Typography variant="h6" fontWeight="bold">
                        {metrics.performance}
                      </Typography>
                    </Box>
                  </Box>
                </CardContent>
              </Card>
            </Grid>

            <Grid item xs={6} md={3}>
              <Card>
                <CardContent>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <TeamIcon sx={{ color: 'info.main' }} />
                    <Box>
                      <Typography variant="caption" color="textSecondary">
                        Revenue
                      </Typography>
                      <Typography variant="h6" fontWeight="bold">
                        ${(metrics.revenue / 1000000).toFixed(1)}M
                      </Typography>
                    </Box>
                  </Box>
                </CardContent>
              </Card>
            </Grid>
          </Grid>
        </Grid>
      )}

      {/* Coverage Rules */}
      {territory?.rules && (
        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>
              Territory Rules
            </Typography>
            <Stack spacing={2}>
              {territory.rules.countries && territory.rules.countries.length > 0 && (
                <Box>
                  <Typography variant="caption" color="textSecondary">
                    Countries
                  </Typography>
                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, mt: 0.5 }}>
                    {territory.rules.countries.map(country => (
                      <Chip key={country} label={country} size="small" />
                    ))}
                  </Box>
                </Box>
              )}

              {territory.rules.industries && territory.rules.industries.length > 0 && (
                <Box>
                  <Typography variant="caption" color="textSecondary">
                    Industries
                  </Typography>
                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, mt: 0.5 }}>
                    {territory.rules.industries.map(industry => (
                      <Chip key={industry} label={industry} size="small" />
                    ))}
                  </Box>
                </Box>
              )}

              {territory.rules.revenue_range && (
                <Box>
                  <Typography variant="caption" color="textSecondary">
                    Revenue Range
                  </Typography>
                  <Typography variant="body2">
                    ${(territory.rules.revenue_range.min / 1000000).toFixed(1)}M -
                    ${(territory.rules.revenue_range.max / 1000000).toFixed(1)}M
                  </Typography>
                </Box>
              )}
            </Stack>
          </Paper>
        </Grid>
      )}

      {/* Performance Targets */}
      {territory?.performance_targets && (
        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>
              Performance Targets
            </Typography>
            <Stack spacing={2}>
              <Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                  <Typography variant="caption" color="textSecondary">
                    Revenue Target
                  </Typography>
                  <Typography variant="caption" fontWeight="bold">
                    75%
                  </Typography>
                </Box>
                <LinearProgress
                  variant="determinate"
                  value={75}
                  sx={{ height: 6, borderRadius: 3 }}
                />
              </Box>

              <Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                  <Typography variant="caption" color="textSecondary">
                    Account Target
                  </Typography>
                  <Typography variant="caption" fontWeight="bold">
                    90%
                  </Typography>
                </Box>
                <LinearProgress
                  variant="determinate"
                  value={90}
                  sx={{ height: 6, borderRadius: 3 }}
                  color="success"
                />
              </Box>

              <Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                  <Typography variant="caption" color="textSecondary">
                    Activity Target
                  </Typography>
                  <Typography variant="caption" fontWeight="bold">
                    60%
                  </Typography>
                </Box>
                <LinearProgress
                  variant="determinate"
                  value={60}
                  sx={{ height: 6, borderRadius: 3 }}
                  color="warning"
                />
              </Box>
            </Stack>
          </Paper>
        </Grid>
      )}

      {/* Assign Territory Dialog */}
      <Dialog open={assignDialogOpen} onClose={() => setAssignDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>
          {territory ? 'Change Territory Assignment' : 'Assign to Territory'}
        </DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 2 }}>
            <FormControl fullWidth>
              <InputLabel>Select Territory</InputLabel>
              <Select
                value={selectedTerritoryId || ''}
                label="Select Territory"
                onChange={(e) => setSelectedTerritoryId(Number(e.target.value))}
              >
                {territories.map(t => (
                  <MenuItem key={t.id} value={t.id}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, width: '100%' }}>
                      <Chip
                        label={t.type}
                        size="small"
                        sx={{
                          ...getTerritoryBadgeStyle(t),
                          height: 20
                        }}
                      />
                      <Typography>{t.name}</Typography>
                      {t.owner && (
                        <Typography variant="caption" color="textSecondary" sx={{ ml: 'auto' }}>
                          {t.owner.name}
                        </Typography>
                      )}
                    </Box>
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            <TextField
              label="Reason for Assignment (Optional)"
              multiline
              rows={3}
              fullWidth
              value={assignmentReason}
              onChange={(e) => setAssignmentReason(e.target.value)}
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setAssignDialogOpen(false)}>
            Cancel
          </Button>
          <Button
            onClick={handleAssignTerritory}
            variant="contained"
            disabled={!selectedTerritoryId || isAssigning}
          >
            {isAssigning ? 'Assigning...' : 'Assign Territory'}
          </Button>
        </DialogActions>
      </Dialog>
    </Grid>
  );
};

export default TerritoryAssignment;