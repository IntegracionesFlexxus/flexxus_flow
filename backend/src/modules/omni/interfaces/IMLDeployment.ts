/**
 * ML Deployment Interfaces - Sprint 12
 */

import {
  DeploymentEnvironment,
  DeploymentStatus,
  HealthStatus,
  ResourceAllocation,
  AutoScalingConfig
} from '../types/ml.types';

export interface IMLDeployment {
  id: string;
  model_id: string;
  deployment_name: string;
  environment: DeploymentEnvironment;
  endpoint_url?: string;
  deployment_config: Record<string, any>;
  resource_allocation: ResourceAllocation;
  status: DeploymentStatus;
  health_status: HealthStatus;
  traffic_percentage: number;
  auto_scaling_config: AutoScalingConfig;
  deployed_at: Date;
  last_health_check?: Date;
  tenant_id: string;
  created_by?: string;
}

export interface CreateMLDeploymentDTO {
  model_id: string;
  deployment_name: string;
  environment: DeploymentEnvironment;
  deployment_config?: Record<string, any>;
  resource_allocation?: ResourceAllocation;
  traffic_percentage?: number;
  auto_scaling_config?: AutoScalingConfig;
}

export interface UpdateMLDeploymentDTO {
  deployment_name?: string;
  deployment_config?: Record<string, any>;
  resource_allocation?: ResourceAllocation;
  status?: DeploymentStatus;
  health_status?: HealthStatus;
  traffic_percentage?: number;
  auto_scaling_config?: AutoScalingConfig;
}
