#!/bin/bash

# ============================================
# Setup Script para Bases de Datos PostgreSQL
# Nivel 1 - MVP Funcional Mínimo
# ============================================

# Variables de configuración - TODO: Mover a .env en Nivel 2
DB_USER="postgres"
DB_PASSWORD="postgres123"  # TODO: Cambiar en producción
DB_HOST="localhost"
DB_PORT="5432"

# Función para ejecutar comandos SQL
execute_sql() {
    PGPASSWORD=$DB_PASSWORD psql -h $DB_HOST -p $DB_PORT -U $DB_USER -c "$1"
}

echo "========================================"
echo "  Configuración de Bases de Datos"
echo "  Flexxus Flow - Nivel 1 (MVP)"
echo "========================================"
echo ""

# 1. Crear las 5 bases de datos necesarias
echo "📦 Creando bases de datos..."

databases=(
    "flexxus_shared"
    "flexxus_omni"
    "flexxus_personas"
    "flexxus_notificaciones"
    "flexxus_organizaciones"
)

for db in "${databases[@]}"
do
    echo "  → Creando $db..."
    execute_sql "CREATE DATABASE $db WITH ENCODING 'UTF8';" 2>/dev/null
    if [ $? -eq 0 ]; then
        echo "    ✓ $db creada exitosamente"
    else
        echo "    ⚠ $db ya existe o error al crear"
    fi
done

# 2. Crear usuario de aplicación
echo ""
echo "👤 Creando usuario de aplicación..."
APP_USER="flexxus_app"
APP_PASSWORD="app_password_123"  # TODO: Mover a .env y usar password seguro

execute_sql "CREATE USER $APP_USER WITH PASSWORD '$APP_PASSWORD';" 2>/dev/null
if [ $? -eq 0 ]; then
    echo "  ✓ Usuario $APP_USER creado"
else
    echo "  ⚠ Usuario $APP_USER ya existe"
fi

# 3. Otorgar permisos básicos
echo ""
echo "🔐 Configurando permisos..."

for db in "${databases[@]}"
do
    echo "  → Permisos para $db..."
    execute_sql "GRANT CONNECT ON DATABASE $db TO $APP_USER;"
    execute_sql "GRANT ALL PRIVILEGES ON DATABASE $db TO $APP_USER;"
done

# 4. Instalar extensiones básicas
echo ""
echo "🔧 Instalando extensiones necesarias..."

for db in "${databases[@]}"
do
    echo "  → Extensiones en $db..."
    PGPASSWORD=$DB_PASSWORD psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $db -c "CREATE EXTENSION IF NOT EXISTS \"uuid-ossp\";" 2>/dev/null
    PGPASSWORD=$DB_PASSWORD psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $db -c "CREATE EXTENSION IF NOT EXISTS \"pgcrypto\";" 2>/dev/null
done

echo ""
echo "========================================"
echo "✅ Setup completado!"
echo ""
echo "📋 Resumen:"
echo "  - 5 bases de datos creadas"
echo "  - Usuario de aplicación: $APP_USER"
echo "  - Extensiones instaladas: uuid-ossp, pgcrypto"
echo ""
echo "⚠️  IMPORTANTE:"
echo "  - Cambiar passwords antes de producción"
echo "  - Configurar SSL para conexiones"
echo "  - Revisar permisos según necesidad"
echo "========================================"