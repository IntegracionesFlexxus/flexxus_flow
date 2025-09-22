// validators/messageValidators.ts
import Joi from 'joi';

export const messageSchema = Joi.object({
  conversationId: Joi.string().uuid().required(),
  content: Joi.string().when('contentType', {
    is: 'text',
    then: Joi.required(),
    otherwise: Joi.optional()
  }),
  contentType: Joi.string()
    .valid('text', 'image', 'video', 'audio', 'document', 'location')
    .required(),
  mediaUrl: Joi.string().uri().optional(),
  mediaType: Joi.string().optional(),
  isPrivate: Joi.boolean().optional(),
  senderType: Joi.string()
    .valid('customer', 'agent', 'system', 'bot')
    .optional(),
  metadata: Joi.object().optional()
});

export const conversationSchema = Joi.object({
  customerId: Joi.string().uuid().optional(),
  channelId: Joi.string().uuid().required(),
  title: Joi.string().max(200).optional(),
  priority: Joi.string()
    .valid('low', 'normal', 'high', 'urgent')
    .optional(),
  tags: Joi.array().items(Joi.string()).optional(),
  customFields: Joi.object().optional(),
  internalNotes: Joi.string().optional()
});

export const customerSchema = Joi.object({
  firstName: Joi.string().max(100).optional(),
  lastName: Joi.string().max(100).optional(),
  email: Joi.string().email().optional(),
  phone: Joi.string().max(20).optional(),
  avatarUrl: Joi.string().uri().optional(),
  tags: Joi.array().items(Joi.string()).optional(),
  customFields: Joi.object().optional(),
  notes: Joi.string().optional(),
  leadStatus: Joi.string()
    .valid('cold', 'warm', 'hot', 'qualified')
    .optional(),
  leadScore: Joi.number().min(0).max(100).optional()
});

export const templateSchema = Joi.object({
  name: Joi.string().min(3).max(100).required(),
  description: Joi.string().max(500).optional(),
  category: Joi.string()
    .valid('greeting', 'support', 'marketing', 'closing', 'follow_up')
    .required(),
  subject: Joi.string().max(200).optional(),
  content: Joi.string().required(),
  mediaUrl: Joi.string().uri().optional(),
  channelTypes: Joi.array()
    .items(Joi.string().valid('whatsapp', 'instagram', 'email', 'sms'))
    .min(1)
    .required(),
  variables: Joi.object().optional(),
  isPublic: Joi.boolean().optional()
});

export const autoResponseSchema = Joi.object({
  channelId: Joi.string().uuid().optional(),
  name: Joi.string().min(3).max(100).required(),
  description: Joi.string().max(500).optional(),
  triggerType: Joi.string()
    .valid('keyword', 'time_based', 'first_message', 'business_hours')
    .required(),
  triggerConditions: Joi.object().required(),
  templateId: Joi.string().uuid().required(),
  responseDelaySeconds: Joi.number().min(0).optional(),
  maxUsesPerContact: Joi.number().min(1).optional(),
  activeHours: Joi.object().optional()
});

export async function validateMessage(data: any): Promise<any> {
  return messageSchema.validateAsync(data);
}

export async function validateConversation(data: any): Promise<any> {
  return conversationSchema.validateAsync(data);
}

export async function validateCustomer(data: any): Promise<any> {
  return customerSchema.validateAsync(data);
}

export async function validateTemplate(data: any): Promise<any> {
  return templateSchema.validateAsync(data);
}

export async function validateAutoResponse(data: any): Promise<any> {
  return autoResponseSchema.validateAsync(data);
}