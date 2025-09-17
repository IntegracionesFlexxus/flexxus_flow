import React, { useState } from 'react';
import {
  Box,
  Typography,
  Button,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  IconButton,
  Chip,
  TextField,
  InputAdornment,
  Stack,
  Tooltip,
  Menu,
  MenuItem
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Search as SearchIcon,
  MoreVert as MoreVertIcon,
  Business as BusinessIcon,
  Settings as SettingsIcon,
  People as PeopleIcon
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { useRoleValidation } from '@/shared/hooks/useRoleValidation';
import { Alert, AlertTitle } from '@mui/material';

interface Company {
  id: string;
  name: string;
  status: 'active' | 'inactive' | 'suspended';
  plan: string;
  users: number;
  createdAt: string;
}

const CompanyList: React.FC = () => {
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState('');
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [selectedCompany, setSelectedCompany] = useState<Company | null>(null);

  // Validaciones de rol
  const { canViewAllCompanies, getAccessDeniedMessage } = useRoleValidation();

  // Mock data - en producción vendría del backend
  const companies: Company[] = [
    {
      id: '1',
      name: 'Flexxus Demo Company',
      status: 'active',
      plan: 'Enterprise',
      users: 25,
      createdAt: '2024-01-15'
    },
    {
      id: '2',
      name: 'Tech Solutions Inc',
      status: 'active',
      plan: 'Professional',
      users: 10,
      createdAt: '2024-02-20'
    },
    {
      id: '3',
      name: 'StartUp Beta',
      status: 'inactive',
      plan: 'Starter',
      users: 3,
      createdAt: '2024-03-10'
    }
  ];

  const handleMenuOpen = (event: React.MouseEvent<HTMLElement>, company: Company) => {
    setAnchorEl(event.currentTarget);
    setSelectedCompany(company);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
    setSelectedCompany(null);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'success';
      case 'inactive':
        return 'default';
      case 'suspended':
        return 'error';
      default:
        return 'default';
    }
  };

  const getPlanColor = (plan: string) => {
    switch (plan) {
      case 'Enterprise':
        return 'primary';
      case 'Professional':
        return 'secondary';
      case 'Starter':
        return 'default';
      default:
        return 'default';
    }
  };

  const filteredCompanies = companies.filter(company =>
    company.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    company.plan.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Verificar permisos de acceso
  if (!canViewAllCompanies()) {
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity="error">
          <AlertTitle>Acceso Denegado</AlertTitle>
          {getAccessDeniedMessage('view_companies')}
        </Alert>
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3 }}>
      {/* Header */}
      <Box sx={{ mb: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Box>
          <Typography variant="h4" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <BusinessIcon sx={{ fontSize: 32 }} />
            Gestión de Empresas
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Administra las empresas y sus configuraciones
          </Typography>
        </Box>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => console.log('Nueva empresa')}
        >
          Nueva Empresa
        </Button>
      </Box>

      {/* Search Bar */}
      <Paper sx={{ mb: 3, p: 2 }}>
        <TextField
          fullWidth
          variant="outlined"
          placeholder="Buscar empresas..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon />
              </InputAdornment>
            )
          }}
        />
      </Paper>

      {/* Stats Cards */}
      <Stack direction="row" spacing={2} sx={{ mb: 3 }}>
        <Paper sx={{ p: 2, flex: 1 }}>
          <Typography variant="h6" color="text.secondary">Total Empresas</Typography>
          <Typography variant="h4">{companies.length}</Typography>
        </Paper>
        <Paper sx={{ p: 2, flex: 1 }}>
          <Typography variant="h6" color="text.secondary">Empresas Activas</Typography>
          <Typography variant="h4" color="success.main">
            {companies.filter(c => c.status === 'active').length}
          </Typography>
        </Paper>
        <Paper sx={{ p: 2, flex: 1 }}>
          <Typography variant="h6" color="text.secondary">Total Usuarios</Typography>
          <Typography variant="h4">
            {companies.reduce((sum, c) => sum + c.users, 0)}
          </Typography>
        </Paper>
      </Stack>

      {/* Companies Table */}
      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Empresa</TableCell>
              <TableCell>Estado</TableCell>
              <TableCell>Plan</TableCell>
              <TableCell align="center">Usuarios</TableCell>
              <TableCell>Fecha Creación</TableCell>
              <TableCell align="right">Acciones</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {filteredCompanies.map((company) => (
              <TableRow key={company.id} hover>
                <TableCell>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <BusinessIcon color="action" />
                    <Typography variant="body2" fontWeight={500}>
                      {company.name}
                    </Typography>
                  </Box>
                </TableCell>
                <TableCell>
                  <Chip
                    label={company.status}
                    color={getStatusColor(company.status) as any}
                    size="small"
                  />
                </TableCell>
                <TableCell>
                  <Chip
                    label={company.plan}
                    color={getPlanColor(company.plan) as any}
                    variant="outlined"
                    size="small"
                  />
                </TableCell>
                <TableCell align="center">
                  <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 0.5 }}>
                    <PeopleIcon fontSize="small" color="action" />
                    <Typography variant="body2">{company.users}</Typography>
                  </Box>
                </TableCell>
                <TableCell>
                  <Typography variant="body2" color="text.secondary">
                    {new Date(company.createdAt).toLocaleDateString()}
                  </Typography>
                </TableCell>
                <TableCell align="right">
                  <Stack direction="row" spacing={1} justifyContent="flex-end">
                    <Tooltip title="Configurar">
                      <IconButton size="small" onClick={() => console.log('Configurar', company.id)}>
                        <SettingsIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="Editar">
                      <IconButton size="small" onClick={() => console.log('Editar', company.id)}>
                        <EditIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                    <IconButton
                      size="small"
                      onClick={(e) => handleMenuOpen(e, company)}
                    >
                      <MoreVertIcon fontSize="small" />
                    </IconButton>
                  </Stack>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Context Menu */}
      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleMenuClose}
      >
        <MenuItem onClick={() => {
          console.log('Ver detalles', selectedCompany?.id);
          handleMenuClose();
        }}>
          Ver Detalles
        </MenuItem>
        <MenuItem onClick={() => {
          console.log('Gestionar usuarios', selectedCompany?.id);
          handleMenuClose();
        }}>
          Gestionar Usuarios
        </MenuItem>
        <MenuItem onClick={() => {
          console.log('Cambiar plan', selectedCompany?.id);
          handleMenuClose();
        }}>
          Cambiar Plan
        </MenuItem>
        <MenuItem onClick={() => {
          console.log('Suspender', selectedCompany?.id);
          handleMenuClose();
        }} sx={{ color: 'warning.main' }}>
          Suspender Empresa
        </MenuItem>
        <MenuItem onClick={() => {
          console.log('Eliminar', selectedCompany?.id);
          handleMenuClose();
        }} sx={{ color: 'error.main' }}>
          Eliminar Empresa
        </MenuItem>
      </Menu>
    </Box>
  );
};

export default CompanyList;