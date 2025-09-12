/**
 * Performance Optimization Interfaces
 * Sprint 4 - Database Team
 * Sistema de optimización de rendimiento para bases de datos
 */
import { PoolClient } from 'pg';
/**
 * Tipo de análisis de query
 */
export enum QueryAnalysisType {
  EXECUTION_PLAN = 'execution_plan',
  INDEX_USAGE = 'index_usage',
  TABLE_SCANS = 'table_scans',
  JOIN_OPTIMIZATION = 'join_optimization',
  STATISTICS = 'statistics'
}
/**
 * Estrategia de particionamiento
 */
export enum PartitionStrategy {
  RANGE = 'range',
  LIST = 'list',
  HASH = 'hash',
  TIME_SERIES = 'time_series'
}
/**
 * Parámetros de análisis de query
 */
export interface QueryAnalysisParams {
  query: string;
  database: string;
  analysisTypes?: QueryAnalysisType[];
  includeRecommendations?: boolean;
  timeThreshold?: number; // ms
}
/**
 * Resultado del análisis de query
 */
export interface QueryAnalysisResult {
  query: string;
  executionTime: number;
  cost: number;
  rows: number;
  executionPlan: any;
  recommendations: QueryRecommendation[];
  indexUsage: IndexUsageInfo[];
  bottlenecks: string[];
}
/**
 * Recomendación de optimización
 */
export interface QueryRecommendation {
  type: 'index' | 'rewrite' | 'statistics' | 'partition' | 'cache';
  priority: 'high' | 'medium' | 'low';
  description: string;
  impact: string;
  implementation?: string;
  estimatedImprovement?: number; // percentage
}
/**
 * Información de uso de índices
 */
export interface IndexUsageInfo {
  tableName: string;
  indexName: string;
  scans: number;
  tupleReads: number;
  tupleFetches: number;
  efficiency: number; // percentage
  size: number; // bytes
  lastUsed?: Date;
}
/**
 * Parámetros de análisis de índices
 */
export interface IndexAnalysisParams {
  database: string;
  tables?: string[];
  minUsage?: number;
  includeUnused?: boolean;
  includeDuplicates?: boolean;
  includeMissing?: boolean;
}
/**
 * Resultado del análisis de índices
 */
export interface IndexAnalysisResult {
  database: string;
  existingIndexes: IndexInfo[];
  unusedIndexes: IndexInfo[];
  duplicateIndexes: IndexDuplicate[];
  missingIndexes: MissingIndex[];
  recommendations: IndexRecommendation[];
  totalIndexSize: number;
  potentialSavings: number;
}
/**
 * Información de índice
 */
export interface IndexInfo {
  tableName: string;
  indexName: string;
  columns: string[];
  type: string;
  size: number;
  scans: number;
  efficiency: number;
  isUnique: boolean;
  isPrimary: boolean;
}
/**
 * Índices duplicados
 */
export interface IndexDuplicate {
  table: string;
  indexes: IndexInfo[];
  reason: string;
  recommendation: string;
}
/**
 * Índices faltantes
 */
export interface MissingIndex {
  table: string;
  columns: string[];
  reason: string;
  estimatedImprovement: number;
  createStatement: string;
}
/**
 * Recomendación de índice
 */
export interface IndexRecommendation {
  action: 'create' | 'drop' | 'rebuild' | 'modify';
  table: string;
  indexName?: string;
  columns?: string[];
  reason: string;
  sql: string;
  priority: 'high' | 'medium' | 'low';
}
/**
 * Configuración de particionamiento
 */
export interface PartitionConfig {
  tableName: string;
  strategy: PartitionStrategy;
  partitionKey: string;
  partitions?: PartitionDefinition[];
  autoCreate?: boolean;
  retention?: number; // days
  compression?: boolean;
}
/**
 * Definición de partición
 */
export interface PartitionDefinition {
  name: string;
  condition: string;
  tablespace?: string;
  compression?: boolean;
}
/**
 * Resultado de particionamiento
 */
export interface PartitionResult {
  table: string;
  partitions: PartitionInfo[];
  totalRows: number;
  totalSize: number;
  performance: PartitionPerformance;
}
/**
 * Información de partición
 */
export interface PartitionInfo {
  name: string;
  parent: string;
  rows: number;
  size: number;
  created: Date;
  lastAccessed?: Date;
  condition: string;
}
/**
 * Rendimiento de partición
 */
export interface PartitionPerformance {
  avgQueryTime: number;
  improvementPercent: number;
  pruningEfficiency: number;
  maintenanceOverhead: number;
}
/**
 * Métricas de performance
 */
export interface PerformanceMetrics {
  timestamp: Date;
  database: string;
  queryCount: number;
  avgResponseTime: number;
  p95ResponseTime: number;
  p99ResponseTime: number;
  slowQueries: number;
  cacheHitRatio: number;
  connectionPoolUsage: number;
  indexEfficiency: number;
  diskIO: number;
  cpuUsage: number;
  memoryUsage: number;
}
/**
 * Configuración de optimización de pool
 */
export interface PoolOptimizationConfig {
  database: string;
  currentSize: number;
  recommendedSize: number;
  idleTimeout: number;
  connectionTimeout: number;
  statementTimeout?: number;
  queryTimeout?: number;
}
/**
 * Interface principal del Query Analyzer
 */
export interface IQueryAnalyzer {
  analyzeQuery(params: QueryAnalysisParams): Promise<QueryAnalysisResult>;
  explainQuery(query: string, database: string): Promise<any>;
  getSlowQueries(database: string, threshold: number): Promise<QueryAnalysisResult[]>;
  optimizeQuery(query: string): Promise<string>;
  generateQueryStats(database: string, period: number): Promise<any>;
}
/**
 * Interface del Index Analyzer
 */
export interface IIndexAnalyzer {
  analyzeIndexes(params: IndexAnalysisParams): Promise<IndexAnalysisResult>;
  findUnusedIndexes(database: string, days: number): Promise<IndexInfo[]>;
  findDuplicateIndexes(database: string): Promise<IndexDuplicate[]>;
  suggestIndexes(table: string, queries: string[]): Promise<MissingIndex[]>;
  calculateIndexEfficiency(database: string): Promise<Map<string, number>>;
  rebuildIndex(database: string, indexName: string): Promise<boolean>;
}
/**
 * Interface del Partition Manager
 */
export interface IPartitionManager {
  createPartition(config: PartitionConfig): Promise<PartitionResult>;
  analyzePartitionCandidates(database: string): Promise<string[]>;
  getPartitionInfo(table: string): Promise<PartitionInfo[]>;
  pruneOldPartitions(table: string, days: number): Promise<number>;
  optimizePartitions(table: string): Promise<PartitionPerformance>;
  autoPartition(table: string, strategy: PartitionStrategy): Promise<boolean>;
}
/**
 * Interface del Connection Pool Optimizer
 */
export interface IConnectionPoolOptimizer {
  analyzePoolUsage(database: string): Promise<PoolOptimizationConfig>;
  optimizePoolSize(database: string): Promise<void>;
  getPoolMetrics(database: string): Promise<any>;
  adjustTimeouts(database: string, config: Partial<PoolOptimizationConfig>): Promise<void>;
  implementCircuitBreaker(database: string): Promise<void>;
}
/**
 * Interface del Query Cache Manager
 */
export interface IQueryCacheManager {
  cacheQuery(key: string, result: any, ttl?: number): Promise<void>;
  getCachedQuery(key: string): Promise<any | null>;
  invalidateCache(patterns: string[]): Promise<number>;
  getCacheStats(): Promise<CacheStatistics>;
  optimizeCacheStrategy(database: string): Promise<CacheStrategy>;
  implementSmartCaching(query: string): Promise<boolean>;
}
/**
 * Estadísticas de caché
 */
export interface CacheStatistics {
  hits: number;
  misses: number;
  hitRatio: number;
  size: number;
  evictions: number;
  avgTTL: number;
  topKeys: Array<{ key: string; hits: number }>;
}
/**
 * Estrategia de caché
 */
export interface CacheStrategy {
  type: 'LRU' | 'LFU' | 'TTL' | 'ADAPTIVE';
  maxSize: number;
  defaultTTL: number;
  patterns: CachePattern[];
}
/**
 * Patrón de caché
 */
export interface CachePattern {
  pattern: string;
  ttl: number;
  priority: number;
  invalidateOn?: string[];
}
/**
 * Interface del Performance Monitor
 */
export interface IPerformanceMonitor {
  startMonitoring(database: string): void;
  stopMonitoring(database: string): void;
  getMetrics(database: string, period?: number): Promise<PerformanceMetrics[]>;
  setAlerts(database: string, thresholds: PerformanceThresholds): void;
  generateReport(database: string, startDate: Date, endDate: Date): Promise<PerformanceReport>;
  detectAnomalies(database: string): Promise<PerformanceAnomaly[]>;
}
/**
 * Umbrales de performance
 */
export interface PerformanceThresholds {
  maxResponseTime: number;
  maxSlowQueries: number;
  minCacheHitRatio: number;
  maxConnectionPoolUsage: number;
  maxCPUUsage: number;
  maxMemoryUsage: number;
}
/**
 * Reporte de performance
 */
export interface PerformanceReport {
  period: { start: Date; end: Date };
  summary: PerformanceMetrics;
  trends: PerformanceTrend[];
  issues: PerformanceIssue[];
  recommendations: string[];
  charts: any[];
}
/**
 * Tendencia de performance
 */
export interface PerformanceTrend {
  metric: string;
  trend: 'improving' | 'stable' | 'degrading';
  changePercent: number;
  forecast: number[];
}
/**
 * Problema de performance
 */
export interface PerformanceIssue {
  type: string;
  severity: 'critical' | 'warning' | 'info';
  description: string;
  impact: string;
  resolution: string;
  occurredAt: Date;
}
/**
 * Anomalía de performance
 */
export interface PerformanceAnomaly {
  metric: string;
  expected: number;
  actual: number;
  deviation: number;
  timestamp: Date;
  possibleCauses: string[];
}
/**
 * Interface principal del Performance Optimizer
 */
export interface IPerformanceOptimizer {
  queryAnalyzer: IQueryAnalyzer;
  indexAnalyzer: IIndexAnalyzer;
  partitionManager: IPartitionManager;
  poolOptimizer: IConnectionPoolOptimizer;
  cacheManager: IQueryCacheManager;
  monitor: IPerformanceMonitor;
  runFullOptimization(database: string): Promise<OptimizationResult>;
  scheduleOptimization(database: string, cron: string): void;
  getOptimizationHistory(database: string): Promise<OptimizationResult[]>;
}
/**
 * Resultado de optimización
 */
export interface OptimizationResult {
  database: string;
  timestamp: Date;
  duration: number;
  improvements: {
    queries: number;
    indexes: number;
    partitions: number;
    cacheHitRatio: number;
    avgResponseTime: number;
  };
  actions: OptimizationAction[];
  overallImprovement: number; // percentage
}
/**
 * Acción de optimización
 */
export interface OptimizationAction {
  type: string;
  description: string;
  result: 'success' | 'failed' | 'skipped';
  impact: number;
  error?: string;
}
