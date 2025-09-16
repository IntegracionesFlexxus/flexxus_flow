# Health Check System - Flexxus Flow

Sistema completo de Health Check para monitoreo de salud implementado siguiendo lineamientos de Nivel 1 (MVP).

## Inicio Rápido

```bash
cd backend/health-check
npm install

# Modo standalone (servidor independiente)
npm start

# Ejecutar pruebas
npm test
```

## Características Implementadas

- ✅ Checks del sistema (CPU, memoria, disco, uptime)
- ✅ Checks de bases de datos (PostgreSQL)
- ✅ Checks de servicios externos (HTTP, TCP, Redis)
- ✅ Agregación de estados (healthy, degraded, unhealthy)
- ✅ Endpoints REST completos
- ✅ Dashboard HTML interactivo
- ✅ Métricas y disponibilidad
- ✅ Historial de checks
- ✅ Formato Prometheus
- ✅ Webhooks para notificaciones

## Estructura

```
health-check/
├── src/
│   ├── checks/
│   │   ├── SystemCheck.js      # Checks del sistema
│   │   ├── DatabaseCheck.js    # Checks de bases de datos
│   │   └── ServiceCheck.js     # Checks de servicios externos
│   ├── monitors/
│   │   └── HealthMonitor.js    # Monitor principal
│   ├── routes/
│   │   └── healthRoutes.js     # Endpoints REST
│   ├── middleware/
│   │   └── healthMiddleware.js # Middleware de seguridad
│   ├── index.js                # Entry point
│   └── test.js                 # Script de pruebas
└── package.json
```

## Uso Básico

### Modo Standalone

```javascript
const { createHealthCheckSystem } = require('./health-check');

const healthSystem = createHealthCheckSystem({
  port: 3001,
  standalone: true,
  monitor: {
    includeDetails: true,
    parallel: true
  }
});

await healthSystem.initialize();
```

### Integración con Express

```javascript
const express = require('express');
const { createHealthCheckSystem } = require('./health-check');

const app = express();
const healthSystem = createHealthCheckSystem({ standalone: false });

// Integrar en tu app
healthSystem.integrate(app, {
  basePath: '/health',
  middleware: {
    cors: true,
    auth: false,
    rateLimit: true
  }
});
```

## Endpoints

### Liveness Check
```bash
GET /health/live
GET /health/liveness

# Respuesta
{
  "status": "alive",
  "timestamp": "2024-01-15T10:30:00.000Z",
  "uptime": 3600,
  "memory": { "heapUsed": 45.23 }
}
```

### Readiness Check
```bash
GET /health/ready
GET /health/readiness

# Con detalles
GET /health/ready?details=true

# Respuesta
{
  "status": "healthy",
  "timestamp": "2024-01-15T10:30:00.000Z",
  "responseTime": 125,
  "summary": {
    "total": 15,
    "healthy": 14,
    "degraded": 1,
    "unhealthy": 0
  }
}
```

### Health Check Principal
```bash
GET /health
GET /health?verbose=true
GET /health?format=simple
GET /health?format=prometheus
```

### Check de Componentes
```bash
# Sistema
GET /health/check/system
GET /health/check/system/memory
GET /health/check/system/cpu
GET /health/check/system/disk

# Bases de datos
GET /health/check/database
GET /health/check/database/shared
GET /health/check/database/omni

# Servicios
GET /health/check/service
GET /health/check/service/redis
GET /health/check/service/apiGateway
```

### Métricas
```bash
GET /health/metrics

# Respuesta
{
  "uptime": {
    "milliseconds": 3600000,
    "human": "1h"
  },
  "checks": {
    "total": 150,
    "history": 100
  },
  "availability": {
    "percentage": 99.5,
    "healthy": 149,
    "total": 150
  },
  "performance": {
    "avgResponseTime": 125,
    "lastResponseTime": 110
  }
}
```

### Historial
```bash
GET /health/history
GET /health/history?limit=20
```

### Dashboard
```bash
GET /health/dashboard
```

Abre en navegador: `http://localhost:3001/health/dashboard`

## Configuración

### Sistema
```javascript
{
  system: {
    memoryThreshold: 90,  // % de uso de memoria
    cpuThreshold: 80,     // % de uso de CPU
    diskThreshold: 85     // % de uso de disco
  }
}
```

### Bases de Datos
```javascript
{
  database: {
    databases: {
      shared: { /* config PostgreSQL */ },
      omni: { /* config PostgreSQL */ }
    },
    timeout: 5000
  }
}
```

### Servicios Externos
```javascript
{
  services: {
    redis: {
      type: 'redis',
      host: 'localhost',
      port: 6379
    },
    apiGateway: {
      type: 'http',
      url: 'http://localhost:3000/health',
      expectedStatus: 200
    }
  }
}
```

## Estados de Salud

- **healthy** - Todo funcionando correctamente
- **degraded** - Funcionando con problemas menores
- **unhealthy** - Problemas críticos detectados
- **unknown** - No se pudo determinar el estado

## Middleware de Seguridad

### Autenticación
```javascript
{
  auth: {
    enabled: true,
    token: 'secret-health-token',
    header: 'x-health-token'
  }
}
```

### Rate Limiting
```javascript
{
  rateLimit: {
    windowMs: 60000,
    maxRequests: 100,
    message: 'Too many health check requests'
  }
}
```

### CORS
```javascript
{
  cors: {
    origin: '*',
    methods: 'GET',
    headers: 'Content-Type, X-Health-Token'
  }
}
```

## Checks Automáticos

```javascript
// Programar checks cada minuto
healthSystem.scheduleChecks(60000);

// Detener checks
healthSystem.stopScheduledChecks();
```

## Webhooks

```javascript
healthSystem.setWebhook('http://alert-service/webhook', {
  events: ['unhealthy', 'degraded'],
  headers: {
    'X-Service': 'health-check'
  },
  method: 'POST'
});
```

## Formato Prometheus

```bash
GET /health?format=prometheus

# Respuesta
# HELP health_status Overall health status
# TYPE health_status gauge
health_status 1
# HELP health_response_time_ms Response time in milliseconds
# TYPE health_response_time_ms gauge
health_response_time_ms 125
```

## Integración con Kubernetes

### Liveness Probe
```yaml
livenessProbe:
  httpGet:
    path: /health/live
    port: 3001
  initialDelaySeconds: 30
  periodSeconds: 10
```

### Readiness Probe
```yaml
readinessProbe:
  httpGet:
    path: /health/ready
    port: 3001
  initialDelaySeconds: 10
  periodSeconds: 5
```

## Best Practices

1. **Usar liveness para verificación básica**
   - Solo verifica que el proceso esté vivo
   - Debe ser rápido (<1s)

2. **Usar readiness para verificación completa**
   - Verifica todas las dependencias
   - Puede tomar más tiempo

3. **No incluir detalles en producción**
   ```javascript
   GET /health/ready?details=false
   ```

4. **Configurar timeouts apropiados**
   ```javascript
   {
     timeout: 5000 // 5 segundos máximo
   }
   ```

5. **Monitorear métricas**
   - Revisar disponibilidad periódicamente
   - Alertar si baja del 99%

## TODOs para Nivel 2

- [ ] Usar variables de entorno para configuración
- [ ] Integración con sistemas de monitoreo (Datadog, New Relic)
- [ ] Métricas más detalladas
- [ ] Checks personalizables dinámicamente
- [ ] Almacenamiento persistente de historial
- [ ] Alertas avanzadas con escalamiento
- [ ] Tests unitarios con Jest
- [ ] Soporte para GraphQL health checks
- [ ] Checks de certificados SSL

## Troubleshooting

### Checks fallando constantemente

1. Verificar conectividad a servicios
2. Revisar credenciales de bases de datos
3. Aumentar timeouts si es necesario

### Dashboard no carga

Verificar que el puerto esté disponible:
```bash
lsof -i :3001  # Linux/Mac
netstat -an | findstr :3001  # Windows
```

### Rate limiting activado

Aumentar límites o desactivar para desarrollo:
```javascript
{
  rateLimit: false
}
```