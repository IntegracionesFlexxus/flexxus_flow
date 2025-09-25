/**
 * Activity Validators
 * Validation schemas for activity endpoints
 */

import Joi from 'joi';

export const activityCreateSchema = Joi.object({
  type: Joi.string()
    .valid('task', 'call', 'meeting', 'email')
    .required(),
  subject: Joi.string().min(1).max(255).required(),
  description: Joi.string().optional(),
  status: Joi.string()
    .valid('pending', 'in_progress', 'completed', 'cancelled')
    .optional()
    .default('pending'),
  priority: Joi.string()
    .valid('low', 'medium', 'high', 'urgent')
    .optional()
    .default('medium'),
  due_date: Joi.date().iso().optional(),
  reminder_date: Joi.date().iso().optional(),
  account_id: Joi.number().integer().positive().optional(),
  contact_id: Joi.number().integer().positive().optional(),
  opportunity_id: Joi.number().integer().positive().optional(),
  lead_id: Joi.number().integer().positive().optional(),
  assigned_to: Joi.number().integer().positive().required(),
  duration_minutes: Joi.number().integer().positive().optional(),
  location: Joi.string().max(255).optional(),
  outcome: Joi.string().optional(),
  follow_up_required: Joi.boolean().optional(),
  tags: Joi.array().items(Joi.string()).optional(),
  custom_fields: Joi.object().optional()
}).or('account_id', 'contact_id', 'opportunity_id', 'lead_id');

export const activityUpdateSchema = Joi.object({
  type: Joi.string()
    .valid('task', 'call', 'meeting', 'email')
    .optional(),
  subject: Joi.string().min(1).max(255).optional(),
  description: Joi.string().optional(),
  status: Joi.string()
    .valid('pending', 'in_progress', 'completed', 'cancelled')
    .optional(),
  priority: Joi.string()
    .valid('low', 'medium', 'high', 'urgent')
    .optional(),
  due_date: Joi.date().iso().optional(),
  reminder_date: Joi.date().iso().allow(null).optional(),
  account_id: Joi.number().integer().positive().allow(null).optional(),
  contact_id: Joi.number().integer().positive().allow(null).optional(),
  opportunity_id: Joi.number().integer().positive().allow(null).optional(),
  lead_id: Joi.number().integer().positive().allow(null).optional(),
  assigned_to: Joi.number().integer().positive().optional(),
  duration_minutes: Joi.number().integer().positive().optional(),
  location: Joi.string().max(255).optional(),
  outcome: Joi.string().optional(),
  follow_up_required: Joi.boolean().optional(),
  tags: Joi.array().items(Joi.string()).optional(),
  custom_fields: Joi.object().optional()
}).min(1);

export const activityCompleteSchema = Joi.object({
  outcome: Joi.string().required(),
  follow_up_required: Joi.boolean().optional()
});

export const activityRescheduleSchema = Joi.object({
  due_date: Joi.date().iso().required(),
  reminder_date: Joi.date().iso().optional()
});