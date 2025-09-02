# Sprint 03 - Database Team

## Información del Sprint
- **Duración:** Semanas 5-6 (2 semanas)
- **Equipo:** Database Team (2 desarrolladores)
- **Objetivo:** Implementar gestión completa de usuarios y permisos con RBAC granular

## Objetivos Específicos

### Objetivo Principal
Desarrollar un sistema robusto de Role-Based Access Control (RBAC) con permisos granulares, gestión de invitaciones y configuración avanzada de usuarios y empresas.

### Objetivos Técnicos
1. Implementar sistema RBAC con roles y permisos granulares
2. Crear sistema de invitaciones de usuarios con workflow completo
3. Establecer configuración avanzada de empresas y usuarios
4. Implementar historial de cambios para auditoria completa
5. Crear vistas optimizadas para reporting y analytics
6. Implementar políticas de retención de datos

## Tareas Detalladas

### 1. Sistema RBAC (Role-Based Access Control)

#### 1.1 Migration Script: 011_create_roles_permissions.sql
```sql
-- Tabla de roles del sistema
CREATE TABLE roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) NOT NULL UNIQUE,
    display_name VARCHAR(150) NOT NULL,
    description TEXT,
    
    -- Jerarquía de roles
    level INTEGER NOT NULL DEFAULT 0, -- 0=lowest, higher numbers = more permissions
    parent_role_id UUID REFERENCES roles(id),
    
    -- Configuración del rol
    is_system_role BOOLEAN DEFAULT false, -- Roles del sistema no editables
    is_custom_role BOOLEAN DEFAULT false, -- Roles personalizados por empresa
    created_by_company_id UUID REFERENCES companies(id), -- Si es custom role
    
    -- Estado
    active BOOLEAN DEFAULT true,
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    deleted_at TIMESTAMP WITH TIME ZONE
);

-- Tabla de permisos del sistema
CREATE TABLE permissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) NOT NULL UNIQUE,
    display_name VARCHAR(150) NOT NULL,
    description TEXT,
    
    -- Categorización
    module VARCHAR(50) NOT NULL, -- auth, omni, crm, workflow, analytics
    category VARCHAR(50) NOT NULL, -- read, write, delete, admin
    resource VARCHAR(100) NOT NULL, -- users, contacts, opportunities, etc.
    action VARCHAR(50) NOT NULL, -- view, create, update, delete, manage
    
    -- Configuración del permiso
    is_dangerous BOOLEAN DEFAULT false, -- Permisos que requieren confirmación adicional
    requires_mfa BOOLEAN DEFAULT false, -- Requiere autenticación multifactor
    
    -- Estado
    active BOOLEAN DEFAULT true,
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabla de relación roles-permisos (M:N)
CREATE TABLE role_permissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    role_id UUID NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
    permission_id UUID NOT NULL REFERENCES permissions(id) ON DELETE CASCADE,
    
    -- Configuración específica del permiso en este rol
    granted BOOLEAN DEFAULT true, -- true = granted, false = explicitly denied
    conditions JSONB DEFAULT '{}', -- Condiciones adicionales para el permiso
    
    -- Metadatos
    granted_by_user_id UUID REFERENCES users(id),
    granted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    UNIQUE(role_id, permission_id)
);

-- Actualizar tabla user_companies para incluir permisos específicos
ALTER TABLE user_companies ADD COLUMN specific_permissions JSONB DEFAULT '{}';
ALTER TABLE user_companies ADD COLUMN permission_overrides JSONB DEFAULT '{}'; -- Overrides específicos para este usuario
ALTER TABLE user_companies ADD COLUMN access_restrictions JSONB DEFAULT '{}'; -- Restricciones adicionales
```

#### 1.2 Seed Roles y Permissions: 006_seed_roles_permissions.sql
```sql
-- Insert system roles
INSERT INTO roles (id, name, display_name, description, level, is_system_role) VALUES
('550e8400-e29b-41d4-a716-446655440200', 'super_admin', 'Super Administrador', 'Acceso completo al sistema', 100, true),
('550e8400-e29b-41d4-a716-446655440201', 'company_admin', 'Administrador', 'Administrador de empresa con acceso completo', 90, true),
('550e8400-e29b-41d4-a716-446655440202', 'company_manager', 'Gerente', 'Gerente con permisos de supervisión', 70, true),
('550e8400-e29b-41d4-a716-446655440203', 'sales_manager', 'Gerente de Ventas', 'Gestión del equipo de ventas y CRM', 60, true),
('550e8400-e29b-41d4-a716-446655440204', 'sales_rep', 'Representante de Ventas', 'Gestión de leads y oportunidades', 40, true),
('550e8400-e29b-41d4-a716-446655440205', 'customer_service', 'Atención al Cliente', 'Manejo de conversaciones y soporte', 30, true),
('550e8400-e29b-41d4-a716-446655440206', 'marketing_manager', 'Gerente de Marketing', 'Gestión de campañas y landing pages', 50, true),
('550e8400-e29b-41d4-a716-446655440207', 'viewer', 'Solo Lectura', 'Acceso de solo lectura a dashboards', 10, true);

-- Insert permissions by module

-- AUTH MODULE PERMISSIONS
INSERT INTO permissions (name, display_name, description, module, category, resource, action, is_dangerous) VALUES
('auth.users.view', 'Ver Usuarios', 'Ver lista y detalles de usuarios', 'auth', 'read', 'users', 'view', false),
('auth.users.create', 'Crear Usuarios', 'Crear nuevos usuarios', 'auth', 'write', 'users', 'create', false),
('auth.users.update', 'Editar Usuarios', 'Modificar usuarios existentes', 'auth', 'write', 'users', 'update', false),
('auth.users.delete', 'Eliminar Usuarios', 'Eliminar usuarios del sistema', 'auth', 'delete', 'users', 'delete', true),
('auth.users.invite', 'Invitar Usuarios', 'Enviar invitaciones a nuevos usuarios', 'auth', 'write', 'users', 'invite', false),
('auth.users.roles', 'Gestionar Roles', 'Asignar y modificar roles de usuarios', 'auth', 'admin', 'users', 'manage_roles', true),
('auth.companies.view', 'Ver Empresas', 'Ver información de empresas', 'auth', 'read', 'companies', 'view', false),
('auth.companies.update', 'Editar Empresas', 'Modificar configuración de empresas', 'auth', 'write', 'companies', 'update', false),
('auth.companies.settings', 'Configurar Empresa', 'Acceso completo a configuraciones', 'auth', 'admin', 'companies', 'settings', false),
('auth.sessions.view', 'Ver Sesiones', 'Ver sesiones activas de usuarios', 'auth', 'read', 'sessions', 'view', false),
('auth.sessions.revoke', 'Revocar Sesiones', 'Invalidar sesiones de usuarios', 'auth', 'admin', 'sessions', 'revoke', true),

-- OMNI MODULE PERMISSIONS  
('omni.conversations.view', 'Ver Conversaciones', 'Acceso a conversaciones', 'omni', 'read', 'conversations', 'view', false),
('omni.conversations.respond', 'Responder Conversaciones', 'Enviar mensajes en conversaciones', 'omni', 'write', 'conversations', 'respond', false),
('omni.conversations.assign', 'Asignar Conversaciones', 'Asignar conversaciones a agentes', 'omni', 'write', 'conversations', 'assign', false),
('omni.conversations.close', 'Cerrar Conversaciones', 'Marcar conversaciones como resueltas', 'omni', 'write', 'conversations', 'close', false),
('omni.channels.view', 'Ver Canales', 'Ver configuración de canales', 'omni', 'read', 'channels', 'view', false),
('omni.channels.configure', 'Configurar Canales', 'Configurar WhatsApp, email, etc.', 'omni', 'admin', 'channels', 'configure', false),
('omni.landing_pages.view', 'Ver Landing Pages', 'Ver landing pages existentes', 'omni', 'read', 'landing_pages', 'view', false),
('omni.landing_pages.create', 'Crear Landing Pages', 'Crear nuevas landing pages', 'omni', 'write', 'landing_pages', 'create', false),
('omni.landing_pages.edit', 'Editar Landing Pages', 'Modificar landing pages', 'omni', 'write', 'landing_pages', 'edit', false),
('omni.landing_pages.publish', 'Publicar Landing Pages', 'Publicar y despublicar páginas', 'omni', 'write', 'landing_pages', 'publish', false),
('omni.email_marketing.view', 'Ver Campañas Email', 'Ver campañas de email marketing', 'omni', 'read', 'email_campaigns', 'view', false),
('omni.email_marketing.create', 'Crear Campañas Email', 'Crear campañas de email', 'omni', 'write', 'email_campaigns', 'create', false),
('omni.email_marketing.send', 'Enviar Campañas Email', 'Enviar campañas a contactos', 'omni', 'write', 'email_campaigns', 'send', false),

-- CRM MODULE PERMISSIONS
('crm.leads.view', 'Ver Leads', 'Acceso a leads del sistema', 'crm', 'read', 'leads', 'view', false),
('crm.leads.create', 'Crear Leads', 'Crear nuevos leads', 'crm', 'write', 'leads', 'create', false),
('crm.leads.update', 'Editar Leads', 'Modificar leads existentes', 'crm', 'write', 'leads', 'update', false),
('crm.leads.convert', 'Convertir Leads', 'Convertir leads en contactos', 'crm', 'write', 'leads', 'convert', false),
('crm.contacts.view', 'Ver Contactos', 'Acceso a contactos', 'crm', 'read', 'contacts', 'view', false),
('crm.contacts.create', 'Crear Contactos', 'Crear nuevos contactos', 'crm', 'write', 'contacts', 'create', false),
('crm.contacts.update', 'Editar Contactos', 'Modificar contactos', 'crm', 'write', 'contacts', 'update', false),
('crm.contacts.delete', 'Eliminar Contactos', 'Eliminar contactos', 'crm', 'delete', 'contacts', 'delete', true),
('crm.accounts.view', 'Ver Cuentas', 'Acceso a cuentas/empresas', 'crm', 'read', 'accounts', 'view', false),
('crm.accounts.create', 'Crear Cuentas', 'Crear nuevas cuentas', 'crm', 'write', 'accounts', 'create', false),
('crm.accounts.update', 'Editar Cuentas', 'Modificar cuentas', 'crm', 'write', 'accounts', 'update', false),
('crm.opportunities.view', 'Ver Oportunidades', 'Acceso a pipeline de ventas', 'crm', 'read', 'opportunities', 'view', false),
('crm.opportunities.create', 'Crear Oportunidades', 'Crear oportunidades de venta', 'crm', 'write', 'opportunities', 'create', false),
('crm.opportunities.update', 'Editar Oportunidades', 'Modificar oportunidades', 'crm', 'write', 'opportunities', 'update', false),
('crm.opportunities.close', 'Cerrar Oportunidades', 'Marcar como ganadas/perdidas', 'crm', 'write', 'opportunities', 'close', false),
('crm.quotes.view', 'Ver Cotizaciones', 'Acceso a cotizaciones', 'crm', 'read', 'quotes', 'view', false),
('crm.quotes.create', 'Crear Cotizaciones', 'Generar nuevas cotizaciones', 'crm', 'write', 'quotes', 'create', false),
('crm.quotes.approve', 'Aprobar Cotizaciones', 'Aprobar cotizaciones con descuentos', 'crm', 'admin', 'quotes', 'approve', false),

-- WORKFLOW MODULE PERMISSIONS
('workflow.workflows.view', 'Ver Workflows', 'Ver workflows existentes', 'workflow', 'read', 'workflows', 'view', false),
('workflow.workflows.create', 'Crear Workflows', 'Crear nuevos workflows', 'workflow', 'write', 'workflows', 'create', false),
('workflow.workflows.edit', 'Editar Workflows', 'Modificar workflows', 'workflow', 'write', 'workflows', 'edit', false),
('workflow.workflows.publish', 'Publicar Workflows', 'Activar/desactivar workflows', 'workflow', 'admin', 'workflows', 'publish', false),
('workflow.workflows.execute', 'Ejecutar Workflows', 'Ejecutar workflows manualmente', 'workflow', 'write', 'workflows', 'execute', false),

-- ANALYTICS MODULE PERMISSIONS
('analytics.reports.view', 'Ver Reportes', 'Acceso a reportes y dashboards', 'analytics', 'read', 'reports', 'view', false),
('analytics.reports.create', 'Crear Reportes', 'Crear reportes personalizados', 'analytics', 'write', 'reports', 'create', false),
('analytics.reports.export', 'Exportar Reportes', 'Exportar datos y reportes', 'analytics', 'write', 'reports', 'export', false),
('analytics.dashboards.view', 'Ver Dashboards', 'Acceso a dashboards ejecutivos', 'analytics', 'read', 'dashboards', 'view', false),
('analytics.dashboards.configure', 'Configurar Dashboards', 'Personalizar dashboards', 'analytics', 'admin', 'dashboards', 'configure', false);
```

### 2. Sistema de Invitaciones

#### 2.1 Migration Script: 012_create_invitations.sql
```sql
-- Tabla de invitaciones de usuarios
CREATE TABLE user_invitations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    
    -- Información del invitado
    email VARCHAR(255) NOT NULL,
    first_name VARCHAR(100),
    last_name VARCHAR(100),
    
    -- Configuración de la invitación
    role_id UUID NOT NULL REFERENCES roles(id),
    specific_permissions JSONB DEFAULT '{}',
    welcome_message TEXT,
    
    -- Estado de la invitación
    status VARCHAR(50) DEFAULT 'pending', -- pending, accepted, expired, cancelled
    invitation_token VARCHAR(255) NOT NULL UNIQUE,
    
    -- Fechas importantes
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    accepted_at TIMESTAMP WITH TIME ZONE,
    cancelled_at TIMESTAMP WITH TIME ZONE,
    
    -- Metadatos de invitación
    invited_by_user_id UUID NOT NULL REFERENCES users(id),
    accepted_by_user_id UUID REFERENCES users(id),
    cancelled_by_user_id UUID REFERENCES users(id),
    
    -- Información adicional
    invitation_metadata JSONB DEFAULT '{}', -- Info adicional como departamento, etc.
    acceptance_ip INET,
    acceptance_user_agent TEXT,
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Constraints
    UNIQUE(company_id, email, status) DEFERRABLE -- Solo una invitación pending por email/company
);

-- Tabla de historial de invitaciones (para auditoria)
CREATE TABLE invitation_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    invitation_id UUID NOT NULL REFERENCES user_invitations(id) ON DELETE CASCADE,
    
    -- Cambio realizado
    action VARCHAR(50) NOT NULL, -- created, resent, accepted, expired, cancelled
    previous_status VARCHAR(50),
    new_status VARCHAR(50),
    
    -- Metadatos del cambio
    changed_by_user_id UUID REFERENCES users(id),
    change_reason TEXT,
    change_metadata JSONB DEFAULT '{}',
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices para performance
CREATE INDEX idx_user_invitations_company ON user_invitations(company_id, status);
CREATE INDEX idx_user_invitations_token ON user_invitations(invitation_token) WHERE status = 'pending';
CREATE INDEX idx_user_invitations_email ON user_invitations(email, status);
CREATE INDEX idx_user_invitations_expires ON user_invitations(expires_at) WHERE status = 'pending';
CREATE INDEX idx_invitation_history_invitation ON invitation_history(invitation_id, created_at DESC);
```

#### 2.2 Invitation Management Functions
```sql
-- Función para limpiar invitaciones expiradas
CREATE OR REPLACE FUNCTION cleanup_expired_invitations()
RETURNS INTEGER AS $$
DECLARE
    expired_count INTEGER;
BEGIN
    -- Marcar como expiradas
    UPDATE user_invitations 
    SET status = 'expired', updated_at = NOW()
    WHERE status = 'pending' 
    AND expires_at < NOW();
    
    GET DIAGNOSTICS expired_count = ROW_COUNT;
    
    -- Insertar en historial
    INSERT INTO invitation_history (invitation_id, action, previous_status, new_status, change_reason)
    SELECT id, 'expired', 'pending', 'expired', 'Automatic expiration cleanup'
    FROM user_invitations 
    WHERE status = 'expired' 
    AND updated_at > NOW() - INTERVAL '1 minute';
    
    RETURN expired_count;
END;
$$ LANGUAGE plpgsql;

-- Función para cancelar invitaciones pendientes de un usuario
CREATE OR REPLACE FUNCTION cancel_pending_invitations(p_email VARCHAR, p_company_id UUID, p_cancelled_by UUID)
RETURNS INTEGER AS $$
DECLARE
    cancelled_count INTEGER;
BEGIN
    UPDATE user_invitations 
    SET status = 'cancelled',
        cancelled_at = NOW(),
        cancelled_by_user_id = p_cancelled_by,
        updated_at = NOW()
    WHERE email = p_email 
    AND company_id = p_company_id 
    AND status = 'pending';
    
    GET DIAGNOSTICS cancelled_count = ROW_COUNT;
    RETURN cancelled_count;
END;
$$ LANGUAGE plpgsql;
```

### 3. Configuración Avanzada de Empresas

#### 3.1 Migration Script: 013_enhance_company_settings.sql
```sql
-- Mejorar tabla de empresas con configuraciones avanzadas
ALTER TABLE companies ADD COLUMN IF NOT EXISTS industry_id UUID REFERENCES industries(id);
ALTER TABLE companies ADD COLUMN IF NOT EXISTS company_size VARCHAR(50); -- 1-10, 11-50, 51-200, 201-1000, 1000+
ALTER TABLE companies ADD COLUMN IF NOT EXISTS founded_year INTEGER;
ALTER TABLE companies ADD COLUMN IF NOT EXISTS website_url VARCHAR(500);
ALTER TABLE companies ADD COLUMN IF NOT EXISTS phone VARCHAR(50);
ALTER TABLE companies ADD COLUMN IF NOT EXISTS logo_url VARCHAR(500);

-- Configuraciones específicas por módulo
ALTER TABLE companies ADD COLUMN IF NOT EXISTS omni_settings JSONB DEFAULT '{}';
ALTER TABLE companies ADD COLUMN IF NOT EXISTS crm_settings JSONB DEFAULT '{}';
ALTER TABLE companies ADD COLUMN IF NOT EXISTS workflow_settings JSONB DEFAULT '{}';
ALTER TABLE companies ADD COLUMN IF NOT EXISTS analytics_settings JSONB DEFAULT '{}';

-- Configuraciones de seguridad
ALTER TABLE companies ADD COLUMN IF NOT EXISTS security_settings JSONB DEFAULT '{
    "password_policy": {
        "min_length": 8,
        "require_uppercase": true,
        "require_lowercase": true,
        "require_numbers": true,
        "require_symbols": false,
        "password_history": 3
    },
    "session_settings": {
        "max_concurrent_sessions": 3,
        "session_timeout_minutes": 480,
        "require_mfa_for_admin": false,
        "allowed_ip_ranges": []
    },
    "invitation_settings": {
        "invitation_expiry_days": 7,
        "require_email_domain_match": false,
        "allowed_email_domains": []
    }
}';

-- Configuraciones de notificaciones
ALTER TABLE companies ADD COLUMN IF NOT EXISTS notification_settings JSONB DEFAULT '{
    "email_notifications": {
        "new_lead": true,
        "opportunity_won": true,
        "opportunity_lost": false,
        "sla_breach": true,
        "weekly_summary": true
    },
    "webhook_notifications": {
        "enabled": false,
        "webhook_url": null,
        "events": []
    },
    "slack_integration": {
        "enabled": false,
        "webhook_url": null,
        "channels": {}
    }
}';

-- Tabla de configuraciones por usuario (overrides a nivel usuario)
CREATE TABLE user_preferences (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    
    -- Preferencias de UI
    ui_preferences JSONB DEFAULT '{
        "theme": "light",
        "sidebar_collapsed": false,
        "dashboard_layout": "default",
        "table_density": "standard",
        "language": "es",
        "date_format": "DD/MM/YYYY",
        "time_format": "24h"
    }',
    
    -- Preferencias de notificaciones (override company settings)
    notification_preferences JSONB DEFAULT '{}',
    
    -- Configuraciones específicas de módulos
    module_preferences JSONB DEFAULT '{}',
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    UNIQUE(user_id, company_id)
);
```

### 4. Historial y Auditoría Avanzada

#### 4.1 Migration Script: 014_enhance_audit_system.sql
```sql
-- Mejorar tabla de audit log con más categorías
ALTER TABLE user_activity_log ADD COLUMN IF NOT EXISTS risk_level VARCHAR(20) DEFAULT 'low'; -- low, medium, high, critical
ALTER TABLE user_activity_log ADD COLUMN IF NOT EXISTS compliance_category VARCHAR(50); -- gdpr, financial, security, etc.
ALTER TABLE user_activity_log ADD COLUMN IF NOT EXISTS retention_date DATE; -- Fecha hasta la cual retener este log

-- Tabla específica para cambios en datos sensibles
CREATE TABLE sensitive_data_changes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id),
    company_id UUID NOT NULL REFERENCES companies(id),
    
    -- Información del cambio
    table_name VARCHAR(100) NOT NULL,
    record_id UUID NOT NULL,
    field_name VARCHAR(100) NOT NULL,
    
    -- Valores antes y después (encriptados para datos sensibles)
    old_value_hash VARCHAR(255), -- Hash del valor anterior
    new_value_hash VARCHAR(255), -- Hash del nuevo valor
    change_type VARCHAR(50) NOT NULL, -- create, update, delete
    
    -- Metadatos de seguridad
    justification TEXT, -- Razón del cambio si es requerida
    approved_by_user_id UUID REFERENCES users(id),
    approval_required BOOLEAN DEFAULT false,
    
    -- Información técnica
    ip_address INET,
    user_agent TEXT,
    session_id UUID,
    request_id UUID,
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabla para tracking de accesos a datos sensibles
CREATE TABLE data_access_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id),
    company_id UUID NOT NULL REFERENCES companies(id),
    
    -- Información del acceso
    resource_type VARCHAR(100) NOT NULL, -- contact_pii, financial_data, etc.
    resource_id UUID,
    access_type VARCHAR(50) NOT NULL, -- view, export, print, etc.
    
    -- Metadatos
    purpose VARCHAR(200), -- Propósito declarado del acceso
    metadata JSONB DEFAULT '{}',
    
    -- Información técnica
    ip_address INET,
    user_agent TEXT,
    session_id UUID,
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices para compliance y auditoría
CREATE INDEX idx_sensitive_changes_table_record ON sensitive_data_changes(table_name, record_id);
CREATE INDEX idx_sensitive_changes_user_date ON sensitive_data_changes(user_id, created_at DESC);
CREATE INDEX idx_sensitive_changes_retention ON sensitive_data_changes(retention_date) WHERE retention_date IS NOT NULL;
CREATE INDEX idx_data_access_user_date ON data_access_log(user_id, created_at DESC);
CREATE INDEX idx_data_access_resource ON data_access_log(resource_type, resource_id);
```

### 5. Vistas Optimizadas para Reporting

#### 5.1 Create Views: 015_create_reporting_views.sql
```sql
-- Vista para permisos efectivos de usuarios
CREATE VIEW v_user_effective_permissions AS
SELECT 
    uc.user_id,
    uc.company_id,
    u.email,
    u.first_name,
    u.last_name,
    r.name as role_name,
    r.display_name as role_display_name,
    p.name as permission_name,
    p.display_name as permission_display_name,
    p.module,
    p.category,
    p.resource,
    p.action,
    rp.granted,
    CASE 
        WHEN uc.permission_overrides ? p.name THEN 
            (uc.permission_overrides->p.name)::boolean
        ELSE rp.granted 
    END as effective_permission
FROM user_companies uc
JOIN users u ON u.id = uc.user_id
JOIN roles r ON r.name = uc.role
JOIN role_permissions rp ON rp.role_id = r.id
JOIN permissions p ON p.id = rp.permission_id
WHERE uc.deleted_at IS NULL 
AND u.deleted_at IS NULL 
AND uc.status = 'active'
AND r.active = true 
AND p.active = true;

-- Vista para estadísticas de usuarios por empresa
CREATE VIEW v_company_user_stats AS
SELECT 
    c.id as company_id,
    c.name as company_name,
    c.plan,
    COUNT(DISTINCT uc.user_id) as total_users,
    COUNT(DISTINCT CASE WHEN uc.status = 'active' THEN uc.user_id END) as active_users,
    COUNT(DISTINCT CASE WHEN uc.status = 'invited' THEN uc.user_id END) as pending_users,
    COUNT(DISTINCT CASE WHEN us.active = true THEN us.user_id END) as users_with_active_sessions,
    MAX(ual.created_at) as last_activity
FROM companies c
LEFT JOIN user_companies uc ON uc.company_id = c.id AND uc.deleted_at IS NULL
LEFT JOIN user_sessions us ON us.user_id = uc.user_id AND us.company_id = c.id AND us.active = true
LEFT JOIN user_activity_log ual ON ual.company_id = c.id
WHERE c.deleted_at IS NULL
GROUP BY c.id, c.name, c.plan;

-- Vista para auditoría de invitaciones
CREATE VIEW v_invitation_audit AS
SELECT 
    ui.id,
    ui.company_id,
    c.name as company_name,
    ui.email,
    ui.first_name,
    ui.last_name,
    r.display_name as role_name,
    ui.status,
    ui.expires_at,
    ui.created_at as invited_at,
    ui.accepted_at,
    CONCAT(inviter.first_name, ' ', inviter.last_name) as invited_by,
    CASE 
        WHEN accepter.id IS NOT NULL THEN CONCAT(accepter.first_name, ' ', accepter.last_name)
        ELSE NULL 
    END as accepted_by,
    DATE_PART('day', ui.expires_at - ui.created_at) as validity_days,
    CASE 
        WHEN ui.status = 'pending' AND ui.expires_at < NOW() THEN true
        ELSE false 
    END as is_expired
FROM user_invitations ui
JOIN companies c ON c.id = ui.company_id
JOIN roles r ON r.id = ui.role_id
JOIN users inviter ON inviter.id = ui.invited_by_user_id
LEFT JOIN users accepter ON accepter.id = ui.accepted_by_user_id
WHERE c.deleted_at IS NULL;

-- Vista para análisis de actividad por usuario
CREATE VIEW v_user_activity_summary AS
SELECT 
    ual.user_id,
    ual.company_id,
    u.email,
    CONCAT(u.first_name, ' ', u.last_name) as full_name,
    DATE_TRUNC('day', ual.created_at) as activity_date,
    COUNT(*) as total_activities,
    COUNT(DISTINCT ual.action) as unique_actions,
    COUNT(*) FILTER (WHERE ual.success = false) as failed_activities,
    MIN(ual.created_at) as first_activity,
    MAX(ual.created_at) as last_activity,
    COUNT(*) FILTER (WHERE ual.risk_level = 'high') as high_risk_activities,
    COUNT(*) FILTER (WHERE ual.risk_level = 'critical') as critical_activities
FROM user_activity_log ual
JOIN users u ON u.id = ual.user_id
WHERE ual.created_at > NOW() - INTERVAL '30 days'
GROUP BY ual.user_id, ual.company_id, u.email, u.first_name, u.last_name, DATE_TRUNC('day', ual.created_at);
```

### 6. Políticas de Retención de Datos

#### 6.1 Migration Script: 016_data_retention_policies.sql
```sql
-- Tabla de políticas de retención
CREATE TABLE data_retention_policies (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    
    -- Configuración de la política
    policy_name VARCHAR(100) NOT NULL,
    table_name VARCHAR(100) NOT NULL,
    retention_period_days INTEGER NOT NULL,
    
    -- Condiciones para aplicar la política
    conditions JSONB DEFAULT '{}',
    
    -- Acción a tomar (delete, archive, anonymize)
    retention_action VARCHAR(20) NOT NULL DEFAULT 'delete',
    
    -- Configuraciones específicas
    archive_location VARCHAR(200), -- Para retention_action = 'archive'
    anonymization_rules JSONB DEFAULT '{}', -- Para retention_action = 'anonymize'
    
    -- Estado
    active BOOLEAN DEFAULT true,
    last_execution_at TIMESTAMP WITH TIME ZONE,
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Función para aplicar políticas de retención
CREATE OR REPLACE FUNCTION apply_data_retention_policies()
RETURNS TABLE(policy_name VARCHAR, records_affected INTEGER, action_taken VARCHAR) AS $$
DECLARE
    policy RECORD;
    affected_count INTEGER;
BEGIN
    FOR policy IN 
        SELECT * FROM data_retention_policies 
        WHERE active = true 
        ORDER BY company_id, policy_name
    LOOP
        affected_count := 0;
        
        -- Aplicar política según la tabla y acción
        IF policy.table_name = 'user_activity_log' AND policy.retention_action = 'delete' THEN
            DELETE FROM user_activity_log 
            WHERE company_id = policy.company_id 
            AND created_at < NOW() - (policy.retention_period_days || ' days')::INTERVAL;
            GET DIAGNOSTICS affected_count = ROW_COUNT;
            
        ELSIF policy.table_name = 'user_sessions' AND policy.retention_action = 'delete' THEN
            DELETE FROM user_sessions 
            WHERE company_id = policy.company_id 
            AND active = false
            AND created_at < NOW() - (policy.retention_period_days || ' days')::INTERVAL;
            GET DIAGNOSTICS affected_count = ROW_COUNT;
            
        ELSIF policy.table_name = 'user_invitations' AND policy.retention_action = 'delete' THEN
            DELETE FROM user_invitations 
            WHERE company_id = policy.company_id 
            AND status IN ('expired', 'cancelled')
            AND created_at < NOW() - (policy.retention_period_days || ' days')::INTERVAL;
            GET DIAGNOSTICS affected_count = ROW_COUNT;
        END IF;
        
        -- Actualizar última ejecución
        UPDATE data_retention_policies 
        SET last_execution_at = NOW() 
        WHERE id = policy.id;
        
        -- Retornar resultado
        policy_name := policy.policy_name;
        records_affected := affected_count;
        action_taken := policy.retention_action;
        RETURN NEXT;
    END LOOP;
END;
$$ LANGUAGE plpgsql;

-- Insertar políticas por defecto
INSERT INTO data_retention_policies (company_id, policy_name, table_name, retention_period_days, retention_action)
SELECT 
    id as company_id,
    'User Activity Logs' as policy_name,
    'user_activity_log' as table_name,
    365 as retention_period_days, -- 1 año
    'delete' as retention_action
FROM companies 
WHERE deleted_at IS NULL;

INSERT INTO data_retention_policies (company_id, policy_name, table_name, retention_period_days, retention_action)
SELECT 
    id as company_id,
    'Inactive Sessions Cleanup' as policy_name,
    'user_sessions' as table_name,
    30 as retention_period_days, -- 30 días
    'delete' as retention_action
FROM companies 
WHERE deleted_at IS NULL;

INSERT INTO data_retention_policies (company_id, policy_name, table_name, retention_period_days, retention_action)
SELECT 
    id as company_id,
    'Old Invitations Cleanup' as policy_name,
    'user_invitations' as table_name,
    90 as retention_period_days, -- 90 días
    'delete' as retention_action
FROM companies 
WHERE deleted_at IS NULL;
```

## Criterios de Aceptación

### Funcionales
- [ ] Sistema RBAC con roles jerárquicos funcionando
- [ ] Permisos granulares aplicándose correctamente
- [ ] Invitaciones con workflow completo (envío, aceptación, expiración)
- [ ] Configuraciones de empresa avanzadas implementadas
- [ ] Historial de cambios capturando actividades críticas
- [ ] Políticas de retención ejecutándose automáticamente

### Técnicos
- [ ] Queries de permisos < 10ms con índices optimizados
- [ ] Vista de permisos efectivos calculándose correctamente
- [ ] Cleanup automático de invitaciones expiradas funcionando
- [ ] Audit trail completo sin impacto en performance normal
- [ ] Vistas de reporting optimizadas para dashboards
- [ ] Políticas de retención ejecutándose sin bloqueos

### Seguridad
- [ ] Permisos jerárquicos respetando niveles de acceso
- [ ] Invitaciones con tokens seguros y expiration apropiada
- [ ] Audit trail capturando cambios en datos sensibles
- [ ] Row-level security aplicada a nuevas tablas
- [ ] Políticas de retención respetando compliance requirements

### Performance
- [ ] Permission checking optimizado para requests frecuentes
- [ ] Vistas materializadas para reporting complejo
- [ ] Índices especializados para audit queries
- [ ] Cleanup procedures ejecutándose sin impact en users
- [ ] Retention policies con batching para large datasets

## Riesgos y Mitigaciones

### Riesgo: Complejidad de permission checking impactando performance
**Mitigación:** Caching de permisos efectivos y índices especializados

### Riesgo: Invitation tokens siendo interceptados
**Mitigación:** Tokens con alta entropía y expiration corta

### Riesgo: Audit log tabla creciendo sin control
**Mitigación:** Políticas de retención automáticas y partitioning strategy

### Riesgo: Retention policies eliminando datos críticos por error
**Mitigación:** Dry-run mode y validation antes de execution

## Entregables

### Database Schema
1. `011_create_roles_permissions.sql` - Sistema RBAC completo
2. `012_create_invitations.sql` - Sistema de invitaciones
3. `013_enhance_company_settings.sql` - Configuraciones avanzadas
4. `014_enhance_audit_system.sql` - Auditoría mejorada
5. `015_create_reporting_views.sql` - Vistas optimizadas
6. `016_data_retention_policies.sql` - Políticas de retención

### Data & Functions
1. `006_seed_roles_permissions.sql` - Roles y permisos por defecto
2. `cleanup_expired_invitations()` - Limpieza automática
3. `cancel_pending_invitations()` - Cancelación de invitaciones
4. `apply_data_retention_policies()` - Aplicación de políticas
5. Triggers para audit trail automático

### Views & Reports
1. `v_user_effective_permissions` - Vista de permisos efectivos
2. `v_company_user_stats` - Estadísticas por empresa
3. `v_invitation_audit` - Auditoría de invitaciones
4. `v_user_activity_summary` - Resumen de actividad

### Documentation
1. **RBAC Guide** - Sistema de roles y permisos
2. **Invitation Workflow** - Proceso completo de invitaciones
3. **Audit Trail** - Configuración y uso del audit system
4. **Data Retention** - Políticas y procedures

## Dependencies

### Externas
- Tables del Sprint 2 (plans, feature_flags, user_sessions)
- JSONB support en PostgreSQL
- UUID extension funcionando

### Internas  
- Backend Team implementará APIs de user management
- Frontend Team implementará interfaces de admin
- Integration con system de notificaciones para invitations