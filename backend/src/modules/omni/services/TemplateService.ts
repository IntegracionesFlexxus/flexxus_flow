// services/TemplateService.ts
import { injectable, inject } from 'inversify';
import { EventEmitter } from 'events';
import { TemplateRepository } from '../repositories/TemplateRepository';
import { ITemplate, IAutoResponse } from '../interfaces/ITemplate';
import { OMNI_TYPES } from '../types/omni.types';

@injectable()
export class TemplateService {
  constructor(
    @inject(OMNI_TYPES.TemplateRepository) private templateRepo: TemplateRepository,
    @inject(OMNI_TYPES.EventEmitter) private eventEmitter: EventEmitter
  ) {}

  async createTemplate(data: Partial<ITemplate>): Promise<ITemplate> {
    const template = await this.templateRepo.create({
      ...data,
      usageCount: 0,
      isActive: true,
      createdAt: new Date()
    });

    this.eventEmitter.emit('template.created', {
      templateId: template.id,
      companyId: template.companyId,
      template
    });

    return template;
  }

  async getTemplate(id: string): Promise<ITemplate | null> {
    return this.templateRepo.findById(id);
  }

  async getTemplates(companyId: string): Promise<ITemplate[]> {
    return this.templateRepo.findPublicTemplates(companyId);
  }

  async getTemplatesByCategory(companyId: string, category: string): Promise<ITemplate[]> {
    return this.templateRepo.findByCategory(companyId, category);
  }

  async getTemplatesByChannelType(
    companyId: string,
    channelType: string
  ): Promise<ITemplate[]> {
    return this.templateRepo.findByChannelType(companyId, channelType);
  }

  async updateTemplate(id: string, data: Partial<ITemplate>): Promise<ITemplate | null> {
    const template = await this.templateRepo.update(id, data);

    if (template) {
      this.eventEmitter.emit('template.updated', {
        templateId: id,
        companyId: template.companyId,
        changes: data,
        template
      });
    }

    return template;
  }

  async deleteTemplate(id: string): Promise<boolean> {
    const template = await this.templateRepo.findById(id);
    if (!template) {
      throw new Error('Template not found');
    }

    const result = await this.templateRepo.delete(id);

    if (result) {
      this.eventEmitter.emit('template.deleted', {
        templateId: id,
        companyId: template.companyId
      });
    }

    return result;
  }

  async useTemplate(templateId: string, variables?: Record<string, string>): Promise<string> {
    const template = await this.templateRepo.findById(templateId);
    if (!template || !template.isActive) {
      throw new Error('Template not found or inactive');
    }

    // Incrementar contador de uso
    await this.templateRepo.incrementUsage(templateId);

    // Procesar variables en el contenido
    let processedContent = template.content;

    if (variables && Object.keys(variables).length > 0) {
      Object.entries(variables).forEach(([key, value]) => {
        const placeholder = `{{${key}}}`;
        processedContent = processedContent.replace(new RegExp(placeholder, 'g'), value);
      });
    }

    this.eventEmitter.emit('template.used', {
      templateId,
      companyId: template.companyId,
      variables
    });

    return processedContent;
  }

  async searchTemplates(
    companyId: string,
    searchTerm: string,
    limit: number = 20
  ): Promise<ITemplate[]> {
    return this.templateRepo.searchTemplates(companyId, searchTerm, limit);
  }

  async duplicateTemplate(templateId: string, newName: string): Promise<ITemplate> {
    const originalTemplate = await this.templateRepo.findById(templateId);
    if (!originalTemplate) {
      throw new Error('Template not found');
    }

    return this.createTemplate({
      ...originalTemplate,
      id: undefined,
      name: newName,
      usageCount: 0,
      lastUsedAt: undefined,
      createdAt: undefined
    });
  }

  // Auto Response methods
  async createAutoResponse(data: Partial<IAutoResponse>): Promise<IAutoResponse> {
    const autoResponse = await this.templateRepo.createAutoResponse({
      ...data,
      isActive: true,
      createdAt: new Date()
    });

    this.eventEmitter.emit('auto.response.created', {
      autoResponseId: autoResponse.id,
      companyId: autoResponse.companyId,
      autoResponse
    });

    return autoResponse;
  }

  async getAutoResponsesByChannel(channelId: string): Promise<IAutoResponse[]> {
    return this.templateRepo.findAutoResponsesByChannel(channelId);
  }

  async getAutoResponsesByTrigger(
    companyId: string,
    triggerType: string
  ): Promise<IAutoResponse[]> {
    return this.templateRepo.findAutoResponsesByTrigger(companyId, triggerType);
  }

  async evaluateAutoResponses(
    channelId: string,
    triggerType: string,
    triggerData: any
  ): Promise<IAutoResponse[]> {
    const autoResponses = await this.templateRepo.findAutoResponsesByChannel(channelId);

    return autoResponses.filter(response => {
      if (response.triggerType !== triggerType) return false;

      // Evaluar condiciones según el tipo de trigger
      return this.evaluateTriggerConditions(response, triggerData);
    });
  }

  async processAutoResponse(
    autoResponse: IAutoResponse,
    variables?: Record<string, string>
  ): Promise<string> {
    // Obtener la plantilla asociada
    const template = await this.templateRepo.findById(autoResponse.templateId);
    if (!template) {
      throw new Error('Template not found for auto response');
    }

    // Procesar la plantilla con variables
    return this.useTemplate(template.id, variables);
  }

  async getTemplateCategories(companyId: string): Promise<string[]> {
    const templates = await this.templateRepo.findPublicTemplates(companyId);
    const categories = new Set(templates.map(t => t.category).filter(Boolean));
    return Array.from(categories);
  }

  async getTemplateStats(companyId: string): Promise<any> {
    const templates = await this.templateRepo.findPublicTemplates(companyId);

    const stats = {
      total: templates.length,
      active: templates.filter(t => t.isActive).length,
      byCategory: {} as Record<string, number>,
      byChannelType: {} as Record<string, number>,
      mostUsed: templates
        .sort((a, b) => b.usageCount - a.usageCount)
        .slice(0, 5)
        .map(t => ({ id: t.id, name: t.name, usageCount: t.usageCount }))
    };

    templates.forEach(template => {
      if (template.category) {
        stats.byCategory[template.category] =
          (stats.byCategory[template.category] || 0) + 1;
      }

      template.channelTypes.forEach(channelType => {
        stats.byChannelType[channelType] =
          (stats.byChannelType[channelType] || 0) + 1;
      });
    });

    return stats;
  }

  private evaluateTriggerConditions(
    autoResponse: IAutoResponse,
    triggerData: any
  ): boolean {
    const conditions = autoResponse.triggerConditions;

    switch (autoResponse.triggerType) {
      case 'keyword':
        return this.evaluateKeywordTrigger(conditions, triggerData);
      case 'time_based':
        return this.evaluateTimeTrigger(conditions, triggerData);
      case 'first_message':
        return triggerData.isFirstMessage === true;
      case 'business_hours':
        return this.evaluateBusinessHoursTrigger(conditions, triggerData);
      default:
        return false;
    }
  }

  private evaluateKeywordTrigger(conditions: any, triggerData: any): boolean {
    const keywords = conditions.keywords || [];
    const message = triggerData.message?.toLowerCase() || '';

    return keywords.some((keyword: string) =>
      message.includes(keyword.toLowerCase())
    );
  }

  private evaluateTimeTrigger(conditions: any, triggerData: any): boolean {
    const delay = conditions.delayMinutes || 0;
    const lastMessage = triggerData.lastMessageAt;

    if (!lastMessage) return false;

    const timeDiff = Date.now() - new Date(lastMessage).getTime();
    return timeDiff >= delay * 60 * 1000;
  }

  private evaluateBusinessHoursTrigger(conditions: any, triggerData: any): boolean {
    const now = new Date();
    const currentHour = now.getHours();
    const currentDay = now.getDay(); // 0 = Sunday, 1 = Monday, etc.

    const businessHours = conditions.businessHours || {};
    const dayName = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'][currentDay];

    const dayHours = businessHours[dayName];
    if (!dayHours || !dayHours.isActive) return false;

    return currentHour >= dayHours.start && currentHour < dayHours.end;
  }
}