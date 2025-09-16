/**
 * Mock Factory Utility
 * Sprint 4 - Factory para crear mocks de servicios y dependencias
 */
import { Logger } from 'winston';
export class MockFactory {
  /**
   * Create mock logger
   */
  static createMockLogger(): Logger {
    return {
      error: jest.fn(),
      warn: jest.fn(),
      info: jest.fn(),
      debug: jest.fn(),
      verbose: jest.fn(),
      silly: jest.fn(),
      log: jest.fn()
    } as any;
  }
  /**
   * Create mock repository
   */
  static createMockRepository<T>(): any {
    return {
      findById: jest.fn(),
      findOne: jest.fn(),
      findByField: jest.fn(),
      findOneByField: jest.fn(),
      findAll: jest.fn(),
      findPaginated: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      softDelete: jest.fn(),
      hardDelete: jest.fn(),
      count: jest.fn(),
      exists: jest.fn(),
      batchCreate: jest.fn(),
      createQueryBuilder: jest.fn(() => ({
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        orWhere: jest.fn().mockReturnThis(),
        leftJoin: jest.fn().mockReturnThis(),
        innerJoin: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        addSelect: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        addOrderBy: jest.fn().mockReturnThis(),
        groupBy: jest.fn().mockReturnThis(),
        having: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        offset: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue([]),
        getOne: jest.fn().mockResolvedValue(null),
        getManyAndCount: jest.fn().mockResolvedValue([[], 0]),
        getCount: jest.fn().mockResolvedValue(0)
      }))
    };
  }
  /**
   * Create mock service
   */
  static createMockService(): any {
    return {
      findById: jest.fn().mockResolvedValue({ success: true, data: null }),
      findAll: jest.fn().mockResolvedValue({ success: true, data: [] }),
      create: jest.fn().mockResolvedValue({ success: true, data: {} }),
      update: jest.fn().mockResolvedValue({ success: true, data: {} }),
      delete: jest.fn().mockResolvedValue({ success: true, data: true }),
      executeOperation: jest.fn().mockImplementation(async (name, callback) => {
        try {
          const data = await callback();
          return { success: true, data };
        } catch (error) {
          return { success: false, error };
        }
      })
    };
  }
  /**
   * Create mock cache service
   */
  static createMockCacheService(): any {
    const cache = new Map();
    return {
      get: jest.fn().mockImplementation(async (key: string) => cache.get(key) || null),
      set: jest.fn().mockImplementation(async (key: string, value: any) => {
        cache.set(key, value);
      }),
      delete: jest.fn().mockImplementation(async (key: string) => cache.delete(key)),
      clear: jest.fn().mockImplementation(async () => cache.clear()),
      has: jest.fn().mockImplementation(async (key: string) => cache.has(key)),
      exists: jest.fn().mockImplementation(async (key: string) => cache.has(key)),
      ttl: jest.fn().mockResolvedValue(300),
      setWithTags: jest.fn(),
      invalidateByTags: jest.fn(),
      cacheAside: jest.fn().mockImplementation(async (key: string, fetcher: () => Promise<any>) => {
        if (cache.has(key)) {
          return cache.get(key);
        }
        const value = await fetcher();
        cache.set(key, value);
        return value;
      }),
      getStats: jest.fn().mockReturnValue({
        hits: 0,
        misses: 0,
        sets: 0,
        deletes: 0,
        hitRate: 0,
        itemCount: cache.size
      })
    };
  }
  /**
   * Create mock email service
   */
  static createMockEmailService(): any {
    return {
      send: jest.fn().mockResolvedValue({
        messageId: 'test-message-id',
        accepted: [],
        rejected: [],
        response: 'Email sent successfully'
      }),
      sendBulk: jest.fn().mockResolvedValue([]),
      sendVerificationEmail: jest.fn().mockResolvedValue({ messageId: 'test-message-id' }),
      sendPasswordResetEmail: jest.fn().mockResolvedValue({ messageId: 'test-message-id' }),
      sendWelcomeEmail: jest.fn().mockResolvedValue({ messageId: 'test-message-id' }),
      sendNotificationEmail: jest.fn().mockResolvedValue({ messageId: 'test-message-id' }),
      testConnection: jest.fn().mockResolvedValue(true)
    };
  }
  /**
   * Create mock JWT service
   */
  static createMockJwtService(): any {
    return {
      generateAccessToken: jest.fn().mockReturnValue('mock-access-token'),
      generateRefreshToken: jest.fn().mockReturnValue('mock-refresh-token'),
      verifyAccessToken: jest.fn().mockResolvedValue({
        sub: 'user-id',
        company_id: 'company-id',
        role: 'user'
      }),
      verifyRefreshToken: jest.fn().mockResolvedValue({
        sub: 'user-id'
      }),
      decodeToken: jest.fn().mockReturnValue({
        sub: 'user-id',
        company_id: 'company-id'
      })
    };
  }
  /**
   * Create mock event bus
   */
  static createMockEventBus(): any {
    const listeners = new Map<string, Function[]>();
    return {
      emit: jest.fn().mockImplementation((event: string, data: any) => {
        const eventListeners = listeners.get(event) || [];
        eventListeners.forEach(listener => listener(data));
      }),
      on: jest.fn().mockImplementation((event: string, listener: Function) => {
        if (!listeners.has(event)) {
          listeners.set(event, []);
        }
        listeners.get(event)!.push(listener);
      }),
      off: jest.fn(),
      once: jest.fn(),
      removeAllListeners: jest.fn().mockImplementation(() => listeners.clear())
    };
  }
  /**
   * Create mock database connection
   */
  static createMockDatabaseConnection(): any {
    return {
      query: jest.fn().mockResolvedValue([]),
      execute: jest.fn().mockResolvedValue({ affectedRows: 1 }),
      transaction: jest.fn().mockImplementation(async (callback) => {
        const trx = {
          query: jest.fn().mockResolvedValue([]),
          execute: jest.fn().mockResolvedValue({ affectedRows: 1 }),
          commit: jest.fn(),
          rollback: jest.fn()
        };
        return callback(trx);
      }),
      connect: jest.fn().mockResolvedValue(undefined),
      disconnect: jest.fn().mockResolvedValue(undefined),
      isConnected: jest.fn().mockReturnValue(true),
      healthCheck: jest.fn().mockResolvedValue(true)
    };
  }
  /**
   * Create mock validator service
   */
  static createMockValidatorService(): any {
    return {
      isEmail: jest.fn().mockReturnValue(true),
      isPhone: jest.fn().mockReturnValue(true),
      isUUID: jest.fn().mockReturnValue(true),
      isUrl: jest.fn().mockReturnValue(true),
      isDate: jest.fn().mockReturnValue(true),
      isNumber: jest.fn().mockReturnValue(true),
      isInteger: jest.fn().mockReturnValue(true),
      isPositive: jest.fn().mockReturnValue(true),
      isStrongPassword: jest.fn().mockReturnValue(true),
      required: jest.fn().mockImplementation(value => value),
      validateSchema: jest.fn().mockReturnValue({ isValid: true }),
      validateWithRules: jest.fn().mockResolvedValue({ isValid: true, sanitizedData: {} })
    };
  }
  /**
   * Create mock WebSocket server
   */
  static createMockWebSocketServer(): any {
    return {
      start: jest.fn().mockResolvedValue(undefined),
      stop: jest.fn().mockResolvedValue(undefined),
      emit: jest.fn(),
      broadcast: jest.fn(),
      getConnections: jest.fn().mockReturnValue([]),
      getNamespace: jest.fn().mockReturnValue({
        emit: jest.fn(),
        on: jest.fn(),
        use: jest.fn()
      })
    };
  }
  /**
   * Create mock rate limiter
   */
  static createMockRateLimiter(): any {
    return {
      consume: jest.fn().mockResolvedValue({ remainingPoints: 10 }),
      block: jest.fn().mockResolvedValue(undefined),
      penalty: jest.fn().mockResolvedValue(undefined),
      reward: jest.fn().mockResolvedValue(undefined),
      delete: jest.fn().mockResolvedValue(undefined),
      get: jest.fn().mockResolvedValue({ remainingPoints: 10, msBeforeNext: 1000 })
    };
  }
}
