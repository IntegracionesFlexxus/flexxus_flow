/**
 * Accounts Page V2 - Sprint 17
 * Extended version with advanced search and health scores
 */

import React, { useState, useCallback } from 'react';
import {
  Box,
  Paper,
  Typography,
  Button,
  Grid,
  Card,
  CardContent,
  TextField,
  InputAdornment,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TablePagination,
  Chip,
  IconButton,
  Avatar,
  Stack,
  Menu,
  MenuItem,
  Checkbox,
  Tooltip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Collapse
} from '@mui/material';
import {
  Add as AddIcon,
  Search as SearchIcon,
  Business as BusinessIcon,
  MoreVert as MoreIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Visibility as ViewIcon,
  Star as StarIcon,
  StarBorder as StarBorderIcon,
  FilterList as FilterIcon,
  HealthAndSafety as HealthIcon,
  AccountTree as HierarchyIcon,
  Map as TerritoryIcon,
  Calculate as CalculateIcon,
  KeyboardArrowDown as ArrowDownIcon,
  KeyboardArrowUp as ArrowUpIcon
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { useAccounts } from '../hooks/useAccounts';
import { useAdvancedSearch } from '../hooks/useAdvancedSearch';
import { useAccountHealth } from '../hooks/useAccountHealth';
import { useCRMStore } from '../stores';
import { formatCurrency, formatDate } from '../utils/formatters';
import { formatCUIT } from '../utils/cuitValidator';
import { AccountHealthWidget } from '../components/accounts/AccountHealthWidget';
import { SearchFilters } from '../components/search/SearchFilters';
import type { AccountType, AccountRating, Account, BulkHealthCalculationRequest } from '../types';

const AccountsPageV2: React.FC = () => {
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState('');
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [selectedAccountId, setSelectedAccountId] = useState<number | null>(null);
  const [selectedAccounts, setSelectedAccounts] = useState<number[]>([]);
  const [showFilters, setShowFilters] = useState(false);
  const [expandedRows, setExpandedRows] = useState<number[]>([]);
  const [bulkActionDialog, setBulkActionDialog] = useState<{
    open: boolean;
    action: string;
  }>({ open: false, action: '' });

  const {
    accounts,
    total,
    loading,
    filters,
    applyFilters,
    deleteAccount,
    updateAccountRating,
    validateCUIT
  } = useAccounts();

  const {
    searchResults,
    isSearching,
    searchFilters,
    updateFilters,
    clearSearch,
    search
  } = useAdvancedSearch();

  const {
    bulkCalculateHealth,
    isCalculating,
    getHealthGradeColor
  } = useAccountHealth();

  const { setSelectedAccount, favoriteAccounts, toggleFavoriteAccount } = useCRMStore();

  const handleSearch = useCallback((value: string) => {
    setSearchTerm(value);
    if (value.length > 2) {
      search();
    } else {
      applyFilters({ ...filters, search: value });
    }
  }, [filters, applyFilters, search]);

  const handleMenuOpen = (event: React.MouseEvent<HTMLElement>, accountId: number) => {
    setAnchorEl(event.currentTarget);
    setSelectedAccountId(accountId);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
    setSelectedAccountId(null);
  };

  const handleDeleteAccount = () => {
    if (selectedAccountId) {
      deleteAccount(selectedAccountId);
    }
    handleMenuClose();
  };

  const handleViewDetails = (accountId: number) => {
    navigate(`/crm/accounts/${accountId}`);
  };

  const handleToggleRow = (accountId: number) => {
    setExpandedRows(prev =>
      prev.includes(accountId)
        ? prev.filter(id => id !== accountId)
        : [...prev, accountId]
    );
  };

  const handleSelectAll = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.checked) {
      setSelectedAccounts(accounts.map(a => a.id));
    } else {
      setSelectedAccounts([]);
    }
  };

  const handleSelectAccount = (accountId: number) => {
    setSelectedAccounts(prev =>
      prev.includes(accountId)
        ? prev.filter(id => id !== accountId)
        : [...prev, accountId]
    );
  };

  const handleBulkAction = (action: string) => {
    setBulkActionDialog({ open: true, action });
  };

  const executeBulkAction = async () => {
    const { action } = bulkActionDialog;

    switch (action) {
      case 'calculate-health':
        const request: BulkHealthCalculationRequest = {
          account_ids: selectedAccounts,
          force_recalculation: true
        };
        await bulkCalculateHealth(request);
        break;
      case 'assign-territory':
        // Navigate to territory assignment
        navigate('/crm/territories/assign', { state: { accountIds: selectedAccounts } });
        break;
      case 'export':
        // Handle export
        break;
    }

    setBulkActionDialog({ open: false, action: '' });
    setSelectedAccounts([]);
  };

  const getTypeColor = (type: AccountType) => {
    const colors = {
      customer: 'success',
      prospect: 'primary',
      partner: 'secondary',
      competitor: 'warning',
      vendor: 'info',
      other: 'default'
    };
    return colors[type] || 'default';
  };

  const getRatingIcon = (rating: AccountRating) => {
    const colors = {
      hot: '#f44336',
      warm: '#ff9800',
      cold: '#2196f3'
    };
    return (
      <Box sx={{ color: colors[rating] || '#9e9e9e' }}>
        {rating === 'hot' ? '🔥' : rating === 'warm' ? '☀️' : '❄️'}
      </Box>
    );
  };

  // Metrics
  const metrics = {
    total: total,
    customers: accounts.filter(a => a.type === 'customer').length,
    prospects: accounts.filter(a => a.type === 'prospect').length,
    totalRevenue: accounts.reduce((sum, a) => sum + (a.annual_revenue || 0), 0),
    healthyAccounts: accounts.filter(a => {
      // This would come from health data
      return true;
    }).length
  };

  const displayAccounts = searchResults?.results
    ? searchResults.results.filter(r => r.entity_type === 'account').map(r => r.data as Account)
    : accounts;

  return (
    <Box sx={{ p: 3 }}>
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Box>
          <Typography variant="h4" fontWeight="bold" gutterBottom>
            Accounts
          </Typography>
          <Typography variant="body1" color="textSecondary">
            Manage your accounts with advanced health tracking and hierarchy
          </Typography>
        </Box>
        <Stack direction="row" spacing={1}>
          <Button
            variant="outlined"
            startIcon={<FilterIcon />}
            onClick={() => setShowFilters(!showFilters)}
            color={showFilters ? 'primary' : 'inherit'}
          >
            Filters
          </Button>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            sx={{
              background: 'linear-gradient(45deg, #2196F3 30%, #21CBF3 90%)',
              color: 'white'
            }}
            onClick={() => navigate('/crm/accounts/new')}
          >
            New Account
          </Button>
        </Stack>
      </Box>

      {/* Metrics Cards */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={6} md={2.4}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Box>
                  <Typography color="textSecondary" gutterBottom variant="body2">
                    Total Accounts
                  </Typography>
                  <Typography variant="h4" fontWeight="bold">
                    {metrics.total}
                  </Typography>
                </Box>
                <BusinessIcon sx={{ fontSize: 40, color: 'primary.main', opacity: 0.3 }} />
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={2.4}>
          <Card>
            <CardContent>
              <Typography color="textSecondary" gutterBottom variant="body2">
                Customers
              </Typography>
              <Typography variant="h4" fontWeight="bold" color="success.main">
                {metrics.customers}
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={2.4}>
          <Card>
            <CardContent>
              <Typography color="textSecondary" gutterBottom variant="body2">
                Prospects
              </Typography>
              <Typography variant="h4" fontWeight="bold" color="primary.main">
                {metrics.prospects}
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={2.4}>
          <Card>
            <CardContent>
              <Typography color="textSecondary" gutterBottom variant="body2">
                Total Revenue
              </Typography>
              <Typography variant="h5" fontWeight="bold">
                {formatCurrency(metrics.totalRevenue)}
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={2.4}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <HealthIcon sx={{ color: 'success.main' }} />
                <Box>
                  <Typography color="textSecondary" gutterBottom variant="body2">
                    Healthy
                  </Typography>
                  <Typography variant="h4" fontWeight="bold" color="success.main">
                    {metrics.healthyAccounts}
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Search and Filters */}
      <Stack spacing={2}>
        <Paper sx={{ p: 2 }}>
          <TextField
            fullWidth
            variant="outlined"
            placeholder="Search accounts by name, CUIT, website, or use advanced search..."
            value={searchTerm}
            onChange={(e) => handleSearch(e.target.value)}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon />
                </InputAdornment>
              )
            }}
          />
        </Paper>

        {/* Advanced Filters */}
        <Collapse in={showFilters}>
          <SearchFilters
            filters={searchFilters}
            onFiltersChange={updateFilters}
            onClear={clearSearch}
            entityTypes={['account']}
            showSaveButton={true}
          />
        </Collapse>
      </Stack>

      {/* Bulk Actions */}
      {selectedAccounts.length > 0 && (
        <Paper sx={{ p: 2, mt: 2, bgcolor: 'primary.50' }}>
          <Stack direction="row" spacing={2} alignItems="center">
            <Typography variant="body2">
              {selectedAccounts.length} account(s) selected
            </Typography>
            <Button
              size="small"
              startIcon={<CalculateIcon />}
              onClick={() => handleBulkAction('calculate-health')}
            >
              Calculate Health
            </Button>
            <Button
              size="small"
              startIcon={<TerritoryIcon />}
              onClick={() => handleBulkAction('assign-territory')}
            >
              Assign Territory
            </Button>
            <Button
              size="small"
              color="error"
              onClick={() => setSelectedAccounts([])}
            >
              Clear Selection
            </Button>
          </Stack>
        </Paper>
      )}

      {/* Accounts Table */}
      <TableContainer component={Paper} sx={{ mt: 3 }}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell padding="checkbox">
                <Checkbox
                  indeterminate={selectedAccounts.length > 0 && selectedAccounts.length < accounts.length}
                  checked={selectedAccounts.length === accounts.length && accounts.length > 0}
                  onChange={handleSelectAll}
                />
              </TableCell>
              <TableCell width="30"></TableCell>
              <TableCell></TableCell>
              <TableCell>Name</TableCell>
              <TableCell>Type</TableCell>
              <TableCell>Health</TableCell>
              <TableCell>Territory</TableCell>
              <TableCell align="right">Revenue</TableCell>
              <TableCell>Owner</TableCell>
              <TableCell align="center">Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {displayAccounts.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage).map((account) => (
              <React.Fragment key={account.id}>
                <TableRow
                  hover
                  sx={{ cursor: 'pointer', '& > *': { borderBottom: 'unset' } }}
                >
                  <TableCell padding="checkbox">
                    <Checkbox
                      checked={selectedAccounts.includes(account.id)}
                      onChange={() => handleSelectAccount(account.id)}
                      onClick={(e) => e.stopPropagation()}
                    />
                  </TableCell>
                  <TableCell>
                    <IconButton
                      size="small"
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleFavoriteAccount(account.id);
                      }}
                    >
                      {favoriteAccounts.includes(account.id) ?
                        <StarIcon sx={{ color: 'warning.main' }} /> :
                        <StarBorderIcon />
                      }
                    </IconButton>
                  </TableCell>
                  <TableCell>
                    <IconButton
                      size="small"
                      onClick={() => handleToggleRow(account.id)}
                    >
                      {expandedRows.includes(account.id) ? <ArrowUpIcon /> : <ArrowDownIcon />}
                    </IconButton>
                  </TableCell>
                  <TableCell onClick={() => handleViewDetails(account.id)}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Avatar sx={{ width: 32, height: 32, bgcolor: 'primary.main' }}>
                        {account.name[0]}
                      </Avatar>
                      <Box>
                        <Typography variant="body2" fontWeight="bold">
                          {account.name}
                        </Typography>
                        {account.website && (
                          <Typography variant="caption" color="textSecondary">
                            {account.website}
                          </Typography>
                        )}
                      </Box>
                    </Box>
                  </TableCell>
                  <TableCell>
                    <Chip
                      label={account.type}
                      size="small"
                      color={getTypeColor(account.type) as any}
                    />
                  </TableCell>
                  <TableCell>
                    <Chip
                      label="A"
                      size="small"
                      sx={{
                        backgroundColor: '#22c55e',
                        color: 'white',
                        fontWeight: 'bold'
                      }}
                    />
                  </TableCell>
                  <TableCell>
                    <Chip
                      label="West Coast"
                      size="small"
                      variant="outlined"
                      color="primary"
                    />
                  </TableCell>
                  <TableCell align="right">
                    {account.annual_revenue ? formatCurrency(account.annual_revenue) : '-'}
                  </TableCell>
                  <TableCell>
                    {account.owner ? (
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                        <Avatar sx={{ width: 24, height: 24 }} src={account.owner.avatar}>
                          {account.owner.name[0]}
                        </Avatar>
                        <Typography variant="caption">
                          {account.owner.name}
                        </Typography>
                      </Box>
                    ) : '-'}
                  </TableCell>
                  <TableCell align="center">
                    <Stack direction="row" spacing={0.5}>
                      <Tooltip title="View Details">
                        <IconButton
                          size="small"
                          onClick={() => handleViewDetails(account.id)}
                        >
                          <ViewIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="View Hierarchy">
                        <IconButton
                          size="small"
                          onClick={() => navigate(`/crm/accounts/${account.id}/hierarchy`)}
                        >
                          <HierarchyIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                      <IconButton
                        size="small"
                        onClick={(e) => handleMenuOpen(e, account.id)}
                      >
                        <MoreIcon fontSize="small" />
                      </IconButton>
                    </Stack>
                  </TableCell>
                </TableRow>

                {/* Expanded Row with Health Widget */}
                <TableRow>
                  <TableCell style={{ paddingBottom: 0, paddingTop: 0 }} colSpan={10}>
                    <Collapse in={expandedRows.includes(account.id)} timeout="auto" unmountOnExit>
                      <Box sx={{ margin: 2 }}>
                        <Grid container spacing={2}>
                          <Grid item xs={12} md={6}>
                            <AccountHealthWidget
                              accountId={account.id}
                              compact={false}
                              showDetails={true}
                            />
                          </Grid>
                          <Grid item xs={12} md={6}>
                            <Paper sx={{ p: 2 }}>
                              <Typography variant="h6" gutterBottom>
                                Quick Info
                              </Typography>
                              <Stack spacing={1}>
                                <Box>
                                  <Typography variant="caption" color="textSecondary">
                                    CUIT
                                  </Typography>
                                  <Typography variant="body2">
                                    {account.cuit ? formatCUIT(account.cuit) : 'N/A'}
                                  </Typography>
                                </Box>
                                <Box>
                                  <Typography variant="caption" color="textSecondary">
                                    Industry
                                  </Typography>
                                  <Typography variant="body2">
                                    {account.industry_id || 'N/A'}
                                  </Typography>
                                </Box>
                                <Box>
                                  <Typography variant="caption" color="textSecondary">
                                    Employees
                                  </Typography>
                                  <Typography variant="body2">
                                    {account.employees_count || 'N/A'}
                                  </Typography>
                                </Box>
                                <Box>
                                  <Typography variant="caption" color="textSecondary">
                                    Created
                                  </Typography>
                                  <Typography variant="body2">
                                    {formatDate(account.created_at)}
                                  </Typography>
                                </Box>
                              </Stack>
                            </Paper>
                          </Grid>
                        </Grid>
                      </Box>
                    </Collapse>
                  </TableCell>
                </TableRow>
              </React.Fragment>
            ))}

            {displayAccounts.length === 0 && (
              <TableRow>
                <TableCell colSpan={10} align="center" sx={{ py: 8 }}>
                  <Typography variant="h6" color="textSecondary" gutterBottom>
                    {isSearching ? 'Searching...' : 'No accounts found'}
                  </Typography>
                  {!isSearching && (
                    <Button
                      variant="contained"
                      startIcon={<AddIcon />}
                      sx={{ mt: 2 }}
                      onClick={() => navigate('/crm/accounts/new')}
                    >
                      Create First Account
                    </Button>
                  )}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>

        <TablePagination
          component="div"
          count={total}
          page={page}
          onPageChange={(_, newPage) => setPage(newPage)}
          rowsPerPage={rowsPerPage}
          onRowsPerPageChange={(e) => {
            setRowsPerPage(parseInt(e.target.value, 10));
            setPage(0);
          }}
          labelRowsPerPage="Rows per page:"
        />
      </TableContainer>

      {/* Action Menu */}
      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleMenuClose}
      >
        <MenuItem onClick={() => {
          handleViewDetails(selectedAccountId!);
          handleMenuClose();
        }}>
          <ViewIcon sx={{ mr: 1 }} /> View Details
        </MenuItem>
        <MenuItem onClick={() => {
          navigate(`/crm/accounts/${selectedAccountId}/edit`);
          handleMenuClose();
        }}>
          <EditIcon sx={{ mr: 1 }} /> Edit
        </MenuItem>
        <MenuItem onClick={() => {
          navigate(`/crm/accounts/${selectedAccountId}/hierarchy`);
          handleMenuClose();
        }}>
          <HierarchyIcon sx={{ mr: 1 }} /> View Hierarchy
        </MenuItem>
        <MenuItem onClick={handleDeleteAccount} sx={{ color: 'error.main' }}>
          <DeleteIcon sx={{ mr: 1 }} /> Delete
        </MenuItem>
      </Menu>

      {/* Bulk Action Dialog */}
      <Dialog
        open={bulkActionDialog.open}
        onClose={() => setBulkActionDialog({ open: false, action: '' })}
      >
        <DialogTitle>
          Confirm Bulk Action
        </DialogTitle>
        <DialogContent>
          <Typography>
            Are you sure you want to {bulkActionDialog.action.replace('-', ' ')} for {selectedAccounts.length} selected account(s)?
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setBulkActionDialog({ open: false, action: '' })}>
            Cancel
          </Button>
          <Button
            onClick={executeBulkAction}
            variant="contained"
            disabled={isCalculating}
          >
            {isCalculating ? 'Processing...' : 'Confirm'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default AccountsPageV2;