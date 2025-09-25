/**
 * Account Detail Page - Sprint 17
 * Detailed view with tabs for account information
 */

import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Box,
  Paper,
  Typography,
  Button,
  Grid,
  Tab,
  Tabs,
  Card,
  CardContent,
  Chip,
  Stack,
  Avatar,
  IconButton,
  Skeleton,
  Alert,
  List,
  ListItem,
  ListItemText,
  ListItemAvatar,
  Divider,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem
} from '@mui/material';
import {
  ArrowBack as ArrowBackIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Business as BusinessIcon,
  Phone as PhoneIcon,
  Email as EmailIcon,
  Language as WebsiteIcon,
  LocationOn as LocationIcon,
  People as PeopleIcon,
  AttachMoney as RevenueIcon,
  HealthAndSafety as HealthIcon,
  AccountTree as HierarchyIcon,
  Map as TerritoryIcon,
  Assignment as ActivityIcon,
  TrendingUp as OpportunityIcon
} from '@mui/icons-material';
import { useQuery } from '@tanstack/react-query';
import { accountService } from '../services';
import { useAccountHealth } from '../hooks/useAccountHealth';
import { useAccountHierarchy } from '../hooks/useAccountHierarchy';
import { useAccountTerritory } from '../hooks/useAccountTerritory';
import { formatCurrency, formatDate } from '../utils/formatters';
import { formatCUIT } from '../utils/cuitValidator';
import { AccountHealthWidget } from '../components/accounts/AccountHealthWidget';
import { AccountHierarchyView } from '../components/accounts/AccountHierarchyView';
import { TerritoryAssignment } from '../components/accounts/TerritoryAssignment';
import { ContactRolesManager } from '../components/contacts/ContactRolesManager';
import type { Account } from '../types';

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

const TabPanel: React.FC<TabPanelProps> = ({ children, value, index, ...other }) => {
  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`account-tabpanel-${index}`}
      aria-labelledby={`account-tab-${index}`}
      {...other}
    >
      {value === index && <Box sx={{ py: 3 }}>{children}</Box>}
    </div>
  );
};

const AccountDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [tabValue, setTabValue] = useState(0);
  const accountId = parseInt(id || '0');

  // Fetch account data
  const { data: account, isLoading, error } = useQuery({
    queryKey: ['account', accountId],
    queryFn: () => accountService.getAccountById(accountId),
    enabled: !!accountId
  });

  // Fetch related data
  const { healthScore, loadingHealth } = useAccountHealth(accountId);
  const { hierarchy, hierarchyMetrics, loadingHierarchy } = useAccountHierarchy(accountId);
  const { territory, loadingTerritory } = useAccountTerritory(accountId);

  const handleTabChange = (_: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
  };

  const handleEdit = () => {
    navigate(`/crm/accounts/${accountId}/edit`);
  };

  const handleDelete = async () => {
    if (window.confirm('Are you sure you want to delete this account?')) {
      await accountService.deleteAccount(accountId);
      navigate('/crm/accounts');
    }
  };

  if (isLoading) {
    return (
      <Box sx={{ p: 3 }}>
        <Skeleton variant="rectangular" height={200} sx={{ mb: 2 }} />
        <Skeleton variant="rectangular" height={400} />
      </Box>
    );
  }

  if (error || !account) {
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity="error">
          {error ? 'Error loading account' : 'Account not found'}
        </Alert>
        <Button
          startIcon={<ArrowBackIcon />}
          onClick={() => navigate('/crm/accounts')}
          sx={{ mt: 2 }}
        >
          Back to Accounts
        </Button>
      </Box>
    );
  }

  const getTypeColor = (type: string) => {
    const colors: Record<string, any> = {
      customer: 'success',
      prospect: 'primary',
      partner: 'secondary',
      vendor: 'info'
    };
    return colors[type] || 'default';
  };

  return (
    <Box sx={{ p: 3 }}>
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <IconButton onClick={() => navigate('/crm/accounts')}>
            <ArrowBackIcon />
          </IconButton>
          <Box>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 1 }}>
              <Avatar sx={{ width: 48, height: 48, bgcolor: 'primary.main' }}>
                {account.name[0]}
              </Avatar>
              <Box>
                <Typography variant="h4" fontWeight="bold">
                  {account.name}
                </Typography>
                <Stack direction="row" spacing={1} alignItems="center">
                  <Chip
                    label={account.type}
                    size="small"
                    color={getTypeColor(account.type)}
                  />
                  {healthScore && (
                    <Chip
                      label={`Health: ${healthScore.overall_grade}`}
                      size="small"
                      sx={{
                        backgroundColor: healthScore.overall_grade === 'A' ? '#22c55e' :
                                       healthScore.overall_grade === 'B' ? '#84cc16' :
                                       healthScore.overall_grade === 'C' ? '#eab308' :
                                       healthScore.overall_grade === 'D' ? '#f97316' :
                                       '#ef4444',
                        color: 'white',
                        fontWeight: 'bold'
                      }}
                    />
                  )}
                  {territory && (
                    <Chip
                      label={territory.name}
                      size="small"
                      variant="outlined"
                      color="primary"
                    />
                  )}
                </Stack>
              </Box>
            </Box>
          </Box>
        </Box>

        <Stack direction="row" spacing={1}>
          <Button
            variant="outlined"
            startIcon={<EditIcon />}
            onClick={handleEdit}
          >
            Edit
          </Button>
          <Button
            variant="outlined"
            color="error"
            startIcon={<DeleteIcon />}
            onClick={handleDelete}
          >
            Delete
          </Button>
        </Stack>
      </Box>

      {/* Quick Stats */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid item xs={12} md={3}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <RevenueIcon sx={{ color: 'success.main' }} />
                <Box>
                  <Typography variant="caption" color="textSecondary">
                    Annual Revenue
                  </Typography>
                  <Typography variant="h6" fontWeight="bold">
                    {formatCurrency(account.annual_revenue || 0)}
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={3}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <PeopleIcon sx={{ color: 'primary.main' }} />
                <Box>
                  <Typography variant="caption" color="textSecondary">
                    Employees
                  </Typography>
                  <Typography variant="h6" fontWeight="bold">
                    {account.employees_count || 'N/A'}
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={3}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <HierarchyIcon sx={{ color: 'warning.main' }} />
                <Box>
                  <Typography variant="caption" color="textSecondary">
                    Subsidiaries
                  </Typography>
                  <Typography variant="h6" fontWeight="bold">
                    {hierarchyMetrics?.total_subsidiaries || 0}
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={3}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <OpportunityIcon sx={{ color: 'info.main' }} />
                <Box>
                  <Typography variant="caption" color="textSecondary">
                    Open Opportunities
                  </Typography>
                  <Typography variant="h6" fontWeight="bold">
                    {hierarchyMetrics?.total_opportunities || 0}
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Tabs */}
      <Paper sx={{ width: '100%' }}>
        <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
          <Tabs value={tabValue} onChange={handleTabChange} variant="scrollable" scrollButtons="auto">
            <Tab label="Overview" icon={<BusinessIcon />} iconPosition="start" />
            <Tab label="Health Score" icon={<HealthIcon />} iconPosition="start" />
            <Tab label="Hierarchy" icon={<HierarchyIcon />} iconPosition="start" />
            <Tab label="Territory" icon={<TerritoryIcon />} iconPosition="start" />
            <Tab label="Contacts" icon={<PeopleIcon />} iconPosition="start" />
            <Tab label="Activities" icon={<ActivityIcon />} iconPosition="start" />
          </Tabs>
        </Box>

        {/* Overview Tab */}
        <TabPanel value={tabValue} index={0}>
          <Grid container spacing={3}>
            <Grid item xs={12} md={6}>
              <Typography variant="h6" gutterBottom>
                Basic Information
              </Typography>
              <Paper sx={{ p: 2 }}>
                <Stack spacing={2}>
                  <Box>
                    <Typography variant="caption" color="textSecondary">
                      CUIT
                    </Typography>
                    <Typography variant="body1">
                      {account.cuit ? formatCUIT(account.cuit) : 'Not provided'}
                    </Typography>
                  </Box>

                  <Box>
                    <Typography variant="caption" color="textSecondary">
                      Website
                    </Typography>
                    <Typography variant="body1">
                      {account.website ? (
                        <a href={account.website} target="_blank" rel="noopener noreferrer">
                          {account.website}
                        </a>
                      ) : 'Not provided'}
                    </Typography>
                  </Box>

                  <Box>
                    <Typography variant="caption" color="textSecondary">
                      Phone
                    </Typography>
                    <Typography variant="body1">
                      {account.phone || 'Not provided'}
                    </Typography>
                  </Box>

                  <Box>
                    <Typography variant="caption" color="textSecondary">
                      Email
                    </Typography>
                    <Typography variant="body1">
                      {account.email || 'Not provided'}
                    </Typography>
                  </Box>

                  <Box>
                    <Typography variant="caption" color="textSecondary">
                      Industry
                    </Typography>
                    <Typography variant="body1">
                      {account.industry_id || 'Not specified'}
                    </Typography>
                  </Box>
                </Stack>
              </Paper>
            </Grid>

            <Grid item xs={12} md={6}>
              <Typography variant="h6" gutterBottom>
                Address Information
              </Typography>
              <Paper sx={{ p: 2 }}>
                <Stack spacing={2}>
                  <Box>
                    <Typography variant="subtitle2" fontWeight="bold">
                      Billing Address
                    </Typography>
                    <Typography variant="body2">
                      {account.billing_street || ''}<br />
                      {[
                        account.billing_city,
                        account.billing_state,
                        account.billing_postal_code
                      ].filter(Boolean).join(', ')}<br />
                      {account.billing_country || ''}
                    </Typography>
                  </Box>

                  <Divider />

                  <Box>
                    <Typography variant="subtitle2" fontWeight="bold">
                      Shipping Address
                    </Typography>
                    <Typography variant="body2">
                      {account.shipping_street || ''}<br />
                      {[
                        account.shipping_city,
                        account.shipping_state,
                        account.shipping_postal_code
                      ].filter(Boolean).join(', ')}<br />
                      {account.shipping_country || ''}
                    </Typography>
                  </Box>
                </Stack>
              </Paper>
            </Grid>

            <Grid item xs={12}>
              <Typography variant="h6" gutterBottom>
                Description
              </Typography>
              <Paper sx={{ p: 2 }}>
                <Typography variant="body1">
                  {account.description || 'No description provided'}
                </Typography>
              </Paper>
            </Grid>
          </Grid>
        </TabPanel>

        {/* Health Score Tab */}
        <TabPanel value={tabValue} index={1}>
          <Grid container spacing={3}>
            <Grid item xs={12} md={6}>
              <AccountHealthWidget
                accountId={accountId}
                compact={false}
                showDetails={true}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <Paper sx={{ p: 2 }}>
                <Typography variant="h6" gutterBottom>
                  Health History
                </Typography>
                <Typography variant="body2" color="textSecondary">
                  Health tracking history will be displayed here
                </Typography>
              </Paper>
            </Grid>
          </Grid>
        </TabPanel>

        {/* Hierarchy Tab */}
        <TabPanel value={tabValue} index={2}>
          <AccountHierarchyView accountId={accountId} />
        </TabPanel>

        {/* Territory Tab */}
        <TabPanel value={tabValue} index={3}>
          <TerritoryAssignment accountId={accountId} />
        </TabPanel>

        {/* Contacts Tab */}
        <TabPanel value={tabValue} index={4}>
          <ContactRolesManager accountId={accountId} />
        </TabPanel>

        {/* Activities Tab */}
        <TabPanel value={tabValue} index={5}>
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>
              Recent Activities
            </Typography>
            <Typography variant="body2" color="textSecondary">
              Activity timeline will be displayed here
            </Typography>
          </Paper>
        </TabPanel>
      </Paper>
    </Box>
  );
};

export default AccountDetailPage;