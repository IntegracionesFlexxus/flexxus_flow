#!/bin/bash

# =====================================================
# Apply Row-Level Security Script
# Sprint 1 - Database Team
# =====================================================
# Este script aplica todas las migraciones de RLS
# en las bases de datos correspondientes
# =====================================================

set -e  # Exit on error

# Colores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Configuración de base de datos
DB_HOST="${DB_HOST:-localhost}"
DB_PORT="${DB_PORT:-5432}"
DB_USER="${DB_USER:-postgres}"
MIGRATIONS_DIR="../migrations"

echo -e "${GREEN}================================================${NC}"
echo -e "${GREEN}    Aplicando Row-Level Security (RLS)${NC}"
echo -e "${GREEN}================================================${NC}"
echo ""

# Función para ejecutar SQL
execute_sql() {
    local db=$1
    local file=$2
    local description=$3
    
    echo -e "${YELLOW}→ ${description}${NC}"
    PGPASSWORD=${DB_PASSWORD} psql -h ${DB_HOST} -p ${DB_PORT} -U ${DB_USER} -d ${db} -f ${file} -v ON_ERROR_STOP=1
    
    if [ $? -eq 0 ]; then
        echo -e "${GREEN}  ✓ Completado${NC}"
    else
        echo -e "${RED}  ✗ Error aplicando ${file} en ${db}${NC}"
        exit 1
    fi
    echo ""
}

# Solicitar contraseña si no está en variable de entorno
if [ -z "$DB_PASSWORD" ]; then
    read -sp "Ingrese la contraseña para el usuario ${DB_USER}: " DB_PASSWORD
    echo ""
    export DB_PASSWORD
fi

# =====================================================
# PASO 1: Aplicar funciones RLS en shared_db
# =====================================================
echo -e "${GREEN}[1/4] Configurando funciones RLS en shared_db${NC}"
echo "----------------------------------------"

execute_sql "flexxus_shared" \
    "${MIGRATIONS_DIR}/005_setup_rls_functions.sql" \
    "Creando funciones de contexto RLS"

# =====================================================
# PASO 2: Habilitar RLS en tablas principales
# =====================================================
echo -e "${GREEN}[2/4] Habilitando RLS en tablas principales${NC}"
echo "----------------------------------------"

execute_sql "flexxus_shared" \
    "${MIGRATIONS_DIR}/006_enable_rls_tables.sql" \
    "Habilitando RLS y políticas en tablas core"

# =====================================================
# PASO 3: Aplicar RLS en tabla contacts
# =====================================================
echo -e "${GREEN}[3/4] Configurando RLS en flexxus_personas${NC}"
echo "----------------------------------------"

# Primero crear las funciones en flexxus_personas
echo -e "${YELLOW}→ Replicando funciones RLS en flexxus_personas${NC}"
PGPASSWORD=${DB_PASSWORD} psql -h ${DB_HOST} -p ${DB_PORT} -U ${DB_USER} -d flexxus_personas <<EOF
-- Replicar funciones de contexto
CREATE OR REPLACE FUNCTION get_current_user_id() 
RETURNS UUID AS \$\$
BEGIN
    RETURN COALESCE(
        NULLIF(current_setting('app.current_user_id', true), ''),
        '00000000-0000-0000-0000-000000000000'
    )::UUID;
EXCEPTION
    WHEN OTHERS THEN
        RETURN '00000000-0000-0000-0000-000000000000'::UUID;
END;
\$\$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION get_current_company_id() 
RETURNS UUID AS \$\$
BEGIN
    RETURN COALESCE(
        NULLIF(current_setting('app.current_company_id', true), ''),
        '00000000-0000-0000-0000-000000000000'
    )::UUID;
EXCEPTION
    WHEN OTHERS THEN
        RETURN '00000000-0000-0000-0000-000000000000'::UUID;
END;
\$\$ LANGUAGE plpgsql SECURITY DEFINER;

-- Función para actualizar updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS \$\$
BEGIN
    IF NEW.deleted_at IS NULL THEN
        NEW.updated_at = NOW();
    END IF;
    RETURN NEW;
END;
\$\$ LANGUAGE plpgsql;

GRANT EXECUTE ON FUNCTION get_current_user_id() TO flexxus_app;
GRANT EXECUTE ON FUNCTION get_current_company_id() TO flexxus_app;
EOF

if [ $? -eq 0 ]; then
    echo -e "${GREEN}  ✓ Funciones replicadas${NC}"
else
    echo -e "${RED}  ✗ Error replicando funciones${NC}"
    exit 1
fi

execute_sql "flexxus_personas" \
    "${MIGRATIONS_DIR}/007_rls_contacts_table.sql" \
    "Aplicando RLS en tabla contacts"

# =====================================================
# PASO 4: Aplicar triggers automáticos
# =====================================================
echo -e "${GREEN}[4/4] Configurando triggers automáticos${NC}"
echo "----------------------------------------"

execute_sql "flexxus_shared" \
    "${MIGRATIONS_DIR}/008_automatic_timestamps.sql" \
    "Creando triggers para timestamps automáticos"

# Aplicar trigger en flexxus_personas para contacts
echo -e "${YELLOW}→ Aplicando trigger updated_at en contacts${NC}"
PGPASSWORD=${DB_PASSWORD} psql -h ${DB_HOST} -p ${DB_PORT} -U ${DB_USER} -d flexxus_personas <<EOF
-- Trigger para contacts
DROP TRIGGER IF EXISTS update_contacts_updated_at ON contacts;
CREATE TRIGGER update_contacts_updated_at
    BEFORE UPDATE ON contacts
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
EOF

if [ $? -eq 0 ]; then
    echo -e "${GREEN}  ✓ Trigger aplicado${NC}"
else
    echo -e "${RED}  ✗ Error aplicando trigger${NC}"
    exit 1
fi

# =====================================================
# VERIFICACIÓN FINAL
# =====================================================
echo ""
echo -e "${GREEN}================================================${NC}"
echo -e "${GREEN}         Verificando configuración RLS${NC}"
echo -e "${GREEN}================================================${NC}"
echo ""

# Verificar que RLS esté habilitado
echo -e "${YELLOW}→ Verificando RLS habilitado en tablas...${NC}"
PGPASSWORD=${DB_PASSWORD} psql -h ${DB_HOST} -p ${DB_PORT} -U ${DB_USER} -d flexxus_shared -t <<EOF
SELECT 
    tablename,
    CASE WHEN rowsecurity THEN '✓ Habilitado' ELSE '✗ Deshabilitado' END as rls_status
FROM pg_tables 
WHERE schemaname = 'public' 
AND tablename IN ('companies', 'users', 'user_companies')
ORDER BY tablename;
EOF

# Verificar políticas creadas
echo ""
echo -e "${YELLOW}→ Políticas RLS creadas:${NC}"
PGPASSWORD=${DB_PASSWORD} psql -h ${DB_HOST} -p ${DB_PORT} -U ${DB_USER} -d flexxus_shared -t <<EOF
SELECT 
    schemaname || '.' || tablename as tabla,
    policyname as politica,
    CASE 
        WHEN cmd = 'SELECT' THEN 'SELECT'
        WHEN cmd = 'INSERT' THEN 'INSERT'
        WHEN cmd = 'UPDATE' THEN 'UPDATE'
        WHEN cmd = 'DELETE' THEN 'DELETE'
        ELSE cmd
    END as operacion
FROM pg_policies 
WHERE schemaname = 'public'
AND tablename IN ('companies', 'users', 'user_companies')
ORDER BY tablename, cmd;
EOF

echo ""
echo -e "${GREEN}================================================${NC}"
echo -e "${GREEN}  ✅ Row-Level Security aplicado exitosamente${NC}"
echo -e "${GREEN}================================================${NC}"
echo ""
echo "Próximos pasos:"
echo "1. Probar RLS con: node ../test-rls.js"
echo "2. Verificar aislamiento multi-tenant"
echo "3. Actualizar repositorios para usar RLSContext"
echo ""