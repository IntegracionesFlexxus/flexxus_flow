/**
 * CompanyService - Sprint 3
 * Servicio avanzado para gestión de empresas
 * Implementación con principios SOLID y Clean Code
 */

import { BaseService, PaginationParams, FilterParams, ApiError } from '@/shared/services/BaseService';
import type { User } from '@/modules/users/types';

/**
 * Company types
 */
export type CompanyStatus = 'active' | 'inactive' | 'suspended' | 'pending';
export type CompanyPlan = 'free' | 'starter' | 'professional' | 'enterprise';
export type IndustryType = 'technology' | 'finance' | 'healthcare' | 'education' | 'retail' | 'manufacturing' | 'other';

/**
 * Company interface
 */
export interface Company {
  id: string;
  name: string;
  legalName?: string;
  taxId: string;
  status: CompanyStatus;
  plan: CompanyPlan;
  industry: IndustryType;
  size: string;
  website?: string;
  email: string;
  phone: string;
  address: CompanyAddress;
  logo?: string;
  settings: CompanySettings;
  billing?: BillingInfo;
  subscription?: Subscription;
  metadata?: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
  ownerId: string;
  owner?: User;
  employeeCount: number;
  activeUsers: number;
  maxUsers: number;
}

/**
 * Company address
 */
export interface CompanyAddress {
  street: string;
  city: string;
  state: string;
  country: string;
  postalCode: string;
  coordinates?: {
    latitude: number;
    longitude: number;
  };
}

/**
 * Company settings
 */
export interface CompanySettings {
  general: GeneralSettings;
  security: SecuritySettings;
  notifications: NotificationSettings;
  branding: BrandingSettings;
  features: FeatureSettings;
  integrations: IntegrationSettings;
}

/**
 * General settings
 */
export interface GeneralSettings {
  language: string;
  timezone: string;
  dateFormat: string;
  timeFormat: '12h' | '24h';
  currency: string;
  fiscalYearStart: string;
  workingDays: number[];
  workingHours: {
    start: string;
    end: string;
  };
}

/**
 * Security settings
 */
export interface SecuritySettings {
  requireMfa: boolean;
  passwordPolicy: {
    minLength: number;
    requireUppercase: boolean;
    requireLowercase: boolean;
    requireNumbers: boolean;
    requireSpecialChars: boolean;
    expirationDays: number;
    preventReuse: number;
  };
  sessionTimeout: number;
  ipWhitelist: string[];
  allowedDomains: string[];
  ssoEnabled: boolean;
  ssoProvider?: string;
  dataRetentionDays: number;
}

/**
 * Notification settings
 */
export interface NotificationSettings {
  emailNotifications: boolean;
  smsNotifications: boolean;
  pushNotifications: boolean;
  adminEmail: string;
  billingEmail: string;
  supportEmail: string;
  weeklyReports: boolean;
  monthlyReports: boolean;
}

/**
 * Branding settings
 */
export interface BrandingSettings {
  primaryColor: string;
  secondaryColor: string;
  logo?: string;
  favicon?: string;
  emailLogo?: string;
  loginBackground?: string;
  customCss?: string;
}

/**
 * Feature settings
 */
export interface FeatureSettings {
  modules: Record<string, boolean>;
  apiAccess: boolean;
  customFields: boolean;
  advancedReporting: boolean;
  multiLanguage: boolean;
  audit: boolean;
}

/**
 * Integration settings
 */
export interface IntegrationSettings {
  slack?: {
    enabled: boolean;
    webhookUrl: string;
    channels: string[];
  };
  teams?: {
    enabled: boolean;
    webhookUrl: string;
  };
  google?: {
    enabled: boolean;
    clientId: string;
  };
  azure?: {
    enabled: boolean;
    tenantId: string;
  };
}

/**
 * Billing information
 */
export interface BillingInfo {
  method: 'card' | 'invoice' | 'bank_transfer';
  cardLast4?: string;
  cardBrand?: string;
  billingEmail: string;
  billingAddress: CompanyAddress;
  taxExempt: boolean;
  taxExemptId?: string;
}

/**
 * Subscription
 */
export interface Subscription {
  id: string;
  plan: CompanyPlan;
  status: 'active' | 'canceled' | 'past_due' | 'trialing';
  currentPeriodStart: Date;
  currentPeriodEnd: Date;
  cancelAtPeriodEnd: boolean;
  trialEnd?: Date;
  seats: number;
  monthlyPrice: number;
  yearlyPrice: number;
  billingCycle: 'monthly' | 'yearly';
  features: string[];
  usage: {
    users: number;
    storage: number;
    apiCalls: number;
  };
  limits: {
    users: number;
    storage: number;
    apiCalls: number;
  };
}

/**
 * Company statistics
 */
export interface CompanyStats {
  totalUsers: number;
  activeUsers: number;
  totalProjects: number;
  activeProjects: number;
  totalStorage: number;
  usedStorage: number;
  apiCallsThisMonth: number;
  lastActivity: Date;
  growthRate: number;
  churnRate: number;
  revenue: {
    mrr: number;
    arr: number;
    ltv: number;
  };
}

/**
 * Company activity
 */
export interface CompanyActivity {
  id: string;
  companyId: string;
  userId: string;
  user?: User;
  action: string;
  resource: string;
  resourceId?: string;
  details?: string;
  ipAddress?: string;
  userAgent?: string;
  timestamp: Date;
}

/**
 * Company invitation
 */
export interface CompanyInvitation {
  id: string;
  companyId: string;
  email: string;
  roleId: string;
  invitedBy: string;
  invitedAt: Date;
  expiresAt: Date;
  acceptedAt?: Date;
  status: 'pending' | 'accepted' | 'expired' | 'canceled';
  token: string;
}

/**
 * Company filters
 */
export interface CompanyFilters extends FilterParams {
  status?: CompanyStatus[];
  plan?: CompanyPlan[];
  industry?: IndustryType[];
  size?: string[];
  hasActiveSubscription?: boolean;
  createdFrom?: Date;
  createdTo?: Date;
}

/**
 * Company creation data
 */
export interface CreateCompanyData {
  name: string;
  legalName?: string;
  taxId: string;
  industry: IndustryType;
  size: string;
  website?: string;
  email: string;
  phone: string;
  address: CompanyAddress;
  settings?: Partial<CompanySettings>;
}

/**
 * Company update data
 */
export interface UpdateCompanyData {
  name?: string;
  legalName?: string;
  taxId?: string;
  industry?: IndustryType;
  size?: string;
  website?: string;
  email?: string;
  phone?: string;
  address?: Partial<CompanyAddress>;
  logo?: string;
  settings?: Partial<CompanySettings>;
}

/**
 * CompanyService
 * Principios aplicados:
 * - S: Responsabilidad única de gestión de empresas
 * - O: Extensible con nuevas funcionalidades
 * - L: Sustituible por cualquier implementación de BaseService
 * - I: Interface segregada con métodos específicos
 * - D: Depende de abstracciones (BaseService)
 */
export class CompanyService extends BaseService {
  private static instance: CompanyService;
  
  private constructor() {
    super('/api/v1/companies');
  }

  /**
   * Singleton pattern
   */
  public static getInstance(): CompanyService {
    if (!CompanyService.instance) {
      CompanyService.instance = new CompanyService();
    }
    return CompanyService.instance;
  }

  // ==================== CRUD Operations ====================

  /**
   * Get companies with filtering
   */
  async getCompanies(
    params?: PaginationParams & CompanyFilters,
    options = { cache: true, cacheTime: 60000 }
  ): Promise<{
    companies: Company[];
    total: number;
    page: number;
    totalPages: number;
  }> {
    const result = await this.getPaginated<Company>('/list', params, options);
    return {
      companies: result.items,
      total: result.total,
      page: result.page,
      totalPages: result.totalPages
    };
  }

  /**
   * Get company by ID
   */
  async getCompanyById(
    companyId: string,
    options = { cache: true, cacheTime: 300000 }
  ): Promise<Company> {
    return this.get<Company>(`/${companyId}`, options);
  }

  /**
   * Get current company
   */
  async getCurrentCompany(): Promise<Company> {
    return this.get<Company>('/current', { cache: true, cacheTime: 300000 });
  }

  /**
   * Create new company
   */
  async createCompany(data: CreateCompanyData): Promise<Company> {
    const company = await this.post<Company>('/', data);
    this.clearCache();
    return company;
  }

  /**
   * Update company
   */
  async updateCompany(companyId: string, updates: UpdateCompanyData): Promise<Company> {
    const company = await this.patch<Company>(`/${companyId}`, updates);
    this.clearCache();
    return company;
  }

  /**
   * Delete company
   */
  async deleteCompany(companyId: string): Promise<void> {
    await this.delete(`/${companyId}`);
    this.clearCache();
  }

  // ==================== Settings Management ====================

  /**
   * Get company settings
   */
  async getSettings(companyId: string): Promise<CompanySettings> {
    return this.get<CompanySettings>(`/${companyId}/settings`, {
      cache: true,
      cacheTime: 300000
    });
  }

  /**
   * Update company settings
   */
  async updateSettings(
    companyId: string,
    settings: Partial<CompanySettings>
  ): Promise<CompanySettings> {
    const updated = await this.patch<CompanySettings>(`/${companyId}/settings`, settings);
    this.clearCache();
    return updated;
  }

  /**
   * Update specific setting category
   */
  async updateSettingCategory<K extends keyof CompanySettings>(
    companyId: string,
    category: K,
    settings: Partial<CompanySettings[K]>
  ): Promise<CompanySettings[K]> {
    const updated = await this.patch<CompanySettings[K]>(
      `/${companyId}/settings/${category}`,
      settings
    );
    this.clearCache();
    return updated;
  }

  /**
   * Reset settings to default
   */
  async resetSettings(companyId: string): Promise<CompanySettings> {
    const settings = await this.post<CompanySettings>(`/${companyId}/settings/reset`);
    this.clearCache();
    return settings;
  }

  // ==================== User Management ====================

  /**
   * Get company users
   */
  async getCompanyUsers(
    companyId: string,
    params?: PaginationParams & FilterParams
  ): Promise<{
    users: User[];
    total: number;
  }> {
    const result = await this.getPaginated<User>(
      `/${companyId}/users`,
      params,
      { cache: true }
    );
    return {
      users: result.items,
      total: result.total
    };
  }

  /**
   * Add user to company
   */
  async addUser(
    companyId: string,
    data: {
      userId?: string;
      email?: string;
      roleId: string;
      sendInvitation?: boolean;
    }
  ): Promise<User> {
    return this.post<User>(`/${companyId}/users`, data);
  }

  /**
   * Remove user from company
   */
  async removeUser(companyId: string, userId: string): Promise<void> {
    await this.delete(`/${companyId}/users/${userId}`);
  }

  /**
   * Update user role in company
   */
  async updateUserRole(
    companyId: string,
    userId: string,
    roleId: string
  ): Promise<User> {
    return this.patch<User>(`/${companyId}/users/${userId}`, { roleId });
  }

  // ==================== Invitations ====================

  /**
   * Get company invitations
   */
  async getInvitations(
    companyId: string,
    status?: 'pending' | 'accepted' | 'expired'
  ): Promise<CompanyInvitation[]> {
    return this.get<CompanyInvitation[]>(`/${companyId}/invitations`, {
      params: { status },
      cache: true
    });
  }

  /**
   * Send invitation
   */
  async sendInvitation(
    companyId: string,
    data: {
      email: string;
      roleId: string;
      message?: string;
    }
  ): Promise<CompanyInvitation> {
    return this.post<CompanyInvitation>(`/${companyId}/invitations`, data);
  }

  /**
   * Send bulk invitations
   */
  async sendBulkInvitations(
    companyId: string,
    invitations: Array<{
      email: string;
      roleId: string;
    }>
  ): Promise<{
    sent: CompanyInvitation[];
    failed: Array<{ email: string; error: string }>;
  }> {
    return this.post(`/${companyId}/invitations/bulk`, { invitations });
  }

  /**
   * Cancel invitation
   */
  async cancelInvitation(companyId: string, invitationId: string): Promise<void> {
    await this.delete(`/${companyId}/invitations/${invitationId}`);
  }

  /**
   * Resend invitation
   */
  async resendInvitation(companyId: string, invitationId: string): Promise<CompanyInvitation> {
    return this.post<CompanyInvitation>(`/${companyId}/invitations/${invitationId}/resend`);
  }

  // ==================== Subscription & Billing ====================

  /**
   * Get subscription details
   */
  async getSubscription(companyId: string): Promise<Subscription> {
    return this.get<Subscription>(`/${companyId}/subscription`, {
      cache: true,
      cacheTime: 300000
    });
  }

  /**
   * Update subscription
   */
  async updateSubscription(
    companyId: string,
    data: {
      plan?: CompanyPlan;
      seats?: number;
      billingCycle?: 'monthly' | 'yearly';
    }
  ): Promise<Subscription> {
    return this.patch<Subscription>(`/${companyId}/subscription`, data);
  }

  /**
   * Cancel subscription
   */
  async cancelSubscription(
    companyId: string,
    immediate = false
  ): Promise<void> {
    await this.post(`/${companyId}/subscription/cancel`, { immediate });
  }

  /**
   * Get billing information
   */
  async getBillingInfo(companyId: string): Promise<BillingInfo> {
    return this.get<BillingInfo>(`/${companyId}/billing`);
  }

  /**
   * Update billing information
   */
  async updateBillingInfo(
    companyId: string,
    billing: Partial<BillingInfo>
  ): Promise<BillingInfo> {
    return this.patch<BillingInfo>(`/${companyId}/billing`, billing);
  }

  /**
   * Get invoices
   */
  async getInvoices(
    companyId: string,
    params?: PaginationParams & {
      status?: 'paid' | 'pending' | 'overdue';
      dateFrom?: Date;
      dateTo?: Date;
    }
  ): Promise<{
    invoices: any[];
    total: number;
  }> {
    const result = await this.getPaginated(`/${companyId}/invoices`, params);
    return {
      invoices: result.items,
      total: result.total
    };
  }

  /**
   * Download invoice
   */
  async downloadInvoice(companyId: string, invoiceId: string): Promise<void> {
    await this.downloadFile(`/${companyId}/invoices/${invoiceId}/download`, `invoice_${invoiceId}.pdf`);
  }

  // ==================== Statistics & Analytics ====================

  /**
   * Get company statistics
   */
  async getStatistics(
    companyId: string,
    dateFrom?: Date,
    dateTo?: Date
  ): Promise<CompanyStats> {
    return this.get<CompanyStats>(`/${companyId}/stats`, {
      params: { dateFrom, dateTo },
      cache: true,
      cacheTime: 300000
    });
  }

  /**
   * Get activity log
   */
  async getActivityLog(
    companyId: string,
    params?: PaginationParams & {
      userId?: string;
      action?: string;
      resource?: string;
      dateFrom?: Date;
      dateTo?: Date;
    }
  ): Promise<{
    activities: CompanyActivity[];
    total: number;
  }> {
    const result = await this.getPaginated<CompanyActivity>(
      `/${companyId}/activity`,
      params
    );
    return {
      activities: result.items,
      total: result.total
    };
  }

  /**
   * Get usage report
   */
  async getUsageReport(
    companyId: string,
    month: string
  ): Promise<{
    users: number;
    storage: number;
    apiCalls: number;
    bandwidth: number;
    cost: number;
  }> {
    return this.get(`/${companyId}/usage/${month}`, {
      cache: true,
      cacheTime: 3600000
    });
  }

  // ==================== Branding & Customization ====================

  /**
   * Upload company logo
   */
  async uploadLogo(companyId: string, file: File): Promise<string> {
    const result = await this.uploadFile(`/${companyId}/logo`, file);
    this.clearCache();
    return result.url;
  }

  /**
   * Upload branding asset
   */
  async uploadBrandingAsset(
    companyId: string,
    type: 'favicon' | 'emailLogo' | 'loginBackground',
    file: File
  ): Promise<string> {
    const result = await this.uploadFile(`/${companyId}/branding/${type}`, file);
    this.clearCache();
    return result.url;
  }

  /**
   * Get branding assets
   */
  async getBrandingAssets(companyId: string): Promise<BrandingSettings> {
    return this.get<BrandingSettings>(`/${companyId}/branding`, {
      cache: true,
      cacheTime: 3600000
    });
  }

  // ==================== Import/Export ====================

  /**
   * Export company data
   */
  async exportData(
    companyId: string,
    format: 'json' | 'csv' | 'pdf',
    options?: {
      includeUsers?: boolean;
      includeSettings?: boolean;
      includeActivity?: boolean;
    }
  ): Promise<void> {
    await this.downloadFile(
      `/${companyId}/export?format=${format}${this.buildQueryString(options || {})}`,
      `company_${companyId}_export.${format}`
    );
  }

  /**
   * Import company data
   */
  async importData(
    companyId: string,
    file: File,
    options?: {
      overwrite?: boolean;
      validateOnly?: boolean;
    }
  ): Promise<{
    imported: number;
    errors?: Array<{ line: number; error: string }>;
  }> {
    return this.uploadFile(`/${companyId}/import`, file, options);
  }

  // ==================== Utility Methods ====================

  /**
   * Verify company domain
   */
  async verifyDomain(companyId: string, domain: string): Promise<{
    verified: boolean;
    dnsRecords?: Array<{
      type: string;
      name: string;
      value: string;
    }>;
  }> {
    return this.post(`/${companyId}/verify-domain`, { domain });
  }

  /**
   * Check company name availability
   */
  async checkNameAvailability(name: string): Promise<boolean> {
    const result = await this.get<{ available: boolean }>('/check-name', {
      params: { name }
    });
    return result.available;
  }

  /**
   * Get company onboarding status
   */
  async getOnboardingStatus(companyId: string): Promise<{
    completed: boolean;
    steps: Array<{
      id: string;
      name: string;
      completed: boolean;
      required: boolean;
    }>;
    progress: number;
  }> {
    return this.get(`/${companyId}/onboarding`, {
      cache: true
    });
  }

  /**
   * Complete onboarding step
   */
  async completeOnboardingStep(companyId: string, stepId: string): Promise<void> {
    await this.post(`/${companyId}/onboarding/${stepId}/complete`);
    this.clearCache();
  }

  /**
   * Clear company cache
   */
  clearCompanyCache(): void {
    this.clearCache();
  }
}

// Export singleton instance
export const companyService = CompanyService.getInstance();