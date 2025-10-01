/**
 * ML Model Interfaces - Sprint 12
 */

import {
  MLModelType,
  MLFramework,
  MLModelStatus,
  PerformanceMetrics,
  HyperParameters,
  ModelConfiguration,
  TrainingDataInfo
} from '../types/ml.types';

export interface IMLModel {
  id: string;
  tenant_id: string;
  name: string;
  display_name: string;
  description?: string;
  model_type: MLModelType;
  framework: MLFramework;
  version: string;
  status: MLModelStatus;
  configuration: ModelConfiguration;
  hyperparameters: HyperParameters;
  performance_metrics: PerformanceMetrics;
  model_artifacts_path?: string;
  model_size_bytes?: number;
  training_data_info: TrainingDataInfo;
  created_by?: string;
  created_at: Date;
  updated_at: Date;
  deployed_at?: Date;
  retired_at?: Date;
}

export interface CreateMLModelDTO {
  name: string;
  display_name: string;
  description?: string;
  model_type: MLModelType;
  framework: MLFramework;
  version: string;
  configuration?: ModelConfiguration;
  hyperparameters?: HyperParameters;
  training_data_info?: TrainingDataInfo;
}

export interface UpdateMLModelDTO {
  display_name?: string;
  description?: string;
  status?: MLModelStatus;
  configuration?: ModelConfiguration;
  hyperparameters?: HyperParameters;
  performance_metrics?: PerformanceMetrics;
  model_artifacts_path?: string;
  model_size_bytes?: number;
}
