/**
 * Audit & Logging Configuration - Sprint 2
 * Siguiendo lineamientos nivel 2: configuración centralizada para auditoría
 */
import { environment } from '@/config/environment';
export interface AuditConfig {
  enabled: boolean;
  level: 'minimal' | 'standard' | 'comprehensive' | 'debug';
  retention: {
    days: number;
    compressAfterDays?: number;
  };
  storage: {
    type: 'database' | 'file' | 'external' | 'hybrid';
    maxFileSize?: string;
    rotateFiles?: boolean;
  };
  sampling?: {
    enabled: boolean;
    rate: number; // 0-1
  };
}
export interface LoggingConfig {
  level: 'error' | 'warn' | 'info' | 'debug';
  format: 'json' | 'text' | 'combined';
  enableConsole: boolean;
  enableFile: boolean;
  enableDatabase: boolean;
  enableExternal: boolean;
  context: {
    includeStack: boolean;
    includeTimestamp: boolean;
    includeRequestId: boolean;
    includeUserId: boolean;
    includeCompanyId: boolean;
    includePerformance: boolean;
  };
}
export type AuditEventType = 
  | 'authentication'
  | 'authorization' 
  | 'user_management'
  | 'company_management'
  | 'data_access'
  | 'data_modification'
  | 'system_configuration'
  | 'security_event'
  | 'feature_flag_change'
  | 'api_access'
  | 'file_operation'
  | 'rate_limit_exceeded'
  | 'error_occurred'
  | 'performance_issue';
export type AuditSeverity = 'low' | 'medium' | 'high' | 'critical';
export interface AuditEventConfig {
  type: AuditEventType;
  enabled: boolean;
  severity: AuditSeverity;
  retention: number; // days
  alertThreshold?: number; // events per hour
  includePayload?: boolean;
  includeResponse?: boolean;
  anonymizePII?: boolean;
}
/**
 * Configuración de auditoría por ambiente
 */
export const auditConfig: Record<string, AuditConfig> = {
  development: {
    enabled: true,
    level: 'debug',
    retention: { days: 7 },
    storage: { type: 'file', maxFileSize: '10MB', rotateFiles: true },
    sampling: { enabled: false, rate: 1.0 }
  },
  testing: {
    enabled: true,
    level: 'minimal',
    retention: { days: 1 },
    storage: { type: 'database' },
    sampling: { enabled: false, rate: 1.0 }
  },
  staging: {
    enabled: true,
    level: 'standard',
    retention: { days: 30, compressAfterDays: 7 },
    storage: { type: 'hybrid' },
    sampling: { enabled: true, rate: 0.8 }
  },
  production: {
    enabled: true,
    level: 'comprehensive',
    retention: { days: 90, compressAfterDays: 30 },
    storage: { type: 'database' },
    sampling: { enabled: true, rate: 0.9 }
  }
};
/**
 * Configuración de logging por ambiente
 */
export const loggingConfig: Record<string, LoggingConfig> = {
  development: {
    level: 'debug',
    format: 'text',
    enableConsole: true,
    enableFile: true,
    enableDatabase: false,
    enableExternal: false,
    context: {
      includeStack: true,
      includeTimestamp: true,
      includeRequestId: true,
      includeUserId: true,
      includeCompanyId: true,
      includePerformance: true
    }
  },
  testing: {
    level: 'error',
    format: 'json',
    enableConsole: false,
    enableFile: false,
    enableDatabase: true,
    enableExternal: false,
    context: {
      includeStack: false,
      includeTimestamp: true,
      includeRequestId: true,
      includeUserId: false,
      includeCompanyId: false,
      includePerformance: false
    }
  },
  staging: {
    level: 'info',
    format: 'json',
    enableConsole: false,
    enableFile: true,
    enableDatabase: true,
    enableExternal: true,
    context: {
      includeStack: true,
      includeTimestamp: true,
      includeRequestId: true,
      includeUserId: true,
      includeCompanyId: true,
      includePerformance: true
    }
  },
  production: {
    level: 'warn',
    format: 'json',
    enableConsole: false,
    enableFile: true,
    enableDatabase: true,
    enableExternal: true,
    context: {
      includeStack: false,
      includeTimestamp: true,
      includeRequestId: true,
      includeUserId: true,
      includeCompanyId: true,
      includePerformance: true
    }
  }
};
/**
 * Configuración de eventos de auditoría
 */
export const auditEvents: Record<AuditEventType, AuditEventConfig> = {
  authentication: {
    type: 'authentication',
    enabled: true,
    severity: 'high',
    retention: 365, // 1 año
    alertThreshold: 50,
    includePayload: false, // No incluir passwords
    includeResponse: true,
    anonymizePII: true
  },
  authorization: {
    type: 'authorization',
    enabled: true,
    severity: 'medium',
    retention: 180,
    alertThreshold: 100,
    includePayload: true,
    includeResponse: true,
    anonymizePII: false
  },
  user_management: {
    type: 'user_management',
    enabled: true,
    severity: 'high',
    retention: 365,
    alertThreshold: 20,
    includePayload: true,
    includeResponse: true,
    anonymizePII: true
  },
  company_management: {
    type: 'company_management',
    enabled: true,
    severity: 'high',
    retention: 365,
    alertThreshold: 10,
    includePayload: true,
    includeResponse: true,
    anonymizePII: false
  },
  data_access: {
    type: 'data_access',
    enabled: environment.nodeEnv === 'production',
    severity: 'low',
    retention: 30,
    includePayload: false,
    includeResponse: false,
    anonymizePII: true
  },
  data_modification: {
    type: 'data_modification',
    enabled: true,
    severity: 'medium',
    retention: 180,
    alertThreshold: 1000,
    includePayload: true,
    includeResponse: true,
    anonymizePII: true
  },
  system_configuration: {
    type: 'system_configuration',
    enabled: true,
    severity: 'critical',
    retention: 730, // 2 años
    alertThreshold: 5,
    includePayload: true,
    includeResponse: true,
    anonymizePII: false
  },
  security_event: {
    type: 'security_event',
    enabled: true,
    severity: 'critical',
    retention: 730,
    alertThreshold: 1,
    includePayload: true,
    includeResponse: true,
    anonymizePII: false
  },
  feature_flag_change: {
    type: 'feature_flag_change',
    enabled: true,
    severity: 'medium',
    retention: 90,
    alertThreshold: 50,
    includePayload: true,
    includeResponse: true,
    anonymizePII: false
  },
  api_access: {
    type: 'api_access',
    enabled: environment.nodeEnv === 'production',
    severity: 'low',
    retention: 30,
    includePayload: false,
    includeResponse: false,
    anonymizePII: true
  },
  file_operation: {
    type: 'file_operation',
    enabled: true,
    severity: 'medium',
    retention: 90,
    alertThreshold: 100,
    includePayload: false,
    includeResponse: true,
    anonymizePII: true
  },
  rate_limit_exceeded: {
    type: 'rate_limit_exceeded',
    enabled: true,
    severity: 'medium',
    retention: 30,
    alertThreshold: 20,
    includePayload: false,
    includeResponse: false,
    anonymizePII: false
  },
  error_occurred: {
    type: 'error_occurred',
    enabled: true,
    severity: 'high',
    retention: 90,
    alertThreshold: 100,
    includePayload: true,
    includeResponse: false,
    anonymizePII: true
  },
  performance_issue: {
    type: 'performance_issue',
    enabled: true,
    severity: 'medium',
    retention: 30,
    alertThreshold: 50,
    includePayload: false,
    includeResponse: false,
    anonymizePII: false
  }
};
/**
 * Configuración de campos sensibles para anonimización
 */
export const sensitiveFields = {
  // Campos que deben ser completamente removidos
  remove: [
    'password',
    'token',
    'secret',
    'key',
    'ssn',
    'taxId',
    'creditCard',
    'accountNumber'
  ],
  // Campos que deben ser parcialmente ofuscados
  mask: [
    'email',
    'phone',
    'address',
    'ip',
    'deviceId'
  ],
  // Campos que deben ser hasheados
  hash: [
    'userId',
    'sessionId',
    'deviceFingerprint'
  ]
};
/**
 * Configuración de retención por tipo de datos
 */
export const retentionPolicies = {
  audit_logs: {
    hot: 30, // días en almacenamiento de acceso rápido
    warm: 90, // días en almacenamiento intermedio
    cold: 365, // días en almacenamiento de archivo
    delete: 2555 // días hasta borrado completo (7 años)
  },
  application_logs: {
    hot: 7,
    warm: 30,
    cold: 90,
    delete: 365
  },
  security_logs: {
    hot: 90,
    warm: 180,
    cold: 730,
    delete: 2555
  },
  performance_logs: {
    hot: 1,
    warm: 7,
    cold: 30,
    delete: 90
  }
};
/**
 * Obtener configuración actual basada en el ambiente
 */
export const getCurrentAuditConfig = (): AuditConfig => {
  return auditConfig[environment.nodeEnv] || auditConfig.production;
};
export const getCurrentLoggingConfig = (): LoggingConfig => {
  return loggingConfig[environment.nodeEnv] || loggingConfig.production;
};
/**
 * Verificar si un evento debe ser auditado
 */
export const shouldAuditEvent = (eventType: AuditEventType): boolean => {
  const config = getCurrentAuditConfig();
  const eventConfig = auditEvents[eventType];
  return config.enabled && eventConfig.enabled;
};
/**
 * Verificar si debe aplicarse sampling
 */
export const shouldSample = (): boolean => {
  const config = getCurrentAuditConfig();
  if (!config.sampling?.enabled) {
    return true;
  }
  return Math.random() < config.sampling.rate;
};
/**
 * Configuración de alertas
 */
export const alertConfig = {
  enabled: environment.nodeEnv === 'production',
  channels: {
    email: {
      enabled: true,
      recipients: []
    },
    slack: {
      enabled: true,
      webhook: undefined
    },
    webhook: {
      enabled: true,
      url: undefined
    }
  },
  thresholds: {
    error_rate: 0.05, // 5% error rate
    response_time: 2000, // 2 segundos
    failed_logins: 10, // por hora
    suspicious_activity: 5 // por hora
  }
};
