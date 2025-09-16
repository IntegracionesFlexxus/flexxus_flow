/**
 * Advanced User Service - Sprint 3
 * Servicio avanzado para gestión de usuarios con caché y optimizaciones
 * Implementación con principios SOLID y Clean Code
 */

import { BaseService, PaginationParams, FilterParams, ApiError } from '@/shared/services/BaseService';
import type { User, Permission, Role, UserStatus } from '@modules/users/types';

/**
 * User creation data
 */
export interface CreateUserData {
  email: string;
  firstName: string;
  lastName: string;
  roleId: string;
  companyId: string;
  department?: string;
  position?: string;
  phone?: string;
  sendInvitation?: boolean;
}

/**
 * User update data
 */
export interface UpdateUserData {
  firstName?: string;
  lastName?: string;
  roleId?: string;
  status?: UserStatus;
  department?: string;
  position?: string;
  phone?: string;
  avatar?: string;
  preferences?: Record<string, any>;
}

/**
 * Bulk operation result
 */
export interface BulkOperationResult {
  success: string[];
  failed: Array<{
    id: string;
    error: string;
  }>;
  total: number;
}

/**
 * User activity
 */
export interface UserActivity {
  id: string;
  userId: string;
  action: string;
  resource: string;
  timestamp: Date;
  metadata?: Record<string, any>;
  ipAddress?: string;
  userAgent?: string;
}

/**
 * User session
 */
export interface UserSession {
  id: string;
  userId: string;
  startedAt: Date;
  lastActivityAt: Date;
  expiresAt: Date;
  ipAddress: string;
  userAgent: string;
  location?: string;
  isActive: boolean;
}

/**
 * User metrics
 */
export interface UserMetrics {
  totalLogins: number;
  lastLoginAt?: Date;
  totalActions: number;
  averageSessionDuration: number;
  deviceTypes: Record<string, number>;
  activityByDay: Array<{ date: string; count: number }>;
  mostUsedFeatures: Array<{ feature: string; count: number }>;
}

/**
 * User search filters
 */
export interface UserFilters extends FilterParams {
  roleIds?: string[];
  status?: UserStatus[];
  departments?: string[];
  hasPermissions?: string[];
  createdFrom?: Date;
  createdTo?: Date;
  lastActiveFrom?: Date;
  lastActiveTo?: Date;
  companyIds?: string[];
}

/**
 * AdvancedUserService
 * Principios aplicados:
 * - S: Responsabilidad única de gestión de usuarios
 * - O: Extensible con nuevas funcionalidades
 * - L: Sustituible por cualquier implementación de BaseService
 * - I: Interface segregada con métodos específicos
 * - D: Depende de abstracciones (BaseService)
 */
export class AdvancedUserService extends BaseService {
  private static instance: AdvancedUserService;
  
  private constructor() {
    super('/api/v1/users');
  }

  /**
   * Singleton pattern
   */
  public static getInstance(): AdvancedUserService {
    if (!AdvancedUserService.instance) {
      AdvancedUserService.instance = new AdvancedUserService();
    }
    return AdvancedUserService.instance;
  }

  // ==================== CRUD Operations ====================

  /**
   * Get users with advanced filtering
   */
  async getUsers(
    params?: PaginationParams & UserFilters,
    options = { cache: true, cacheTime: 60000 }
  ): Promise<{
    users: User[];
    total: number;
    page: number;
    totalPages: number;
  }> {
    const result = await this.getPaginated<User>('/list', params, options);
    return {
      users: result.items,
      total: result.total,
      page: result.page,
      totalPages: result.totalPages
    };
  }

  /**
   * Get user by ID with caching
   */
  async getUserById(
    userId: string,
    options = { cache: true, cacheTime: 300000 }
  ): Promise<User> {
    return this.get<User>(`/${userId}`, options);
  }

  /**
   * Get current user
   */
  async getCurrentUser(): Promise<User> {
    return this.get<User>('/me', { cache: true, cacheTime: 300000 });
  }

  /**
   * Create new user
   */
  async createUser(userData: CreateUserData): Promise<User> {
    const user = await this.post<User>('/', userData);
    
    // Clear user list cache
    this.clearCache();
    
    return user;
  }

  /**
   * Update user
   */
  async updateUser(userId: string, updates: UpdateUserData): Promise<User> {
    const user = await this.patch<User>(`/${userId}`, updates);
    
    // Clear specific user cache
    this.clearCache();
    
    return user;
  }

  /**
   * Delete user
   */
  async deleteUser(userId: string): Promise<void> {
    await this.delete(`/${userId}`);
    this.clearCache();
  }

  // ==================== Bulk Operations ====================

  /**
   * Create multiple users
   */
  async bulkCreateUsers(users: CreateUserData[]): Promise<BulkOperationResult> {
    return this.post<BulkOperationResult>('/bulk/create', { users });
  }

  /**
   * Update multiple users
   */
  async bulkUpdateUsers(
    userIds: string[],
    updates: UpdateUserData
  ): Promise<BulkOperationResult> {
    return this.patch<BulkOperationResult>('/bulk/update', {
      userIds,
      updates
    });
  }

  /**
   * Delete multiple users
   */
  async bulkDeleteUsers(userIds: string[]): Promise<BulkOperationResult> {
    return this.post<BulkOperationResult>('/bulk/delete', { userIds });
  }

  /**
   * Activate/Deactivate multiple users
   */
  async bulkSetStatus(
    userIds: string[],
    status: UserStatus
  ): Promise<BulkOperationResult> {
    return this.patch<BulkOperationResult>('/bulk/status', {
      userIds,
      status
    });
  }

  // ==================== Permission Management ====================

  /**
   * Get user permissions
   */
  async getUserPermissions(
    userId: string,
    options = { cache: true }
  ): Promise<Permission[]> {
    return this.get<Permission[]>(`/${userId}/permissions`, options);
  }

  /**
   * Update user permissions
   */
  async updateUserPermissions(
    userId: string,
    data: {
      roleId?: string;
      customPermissions?: string[];
      revokePermissions?: string[];
    }
  ): Promise<Permission[]> {
    const permissions = await this.patch<Permission[]>(
      `/${userId}/permissions`,
      data
    );
    
    this.clearCache();
    return permissions;
  }

  /**
   * Check if user has permission
   */
  async checkUserPermission(
    userId: string,
    permission: string,
    resource?: string
  ): Promise<boolean> {
    return this.get<boolean>(`/${userId}/permissions/check`, {
      params: { permission, resource },
      cache: true,
      cacheTime: 60000
    });
  }

  /**
   * Get effective permissions (role + custom)
   */
  async getEffectivePermissions(
    userId: string,
    companyId?: string
  ): Promise<{
    fromRole: Permission[];
    direct: Permission[];
    effective: Permission[];
  }> {
    return this.get(`/${userId}/permissions/effective`, {
      params: { companyId },
      cache: true
    });
  }

  // ==================== Activity & Sessions ====================

  /**
   * Get user activity log
   */
  async getUserActivity(
    userId: string,
    params?: PaginationParams & {
      action?: string;
      resource?: string;
      dateFrom?: Date;
      dateTo?: Date;
    }
  ): Promise<{
    activities: UserActivity[];
    total: number;
  }> {
    const result = await this.getPaginated<UserActivity>(
      `/${userId}/activity`,
      params
    );
    return {
      activities: result.items,
      total: result.total
    };
  }

  /**
   * Get user sessions
   */
  async getUserSessions(
    userId: string,
    onlyActive = false
  ): Promise<UserSession[]> {
    return this.get<UserSession[]>(`/${userId}/sessions`, {
      params: { active: onlyActive }
    });
  }

  /**
   * Terminate user session
   */
  async terminateSession(userId: string, sessionId: string): Promise<void> {
    await this.delete(`/${userId}/sessions/${sessionId}`);
  }

  /**
   * Terminate all user sessions
   */
  async terminateAllSessions(userId: string): Promise<void> {
    await this.delete(`/${userId}/sessions`);
  }

  // ==================== User Metrics ====================

  /**
   * Get user metrics
   */
  async getUserMetrics(
    userId: string,
    dateFrom?: Date,
    dateTo?: Date
  ): Promise<UserMetrics> {
    return this.get<UserMetrics>(`/${userId}/metrics`, {
      params: { dateFrom, dateTo },
      cache: true,
      cacheTime: 300000
    });
  }

  /**
   * Get aggregated metrics for multiple users
   */
  async getAggregatedMetrics(
    userIds: string[],
    dateFrom?: Date,
    dateTo?: Date
  ): Promise<Record<string, UserMetrics>> {
    return this.post<Record<string, UserMetrics>>('/metrics/aggregate', {
      userIds,
      dateFrom,
      dateTo
    });
  }

  // ==================== Company Management ====================

  /**
   * Get users by company
   */
  async getCompanyUsers(
    companyId: string,
    params?: PaginationParams & UserFilters
  ): Promise<{
    users: User[];
    total: number;
  }> {
    const result = await this.getPaginated<User>(
      `/company/${companyId}`,
      params,
      { cache: true }
    );
    return {
      users: result.items,
      total: result.total
    };
  }

  /**
   * Transfer user to another company
   */
  async transferUserToCompany(
    userId: string,
    targetCompanyId: string,
    keepCurrentAccess = false
  ): Promise<User> {
    return this.post<User>(`/${userId}/transfer`, {
      targetCompanyId,
      keepCurrentAccess
    });
  }

  /**
   * Add user to additional company
   */
  async addUserToCompany(
    userId: string,
    companyId: string,
    roleId: string
  ): Promise<User> {
    return this.post<User>(`/${userId}/companies`, {
      companyId,
      roleId
    });
  }

  /**
   * Remove user from company
   */
  async removeUserFromCompany(
    userId: string,
    companyId: string
  ): Promise<void> {
    await this.delete(`/${userId}/companies/${companyId}`);
  }

  // ==================== Import/Export ====================

  /**
   * Export users
   */
  async exportUsers(
    format: 'csv' | 'xlsx' | 'json',
    filters?: UserFilters
  ): Promise<void> {
    await this.downloadFile(
      `/export?format=${format}${this.buildQueryString(filters || {})}`,
      `users.${format}`
    );
  }

  /**
   * Import users from file
   */
  async importUsers(
    file: File,
    options?: {
      updateExisting?: boolean;
      sendInvitations?: boolean;
      defaultRoleId?: string;
      validateOnly?: boolean;
    }
  ): Promise<{
    imported: number;
    updated: number;
    failed: number;
    errors?: Array<{ row: number; error: string }>;
  }> {
    return this.uploadFile('/import', file, options);
  }

  /**
   * Get import template
   */
  async getImportTemplate(format: 'csv' | 'xlsx'): Promise<void> {
    await this.downloadFile(`/import/template?format=${format}`, `user_import_template.${format}`);
  }

  // ==================== Search & Suggestions ====================

  /**
   * Search users with autocomplete
   */
  async searchUsers(
    query: string,
    limit = 10,
    includeInactive = false
  ): Promise<User[]> {
    return this.get<User[]>('/search', {
      params: { q: query, limit, includeInactive },
      cache: true,
      cacheTime: 30000
    });
  }

  /**
   * Get user suggestions based on context
   */
  async getUserSuggestions(
    context: 'assign' | 'mention' | 'share',
    excludeIds?: string[]
  ): Promise<User[]> {
    return this.get<User[]>('/suggestions', {
      params: { context, excludeIds },
      cache: true
    });
  }

  // ==================== Preferences & Settings ====================

  /**
   * Get user preferences
   */
  async getUserPreferences(userId: string): Promise<Record<string, any>> {
    return this.get<Record<string, any>>(`/${userId}/preferences`, {
      cache: true
    });
  }

  /**
   * Update user preferences
   */
  async updateUserPreferences(
    userId: string,
    preferences: Record<string, any>
  ): Promise<Record<string, any>> {
    const updated = await this.patch<Record<string, any>>(
      `/${userId}/preferences`,
      preferences
    );
    this.clearCache();
    return updated;
  }

  /**
   * Reset user preferences
   */
  async resetUserPreferences(userId: string): Promise<void> {
    await this.delete(`/${userId}/preferences`);
    this.clearCache();
  }

  // ==================== Validation & Availability ====================

  /**
   * Check if email is available
   */
  async checkEmailAvailability(
    email: string,
    excludeUserId?: string
  ): Promise<boolean> {
    return this.get<boolean>('/check/email', {
      params: { email, excludeUserId }
    });
  }

  /**
   * Validate user data
   */
  async validateUserData(userData: Partial<CreateUserData>): Promise<{
    valid: boolean;
    errors?: Record<string, string>;
  }> {
    return this.post('/validate', userData);
  }

  // ==================== Utility Methods ====================

  /**
   * Get user avatar URL
   */
  getUserAvatarUrl(user: User, size: 'small' | 'medium' | 'large' = 'medium'): string {
    if (user.avatar) {
      return user.avatar;
    }
    
    const sizeMap = {
      small: 32,
      medium: 64,
      large: 128
    };
    
    const initials = `${user.firstName.charAt(0)}${user.lastName.charAt(0)}`;
    return `https://ui-avatars.com/api/?name=${initials}&size=${sizeMap[size]}&background=random`;
  }

  /**
   * Get user display name
   */
  getUserDisplayName(user: User, format: 'full' | 'short' | 'email' = 'full'): string {
    switch (format) {
      case 'short':
        const firstNameShort = user.firstName || '';
        const lastNameShort = user.lastName || '';
        return lastNameShort ? `${firstNameShort} ${lastNameShort.charAt(0)}.` : firstNameShort || user.email;
      case 'email':
        return user.email;
      default:
        const firstName = user.firstName || '';
        const lastName = user.lastName || '';
        return `${firstName} ${lastName}`.trim() || user.email;
    }
  }

  /**
   * Clear all user-related cache
   */
  clearUserCache(): void {
    this.clearCache();
  }
}

// Export singleton instance
export const advancedUserService = AdvancedUserService.getInstance();