/**
 * Opportunity Validators
 * Validation schemas for opportunity endpoints
 */

import Joi from 'joi';

export const opportunityCreateSchema = Joi.object({
  name: Joi.string().min(1).max(255).required(),
  opportunity_number: Joi.string().max(50).optional(),
  type: Joi.string()
    .valid('new_business', 'existing_business', 'renewal')
    .optional(),
  account_id: Joi.number().integer().positive().required(),
  primary_contact_id: Joi.number().integer().positive().optional(),
  stage_id: Joi.number().integer().positive().required(),
  amount: Joi.number().positive().optional(),
  probability: Joi.number().min(0).max(100).optional(),
  close_date: Joi.date().iso().optional(),
  lead_source_id: Joi.number().integer().positive().optional(),
  campaign_id: Joi.number().integer().positive().optional(),
  competitors: Joi.array().items(Joi.string()).optional(),
  owner_id: Joi.number().integer().positive().required(),
  forecast_category: Joi.string()
    .valid('pipeline', 'best_case', 'commit', 'closed')
    .optional(),
  description: Joi.string().optional(),
  next_step: Joi.string().max(255).optional(),
  tags: Joi.array().items(Joi.string()).optional(),
  custom_fields: Joi.object().optional()
});

export const opportunityUpdateSchema = Joi.object({
  name: Joi.string().min(1).max(255).optional(),
  type: Joi.string()
    .valid('new_business', 'existing_business', 'renewal')
    .optional(),
  primary_contact_id: Joi.number().integer().positive().allow(null).optional(),
  stage_id: Joi.number().integer().positive().optional(),
  amount: Joi.number().positive().optional(),
  probability: Joi.number().min(0).max(100).optional(),
  close_date: Joi.date().iso().optional(),
  lead_source_id: Joi.number().integer().positive().optional(),
  campaign_id: Joi.number().integer().positive().optional(),
  competitors: Joi.array().items(Joi.string()).optional(),
  owner_id: Joi.number().integer().positive().optional(),
  status: Joi.string()
    .valid('open', 'won', 'lost')
    .optional(),
  lost_reason: Joi.string().max(255).optional(),
  forecast_category: Joi.string()
    .valid('pipeline', 'best_case', 'commit', 'closed')
    .optional(),
  description: Joi.string().optional(),
  next_step: Joi.string().max(255).optional(),
  tags: Joi.array().items(Joi.string()).optional(),
  custom_fields: Joi.object().optional()
}).min(1);

export const opportunityStageUpdateSchema = Joi.object({
  stage_id: Joi.number().integer().positive().required(),
  probability: Joi.number().min(0).max(100).optional(),
  next_step: Joi.string().max(255).optional(),
  notes: Joi.string().optional()
});

export const opportunityBulkCreateSchema = Joi.object({
  opportunities: Joi.array()
    .items(opportunityCreateSchema)
    .min(1)
    .max(100)
    .required()
    .messages({
      'array.min': 'At least one opportunity is required',
      'array.max': 'Maximum 100 opportunities allowed per batch'
    })
});

export const opportunityBulkUpdateSchema = Joi.object({
  updates: Joi.array()
    .items(
      Joi.object({
        id: Joi.number().integer().positive().required(),
        data: opportunityUpdateSchema.required()
      })
    )
    .min(1)
    .max(100)
    .required()
});

export const opportunityBulkDeleteSchema = Joi.object({
  ids: Joi.array()
    .items(Joi.number().integer().positive())
    .min(1)
    .max(100)
    .required()
});