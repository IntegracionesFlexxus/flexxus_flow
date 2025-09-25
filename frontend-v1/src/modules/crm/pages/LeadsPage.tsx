/**
 * Leads Page - Sprint 15
 * Main page for lead management
 */

import React, { useState, useEffect } from 'react';
import {
  Box,
  Paper,
  Typography,
  Button,
  Grid,
  Tabs,
  Tab,
  Chip,
  IconButton,
  TextField,
  InputAdornment,
  CircularProgress,
  Card,
  CardContent,
  Avatar,
  Stack
} from '@mui/material';
import {
  Add as AddIcon,
  Search as SearchIcon,
  FilterList as FilterIcon,
  Download as DownloadIcon,
  Upload as UploadIcon,
  Refresh as RefreshIcon
} from '@mui/icons-material';
import { useLeads } from '../hooks/useLeads';
import { useCRMStore } from '../stores';
import { formatDate, formatCurrency } from '../utils/formatters';
import type { LeadStatus } from '../types';

const LeadsPage: React.FC = () => {
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [selectedTab, setSelectedTab] = useState(0);
  const [searchTerm, setSearchTerm] = useState('');

  const {
    leads,
    loading,
    total,
    filters,
    applyFilters,
    clearFilters,
    fetchLeads,
    deleteLead,
    qualifyLead,
    updateLeadScore,
    bulkUpdateScores
  } = useLeads();

  const { setSelectedLead, selectedLead } = useCRMStore();

  // Apply search filter
  useEffect(() => {
    const delayDebounce = setTimeout(() => {
      if (searchTerm) {
        applyFilters({ ...filters, search: searchTerm });
      } else {
        const { search, ...restFilters } = filters;
        applyFilters(restFilters);
      }
    }, 500);

    return () => clearTimeout(delayDebounce);
  }, [searchTerm]);

  // Filter leads by tab
  const getFilteredLeads = () => {
    switch (selectedTab) {
      case 0: return leads; // All
      case 1: return leads.filter(l => l.status === 'new');
      case 2: return leads.filter(l => l.status === 'qualified');
      case 3: return leads.filter(l => (l.score || 0) >= 70); // Hot leads
      default: return leads;
    }
  };

  const getStatusColor = (status: LeadStatus) => {
    const colors: Record<LeadStatus, 'default' | 'primary' | 'secondary' | 'success' | 'warning' | 'error'> = {
      new: 'primary',
      contacted: 'secondary',
      qualified: 'success',
      unqualified: 'warning',
      converted: 'success',
      disqualified: 'error'
    };
    return colors[status] || 'default';
  };

  const handleLeadClick = (lead: typeof leads[0]) => {
    setSelectedLead(lead);
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <CircularProgress />
      </Box>
    );
  }

  const filteredLeads = getFilteredLeads();

  return (
    <Box sx={{ p: 3 }}>
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" fontWeight="bold">
          Leads
        </Typography>
        <Stack direction="row" spacing={2}>
          <Button
            variant="outlined"
            startIcon={<RefreshIcon />}
            onClick={() => bulkUpdateScores()}
          >
            Actualizar Scores
          </Button>
          <Button
            variant="outlined"
            startIcon={<UploadIcon />}
          >
            Importar
          </Button>
          <Button
            variant="outlined"
            startIcon={<DownloadIcon />}
          >
            Exportar
          </Button>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => setIsFormOpen(true)}
            sx={{
              background: 'linear-gradient(45deg, #2196F3 30%, #21CBF3 90%)',
              color: 'white'
            }}
          >
            Nuevo Lead
          </Button>
        </Stack>
      </Box>

      {/* Metrics Cards */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography color="textSecondary" gutterBottom>
                Total Leads
              </Typography>
              <Typography variant="h4" fontWeight="bold">
                {total}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography color="textSecondary" gutterBottom>
                Nuevos
              </Typography>
              <Typography variant="h4" fontWeight="bold" color="primary">
                {leads.filter(l => l.status === 'new').length}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography color="textSecondary" gutterBottom>
                Calificados
              </Typography>
              <Typography variant="h4" fontWeight="bold" color="success.main">
                {leads.filter(l => l.status === 'qualified').length}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography color="textSecondary" gutterBottom>
                Hot Leads
              </Typography>
              <Typography variant="h4" fontWeight="bold" color="error.main">
                {leads.filter(l => (l.score || 0) >= 70).length}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Search and Tabs */}
      <Paper sx={{ mb: 3 }}>
        <Box sx={{ p: 2, borderBottom: 1, borderColor: 'divider' }}>
          <TextField
            fullWidth
            variant="outlined"
            placeholder="Buscar por nombre, email o empresa..."
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
        </Box>
        <Tabs value={selectedTab} onChange={(_, v) => setSelectedTab(v)}>
          <Tab label={`Todos (${total})`} />
          <Tab label={`Nuevos (${leads.filter(l => l.status === 'new').length})`} />
          <Tab label={`Calificados (${leads.filter(l => l.status === 'qualified').length})`} />
          <Tab label={`Hot Leads (${leads.filter(l => (l.score || 0) >= 70).length})`} />
        </Tabs>
      </Paper>

      {/* Leads List */}
      <Grid container spacing={3}>
        {filteredLeads.map((lead) => (
          <Grid item xs={12} md={6} lg={4} key={lead.id}>
            <Card
              sx={{
                cursor: 'pointer',
                transition: 'all 0.3s',
                '&:hover': {
                  transform: 'translateY(-2px)',
                  boxShadow: 4
                },
                border: selectedLead?.id === lead.id ? '2px solid' : 'none',
                borderColor: 'primary.main'
              }}
              onClick={() => handleLeadClick(lead)}
            >
              <CardContent>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Avatar sx={{ width: 40, height: 40 }}>
                      {lead.first_name?.[0]}{lead.last_name?.[0]}
                    </Avatar>
                    <Box>
                      <Typography variant="h6" sx={{ fontWeight: 'bold' }}>
                        {lead.first_name} {lead.last_name}
                      </Typography>
                      <Typography variant="body2" color="textSecondary">
                        {lead.company_name}
                      </Typography>
                    </Box>
                  </Box>
                  {lead.score && (
                    <Chip
                      label={`Score: ${lead.score}`}
                      size="small"
                      color={lead.score >= 70 ? 'error' : lead.score >= 40 ? 'warning' : 'default'}
                    />
                  )}
                </Box>

                <Stack spacing={1}>
                  <Typography variant="body2" color="textSecondary">
                    📧 {lead.email}
                  </Typography>
                  {lead.phone && (
                    <Typography variant="body2" color="textSecondary">
                      📱 {lead.phone}
                    </Typography>
                  )}
                  {lead.budget && (
                    <Typography variant="body2" color="textSecondary">
                      💰 {formatCurrency(lead.budget)}
                    </Typography>
                  )}
                </Stack>

                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mt: 2 }}>
                  <Chip
                    label={lead.status}
                    size="small"
                    color={getStatusColor(lead.status)}
                  />
                  <Typography variant="caption" color="textSecondary">
                    {formatDate(lead.created_at)}
                  </Typography>
                </Box>

                {lead.status === 'new' && (
                  <Box sx={{ mt: 2, display: 'flex', gap: 1 }}>
                    <Button
                      size="small"
                      variant="contained"
                      onClick={(e) => {
                        e.stopPropagation();
                        qualifyLead(lead.id);
                      }}
                    >
                      Calificar
                    </Button>
                    <Button
                      size="small"
                      variant="outlined"
                      onClick={(e) => {
                        e.stopPropagation();
                        updateLeadScore(lead.id);
                      }}
                    >
                      Actualizar Score
                    </Button>
                  </Box>
                )}
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      {filteredLeads.length === 0 && (
        <Box sx={{ textAlign: 'center', py: 8 }}>
          <Typography variant="h6" color="textSecondary">
            No se encontraron leads
          </Typography>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            sx={{ mt: 2 }}
            onClick={() => setIsFormOpen(true)}
          >
            Crear primer lead
          </Button>
        </Box>
      )}
    </Box>
  );
};

export default LeadsPage;