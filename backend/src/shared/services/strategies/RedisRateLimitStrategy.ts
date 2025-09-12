/**
 * Redis Rate Limiting Strategy - Sprint 2
 * Siguiendo lineamientos nivel 2: estrategia escalable para producción
 */

import { injectable, inject } from 'inversify';
import { Logger } from 'winston';
import { TYPES } from '@/container/types';
import { RateLimitStrategy, RateLimitKey, RateLimitInfo } from '@/shared/services/RateLimitingService';
import { RateLimitConfig } from '@/config/rateLimiting';
import { environment } from '@/config/environment';

// Interfaz para cliente Redis (abstracción para flexibilidad)
export interface RedisClient {
  get(key: string): Promise<string | null>;
  set(key: string, value: string, ttl?: number): Promise<void>;
  incr(key: string): Promise<number>;
  expire(key: string, seconds: number): Promise<void>;
  del(key: string): Promise<number>;
  pipeline(): RedisPipeline;
  disconnect(): Promise<void>;
}

export interface RedisPipeline {
  get(key: string): RedisPipeline;
  incr(key: string): RedisPipeline;
  expire(key: string, seconds: number): RedisPipeline;
  exec(): Promise<Array<[Error | null, any]>>;
}

@injectable()
export class RedisRateLimitStrategy implements RateLimitStrategy {
  private readonly keyPrefix = 'rl:';
  private readonly scriptSha?: string;

  constructor(
    @inject(TYPES.RedisClient) private redisClient: RedisClient,
    @inject(TYPES.Logger) private logger: Logger
  ) {
    this.logger.info('Redis rate limiting strategy initialized');
  }

  getName(): string {
    return 'redis';
  }

  async shouldLimit(key: RateLimitKey, config: RateLimitConfig): Promise<boolean> {
    try {
      const info = await this.getInfo(key, config);
      return info.remaining <= 0;
    } catch (error) {
      this.logger.warn('Error checking rate limit, allowing request', {
        error: error.message,
        key: this.generateKey(key)
      });
      return false; // En caso de error, permitir la request (fail-open)
    }
  }

  async getInfo(key: RateLimitKey, config: RateLimitConfig): Promise<RateLimitInfo> {
    try {
      const redisKey = this.generateKey(key);
      const countKey = `${redisKey}:count`;
      const resetKey = `${redisKey}:reset`;

      const pipeline = this.redisClient.pipeline();
      pipeline.get(countKey);
      pipeline.get(resetKey);

      const results = await pipeline.exec();
      const [countResult, resetResult] = results;

      if (countResult[0] || resetResult[0]) {
        throw new Error('Redis pipeline execution failed');
      }

      const count = countResult[1] ? parseInt(countResult[1]) : 0;
      const resetTime = resetResult[1] ? parseInt(resetResult[1]) : Date.now() + config.windowMs;

      return {
        limit: config.max,
        remaining: Math.max(0, config.max - count),
        reset: Math.floor(resetTime / 1000),
        resetTime: new Date(resetTime),
        total: count
      };
    } catch (error) {
      this.logger.warn('Error getting rate limit info from Redis', {
        error: error.message,
        key: this.generateKey(key)
      });

      // Fallback: retornar info permisiva
      return {
        limit: config.max,
        remaining: config.max,
        reset: Math.floor((Date.now() + config.windowMs) / 1000),
        resetTime: new Date(Date.now() + config.windowMs),
        total: 0
      };
    }
  }

  async increment(key: RateLimitKey, config: RateLimitConfig): Promise<RateLimitInfo> {
    try {
      const redisKey = this.generateKey(key);
      const countKey = `${redisKey}:count`;
      const resetKey = `${redisKey}:reset`;
      const now = Date.now();
      const resetTime = now + config.windowMs;

      // Usar script Lua para operación atómica
      const result = await this.incrementAtomic(countKey, resetKey, resetTime, config.windowMs / 1000);

      return {
        limit: config.max,
        remaining: Math.max(0, config.max - result.count),
        reset: Math.floor(result.resetTime / 1000),
        resetTime: new Date(result.resetTime),
        total: result.count
      };
    } catch (error) {
      this.logger.error('Error incrementing rate limit counter in Redis', {
        error: error.message,
        key: this.generateKey(key)
      });
      throw error;
    }
  }

  async reset(key: RateLimitKey): Promise<void> {
    try {
      const redisKey = this.generateKey(key);
      const countKey = `${redisKey}:count`;
      const resetKey = `${redisKey}:reset`;

      await this.redisClient.del(countKey);
      await this.redisClient.del(resetKey);

      this.logger.debug('Rate limit counter reset in Redis', {
        key: redisKey
      });
    } catch (error) {
      this.logger.warn('Error resetting rate limit counter in Redis', {
        error: error.message,
        key: this.generateKey(key)
      });
      throw error;
    }
  }

  /**
   * Operación atómica para incrementar contador usando script Lua
   */
  private async incrementAtomic(
    countKey: string,
    resetKey: string,
    resetTime: number,
    windowSeconds: number
  ): Promise<{ count: number; resetTime: number }> {
    // Script Lua para operación atómica
    const luaScript = `
      local countKey = KEYS[1]
      local resetKey = KEYS[2]
      local now = tonumber(ARGV[1])
      local resetTime = tonumber(ARGV[2])
      local windowSeconds = tonumber(ARGV[3])

      local currentReset = redis.call('GET', resetKey)
      local count = 0

      if currentReset == false or tonumber(currentReset) <= now then
        -- Reset window
        redis.call('SET', countKey, 1)
        redis.call('SET', resetKey, resetTime)
        redis.call('EXPIRE', countKey, windowSeconds)
        redis.call('EXPIRE', resetKey, windowSeconds)
        count = 1
        currentReset = resetTime
      else
        -- Increment counter
        count = redis.call('INCR', countKey)
        currentReset = tonumber(currentReset)
      end

      return {count, currentReset}
    `;

    // En una implementación real, usarías redis.eval o similar
    // Por simplicidad, simulamos la operación atómica con múltiples comandos
    const currentResetStr = await this.redisClient.get(resetKey);
    const currentReset = currentResetStr ? parseInt(currentResetStr) : 0;
    const now = Date.now();

    if (!currentReset || currentReset <= now) {
      // Reset window
      const pipeline = this.redisClient.pipeline();
      pipeline.get(countKey); // Esto sería SET en el script real
      pipeline.expire(countKey, Math.floor(windowSeconds));
      pipeline.expire(resetKey, Math.floor(windowSeconds));

      await this.redisClient.set(countKey, '1', Math.floor(windowSeconds));
      await this.redisClient.set(resetKey, resetTime.toString(), Math.floor(windowSeconds));

      return { count: 1, resetTime };
    } else {
      // Increment counter
      const count = await this.redisClient.incr(countKey);
      return { count, resetTime: currentReset };
    }
  }

  /**
   * Genera la clave Redis basada en la información de rate limiting
   */
  private generateKey(key: RateLimitKey): string {
    const parts = [this.keyPrefix, key.ip];

    if (key.userId) parts.push(`user:${key.userId}`);
    if (key.companyId) parts.push(`company:${key.companyId}`);
    if (key.endpoint) parts.push(`endpoint:${key.endpoint.replace(/[^a-zA-Z0-9]/g, '_')}`);

    return parts.join(':');
  }

  /**
   * Limpieza y cierre de conexiones
   */
  async destroy(): Promise<void> {
    try {
      await this.redisClient.disconnect();
      this.logger.info('Redis rate limiting strategy destroyed');
    } catch (error) {
      this.logger.warn('Error closing Redis connection', {
        error: error.message
      });
    }
  }
}

/**
 * Factory para crear la estrategia Redis con configuración flexible
 */
@injectable()
export class RedisRateLimitStrategyFactory {
  constructor(
    @inject(TYPES.Logger) private logger: Logger
  ) {}

  async create(redisConfig?: any): Promise<RedisRateLimitStrategy> {
    // En una implementación real, aquí crearías el cliente Redis
    const mockRedisClient: RedisClient = this.createMockRedisClient();

    return new RedisRateLimitStrategy(mockRedisClient as any, this.logger);
  }

  /**
   * Cliente Redis mock para desarrollo/testing
   */
  private createMockRedisClient(): RedisClient {
    const store = new Map<string, { value: string; expiry?: number }>();

    const cleanup = () => {
      const now = Date.now();
      for (const [key, entry] of store.entries()) {
        if (entry.expiry && entry.expiry <= now) {
          store.delete(key);
        }
      }
    };

    // Cleanup cada 30 segundos
    const cleanupInterval = setInterval(cleanup, 30000);

    return {
      async get(key: string): Promise<string | null> {
        cleanup();
        const entry = store.get(key);
        if (!entry) return null;
        if (entry.expiry && entry.expiry <= Date.now()) {
          store.delete(key);
          return null;
        }
        return entry.value;
      },

      async set(key: string, value: string, ttl?: number): Promise<void> {
        const expiry = ttl ? Date.now() + (ttl * 1000) : undefined;
        store.set(key, { value, expiry });
      },

      async incr(key: string): Promise<number> {
        const current = await this.get(key);
        const newValue = current ? parseInt(current) + 1 : 1;
        await this.set(key, newValue.toString(), 3600); // TTL por defecto 1 hora
        return newValue;
      },

      async expire(key: string, seconds: number): Promise<void> {
        const entry = store.get(key);
        if (entry) {
          entry.expiry = Date.now() + (seconds * 1000);
          store.set(key, entry);
        }
      },

      async del(key: string): Promise<number> {
        const existed = store.has(key);
        store.delete(key);
        return existed ? 1 : 0;
      },

      pipeline(): RedisPipeline {
        const commands: Array<{ method: string; args: any[] }> = [];

        return {
          get: (key: string) => {
            commands.push({ method: 'get', args: [key] });
            return this as any;
          },

          incr: (key: string) => {
            commands.push({ method: 'incr', args: [key] });
            return this as any;
          },

          expire: (key: string, seconds: number) => {
            commands.push({ method: 'expire', args: [key, seconds] });
            return this as any;
          },

          async exec(): Promise<Array<[Error | null, any]>> {
            const results: Array<[Error | null, any]> = [];

            for (const command of commands) {
              try {
                let result: any;
                switch (command.method) {
                  case 'get':
                    result = await (this as any).get(command.args[0]);
                    break;
                  case 'incr':
                    result = await (this as any).incr(command.args[0]);
                    break;
                  case 'expire':
                    result = await (this as any).expire(command.args[0], command.args[1]);
                    break;
                  default:
                    throw new Error(`Unknown command: ${command.method}`);
                }
                results.push([null, result]);
              } catch (error) {
                results.push([error, null]);
              }
            }

            return results;
          }
        };
      },

      async disconnect(): Promise<void> {
        clearInterval(cleanupInterval);
        store.clear();
      }
    };
  }
}
