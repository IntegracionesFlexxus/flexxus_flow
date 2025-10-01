export interface IMLModel {
  id: string;
  tenant_id: string;
  name: string;
  description?: string;
  model_type: 'classification' | 'regression' | 'clustering' | 'neural_network' | 'transformer' | 'computer_vision' | 'custom';
  framework: 'tensorflow' | 'pytorch' | 'scikit_learn' | 'xgboost' | 'lightgbm' | 'onnx' | 'custom';
  version: string;
  status: 'training' | 'trained' | 'deployed' | 'archived' | 'failed';
  model_config: Record<string, any>;
  metrics: Record<string, number>;
  feature_schema: Record<string, any>;
  artifacts_path?: string;
  model_size_mb?: number;
  training_dataset_id?: string;
  validation_dataset_id?: string;
  deployment_config?: Record<string, any>;
  created_by: string;
  created_at: Date;
  updated_at: Date;
  deployed_at?: Date;
  archived_at?: Date;
}

export interface IMLExperiment {
  id: string;
  tenant_id: string;
  name: string;
  description?: string;
  model_type: string;
  status: 'running' | 'completed' | 'failed' | 'cancelled';
  parameters: Record<string, any>;
  metrics: Record<string, number>;
  artifacts_path?: string;
  start_time: Date;
  end_time?: Date;
  created_by: string;
}

export interface IFeatureStore {
  id: string;
  tenant_id: string;
  feature_group: string;
  feature_name: string;
  feature_type: 'numerical' | 'categorical' | 'text' | 'image' | 'audio' | 'timestamp';
  description?: string;
  data_source: string;
  transformation_logic?: string;
  validation_rules?: Record<string, any>;
  statistics?: Record<string, any>;
  created_at: Date;
  updated_at: Date;
}

export interface IMLPrediction {
  id: string;
  tenant_id: string;
  model_id: string;
  input_data: Record<string, any>;
  prediction: Record<string, any>;
  confidence_score?: number;
  prediction_time: Date;
  request_id?: string;
  batch_id?: string;
  feedback_score?: number;
  actual_outcome?: Record<string, any>;
}

export interface IModelDeployment {
  id: string;
  tenant_id: string;
  model_id: string;
  deployment_name: string;
  environment: 'development' | 'staging' | 'production';
  endpoint_url?: string;
  scaling_config: Record<string, any>;
  resource_allocation: Record<string, any>;
  health_check_config: Record<string, any>;
  status: 'deploying' | 'running' | 'stopped' | 'failed';
  deployment_time: Date;
  last_health_check?: Date;
  error_logs?: string;
}

export interface ITrainingJob {
  id: string;
  tenant_id: string;
  experiment_id: string;
  model_id?: string;
  job_type: 'training' | 'retraining' | 'evaluation' | 'hyperparameter_tuning';
  status: 'queued' | 'running' | 'completed' | 'failed' | 'cancelled';
  config: Record<string, any>;
  progress_percentage: number;
  logs?: string;
  resource_usage?: Record<string, any>;
  start_time: Date;
  end_time?: Date;
  error_message?: string;
}