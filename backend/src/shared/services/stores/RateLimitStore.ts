/**
 * Rate Limit Store Abstraction - Sprint 2
 * Siguiendo lineamientos nivel 2: abstracción de almacenamiento flexible
 */

import { injectable, inject } from 'inversify';
import { Logger } from 'winston';
import { TYPES } from '@/container/types';
import { RateLimitInfo, RateLimitKey } from '@/shared/services/RateLimitingService';
import { RateLimitConfig } from '@/config/rateLimiting';
import { environment } from '@/config/environment';

export interface RateLimitStoreEntry {
  count: number;
  resetTime: number;
  firstRequest: number;
  lastRequest: number;
}

export interface RateLimitStore {
  get(key: string): Promise<RateLimitStoreEntry | null>;
  set(key: string, entry: RateLimitStoreEntry, ttlSeconds?: number): Promise<void>;
  increment(key: string, resetTime: number, ttlSeconds?: number): Promise<RateLimitStoreEntry>;
  delete(key: string): Promise<boolean>;
  clear(): Promise<void>;
  size(): Promise<number>;
  keys(pattern?: string): Promise<string[]>;
  disconnect(): Promise<void>;
}

/**
 * Memory-based Rate Limit Store
 * Para desarrollo y aplicaciones de baja escala
 */
@injectable()
export class MemoryRateLimitStore implements RateLimitStore {
  private store = new Map<string, RateLimitStoreEntry>();
  private cleanupInterval: NodeJS.Timeout;

  constructor(
    @inject(TYPES.Logger) private logger: Logger
  ) {
    // Cleanup cada 5 minutos
    this.cleanupInterval = setInterval(() => {
      this.cleanup();
    }, 5 * 60 * 1000);

    this.logger.debug('Memory rate limit store initialized');
  }

  async get(key: string): Promise<RateLimitStoreEntry | null> {
    const entry = this.store.get(key);

    if (!entry) {
      return null;
    }

    // Verificar si la entrada ha expirado
    if (Date.now() > entry.resetTime) {
      this.store.delete(key);
      return null;
    }

    return entry;
  }

  async set(key: string, entry: RateLimitStoreEntry, ttlSeconds?: number): Promise<void> {
    this.store.set(key, entry);
  }

  async increment(key: string, resetTime: number, ttlSeconds?: number): Promise<RateLimitStoreEntry> {
    const existing = await this.get(key);
    const now = Date.now();

    if (!existing || now > existing.resetTime) {
      // Nueva ventana
      const entry: RateLimitStoreEntry = {
        count: 1,
        resetTime,
        firstRequest: now,
        lastRequest: now
      };
      await this.set(key, entry, ttlSeconds);
      return entry;
    }

    // Incrementar contador existente
    existing.count++;
    existing.lastRequest = now;
    await this.set(key, existing, ttlSeconds);
    return existing;
  }

  async delete(key: string): Promise<boolean> {
    return this.store.delete(key);
  }

  async clear(): Promise<void> {
    this.store.clear();
  }

  async size(): Promise<number> {
    return this.store.size;
  }

  async keys(pattern?: string): Promise<string[]> {
    const allKeys = Array.from(this.store.keys());

    if (!pattern) {
      return allKeys;
    }

    // Implementación básica de pattern matching
    const regex = new RegExp(pattern.replace(/\*/g, '.*'));
    return allKeys.filter(key => regex.test(key));
  }

  async disconnect(): Promise<void> {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }
    this.store.clear();
    this.logger.debug('Memory rate limit store disconnected');
  }

  private cleanup(): void {
    const now = Date.now();
    let cleaned = 0;

    for (const [key, entry] of this.store.entries()) {
      if (now > entry.resetTime) {
        this.store.delete(key);
        cleaned++;
      }
    }

    if (cleaned > 0) {
      this.logger.debug(`Cleaned up ${cleaned} expired rate limit entries`);
    }
  }
}

/**
 * Redis-based Rate Limit Store
 * Para aplicaciones de alta escala y múltiples instancias
 */
@injectable()
export class RedisRateLimitStore implements RateLimitStore {
  private keyPrefix = 'rl:store:';

  constructor(
    @inject(TYPES.RedisClient) private redisClient: any,
    @inject(TYPES.Logger) private logger: Logger
  ) {
    this.logger.debug('Redis rate limit store initialized');
  }

  async get(key: string): Promise<RateLimitStoreEntry | null> {
    try {
      const redisKey = this.keyPrefix + key;
      const data = await this.redisClient.get(redisKey);

      if (!data) {
        return null;
      }

      const entry = JSON.parse(data) as RateLimitStoreEntry;

      // Verificar expiración
      if (Date.now() > entry.resetTime) {
        await this.redisClient.del(redisKey);
        return null;
      }

      return entry;
    } catch (error) {
      this.logger.warn('Error getting from Redis rate limit store', {
        error: error.message,
        key
      });
      return null;
    }
  }

  async set(key: string, entry: RateLimitStoreEntry, ttlSeconds?: number): Promise<void> {
    try {
      const redisKey = this.keyPrefix + key;
      const data = JSON.stringify(entry);

      if (ttlSeconds) {
        await this.redisClient.setex(redisKey, ttlSeconds, data);
      } else {
        await this.redisClient.set(redisKey, data);
      }
    } catch (error) {
      this.logger.error('Error setting in Redis rate limit store', {
        error: error.message,
        key
      });
      throw error;
    }
  }

  async increment(key: string, resetTime: number, ttlSeconds?: number): Promise<RateLimitStoreEntry> {
    try {
      const existing = await this.get(key);
      const now = Date.now();

      if (!existing || now > existing.resetTime) {
        // Nueva ventana
        const entry: RateLimitStoreEntry = {
          count: 1,
          resetTime,
          firstRequest: now,
          lastRequest: now
        };
        await this.set(key, entry, ttlSeconds);
        return entry;
      }

      // Incrementar contador existente
      existing.count++;
      existing.lastRequest = now;
      await this.set(key, existing, ttlSeconds);
      return existing;
    } catch (error) {
      this.logger.error('Error incrementing in Redis rate limit store', {
        error: error.message,
        key
      });
      throw error;
    }
  }

  async delete(key: string): Promise<boolean> {
    try {
      const redisKey = this.keyPrefix + key;
      const result = await this.redisClient.del(redisKey);
      return result > 0;
    } catch (error) {
      this.logger.warn('Error deleting from Redis rate limit store', {
        error: error.message,
        key
      });
      return false;
    }
  }

  async clear(): Promise<void> {
    try {
      const pattern = this.keyPrefix + '*';
      const keys = await this.redisClient.keys(pattern);

      if (keys.length > 0) {
        await this.redisClient.del(...keys);
      }
    } catch (error) {
      this.logger.error('Error clearing Redis rate limit store', {
        error: error.message
      });
      throw error;
    }
  }

  async size(): Promise<number> {
    try {
      const pattern = this.keyPrefix + '*';
      const keys = await this.redisClient.keys(pattern);
      return keys.length;
    } catch (error) {
      this.logger.warn('Error getting size of Redis rate limit store', {
        error: error.message
      });
      return 0;
    }
  }

  async keys(pattern?: string): Promise<string[]> {
    try {
      const searchPattern = this.keyPrefix + (pattern || '*');
      const redisKeys = await this.redisClient.keys(searchPattern);

      // Remover el prefijo de las keys
      return redisKeys.map((key: string) => key.replace(this.keyPrefix, ''));
    } catch (error) {
      this.logger.warn('Error getting keys from Redis rate limit store', {
        error: error.message,
        pattern
      });
      return [];
    }
  }

  async disconnect(): Promise<void> {
    try {
      if (this.redisClient.disconnect) {
        await this.redisClient.disconnect();
      }
      this.logger.debug('Redis rate limit store disconnected');
    } catch (error) {
      this.logger.warn('Error disconnecting Redis rate limit store', {
        error: error.message
      });
    }
  }
}

/**
 * Database-based Rate Limit Store
 * Para persistencia a largo plazo y auditoría
 */
@injectable()
export class DatabaseRateLimitStore implements RateLimitStore {
  private tableName = 'rate_limit_entries';

  constructor(
    @inject(TYPES.DatabaseConnection) private db: any,
    @inject(TYPES.Logger) private logger: Logger
  ) {
    this.logger.debug('Database rate limit store initialized');
  }

  async get(key: string): Promise<RateLimitStoreEntry | null> {
    try {
      const result = await this.db.query(
        `SELECT * FROM ${this.tableName} WHERE key = ? AND reset_time > ?`,
        [key, Date.now()]
      );

      if (result.length === 0) {
        return null;
      }

      const row = result[0];
      return {
        count: row.count,
        resetTime: row.reset_time,
        firstRequest: row.first_request,
        lastRequest: row.last_request
      };
    } catch (error) {
      this.logger.error('Error getting from database rate limit store', {
        error: error.message,
        key
      });
      return null;
    }
  }

  async set(key: string, entry: RateLimitStoreEntry, ttlSeconds?: number): Promise<void> {
    try {
      await this.db.query(
        `INSERT INTO ${this.tableName} (key, count, reset_time, first_request, last_request, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, NOW(), NOW())
         ON DUPLICATE KEY UPDATE 
           count = VALUES(count),
           reset_time = VALUES(reset_time),
           last_request = VALUES(last_request),
           updated_at = NOW()`,
        [key, entry.count, entry.resetTime, entry.firstRequest, entry.lastRequest]
      );
    } catch (error) {
      this.logger.error('Error setting in database rate limit store', {
        error: error.message,
        key
      });
      throw error;
    }
  }

  async increment(key: string, resetTime: number, ttlSeconds?: number): Promise<RateLimitStoreEntry> {
    try {
      const existing = await this.get(key);
      const now = Date.now();

      if (!existing || now > existing.resetTime) {
        // Nueva ventana
        const entry: RateLimitStoreEntry = {
          count: 1,
          resetTime,
          firstRequest: now,
          lastRequest: now
        };
        await this.set(key, entry, ttlSeconds);
        return entry;
      }

      // Incrementar contador existente
      existing.count++;
      existing.lastRequest = now;
      await this.set(key, existing, ttlSeconds);
      return existing;
    } catch (error) {
      this.logger.error('Error incrementing in database rate limit store', {
        error: error.message,
        key
      });
      throw error;
    }
  }

  async delete(key: string): Promise<boolean> {
    try {
      const result = await this.db.query(
        `DELETE FROM ${this.tableName} WHERE key = ?`,
        [key]
      );
      return result.affectedRows > 0;
    } catch (error) {
      this.logger.error('Error deleting from database rate limit store', {
        error: error.message,
        key
      });
      return false;
    }
  }

  async clear(): Promise<void> {
    try {
      await this.db.query(`DELETE FROM ${this.tableName}`);
    } catch (error) {
      this.logger.error('Error clearing database rate limit store', {
        error: error.message
      });
      throw error;
    }
  }

  async size(): Promise<number> {
    try {
      const result = await this.db.query(
        `SELECT COUNT(*) as count FROM ${this.tableName} WHERE reset_time > ?`,
        [Date.now()]
      );
      return result[0]?.count || 0;
    } catch (error) {
      this.logger.warn('Error getting size of database rate limit store', {
        error: error.message
      });
      return 0;
    }
  }

  async keys(pattern?: string): Promise<string[]> {
    try {
      let query = `SELECT DISTINCT key FROM ${this.tableName} WHERE reset_time > ?`;
      const params: any[] = [Date.now()];

      if (pattern) {
        query += ` AND key LIKE ?`;
        params.push(pattern.replace(/\*/g, '%'));
      }

      const result = await this.db.query(query, params);
      return result.map((row: any) => row.key);
    } catch (error) {
      this.logger.warn('Error getting keys from database rate limit store', {
        error: error.message,
        pattern
      });
      return [];
    }
  }

  async disconnect(): Promise<void> {
    try {
      if (this.db.close) {
        await this.db.close();
      }
      this.logger.debug('Database rate limit store disconnected');
    } catch (error) {
      this.logger.warn('Error disconnecting database rate limit store', {
        error: error.message
      });
    }
  }

  /**
   * Limpia entradas expiradas de la base de datos
   */
  async cleanup(): Promise<number> {
    try {
      const result = await this.db.query(
        `DELETE FROM ${this.tableName} WHERE reset_time <= ?`,
        [Date.now()]
      );

      const deleted = result.affectedRows || 0;
      if (deleted > 0) {
        this.logger.info(`Cleaned up ${deleted} expired rate limit entries from database`);
      }

      return deleted;
    } catch (error) {
      this.logger.error('Error cleaning up database rate limit store', {
        error: error.message
      });
      return 0;
    }
  }
}

/**
 * Factory para crear stores de rate limiting
 */
@injectable()
export class RateLimitStoreFactory {
  constructor(
    @inject(TYPES.Logger) private logger: Logger
  ) {}

  createStore(type: 'memory' | 'redis' | 'database' = 'memory'): RateLimitStore {
    switch (type) {
      case 'memory':
        return new MemoryRateLimitStore(this.logger);

      case 'redis':
        // En una implementación real, inyectarías el cliente Redis
        return new RedisRateLimitStore(null, this.logger);

      case 'database':
        // En una implementación real, inyectarías la conexión de BD
        return new DatabaseRateLimitStore(null, this.logger);

      default:
        this.logger.warn(`Unknown store type: ${type}, falling back to memory`);
        return new MemoryRateLimitStore(this.logger);
    }
  }

  /**
   * Crea un store híbrido que usa múltiples backends
   */
  createHybridStore(
    primary: RateLimitStore,
    fallback: RateLimitStore
  ): RateLimitStore {
    return new HybridRateLimitStore(primary, fallback, this.logger);
  }
}

/**
 * Store híbrido que usa un store primario con fallback
 */
class HybridRateLimitStore implements RateLimitStore {
  constructor(
    private primary: RateLimitStore,
    private fallback: RateLimitStore,
    private logger: Logger
  ) {}

  async get(key: string): Promise<RateLimitStoreEntry | null> {
    try {
      return await this.primary.get(key);
    } catch (error) {
      this.logger.warn('Primary store failed, using fallback for get', {
        error: error.message,
        key
      });
      return await this.fallback.get(key);
    }
  }

  async set(key: string, entry: RateLimitStoreEntry, ttlSeconds?: number): Promise<void> {
    try {
      await this.primary.set(key, entry, ttlSeconds);
    } catch (error) {
      this.logger.warn('Primary store failed, using fallback for set', {
        error: error.message,
        key
      });
      await this.fallback.set(key, entry, ttlSeconds);
    }
  }

  async increment(key: string, resetTime: number, ttlSeconds?: number): Promise<RateLimitStoreEntry> {
    try {
      return await this.primary.increment(key, resetTime, ttlSeconds);
    } catch (error) {
      this.logger.warn('Primary store failed, using fallback for increment', {
        error: error.message,
        key
      });
      return await this.fallback.increment(key, resetTime, ttlSeconds);
    }
  }

  async delete(key: string): Promise<boolean> {
    try {
      return await this.primary.delete(key);
    } catch (error) {
      this.logger.warn('Primary store failed, using fallback for delete', {
        error: error.message,
        key
      });
      return await this.fallback.delete(key);
    }
  }

  async clear(): Promise<void> {
    await Promise.all([
      this.primary.clear().catch(err => this.logger.warn('Primary store clear failed', err)),
      this.fallback.clear().catch(err => this.logger.warn('Fallback store clear failed', err))
    ]);
  }

  async size(): Promise<number> {
    try {
      return await this.primary.size();
    } catch (error) {
      return await this.fallback.size();
    }
  }

  async keys(pattern?: string): Promise<string[]> {
    try {
      return await this.primary.keys(pattern);
    } catch (error) {
      return await this.fallback.keys(pattern);
    }
  }

  async disconnect(): Promise<void> {
    await Promise.all([
      this.primary.disconnect().catch(err => this.logger.warn('Primary store disconnect failed', err)),
      this.fallback.disconnect().catch(err => this.logger.warn('Fallback store disconnect failed', err))
    ]);
  }
}
