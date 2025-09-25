/**
 * Lead Validators
 * Validation schemas for lead endpoints
 */

import Joi from 'joi';

export const leadCreateSchema = Joi.object({
  first_name: Joi.string().min(1).max(100).required(),
  last_name: Joi.string().max(100).optional(),
  email: Joi.string().email().required(),
  phone: Joi.string().max(20).optional(),
  mobile: Joi.string().max(20).optional(),
  company_name: Joi.string().max(255).optional(),
  job_title: Joi.string().max(100).optional(),
  industry_id: Joi.number().integer().positive().optional(),
  website: Joi.string().uri().max(255).optional(),
  street: Joi.string().max(255).optional(),
  city_id: Joi.number().integer().positive().optional(),
  postal_code: Joi.string().max(20).optional(),
  budget: Joi.number().positive().optional(),
  authority_level: Joi.string()
    .valid('decision_maker', 'influencer', 'evaluator', 'user', 'unknown')
    .optional(),
  need_description: Joi.string().optional(),
  timeline: Joi.string()
    .valid('immediate', 'this_quarter', 'next_quarter', 'this_year', 'next_year', 'unknown')
    .optional(),
  source_id: Joi.number().integer().positive().optional(),
  assigned_to: Joi.number().integer().positive().optional(),
  notes: Joi.string().optional(),
  tags: Joi.array().items(Joi.string()).optional(),
  custom_fields: Joi.object().optional()
});

export const leadUpdateSchema = Joi.object({
  first_name: Joi.string().min(1).max(100).optional(),
  last_name: Joi.string().max(100).optional(),
  email: Joi.string().email().optional(),
  phone: Joi.string().max(20).optional(),
  mobile: Joi.string().max(20).optional(),
  company_name: Joi.string().max(255).optional(),
  job_title: Joi.string().max(100).optional(),
  industry_id: Joi.number().integer().positive().optional(),
  website: Joi.string().uri().max(255).optional(),
  street: Joi.string().max(255).optional(),
  city_id: Joi.number().integer().positive().optional(),
  postal_code: Joi.string().max(20).optional(),
  budget: Joi.number().positive().optional(),
  authority_level: Joi.string()
    .valid('decision_maker', 'influencer', 'evaluator', 'user', 'unknown')
    .optional(),
  need_description: Joi.string().optional(),
  timeline: Joi.string()
    .valid('immediate', 'this_quarter', 'next_quarter', 'this_year', 'next_year', 'unknown')
    .optional(),
  status: Joi.string()
    .valid('new', 'contacted', 'qualified', 'disqualified', 'converted')
    .optional(),
  score: Joi.number().min(0).max(100).optional(),
  assigned_to: Joi.number().integer().positive().optional(),
  do_not_call: Joi.boolean().optional(),
  do_not_email: Joi.boolean().optional(),
  preferred_contact_method: Joi.string().max(50).optional(),
  notes: Joi.string().optional(),
  tags: Joi.array().items(Joi.string()).optional(),
  custom_fields: Joi.object().optional()
}).min(1);

export const leadConversionSchema = Joi.object({
  createAccount: Joi.boolean().optional(),
  accountName: Joi.string().max(255).optional(),
  existingAccountId: Joi.number().integer().positive().optional(),
  createOpportunity: Joi.boolean().optional(),
  opportunityName: Joi.string().max(255).optional(),
  amount: Joi.number().positive().optional(),
  closeDate: Joi.date().iso().optional(),
  stageId: Joi.number().integer().positive().optional()
}).or('createAccount', 'existingAccountId');