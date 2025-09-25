/**
 * Territory Service - Sprint 17
 * Territory management API integration
 */

import { api } from '@/shared/services/api';
import type {
  Territory,
  TerritoryAssignment,
  TerritoryMetrics,
  TerritoryPerformance,
  TerritoryRebalanceRequest,
  TerritoryRebalanceResult
} from '../types';

class TerritoryService {
  private readonly basePath = '/crm/territories';

  /**
   * Get all territories
   */
  async getTerritories(filters?: {
    type?: string;
    status?: string;
  }): Promise<Territory[]> {
    const { data } = await api.get(this.basePath, { params: filters });
    return data.data;
  }

  /**
   * Get territory by ID
   */
  async getTerritoryById(id: number): Promise<Territory> {
    const { data } = await api.get(`${this.basePath}/${id}`);
    return data.data;
  }

  /**
   * Create new territory
   */
  async createTerritory(territory: Partial<Territory>): Promise<Territory> {
    const { data } = await api.post(this.basePath, territory);
    return data.data;
  }

  /**
   * Update territory
   */
  async updateTerritory(id: number, updates: Partial<Territory>): Promise<Territory> {
    const { data } = await api.put(`${this.basePath}/${id}`, updates);
    return data.data;
  }

  /**
   * Delete territory
   */
  async deleteTerritory(id: number): Promise<void> {
    await api.delete(`${this.basePath}/${id}`);
  }

  /**
   * Get territory performance metrics
   */
  async getTerritoryPerformance(id: number): Promise<TerritoryPerformance> {
    const { data } = await api.get(`${this.basePath}/${id}/performance`);
    return data.data;
  }

  /**
   * Get territory hierarchy
   */
  async getTerritoryHierarchy(id: number): Promise<Territory> {
    const { data } = await api.get(`${this.basePath}/${id}/hierarchy`);
    return data.data;
  }

  /**
   * Assign accounts to territory
   */
  async assignAccountsToTerritory(
    territoryId: number,
    accountIds: number[],
    reason?: string
  ): Promise<TerritoryAssignment[]> {
    const { data } = await api.post(`${this.basePath}/${territoryId}/assign-accounts`, {
      account_ids: accountIds,
      reason
    });
    return data.data;
  }

  /**
   * Auto-assign accounts to territories
   */
  async autoAssignAccounts(request: {
    territory_id?: number;
    account_ids?: number[];
  }): Promise<any> {
    const { data } = await api.post(`${this.basePath}/auto-assign`, request);
    return data.data;
  }

  /**
   * Rebalance territories
   */
  async rebalanceTerritories(
    request: TerritoryRebalanceRequest
  ): Promise<TerritoryRebalanceResult> {
    const { data } = await api.post(`${this.basePath}/rebalance`, request);
    return data.data;
  }

  /**
   * Get territory coverage analysis
   */
  async getTerritoryoverage(): Promise<any> {
    const { data } = await api.get(`${this.basePath}/coverage`);
    return data.data;
  }

  /**
   * Get territories with low performance
   */
  async getLowPerformanceTerritories(threshold: number = 0.7): Promise<Territory[]> {
    const { data } = await api.get(`${this.basePath}/low-performance`, {
      params: { threshold }
    });
    return data.data;
  }

  /**
   * Get territory assignment history
   */
  async getTerritoryAssignmentHistory(
    territoryId: number,
    startDate?: string,
    endDate?: string
  ): Promise<TerritoryAssignment[]> {
    const { data } = await api.get(`${this.basePath}/${territoryId}/assignment-history`, {
      params: { start_date: startDate, end_date: endDate }
    });
    return data.data;
  }

  /**
   * Update territory targets
   */
  async updateTerritoryTargets(
    territoryId: number,
    targets: any
  ): Promise<Territory> {
    const { data } = await api.put(`${this.basePath}/${territoryId}/targets`, targets);
    return data.data;
  }

  /**
   * Split territory
   */
  async splitTerritory(
    territoryId: number,
    splitCriteria: any,
    newTerritoryNames: string[]
  ): Promise<any> {
    const { data } = await api.post(`${this.basePath}/${territoryId}/split`, {
      split_criteria: splitCriteria,
      new_territory_names: newTerritoryNames
    });
    return data.data;
  }

  /**
   * Merge territories
   */
  async mergeTerritories(
    primaryTerritoryId: number,
    territoryIdsToMerge: number[]
  ): Promise<any> {
    const { data } = await api.post(`${this.basePath}/merge`, {
      primary_territory_id: primaryTerritoryId,
      territory_ids_to_merge: territoryIdsToMerge
    });
    return data.data;
  }
}

export const territoryService = new TerritoryService();