# API Gateway - Flexxus Flow

API Gateway implementado con Express.js siguiendo lineamientos de Nivel 1 (MVP).

## Inicio Rápido

```bash
cd backend/api-gateway
npm install
npm run dev
```

## Endpoints

- `GET /health` - Health check del gateway
- `/api/auth/*` - Proxy a servicio de autenticación (puerto 3001)
- `/api/users/*` - Proxy a servicio de usuarios (puerto 3002)
- `/api/orders/*` - Proxy a servicio de órdenes (puerto 3003)
- `/api/products/*` - Proxy a servicio de productos (puerto 3004)
- `/api/notifications/*` - Proxy a servicio de notificaciones (puerto 3005)

## Características Implementadas

- ✅ Routing básico a microservicios
- ✅ Manejo de errores global
- ✅ Logging de requests/responses
- ✅ Rate limiting básico (100 req/min)
- ✅ Autenticación con API key
- ✅ CORS habilitado
- ✅ Health check

## TODOs para Nivel 2

- [ ] Mover configuración a variables de entorno (.env)
- [ ] Implementar JWT y OAuth 2.0
- [ ] Rate limiting con Redis
- [ ] Circuit breaker para microservicios
- [ ] Métricas con Prometheus
- [ ] Cache con Redis
- [ ] WebSocket support
- [ ] Load balancing

## Estructura

```
api-gateway/
├── src/
│   ├── index.js           # Entry point
│   ├── routes/
│   │   └── proxyRoutes.js  # Configuración de proxies
│   ├── middleware/
│   │   ├── auth.js         # Autenticación básica
│   │   ├── errorHandler.js # Manejo de errores
│   │   └── requestLogger.js # Logging y rate limiting
│   └── utils/
│       └── helpers.js      # Funciones auxiliares
└── package.json
```

## Testing

Para probar el gateway:

```bash
# Health check
curl http://localhost:3000/health

# Con API key
curl -H "x-api-key: your-32-character-api-key-here-minimum" http://localhost:3000/api/users
```