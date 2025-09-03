// Archivo índice para exportar todos los servicios API
// MVP con servicios básicos - TODO: En Nivel 2 agregar más servicios

// Exportar configuración base de API
export { api, apiService, buildQueryString } from './api'
export type { ApiResponse, PaginatedResponse, PaginationParams, FilterParams } from './api'

// Exportar servicio base
export { BaseApiService, createApiService } from './BaseApiService'
export type { BaseEntity, TimestampedEntity } from './BaseApiService'

// Exportar servicio de autenticación
export { authApi } from './authApi'
export type {
  LoginRequest,
  RegisterRequest,
  User,
  Company,
  AuthResponse,
  ResetPasswordRequest,
  ChangePasswordRequest,
  VerifyEmailRequest
} from './authApi'

// Exportar servicio de contactos
export { contactsApi } from './contactsApi'
export type {
  Contact,
  CreateContactDTO,
  UpdateContactDTO,
  ContactGroup,
  ContactSegment,
  ContactActivity
} from './contactsApi'

// Exportar servicio de mensajes
export { messagesApi } from './messagesApi'
export type {
  Message,
  MessageChannel,
  MessageStatus,
  MessageDirection,
  MessageType,
  MessageAttachment,
  MessageReaction,
  CreateMessageDTO,
  UpdateMessageDTO,
  Conversation,
  MessageTemplate,
  TemplateButton,
  BulkMessageRequest,
  ChannelConfig
} from './messagesApi'

// Exportar servicio de workflows
export { workflowApi } from './workflowApi'
export type {
  Workflow,
  WorkflowTrigger,
  WorkflowAction,
  WorkflowCondition,
  CreateWorkflowDTO,
  UpdateWorkflowDTO,
  WorkflowExecution,
  ExecutionLog,
  WorkflowTemplate,
  WorkflowTest,
  TriggerType,
  ActionType,
  WorkflowStatus,
  ExecutionStatus
} from './workflowApi'

// Exportar servicio de analytics
export { analyticsApi } from './analyticsApi'
export type {
  Metric,
  MetricSeries,
  Dashboard,
  DashboardWidget,
  DashboardFilter,
  Report,
  FunnelStage,
  FunnelAnalysis,
  CohortAnalysis,
  MetricType,
  PeriodType,
  ChartType,
  AggregationType
} from './analyticsApi'

// Helper para inicializar todos los servicios (si necesario)
export const initializeServices = (config?: {
  apiUrl?: string
  timeout?: number
}) => {
  // TODO: En Nivel 2 agregar configuración dinámica
  if (import.meta.env.DEV) {
    console.log('API Services initialized', config)
  }
}

// Helper para limpiar/resetear servicios
export const resetServices = () => {
  // TODO: En Nivel 2 agregar limpieza de cache y estado
  if (import.meta.env.DEV) {
    console.log('API Services reset')
  }
}

// Importar instancias de los servicios
import { authApi } from './authApi'
import { contactsApi } from './contactsApi'
import { messagesApi } from './messagesApi'
import { workflowApi } from './workflowApi'
import { analyticsApi } from './analyticsApi'

// Exportar todos los servicios como un objeto para conveniencia
export const services = {
  auth: authApi,
  contacts: contactsApi,
  messages: messagesApi,
  workflow: workflowApi,
  analytics: analyticsApi
}

// TODO: En Nivel 2 agregar:
// - Servicio de configuración/settings
// - Servicio de notificaciones push
// - Servicio de archivos/media
// - Servicio de usuarios/teams
// - Servicio de billing/subscriptions
// - Servicio de integrations
// - Servicio de audit/logs