// validators/channelValidators.ts
import Joi from 'joi';

export const channelSchema = Joi.object({
  channelType: Joi.string()
    .valid('whatsapp', 'instagram', 'email', 'sms')
    .required(),
  name: Joi.string().min(3).max(255).required(),
  description: Joi.string().max(500).optional(),
  configuration: Joi.object().required(),
  isActive: Joi.boolean().optional()
});

export const whatsappConfigSchema = Joi.object({
  phoneNumber: Joi.string().required(),
  accessToken: Joi.string().required(),
  businessAccountId: Joi.string().optional(),
  webhookVerifyToken: Joi.string().optional()
});

export const emailConfigSchema = Joi.object({
  fromEmail: Joi.string().email().required(),
  fromName: Joi.string().required(),
  provider: Joi.string().valid('sendgrid', 'ses', 'smtp').required(),
  apiKey: Joi.string().when('provider', {
    is: Joi.string().valid('sendgrid', 'ses'),
    then: Joi.required(),
    otherwise: Joi.optional()
  }),
  smtpHost: Joi.string().when('provider', {
    is: 'smtp',
    then: Joi.required(),
    otherwise: Joi.optional()
  }),
  smtpPort: Joi.number().when('provider', {
    is: 'smtp',
    then: Joi.required(),
    otherwise: Joi.optional()
  }),
  smtpUser: Joi.string().when('provider', {
    is: 'smtp',
    then: Joi.required(),
    otherwise: Joi.optional()
  }),
  smtpPassword: Joi.string().when('provider', {
    is: 'smtp',
    then: Joi.required(),
    otherwise: Joi.optional()
  })
});

export const instagramConfigSchema = Joi.object({
  pageId: Joi.string().required(),
  accessToken: Joi.string().required(),
  username: Joi.string().optional()
});

export const smsConfigSchema = Joi.object({
  phoneNumber: Joi.string().required(),
  provider: Joi.string().valid('twilio', 'messagebird').required(),
  apiKey: Joi.string().required(),
  senderId: Joi.string().optional()
});

export async function validateChannel(data: any): Promise<any> {
  const validated = await channelSchema.validateAsync(data);

  // Validar configuración específica según el tipo de canal
  switch (validated.channelType) {
    case 'whatsapp':
      validated.configuration = await whatsappConfigSchema.validateAsync(validated.configuration);
      break;
    case 'email':
      validated.configuration = await emailConfigSchema.validateAsync(validated.configuration);
      break;
    case 'instagram':
      validated.configuration = await instagramConfigSchema.validateAsync(validated.configuration);
      break;
    case 'sms':
      validated.configuration = await smsConfigSchema.validateAsync(validated.configuration);
      break;
    default:
      throw new Error(`Unsupported channel type: ${validated.channelType}`);
  }

  return validated;
}