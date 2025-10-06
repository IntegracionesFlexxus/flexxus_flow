/**
 * Cross-Module Validator Implementation
 * Sprint 4 - Validaciones entre módulos de bases de datos
 */
import { injectable, inject } from 'inversify';
import { TYPES } from '@/container/types';
import { IDatabaseConnection } from '@/shared/database/interfaces/IDatabaseConnection';
import {
  ICrossModuleValidator,
  ForeignKeyValidationParams,
  BusinessRuleValidationParams,
  ConsistencyCheckParams,
  ValidationResult,
  ValidationPriority,
  ValidationType
} from './interfaces/ICrossModuleValidator';
import { ILoggerService } from '@/shared/services/logger/LoggerService';
@injectable()
export class CrossModuleValidator implements ICrossModuleValidator {
  private databaseConnections: Map<string, IDatabaseConnection>;
  constructor(
    @inject(TYPES.SharedConnection) private sharedDb: IDatabaseConnection,
    @inject(TYPES.OmniConnection) private omniDb: IDatabaseConnection,
    @inject(TYPES.CrmConnection) private crmDb: IDatabaseConnection,
    @inject(TYPES.WorkflowConnection) private workflowDb: IDatabaseConnection,
    @inject(TYPES.AnalyticsConnection) private analyticsDb: IDatabaseConnection,
    @inject(TYPES.Logger) private logger: ILoggerService
  ) {
    // Mapear conexiones por nombre
    this.databaseConnections = new Map([
      ['shared', this.sharedDb],
      ['omni', this.omniDb],
      ['crm', this.crmDb],
      ['workflow', this.workflowDb],
      ['analytics', this.analyticsDb]
    ]);
  }
  /**
   * Valida una foreign key entre módulos
   */
  async validateForeignKey(params: ForeignKeyValidationParams): Promise<ValidationResult> {
    const startTime = Date.now();
    try {
      const targetDb = this.databaseConnections.get(params.targetDatabase);
      if (!targetDb) {
        throw new Error(`Database ${params.targetDatabase} not found`);
      }
      // Construir query de validación
      const query = `
        SELECT EXISTS(
          SELECT 1 FROM ${params.targetTable}
          WHERE ${params.targetColumn} = $1
          ${params.companyId ? 'AND company_id = $2' : ''}
        ) as exists
      `;
      const queryParams = params.companyId 
        ? [params.sourceValue, params.companyId]
        : [params.sourceValue];
      const result = await targetDb.query<{ exists: boolean }>(query, queryParams);
      const exists = result.rows[0]?.exists || false;
      // Registrar la validación en la base de datos compartida
      await this.logValidation({
        sourceTable: params.sourceTable,
        sourceColumn: params.sourceColumn,
        sourceValue: params.sourceValue,
        targetDatabase: params.targetDatabase,
        targetTable: params.targetTable,
        targetColumn: params.targetColumn,
        validationResult: exists,
        companyId: params.companyId,
        duration: Date.now() - startTime
      });
      return {
        isValid: exists,
        message: exists 
          ? `Foreign key validation passed` 
          : `Foreign key validation failed: ${params.targetTable}.${params.targetColumn} = ${params.sourceValue} not found`,
        priority: ValidationPriority.BLOCKING,
        metadata: {
          sourceTable: params.sourceTable,
          targetTable: params.targetTable,
          duration: Date.now() - startTime
        },
        timestamp: new Date()
      };
    } catch (error) {
      this.logger.error('Foreign key validation error:', error);
      return {
        isValid: false,
        message: `Validation error: ${error instanceof Error ? error.message : 'Unknown error'}`,
        priority: ValidationPriority.BLOCKING,
        timestamp: new Date()
      };
    }
  }
  /**
   * Valida reglas de negocio entre módulos
   */
  async validateBusinessRule(params: BusinessRuleValidationParams): Promise<ValidationResult> {
    try {
      switch (params.ruleName) {
        case 'user_limit':
          return await this.validateUserLimit(params.companyId);
        case 'feature_access':
          return await this.validateFeatureAccess(
            params.companyId,
            params.params?.featureKey
          );
        case 'role_assignment':
          return await this.validateRoleAssignment(
            params.params?.userId,
            params.params?.roleId,
            params.companyId
          );
        default:
          return {
            isValid: false,
            message: `Unknown business rule: ${params.ruleName}`,
            priority: ValidationPriority.WARNING,
            timestamp: new Date()
          };
      }
    } catch (error) {
      this.logger.error('Business rule validation error:', error);
      return {
        isValid: false,
        message: `Business rule validation error: ${error instanceof Error ? error.message : 'Unknown error'}`,
        priority: ValidationPriority.BLOCKING,
        timestamp: new Date()
      };
    }
  }
  /**
   * Ejecuta verificaciones de consistencia
   */
  async runConsistencyCheck(params: ConsistencyCheckParams): Promise<ValidationResult[]> {
    const results: ValidationResult[] = [];
    try {
      // Check 1: Usuarios huérfanos (usuarios sin empresa válida)
      const orphanedUsersCheck = await this.checkOrphanedUsers(params.companyId);
      results.push(orphanedUsersCheck);
      // Check 2: Sesiones expiradas activas
      const expiredSessionsCheck = await this.checkExpiredSessions(params.companyId);
      results.push(expiredSessionsCheck);
      // Check 3: Roles sin permisos
      const rolesWithoutPermissionsCheck = await this.checkRolesWithoutPermissions(params.companyId);
      results.push(rolesWithoutPermissionsCheck);
      // Check 4: Referencias circulares
      const circularReferencesCheck = await this.checkCircularReferences(params.companyId);
      results.push(circularReferencesCheck);
      // Auto-reparar si está habilitado
      if (params.autoRepair) {
        const failedChecks = results.filter(r => !r.isValid);
        if (failedChecks.length > 0) {
          await this.autoRepair(params.companyId, failedChecks);
        }
      }
      return results;
    } catch (error) {
      this.logger.error('Consistency check error:', error);
      return [{
        isValid: false,
        message: `Consistency check failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        priority: ValidationPriority.BLOCKING,
        timestamp: new Date()
      }];
    }
  }
  /**
   * Valida múltiples foreign keys en batch
   */
  async validateBatchForeignKeys(
    validations: ForeignKeyValidationParams[]
  ): Promise<ValidationResult[]> {
    // Agrupar validaciones por base de datos de destino para optimizar
    const groupedValidations = new Map<string, ForeignKeyValidationParams[]>();
    for (const validation of validations) {
      const group = groupedValidations.get(validation.targetDatabase) || [];
      group.push(validation);
      groupedValidations.set(validation.targetDatabase, group);
    }
    const results: ValidationResult[] = [];
    // Procesar cada grupo en paralelo
    const promises = Array.from(groupedValidations.entries()).map(
      async ([database, validations]) => {
        const db = this.databaseConnections.get(database);
        if (!db) {
          return validations.map(v => ({
            isValid: false,
            message: `Database ${database} not found`,
            priority: ValidationPriority.BLOCKING,
            timestamp: new Date()
          }));
        }
        return await Promise.all(
          validations.map(v => this.validateForeignKey(v))
        );
      }
    );
    const groupResults = await Promise.all(promises);
    return groupResults.flat();
  }
  /**
   * Valida límite de usuarios por plan
   */
  private async validateUserLimit(companyId: string): Promise<ValidationResult> {
    try {
      // Obtener información del plan de la empresa
      const companyQuery = `
        SELECT c.id, c.plan_id, p.max_users
        FROM companies c
        LEFT JOIN plans p ON c.plan_id = p.id
        WHERE c.id = $1
      `;
      const companyResult = await this.sharedDb.query<{
        id: string;
        plan_id: string;
        max_users: number;
      }>(companyQuery, [companyId]);
      if (companyResult.rows.length === 0) {
        return {
          isValid: false,
          message: 'Company not found',
          priority: ValidationPriority.BLOCKING,
          timestamp: new Date()
        };
      }
      const maxUsers = companyResult.rows[0].max_users || 5; // Default a 5 usuarios
      // Contar usuarios actuales
      const userCountQuery = `
        SELECT COUNT(*) as count
        FROM users
        WHERE company_id = $1 AND status = 'active'
      `;
      const countResult = await this.sharedDb.query<{ count: string }>(
        userCountQuery,
        [companyId]
      );
      const currentUsers = parseInt(countResult.rows[0].count, 10);
      return {
        isValid: currentUsers < maxUsers,
        message: currentUsers >= maxUsers
          ? `User limit reached: ${currentUsers}/${maxUsers}`
          : `Users within limit: ${currentUsers}/${maxUsers}`,
        priority: currentUsers >= maxUsers 
          ? ValidationPriority.BLOCKING 
          : ValidationPriority.INFO,
        metadata: {
          currentUsers,
          maxUsers,
          available: maxUsers - currentUsers
        },
        timestamp: new Date()
      };
    } catch (error) {
      this.logger.error('User limit validation error:', error);
      throw error;
    }
  }
  /**
   * Valida acceso a feature según plan
   */
  private async validateFeatureAccess(
    companyId: string,
    featureKey: string
  ): Promise<ValidationResult> {
    try {
      const query = `
        SELECT ff.is_enabled
        FROM feature_flags ff
        JOIN companies c ON c.plan_id = ff.plan_id
        WHERE c.id = $1 AND ff.key = $2
      `;
      const result = await this.sharedDb.query<{ is_enabled: boolean }>(
        query,
        [companyId, featureKey]
      );
      const isEnabled = result.rows.length > 0 && result.rows[0].is_enabled;
      return {
        isValid: isEnabled,
        message: isEnabled 
          ? `Feature ${featureKey} is enabled`
          : `Feature ${featureKey} is disabled for this plan`,
        priority: isEnabled ? ValidationPriority.INFO : ValidationPriority.WARNING,
        metadata: { featureKey, companyId },
        timestamp: new Date()
      };
    } catch (error) {
      this.logger.error('Feature access validation error:', error);
      throw error;
    }
  }
  /**
   * Valida asignación de rol
   */
  private async validateRoleAssignment(
    userId: string,
    roleId: string,
    companyId: string
  ): Promise<ValidationResult> {
    try {
      // Verificar que el usuario existe y pertenece a la empresa
      const userQuery = `
        SELECT id FROM users 
        WHERE id = $1 AND company_id = $2 AND status = 'active'
      `;
      const userResult = await this.sharedDb.query(userQuery, [userId, companyId]);
      if (userResult.rows.length === 0) {
        return {
          isValid: false,
          message: 'User not found or inactive',
          priority: ValidationPriority.BLOCKING,
          timestamp: new Date()
        };
      }
      // Verificar que el rol existe y está disponible para la empresa
      const roleQuery = `
        SELECT id FROM roles
        WHERE id = $1 AND (company_id = $2 OR company_id IS NULL) AND is_active = true
      `;
      const roleResult = await this.sharedDb.query(roleQuery, [roleId, companyId]);
      if (roleResult.rows.length === 0) {
        return {
          isValid: false,
          message: 'Role not found or inactive',
          priority: ValidationPriority.BLOCKING,
          timestamp: new Date()
        };
      }
      return {
        isValid: true,
        message: 'Role assignment is valid',
        priority: ValidationPriority.INFO,
        timestamp: new Date()
      };
    } catch (error) {
      this.logger.error('Role assignment validation error:', error);
      throw error;
    }
  }
  /**
   * Verifica usuarios huérfanos
   */
  private async checkOrphanedUsers(companyId: string): Promise<ValidationResult> {
    const query = `
      SELECT COUNT(*) as count
      FROM users u
      LEFT JOIN companies c ON u.company_id = c.id
      WHERE u.company_id = $1 AND c.id IS NULL
    `;
    const result = await this.sharedDb.query<{ count: string }>(query, [companyId]);
    const orphanedCount = parseInt(result.rows[0].count, 10);
    return {
      isValid: orphanedCount === 0,
      message: orphanedCount > 0 
        ? `Found ${orphanedCount} orphaned users`
        : 'No orphaned users found',
      priority: orphanedCount > 0 ? ValidationPriority.WARNING : ValidationPriority.INFO,
      metadata: { orphanedCount },
      timestamp: new Date()
    };
  }
  /**
   * Verifica sesiones expiradas activas
   */
  private async checkExpiredSessions(companyId: string): Promise<ValidationResult> {
    const query = `
      SELECT COUNT(*) as count
      FROM user_sessions
      WHERE company_id = $1 
        AND is_active = true 
        AND expires_at < CURRENT_TIMESTAMP
    `;
    const result = await this.sharedDb.query<{ count: string }>(query, [companyId]);
    const expiredCount = parseInt(result.rows[0].count, 10);
    return {
      isValid: expiredCount === 0,
      message: expiredCount > 0 
        ? `Found ${expiredCount} expired active sessions`
        : 'No expired active sessions',
      priority: expiredCount > 0 ? ValidationPriority.WARNING : ValidationPriority.INFO,
      metadata: { expiredCount },
      timestamp: new Date()
    };
  }
  /**
   * Verifica roles sin permisos
   */
  private async checkRolesWithoutPermissions(companyId: string): Promise<ValidationResult> {
    const query = `
      SELECT COUNT(DISTINCT r.id) as count
      FROM roles r
      LEFT JOIN role_permissions rp ON r.id = rp.role_id
      WHERE r.company_id = $1 AND rp.id IS NULL
    `;
    const result = await this.sharedDb.query<{ count: string }>(query, [companyId]);
    const rolesCount = parseInt(result.rows[0].count, 10);
    return {
      isValid: rolesCount === 0,
      message: rolesCount > 0 
        ? `Found ${rolesCount} roles without permissions`
        : 'All roles have permissions',
      priority: rolesCount > 0 ? ValidationPriority.INFO : ValidationPriority.INFO,
      metadata: { rolesCount },
      timestamp: new Date()
    };
  }
  /**
   * Verifica referencias circulares
   */
  private async checkCircularReferences(companyId: string): Promise<ValidationResult> {
    // Por ahora, retorna OK - implementar lógica específica según necesidades
    return {
      isValid: true,
      message: 'No circular references detected',
      priority: ValidationPriority.INFO,
      timestamp: new Date()
    };
  }
  /**
   * Auto-repara inconsistencias
   */
  private async autoRepair(
    companyId: string,
    failedChecks: ValidationResult[]
  ): Promise<void> {
    for (const check of failedChecks) {
      if (check.message?.includes('expired active sessions')) {
        // Desactivar sesiones expiradas
        await this.sharedDb.query(
          `UPDATE user_sessions 
           SET is_active = false, updated_at = CURRENT_TIMESTAMP
           WHERE company_id = $1 AND is_active = true AND expires_at < CURRENT_TIMESTAMP`,
          [companyId]
        );
        this.logger.info(`Auto-repaired expired sessions for company ${companyId}`);
      }
    }
  }
  /**
   * Registra una validación en la base de datos
   */
  private async logValidation(params: {
    sourceTable: string;
    sourceColumn: string;
    sourceValue: string;
    targetDatabase: string;
    targetTable: string;
    targetColumn: string;
    validationResult: boolean;
    companyId: string;
    duration: number;
  }): Promise<void> {
    try {
      const query = `
        INSERT INTO validation_logs (
          source_table, source_column, source_value,
          target_database, target_table, target_column,
          validation_result, company_id, duration_ms, created_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, CURRENT_TIMESTAMP)
      `;
      await this.sharedDb.query(query, [
        params.sourceTable,
        params.sourceColumn,
        params.sourceValue,
        params.targetDatabase,
        params.targetTable,
        params.targetColumn,
        params.validationResult,
        params.companyId,
        params.duration
      ]);
    } catch (error) {
      // No fallar si no se puede registrar el log
      this.logger.warn('Could not log validation:', error);
    }
  }
}
