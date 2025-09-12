/**
 * Consistency Checker
 * Sprint 4 - Sistema de verificación y reparación de consistencia de datos
 */
import { injectable, inject } from 'inversify';
import { CronJob } from 'cron';
import { TYPES } from '@/container/types';
import { IDatabaseConnection } from '@/shared/database/interfaces/IDatabaseConnection';
import { ILoggerService } from '@/shared/services/logger/LoggerService';
import {
  IConsistencyChecker,
  ConsistencyCheckResult,
  RepairResult,
  RepairAction
} from './interfaces/ICrossModuleValidator';
interface ConsistencyRule {
  name: string;
  description: string;
  query: string;
  repairQuery?: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  autoRepair: boolean;
}
@injectable()
export class ConsistencyChecker implements IConsistencyChecker {
  private cronJob: CronJob | null = null;
  private isRunning = false;
  private consistencyRules: ConsistencyRule[] = [];
  constructor(
    @inject(TYPES.SharedConnection) private sharedDb: IDatabaseConnection,
    @inject(TYPES.OmniConnection) private omniDb: IDatabaseConnection,
    @inject(TYPES.CrmConnection) private crmDb: IDatabaseConnection,
    @inject(TYPES.WorkflowConnection) private workflowDb: IDatabaseConnection,
    @inject(TYPES.AnalyticsConnection) private analyticsDb: IDatabaseConnection,
    @inject(TYPES.Logger) private logger: ILoggerService
  ) {
    this.initializeRules();
  }
  /**
   * Inicializa las reglas de consistencia
   */
  private initializeRules(): void {
    this.consistencyRules = [
      {
        name: 'orphaned_users',
        description: 'Users without valid company',
        query: `
          SELECT u.id, u.email, u.company_id
          FROM users u
          LEFT JOIN companies c ON u.company_id = c.id
          WHERE c.id IS NULL AND u.company_id = $1
        `,
        repairQuery: `
          UPDATE users 
          SET status = 'inactive', updated_at = CURRENT_TIMESTAMP
          WHERE company_id = $1 AND id IN (
            SELECT u.id FROM users u
            LEFT JOIN companies c ON u.company_id = c.id
            WHERE c.id IS NULL
          )
        `,
        severity: 'high',
        autoRepair: true
      },
      {
        name: 'expired_active_sessions',
        description: 'Active sessions that have expired',
        query: `
          SELECT id, user_id, expires_at
          FROM user_sessions
          WHERE company_id = $1 
            AND is_active = true 
            AND expires_at < CURRENT_TIMESTAMP
        `,
        repairQuery: `
          UPDATE user_sessions
          SET is_active = false, updated_at = CURRENT_TIMESTAMP
          WHERE company_id = $1 
            AND is_active = true 
            AND expires_at < CURRENT_TIMESTAMP
        `,
        severity: 'medium',
        autoRepair: true
      },
      {
        name: 'roles_without_permissions',
        description: 'Roles without any permissions assigned',
        query: `
          SELECT r.id, r.name
          FROM roles r
          LEFT JOIN role_permissions rp ON r.id = rp.role_id
          WHERE r.company_id = $1 
            AND rp.id IS NULL
            AND r.is_active = true
        `,
        repairQuery: undefined, // No auto-repair for this
        severity: 'low',
        autoRepair: false
      },
      {
        name: 'duplicate_user_roles',
        description: 'Users with duplicate role assignments',
        query: `
          SELECT user_id, role_id, COUNT(*) as count
          FROM user_roles ur
          JOIN users u ON ur.user_id = u.id
          WHERE u.company_id = $1
          GROUP BY user_id, role_id
          HAVING COUNT(*) > 1
        `,
        repairQuery: `
          DELETE FROM user_roles
          WHERE ctid NOT IN (
            SELECT MIN(ctid)
            FROM user_roles ur
            JOIN users u ON ur.user_id = u.id
            WHERE u.company_id = $1
            GROUP BY user_id, role_id
          )
        `,
        severity: 'high',
        autoRepair: true
      },
      {
        name: 'invalid_feature_flags',
        description: 'Feature flags with invalid plan references',
        query: `
          SELECT ff.id, ff.key, ff.plan_id
          FROM feature_flags ff
          LEFT JOIN plans p ON ff.plan_id = p.id
          WHERE ff.plan_id IS NOT NULL 
            AND p.id IS NULL
        `,
        repairQuery: `
          UPDATE feature_flags
          SET is_enabled = false, updated_at = CURRENT_TIMESTAMP
          WHERE plan_id IS NOT NULL 
            AND plan_id NOT IN (SELECT id FROM plans)
        `,
        severity: 'medium',
        autoRepair: true
      },
      {
        name: 'inactive_users_with_active_sessions',
        description: 'Inactive users with active sessions',
        query: `
          SELECT u.id, u.email, COUNT(us.id) as active_sessions
          FROM users u
          JOIN user_sessions us ON u.id = us.user_id
          WHERE u.company_id = $1
            AND u.status != 'active'
            AND us.is_active = true
          GROUP BY u.id, u.email
        `,
        repairQuery: `
          UPDATE user_sessions
          SET is_active = false, revoked_at = CURRENT_TIMESTAMP
          WHERE user_id IN (
            SELECT u.id
            FROM users u
            WHERE u.company_id = $1 AND u.status != 'active'
          ) AND is_active = true
        `,
        severity: 'high',
        autoRepair: true
      },
      {
        name: 'circular_role_hierarchy',
        description: 'Circular references in role hierarchy',
        query: `
          WITH RECURSIVE role_hierarchy AS (
            SELECT id, parent_role_id, ARRAY[id] as path, false as has_cycle
            FROM roles
            WHERE company_id = $1
            UNION ALL
            SELECT r.id, r.parent_role_id, 
                   rh.path || r.id,
                   r.id = ANY(rh.path) as has_cycle
            FROM roles r
            JOIN role_hierarchy rh ON r.parent_role_id = rh.id
            WHERE NOT rh.has_cycle
          )
          SELECT * FROM role_hierarchy WHERE has_cycle = true
        `,
        repairQuery: undefined, // Manual intervention required
        severity: 'critical',
        autoRepair: false
      },
      {
        name: 'dangling_invitations',
        description: 'Invitations for non-existent users or companies',
        query: `
          SELECT i.id, i.email, i.invited_by
          FROM invitations i
          LEFT JOIN users u ON i.invited_by = u.id
          WHERE i.company_id = $1
            AND i.status = 'pending'
            AND (u.id IS NULL OR i.expires_at < CURRENT_TIMESTAMP)
        `,
        repairQuery: `
          UPDATE invitations
          SET status = 'expired', updated_at = CURRENT_TIMESTAMP
          WHERE company_id = $1
            AND status = 'pending'
            AND (
              invited_by NOT IN (SELECT id FROM users)
              OR expires_at < CURRENT_TIMESTAMP
            )
        `,
        severity: 'low',
        autoRepair: true
      }
    ];
  }
  /**
   * Inicia el servicio de checks periódicos
   */
  start(): void {
    if (this.isRunning) {
      this.logger.warn('Consistency checker is already running');
      return;
    }
    // Ejecutar checks cada hora (0 * * * *)
    const cronPattern = process.env.CONSISTENCY_CHECK_CRON || '0 * * * *';
    this.cronJob = new CronJob(cronPattern, async () => {
      await this.runScheduledChecks();
    });
    this.cronJob.start();
    this.isRunning = true;
    this.logger.info(`Consistency checker started with pattern: ${cronPattern}`);
  }
  /**
   * Detiene el servicio de checks periódicos
   */
  stop(): void {
    if (!this.isRunning || !this.cronJob) {
      this.logger.warn('Consistency checker is not running');
      return;
    }
    this.cronJob.stop();
    this.cronJob = null;
    this.isRunning = false;
    this.logger.info('Consistency checker stopped');
  }
  /**
   * Ejecuta checks programados
   */
  private async runScheduledChecks(): Promise<void> {
    try {
      this.logger.info('Starting scheduled consistency checks');
      // Obtener todas las empresas activas
      const companies = await this.sharedDb.query<{ id: string; name: string }>(
        `SELECT id, name FROM companies WHERE status = 'active'`
      );
      for (const company of companies) {
        try {
          const results = await this.checkDataConsistency(company.id);
          // Registrar resultados
          await this.logCheckResults(company.id, results);
          // Auto-reparar si está habilitado
          if (process.env.AUTO_REPAIR_ENABLED === 'true') {
            const failures = results.filter(r => r.checkStatus === 'FAILED');
            if (failures.length > 0) {
              await this.autoRepairInconsistencies(company.id, false);
            }
          }
        } catch (error) {
          this.logger.error(`Consistency check failed for company ${company.id}:`, error);
        }
      }
      this.logger.info('Scheduled consistency checks completed');
    } catch (error) {
      this.logger.error('Scheduled consistency check error:', error);
    }
  }
  /**
   * Verifica consistencia de datos para una empresa
   */
  async checkDataConsistency(companyId: string): Promise<ConsistencyCheckResult[]> {
    const results: ConsistencyCheckResult[] = [];
    const startTime = Date.now();
    for (const rule of this.consistencyRules) {
      try {
        const checkResult = await this.executeConsistencyRule(rule, companyId);
        results.push(checkResult);
      } catch (error) {
        this.logger.error(`Error executing rule ${rule.name}:`, error);
        results.push({
          checkName: rule.name,
          checkStatus: 'FAILED',
          details: {
            error: error instanceof Error ? error.message : 'Unknown error',
            description: rule.description
          },
          timestamp: new Date()
        });
      }
    }
    const duration = Date.now() - startTime;
    this.logger.info(`Consistency check for company ${companyId} completed in ${duration}ms`);
    return results;
  }
  /**
   * Ejecuta una regla de consistencia
   */
  private async executeConsistencyRule(
    rule: ConsistencyRule,
    companyId: string
  ): Promise<ConsistencyCheckResult> {
    const result = await this.sharedDb.query(rule.query, [companyId]);
    const hasIssues = result.length > 0;
    const checkStatus = hasIssues 
      ? (rule.severity === 'critical' || rule.severity === 'high' ? 'FAILED' : 'WARNING')
      : 'PASSED';
    return {
      checkName: rule.name,
      checkStatus,
      details: {
        description: rule.description,
        severity: rule.severity,
        issueCount: result.length,
        canAutoRepair: rule.autoRepair,
        affectedRecords: result.slice(0, 10) // Limitar a 10 registros en los detalles
      },
      timestamp: new Date()
    };
  }
  /**
   * Repara inconsistencias automáticamente
   */
  async autoRepairInconsistencies(
    companyId: string,
    dryRun: boolean = true
  ): Promise<RepairResult> {
    const repairs: RepairAction[] = [];
    const startTime = Date.now();
    this.logger.info(`Starting auto-repair for company ${companyId} (dry run: ${dryRun})`);
    for (const rule of this.consistencyRules) {
      if (!rule.autoRepair || !rule.repairQuery) {
        continue;
      }
      try {
        // Primero verificar si hay problemas
        const checkResult = await this.sharedDb.query(rule.query, [companyId]);
        if (checkResult.length === 0) {
          continue; // No hay problemas para esta regla
        }
        let repairCount = 0;
        if (!dryRun) {
          // Ejecutar la reparación
          const repairResult = await this.sharedDb.query(
            rule.repairQuery,
            [companyId]
          );
          repairCount = repairResult.length;
          this.logger.info(`Repaired ${repairCount} issues for rule ${rule.name}`);
        } else {
          repairCount = checkResult.length;
        }
        repairs.push({
          type: rule.name,
          action: rule.description,
          count: repairCount,
          success: true
        });
      } catch (error) {
        this.logger.error(`Auto-repair failed for rule ${rule.name}:`, error);
        repairs.push({
          type: rule.name,
          action: rule.description,
          count: 0,
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }
    const duration = Date.now() - startTime;
    this.logger.info(`Auto-repair completed in ${duration}ms (${repairs.length} repairs)`);
    return {
      dryRun,
      repairs,
      timestamp: new Date()
    };
  }
  /**
   * Registra los resultados de los checks
   */
  private async logCheckResults(
    companyId: string,
    results: ConsistencyCheckResult[]
  ): Promise<void> {
    try {
      const summary = {
        passed: results.filter(r => r.checkStatus === 'PASSED').length,
        warnings: results.filter(r => r.checkStatus === 'WARNING').length,
        failed: results.filter(r => r.checkStatus === 'FAILED').length,
        total: results.length
      };
      const query = `
        INSERT INTO consistency_check_logs (
          company_id,
          check_results,
          summary,
          created_at
        ) VALUES ($1, $2, $3, CURRENT_TIMESTAMP)
      `;
      await this.sharedDb.query(query, [
        companyId,
        JSON.stringify(results),
        JSON.stringify(summary)
      ]);
    } catch (error) {
      this.logger.error('Failed to log consistency check results:', error);
    }
  }
  /**
   * Obtiene el historial de checks de consistencia
   */
  async getConsistencyHistory(
    companyId: string,
    limit: number = 10
  ): Promise<any[]> {
    const query = `
      SELECT 
        id,
        check_results,
        summary,
        created_at
      FROM consistency_check_logs
      WHERE company_id = $1
      ORDER BY created_at DESC
      LIMIT $2
    `;
    return await this.sharedDb.query(query, [companyId, limit]);
  }
  /**
   * Ejecuta un check específico
   */
  async runSpecificCheck(
    companyId: string,
    checkName: string
  ): Promise<ConsistencyCheckResult> {
    const rule = this.consistencyRules.find(r => r.name === checkName);
    if (!rule) {
      throw new Error(`Check ${checkName} not found`);
    }
    return await this.executeConsistencyRule(rule, companyId);
  }
  /**
   * Obtiene estadísticas de consistencia
   */
  async getConsistencyStats(companyId: string): Promise<any> {
    const query = `
      SELECT 
        COUNT(*) as total_checks,
        SUM((summary->>'passed')::int) as total_passed,
        SUM((summary->>'warnings')::int) as total_warnings,
        SUM((summary->>'failed')::int) as total_failed,
        MIN(created_at) as first_check,
        MAX(created_at) as last_check
      FROM consistency_check_logs
      WHERE company_id = $1
    `;
    const result = await this.sharedDb.query(query, [companyId]);
    return result[0];
  }
}
