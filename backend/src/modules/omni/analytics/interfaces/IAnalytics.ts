/**
 * Analytics Interfaces - Sprint 08
 * Core interfaces for analytics and metrics system
 */

export interface IAnalyticsEvent {
  id: string;
  company_id: string;
  event_type: 'message_sent' | 'message_received' | 'conversation_started' | 'conversation_resolved' |
              'agent_assigned' | 'customer_satisfied' | 'automation_triggered' | 'channel_connected' |
              'response_time' | 'resolution_time' | 'custom';
  entity_type: 'message' | 'conversation' | 'customer' | 'agent' | 'channel' | 'automation';
  entity_id: string;
  timestamp: Date;
  dimensions: Map<string, any>;
  metrics: Map<string, number>;
  session_id?: string;
  user_id?: string;
  channel_type?: string;
  metadata?: any;
}

export interface IAggregatedMetrics {
  period: {
    start: Date;
    end: Date;
    type: 'minute' | 'hour' | 'day' | 'week' | 'month' | 'quarter' | 'year';
  };
  metrics: {
    conversations_total: number;
    conversations_resolved: number;
    conversations_active: number;
    messages_sent: number;
    messages_received: number;
    avg_response_time_ms: number;
    median_response_time_ms: number;
    avg_resolution_time_ms: number;
    automation_rate: number;
    customer_satisfaction: number;
    agent_utilization: number;
  };
  dimensions: Map<string, IMetricBreakdown>;
  metadata?: any;
}

export interface IMetricBreakdown {
  dimension: string;
  values: Map<string, IMetricValue>;
}

export interface IMetricValue {
  value: number;
  count: number;
  sum?: number;
  min?: number;
  max?: number;
  avg?: number;
  std_deviation?: number;
  percentiles?: {
    p50?: number;
    p75?: number;
    p90?: number;
    p95?: number;
    p99?: number;
  };
}

export interface IMetricCollector {
  collect(event: IAnalyticsEvent): Promise<void>;
  aggregate(timeWindow: 'minute' | 'hour' | 'day'): Promise<IAggregatedMetrics>;
  stream(): AsyncIterator<IMetricUpdate>;
  flush(): Promise<void>;
}

export interface IMetricUpdate {
  metric_name: string;
  value: number;
  timestamp: Date;
  dimensions?: Map<string, any>;
}

export interface ITimeSeriesData {
  metric_name: string;
  timestamps: Date[];
  values: number[];
  aggregation: 'sum' | 'avg' | 'min' | 'max' | 'count';
}

export interface ITrend {
  direction: 'up' | 'down' | 'stable';
  percentage_change: number;
  period_comparison: string;
  significance: 'low' | 'medium' | 'high';
}

export interface IAnomaly {
  metric_name: string;
  detected_value: number;
  expected_range: { min: number; max: number };
  deviation_percentage: number;
  severity: 'info' | 'warning' | 'critical';
  confidence: number;
  timestamp: Date;
}