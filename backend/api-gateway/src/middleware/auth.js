const { isValidApiKey } = require('../utils/helpers');

// TODO: Implementar JWT y OAuth en Nivel 2
// Por ahora solo validación básica de API key

// Middleware de autenticación básica
function basicAuth(req, res, next) {
  const apiKey = req.headers['x-api-key'] || req.query.apiKey;
  
  // Rutas públicas que no requieren autenticación
  const publicRoutes = ['/health', '/api/auth/login', '/api/auth/register'];
  
  if (publicRoutes.includes(req.path)) {
    return next();
  }
  
  if (!apiKey) {
    return res.status(401).json({
      error: 'Unauthorized',
      message: 'API key requerida',
      timestamp: new Date().toISOString()
    });
  }
  
  if (!isValidApiKey(apiKey)) {
    return res.status(401).json({
      error: 'Unauthorized',
      message: 'API key inválida',
      timestamp: new Date().toISOString()
    });
  }
  
  // Agregar info de usuario al request
  // TODO: Obtener info real del usuario desde servicio auth
  req.user = {
    id: 'temp-user-id',
    apiKey: apiKey.substring(0, 8) + '...',
    authenticated: true
  };
  
  next();
}

// Middleware para verificar permisos específicos
function requirePermission(permission) {
  return (req, res, next) => {
    // TODO: Implementar verificación real de permisos en Nivel 2
    const userPermissions = ['read', 'write']; // Mock permissions
    
    if (!userPermissions.includes(permission)) {
      return res.status(403).json({
        error: 'Forbidden',
        message: `Permiso '${permission}' requerido`,
        timestamp: new Date().toISOString()
      });
    }
    
    next();
  };
}

module.exports = {
  basicAuth,
  requirePermission
};