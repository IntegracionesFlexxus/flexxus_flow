/**
 * Cross-Module Validation System
 * Sprint 4 - Exportaciones principales
 */
// Interfaces
export * from './interfaces/ICrossModuleValidator';
// Implementaciones
export { CrossModuleValidator } from './CrossModuleValidator';
export { BusinessRuleValidator } from './BusinessRuleValidator';
export { ValidationTriggerManager, TriggerEvent, TriggerPayload } from './ValidationTriggerManager';
export { ConstraintValidator, ConstraintType, ConstraintValidationParams } from './ConstraintValidator';
export { ConsistencyChecker } from './ConsistencyChecker';
// Re-exportar validadores existentes
export * from '@/shared/validators/validator';
export * from '@/shared/validators/auth.validators';
export * from '@/shared/validators/user.validators';
export * from '@/shared/validators/company.validators';
export * from '@/shared/validators/featureFlag.validators';
