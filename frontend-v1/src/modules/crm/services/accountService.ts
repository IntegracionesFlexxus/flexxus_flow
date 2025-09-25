/**
 * Account Service - Sprint 15 & 17
 * API integration for account management with advanced features
 */

import { api } from '@/shared/services/api';
import type {
  Account,
  AccountFilters,
  AccountMetrics,
  AccountHierarchy,
  AccountFormData,
  // Sprint 17 types
  AccountHealthScore,
  HealthHistory,
  HealthAlert,
  BulkHealthCalculationRequest,
  BulkHealthCalculationResult,
  HierarchyNode,
  HierarchyDirection,
  HierarchyMetrics,
  CreateHierarchyDto,
  Territory,
  TerritoryAssignment
} from '../types';

class AccountService {
  private readonly basePath = '/crm/accounts';

  /**
   * Get accounts with filters and pagination
   */
  async getAccounts(filters?: AccountFilters): Promise<{ data: Account[]; total: number; page: number; totalPages: number }> {
    const { data } = await api.get(this.basePath, { params: filters });
    return data;
  }

  /**
   * Get single account by ID
   */
  async getAccountById(id: number): Promise<Account> {
    const { data } = await api.get(`${this.basePath}/${id}`);
    return data.data;
  }

  /**
   * Create new account
   */
  async createAccount(account: AccountFormData): Promise<Account> {
    console.log('=== accountService.createAccount ===');
    console.log('URL:', this.basePath);
    console.log('Datos a enviar:', account);
    console.log('Campos requeridos:');
    console.log('  - name:', account.name);
    console.log('  - company_id:', account.company_id, 'tipo:', typeof account.company_id);
    console.log('  - owner_id:', account.owner_id, 'tipo:', typeof account.owner_id);

    try {
      const { data } = await api.post(this.basePath, account);
      console.log('Respuesta exitosa:', data);
      return data.data;
    } catch (error: any) {
      console.error('=== ERROR EN createAccount ===');
      console.error('Error completo:', error);
      console.error('Response:', error.response);
      console.error('Response data:', error.response?.data);
      console.error('Validation errors:', error.response?.data?.errors);
      if (error.response?.data?.errors) {
        error.response.data.errors.forEach((err: any) => {
          console.error(`  - ${err.field}: ${err.message}`);
        });
      }
      throw error;
    }
  }

  /**
   * Update existing account
   */
  async updateAccount(id: number, updates: Partial<Account>): Promise<Account> {
    const { data } = await api.put(`${this.basePath}/${id}`, updates);
    return data.data;
  }

  /**
   * Delete account
   */
  async deleteAccount(id: number): Promise<void> {
    await api.delete(`${this.basePath}/${id}`);
  }

  /**
   * Get account hierarchy (parent and children)
   */
  async getAccountHierarchy(id: number): Promise<AccountHierarchy> {
    const { data } = await api.get(`${this.basePath}/${id}/hierarchy`);
    return data.data;
  }

  /**
   * Update account rating
   */
  async updateAccountRating(id: number, rating: string): Promise<Account> {
    const { data } = await api.put(`${this.basePath}/${id}/rating`, { rating });
    return data.data;
  }

  /**
   * Get account metrics
   */
  async getAccountMetrics(dateRange?: { start: string; end: string }): Promise<AccountMetrics> {
    const { data } = await api.get(`${this.basePath}/metrics`, {
      params: dateRange ? { startDate: dateRange.start, endDate: dateRange.end } : undefined
    });
    return data.data;
  }

  /**
   * Find duplicate accounts
   */
  async findDuplicates(name?: string, cuit?: string): Promise<Account[]> {
    const { data } = await api.get(`${this.basePath}/duplicates`, {
      params: { name, cuit }
    });
    return data.data;
  }

  /**
   * Get top accounts by revenue
   */
  async getTopAccounts(limit: number = 10): Promise<Account[]> {
    const { data } = await api.get(`${this.basePath}/top`, {
      params: { limit }
    });
    return data.data;
  }

  /**
   * Merge duplicate accounts
   */
  async mergeAccounts(primaryId: number, duplicateIds: number[]): Promise<Account> {
    const { data } = await api.post(`${this.basePath}/merge`, {
      primary_id: primaryId,
      duplicate_ids: duplicateIds
    });
    return data.data;
  }

  /**
   * Validate CUIT (Argentina tax ID)
   */
  async validateCUIT(cuit: string): Promise<{ valid: boolean; formatted: string }> {
    const { data } = await api.post(`${this.basePath}/validate-cuit`, { cuit });
    return data.data;
  }

  /**
   * Get accounts by parent
   */
  async getChildAccounts(parentId: number): Promise<Account[]> {
    const { data } = await api.get(this.basePath, {
      params: { parent_account_id: parentId }
    });
    return data.data;
  }

  /**
   * Export accounts to CSV
   */
  async exportAccounts(filters?: AccountFilters): Promise<Blob> {
    const response = await api.get(`${this.basePath}/export`, {
      params: filters,
      responseType: 'blob'
    });
    return response.data;
  }

  // ==================== Sprint 17 Methods ====================

  /**
   * Get account health score
   */
  async getAccountHealth(id: number): Promise<AccountHealthScore> {
    const { data } = await api.get(`${this.basePath}/${id}/health`);
    return data.data;
  }

  /**
   * Get account health history
   */
  async getAccountHealthHistory(
    id: number,
    startDate?: string,
    endDate?: string
  ): Promise<HealthHistory[]> {
    const { data } = await api.get(`${this.basePath}/${id}/health/history`, {
      params: { start_date: startDate, end_date: endDate }
    });
    return data.data;
  }

  /**
   * Get health alerts
   */
  async getHealthAlerts(filters?: {
    severity?: string;
    status?: string;
  }): Promise<HealthAlert[]> {
    const { data } = await api.get(`${this.basePath}/health/alerts`, {
      params: filters
    });
    return data.data;
  }

  /**
   * Calculate health scores in bulk
   */
  async bulkCalculateHealth(
    request: BulkHealthCalculationRequest
  ): Promise<BulkHealthCalculationResult> {
    const { data } = await api.post(`${this.basePath}/health/bulk-calculate`, request);
    return data.data;
  }

  /**
   * Get full hierarchy tree for an account
   */
  async getFullHierarchy(
    id: number,
    direction: HierarchyDirection = 'down',
    depth: number = 3
  ): Promise<HierarchyNode> {
    const { data } = await api.get(`${this.basePath}/${id}/hierarchy/full`, {
      params: { direction, depth }
    });
    return data.data;
  }

  /**
   * Get hierarchy metrics
   */
  async getHierarchyMetrics(id: number): Promise<HierarchyMetrics> {
    const { data } = await api.get(`${this.basePath}/${id}/hierarchy/metrics`);
    return data.data;
  }

  /**
   * Create hierarchy relationship
   */
  async createHierarchy(hierarchy: CreateHierarchyDto): Promise<any> {
    const { data } = await api.post(`${this.basePath}/hierarchy`, hierarchy);
    return data.data;
  }

  /**
   * Get account territory
   */
  async getAccountTerritory(id: number): Promise<Territory> {
    const { data } = await api.get(`${this.basePath}/${id}/territory`);
    return data.data;
  }

  /**
   * Assign account to territory
   */
  async assignToTerritory(
    id: number,
    territoryId: number,
    reason?: string
  ): Promise<TerritoryAssignment> {
    const { data } = await api.post(`${this.basePath}/${id}/territory`, {
      territory_id: territoryId,
      reason
    });
    return data.data;
  }

  /**
   * Get territory performance for accounts
   */
  async getTerritoryPerformance(territoryId: number): Promise<any> {
    const { data } = await api.get(`${this.basePath}/territory/${territoryId}/performance`);
    return data.data;
  }
}

export const accountService = new AccountService();