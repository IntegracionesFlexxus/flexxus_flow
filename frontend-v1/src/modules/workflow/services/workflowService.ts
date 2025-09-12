/**
 * Workflow Service
 * Conecta con los endpoints mock del backend
 * 
 * NOTA: Actualmente consume endpoints mock.
 * La estructura no cambiará cuando se implemente el backend real.
 */

import { api } from '@/shared/services/api';

export interface Workflow {
  id: string;
  name: string;
  status: 'active' | 'draft' | 'archived';
  steps: number;
  createdAt?: string;
  updatedAt?: string;
}

export interface WorkflowExecution {
  executionId: string;
  workflowId: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  startedAt: string;
  completedAt?: string;
  progress?: number;
}

class WorkflowService {
  private baseUrl = '/workflow';

  /**
   * Obtener lista de workflows
   * @returns Lista de workflows mock
   */
  async getWorkflows(): Promise<{ success: boolean; data: Workflow[] }> {
    try {
      const response = await api.get(`${this.baseUrl}/workflows`);
      return response.data;
    } catch (error) {
      console.error('Error fetching workflows:', error);
      return { success: false, data: [] };
    }
  }

  /**
   * Ejecutar un workflow
   * @param id - ID del workflow
   * @param data - Datos para la ejecución
   * @returns Información de la ejecución mock
   */
  async executeWorkflow(
    id: string, 
    data: any
  ): Promise<{ success: boolean; data: WorkflowExecution; message: string }> {
    try {
      const response = await api.post(
        `${this.baseUrl}/workflows/${id}/execute`,
        { data }
      );
      return response.data;
    } catch (error) {
      console.error('Error executing workflow:', error);
      throw error;
    }
  }

  /**
   * Obtener estado de una ejecución
   * @param executionId - ID de la ejecución
   * @returns Estado de la ejecución mock
   */
  async getExecutionStatus(
    executionId: string
  ): Promise<{ success: boolean; data: WorkflowExecution }> {
    try {
      const response = await api.get(
        `${this.baseUrl}/executions/${executionId}/status`
      );
      return response.data;
    } catch (error) {
      console.error('Error fetching execution status:', error);
      throw error;
    }
  }

  /**
   * Verificar estado del módulo
   * @returns Estado del módulo
   */
  async getModuleStatus(): Promise<{ module: string; status: string; message: string }> {
    try {
      const response = await api.get(`${this.baseUrl}/status`);
      return response.data;
    } catch (error) {
      console.error('Error fetching module status:', error);
      throw error;
    }
  }
}

export const workflowService = new WorkflowService();