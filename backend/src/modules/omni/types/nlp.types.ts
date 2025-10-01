/**
 * NLP Types - Sprint 12
 * Type definitions for Natural Language Processing features
 */

export enum NLPModelType {
  INTENT_CLASSIFICATION = 'intent_classification',
  ENTITY_EXTRACTION = 'entity_extraction',
  SENTIMENT_ANALYSIS = 'sentiment_analysis',
  TEXT_CLASSIFICATION = 'text_classification',
  LANGUAGE_DETECTION = 'language_detection',
  SUMMARIZATION = 'summarization',
  QUESTION_ANSWERING = 'question_answering',
  TEXT_GENERATION = 'text_generation',
  EMBEDDING = 'embedding'
}

export enum NLPProvider {
  OPENAI = 'openai',
  ANTHROPIC = 'anthropic',
  HUGGINGFACE = 'huggingface',
  GOOGLE = 'google',
  AWS = 'aws',
  AZURE = 'azure',
  LOCAL = 'local'
}

export enum ContextType {
  USER_PROFILE = 'user_profile',
  CONVERSATION_HISTORY = 'conversation_history',
  INTENT_CONTEXT = 'intent_context',
  ENTITY_CONTEXT = 'entity_context',
  TOPIC_CONTEXT = 'topic_context',
  EMOTIONAL_CONTEXT = 'emotional_context'
}

export enum PatternType {
  REGEX = 'regex',
  KEYWORD = 'keyword',
  SEMANTIC = 'semantic',
  ML_TRAINED = 'ml_trained'
}

export enum PersonalizationLevel {
  NONE = 'none',
  BASIC = 'basic',
  STANDARD = 'standard',
  ADVANCED = 'advanced',
  CUSTOM = 'custom'
}

export interface NLPModelConfig {
  confidence_threshold?: number;
  max_tokens?: number;
  temperature?: number;
  top_p?: number;
  top_k?: number;
  model_version?: string;
  language?: string;
  [key: string]: any;
}

export interface NLPPerformanceMetrics {
  accuracy?: number;
  precision?: number;
  recall?: number;
  f1_score?: number;
  latency_ms?: number;
  requests_count?: number;
  errors_count?: number;
  [key: string]: any;
}

export interface EntityData {
  entity_type: string;
  entity_value: string;
  confidence: number;
  start_position?: number;
  end_position?: number;
  metadata?: Record<string, any>;
}

export interface IntentData {
  intent_name: string;
  confidence: number;
  entities?: EntityData[];
  context?: Record<string, any>;
}

export interface SentimentData {
  sentiment: 'positive' | 'neutral' | 'negative';
  score: number;
  confidence: number;
  emotions?: Record<string, number>;
}

export interface ContextData {
  context_type: ContextType;
  data: Record<string, any>;
  relevance_score?: number;
  expires_at?: Date;
}

export interface GenerationConfig {
  template_variables?: string[];
  max_length?: number;
  min_length?: number;
  temperature?: number;
  top_p?: number;
  stop_sequences?: string[];
  personalization_level?: PersonalizationLevel;
  [key: string]: any;
}
