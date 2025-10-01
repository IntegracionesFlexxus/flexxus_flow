/**
 * Service Mesh Communicator - Sprint 11
 * Manages inter-service communication with service discovery and load balancing
 */

import { injectable, inject } from 'inversify';
import { TYPES } from '@/container/types';
import { Pool } from 'pg';
import { LoggerFactory } from '@/shared/services/logger/LoggerService';
import { EventEmitter } from 'events';
import axios, { AxiosInstance, AxiosRequestConfig, AxiosResponse } from 'axios';

export interface IServiceInstance {
  id: string;
  service_name: string;
  service_version: string;
  instance_id: string;
  host: string;
  port: number;
  protocol: 'http' | 'https' | 'grpc' | 'tcp' | 'ws' | 'wss';
  health_check_url?: string;
  metadata: Record<string, any>;
  status: 'healthy' | 'unhealthy' | 'starting' | 'stopping' | 'unknown';
  last_heartbeat: Date;
  registered_at: Date;
}

export interface IServiceRequest {
  service_name: string;
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  path: string;
  data?: any;
  headers?: Record<string, string>;
  timeout?: number;
  retries?: number;
  circuitBreaker?: boolean;
  loadBalancingStrategy?: 'round_robin' | 'least_connections' | 'weighted' | 'random';
}

export interface IServiceResponse {
  success: boolean;
  data?: any;
  error?: string;
  status_code: number;
  response_time_ms: number;
  instance_used: string;
  attempt_count: number;
}

export interface ILoadBalancerConfig {
  service_name: string;
  algorithm: 'round_robin' | 'least_connections' | 'weighted' | 'ip_hash' | 'least_response_time';
  health_check_interval: number;
  timeout_seconds: number;
  max_retries: number;
  config: Record<string, any>;
}

@injectable()
export class ServiceMeshCommunicator extends EventEmitter {
  private logger: any;
  private serviceRegistry: Map<string, IServiceInstance[]> = new Map();
  private loadBalancerConfigs: Map<string, ILoadBalancerConfig> = new Map();
  private connectionCounts: Map<string, number> = new Map();
  private responseTimeCache: Map<string, number[]> = new Map();
  private roundRobinCounters: Map<string, number> = new Map();
  private httpClients: Map<string, AxiosInstance> = new Map();
  private healthCheckInterval?: NodeJS.Timer;

  constructor(
    @inject(TYPES.OmniConnection) private pool: Pool
  ) {
    super();
    this.logger = LoggerFactory.create({ file: __filename });
    this.startHealthChecking();
  }

  /**
   * Register a service instance
   */
  async registerService(serviceData: Omit<IServiceInstance, 'id' | 'registered_at' | 'last_heartbeat'>): Promise<string> {
    try {
      const query = `
        INSERT INTO service_registry (
          service_name,
          service_version,
          instance_id,
          host,
          port,
          protocol,
          health_check_url,
          metadata,
          status
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        ON CONFLICT (service_name, instance_id)
        DO UPDATE SET
          service_version = EXCLUDED.service_version,
          host = EXCLUDED.host,
          port = EXCLUDED.port,
          protocol = EXCLUDED.protocol,
          health_check_url = EXCLUDED.health_check_url,
          metadata = EXCLUDED.metadata,
          status = EXCLUDED.status,
          last_heartbeat = CURRENT_TIMESTAMP
        RETURNING id;
      `;

      const result = await this.pool.query(query, [
        serviceData.service_name,
        serviceData.service_version,
        serviceData.instance_id,
        serviceData.host,
        serviceData.port,
        serviceData.protocol,
        serviceData.health_check_url,
        JSON.stringify(serviceData.metadata),
        serviceData.status
      ]);

      const serviceId = result.rows[0].id;

      // Refresh service registry cache
      await this.refreshServiceRegistry(serviceData.service_name);

      this.logger.info('Service registered successfully', {
        service_name: serviceData.service_name,
        instance_id: serviceData.instance_id,
        host: serviceData.host,
        port: serviceData.port
      });

      this.emit('service:registered', {
        service_id: serviceId,
        service_name: serviceData.service_name,
        instance_id: serviceData.instance_id
      });

      return serviceId;
    } catch (error: any) {
      this.logger.error('Failed to register service', error);
      throw error;
    }
  }

  /**
   * Deregister a service instance
   */
  async deregisterService(serviceName: string, instanceId: string): Promise<void> {
    try {
      const query = `
        DELETE FROM service_registry
        WHERE service_name = $1 AND instance_id = $2;
      `;

      await this.pool.query(query, [serviceName, instanceId]);

      // Refresh service registry cache
      await this.refreshServiceRegistry(serviceName);

      this.logger.info('Service deregistered successfully', {
        service_name: serviceName,
        instance_id: instanceId
      });

      this.emit('service:deregistered', {
        service_name: serviceName,
        instance_id: instanceId
      });
    } catch (error: any) {
      this.logger.error('Failed to deregister service', error);
      throw error;
    }
  }

  /**
   * Update service heartbeat
   */
  async updateHeartbeat(serviceName: string, instanceId: string, status?: string): Promise<void> {
    try {
      let query = `
        UPDATE service_registry
        SET last_heartbeat = CURRENT_TIMESTAMP
      `;
      const values = [serviceName, instanceId];
      let paramIndex = 3;

      if (status) {
        query += `, status = $${paramIndex}`;
        values.push(status);
        paramIndex++;
      }

      query += ` WHERE service_name = $1 AND instance_id = $2`;

      await this.pool.query(query, values);

      // Update in-memory registry if exists
      const instances = this.serviceRegistry.get(serviceName);
      if (instances) {
        const instance = instances.find(i => i.instance_id === instanceId);
        if (instance) {
          instance.last_heartbeat = new Date();
          if (status) {
            instance.status = status as any;
          }
        }
      }
    } catch (error: any) {
      this.logger.error('Failed to update heartbeat', error);
    }
  }

  /**
   * Discover healthy service instances
   */
  async discoverService(serviceName: string): Promise<IServiceInstance[]> {
    try {
      // Check cache first
      if (this.serviceRegistry.has(serviceName)) {
        const cachedInstances = this.serviceRegistry.get(serviceName)!;
        const healthyInstances = cachedInstances.filter(i => i.status === 'healthy');

        if (healthyInstances.length > 0) {
          return healthyInstances;
        }
      }

      // Refresh from database
      await this.refreshServiceRegistry(serviceName);

      const instances = this.serviceRegistry.get(serviceName) || [];
      return instances.filter(i => i.status === 'healthy');
    } catch (error: any) {
      this.logger.error('Failed to discover service', error);
      return [];
    }
  }

  /**
   * Make a request to a service with load balancing
   */
  async makeRequest(request: IServiceRequest): Promise<IServiceResponse> {
    const startTime = Date.now();
    let lastError: any;
    let attemptCount = 0;
    const maxRetries = request.retries || 3;

    try {
      // Discover available instances
      const instances = await this.discoverService(request.service_name);

      if (instances.length === 0) {
        throw new Error(`No healthy instances found for service: ${request.service_name}`);
      }

      // Attempt request with retries
      while (attemptCount <= maxRetries) {
        attemptCount++;

        try {
          // Select instance using load balancing
          const selectedInstance = await this.selectInstance(
            request.service_name,
            instances,
            request.loadBalancingStrategy
          );

          // Make the actual request
          const response = await this.executeRequest(selectedInstance, request);

          // Update success metrics
          this.updateInstanceMetrics(selectedInstance.instance_id, true, Date.now() - startTime);

          return {
            success: true,
            data: response.data,
            status_code: response.status,
            response_time_ms: Date.now() - startTime,
            instance_used: selectedInstance.instance_id,
            attempt_count: attemptCount
          };
        } catch (error: any) {
          lastError = error;

          // Update failure metrics
          if (instances.length > 0) {
            this.updateInstanceMetrics(instances[0].instance_id, false, Date.now() - startTime);
          }

          // If circuit breaker is enabled and we should break
          if (request.circuitBreaker && this.shouldBreakCircuit(request.service_name)) {
            break;
          }

          // Wait before retry (exponential backoff)
          if (attemptCount <= maxRetries) {
            await this.delay(Math.pow(2, attemptCount - 1) * 1000);
          }
        }
      }

      return {
        success: false,
        error: lastError?.message || 'Service request failed',
        status_code: lastError?.response?.status || 500,
        response_time_ms: Date.now() - startTime,
        instance_used: '',
        attempt_count: attemptCount
      };
    } catch (error: any) {
      this.logger.error('Service request failed', {
        service_name: request.service_name,
        error: error.message,
        attempt_count: attemptCount
      });

      return {
        success: false,
        error: error.message,
        status_code: 500,
        response_time_ms: Date.now() - startTime,
        instance_used: '',
        attempt_count: attemptCount
      };
    }
  }

  /**
   * Configure load balancer for a service
   */
  async configureLoadBalancer(config: ILoadBalancerConfig): Promise<void> {
    try {
      const query = `
        INSERT INTO load_balancer_config (
          service_name,
          algorithm,
          health_check_interval,
          timeout_seconds,
          max_retries,
          config
        ) VALUES ($1, $2, $3, $4, $5, $6)
        ON CONFLICT (service_name)
        DO UPDATE SET
          algorithm = EXCLUDED.algorithm,
          health_check_interval = EXCLUDED.health_check_interval,
          timeout_seconds = EXCLUDED.timeout_seconds,
          max_retries = EXCLUDED.max_retries,
          config = EXCLUDED.config,
          updated_at = CURRENT_TIMESTAMP;
      `;

      await this.pool.query(query, [
        config.service_name,
        config.algorithm,
        config.health_check_interval,
        config.timeout_seconds,
        config.max_retries,
        JSON.stringify(config.config)
      ]);

      // Update in-memory cache
      this.loadBalancerConfigs.set(config.service_name, config);

      this.logger.info('Load balancer configured', {
        service_name: config.service_name,
        algorithm: config.algorithm
      });
    } catch (error: any) {
      this.logger.error('Failed to configure load balancer', error);
      throw error;
    }
  }

  /**
   * Get service health status
   */
  async getServiceHealth(serviceName?: string): Promise<Record<string, any>> {
    try {
      let query = `
        SELECT
          service_name,
          COUNT(*) as total_instances,
          COUNT(CASE WHEN status = 'healthy' THEN 1 END) as healthy_instances,
          COUNT(CASE WHEN status = 'unhealthy' THEN 1 END) as unhealthy_instances,
          AVG(EXTRACT(EPOCH FROM (CURRENT_TIMESTAMP - last_heartbeat))) as avg_heartbeat_age
        FROM service_registry
      `;
      const values: any[] = [];

      if (serviceName) {
        query += ` WHERE service_name = $1`;
        values.push(serviceName);
      }

      query += ` GROUP BY service_name ORDER BY service_name`;

      const result = await this.pool.query(query, values);

      const healthData: Record<string, any> = {};

      result.rows.forEach(row => {
        healthData[row.service_name] = {
          total_instances: parseInt(row.total_instances),
          healthy_instances: parseInt(row.healthy_instances),
          unhealthy_instances: parseInt(row.unhealthy_instances),
          health_percentage: (parseInt(row.healthy_instances) / parseInt(row.total_instances)) * 100,
          avg_heartbeat_age: parseFloat(row.avg_heartbeat_age)
        };
      });

      return healthData;
    } catch (error: any) {
      this.logger.error('Failed to get service health', error);
      return {};
    }
  }

  /**
   * Private helper methods
   */
  private async refreshServiceRegistry(serviceName?: string): Promise<void> {
    try {
      let query = `
        SELECT * FROM service_registry
        WHERE last_heartbeat > (CURRENT_TIMESTAMP - INTERVAL '5 minutes')
      `;
      const values: any[] = [];

      if (serviceName) {
        query += ` AND service_name = $1`;
        values.push(serviceName);
      }

      query += ` ORDER BY service_name, instance_id`;

      const result = await this.pool.query(query, values);

      // Group by service name
      const serviceGroups: Record<string, IServiceInstance[]> = {};

      result.rows.forEach(row => {
        if (!serviceGroups[row.service_name]) {
          serviceGroups[row.service_name] = [];
        }
        serviceGroups[row.service_name].push(row);
      });

      // Update registry
      if (serviceName) {
        if (serviceGroups[serviceName]) {
          this.serviceRegistry.set(serviceName, serviceGroups[serviceName]);
        } else {
          this.serviceRegistry.delete(serviceName);
        }
      } else {
        this.serviceRegistry.clear();
        Object.entries(serviceGroups).forEach(([name, instances]) => {
          this.serviceRegistry.set(name, instances);
        });
      }
    } catch (error: any) {
      this.logger.error('Failed to refresh service registry', error);
    }
  }

  private async selectInstance(
    serviceName: string,
    instances: IServiceInstance[],
    strategy?: string
  ): Promise<IServiceInstance> {
    const config = this.loadBalancerConfigs.get(serviceName);
    const algorithm = strategy || config?.algorithm || 'round_robin';

    switch (algorithm) {
      case 'round_robin':
        return this.selectRoundRobin(serviceName, instances);

      case 'least_connections':
        return this.selectLeastConnections(instances);

      case 'weighted':
        return this.selectWeighted(instances);

      case 'least_response_time':
        return this.selectLeastResponseTime(instances);

      case 'random':
        return instances[Math.floor(Math.random() * instances.length)];

      default:
        return this.selectRoundRobin(serviceName, instances);
    }
  }

  private selectRoundRobin(serviceName: string, instances: IServiceInstance[]): IServiceInstance {
    const counter = this.roundRobinCounters.get(serviceName) || 0;
    const selectedIndex = counter % instances.length;
    this.roundRobinCounters.set(serviceName, counter + 1);
    return instances[selectedIndex];
  }

  private selectLeastConnections(instances: IServiceInstance[]): IServiceInstance {
    let selectedInstance = instances[0];
    let minConnections = this.connectionCounts.get(selectedInstance.instance_id) || 0;

    instances.forEach(instance => {
      const connections = this.connectionCounts.get(instance.instance_id) || 0;
      if (connections < minConnections) {
        selectedInstance = instance;
        minConnections = connections;
      }
    });

    return selectedInstance;
  }

  private selectWeighted(instances: IServiceInstance[]): IServiceInstance {
    // Use CPU/memory from metadata for weighting
    const weights = instances.map(instance => {
      const metadata = instance.metadata || {};
      const cpuWeight = 1 - (metadata.cpu_usage || 0) / 100;
      const memoryWeight = 1 - (metadata.memory_usage || 0) / 100;
      return (cpuWeight + memoryWeight) / 2;
    });

    const totalWeight = weights.reduce((sum, weight) => sum + weight, 0);
    const random = Math.random() * totalWeight;

    let currentWeight = 0;
    for (let i = 0; i < instances.length; i++) {
      currentWeight += weights[i];
      if (random <= currentWeight) {
        return instances[i];
      }
    }

    return instances[0];
  }

  private selectLeastResponseTime(instances: IServiceInstance[]): IServiceInstance {
    let selectedInstance = instances[0];
    let minAvgTime = this.getAverageResponseTime(selectedInstance.instance_id);

    instances.forEach(instance => {
      const avgTime = this.getAverageResponseTime(instance.instance_id);
      if (avgTime < minAvgTime) {
        selectedInstance = instance;
        minAvgTime = avgTime;
      }
    });

    return selectedInstance;
  }

  private getAverageResponseTime(instanceId: string): number {
    const times = this.responseTimeCache.get(instanceId) || [];
    if (times.length === 0) return Number.MAX_VALUE;

    return times.reduce((sum, time) => sum + time, 0) / times.length;
  }

  private async executeRequest(
    instance: IServiceInstance,
    request: IServiceRequest
  ): Promise<AxiosResponse> {
    // Get or create HTTP client for this instance
    const clientKey = `${instance.host}:${instance.port}`;
    let client = this.httpClients.get(clientKey);

    if (!client) {
      client = axios.create({
        baseURL: `${instance.protocol}://${instance.host}:${instance.port}`,
        timeout: request.timeout || 30000,
        headers: {
          'User-Agent': 'ServiceMesh/1.0',
          ...request.headers
        }
      });

      this.httpClients.set(clientKey, client);
    }

    // Increment connection count
    const currentConnections = this.connectionCounts.get(instance.instance_id) || 0;
    this.connectionCounts.set(instance.instance_id, currentConnections + 1);

    try {
      const requestConfig: AxiosRequestConfig = {
        method: request.method.toLowerCase() as any,
        url: request.path,
        data: request.data,
        headers: request.headers
      };

      const response = await client.request(requestConfig);
      return response;
    } finally {
      // Decrement connection count
      const connections = this.connectionCounts.get(instance.instance_id) || 1;
      this.connectionCounts.set(instance.instance_id, Math.max(0, connections - 1));
    }
  }

  private updateInstanceMetrics(instanceId: string, success: boolean, responseTime: number): void {
    // Update response time cache
    const times = this.responseTimeCache.get(instanceId) || [];
    times.push(responseTime);

    // Keep only last 100 response times
    if (times.length > 100) {
      times.shift();
    }

    this.responseTimeCache.set(instanceId, times);

    // Emit metrics event
    this.emit('instance:metrics', {
      instance_id: instanceId,
      success,
      response_time: responseTime,
      avg_response_time: this.getAverageResponseTime(instanceId)
    });
  }

  private shouldBreakCircuit(serviceName: string): boolean {
    // Simple circuit breaker logic
    const instances = this.serviceRegistry.get(serviceName) || [];
    const healthyCount = instances.filter(i => i.status === 'healthy').length;
    const totalCount = instances.length;

    if (totalCount === 0) return true;

    const healthPercentage = (healthyCount / totalCount) * 100;
    return healthPercentage < 50; // Break if less than 50% healthy
  }

  private startHealthChecking(): void {
    this.healthCheckInterval = setInterval(async () => {
      await this.performHealthChecks();
    }, 30000); // Check every 30 seconds
  }

  private async performHealthChecks(): Promise<void> {
    try {
      // Get all registered services with health check URLs
      const query = `
        SELECT * FROM service_registry
        WHERE health_check_url IS NOT NULL
        AND status != 'stopping';
      `;

      const result = await this.pool.query(query);

      for (const instance of result.rows) {
        try {
          const healthUrl = `${instance.protocol}://${instance.host}:${instance.port}${instance.health_check_url}`;

          const response = await axios.get(healthUrl, {
            timeout: 5000,
            validateStatus: (status) => status < 400
          });

          // Update status to healthy
          await this.updateHeartbeat(instance.service_name, instance.instance_id, 'healthy');

        } catch (error) {
          // Mark as unhealthy
          await this.updateHeartbeat(instance.service_name, instance.instance_id, 'unhealthy');

          this.logger.warn('Health check failed', {
            service_name: instance.service_name,
            instance_id: instance.instance_id,
            health_url: instance.health_check_url
          });
        }
      }

      // Clean up stale entries (no heartbeat for 5+ minutes)
      await this.cleanupStaleEntries();

    } catch (error: any) {
      this.logger.error('Health check process failed', error);
    }
  }

  private async cleanupStaleEntries(): Promise<void> {
    const query = `
      DELETE FROM service_registry
      WHERE last_heartbeat < (CURRENT_TIMESTAMP - INTERVAL '5 minutes');
    `;

    const result = await this.pool.query(query);

    if (result.rowCount > 0) {
      this.logger.info('Cleaned up stale service entries', {
        removed_count: result.rowCount
      });

      // Refresh registry cache
      await this.refreshServiceRegistry();
    }
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Cleanup resources
   */
  async cleanup(): Promise<void> {
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
    }

    this.serviceRegistry.clear();
    this.loadBalancerConfigs.clear();
    this.connectionCounts.clear();
    this.responseTimeCache.clear();
    this.roundRobinCounters.clear();
    this.httpClients.clear();
    this.removeAllListeners();

    this.logger.info('ServiceMeshCommunicator cleaned up');
  }
}