/**
 * Company Types - Sprint 3
 * Definición de tipos para configuración de empresa
 * Siguiendo principio de responsabilidad única y segregación de interfaces
 */

// Información básica de la empresa
export interface Company {
  id: string;
  name: string;
  legalName?: string;
  industry?: string;
  size?: CompanySize;
  taxId?: string;
  website?: string;
  email: string;
  phone?: string;
  address?: Address;
  logo?: string;
  favicon?: string;
  status: CompanyStatus;
  createdAt: Date;
  updatedAt: Date;
}

export interface Address {
  street?: string;
  city?: string;
  state?: string;
  country: string;
  postalCode?: string;
}

export enum CompanySize {
  STARTUP = '1-10',
  SMALL = '11-50',
  MEDIUM = '51-200',
  LARGE = '201-1000',
  ENTERPRISE = '1000+'
}

export enum CompanyStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  SUSPENDED = 'suspended',
  TRIAL = 'trial'
}

// Configuración de seguridad
export interface SecuritySettings {
  passwordPolicy: PasswordPolicy;
  sessionSettings: SessionSettings;
  mfaSettings: MFASettings;
  invitationSettings: InvitationSettings;
  ipRestrictions?: IPRestrictions;
}

export interface PasswordPolicy {
  minLength: number;
  maxLength: number;
  requireUppercase: boolean;
  requireLowercase: boolean;
  requireNumbers: boolean;
  requireSymbols: boolean;
  expirationDays?: number;
  preventReuse: number;
  preventCommonPasswords: boolean;
}

export interface SessionSettings {
  maxConcurrentSessions: number;
  sessionTimeout: number; // minutos
  idleTimeout: number; // minutos
  rememberMeDuration: number; // días
  requireReauthForSensitive: boolean;
}

export interface MFASettings {
  required: boolean;
  requiredForRoles?: string[];
  methods: MFAMethod[];
  gracePeriodDays?: number;
}

export enum MFAMethod {
  TOTP = 'totp',
  SMS = 'sms',
  EMAIL = 'email',
  BACKUP_CODES = 'backup_codes'
}

export interface InvitationSettings {
  defaultExpirationDays: number;
  maxInvitationsPerDay?: number;
  requireDomainMatch: boolean;
  allowedDomains?: string[];
  autoApprove: boolean;
  requireManagerApproval?: boolean;
}

export interface IPRestrictions {
  enabled: boolean;
  whitelist?: string[];
  blacklist?: string[];
  requireVPN?: boolean;
}

// Configuración de notificaciones
export interface NotificationSettings {
  systemNotifications: SystemNotifications;
  emailNotifications: EmailNotifications;
  pushNotifications?: PushNotifications;
  webhooks?: WebhookSettings[];
}

export interface SystemNotifications {
  newUsers: boolean;
  permissionChanges: boolean;
  failedLoginAttempts: boolean;
  configurationChanges: boolean;
  securityAlerts: boolean;
  systemMaintenance: boolean;
}

export interface EmailNotifications {
  enabled: boolean;
  weeklyReports: boolean;
  monthlyReports: boolean;
  securityAlerts: boolean;
  maintenanceNotices: boolean;
  productUpdates: boolean;
  defaultSender: string;
  emailSignature?: string;
  replyTo?: string;
}

export interface PushNotifications {
  enabled: boolean;
  criticalOnly: boolean;
  allowUserOptOut: boolean;
}

export interface WebhookSettings {
  id?: string;
  name: string;
  url: string;
  secret?: string;
  events: string[];
  active: boolean;
  retryPolicy?: {
    maxRetries: number;
    retryDelay: number;
  };
}

// Configuración de branding y personalización
export interface BrandingSettings {
  colors: ColorScheme;
  typography?: Typography;
  logos: LogoSettings;
  emailBranding: EmailBranding;
  customCSS?: string;
  favicon?: string;
}

export interface ColorScheme {
  primary: string;
  secondary: string;
  accent?: string;
  error?: string;
  warning?: string;
  info?: string;
  success?: string;
  background?: string;
  surface?: string;
  text?: {
    primary: string;
    secondary: string;
    disabled?: string;
  };
}

export interface Typography {
  fontFamily?: string;
  fontSize?: {
    small: number;
    medium: number;
    large: number;
  };
  fontWeight?: {
    light: number;
    regular: number;
    medium: number;
    bold: number;
  };
}

export interface LogoSettings {
  light: string;
  dark?: string;
  compact?: string;
  favicon?: string;
  emailLogo?: string;
}

export interface EmailBranding {
  headerColor: string;
  footerColor: string;
  buttonColor: string;
  logo?: string;
  footer?: string;
  socialLinks?: SocialLink[];
}

export interface SocialLink {
  platform: string;
  url: string;
  icon?: string;
}

// Configuración de features y límites
export interface FeatureSettings {
  enabledModules: string[];
  customFeatures?: Record<string, boolean>;
  limits: UsageLimits;
  integrations?: IntegrationSettings[];
}

export interface UsageLimits {
  maxUsers?: number;
  maxStorageGB?: number;
  maxApiCallsPerMonth?: number;
  maxProjects?: number;
  maxTeams?: number;
}

export interface IntegrationSettings {
  id: string;
  name: string;
  provider: string;
  enabled: boolean;
  config?: Record<string, any>;
  credentials?: {
    apiKey?: string;
    clientId?: string;
    clientSecret?: string;
  };
}

// Preferencias de la empresa
export interface CompanyPreferences {
  locale: string;
  timezone: string;
  dateFormat: string;
  timeFormat: '12h' | '24h';
  currency: string;
  firstDayOfWeek: number;
  workingDays: number[];
  workingHours?: {
    start: string;
    end: string;
  };
}

// DTOs para actualizaciones
export interface UpdateCompanyRequest {
  name?: string;
  legalName?: string;
  industry?: string;
  size?: CompanySize;
  taxId?: string;
  website?: string;
  email?: string;
  phone?: string;
  address?: Address;
}

export interface UpdateSecuritySettingsRequest {
  passwordPolicy?: Partial<PasswordPolicy>;
  sessionSettings?: Partial<SessionSettings>;
  mfaSettings?: Partial<MFASettings>;
  invitationSettings?: Partial<InvitationSettings>;
  ipRestrictions?: Partial<IPRestrictions>;
}

export interface UpdateBrandingRequest {
  colors?: Partial<ColorScheme>;
  typography?: Partial<Typography>;
  logos?: Partial<LogoSettings>;
  emailBranding?: Partial<EmailBranding>;
  customCSS?: string;
}

export interface UpdateNotificationSettingsRequest {
  systemNotifications?: Partial<SystemNotifications>;
  emailNotifications?: Partial<EmailNotifications>;
  pushNotifications?: Partial<PushNotifications>;
  webhooks?: WebhookSettings[];
}

// Respuestas del servicio
export interface CompanySettingsResponse {
  company: Company;
  security: SecuritySettings;
  notifications: NotificationSettings;
  branding: BrandingSettings;
  features: FeatureSettings;
  preferences: CompanyPreferences;
}

// Estados de formulario
export interface CompanySettingsFormState {
  isLoading: boolean;
  isSaving: boolean;
  error: string | null;
  success: boolean;
  validationErrors: Record<string, string>;
  hasChanges: boolean;
}