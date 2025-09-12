/**
 * Validation Trigger Manager
 * Sprint 4 - Sistema de triggers para validaciones automáticas
 */
import { injectable, inject } from 'inversify';
import { EventEmitter } from 'events';
import { TYPES } from '@/container/types';
import { ICrossModuleValidator } from './interfaces/ICrossModuleValidator';
import { IBusinessRuleValidator } from './interfaces/ICrossModuleValidator';
import { ILoggerService } from '@/shared/services/logger/LoggerService';
import { IDatabaseConnection } from '@/shared/database/interfaces/IDatabaseConnection';
export enum TriggerEvent {
  BEFORE_USER_CREATE = 'before:user:create',
  AFTER_USER_CREATE = 'after:user:create',
  BEFORE_USER_UPDATE = 'before:user:update',
  AFTER_USER_UPDATE = 'after:user:update',
  BEFORE_USER_DELETE = 'before:user:delete',
  AFTER_USER_DELETE = 'after:user:delete',
  BEFORE_COMPANY_CREATE = 'before:company:create',
  AFTER_COMPANY_CREATE = 'after:company:create',
  BEFORE_COMPANY_DELETE = 'before:company:delete',
  AFTER_COMPANY_DELETE = 'after:company:delete',
  BEFORE_ROLE_ASSIGN = 'before:role:assign',
  AFTER_ROLE_ASSIGN = 'after:role:assign',
  VALIDATE_INTEGRITY = 'validate:integrity',
  CASCADE_DELETE = 'cascade:delete',
  CONSISTENCY_CHECK = 'consistency:check'
}
export interface TriggerPayload {
  entity: string;
  action: string;
  data: Record<string, any>;
  companyId: string;
  userId?: string;
  metadata?: Record<string, any>;
}
@injectable()
export class ValidationTriggerManager extends EventEmitter {
  private triggers: Map<string, Function[]> = new Map();
  private isInitialized = false;
  constructor(
    @inject(TYPES.CrossModuleValidator) private crossValidator: ICrossModuleValidator,
    @inject(TYPES.BusinessRuleValidator) private ruleValidator: IBusinessRuleValidator,
    @inject(TYPES.SharedConnection) private sharedDb: IDatabaseConnection,
    @inject(TYPES.Logger) private logger: ILoggerService
  ) {
    super();
    this.initialize();
  }
  /**
   * Inicializa los triggers del sistema
   */
  private initialize(): void {
    if (this.isInitialized) return;
    // Registrar triggers de validación
    this.registerTriggers();
    this.isInitialized = true;
    this.logger.info('Validation Trigger Manager initialized');
  }
  /**
   * Registra todos los triggers del sistema
   */
  private registerTriggers(): void {
    // Trigger: Antes de crear usuario
    this.on(TriggerEvent.BEFORE_USER_CREATE, async (payload: TriggerPayload) => {
      await this.handleBeforeUserCreate(payload);
    });
    // Trigger: Después de crear usuario
    this.on(TriggerEvent.AFTER_USER_CREATE, async (payload: TriggerPayload) => {
      await this.handleAfterUserCreate(payload);
    });
    // Trigger: Antes de eliminar empresa
    this.on(TriggerEvent.BEFORE_COMPANY_DELETE, async (payload: TriggerPayload) => {
      await this.handleBeforeCompanyDelete(payload);
    });
    // Trigger: Después de eliminar empresa
    this.on(TriggerEvent.AFTER_COMPANY_DELETE, async (payload: TriggerPayload) => {
      await this.handleAfterCompanyDelete(payload);
    });
    // Trigger: Antes de asignar rol
    this.on(TriggerEvent.BEFORE_ROLE_ASSIGN, async (payload: TriggerPayload) => {
      await this.handleBeforeRoleAssign(payload);
    });
    // Trigger: Validación de integridad
    this.on(TriggerEvent.VALIDATE_INTEGRITY, async (payload: TriggerPayload) => {
      await this.handleIntegrityValidation(payload);
    });
    // Trigger: Cascada de eliminación
    this.on(TriggerEvent.CASCADE_DELETE, async (payload: TriggerPayload) => {
      await this.handleCascadeDelete(payload);
    });
    // Trigger: Check de consistencia
    this.on(TriggerEvent.CONSISTENCY_CHECK, async (payload: TriggerPayload) => {
      await this.handleConsistencyCheck(payload);
    });
  }
  /**
   * Maneja el trigger antes de crear un usuario
   */
  private async handleBeforeUserCreate(payload: TriggerPayload): Promise<void> {
    try {
      const { companyId, data } = payload;
      // Validar límite de usuarios
      const limitValidation = await this.ruleValidator.validateUserLimit(companyId);
      if (!limitValidation.isValid) {
        throw new Error(limitValidation.message);
      }
      // Validar que la empresa existe
      const companyValidation = await this.crossValidator.validateForeignKey({
        sourceTable: 'users',
        sourceColumn: 'company_id',
        sourceValue: companyId,
        targetDatabase: 'shared',
        targetTable: 'companies',
        targetColumn: 'id',
        companyId
      });
      if (!companyValidation.isValid) {
        throw new Error('Company does not exist');
      }
      // Validar email único por empresa
      const emailExists = await this.checkEmailExists(data.email, companyId);
      if (emailExists) {
        throw new Error(`Email ${data.email} already exists in company`);
      }
      this.logger.info(`User creation validation passed for ${data.email}`);
    } catch (error) {
      this.logger.error('Before user create trigger failed:', error);
      throw error;
    }
  }
  /**
   * Maneja el trigger después de crear un usuario
   */
  private async handleAfterUserCreate(payload: TriggerPayload): Promise<void> {
    try {
      const { companyId, userId, data } = payload;
      // Registrar en audit log
      await this.createAuditLog({
        entity_type: 'user',
        entity_id: userId!,
        action: 'create',
        companyId,
        changes: data,
        performed_by: payload.metadata?.performedBy
      });
      // Invalidar cache de límite de usuarios
      await this.invalidateUserLimitCache(companyId);
      // Enviar notificación (si está habilitado)
      this.emit('notification:send', {
        type: 'user_created',
        companyId,
        userId,
        data
      });
      this.logger.info(`After user create trigger completed for user ${userId}`);
    } catch (error) {
      this.logger.error('After user create trigger failed:', error);
      // No lanzar error en after triggers para no afectar la operación principal
    }
  }
  /**
   * Maneja el trigger antes de eliminar una empresa
   */
  private async handleBeforeCompanyDelete(payload: TriggerPayload): Promise<void> {
    try {
      const { companyId } = payload;
      // Verificar si hay datos dependientes críticos
      const hasActiveUsers = await this.checkActiveUsers(companyId);
      if (hasActiveUsers) {
        const userCount = await this.getActiveUserCount(companyId);
        this.logger.warn(`Company ${companyId} has ${userCount} active users`);
      }
      // Verificar transacciones pendientes
      const hasPendingTransactions = await this.checkPendingTransactions(companyId);
      if (hasPendingTransactions) {
        throw new Error('Company has pending transactions');
      }
      this.logger.info(`Before company delete validation passed for ${companyId}`);
    } catch (error) {
      this.logger.error('Before company delete trigger failed:', error);
      throw error;
    }
  }
  /**
   * Maneja el trigger después de eliminar una empresa
   */
  private async handleAfterCompanyDelete(payload: TriggerPayload): Promise<void> {
    try {
      const { companyId } = payload;
      // Ejecutar cascada de eliminación/desactivación
      await this.executeCascadeDelete(companyId);
      // Registrar en audit log
      await this.createAuditLog({
        entity_type: 'company',
        entity_id: companyId,
        action: 'delete',
        companyId,
        performed_by: payload.metadata?.performedBy
      });
      this.logger.info(`After company delete trigger completed for ${companyId}`);
    } catch (error) {
      this.logger.error('After company delete trigger failed:', error);
    }
  }
  /**
   * Maneja el trigger antes de asignar un rol
   */
  private async handleBeforeRoleAssign(payload: TriggerPayload): Promise<void> {
    try {
      const { companyId, userId, data } = payload;
      const { roleId } = data;
      // Validar asignación de rol
      const validation = await this.ruleValidator.validateRoleAssignment(
        userId!,
        roleId,
        companyId
      );
      if (!validation.isValid) {
        throw new Error(validation.message);
      }
      this.logger.info(`Role assignment validation passed for user ${userId}`);
    } catch (error) {
      this.logger.error('Before role assign trigger failed:', error);
      throw error;
    }
  }
  /**
   * Maneja validación de integridad
   */
  private async handleIntegrityValidation(payload: TriggerPayload): Promise<void> {
    try {
      const { companyId } = payload;
      const validations = await this.crossValidator.runConsistencyCheck({
        companyId,
        autoRepair: false
      });
      const failures = validations.filter(v => !v.isValid);
      if (failures.length > 0) {
        this.logger.warn(`Integrity validation found ${failures.length} issues for company ${companyId}`);
        // Emitir evento para reparación si es necesario
        this.emit('integrity:repair:needed', {
          companyId,
          failures
        });
      }
    } catch (error) {
      this.logger.error('Integrity validation trigger failed:', error);
    }
  }
  /**
   * Maneja cascada de eliminación
   */
  private async handleCascadeDelete(payload: TriggerPayload): Promise<void> {
    try {
      const { entity, data } = payload;
      switch (entity) {
        case 'company':
          await this.executeCascadeDelete(data.companyId);
          break;
        case 'user':
          await this.cascadeDeleteUserData(data.userId);
          break;
        default:
          this.logger.warn(`Unknown cascade delete entity: ${entity}`);
      }
    } catch (error) {
      this.logger.error('Cascade delete trigger failed:', error);
    }
  }
  /**
   * Maneja check de consistencia
   */
  private async handleConsistencyCheck(payload: TriggerPayload): Promise<void> {
    try {
      const { companyId } = payload;
      const results = await this.crossValidator.runConsistencyCheck({
        companyId,
        autoRepair: payload.data?.autoRepair || false
      });
      // Registrar resultados
      await this.logConsistencyResults(companyId, results);
      this.logger.info(`Consistency check completed for company ${companyId}`);
    } catch (error) {
      this.logger.error('Consistency check trigger failed:', error);
    }
  }
  /**
   * Ejecuta cascada de eliminación para una empresa
   */
  private async executeCascadeDelete(companyId: string): Promise<void> {
    await this.sharedDb.transaction(async (client) => {
      // Desactivar usuarios
      await client.query(
        `UPDATE users SET status = 'inactive', updated_at = CURRENT_TIMESTAMP 
         WHERE company_id = $1`,
        [companyId]
      );
      // Revocar sesiones activas
      await client.query(
        `UPDATE user_sessions SET is_active = false, revoked_at = CURRENT_TIMESTAMP 
         WHERE company_id = $1`,
        [companyId]
      );
      // Desactivar invitaciones pendientes
      await client.query(
        `UPDATE invitations SET status = 'cancelled', updated_at = CURRENT_TIMESTAMP 
         WHERE company_id = $1 AND status = 'pending'`,
        [companyId]
      );
      this.logger.info(`Cascade delete executed for company ${companyId}`);
    });
  }
  /**
   * Cascada de eliminación para datos de usuario
   */
  private async cascadeDeleteUserData(userId: string): Promise<void> {
    await this.sharedDb.transaction(async (client) => {
      // Revocar sesiones del usuario
      await client.query(
        `UPDATE user_sessions SET is_active = false, revoked_at = CURRENT_TIMESTAMP 
         WHERE user_id = $1`,
        [userId]
      );
      // Eliminar roles del usuario
      await client.query(
        `DELETE FROM user_roles WHERE user_id = $1`,
        [userId]
      );
      this.logger.info(`User data cascade delete executed for user ${userId}`);
    });
  }
  /**
   * Verifica si un email existe en la empresa
   */
  private async checkEmailExists(email: string, companyId: string): Promise<boolean> {
    const query = `
      SELECT EXISTS(
        SELECT 1 FROM users 
        WHERE LOWER(email) = LOWER($1) AND company_id = $2
      ) as exists
    `;
    const result = await this.sharedDb.query<{ exists: boolean }>(query, [email, companyId]);
    return result[0].exists;
  }
  /**
   * Verifica si hay usuarios activos
   */
  private async checkActiveUsers(companyId: string): Promise<boolean> {
    const query = `
      SELECT EXISTS(
        SELECT 1 FROM users 
        WHERE company_id = $1 AND status = 'active'
      ) as exists
    `;
    const result = await this.sharedDb.query<{ exists: boolean }>(query, [companyId]);
    return result[0].exists;
  }
  /**
   * Obtiene el conteo de usuarios activos
   */
  private async getActiveUserCount(companyId: string): Promise<number> {
    const query = `
      SELECT COUNT(*) as count FROM users 
      WHERE company_id = $1 AND status = 'active'
    `;
    const result = await this.sharedDb.query<{ count: string }>(query, [companyId]);
    return parseInt(result[0].count, 10);
  }
  /**
   * Verifica transacciones pendientes
   */
  private async checkPendingTransactions(companyId: string): Promise<boolean> {
    // Implementar según necesidades específicas
    return false;
  }
  /**
   * Crea un registro de auditoría
   */
  private async createAuditLog(data: {
    entity_type: string;
    entity_id: string;
    action: string;
    companyId: string;
    changes?: any;
    performed_by?: string;
  }): Promise<void> {
    const query = `
      INSERT INTO audit_logs (
        entity_type, entity_id, action, company_id, 
        changes, performed_by, created_at
      ) VALUES ($1, $2, $3, $4, $5, $6, CURRENT_TIMESTAMP)
    `;
    await this.sharedDb.query(query, [
      data.entity_type,
      data.entity_id,
      data.action,
      data.companyId,
      JSON.stringify(data.changes || {}),
      data.performed_by || 'system'
    ]);
  }
  /**
   * Invalida cache de límite de usuarios
   */
  private async invalidateUserLimitCache(companyId: string): Promise<void> {
    // Implementar invalidación de cache según el sistema de cache utilizado
    this.emit('cache:invalidate', {
      key: `user_limit:${companyId}`
    });
  }
  /**
   * Registra resultados de consistencia
   */
  private async logConsistencyResults(companyId: string, results: any[]): Promise<void> {
    const query = `
      INSERT INTO consistency_check_logs (
        company_id, check_results, created_at
      ) VALUES ($1, $2, CURRENT_TIMESTAMP)
    `;
    await this.sharedDb.query(query, [
      companyId,
      JSON.stringify(results)
    ]);
  }
  /**
   * Dispara un trigger manualmente
   */
  public async trigger(event: TriggerEvent, payload: TriggerPayload): Promise<void> {
    try {
      this.emit(event, payload);
      this.logger.info(`Trigger ${event} fired for ${payload.entity}`);
    } catch (error) {
      this.logger.error(`Trigger ${event} failed:`, error);
      throw error;
    }
  }
}
