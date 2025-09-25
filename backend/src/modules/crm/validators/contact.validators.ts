/**
 * Contact Validators
 * Validation schemas for contact endpoints
 */

import Joi from 'joi';

export const contactCreateSchema = Joi.object({
  account_id: Joi.number().integer().positive().required(),
  first_name: Joi.string().min(1).max(100).required(),
  last_name: Joi.string().max(100).optional(),
  email: Joi.string().email().required(),
  phone: Joi.string().max(20).optional(),
  mobile: Joi.string().max(20).optional(),
  job_title: Joi.string().max(100).optional(),
  department: Joi.string().max(100).optional(),
  reports_to_id: Joi.number().integer().positive().optional(),
  mailing_street: Joi.string().max(255).optional(),
  mailing_city_id: Joi.number().integer().positive().optional(),
  mailing_postal_code: Joi.string().max(20).optional(),
  other_street: Joi.string().max(255).optional(),
  other_city_id: Joi.number().integer().positive().optional(),
  other_postal_code: Joi.string().max(20).optional(),
  birthdate: Joi.date().iso().optional(),
  assistant_name: Joi.string().max(100).optional(),
  assistant_phone: Joi.string().max(20).optional(),
  lead_source_id: Joi.number().integer().positive().optional(),
  is_primary: Joi.boolean().optional(),
  do_not_call: Joi.boolean().optional(),
  do_not_email: Joi.boolean().optional(),
  preferred_contact_method: Joi.string().max(50).optional(),
  description: Joi.string().optional(),
  tags: Joi.array().items(Joi.string()).optional(),
  custom_fields: Joi.object().optional()
});

export const contactUpdateSchema = Joi.object({
  account_id: Joi.number().integer().positive().optional(),
  first_name: Joi.string().min(1).max(100).optional(),
  last_name: Joi.string().max(100).optional(),
  email: Joi.string().email().optional(),
  phone: Joi.string().max(20).optional(),
  mobile: Joi.string().max(20).optional(),
  job_title: Joi.string().max(100).optional(),
  department: Joi.string().max(100).optional(),
  reports_to_id: Joi.number().integer().positive().allow(null).optional(),
  mailing_street: Joi.string().max(255).optional(),
  mailing_city_id: Joi.number().integer().positive().optional(),
  mailing_postal_code: Joi.string().max(20).optional(),
  other_street: Joi.string().max(255).optional(),
  other_city_id: Joi.number().integer().positive().optional(),
  other_postal_code: Joi.string().max(20).optional(),
  birthdate: Joi.date().iso().optional(),
  assistant_name: Joi.string().max(100).optional(),
  assistant_phone: Joi.string().max(20).optional(),
  lead_source_id: Joi.number().integer().positive().optional(),
  is_primary: Joi.boolean().optional(),
  do_not_call: Joi.boolean().optional(),
  do_not_email: Joi.boolean().optional(),
  preferred_contact_method: Joi.string().max(50).optional(),
  description: Joi.string().optional(),
  tags: Joi.array().items(Joi.string()).optional(),
  custom_fields: Joi.object().optional()
}).min(1);