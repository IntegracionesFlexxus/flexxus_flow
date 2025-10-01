/**
 * Smart Cache Service - Sprint 10
 * Intelligent caching system with TTL, LRU eviction, and performance optimization
 */

import { injectable, inject } from 'inversify';
import { TYPES } from '@/container/types';
import { LoggerFactory } from '@/shared/services/logger/LoggerService';
import { EventEmitter } from 'events';

export interface ICacheEntry {
  key: string;
  value: any;
  ttl: number;
  created_at: Date;
  accessed_at: Date;
  access_count: number;
  size: number;
  tags: string[];
}

export interface ICacheStats {
  total_entries: number;
  total_size: number;
  hit_count: number;
  miss_count: number;
  hit_rate: number;
  eviction_count: number;
  memory_usage: number;
  oldest_entry?: Date;
  newest_entry?: Date;
}

export interface ICacheConfig {
  max_memory: number; // bytes
  max_entries: number;
  default_ttl: number; // seconds
  cleanup_interval: number; // seconds
  enable_compression: boolean;
  enable_stats: boolean;
}

@injectable()
export class SmartCacheService extends EventEmitter {
  private logger: any;
  private cache: Map<string, ICacheEntry> = new Map();
  private accessOrder: string[] = []; // For LRU tracking
  private stats: ICacheStats;
  private cleanupInterval?: NodeJS.Timer;
  private config: ICacheConfig;

  private readonly DEFAULT_CONFIG: ICacheConfig = {
    max_memory: 100 * 1024 * 1024, // 100MB
    max_entries: 10000,
    default_ttl: 3600, // 1 hour
    cleanup_interval: 300, // 5 minutes
    enable_compression: true,
    enable_stats: true
  };

  constructor() {
    super();
    this.logger = LoggerFactory.create({ file: __filename });
    this.config = { ...this.DEFAULT_CONFIG };
    this.stats = this.initializeStats();
    this.startCleanupJob();
  }

  /**
   * Initialize cache statistics
   */
  private initializeStats(): ICacheStats {
    return {
      total_entries: 0,
      total_size: 0,
      hit_count: 0,
      miss_count: 0,
      hit_rate: 0,
      eviction_count: 0,
      memory_usage: 0
    };
  }

  /**
   * Set cache entry with optional TTL and tags
   */
  async set(
    key: string,
    value: any,
    options?: {
      ttl?: number;
      tags?: string[];
      compress?: boolean;
    }
  ): Promise<void> {
    try {
      const ttl = options?.ttl || this.config.default_ttl;
      const tags = options?.tags || [];
      const compress = options?.compress !== undefined ? options.compress : this.config.enable_compression;

      // Prepare value for storage
      let processedValue = value;
      if (compress && this.shouldCompress(value)) {
        processedValue = await this.compressValue(value);
      }

      const size = this.calculateSize(processedValue);

      // Check memory limits
      await this.ensureMemoryLimit(size);

      const entry: ICacheEntry = {
        key,
        value: processedValue,
        ttl,
        created_at: new Date(),
        accessed_at: new Date(),
        access_count: 0,
        size,
        tags
      };

      // Remove existing entry if it exists
      if (this.cache.has(key)) {
        await this.remove(key);
      }

      // Add new entry
      this.cache.set(key, entry);
      this.updateAccessOrder(key);

      // Update statistics
      this.stats.total_entries++;
      this.stats.total_size += size;
      this.stats.memory_usage = this.calculateMemoryUsage();

      this.emit('cache:set', { key, size, ttl });

      this.logger.debug('Cache entry set', { key, size, ttl, tags });
    } catch (error: any) {
      this.logger.error('Failed to set cache entry', { key, error: error.message });
      throw error;
    }
  }

  /**
   * Get cache entry by key
   */
  async get(key: string): Promise<any> {
    try {
      const entry = this.cache.get(key);

      if (!entry) {
        this.stats.miss_count++;
        this.updateHitRate();
        this.emit('cache:miss', { key });
        return null;
      }

      // Check TTL
      if (this.isExpired(entry)) {
        await this.remove(key);
        this.stats.miss_count++;
        this.updateHitRate();
        this.emit('cache:expired', { key });
        return null;
      }

      // Update access tracking
      entry.accessed_at = new Date();
      entry.access_count++;
      this.updateAccessOrder(key);

      // Update statistics
      this.stats.hit_count++;
      this.updateHitRate();

      // Decompress if needed
      let value = entry.value;
      if (this.isCompressed(value)) {
        value = await this.decompressValue(value);
      }

      this.emit('cache:hit', { key });

      this.logger.debug('Cache entry retrieved', { key, access_count: entry.access_count });

      return value;
    } catch (error: any) {
      this.logger.error('Failed to get cache entry', { key, error: error.message });
      this.stats.miss_count++;
      this.updateHitRate();
      return null;
    }
  }

  /**
   * Remove cache entry by key
   */
  async remove(key: string): Promise<boolean> {
    try {
      const entry = this.cache.get(key);

      if (!entry) {
        return false;
      }

      this.cache.delete(key);
      this.removeFromAccessOrder(key);

      // Update statistics
      this.stats.total_entries--;
      this.stats.total_size -= entry.size;
      this.stats.memory_usage = this.calculateMemoryUsage();

      this.emit('cache:remove', { key, size: entry.size });

      this.logger.debug('Cache entry removed', { key, size: entry.size });

      return true;
    } catch (error: any) {
      this.logger.error('Failed to remove cache entry', { key, error: error.message });
      return false;
    }
  }

  /**
   * Clear all cache entries
   */
  async clear(): Promise<void> {
    try {
      const entryCount = this.cache.size;

      this.cache.clear();
      this.accessOrder = [];

      this.stats = this.initializeStats();

      this.emit('cache:clear', { entries_cleared: entryCount });

      this.logger.info('Cache cleared', { entries_cleared: entryCount });
    } catch (error: any) {
      this.logger.error('Failed to clear cache', error);
      throw error;
    }
  }

  /**
   * Clear cache entries by tags
   */
  async clearByTags(tags: string[]): Promise<number> {
    try {
      let removedCount = 0;
      const keysToRemove: string[] = [];

      for (const [key, entry] of this.cache.entries()) {
        if (entry.tags.some(tag => tags.includes(tag))) {
          keysToRemove.push(key);
        }
      }

      for (const key of keysToRemove) {
        if (await this.remove(key)) {
          removedCount++;
        }
      }

      this.emit('cache:clear_by_tags', { tags, removed_count: removedCount });

      this.logger.info('Cache entries cleared by tags', { tags, removed_count: removedCount });

      return removedCount;
    } catch (error: any) {
      this.logger.error('Failed to clear cache by tags', { tags, error: error.message });
      return 0;
    }
  }

  /**
   * Get cache statistics
   */
  getStats(): ICacheStats {
    return { ...this.stats };
  }

  /**
   * Check if key exists in cache
   */
  async has(key: string): Promise<boolean> {
    const entry = this.cache.get(key);

    if (!entry) {
      return false;
    }

    if (this.isExpired(entry)) {
      await this.remove(key);
      return false;
    }

    return true;
  }

  /**
   * Get multiple cache entries
   */
  async getMultiple(keys: string[]): Promise<Map<string, any>> {
    const results = new Map<string, any>();

    for (const key of keys) {
      const value = await this.get(key);
      if (value !== null) {
        results.set(key, value);
      }
    }

    return results;
  }

  /**
   * Set multiple cache entries
   */
  async setMultiple(
    entries: Array<{
      key: string;
      value: any;
      options?: { ttl?: number; tags?: string[] };
    }>
  ): Promise<void> {
    for (const entry of entries) {
      await this.set(entry.key, entry.value, entry.options);
    }
  }

  /**
   * Update cache configuration
   */
  updateConfig(config: Partial<ICacheConfig>): void {
    this.config = { ...this.config, ...config };
    this.logger.info('Cache configuration updated', { config });
    this.emit('cache:config_updated', { config: this.config });
  }

  /**
   * Warm up cache with predefined data
   */
  async warmUp(entries: Array<{ key: string; value: any; ttl?: number }>): Promise<void> {
    this.logger.info('Starting cache warm-up', { entries_count: entries.length });

    for (const entry of entries) {
      await this.set(entry.key, entry.value, { ttl: entry.ttl });
    }

    this.logger.info('Cache warm-up completed', { entries_count: entries.length });
    this.emit('cache:warmed_up', { entries_count: entries.length });
  }

  /**
   * Check if entry is expired
   */
  private isExpired(entry: ICacheEntry): boolean {
    const now = Date.now();
    const expiresAt = entry.created_at.getTime() + (entry.ttl * 1000);
    return now > expiresAt;
  }

  /**
   * Update access order for LRU tracking
   */
  private updateAccessOrder(key: string): void {
    // Remove key if it exists
    this.removeFromAccessOrder(key);

    // Add to end (most recently used)
    this.accessOrder.push(key);
  }

  /**
   * Remove key from access order
   */
  private removeFromAccessOrder(key: string): void {
    const index = this.accessOrder.indexOf(key);
    if (index > -1) {
      this.accessOrder.splice(index, 1);
    }
  }

  /**
   * Ensure memory limit is not exceeded
   */
  private async ensureMemoryLimit(newEntrySize: number): Promise<void> {
    const currentMemory = this.stats.memory_usage;
    const requiredMemory = currentMemory + newEntrySize;

    if (requiredMemory <= this.config.max_memory && this.cache.size < this.config.max_entries) {
      return;
    }

    // Evict entries using LRU strategy
    await this.evictLRU(requiredMemory - this.config.max_memory + newEntrySize);
  }

  /**
   * Evict least recently used entries
   */
  private async evictLRU(bytesToFree: number): Promise<void> {
    let freedBytes = 0;
    let evictedCount = 0;

    while (freedBytes < bytesToFree && this.accessOrder.length > 0) {
      const oldestKey = this.accessOrder[0];
      const entry = this.cache.get(oldestKey);

      if (entry) {
        freedBytes += entry.size;
        evictedCount++;
        await this.remove(oldestKey);
      } else {
        this.removeFromAccessOrder(oldestKey);
      }
    }

    this.stats.eviction_count += evictedCount;

    this.logger.debug('LRU eviction completed', {
      evicted_count: evictedCount,
      freed_bytes: freedBytes
    });

    this.emit('cache:eviction', {
      evicted_count: evictedCount,
      freed_bytes: freedBytes
    });
  }

  /**
   * Clean up expired entries
   */
  private async cleanupExpired(): Promise<void> {
    const expiredKeys: string[] = [];

    for (const [key, entry] of this.cache.entries()) {
      if (this.isExpired(entry)) {
        expiredKeys.push(key);
      }
    }

    for (const key of expiredKeys) {
      await this.remove(key);
    }

    if (expiredKeys.length > 0) {
      this.logger.debug('Expired entries cleaned up', { count: expiredKeys.length });
      this.emit('cache:cleanup', { expired_count: expiredKeys.length });
    }
  }

  /**
   * Start periodic cleanup job
   */
  private startCleanupJob(): void {
    this.cleanupInterval = setInterval(async () => {
      try {
        await this.cleanupExpired();
      } catch (error) {
        this.logger.error('Cache cleanup job failed', error);
      }
    }, this.config.cleanup_interval * 1000);

    this.logger.info('Cache cleanup job started', {
      interval: this.config.cleanup_interval
    });
  }

  /**
   * Calculate memory usage
   */
  private calculateMemoryUsage(): number {
    return this.stats.total_size + (this.cache.size * 200); // Estimate overhead per entry
  }

  /**
   * Calculate size of value
   */
  private calculateSize(value: any): number {
    try {
      return JSON.stringify(value).length * 2; // Estimate UTF-16 encoding
    } catch {
      return 100; // Default size for non-serializable values
    }
  }

  /**
   * Update hit rate statistics
   */
  private updateHitRate(): void {
    const totalRequests = this.stats.hit_count + this.stats.miss_count;
    this.stats.hit_rate = totalRequests > 0 ? (this.stats.hit_count / totalRequests) * 100 : 0;
  }

  /**
   * Check if value should be compressed
   */
  private shouldCompress(value: any): boolean {
    if (!this.config.enable_compression) return false;

    const size = this.calculateSize(value);
    return size > 1024; // Compress values larger than 1KB
  }

  /**
   * Compress value (mock implementation)
   */
  private async compressValue(value: any): Promise<any> {
    // Mock compression - in production, use actual compression library
    return {
      __compressed: true,
      data: JSON.stringify(value),
      original_size: this.calculateSize(value)
    };
  }

  /**
   * Decompress value (mock implementation)
   */
  private async decompressValue(compressedValue: any): Promise<any> {
    if (!this.isCompressed(compressedValue)) {
      return compressedValue;
    }

    try {
      return JSON.parse(compressedValue.data);
    } catch {
      return compressedValue;
    }
  }

  /**
   * Check if value is compressed
   */
  private isCompressed(value: any): boolean {
    return value && typeof value === 'object' && value.__compressed === true;
  }

  /**
   * Cleanup resources
   */
  async cleanup(): Promise<void> {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = undefined;
    }

    await this.clear();
    this.removeAllListeners();

    this.logger.info('SmartCacheService cleaned up');
  }
}