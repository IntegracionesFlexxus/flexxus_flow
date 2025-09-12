/**
 * Data Mapper - Sprint 4
 * Mapeo automático entre entidades y DTOs
 */
import 'reflect-metadata';
// Metadata keys for mapping configuration
const MAPPING_METADATA_KEY = Symbol('mapping');
const TRANSFORM_METADATA_KEY = Symbol('transform');
export type TransformFunction<T = any, R = any> = (value: T, source?: any, target?: any) => R;
export interface MappingProfile {
  sourceType: string;
  targetType: string;
  mappings: Record<string, string | TransformFunction>;
  beforeMap?: (source: any) => any;
  afterMap?: (target: any, source: any) => any;
}
export interface MappingOptions {
  ignoreNullish?: boolean;
  ignoreUndefined?: boolean;
  skipNullProperties?: boolean;
  deep?: boolean;
  maxDepth?: number;
}
/**
 * Property mapping decorator
 */
export function MapProperty(targetProperty?: string, transform?: TransformFunction): PropertyDecorator {
  return (target: any, propertyKey: string | symbol) => {
    const existingMappings = Reflect.getMetadata(MAPPING_METADATA_KEY, target) || {};
    existingMappings[propertyKey] = targetProperty || propertyKey;
    if (transform) {
      const existingTransforms = Reflect.getMetadata(TRANSFORM_METADATA_KEY, target) || {};
      existingTransforms[propertyKey] = transform;
      Reflect.defineMetadata(TRANSFORM_METADATA_KEY, existingTransforms, target);
    }
    Reflect.defineMetadata(MAPPING_METADATA_KEY, existingMappings, target);
  };
}
/**
 * Ignore property decorator
 */
export function IgnoreProperty(): PropertyDecorator {
  return (target: any, propertyKey: string | symbol) => {
    const existingMappings = Reflect.getMetadata(MAPPING_METADATA_KEY, target) || {};
    existingMappings[propertyKey] = null; // null means ignore
    Reflect.defineMetadata(MAPPING_METADATA_KEY, existingMappings, target);
  };
}
/**
 * Transform property decorator
 */
export function Transform(transform: TransformFunction): PropertyDecorator {
  return (target: any, propertyKey: string | symbol) => {
    const existingTransforms = Reflect.getMetadata(TRANSFORM_METADATA_KEY, target) || {};
    existingTransforms[propertyKey] = transform;
    Reflect.defineMetadata(TRANSFORM_METADATA_KEY, existingTransforms, target);
  };
}
/**
 * Auto mapper class
 */
export class DataMapper {
  private profiles: Map<string, MappingProfile> = new Map();
  private defaultOptions: MappingOptions = {
    ignoreNullish: false,
    ignoreUndefined: false,
    skipNullProperties: false,
    deep: true,
    maxDepth: 10
  };
  /**
   * Register a mapping profile
   */
  addProfile(profile: MappingProfile): void {
    const key = `${profile.sourceType}->${profile.targetType}`;
    this.profiles.set(key, profile);
  }
  /**
   * Create a mapping profile builder
   */
  createProfile<TSource, TTarget>(
    sourceType: string, 
    targetType: string
  ): ProfileBuilder<TSource, TTarget> {
    return new ProfileBuilder<TSource, TTarget>(this, sourceType, targetType);
  }
  /**
   * Map a single object
   */
  map<TSource, TTarget>(
    source: TSource,
    targetType: new () => TTarget,
    options?: MappingOptions
  ): TTarget {
    if (!source) {
      throw new Error('Source object is required');
    }
    const target = new targetType();
    return this.mapToExisting(source, target, options);
  }
  /**
   * Map to an existing target object
   */
  mapToExisting<TSource, TTarget>(
    source: TSource,
    target: TTarget,
    options?: MappingOptions
  ): TTarget {
    const mergedOptions = { ...this.defaultOptions, ...options };
    const sourceTypeName = source.constructor.name;
    const targetTypeName = target.constructor.name;
    const profileKey = `${sourceTypeName}->${targetTypeName}`;
    const profile = this.profiles.get(profileKey);
    if (profile?.beforeMap) {
      source = profile.beforeMap(source);
    }
    // Use profile mappings if available
    if (profile) {
      this.mapWithProfile(source, target, profile, mergedOptions);
    } else {
      // Use reflection-based mapping
      this.mapWithReflection(source, target, mergedOptions);
    }
    if (profile?.afterMap) {
      profile.afterMap(target, source);
    }
    return target;
  }
  /**
   * Map an array of objects
   */
  mapArray<TSource, TTarget>(
    sources: TSource[],
    targetType: new () => TTarget,
    options?: MappingOptions
  ): TTarget[] {
    if (!Array.isArray(sources)) {
      return [];
    }
    return sources.map(source => this.map(source, targetType, options));
  }
  /**
   * Map with a specific profile
   */
  private mapWithProfile<TSource, TTarget>(
    source: TSource,
    target: TTarget,
    profile: MappingProfile,
    options: MappingOptions
  ): void {
    for (const [sourceProperty, targetProperty] of Object.entries(profile.mappings)) {
      if (targetProperty === null) continue; // Ignored property
      const sourceValue = (source as any)[sourceProperty];
      if (this.shouldSkipProperty(sourceValue, options)) {
        continue;
      }
      if (typeof targetProperty === 'function') {
        // Transform function
        (target as any)[sourceProperty] = targetProperty(sourceValue, source, target);
      } else {
        // Direct mapping
        (target as any)[targetProperty] = this.mapValue(sourceValue, options);
      }
    }
  }
  /**
   * Map using reflection metadata
   */
  private mapWithReflection<TSource, TTarget>(
    source: TSource,
    target: TTarget,
    options: MappingOptions
  ): void {
    const sourceMappings = Reflect.getMetadata(MAPPING_METADATA_KEY, source) || {};
    const sourceTransforms = Reflect.getMetadata(TRANSFORM_METADATA_KEY, source) || {};
    const targetMappings = Reflect.getMetadata(MAPPING_METADATA_KEY, target) || {};
    const targetTransforms = Reflect.getMetadata(TRANSFORM_METADATA_KEY, target) || {};
    // Map properties from source
    for (const sourceProperty of Object.keys(source)) {
      const targetProperty = sourceMappings[sourceProperty] || sourceProperty;
      if (targetProperty === null) continue; // Ignored
      const sourceValue = (source as any)[sourceProperty];
      if (this.shouldSkipProperty(sourceValue, options)) {
        continue;
      }
      const transform = sourceTransforms[sourceProperty];
      let mappedValue = sourceValue;
      if (transform) {
        mappedValue = transform(sourceValue, source, target);
      } else {
        mappedValue = this.mapValue(sourceValue, options);
      }
      (target as any)[targetProperty] = mappedValue;
    }
    // Apply target transformations
    for (const [targetProperty, transform] of Object.entries(targetTransforms)) {
      const currentValue = (target as any)[targetProperty];
      (target as any)[targetProperty] = transform(currentValue, source, target);
    }
  }
  /**
   * Map a value recursively if needed
   */
  private mapValue(value: any, options: MappingOptions, currentDepth: number = 0): any {
    if (value === null || value === undefined) {
      return value;
    }
    if (currentDepth >= (options.maxDepth || 10)) {
      return value;
    }
    if (Array.isArray(value)) {
      return options.deep 
        ? value.map(item => this.mapValue(item, options, currentDepth + 1))
        : value;
    }
    if (typeof value === 'object' && value.constructor === Object) {
      if (!options.deep) {
        return value;
      }
      const mapped: any = {};
      for (const [key, val] of Object.entries(value)) {
        if (!this.shouldSkipProperty(val, options)) {
          mapped[key] = this.mapValue(val, options, currentDepth + 1);
        }
      }
      return mapped;
    }
    return value;
  }
  /**
   * Check if property should be skipped
   */
  private shouldSkipProperty(value: any, options: MappingOptions): boolean {
    if (options.ignoreNullish && (value === null || value === undefined)) {
      return true;
    }
    if (options.ignoreUndefined && value === undefined) {
      return true;
    }
    if (options.skipNullProperties && value === null) {
      return true;
    }
    return false;
  }
  /**
   * Clear all profiles
   */
  clearProfiles(): void {
    this.profiles.clear();
  }
  /**
   * Get all registered profiles
   */
  getProfiles(): MappingProfile[] {
    return Array.from(this.profiles.values());
  }
  /**
   * Set default options
   */
  setDefaultOptions(options: MappingOptions): void {
    this.defaultOptions = { ...this.defaultOptions, ...options };
  }
}
/**
 * Profile builder for fluent API
 */
export class ProfileBuilder<TSource, TTarget> {
  private profile: MappingProfile;
  constructor(
    private mapper: DataMapper,
    sourceType: string,
    targetType: string
  ) {
    this.profile = {
      sourceType,
      targetType,
      mappings: {}
    };
  }
  /**
   * Map a property
   */
  mapProperty<K extends keyof TSource>(
    sourceProperty: K,
    targetProperty?: keyof TTarget
  ): this {
    this.profile.mappings[sourceProperty as string] = targetProperty as string || sourceProperty as string;
    return this;
  }
  /**
   * Map a property with transformation
   */
  mapPropertyWithTransform<K extends keyof TSource>(
    sourceProperty: K,
    transform: TransformFunction,
    targetProperty?: keyof TTarget
  ): this {
    const target = targetProperty as string || sourceProperty as string;
    this.profile.mappings[sourceProperty as string] = (value: any, source: any, target: any) => {
      const transformed = transform(value, source, target);
      return transformed;
    };
    return this;
  }
  /**
   * Ignore a property
   */
  ignoreProperty<K extends keyof TSource>(sourceProperty: K): this {
    this.profile.mappings[sourceProperty as string] = null;
    return this;
  }
  /**
   * Add before mapping hook
   */
  beforeMapping(callback: (source: TSource) => TSource): this {
    this.profile.beforeMap = callback;
    return this;
  }
  /**
   * Add after mapping hook
   */
  afterMapping(callback: (target: TTarget, source: TSource) => void): this {
    this.profile.afterMap = callback;
    return this;
  }
  /**
   * Build and register the profile
   */
  build(): void {
    this.mapper.addProfile(this.profile);
  }
}
/**
 * Global mapper instance
 */
export const globalMapper = new DataMapper();
/**
 * Convenience functions using global mapper
 */
export function map<TSource, TTarget>(
  source: TSource,
  targetType: new () => TTarget,
  options?: MappingOptions
): TTarget {
  return globalMapper.map(source, targetType, options);
}
export function mapArray<TSource, TTarget>(
  sources: TSource[],
  targetType: new () => TTarget,
  options?: MappingOptions
): TTarget[] {
  return globalMapper.mapArray(sources, targetType, options);
}
export function mapToExisting<TSource, TTarget>(
  source: TSource,
  target: TTarget,
  options?: MappingOptions
): TTarget {
  return globalMapper.mapToExisting(source, target, options);
}
