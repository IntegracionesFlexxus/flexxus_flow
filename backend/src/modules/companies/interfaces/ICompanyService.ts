/**
 * Company Service Interface - Sprint 2
 * Siguiendo lineamientos nivel 2: inversión de dependencias para CompanyController
 */
export interface ICompanyService {
  /**
   * Get company by ID
   */
  getCompanyById(companyId: string): Promise<{
    id: string;
    name: string;
    description?: string;
    plan: string;
    website?: string;
    phone?: string;
    address?: string;
    features: string[];
    settings: any;
    isActive: boolean;
    createdAt: Date;
    updatedAt: Date;
  } | null>;
  /**
   * Update company information
   */
  updateCompany(companyId: string, data: {
    name?: string;
    description?: string;
    plan?: string;
    website?: string;
    phone?: string;
    address?: string;
    isActive?: boolean;
    features?: string[];
  }): Promise<{
    id: string;
    name: string;
    description?: string;
    plan: string;
    website?: string;
    phone?: string;
    address?: string;
    features: string[];
    updatedAt: Date;
  } | null>;
  /**
   * Update company settings
   */
  updateCompanySettings(companyId: string, settings: {
    timezone?: string;
    currency?: string;
    language?: string;
    dateFormat?: string;
    timeFormat?: string;
    emailNotifications?: boolean;
    smsNotifications?: boolean;
    twoFactorRequired?: boolean;
    sessionTimeoutEnabled?: boolean;
    sessionTimeoutDuration?: string;
  }): Promise<any>;
  /**
   * Get company statistics
   */
  getCompanyStats(companyId: string): Promise<{
    totalUsers: number;
    activeUsers: number;
    totalSessions: number;
    storageUsed: number;
    planLimits: {
      maxUsers: number;
      maxStorage: number;
      features: string[];
    };
  }>;
  /**
   * Get company users with pagination
   */
  getCompanyUsers(companyId: string, options?: {
    page?: number;
    limit?: number;
    role?: string;
    isActive?: boolean;
  }): Promise<{
    users: Array<{
      id: string;
      email: string;
      firstName: string;
      lastName: string;
      role: string;
      avatar?: string;
      isActive: boolean;
      lastLoginAt?: Date;
      createdAt: Date;
    }>;
    total: number;
  }>;
  /**
   * Get user by email in company
   */
  getUserByEmailInCompany(email: string, companyId: string): Promise<{
    id: string;
    email: string;
    role: string;
  } | null>;
  /**
   * Invite user to company
   */
  inviteUser(companyId: string, data: {
    email: string;
    role: string;
    firstName?: string;
    lastName?: string;
    message?: string;
    invitedBy: string;
  }): Promise<{
    id: string;
    email: string;
    role: string;
    status: string;
    expiresAt: Date;
    createdAt: Date;
  }>;
  /**
   * Get company invitations
   */
  getCompanyInvitations(companyId: string, options?: {
    status?: string;
  }): Promise<Array<{
    id: string;
    email: string;
    role: string;
    firstName?: string;
    lastName?: string;
    status: string;
    message?: string;
    invitedBy: string;
    expiresAt: Date;
    createdAt: Date;
    acceptedAt?: Date;
  }>>;
  /**
   * Revoke invitation
   */
  revokeInvitation(invitationId: string, companyId: string): Promise<boolean>;
  /**
   * Get usage statistics
   */
  getUsageStats(companyId: string, period: string): Promise<{
    totalRequests: number;
    totalUsers: number;
    activeUsers: number;
    storageUsed: number;
    bandwidthUsed: number;
    planLimits: {
      maxUsers: number;
      maxStorage: number;
      maxBandwidth: number;
      features: string[];
    };
    breakdown: {
      requests: Array<{ date: string; count: number }>;
      users: Array<{ date: string; count: number }>;
      storage: Array<{ date: string; size: number }>;
    };
  }>;
  /**
   * Upgrade company plan
   */
  upgradePlan(companyId: string, data: {
    newPlan: string;
    paymentMethod?: string;
    annualBilling?: boolean;
    upgradedBy: string;
  }): Promise<{
    newPlan: string;
    previousPlan: string;
    effectiveDate: Date;
    newFeatures: string[];
  }>;
  /**
   * Create company
   */
  createCompany(data: {
    name: string;
    description?: string;
    plan: string;
    website?: string;
    phone?: string;
    address?: string;
    ownerId: string;
  }): Promise<{
    id: string;
    name: string;
    plan: string;
    createdAt: Date;
  }>;
  /**
   * Delete company (soft delete)
   */
  deleteCompany(companyId: string): Promise<boolean>;
  /**
   * Get companies for user
   */
  getUserCompanies(userId: string): Promise<Array<{
    id: string;
    name: string;
    plan: string;
    role: string;
    isActive: boolean;
  }>>;
}
