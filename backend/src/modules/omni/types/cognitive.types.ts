/**
 * Cognitive Services Types - Sprint 12 Fase 4
 * Type definitions for cognitive and knowledge services
 */

export enum DocumentType {
  CONTRACT = 'contract',
  INVOICE = 'invoice',
  RECEIPT = 'receipt',
  FORM = 'form',
  ID_DOCUMENT = 'id_document',
  EMAIL = 'email',
  LEGAL = 'legal',
  TECHNICAL = 'technical',
  OTHER = 'other'
}

export enum ProcessingStatus {
  PENDING = 'pending',
  PROCESSING = 'processing',
  COMPLETED = 'completed',
  FAILED = 'failed'
}

export enum SentimentType {
  POSITIVE = 'positive',
  NEUTRAL = 'neutral',
  NEGATIVE = 'negative',
  MIXED = 'mixed'
}

export enum EmotionType {
  JOY = 'joy',
  SADNESS = 'sadness',
  ANGER = 'anger',
  FEAR = 'fear',
  SURPRISE = 'surprise',
  DISGUST = 'disgust',
  NEUTRAL = 'neutral'
}

export enum RelationshipType {
  IS_A = 'is_a',
  PART_OF = 'part_of',
  RELATED_TO = 'related_to',
  DEPENDS_ON = 'depends_on',
  LEADS_TO = 'leads_to',
  CAUSES = 'causes',
  SOLVES = 'solves',
  SIMILAR_TO = 'similar_to',
  CUSTOM = 'custom'
}

export enum EntityType {
  PERSON = 'person',
  ORGANIZATION = 'organization',
  LOCATION = 'location',
  PRODUCT = 'product',
  SERVICE = 'service',
  CONCEPT = 'concept',
  EVENT = 'event',
  DATE = 'date',
  MONETARY = 'monetary',
  QUANTITY = 'quantity',
  OTHER = 'other'
}
