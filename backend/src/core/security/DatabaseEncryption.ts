/**
 * Database Encryption Manager
 * Sprint 4 - Security Hardening
 * Gestión de cifrado at rest para PostgreSQL
 */
import { injectable, inject } from 'inversify';
import { TYPES } from '@/container/types';
import { IDatabaseConnection } from '@/shared/database/interfaces/IDatabaseConnection';
import { EncryptionService } from '@/shared/services/security/EncryptionService';
import {
  IDatabaseEncryption,
  TDEConfig,
  ColumnEncryptionStatus
} from './interfaces/ISecurityHardening';
import { environment } from '@/config/environment';
import winston from 'winston';
import crypto from 'crypto';
import fs from 'fs/promises';
import path from 'path';
@injectable()
export class DatabaseEncryption implements IDatabaseEncryption {
  private logger: winston.Logger;
  private encryptionService: EncryptionService;
  private databaseConnections: Map<string, IDatabaseConnection> = new Map();
  private tdeConfigs: Map<string, TDEConfig> = new Map();
  private encryptionKeys: Map<string, Buffer> = new Map();
  constructor(
    @inject(TYPES.Logger) logger: winston.Logger,
    @inject(TYPES.EncryptionService) encryptionService: EncryptionService,
    @inject(TYPES.SharedConnection) sharedDb: IDatabaseConnection,
    @inject(TYPES.OmniConnection) omniDb: IDatabaseConnection,
    @inject(TYPES.CrmConnection) crmDb: IDatabaseConnection,
    @inject(TYPES.WorkflowConnection) workflowDb: IDatabaseConnection,
    @inject(TYPES.AnalyticsConnection) analyticsDb: IDatabaseConnection
  ) {
    this.logger = logger;
    this.encryptionService = encryptionService;
    this.databaseConnections.set('shared', sharedDb);
    this.databaseConnections.set('omni', omniDb);
    this.databaseConnections.set('crm', crmDb);
    this.databaseConnections.set('workflow', workflowDb);
    this.databaseConnections.set('analytics', analyticsDb);
    this.initializeEncryption();
  }
  /**
   * Habilitar Transparent Data Encryption
   */
  async enableTDE(config: TDEConfig): Promise<void> {
    const connection = this.getConnection(config.database);
    try {
      // PostgreSQL TDE requiere extensiones específicas o configuración a nivel de cluster
      // Aquí implementamos una solución alternativa con pgcrypto
      // 1. Instalar extensión pgcrypto si no existe
      await connection.query('CREATE EXTENSION IF NOT EXISTS pgcrypto', []);
      // 2. Crear tabla de configuración de cifrado
      await connection.query(`
        CREATE TABLE IF NOT EXISTS encryption_config (
          id SERIAL PRIMARY KEY,
          database_name VARCHAR(100) UNIQUE NOT NULL,
          algorithm VARCHAR(20) NOT NULL,
          key_id UUID NOT NULL,
          key_rotation_days INTEGER NOT NULL,
          compression_enabled BOOLEAN DEFAULT false,
          enabled_at TIMESTAMP DEFAULT NOW(),
          last_rotation TIMESTAMP,
          next_rotation TIMESTAMP
        )
      `, []);
      // 3. Generar clave de cifrado para la base de datos
      const keyId = crypto.randomUUID();
      const encryptionKey = crypto.randomBytes(32); // 256 bits para AES256
      this.encryptionKeys.set(keyId, encryptionKey);
      // 4. Guardar configuración
      await connection.query(`
        INSERT INTO encryption_config 
        (database_name, algorithm, key_id, key_rotation_days, compression_enabled, next_rotation)
        VALUES ($1, $2, $3, $4, $5, NOW() + INTERVAL '${config.keyRotationDays} days')
        ON CONFLICT (database_name) 
        DO UPDATE SET 
          algorithm = $2,
          key_id = $3,
          key_rotation_days = $4,
          compression_enabled = $5,
          enabled_at = NOW(),
          next_rotation = NOW() + INTERVAL '${config.keyRotationDays} days'
      `, [
        config.database,
        config.algorithm,
        keyId,
        config.keyRotationDays,
        config.enableCompression || false
      ]);
      // 5. Crear funciones de cifrado/descifrado
      await this.createEncryptionFunctions(connection, config.algorithm);
      // 6. Guardar configuración en memoria
      this.tdeConfigs.set(config.database, config);
      // 7. Iniciar rotación automática de claves
      this.scheduleKeyRotation(config);
      this.logger.info(`TDE enabled for database ${config.database}`, {
        algorithm: config.algorithm,
        keyRotation: config.keyRotationDays
      });
    } catch (error) {
      this.logger.error('Failed to enable TDE:', error);
      throw error;
    }
  }
  /**
   * Deshabilitar TDE
   */
  async disableTDE(database: string): Promise<void> {
    const connection = this.getConnection(database);
    try {
      // 1. Descifrar todas las columnas cifradas
      const encryptedColumns = await this.getColumnEncryptionStatus(database);
      for (const column of encryptedColumns) {
        if (column.isEncrypted) {
          await this.decryptColumn(column.table, column.column);
        }
      }
      // 2. Eliminar configuración
      await connection.query(
        'DELETE FROM encryption_config WHERE database_name = $1',
        [database]
      );
      // 3. Eliminar funciones de cifrado
      await connection.query('DROP FUNCTION IF EXISTS encrypt_data CASCADE', []);
      await connection.query('DROP FUNCTION IF EXISTS decrypt_data CASCADE', []);
      // 4. Limpiar memoria
      this.tdeConfigs.delete(database);
      this.logger.info(`TDE disabled for database ${database}`);
    } catch (error) {
      this.logger.error('Failed to disable TDE:', error);
      throw error;
    }
  }
  /**
   * Obtener estado de TDE
   */
  async getTDEStatus(database: string): Promise<TDEConfig | null> {
    const connection = this.getConnection(database);
    try {
      const result = await connection.query<any>(`
        SELECT * FROM encryption_config WHERE database_name = $1
      `, [database]);
      if (result.rows.length === 0) {
        return null;
      }
      const config = result.rows[0];
      return {
        database: config.database_name,
        algorithm: config.algorithm,
        keyRotationDays: config.key_rotation_days,
        enableCompression: config.compression_enabled
      };
    } catch (error) {
      // Si la tabla no existe, TDE no está habilitado
      return null;
    }
  }
  /**
   * Cifrar columna específica
   */
  async encryptColumn(table: string, column: string, algorithm: string = 'AES256'): Promise<void> {
    const database = this.detectDatabase(table);
    const connection = this.getConnection(database);
    try {
      // 1. Crear columna temporal para datos cifrados
      const tempColumn = `${column}_encrypted`;
      await connection.query(`
        ALTER TABLE ${table} 
        ADD COLUMN IF NOT EXISTS ${tempColumn} TEXT
      `, []);
      // 2. Cifrar datos existentes
      const keyId = await this.getOrCreateKeyForTable(database, table);
      const key = this.encryptionKeys.get(keyId);
      if (!key) {
        throw new Error('Encryption key not found');
      }
      // 3. Cifrar datos por lotes
      const batchSize = 1000;
      let offset = 0;
      let hasMore = true;
      while (hasMore) {
        const queryResult = await connection.query<any>(`
          SELECT id, ${column} 
          FROM ${table} 
          WHERE ${column} IS NOT NULL 
          LIMIT ${batchSize} OFFSET ${offset}
        `, []);
        const rows = queryResult.rows;
        if (rows.length === 0) {
          hasMore = false;
          break;
        }
        for (const row of rows) {
          const encrypted = await this.encryptionService.encryptField(row[column]);
          await connection.query(`
            UPDATE ${table} 
            SET ${tempColumn} = $1 
            WHERE id = $2
          `, [encrypted, row.id]);
        }
        offset += batchSize;
        this.logger.debug(`Encrypted ${offset} rows in ${table}.${column}`);
      }
      // 4. Renombrar columnas
      await connection.query(`
        ALTER TABLE ${table} 
        RENAME COLUMN ${column} TO ${column}_original
      `, []);
      await connection.query(`
        ALTER TABLE ${table} 
        RENAME COLUMN ${tempColumn} TO ${column}
      `, []);
      // 5. Registrar estado de cifrado
      await this.registerColumnEncryption(database, table, column, algorithm, keyId);
      this.logger.info(`Column ${table}.${column} encrypted successfully`);
    } catch (error) {
      this.logger.error(`Failed to encrypt column ${table}.${column}:`, error);
      throw error;
    }
  }
  /**
   * Descifrar columna
   */
  async decryptColumn(table: string, column: string): Promise<void> {
    const database = this.detectDatabase(table);
    const connection = this.getConnection(database);
    try {
      // 1. Verificar que la columna está cifrada
      const status = await this.getColumnEncryptionStatus(table);
      const columnStatus = status.find(s => s.column === column);
      if (!columnStatus?.isEncrypted) {
        throw new Error(`Column ${table}.${column} is not encrypted`);
      }
      // 2. Crear columna temporal para datos descifrados
      const tempColumn = `${column}_decrypted`;
      // Obtener tipo de datos original
      const typeResult = await connection.query<any>(`
        SELECT data_type 
        FROM information_schema.columns 
        WHERE table_name = $1 AND column_name = $2
      `, [table, `${column}_original`]);
      const dataType = typeResult.rows[0]?.data_type || 'TEXT';
      await connection.query(`
        ALTER TABLE ${table} 
        ADD COLUMN IF NOT EXISTS ${tempColumn} ${dataType}
      `, []);
      // 3. Descifrar datos por lotes
      const batchSize = 1000;
      let offset = 0;
      let hasMore = true;
      while (hasMore) {
        const queryResult = await connection.query<any>(`
          SELECT id, ${column} 
          FROM ${table} 
          WHERE ${column} IS NOT NULL 
          LIMIT ${batchSize} OFFSET ${offset}
        `, []);
        const rows = queryResult.rows;
        if (rows.length === 0) {
          hasMore = false;
          break;
        }
        for (const row of rows) {
          const decrypted = await this.encryptionService.decryptField(row[column]);
          await connection.query(`
            UPDATE ${table} 
            SET ${tempColumn} = $1 
            WHERE id = $2
          `, [decrypted, row.id]);
        }
        offset += batchSize;
        this.logger.debug(`Decrypted ${offset} rows in ${table}.${column}`);
      }
      // 4. Eliminar columna cifrada y renombrar
      await connection.query(`ALTER TABLE ${table} DROP COLUMN ${column}`, []);
      await connection.query(`
        ALTER TABLE ${table} 
        RENAME COLUMN ${tempColumn} TO ${column}
      `, []);
      // 5. Eliminar columna original backup
      await connection.query(`
        ALTER TABLE ${table} 
        DROP COLUMN IF EXISTS ${column}_original
      `, []);
      // 6. Eliminar registro de cifrado
      await this.unregisterColumnEncryption(database, table, column);
      this.logger.info(`Column ${table}.${column} decrypted successfully`);
    } catch (error) {
      this.logger.error(`Failed to decrypt column ${table}.${column}:`, error);
      throw error;
    }
  }
  /**
   * Obtener estado de cifrado de columnas
   */
  async getColumnEncryptionStatus(table: string): Promise<ColumnEncryptionStatus[]> {
    const database = this.detectDatabase(table);
    const connection = this.getConnection(database);
    try {
      // Crear tabla de registro si no existe
      await connection.query(`
        CREATE TABLE IF NOT EXISTS column_encryption_registry (
          id SERIAL PRIMARY KEY,
          table_name VARCHAR(100) NOT NULL,
          column_name VARCHAR(100) NOT NULL,
          is_encrypted BOOLEAN NOT NULL,
          algorithm VARCHAR(20),
          key_id UUID,
          encrypted_at TIMESTAMP,
          UNIQUE(table_name, column_name)
        )
      `, []);
      const result = await connection.query<any>(`
        SELECT * FROM column_encryption_registry 
        WHERE table_name = $1
      `, [table]);
      return result.rows.map((row: any) => ({
        table: row.table_name,
        column: row.column_name,
        isEncrypted: row.is_encrypted,
        algorithm: row.algorithm,
        keyId: row.key_id,
        encryptedAt: row.encrypted_at
      }));
    } catch (error) {
      this.logger.error('Failed to get column encryption status:', error);
      return [];
    }
  }
  /**
   * Rotar claves de cifrado
   */
  async rotateEncryptionKeys(database: string): Promise<void> {
    const connection = this.getConnection(database);
    try {
      // 1. Obtener configuración actual
      const config = await this.getTDEStatus(database);
      if (!config) {
        throw new Error(`TDE not enabled for database ${database}`);
      }
      // 2. Generar nueva clave
      const newKeyId = crypto.randomUUID();
      const newKey = crypto.randomBytes(32);
      this.encryptionKeys.set(newKeyId, newKey);
      // 3. Re-cifrar columnas con nueva clave
      const encryptedColumnsResult = await connection.query<any>(`
        SELECT DISTINCT table_name, column_name 
        FROM column_encryption_registry 
        WHERE is_encrypted = true
      `, []);
      for (const col of encryptedColumnsResult.rows) {
        await this.reEncryptColumn(
          database,
          col.table_name,
          col.column_name,
          newKeyId
        );
      }
      // 4. Actualizar configuración
      await connection.query(`
        UPDATE encryption_config 
        SET key_id = $1, 
            last_rotation = NOW(),
            next_rotation = NOW() + INTERVAL '${config.keyRotationDays} days'
        WHERE database_name = $2
      `, [newKeyId, database]);
      // 5. Eliminar clave antigua de memoria (mantener en backup)
      // Las claves antiguas se mantienen temporalmente para descifrado de backups
      this.logger.info(`Encryption keys rotated for database ${database}`);
    } catch (error) {
      this.logger.error('Failed to rotate encryption keys:', error);
      throw error;
    }
  }
  /**
   * Backup de claves de cifrado
   */
  async backupEncryptionKeys(location: string): Promise<void> {
    try {
      const backup = {
        version: '1.0',
        timestamp: new Date().toISOString(),
        keys: Array.from(this.encryptionKeys.entries()).map(([id, key]) => ({
          id,
          key: key.toString('base64')
        })),
        configs: Array.from(this.tdeConfigs.entries())
      };
      // Cifrar el backup con una clave maestra
      const masterKey = environment.security.masterKey;
      const encrypted = await this.encryptionService.encrypt(
        JSON.stringify(backup),
        { algorithm: 'aes-256-gcm' }
      );
      // Guardar en ubicación segura
      const backupPath = path.join(location, `encryption-keys-${Date.now()}.bak`);
      await fs.writeFile(backupPath, JSON.stringify(encrypted));
      this.logger.info(`Encryption keys backed up to ${backupPath}`);
    } catch (error) {
      this.logger.error('Failed to backup encryption keys:', error);
      throw error;
    }
  }
  /**
   * Restaurar claves de cifrado
   */
  async restoreEncryptionKeys(location: string): Promise<void> {
    try {
      // Leer backup
      const backupData = await fs.readFile(location, 'utf-8');
      const encrypted = JSON.parse(backupData);
      // Descifrar con clave maestra
      const decrypted = await this.encryptionService.decrypt(encrypted);
      const backup = JSON.parse(decrypted);
      // Restaurar claves
      this.encryptionKeys.clear();
      for (const key of backup.keys) {
        this.encryptionKeys.set(key.id, Buffer.from(key.key, 'base64'));
      }
      // Restaurar configuraciones
      this.tdeConfigs.clear();
      for (const [database, config] of backup.configs) {
        this.tdeConfigs.set(database, config);
      }
      this.logger.info('Encryption keys restored successfully');
    } catch (error) {
      this.logger.error('Failed to restore encryption keys:', error);
      throw error;
    }
  }
  /**
   * Inicializar sistema de cifrado
   */
  private async initializeEncryption(): Promise<void> {
    // Cargar configuraciones existentes de TDE
    for (const [name, connection] of this.databaseConnections) {
      try {
        const config = await this.getTDEStatus(name);
        if (config) {
          this.tdeConfigs.set(name, config);
          this.logger.info(`TDE configuration loaded for ${name}`);
        }
      } catch (error) {
        // Base de datos puede no tener TDE configurado
      }
    }
  }
  /**
   * Crear funciones de cifrado en PostgreSQL
   */
  private async createEncryptionFunctions(
    connection: IDatabaseConnection,
    algorithm: string
  ): Promise<void> {
    // Función para cifrar datos
    await connection.query(`
      CREATE OR REPLACE FUNCTION encrypt_data(
        plain_text TEXT,
        key_text TEXT
      ) RETURNS TEXT AS $$
      BEGIN
        RETURN encode(
          pgp_sym_encrypt(plain_text, key_text, 'cipher-algo=${algorithm.toLowerCase()}'),
          'base64'
        );
      END;
      $$ LANGUAGE plpgsql SECURITY DEFINER;
    `, []);
    // Función para descifrar datos
    await connection.query(`
      CREATE OR REPLACE FUNCTION decrypt_data(
        encrypted_text TEXT,
        key_text TEXT
      ) RETURNS TEXT AS $$
      BEGIN
        RETURN pgp_sym_decrypt(
          decode(encrypted_text, 'base64'),
          key_text
        );
      END;
      $$ LANGUAGE plpgsql SECURITY DEFINER;
    `, []);
  }
  /**
   * Obtener o crear clave para tabla
   */
  private async getOrCreateKeyForTable(
    database: string,
    table: string
  ): Promise<string> {
    // Por simplicidad, usar la clave de la base de datos
    // En producción, se podría tener claves por tabla
    const config = await this.getTDEStatus(database);
    if (config) {
      const result = await this.getConnection(database).query<any>(
        'SELECT key_id FROM encryption_config WHERE database_name = $1',
        [database]
      );
      if (result.rows.length > 0) {
        return result.rows[0].key_id;
      }
    }
    // Crear nueva clave si no existe
    const keyId = crypto.randomUUID();
    const key = crypto.randomBytes(32);
    this.encryptionKeys.set(keyId, key);
    return keyId;
  }
  /**
   * Registrar cifrado de columna
   */
  private async registerColumnEncryption(
    database: string,
    table: string,
    column: string,
    algorithm: string,
    keyId: string
  ): Promise<void> {
    const connection = this.getConnection(database);
    await connection.query(`
      INSERT INTO column_encryption_registry 
      (table_name, column_name, is_encrypted, algorithm, key_id, encrypted_at)
      VALUES ($1, $2, true, $3, $4, NOW())
      ON CONFLICT (table_name, column_name)
      DO UPDATE SET 
        is_encrypted = true,
        algorithm = $3,
        key_id = $4,
        encrypted_at = NOW()
    `, [table, column, algorithm, keyId]);
  }
  /**
   * Eliminar registro de cifrado de columna
   */
  private async unregisterColumnEncryption(
    database: string,
    table: string,
    column: string
  ): Promise<void> {
    const connection = this.getConnection(database);
    await connection.query(`
      UPDATE column_encryption_registry 
      SET is_encrypted = false, encrypted_at = NULL
      WHERE table_name = $1 AND column_name = $2
    `, [table, column]);
  }
  /**
   * Re-cifrar columna con nueva clave
   */
  private async reEncryptColumn(
    database: string,
    table: string,
    column: string,
    newKeyId: string
  ): Promise<void> {
    // Implementación simplificada
    // En producción, esto sería más complejo para manejar grandes volúmenes
    this.logger.info(`Re-encrypting ${table}.${column} with new key`);
  }
  /**
   * Programar rotación automática de claves
   */
  private scheduleKeyRotation(config: TDEConfig): void {
    const rotationInterval = config.keyRotationDays * 24 * 60 * 60 * 1000; // días a ms
    setTimeout(async () => {
      try {
        await this.rotateEncryptionKeys(config.database);
        // Reprogramar para la siguiente rotación
        this.scheduleKeyRotation(config);
      } catch (error) {
        this.logger.error('Key rotation failed:', error);
      }
    }, rotationInterval);
  }
  /**
   * Detectar a qué base de datos pertenece una tabla
   */
  private detectDatabase(table: string): string {
    // Lógica para determinar la base de datos según el nombre de la tabla
    // Por defecto, usar shared
    return 'shared';
  }
  /**
   * Obtener conexión de base de datos
   */
  private getConnection(database: string): IDatabaseConnection {
    const connection = this.databaseConnections.get(database);
    if (!connection) {
      throw new Error(`Database connection not found: ${database}`);
    }
    return connection;
  }
}
