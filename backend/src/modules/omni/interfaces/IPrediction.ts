/**
 * Prediction Interfaces - Sprint 12
 */

import { BatchJobStatus } from '../types/ml.types';

export interface IMLPrediction {
  id: string;
  deployment_id: string;
  request_id?: string;
  input_features: Record<string, any>;
  prediction_result: Record<string, any>;
  confidence_score?: number;
  processing_time_ms?: number;
  model_version?: string;
  tenant_id: string;
  created_at: Date;
}

export interface CreatePredictionDTO {
  deployment_id: string;
  request_id?: string;
  input_features: Record<string, any>;
}

export interface PredictionResponse {
  prediction_id: string;
  prediction_result: Record<string, any>;
  confidence_score?: number;
  processing_time_ms: number;
  model_version: string;
}

export interface IBatchPredictionJob {
  id: string;
  deployment_id: string;
  job_name: string;
  input_data_path: string;
  output_data_path?: string;
  status: BatchJobStatus;
  total_records?: number;
  processed_records: number;
  failed_records: number;
  started_at?: Date;
  completed_at?: Date;
  error_message?: string;
  tenant_id: string;
  created_by?: string;
}

export interface CreateBatchPredictionJobDTO {
  deployment_id: string;
  job_name: string;
  input_data_path: string;
  output_data_path?: string;
}
