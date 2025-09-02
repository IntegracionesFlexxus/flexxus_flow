# Sprint 01 - Database Team

## Información del Sprint
- **Duración:** Semanas 1-2 (2 semanas)
- **Equipo:** Database Team (2 desarrolladores)
- **Objetivo:** Establecer la infraestructura de base de datos multi-database y fundamentos de multi-tenancy

## Objetivos Específicos

### Objetivo Principal
Configurar la arquitectura completa de bases de datos PostgreSQL con separación por dominios y establecer las bases sólidas para multi-tenancy y seguridad.

### Objetivos Técnicos
1. Configurar servidor PostgreSQL con 4 bases de datos separadas
2. Implementar tablas core del sistema de autenticación
3. Establecer Row-Level Security para multi-tenancy
4. Configurar connection pooling optimizado
5. Crear scripts de migración y seeding
6. Establecer procedimientos de backup básico

## Tareas Detalladas

### 1. Setup PostgreSQL Multi-Database Architecture

#### 1.1 Instalación y Configuración PostgreSQL
```bash
# PostgreSQL 14+ con extensiones necesarias
sudo apt update
sudo apt install postgresql-14 postgresql-contrib-14

# Extensiones requeridas
sudo -u postgres psql -c "CREATE EXTENSION IF NOT EXISTS \"uuid-ossp\";"
sudo -u postgres psql -c "CREATE EXTENSION IF NOT EXISTS \"pg_trgm\";"
sudo -u postgres psql -c "CREATE EXTENSION IF NOT EXISTS \"btree_gin\";"
```

#### 1.2 Creación de Bases de Datos
```sql
-- Crear databases separadas
CREATE DATABASE shared_db 
    WITH ENCODING 'UTF8' 
    LC_COLLATE='es_AR.UTF-8' 
    LC_CTYPE='es_AR.UTF-8';

CREATE DATABASE omni_db 
    WITH ENCODING 'UTF8' 
    LC_COLLATE='es_AR.UTF-8' 
    LC_CTYPE='es_AR.UTF-8';

CREATE DATABASE crm_db 
    WITH ENCODING 'UTF8' 
    LC_COLLATE='es_AR.UTF-8' 
    LC_CTYPE='es_AR.UTF-8';

CREATE DATABASE workflow_db 
    WITH ENCODING 'UTF8' 
    LC_COLLATE='es_AR.UTF-8' 
    LC_CTYPE='es_AR.UTF-8';

CREATE DATABASE analytics_db 
    WITH ENCODING 'UTF8' 
    LC_COLLATE='es_AR.UTF-8' 
    LC_CTYPE='es_AR.UTF-8';
```

#### 1.3 Configuración de Usuarios y Permisos
```sql
-- Usuario aplicación con permisos específicos
CREATE USER app_user WITH PASSWORD 'secure_password_here';

-- Permisos por base de datos
GRANT CONNECT ON DATABASE shared_db TO app_user;
GRANT CONNECT ON DATABASE omni_db TO app_user;
GRANT CONNECT ON DATABASE crm_db TO app_user;
GRANT CONNECT ON DATABASE workflow_db TO app_user;
GRANT CONNECT ON DATABASE analytics_db TO app_user;

-- Esquemas y permisos detallados se configurarán por DB
```

### 2. Implementar Shared DB con Tablas Core

#### 2.1 Migration Script: 001_create_companies.sql
```sql
-- Tabla de empresas (tenants)
CREATE TABLE companies (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    legal_name VARCHAR(255),
    tax_id VARCHAR(50), -- CUIT, RUT, etc.
    plan VARCHAR(50) NOT NULL DEFAULT 'basic', -- basic, professional, enterprise
    status VARCHAR(50) NOT NULL DEFAULT 'active', -- active, suspended, cancelled
    
    -- Configuraciones específicas de la empresa
    settings JSONB DEFAULT '{}',
    
    -- Metadatos de facturación
    billing_email VARCHAR(255),
    billing_address JSONB,
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    deleted_at TIMESTAMP WITH TIME ZONE
);

-- Índices para performance
CREATE INDEX idx_companies_status ON companies(status) WHERE deleted_at IS NULL;
CREATE INDEX idx_companies_plan ON companies(plan) WHERE deleted_at IS NULL;
CREATE INDEX idx_companies_tax_id ON companies(tax_id) WHERE deleted_at IS NULL;
```

#### 2.2 Migration Script: 002_create_users.sql
```sql
-- Tabla de usuarios del sistema
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    
    -- Información personal
    first_name VARCHAR(100),
    last_name VARCHAR(100),
    avatar_url VARCHAR(500),
    
    -- Configuraciones de usuario
    timezone VARCHAR(50) DEFAULT 'America/Argentina/Buenos_Aires',
    language VARCHAR(10) DEFAULT 'es',
    
    -- Estado y seguridad
    status VARCHAR(50) NOT NULL DEFAULT 'active', -- active, inactive, suspended
    email_verified_at TIMESTAMP WITH TIME ZONE,
    last_login_at TIMESTAMP WITH TIME ZONE,
    password_changed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    deleted_at TIMESTAMP WITH TIME ZONE
);

-- Índices para performance
CREATE UNIQUE INDEX idx_users_email_active ON users(email) WHERE deleted_at IS NULL;
CREATE INDEX idx_users_status ON users(status) WHERE deleted_at IS NULL;
CREATE INDEX idx_users_last_login ON users(last_login_at) WHERE deleted_at IS NULL;
```

#### 2.3 Migration Script: 003_create_user_companies.sql
```sql
-- Tabla de relación usuarios-empresas (M:N)
CREATE TABLE user_companies (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    
    -- Rol específico en esta empresa
    role VARCHAR(50) NOT NULL, -- admin, manager, sales_rep, agent, viewer
    
    -- Permisos específicos (JSON para flexibilidad)
    permissions JSONB DEFAULT '{}',
    
    -- Empresa por defecto para este usuario
    is_default BOOLEAN DEFAULT false,
    
    -- Estado de la relación
    status VARCHAR(50) NOT NULL DEFAULT 'active', -- active, suspended, invited
    invited_by_user_id UUID REFERENCES users(id),
    invitation_accepted_at TIMESTAMP WITH TIME ZONE,
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    deleted_at TIMESTAMP WITH TIME ZONE,
    
    -- Constraints
    UNIQUE(user_id, company_id)
);

-- Índices para performance
CREATE INDEX idx_user_companies_user_id ON user_companies(user_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_user_companies_company_id ON user_companies(company_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_user_companies_role ON user_companies(role) WHERE deleted_at IS NULL;
CREATE INDEX idx_user_companies_default ON user_companies(user_id, is_default) WHERE is_default = true AND deleted_at IS NULL;

-- Trigger para asegurar solo una empresa por defecto por usuario
CREATE OR REPLACE FUNCTION ensure_single_default_company() 
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.is_default = true THEN
        UPDATE user_companies 
        SET is_default = false 
        WHERE user_id = NEW.user_id 
        AND id != NEW.id 
        AND deleted_at IS NULL;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_ensure_single_default_company
    BEFORE INSERT OR UPDATE ON user_companies
    FOR EACH ROW
    EXECUTE FUNCTION ensure_single_default_company();
```

### 3. Implementar Row-Level Security

#### 3.1 RLS Setup Script: 004_setup_rls.sql
```sql
-- Habilitar RLS en todas las tablas multi-tenant
ALTER TABLE companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_companies ENABLE ROW LEVEL SECURITY;

-- Función para obtener company_id del contexto actual
CREATE OR REPLACE FUNCTION get_current_company_id() 
RETURNS UUID AS $$
BEGIN
    RETURN COALESCE(
        NULLIF(current_setting('app.current_company_id', true), ''),
        '00000000-0000-0000-0000-000000000000'
    )::UUID;
EXCEPTION
    WHEN OTHERS THEN
        RETURN '00000000-0000-0000-0000-000000000000'::UUID;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Política para companies (solo admins pueden ver todas, usuarios normales solo la suya)
CREATE POLICY company_access_policy ON companies
    FOR ALL TO app_user
    USING (id = get_current_company_id() OR 
           EXISTS (
               SELECT 1 FROM user_companies uc 
               WHERE uc.company_id = companies.id 
               AND uc.user_id = get_current_user_id()
               AND uc.role IN ('admin', 'manager')
               AND uc.deleted_at IS NULL
           ));

-- Política para user_companies (solo ver relaciones de tu empresa)
CREATE POLICY user_companies_policy ON user_companies
    FOR ALL TO app_user
    USING (company_id = get_current_company_id());
```

### 4. Connection Pooling Configuration

#### 4.1 PgBouncer Configuration
```ini
# /etc/pgbouncer/pgbouncer.ini
[databases]
shared_db = host=localhost port=5432 dbname=shared_db
omni_db = host=localhost port=5432 dbname=omni_db
crm_db = host=localhost port=5432 dbname=crm_db
workflow_db = host=localhost port=5432 dbname=workflow_db
analytics_db = host=localhost port=5432 dbname=analytics_db

[pgbouncer]
pool_mode = transaction
listen_port = 6432
listen_addr = localhost
auth_type = md5
auth_file = /etc/pgbouncer/userlist.txt

# Pool sizes per database
default_pool_size = 20
min_pool_size = 5
reserve_pool_size = 5
reserve_pool_timeout = 5

# Connection limits
max_client_conn = 1000
max_db_connections = 100

# Timeouts
server_connect_timeout = 15
server_login_retry = 15
query_timeout = 0
query_wait_timeout = 120
client_idle_timeout = 0
server_idle_timeout = 600
```

### 5. Scripts de Migración y Seeding

#### 5.1 Migration Framework Structure
```bash
database/
├── migrations/
│   ├── shared_db/
│   │   ├── 001_create_companies.sql
│   │   ├── 002_create_users.sql
│   │   ├── 003_create_user_companies.sql
│   │   └── 004_setup_rls.sql
│   ├── omni_db/
│   ├── crm_db/
│   ├── workflow_db/
│   └── analytics_db/
├── seeds/
│   ├── shared_db/
│   │   ├── 001_seed_companies.sql
│   │   └── 002_seed_admin_user.sql
│   └── ...
├── scripts/
│   ├── migrate.sh
│   ├── seed.sh
│   └── rollback.sh
└── README.md
```

#### 5.2 Seed Data Script: 001_seed_companies.sql
```sql
-- Empresa de desarrollo para testing
INSERT INTO companies (
    id,
    name,
    legal_name,
    tax_id,
    plan,
    status,
    settings,
    billing_email
) VALUES (
    '550e8400-e29b-41d4-a716-446655440000',
    'Acme Corp',
    'Acme Corporation S.A.',
    '30-12345678-9',
    'enterprise',
    'active',
    '{
        "timezone": "America/Argentina/Buenos_Aires",
        "currency": "ARS",
        "language": "es",
        "features": {
            "crm": true,
            "workflows": true,
            "analytics": true,
            "erp_integration": true
        }
    }',
    'billing@acme.com'
);

-- Usuario administrador inicial
INSERT INTO users (
    id,
    email,
    password_hash,
    first_name,
    last_name,
    status,
    email_verified_at
) VALUES (
    '550e8400-e29b-41d4-a716-446655440010',
    'admin@acme.com',
    '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewlpfwNX5mKDvp3u', -- password: admin123
    'Admin',
    'User',
    'active',
    NOW()
);

-- Relación usuario-empresa
INSERT INTO user_companies (
    id,
    user_id,
    company_id,
    role,
    is_default,
    status,
    invitation_accepted_at
) VALUES (
    '550e8400-e29b-41d4-a716-446655440020',
    '550e8400-e29b-41d4-a716-446655440010',
    '550e8400-e29b-41d4-a716-446655440000',
    'admin',
    true,
    'active',
    NOW()
);
```

### 6. Backup y Monitoring Setup

#### 6.1 Backup Script: backup.sh
```bash
#!/bin/bash
BACKUP_DIR="/var/backups/postgresql"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")

# Crear directorio si no existe
mkdir -p $BACKUP_DIR

# Backup de cada base de datos
databases=("shared_db" "omni_db" "crm_db" "workflow_db" "analytics_db")

for db in "${databases[@]}"
do
    echo "Backing up $db..."
    pg_dump -h localhost -U postgres $db | gzip > "$BACKUP_DIR/${db}_${TIMESTAMP}.sql.gz"
    
    if [ $? -eq 0 ]; then
        echo "$db backup completed successfully"
    else
        echo "ERROR: $db backup failed"
        exit 1
    fi
done

# Limpiar backups antiguos (mantener últimos 7 días)
find $BACKUP_DIR -name "*.sql.gz" -mtime +7 -delete

echo "All database backups completed successfully"
```

## Criterios de Aceptación

### Funcionales
- [ ] 5 bases de datos PostgreSQL creadas y funcionando
- [ ] Tablas core (companies, users, user_companies) creadas con constraints
- [ ] RLS policies permitiendo acceso solo a datos de empresa correspondiente
- [ ] Usuario de aplicación puede conectar a todas las bases de datos
- [ ] Seed data inicial permite login de admin user
- [ ] Migration scripts ejecutan sin errores

### Técnicos
- [ ] Connection pooling configurado con PgBouncer
- [ ] Índices optimizados para queries principales (< 10ms para lookups simples)
- [ ] Backup automático funcionando y testado
- [ ] Scripts de migración versionados y documentados
- [ ] Monitoring básico de conexiones y performance
- [ ] Logs de PostgreSQL configurados apropiadamente

### Seguridad
- [ ] RLS bloqueando acceso cross-tenant
- [ ] Usuario de aplicación con mínimos privilegios necesarios
- [ ] Passwords seguros y no hardcodeados
- [ ] Conexiones SSL configuradas
- [ ] Audit logging habilitado para cambios en datos críticos

## Riesgos y Mitigaciones

### Riesgo: Complejidad de RLS affecting performance
**Mitigación:** Extensive testing con datos simulados y query optimization

### Riesgo: Connection pool exhaustion bajo carga
**Mitigación:** Monitoring de connection usage y alertas configuradas

### Riesgo: Migration failures en production
**Mitigación:** Rollback procedures documentados y testados

## Entregables

### Scripts SQL
1. `001_create_companies.sql` - Tabla de empresas
2. `002_create_users.sql` - Tabla de usuarios
3. `003_create_user_companies.sql` - Relaciones user-company
4. `004_setup_rls.sql` - Row Level Security policies
5. `001_seed_companies.sql` - Datos iniciales

### Configuraciones
1. `postgresql.conf` - Configuración optimizada PostgreSQL
2. `pgbouncer.ini` - Connection pooling configuration
3. `backup.sh` - Script de backup automatizado
4. `migrate.sh` - Script de migraciones
5. `rollback.sh` - Script de rollback

### Documentación
1. `DATABASE_SETUP.md` - Instrucciones de configuración
2. `MIGRATION_GUIDE.md` - Guía de migraciones
3. `BACKUP_PROCEDURES.md` - Procedimientos de backup y recovery
4. `PERFORMANCE_TUNING.md` - Optimizaciones de performance

## Testing Strategy

### Unit Tests
- RLS policies enforcement
- Trigger functions correctness
- Constraint validation
- Migration rollback procedures

### Integration Tests
- Multi-database connections
- Cross-database reference validation
- Connection pooling under load
- Backup and restore procedures

### Performance Tests
- Query performance con 100K+ records simulados
- Connection pool efficiency
- RLS policy overhead measurement
- Index effectiveness validation

## Dependencies

### Externas
- PostgreSQL 14+ installed y configurado
- PgBouncer para connection pooling
- Sistema operativo con timezone Argentina configurado

### Internas
- Definición final de environment variables
- Network configuration para database access
- Security policies acordadas con equipo