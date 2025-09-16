/**
 * Rate Limit Store Tests - Sprint 2
 * Siguiendo lineamientos nivel 2: tests para diferentes estrategias de almacenamiento
 */

import 'reflect-metadata';
import { Logger } from 'winston';
import { 
  MemoryRateLimitStore, 
  RedisRateLimitStore,
  DatabaseRateLimitStore,
  RateLimitStoreFactory,
  RateLimitStoreEntry 
} from '@/shared/services/stores/RateLimitStore';

// Mock Logger
const mockLogger = {
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
  debug: jest.fn()
} as unknown as Logger;

// Mock Redis Client
const mockRedisClient = {
  get: jest.fn(),
  set: jest.fn(),
  setex: jest.fn(),
  del: jest.fn(),
  keys: jest.fn(),
  disconnect: jest.fn()
};

// Mock Database Connection
const mockDatabase = {
  query: jest.fn(),
  close: jest.fn()
};

describe('Rate Limit Stores', () => {
  let entry: RateLimitStoreEntry;

  beforeEach(() => {
    entry = {
      count: 5,
      resetTime: Date.now() + 60000,
      firstRequest: Date.now() - 30000,
      lastRequest: Date.now()
    };

    jest.clearAllMocks();
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('MemoryRateLimitStore', () => {
    let store: MemoryRateLimitStore;

    beforeEach(() => {
      store = new MemoryRateLimitStore(mockLogger);
    });

    afterEach(async () => {
      await store.disconnect();
    });

    describe('get', () => {
      it('should return null for non-existent key', async () => {
        const result = await store.get('non-existent');
        expect(result).toBeNull();
      });

      it('should return entry for existing key', async () => {
        await store.set('test-key', entry);
        const result = await store.get('test-key');
        
        expect(result).toEqual(entry);
      });

      it('should return null for expired entry', async () => {
        const expiredEntry = {
          ...entry,
          resetTime: Date.now() - 1000 // Expired
        };
        
        await store.set('test-key', expiredEntry);
        const result = await store.get('test-key');
        
        expect(result).toBeNull();
      });
    });

    describe('set', () => {
      it('should store entry successfully', async () => {
        await store.set('test-key', entry);
        const result = await store.get('test-key');
        
        expect(result).toEqual(entry);
      });

      it('should overwrite existing entry', async () => {
        await store.set('test-key', entry);
        
        const newEntry = { ...entry, count: 10 };
        await store.set('test-key', newEntry);
        
        const result = await store.get('test-key');
        expect(result?.count).toBe(10);
      });
    });

    describe('increment', () => {
      it('should create new entry when key does not exist', async () => {
        const resetTime = Date.now() + 60000;
        const result = await store.increment('new-key', resetTime);
        
        expect(result.count).toBe(1);
        expect(result.resetTime).toBe(resetTime);
        expect(result.firstRequest).toBeCloseTo(Date.now(), -2);
        expect(result.lastRequest).toBeCloseTo(Date.now(), -2);
      });

      it('should increment existing entry', async () => {
        const resetTime = Date.now() + 60000;
        await store.increment('test-key', resetTime);
        const result = await store.increment('test-key', resetTime);
        
        expect(result.count).toBe(2);
      });

      it('should create new window when current has expired', async () => {
        const expiredResetTime = Date.now() - 1000;
        await store.increment('test-key', expiredResetTime);
        
        // Move time forward and increment again
        jest.advanceTimersByTime(2000);
        const newResetTime = Date.now() + 60000;
        const result = await store.increment('test-key', newResetTime);
        
        expect(result.count).toBe(1); // Should reset to 1
        expect(result.resetTime).toBe(newResetTime);
      });
    });

    describe('delete', () => {
      it('should delete existing entry', async () => {
        await store.set('test-key', entry);
        const deleted = await store.delete('test-key');
        
        expect(deleted).toBe(true);
        
        const result = await store.get('test-key');
        expect(result).toBeNull();
      });

      it('should return false for non-existent entry', async () => {
        const deleted = await store.delete('non-existent');
        expect(deleted).toBe(false);
      });
    });

    describe('clear', () => {
      it('should clear all entries', async () => {
        await store.set('key1', entry);
        await store.set('key2', entry);
        
        await store.clear();
        
        const result1 = await store.get('key1');
        const result2 = await store.get('key2');
        
        expect(result1).toBeNull();
        expect(result2).toBeNull();
      });
    });

    describe('size', () => {
      it('should return correct size', async () => {
        expect(await store.size()).toBe(0);
        
        await store.set('key1', entry);
        await store.set('key2', entry);
        
        expect(await store.size()).toBe(2);
      });
    });

    describe('keys', () => {
      it('should return all keys', async () => {
        await store.set('key1', entry);
        await store.set('key2', entry);
        
        const keys = await store.keys();
        expect(keys).toEqual(expect.arrayContaining(['key1', 'key2']));
      });

      it('should filter keys by pattern', async () => {
        await store.set('user:123', entry);
        await store.set('user:456', entry);
        await store.set('admin:789', entry);
        
        const userKeys = await store.keys('user:*');
        expect(userKeys).toEqual(expect.arrayContaining(['user:123', 'user:456']));
        expect(userKeys).not.toContain('admin:789');
      });
    });

    describe('cleanup', () => {
      it('should clean up expired entries automatically', async () => {
        const expiredEntry = {
          ...entry,
          resetTime: Date.now() + 1000
        };
        
        await store.set('expired-key', expiredEntry);
        await store.set('valid-key', { ...entry, resetTime: Date.now() + 120000 });
        
        // Advance time to expire the first entry
        jest.advanceTimersByTime(2000);
        
        // Trigger cleanup (in real implementation this happens automatically)
        // We'll access the entry which should trigger cleanup
        const result = await store.get('expired-key');
        
        expect(result).toBeNull();
        expect(await store.get('valid-key')).not.toBeNull();
      });
    });

    describe('disconnect', () => {
      it('should clear all data and stop cleanup timer', async () => {
        await store.set('test-key', entry);
        await store.disconnect();
        
        // After disconnect, the store should be clean
        expect(await store.size()).toBe(0);
      });
    });
  });

  describe('RedisRateLimitStore', () => {
    let store: RedisRateLimitStore;

    beforeEach(() => {
      store = new RedisRateLimitStore(mockRedisClient as any, mockLogger);
      mockRedisClient.get.mockResolvedValue(null);
      mockRedisClient.set.mockResolvedValue('OK');
      mockRedisClient.setex.mockResolvedValue('OK');
      mockRedisClient.del.mockResolvedValue(1);
      mockRedisClient.keys.mockResolvedValue([]);
    });

    describe('get', () => {
      it('should return null for non-existent key', async () => {
        mockRedisClient.get.mockResolvedValue(null);
        
        const result = await store.get('test-key');
        expect(result).toBeNull();
      });

      it('should return parsed entry for existing key', async () => {
        mockRedisClient.get.mockResolvedValue(JSON.stringify(entry));
        
        const result = await store.get('test-key');
        expect(result).toEqual(entry);
      });

      it('should handle Redis errors gracefully', async () => {
        mockRedisClient.get.mockRejectedValue(new Error('Redis error'));
        
        const result = await store.get('test-key');
        expect(result).toBeNull();
        expect(mockLogger.warn).toHaveBeenCalledWith(
          'Error getting from Redis rate limit store',
          expect.objectContaining({
            error: 'Redis error',
            key: 'test-key'
          })
        );
      });
    });

    describe('set', () => {
      it('should store entry with TTL', async () => {
        await store.set('test-key', entry, 300);
        
        expect(mockRedisClient.setex).toHaveBeenCalledWith(
          'rl:store:test-key',
          300,
          JSON.stringify(entry)
        );
      });

      it('should store entry without TTL', async () => {
        await store.set('test-key', entry);
        
        expect(mockRedisClient.set).toHaveBeenCalledWith(
          'rl:store:test-key',
          JSON.stringify(entry)
        );
      });

      it('should handle Redis errors', async () => {
        mockRedisClient.set.mockRejectedValue(new Error('Redis error'));
        
        await expect(store.set('test-key', entry)).rejects.toThrow('Redis error');
        expect(mockLogger.error).toHaveBeenCalled();
      });
    });

    describe('increment', () => {
      it('should create new entry when key does not exist', async () => {
        mockRedisClient.get.mockResolvedValue(null);
        
        const resetTime = Date.now() + 60000;
        const result = await store.increment('test-key', resetTime, 60);
        
        expect(result.count).toBe(1);
        expect(result.resetTime).toBe(resetTime);
      });

      it('should increment existing entry', async () => {
        mockRedisClient.get.mockResolvedValue(JSON.stringify(entry));
        
        const resetTime = entry.resetTime;
        const result = await store.increment('test-key', resetTime, 60);
        
        expect(result.count).toBe(entry.count + 1);
        expect(result.resetTime).toBe(resetTime);
      });
    });

    describe('delete', () => {
      it('should delete entry successfully', async () => {
        mockRedisClient.del.mockResolvedValue(1);
        
        const result = await store.delete('test-key');
        expect(result).toBe(true);
        expect(mockRedisClient.del).toHaveBeenCalledWith('rl:store:test-key');
      });

      it('should return false when entry does not exist', async () => {
        mockRedisClient.del.mockResolvedValue(0);
        
        const result = await store.delete('test-key');
        expect(result).toBe(false);
      });
    });

    describe('clear', () => {
      it('should clear all entries with prefix', async () => {
        mockRedisClient.keys.mockResolvedValue(['rl:store:key1', 'rl:store:key2']);
        mockRedisClient.del.mockResolvedValue(2);
        
        await store.clear();
        
        expect(mockRedisClient.keys).toHaveBeenCalledWith('rl:store:*');
        expect(mockRedisClient.del).toHaveBeenCalledWith('rl:store:key1', 'rl:store:key2');
      });
    });

    describe('size', () => {
      it('should return number of keys', async () => {
        mockRedisClient.keys.mockResolvedValue(['rl:store:key1', 'rl:store:key2']);
        
        const size = await store.size();
        expect(size).toBe(2);
      });
    });

    describe('keys', () => {
      it('should return keys without prefix', async () => {
        mockRedisClient.keys.mockResolvedValue(['rl:store:key1', 'rl:store:key2']);
        
        const keys = await store.keys();
        expect(keys).toEqual(['key1', 'key2']);
      });

      it('should apply pattern filter', async () => {
        mockRedisClient.keys.mockResolvedValue(['rl:store:user:123', 'rl:store:user:456']);
        
        const keys = await store.keys('user:*');
        expect(mockRedisClient.keys).toHaveBeenCalledWith('rl:store:user:*');
        expect(keys).toEqual(['user:123', 'user:456']);
      });
    });
  });

  describe('DatabaseRateLimitStore', () => {
    let store: DatabaseRateLimitStore;

    beforeEach(() => {
      store = new DatabaseRateLimitStore(mockDatabase as any, mockLogger);
      mockDatabase.query.mockResolvedValue([]);
    });

    describe('get', () => {
      it('should return null for non-existent key', async () => {
        mockDatabase.query.mockResolvedValue([]);
        
        const result = await store.get('test-key');
        expect(result).toBeNull();
      });

      it('should return entry for existing key', async () => {
        const dbRow = {
          count: entry.count,
          reset_time: entry.resetTime,
          first_request: entry.firstRequest,
          last_request: entry.lastRequest
        };
        mockDatabase.query.mockResolvedValue([dbRow]);
        
        const result = await store.get('test-key');
        expect(result).toEqual(entry);
      });

      it('should handle database errors', async () => {
        mockDatabase.query.mockRejectedValue(new Error('Database error'));
        
        const result = await store.get('test-key');
        expect(result).toBeNull();
        expect(mockLogger.error).toHaveBeenCalled();
      });
    });

    describe('set', () => {
      it('should insert/update entry in database', async () => {
        mockDatabase.query.mockResolvedValue({ affectedRows: 1 });
        
        await store.set('test-key', entry);
        
        expect(mockDatabase.query).toHaveBeenCalledWith(
          expect.stringContaining('INSERT INTO'),
          expect.arrayContaining(['test-key', entry.count, entry.resetTime, entry.firstRequest, entry.lastRequest])
        );
      });

      it('should handle database errors', async () => {
        mockDatabase.query.mockRejectedValue(new Error('Database error'));
        
        await expect(store.set('test-key', entry)).rejects.toThrow('Database error');
      });
    });

    describe('increment', () => {
      it('should create new entry when key does not exist', async () => {
        // First call (get) returns empty, second call (set) succeeds
        mockDatabase.query
          .mockResolvedValueOnce([]) // get returns empty
          .mockResolvedValueOnce({ affectedRows: 1 }); // set succeeds
        
        const resetTime = Date.now() + 60000;
        const result = await store.increment('test-key', resetTime);
        
        expect(result.count).toBe(1);
        expect(result.resetTime).toBe(resetTime);
      });

      it('should increment existing entry', async () => {
        const dbRow = {
          count: entry.count,
          reset_time: entry.resetTime,
          first_request: entry.firstRequest,
          last_request: entry.lastRequest
        };
        
        mockDatabase.query
          .mockResolvedValueOnce([dbRow]) // get returns existing
          .mockResolvedValueOnce({ affectedRows: 1 }); // set succeeds
        
        const result = await store.increment('test-key', entry.resetTime);
        
        expect(result.count).toBe(entry.count + 1);
      });
    });

    describe('cleanup', () => {
      it('should remove expired entries', async () => {
        mockDatabase.query.mockResolvedValue({ affectedRows: 5 });
        
        const deleted = await store.cleanup();
        
        expect(deleted).toBe(5);
        expect(mockDatabase.query).toHaveBeenCalledWith(
          expect.stringContaining('DELETE FROM'),
          [expect.any(Number)]
        );
        expect(mockLogger.info).toHaveBeenCalledWith(
          expect.stringContaining('Cleaned up 5 expired')
        );
      });

      it('should handle cleanup errors', async () => {
        mockDatabase.query.mockRejectedValue(new Error('Cleanup failed'));
        
        const deleted = await store.cleanup();
        
        expect(deleted).toBe(0);
        expect(mockLogger.error).toHaveBeenCalled();
      });
    });
  });

  describe('RateLimitStoreFactory', () => {
    let factory: RateLimitStoreFactory;

    beforeEach(() => {
      factory = new RateLimitStoreFactory(mockLogger);
    });

    describe('createStore', () => {
      it('should create memory store by default', () => {
        const store = factory.createStore();
        expect(store).toBeInstanceOf(MemoryRateLimitStore);
      });

      it('should create memory store when specified', () => {
        const store = factory.createStore('memory');
        expect(store).toBeInstanceOf(MemoryRateLimitStore);
      });

      it('should create redis store when specified', () => {
        const store = factory.createStore('redis');
        expect(store).toBeInstanceOf(RedisRateLimitStore);
      });

      it('should create database store when specified', () => {
        const store = factory.createStore('database');
        expect(store).toBeInstanceOf(DatabaseRateLimitStore);
      });

      it('should fall back to memory store for unknown type', () => {
        const store = factory.createStore('unknown' as any);
        expect(store).toBeInstanceOf(MemoryRateLimitStore);
        expect(mockLogger.warn).toHaveBeenCalledWith(
          expect.stringContaining('Unknown store type'),
          expect.anything()
        );
      });
    });

    describe('createHybridStore', () => {
      it('should create hybrid store with fallback', async () => {
        const primaryStore = new MemoryRateLimitStore(mockLogger);
        const fallbackStore = new MemoryRateLimitStore(mockLogger);
        
        const hybridStore = factory.createHybridStore(primaryStore, fallbackStore);
        
        // Test that it works
        await hybridStore.set('test-key', entry);
        const result = await hybridStore.get('test-key');
        
        expect(result).toEqual(entry);
        
        await hybridStore.disconnect();
        await primaryStore.disconnect();
        await fallbackStore.disconnect();
      });
    });
  });

  describe('integration scenarios', () => {
    it('should handle concurrent operations on memory store', async () => {
      const store = new MemoryRateLimitStore(mockLogger);
      const resetTime = Date.now() + 60000;
      
      // Simulate concurrent increments
      const promises = Array.from({ length: 10 }, () => 
        store.increment('concurrent-key', resetTime)
      );
      
      const results = await Promise.all(promises);
      
      // All operations should succeed
      expect(results).toHaveLength(10);
      
      // Final count should be 10
      const finalInfo = await store.get('concurrent-key');
      expect(finalInfo?.count).toBe(10);
      
      await store.disconnect();
    });

    it('should handle store switching in hybrid configuration', async () => {
      const primaryStore = new MemoryRateLimitStore(mockLogger);
      const fallbackStore = new MemoryRateLimitStore(mockLogger);
      
      const hybridStore = new (class extends MemoryRateLimitStore {
        async get(key: string) {
          try {
            return await primaryStore.get(key);
          } catch {
            return await fallbackStore.get(key);
          }
        }
        
        async set(key: string, entry: RateLimitStoreEntry) {
          try {
            await primaryStore.set(key, entry);
          } catch {
            await fallbackStore.set(key, entry);
          }
        }
      })(mockLogger);
      
      await hybridStore.set('test-key', entry);
      const result = await hybridStore.get('test-key');
      
      expect(result).toEqual(entry);
      
      await hybridStore.disconnect();
      await primaryStore.disconnect();
      await fallbackStore.disconnect();
    });
  });
});