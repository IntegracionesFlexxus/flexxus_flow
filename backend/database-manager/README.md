# Database Manager - Gestión de Conexiones a Base de Datos

Módulo de gestión de conexiones a bases de datos PostgreSQL implementado con Node.js siguiendo lineamientos de Nivel 1 (MVP).

## Inicio Rápido

```bash
cd backend/database-manager
npm install
npm run dev
```

## Características Implementadas

- ✅ Pool de conexiones para múltiples bases de datos
- ✅ Repositorio base con operaciones CRUD
- ✅ Repositorios específicos (User, Company)
- ✅ Health check para todas las conexiones
- ✅ Manejo de transacciones
- ✅ Monitoreo opcional de conexiones
- ✅ Soft delete por defecto
- ✅ Timestamps automáticos

## Estructura

```
database-manager/
├── src/
│   ├── config/
│   │   └── databases.js       # Configuración de bases de datos
│   ├── connections/
│   │   ├── DatabaseConnection.js  # Clase de conexión individual
│   │   └── ConnectionManager.js   # Manager de múltiples conexiones
│   ├── repositories/
│   │   ├── BaseRepository.js      # Repositorio base con CRUD
│   │   ├── UserRepository.js      # Repositorio de usuarios
│   │   └── CompanyRepository.js   # Repositorio de empresas
│   ├── utils/
│   │   └── healthCheck.js         # Servicio de health check
│   ├── index.js                   # Entry point y exports
│   └── test.js                    # Script de pruebas
└── package.json
```

## Uso Básico

### Inicialización

```javascript
const dbManager = require('./database-manager');

// Inicializar todas las conexiones
await dbManager.initialize();
```

### Usar Repositorios

```javascript
// Repositorio de usuarios
const userRepo = new dbManager.UserRepository();

// Crear usuario
const user = await userRepo.createUser({
  email: 'user@example.com',
  username: 'johndoe',
  first_name: 'John',
  last_name: 'Doe'
});

// Buscar usuario
const foundUser = await userRepo.findByEmail('user@example.com');

// Actualizar usuario
await userRepo.update(user.id, { role: 'admin' });
```

### Queries Directos

```javascript
// Query simple
const results = await dbManager.query('shared', 
  'SELECT * FROM users WHERE role = $1', 
  ['admin']
);

// Transacción
await dbManager.transaction('shared', async (client) => {
  await client.query('INSERT INTO users ...');
  await client.query('UPDATE companies ...');
});
```

### Health Check

```javascript
// Verificar estado de todas las conexiones
const health = await dbManager.healthCheckService.check();
console.log(health.overall); // 'healthy' o 'degraded'

// Iniciar monitoreo automático
dbManager.healthCheckService.startMonitoring(30000); // cada 30 segundos
```

## Bases de Datos Configuradas

- **shared**: Usuarios y empresas
- **omni**: Datos de omnicanalidad
- **crm**: Datos de CRM
- **workflow**: Datos de workflows
- **analytics**: Datos de analytics

## API de BaseRepository

Todos los repositorios heredan estos métodos:

- `findById(id)` - Buscar por ID
- `findAll(filters, options)` - Buscar todos con filtros
- `findOneBy(field, value)` - Buscar uno por campo
- `create(data)` - Crear registro
- `update(id, data)` - Actualizar registro
- `delete(id)` - Soft delete
- `hardDelete(id)` - Delete permanente
- `count(filters)` - Contar registros
- `exists(field, value)` - Verificar existencia
- `bulkCreate(dataArray)` - Inserción masiva

## Testing

```bash
# Ejecutar pruebas básicas
npm test
```

## TODOs para Nivel 2

- [ ] Mover credenciales a variables de entorno (.env)
- [ ] Implementar migraciones automáticas
- [ ] Agregar connection retry con exponential backoff
- [ ] Implementar query builder
- [ ] Agregar cache de queries
- [ ] Métricas de performance
- [ ] Logging estructurado con Winston
- [ ] Validación de esquemas con Joi
- [ ] Tests unitarios con Jest

## Consideraciones de Seguridad

⚠️ **IMPORTANTE**: Las credenciales están hardcodeadas temporalmente. Mover a `.env` antes de cualquier despliegue.

## Manejo de Errores

El módulo maneja automáticamente:
- Errores de conexión
- Timeouts de queries
- Rollback de transacciones
- Reconexión automática del pool

## Performance

- Pool de conexiones configurado por base de datos
- Reutilización eficiente de conexiones
- Timeout configurable para queries
- Liberación automática de conexiones idle