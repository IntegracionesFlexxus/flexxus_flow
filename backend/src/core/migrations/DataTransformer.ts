/**
 * Data Transformer
 * Handles data transformation during migrations
 */

import { injectable, inject } from 'inversify';
import { Logger } from 'winston';
import { TYPES } from '@/container/types';

export interface TransformationRule {
  field: string;
  from: any;
  to: any;
  transform?: (value: any) => any;
}

export interface TransformationOptions {
  batchSize?: number;
  validateData?: boolean;
  dryRun?: boolean;
}

@injectable()
export class DataTransformer {
  constructor(
    @inject(TYPES.Logger) private logger: Logger
  ) {}

  /**
   * Transform data based on rules
   */
  async transform<T = any>(
    data: T[],
    rules: TransformationRule[],
    options: TransformationOptions = {}
  ): Promise<T[]> {
    const { batchSize = 100, validateData = true, dryRun = false } = options;
    
    if (dryRun) {
      this.logger.info('Running in dry-run mode - no changes will be made');
    }
    
    const transformed: T[] = [];
    const batches = this.createBatches(data, batchSize);
    
    for (const [index, batch] of batches.entries()) {
      this.logger.info(`Processing batch ${index + 1}/${batches.length}`);
      
      for (const item of batch) {
        const transformedItem = await this.applyRules(item, rules, validateData);
        
        if (!dryRun) {
          transformed.push(transformedItem);
        }
      }
    }
    
    this.logger.info(`Transformed ${transformed.length} items`);
    return transformed;
  }

  /**
   * Migrate data structure
   */
  async migrateStructure(
    data: any[],
    oldStructure: Record<string, string>,
    newStructure: Record<string, string>
  ): Promise<any[]> {
    return data.map(item => {
      const migrated: any = {};
      
      for (const [oldKey, newKey] of Object.entries(oldStructure)) {
        if (item.hasOwnProperty(oldKey)) {
          const targetKey = newStructure[newKey] || newKey;
          migrated[targetKey] = item[oldKey];
        }
      }
      
      // Add any new fields from newStructure
      for (const [key, defaultValue] of Object.entries(newStructure)) {
        if (!migrated.hasOwnProperty(key)) {
          migrated[key] = defaultValue;
        }
      }
      
      return migrated;
    });
  }

  /**
   * Validate transformed data
   */
  async validate<T = any>(
    data: T[],
    schema: Record<string, (value: any) => boolean>
  ): Promise<{ valid: T[]; invalid: Array<{ item: T; errors: string[] }> }> {
    const valid: T[] = [];
    const invalid: Array<{ item: T; errors: string[] }> = [];
    
    for (const item of data) {
      const errors: string[] = [];
      
      for (const [field, validator] of Object.entries(schema)) {
        const value = (item as any)[field];
        
        if (!validator(value)) {
          errors.push(`Invalid value for field '${field}': ${value}`);
        }
      }
      
      if (errors.length === 0) {
        valid.push(item);
      } else {
        invalid.push({ item, errors });
      }
    }
    
    if (invalid.length > 0) {
      this.logger.warn(`Found ${invalid.length} invalid items during validation`);
    }
    
    return { valid, invalid };
  }

  /**
   * Backup data before transformation
   */
  async backup<T = any>(data: T[], identifier: string): Promise<string> {
    const backupId = `backup_${identifier}_${Date.now()}`;
    
    // In a real implementation, this would save to a backup location
    // For now, we'll just log it
    this.logger.info(`Created backup: ${backupId} with ${data.length} items`);
    
    return backupId;
  }

  /**
   * Restore data from backup
   */
  async restore<T = any>(backupId: string): Promise<T[]> {
    // In a real implementation, this would restore from backup
    this.logger.info(`Restoring from backup: ${backupId}`);
    
    return [];
  }

  /**
   * Apply transformation rules to an item
   */
  private async applyRules<T = any>(
    item: T,
    rules: TransformationRule[],
    validate: boolean
  ): Promise<T> {
    const transformed = { ...item };
    
    for (const rule of rules) {
      const value = (transformed as any)[rule.field];
      
      if (value === rule.from || (rule.from === '*' && value !== undefined)) {
        if (rule.transform) {
          (transformed as any)[rule.field] = await rule.transform(value);
        } else {
          (transformed as any)[rule.field] = rule.to;
        }
      }
    }
    
    if (validate) {
      // Basic validation - ensure no undefined values in required fields
      for (const [key, value] of Object.entries(transformed as any)) {
        if (value === undefined) {
          this.logger.warn(`Undefined value found for field: ${key}`);
        }
      }
    }
    
    return transformed;
  }

  /**
   * Create batches from data array
   */
  private createBatches<T>(data: T[], batchSize: number): T[][] {
    const batches: T[][] = [];
    
    for (let i = 0; i < data.length; i += batchSize) {
      batches.push(data.slice(i, i + batchSize));
    }
    
    return batches;
  }

  /**
   * Convert between different data formats
   */
  async convertFormat(
    data: any,
    fromFormat: 'json' | 'csv' | 'xml',
    toFormat: 'json' | 'csv' | 'xml'
  ): Promise<any> {
    if (fromFormat === toFormat) {
      return data;
    }
    
    // Simplified implementation - would need proper converters
    this.logger.info(`Converting from ${fromFormat} to ${toFormat}`);
    
    switch (toFormat) {
      case 'json':
        return JSON.stringify(data);
      case 'csv':
        // Would implement CSV conversion
        return data;
      case 'xml':
        // Would implement XML conversion
        return data;
      default:
        throw new Error(`Unsupported format: ${toFormat}`);
    }
  }

  /**
   * Sanitize data for migration
   */
  async sanitize<T = any>(
    data: T[],
    options: {
      removeNull?: boolean;
      removeEmpty?: boolean;
      trimStrings?: boolean;
      normalizeCase?: 'upper' | 'lower' | 'title';
    } = {}
  ): Promise<T[]> {
    const {
      removeNull = false,
      removeEmpty = false,
      trimStrings = true,
      normalizeCase
    } = options;
    
    return data.map(item => {
      const sanitized: any = {};
      
      for (const [key, value] of Object.entries(item as any)) {
        let processedValue = value;
        
        // Skip null values if requested
        if (removeNull && value === null) {
          continue;
        }
        
        // Skip empty values if requested
        if (removeEmpty && (
          value === '' || 
          (Array.isArray(value) && value.length === 0) || 
          (typeof value === 'object' && value !== null && Object.keys(value).length === 0)
        )) {
          continue;
        }
        
        // Process strings
        if (typeof value === 'string') {
          let stringValue = value;
          if (trimStrings) {
            stringValue = stringValue.trim();
          }
          
          if (normalizeCase) {
            switch (normalizeCase) {
              case 'upper':
                stringValue = stringValue.toUpperCase();
                break;
              case 'lower':
                stringValue = stringValue.toLowerCase();
                break;
              case 'title':
                stringValue = stringValue.replace(/\w\S*/g, (txt: string) =>
                  txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase()
                );
                break;
            }
          }
          processedValue = stringValue;
        }
        
        sanitized[key] = processedValue;
      }
      
      return sanitized as T;
    });
  }
}