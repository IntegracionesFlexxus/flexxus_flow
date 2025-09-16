/**
 * Service Layer Exports
 * Sprint 4 - Centralización de servicios compartidos
 */
// Cache Services
export { CacheService } from './cache/CacheService';
export { EnhancedCacheService } from './cache/EnhancedCacheService';
export type { CacheConfig, CacheStats, CacheTag } from './cache/EnhancedCacheService';
// Validation Services
export { ValidatorService, ValidationError } from './common/ValidatorService';
export { EnhancedValidatorService } from './validation/EnhancedValidatorService';
export type { 
  ValidationRule, 
  ValidationSchema, 
  ValidationResult,
  BusinessRule,
  ConditionalValidation 
} from './validation/EnhancedValidatorService';
// Email Services
export { EmailService } from './email/EmailService';
export type { 
  EmailConfig,
  EmailOptions,
  EmailTemplate,
  EmailAttachment,
  EmailResult,
  EmailQueueJob 
} from './email/EmailService';
// Notification Services
export { NotificationService } from './notification/NotificationService';
export type {
  NotificationChannel,
  NotificationTemplate,
  NotificationOptions,
  NotificationResult
} from './notification/NotificationService';
// Audit Services
export { AuditService } from './audit/AuditService';
export type {
  AuditAction,
  AuditContext,
  AuditEntry
} from './audit/AuditService';
// Logger Services
export { LoggerService } from './logger/LoggerService';
export type {
  LogLevel,
  LogContext,
  LogEntry
} from './logger/LoggerService';
// Event Services
export { EventBusService } from './events/EventBusService';
export type {
  EventHandler,
  EventOptions,
  EventSubscription
} from './events/EventBusService';
// Utility Services
export { ConfigService } from './config/ConfigService';
export { ErrorHandlerService } from './error/ErrorHandlerService';
// Service Interfaces
export type { ICacheService } from '@/shared/interfaces/ICacheService';
export type { IValidatorService } from '@/shared/interfaces/IServices';
export type { INotificationService } from '@/shared/interfaces/INotificationService';
export type { IAuditService } from '@/shared/interfaces/IAuditService';
export type { ILoggerService } from '@/shared/interfaces/ILoggerService';
export type { IEventBusService } from '@/shared/interfaces/IEventBusService';
