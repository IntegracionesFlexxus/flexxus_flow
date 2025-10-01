/**
 * Omni Module Validators - Sprint 05
 * Request validation rules for omnichannel endpoints
 */

import { body, param, query } from 'express-validator';

// Channel Validators
export const channelValidators = {
  create: [
    body('channel_type')
      .isIn(['whatsapp', 'instagram', 'email', 'sms'])
      .withMessage('Invalid channel type'),
    body('name')
      .notEmpty()
      .isLength({ min: 1, max: 255 })
      .withMessage('Channel name is required and must be less than 255 characters'),
    body('configuration')
      .isObject()
      .withMessage('Configuration must be an object'),
    body('description')
      .optional()
      .isString()
      .isLength({ max: 500 })
  ],

  update: [
    param('id').isUUID().withMessage('Invalid channel ID'),
    body('name')
      .optional()
      .isLength({ min: 1, max: 255 }),
    body('description')
      .optional()
      .isString()
      .isLength({ max: 500 }),
    body('is_active')
      .optional()
      .isBoolean(),
    body('configuration')
      .optional()
      .isObject()
  ],

  getById: [
    param('id').isUUID().withMessage('Invalid channel ID')
  ],

  delete: [
    param('id').isUUID().withMessage('Invalid channel ID')
  ]
};

// Conversation Validators
export const conversationValidators = {
  create: [
    body('channel_id')
      .isUUID()
      .withMessage('Valid channel ID is required'),
    body('channel_type')
      .isIn(['whatsapp', 'instagram', 'email', 'sms'])
      .withMessage('Invalid channel type'),
    body('customer_id')
      .optional()
      .isUUID(),
    body('priority')
      .optional()
      .isIn(['low', 'normal', 'high', 'urgent']),
    body('tags')
      .optional()
      .isArray(),
    body('metadata')
      .optional()
      .isObject()
  ],

  update: [
    param('id').isUUID().withMessage('Invalid conversation ID'),
    body('status')
      .optional()
      .isIn(['open', 'pending', 'resolved', 'archived']),
    body('priority')
      .optional()
      .isIn(['low', 'normal', 'high', 'urgent']),
    body('tags')
      .optional()
      .isArray(),
    body('metadata')
      .optional()
      .isObject()
  ],

  assign: [
    param('id').isUUID().withMessage('Invalid conversation ID'),
    body('assigned_to')
      .isUUID()
      .withMessage('Valid agent ID is required'),
    body('reason')
      .optional()
      .isString()
      .isLength({ max: 500 })
  ],

  list: [
    query('status')
      .optional()
      .isIn(['open', 'pending', 'resolved', 'archived']),
    query('priority')
      .optional()
      .isIn(['low', 'normal', 'high', 'urgent']),
    query('channelType')
      .optional()
      .isIn(['whatsapp', 'instagram', 'email', 'sms']),
    query('assignedTo')
      .optional()
      .isUUID(),
    query('customerId')
      .optional()
      .isUUID(),
    query('limit')
      .optional()
      .isInt({ min: 1, max: 100 }),
    query('offset')
      .optional()
      .isInt({ min: 0 })
  ],

  getById: [
    param('id').isUUID().withMessage('Invalid conversation ID')
  ]
};

// Message Validators
export const messageValidators = {
  send: [
    body('channel_id')
      .isUUID()
      .withMessage('Valid channel ID is required'),
    body('recipient')
      .notEmpty()
      .withMessage('Recipient is required'),
    body('content')
      .notEmpty()
      .withMessage('Message content is required'),
    body('content_type')
      .optional()
      .isIn(['text', 'image', 'video', 'audio', 'document', 'location', 'template']),
    body('media_url')
      .optional()
      .isURL(),
    body('template_id')
      .optional()
      .isUUID(),
    body('template_variables')
      .optional()
      .isObject(),
    body('metadata')
      .optional()
      .isObject()
  ],

  updateStatus: [
    param('id').isUUID().withMessage('Invalid message ID'),
    body('status')
      .isIn(['pending', 'sent', 'delivered', 'read', 'failed'])
      .withMessage('Invalid message status')
  ],

  markAsRead: [
    body('conversationId')
      .isUUID()
      .withMessage('Valid conversation ID is required')
  ],

  search: [
    query('q')
      .notEmpty()
      .isLength({ min: 2 })
      .withMessage('Search term must be at least 2 characters'),
    query('limit')
      .optional()
      .isInt({ min: 1, max: 100 }),
    query('offset')
      .optional()
      .isInt({ min: 0 })
  ],

  getById: [
    param('id').isUUID().withMessage('Invalid message ID')
  ]
};

// Customer Validators
export const customerValidators = {
  create: [
    body('first_name')
      .optional()
      .isString()
      .isLength({ max: 255 }),
    body('last_name')
      .optional()
      .isString()
      .isLength({ max: 255 }),
    body('display_name')
      .optional()
      .isString()
      .isLength({ max: 255 }),
    body('email')
      .optional()
      .isEmail()
      .normalizeEmail(),
    body('phone_number')
      .optional()
      .isMobilePhone('any'),
    body('instagram_handle')
      .optional()
      .isString()
      .isLength({ max: 255 }),
    body('tags')
      .optional()
      .isArray(),
    body('metadata')
      .optional()
      .isObject()
  ],

  update: [
    param('id').isUUID().withMessage('Invalid customer ID'),
    body('first_name')
      .optional()
      .isString()
      .isLength({ max: 255 }),
    body('last_name')
      .optional()
      .isString()
      .isLength({ max: 255 }),
    body('display_name')
      .optional()
      .isString()
      .isLength({ max: 255 }),
    body('avatar_url')
      .optional()
      .isURL(),
    body('tags')
      .optional()
      .isArray(),
    body('metadata')
      .optional()
      .isObject()
  ],

  search: [
    query('query')
      .optional()
      .isString()
      .isLength({ min: 2 }),
    query('email')
      .optional()
      .isEmail(),
    query('phone_number')
      .optional()
      .isMobilePhone('any'),
    query('instagram_handle')
      .optional()
      .isString(),
    query('external_id')
      .optional()
      .isString(),
    query('limit')
      .optional()
      .isInt({ min: 1, max: 100 }),
    query('offset')
      .optional()
      .isInt({ min: 0 })
  ],

  merge: [
    body('primaryId')
      .isUUID()
      .withMessage('Valid primary customer ID is required'),
    body('duplicateId')
      .isUUID()
      .withMessage('Valid duplicate customer ID is required')
  ],

  manageTags: [
    param('id').isUUID().withMessage('Invalid customer ID'),
    body('tags')
      .isArray()
      .withMessage('Tags must be an array')
      .notEmpty()
      .withMessage('At least one tag is required')
  ],

  getById: [
    param('id').isUUID().withMessage('Invalid customer ID')
  ]
};

// Template Validators
export const templateValidators = {
  create: [
    body('channel_type')
      .isIn(['whatsapp', 'instagram', 'email', 'sms'])
      .withMessage('Invalid channel type'),
    body('name')
      .notEmpty()
      .isLength({ min: 1, max: 255 })
      .withMessage('Template name is required'),
    body('content')
      .notEmpty()
      .withMessage('Template content is required'),
    body('category')
      .optional()
      .isIn(['greeting', 'away', 'followup', 'closing', 'custom']),
    body('language')
      .optional()
      .isLength({ min: 2, max: 10 }),
    body('variables')
      .optional()
      .isArray(),
    body('buttons')
      .optional()
      .isArray(),
    body('media_url')
      .optional()
      .isURL()
  ],

  update: [
    param('id').isUUID().withMessage('Invalid template ID'),
    body('name')
      .optional()
      .isLength({ min: 1, max: 255 }),
    body('content')
      .optional()
      .isString(),
    body('category')
      .optional()
      .isIn(['greeting', 'away', 'followup', 'closing', 'custom']),
    body('variables')
      .optional()
      .isArray(),
    body('buttons')
      .optional()
      .isArray(),
    body('is_active')
      .optional()
      .isBoolean(),
    body('media_url')
      .optional()
      .isURL()
  ],

  list: [
    query('channelType')
      .notEmpty()
      .isIn(['whatsapp', 'instagram', 'email', 'sms'])
      .withMessage('Channel type is required')
  ],

  search: [
    query('q')
      .notEmpty()
      .isLength({ min: 2 })
      .withMessage('Search term must be at least 2 characters'),
    query('channelType')
      .optional()
      .isIn(['whatsapp', 'instagram', 'email', 'sms'])
  ],

  getById: [
    param('id').isUUID().withMessage('Invalid template ID')
  ],

  delete: [
    param('id').isUUID().withMessage('Invalid template ID')
  ]
};