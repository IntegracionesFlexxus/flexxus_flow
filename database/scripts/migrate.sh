#!/bin/bash

# ============================================
# Script de Migración de Base de Datos
# Nivel 1 - MVP Funcional
# ============================================

# Variables de configuración - TODO: Mover a .env en Nivel 2
DB_USER="postgres"
DB_PASSWORD="postgres123"
DB_HOST="localhost"
DB_PORT="5432"

# Colores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${GREEN}========================================"
echo "  🚀 Ejecutando Migraciones"
echo "  Flexxus Flow - Database Sprint 1"
echo -e "========================================${NC}"
echo ""

# Función para ejecutar archivo SQL
run_migration() {
    local file=$1
    local db_name=$2
    
    echo -e "${YELLOW}→ Ejecutando: $(basename $file) en $db_name${NC}"
    
    PGPASSWORD=$DB_PASSWORD psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $db_name -f $file 2>&1 | grep -v "NOTICE"
    
    if [ $? -eq 0 ]; then
        echo -e "${GREEN}  ✓ Migración exitosa${NC}"
    else
        echo -e "${RED}  ✗ Error en migración${NC}"
        exit 1
    fi
    echo ""
}

# Ejecutar migraciones en orden
echo -e "${GREEN}📊 Migraciones de Base de Datos Compartida${NC}"
run_migration "../migrations/001_create_companies.sql" "flexxus_shared"
run_migration "../migrations/002_create_users.sql" "flexxus_shared"
run_migration "../migrations/003_create_user_companies.sql" "flexxus_shared"

echo -e "${GREEN}👥 Migraciones de Base de Datos de Personas${NC}"
run_migration "../migrations/004_create_contacts.sql" "flexxus_personas"

# Preguntar si se quieren cargar datos de prueba
echo ""
echo -e "${YELLOW}¿Deseas cargar los datos de prueba? (s/n)${NC}"
read -r response

if [[ "$response" == "s" || "$response" == "S" ]]; then
    echo ""
    echo -e "${GREEN}🌱 Cargando datos de prueba...${NC}"
    PGPASSWORD=$DB_PASSWORD psql -h $DB_HOST -p $DB_PORT -U $DB_USER -f ../seeds/001_seed_initial_data.sql 2>&1 | grep -v "NOTICE"
    
    if [ $? -eq 0 ]; then
        echo -e "${GREEN}✓ Datos de prueba cargados${NC}"
        echo ""
        echo -e "${GREEN}📧 Credenciales de prueba:${NC}"
        echo "  Email: admin@demo.com"
        echo "  Password: admin123"
    else
        echo -e "${RED}✗ Error cargando datos de prueba${NC}"
    fi
fi

echo ""
echo -e "${GREEN}========================================"
echo "  ✅ Migraciones completadas"
echo -e "========================================${NC}"