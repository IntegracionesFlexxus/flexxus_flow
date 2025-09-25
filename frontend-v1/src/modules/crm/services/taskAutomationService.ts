import axios from 'axios';
import { AutomationRule, AutomationExecution } from '../types/automation.types';

const API_BASE = process.env.REACT_APP_API_URL || 'http://localhost:3000/api';

export class TaskAutomationService {
  private static instance: TaskAutomationService;
  
  private constructor() {}
  
  static getInstance(): TaskAutomationService {
    if (!this.instance) {
      this.instance = new TaskAutomationService();
    }
    return this.instance;
  }

  // Get all automation rules
  async getRules(active?: boolean): Promise<AutomationRule[]> {
    const response = await axios.get(`${API_BASE}/crm/automation/rules`, {
      params: { active }
    });
    return response.data;
  }

  // Get single rule
  async getRuleById(id: number): Promise<AutomationRule> {
    const response = await axios.get(`${API_BASE}/crm/automation/rules/${id}`);
    return response.data;
  }

  // Create automation rule
  async createRule(rule: Partial<AutomationRule>): Promise<AutomationRule> {
    const response = await axios.post(`${API_BASE}/crm/automation/rules`, rule);
    return response.data;
  }

  // Update automation rule
  async updateRule(id: number, updates: Partial<AutomationRule>): Promise<AutomationRule> {
    const response = await axios.put(`${API_BASE}/crm/automation/rules/${id}`, updates);
    return response.data;
  }

  // Delete automation rule
  async deleteRule(id: number): Promise<void> {
    await axios.delete(`${API_BASE}/crm/automation/rules/${id}`);
  }

  // Enable/disable rule
  async toggleRule(id: number, enabled: boolean): Promise<AutomationRule> {
    const response = await axios.patch(`${API_BASE}/crm/automation/rules/${id}/toggle`, {
      enabled
    });
    return response.data;
  }

  // Get execution history
  async getExecutionHistory(
    ruleId?: number,
    status?: 'success' | 'failure' | 'pending',
    limit: number = 100
  ): Promise<AutomationExecution[]> {
    const response = await axios.get(`${API_BASE}/crm/automation/history`, {
      params: { ruleId, status, limit }
    });
    return response.data;
  }

  // Test automation rule
  async testRule(
    rule: Partial<AutomationRule>,
    testData?: any
  ): Promise<{
    valid: boolean;
    errors?: string[];
    preview?: any;
  }> {
    const response = await axios.post(`${API_BASE}/crm/automation/rules/test`, {
      rule,
      testData
    });
    return response.data;
  }

  // Manually trigger rule
  async triggerRule(
    ruleId: number,
    targetId?: number
  ): Promise<AutomationExecution> {
    const response = await axios.post(`${API_BASE}/crm/automation/rules/${ruleId}/trigger`, {
      targetId
    });
    return response.data;
  }

  // Get automation statistics
  async getStats(
    startDate?: string,
    endDate?: string
  ): Promise<{
    totalRules: number;
    activeRules: number;
    totalExecutions: number;
    successRate: number;
    topRules: Array<{ ruleId: number; name: string; executions: number }>;
  }> {
    const response = await axios.get(`${API_BASE}/crm/automation/stats`, {
      params: { startDate, endDate }
    });
    return response.data;
  }

  // Get available triggers
  async getAvailableTriggers(): Promise<Array<{
    type: string;
    label: string;
    description: string;
    requiredFields: string[];
  }>> {
    const response = await axios.get(`${API_BASE}/crm/automation/triggers`);
    return response.data;
  }

  // Get available actions
  async getAvailableActions(): Promise<Array<{
    type: string;
    label: string;
    description: string;
    requiredFields: string[];
  }>> {
    const response = await axios.get(`${API_BASE}/crm/automation/actions`);
    return response.data;
  }

  // Clone automation rule
  async cloneRule(id: number, name: string): Promise<AutomationRule> {
    const response = await axios.post(`${API_BASE}/crm/automation/rules/${id}/clone`, {
      name
    });
    return response.data;
  }

  // Export automation rules
  async exportRules(ruleIds?: number[]): Promise<Blob> {
    const response = await axios.post(
      `${API_BASE}/crm/automation/export`,
      { ruleIds },
      { responseType: 'blob' }
    );
    return response.data;
  }

  // Import automation rules
  async importRules(file: File): Promise<{
    imported: number;
    failed: number;
    errors?: string[];
  }> {
    const formData = new FormData();
    formData.append('file', file);
    
    const response = await axios.post(`${API_BASE}/crm/automation/import`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });
    return response.data;
  }
}

export default TaskAutomationService.getInstance();