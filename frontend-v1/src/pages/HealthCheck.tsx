import React, { useEffect, useState } from 'react';
import { Box, Typography, Paper, Grid, Chip } from '@mui/material';
import { CheckCircle, Error, Warning } from '@mui/icons-material';
import config from '@/config/env.config';
import { websocketService } from '@/services/websocket.service';

// Health Check Page - MVP Nivel 1
// TODO: En Nivel 2 agregar más métricas, monitoring integrado

interface HealthStatus {
  status: 'healthy' | 'degraded' | 'unhealthy';
  checks: {
    app: boolean;
    api: boolean;
    websocket: boolean;
    storage: boolean;
  };
  metrics: {
    version: string;
    environment: string;
    buildTime?: string;
    uptime?: number;
  };
  timestamp: string;
}

export function HealthCheck() {
  const [health, setHealth] = useState<HealthStatus>({
    status: 'unhealthy',
    checks: {
      app: false,
      api: false,
      websocket: false,
      storage: false
    },
    metrics: {
      version: config.APP_VERSION,
      environment: config.APP_ENV
    },
    timestamp: new Date().toISOString()
  });

  useEffect(() => {
    checkHealth();
    const interval = setInterval(checkHealth, 30000); // Check every 30 seconds
    return () => clearInterval(interval);
  }, []);

  const checkHealth = async () => {
    const checks = {
      app: true, // App is running if this component renders
      api: await checkAPI(),
      websocket: checkWebSocket(),
      storage: checkStorage()
    };

    const allHealthy = Object.values(checks).every(check => check);
    const someHealthy = Object.values(checks).some(check => check);

    setHealth({
      status: allHealthy ? 'healthy' : someHealthy ? 'degraded' : 'unhealthy',
      checks,
      metrics: {
        version: config.APP_VERSION,
        environment: config.APP_ENV,
        buildTime: process.env.BUILD_TIME,
        uptime: performance.now()
      },
      timestamp: new Date().toISOString()
    });
  };

  const checkAPI = async (): Promise<boolean> => {
    try {
      const response = await fetch(`${config.API_BASE_URL}/health`, {
        method: 'GET',
        signal: AbortSignal.timeout(5000)
      });
      return response.ok;
    } catch {
      return false;
    }
  };

  const checkWebSocket = (): boolean => {
    return websocketService.isConnected();
  };

  const checkStorage = (): boolean => {
    try {
      const testKey = '__health_check__';
      localStorage.setItem(testKey, 'test');
      localStorage.removeItem(testKey);
      return true;
    } catch {
      return false;
    }
  };

  const getStatusColor = () => {
    switch (health.status) {
      case 'healthy':
        return 'success';
      case 'degraded':
        return 'warning';
      case 'unhealthy':
        return 'error';
    }
  };

  const getStatusIcon = () => {
    switch (health.status) {
      case 'healthy':
        return <CheckCircle color="success" />;
      case 'degraded':
        return <Warning color="warning" />;
      case 'unhealthy':
        return <Error color="error" />;
    }
  };

  // Return JSON for API endpoint
  if (window.location.pathname === '/api/health') {
    return <pre>{JSON.stringify(health, null, 2)}</pre>;
  }

  // Return UI for visual health check
  return (
    <Box p={3}>
      <Typography variant="h4" gutterBottom>
        Health Check
      </Typography>

      <Paper sx={{ p: 3, mb: 3 }}>
        <Box display="flex" alignItems="center" gap={2} mb={2}>
          {getStatusIcon()}
          <Typography variant="h5">
            Status: <Chip label={health.status.toUpperCase()} color={getStatusColor()} />
          </Typography>
        </Box>

        <Typography variant="body2" color="text.secondary">
          Last checked: {new Date(health.timestamp).toLocaleString()}
        </Typography>
      </Paper>

      <Grid container spacing={3}>
        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>
              Service Checks
            </Typography>
            
            <Box display="flex" flexDirection="column" gap={2}>
              {Object.entries(health.checks).map(([service, status]) => (
                <Box key={service} display="flex" justifyContent="space-between" alignItems="center">
                  <Typography textTransform="capitalize">
                    {service}
                  </Typography>
                  <Chip
                    label={status ? 'HEALTHY' : 'UNHEALTHY'}
                    color={status ? 'success' : 'error'}
                    size="small"
                    icon={status ? <CheckCircle /> : <Error />}
                  />
                </Box>
              ))}
            </Box>
          </Paper>
        </Grid>

        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>
              Application Metrics
            </Typography>
            
            <Box display="flex" flexDirection="column" gap={1}>
              <Box display="flex" justifyContent="space-between">
                <Typography variant="body2" color="text.secondary">
                  Version:
                </Typography>
                <Typography variant="body2">
                  {health.metrics.version}
                </Typography>
              </Box>
              
              <Box display="flex" justifyContent="space-between">
                <Typography variant="body2" color="text.secondary">
                  Environment:
                </Typography>
                <Typography variant="body2">
                  {health.metrics.environment}
                </Typography>
              </Box>
              
              {health.metrics.uptime && (
                <Box display="flex" justifyContent="space-between">
                  <Typography variant="body2" color="text.secondary">
                    Uptime:
                  </Typography>
                  <Typography variant="body2">
                    {Math.floor(health.metrics.uptime / 1000)}s
                  </Typography>
                </Box>
              )}
            </Box>
          </Paper>
        </Grid>
      </Grid>
    </Box>
  );
}

// API endpoint for health check
export async function getHealthStatus(): Promise<HealthStatus> {
  const checkAPI = async (): Promise<boolean> => {
    try {
      const response = await fetch(`${config.API_BASE_URL}/health`, {
        method: 'GET',
        signal: AbortSignal.timeout(5000)
      });
      return response.ok;
    } catch {
      return false;
    }
  };

  const checks = {
    app: true,
    api: await checkAPI(),
    websocket: websocketService.isConnected(),
    storage: (() => {
      try {
        const testKey = '__health_check__';
        localStorage.setItem(testKey, 'test');
        localStorage.removeItem(testKey);
        return true;
      } catch {
        return false;
      }
    })()
  };

  const allHealthy = Object.values(checks).every(check => check);
  const someHealthy = Object.values(checks).some(check => check);

  return {
    status: allHealthy ? 'healthy' : someHealthy ? 'degraded' : 'unhealthy',
    checks,
    metrics: {
      version: config.APP_VERSION,
      environment: config.APP_ENV
    },
    timestamp: new Date().toISOString()
  };
}

export default HealthCheck;