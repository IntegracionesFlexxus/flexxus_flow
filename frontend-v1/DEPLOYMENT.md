# Guía de Deployment - Frontend Flexxus Flow

## Descripción General

Esta guía describe el proceso de build y deployment del frontend de Flexxus Flow siguiendo los lineamientos del Nivel 1 (MVP).

## Requisitos Previos

### Software Requerido
- Node.js 18+ y npm 9+
- Docker 20+ y Docker Compose 2+
- Git
- Linux/MacOS o WSL2 en Windows

### Accesos Necesarios
- Repositorio de código
- Servidor de deployment
- Credenciales de servicios externos (si aplica)

## Estructura del Proyecto

```
frontend-v1/
├── src/                    # Código fuente
├── public/                 # Assets públicos
├── dist/                   # Build de producción
├── scripts/                # Scripts de deployment
├── nginx.conf              # Configuración Nginx
├── Dockerfile              # Imagen Docker producción
├── Dockerfile.dev          # Imagen Docker desarrollo
├── docker-compose.yml      # Orquestación producción
└── docker-compose.dev.yml  # Orquestación desarrollo
```

## Configuración de Entorno

### 1. Variables de Entorno

Copiar y configurar el archivo de entorno:

```bash
cp .env.example .env.local
```

Variables principales:
- `VITE_API_BASE_URL`: URL del backend API
- `VITE_WS_URL`: URL del WebSocket server
- `VITE_APP_ENV`: Environment (development/staging/production)

### 2. Configuración por Ambiente

- **Development**: `.env.local`
- **Staging**: `.env.staging`
- **Production**: `.env.production`

## Build de la Aplicación

### Build Local

```bash
# Desarrollo
npm run build

# Producción
npm run build:prod

# Con análisis de bundle
npm run build:analyze
```

### Build con Docker

```bash
# Build de imagen
docker build -t flexxus-frontend .

# Build con docker-compose
docker-compose build
```

## Deployment

### Deployment Automatizado

#### Staging
```bash
chmod +x scripts/deploy-staging.sh
./scripts/deploy-staging.sh
```

#### Producción
```bash
chmod +x scripts/deploy-production.sh
./scripts/deploy-production.sh
```

### Deployment Manual

#### 1. Pre-deployment Checks
```bash
npm run deploy:check
```

#### 2. Build
```bash
npm run deploy:build
```

#### 3. Docker Deploy
```bash
# Desarrollo
docker-compose -f docker-compose.dev.yml up -d

# Producción
docker-compose up -d
```

#### 4. Verificación
```bash
# Health check
curl http://localhost/health

# Logs
docker logs flexxus-frontend
```

## Configuración Nginx

### Características Implementadas
- ✅ Compresión Gzip
- ✅ Cache de assets estáticos
- ✅ Routing SPA
- ✅ Proxy para API
- ✅ WebSocket proxy
- ✅ Security headers
- ✅ Rate limiting

### Personalización

Editar `nginx-default.conf` para ajustar:
- Cache policies
- Proxy endpoints
- Rate limits
- Security headers

## Health Checks

### Endpoint de Salud
- **URL**: `/health`
- **Respuesta OK**: `200 OK`
- **Body**: `healthy`

### Health Check Detallado
- **URL**: `/health-check`
- **Formato**: JSON
- **Información**: 
  - Estado de servicios
  - Métricas de aplicación
  - Timestamp

### Monitoreo con Docker
```bash
# Ver estado
docker ps

# Health status
docker inspect flexxus-frontend --format='{{.State.Health.Status}}'
```

## Scripts Disponibles

### Build y Development
- `npm run dev`: Servidor de desarrollo
- `npm run build`: Build de producción
- `npm run preview`: Preview del build

### Deployment
- `npm run deploy:check`: Verificaciones pre-deploy
- `npm run deploy:build`: Build optimizado
- `npm run docker:dev`: Docker desarrollo
- `npm run docker:prod`: Docker producción

### Análisis y Optimización
- `npm run analyze`: Análisis de bundle
- `npm run perf:check`: Verificación de performance
- `npm run perf:lighthouse`: Reporte Lighthouse

## Troubleshooting

### Problema: Build falla

```bash
# Limpiar cache
npm run clean:cache

# Reinstalar dependencias
rm -rf node_modules package-lock.json
npm install
```

### Problema: Container no inicia

```bash
# Ver logs
docker logs flexxus-frontend

# Reiniciar container
docker restart flexxus-frontend

# Rebuild completo
docker-compose down
docker-compose build --no-cache
docker-compose up -d
```

### Problema: Health check falla

1. Verificar que el puerto 80 esté disponible
2. Revisar configuración de nginx
3. Verificar conectividad con backend

```bash
# Test directo
curl -v http://localhost/health

# Logs de nginx
docker exec flexxus-frontend cat /var/log/nginx/error.log
```

## Rollback

### Rollback Rápido

```bash
# Listar imágenes con backup
docker images | grep flexxus-frontend

# Restaurar versión anterior
docker tag flexxus-frontend:backup-20240101-120000 flexxus-frontend:latest
docker-compose up -d
```

### Rollback Manual

1. Detener container actual
2. Restaurar imagen anterior
3. Reiniciar servicios
4. Verificar health

## Optimizaciones de Producción

### 1. Bundle Size
- Code splitting automático
- Lazy loading de rutas
- Tree shaking habilitado
- Minificación con Terser

### 2. Caching
- Assets con hash en filename
- Cache headers configurados
- Service worker ready (Nivel 2)

### 3. Performance
- Compresión Gzip/Brotli
- HTTP/2 ready
- CDN compatible
- Optimización de imágenes

## Monitoreo Post-Deploy

### Verificaciones Inmediatas
1. ✅ Health check passing
2. ✅ Página principal carga
3. ✅ API conectada
4. ✅ WebSocket funcional
5. ✅ Assets cargando correctamente

### Métricas a Monitorear
- Response time < 200ms
- Error rate < 1%
- CPU usage < 50%
- Memory usage < 512MB

## Seguridad

### Headers Implementados
- Content-Security-Policy
- X-Frame-Options
- X-Content-Type-Options
- X-XSS-Protection
- Strict-Transport-Security

### Mejores Prácticas
- ✅ HTTPS en producción
- ✅ Variables sensibles en env
- ✅ Rate limiting configurado
- ✅ Logs sin información sensible

## CI/CD (TODO Nivel 2)

### GitHub Actions (Próximo)
```yaml
# .github/workflows/deploy.yml
name: Deploy
on:
  push:
    branches: [main]
jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - run: npm install
      - run: npm run build:prod
      - run: docker build -t flexxus-frontend .
      # Deploy to server
```

## Checklist de Deployment

### Pre-deployment
- [ ] Código en rama correcta
- [ ] Tests pasando
- [ ] Build local exitoso
- [ ] Variables de entorno configuradas
- [ ] Backup de versión actual

### Deployment
- [ ] Build de producción
- [ ] Docker image creada
- [ ] Container iniciado
- [ ] Health check passing

### Post-deployment
- [ ] Verificación manual de funcionalidad
- [ ] Monitoreo de errores
- [ ] Performance aceptable
- [ ] Notificación al equipo

## Contacto y Soporte

Para problemas con el deployment:
1. Revisar logs: `docker logs flexxus-frontend`
2. Consultar esta documentación
3. Contactar al equipo de DevOps

## Próximos Pasos (Nivel 2)

- [ ] CI/CD pipeline completo
- [ ] Auto-scaling
- [ ] Blue-green deployment
- [ ] Monitoring avanzado
- [ ] CDN integration
- [ ] PWA features
- [ ] Kubernetes deployment