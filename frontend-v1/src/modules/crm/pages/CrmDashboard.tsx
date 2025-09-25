/**
 * CRM Dashboard - Sprint 15
 * Main CRM dashboard with metrics and overview
 */

import React from 'react';
import {
  Box,
  Grid,
  Card,
  CardContent,
  Typography,
  Paper,
  LinearProgress,
  List,
  ListItem,
  ListItemText,
  ListItemAvatar,
  Avatar,
  Chip,
  Button
} from '@mui/material';
import {
  TrendingUp as TrendingUpIcon,
  People as PeopleIcon,
  Business as BusinessIcon,
  AttachMoney as MoneyIcon,
  Assignment as TaskIcon,
  ArrowForward as ArrowIcon,
  Visibility as VisibilityIcon,
  ShowChart as ShowChartIcon
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { formatCurrency, formatPercentage } from '../utils/formatters';

const CrmDashboard: React.FC = () => {
  const navigate = useNavigate();

  // Mock data - In production, this would come from API
  const metrics = {
    leads: {
      total: 156,
      new: 45,
      qualified: 32,
      converted: 12,
      conversionRate: 26.7
    },
    opportunities: {
      total: 87,
      value: 2450000,
      avgDealSize: 28160,
      winRate: 34.5
    },
    accounts: {
      total: 234,
      active: 189,
      newThisMonth: 18
    },
    activities: {
      pending: 43,
      overdue: 8,
      completedToday: 12
    }
  };

  const topOpportunities = [
    { id: 1, name: 'Proyecto ERP - Empresa ABC', amount: 450000, probability: 80, stage: 'Negociación' },
    { id: 2, name: 'Migración Cloud - XYZ Corp', amount: 320000, probability: 60, stage: 'Propuesta' },
    { id: 3, name: 'Sistema CRM - Tech Solutions', amount: 280000, probability: 90, stage: 'Cierre' },
    { id: 4, name: 'Consultoría Digital - Retail Co', amount: 195000, probability: 40, stage: 'Calificación' }
  ];

  const recentActivities = [
    { id: 1, type: 'call', subject: 'Llamada de seguimiento', entity: 'Lead - Juan Pérez', time: 'Hace 10 min' },
    { id: 2, type: 'meeting', subject: 'Reunión de propuesta', entity: 'Opp - Proyecto ERP', time: 'Hace 1 hora' },
    { id: 3, type: 'email', subject: 'Cotización enviada', entity: 'Account - Tech Solutions', time: 'Hace 2 horas' },
    { id: 4, type: 'task', subject: 'Preparar demo', entity: 'Lead - María García', time: 'Hace 3 horas' }
  ];

  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'call': return '📞';
      case 'meeting': return '🤝';
      case 'email': return '📧';
      case 'task': return '✅';
      default: return '📌';
    }
  };

  return (
    <Box sx={{ p: 3 }}>
      {/* Header */}
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" fontWeight="bold" gutterBottom>
          CRM Dashboard
        </Typography>
        <Typography variant="body1" color="textSecondary">
          Resumen de tu actividad comercial
        </Typography>
      </Box>

      {/* Metrics Cards */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' }}>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Box>
                  <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.8)' }}>
                    Leads
                  </Typography>
                  <Typography variant="h3" sx={{ color: 'white', fontWeight: 'bold' }}>
                    {metrics.leads.total}
                  </Typography>
                  <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.8)', mt: 1 }}>
                    {metrics.leads.new} nuevos
                  </Typography>
                </Box>
                <PeopleIcon sx={{ fontSize: 48, color: 'rgba(255,255,255,0.3)' }} />
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ background: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)' }}>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Box>
                  <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.8)' }}>
                    Pipeline
                  </Typography>
                  <Typography variant="h3" sx={{ color: 'white', fontWeight: 'bold' }}>
                    ${(metrics.opportunities.value / 1000000).toFixed(1)}M
                  </Typography>
                  <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.8)', mt: 1 }}>
                    {metrics.opportunities.total} oportunidades
                  </Typography>
                </Box>
                <MoneyIcon sx={{ fontSize: 48, color: 'rgba(255,255,255,0.3)' }} />
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ background: 'linear-gradient(135deg, #fa709a 0%, #fee140 100%)' }}>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Box>
                  <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.8)' }}>
                    Cuentas
                  </Typography>
                  <Typography variant="h3" sx={{ color: 'white', fontWeight: 'bold' }}>
                    {metrics.accounts.total}
                  </Typography>
                  <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.8)', mt: 1 }}>
                    +{metrics.accounts.newThisMonth} este mes
                  </Typography>
                </Box>
                <BusinessIcon sx={{ fontSize: 48, color: 'rgba(255,255,255,0.3)' }} />
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ background: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)' }}>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Box>
                  <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.8)' }}>
                    Actividades
                  </Typography>
                  <Typography variant="h3" sx={{ color: 'white', fontWeight: 'bold' }}>
                    {metrics.activities.pending}
                  </Typography>
                  <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.8)', mt: 1 }}>
                    {metrics.activities.overdue} vencidas
                  </Typography>
                </Box>
                <TaskIcon sx={{ fontSize: 48, color: 'rgba(255,255,255,0.3)' }} />
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Quick Access to Opportunities */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12}>
          <Card
            sx={{
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              cursor: 'pointer',
              transition: 'all 0.3s ease',
              '&:hover': {
                transform: 'translateY(-4px)',
                boxShadow: '0 8px 24px rgba(0,0,0,0.2)'
              }
            }}
            onClick={() => {
              console.log('[CrmDashboard] Card Pipeline click - INICIO');
              console.log('[CrmDashboard] Navegando a /crm/pipeline');
              navigate('/crm/pipeline');
              console.log('[CrmDashboard] Card Pipeline click - FIN');
            }}
          >
            <CardContent sx={{ p: 3 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 3 }}>
                  <Box
                    sx={{
                      bgcolor: 'rgba(255,255,255,0.2)',
                      p: 2,
                      borderRadius: 2,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}
                  >
                    <ShowChartIcon sx={{ fontSize: 40, color: 'white' }} />
                  </Box>
                  <Box>
                    <Typography variant="h5" sx={{ color: 'white', fontWeight: 'bold' }}>
                      Pipeline de Oportunidades
                    </Typography>
                    <Typography variant="body1" sx={{ color: 'rgba(255,255,255,0.9)', mt: 0.5 }}>
                      Gestiona y visualiza todas tus oportunidades de venta en el pipeline
                    </Typography>
                    <Box sx={{ display: 'flex', gap: 4, mt: 2 }}>
                      <Box>
                        <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.7)' }}>
                          Total en Pipeline
                        </Typography>
                        <Typography variant="h6" sx={{ color: 'white', fontWeight: 'bold' }}>
                          ${(metrics.opportunities.value / 1000000).toFixed(1)}M
                        </Typography>
                      </Box>
                      <Box>
                        <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.7)' }}>
                          Oportunidades Activas
                        </Typography>
                        <Typography variant="h6" sx={{ color: 'white', fontWeight: 'bold' }}>
                          {metrics.opportunities.total}
                        </Typography>
                      </Box>
                      <Box>
                        <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.7)' }}>
                          Tasa de Cierre
                        </Typography>
                        <Typography variant="h6" sx={{ color: 'white', fontWeight: 'bold' }}>
                          {formatPercentage(metrics.opportunities.winRate, 1)}
                        </Typography>
                      </Box>
                    </Box>
                  </Box>
                </Box>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                  <Button
                    variant="contained"
                    size="large"
                    sx={{
                      bgcolor: 'rgba(255,255,255,0.2)',
                      color: 'white',
                      '&:hover': {
                        bgcolor: 'rgba(255,255,255,0.3)'
                      }
                    }}
                    endIcon={<VisibilityIcon />}
                  >
                    Ver Pipeline
                  </Button>
                  <ArrowIcon sx={{ fontSize: 32, color: 'rgba(255,255,255,0.5)' }} />
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Main Content */}
      <Grid container spacing={3}>
        {/* Conversion Funnel */}
        <Grid item xs={12} md={4}>
          <Paper sx={{ p: 3, height: '100%' }}>
            <Typography variant="h6" gutterBottom fontWeight="bold">
              Embudo de Conversión
            </Typography>
            <Box sx={{ mt: 3 }}>
              <Box sx={{ mb: 3 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                  <Typography variant="body2">Leads</Typography>
                  <Typography variant="body2" fontWeight="bold">{metrics.leads.total}</Typography>
                </Box>
                <LinearProgress variant="determinate" value={100} sx={{ height: 8, borderRadius: 4 }} />
              </Box>

              <Box sx={{ mb: 3 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                  <Typography variant="body2">Calificados</Typography>
                  <Typography variant="body2" fontWeight="bold">{metrics.leads.qualified}</Typography>
                </Box>
                <LinearProgress
                  variant="determinate"
                  value={(metrics.leads.qualified / metrics.leads.total) * 100}
                  sx={{ height: 8, borderRadius: 4 }}
                  color="secondary"
                />
              </Box>

              <Box sx={{ mb: 3 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                  <Typography variant="body2">Oportunidades</Typography>
                  <Typography variant="body2" fontWeight="bold">{metrics.opportunities.total}</Typography>
                </Box>
                <LinearProgress
                  variant="determinate"
                  value={(metrics.opportunities.total / metrics.leads.total) * 100}
                  sx={{ height: 8, borderRadius: 4 }}
                  color="warning"
                />
              </Box>

              <Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                  <Typography variant="body2">Convertidos</Typography>
                  <Typography variant="body2" fontWeight="bold">{metrics.leads.converted}</Typography>
                </Box>
                <LinearProgress
                  variant="determinate"
                  value={(metrics.leads.converted / metrics.leads.total) * 100}
                  sx={{ height: 8, borderRadius: 4 }}
                  color="success"
                />
              </Box>

              <Box sx={{ mt: 4, p: 2, bgcolor: 'grey.100', borderRadius: 2 }}>
                <Typography variant="body2" color="textSecondary" gutterBottom>
                  Tasa de Conversión
                </Typography>
                <Typography variant="h4" color="success.main" fontWeight="bold">
                  {formatPercentage(metrics.leads.conversionRate, 1)}
                </Typography>
              </Box>
            </Box>
          </Paper>
        </Grid>

        {/* Top Opportunities */}
        <Grid item xs={12} md={4}>
          <Paper sx={{ p: 3, height: '100%' }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
              <Typography variant="h6" fontWeight="bold">
                Top Oportunidades
              </Typography>
              <Button
                size="small"
                endIcon={<ArrowIcon />}
                onClick={() => {
                  console.log('[CrmDashboard] Botón Ver todas click - INICIO');
                  console.log('[CrmDashboard] Navegando a /crm/opportunities');
                  navigate('/crm/opportunities');
                  console.log('[CrmDashboard] Botón Ver todas click - FIN');
                }}
              >
                Ver todas
              </Button>
            </Box>
            <List>
              {topOpportunities.map((opp) => (
                <ListItem key={opp.id} sx={{ px: 0 }}>
                  <ListItemText
                    primary={opp.name}
                    secondary={
                      <Box sx={{ mt: 1 }}>
                        <Typography variant="body2" color="primary" fontWeight="bold">
                          {formatCurrency(opp.amount)}
                        </Typography>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 0.5 }}>
                          <Chip label={opp.stage} size="small" />
                          <Typography variant="caption" color="textSecondary">
                            {opp.probability}% probabilidad
                          </Typography>
                        </Box>
                      </Box>
                    }
                  />
                </ListItem>
              ))}
            </List>
          </Paper>
        </Grid>

        {/* Recent Activities */}
        <Grid item xs={12} md={4}>
          <Paper sx={{ p: 3, height: '100%' }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
              <Typography variant="h6" fontWeight="bold">
                Actividad Reciente
              </Typography>
              <Button
                size="small"
                endIcon={<ArrowIcon />}
                onClick={() => navigate('/crm/activities')}
              >
                Ver todas
              </Button>
            </Box>
            <List>
              {recentActivities.map((activity) => (
                <ListItem key={activity.id} sx={{ px: 0 }}>
                  <ListItemAvatar>
                    <Avatar sx={{ bgcolor: 'grey.200' }}>
                      {getActivityIcon(activity.type)}
                    </Avatar>
                  </ListItemAvatar>
                  <ListItemText
                    primary={activity.subject}
                    secondary={
                      <>
                        <Typography variant="caption" color="textSecondary">
                          {activity.entity}
                        </Typography>
                        <br />
                        <Typography variant="caption" color="textSecondary">
                          {activity.time}
                        </Typography>
                      </>
                    }
                  />
                </ListItem>
              ))}
            </List>
          </Paper>
        </Grid>
      </Grid>
    </Box>
  );
};

export default CrmDashboard