/**
 * DataTransformer - Sprint 13
 * Transforms extracted data for ETL pipelines
 */

import { injectable, inject } from 'inversify';
import { TYPES } from '@/container/types';

interface Transformation {
  type: 'map' | 'filter' | 'aggregate' | 'join' | 'pivot' | 'custom';
  name: string;
  config: TransformationConfig;
}

interface TransformationConfig {
  // Map transformation
  mapping?: Record<string, string | MapFunction>;

  // Filter transformation
  condition?: FilterCondition;

  // Aggregate transformation
  groupBy?: string[];
  aggregations?: Record<string, AggregationFunction>;

  // Join transformation
  joinData?: any[];
  joinKey?: string;
  joinType?: 'inner' | 'left' | 'right';

  // Pivot transformation
  pivotKey?: string;
  pivotValue?: string;
  pivotAggregation?: 'sum' | 'avg' | 'count' | 'min' | 'max';

  // Custom transformation
  customFunction?: (data: any[]) => any[];
}

interface MapFunction {
  function: 'concat' | 'split' | 'upper' | 'lower' | 'trim' | 'replace' | 'parse' | 'format' | 'calculate';
  params?: any;
}

interface FilterCondition {
  field: string;
  operator: '=' | '!=' | '>' | '<' | '>=' | '<=' | 'in' | 'contains' | 'startsWith' | 'endsWith';
  value: any;
  logic?: 'AND' | 'OR';
  conditions?: FilterCondition[];
}

type AggregationFunction = 'sum' | 'avg' | 'count' | 'min' | 'max' | 'first' | 'last';

interface TransformationResult {
  data: any[];
  recordCount: number;
  metadata: {
    transformationsApplied: string[];
    executionTimeMs: number;
    recordsIn: number;
    recordsOut: number;
    recordsFiltered: number;
  };
}

@injectable()
export class DataTransformer {
  constructor(
    @inject(TYPES.Logger) private logger: Logger
  ) {}

  /**
   * Transform data through multiple transformations
   */
  async transform(
    data: any[],
    transformations: Transformation[],
    signal: AbortSignal
  ): Promise<TransformationResult> {
    const startTime = Date.now();
    const recordsIn = data.length;

    try {
      this.logger.info('Starting data transformation', {
        recordCount: data.length,
        transformationCount: transformations.length
      });

      let transformedData = [...data];
      const transformationsApplied: string[] = [];

      for (const transformation of transformations) {
        if (signal.aborted) {
          throw new Error('Transformation cancelled');
        }

        this.logger.debug('Applying transformation', {
          type: transformation.type,
          name: transformation.name
        });

        transformedData = await this.applyTransformation(transformedData, transformation);
        transformationsApplied.push(transformation.name);
      }

      const executionTimeMs = Date.now() - startTime;

      this.logger.info('Data transformation completed', {
        recordsIn,
        recordsOut: transformedData.length,
        executionTimeMs
      });

      return {
        data: transformedData,
        recordCount: transformedData.length,
        metadata: {
          transformationsApplied,
          executionTimeMs,
          recordsIn,
          recordsOut: transformedData.length,
          recordsFiltered: recordsIn - transformedData.length
        }
      };
    } catch (error) {
      this.logger.error('Data transformation failed', { error });
      throw new Error(`Data transformation failed: ${error.message}`);
    }
  }

  /**
   * Apply a single transformation
   */
  private async applyTransformation(data: any[], transformation: Transformation): Promise<any[]> {
    switch (transformation.type) {
      case 'map':
        return this.applyMapTransformation(data, transformation.config);

      case 'filter':
        return this.applyFilterTransformation(data, transformation.config);

      case 'aggregate':
        return this.applyAggregateTransformation(data, transformation.config);

      case 'join':
        return this.applyJoinTransformation(data, transformation.config);

      case 'pivot':
        return this.applyPivotTransformation(data, transformation.config);

      case 'custom':
        if (transformation.config.customFunction) {
          return transformation.config.customFunction(data);
        }
        return data;

      default:
        this.logger.warn('Unknown transformation type', { type: transformation.type });
        return data;
    }
  }

  /**
   * Apply map transformation (field mapping and transformations)
   */
  private applyMapTransformation(data: any[], config: TransformationConfig): any[] {
    if (!config.mapping) return data;

    return data.map(record => {
      const mapped: any = {};

      for (const [targetField, source] of Object.entries(config.mapping!)) {
        if (typeof source === 'string') {
          // Simple field mapping
          mapped[targetField] = record[source];
        } else if (typeof source === 'object' && 'function' in source) {
          // Function-based mapping
          mapped[targetField] = this.applyMapFunction(record, source as MapFunction);
        }
      }

      return mapped;
    });
  }

  /**
   * Apply map function to record
   */
  private applyMapFunction(record: any, mapFunc: MapFunction): any {
    const params = mapFunc.params || {};

    switch (mapFunc.function) {
      case 'concat':
        return params.fields
          .map((field: string) => record[field] || '')
          .join(params.separator || ' ');

      case 'split':
        const value = record[params.field] || '';
        return value.split(params.separator || ',');

      case 'upper':
        return (record[params.field] || '').toUpperCase();

      case 'lower':
        return (record[params.field] || '').toLowerCase();

      case 'trim':
        return (record[params.field] || '').trim();

      case 'replace':
        return (record[params.field] || '').replace(params.search, params.replace);

      case 'parse':
        if (params.type === 'json') {
          try {
            return JSON.parse(record[params.field] || '{}');
          } catch {
            return null;
          }
        }
        if (params.type === 'int') {
          return parseInt(record[params.field], 10);
        }
        if (params.type === 'float') {
          return parseFloat(record[params.field]);
        }
        return record[params.field];

      case 'format':
        if (params.type === 'date') {
          return new Date(record[params.field]).toISOString();
        }
        return record[params.field];

      case 'calculate':
        // Simple calculator for expressions like "field1 + field2"
        return eval(params.expression.replace(/\{(\w+)\}/g, (_, field) => record[field] || 0));

      default:
        return record[params.field];
    }
  }

  /**
   * Apply filter transformation
   */
  private applyFilterTransformation(data: any[], config: TransformationConfig): any[] {
    if (!config.condition) return data;

    return data.filter(record => this.evaluateCondition(record, config.condition!));
  }

  /**
   * Evaluate filter condition
   */
  private evaluateCondition(record: any, condition: FilterCondition): boolean {
    const fieldValue = record[condition.field];
    const conditionValue = condition.value;

    let result = false;

    switch (condition.operator) {
      case '=':
        result = fieldValue === conditionValue;
        break;
      case '!=':
        result = fieldValue !== conditionValue;
        break;
      case '>':
        result = fieldValue > conditionValue;
        break;
      case '<':
        result = fieldValue < conditionValue;
        break;
      case '>=':
        result = fieldValue >= conditionValue;
        break;
      case '<=':
        result = fieldValue <= conditionValue;
        break;
      case 'in':
        result = Array.isArray(conditionValue) && conditionValue.includes(fieldValue);
        break;
      case 'contains':
        result = String(fieldValue).includes(String(conditionValue));
        break;
      case 'startsWith':
        result = String(fieldValue).startsWith(String(conditionValue));
        break;
      case 'endsWith':
        result = String(fieldValue).endsWith(String(conditionValue));
        break;
    }

    // Handle nested conditions with AND/OR logic
    if (condition.conditions && condition.conditions.length > 0) {
      const logic = condition.logic || 'AND';

      if (logic === 'AND') {
        result = result && condition.conditions.every(c => this.evaluateCondition(record, c));
      } else {
        result = result || condition.conditions.some(c => this.evaluateCondition(record, c));
      }
    }

    return result;
  }

  /**
   * Apply aggregate transformation
   */
  private applyAggregateTransformation(data: any[], config: TransformationConfig): any[] {
    if (!config.groupBy || !config.aggregations) return data;

    // Group data by specified fields
    const groups = new Map<string, any[]>();

    for (const record of data) {
      const key = config.groupBy.map(field => record[field]).join('|');

      if (!groups.has(key)) {
        groups.set(key, []);
      }

      groups.get(key)!.push(record);
    }

    // Apply aggregations to each group
    const results: any[] = [];

    for (const [key, records] of groups.entries()) {
      const aggregated: any = {};

      // Add groupBy fields
      const keyValues = key.split('|');
      config.groupBy.forEach((field, index) => {
        aggregated[field] = keyValues[index];
      });

      // Calculate aggregations
      for (const [field, aggFunc] of Object.entries(config.aggregations)) {
        aggregated[field] = this.calculateAggregation(records, field, aggFunc);
      }

      results.push(aggregated);
    }

    return results;
  }

  /**
   * Calculate aggregation for a field
   */
  private calculateAggregation(records: any[], field: string, aggFunc: AggregationFunction): any {
    const values = records.map(r => r[field]).filter(v => v !== null && v !== undefined);

    switch (aggFunc) {
      case 'sum':
        return values.reduce((sum, val) => sum + (parseFloat(val) || 0), 0);

      case 'avg':
        if (values.length === 0) return 0;
        return values.reduce((sum, val) => sum + (parseFloat(val) || 0), 0) / values.length;

      case 'count':
        return values.length;

      case 'min':
        return values.length > 0 ? Math.min(...values.map(v => parseFloat(v) || 0)) : 0;

      case 'max':
        return values.length > 0 ? Math.max(...values.map(v => parseFloat(v) || 0)) : 0;

      case 'first':
        return values[0];

      case 'last':
        return values[values.length - 1];

      default:
        return null;
    }
  }

  /**
   * Apply join transformation
   */
  private applyJoinTransformation(data: any[], config: TransformationConfig): any[] {
    if (!config.joinData || !config.joinKey) return data;

    const joinType = config.joinType || 'inner';
    const joinMap = new Map(config.joinData.map(item => [item[config.joinKey!], item]));

    const results: any[] = [];

    for (const record of data) {
      const joinValue = record[config.joinKey];
      const joinRecord = joinMap.get(joinValue);

      if (joinRecord) {
        // Match found - merge records
        results.push({ ...record, ...joinRecord });
      } else if (joinType === 'left') {
        // Left join - keep original record
        results.push(record);
      }
      // Inner join - skip records without match
    }

    return results;
  }

  /**
   * Apply pivot transformation
   */
  private applyPivotTransformation(data: any[], config: TransformationConfig): any[] {
    if (!config.pivotKey || !config.pivotValue) return data;

    const pivotAgg = config.pivotAggregation || 'sum';
    const pivoted = new Map<string, any>();

    for (const record of data) {
      const key = record[config.pivotKey];
      const value = parseFloat(record[config.pivotValue]) || 0;

      if (!pivoted.has(key)) {
        pivoted.set(key, []);
      }

      pivoted.get(key)!.push(value);
    }

    const results: any[] = [];

    for (const [key, values] of pivoted.entries()) {
      results.push({
        [config.pivotKey]: key,
        [config.pivotValue]: this.calculateAggregation(
          values.map(v => ({ value: v })),
          'value',
          pivotAgg as AggregationFunction
        )
      });
    }

    return results;
  }

  /**
   * Validate transformation
   */
  validateTransformation(transformation: Transformation): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!transformation.name) {
      errors.push('Transformation name is required');
    }

    if (!transformation.type) {
      errors.push('Transformation type is required');
    }

    // Type-specific validation
    switch (transformation.type) {
      case 'map':
        if (!transformation.config.mapping) {
          errors.push('Map transformation requires mapping configuration');
        }
        break;

      case 'filter':
        if (!transformation.config.condition) {
          errors.push('Filter transformation requires condition');
        }
        break;

      case 'aggregate':
        if (!transformation.config.groupBy || !transformation.config.aggregations) {
          errors.push('Aggregate transformation requires groupBy and aggregations');
        }
        break;

      case 'join':
        if (!transformation.config.joinData || !transformation.config.joinKey) {
          errors.push('Join transformation requires joinData and joinKey');
        }
        break;

      case 'pivot':
        if (!transformation.config.pivotKey || !transformation.config.pivotValue) {
          errors.push('Pivot transformation requires pivotKey and pivotValue');
        }
        break;
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }

  /**
   * Get transformation statistics
   */
  getTransformationStats(original: any[], transformed: any[]): {
    recordsAdded: number;
    recordsRemoved: number;
    recordsModified: number;
    fieldsAdded: string[];
    fieldsRemoved: string[];
  } {
    const recordsAdded = Math.max(0, transformed.length - original.length);
    const recordsRemoved = Math.max(0, original.length - transformed.length);

    const originalFields = original.length > 0 ? Object.keys(original[0]) : [];
    const transformedFields = transformed.length > 0 ? Object.keys(transformed[0]) : [];

    const fieldsAdded = transformedFields.filter(f => !originalFields.includes(f));
    const fieldsRemoved = originalFields.filter(f => !transformedFields.includes(f));

    return {
      recordsAdded,
      recordsRemoved,
      recordsModified: Math.min(original.length, transformed.length),
      fieldsAdded,
      fieldsRemoved
    };
  }
}

interface Logger {
  error(message: string, meta?: any): void;
  info(message: string, meta?: any): void;
  warn(message: string, meta?: any): void;
  debug(message: string, meta?: any): void;
}
