import { BaseApiService, BaseEntity } from './BaseApiService'
import { api, apiService, ApiResponse, PaginatedResponse } from './api'

// Servicio API de Workflows - MVP con automatización básica
// TODO: En Nivel 2 agregar builder visual, condiciones complejas, AI

// Tipos de triggers y acciones
export type TriggerType = 'manual' | 'schedule' | 'webhook' | 'event' | 'form' | 'message' | 'contact'
export type ActionType = 'send_message' | 'send_email' | 'update_contact' | 'add_tag' | 'create_task' | 'webhook' | 'wait' | 'condition'
export type WorkflowStatus = 'draft' | 'active' | 'paused' | 'archived'
export type ExecutionStatus = 'pending' | 'running' | 'completed' | 'failed' | 'cancelled'

// Interfaces para Workflow
export interface Workflow extends BaseEntity {
  name: string
  description?: string
  status: WorkflowStatus
  trigger: WorkflowTrigger
  actions: WorkflowAction[]
  conditions?: WorkflowCondition[]
  version: number
  isTemplate: boolean
  category?: string
  tags?: string[]
  statistics?: {
    totalExecutions: number
    successfulExecutions: number
    failedExecutions: number
    averageDuration: number
    lastExecutedAt?: Date | string
  }
  createdBy: string
  updatedBy?: string
}

export interface WorkflowTrigger {
  type: TriggerType
  config: Record<string, any>
  filters?: Record<string, any>
}

export interface WorkflowAction {
  id: string
  type: ActionType
  name: string
  config: Record<string, any>
  nextActionId?: string
  errorActionId?: string
  retryConfig?: {
    maxAttempts: number
    delaySeconds: number
  }
}

export interface WorkflowCondition {
  id: string
  field: string
  operator: 'equals' | 'not_equals' | 'contains' | 'greater_than' | 'less_than' | 'is_empty' | 'is_not_empty'
  value: any
  trueActionId?: string
  falseActionId?: string
}

export interface CreateWorkflowDTO {
  name: string
  description?: string
  trigger: WorkflowTrigger
  actions: Omit<WorkflowAction, 'id'>[]
  conditions?: Omit<WorkflowCondition, 'id'>[]
  category?: string
  tags?: string[]
}

export interface UpdateWorkflowDTO extends Partial<CreateWorkflowDTO> {
  status?: WorkflowStatus
}

// Interfaces para ejecuciones
export interface WorkflowExecution {
  id: string
  workflowId: string
  workflowName: string
  status: ExecutionStatus
  triggerData?: Record<string, any>
  context: Record<string, any>
  currentActionId?: string
  completedActions: string[]
  logs: ExecutionLog[]
  error?: string
  startedAt: Date | string
  completedAt?: Date | string
  duration?: number // milliseconds
}

export interface ExecutionLog {
  id: string
  actionId: string
  actionType: ActionType
  status: 'success' | 'error' | 'skipped'
  message?: string
  data?: Record<string, any>
  timestamp: Date | string
}

// Interfaces para plantillas
export interface WorkflowTemplate {
  id: string
  name: string
  description: string
  category: string
  thumbnail?: string
  popularity: number
  workflow: Partial<Workflow>
  requiredIntegrations?: string[]
  estimatedTime?: string
}

// Interface para testing
export interface WorkflowTest {
  workflowId: string
  testData: Record<string, any>
  expectedResults?: Record<string, any>
  mockResponses?: Record<string, any>
}

// Servicio de Workflows
class WorkflowApiService extends BaseApiService<Workflow, CreateWorkflowDTO, UpdateWorkflowDTO> {
  constructor() {
    super('/workflows')
  }
  
  // Activar workflow
  async activate(workflowId: string): Promise<Workflow> {
    const response = await apiService.post<ApiResponse<Workflow>>(
      `${this.baseUrl}/${workflowId}/activate`
    )
    return response.data
  }
  
  // Pausar workflow
  async pause(workflowId: string): Promise<Workflow> {
    const response = await apiService.post<ApiResponse<Workflow>>(
      `${this.baseUrl}/${workflowId}/pause`
    )
    return response.data
  }
  
  // Clonar workflow
  async clone(workflowId: string, name?: string): Promise<Workflow> {
    const response = await apiService.post<ApiResponse<Workflow>>(
      `${this.baseUrl}/${workflowId}/clone`,
      { name }
    )
    return response.data
  }
  
  // Ejecutar workflow manualmente
  async execute(
    workflowId: string,
    data?: Record<string, any>
  ): Promise<WorkflowExecution> {
    const response = await apiService.post<ApiResponse<WorkflowExecution>>(
      `${this.baseUrl}/${workflowId}/execute`,
      data
    )
    return response.data
  }
  
  // Obtener ejecuciones
  async getExecutions(
    workflowId?: string,
    params?: {
      status?: ExecutionStatus
      dateFrom?: Date | string
      dateTo?: Date | string
    }
  ): Promise<PaginatedResponse<WorkflowExecution>> {
    const url = workflowId 
      ? `${this.baseUrl}/${workflowId}/executions`
      : '/workflow-executions'
    
    const response = await apiService.get<PaginatedResponse<WorkflowExecution>>(
      url,
      params
    )
    return response
  }
  
  // Obtener detalles de ejecución
  async getExecution(executionId: string): Promise<WorkflowExecution> {
    const response = await apiService.get<ApiResponse<WorkflowExecution>>(
      `/workflow-executions/${executionId}`
    )
    return response.data
  }
  
  // Cancelar ejecución
  async cancelExecution(executionId: string): Promise<void> {
    await apiService.post(`/workflow-executions/${executionId}/cancel`)
  }
  
  // Reintentar ejecución fallida
  async retryExecution(executionId: string): Promise<WorkflowExecution> {
    const response = await apiService.post<ApiResponse<WorkflowExecution>>(
      `/workflow-executions/${executionId}/retry`
    )
    return response.data
  }
  
  // Obtener plantillas de workflow
  async getTemplates(params?: {
    category?: string
    search?: string
  }): Promise<WorkflowTemplate[]> {
    const response = await apiService.get<ApiResponse<WorkflowTemplate[]>>(
      '/workflow-templates',
      params
    )
    return response.data
  }
  
  // Crear workflow desde plantilla
  async createFromTemplate(
    templateId: string,
    data: Partial<CreateWorkflowDTO>
  ): Promise<Workflow> {
    const response = await apiService.post<ApiResponse<Workflow>>(
      `/workflow-templates/${templateId}/create`,
      data
    )
    return response.data
  }
  
  // Probar workflow
  async test(test: WorkflowTest): Promise<{
    success: boolean
    results: ExecutionLog[]
    errors?: string[]
  }> {
    const response = await apiService.post<ApiResponse<any>>(
      `${this.baseUrl}/${test.workflowId}/test`,
      test
    )
    return response.data
  }
  
  // Validar workflow
  async validate(workflowId: string): Promise<{
    valid: boolean
    errors?: string[]
    warnings?: string[]
  }> {
    const response = await apiService.post<ApiResponse<any>>(
      `${this.baseUrl}/${workflowId}/validate`
    )
    return response.data
  }
  
  // Obtener estadísticas de workflows
  async getStatistics(params?: {
    dateFrom?: Date | string
    dateTo?: Date | string
  }): Promise<{
    totalWorkflows: number
    activeWorkflows: number
    totalExecutions: number
    successRate: number
    averageDuration: number
    topWorkflows: { id: string; name: string; executions: number }[]
    executionsByDay: { date: string; count: number; success: number; failed: number }[]
  }> {
    const response = await apiService.get<ApiResponse<any>>(
      `${this.baseUrl}/statistics`,
      params
    )
    return response.data
  }
  
  // Exportar workflow
  async exportWorkflow(
    workflowId: string,
    format: 'json' | 'yaml'
  ): Promise<Blob> {
    const response = await api.get(
      `${this.baseUrl}/${workflowId}/export`,
      { 
        params: { format },
        responseType: 'blob' 
      }
    )
    return response.data
  }
  
  // Importar workflow
  async importWorkflow(
    file: File,
    onProgress?: (progress: number) => void
  ): Promise<Workflow> {
    const formData = new FormData()
    formData.append('file', file)
    
    const response = await apiService.upload<ApiResponse<Workflow>>(
      `${this.baseUrl}/import`,
      formData,
      onProgress
    )
    return response.data
  }
  
  // Obtener historial de versiones
  async getVersionHistory(workflowId: string): Promise<{
    version: number
    changes: string
    createdBy: string
    createdAt: Date | string
  }[]> {
    const response = await apiService.get<ApiResponse<any[]>>(
      `${this.baseUrl}/${workflowId}/versions`
    )
    return response.data
  }
  
  // Restaurar versión anterior
  async restoreVersion(workflowId: string, version: number): Promise<Workflow> {
    const response = await apiService.post<ApiResponse<Workflow>>(
      `${this.baseUrl}/${workflowId}/restore`,
      { version }
    )
    return response.data
  }
  
  // Mock data para desarrollo
  async getMockWorkflows(): Promise<Workflow[]> {
    if (import.meta.env.DEV) {
      return [
        {
          id: '1',
          name: 'Bienvenida a nuevos contactos',
          description: 'Envía mensaje de bienvenida cuando se registra un nuevo contacto',
          status: 'active',
          trigger: {
            type: 'event',
            config: { event: 'contact.created' }
          },
          actions: [
            {
              id: 'a1',
              type: 'wait',
              name: 'Esperar 1 minuto',
              config: { duration: 60 }
            },
            {
              id: 'a2',
              type: 'send_message',
              name: 'Enviar mensaje de bienvenida',
              config: {
                channel: 'whatsapp',
                templateId: 'welcome-template'
              }
            }
          ],
          version: 1,
          isTemplate: false,
          statistics: {
            totalExecutions: 45,
            successfulExecutions: 43,
            failedExecutions: 2,
            averageDuration: 62000
          },
          createdBy: 'user-1',
          createdAt: new Date().toISOString()
        },
        {
          id: '2',
          name: 'Seguimiento de carritos abandonados',
          description: 'Envía recordatorio cuando un carrito es abandonado',
          status: 'draft',
          trigger: {
            type: 'event',
            config: { event: 'cart.abandoned' }
          },
          actions: [
            {
              id: 'a1',
              type: 'wait',
              name: 'Esperar 1 hora',
              config: { duration: 3600 }
            },
            {
              id: 'a2',
              type: 'send_email',
              name: 'Enviar email de recordatorio',
              config: {
                templateId: 'cart-reminder'
              }
            }
          ],
          version: 1,
          isTemplate: false,
          createdBy: 'user-1',
          createdAt: new Date().toISOString()
        }
      ]
    }
    return []
  }
}

// Exportar instancia única
export const workflowApi = new WorkflowApiService()

// TODO: En Nivel 2 agregar:
// - Builder visual drag & drop
// - Condiciones y bifurcaciones complejas
// - Loops y iteraciones
// - Variables y expresiones
// - Integraciones con terceros (Zapier, Make)
// - AI para sugerencias y optimización
// - A/B testing de workflows
// - Análisis predictivo