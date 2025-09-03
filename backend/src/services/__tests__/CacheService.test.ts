import 'reflect-metadata';
import { Container } from 'inversify';
import { CacheService } from '../CacheService';
import { IConfig } from '@interfaces/IConfig';
import { ILoggerService } from '@interfaces/IServices';
import { TYPES } from '@container/types';

describe('CacheService', () => {
  let container: Container;
  let cacheService: CacheService;
  let mockConfig: IConfig;
  let mockLogger: ILoggerService;

  beforeEach(() => {
    // Setup mock config
    mockConfig = {
      server: {
        port: 3000,
        host: 'localhost',
        env: 'test' as 'test',
        apiVersion: 'v1',
        corsOrigins: ['*']
      },
      database: {} as any,
      security: {} as any,
      logging: {} as any,
      cache: {
        defaultTTL: 300,
        checkPeriod: 600,
        maxKeys: 1000
      },
      isDevelopment: () => false,
      isProduction: () => false,
      isTest: () => true
    } as IConfig;

    // Setup mock logger
    mockLogger = {
      initialize: jest.fn().mockResolvedValue(undefined),
      shutdown: jest.fn().mockResolvedValue(undefined),
      info: jest.fn(),
      error: jest.fn(),
      warn: jest.fn(),
      debug: jest.fn(),
      http: jest.fn()
    };

    // Setup DI container
    container = new Container();
    container.bind<IConfig>(TYPES.Config).toConstantValue(mockConfig);
    container.bind<ILoggerService>(TYPES.LoggerService).toConstantValue(mockLogger);
    container.bind<CacheService>(TYPES.CacheService).to(CacheService);

    cacheService = container.get<CacheService>(TYPES.CacheService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('initialize', () => {
    it('should initialize successfully', async () => {
      await cacheService.initialize();
      expect(mockLogger.info).toHaveBeenCalledWith('Cache Service initialized');
    });
  });

  describe('get/set operations', () => {
    it('should set and get a value', async () => {
      const key = 'test-key';
      const value = { data: 'test-value' };

      await cacheService.set(key, value);
      const retrieved = await cacheService.get(key);

      expect(retrieved).toEqual(value);
      expect(mockLogger.debug).toHaveBeenCalledWith(`Cache set: ${key}`, expect.any(Object));
      expect(mockLogger.debug).toHaveBeenCalledWith(`Cache hit: ${key}`);
    });

    it('should return null for non-existent key', async () => {
      const result = await cacheService.get('non-existent');
      
      expect(result).toBeNull();
      expect(mockLogger.debug).toHaveBeenCalledWith('Cache miss: non-existent');
    });

    it('should respect TTL', async () => {
      jest.useFakeTimers();
      
      const key = 'ttl-key';
      const value = 'ttl-value';
      const ttl = 1; // 1 second

      await cacheService.set(key, value, ttl);
      
      // Value should exist immediately
      let retrieved = await cacheService.get(key);
      expect(retrieved).toBe(value);

      // Advance time past TTL
      jest.advanceTimersByTime(2000);

      // Value should be expired
      retrieved = await cacheService.get(key);
      expect(retrieved).toBeNull();

      jest.useRealTimers();
    });

    it('should handle errors gracefully', async () => {
      // Mock an error scenario
      const errorKey = 'error-key';
      jest.spyOn(cacheService as any, 'strategy', 'get').mockReturnValue({
        get: jest.fn().mockRejectedValue(new Error('Cache error')),
        set: jest.fn().mockRejectedValue(new Error('Cache error')),
        delete: jest.fn(),
        flush: jest.fn(),
        exists: jest.fn(),
        getTTL: jest.fn()
      });

      const result = await cacheService.get(errorKey);
      
      expect(result).toBeNull();
      expect(mockLogger.error).toHaveBeenCalledWith(
        `Cache get error for key ${errorKey}`,
        expect.any(Error)
      );
    });
  });

  describe('delete operation', () => {
    it('should delete an existing key', async () => {
      const key = 'delete-key';
      const value = 'delete-value';

      await cacheService.set(key, value);
      const deleted = await cacheService.delete(key);
      
      expect(deleted).toBe(true);
      expect(mockLogger.debug).toHaveBeenCalledWith(`Cache delete: ${key}`);

      const retrieved = await cacheService.get(key);
      expect(retrieved).toBeNull();
    });

    it('should return false when deleting non-existent key', async () => {
      const deleted = await cacheService.delete('non-existent');
      expect(deleted).toBe(false);
    });
  });

  describe('flush operation', () => {
    it('should flush all cache entries', async () => {
      await cacheService.set('key1', 'value1');
      await cacheService.set('key2', 'value2');
      
      await cacheService.flush();
      
      expect(mockLogger.info).toHaveBeenCalledWith('Cache flushed');
      
      const value1 = await cacheService.get('key1');
      const value2 = await cacheService.get('key2');
      
      expect(value1).toBeNull();
      expect(value2).toBeNull();
    });
  });

  describe('exists operation', () => {
    it('should return true for existing key', async () => {
      const key = 'exists-key';
      await cacheService.set(key, 'value');
      
      const exists = await cacheService.exists(key);
      expect(exists).toBe(true);
    });

    it('should return false for non-existent key', async () => {
      const exists = await cacheService.exists('non-existent');
      expect(exists).toBe(false);
    });
  });

  describe('getTTL operation', () => {
    it('should return TTL for a key', async () => {
      jest.useFakeTimers();
      
      const key = 'ttl-key';
      const ttl = 60; // 60 seconds
      
      await cacheService.set(key, 'value', ttl);
      
      const remainingTTL = await cacheService.getTTL(key);
      expect(remainingTTL).toBeGreaterThan(0);
      expect(remainingTTL).toBeLessThanOrEqual(ttl);
      
      jest.useRealTimers();
    });

    it('should return 0 for non-existent key', async () => {
      const ttl = await cacheService.getTTL('non-existent');
      expect(ttl).toBe(0);
    });
  });

  describe('remember operation', () => {
    it('should cache factory result on first call', async () => {
      const key = 'remember-key';
      const factory = jest.fn().mockResolvedValue('factory-value');
      
      const result = await cacheService.remember(key, factory);
      
      expect(result).toBe('factory-value');
      expect(factory).toHaveBeenCalledTimes(1);
    });

    it('should return cached value on subsequent calls', async () => {
      const key = 'remember-key-2';
      const factory = jest.fn().mockResolvedValue('factory-value');
      
      // First call
      await cacheService.remember(key, factory);
      
      // Second call
      const result = await cacheService.remember(key, factory);
      
      expect(result).toBe('factory-value');
      expect(factory).toHaveBeenCalledTimes(1); // Factory only called once
    });
  });

  describe('getStats operation', () => {
    it('should return cache statistics', async () => {
      // Perform some operations
      await cacheService.set('key1', 'value1');
      await cacheService.get('key1'); // hit
      await cacheService.get('non-existent'); // miss
      await cacheService.delete('key1');
      
      const stats = cacheService.getStats();
      
      expect(stats).toHaveProperty('hits');
      expect(stats).toHaveProperty('misses');
      expect(stats).toHaveProperty('sets');
      expect(stats).toHaveProperty('deletes');
      expect(stats).toHaveProperty('hitRate');
      
      expect(stats.hits).toBe(1);
      expect(stats.misses).toBe(1);
      expect(stats.sets).toBe(1);
      expect(stats.deletes).toBe(1);
      expect(stats.hitRate).toBe(50); // 1 hit / 2 total * 100
    });
  });

  describe('shutdown', () => {
    it('should shutdown gracefully', async () => {
      await cacheService.shutdown();
      
      expect(mockLogger.info).toHaveBeenCalledWith(
        'Cache Service shut down',
        expect.objectContaining({ stats: expect.any(Object) })
      );
    });
  });
});