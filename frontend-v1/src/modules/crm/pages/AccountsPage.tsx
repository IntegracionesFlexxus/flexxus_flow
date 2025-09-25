/**
 * Accounts Page - Sprint 15
 * Main page for account management
 */

import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
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
  MenuItem
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
  StarBorder as StarBorderIcon
} from '@mui/icons-material';
import { useAccounts } from '../hooks/useAccounts';
import { useCRMStore } from '../stores';
import { formatCurrency, formatDate } from '../utils/formatters';
import { formatCUIT } from '../utils/cuitValidator';
import AccountDialog from '../components/dialogs/AccountDialog';
import { useAuth } from '@/shared/hooks/useAuth';
import type { Account, AccountType, AccountRating } from '../types';

const AccountsPage: React.FC = () => {
  const navigate = useNavigate();
  const { user, currentCompany } = useAuth();
  const [searchTerm, setSearchTerm] = useState('');
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [selectedAccountId, setSelectedAccountId] = useState<number | null>(null);
  const [openDialog, setOpenDialog] = useState(false);
  const [editingAccount, setEditingAccount] = useState<Account | null>(null);

  const {
    accounts,
    total,
    loading,
    filters,
    applyFilters,
    createAccount,
    updateAccount,
    deleteAccount,
    updateAccountRating,
    validateCUIT
  } = useAccounts();

  const { setSelectedAccount, favoriteAccounts, toggleFavoriteAccount } = useCRMStore();

  const handleSearch = (value: string) => {
    setSearchTerm(value);
    applyFilters({ ...filters, search: value });
  };

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

  const handleEditAccount = () => {
    const account = accounts.find(a => a.id === selectedAccountId);
    if (account) {
      setEditingAccount(account);
      setOpenDialog(true);
    }
    handleMenuClose();
  };

  const handleViewDetails = () => {
    if (selectedAccountId) {
      navigate(`/crm/accounts/${selectedAccountId}`);
    }
    handleMenuClose();
  };

  const handleSaveAccount = (data: any) => {
    console.log('=== CREAR CUENTA DEBUG ===');
    console.log('1. Datos del formulario recibidos:', data);
    console.log('2. Usuario actual:', user);
    console.log('3. Compañía actual:', currentCompany);

    // Agregar company_id y owner_id que son requeridos por el backend
    // Convertir owner_id a número si es necesario (el backend espera number)
    const ownerId = user?.id ? (typeof user.id === 'string' ? 1 : user.id) : 1;

    const accountData = {
      ...data,
      company_id: currentCompany?.id || '0a8e08a1-fdad-4caa-b90e-d8d791fa82ee', // UUID string
      owner_id: data.owner_id || ownerId // número
    };

    console.log('4. Datos finales a enviar al backend:', accountData);
    console.log('5. Tipo de company_id:', typeof accountData.company_id);
    console.log('6. Tipo de owner_id:', typeof accountData.owner_id);

    if (editingAccount) {
      console.log('7. Modo: EDITAR cuenta ID:', editingAccount.id);
      updateAccount(editingAccount.id, accountData);
    } else {
      console.log('7. Modo: CREAR nueva cuenta');
      createAccount(accountData);
    }
    setOpenDialog(false);
    setEditingAccount(null);
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
    totalRevenue: accounts.reduce((sum, a) => sum + (a.annual_revenue || 0), 0)
  };

  return (
    <Box sx={{ p: 3 }}>
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Box>
          <Typography variant="h4" fontWeight="bold" gutterBottom>
            Cuentas
          </Typography>
          <Typography variant="body1" color="textSecondary">
            Gestiona las empresas y organizaciones con las que trabajas
          </Typography>
        </Box>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => {
            setEditingAccount(null);
            setOpenDialog(true);
          }}
          sx={{
            background: 'linear-gradient(45deg, #2196F3 30%, #21CBF3 90%)',
            color: 'white'
          }}
        >
          Nueva Cuenta
        </Button>
      </Box>

      {/* Metrics Cards */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Box>
                  <Typography color="textSecondary" gutterBottom variant="body2">
                    Total Cuentas
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

        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography color="textSecondary" gutterBottom variant="body2">
                Clientes
              </Typography>
              <Typography variant="h4" fontWeight="bold" color="success.main">
                {metrics.customers}
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography color="textSecondary" gutterBottom variant="body2">
                Prospectos
              </Typography>
              <Typography variant="h4" fontWeight="bold" color="primary.main">
                {metrics.prospects}
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography color="textSecondary" gutterBottom variant="body2">
                Ingresos Totales
              </Typography>
              <Typography variant="h5" fontWeight="bold">
                {formatCurrency(metrics.totalRevenue)}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Search and Filters */}
      <Paper sx={{ p: 2, mb: 3 }}>
        <TextField
          fullWidth
          variant="outlined"
          placeholder="Buscar por nombre, CUIT o sitio web..."
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

      {/* Accounts Table */}
      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell width="30"></TableCell>
              <TableCell>Nombre</TableCell>
              <TableCell>CUIT</TableCell>
              <TableCell>Tipo</TableCell>
              <TableCell>Rating</TableCell>
              <TableCell align="right">Ingresos Anuales</TableCell>
              <TableCell>Propietario</TableCell>
              <TableCell>Creado</TableCell>
              <TableCell align="center">Acciones</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {accounts.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage).map((account) => (
              <TableRow
                key={account.id}
                hover
                sx={{ cursor: 'pointer' }}
                onClick={() => setSelectedAccount(account)}
              >
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
                  {account.cuit ? formatCUIT(account.cuit) : '-'}
                </TableCell>
                <TableCell>
                  <Chip
                    label={account.type}
                    size="small"
                    color={getTypeColor(account.type) as any}
                  />
                </TableCell>
                <TableCell>
                  {account.rating && getRatingIcon(account.rating)}
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
                <TableCell>
                  <Typography variant="caption">
                    {formatDate(account.created_at)}
                  </Typography>
                </TableCell>
                <TableCell align="center">
                  <IconButton
                    size="small"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleMenuOpen(e, account.id);
                    }}
                  >
                    <MoreIcon />
                  </IconButton>
                </TableCell>
              </TableRow>
            ))}

            {accounts.length === 0 && (
              <TableRow>
                <TableCell colSpan={9} align="center" sx={{ py: 8 }}>
                  <Typography variant="h6" color="textSecondary" gutterBottom>
                    No se encontraron cuentas
                  </Typography>
                  <Button
                    variant="contained"
                    startIcon={<AddIcon />}
                    sx={{ mt: 2 }}
                    onClick={() => {
                      setEditingAccount(null);
                      setOpenDialog(true);
                    }}
                  >
                    Crear primera cuenta
                  </Button>
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
          labelRowsPerPage="Filas por página:"
        />
      </TableContainer>

      {/* Action Menu */}
      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleMenuClose}
      >
        <MenuItem onClick={handleViewDetails}>
          <ViewIcon sx={{ mr: 1 }} /> Ver detalles
        </MenuItem>
        <MenuItem onClick={handleEditAccount}>
          <EditIcon sx={{ mr: 1 }} /> Editar
        </MenuItem>
        <MenuItem onClick={handleDeleteAccount} sx={{ color: 'error.main' }}>
          <DeleteIcon sx={{ mr: 1 }} /> Eliminar
        </MenuItem>
      </Menu>

      {/* Account Dialog */}
      <AccountDialog
        open={openDialog}
        onClose={() => {
          setOpenDialog(false);
          setEditingAccount(null);
        }}
        account={editingAccount}
        onSave={handleSaveAccount}
      />
    </Box>
  );
};

export default AccountsPage;