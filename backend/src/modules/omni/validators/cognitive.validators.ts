/**
 * Cognitive Services Validators - Sprint 12 Fase 4
 * Validation rules for cognitive services endpoints
 */

import { body, param, query } from 'express-validator';

export const cognitiveValidators = {
  // Document AI
  processDocument: [
    body('document_id')
      .trim()
      .notEmpty()
      .withMessage('Document ID is required'),

    body('document_type')
      .notEmpty()
      .withMessage('Document type is required')
      .isIn(['contract', 'invoice', 'receipt', 'form', 'id_document', 'email', 'legal', 'technical', 'other'])
      .withMessage('Invalid document type'),

    body('document_content')
      .notEmpty()
      .withMessage('Document content is required')
      .isString()
      .withMessage('Document content must be a string'),

    body('options.original_filename')
      .optional()
      .trim()
      .isLength({ max: 255 })
      .withMessage('Filename must not exceed 255 characters'),

    body('options.processing_model')
      .optional()
      .trim()
      .isLength({ max: 100 })
      .withMessage('Processing model must not exceed 100 characters')
  ],

  getDocumentAnalysis: [
    param('documentId')
      .trim()
      .notEmpty()
      .withMessage('Document ID is required')
  ],

  // Voice Analytics
  analyzeVoice: [
    body('interaction_id')
      .trim()
      .notEmpty()
      .withMessage('Interaction ID is required'),

    body('transcript')
      .trim()
      .notEmpty()
      .withMessage('Transcript is required')
      .isLength({ min: 1, max: 50000 })
      .withMessage('Transcript must be between 1 and 50000 characters'),

    body('options.recording_url')
      .optional()
      .isURL()
      .withMessage('Recording URL must be a valid URL'),

    body('options.speech_metrics')
      .optional()
      .isObject()
      .withMessage('Speech metrics must be an object')
  ],

  getVoiceAnalysis: [
    param('interactionId')
      .trim()
      .notEmpty()
      .withMessage('Interaction ID is required')
  ],

  // Knowledge Graph - Entities
  createEntity: [
    body('entity_type')
      .notEmpty()
      .withMessage('Entity type is required')
      .isIn(['person', 'organization', 'location', 'product', 'service', 'concept', 'event', 'date', 'monetary', 'quantity', 'other'])
      .withMessage('Invalid entity type'),

    body('entity_name')
      .trim()
      .notEmpty()
      .withMessage('Entity name is required')
      .isLength({ max: 200 })
      .withMessage('Entity name must not exceed 200 characters'),

    body('properties')
      .notEmpty()
      .withMessage('Properties are required')
      .isObject()
      .withMessage('Properties must be an object'),

    body('options.entity_description')
      .optional()
      .trim()
      .isLength({ max: 1000 })
      .withMessage('Description must not exceed 1000 characters'),

    body('options.confidence_score')
      .optional()
      .isFloat({ min: 0, max: 1 })
      .withMessage('Confidence score must be between 0 and 1')
  ],

  // Knowledge Graph - Relationships
  createRelationship: [
    body('source_entity_id')
      .isUUID()
      .withMessage('Invalid source entity ID'),

    body('target_entity_id')
      .isUUID()
      .withMessage('Invalid target entity ID'),

    body('relationship_type')
      .notEmpty()
      .withMessage('Relationship type is required')
      .isIn(['is_a', 'part_of', 'related_to', 'depends_on', 'leads_to', 'causes', 'solves', 'similar_to', 'custom'])
      .withMessage('Invalid relationship type'),

    body('options.relationship_properties')
      .optional()
      .isObject()
      .withMessage('Relationship properties must be an object'),

    body('options.confidence_score')
      .optional()
      .isFloat({ min: 0, max: 1 })
      .withMessage('Confidence score must be between 0 and 1')
  ],

  getConnectedEntities: [
    param('entityId')
      .isUUID()
      .withMessage('Invalid entity ID'),

    query('relationship_type')
      .optional()
      .isIn(['is_a', 'part_of', 'related_to', 'depends_on', 'leads_to', 'causes', 'solves', 'similar_to', 'custom'])
      .withMessage('Invalid relationship type')
  ],

  searchEntities: [
    query('q')
      .trim()
      .notEmpty()
      .withMessage('Search query is required')
      .isLength({ min: 1, max: 200 })
      .withMessage('Search query must be between 1 and 200 characters')
  ]
};
