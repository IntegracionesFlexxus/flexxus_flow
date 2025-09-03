const express = require('express');
const router = express.Router();

// Configurar rutas de health check
function setupHealthRoutes(monitor) {
  // Liveness check - simple y rápido
  router.get('/live', async (req, res) => {
    try {
      const result = await monitor.checkLiveness();
      const statusCode = result.status === 'alive' ? 200 : 503;
      res.status(statusCode).json(result);
    } catch (error) {
      res.status(503).json({
        status: 'dead',
        error: error.message,
        timestamp: new Date().toISOString()
      });
    }
  });

  // Alias para /live
  router.get('/liveness', async (req, res) => {
    return router.handle(req, res, () => router.handle(req, res));
  });

  // Readiness check - completo
  router.get('/ready', async (req, res) => {
    try {
      const includeDetails = req.query.details !== 'false';
      monitor.options.includeDetails = includeDetails;
      
      const result = await monitor.checkReadiness();
      const statusCode = result.status === 'healthy' ? 200 : 503;
      res.status(statusCode).json(result);
    } catch (error) {
      res.status(503).json({
        status: 'unhealthy',
        error: error.message,
        timestamp: new Date().toISOString()
      });
    }
  });

  // Alias para /ready
  router.get('/readiness', async (req, res) => {
    return router.handle(req, res, () => router.handle(req, res));
  });

  // Health check principal
  router.get('/', async (req, res) => {
    try {
      const format = req.query.format || 'json';
      const verbose = req.query.verbose === 'true';
      
      let result;
      if (verbose) {
        result = await monitor.getDetailedStatus();
      } else {
        result = await monitor.checkReadiness();
      }
      
      const statusCode = result.status === 'healthy' || result.current?.status === 'healthy' ? 200 : 503;
      
      // Formatear respuesta según formato solicitado
      if (format === 'simple') {
        res.status(statusCode).send(result.status || result.current?.status || 'unknown');
      } else if (format === 'prometheus') {
        const metrics = formatPrometheus(result);
        res.status(statusCode)
           .type('text/plain')
           .send(metrics);
      } else {
        res.status(statusCode).json(result);
      }
    } catch (error) {
      res.status(503).json({
        status: 'unhealthy',
        error: error.message,
        timestamp: new Date().toISOString()
      });
    }
  });

  // Check de componente específico
  router.get('/check/:component/:subComponent?', async (req, res) => {
    try {
      const { component, subComponent } = req.params;
      const result = await monitor.checkComponent(component, subComponent);
      const statusCode = result.status === 'healthy' ? 200 : 503;
      res.status(statusCode).json(result);
    } catch (error) {
      res.status(503).json({
        status: 'error',
        error: error.message,
        timestamp: new Date().toISOString()
      });
    }
  });

  // Métricas
  router.get('/metrics', async (req, res) => {
    try {
      const metrics = monitor.getMetrics();
      res.json(metrics);
    } catch (error) {
      res.status(500).json({
        error: error.message,
        timestamp: new Date().toISOString()
      });
    }
  });

  // Historial
  router.get('/history', (req, res) => {
    try {
      const limit = parseInt(req.query.limit) || 10;
      const history = monitor.getHistory(limit);
      res.json({
        history,
        count: history.length,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      res.status(500).json({
        error: error.message,
        timestamp: new Date().toISOString()
      });
    }
  });

  // Estado detallado
  router.get('/status', async (req, res) => {
    try {
      const status = await monitor.getDetailedStatus();
      const statusCode = status.current.status === 'healthy' ? 200 : 503;
      res.status(statusCode).json(status);
    } catch (error) {
      res.status(503).json({
        status: 'error',
        error: error.message,
        timestamp: new Date().toISOString()
      });
    }
  });

  // Dashboard HTML simple
  router.get('/dashboard', (req, res) => {
    const html = generateDashboardHTML();
    res.type('text/html').send(html);
  });

  return router;
}

// Formatear métricas para Prometheus
function formatPrometheus(result) {
  const lines = [];
  
  // Estado general
  const statusValue = result.status === 'healthy' ? 1 : 0;
  lines.push(`# HELP health_status Overall health status (1=healthy, 0=unhealthy)`);
  lines.push(`# TYPE health_status gauge`);
  lines.push(`health_status ${statusValue}`);
  
  // Tiempo de respuesta
  if (result.responseTime) {
    lines.push(`# HELP health_response_time_ms Response time in milliseconds`);
    lines.push(`# TYPE health_response_time_ms gauge`);
    lines.push(`health_response_time_ms ${result.responseTime}`);
  }
  
  // Resumen de checks
  if (result.summary) {
    lines.push(`# HELP health_checks_total Total number of health checks`);
    lines.push(`# TYPE health_checks_total gauge`);
    lines.push(`health_checks_total ${result.summary.total}`);
    
    lines.push(`# HELP health_checks_healthy Number of healthy checks`);
    lines.push(`# TYPE health_checks_healthy gauge`);
    lines.push(`health_checks_healthy ${result.summary.healthy || 0}`);
    
    lines.push(`# HELP health_checks_unhealthy Number of unhealthy checks`);
    lines.push(`# TYPE health_checks_unhealthy gauge`);
    lines.push(`health_checks_unhealthy ${result.summary.unhealthy || 0}`);
  }
  
  // Métricas adicionales
  if (result.metrics) {
    if (result.metrics.availability) {
      lines.push(`# HELP health_availability_percentage System availability percentage`);
      lines.push(`# TYPE health_availability_percentage gauge`);
      lines.push(`health_availability_percentage ${result.metrics.availability.percentage}`);
    }
    
    if (result.metrics.performance) {
      lines.push(`# HELP health_avg_response_time_ms Average response time in milliseconds`);
      lines.push(`# TYPE health_avg_response_time_ms gauge`);
      lines.push(`health_avg_response_time_ms ${result.metrics.performance.avgResponseTime}`);
    }
  }
  
  return lines.join('\n');
}

// Generar HTML del dashboard
function generateDashboardHTML() {
  return `
<!DOCTYPE html>
<html>
<head>
  <title>Health Check Dashboard</title>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      margin: 0;
      padding: 20px;
      background: #f5f5f5;
    }
    .container {
      max-width: 1200px;
      margin: 0 auto;
    }
    h1 {
      color: #333;
      margin-bottom: 30px;
    }
    .status-card {
      background: white;
      border-radius: 8px;
      padding: 20px;
      margin-bottom: 20px;
      box-shadow: 0 2px 4px rgba(0,0,0,0.1);
    }
    .status-indicator {
      display: inline-block;
      width: 12px;
      height: 12px;
      border-radius: 50%;
      margin-right: 8px;
    }
    .healthy { background: #4caf50; }
    .degraded { background: #ff9800; }
    .unhealthy { background: #f44336; }
    .metrics {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: 15px;
      margin-top: 20px;
    }
    .metric {
      background: #f9f9f9;
      padding: 15px;
      border-radius: 4px;
    }
    .metric-label {
      font-size: 12px;
      color: #666;
      text-transform: uppercase;
      margin-bottom: 5px;
    }
    .metric-value {
      font-size: 24px;
      font-weight: bold;
      color: #333;
    }
    button {
      background: #2196F3;
      color: white;
      border: none;
      padding: 10px 20px;
      border-radius: 4px;
      cursor: pointer;
      font-size: 14px;
    }
    button:hover {
      background: #1976D2;
    }
    pre {
      background: #f5f5f5;
      padding: 15px;
      border-radius: 4px;
      overflow-x: auto;
    }
  </style>
</head>
<body>
  <div class="container">
    <h1>🏥 Health Check Dashboard</h1>
    
    <div class="status-card">
      <h2>System Status</h2>
      <div id="status">Loading...</div>
    </div>
    
    <div class="status-card">
      <h2>Metrics</h2>
      <div id="metrics" class="metrics">Loading...</div>
    </div>
    
    <div class="status-card">
      <h2>Component Status</h2>
      <div id="components">Loading...</div>
    </div>
    
    <div class="status-card">
      <h2>Actions</h2>
      <button onclick="refresh()">🔄 Refresh</button>
      <button onclick="checkLiveness()">💓 Check Liveness</button>
      <button onclick="checkReadiness()">✅ Check Readiness</button>
      <button onclick="viewHistory()">📊 View History</button>
    </div>
    
    <div class="status-card" style="display:none" id="details">
      <h2>Details</h2>
      <pre id="details-content"></pre>
    </div>
  </div>
  
  <script>
    async function loadStatus() {
      try {
        const response = await fetch('/health/status');
        const data = await response.json();
        updateDashboard(data);
      } catch (error) {
        document.getElementById('status').innerHTML = 
          '<span class="status-indicator unhealthy"></span>Error loading status';
      }
    }
    
    function updateDashboard(data) {
      // Update status
      const statusHtml = 
        '<span class="status-indicator ' + data.current.status + '"></span>' +
        '<strong>' + data.current.status.toUpperCase() + '</strong> - ' +
        data.current.timestamp;
      document.getElementById('status').innerHTML = statusHtml;
      
      // Update metrics
      if (data.metrics) {
        const metricsHtml = 
          '<div class="metric">' +
            '<div class="metric-label">Uptime</div>' +
            '<div class="metric-value">' + data.metrics.uptime.human + '</div>' +
          '</div>' +
          '<div class="metric">' +
            '<div class="metric-label">Availability</div>' +
            '<div class="metric-value">' + data.metrics.availability.percentage + '%</div>' +
          '</div>' +
          '<div class="metric">' +
            '<div class="metric-label">Total Checks</div>' +
            '<div class="metric-value">' + data.metrics.checks.total + '</div>' +
          '</div>' +
          '<div class="metric">' +
            '<div class="metric-label">Avg Response</div>' +
            '<div class="metric-value">' + data.metrics.performance.avgResponseTime + 'ms</div>' +
          '</div>';
        document.getElementById('metrics').innerHTML = metricsHtml;
      }
      
      // Update components
      if (data.components) {
        let componentsHtml = '';
        for (const [name, component] of Object.entries(data.components)) {
          componentsHtml += 
            '<div style="margin: 10px 0">' +
              '<span class="status-indicator ' + component.status + '"></span>' +
              '<strong>' + name + ':</strong> ' + component.status +
            '</div>';
        }
        document.getElementById('components').innerHTML = componentsHtml;
      }
    }
    
    async function refresh() {
      loadStatus();
    }
    
    async function checkLiveness() {
      const response = await fetch('/health/live');
      const data = await response.json();
      showDetails(data);
    }
    
    async function checkReadiness() {
      const response = await fetch('/health/ready?details=true');
      const data = await response.json();
      showDetails(data);
    }
    
    async function viewHistory() {
      const response = await fetch('/health/history');
      const data = await response.json();
      showDetails(data);
    }
    
    function showDetails(data) {
      document.getElementById('details').style.display = 'block';
      document.getElementById('details-content').textContent = 
        JSON.stringify(data, null, 2);
    }
    
    // Auto-refresh cada 30 segundos
    loadStatus();
    setInterval(loadStatus, 30000);
  </script>
</body>
</html>
  `;
}

module.exports = { setupHealthRoutes };