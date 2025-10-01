/**
 * ML Types - Sprint 12
 * Type definitions for Machine Learning models and operations
 */

export enum MLModelType {
  CLASSIFICATION = 'classification',
  REGRESSION = 'regression',
  CLUSTERING = 'clustering',
  NLP = 'nlp',
  COMPUTER_VISION = 'computer_vision',
  RECOMMENDATION = 'recommendation',
  TIME_SERIES = 'time_series',
  ANOMALY_DETECTION = 'anomaly_detection',
  REINFORCEMENT_LEARNING = 'reinforcement_learning'
}

export enum MLFramework {
  TENSORFLOW = 'tensorflow',
  PYTORCH = 'pytorch',
  SCIKIT_LEARN = 'scikit_learn',
  XGBOOST = 'xgboost',
  LIGHTGBM = 'lightgbm',
  TRANSFORMERS = 'transformers',
  SPACY = 'spacy',
  OPENCV = 'opencv',
  CUSTOM = 'custom'
}

export enum MLModelStatus {
  DRAFT = 'draft',
  TRAINING = 'training',
  VALIDATION = 'validation',
  TESTING = 'testing',
  DEPLOYED = 'deployed',
  DEPRECATED = 'deprecated',
  FAILED = 'failed',
  ARCHIVED = 'archived'
}

export enum ExperimentType {
  TRAINING = 'training',
  VALIDATION = 'validation',
  TESTING = 'testing',
  TUNING = 'tuning',
  DEPLOYMENT = 'deployment'
}

export enum ExperimentStatus {
  RUNNING = 'running',
  COMPLETED = 'completed',
  FAILED = 'failed',
  CANCELLED = 'cancelled'
}

export enum FeatureDataType {
  NUMERIC = 'numeric',
  CATEGORICAL = 'categorical',
  TEXT = 'text',
  DATETIME = 'datetime',
  BOOLEAN = 'boolean',
  ARRAY = 'array',
  EMBEDDING = 'embedding'
}

export enum DeploymentEnvironment {
  DEV = 'dev',
  STAGING = 'staging',
  PRODUCTION = 'production',
  CANARY = 'canary',
  BLUE_GREEN = 'blue_green'
}

export enum DeploymentStatus {
  DEPLOYING = 'deploying',
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  FAILED = 'failed',
  ROLLING_BACK = 'rolling_back'
}

export enum HealthStatus {
  HEALTHY = 'healthy',
  UNHEALTHY = 'unhealthy',
  DEGRADED = 'degraded',
  UNKNOWN = 'unknown'
}

export enum BatchJobStatus {
  QUEUED = 'queued',
  RUNNING = 'running',
  COMPLETED = 'completed',
  FAILED = 'failed',
  CANCELLED = 'cancelled'
}

export enum DriftDetectionMethod {
  KOLMOGOROV_SMIRNOV = 'kolmogorov_smirnov',
  CHI_SQUARE = 'chi_square',
  POPULATION_STABILITY_INDEX = 'population_stability_index',
  JENSEN_SHANNON = 'jensen_shannon',
  WASSERSTEIN = 'wasserstein',
  STATISTICAL_TEST = 'statistical_test'
}

export enum ABTestStatus {
  DRAFT = 'draft',
  RUNNING = 'running',
  COMPLETED = 'completed',
  STOPPED = 'stopped',
  ARCHIVED = 'archived'
}

export interface PerformanceMetrics {
  accuracy?: number;
  precision?: number;
  recall?: number;
  f1_score?: number;
  auc?: number;
  rmse?: number;
  mae?: number;
  r2_score?: number;
  confusion_matrix?: number[][];
  latency_ms?: number;
  throughput?: number;
}

export interface HyperParameters {
  learning_rate?: number;
  batch_size?: number;
  epochs?: number;
  [key: string]: any;
}

export interface ModelConfiguration {
  input_shape?: number[];
  output_shape?: number[];
  layers?: any[];
  optimizer?: string;
  loss_function?: string;
  [key: string]: any;
}

export interface TrainingDataInfo {
  dataset_name?: string;
  dataset_size?: number;
  train_split?: number;
  validation_split?: number;
  test_split?: number;
  features?: string[];
  target_variable?: string;
  [key: string]: any;
}

export interface ResourceAllocation {
  cpu_cores?: number;
  memory_mb?: number;
  gpu_enabled?: boolean;
  gpu_count?: number;
  storage_gb?: number;
  [key: string]: any;
}

export interface AutoScalingConfig {
  enabled: boolean;
  min_instances: number;
  max_instances: number;
  target_cpu_utilization?: number;
  target_memory_utilization?: number;
  scale_up_threshold?: number;
  scale_down_threshold?: number;
  cooldown_period_seconds?: number;
}
