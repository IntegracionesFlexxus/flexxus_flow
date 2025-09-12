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
  Switch,
  Tooltip,
  Menu,
  MenuItem,
  Card,
  CardContent,
  Grid
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Search as SearchIcon,
  Flag as FlagIcon,
  Settings as SettingsIcon,
  ContentCopy as CopyIcon,
  Code as CodeIcon,
  Schedule as ScheduleIcon,
  Percent as PercentIcon
} from '@mui/icons-material';

interface FeatureFlag {
  id: string;
  name: string;
  description: string;
  enabled: boolean;
  environment: 'development' | 'staging' | 'production';
  category: string;
  rolloutPercentage: number;
  createdAt: string;
  updatedAt: string;
}

const FeatureFlagList: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedEnvironment, setSelectedEnvironment] = useState<string>('all');
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [selectedFlag, setSelectedFlag] = useState<FeatureFlag | null>(null);

  // Mock data - en producción vendría del backend
  const [featureFlags, setFeatureFlags] = useState<FeatureFlag[]>([
    {
      id: '1',
      name: 'new_dashboard',
      description: 'Enable new dashboard design',
      enabled: true,
      environment: 'production',
      category: 'UI',
      rolloutPercentage: 100,
      createdAt: '2024-01-15',
      updatedAt: '2024-03-10'
    },
    {
      id: '2',
      name: 'advanced_analytics',
      description: 'Advanced analytics module',
      enabled: true,
      environment: 'production',
      category: 'Analytics',
      rolloutPercentage: 50,
      createdAt: '2024-02-01',
      updatedAt: '2024-03-08'
    },
    {
      id: '3',
      name: 'beta_ai_assistant',
      description: 'AI-powered assistant feature',
      enabled: false,
      environment: 'development',
      category: 'AI',
      rolloutPercentage: 10,
      createdAt: '2024-03-01',
      updatedAt: '2024-03-09'
    },
    {
      id: '4',
      name: 'multi_language_support',
      description: 'Support for multiple languages',
      enabled: true,
      environment: 'staging',
      category: 'i18n',
      rolloutPercentage: 75,
      createdAt: '2024-02-15',
      updatedAt: '2024-03-07'
    },
    {
      id: '5',
      name: 'dark_mode',
      description: 'Dark theme support',
      enabled: true,
      environment: 'production',
      category: 'UI',
      rolloutPercentage: 100,
      createdAt: '2024-01-20',
      updatedAt: '2024-03-05'
    }
  ]);

  const handleToggleFlag = (flagId: string) => {
    setFeatureFlags(flags =>
      flags.map(flag =>
        flag.id === flagId ? { ...flag, enabled: !flag.enabled } : flag
      )
    );
  };

  const handleMenuOpen = (event: React.MouseEvent<HTMLElement>, flag: FeatureFlag) => {
    setAnchorEl(event.currentTarget);
    setSelectedFlag(flag);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
    setSelectedFlag(null);
  };

  const getEnvironmentColor = (env: string) => {
    switch (env) {
      case 'production':
        return 'error';
      case 'staging':
        return 'warning';
      case 'development':
        return 'info';
      default:
        return 'default';
    }
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'UI':
        return '🎨';
      case 'Analytics':
        return '📊';
      case 'AI':
        return '🤖';
      case 'i18n':
        return '🌍';
      default:
        return '🚩';
    }
  };

  const filteredFlags = featureFlags.filter(flag => {
    const matchesSearch = flag.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          flag.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          flag.category.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesEnvironment = selectedEnvironment === 'all' || flag.environment === selectedEnvironment;
    return matchesSearch && matchesEnvironment;
  });

  const statsCards = [
    {
      title: 'Total Flags',
      value: featureFlags.length,
      color: 'primary.main'
    },
    {
      title: 'Enabled',
      value: featureFlags.filter(f => f.enabled).length,
      color: 'success.main'
    },
    {
      title: 'In Production',
      value: featureFlags.filter(f => f.environment === 'production').length,
      color: 'error.main'
    },
    {
      title: 'Partial Rollout',
      value: featureFlags.filter(f => f.rolloutPercentage > 0 && f.rolloutPercentage < 100).length,
      color: 'warning.main'
    }
  ];

  return (
    <Box sx={{ p: 3 }}>
      {/* Header */}
      <Box sx={{ mb: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Box>
          <Typography variant="h4" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <FlagIcon sx={{ fontSize: 32 }} />
            Feature Flags
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Controla las funcionalidades del sistema de forma dinámica
          </Typography>
        </Box>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => console.log('Nuevo flag')}
        >
          Nuevo Feature Flag
        </Button>
      </Box>

      {/* Stats Cards */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        {statsCards.map((stat, index) => (
          <Grid item xs={12} sm={6} md={3} key={index}>
            <Card>
              <CardContent>
                <Typography variant="body2" color="text.secondary" gutterBottom>
                  {stat.title}
                </Typography>
                <Typography variant="h4" sx={{ color: stat.color }}>
                  {stat.value}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      {/* Filters */}
      <Paper sx={{ mb: 3, p: 2 }}>
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
          <TextField
            fullWidth
            variant="outlined"
            placeholder="Buscar feature flags..."
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
          <TextField
            select
            label="Environment"
            value={selectedEnvironment}
            onChange={(e) => setSelectedEnvironment(e.target.value)}
            sx={{ minWidth: 200 }}
          >
            <MenuItem value="all">Todos</MenuItem>
            <MenuItem value="development">Development</MenuItem>
            <MenuItem value="staging">Staging</MenuItem>
            <MenuItem value="production">Production</MenuItem>
          </TextField>
        </Stack>
      </Paper>

      {/* Feature Flags Table */}
      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Estado</TableCell>
              <TableCell>Feature Flag</TableCell>
              <TableCell>Categoría</TableCell>
              <TableCell>Environment</TableCell>
              <TableCell align="center">Rollout</TableCell>
              <TableCell>Actualizado</TableCell>
              <TableCell align="right">Acciones</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {filteredFlags.map((flag) => (
              <TableRow key={flag.id} hover>
                <TableCell>
                  <Switch
                    checked={flag.enabled}
                    onChange={() => handleToggleFlag(flag.id)}
                    color="primary"
                  />
                </TableCell>
                <TableCell>
                  <Box>
                    <Typography variant="body2" fontWeight={600}>
                      {flag.name}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {flag.description}
                    </Typography>
                  </Box>
                </TableCell>
                <TableCell>
                  <Chip
                    label={`${getCategoryIcon(flag.category)} ${flag.category}`}
                    size="small"
                    variant="outlined"
                  />
                </TableCell>
                <TableCell>
                  <Chip
                    label={flag.environment}
                    color={getEnvironmentColor(flag.environment) as any}
                    size="small"
                  />
                </TableCell>
                <TableCell align="center">
                  <Stack direction="row" alignItems="center" justifyContent="center" spacing={0.5}>
                    <PercentIcon fontSize="small" color="action" />
                    <Typography variant="body2">
                      {flag.rolloutPercentage}%
                    </Typography>
                  </Stack>
                </TableCell>
                <TableCell>
                  <Stack direction="row" alignItems="center" spacing={0.5}>
                    <ScheduleIcon fontSize="small" color="action" />
                    <Typography variant="caption" color="text.secondary">
                      {new Date(flag.updatedAt).toLocaleDateString()}
                    </Typography>
                  </Stack>
                </TableCell>
                <TableCell align="right">
                  <Stack direction="row" spacing={0.5} justifyContent="flex-end">
                    <Tooltip title="Copiar código">
                      <IconButton size="small" onClick={() => {
                        navigator.clipboard.writeText(`if (featureFlags.isEnabled('${flag.name}')) { /* ... */ }`);
                        console.log('Código copiado');
                      }}>
                        <CodeIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="Configurar">
                      <IconButton size="small" onClick={() => console.log('Configurar', flag.id)}>
                        <SettingsIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="Editar">
                      <IconButton size="small" onClick={() => console.log('Editar', flag.id)}>
                        <EditIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="Eliminar">
                      <IconButton 
                        size="small" 
                        onClick={() => console.log('Eliminar', flag.id)}
                        color="error"
                      >
                        <DeleteIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
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
          console.log('Ver historial', selectedFlag?.id);
          handleMenuClose();
        }}>
          Ver Historial
        </MenuItem>
        <MenuItem onClick={() => {
          console.log('Clonar flag', selectedFlag?.id);
          handleMenuClose();
        }}>
          Clonar Flag
        </MenuItem>
        <MenuItem onClick={() => {
          console.log('Exportar configuración', selectedFlag?.id);
          handleMenuClose();
        }}>
          Exportar Configuración
        </MenuItem>
        <MenuItem onClick={() => {
          console.log('Test A/B', selectedFlag?.id);
          handleMenuClose();
        }}>
          Configurar Test A/B
        </MenuItem>
      </Menu>
    </Box>
  );
};

export default FeatureFlagList;