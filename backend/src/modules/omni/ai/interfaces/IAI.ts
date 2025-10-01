/**
 * AI Interfaces - Sprint 10
 * Core interfaces for AI-powered features
 */

export interface IAIModel {
  id: string;
  company_id: string;
  model_type: AIModelType;
  model_name: string;
  provider: AIProvider;
  version?: string;
  config: Record<string, any>;
  performance_metrics?: IModelMetrics;
  is_active: boolean;
  last_used_at?: Date;
}

export type AIModelType = 'sentiment' | 'intent' | 'summary' | 'translation' | 'suggestion';
export type AIProvider = 'openai' | 'anthropic' | 'local' | 'mock';

export interface IModelMetrics {
  accuracy: number;
  precision: number;
  recall: number;
  f1_score: number;
  latency_ms: number;
  requests_count: number;
  errors_count: number;
}

export interface IAIAnalysisResult {
  conversation_id: string;
  analysis_type: string;
  sentiment?: ISentimentAnalysis;
  intent?: IIntentDetection;
  summary?: ISummary;
  urgency_level?: number;
  language_detected?: string;
  emotions?: Record<string, number>;
  key_topics?: string[];
  action_items?: IActionItem[];
  metadata?: Record<string, any>;
  processing_time_ms: number;
}

export interface ISentimentAnalysis {
  score: number; // -1.0 to 1.0
  label: 'positive' | 'neutral' | 'negative';
  confidence: number; // 0.0 to 1.0
  emotions?: {
    joy?: number;
    anger?: number;
    fear?: number;
    sadness?: number;
    surprise?: number;
    disgust?: number;
  };
}

export interface IIntentDetection {
  intent: string;
  confidence: number;
  entities: IEntity[];
  suggested_actions: string[];
  requires_escalation?: boolean;
}

export interface IEntity {
  type: string;
  value: string;
  confidence: number;
  position?: {
    start: number;
    end: number;
  };
}

export interface ISummary {
  text: string;
  bullet_points: string[];
  key_points: string[];
  word_count: number;
  estimated_reading_time: number;
}

export interface IActionItem {
  description: string;
  priority: 'low' | 'medium' | 'high';
  assignee?: string;
  due_date?: Date;
  status?: 'pending' | 'in_progress' | 'completed';
}

export interface ISmartSuggestion {
  id?: string;
  conversation_id?: string;
  message_id?: string;
  type: SuggestionType;
  content: string;
  confidence: number;
  context: Record<string, any>;
  reasoning?: string;
  alternatives?: string[];
  was_accepted?: boolean;
  was_helpful?: boolean;
  feedback?: string;
}

export type SuggestionType = 'response' | 'action' | 'resource' | 'escalation' | 'template';

export interface ITranslation {
  original_text: string;
  translated_text: string;
  source_language: string;
  target_language: string;
  confidence: number;
}

export interface IAIService {
  analyzeSentiment(text: string, context?: any): Promise<ISentimentAnalysis>;
  detectIntent(text: string, context?: any): Promise<IIntentDetection>;
  generateSummary(messages: string[], options?: any): Promise<ISummary>;
  suggestResponse(context: any): Promise<ISmartSuggestion[]>;
  translate(text: string, targetLanguage: string): Promise<ITranslation>;
  analyzeConversation(conversationId: string): Promise<IAIAnalysisResult>;
}

export interface ITrainingData {
  id: string;
  input: string;
  expected_output: any;
  actual_output?: any;
  feedback?: 'correct' | 'incorrect' | 'partial';
  metadata?: Record<string, any>;
  created_at: Date;
}

export interface IModelTrainer {
  collectTrainingData(conversationId: string): Promise<ITrainingData[]>;
  trainModel(modelType: AIModelType, data: ITrainingData[]): Promise<void>;
  evaluateModel(modelType: AIModelType): Promise<IModelMetrics>;
  improveModel(modelType: AIModelType, feedback: ITrainingData[]): Promise<void>;
}

export interface IAIProcessor {
  processMessage(message: string, context?: any): Promise<IAIAnalysisResult>;
  processConversation(conversationId: string): Promise<IAIAnalysisResult>;
  generateSuggestions(context: any): Promise<ISmartSuggestion[]>;
  monitorQuality(conversationId: string): Promise<number>;
}

export interface IAIConfig {
  enabled: boolean;
  providers: {
    [key in AIProvider]?: {
      api_key?: string;
      endpoint?: string;
      model?: string;
      max_tokens?: number;
      temperature?: number;
      timeout?: number;
    };
  };
  features: {
    sentiment_analysis: boolean;
    intent_detection: boolean;
    auto_suggestions: boolean;
    summarization: boolean;
    translation: boolean;
    quality_monitoring: boolean;
  };
  thresholds: {
    sentiment_alert: number;
    urgency_escalation: number;
    confidence_minimum: number;
  };
}