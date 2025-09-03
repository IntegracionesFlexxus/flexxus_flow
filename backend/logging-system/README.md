# Sistema de Logging - Flexxus Flow

Sistema de logging centralizado implementado con Winston siguiendo lineamientos de Nivel 1 (MVP).

## Inicio Rápido

```bash
cd backend/logging-system
npm install
npm test
```

## Características Implementadas

- ✅ Múltiples niveles de log (error, warn, info, http, debug)
- ✅ Rotación automática de archivos
- ✅ Formateo diferente para desarrollo/producción
- ✅ Logs categorizados (app, error, access, database, security, performance)
- ✅ Middleware para Express
- ✅ Request ID tracking
- ✅ Performance monitoring
- ✅ Auditoría de acciones
- ✅ Compresión de logs antiguos
- ✅ Limpieza automática

## Estructura

```
logging-system/
├── src/
│   ├── config/
│   │   └── loggingConfig.js      # Configuración central
│   ├── formatters/
│   │   └── logFormatters.js      # Formatos para diferentes ambientes
│   ├── transports/
│   │   └── fileTransports.js     # Transports con rotación
│   ├── loggers/
│   │   └── Logger.js             # Clase principal del logger
│   ├── middleware/
│   │   └── expressMiddleware.js  # Middleware para Express
│   ├── utils/
│   │   └── cleanLogs.js         # Utilidades de mantenimiento
│   ├── index.js                  # Entry point
│   └── test.js                   # Script de pruebas
├── logs/                         # Directorio de logs (generado)
└── package.json
```

## Uso Básico

### Inicialización

```javascript
const logging = require('./logging-system');

// El sistema se inicializa automáticamente
```

### Logging Básico

```javascript
// Diferentes niveles
logging.error('Error crítico', new Error('Database connection failed'));
logging.warn('Advertencia', { threshold: 100, current: 150 });
logging.info('Información', { event: 'user_login' });
logging.debug('Debug', { details: 'información detallada' });
```

### Logging con Contexto

```javascript
// Crear logger con contexto específico
const logger = logging.createLogger('auth', {
  module: 'authentication',
  version: '1.0.0'
});

logger.info('Usuario autenticado', { userId: 123 });
```

### Performance Monitoring

```javascript
// Medir duración de operaciones
const timer = logging.startTimer('database_query');
// ... ejecutar operación ...
timer.end({ rows: 100 }); // Log automático con duración
```

### Auditoría

```javascript
logging.audit('CREATE_USER', 'user:456', 'success', {
  admin: 'admin@example.com',
  ip: '192.168.1.1'
});
```

### Logging de Base de Datos

```javascript
logging.database('SELECT', 'SELECT * FROM users', 145, {
  rows: 50,
  cached: false
});
```

### Seguridad

```javascript
logging.security('FAILED_LOGIN', {
  username: 'user@example.com',
  ip: '192.168.1.100',
  attempts: 3
});
```

## Integración con Express

```javascript
const express = require('express');
const logging = require('./logging-system');

const app = express();

// Configurar logging completo
logging.setupExpress(app, {
  morgan: { format: 'combined' },
  winston: true,
  performance: true,
  audit: {
    actions: ['POST', 'PUT', 'DELETE']
  }
});

// Usar logger en rutas
app.get('/api/users', (req, res) => {
  req.logger.info('Fetching users');
  // ...
});
```

## Archivos de Log

### Categorías

- `app-*.log` - Logs generales de la aplicación
- `error-*.log` - Solo errores
- `access-*.log` - Logs de acceso HTTP
- `database-*.log` - Queries y operaciones de BD
- `security-*.log` - Eventos de seguridad
- `performance-*.log` - Métricas de performance
- `combined-*.log` - Todos los logs (solo desarrollo)

### Rotación

- Rotación diaria automática
- Retención configurable (default: 14 días)
- Compresión automática de archivos antiguos
- Límite de tamaño por archivo (20MB)

## Formatos de Log

### Desarrollo
```
2024-01-15 10:30:45 [INFO]: Usuario autenticado
  {
    "userId": 123,
    "email": "user@example.com"
  }
```

### Producción
```json
{
  "timestamp": "2024-01-15T10:30:45.123Z",
  "level": "info",
  "message": "Usuario autenticado",
  "userId": 123,
  "email": "user@example.com",
  "service": "flexxus-backend"
}
```

## Mantenimiento

### Ver Estadísticas

```bash
npm run clean -- stats
```

### Limpiar Logs Antiguos

```bash
npm run clean -- clean 7  # Mantener solo 7 días
```

### Archivar Logs

```bash
npm run clean -- archive
```

## Configuración

### Variables de Entorno (TODO: Nivel 2)

```env
LOG_LEVEL=info
LOG_FORMAT=json
LOG_DIR=./logs
LOG_MAX_FILES=14d
LOG_MAX_SIZE=20m
```

### Niveles de Log

1. `error` - Errores críticos
2. `warn` - Advertencias
3. `info` - Información general
4. `http` - Requests HTTP
5. `verbose` - Información detallada
6. `debug` - Debug
7. `silly` - Todo

## API Principal

### Métodos de Logging

- `error(message, error, metadata)`
- `warn(message, metadata)`
- `info(message, metadata)`
- `debug(message, metadata)`

### Métodos Especializados

- `performance(operation, duration, metadata)`
- `audit(action, resource, result, metadata)`
- `database(operation, query, duration, metadata)`
- `security(event, metadata)`

### Utilidades

- `startTimer(label)` - Iniciar medición de tiempo
- `getLogger(category)` - Obtener logger por categoría
- `createLogger(category, metadata)` - Crear logger con contexto
- `setupExpress(app, options)` - Configurar para Express
- `getStats()` - Obtener estadísticas
- `cleanLogs(days)` - Limpiar logs antiguos

## Middleware para Express

### Request ID
Agrega ID único a cada request

### Performance
Mide tiempo de respuesta

### Audit
Registra acciones importantes

### Error Logger
Captura y registra errores

## Best Practices

1. **Usar categorías apropiadas**
   ```javascript
   const logger = logging.getLogger('auth');
   ```

2. **Incluir contexto relevante**
   ```javascript
   logging.info('Operación completada', {
     userId: req.user.id,
     duration: timer.end()
   });
   ```

3. **No loggear información sensible**
   ```javascript
   // MAL
   logging.info('Login', { password: '123456' });
   
   // BIEN
   logging.info('Login', { username: 'user@example.com' });
   ```

4. **Usar niveles apropiados**
   - Error: Fallos que requieren atención
   - Warn: Situaciones anormales pero manejables
   - Info: Eventos importantes del negocio
   - Debug: Información de desarrollo

## TODOs para Nivel 2

- [ ] Integración con servicios externos (Datadog, ELK)
- [ ] Métricas con Prometheus
- [ ] Configuración desde variables de entorno
- [ ] Filtrado dinámico de logs
- [ ] Logs estructurados con campos personalizados
- [ ] Rate limiting de logs
- [ ] Alertas automáticas
- [ ] Dashboard de visualización
- [ ] Tests unitarios con Jest

## Troubleshooting

### Los logs no se escriben

```bash
# Verificar permisos del directorio
ls -la ./logs

# Crear directorio manualmente
mkdir -p logs
```

### Archivos muy grandes

```bash
# Limpiar logs antiguos
npm run clean -- clean 1
```

### Ver logs en tiempo real

```bash
# Linux/Mac
tail -f logs/app-*.log

# Windows
Get-Content logs/app-*.log -Wait
```