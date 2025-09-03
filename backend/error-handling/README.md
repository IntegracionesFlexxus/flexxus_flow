# Error Handling Centralizado - Flexxus Flow

Sistema de manejo de errores centralizado implementado siguiendo lineamientos de Nivel 1 (MVP).

## Inicio Rápido

```bash
cd backend/error-handling
npm install
npm test
```

## Características Implementadas

- ✅ 15+ clases de error personalizadas
- ✅ Middleware de manejo de errores para Express
- ✅ Validación con Joi
- ✅ Sanitización de datos
- ✅ Async error handlers
- ✅ Circuit breaker pattern
- ✅ Retry logic con exponential backoff
- ✅ Error aggregation
- ✅ Estadísticas de errores
- ✅ Manejo de errores globales

## Estructura

```
error-handling/
├── src/
│   ├── errors/
│   │   └── BaseError.js         # Clases de error personalizadas
│   ├── middleware/
│   │   └── errorMiddleware.js   # Middleware para Express
│   ├── validators/
│   │   └── validators.js        # Validadores y sanitizadores
│   ├── handlers/
│   │   └── asyncHandler.js      # Manejadores async
│   ├── utils/
│   │   └── errorUtils.js        # Utilidades
│   ├── index.js                 # Entry point
│   └── test.js                  # Script de pruebas
└── package.json
```

## Uso Básico

### Inicialización

```javascript
const errorHandling = require('./error-handling');

// Se inicializa automáticamente con configuración por defecto
```

### Clases de Error

```javascript
// Errores predefinidos
throw new errorHandling.ValidationError('Datos inválidos', errors);
throw new errorHandling.NotFoundError('Usuario', '123');
throw new errorHandling.AuthenticationError('Token inválido');
throw new errorHandling.AuthorizationError('Sin permisos');
throw new errorHandling.ConflictError('Email duplicado', 'email');
throw new errorHandling.RateLimitError(60); // retry after 60s
```

### Validación con Joi

```javascript
// Usar esquemas predefinidos
const validator = errorHandling.validate('user.create');

app.post('/users', 
  validator,
  async (req, res) => {
    // req.body está validado y sanitizado
  }
);

// Validación personalizada
const customSchema = Joi.object({
  name: Joi.string().required(),
  age: Joi.number().min(18)
});

app.post('/custom',
  errorHandling.validators.validationMiddleware(customSchema),
  handler
);
```

### Async Handlers

```javascript
// Handler básico
app.get('/users',
  errorHandling.asyncHandler(async (req, res) => {
    const users = await getUsersFromDB();
    res.json(users);
  })
);

// Con retry logic
app.post('/external-api',
  errorHandling.asyncHandlerWithRetry(
    async (req, res) => {
      const result = await callExternalAPI();
      res.json(result);
    },
    { maxRetries: 3, retryDelay: 1000 }
  )
);

// Con timeout
app.get('/slow-operation',
  errorHandling.asyncTimeoutHandler(
    async (req, res) => {
      const data = await slowOperation();
      res.json(data);
    },
    5000 // 5 segundos
  )
);
```

### Circuit Breaker

```javascript
const breaker = new errorHandling.CircuitBreaker({
  threshold: 5,    // Fallos antes de abrir
  timeout: 60000,   // Tiempo en estado abierto
  resetTimeout: 30000
});

app.get('/fragile-service',
  errorHandling.asyncHandler(async (req, res) => {
    const result = await breaker.execute(async () => {
      return await fragileService.call();
    });
    res.json(result);
  })
);
```

### Configuración con Express

```javascript
const express = require('express');
const app = express();

// Configurar error handling completo
errorHandling.setupExpress(app, {
  timeout: 30000,
  contentType: 'application/json',
  enableLogging: true,
  enableSanitization: true
});

// El setup incluye:
// - Timeout handler
// - Content-Type validation
// - 404 handler
// - Error logger
// - Error sanitizer
// - Main error handler
```

## Validadores Predefinidos

### Esquemas de Usuario

```javascript
// Crear usuario
errorHandling.validateBody('user.create')

// Actualizar usuario  
errorHandling.validateBody('user.update')

// Login
errorHandling.validateBody('user.login')

// Cambiar contraseña
errorHandling.validateBody('user.changePassword')
```

### Esquemas de Empresa

```javascript
// Crear empresa
errorHandling.validateBody('company.create')

// Actualizar empresa
errorHandling.validateBody('company.update')
```

### Query Parameters

```javascript
// Paginación
errorHandling.validateQuery('query.list')

// Búsqueda
errorHandling.validateQuery('query.search')

// Filtros
errorHandling.validateQuery('query.filter')
```

## Sanitización

```javascript
// Middleware de sanitización
app.use(errorHandling.sanitize({
  fields: ['body.description', 'body.comment'],
  sanitizers: [
    errorHandling.validators.sanitizers.trimString,
    errorHandling.validators.sanitizers.normalizeWhitespace,
    errorHandling.validators.sanitizers.escapeHtml
  ]
}));

// Sanitización manual
const clean = errorHandling.validators.sanitizers.sanitizeObject(dirtyData, [
  errorHandling.validators.sanitizers.trimString,
  errorHandling.validators.sanitizers.stripHtml
]);
```

## Utilidades

### Retry Operations

```javascript
const result = await errorHandling.retryOperation(
  async (attempt) => {
    console.log(`Intento ${attempt}`);
    return await riskyOperation();
  },
  {
    maxRetries: 3,
    initialDelay: 1000,
    maxDelay: 30000,
    factor: 2
  }
);
```

### Timeout Operations

```javascript
const result = await errorHandling.withTimeout(
  longRunningOperation(),
  5000,
  'La operación tardó demasiado'
);
```

### Error Aggregation

```javascript
const aggregator = new errorHandling.ErrorAggregator();

for (const item of items) {
  try {
    await processItem(item);
  } catch (error) {
    aggregator.add(error, { item: item.id });
  }
}

if (aggregator.hasErrors()) {
  const summary = aggregator.getSummary();
  console.log('Errores:', summary);
  throw aggregator.toError();
}
```

## Estadísticas de Errores

```javascript
// Obtener estadísticas
const stats = errorHandling.getErrorStats();
console.log(`Total errores: ${stats.totalErrors}`);
console.log('Top errores:', stats.errors.slice(0, 5));

// Limpiar estadísticas
errorHandling.clearErrorStats();
```

## Manejo Global de Errores

```javascript
// Se configura automáticamente
// Maneja:
// - uncaughtException
// - unhandledRejection
// - SIGTERM, SIGINT

// Configuración personalizada
errorHandling.initialize({
  enableGlobalHandlers: true,
  exitOnUncaught: true,
  logger: customLogger
});
```

## Respuestas de Error

### Formato Estándar

```json
{
  "error": true,
  "message": "Descripción del error",
  "code": "ERROR_CODE",
  "timestamp": "2024-01-15T10:30:45.123Z"
}
```

### Con Validación

```json
{
  "error": true,
  "message": "Validation failed",
  "code": "VALIDATION_ERROR",
  "errors": [
    {
      "field": "email",
      "message": "Invalid email format",
      "type": "string.email"
    }
  ],
  "timestamp": "2024-01-15T10:30:45.123Z"
}
```

## Best Practices

1. **Usar async handlers siempre**
   ```javascript
   // BIEN
   app.get('/users', errorHandling.asyncHandler(async (req, res) => {
     // ...
   }));
   
   // MAL
   app.get('/users', async (req, res) => {
     // ...
   });
   ```

2. **Validar entrada siempre**
   ```javascript
   app.post('/users',
     errorHandling.validateBody('user.create'),
     errorHandling.sanitize(),
     handler
   );
   ```

3. **Usar errores apropiados**
   ```javascript
   // BIEN
   throw new errorHandling.NotFoundError('Usuario', userId);
   
   // MAL
   throw new Error('Usuario no encontrado');
   ```

4. **Manejar errores externos**
   ```javascript
   try {
     await externalAPI.call();
   } catch (error) {
     throw new errorHandling.ExternalServiceError('PaymentAPI', error.message);
   }
   ```

## TODOs para Nivel 2

- [ ] Integración con sistema de logging
- [ ] Usar NODE_ENV para configuración
- [ ] Métricas de errores con Prometheus
- [ ] Alertas automáticas
- [ ] Rate limiting por tipo de error
- [ ] Error tracking con Sentry
- [ ] Documentación de errores con OpenAPI
- [ ] Tests unitarios con Jest
- [ ] Internacionalización de mensajes

## Troubleshooting

### Los errores no se capturan

Asegúrate de:
1. Usar `asyncHandler` para funciones async
2. Configurar el middleware al final
3. No enviar respuesta antes del error

### Validación no funciona

Verifica:
1. El esquema existe en `schemas`
2. El middleware está antes del handler
3. Los datos están en el lugar correcto (body, query, params)

### Circuit breaker siempre abierto

Revisa:
1. El threshold no sea muy bajo
2. El timeout no sea muy largo
3. Los errores sean recuperables