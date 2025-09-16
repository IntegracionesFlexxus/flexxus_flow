const { createProxyMiddleware } = require('http-proxy-middleware');

// TODO: Mover URLs a .env en Nivel 2
const SERVICES = {
  auth: {
    url: 'http://localhost:3001',
    path: '/api/auth'
  },
  users: {
    url: 'http://localhost:3002',
    path: '/api/users'
  },
  orders: {
    url: 'http://localhost:3003',
    path: '/api/orders'
  },
  products: {
    url: 'http://localhost:3004',
    path: '/api/products'
  },
  notifications: {
    url: 'http://localhost:3005',
    path: '/api/notifications'
  }
};

// Configuración base para todos los proxies
const proxyOptions = (target) => ({
  target,
  changeOrigin: true,
  onProxyReq: (proxyReq, req, res) => {
    // Agregar headers personalizados si es necesario
    proxyReq.setHeader('X-Gateway-Time', new Date().toISOString());
    proxyReq.setHeader('X-Original-IP', req.ip);
  },
  onProxyRes: (proxyRes, req, res) => {
    // Agregar headers de respuesta
    proxyRes.headers['X-Proxy-By'] = 'flexxus-gateway';
  },
  onError: (err, req, res) => {
    console.error('Proxy Error:', err);
    res.status(503).json({
      error: 'Service Unavailable',
      message: 'El servicio solicitado no está disponible',
      timestamp: new Date().toISOString()
    });
  }
});

// Configurar todas las rutas proxy
function setupProxyRoutes(app) {
  console.log('Configurando rutas proxy para microservicios...');
  
  Object.entries(SERVICES).forEach(([service, config]) => {
    app.use(
      config.path,
      createProxyMiddleware(proxyOptions(config.url))
    );
    console.log(`✓ Proxy configurado: ${config.path} -> ${config.url}`);
  });

  // Ruta catch-all para endpoints no definidos
  app.all('/api/*', (req, res) => {
    res.status(404).json({
      error: 'Not Found',
      message: 'El endpoint solicitado no existe',
      path: req.path,
      timestamp: new Date().toISOString()
    });
  });
}

module.exports = {
  setupProxyRoutes,
  SERVICES
};