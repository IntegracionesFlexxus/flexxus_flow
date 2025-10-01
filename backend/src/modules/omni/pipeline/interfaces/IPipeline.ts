/**
 * Pipeline Interfaces - Sprint 08
 * Core interfaces for data pipelines and ETL
 */

export interface IPipeline {
  id: string;
  company_id: string;
  name: string;
  description?: string;
  type: 'etl' | 'streaming' | 'batch' | 'realtime';
  source_config: ISourceConfig;
  transform_config: ITransformConfig;
  destination_config: IDestinationConfig;
  schedule?: string; // Cron expression
  is_active: boolean;
  last_run_at?: Date;
  next_run_at?: Date;
  metadata?: any;
  created_at: Date;
  updated_at: Date;
}

export interface ISourceConfig {
  type: 'database' | 'api' | 'file' | 'stream';
  config: any;
}

export interface ITransformConfig {
  steps: ITransformStep[];
}

export interface ITransformStep {
  type: string;
  params: any;
}

export interface IDestinationConfig {
  type: 'database' | 'cache' | 'webhook' | 'file';
  config: any;
}

export interface IPipelineExecution {
  id: string;
  pipeline_id: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  started_at: Date;
  completed_at?: Date;
  parameters?: any;
  logs: IExecutionLog[];
  metrics: IExecutionMetrics;
  error?: string;
}

export interface IExecutionLog {
  timestamp: Date;
  level: 'info' | 'warn' | 'error';
  message: string;
}

export interface IExecutionMetrics {
  rows_processed: number;
  rows_failed: number;
  duration_ms: number;
  memory_used_mb?: number;
  cpu_usage_percent?: number;
}

export interface IETLJob {
  id: string;
  pipeline_id: string;
  type: 'extract' | 'transform' | 'load';
  status: 'queued' | 'processing' | 'completed' | 'failed';
  data?: any;
  error?: string;
  created_at: Date;
  processed_at?: Date;
}

export interface ITransformation {
  name: string;
  type: 'filter' | 'map' | 'reduce' | 'aggregation' | 'join' | 'custom';
  execute: (data: any[], params: any) => Promise<any[]>;
}

export interface IDataQuality {
  pipeline_id: string;
  execution_id: string;
  checks: IQualityCheck[];
  overall_score: number;
  timestamp: Date;
}

export interface IQualityCheck {
  name: string;
  type: 'completeness' | 'uniqueness' | 'validity' | 'consistency';
  passed: boolean;
  score: number;
  details: any;
}

export interface IDataLineage {
  entity_id: string;
  entity_type: string;
  source: string;
  transformations: string[];
  destination: string;
  pipeline_id: string;
  execution_id: string;
  timestamp: Date;
}