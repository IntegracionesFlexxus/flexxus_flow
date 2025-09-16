// Middleware de manejo de errores global
function errorHandler(err, req, res, next) {
  // Log del error para debugging
  console.error('Error en API Gateway:', {
    timestamp: new Date().toISOString(),
    method: req.method,
    path: req.path,
    error: err.message,
    stack: err.stack
  });

  // Determinar código de estado
  const statusCode = err.statusCode || err.status || 500;
  
  // Respuesta base de error
  const errorResponse = {
    error: true,
    message: err.message || 'Error interno del servidor',
    timestamp: new Date().toISOString(),
    path: req.path
  };

  // Agregar detalles adicionales en desarrollo
  // TODO: Usar variable de entorno NODE_ENV en Nivel 2
  const isDevelopment = true;
  if (isDevelopment) {
    errorResponse.stack = err.stack;
    errorResponse.details = err.details || null;
  }

  res.status(statusCode).json(errorResponse);
}

// Middleware para capturar errores 404
function notFoundHandler(req, res, next) {
  const error = new Error(`Ruta no encontrada: ${req.originalUrl}`);
  error.statusCode = 404;
  next(error);
}

module.exports = {
  errorHandler,
  notFoundHandler
};