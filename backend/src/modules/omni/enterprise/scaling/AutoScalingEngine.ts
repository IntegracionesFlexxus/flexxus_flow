/**
 * Auto-Scaling Engine - Sprint 11
 * Manages automatic scaling of services based on metrics and thresholds
 */

import { injectable, inject } from 'inversify';
import { TYPES } from '@/container/types';
import { Pool } from 'pg';
import { LoggerFactory } from '@/shared/services/logger/LoggerService';
import { EventEmitter } from 'events';

export interface IScalingRule {
  id: string;
  service_name: string;
  metric_type: 'cpu_usage' | 'memory_usage' | 'request_rate' | 'response_time' | 'error_rate' | 'queue_depth';
  scale_action: 'scale_up' | 'scale_down' | 'scale_out' | 'scale_in';
  threshold: number;
  comparison: 'gt' | 'lt' | 'gte' | 'lte' | 'eq';
  duration_seconds: number;
  cooldown_seconds: number;
  min_instances: number;
  max_instances: number;
  scale_amount: number;
  enabled: boolean;
  tenant_id?: string;
}

export interface IScalingMetric {
  service_name: string;
  instance_id?: string;
  metric_type: string;
  metric_value: number;
  threshold_min?: number;
  threshold_max?: number;
  timestamp: Date;
  tenant_id?: string;
}

export interface IScalingEvent {
  id: string;
  service_name: string;
  scaling_action: string;
  trigger_metric: string;
  trigger_value: number;
  target_instances: number;
  current_instances: number;
  status: 'pending' | 'in_progress' | 'completed' | 'failed' | 'cancelled';
  initiated_at: Date;
  completed_at?: Date;
  error_message?: string;
  tenant_id?: string;
}

export interface IServiceScaleConfig {
  service_name: string;
  current_instances: number;
  min_instances: number;
  max_instances: number;
  target_cpu_utilization: number;
  target_memory_utilization: number;
  scale_up_threshold: number;
  scale_down_threshold: number;
  scale_up_cooldown: number;
  scale_down_cooldown: number;
  tenant_id?: string;
}

@injectable()
export class AutoScalingEngine extends EventEmitter {
  private logger: any;
  private scalingRules: Map<string, IScalingRule[]> = new Map();
  private lastScalingActions: Map<string, Date> = new Map();
  private metricsBuffer: Map<string, IScalingMetric[]> = new Map();
  private scalingInterval?: NodeJS.Timeout;
  private metricsCollectionInterval?: NodeJS.Timeout;
  private isScaling = false;

  constructor(
    @inject(TYPES.OmniConnection) private pool: Pool
  ) {
    super();
    this.logger = LoggerFactory.create({ file: __filename });
  }

  /**
   * Start auto-scaling engine
   */
  async start(): Promise<void> {
    if (this.isScaling) {
      this.logger.warn('Auto-scaling engine already running');
      return;
    }

    try {
      this.isScaling = true;

      // Load scaling rules
      await this.loadScalingRules();

      // Start metrics collection
      this.startMetricsCollection();

      // Start scaling evaluation
      this.startScalingEvaluation();

      this.logger.info('Auto-scaling engine started');
      this.emit('scaling:started');
    } catch (error: any) {
      this.logger.error('Failed to start auto-scaling engine', error);
      throw error;
    }
  }

  /**
   * Stop auto-scaling engine
   */
  async stop(): Promise<void> {
    this.isScaling = false;

    if (this.scalingInterval) {
      clearInterval(this.scalingInterval as any);
      this.scalingInterval = undefined;
    }

    if (this.metricsCollectionInterval) {
      clearInterval(this.metricsCollectionInterval as any);
      this.metricsCollectionInterval = undefined;
    }

    this.logger.info('Auto-scaling engine stopped');
    this.emit('scaling:stopped');
  }

  /**
   * Add scaling rule
   */
  async addScalingRule(rule: Omit<IScalingRule, 'id'>): Promise<string> {
    try {
      const query = `
        INSERT INTO scaling_rules (
          service_name,
          metric_type,
          scale_action,
          threshold,
          comparison,
          duration_seconds,
          cooldown_seconds,
          min_instances,
          max_instances,
          scale_amount,
          enabled,
          tenant_id
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
        RETURNING id;
      `;

      const result = await this.pool.query(query, [
        rule.service_name,
        rule.metric_type,
        rule.scale_action,
        rule.threshold,
        rule.comparison,
        rule.duration_seconds,
        rule.cooldown_seconds,
        rule.min_instances,
        rule.max_instances,
        rule.scale_amount,
        rule.enabled,
        rule.tenant_id
      ]);

      const ruleId = result.rows[0].id;

      // Reload scaling rules
      await this.loadScalingRules();

      this.logger.info('Scaling rule added', {
        rule_id: ruleId,
        service_name: rule.service_name,
        metric_type: rule.metric_type,
        scale_action: rule.scale_action
      });

      this.emit('scaling:rule_added', { rule_id: ruleId, service_name: rule.service_name });

      return ruleId;
    } catch (error: any) {
      this.logger.error('Failed to add scaling rule', error);
      throw error;
    }
  }

  /**
   * Update scaling rule
   */
  async updateScalingRule(ruleId: string, updates: Partial<IScalingRule>): Promise<void> {
    try {
      const setClause = [];
      const values = [];
      let paramIndex = 1;

      Object.entries(updates).forEach(([key, value]) => {
        if (key !== 'id') {
          setClause.push(`${key} = $${paramIndex}`);
          values.push(value);
          paramIndex++;
        }
      });

      if (setClause.length === 0) {
        throw new Error('No valid fields to update');
      }

      const query = `
        UPDATE scaling_rules
        SET ${setClause.join(', ')}, updated_at = CURRENT_TIMESTAMP
        WHERE id = $${paramIndex};
      `;

      values.push(ruleId);

      await this.pool.query(query, values);

      // Reload scaling rules
      await this.loadScalingRules();

      this.logger.info('Scaling rule updated', { rule_id: ruleId, updates: Object.keys(updates) });
      this.emit('scaling:rule_updated', { rule_id: ruleId });
    } catch (error: any) {
      this.logger.error('Failed to update scaling rule', error);
      throw error;
    }
  }

  /**
   * Remove scaling rule
   */
  async removeScalingRule(ruleId: string): Promise<void> {
    try {
      const query = `DELETE FROM scaling_rules WHERE id = $1`;
      await this.pool.query(query, [ruleId]);

      // Reload scaling rules
      await this.loadScalingRules();

      this.logger.info('Scaling rule removed', { rule_id: ruleId });
      this.emit('scaling:rule_removed', { rule_id: ruleId });
    } catch (error: any) {
      this.logger.error('Failed to remove scaling rule', error);
      throw error;
    }
  }

  /**
   * Record scaling metric
   */
  async recordMetric(metric: IScalingMetric): Promise<void> {
    try {
      // Store in database
      const query = `
        INSERT INTO scaling_metrics (
          service_name,
          instance_id,
          metric_type,
          metric_value,
          threshold_min,
          threshold_max,
          tenant_id
        ) VALUES ($1, $2, $3, $4, $5, $6, $7);
      `;

      await this.pool.query(query, [
        metric.service_name,
        metric.instance_id,
        metric.metric_type,
        metric.metric_value,
        metric.threshold_min,
        metric.threshold_max,
        metric.tenant_id
      ]);

      // Add to in-memory buffer for real-time evaluation
      const bufferKey = `${metric.service_name}:${metric.metric_type}`;
      if (!this.metricsBuffer.has(bufferKey)) {
        this.metricsBuffer.set(bufferKey, []);
      }

      const buffer = this.metricsBuffer.get(bufferKey)!;
      buffer.push(metric);

      // Keep only last 100 metrics
      if (buffer.length > 100) {
        buffer.shift();
      }

      // Emit metric recorded event
      this.emit('metric:recorded', {
        service_name: metric.service_name,
        metric_type: metric.metric_type,
        metric_value: metric.metric_value
      });
    } catch (error: any) {
      this.logger.error('Failed to record metric', error);
    }
  }

  /**
   * Trigger manual scaling
   */
  async triggerScaling(
    serviceName: string,
    action: 'scale_up' | 'scale_down' | 'scale_out' | 'scale_in',
    targetInstances?: number
  ): Promise<string> {
    try {
      const currentInstances = await this.getCurrentInstanceCount(serviceName);

      const finalTargetInstances = targetInstances || this.calculateTargetInstances(
        currentInstances,
        action,
        1
      );

      const scalingEvent = await this.createScalingEvent({
        service_name: serviceName,
        scaling_action: action,
        trigger_metric: 'manual',
        trigger_value: 0,
        target_instances: finalTargetInstances,
        current_instances: currentInstances,
        status: 'pending'
      });

      // Execute scaling
      await this.executeScalingAction(scalingEvent);

      this.logger.info('Manual scaling triggered', {
        service_name: serviceName,
        action,
        target_instances: finalTargetInstances,
        event_id: scalingEvent.id
      });

      return scalingEvent.id;
    } catch (error: any) {
      this.logger.error('Failed to trigger manual scaling', error);
      throw error;
    }
  }

  /**
   * Get scaling history
   */
  async getScalingHistory(
    serviceName?: string,
    limit: number = 100,
    offset: number = 0
  ): Promise<IScalingEvent[]> {
    try {
      let query = `
        SELECT * FROM scaling_events
      `;
      const values: any[] = [];
      let paramIndex = 1;

      if (serviceName) {
        query += ` WHERE service_name = $${paramIndex}`;
        values.push(serviceName);
        paramIndex++;
      }

      query += ` ORDER BY initiated_at DESC LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
      values.push(limit, offset);

      const result = await this.pool.query(query, values);
      return result.rows;
    } catch (error: any) {
      this.logger.error('Failed to get scaling history', error);
      return [];
    }
  }

  /**
   * Get current scaling status
   */
  async getScalingStatus(): Promise<Record<string, any>> {
    try {
      const query = `
        SELECT
          service_name,
          COUNT(*) as total_events,
          COUNT(CASE WHEN status = 'pending' THEN 1 END) as pending_events,
          COUNT(CASE WHEN status = 'in_progress' THEN 1 END) as in_progress_events,
          COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed_events,
          COUNT(CASE WHEN status = 'failed' THEN 1 END) as failed_events,
          MAX(initiated_at) as last_scaling_event
        FROM scaling_events
        WHERE initiated_at >= NOW() - INTERVAL '24 hours'
        GROUP BY service_name;
      `;

      const result = await this.pool.query(query);

      const status: Record<string, any> = {};

      result.rows.forEach(row => {
        status[row.service_name] = {
          total_events: parseInt(row.total_events),
          pending_events: parseInt(row.pending_events),
          in_progress_events: parseInt(row.in_progress_events),
          completed_events: parseInt(row.completed_events),
          failed_events: parseInt(row.failed_events),
          last_scaling_event: row.last_scaling_event,
          success_rate: (parseInt(row.completed_events) / parseInt(row.total_events)) * 100
        };
      });

      return {
        services: status,
        engine_status: {
          is_running: this.isScaling,
          rules_loaded: this.scalingRules.size,
          last_evaluation: new Date()
        }
      };
    } catch (error: any) {
      this.logger.error('Failed to get scaling status', error);
      return {};
    }
  }

  /**
   * Private helper methods
   */
  private async loadScalingRules(): Promise<void> {
    try {
      const query = `
        SELECT * FROM scaling_rules
        WHERE enabled = true
        ORDER BY service_name, metric_type;
      `;

      const result = await this.pool.query(query);

      this.scalingRules.clear();

      result.rows.forEach(rule => {
        if (!this.scalingRules.has(rule.service_name)) {
          this.scalingRules.set(rule.service_name, []);
        }
        this.scalingRules.get(rule.service_name)!.push(rule);
      });

      this.logger.debug('Scaling rules loaded', {
        services: this.scalingRules.size,
        total_rules: result.rows.length
      });
    } catch (error: any) {
      this.logger.error('Failed to load scaling rules', error);
    }
  }

  private startMetricsCollection(): void {
    this.metricsCollectionInterval = setInterval(async () => {
      await this.collectSystemMetrics();
    }, 30000); // Collect every 30 seconds
  }

  private startScalingEvaluation(): void {
    this.scalingInterval = setInterval(async () => {
      await this.evaluateScalingRules();
    }, 60000); // Evaluate every minute
  }

  private async collectSystemMetrics(): Promise<void> {
    try {
      // Get active services from service registry
      const query = `
        SELECT DISTINCT service_name FROM service_registry
        WHERE status = 'healthy'
        AND last_heartbeat > (CURRENT_TIMESTAMP - INTERVAL '2 minutes');
      `;

      const result = await this.pool.query(query);

      for (const row of result.rows) {
        await this.collectServiceMetrics(row.service_name);
      }
    } catch (error: any) {
      this.logger.error('Failed to collect system metrics', error);
    }
  }

  private async collectServiceMetrics(serviceName: string): Promise<void> {
    try {
      // Mock metric collection - in production, integrate with monitoring system
      const mockMetrics = [
        {
          service_name: serviceName,
          metric_type: 'cpu_usage',
          metric_value: 20 + Math.random() * 60, // 20-80%
          timestamp: new Date()
        },
        {
          service_name: serviceName,
          metric_type: 'memory_usage',
          metric_value: 30 + Math.random() * 50, // 30-80%
          timestamp: new Date()
        },
        {
          service_name: serviceName,
          metric_type: 'request_rate',
          metric_value: Math.random() * 1000, // 0-1000 req/min
          timestamp: new Date()
        }
      ];

      for (const metric of mockMetrics) {
        await this.recordMetric(metric);
      }
    } catch (error: any) {
      this.logger.error('Failed to collect service metrics', {
        service_name: serviceName,
        error: error.message
      });
    }
  }

  private async evaluateScalingRules(): Promise<void> {
    try {
      for (const [serviceName, rules] of this.scalingRules) {
        for (const rule of rules) {
          await this.evaluateRule(rule);
        }
      }
    } catch (error: any) {
      this.logger.error('Failed to evaluate scaling rules', error);
    }
  }

  private async evaluateRule(rule: IScalingRule): Promise<void> {
    try {
      // Check cooldown period
      if (this.isInCooldown(rule)) {
        return;
      }

      // Get recent metrics for this rule
      const metrics = await this.getRecentMetrics(
        rule.service_name,
        rule.metric_type,
        rule.duration_seconds
      );

      if (metrics.length === 0) {
        return;
      }

      // Calculate average metric value
      const avgValue = metrics.reduce((sum, m) => sum + m.metric_value, 0) / metrics.length;

      // Check if threshold is breached
      const isBreached = this.checkThreshold(avgValue, rule.threshold, rule.comparison);

      if (isBreached) {
        await this.triggerRuleAction(rule, avgValue);
      }
    } catch (error: any) {
      this.logger.error('Failed to evaluate rule', {
        rule_id: rule.id,
        service_name: rule.service_name,
        error: error.message
      });
    }
  }

  private isInCooldown(rule: IScalingRule): boolean {
    const lastAction = this.lastScalingActions.get(`${rule.service_name}:${rule.scale_action}`);

    if (!lastAction) {
      return false;
    }

    const cooldownEnd = new Date(lastAction.getTime() + (rule.cooldown_seconds * 1000));
    return new Date() < cooldownEnd;
  }

  private async getRecentMetrics(
    serviceName: string,
    metricType: string,
    durationSeconds: number
  ): Promise<IScalingMetric[]> {
    const query = `
      SELECT * FROM scaling_metrics
      WHERE service_name = $1
        AND metric_type = $2
        AND timestamp >= (CURRENT_TIMESTAMP - INTERVAL '${durationSeconds} seconds')
      ORDER BY timestamp DESC;
    `;

    const result = await this.pool.query(query, [serviceName, metricType]);
    return result.rows;
  }

  private checkThreshold(value: number, threshold: number, comparison: string): boolean {
    switch (comparison) {
      case 'gt': return value > threshold;
      case 'lt': return value < threshold;
      case 'gte': return value >= threshold;
      case 'lte': return value <= threshold;
      case 'eq': return value === threshold;
      default: return false;
    }
  }

  private async triggerRuleAction(rule: IScalingRule, triggerValue: number): Promise<void> {
    const currentInstances = await this.getCurrentInstanceCount(rule.service_name);
    const targetInstances = this.calculateTargetInstances(
      currentInstances,
      rule.scale_action,
      rule.scale_amount
    );

    // Check instance limits
    if (targetInstances < rule.min_instances || targetInstances > rule.max_instances) {
      this.logger.warn('Scaling action blocked by instance limits', {
        service_name: rule.service_name,
        target_instances: targetInstances,
        min_instances: rule.min_instances,
        max_instances: rule.max_instances
      });
      return;
    }

    // Create scaling event
    const scalingEvent = await this.createScalingEvent({
      service_name: rule.service_name,
      scaling_action: rule.scale_action,
      trigger_metric: rule.metric_type,
      trigger_value: triggerValue,
      target_instances: targetInstances,
      current_instances: currentInstances,
      status: 'pending'
    });

    // Execute scaling action
    await this.executeScalingAction(scalingEvent);

    // Update last action time
    this.lastScalingActions.set(`${rule.service_name}:${rule.scale_action}`, new Date());
  }

  private async getCurrentInstanceCount(serviceName: string): Promise<number> {
    const query = `
      SELECT COUNT(*) as instance_count
      FROM service_registry
      WHERE service_name = $1 AND status = 'healthy';
    `;

    const result = await this.pool.query(query, [serviceName]);
    return parseInt(result.rows[0].instance_count);
  }

  private calculateTargetInstances(
    currentInstances: number,
    action: string,
    amount: number
  ): number {
    switch (action) {
      case 'scale_up':
      case 'scale_out':
        return currentInstances + amount;
      case 'scale_down':
      case 'scale_in':
        return Math.max(1, currentInstances - amount);
      default:
        return currentInstances;
    }
  }

  private async createScalingEvent(event: Omit<IScalingEvent, 'id' | 'initiated_at'>): Promise<IScalingEvent> {
    const query = `
      INSERT INTO scaling_events (
        service_name,
        scaling_action,
        trigger_metric,
        trigger_value,
        target_instances,
        current_instances,
        status,
        tenant_id
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING *;
    `;

    const result = await this.pool.query(query, [
      event.service_name,
      event.scaling_action,
      event.trigger_metric,
      event.trigger_value,
      event.target_instances,
      event.current_instances,
      event.status,
      event.tenant_id
    ]);

    return result.rows[0];
  }

  private async executeScalingAction(scalingEvent: IScalingEvent): Promise<void> {
    try {
      // Update status to in_progress
      await this.updateScalingEventStatus(scalingEvent.id, 'in_progress');

      // Mock scaling execution - in production, integrate with orchestrator
      this.logger.info('Executing scaling action', {
        event_id: scalingEvent.id,
        service_name: scalingEvent.service_name,
        action: scalingEvent.scaling_action,
        target_instances: scalingEvent.target_instances
      });

      // Simulate scaling delay
      await new Promise(resolve => setTimeout(resolve, 2000));

      // Update status to completed
      await this.updateScalingEventStatus(scalingEvent.id, 'completed');

      this.emit('scaling:completed', {
        event_id: scalingEvent.id,
        service_name: scalingEvent.service_name,
        action: scalingEvent.scaling_action,
        target_instances: scalingEvent.target_instances
      });

    } catch (error: any) {
      await this.updateScalingEventStatus(scalingEvent.id, 'failed', error.message);

      this.emit('scaling:failed', {
        event_id: scalingEvent.id,
        service_name: scalingEvent.service_name,
        error: error.message
      });

      throw error;
    }
  }

  private async updateScalingEventStatus(
    eventId: string,
    status: string,
    errorMessage?: string
  ): Promise<void> {
    const query = `
      UPDATE scaling_events
      SET status = $2,
          ${status === 'completed' || status === 'failed' ? 'completed_at = CURRENT_TIMESTAMP,' : ''}
          ${errorMessage ? 'error_message = $3' : ''}
      WHERE id = $1;
    `;

    const values = [eventId, status];
    if (errorMessage) {
      values.push(errorMessage);
    }

    await this.pool.query(query, values);
  }

  /**
   * Cleanup resources
   */
  async cleanup(): Promise<void> {
    await this.stop();
    this.scalingRules.clear();
    this.lastScalingActions.clear();
    this.metricsBuffer.clear();
    this.removeAllListeners();
    this.logger.info('AutoScalingEngine cleaned up');
  }
}