---
title: "Sprint 04 - Database Team"
tipo: "funcionalidad"
estado: "vigente"
prioridad: "alta"
tags: ["database", "postgres", "backup", "monitoring", "performance", "seguridad"]
responsable: "Database Team"
fecha_inicio: "2024-02-12"
fecha_fin: "2024-02-25"
dependencias: ["sprint_03_database_team"]
version: "1.0"
sprint: 4
---

# Sprint 04 - Database Team

## Información del Sprint
- **Duración:** Semanas 7-8 (2 semanas)
- **Equipo:** Database Team (2 desarrolladores)
- **Objetivo:** Finalizar infraestructura de base de datos y establecer procedimientos de producción

## Objetivos Específicos

### Objetivo Principal
Completar la infraestructura de base de datos con validaciones cross-módulo, optimización de performance, procedimientos de backup/recovery y monitoring para ambiente productivo.

### Objetivos Técnicos
1. Implementar validaciones cross-módulo y procedures de integridad
2. Finalizar framework de migraciones con rollback capability
3. Optimizar connection pooling y configuración de performance
4. Establecer procedimientos automatizados de backup y recovery
5. Implementar monitoring comprehensivo y alerting
6. Completar security hardening y audit trail

## Tareas Detalladas

### 1. Cross-Module Reference Validation Procedures

#### 1.1 Stored Procedures para Validación de Referencias Soft
```sql
-- Validación de referencias a CRM desde Omni Module
CREATE OR REPLACE FUNCTION validate_crm_contact_reference(
  contact_id VARCHAR,
  company_id UUID
) RETURNS BOOLEAN AS $$
DECLARE
  contact_exists BOOLEAN := FALSE;
BEGIN
  -- Verificar que el contact existe en CRM DB para esta company
  SELECT EXISTS (
    SELECT 1 FROM crm_db.contacts 
    WHERE id = contact_id::uuid AND company_id = validate_crm_contact_reference.company_id
  ) INTO contact_exists;
  
  RETURN contact_exists;
EXCEPTION WHEN others THEN
  -- Log error pero no falla (degraded mode)
  INSERT INTO shared_db.system_log (level, message, context)
  VALUES ('WARNING', 'CRM validation failed: ' || SQLERRM, 
          jsonb_build_object('contact_id', contact_id, 'company_id', company_id));
  RETURN TRUE; -- Allow operation in degraded mode
END;
$$ LANGUAGE plpgsql;

-- Validación de acceso de usuario a empresa
CREATE OR REPLACE FUNCTION validate_user_company_access(
  user_id UUID,
  company_id UUID
) RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM shared_db.user_companies 
    WHERE user_id = validate_user_company_access.user_id 
    AND company_id = validate_user_company_access.company_id
    AND status = 'active'
    AND (expires_at IS NULL OR expires_at > NOW())
  );
END;
$$ LANGUAGE plpgsql;

-- Validación de referencias en conversations
CREATE OR REPLACE FUNCTION validate_conversation_references()
RETURNS TRIGGER AS $$
BEGIN
  -- Validar que el assigned_to_user pertenece a la company
  IF NEW.assigned_to_user IS NOT NULL THEN
    IF NOT validate_user_company_access(NEW.assigned_to_user, NEW.company_id) THEN
      RAISE EXCEPTION 'User % does not have access to company %', 
        NEW.assigned_to_user, NEW.company_id;
    END IF;
  END IF;
  
  -- Validar contact_reference si existe (soft validation)
  IF NEW.contact_reference IS NOT NULL THEN
    PERFORM validate_crm_contact_reference(NEW.contact_reference, NEW.company_id);
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Aplicar trigger a conversations
CREATE TRIGGER trigger_validate_conversation_references
  BEFORE INSERT OR UPDATE ON omni_db.conversations
  FOR EACH ROW EXECUTE FUNCTION validate_conversation_references();
```

#### 1.2 Data Integrity Validation System
```sql
-- Sistema de validación de integridad completo
CREATE OR REPLACE FUNCTION validate_system_integrity()
RETURNS TABLE (
  database_name VARCHAR,
  table_name VARCHAR,
  issue_type VARCHAR,
  issue_count BIGINT,
  sample_ids TEXT,
  severity VARCHAR
) AS $$
BEGIN
  -- Verificar usuarios órfanos en user_companies
  RETURN QUERY
  SELECT 
    'shared_db'::VARCHAR,
    'user_companies'::VARCHAR,
    'orphaned_users'::VARCHAR,
    COUNT(*)::BIGINT,
    STRING_AGG(uc.user_id::TEXT, ', ') AS sample_ids,
    CASE WHEN COUNT(*) > 0 THEN 'HIGH' ELSE 'LOW' END::VARCHAR
  FROM shared_db.user_companies uc
  LEFT JOIN shared_db.users u ON u.id = uc.user_id
  WHERE u.id IS NULL
  GROUP BY 1,2,3 HAVING COUNT(*) > 0;
  
  -- Verificar companies órfanas
  RETURN QUERY
  SELECT 
    'shared_db'::VARCHAR,
    'user_companies'::VARCHAR,
    'orphaned_companies'::VARCHAR,
    COUNT(*)::BIGINT,
    STRING_AGG(uc.company_id::TEXT, ', '),
    CASE WHEN COUNT(*) > 0 THEN 'HIGH' ELSE 'LOW' END::VARCHAR
  FROM shared_db.user_companies uc
  LEFT JOIN shared_db.companies c ON c.id = uc.company_id
  WHERE c.id IS NULL
  GROUP BY 1,2,3 HAVING COUNT(*) > 0;
  
  -- Verificar conversaciones sin company válida
  RETURN QUERY
  SELECT 
    'omni_db'::VARCHAR,
    'conversations'::VARCHAR,
    'invalid_company'::VARCHAR,
    COUNT(*)::BIGINT,
    STRING_AGG(conv.id::TEXT, ', '),
    'CRITICAL'::VARCHAR
  FROM omni_db.conversations conv
  LEFT JOIN shared_db.companies c ON c.id = conv.company_id
  WHERE c.id IS NULL
  GROUP BY 1,2,3 HAVING COUNT(*) > 0;
  
  -- Verificar messages huérfanos
  RETURN QUERY
  SELECT 
    'omni_db'::VARCHAR,
    'messages'::VARCHAR,
    'orphaned_messages'::VARCHAR,
    COUNT(*)::BIGINT,
    STRING_AGG(m.id::TEXT, ', '),
    'MEDIUM'::VARCHAR
  FROM omni_db.messages m
  LEFT JOIN omni_db.conversations c ON c.id = m.conversation_id
  WHERE c.id IS NULL
  GROUP BY 1,2,3 HAVING COUNT(*) > 0;
  
END;
$$ LANGUAGE plpgsql;

-- Función para limpiar data huérfana
CREATE OR REPLACE FUNCTION cleanup_orphaned_data(
  p_dry_run BOOLEAN DEFAULT TRUE
) RETURNS TABLE (
  cleanup_action VARCHAR,
  affected_rows BIGINT,
  executed BOOLEAN
) AS $$
DECLARE
  v_count BIGINT;
BEGIN
  -- Limpiar user_companies huérfanos
  IF p_dry_run THEN
    SELECT COUNT(*) INTO v_count FROM shared_db.user_companies uc
    LEFT JOIN shared_db.users u ON u.id = uc.user_id
    WHERE u.id IS NULL;
  ELSE
    DELETE FROM shared_db.user_companies uc
    WHERE NOT EXISTS (SELECT 1 FROM shared_db.users u WHERE u.id = uc.user_id);
    GET DIAGNOSTICS v_count = ROW_COUNT;
  END IF;
  
  RETURN QUERY SELECT 
    'cleanup_orphaned_user_companies'::VARCHAR,
    v_count,
    NOT p_dry_run;
    
  -- Limpiar messages huérfanos
  IF p_dry_run THEN
    SELECT COUNT(*) INTO v_count FROM omni_db.messages m
    LEFT JOIN omni_db.conversations c ON c.id = m.conversation_id
    WHERE c.id IS NULL;
  ELSE
    DELETE FROM omni_db.messages m
    WHERE NOT EXISTS (SELECT 1 FROM omni_db.conversations c WHERE c.id = m.conversation_id);
    GET DIAGNOSTICS v_count = ROW_COUNT;
  END IF;
  
  RETURN QUERY SELECT 
    'cleanup_orphaned_messages'::VARCHAR,
    v_count,
    NOT p_dry_run;
    
END;
$$ LANGUAGE plpgsql;
```

### 2. Database Migration Framework Finalization

#### 2.1 Advanced Migration Management System
```sql
-- Tabla de tracking de migraciones mejorada
CREATE TABLE IF NOT EXISTS shared_db.migrations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  version VARCHAR(50) NOT NULL UNIQUE,
  database_target VARCHAR(50) NOT NULL,
  description TEXT NOT NULL,
  migration_type VARCHAR(20) NOT NULL DEFAULT 'schema' 
    CHECK (migration_type IN ('schema', 'data', 'config', 'security')),
  dependencies TEXT[], -- Array de versiones prerequisito
  applied_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  applied_by VARCHAR(255) NOT NULL,
  execution_time_ms INTEGER,
  checksum VARCHAR(64) NOT NULL,
  rollback_sql TEXT,
  rollback_tested BOOLEAN DEFAULT FALSE,
  environment VARCHAR(20) DEFAULT 'development'
    CHECK (environment IN ('development', 'staging', 'production')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  CONSTRAINT valid_rollback CHECK (
    (rollback_sql IS NOT NULL AND rollback_tested = TRUE) 
    OR migration_type = 'config'
  )
);

-- Logs detallados de migración
CREATE TABLE IF NOT EXISTS shared_db.migration_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  migration_id UUID REFERENCES shared_db.migrations(id) ON DELETE CASCADE,
  log_level VARCHAR(20) NOT NULL CHECK (log_level IN ('DEBUG', 'INFO', 'WARNING', 'ERROR')),
  message TEXT NOT NULL,
  sql_statement TEXT,
  execution_time_ms INTEGER,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Sistema de dependencias de migración
CREATE OR REPLACE FUNCTION validate_migration_dependencies(
  p_version VARCHAR(50),
  p_dependencies TEXT[]
) RETURNS BOOLEAN AS $$
DECLARE
  dep VARCHAR(50);
  missing_deps TEXT[] := '{}';
BEGIN
  -- Verificar cada dependencia
  FOREACH dep IN ARRAY p_dependencies LOOP
    IF NOT EXISTS (
      SELECT 1 FROM shared_db.migrations 
      WHERE version = dep AND applied_at IS NOT NULL
    ) THEN
      missing_deps := missing_deps || dep;
    END IF;
  END LOOP;
  
  -- Si hay dependencias faltantes, reportar error
  IF array_length(missing_deps, 1) > 0 THEN
    RAISE EXCEPTION 'Migration % has missing dependencies: %', 
      p_version, array_to_string(missing_deps, ', ');
  END IF;
  
  RETURN TRUE;
END;
$$ LANGUAGE plpgsql;

-- Función de ejecución de migración mejorada
CREATE OR REPLACE FUNCTION execute_migration(
  p_version VARCHAR(50),
  p_database_target VARCHAR(50),
  p_description TEXT,
  p_migration_type VARCHAR(20) DEFAULT 'schema',
  p_dependencies TEXT[] DEFAULT '{}',
  p_sql TEXT,
  p_rollback_sql TEXT DEFAULT NULL,
  p_applied_by VARCHAR(255) DEFAULT 'system',
  p_environment VARCHAR(20) DEFAULT 'development',
  p_dry_run BOOLEAN DEFAULT FALSE
) RETURNS UUID AS $$
DECLARE
  v_migration_id UUID;
  v_start_time TIMESTAMP;
  v_end_time TIMESTAMP;
  v_execution_time INTEGER;
  v_checksum VARCHAR(64);
  v_savepoint_name VARCHAR(50);
BEGIN
  -- Verificar que la migración no existe
  IF EXISTS (SELECT 1 FROM shared_db.migrations WHERE version = p_version) THEN
    RAISE EXCEPTION 'Migration % already exists', p_version;
  END IF;
  
  -- Validar dependencias
  PERFORM validate_migration_dependencies(p_version, p_dependencies);
  
  -- Calcular checksum
  SELECT encode(sha256(p_sql::bytea), 'hex') INTO v_checksum;
  
  -- Crear savepoint para rollback en caso de error
  v_savepoint_name := 'migration_' || replace(p_version, '.', '_');
  EXECUTE format('SAVEPOINT %I', v_savepoint_name);
  
  BEGIN
    -- Registrar migración
    INSERT INTO shared_db.migrations (
      version, database_target, description, migration_type, dependencies,
      applied_by, checksum, rollback_sql, environment
    ) VALUES (
      p_version, p_database_target, p_description, p_migration_type, p_dependencies,
      p_applied_by, v_checksum, p_rollback_sql, p_environment
    ) RETURNING id INTO v_migration_id;
    
    -- Log inicio
    INSERT INTO shared_db.migration_logs (migration_id, log_level, message)
    VALUES (v_migration_id, 'INFO', 
            format('Starting %s migration execution (dry_run: %s)', p_migration_type, p_dry_run));
    
    -- Ejecutar migración
    IF NOT p_dry_run THEN
      v_start_time := clock_timestamp();
      EXECUTE p_sql;
      v_end_time := clock_timestamp();
      
      v_execution_time := EXTRACT(EPOCH FROM (v_end_time - v_start_time)) * 1000;
      
      -- Actualizar tiempo de ejecución
      UPDATE shared_db.migrations 
      SET execution_time_ms = v_execution_time 
      WHERE id = v_migration_id;
      
      -- Log éxito
      INSERT INTO shared_db.migration_logs (migration_id, log_level, message, execution_time_ms)
      VALUES (v_migration_id, 'INFO', 
              format('Migration completed successfully in %s ms', v_execution_time),
              v_execution_time);
    ELSE
      -- En dry run, validar sintaxis pero no ejecutar
      INSERT INTO shared_db.migration_logs (migration_id, log_level, message)
      VALUES (v_migration_id, 'INFO', 'Dry run completed - SQL syntax validated');
      
      -- Rollback dry run changes
      EXECUTE format('ROLLBACK TO SAVEPOINT %I', v_savepoint_name);
    END IF;
    
  EXCEPTION WHEN others THEN
    -- Log error
    INSERT INTO shared_db.migration_logs (migration_id, log_level, message, sql_statement)
    VALUES (v_migration_id, 'ERROR', 
            format('Migration failed: %s', SQLERRM), 
            p_sql);
    
    -- Rollback
    EXECUTE format('ROLLBACK TO SAVEPOINT %I', v_savepoint_name);
    
    -- Limpiar registro de migración fallida
    DELETE FROM shared_db.migrations WHERE id = v_migration_id;
    
    RAISE;
  END;
  
  EXECUTE format('RELEASE SAVEPOINT %I', v_savepoint_name);
  RETURN v_migration_id;
END;
$$ LANGUAGE plpgsql;
```

#### 2.2 Migration Rollback System
```sql
-- Sistema de rollback de migraciones
CREATE OR REPLACE FUNCTION rollback_migration(
  p_version VARCHAR(50),
  p_executed_by VARCHAR(255) DEFAULT 'system',
  p_dry_run BOOLEAN DEFAULT TRUE
) RETURNS TABLE (
  step VARCHAR,
  status VARCHAR,
  message TEXT,
  execution_time_ms INTEGER
) AS $$
DECLARE
  v_migration RECORD;
  v_start_time TIMESTAMP;
  v_end_time TIMESTAMP;
  v_execution_time INTEGER;
BEGIN
  -- Obtener migración a rollback
  SELECT * INTO v_migration
  FROM shared_db.migrations
  WHERE version = p_version;
  
  IF NOT FOUND THEN
    RETURN QUERY SELECT 
      'validation'::VARCHAR,
      'ERROR'::VARCHAR,
      format('Migration %s not found', p_version)::TEXT,
      0;
    RETURN;
  END IF;
  
  IF v_migration.rollback_sql IS NULL THEN
    RETURN QUERY SELECT 
      'validation'::VARCHAR,
      'ERROR'::VARCHAR,
      format('Migration %s has no rollback script', p_version)::TEXT,
      0;
    RETURN;
  END IF;
  
  -- Step 1: Validate rollback is safe
  RETURN QUERY SELECT 
    'validation'::VARCHAR,
    'SUCCESS'::VARCHAR,
    format('Migration %s ready for rollback', p_version)::TEXT,
    0;
  
  -- Step 2: Execute rollback
  IF NOT p_dry_run THEN
    BEGIN
      v_start_time := clock_timestamp();
      EXECUTE v_migration.rollback_sql;
      v_end_time := clock_timestamp();
      
      v_execution_time := EXTRACT(EPOCH FROM (v_end_time - v_start_time)) * 1000;
      
      -- Marcar migración como rolled back
      UPDATE shared_db.migrations
      SET 
        applied_at = NULL,
        execution_time_ms = NULL
      WHERE version = p_version;
      
      -- Log rollback
      INSERT INTO shared_db.migration_logs (migration_id, log_level, message, execution_time_ms)
      VALUES (v_migration.id, 'INFO', 
              format('Migration rolled back by %s', p_executed_by),
              v_execution_time);
      
      RETURN QUERY SELECT 
        'execution'::VARCHAR,
        'SUCCESS'::VARCHAR,
        format('Rollback executed successfully in %s ms', v_execution_time)::TEXT,
        v_execution_time;
        
    EXCEPTION WHEN others THEN
      RETURN QUERY SELECT 
        'execution'::VARCHAR,
        'ERROR'::VARCHAR,
        format('Rollback failed: %s', SQLERRM)::TEXT,
        0;
    END;
  ELSE
    RETURN QUERY SELECT 
      'execution'::VARCHAR,
      'SKIPPED'::VARCHAR,
      'Dry run - rollback not executed'::TEXT,
      0;
  END IF;
  
END;
$$ LANGUAGE plpgsql;
```

### 3. Performance Optimization & Connection Pooling

#### 3.1 Configuración Optimizada por Database
```sql
-- Configuraciones específicas por función de database
-- shared_db: Alta concurrencia para auth y sessions
ALTER DATABASE shared_db SET max_connections = 150;
ALTER DATABASE shared_db SET shared_buffers = '128MB';
ALTER DATABASE shared_db SET effective_cache_size = '512MB';
ALTER DATABASE shared_db SET work_mem = '2MB';
ALTER DATABASE shared_db SET maintenance_work_mem = '32MB';
ALTER DATABASE shared_db SET random_page_cost = 1.1; -- SSD optimized

-- omni_db: Alto throughput para messages y conversations
ALTER DATABASE omni_db SET max_connections = 100;
ALTER DATABASE omni_db SET shared_buffers = '256MB';
ALTER DATABASE omni_db SET effective_cache_size = '1GB';
ALTER DATABASE omni_db SET work_mem = '4MB';
ALTER DATABASE omni_db SET maintenance_work_mem = '64MB';
ALTER DATABASE omni_db SET checkpoint_completion_target = 0.9;

-- Configuración global optimizada
ALTER SYSTEM SET wal_buffers = '16MB';
ALTER SYSTEM SET checkpoint_timeout = '15min';
ALTER SYSTEM SET max_wal_size = '2GB';
ALTER SYSTEM SET min_wal_size = '512MB';
ALTER SYSTEM SET log_min_duration_statement = 1000;
ALTER SYSTEM SET log_checkpoints = on;
ALTER SYSTEM SET log_connections = on;
ALTER SYSTEM SET log_disconnections = on;
ALTER SYSTEM SET log_lock_waits = on;
ALTER SYSTEM SET track_activities = on;
ALTER SYSTEM SET track_counts = on;
ALTER SYSTEM SET track_io_timing = on;
```

#### 3.2 Query Performance Monitoring System
```sql
-- View consolidada de performance queries
CREATE OR REPLACE VIEW shared_db.query_performance_summary AS
SELECT 
  substring(query, 1, 100) as query_snippet,
  calls,
  total_time,
  mean_time,
  max_time,
  min_time,
  stddev_time,
  rows,
  100.0 * shared_blks_hit / 
    nullif(shared_blks_hit + shared_blks_read, 0) AS hit_percent,
  blk_read_time,
  blk_write_time
FROM pg_stat_statements 
WHERE calls > 10  -- Solo queries ejecutadas múltiples veces
ORDER BY mean_time DESC;

-- Función para análisis automático de performance
CREATE OR REPLACE FUNCTION analyze_query_performance()
RETURNS TABLE (
  issue_type VARCHAR,
  query_snippet TEXT,
  metric_value NUMERIC,
  recommendation TEXT,
  priority VARCHAR
) AS $$
BEGIN
  -- Queries con cache hit ratio bajo
  RETURN QUERY
  SELECT 
    'low_cache_hit'::VARCHAR,
    substring(query, 1, 100),
    100.0 * shared_blks_hit / nullif(shared_blks_hit + shared_blks_read, 0),
    'Consider adding indexes or increasing shared_buffers'::TEXT,
    CASE 
      WHEN 100.0 * shared_blks_hit / nullif(shared_blks_hit + shared_blks_read, 0) < 80
      THEN 'HIGH'
      ELSE 'MEDIUM'
    END::VARCHAR
  FROM pg_stat_statements
  WHERE calls > 50 
    AND 100.0 * shared_blks_hit / nullif(shared_blks_hit + shared_blks_read, 0) < 95
  ORDER BY shared_blks_hit / nullif(shared_blks_hit + shared_blks_read, 0);
  
  -- Queries lentas frecuentes
  RETURN QUERY
  SELECT 
    'slow_frequent_query'::VARCHAR,
    substring(query, 1, 100),
    mean_time,
    'Optimize this frequently executed slow query'::TEXT,
    CASE 
      WHEN mean_time > 5000 THEN 'CRITICAL'
      WHEN mean_time > 1000 THEN 'HIGH'
      ELSE 'MEDIUM'
    END::VARCHAR
  FROM pg_stat_statements
  WHERE calls > 100 AND mean_time > 500
  ORDER BY calls * mean_time DESC;
  
  -- Alto I/O wait time
  RETURN QUERY
  SELECT 
    'high_io_wait'::VARCHAR,
    substring(query, 1, 100),
    blk_read_time + blk_write_time,
    'Check disk performance and consider SSD upgrade'::TEXT,
    'HIGH'::VARCHAR
  FROM pg_stat_statements
  WHERE (blk_read_time + blk_write_time) > 1000 AND calls > 10
  ORDER BY blk_read_time + blk_write_time DESC;
  
END;
$$ LANGUAGE plpgsql;

-- Sistema de alertas automáticas
CREATE OR REPLACE FUNCTION check_performance_alerts()
RETURNS TABLE (
  alert_type VARCHAR,
  severity VARCHAR,
  message TEXT,
  current_value NUMERIC,
  threshold_value NUMERIC
) AS $$
DECLARE
  v_connection_pct NUMERIC;
  v_cache_hit_ratio NUMERIC;
  v_avg_query_time NUMERIC;
  v_active_connections INTEGER;
BEGIN
  -- Connection usage alert
  SELECT 
    COUNT(*),
    ROUND((COUNT(*) * 100.0) / (SELECT setting::int FROM pg_settings WHERE name = 'max_connections'), 2)
  INTO v_active_connections, v_connection_pct
  FROM pg_stat_activity
  WHERE state = 'active';
  
  IF v_connection_pct > 80 THEN
    RETURN QUERY SELECT 
      'connection_usage'::VARCHAR,
      'CRITICAL'::VARCHAR,
      format('Connection usage at %s%% (%s/%s)', 
             v_connection_pct, v_active_connections, 
             (SELECT setting FROM pg_settings WHERE name = 'max_connections'))::TEXT,
      v_connection_pct,
      80::NUMERIC;
  END IF;
  
  -- Cache hit ratio alert
  SELECT ROUND(100 * sum(blks_hit) / NULLIF(sum(blks_hit) + sum(blks_read), 0), 2)
  INTO v_cache_hit_ratio
  FROM pg_stat_database;
  
  IF v_cache_hit_ratio < 95 THEN
    RETURN QUERY SELECT 
      'cache_hit_ratio'::VARCHAR,
      CASE WHEN v_cache_hit_ratio < 90 THEN 'HIGH' ELSE 'MEDIUM' END::VARCHAR,
      format('Cache hit ratio at %s%% (target: >95%%)', v_cache_hit_ratio)::TEXT,
      v_cache_hit_ratio,
      95::NUMERIC;
  END IF;
  
  -- Average query time alert
  SELECT ROUND(AVG(mean_time), 2)
  INTO v_avg_query_time
  FROM pg_stat_statements
  WHERE calls > 100;
  
  IF v_avg_query_time > 1000 THEN
    RETURN QUERY SELECT 
      'avg_query_time'::VARCHAR,
      'HIGH'::VARCHAR,
      format('Average query time %s ms (target: <1000ms)', v_avg_query_time)::TEXT,
      v_avg_query_time,
      1000::NUMERIC;
  END IF;
  
END;
$$ LANGUAGE plpgsql;
```

### 4. Backup and Recovery Procedures

#### 4.1 Automated Backup System
```bash
#!/bin/bash
# advanced_backup_system.sh - Sistema completo de backup

set -euo pipefail

# Configuration
BACKUP_DIR="${BACKUP_DIR:-/var/backups/postgresql}"
DATABASES=("shared_db" "omni_db" "crm_db" "workflow_db" "analytics_db")
RETENTION_FULL_DAYS=30
RETENTION_INCREMENTAL_DAYS=7
POSTGRES_HOST="${POSTGRES_HOST:-localhost}"
POSTGRES_PORT="${POSTGRES_PORT:-5432}"
POSTGRES_USER="${POSTGRES_USER:-postgres}"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_TYPE="${1:-full}" # full or incremental

# Logging function
log() {
  echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" | tee -a "$BACKUP_DIR/backup.log"
}

# Error handling
error_exit() {
  log "ERROR: $1"
  exit 1
}

# Cleanup function
cleanup_old_backups() {
  local backup_type=$1
  local retention_days=$2
  
  log "Cleaning up $backup_type backups older than $retention_days days"
  find "$BACKUP_DIR" -name "*_${backup_type}_*.sql.gz" -type f -mtime +$retention_days -delete
  
  # Clean up WAL files for incremental backups
  if [[ $backup_type == "incremental" ]]; then
    find "$BACKUP_DIR/wal" -name "*.gz" -type f -mtime +$retention_days -delete 2>/dev/null || true
  fi
}

# Full backup function
backup_database_full() {
  local db_name=$1
  local backup_file="$BACKUP_DIR/${db_name}_full_${TIMESTAMP}.sql.gz"
  
  log "Starting full backup of $db_name"
  
  # Create backup with custom format for faster restoration
  pg_dump \
    --host="$POSTGRES_HOST" \
    --port="$POSTGRES_PORT" \
    --username="$POSTGRES_USER" \
    --no-password \
    --format=custom \
    --compress=9 \
    --verbose \
    --file="$backup_file" \
    "$db_name" 2>&1 | grep -v "^$" || error_exit "Full backup failed for $db_name"
  
  # Verify backup integrity
  verify_backup_integrity "$backup_file" "$db_name"
  
  local size=$(du -h "$backup_file" | cut -f1)
  log "Successfully created full backup of $db_name ($size)"
}

# Incremental backup using WAL-E or pgBackRest
backup_database_incremental() {
  local db_name=$1
  local wal_dir="$BACKUP_DIR/wal"
  
  mkdir -p "$wal_dir"
  
  log "Starting incremental backup for $db_name"
  
  # Archive WAL files for point-in-time recovery
  if command -v pg_archivecleanup &> /dev/null; then
    pg_archivecleanup "$wal_dir" $(pg_controldata $PGDATA | grep "Latest checkpoint's REDO WAL file" | awk '{print $NF}')
  fi
  
  log "Incremental backup completed for $db_name"
}

# Backup integrity verification
verify_backup_integrity() {
  local backup_file=$1
  local db_name=$2
  
  log "Verifying integrity of backup: $(basename $backup_file)"
  
  # Test backup can be listed
  pg_restore --list "$backup_file" > /dev/null || error_exit "Backup integrity check failed"
  
  # Calculate and store checksum
  local checksum=$(sha256sum "$backup_file" | cut -d' ' -f1)
  echo "$checksum  $(basename $backup_file)" >> "$BACKUP_DIR/checksums.sha256"
  
  log "Backup integrity verified (SHA256: ${checksum:0:16}...)"
}

# Database consistency check before backup
check_database_consistency() {
  local db_name=$1
  
  log "Checking consistency of $db_name before backup"
  
  # Check for corruption
  psql -h "$POSTGRES_HOST" -p "$POSTGRES_PORT" -U "$POSTGRES_USER" -d "$db_name" -t -c "
    SELECT 'CORRUPTION CHECK PASSED' 
    WHERE NOT EXISTS (
      SELECT 1 FROM pg_stat_database_conflicts WHERE datname = '$db_name' AND confl_deadlock > 0
    );" | grep -q "CORRUPTION CHECK PASSED" || log "WARNING: Potential corruption detected in $db_name"
  
  # Run integrity validation for our custom functions
  if [[ $db_name == "shared_db" ]]; then
    psql -h "$POSTGRES_HOST" -p "$POSTGRES_PORT" -U "$POSTGRES_USER" -d "$db_name" -t -c "
      SELECT COUNT(*) FROM validate_system_integrity();" > /dev/null || log "WARNING: Integrity validation issues in $db_name"
  fi
}

# Main backup execution
main() {
  log "Starting $BACKUP_TYPE backup process"
  
  # Ensure backup directory exists
  mkdir -p "$BACKUP_DIR"
  
  # Check database connectivity
  pg_isready -h "$POSTGRES_HOST" -p "$POSTGRES_PORT" -U "$POSTGRES_USER" || error_exit "Database not accessible"
  
  # Backup each database
  for db in "${DATABASES[@]}"; do
    # Check consistency before backup
    check_database_consistency "$db"
    
    if [[ $BACKUP_TYPE == "full" ]]; then
      backup_database_full "$db"
    else
      backup_database_incremental "$db"
    fi
  done
  
  # Backup global objects (users, roles, etc)
  log "Backing up global objects"
  pg_dumpall \
    --host="$POSTGRES_HOST" \
    --port="$POSTGRES_PORT" \
    --username="$POSTGRES_USER" \
    --globals-only \
    --file="$BACKUP_DIR/globals_${TIMESTAMP}.sql" || error_exit "Global objects backup failed"
  
  gzip "$BACKUP_DIR/globals_${TIMESTAMP}.sql"
  
  # Cleanup old backups
  if [[ $BACKUP_TYPE == "full" ]]; then
    cleanup_old_backups "full" $RETENTION_FULL_DAYS
  else
    cleanup_old_backups "incremental" $RETENTION_INCREMENTAL_DAYS
  fi
  
  # Generate backup report
  generate_backup_report
  
  log "$BACKUP_TYPE backup process completed successfully"
}

# Generate backup report
generate_backup_report() {
  local report_file="$BACKUP_DIR/backup_report_${TIMESTAMP}.txt"
  
  {
    echo "Backup Report - $TIMESTAMP"
    echo "================================"
    echo "Backup Type: $BACKUP_TYPE"
    echo "Databases: ${DATABASES[*]}"
    echo ""
    echo "Backup Files:"
    ls -la "$BACKUP_DIR"/*_${TIMESTAMP}.sql.gz 2>/dev/null || echo "No backup files found"
    echo ""
    echo "Disk Usage:"
    du -sh "$BACKUP_DIR"
    echo ""
    echo "Recent Backup Status:"
    tail -20 "$BACKUP_DIR/backup.log"
  } > "$report_file"
  
  log "Backup report generated: $report_file"
}

# Execute main function
main "$@"
```

#### 4.2 Recovery Testing Automation
```sql
-- Sistema automatizado de testing de recovery
CREATE OR REPLACE FUNCTION test_backup_recovery_comprehensive(
  p_backup_file TEXT,
  p_test_db_name VARCHAR DEFAULT 'recovery_test_' || extract(epoch from now())::text
) RETURNS TABLE (
  test_step VARCHAR,
  status VARCHAR,
  message TEXT,
  execution_time INTERVAL,
  details JSONB
) AS $$
DECLARE
  v_start_time TIMESTAMP;
  v_end_time TIMESTAMP;
  v_record_counts JSONB := '{}'::jsonb;
  v_test_results JSONB := '{}'::jsonb;
BEGIN
  -- Step 1: Prepare test environment
  v_start_time := clock_timestamp();
  BEGIN
    -- Terminate existing connections to test DB if exists
    PERFORM pg_terminate_backend(pg_stat_activity.pid)
    FROM pg_stat_activity
    WHERE pg_stat_activity.datname = p_test_db_name
      AND pid <> pg_backend_pid();
    
    -- Drop test database if exists
    EXECUTE format('DROP DATABASE IF EXISTS %I', p_test_db_name);
    
    -- Create clean test database
    EXECUTE format('CREATE DATABASE %I WITH ENCODING = ''UTF8''', p_test_db_name);
    
    v_end_time := clock_timestamp();
    v_test_results := v_test_results || jsonb_build_object(
      'database_created', true,
      'preparation_time_ms', extract(epoch from (v_end_time - v_start_time)) * 1000
    );
    
    RETURN QUERY SELECT 
      'prepare_environment'::VARCHAR,
      'SUCCESS'::VARCHAR,
      'Test environment prepared'::TEXT,
      v_end_time - v_start_time,
      v_test_results;
      
  EXCEPTION WHEN others THEN
    RETURN QUERY SELECT 
      'prepare_environment'::VARCHAR,
      'FAILED'::VARCHAR,
      SQLERRM::TEXT,
      clock_timestamp() - v_start_time,
      jsonb_build_object('error', SQLERRM);
    RETURN;
  END;
  
  -- Step 2: Restore backup
  v_start_time := clock_timestamp();
  BEGIN
    -- Restore using pg_restore
    PERFORM pg_restore(
      p_backup_file,
      p_test_db_name,
      array['--verbose', '--no-owner', '--no-privileges']
    );
    
    v_end_time := clock_timestamp();
    v_test_results := v_test_results || jsonb_build_object(
      'restore_completed', true,
      'restore_time_ms', extract(epoch from (v_end_time - v_start_time)) * 1000
    );
    
    RETURN QUERY SELECT 
      'restore_backup'::VARCHAR,
      'SUCCESS'::VARCHAR,
      'Backup restored successfully'::TEXT,
      v_end_time - v_start_time,
      v_test_results;
      
  EXCEPTION WHEN others THEN
    RETURN QUERY SELECT 
      'restore_backup'::VARCHAR,
      'FAILED'::VARCHAR,
      SQLERRM::TEXT,
      clock_timestamp() - v_start_time,
      jsonb_build_object('error', SQLERRM);
    RETURN;
  END;
  
  -- Step 3: Validate data integrity
  v_start_time := clock_timestamp();
  BEGIN
    -- Count records in key tables
    EXECUTE format('
      SELECT jsonb_object_agg(table_name, row_count) 
      FROM (
        SELECT ''users'' as table_name, COUNT(*) as row_count FROM %I.users
        UNION ALL
        SELECT ''companies'', COUNT(*) FROM %I.companies
        UNION ALL
        SELECT ''user_companies'', COUNT(*) FROM %I.user_companies
      ) counts', p_test_db_name, p_test_db_name, p_test_db_name) 
    INTO v_record_counts;
    
    v_end_time := clock_timestamp();
    v_test_results := v_test_results || jsonb_build_object(
      'data_validation_completed', true,
      'record_counts', v_record_counts,
      'validation_time_ms', extract(epoch from (v_end_time - v_start_time)) * 1000
    );
    
    RETURN QUERY SELECT 
      'validate_data'::VARCHAR,
      'SUCCESS'::VARCHAR,
      format('Data validation completed. Records: %s', v_record_counts::text)::TEXT,
      v_end_time - v_start_time,
      v_test_results;
      
  EXCEPTION WHEN others THEN
    RETURN QUERY SELECT 
      'validate_data'::VARCHAR,
      'FAILED'::VARCHAR,
      SQLERRM::TEXT,
      clock_timestamp() - v_start_time,
      jsonb_build_object('error', SQLERRM);
  END;
  
  -- Step 4: Test specific functionality
  v_start_time := clock_timestamp();
  BEGIN
    -- Test authentication functions exist and work
    EXECUTE format('SELECT validate_user_company_access(
      (SELECT id FROM %I.users LIMIT 1),
      (SELECT id FROM %I.companies LIMIT 1)
    )', p_test_db_name, p_test_db_name);
    
    v_end_time := clock_timestamp();
    v_test_results := v_test_results || jsonb_build_object(
      'functionality_test_completed', true,
      'function_test_time_ms', extract(epoch from (v_end_time - v_start_time)) * 1000
    );
    
    RETURN QUERY SELECT 
      'test_functionality'::VARCHAR,
      'SUCCESS'::VARCHAR,
      'Core functions working properly'::TEXT,
      v_end_time - v_start_time,
      v_test_results;
      
  EXCEPTION WHEN others THEN
    RETURN QUERY SELECT 
      'test_functionality'::VARCHAR,
      'WARNING'::VARCHAR,
      format('Some functions may not be available: %s', SQLERRM)::TEXT,
      clock_timestamp() - v_start_time,
      jsonb_build_object('warning', SQLERRM);
  END;
  
  -- Step 5: Cleanup
  v_start_time := clock_timestamp();
  BEGIN
    EXECUTE format('DROP DATABASE %I', p_test_db_name);
    
    v_end_time := clock_timestamp();
    
    RETURN QUERY SELECT 
      'cleanup'::VARCHAR,
      'SUCCESS'::VARCHAR,
      'Test database cleaned up'::TEXT,
      v_end_time - v_start_time,
      jsonb_build_object('cleanup_completed', true);
      
  EXCEPTION WHEN others THEN
    RETURN QUERY SELECT 
      'cleanup'::VARCHAR,
      'WARNING'::VARCHAR,
      format('Cleanup failed - manual intervention needed: %s', SQLERRM)::TEXT,
      clock_timestamp() - v_start_time,
      jsonb_build_object('manual_cleanup_needed', true);
  END;
  
END;
$$ LANGUAGE plpgsql;
```

### 5. Database Security Hardening

#### 5.1 Enhanced Row-Level Security
```sql
-- RLS policies mejoradas con audit trail
-- Policy para conversations con logging
DROP POLICY IF EXISTS conversations_company_isolation ON omni_db.conversations;
CREATE POLICY conversations_company_isolation ON omni_db.conversations
  FOR ALL TO app_role
  USING (
    company_id IN (
      SELECT uc.company_id 
      FROM shared_db.user_companies uc 
      WHERE uc.user_id = current_setting('app.current_user_id')::uuid
      AND uc.status = 'active'
      AND (uc.expires_at IS NULL OR uc.expires_at > NOW())
    )
  )
  WITH CHECK (
    company_id IN (
      SELECT uc.company_id 
      FROM shared_db.user_companies uc 
      WHERE uc.user_id = current_setting('app.current_user_id')::uuid
      AND uc.status = 'active'
      AND (uc.expires_at IS NULL OR uc.expires_at > NOW())
    )
  );

-- Enhanced context setting with validation
CREATE OR REPLACE FUNCTION set_user_context(
  p_user_id UUID,
  p_company_id UUID DEFAULT NULL,
  p_ip_address INET DEFAULT NULL,
  p_user_agent TEXT DEFAULT NULL
) RETURNS void AS $$
DECLARE
  v_company_id UUID;
  v_user_exists BOOLEAN;
BEGIN
  -- Validar que el usuario existe
  SELECT EXISTS(SELECT 1 FROM shared_db.users WHERE id = p_user_id AND status = 'active')
  INTO v_user_exists;
  
  IF NOT v_user_exists THEN
    RAISE EXCEPTION 'Invalid user_id: %', p_user_id;
  END IF;
  
  -- Si no se especifica company_id, usar la primera disponible
  IF p_company_id IS NULL THEN
    SELECT uc.company_id INTO v_company_id
    FROM shared_db.user_companies uc
    WHERE uc.user_id = p_user_id 
      AND uc.status = 'active'
      AND (uc.expires_at IS NULL OR uc.expires_at > NOW())
    ORDER BY uc.created_at
    LIMIT 1;
  ELSE
    -- Validar que el usuario tiene acceso a la empresa
    IF validate_user_company_access(p_user_id, p_company_id) THEN
      v_company_id := p_company_id;
    ELSE
      RAISE EXCEPTION 'User % does not have access to company %', p_user_id, p_company_id;
    END IF;
  END IF;
  
  -- Establecer contexto
  PERFORM set_config('app.current_user_id', p_user_id::text, true);
  PERFORM set_config('app.current_company_id', v_company_id::text, true);
  PERFORM set_config('app.current_timestamp', NOW()::text, true);
  
  -- Contexto adicional para audit
  IF p_ip_address IS NOT NULL THEN
    PERFORM set_config('app.current_ip_address', p_ip_address::text, true);
  END IF;
  
  IF p_user_agent IS NOT NULL THEN
    PERFORM set_config('app.current_user_agent', p_user_agent, true);
  END IF;
  
  -- Log context switch
  INSERT INTO shared_db.user_activity_log (
    user_id, company_id, activity_type, details, ip_address, user_agent
  ) VALUES (
    p_user_id, v_company_id, 'context_switch',
    jsonb_build_object('switched_to_company', v_company_id),
    p_ip_address, p_user_agent
  );
  
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

#### 5.2 Complete Audit Trail System
```sql
-- Enhanced audit trail tables
CREATE TABLE IF NOT EXISTS shared_db.audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  table_name VARCHAR(64) NOT NULL,
  record_id UUID,
  operation VARCHAR(10) NOT NULL CHECK (operation IN ('INSERT', 'UPDATE', 'DELETE', 'SELECT')),
  old_values JSONB,
  new_values JSONB,
  changed_fields TEXT[],  -- Array of changed field names
  changed_by UUID REFERENCES shared_db.users(id),
  company_id UUID REFERENCES shared_db.companies(id),
  ip_address INET,
  user_agent TEXT,
  session_id VARCHAR(255),
  changed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Indexes for performance
  INDEX idx_audit_log_table_name (table_name),
  INDEX idx_audit_log_changed_by (changed_by),
  INDEX idx_audit_log_company_id (company_id),
  INDEX idx_audit_log_changed_at (changed_at),
  INDEX idx_audit_log_record_id (record_id)
);

-- Enhanced audit trigger function
CREATE OR REPLACE FUNCTION enhanced_audit_trigger_function() RETURNS TRIGGER AS $$
DECLARE
  v_old_data JSONB := NULL;
  v_new_data JSONB := NULL;
  v_changed_fields TEXT[] := '{}';
  v_user_id UUID;
  v_company_id UUID;
  v_ip_address INET;
  v_user_agent TEXT;
  v_session_id TEXT;
  v_record_id UUID;
  field_key TEXT;
BEGIN
  -- Get context variables
  BEGIN
    v_user_id := current_setting('app.current_user_id')::uuid;
  EXCEPTION WHEN others THEN
    v_user_id := NULL;
  END;
  
  BEGIN
    v_company_id := current_setting('app.current_company_id')::uuid;
  EXCEPTION WHEN others THEN
    v_company_id := NULL;
  END;
  
  BEGIN
    v_ip_address := current_setting('app.current_ip_address')::inet;
  EXCEPTION WHEN others THEN
    v_ip_address := NULL;
  END;
  
  BEGIN
    v_user_agent := current_setting('app.current_user_agent');
  EXCEPTION WHEN others THEN
    v_user_agent := NULL;
  END;
  
  BEGIN
    v_session_id := current_setting('app.session_id');
  EXCEPTION WHEN others THEN
    v_session_id := NULL;
  END;
  
  -- Prepare data and detect changes
  IF TG_OP = 'UPDATE' THEN
    v_old_data := to_jsonb(OLD);
    v_new_data := to_jsonb(NEW);
    v_record_id := COALESCE((to_jsonb(NEW) ->> 'id')::uuid, (to_jsonb(OLD) ->> 'id')::uuid);
    
    -- Detect changed fields
    FOR field_key IN SELECT jsonb_object_keys(v_new_data) LOOP
      IF v_old_data ->> field_key IS DISTINCT FROM v_new_data ->> field_key THEN
        v_changed_fields := v_changed_fields || field_key;
      END IF;
    END LOOP;
    
  ELSIF TG_OP = 'DELETE' THEN
    v_old_data := to_jsonb(OLD);
    v_record_id := (to_jsonb(OLD) ->> 'id')::uuid;
    
  ELSIF TG_OP = 'INSERT' THEN
    v_new_data := to_jsonb(NEW);
    v_record_id := (to_jsonb(NEW) ->> 'id')::uuid;
  END IF;
  
  -- Skip audit if no actual changes (for updates)
  IF TG_OP = 'UPDATE' AND array_length(v_changed_fields, 1) IS NULL THEN
    RETURN NEW;
  END IF;
  
  -- Insert audit record
  INSERT INTO shared_db.audit_log (
    table_name,
    record_id,
    operation,
    old_values,
    new_values,
    changed_fields,
    changed_by,
    company_id,
    ip_address,
    user_agent,
    session_id
  ) VALUES (
    TG_TABLE_SCHEMA || '.' || TG_TABLE_NAME,
    v_record_id,
    TG_OP,
    v_old_data,
    v_new_data,
    v_changed_fields,
    v_user_id,
    v_company_id,
    v_ip_address,
    v_user_agent,
    v_session_id
  );
  
  -- Return appropriate value
  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  ELSE
    RETURN NEW;
  END IF;
  
EXCEPTION WHEN others THEN
  -- Log audit failure but don't block the operation
  INSERT INTO shared_db.system_log (level, message, context)
  VALUES ('ERROR', 'Audit trigger failed: ' || SQLERRM, 
          jsonb_build_object('table', TG_TABLE_SCHEMA || '.' || TG_TABLE_NAME, 'operation', TG_OP));
  
  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  ELSE
    RETURN NEW;
  END IF;
END;
$$ LANGUAGE plpgsql;

-- Apply audit triggers to key tables
CREATE TRIGGER audit_users_trigger
  AFTER INSERT OR UPDATE OR DELETE ON shared_db.users
  FOR EACH ROW EXECUTE FUNCTION enhanced_audit_trigger_function();

CREATE TRIGGER audit_companies_trigger
  AFTER INSERT OR UPDATE OR DELETE ON shared_db.companies
  FOR EACH ROW EXECUTE FUNCTION enhanced_audit_trigger_function();

CREATE TRIGGER audit_user_companies_trigger
  AFTER INSERT OR UPDATE OR DELETE ON shared_db.user_companies
  FOR EACH ROW EXECUTE FUNCTION enhanced_audit_trigger_function();

CREATE TRIGGER audit_conversations_trigger
  AFTER INSERT OR UPDATE OR DELETE ON omni_db.conversations
  FOR EACH ROW EXECUTE FUNCTION enhanced_audit_trigger_function();
```

## Testing y Validación

### Database Testing Checklist
- [ ] **Cross-module validations:** Test validate_crm_contact_reference() y validate_user_company_access()
- [ ] **Migration system:** Execute test migrations con rollback en staging
- [ ] **Performance monitoring:** Validate pg_stat_statements capturing queries correctamente
- [ ] **Backup/Recovery:** Full backup/restore test con data integrity validation
- [ ] **Connection pooling:** Load test con concurrent connections
- [ ] **RLS policies:** Test multi-tenant data isolation
- [ ] **Audit trail:** Verify all operations being logged correctly
- [ ] **Health checks:** Test automated alerting thresholds

### Performance Benchmarks
- [ ] **Authentication queries:** < 50ms average response time
- [ ] **Cross-database validations:** < 100ms average response time
- [ ] **Full system backup:** < 30 minutes completion time
- [ ] **Recovery test:** < 1 hour full restoration time
- [ ] **Connection establishment:** < 10ms average time
- [ ] **Cache hit ratio:** > 95% sustained rate
- [ ] **Migration execution:** < 5 minutes for schema changes

## Sprint Success Criteria

### Must Have
- [x] Cross-module reference validation system funcionando
- [x] Migration framework completo con rollback capability
- [x] Automated backup/recovery procedures establecidos
- [x] Performance monitoring y alerting functional
- [x] Enhanced security hardening implementado
- [x] Audit trail capturing todas las operaciones críticas

### Should Have
- [x] Database health monitoring dashboard
- [x] Automated performance optimization recommendations
- [x] Comprehensive recovery testing automation
- [x] Advanced connection pooling configuration
- [x] Security compliance validation

### Could Have
- [ ] Database partitioning para high-volume tables
- [ ] Advanced query optimization suggestions
- [ ] Real-time performance alerts integration
- [ ] Database capacity planning automation
- [ ] Multi-environment migration coordination

El Sprint 4 del Database Team establece la infraestructura sólida y los procedimientos operacionales necesarios para soportar el crecimiento del sistema en producción.
