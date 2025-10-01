/**
 * ML Monitoring Types - Sprint 12 Fase 4
 * Type definitions for ML model monitoring and testing
 */

export enum DriftType {
  DATA_DRIFT = 'data_drift',
  CONCEPT_DRIFT = 'concept_drift',
  PREDICTION_DRIFT = 'prediction_drift'
}

export enum DriftSeverity {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical'
}

export enum TestStatus {
  RUNNING = 'running',
  COMPLETED = 'completed',
  FAILED = 'failed'
}

export enum TestVariant {
  CONTROL = 'control',
  VARIANT_A = 'variant_a',
  VARIANT_B = 'variant_b',
  VARIANT_C = 'variant_c'
}
