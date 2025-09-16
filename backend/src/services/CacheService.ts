import { injectable, inject } from 'inversify';
import * as NodeCache from 'node-cache';
import { ICacheService } from '@interfaces/IServices';
import { IConfig } from '@interfaces/IConfig';
import { ILoggerService } from '@interfaces/IServices';
import { TYPES } from '@container/types';

// Strategy Pattern for cache backends
interface ICacheStrategy {
  get<T>(key: string): Promise<T | null>;
  set<T>(key: string, value: T, ttl?: number): Promise<void>;
  delete(key: string): Promise<boolean>;
  flush(): Promise<void>;
  exists(key: string): Promise<boolean>;
  getTTL(key: string): Promise<number>;
}

// In-memory cache strategy
class MemoryCacheStrategy implements ICacheStrategy {
  private cache: NodeCache;

  constructor(config: { defaultTTL: number; checkPeriod: number }) {
    this.cache = new NodeCache({
      stdTTL: config.defaultTTL,
      checkperiod: config.checkPeriod,
      useClones: false
    });
  }

  async get<T>(key: string): Promise<T | null> {
    const value = this.cache.get<T>(key);
    return value !== undefined ? value : null;
  }

  async set<T>(key: string, value: T, ttl?: number): Promise<void> {
    this.cache.set(key, value, ttl || 0);
  }

  async delete(key: string): Promise<boolean> {
    return this.cache.del(key) > 0;
  }

  async flush(): Promise<void> {
    this.cache.flushAll();
  }

  async exists(key: string): Promise<boolean> {
    return this.cache.has(key);
  }

  async getTTL(key: string): Promise<number> {
    const ttl = this.cache.getTtl(key);
    return ttl ? Math.floor((ttl - Date.now()) / 1000) : 0;
  }

  close(): void {
    this.cache.close();
  }
}

// Redis cache strategy (placeholder for Level 3)
class RedisCacheStrategy implements ICacheStrategy {
  constructor(config: any) {
    // Will be implemented in Level 3 when Redis is added
  }

  async get<T>(key: string): Promise<T | null> {
    // Placeholder
    return null;
  }

  async set<T>(key: string, value: T, ttl?: number): Promise<void> {
    // Placeholder
  }

  async delete(key: string): Promise<boolean> {
    return false;
  }

  async flush(): Promise<void> {
    // Placeholder
  }

  async exists(key: string): Promise<boolean> {
    return false;
  }

  async getTTL(key: string): Promise<number> {
    return 0;
  }
}

@injectable()
export class CacheService implements ICacheService {
  private strategy: ICacheStrategy;
  private stats: {
    hits: number;
    misses: number;
    sets: number;
    deletes: number;
  };

  constructor(
    @inject(TYPES.Config) private config: IConfig,
    @inject(TYPES.LoggerService) private logger: ILoggerService
  ) {
    // Use Strategy Pattern to select cache backend
    if (this.config.cache.redis && !this.config.isDevelopment()) {
      this.strategy = new RedisCacheStrategy(this.config.cache.redis);
      this.logger.info('Cache Service using Redis strategy');
    } else {
      this.strategy = new MemoryCacheStrategy({
        defaultTTL: this.config.cache.defaultTTL,
        checkPeriod: this.config.cache.checkPeriod
      });
      this.logger.info('Cache Service using Memory strategy');
    }

    this.stats = {
      hits: 0,
      misses: 0,
      sets: 0,
      deletes: 0
    };
  }

  async initialize(): Promise<void> {
    this.logger.info('Cache Service initialized');
  }

  async shutdown(): Promise<void> {
    await this.flush();
    if (this.strategy instanceof MemoryCacheStrategy) {
      (this.strategy as MemoryCacheStrategy).close();
    }
    this.logger.info('Cache Service shut down', { stats: this.stats });
  }

  async get<T>(key: string): Promise<T | null> {
    try {
      const value = await this.strategy.get<T>(key);
      
      if (value !== null) {
        this.stats.hits++;
        this.logger.debug(`Cache hit: ${key}`);
      } else {
        this.stats.misses++;
        this.logger.debug(`Cache miss: ${key}`);
      }
      
      return value;
    } catch (error) {
      this.logger.error(`Cache get error for key ${key}`, error as Error);
      return null;
    }
  }

  async set<T>(key: string, value: T, ttl?: number): Promise<void> {
    try {
      await this.strategy.set(key, value, ttl || this.config.cache.defaultTTL);
      this.stats.sets++;
      this.logger.debug(`Cache set: ${key}`, { ttl });
    } catch (error) {
      this.logger.error(`Cache set error for key ${key}`, error as Error);
    }
  }

  async delete(key: string): Promise<boolean> {
    try {
      const result = await this.strategy.delete(key);
      if (result) {
        this.stats.deletes++;
        this.logger.debug(`Cache delete: ${key}`);
      }
      return result;
    } catch (error) {
      this.logger.error(`Cache delete error for key ${key}`, error as Error);
      return false;
    }
  }

  async flush(): Promise<void> {
    try {
      await this.strategy.flush();
      this.logger.info('Cache flushed');
    } catch (error) {
      this.logger.error('Cache flush error', error as Error);
    }
  }

  async exists(key: string): Promise<boolean> {
    try {
      return await this.strategy.exists(key);
    } catch (error) {
      this.logger.error(`Cache exists error for key ${key}`, error as Error);
      return false;
    }
  }

  async getTTL(key: string): Promise<number> {
    try {
      return await this.strategy.getTTL(key);
    } catch (error) {
      this.logger.error(`Cache getTTL error for key ${key}`, error as Error);
      return 0;
    }
  }

  // Utility methods following SRP
  async remember<T>(key: string, factory: () => Promise<T>, ttl?: number): Promise<T> {
    let value = await this.get<T>(key);
    
    if (value === null) {
      value = await factory();
      await this.set(key, value, ttl);
    }
    
    return value;
  }

  async invalidate(pattern: string): Promise<number> {
    // Invalidate all keys matching a pattern
    // This is a simplified version for memory cache
    let count = 0;
    // Implementation would depend on the strategy
    this.logger.info(`Invalidated ${count} keys matching pattern: ${pattern}`);
    return count;
  }

  getStats(): { hits: number; misses: number; sets: number; deletes: number; hitRate: number } {
    const total = this.stats.hits + this.stats.misses;
    const hitRate = total > 0 ? (this.stats.hits / total) * 100 : 0;
    
    return {
      ...this.stats,
      hitRate: Math.round(hitRate * 100) / 100
    };
  }
}