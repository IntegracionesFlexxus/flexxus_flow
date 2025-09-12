/**
 * Security Hardening Interfaces
 * Sprint 4 - Security Team
 * Interfaces para el sistema de seguridad endurecida
 */
import { PoolClient } from 'pg';
/**
 * Configuración de cifrado TDE
 */
export interface TDEConfig {
  database: string;
  tablespace?: string;
  algorithm: 'AES128' | 'AES256';
  keyRotationDays: number;
  enableCompression?: boolean;
}
/**
 * Estado de cifrado de columna
 */
export interface ColumnEncryptionStatus {
  table: string;
  column: string;
  isEncrypted: boolean;
  algorithm?: string;
  keyId?: string;
  encryptedAt?: Date;
}
/**
 * Configuración SSL/TLS
 */
export interface TLSConfig {
  minVersion: 'TLSv1.2' | 'TLSv1.3';
  cipherSuites: string[];
  certificatePath: string;
  privateKeyPath: string;
  caPath?: string;
  requireClientCert?: boolean;
  sessionTimeout?: number;
  ticketKeys?: Buffer[];
}
/**
 * Certificado SSL
 */
export interface Certificate {
  domain: string;
  fingerprint: string;
  issuer: string;
  subject: string;
  validFrom: Date;
  validTo: Date;
  serialNumber: string;
  publicKey: string;
}
/**
 * Evento de seguridad para auditoría
 */
export interface SecurityEvent {
  id?: string;
  type: SecurityEventType;
  severity: 'critical' | 'high' | 'medium' | 'low' | 'info';
  actor: string;
  target?: string;
  action: string;
  result: 'success' | 'failure' | 'blocked';
  reason?: string;
  metadata?: Record<string, any>;
  ipAddress?: string;
  userAgent?: string;
  timestamp: Date;
}
/**
 * Tipos de eventos de seguridad
 */
export enum SecurityEventType {
  LOGIN_ATTEMPT = 'login_attempt',
  LOGIN_SUCCESS = 'login_success',
  LOGIN_FAILURE = 'login_failure',
  LOGOUT = 'logout',
  PASSWORD_CHANGE = 'password_change',
  PASSWORD_RESET = 'password_reset',
  MFA_ENABLED = 'mfa_enabled',
  MFA_DISABLED = 'mfa_disabled',
  PERMISSION_DENIED = 'permission_denied',
  DATA_ACCESS = 'data_access',
  DATA_MODIFICATION = 'data_modification',
  DATA_DELETION = 'data_deletion',
  ENCRYPTION_KEY_ROTATION = 'encryption_key_rotation',
  CERTIFICATE_RENEWAL = 'certificate_renewal',
  SUSPICIOUS_ACTIVITY = 'suspicious_activity',
  SECURITY_SCAN = 'security_scan',
  COMPLIANCE_CHECK = 'compliance_check'
}
/**
 * Trail de auditoría inmutable
 */
export interface AuditTrail {
  id: string;
  events: SecurityEvent[];
  hash: string;
  previousHash: string;
  merkleRoot?: string;
  signature?: string;
  createdAt: Date;
  verifiedAt?: Date;
}
/**
 * Política de acceso ABAC
 */
export interface AccessPolicy {
  id: string;
  name: string;
  description?: string;
  effect: 'allow' | 'deny';
  subjects: PolicySubject[];
  resources: PolicyResource[];
  actions: string[];
  conditions?: PolicyCondition[];
  priority: number;
  enabled: boolean;
}
/**
 * Sujeto de política
 */
export interface PolicySubject {
  type: 'user' | 'role' | 'group' | 'service';
  identifier: string;
  attributes?: Record<string, any>;
}
/**
 * Recurso de política
 */
export interface PolicyResource {
  type: string;
  identifier: string;
  attributes?: Record<string, any>;
}
/**
 * Condición de política
 */
export interface PolicyCondition {
  type: 'time' | 'location' | 'device' | 'risk' | 'custom';
  operator: 'equals' | 'not_equals' | 'contains' | 'greater_than' | 'less_than';
  value: any;
}
/**
 * Contexto de acceso para evaluación
 */
export interface AccessContext {
  subject: PolicySubject;
  resource: PolicyResource;
  action: string;
  environment?: {
    ipAddress?: string;
    location?: string;
    device?: string;
    time?: Date;
    riskScore?: number;
  };
}
/**
 * Decisión de acceso
 */
export interface AccessDecision {
  allowed: boolean;
  policy?: AccessPolicy;
  reason?: string;
  obligations?: string[];
  advice?: string[];
}
/**
 * Incidente de seguridad
 */
export interface SecurityIncident {
  id: string;
  type: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  status: 'open' | 'investigating' | 'contained' | 'resolved' | 'closed';
  description: string;
  affectedSystems: string[];
  indicators: string[];
  timeline: IncidentEvent[];
  assignee?: string;
  reportedBy: string;
  reportedAt: Date;
  resolvedAt?: Date;
}
/**
 * Evento del incidente
 */
export interface IncidentEvent {
  timestamp: Date;
  action: string;
  actor: string;
  details: string;
}
/**
 * Vulnerabilidad detectada
 */
export interface Vulnerability {
  id: string;
  cve?: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  title: string;
  description: string;
  affectedComponent: string;
  version?: string;
  fixVersion?: string;
  exploitAvailable: boolean;
  remediation?: string;
  detectedAt: Date;
  status: 'open' | 'mitigated' | 'fixed' | 'accepted';
}
/**
 * Configuración de compliance
 */
export interface ComplianceConfig {
  standards: ComplianceStandard[];
  dataRetention: DataRetentionPolicy;
  encryption: EncryptionRequirements;
  auditRequirements: AuditRequirements;
  privacySettings: PrivacySettings;
}
/**
 * Estándar de compliance
 */
export interface ComplianceStandard {
  name: 'GDPR' | 'PCI-DSS' | 'HIPAA' | 'SOC2' | 'ISO27001';
  enabled: boolean;
  controls: ComplianceControl[];
  lastAudit?: Date;
  nextAudit?: Date;
  status: 'compliant' | 'non-compliant' | 'partial';
}
/**
 * Control de compliance
 */
export interface ComplianceControl {
  id: string;
  name: string;
  description: string;
  category: string;
  requirement: string;
  implementation: string;
  evidence?: string[];
  status: 'implemented' | 'partial' | 'not_implemented';
  lastChecked?: Date;
}
/**
 * Política de retención de datos
 */
export interface DataRetentionPolicy {
  defaultRetentionDays: number;
  policies: Array<{
    dataType: string;
    retentionDays: number;
    deleteAfter: boolean;
    archiveLocation?: string;
  }>;
}
/**
 * Requerimientos de cifrado
 */
export interface EncryptionRequirements {
  atRest: {
    required: boolean;
    algorithm: string;
    keyRotationDays: number;
  };
  inTransit: {
    required: boolean;
    minTlsVersion: string;
    allowedCiphers: string[];
  };
  fields: Array<{
    pattern: string;
    required: boolean;
    algorithm: string;
  }>;
}
/**
 * Requerimientos de auditoría
 */
export interface AuditRequirements {
  logAllAccess: boolean;
  logAllChanges: boolean;
  logFailedAttempts: boolean;
  retentionDays: number;
  immutable: boolean;
  encryption: boolean;
}
/**
 * Configuración de privacidad
 */
export interface PrivacySettings {
  dataMinimization: boolean;
  purposeLimitation: boolean;
  consentRequired: boolean;
  rightToErasure: boolean;
  dataPortability: boolean;
  anonymization: boolean;
}
/**
 * Interface para Database Encryption Manager
 */
export interface IDatabaseEncryption {
  enableTDE(config: TDEConfig): Promise<void>;
  disableTDE(database: string): Promise<void>;
  getTDEStatus(database: string): Promise<TDEConfig | null>;
  encryptColumn(table: string, column: string, algorithm?: string): Promise<void>;
  decryptColumn(table: string, column: string): Promise<void>;
  getColumnEncryptionStatus(table: string): Promise<ColumnEncryptionStatus[]>;
  rotateEncryptionKeys(database: string): Promise<void>;
  backupEncryptionKeys(location: string): Promise<void>;
  restoreEncryptionKeys(location: string): Promise<void>;
}
/**
 * Interface para SSL/TLS Manager
 */
export interface ITLSManager {
  configureTLS(config: TLSConfig): Promise<void>;
  getCertificate(domain: string): Promise<Certificate>;
  renewCertificate(domain: string): Promise<Certificate>;
  validateCertificate(cert: Certificate): Promise<boolean>;
  pinCertificate(domain: string, fingerprint: string): void;
  monitorExpiry(): Promise<Certificate[]>;
  configureHSTS(maxAge: number, includeSubdomains: boolean): void;
  getCipherSuites(): string[];
  testTLSConfiguration(): Promise<boolean>;
}
/**
 * Interface para Enhanced Audit Logger
 */
export interface IEnhancedAuditLogger {
  logSecurityEvent(event: SecurityEvent): Promise<void>;
  createAuditTrail(events: SecurityEvent[]): Promise<AuditTrail>;
  verifyTrailIntegrity(trailId: string): Promise<boolean>;
  searchEvents(criteria: any): Promise<SecurityEvent[]>;
  generateComplianceReport(standard: string): Promise<any>;
  exportAuditLogs(format: 'json' | 'csv' | 'pdf', dateRange: any): Promise<Buffer>;
  setRetentionPolicy(days: number): void;
  archiveOldLogs(destination: string): Promise<void>;
}
/**
 * Interface para ABAC Manager
 */
export interface IABACManager {
  createPolicy(policy: AccessPolicy): Promise<void>;
  updatePolicy(policyId: string, updates: Partial<AccessPolicy>): Promise<void>;
  deletePolicy(policyId: string): Promise<void>;
  evaluateAccess(context: AccessContext): Promise<AccessDecision>;
  getPolicies(filters?: any): Promise<AccessPolicy[]>;
  simulateAccess(context: AccessContext): Promise<AccessDecision[]>;
  auditPolicyUsage(policyId: string): Promise<any>;
}
/**
 * Interface para Security Procedures
 */
export interface ISecurityProcedures {
  reportIncident(incident: Omit<SecurityIncident, 'id'>): Promise<SecurityIncident>;
  updateIncident(incidentId: string, updates: Partial<SecurityIncident>): Promise<void>;
  executeIncidentResponse(incidentId: string): Promise<void>;
  scanVulnerabilities(scope: string[]): Promise<Vulnerability[]>;
  assessRisk(context: any): Promise<number>;
  runSecurityAudit(): Promise<any>;
  generateSecurityReport(): Promise<any>;
}
/**
 * Interface para Compliance Manager
 */
export interface IComplianceManager {
  configureCompliance(config: ComplianceConfig): Promise<void>;
  checkCompliance(standard: string): Promise<ComplianceStandard>;
  implementControl(controlId: string): Promise<void>;
  generateComplianceReport(standard: string): Promise<any>;
  handleDataSubjectRequest(type: string, userId: string): Promise<void>;
  anonymizeUserData(userId: string): Promise<void>;
  exportUserData(userId: string): Promise<any>;
  deleteUserData(userId: string): Promise<void>;
  auditDataProcessing(): Promise<any>;
}
/**
 * Interface para Security Monitor
 */
export interface ISecurityMonitor {
  startMonitoring(): void;
  stopMonitoring(): void;
  detectThreats(): Promise<SecurityIncident[]>;
  analyzeSecurityMetrics(): Promise<any>;
  generateSecurityDashboard(): Promise<any>;
  setAlertThresholds(thresholds: any): void;
  getSecurityScore(): Promise<number>;
  exportSecurityMetrics(format: string): Promise<Buffer>;
}
