import { BaseApiService, BaseEntity } from './BaseApiService'
import { apiService, ApiResponse, PaginatedResponse } from './api'

// Servicio API de Contactos/CRM - MVP con gestión de contactos básica
// TODO: En Nivel 2 agregar segmentación, scoring, pipelines

// Interfaces para Contact
export interface Contact extends BaseEntity {
  firstName: string
  lastName: string
  email: string
  phone?: string
  alternativePhone?: string
  company?: string
  position?: string
  avatar?: string
  tags: string[]
  status: 'active' | 'inactive' | 'blocked'
  source: 'manual' | 'import' | 'form' | 'api' | 'whatsapp' | 'facebook' | 'instagram'
  score?: number
  notes?: string
  customFields?: Record<string, any>
  socialProfiles?: {
    facebook?: string
    instagram?: string
    twitter?: string
    linkedin?: string
  }
  address?: {
    street?: string
    city?: string
    state?: string
    country?: string
    zipCode?: string
  }
  lastContactDate?: Date | string
  totalMessages?: number
  totalPurchases?: number
}

export interface CreateContactDTO {
  firstName: string
  lastName: string
  email: string
  phone?: string
  company?: string
  position?: string
  tags?: string[]
  source?: Contact['source']
  notes?: string
  customFields?: Record<string, any>
}

export interface UpdateContactDTO extends Partial<CreateContactDTO> {
  status?: Contact['status']
}

// Interfaces para grupos y segmentos
export interface ContactGroup {
  id: string
  name: string
  description?: string
  color?: string
  contactsCount: number
  createdAt: Date | string
}

export interface ContactSegment {
  id: string
  name: string
  filters: Record<string, any>
  contactsCount: number
  isDynamic: boolean
}

// Interfaces para actividades
export interface ContactActivity {
  id: string
  contactId: string
  type: 'email' | 'call' | 'meeting' | 'note' | 'task' | 'message'
  title: string
  description?: string
  date: Date | string
  duration?: number // en minutos
  outcome?: string
  createdBy: string
}

// Servicio de Contactos
class ContactsApiService extends BaseApiService<Contact, CreateContactDTO, UpdateContactDTO> {
  constructor() {
    super('/contacts')
  }
  
  // Búsqueda avanzada de contactos
  async searchAdvanced(filters: {
    query?: string
    tags?: string[]
    status?: Contact['status']
    source?: Contact['source']
    dateFrom?: Date | string
    dateTo?: Date | string
    hasPhone?: boolean
    hasEmail?: boolean
    scoreMin?: number
    scoreMax?: number
  }): Promise<PaginatedResponse<Contact>> {
    const response = await apiService.post<PaginatedResponse<Contact>>(
      `${this.baseUrl}/search/advanced`,
      filters
    )
    return response
  }
  
  // Importar contactos desde CSV/Excel
  async importContacts(
    file: File,
    options: {
      updateExisting?: boolean
      skipDuplicates?: boolean
      mapping?: Record<string, string>
    },
    onProgress?: (progress: number) => void
  ): Promise<{
    imported: number
    updated: number
    skipped: number
    errors: any[]
  }> {
    const formData = new FormData()
    formData.append('file', file)
    formData.append('options', JSON.stringify(options))
    
    const response = await apiService.upload(
      `${this.baseUrl}/import`,
      formData,
      onProgress
    )
    return response
  }
  
  // Exportar contactos
  async exportContacts(
    format: 'csv' | 'excel' | 'pdf',
    filters?: any
  ): Promise<Blob> {
    return this.export(format, filters)
  }
  
  // Merge de contactos duplicados
  async mergeContacts(
    primaryId: string,
    secondaryIds: string[]
  ): Promise<Contact> {
    const response = await apiService.post<ApiResponse<Contact>>(
      `${this.baseUrl}/merge`,
      { primaryId, secondaryIds }
    )
    return response.data
  }
  
  // Agregar tags a múltiples contactos
  async addTagsBulk(contactIds: string[], tags: string[]): Promise<void> {
    await apiService.post(`${this.baseUrl}/bulk/add-tags`, {
      contactIds,
      tags
    })
  }
  
  // Remover tags de múltiples contactos
  async removeTagsBulk(contactIds: string[], tags: string[]): Promise<void> {
    await apiService.post(`${this.baseUrl}/bulk/remove-tags`, {
      contactIds,
      tags
    })
  }
  
  // Actualizar estado de múltiples contactos
  async updateStatusBulk(
    contactIds: string[],
    status: Contact['status']
  ): Promise<void> {
    await apiService.post(`${this.baseUrl}/bulk/update-status`, {
      contactIds,
      status
    })
  }
  
  // Obtener actividades de un contacto
  async getActivities(
    contactId: string,
    params?: { type?: string; limit?: number }
  ): Promise<ContactActivity[]> {
    const response = await apiService.get<ApiResponse<ContactActivity[]>>(
      `${this.baseUrl}/${contactId}/activities`,
      params
    )
    return response.data
  }
  
  // Agregar actividad a un contacto
  async addActivity(
    contactId: string,
    activity: Omit<ContactActivity, 'id' | 'contactId' | 'createdBy'>
  ): Promise<ContactActivity> {
    const response = await apiService.post<ApiResponse<ContactActivity>>(
      `${this.baseUrl}/${contactId}/activities`,
      activity
    )
    return response.data
  }
  
  // Obtener timeline del contacto
  async getTimeline(contactId: string): Promise<any[]> {
    const response = await apiService.get<ApiResponse<any[]>>(
      `${this.baseUrl}/${contactId}/timeline`
    )
    return response.data
  }
  
  // Obtener estadísticas de contactos
  async getStatistics(filters?: any): Promise<{
    total: number
    active: number
    inactive: number
    bySource: Record<string, number>
    byStatus: Record<string, number>
    growth: { date: string; count: number }[]
  }> {
    const response = await apiService.get<ApiResponse<any>>(
      `${this.baseUrl}/statistics`,
      filters
    )
    return response.data
  }
  
  // Verificar email
  async verifyEmail(email: string): Promise<{
    valid: boolean
    exists: boolean
    suggestion?: string
  }> {
    const response = await apiService.post<ApiResponse<any>>(
      `${this.baseUrl}/verify-email`,
      { email }
    )
    return response.data
  }
  
  // Obtener duplicados potenciales
  async findDuplicates(criteria?: {
    checkEmail?: boolean
    checkPhone?: boolean
    checkName?: boolean
  }): Promise<Contact[][]> {
    const response = await apiService.post<ApiResponse<Contact[][]>>(
      `${this.baseUrl}/find-duplicates`,
      criteria
    )
    return response.data
  }
  
  // Mock data para desarrollo
  async getMockContacts(): Promise<Contact[]> {
    if (import.meta.env.DEV) {
      return [
        {
          id: '1',
          firstName: 'Juan',
          lastName: 'Pérez',
          email: 'juan.perez@example.com',
          phone: '+521234567890',
          company: 'Empresa SA',
          position: 'Gerente',
          tags: ['cliente', 'vip'],
          status: 'active',
          source: 'manual',
          score: 85,
          totalMessages: 45,
          totalPurchases: 3
        },
        {
          id: '2',
          firstName: 'María',
          lastName: 'González',
          email: 'maria.gonzalez@example.com',
          phone: '+529876543210',
          company: 'Tech Corp',
          position: 'Directora',
          tags: ['prospecto'],
          status: 'active',
          source: 'form',
          score: 65,
          totalMessages: 12,
          totalPurchases: 0
        }
      ]
    }
    return []
  }
}

// Exportar instancia única
export const contactsApi = new ContactsApiService()

// TODO: En Nivel 2 agregar:
// - Lead scoring automático
// - Segmentación dinámica
// - Pipeline de ventas
// - Automatización de seguimiento
// - Integración con redes sociales
// - Enriquecimiento de datos
// - Historial completo de interacciones