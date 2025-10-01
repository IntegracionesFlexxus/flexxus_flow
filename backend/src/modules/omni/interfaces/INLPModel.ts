/**
 * NLP Model Interfaces - Sprint 12
 */

import {
  NLPModelType,
  NLPProvider,
  NLPModelConfig,
  NLPPerformanceMetrics,
  ContextType,
  PatternType,
  PersonalizationLevel
} from '../types/nlp.types';

export interface INLPModel {
  id: string;
  tenant_id: string;
  model_name: string;
  model_type: NLPModelType;
  language: string;
  provider: NLPProvider;
  model_config: NLPModelConfig;
  performance_metrics: NLPPerformanceMetrics;
  is_active: boolean;
  created_at: Date;
  updated_at: Date;
}

export interface CreateNLPModelDTO {
  model_name: string;
  model_type: NLPModelType;
  language?: string;
  provider: NLPProvider;
  model_config?: NLPModelConfig;
}

export interface UpdateNLPModelDTO {
  model_name?: string;
  model_config?: NLPModelConfig;
  performance_metrics?: NLPPerformanceMetrics;
  is_active?: boolean;
}

export interface IConversationContext {
  id: string;
  conversation_id: string;
  context_type: ContextType;
  context_data: Record<string, any>;
  context_summary?: string;
  relevance_score: number;
  expires_at?: Date;
  tenant_id: string;
  created_at: Date;
  updated_at: Date;
}

export interface IIntentPattern {
  id: string;
  tenant_id: string;
  intent_name: string;
  pattern: string;
  pattern_type: PatternType;
  confidence_threshold: number;
  training_examples: string[];
  is_active: boolean;
  created_at: Date;
  updated_at: Date;
}

export interface IAIResponseTemplate {
  id: string;
  tenant_id: string;
  template_name: string;
  intent?: string;
  context_requirements: Record<string, any>;
  template_content: string;
  generation_config: Record<string, any>;
  personalization_level: PersonalizationLevel;
  is_active: boolean;
  usage_count: number;
  effectiveness_score?: number;
  created_at: Date;
  updated_at: Date;
}
