/**
 * Business Rule Validator
 * Sprint 4 - Validador de reglas de negocio cross-module
 */
import { injectable, inject } from 'inversify';
import { TYPES } from '@/container/types';
import { IDatabaseConnection } from '@/shared/database/interfaces/IDatabaseConnection';
import {
  IBusinessRuleValidator,
  ValidationResult,
  ValidationPriority
} from './interfaces/ICrossModuleValidator';
import { ILoggerService } from '@/shared/services/logger/LoggerService';
import { ICacheService } from '@/shared/interfaces/ICacheService';
@injectable()
export class BusinessRuleValidator implements IBusinessRuleValidator {
  private readonly CACHE_TTL = 300; // 5 minutos
  constructor(
    @inject(TYPES.SharedConnection) private sharedDb: IDatabaseConnection,
    @inject(TYPES.OmniConnection) private omniDb: IDatabaseConnection,
    @inject(TYPES.CrmConnection) private crmDb: IDatabaseConnection,
    @inject(TYPES.Logger) private logger: ILoggerService,
    @inject(TYPES.CacheService) private cache: ICacheService
  ) {}
  /**
   * Valida límite de usuarios por plan
   */
  async validateUserLimit(companyId: string): Promise<ValidationResult> {
    const cacheKey = `user_limit:${companyId}`;
    // Intentar obtener del cache
    const cached = await this.cache.get<ValidationResult>(cacheKey);
    if (cached) {
      return cached;
    }
    try {
      // Obtener plan y límites
      const planQuery = `
        SELECT 
          c.id,
          c.plan_id,
          p.max_users,
          p.name as plan_name,
          (SELECT COUNT(*) FROM users WHERE company_id = c.id AND status = 'active') as current_users
        FROM companies c
        LEFT JOIN plans p ON c.plan_id = p.id
        WHERE c.id = $1
      `;
      const result = await this.sharedDb.query<{
        id: string;
        plan_id: string;
        max_users: number;
        plan_name: string;
        current_users: string;
      }>(planQuery, [companyId]);
      if (result.length === 0) {
        return {
          isValid: false,
          message: 'Company not found',
          priority: ValidationPriority.BLOCKING,
          timestamp: new Date()
        };
      }
      const { max_users, plan_name, current_users } = result[0];
      const currentCount = parseInt(current_users, 10);
      const maxCount = max_users || 5;
      const isValid = currentCount < maxCount;
      const validationResult: ValidationResult = {
        isValid,
        message: isValid
          ? `Users within limit: ${currentCount}/${maxCount} (Plan: ${plan_name})`
          : `User limit exceeded: ${currentCount}/${maxCount} (Plan: ${plan_name})`,
        priority: isValid ? ValidationPriority.INFO : ValidationPriority.BLOCKING,
        metadata: {
          currentUsers: currentCount,
          maxUsers: maxCount,
          planName: plan_name,
          availableSlots: Math.max(0, maxCount - currentCount),
          utilizationPercentage: (currentCount / maxCount) * 100
        },
        timestamp: new Date()
      };
      // Guardar en cache
      await this.cache.set(cacheKey, validationResult, this.CACHE_TTL);
      return validationResult;
    } catch (error) {
      this.logger.error('User limit validation error:', error);
      return {
        isValid: false,
        message: `Validation error: ${error instanceof Error ? error.message : 'Unknown error'}`,
        priority: ValidationPriority.BLOCKING,
        timestamp: new Date()
      };
    }
  }
  /**
   * Valida asignación de rol con validaciones adicionales
   */
  async validateRoleAssignment(
    userId: string,
    roleId: string,
    companyId: string
  ): Promise<ValidationResult> {
    try {
      // Validación 1: Usuario existe y está activo
      const userQuery = `
        SELECT 
          u.id,
          u.email,
          u.status,
          u.company_id,
          array_agg(ur.role_id) as current_roles
        FROM users u
        LEFT JOIN user_roles ur ON u.id = ur.user_id
        WHERE u.id = $1 AND u.company_id = $2
        GROUP BY u.id, u.email, u.status, u.company_id
      `;
      const userResult = await this.sharedDb.query<{
        id: string;
        email: string;
        status: string;
        company_id: string;
        current_roles: string[];
      }>(userQuery, [userId, companyId]);
      if (userResult.length === 0) {
        return {
          isValid: false,
          message: 'User not found in company',
          priority: ValidationPriority.BLOCKING,
          timestamp: new Date()
        };
      }
      const user = userResult[0];
      if (user.status !== 'active') {
        return {
          isValid: false,
          message: `User is ${user.status}, cannot assign roles`,
          priority: ValidationPriority.BLOCKING,
          metadata: { userStatus: user.status },
          timestamp: new Date()
        };
      }
      // Validación 2: Rol existe y está activo
      const roleQuery = `
        SELECT 
          r.id,
          r.name,
          r.is_active,
          r.is_system,
          r.company_id,
          COUNT(rp.id) as permission_count
        FROM roles r
        LEFT JOIN role_permissions rp ON r.id = rp.role_id
        WHERE r.id = $1 AND (r.company_id = $2 OR r.company_id IS NULL)
        GROUP BY r.id, r.name, r.is_active, r.is_system, r.company_id
      `;
      const roleResult = await this.sharedDb.query<{
        id: string;
        name: string;
        is_active: boolean;
        is_system: boolean;
        company_id: string | null;
        permission_count: string;
      }>(roleQuery, [roleId, companyId]);
      if (roleResult.length === 0) {
        return {
          isValid: false,
          message: 'Role not found or not available for company',
          priority: ValidationPriority.BLOCKING,
          timestamp: new Date()
        };
      }
      const role = roleResult[0];
      if (!role.is_active) {
        return {
          isValid: false,
          message: `Role ${role.name} is inactive`,
          priority: ValidationPriority.BLOCKING,
          metadata: { roleName: role.name },
          timestamp: new Date()
        };
      }
      // Validación 3: Verificar si el usuario ya tiene el rol
      if (user.current_roles?.includes(roleId)) {
        return {
          isValid: false,
          message: `User already has role ${role.name}`,
          priority: ValidationPriority.WARNING,
          metadata: { roleName: role.name },
          timestamp: new Date()
        };
      }
      // Validación 4: Verificar límite de roles por usuario (máximo 5)
      const currentRoleCount = user.current_roles?.filter(r => r !== null).length || 0;
      if (currentRoleCount >= 5) {
        return {
          isValid: false,
          message: `User has reached maximum role limit (5)`,
          priority: ValidationPriority.WARNING,
          metadata: { currentRoleCount },
          timestamp: new Date()
        };
      }
      return {
        isValid: true,
        message: `Role ${role.name} can be assigned to user`,
        priority: ValidationPriority.INFO,
        metadata: {
          roleName: role.name,
          isSystemRole: role.is_system,
          permissionCount: parseInt(role.permission_count, 10),
          currentUserRoles: currentRoleCount
        },
        timestamp: new Date()
      };
    } catch (error) {
      this.logger.error('Role assignment validation error:', error);
      return {
        isValid: false,
        message: `Validation error: ${error instanceof Error ? error.message : 'Unknown error'}`,
        priority: ValidationPriority.BLOCKING,
        timestamp: new Date()
      };
    }
  }
  /**
   * Valida acceso a feature según plan y configuración
   */
  async validateFeatureAccess(
    companyId: string,
    featureKey: string
  ): Promise<ValidationResult> {
    const cacheKey = `feature_access:${companyId}:${featureKey}`;
    // Intentar obtener del cache
    const cached = await this.cache.get<ValidationResult>(cacheKey);
    if (cached) {
      return cached;
    }
    try {
      // Consulta compleja para validar feature access
      const query = `
        WITH company_plan AS (
          SELECT 
            c.id as company_id,
            c.plan_id,
            p.name as plan_name,
            p.features as plan_features
          FROM companies c
          LEFT JOIN plans p ON c.plan_id = p.id
          WHERE c.id = $1
        ),
        feature_config AS (
          SELECT 
            ff.key,
            ff.name,
            ff.is_enabled,
            ff.plan_id,
            ff.rules
          FROM feature_flags ff
          WHERE ff.key = $2
        )
        SELECT 
          cp.company_id,
          cp.plan_name,
          fc.key as feature_key,
          fc.name as feature_name,
          fc.is_enabled,
          CASE 
            WHEN fc.plan_id IS NULL THEN true
            WHEN fc.plan_id = cp.plan_id THEN true
            ELSE false
          END as plan_allows,
          fc.rules
        FROM company_plan cp
        CROSS JOIN feature_config fc
      `;
      const result = await this.sharedDb.query<{
        company_id: string;
        plan_name: string;
        feature_key: string;
        feature_name: string;
        is_enabled: boolean;
        plan_allows: boolean;
        rules: any;
      }>(query, [companyId, featureKey]);
      if (result.length === 0) {
        return {
          isValid: false,
          message: `Feature ${featureKey} not found`,
          priority: ValidationPriority.WARNING,
          timestamp: new Date()
        };
      }
      const feature = result[0];
      const isValid = feature.is_enabled && feature.plan_allows;
      // Evaluar reglas adicionales si existen
      let additionalValidation = true;
      if (feature.rules) {
        additionalValidation = await this.evaluateFeatureRules(
          companyId,
          feature.rules
        );
      }
      const finalValidation = isValid && additionalValidation;
      const validationResult: ValidationResult = {
        isValid: finalValidation,
        message: finalValidation
          ? `Feature ${feature.feature_name} is accessible`
          : `Feature ${feature.feature_name} is not accessible (${!feature.is_enabled ? 'disabled' : 'plan restriction'})`,
        priority: finalValidation ? ValidationPriority.INFO : ValidationPriority.WARNING,
        metadata: {
          featureKey: feature.feature_key,
          featureName: feature.feature_name,
          planName: feature.plan_name,
          isEnabled: feature.is_enabled,
          planAllows: feature.plan_allows,
          rulesEvaluated: feature.rules !== null
        },
        timestamp: new Date()
      };
      // Guardar en cache
      await this.cache.set(cacheKey, validationResult, this.CACHE_TTL);
      return validationResult;
    } catch (error) {
      this.logger.error('Feature access validation error:', error);
      return {
        isValid: false,
        message: `Validation error: ${error instanceof Error ? error.message : 'Unknown error'}`,
        priority: ValidationPriority.BLOCKING,
        timestamp: new Date()
      };
    }
  }
  /**
   * Valida permisos de usuario para una acción específica
   */
  async validateUserPermission(
    userId: string,
    resource: string,
    action: string
  ): Promise<ValidationResult> {
    try {
      const query = `
        SELECT EXISTS(
          SELECT 1
          FROM users u
          JOIN user_roles ur ON u.id = ur.user_id
          JOIN role_permissions rp ON ur.role_id = rp.role_id
          JOIN permissions p ON rp.permission_id = p.id
          WHERE u.id = $1
            AND u.status = 'active'
            AND p.resource = $2
            AND p.action = $3
            AND rp.is_active = true
        ) as has_permission
      `;
      const result = await this.sharedDb.query<{ has_permission: boolean }>(
        query,
        [userId, resource, action]
      );
      const hasPermission = result[0]?.has_permission || false;
      return {
        isValid: hasPermission,
        message: hasPermission
          ? `User has permission for ${action} on ${resource}`
          : `User lacks permission for ${action} on ${resource}`,
        priority: hasPermission ? ValidationPriority.INFO : ValidationPriority.BLOCKING,
        metadata: {
          userId,
          resource,
          action
        },
        timestamp: new Date()
      };
    } catch (error) {
      this.logger.error('User permission validation error:', error);
      return {
        isValid: false,
        message: `Validation error: ${error instanceof Error ? error.message : 'Unknown error'}`,
        priority: ValidationPriority.BLOCKING,
        timestamp: new Date()
      };
    }
  }
  /**
   * Evalúa reglas adicionales de features
   */
  private async evaluateFeatureRules(
    companyId: string,
    rules: any
  ): Promise<boolean> {
    try {
      // Implementar lógica de evaluación de reglas
      // Por ahora retorna true, expandir según necesidades
      if (rules.requiresMinUsers) {
        const userCount = await this.getUserCount(companyId);
        if (userCount < rules.requiresMinUsers) {
          return false;
        }
      }
      if (rules.expiresAt) {
        const expirationDate = new Date(rules.expiresAt);
        if (new Date() > expirationDate) {
          return false;
        }
      }
      return true;
    } catch (error) {
      this.logger.warn('Rule evaluation error:', error);
      return false;
    }
  }
  /**
   * Obtiene el conteo de usuarios de una empresa
   */
  private async getUserCount(companyId: string): Promise<number> {
    const query = `
      SELECT COUNT(*) as count
      FROM users
      WHERE company_id = $1 AND status = 'active'
    `;
    const result = await this.sharedDb.query<{ count: string }>(query, [companyId]);
    return parseInt(result[0].count, 10);
  }
}
