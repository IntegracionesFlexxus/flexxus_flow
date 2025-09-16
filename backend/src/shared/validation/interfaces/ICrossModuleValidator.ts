/**
 * Cross-Module Validation Interfaces
 * Sprint 4 - Sistema de validaciones entre módulos
 */
import { PoolClient } from 'pg';
export enum ValidationPriority {
  BLOCKING = 'BLOCKING',
  WARNING = 'WARNING',
  INFO = 'INFO'
}
export enum ValidationType {
  FOREIGN_KEY = 'FK',
  BUSINESS_RULE = 'BUSINESS_RULE',
  CONSISTENCY = 'CONSISTENCY'
}
export interface ValidationResult {
  isValid: boolean;
  message?: string;
  priority?: ValidationPriority;
  metadata?: Record<string, any>;
  timestamp?: Date;
}
export interface ForeignKeyValidationParams {
  sourceTable: string;
  sourceColumn: string;
  sourceValue: string;
  targetDatabase: 'shared' | 'omni' | 'crm' | 'workflow' | 'analytics';
  targetTable: string;
  targetColumn: string;
  companyId: string;
}
export interface BusinessRuleValidationParams {
  ruleName: string;
  companyId: string;
  userId?: string;
  params?: Record<string, any>;
}
export interface ConsistencyCheckParams {
  companyId: string;
  modules?: string[];
  autoRepair?: boolean;
}
export interface ICrossModuleValidator {
  /**
   * Valida integridad referencial entre módulos
   */
  validateForeignKey(params: ForeignKeyValidationParams): Promise<ValidationResult>;
  /**
   * Valida reglas de negocio cross-module
   */
  validateBusinessRule(params: BusinessRuleValidationParams): Promise<ValidationResult>;
  /**
   * Ejecuta verificaciones de consistencia
   */
  runConsistencyCheck(params: ConsistencyCheckParams): Promise<ValidationResult[]>;
  /**
   * Valida en batch múltiples foreign keys
   */
  validateBatchForeignKeys(
    validations: ForeignKeyValidationParams[]
  ): Promise<ValidationResult[]>;
}
export interface IBusinessRuleValidator {
  /**
   * Valida límite de usuarios por plan
   */
  validateUserLimit(companyId: string): Promise<ValidationResult>;
  /**
   * Valida asignación de rol
   */
  validateRoleAssignment(
    userId: string,
    roleId: string,
    companyId: string
  ): Promise<ValidationResult>;
  /**
   * Valida acceso a feature según plan
   */
  validateFeatureAccess(
    companyId: string,
    featureKey: string
  ): Promise<ValidationResult>;
  /**
   * Valida permisos de usuario para acción
   */
  validateUserPermission(
    userId: string,
    resource: string,
    action: string
  ): Promise<ValidationResult>;
}
export interface IConsistencyChecker {
  /**
   * Verifica consistencia de datos
   */
  checkDataConsistency(companyId: string): Promise<ConsistencyCheckResult[]>;
  /**
   * Repara inconsistencias automáticamente
   */
  autoRepairInconsistencies(
    companyId: string,
    dryRun?: boolean
  ): Promise<RepairResult>;
  /**
   * Inicia el servicio de checks periódicos
   */
  start(): void;
  /**
   * Detiene el servicio de checks periódicos
   */
  stop(): void;
}
export interface ConsistencyCheckResult {
  checkName: string;
  checkStatus: 'PASSED' | 'WARNING' | 'FAILED';
  details: Record<string, any>;
  timestamp: Date;
}
export interface RepairResult {
  dryRun: boolean;
  repairs: RepairAction[];
  timestamp: Date;
}
export interface RepairAction {
  type: string;
  action: string;
  count: number;
  success: boolean;
  error?: string;
}
export interface IValidationTransaction {
  /**
   * Ejecuta validaciones dentro de una transacción
   */
  executeInTransaction<T>(
    callback: (client: PoolClient) => Promise<T>
  ): Promise<T>;
}
