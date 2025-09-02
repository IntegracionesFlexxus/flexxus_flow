# Sprint 02 - Database Team

## Información del Sprint
- **Duración:** Semanas 3-4 (2 semanas)
- **Equipo:** Database Team (2 desarrolladores)
- **Objetivo:** Implementar sistema completo de planes, feature flags y autenticación avanzada

## Objetivos Específicos

### Objetivo Principal
Completar la infraestructura de multi-tenancy con sistema de planes dinámicos, feature flags granulares y gestión avanzada de sesiones de usuario.

### Objetivos Técnicos
1. Implementar sistema de planes y características por suscripción
2. Crear feature flags dinámicos con configuración granular
3. Establecer gestión de sesiones segura con JWT
4. Implementar auditoría de actividades de usuario
5. Optimizar performance con índices avanzados
6. Crear procedimientos de testing con datos de volumen

## Tareas Detalladas

### 1. Sistema de Planes y Suscripciones

#### 1.1 Migration Script: 005_create_plans.sql
```sql
-- Tabla de planes de suscripción
CREATE TABLE plans (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) NOT NULL,
    display_name VARCHAR(150) NOT NULL,
    description TEXT,
    
    -- Precios
    price_monthly DECIMAL(10,2),
    price_yearly DECIMAL(10,2),
    currency VARCHAR(3) DEFAULT 'USD',
    
    -- Configuración de características
    features JSONB NOT NULL DEFAULT '{}',
    limits JSONB NOT NULL DEFAULT '{}',
    
    -- Configuración de facturación
    billing_interval VARCHAR(20) DEFAULT 'monthly', -- monthly, yearly
    trial_days INTEGER DEFAULT 0,
    
    -- Estado y visibilidad
    active BOOLEAN DEFAULT true,
    public BOOLEAN DEFAULT true, -- Si aparece en pricing público
    sort_order INTEGER DEFAULT 0,
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    deleted_at TIMESTAMP WITH TIME ZONE
);

-- Índices para performance
CREATE INDEX idx_plans_active ON plans(active) WHERE deleted_at IS NULL;
CREATE INDEX idx_plans_public ON plans(public, active) WHERE deleted_at IS NULL;
CREATE INDEX idx_plans_sort_order ON plans(sort_order) WHERE active = true AND deleted_at IS NULL;

-- Índice GIN para búsquedas en features y limits
CREATE INDEX idx_plans_features ON plans USING gin(features);
CREATE INDEX idx_plans_limits ON plans USING gin(limits);
```

#### 1.2 Migration Script: 006_create_feature_flags.sql
```sql
-- Tabla de feature flags dinámicos por empresa
CREATE TABLE feature_flags (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    feature_name VARCHAR(100) NOT NULL,
    
    -- Estado del feature
    enabled BOOLEAN DEFAULT false,
    
    -- Configuración específica del feature
    config JSONB DEFAULT '{}',
    
    -- Configuración de rollout
    rollout_percentage INTEGER DEFAULT 100, -- 0-100% de usuarios
    rollout_rules JSONB DEFAULT '{}', -- Reglas específicas de rollout
    
    -- Metadata
    description TEXT,
    category VARCHAR(50), -- ui, api, integration, etc.
    environment VARCHAR(20) DEFAULT 'production', -- development, staging, production
    
    -- Fechas de activación
    starts_at TIMESTAMP WITH TIME ZONE,
    expires_at TIMESTAMP WITH TIME ZONE,
    
    -- Audit trail
    created_by_user_id UUID REFERENCES users(id),
    updated_by_user_id UUID REFERENCES users(id),
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    deleted_at TIMESTAMP WITH TIME ZONE,
    
    -- Constraints
    UNIQUE(company_id, feature_name, environment),
    CHECK (rollout_percentage >= 0 AND rollout_percentage <= 100)
);

-- Índices para performance de feature flag lookup
CREATE INDEX idx_feature_flags_company_feature ON feature_flags(company_id, feature_name) 
    WHERE deleted_at IS NULL;
CREATE INDEX idx_feature_flags_enabled ON feature_flags(company_id, enabled) 
    WHERE deleted_at IS NULL;
CREATE INDEX idx_feature_flags_environment ON feature_flags(environment, enabled) 
    WHERE deleted_at IS NULL;

-- Índice para rollout queries
CREATE INDEX idx_feature_flags_rollout ON feature_flags(company_id, feature_name, rollout_percentage) 
    WHERE enabled = true AND deleted_at IS NULL;

-- Índice GIN para búsquedas en config y rollout_rules
CREATE INDEX idx_feature_flags_config ON feature_flags USING gin(config);
CREATE INDEX idx_feature_flags_rollout_rules ON feature_flags USING gin(rollout_rules);
```

### 2. Gestión de Sesiones JWT

#### 2.1 Migration Script: 007_create_user_sessions.sql
```sql
-- Tabla de sesiones de usuario
CREATE TABLE user_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    
    -- Token information
    token_hash VARCHAR(255) NOT NULL UNIQUE, -- Hash del JWT para invalidación
    refresh_token_hash VARCHAR(255) UNIQUE, -- Hash del refresh token
    
    -- Session metadata
    device_info JSONB DEFAULT '{}', -- User agent, IP, device type
    ip_address INET,
    user_agent TEXT,
    device_fingerprint VARCHAR(255),
    
    -- Geographic info
    country VARCHAR(2),
    city VARCHAR(100),
    timezone VARCHAR(50),
    
    -- Session state
    active BOOLEAN DEFAULT true,
    last_activity_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Expiration
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    refresh_expires_at TIMESTAMP WITH TIME ZONE,
    
    -- Security flags
    is_suspicious BOOLEAN DEFAULT false,
    force_logout BOOLEAN DEFAULT false,
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices para performance
CREATE INDEX idx_user_sessions_user_company ON user_sessions(user_id, company_id) 
    WHERE active = true;
CREATE INDEX idx_user_sessions_token_hash ON user_sessions(token_hash) 
    WHERE active = true;
CREATE INDEX idx_user_sessions_refresh_token ON user_sessions(refresh_token_hash) 
    WHERE active = true;
CREATE INDEX idx_user_sessions_expires_at ON user_sessions(expires_at) 
    WHERE active = true;
CREATE INDEX idx_user_sessions_last_activity ON user_sessions(last_activity_at) 
    WHERE active = true;

-- Índice para cleanup de sesiones expiradas
CREATE INDEX idx_user_sessions_expired ON user_sessions(expires_at) 
    WHERE active = true AND expires_at < NOW();
```

#### 2.2 Session Management Functions
```sql
-- Función para cleanup automático de sesiones expiradas
CREATE OR REPLACE FUNCTION cleanup_expired_sessions() 
RETURNS INTEGER AS $$
DECLARE
    cleaned_count INTEGER;
BEGIN
    UPDATE user_sessions 
    SET active = false, updated_at = NOW() 
    WHERE active = true 
    AND (expires_at < NOW() OR refresh_expires_at < NOW());
    
    GET DIAGNOSTICS cleaned_count = ROW_COUNT;
    
    -- Log cleanup activity
    INSERT INTO system_logs (level, message, metadata, created_at)
    VALUES ('info', 'Cleaned up expired sessions', 
            jsonb_build_object('cleaned_sessions', cleaned_count), NOW());
    
    RETURN cleaned_count;
END;
$$ LANGUAGE plpgsql;

-- Función para invalidar sesiones de usuario
CREATE OR REPLACE FUNCTION invalidate_user_sessions(p_user_id UUID, p_except_session_id UUID DEFAULT NULL)
RETURNS INTEGER AS $$
DECLARE
    invalidated_count INTEGER;
BEGIN
    UPDATE user_sessions 
    SET active = false, 
        force_logout = true,
        updated_at = NOW() 
    WHERE user_id = p_user_id 
    AND active = true 
    AND (p_except_session_id IS NULL OR id != p_except_session_id);
    
    GET DIAGNOSTICS invalidated_count = ROW_COUNT;
    RETURN invalidated_count;
END;
$$ LANGUAGE plpgsql;
```

### 3. Auditoría de Actividades

#### 3.1 Migration Script: 008_create_audit_log.sql
```sql
-- Tabla de auditoría de actividades de usuario
CREATE TABLE user_activity_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    company_id UUID REFERENCES companies(id) ON DELETE SET NULL,
    session_id UUID REFERENCES user_sessions(id) ON DELETE SET NULL,
    
    -- Actividad
    action VARCHAR(100) NOT NULL, -- login, logout, create_contact, etc.
    entity_type VARCHAR(50), -- user, contact, opportunity, etc.
    entity_id UUID, -- ID de la entidad afectada
    
    -- Contexto de la acción
    description TEXT,
    metadata JSONB DEFAULT '{}',
    
    -- Información técnica
    ip_address INET,
    user_agent TEXT,
    request_id UUID, -- Para correlacionar con logs de aplicación
    
    -- Resultado
    success BOOLEAN DEFAULT true,
    error_message TEXT,
    
    -- Timestamp
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices para queries de auditoría
CREATE INDEX idx_user_activity_user_company ON user_activity_log(user_id, company_id);
CREATE INDEX idx_user_activity_action ON user_activity_log(action, created_at DESC);
CREATE INDEX idx_user_activity_entity ON user_activity_log(entity_type, entity_id);
CREATE INDEX idx_user_activity_created_at ON user_activity_log(created_at DESC);
CREATE INDEX idx_user_activity_session ON user_activity_log(session_id) 
    WHERE session_id IS NOT NULL;

-- Índice compuesto para reporting
CREATE INDEX idx_user_activity_reporting ON user_activity_log(company_id, action, created_at DESC);

-- Partición por mes para performance (preparación)
-- CREATE TABLE user_activity_log_y2024m01 PARTITION OF user_activity_log
-- FOR VALUES FROM ('2024-01-01') TO ('2024-02-01');
```

#### 3.2 Audit Triggers Setup
```sql
-- Función genérica para audit trail
CREATE OR REPLACE FUNCTION audit_trigger_function()
RETURNS TRIGGER AS $$
DECLARE
    old_data JSONB;
    new_data JSONB;
    current_user_id UUID;
    current_company_id UUID;
BEGIN
    -- Obtener contexto actual
    BEGIN
        current_user_id := NULLIF(current_setting('app.current_user_id', true), '')::UUID;
        current_company_id := NULLIF(current_setting('app.current_company_id', true), '')::UUID;
    EXCEPTION
        WHEN OTHERS THEN
            current_user_id := NULL;
            current_company_id := NULL;
    END;
    
    -- Preparar datos para el log
    IF TG_OP = 'DELETE' THEN
        old_data := to_jsonb(OLD);
        new_data := NULL;
    ELSIF TG_OP = 'UPDATE' THEN
        old_data := to_jsonb(OLD);
        new_data := to_jsonb(NEW);
    ELSIF TG_OP = 'INSERT' THEN
        old_data := NULL;
        new_data := to_jsonb(NEW);
    END IF;
    
    -- Insertar en audit log
    INSERT INTO user_activity_log (
        user_id,
        company_id,
        action,
        entity_type,
        entity_id,
        description,
        metadata,
        created_at
    ) VALUES (
        current_user_id,
        current_company_id,
        TG_OP || '_' || TG_TABLE_NAME,
        TG_TABLE_NAME,
        COALESCE(NEW.id, OLD.id),
        TG_OP || ' on ' || TG_TABLE_NAME,
        jsonb_build_object(
            'old_data', old_data,
            'new_data', new_data,
            'table_name', TG_TABLE_NAME,
            'operation', TG_OP
        ),
        NOW()
    );
    
    IF TG_OP = 'DELETE' THEN
        RETURN OLD;
    ELSE
        RETURN NEW;
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Aplicar audit triggers a tablas importantes
CREATE TRIGGER audit_companies_trigger
    AFTER INSERT OR UPDATE OR DELETE ON companies
    FOR EACH ROW EXECUTE FUNCTION audit_trigger_function();

CREATE TRIGGER audit_users_trigger
    AFTER INSERT OR UPDATE OR DELETE ON users
    FOR EACH ROW EXECUTE FUNCTION audit_trigger_function();

CREATE TRIGGER audit_user_companies_trigger
    AFTER INSERT OR UPDATE OR DELETE ON user_companies
    FOR EACH ROW EXECUTE FUNCTION audit_trigger_function();
```

### 4. Optimización de Performance

#### 4.1 Advanced Indexing Strategy
```sql
-- Índices compuestos para queries complejas
CREATE INDEX idx_users_active_company_lookup ON users(email, status) 
    WHERE deleted_at IS NULL;

CREATE INDEX idx_user_companies_active_role ON user_companies(user_id, company_id, role) 
    WHERE deleted_at IS NULL AND status = 'active';

-- Índices para feature flag lookups (hot path)
CREATE INDEX idx_feature_flags_hot_lookup ON feature_flags(company_id, feature_name, enabled, rollout_percentage) 
    WHERE deleted_at IS NULL;

-- Índices para session management
CREATE INDEX idx_user_sessions_active_user ON user_sessions(user_id, last_activity_at DESC) 
    WHERE active = true;

-- Índices para audit queries
CREATE INDEX idx_audit_user_recent ON user_activity_log(user_id, created_at DESC) 
    WHERE created_at > NOW() - INTERVAL '30 days';
```

#### 4.2 Performance Monitoring Views
```sql
-- Vista para monitorear performance de feature flags
CREATE VIEW v_feature_flag_performance AS
SELECT 
    ff.company_id,
    ff.feature_name,
    ff.enabled,
    ff.rollout_percentage,
    COUNT(*) as total_checks,
    AVG(EXTRACT(EPOCH FROM (NOW() - ff.updated_at))) as avg_age_seconds
FROM feature_flags ff
WHERE ff.deleted_at IS NULL
GROUP BY ff.company_id, ff.feature_name, ff.enabled, ff.rollout_percentage;

-- Vista para estadísticas de sesiones activas
CREATE VIEW v_session_statistics AS
SELECT 
    DATE_TRUNC('hour', created_at) as hour,
    COUNT(*) as sessions_created,
    COUNT(*) FILTER (WHERE active = true) as active_sessions,
    COUNT(DISTINCT user_id) as unique_users,
    COUNT(DISTINCT company_id) as unique_companies
FROM user_sessions 
WHERE created_at > NOW() - INTERVAL '24 hours'
GROUP BY DATE_TRUNC('hour', created_at)
ORDER BY hour DESC;
```

### 5. Data Seeding Avanzado

#### 5.1 Seed Plans: 003_seed_plans.sql
```sql
-- Plan Básico
INSERT INTO plans (
    id, name, display_name, description, 
    price_monthly, price_yearly, currency,
    features, limits, active, public, sort_order
) VALUES (
    '550e8400-e29b-41d4-a716-446655440100',
    'basic',
    'Plan Básico',
    'Ideal para pequeñas empresas que comienzan con gestión comercial',
    99.00, 990.00, 'USD',
    '{
        "omni": {
            "channels": ["whatsapp", "email"],
            "landing_pages": true,
            "email_marketing": true
        },
        "crm": false,
        "workflows": false,
        "analytics": {
            "basic_reports": true,
            "custom_reports": false
        },
        "erp_integration": false
    }',
    '{
        "users": 5,
        "conversations_per_month": 1000,
        "email_contacts": 1000,
        "landing_pages": 3,
        "storage_gb": 1
    }',
    true, true, 1
);

-- Plan Profesional
INSERT INTO plans (
    id, name, display_name, description,
    price_monthly, price_yearly, currency,
    features, limits, active, public, sort_order
) VALUES (
    '550e8400-e29b-41d4-a716-446655440101',
    'professional',
    'Plan Profesional',
    'Para empresas en crecimiento que necesitan CRM completo',
    299.00, 2990.00, 'USD',
    '{
        "omni": {
            "channels": ["whatsapp", "instagram", "facebook", "email", "sms"],
            "landing_pages": true,
            "email_marketing": true,
            "advanced_analytics": true
        },
        "crm": {
            "full_pipeline": true,
            "forecasting": true,
            "quotes": true
        },
        "workflows": {
            "basic_automation": true,
            "max_workflows": 25
        },
        "analytics": {
            "basic_reports": true,
            "custom_reports": true,
            "dashboards": true
        },
        "erp_integration": false
    }',
    '{
        "users": 25,
        "conversations_per_month": 10000,
        "email_contacts": 10000,
        "landing_pages": 10,
        "storage_gb": 10
    }',
    true, true, 2
);

-- Plan Enterprise
INSERT INTO plans (
    id, name, display_name, description,
    price_monthly, price_yearly, currency,
    features, limits, active, public, sort_order
) VALUES (
    '550e8400-e29b-41d4-a716-446655440102',
    'enterprise',
    'Plan Enterprise',
    'Solución completa para empresas grandes con integración ERP',
    599.00, 5990.00, 'USD',
    '{
        "omni": {
            "channels": ["whatsapp", "instagram", "facebook", "email", "sms", "custom"],
            "landing_pages": true,
            "email_marketing": true,
            "advanced_analytics": true,
            "api_access": true
        },
        "crm": {
            "full_pipeline": true,
            "forecasting": true,
            "quotes": true,
            "advanced_reporting": true
        },
        "workflows": {
            "advanced_automation": true,
            "unlimited_workflows": true,
            "custom_integrations": true
        },
        "analytics": {
            "basic_reports": true,
            "custom_reports": true,
            "dashboards": true,
            "real_time_analytics": true,
            "data_export": true
        },
        "erp_integration": {
            "flexxus": true,
            "quickbooks": true,
            "sap": true,
            "custom": true
        }
    }',
    '{
        "users": -1,
        "conversations_per_month": -1,
        "email_contacts": -1,
        "landing_pages": -1,
        "storage_gb": 100
    }',
    true, true, 3
);
```

#### 5.2 Seed Feature Flags: 004_seed_feature_flags.sql
```sql
-- Feature flags para empresa demo (Acme Corp)
INSERT INTO feature_flags (
    company_id, feature_name, enabled, config, 
    description, category, created_by_user_id
) VALUES 
-- UI Features
('550e8400-e29b-41d4-a716-446655440000', 'dark_mode', true, '{}', 
 'Dark mode theme option', 'ui', '550e8400-e29b-41d4-a716-446655440010'),

('550e8400-e29b-41d4-a716-446655440000', 'new_dashboard', false, 
 '{"rollout_percentage": 10}', 
 'New dashboard design', 'ui', '550e8400-e29b-41d4-a716-446655440010'),

-- API Features
('550e8400-e29b-41d4-a716-446655440000', 'api_rate_limiting_v2', true,
 '{"requests_per_minute": 1000}', 
 'New API rate limiting system', 'api', '550e8400-e29b-41d4-a716-446655440010'),

-- Integration Features
('550e8400-e29b-41d4-a716-446655440000', 'flexxus_integration', true, 
 '{"sync_interval": 300}', 
 'Flexxus ERP integration', 'integration', '550e8400-e29b-41d4-a716-446655440010'),

-- Analytics Features
('550e8400-e29b-41d4-a716-446655440000', 'real_time_analytics', true, '{}', 
 'Real-time analytics dashboard', 'analytics', '550e8400-e29b-41d4-a716-446655440010'),

-- Workflow Features
('550e8400-e29b-41d4-a716-446655440000', 'advanced_workflows', true, 
 '{"max_nodes": 100}', 
 'Advanced workflow builder', 'workflow', '550e8400-e29b-41d4-a716-446655440010');
```

### 6. Database Maintenance y Monitoring

#### 6.1 Maintenance Procedures
```sql
-- Procedimiento para estadísticas de tablas
CREATE OR REPLACE FUNCTION update_table_statistics()
RETURNS void AS $$
BEGIN
    ANALYZE companies;
    ANALYZE users;
    ANALYZE user_companies;
    ANALYZE plans;
    ANALYZE feature_flags;
    ANALYZE user_sessions;
    ANALYZE user_activity_log;
    
    -- Log completion
    INSERT INTO system_logs (level, message, created_at)
    VALUES ('info', 'Table statistics updated', NOW());
END;
$$ LANGUAGE plpgsql;

-- Función para cleanup periódico
CREATE OR REPLACE FUNCTION daily_maintenance()
RETURNS void AS $$
DECLARE
    cleaned_sessions INTEGER;
    old_audit_records INTEGER;
BEGIN
    -- Cleanup expired sessions
    SELECT cleanup_expired_sessions() INTO cleaned_sessions;
    
    -- Cleanup old audit records (older than 1 year)
    DELETE FROM user_activity_log 
    WHERE created_at < NOW() - INTERVAL '1 year';
    GET DIAGNOSTICS old_audit_records = ROW_COUNT;
    
    -- Update statistics
    PERFORM update_table_statistics();
    
    -- Log maintenance completion
    INSERT INTO system_logs (level, message, metadata, created_at)
    VALUES ('info', 'Daily maintenance completed', 
            jsonb_build_object(
                'cleaned_sessions', cleaned_sessions,
                'cleaned_audit_records', old_audit_records
            ), NOW());
END;
$$ LANGUAGE plpgsql;
```

## Criterios de Aceptación

### Funcionales
- [ ] Sistema de planes implementado con 3 planes (básico, profesional, enterprise)
- [ ] Feature flags funcionando con rollout percentage y configuración granular
- [ ] Sesiones JWT con refresh tokens y cleanup automático
- [ ] Auditoría completa de actividades críticas del sistema
- [ ] Planes asignables a empresas con limits enforcement
- [ ] Feature flags evaluables en tiempo real con buen performance

### Técnicos
- [ ] Queries de feature flags < 5ms (hot path optimizado)
- [ ] Session lookup < 10ms con índices apropiados
- [ ] Audit log insertions < 2ms sin impacto en operations
- [ ] Cleanup automático funcionando sin bloqueos
- [ ] Índices optimizados para todos los access patterns
- [ ] Partitioning strategy preparada para audit log

### Seguridad
- [ ] Session tokens hasheados y nunca almacenados en plain text
- [ ] Feature flags no exponiendo información sensible
- [ ] Audit trail capturando cambios críticos sin PII innecesaria
- [ ] RLS policies aplicadas a todas las nuevas tablas
- [ ] Session invalidation funcionando correctamente
- [ ] Suspicious activity detection básica implementada

### Performance
- [ ] Feature flag evaluation sub-5ms para 10K concurrent users
- [ ] Session validation sub-10ms para authentication
- [ ] Audit logging no impactando performance de operations normales
- [ ] Database size growth controlado con retention policies
- [ ] Query performance mantenido bajo carga simulada

## Riesgos y Mitigaciones

### Riesgo: Feature flag performance degradation bajo carga alta
**Mitigación:** Índices especializados y caching strategy preparada

### Riesgo: Audit log tabla creciendo excesivamente
**Mitigación:** Partitioning por mes y retention policy automática

### Riesgo: Session table bloat por sesiones no limpiadas
**Mitigación:** Cleanup job automático y monitoring de tabla size

### Riesgo: Complex feature flag queries impactando performance
**Mitigación:** Hot path optimization y query simplification

## Entregables

### Scripts SQL
1. `005_create_plans.sql` - Sistema de planes de suscripción
2. `006_create_feature_flags.sql` - Feature flags dinámicos
3. `007_create_user_sessions.sql` - Gestión de sesiones JWT
4. `008_create_audit_log.sql` - Auditoría de actividades
5. `009_create_indexes_advanced.sql` - Índices optimizados
6. `010_create_maintenance_procedures.sql` - Procedimientos de mantenimiento

### Data Seeding
1. `003_seed_plans.sql` - Datos iniciales de planes
2. `004_seed_feature_flags.sql` - Feature flags por defecto
3. `005_seed_demo_data.sql` - Datos adicionales para demo

### Funciones y Triggers
1. `cleanup_expired_sessions()` - Limpieza automática de sesiones
2. `invalidate_user_sessions()` - Invalidación de sesiones de usuario
3. `audit_trigger_function()` - Función genérica de auditoría
4. `daily_maintenance()` - Mantenimiento diario automatizado

### Documentación
1. `FEATURE_FLAGS_GUIDE.md` - Guía de uso de feature flags
2. `SESSION_MANAGEMENT.md` - Documentación de sesiones
3. `AUDIT_TRAIL.md` - Explicación del sistema de auditoría
4. `PERFORMANCE_OPTIMIZATION.md` - Optimizaciones implementadas

## Dependencies

### Externas
- PostgreSQL configurado del Sprint 1
- Extensiones UUID y JSONB funcionando
- Timezone configurado apropiadamente

### Internas
- Tablas base del Sprint 1 (companies, users, user_companies)
- Backend Team debe implementar JWT handling
- Frontend Team debe implementar feature flag consumption