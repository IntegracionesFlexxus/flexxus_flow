import { BaseApiService, BaseEntity } from './BaseApiService'
import { apiService, ApiResponse, PaginatedResponse } from './api'

// Servicio API de Mensajes/Omni - MVP con gestión multicanal básica
// TODO: En Nivel 2 agregar integraciones avanzadas, plantillas dinámicas, AI

// Tipos de canales soportados
export type MessageChannel = 'whatsapp' | 'email' | 'sms' | 'webchat' | 'facebook' | 'instagram' | 'telegram'
export type MessageStatus = 'pending' | 'sent' | 'delivered' | 'read' | 'failed' | 'bounced'
export type MessageDirection = 'inbound' | 'outbound'
export type MessageType = 'text' | 'image' | 'video' | 'audio' | 'document' | 'location' | 'template'

// Interfaces para Message
export interface Message extends BaseEntity {
  conversationId: string
  contactId: string
  channel: MessageChannel
  direction: MessageDirection
  type: MessageType
  status: MessageStatus
  from: string
  to: string
  content: string
  mediaUrl?: string
  mediaType?: string
  metadata?: Record<string, any>
  templateId?: string
  templateParams?: Record<string, any>
  attachments?: MessageAttachment[]
  reactions?: MessageReaction[]
  replyToId?: string
  error?: string
  sentAt?: Date | string
  deliveredAt?: Date | string
  readAt?: Date | string
  failedAt?: Date | string
}

export interface MessageAttachment {
  id: string
  type: 'image' | 'video' | 'audio' | 'document'
  url: string
  name?: string
  size?: number
  mimeType?: string
  thumbnail?: string
}

export interface MessageReaction {
  userId: string
  emoji: string
  createdAt: Date | string
}

export interface CreateMessageDTO {
  conversationId?: string
  contactId: string
  channel: MessageChannel
  type?: MessageType
  content?: string
  mediaUrl?: string
  templateId?: string
  templateParams?: Record<string, any>
  attachments?: Omit<MessageAttachment, 'id'>[]
  replyToId?: string
  scheduleAt?: Date | string
}

export interface UpdateMessageDTO {
  status?: MessageStatus
  content?: string
  metadata?: Record<string, any>
}

// Interfaces para conversaciones
export interface Conversation {
  id: string
  contactId: string
  channel: MessageChannel
  status: 'active' | 'archived' | 'closed'
  unreadCount: number
  lastMessage?: Message
  lastMessageAt?: Date | string
  assignedTo?: string
  tags?: string[]
  metadata?: Record<string, any>
  createdAt: Date | string
  updatedAt: Date | string
}

// Interfaces para plantillas
export interface MessageTemplate {
  id: string
  name: string
  channel: MessageChannel
  type: MessageType
  category: string
  language: string
  content: string
  variables?: string[]
  mediaUrl?: string
  buttons?: TemplateButton[]
  quickReplies?: string[]
  approved: boolean
  status: 'draft' | 'pending' | 'approved' | 'rejected'
}

export interface TemplateButton {
  type: 'url' | 'phone' | 'quick_reply'
  text: string
  value: string
}

// Interface para envío masivo
export interface BulkMessageRequest {
  channel: MessageChannel
  contacts: string[] | { id: string; params?: Record<string, any> }[]
  templateId?: string
  content?: string
  scheduleAt?: Date | string
  batchSize?: number
  delayBetween?: number // milliseconds
}

// Interface para configuración de canal
export interface ChannelConfig {
  channel: MessageChannel
  enabled: boolean
  credentials?: Record<string, any>
  webhookUrl?: string
  limits?: {
    messagesPerDay?: number
    messagesPerHour?: number
    messageLength?: number
  }
  features?: {
    supportMedia?: boolean
    supportTemplates?: boolean
    supportReactions?: boolean
    supportTyping?: boolean
  }
}

// Servicio de Mensajes
class MessagesApiService extends BaseApiService<Message, CreateMessageDTO, UpdateMessageDTO> {
  constructor() {
    super('/messages')
  }
  
  // Obtener conversaciones
  async getConversations(params?: {
    channel?: MessageChannel
    status?: string
    assignedTo?: string
    unread?: boolean
  }): Promise<PaginatedResponse<Conversation>> {
    const response = await apiService.get<PaginatedResponse<Conversation>>(
      '/conversations',
      params
    )
    return response
  }
  
  // Obtener mensajes de una conversación
  async getConversationMessages(
    conversationId: string,
    params?: { limit?: number; before?: string; after?: string }
  ): Promise<Message[]> {
    const response = await apiService.get<ApiResponse<Message[]>>(
      `/conversations/${conversationId}/messages`,
      params
    )
    return response.data
  }
  
  // Enviar mensaje
  async sendMessage(data: CreateMessageDTO): Promise<Message> {
    const response = await apiService.post<ApiResponse<Message>>(
      `${this.baseUrl}/send`,
      data
    )
    return response.data
  }
  
  // Envío masivo
  async sendBulk(data: BulkMessageRequest): Promise<{
    jobId: string
    total: number
    status: string
  }> {
    const response = await apiService.post<ApiResponse<any>>(
      `${this.baseUrl}/send-bulk`,
      data
    )
    return response.data
  }
  
  // Marcar como leído
  async markAsRead(messageIds: string[]): Promise<void> {
    await apiService.post(`${this.baseUrl}/mark-read`, { messageIds })
  }
  
  // Archivar conversación
  async archiveConversation(conversationId: string): Promise<void> {
    await apiService.post(`/conversations/${conversationId}/archive`)
  }
  
  // Asignar conversación
  async assignConversation(
    conversationId: string,
    userId: string
  ): Promise<Conversation> {
    const response = await apiService.post<ApiResponse<Conversation>>(
      `/conversations/${conversationId}/assign`,
      { userId }
    )
    return response.data
  }
  
  // Obtener plantillas
  async getTemplates(params?: {
    channel?: MessageChannel
    category?: string
    approved?: boolean
  }): Promise<MessageTemplate[]> {
    const response = await apiService.get<ApiResponse<MessageTemplate[]>>(
      '/message-templates',
      params
    )
    return response.data
  }
  
  // Crear plantilla
  async createTemplate(data: Partial<MessageTemplate>): Promise<MessageTemplate> {
    const response = await apiService.post<ApiResponse<MessageTemplate>>(
      '/message-templates',
      data
    )
    return response.data
  }
  
  // Enviar con plantilla
  async sendTemplate(
    contactId: string,
    templateId: string,
    params?: Record<string, any>
  ): Promise<Message> {
    const response = await apiService.post<ApiResponse<Message>>(
      `${this.baseUrl}/send-template`,
      { contactId, templateId, params }
    )
    return response.data
  }
  
  // Reaccionar a mensaje
  async addReaction(messageId: string, emoji: string): Promise<void> {
    await apiService.post(`${this.baseUrl}/${messageId}/react`, { emoji })
  }
  
  // Reenviar mensaje
  async resendMessage(messageId: string): Promise<Message> {
    const response = await apiService.post<ApiResponse<Message>>(
      `${this.baseUrl}/${messageId}/resend`
    )
    return response.data
  }
  
  // Programar mensaje
  async scheduleMessage(
    data: CreateMessageDTO & { scheduleAt: Date | string }
  ): Promise<{ jobId: string; scheduledAt: Date | string }> {
    const response = await apiService.post<ApiResponse<any>>(
      `${this.baseUrl}/schedule`,
      data
    )
    return response.data
  }
  
  // Cancelar mensaje programado
  async cancelScheduled(jobId: string): Promise<void> {
    await apiService.delete(`${this.baseUrl}/scheduled/${jobId}`)
  }
  
  // Obtener configuración de canales
  async getChannelConfigs(): Promise<ChannelConfig[]> {
    const response = await apiService.get<ApiResponse<ChannelConfig[]>>(
      '/channels/config'
    )
    return response.data
  }
  
  // Actualizar configuración de canal
  async updateChannelConfig(
    channel: MessageChannel,
    config: Partial<ChannelConfig>
  ): Promise<ChannelConfig> {
    const response = await apiService.patch<ApiResponse<ChannelConfig>>(
      `/channels/config/${channel}`,
      config
    )
    return response.data
  }
  
  // Verificar estado de WhatsApp
  async checkWhatsAppStatus(phone: string): Promise<{
    isRegistered: boolean
    hasWhatsApp: boolean
    profilePicture?: string
  }> {
    const response = await apiService.post<ApiResponse<any>>(
      '/whatsapp/check',
      { phone }
    )
    return response.data
  }
  
  // Obtener métricas de mensajes
  async getMessageMetrics(params?: {
    channel?: MessageChannel
    dateFrom?: Date | string
    dateTo?: Date | string
  }): Promise<{
    sent: number
    delivered: number
    read: number
    failed: number
    byChannel: Record<string, number>
    byDay: { date: string; count: number }[]
  }> {
    const response = await apiService.get<ApiResponse<any>>(
      `${this.baseUrl}/metrics`,
      params
    )
    return response.data
  }
  
  // Indicador de escribiendo
  async sendTypingIndicator(
    conversationId: string,
    isTyping: boolean
  ): Promise<void> {
    await apiService.post(`/conversations/${conversationId}/typing`, { isTyping })
  }
  
  // Mock data para desarrollo
  async getMockMessages(): Promise<Message[]> {
    if (import.meta.env.DEV) {
      return [
        {
          id: '1',
          conversationId: 'conv-1',
          contactId: '1',
          channel: 'whatsapp',
          direction: 'inbound',
          type: 'text',
          status: 'delivered',
          from: '+521234567890',
          to: '+529876543210',
          content: 'Hola, necesito información sobre sus productos',
          sentAt: new Date().toISOString(),
          deliveredAt: new Date().toISOString()
        },
        {
          id: '2',
          conversationId: 'conv-1',
          contactId: '1',
          channel: 'whatsapp',
          direction: 'outbound',
          type: 'text',
          status: 'read',
          from: '+529876543210',
          to: '+521234567890',
          content: '¡Hola! Claro, con gusto te ayudo. ¿Qué productos te interesan?',
          sentAt: new Date().toISOString(),
          deliveredAt: new Date().toISOString(),
          readAt: new Date().toISOString()
        }
      ]
    }
    return []
  }
  
  async getMockConversations(): Promise<Conversation[]> {
    if (import.meta.env.DEV) {
      return [
        {
          id: 'conv-1',
          contactId: '1',
          channel: 'whatsapp',
          status: 'active',
          unreadCount: 2,
          lastMessageAt: new Date().toISOString(),
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        },
        {
          id: 'conv-2',
          contactId: '2',
          channel: 'email',
          status: 'active',
          unreadCount: 0,
          lastMessageAt: new Date().toISOString(),
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        }
      ]
    }
    return []
  }
}

// Exportar instancia única
export const messagesApi = new MessagesApiService()

// TODO: En Nivel 2 agregar:
// - Integración con proveedores (Twilio, SendGrid, Meta Business)
// - Plantillas dinámicas con AI
// - Chatbots y flujos automatizados
// - Transcripción de audio/video
// - Traducción automática
// - Análisis de sentimiento
// - Webhooks en tiempo real
// - Encriptación end-to-end