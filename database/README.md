# 🗄️ Database Sprint 1 - Flexxus Flow

Sistema de base de datos multi-tenant para Flexxus Flow implementado con PostgreSQL, siguiendo lineamientos de **Nivel 1 (MVP Funcional)**.

## 📋 Resumen

Este sprint implementa la infraestructura básica de bases de datos con:
- ✅ 5 bases de datos PostgreSQL separadas por dominio
- ✅ Tablas core para autenticación y multi-tenancy
- ✅ Scripts de migración y seeding
- ✅ Módulo de conexión para Node.js
- ✅ Repositorios básicos para CRUD
- ✅ Scripts de backup automatizado

## 🏗️ Arquitectura

```
database/
├── migrations/          # Scripts SQL de creación de tablas
├── seeds/              # Datos iniciales de prueba
├── scripts/            # Scripts de utilidad (setup, migrate, backup)
├── config/             # Módulo de conexión Node.js
├── repositories/       # Repositorios con operaciones CRUD
└── backups/           # Directorio para backups (generado)
```

## 🚀 Inicio Rápido

### 1. Prerequisitos

- PostgreSQL 14+ instalado
- Node.js 18+
- Usuario postgres con permisos de creación de BD

### 2. Setup Inicial

```bash
# Navegar al directorio de database
cd database/scripts

# Dar permisos de ejecución
chmod +x *.sh

# Ejecutar setup inicial (crea las 5 bases de datos)
./setup_databases.sh

# Ejecutar migraciones
./migrate.sh
```

### 3. Credenciales de Prueba

Después de ejecutar las migraciones con datos de seed:

```
Email: admin@demo.com
Password: admin123
```

## 📊 Bases de Datos

| Base de Datos | Propósito | Tablas Principales |
|--------------|-----------|-------------------|
| `flexxus_shared` | Autenticación y multi-tenancy | companies, users, user_companies |
| `flexxus_personas` | CRM y contactos | contacts |
| `flexxus_omni` | Omnicanalidad | (Sprint 2) |
| `flexxus_notificaciones` | Sistema de notificaciones | (Sprint 2) |
| `flexxus_organizaciones` | Estructura organizacional | (Sprint 3) |

## 🔌 Uso en Node.js

### Conexión Básica

```javascript
const db = require('./database/config/database');

// Query simple
const result = await db.query(
  'SELECT * FROM users WHERE email = $1',
  ['admin@demo.com'],
  'shared'  // nombre de la base de datos
);

// Transacción
await db.transaction(async (client) => {
  await client.query('INSERT INTO companies ...');
  await client.query('INSERT INTO users ...');
}, 'shared');
```

### Usando Repositorios

```javascript
const userRepository = require('./database/repositories/userRepository');
const companyRepository = require('./database/repositories/companyRepository');

// Crear usuario
const user = await userRepository.create({
  email: 'nuevo@ejemplo.com',
  password: 'password123',
  firstName: 'Juan',
  lastName: 'Pérez'
});

// Verificar login
const { valid, user } = await userRepository.verifyPassword(
  'admin@demo.com',
  'admin123'
);

// Obtener empresas del usuario
const companies = await userRepository.getCompanies(user.id);
```

## 🛠️ Scripts Disponibles

### setup_databases.sh
Crea las 5 bases de datos y configura usuario de aplicación.

```bash
./scripts/setup_databases.sh
```

### migrate.sh
Ejecuta todas las migraciones SQL en orden.

```bash
./scripts/migrate.sh
```

### backup.sh
Realiza backup de todas las bases de datos.

```bash
./scripts/backup.sh
```

Los backups se guardan en `database/backups/` con formato:
- `flexxus_shared_20240115_143022.sql.gz`
- `flexxus_personas_20240115_143022.sql.gz`
- etc.

## 🏷️ Esquema de Tablas

### companies
```sql
- id (UUID, PK)
- name (VARCHAR)
- tax_id (VARCHAR, UNIQUE)
- plan (VARCHAR) -- basic, professional, enterprise
- status (VARCHAR) -- active, suspended, cancelled
- settings (JSONB)
- created_at, updated_at (TIMESTAMP)
```

### users
```sql
- id (UUID, PK)
- email (VARCHAR, UNIQUE)
- password_hash (VARCHAR)
- first_name, last_name (VARCHAR)
- phone (VARCHAR)
- is_active (BOOLEAN)
- email_verified (BOOLEAN)
- last_login_at (TIMESTAMP)
- created_at, updated_at (TIMESTAMP)
```

### user_companies
```sql
- id (UUID, PK)
- user_id (UUID, FK → users)
- company_id (UUID, FK → companies)
- role (VARCHAR) -- admin, manager, member
- is_default (BOOLEAN)
- status (VARCHAR) -- active, invited, suspended
- created_at, updated_at (TIMESTAMP)
```

### contacts
```sql
- id (UUID, PK)
- company_id (UUID)
- first_name, last_name (VARCHAR)
- email, phone (VARCHAR)
- contact_type (VARCHAR) -- lead, customer, prospect
- status (VARCHAR)
- extra_data (JSONB)
- assigned_user_id (UUID)
- created_at, updated_at (TIMESTAMP)
```

## ⚠️ TODOs para Nivel 2

Los siguientes elementos están hardcodeados y deben moverse a variables de entorno:

1. **Credenciales de BD**
   - Usuario: `flexxus_app`
   - Password: `app_password_123`
   - Host/Puerto: `localhost:5432`

2. **Configuración de Pools**
   - Max conexiones: 20
   - Timeout: 30000ms

3. **Bcrypt Rounds**
   - Salt rounds: 10

4. **Nombres de Bases de Datos**
   - Todos los nombres están hardcodeados

### Archivo .env futuro
```env
# Database
DB_USER=flexxus_app
DB_PASSWORD=secure_password_here
DB_HOST=localhost
DB_PORT=5432

# Database Names
DB_NAME_SHARED=flexxus_shared
DB_NAME_PERSONAS=flexxus_personas
DB_NAME_OMNI=flexxus_omni

# Pool Config
DB_POOL_MAX=20
DB_POOL_IDLE_TIMEOUT=30000

# Security
BCRYPT_ROUNDS=10
```

## 🧪 Testing

Para verificar que todo funciona:

```javascript
// test-db.js
const db = require('./database/config/database');
const userRepo = require('./database/repositories/userRepository');

async function test() {
  // Verificar conexiones
  await db.checkConnection('shared');
  await db.checkConnection('personas');
  
  // Probar login
  const result = await userRepo.verifyPassword('admin@demo.com', 'admin123');
  console.log('Login exitoso:', result.valid);
  
  // Cerrar conexiones
  await db.closeAll();
}

test().catch(console.error);
```

## 🔒 Seguridad

### Implementado (Nivel 1)
- ✅ Passwords hasheados con bcrypt
- ✅ Separación de bases de datos por dominio
- ✅ Validación básica de roles
- ✅ SQL injection prevention (parametrized queries)

### Pendiente (Nivel 2+)
- ⏳ Row Level Security (RLS)
- ⏳ Auditoría de cambios
- ⏳ Encriptación de datos sensibles
- ⏳ SSL para conexiones
- ⏳ Rotación de credenciales

## 📈 Performance

### Índices Creados
- `idx_companies_status` - Búsquedas por estado
- `idx_users_email` - Login rápido
- `idx_user_companies_user_id` - Empresas de usuario
- `idx_contacts_company_id` - Contactos por empresa

### Optimizaciones Aplicadas
- Connection pooling (20 conexiones max)
- Índices en campos de búsqueda frecuente
- JSONB para datos flexibles
- Triggers para updated_at automático

## 🐛 Troubleshooting

### Error: "FATAL: password authentication failed"
```bash
# Verificar credenciales en postgresql.conf
sudo nano /etc/postgresql/14/main/pg_hba.conf
# Cambiar "peer" a "md5" para conexiones locales
```

### Error: "database does not exist"
```bash
# Ejecutar setup inicial
./scripts/setup_databases.sh
```

### Error: "permission denied"
```bash
# Dar permisos de ejecución
chmod +x scripts/*.sh
```

## 📚 Referencias

- [PostgreSQL 14 Docs](https://www.postgresql.org/docs/14/)
- [node-postgres](https://node-postgres.com/)
- [bcrypt](https://www.npmjs.com/package/bcrypt)

## ✅ Checklist de Entrega

- [x] 5 bases de datos creadas
- [x] Tablas core implementadas
- [x] Scripts de migración funcionando
- [x] Datos de seed para testing
- [x] Módulo de conexión Node.js
- [x] Repositorios básicos CRUD
- [x] Script de backup
- [x] Documentación completa
- [x] TODOs marcados para Nivel 2

---

**Sprint 1 - Database Team** | Nivel 1 (MVP) | Enero 2024