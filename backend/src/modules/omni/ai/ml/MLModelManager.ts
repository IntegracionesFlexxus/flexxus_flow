import { injectable, inject } from 'inversify';
import { v4 as uuidv4 } from 'uuid';
import { BaseRepository } from '../../../shared/repositories/BaseRepository';
import { DatabaseService } from '../../../shared/services/DatabaseService';
import { IMLModel, IMLExperiment, IModelDeployment, ITrainingJob } from './interfaces/IMLModel';
import { Logger } from '../../../shared/utils/Logger';
import { EventEmitter } from 'events';

@injectable()
export class MLModelManager extends EventEmitter {
  private readonly logger = new Logger('MLModelManager');

  constructor(
    @inject('DatabaseService') private databaseService: DatabaseService
  ) {
    super();
  }

  async createModel(tenantId: string, modelData: Partial<IMLModel>, createdBy: string): Promise<IMLModel> {
    try {
      const modelId = uuidv4();
      const now = new Date();

      const model: IMLModel = {
        id: modelId,
        tenant_id: tenantId,
        name: modelData.name!,
        description: modelData.description,
        model_type: modelData.model_type!,
        framework: modelData.framework!,
        version: modelData.version || '1.0.0',
        status: 'training',
        model_config: modelData.model_config || {},
        metrics: {},
        feature_schema: modelData.feature_schema || {},
        artifacts_path: modelData.artifacts_path,
        model_size_mb: modelData.model_size_mb,
        training_dataset_id: modelData.training_dataset_id,
        validation_dataset_id: modelData.validation_dataset_id,
        deployment_config: modelData.deployment_config,
        created_by: createdBy,
        created_at: now,
        updated_at: now
      };

      const query = `
        INSERT INTO ml_models (
          id, tenant_id, name, description, model_type, framework, version,
          status, model_config, metrics, feature_schema, artifacts_path,
          model_size_mb, training_dataset_id, validation_dataset_id,
          deployment_config, created_by, created_at, updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19)
        RETURNING *
      `;

      const result = await this.databaseService.executeQuery('omni_db', query, [
        model.id, model.tenant_id, model.name, model.description, model.model_type,
        model.framework, model.version, model.status, JSON.stringify(model.model_config),
        JSON.stringify(model.metrics), JSON.stringify(model.feature_schema),
        model.artifacts_path, model.model_size_mb, model.training_dataset_id,
        model.validation_dataset_id, JSON.stringify(model.deployment_config),
        model.created_by, model.created_at, model.updated_at
      ]);

      this.emit('modelCreated', { tenantId, modelId, model });
      this.logger.info(`ML model created: ${modelId} for tenant: ${tenantId}`);

      return this.parseModelFromDb(result.rows[0]);
    } catch (error) {
      this.logger.error('Error creating ML model:', error);
      throw error;
    }
  }

  async getModel(tenantId: string, modelId: string): Promise<IMLModel | null> {
    try {
      const query = 'SELECT * FROM ml_models WHERE id = $1 AND tenant_id = $2';
      const result = await this.databaseService.executeQuery('omni_db', query, [modelId, tenantId]);

      if (result.rows.length === 0) return null;
      return this.parseModelFromDb(result.rows[0]);
    } catch (error) {
      this.logger.error('Error getting ML model:', error);
      throw error;
    }
  }

  async updateModelStatus(tenantId: string, modelId: string, status: IMLModel['status'], metrics?: Record<string, number>): Promise<void> {
    try {
      let query = 'UPDATE ml_models SET status = $1, updated_at = NOW()';
      const params = [status];

      if (metrics) {
        query += ', metrics = $' + (params.length + 1);
        params.push(JSON.stringify(metrics));
      }

      if (status === 'deployed') {
        query += ', deployed_at = NOW()';
      } else if (status === 'archived') {
        query += ', archived_at = NOW()';
      }

      query += ' WHERE id = $' + (params.length + 1) + ' AND tenant_id = $' + (params.length + 2);
      params.push(modelId, tenantId);

      await this.databaseService.executeQuery('omni_db', query, params);

      this.emit('modelStatusUpdated', { tenantId, modelId, status, metrics });
      this.logger.info(`Model status updated: ${modelId} -> ${status}`);
    } catch (error) {
      this.logger.error('Error updating model status:', error);
      throw error;
    }
  }

  async listModels(tenantId: string, filters?: {
    status?: IMLModel['status'];
    model_type?: string;
    framework?: string;
    limit?: number;
    offset?: number;
  }): Promise<{ models: IMLModel[]; total: number }> {
    try {
      let whereClause = 'WHERE tenant_id = $1';
      const params = [tenantId];
      let paramCount = 1;

      if (filters?.status) {
        whereClause += ` AND status = $${++paramCount}`;
        params.push(filters.status);
      }

      if (filters?.model_type) {
        whereClause += ` AND model_type = $${++paramCount}`;
        params.push(filters.model_type);
      }

      if (filters?.framework) {
        whereClause += ` AND framework = $${++paramCount}`;
        params.push(filters.framework);
      }

      const countQuery = `SELECT COUNT(*) FROM ml_models ${whereClause}`;
      const countResult = await this.databaseService.executeQuery('omni_db', countQuery, params);
      const total = parseInt(countResult.rows[0].count);

      let query = `SELECT * FROM ml_models ${whereClause} ORDER BY created_at DESC`;

      if (filters?.limit) {
        query += ` LIMIT $${++paramCount}`;
        params.push(filters.limit);
      }

      if (filters?.offset) {
        query += ` OFFSET $${++paramCount}`;
        params.push(filters.offset);
      }

      const result = await this.databaseService.executeQuery('omni_db', query, params);
      const models = result.rows.map(row => this.parseModelFromDb(row));

      return { models, total };
    } catch (error) {
      this.logger.error('Error listing ML models:', error);
      throw error;
    }
  }

  async createExperiment(tenantId: string, experimentData: Partial<IMLExperiment>, createdBy: string): Promise<IMLExperiment> {
    try {
      const experimentId = uuidv4();
      const now = new Date();

      const experiment: IMLExperiment = {
        id: experimentId,
        tenant_id: tenantId,
        name: experimentData.name!,
        description: experimentData.description,
        model_type: experimentData.model_type!,
        status: 'running',
        parameters: experimentData.parameters || {},
        metrics: {},
        artifacts_path: experimentData.artifacts_path,
        start_time: now,
        created_by: createdBy
      };

      const query = `
        INSERT INTO ml_experiments (
          id, tenant_id, name, description, model_type, status,
          parameters, metrics, artifacts_path, start_time, created_by
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
        RETURNING *
      `;

      const result = await this.databaseService.executeQuery('omni_db', query, [
        experiment.id, experiment.tenant_id, experiment.name, experiment.description,
        experiment.model_type, experiment.status, JSON.stringify(experiment.parameters),
        JSON.stringify(experiment.metrics), experiment.artifacts_path,
        experiment.start_time, experiment.created_by
      ]);

      this.emit('experimentCreated', { tenantId, experimentId, experiment });
      this.logger.info(`ML experiment created: ${experimentId} for tenant: ${tenantId}`);

      return this.parseExperimentFromDb(result.rows[0]);
    } catch (error) {
      this.logger.error('Error creating ML experiment:', error);
      throw error;
    }
  }

  async deployModel(tenantId: string, modelId: string, deploymentConfig: {
    deployment_name: string;
    environment: 'development' | 'staging' | 'production';
    scaling_config: Record<string, any>;
    resource_allocation: Record<string, any>;
    health_check_config: Record<string, any>;
  }): Promise<IModelDeployment> {
    try {
      const deploymentId = uuidv4();
      const now = new Date();

      const deployment: IModelDeployment = {
        id: deploymentId,
        tenant_id: tenantId,
        model_id: modelId,
        deployment_name: deploymentConfig.deployment_name,
        environment: deploymentConfig.environment,
        scaling_config: deploymentConfig.scaling_config,
        resource_allocation: deploymentConfig.resource_allocation,
        health_check_config: deploymentConfig.health_check_config,
        status: 'deploying',
        deployment_time: now
      };

      const query = `
        INSERT INTO ml_deployments (
          id, tenant_id, model_id, deployment_name, environment,
          scaling_config, resource_allocation, health_check_config,
          status, deployment_time
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
        RETURNING *
      `;

      const result = await this.databaseService.executeQuery('omni_db', query, [
        deployment.id, deployment.tenant_id, deployment.model_id,
        deployment.deployment_name, deployment.environment,
        JSON.stringify(deployment.scaling_config),
        JSON.stringify(deployment.resource_allocation),
        JSON.stringify(deployment.health_check_config),
        deployment.status, deployment.deployment_time
      ]);

      await this.updateModelStatus(tenantId, modelId, 'deployed');

      this.emit('modelDeployed', { tenantId, modelId, deploymentId, deployment });
      this.logger.info(`Model deployed: ${modelId} -> ${deploymentId}`);

      return this.parseDeploymentFromDb(result.rows[0]);
    } catch (error) {
      this.logger.error('Error deploying model:', error);
      throw error;
    }
  }

  async createTrainingJob(tenantId: string, jobData: Partial<ITrainingJob>): Promise<ITrainingJob> {
    try {
      const jobId = uuidv4();
      const now = new Date();

      const job: ITrainingJob = {
        id: jobId,
        tenant_id: tenantId,
        experiment_id: jobData.experiment_id!,
        model_id: jobData.model_id,
        job_type: jobData.job_type!,
        status: 'queued',
        config: jobData.config || {},
        progress_percentage: 0,
        start_time: now
      };

      const query = `
        INSERT INTO ml_training_jobs (
          id, tenant_id, experiment_id, model_id, job_type,
          status, config, progress_percentage, start_time
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        RETURNING *
      `;

      const result = await this.databaseService.executeQuery('omni_db', query, [
        job.id, job.tenant_id, job.experiment_id, job.model_id,
        job.job_type, job.status, JSON.stringify(job.config),
        job.progress_percentage, job.start_time
      ]);

      this.emit('trainingJobCreated', { tenantId, jobId: job.id, job });
      this.logger.info(`Training job created: ${job.id} for tenant: ${tenantId}`);

      return this.parseTrainingJobFromDb(result.rows[0]);
    } catch (error) {
      this.logger.error('Error creating training job:', error);
      throw error;
    }
  }

  async updateTrainingJobProgress(tenantId: string, jobId: string, progress: number, logs?: string): Promise<void> {
    try {
      let query = 'UPDATE ml_training_jobs SET progress_percentage = $1';
      const params = [progress];

      if (logs) {
        query += ', logs = $2 WHERE id = $3 AND tenant_id = $4';
        params.push(logs, jobId, tenantId);
      } else {
        query += ' WHERE id = $2 AND tenant_id = $3';
        params.push(jobId, tenantId);
      }

      await this.databaseService.executeQuery('omni_db', query, params);

      this.emit('trainingJobProgress', { tenantId, jobId, progress });
    } catch (error) {
      this.logger.error('Error updating training job progress:', error);
      throw error;
    }
  }

  private parseModelFromDb(row: any): IMLModel {
    return {
      ...row,
      model_config: typeof row.model_config === 'string' ? JSON.parse(row.model_config) : row.model_config,
      metrics: typeof row.metrics === 'string' ? JSON.parse(row.metrics) : row.metrics,
      feature_schema: typeof row.feature_schema === 'string' ? JSON.parse(row.feature_schema) : row.feature_schema,
      deployment_config: row.deployment_config && typeof row.deployment_config === 'string'
        ? JSON.parse(row.deployment_config) : row.deployment_config
    };
  }

  private parseExperimentFromDb(row: any): IMLExperiment {
    return {
      ...row,
      parameters: typeof row.parameters === 'string' ? JSON.parse(row.parameters) : row.parameters,
      metrics: typeof row.metrics === 'string' ? JSON.parse(row.metrics) : row.metrics
    };
  }

  private parseDeploymentFromDb(row: any): IModelDeployment {
    return {
      ...row,
      scaling_config: typeof row.scaling_config === 'string' ? JSON.parse(row.scaling_config) : row.scaling_config,
      resource_allocation: typeof row.resource_allocation === 'string' ? JSON.parse(row.resource_allocation) : row.resource_allocation,
      health_check_config: typeof row.health_check_config === 'string' ? JSON.parse(row.health_check_config) : row.health_check_config
    };
  }

  private parseTrainingJobFromDb(row: any): ITrainingJob {
    return {
      ...row,
      config: typeof row.config === 'string' ? JSON.parse(row.config) : row.config,
      resource_usage: row.resource_usage && typeof row.resource_usage === 'string'
        ? JSON.parse(row.resource_usage) : row.resource_usage
    };
  }
}