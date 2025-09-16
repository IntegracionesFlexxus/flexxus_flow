const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const { setupProxyRoutes } = require('./routes/proxyRoutes');
const { errorHandler } = require('./middleware/errorHandler');
const { requestLogger, basicRateLimiter } = require('./middleware/requestLogger');
const { basicAuth } = require('./middleware/auth');

const app = express();

// TODO: Mover a .env en Nivel 2
const PORT = 3000;
const API_GATEWAY_NAME = 'flexxus-gateway';

// Middleware básicos
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(morgan('combined'));

// Middleware de logging personalizado
app.use(requestLogger);

// Rate limiting básico
app.use(basicRateLimiter);

// Autenticación básica
app.use(basicAuth);

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ 
    status: 'healthy',
    gateway: API_GATEWAY_NAME,
    timestamp: new Date().toISOString()
  });
});

// Configurar rutas proxy a microservicios
setupProxyRoutes(app);

// Middleware de manejo de errores
app.use(errorHandler);

// Iniciar servidor
app.listen(PORT, () => {
  console.log(`API Gateway corriendo en puerto ${PORT}`);
  console.log(`Health check disponible en http://localhost:${PORT}/health`);
});