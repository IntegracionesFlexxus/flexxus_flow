# Configuration Manager - Gestión de Configuración

Módulo de gestión de configuración centralizada implementado siguiendo lineamientos de Nivel 1 (MVP).

## Inicio Rápido

```bash
cd backend/config-manager

# Copiar archivo de configuración
cp .env.example .env

# Editar .env con tus valores
nano .env

# Instalar dependencias
npm install

# Validar configuración
npm run validate

# Ejecutar pruebas
npm test
```

## Características Implementadas

- ✅ Carga de variables de entorno (.env)
- ✅ Validación con Joi
- ✅ Configuraciones por ambiente (dev, prod, test, staging)
- ✅ Configuración de servidor, bases de datos y seguridad
- ✅ Helpers para acceso fácil a configuración
- ✅ Validación de fortaleza de contraseñas
- ✅ Soporte para múltiples bases de datos
- ✅ Feature flags
- ✅ Recarga de configuración en caliente

## Estructura

```
config-manager/
├── src/
│   ├── loaders/
│   │   └── envLoader.js        # Carga de variables de entorno
│   ├── validators/
│   │   └── configValidator.js  # Validación con Joi
│   ├── configs/
│   │   ├── serverConfig.js     # Configuración del servidor
│   │   ├── databaseConfig.js   # Configuración de bases de datos
│   │   └── securityConfig.js   # Configuración de seguridad
│   ├── index.js                # Entry point y API principal
│   ├── test.js                 # Script de pruebas
│   └── validate.js             # Script de validación
├── .env.example                # Plantilla de variables de entorno
└── package.json
```

## Uso Básico

### Inicialización

```javascript
const config = require('./config-manager');

// Inicializar configuración
const configuration = config.initialize();

// Verificar ambiente
if (config.isDevelopment()) {
  console.log('Modo desarrollo');
}
```

### Acceso a Configuración

```javascript
// Obtener configuración del servidor
const serverConfig = config.getConfig('server');
console.log(`Puerto: ${serverConfig.server.port}`);

// Obtener configuración de base de datos
const dbConfig = config.databaseConfig.get('shared');
console.log(`DB: ${dbConfig.database}`);

// Obtener variable de entorno
const apiKey = config.getEnv('API_KEY', 'default-key');
```

### Feature Flags

```javascript
// Verificar si una feature está habilitada
if (config.isFeatureEnabled('registration')) {
  // Habilitar registro de usuarios
}

// Obtener todas las features
const features = config.serverConfig.getFeatures();
```

### Validación de Contraseñas

```javascript
const validation = config.securityConfig.validatePasswordStrength('MyP@ssw0rd');

if (validation.valid) {
  console.log('Contraseña válida');
} else {
  console.log('Errores:', validation.errors);
}
```

### Connection Strings

```javascript
// Obtener configuración para pg Pool
const pgConfig = config.databaseConfig.getPgConfig('shared');

// Obtener connection string
const connString = config.databaseConfig.getConnectionString('shared');
```

## Variables de Entorno

### Requeridas

- `NODE_ENV` - Ambiente (development, production, test, staging)
- `JWT_SECRET` - Secret para JWT (mínimo 32 caracteres)
- `SHARED_DB_*` - Configuración de base de datos compartida

### Opcionales pero Recomendadas

- `PORT` - Puerto del servidor (default: 3000)
- `CORS_ORIGIN` - Orígenes permitidos para CORS
- `SMTP_*` - Configuración de email
- `REDIS_*` - Configuración de cache
- `FEATURE_*` - Feature flags

## Configuración por Ambiente

El sistema carga archivos en este orden de prioridad:

1. `.env.{ambiente}.local` (ej: .env.production.local)
2. `.env.{ambiente}` (ej: .env.production)
3. `.env.local`
4. `.env`

## Scripts Disponibles

```bash
# Validar configuración actual
npm run validate

# Ejecutar pruebas
npm test

# Desarrollo con hot reload
npm run dev
```

## Validación

El sistema valida automáticamente:

- Tipos de datos correctos
- Valores dentro de rangos permitidos
- Variables requeridas presentes
- Formato de emails, URLs, etc.

```bash
# Ejecutar validación completa
npm run validate
```

## API Principal

### Métodos Principales

- `initialize()` - Inicializar configuración
- `getConfig(section)` - Obtener sección de configuración
- `getEnv(key, default)` - Obtener variable de entorno
- `isDevelopment()` - Verificar si es desarrollo
- `isProduction()` - Verificar si es producción
- `isFeatureEnabled(feature)` - Verificar feature flag
- `reload()` - Recargar configuración
- `validate()` - Validar configuración actual
- `getSummary()` - Obtener resumen

## Seguridad

### Política de Contraseñas

Configurable mediante variables:

- `PASSWORD_MIN_LENGTH` - Longitud mínima (default: 8)
- `PASSWORD_REQUIRE_UPPERCASE` - Requerir mayúsculas
- `PASSWORD_REQUIRE_LOWERCASE` - Requerir minúsculas
- `PASSWORD_REQUIRE_NUMBERS` - Requerir números
- `PASSWORD_REQUIRE_SPECIAL` - Requerir caracteres especiales

### JWT Configuration

- Secret mínimo de 32 caracteres
- Expiración configurable
- Soporte para refresh tokens

## TODOs para Nivel 2

- [ ] Encriptación de valores sensibles
- [ ] Configuración desde múltiples fuentes (archivos, API, etc.)
- [ ] Hot reload automático de configuración
- [ ] Vault integration para secrets
- [ ] Schemas de validación más complejos
- [ ] Configuración distribuida
- [ ] Auditoría de cambios de configuración
- [ ] Tests unitarios con Jest

## Troubleshooting

### Error: Variables requeridas faltantes

```bash
# Verificar qué variables faltan
npm run validate

# Copiar ejemplo y configurar
cp .env.example .env
```

### Error: JWT_SECRET muy corto

El JWT_SECRET debe tener mínimo 32 caracteres. Genera uno seguro:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

### Warning: Configuración de email no encontrada

Las notificaciones por email estarán deshabilitadas. Para habilitarlas, configura las variables SMTP_*.