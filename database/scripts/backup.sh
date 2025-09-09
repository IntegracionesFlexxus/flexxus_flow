#!/bin/bash

# ============================================
# Script de Backup de Bases de Datos
# Nivel 1 - MVP Funcional
# ============================================

# Variables de configuración - TODO: Mover a .env en Nivel 2
DB_USER="postgres"
DB_PASSWORD="postgres123"
DB_HOST="localhost"
DB_PORT="5432"

# Directorio de backups
BACKUP_DIR="../backups"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")

# Colores para output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

echo -e "${GREEN}========================================"
echo "  💾 Backup de Bases de Datos"
echo "  Timestamp: $TIMESTAMP"
echo -e "========================================${NC}"
echo ""

# Crear directorio de backups si no existe
mkdir -p $BACKUP_DIR

# Lista de bases de datos
databases=(
    "flexxus_shared"
    "flexxus_omni"
    "flexxus_crm"
    "flexxus_workflow"
    "flexxus_analytics"
)

# Realizar backup de cada base de datos
for db in "${databases[@]}"
do
    echo -e "${YELLOW}→ Respaldando $db...${NC}"
    
    BACKUP_FILE="$BACKUP_DIR/${db}_${TIMESTAMP}.sql"
    
    PGPASSWORD=$DB_PASSWORD pg_dump -h $DB_HOST -p $DB_PORT -U $DB_USER \
        --no-owner --no-acl --clean --if-exists \
        $db > $BACKUP_FILE 2>/dev/null
    
    if [ $? -eq 0 ]; then
        # Comprimir el archivo
        gzip $BACKUP_FILE
        echo -e "${GREEN}  ✓ Backup completado: ${db}_${TIMESTAMP}.sql.gz${NC}"
    else
        echo -e "${RED}  ✗ Error en backup de $db${NC}"
    fi
done

# Limpiar backups antiguos (mantener últimos 7 días)
echo ""
echo -e "${YELLOW}🧹 Limpiando backups antiguos...${NC}"
find $BACKUP_DIR -name "*.sql.gz" -mtime +7 -delete
echo -e "${GREEN}  ✓ Backups antiguos eliminados${NC}"

# Mostrar resumen
echo ""
echo -e "${GREEN}========================================"
echo "  📊 Resumen de Backups"
echo -e "========================================${NC}"
echo "  Ubicación: $BACKUP_DIR"
echo "  Archivos creados:"
ls -lh $BACKUP_DIR/*_${TIMESTAMP}.sql.gz 2>/dev/null | awk '{print "  - " $9 " (" $5 ")"}'
echo ""
echo -e "${GREEN}✅ Backup completado exitosamente${NC}"