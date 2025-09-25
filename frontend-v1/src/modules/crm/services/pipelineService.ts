/**
 * Pipeline Service
 * API integration for pipeline management
 */

import axios, { AxiosInstance } from 'axios';
import {
  Pipeline,
  PipelineStage,
  PipelineMetrics,
  Bottleneck,
  PipelineVelocity,
  PipelineTemplate,
  PipelinePermission,
  OpportunityExtended,
  StageHistory,
  OpportunityStakeholder
} from '../types/pipeline.types';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001/api/v1/crm';

class PipelineService {
  private api: AxiosInstance;
  private companyId: number = 1; // Default company ID

  constructor() {
    this.api = axios.create({
      baseURL: API_BASE_URL,
      headers: {
        'Content-Type': 'application/json'
      }
    });

    // Add auth token interceptor
    this.api.interceptors.request.use((config) => {
      const token = localStorage.getItem('authToken');
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
      return config;
    });

    // Add error interceptor
    this.api.interceptors.response.use(
      (response) => response,
      (error) => {
        if (error.response?.status === 401) {
          // Handle unauthorized
          window.location.href = '/login';
        }
        throw error;
      }
    );
  }

  // Pipeline CRUD operations
  async getPipelines(companyId?: number): Promise<Pipeline[]> {
    const response = await this.api.get('/pipelines', {
      params: { company_id: companyId || this.companyId }
    });
    return response.data;
  }

  async getPipeline(pipelineId: number): Promise<Pipeline> {
    const response = await this.api.get(`/pipelines/${pipelineId}`);
    return response.data;
  }

  async createPipeline(pipeline: Partial<Pipeline>): Promise<Pipeline> {
    const response = await this.api.post('/pipelines', {
      ...pipeline,
      company_id: pipeline.company_id || this.companyId
    });
    return response.data;
  }

  async updatePipeline(pipelineId: number, updates: Partial<Pipeline>): Promise<Pipeline> {
    const response = await this.api.put(`/pipelines/${pipelineId}`, updates);
    return response.data;
  }

  async deletePipeline(pipelineId: number): Promise<void> {
    await this.api.delete(`/pipelines/${pipelineId}`);
  }

  // Stage operations
  async getPipelineStages(pipelineId: number): Promise<PipelineStage[]> {
    const response = await this.api.get(`/pipelines/${pipelineId}/stages`);
    return response.data;
  }

  async createStage(pipelineId: number, stage: Partial<PipelineStage>): Promise<PipelineStage> {
    const response = await this.api.post(`/pipelines/${pipelineId}/stages`, {
      ...stage,
      company_id: this.companyId
    });
    return response.data;
  }

  async updateStage(stageId: number, updates: Partial<PipelineStage>): Promise<PipelineStage> {
    const response = await this.api.put(`/stages/${stageId}`, updates);
    return response.data;
  }

  async deleteStage(stageId: number): Promise<void> {
    await this.api.delete(`/stages/${stageId}`);
  }

  async reorderStages(pipelineId: number, stageOrders: { stage_id: number; order: number }[]): Promise<void> {
    await this.api.put(`/pipelines/${pipelineId}/stages/reorder`, { stages: stageOrders });
  }

  // Opportunity operations
  async getOpportunitiesExtended(pipelineId?: number): Promise<OpportunityExtended[]> {
    const response = await this.api.get('/opportunities/extended', {
      params: { pipeline_id: pipelineId, company_id: this.companyId }
    });
    return response.data;
  }

  async getOpportunityExtended(opportunityId: string): Promise<OpportunityExtended> {
    const response = await this.api.get(`/opportunities/${opportunityId}/extended`);
    return response.data;
  }

  async moveOpportunityStage(
    opportunityId: string,
    newStageId: number,
    notes?: string
  ): Promise<OpportunityExtended> {
    const response = await this.api.put(`/opportunities/${opportunityId}/stage`, {
      stage_id: newStageId,
      notes
    });
    return response.data;
  }

  async updateOpportunityPriority(
    opportunityId: string,
    priority: 'critical' | 'high' | 'medium' | 'low'
  ): Promise<void> {
    await this.api.patch(`/opportunities/${opportunityId}`, { priority });
  }

  async addStakeholder(
    opportunityId: string,
    stakeholder: Partial<OpportunityStakeholder>
  ): Promise<OpportunityStakeholder> {
    const response = await this.api.post(`/opportunities/${opportunityId}/stakeholders`, {
      ...stakeholder,
      company_id: this.companyId
    });
    return response.data;
  }

  async getOpportunityHistory(opportunityId: string): Promise<StageHistory[]> {
    const response = await this.api.get(`/opportunities/${opportunityId}/history`);
    return response.data;
  }

  // Metrics and analytics
  async getPipelineMetrics(pipelineId: number, dateRange?: { from: string; to: string }): Promise<PipelineMetrics> {
    const response = await this.api.get(`/pipelines/${pipelineId}/metrics`, {
      params: dateRange
    });
    return response.data;
  }

  async detectBottlenecks(pipelineId: number): Promise<Bottleneck[]> {
    const response = await this.api.get(`/pipelines/${pipelineId}/bottlenecks`);
    return response.data;
  }

  async getPipelineVelocity(pipelineId: number, period: 'week' | 'month' | 'quarter' = 'month'): Promise<PipelineVelocity[]> {
    const response = await this.api.get(`/pipelines/${pipelineId}/velocity`, {
      params: { period }
    });
    return response.data;
  }

  async refreshMetrics(pipelineId?: number): Promise<void> {
    await this.api.post('/metrics/refresh', {
      pipeline_id: pipelineId,
      company_id: this.companyId
    });
  }

  // Templates
  async getTemplates(): Promise<PipelineTemplate[]> {
    const response = await this.api.get('/pipelines/templates');
    return response.data;
  }

  async applyTemplate(templateId: number, pipelineName: string): Promise<Pipeline> {
    const response = await this.api.post(`/pipelines/templates/${templateId}/apply`, {
      name: pipelineName,
      company_id: this.companyId
    });
    return response.data;
  }

  // Permissions
  async getPipelinePermissions(pipelineId: number): Promise<PipelinePermission[]> {
    const response = await this.api.get(`/pipelines/${pipelineId}/permissions`);
    return response.data;
  }

  async updatePermissions(
    pipelineId: number,
    permissions: Partial<PipelinePermission>[]
  ): Promise<PipelinePermission[]> {
    const response = await this.api.put(`/pipelines/${pipelineId}/permissions`, {
      permissions
    });
    return response.data;
  }

  // Bulk operations
  async bulkMoveOpportunities(
    opportunityIds: string[],
    newStageId: number
  ): Promise<{ success: number; failed: number }> {
    const response = await this.api.post('/opportunities/bulk/move', {
      opportunity_ids: opportunityIds,
      stage_id: newStageId
    });
    return response.data;
  }

  async bulkUpdateOpportunities(
    opportunityIds: string[],
    updates: Partial<OpportunityExtended>
  ): Promise<{ success: number; failed: number }> {
    const response = await this.api.post('/opportunities/bulk/update', {
      opportunity_ids: opportunityIds,
      updates
    });
    return response.data;
  }

  // Export
  async exportPipelineData(
    pipelineId: number,
    format: 'excel' | 'csv',
    filters?: any
  ): Promise<Blob> {
    const response = await this.api.get(`/pipelines/${pipelineId}/export`, {
      params: { format, ...filters },
      responseType: 'blob'
    });
    return response.data;
  }
}

export default new PipelineService();