/**
 * Enhanced Cache Service with Redis Support
 * Sprint 4 - Cache service con soporte para Redis y memoria
 */
import { injectable, inject, optional } from 'inversify';
import Redis from 'ioredis';
import { Logger } from 'winston';
import { TYPES } from '@/container/types';
// CacheService base removido - EnhancedCacheService es ahora el principal
import { ICacheService } from '@/shared/interfaces/ICacheService';
import { environment } from '@/config/environment';
export interface CacheConfig {
  type: 'memory' | 'redis' | 'hybrid';
  redis?: {
    host: string;
    port: number;
    password?: string;
    db?: number;
    keyPrefix?: string;
  };
  defaultTTL?: number;
  maxMemoryItems?: number;
  enableCompression?: boolean;
}
export interface CacheTag {
  tag: string;
  keys: Set<string>;
}
export interface CacheStats {
  hits: number;
  misses: number;
  sets: number;
  deletes: number;
  hitRate: number;
  memoryUsage?: number;
  itemCount: number;
}
// Clase interna para cache en memoria
class MemoryCache {
  private cache: Map<string, { value: any; expiry: number }> = new Map();
  
  async get<T>(key: string): Promise<T | null> {
    const item = this.cache.get(key);
    if (!item) return null;
    
    if (Date.now() > item.expiry) {
      this.cache.delete(key);
      return null;
    }
    
    return item.value as T;
  }
  
  async set<T>(key: string, value: T, ttlSeconds: number = 300): Promise<void> {
    const expiry = Date.now() + (ttlSeconds * 1000);
    this.cache.set(key, { value, expiry });
  }
  
  async delete(key: string): Promise<boolean> {
    return this.cache.delete(key);
  }
  
  async clear(): Promise<void> {
    this.cache.clear();
  }
  
  async has(key: string): Promise<boolean> {
    const item = this.cache.get(key);
    if (!item) return false;
    
    if (Date.now() > item.expiry) {
      this.cache.delete(key);
      return false;
    }
    
    return true;
  }
  
  async mget<T>(keys: string[]): Promise<(T | null)[]> {
    return Promise.all(keys.map(key => this.get<T>(key)));
  }
  
  async mset<T>(entries: Array<{ key: string; value: T; ttl?: number }>): Promise<void> {
    for (const entry of entries) {
      await this.set(entry.key, entry.value, entry.ttl);
    }
  }
  
  keys(): string[] {
    return Array.from(this.cache.keys());
  }
  
  size(): number {
    return this.cache.size;
  }
  
  destroy(): void {
    this.cache.clear();
  }
}

@injectable()
export class CacheService implements ICacheService {
  private memoryCache: MemoryCache;
  private redisClient?: Redis;
  private tags: Map<string, Set<string>> = new Map();
  private stats: CacheStats = {
    hits: 0,
    misses: 0,
    sets: 0,
    deletes: 0,
    hitRate: 0,
    itemCount: 0
  };
  private config: CacheConfig;
  private logger?: Logger;
  private isRedisConnected: boolean = false;
  constructor(
    @inject(TYPES.Logger) @optional() logger?: Logger
  ) {
    this.logger = logger;
    this.memoryCache = new MemoryCache();
    // Configuración por defecto - usar memoria si Redis no está disponible
    const useRedis = environment.redis?.host && environment.nodeEnv === 'production';
    this.config = {
      type: useRedis ? 'redis' : 'memory',
      redis: environment.redis,
      defaultTTL: 300, // 5 minutos
      maxMemoryItems: 1000,
      enableCompression: false
    };
    // Solo intentar Redis en producción o si está explícitamente configurado
    if (this.config.type !== 'memory' && this.config.redis?.host && environment.nodeEnv === 'production') {
      this.initializeRedis();
    } else {
      this.logger?.info('Cache service running in memory mode');
    }
  }
  /**
   * Inicializa la conexión a Redis
   */
  private initializeRedis(): void {
    try {
      this.redisClient = new Redis({
        host: this.config.redis!.host,
        port: this.config.redis!.port,
        password: this.config.redis!.password,
        db: this.config.redis!.db || 0,
        keyPrefix: this.config.redis!.keyPrefix || 'cache:',
        retryStrategy: (times) => {
          // Solo reintentar 3 veces y luego parar
          if (times > 3) {
            this.logger?.warn('Redis unavailable, switching to memory cache');
            return null; // Detener reintentos
          }
          const delay = Math.min(times * 1000, 3000);
          return delay;
        },
        maxRetriesPerRequest: 1,
        enableOfflineQueue: false,
        lazyConnect: true
      });
      this.redisClient.on('connect', () => {
        this.isRedisConnected = true;
        this.logger?.info('Redis cache connected');
      });
      this.redisClient.on('error', (error) => {
        // Solo loguear el primer error para evitar spam
        if (this.isRedisConnected) {
          this.logger?.warn('Redis connection lost, using memory cache as fallback');
        }
        this.isRedisConnected = false;
      });
      this.redisClient.on('close', () => {
        this.isRedisConnected = false;
        // No loguear cada desconexión para evitar spam
      });
      
      // Solo intentar conectar si es necesario
      if (environment.nodeEnv === 'production') {
        this.redisClient.connect().catch(err => {
          this.logger?.warn('Redis not available, using memory cache');
          this.config.type = 'memory'; // Cambiar a memoria si Redis falla
        });
      }
    } catch (error) {
      this.logger?.warn('Redis initialization skipped, using memory cache');
      this.isRedisConnected = false;
      this.config.type = 'memory'; // Cambiar a memoria si hay error
    }
  }
  /**
   * Obtener valor del cache
   */
  async get<T>(key: string): Promise<T | null> {
    try {
      // Si es hybrid, intentar primero memoria
      if (this.config.type === 'hybrid') {
        const memoryValue = await this.memoryCache.get<T>(key);
        if (memoryValue !== null) {
          this.recordHit();
          return memoryValue;
        }
      }
      // Si Redis está disponible
      if (this.useRedis()) {
        const value = await this.redisClient!.get(key);
        if (value) {
          this.recordHit();
          const parsed = this.deserialize<T>(value);
          // En modo hybrid, guardar en memoria
          if (this.config.type === 'hybrid') {
            await this.memoryCache.set(key, parsed, 60); // 1 minuto en memoria
          }
          return parsed;
        }
      } else if (this.config.type !== 'hybrid') {
        // Si no es hybrid y Redis no está disponible, usar memoria
        const value = await this.memoryCache.get<T>(key);
        if (value !== null) {
          this.recordHit();
          return value;
        }
      }
      this.recordMiss();
      return null;
    } catch (error) {
      this.logger?.error('Cache get error:', error);
      this.recordMiss();
      return null;
    }
  }
  /**
   * Guardar valor en cache
   */
  async set<T>(key: string, value: T, ttlSeconds?: number): Promise<void> {
    try {
      const ttl = ttlSeconds || this.config.defaultTTL || 300;
      this.recordSet();
      // Guardar en memoria si es necesario
      if (this.config.type === 'memory' || this.config.type === 'hybrid' || !this.useRedis()) {
        await this.memoryCache.set(key, value, ttl);
      }
      // Guardar en Redis si está disponible
      if (this.useRedis()) {
        const serialized = this.serialize(value);
        await this.redisClient!.setex(key, ttl, serialized);
      }
    } catch (error) {
      this.logger?.error('Cache set error:', error);
      // Fallback a memoria
      await this.memoryCache.set(key, value, ttlSeconds);
    }
  }
  /**
   * Guardar con tags para invalidación grupal
   */
  async setWithTags<T>(key: string, value: T, tags: string[], ttl?: number): Promise<void> {
    await this.set(key, value, ttl);
    // Registrar tags
    for (const tag of tags) {
      if (!this.tags.has(tag)) {
        this.tags.set(tag, new Set());
      }
      this.tags.get(tag)!.add(key);
      // Guardar relación tag-key en Redis si está disponible
      if (this.useRedis()) {
        await this.redisClient!.sadd(`tag:${tag}`, key);
        await this.redisClient!.expire(`tag:${tag}`, 86400); // 24 horas
      }
    }
  }
  /**
   * Invalidar cache por tags
   */
  async invalidateByTags(tags: string[]): Promise<number> {
    let deletedCount = 0;
    for (const tag of tags) {
      // Obtener keys del tag
      let keys: string[] = [];
      if (this.useRedis()) {
        keys = await this.redisClient!.smembers(`tag:${tag}`);
      } else {
        const tagKeys = this.tags.get(tag);
        if (tagKeys) {
          keys = Array.from(tagKeys);
        }
      }
      // Eliminar cada key
      for (const key of keys) {
        if (await this.delete(key)) {
          deletedCount++;
        }
      }
      // Limpiar el tag
      this.tags.delete(tag);
      if (this.useRedis()) {
        await this.redisClient!.del(`tag:${tag}`);
      }
    }
    this.logger?.debug(`Invalidated ${deletedCount} cache entries for tags: ${tags.join(', ')}`);
    return deletedCount;
  }
  /**
   * Eliminar valor del cache
   */
  async delete(key: string): Promise<boolean> {
    try {
      this.recordDelete();
      let deleted = false;
      // Eliminar de memoria
      if (this.config.type === 'memory' || this.config.type === 'hybrid' || !this.useRedis()) {
        deleted = await this.memoryCache.delete(key) || deleted;
      }
      // Eliminar de Redis
      if (this.useRedis()) {
        const result = await this.redisClient!.del(key);
        deleted = result > 0 || deleted;
      }
      return deleted;
    } catch (error) {
      this.logger?.error('Cache delete error:', error);
      return false;
    }
  }
  /**
   * Limpiar todo el cache
   */
  async clear(): Promise<void> {
    await this.memoryCache.clear();
    if (this.useRedis()) {
      // Obtener todas las keys con el prefijo
      const keys = await this.redisClient!.keys(`${this.config.redis!.keyPrefix}*`);
      if (keys.length > 0) {
        await this.redisClient!.del(...keys);
      }
    }
    this.tags.clear();
    this.resetStats();
    this.logger?.info('Cache cleared');
  }
  /**
   * Verificar si existe una clave
   */
  async has(key: string): Promise<boolean> {
    if (this.config.type === 'hybrid') {
      if (await this.memoryCache.has(key)) {
        return true;
      }
    }
    if (this.useRedis()) {
      return (await this.redisClient!.exists(key)) > 0;
    }
    return this.memoryCache.has(key);
  }
  /**
   * Alias para has()
   */
  async exists(key: string): Promise<boolean> {
    return this.has(key);
  }
  /**
   * TTL de una clave
   */
  async ttl(key: string): Promise<number> {
    if (this.useRedis()) {
      return this.redisClient!.ttl(key);
    }
    return this.memoryCache.ttl(key);
  }
  /**
   * Cache-aside pattern
   */
  async cacheAside<T>(
    key: string,
    fetcher: () => Promise<T>,
    ttl?: number
  ): Promise<T> {
    // Intentar obtener del cache
    const cached = await this.get<T>(key);
    if (cached !== null) {
      return cached;
    }
    // Si no está en cache, obtener de la fuente
    const value = await fetcher();
    // Guardar en cache
    await this.set(key, value, ttl);
    return value;
  }
  /**
   * Write-through pattern
   */
  async writeThrough<T>(
    key: string,
    value: T,
    writer: (value: T) => Promise<void>,
    ttl?: number
  ): Promise<void> {
    // Escribir en la fuente de datos
    await writer(value);
    // Luego actualizar cache
    await this.set(key, value, ttl);
  }
  /**
   * Write-behind pattern (async)
   */
  async writeBehind<T>(
    key: string,
    value: T,
    writer: (value: T) => Promise<void>,
    ttl?: number
  ): Promise<void> {
    // Actualizar cache inmediatamente
    await this.set(key, value, ttl);
    // Escribir en la fuente de datos de forma asíncrona
    setImmediate(async () => {
      try {
        await writer(value);
      } catch (error) {
        this.logger?.error('Write-behind error:', error);
        // Invalidar cache si falla la escritura
        await this.delete(key);
      }
    });
  }
  /**
   * Calentar cache con datos
   */
  async warmCache(
    keys: string[],
    fetcher: (key: string) => Promise<any>,
    ttl?: number
  ): Promise<void> {
    const promises = keys.map(async (key) => {
      try {
        const value = await fetcher(key);
        if (value !== null && value !== undefined) {
          await this.set(key, value, ttl);
        }
      } catch (error) {
        this.logger?.warn(`Failed to warm cache for key ${key}:`, error);
      }
    });
    await Promise.all(promises);
    this.logger?.info(`Cache warmed with ${keys.length} keys`);
  }
  /**
   * Obtener múltiples valores
   */
  async mget<T>(keys: string[]): Promise<(T | null)[]> {
    if (this.useRedis()) {
      const values = await this.redisClient!.mget(...keys);
      return values.map(v => v ? this.deserialize<T>(v) : null);
    }
    return this.memoryCache.mget<T>(keys);
  }
  /**
   * Establecer múltiples valores
   */
  async mset<T>(entries: Array<{ key: string; value: T; ttl?: number }>): Promise<void> {
    // Para Redis, usar pipeline para mejor performance
    if (this.useRedis()) {
      const pipeline = this.redisClient!.pipeline();
      for (const entry of entries) {
        const ttl = entry.ttl || this.config.defaultTTL || 300;
        pipeline.setex(entry.key, ttl, this.serialize(entry.value));
      }
      await pipeline.exec();
    } else {
      await this.memoryCache.mset(entries);
    }
  }
  /**
   * Incrementar valor numérico
   */
  async increment(key: string, amount: number = 1): Promise<number> {
    if (this.useRedis()) {
      return this.redisClient!.incrby(key, amount);
    }
    // Para memoria, obtener, incrementar y guardar
    const current = await this.get<number>(key) || 0;
    const newValue = current + amount;
    await this.set(key, newValue);
    return newValue;
  }
  /**
   * Obtener estadísticas del cache
   */
  getStats(): CacheStats {
    const total = this.stats.hits + this.stats.misses;
    this.stats.hitRate = total > 0 ? (this.stats.hits / total) * 100 : 0;
    this.stats.itemCount = this.memoryCache['cache'].size;
    return { ...this.stats };
  }
  /**
   * Resetear estadísticas
   */
  resetStats(): void {
    this.stats = {
      hits: 0,
      misses: 0,
      sets: 0,
      deletes: 0,
      hitRate: 0,
      itemCount: 0
    };
  }
  // Métodos privados de utilidad
  private useRedis(): boolean {
    return this.isRedisConnected && this.redisClient !== undefined;
  }
  private serialize(value: any): string {
    return JSON.stringify(value);
  }
  private deserialize<T>(value: string): T {
    try {
      return JSON.parse(value);
    } catch {
      return value as any;
    }
  }
  private recordHit(): void {
    this.stats.hits++;
  }
  private recordMiss(): void {
    this.stats.misses++;
  }
  private recordSet(): void {
    this.stats.sets++;
  }
  private recordDelete(): void {
    this.stats.deletes++;
  }
  /**
   * Obtener todas las keys del cache
   */
  async keys(): Promise<string[]> {
    if (this.useRedis()) {
      // Para Redis, usar el comando KEYS (usar con precaución en producción)
      const pattern = `${this.config.redis?.keyPrefix || 'cache:'}*`;
      const keys = await this.redisClient!.keys(pattern);
      // Remover el prefijo de las keys
      const prefix = this.config.redis?.keyPrefix || 'cache:';
      return keys.map(key => key.replace(prefix, ''));
    }
    return this.memoryCache.keys();
  }

  /**
   * Obtener el tamaño del cache (número de elementos)
   */
  async size(): Promise<number> {
    if (this.useRedis()) {
      const pattern = `${this.config.redis?.keyPrefix || 'cache:'}*`;
      const keys = await this.redisClient!.keys(pattern);
      return keys.length;
    }
    return this.memoryCache.size();
  }

  /**
   * Destruir el servicio
   */
  async destroy(): Promise<void> {
    this.memoryCache.destroy();
    if (this.redisClient) {
      await this.redisClient.quit();
    }
    this.tags.clear();
    this.logger?.info('Cache service destroyed');
  }
}
