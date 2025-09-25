/**
 * Account Validators
 * Validation schemas for account endpoints
 */

import Joi from 'joi';

export const accountCreateSchema = Joi.object({
  name: Joi.string().min(1).max(255).required(),
  account_number: Joi.string().max(50).optional(),
  type: Joi.string()
    .valid('customer', 'prospect', 'partner', 'competitor', 'vendor', 'other')
    .optional(),
  industry_id: Joi.number().integer().positive().optional(),
  vat_condition_id: Joi.number().integer().positive().optional(),
  cuit: Joi.string().max(20).optional(),
  website: Joi.string().allow('', null).max(255).optional(),
  annual_revenue: Joi.number().positive().optional(),
  employee_count: Joi.number().integer().positive().optional(),
  parent_account_id: Joi.number().integer().positive().optional(),
  billing_street: Joi.string().max(255).optional(),
  billing_city_id: Joi.number().integer().positive().optional(),
  billing_postal_code: Joi.string().max(20).optional(),
  shipping_street: Joi.string().max(255).optional(),
  shipping_city_id: Joi.number().integer().positive().optional(),
  shipping_postal_code: Joi.string().max(20).optional(),
  phone: Joi.string().max(20).optional(),
  fax: Joi.string().max(20).optional(),
  email: Joi.string().email().optional(),
  owner_id: Joi.number().integer().positive().required(),
  rating: Joi.string()
    .valid('hot', 'warm', 'cold')
    .optional(),
  sla_type: Joi.string().max(50).optional(),
  sla_expiration_date: Joi.date().iso().optional(),
  description: Joi.string().optional(),
  tags: Joi.array().items(Joi.string()).optional(),
  custom_fields: Joi.object().optional()
});

export const accountUpdateSchema = Joi.object({
  name: Joi.string().min(1).max(255).optional(),
  type: Joi.string()
    .valid('customer', 'prospect', 'partner', 'competitor', 'vendor', 'other')
    .optional(),
  industry_id: Joi.number().integer().positive().optional(),
  vat_condition_id: Joi.number().integer().positive().optional(),
  cuit: Joi.string().max(20).optional(),
  website: Joi.string().allow('', null).max(255).optional(),
  annual_revenue: Joi.number().positive().optional(),
  employee_count: Joi.number().integer().positive().optional(),
  parent_account_id: Joi.number().integer().positive().allow(null).optional(),
  billing_street: Joi.string().max(255).optional(),
  billing_city_id: Joi.number().integer().positive().optional(),
  billing_postal_code: Joi.string().max(20).optional(),
  shipping_street: Joi.string().max(255).optional(),
  shipping_city_id: Joi.number().integer().positive().optional(),
  shipping_postal_code: Joi.string().max(20).optional(),
  phone: Joi.string().max(20).optional(),
  fax: Joi.string().max(20).optional(),
  email: Joi.string().email().optional(),
  owner_id: Joi.number().integer().positive().optional(),
  rating: Joi.string()
    .valid('hot', 'warm', 'cold')
    .optional(),
  sla_type: Joi.string().max(50).optional(),
  sla_expiration_date: Joi.date().iso().optional(),
  status: Joi.string()
    .valid('active', 'inactive', 'pending')
    .optional(),
  description: Joi.string().optional(),
  tags: Joi.array().items(Joi.string()).optional(),
  custom_fields: Joi.object().optional()
}).min(1);