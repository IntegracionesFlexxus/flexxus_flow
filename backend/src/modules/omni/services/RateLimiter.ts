/**
 * Rate Limiter Service - Sprint 06
 * Implements rate limiting with circuit breaker pattern
 */

import { injectable } from 'inversify';
import { LoggerFactory } from '@/shared/services/logger/LoggerService';

interface IRateLimitConfig {
  maxRequests: number;
  windowMs: number;
  maxBurst?: number;
}

interface ICircuitBreakerConfig {
  threshold: number;
  timeout: number;
  resetTimeout: number;
}

interface IRateLimitStatus {
  remaining: number;
  resetAt: Date;
  isLimited: boolean;
}

interface ICircuitBreakerStatus {
  state: 'closed' | 'open' | 'half-open';
  failures: number;
  nextAttempt?: Date;
}

class CircuitBreaker {
  private state: 'closed' | 'open' | 'half-open' = 'closed';
  private failures: number = 0;
  private nextAttempt?: Date;
  private successCount: number = 0;

  constructor(
    private config: ICircuitBreakerConfig,
    private logger: any
  ) {}

  async execute<T>(fn: () => Promise<T>): Promise<T> {
    if (this.state === 'open') {
      if (this.nextAttempt && new Date() < this.nextAttempt) {
        throw new Error('Circuit breaker is open');
      }
      this.state = 'half-open';
      this.logger.info('Circuit breaker entering half-open state');
    }

    try {
      const result = await fn();

      if (this.state === 'half-open') {
        this.successCount++;
        if (this.successCount >= 3) {
          this.reset();
        }
      }

      return result;
    } catch (error) {
      this.handleFailure();
      throw error;
    }
  }

  private handleFailure(): void {
    this.failures++;
    this.successCount = 0;

    if (this.failures >= this.config.threshold) {
      this.trip();
    }
  }

  private trip(): void {
    this.state = 'open';
    this.nextAttempt = new Date(Date.now() + this.config.resetTimeout);
    this.logger.warn('Circuit breaker tripped', {
      failures: this.failures,
      nextAttempt: this.nextAttempt
    });
  }

  private reset(): void {
    this.state = 'closed';
    this.failures = 0;
    this.successCount = 0;
    this.nextAttempt = undefined;
    this.logger.info('Circuit breaker reset');
  }

  getStatus(): ICircuitBreakerStatus {
    return {
      state: this.state,
      failures: this.failures,
      nextAttempt: this.nextAttempt
    };
  }
}

@injectable()
export class RateLimiter {
  private logger: any;
  private rateLimiters: Map<string, Map<string, number[]>> = new Map();
  private circuitBreakers: Map<string, CircuitBreaker> = new Map();
  private configs: Map<string, IRateLimitConfig> = new Map();

  constructor() {
    this.logger = LoggerFactory.create({ file: __filename });
    this.initializeDefaultConfigs();
  }

  /**
   * Initialize default rate limit configurations
   */
  private initializeDefaultConfigs(): void {
    // WhatsApp rate limits
    this.configs.set('whatsapp', {
      maxRequests: 80,
      windowMs: 60000, // 1 minute
      maxBurst: 100
    });

    // Instagram rate limits
    this.configs.set('instagram', {
      maxRequests: 200,
      windowMs: 3600000, // 1 hour
      maxBurst: 250
    });

    // Email rate limits
    this.configs.set('email', {
      maxRequests: 100,
      windowMs: 60000, // 1 minute
      maxBurst: 150
    });

    // SMS rate limits
    this.configs.set('sms', {
      maxRequests: 60,
      windowMs: 60000, // 1 minute
      maxBurst: 80
    });
  }

  /**
   * Check rate limit for a channel
   */
  async checkRateLimit(
    channelType: string,
    channelId: string
  ): Promise<IRateLimitStatus> {
    const config = this.configs.get(channelType.toLowerCase());
    if (!config) {
      return {
        remaining: Infinity,
        resetAt: new Date(Date.now() + 60000),
        isLimited: false
      };
    }

    // Get or create rate limiter for this channel
    if (!this.rateLimiters.has(channelId)) {
      this.rateLimiters.set(channelId, new Map());
    }

    const channelLimiter = this.rateLimiters.get(channelId)!;
    const now = Date.now();
    const windowStart = now - config.windowMs;

    // Get request timestamps for current window
    const key = `${channelType}:${Math.floor(now / config.windowMs)}`;
    const timestamps = channelLimiter.get(key) || [];

    // Filter timestamps within current window
    const validTimestamps = timestamps.filter(t => t > windowStart);

    // Check if rate limit exceeded
    const isLimited = validTimestamps.length >= config.maxRequests;
    const remaining = Math.max(0, config.maxRequests - validTimestamps.length);
    const resetAt = new Date(windowStart + config.windowMs);

    return {
      remaining,
      resetAt,
      isLimited
    };
  }

  /**
   * Consume rate limit
   */
  async consumeRateLimit(
    channelType: string,
    channelId: string
  ): Promise<void> {
    const status = await this.checkRateLimit(channelType, channelId);

    if (status.isLimited) {
      throw new Error(`Rate limit exceeded for ${channelType}. Reset at ${status.resetAt}`);
    }

    const config = this.configs.get(channelType.toLowerCase());
    if (!config) return;

    const channelLimiter = this.rateLimiters.get(channelId)!;
    const now = Date.now();
    const key = `${channelType}:${Math.floor(now / config.windowMs)}`;

    const timestamps = channelLimiter.get(key) || [];
    timestamps.push(now);
    channelLimiter.set(key, timestamps);

    // Clean up old windows
    this.cleanupOldWindows(channelLimiter, now - config.windowMs * 2);

    this.logger.debug('Rate limit consumed', {
      channelType,
      channelId,
      remaining: status.remaining - 1
    });
  }

  /**
   * Execute with circuit breaker
   */
  async executeWithCircuitBreaker<T>(
    channelId: string,
    fn: () => Promise<T>
  ): Promise<T> {
    // Get or create circuit breaker for channel
    if (!this.circuitBreakers.has(channelId)) {
      const breaker = new CircuitBreaker(
        {
          threshold: 5,
          timeout: 60000,
          resetTimeout: 300000 // 5 minutes
        },
        this.logger
      );
      this.circuitBreakers.set(channelId, breaker);
    }

    const breaker = this.circuitBreakers.get(channelId)!;
    return breaker.execute(fn);
  }

  /**
   * Execute with rate limiting and circuit breaker
   */
  async executeWithProtection<T>(
    channelType: string,
    channelId: string,
    fn: () => Promise<T>
  ): Promise<T> {
    // Check rate limit first
    await this.consumeRateLimit(channelType, channelId);

    // Execute with circuit breaker
    return this.executeWithCircuitBreaker(channelId, fn);
  }

  /**
   * Get rate limit status for all channels
   */
  async getAllRateLimitStatus(): Promise<Map<string, IRateLimitStatus>> {
    const statuses = new Map<string, IRateLimitStatus>();

    for (const [channelId, limiter] of this.rateLimiters) {
      // Get the most restrictive status across all channel types
      let mostRestrictive: IRateLimitStatus | null = null;

      for (const [channelType] of this.configs) {
        const status = await this.checkRateLimit(channelType, channelId);

        if (!mostRestrictive || status.remaining < mostRestrictive.remaining) {
          mostRestrictive = status;
        }
      }

      if (mostRestrictive) {
        statuses.set(channelId, mostRestrictive);
      }
    }

    return statuses;
  }

  /**
   * Get circuit breaker status
   */
  getCircuitBreakerStatus(channelId: string): ICircuitBreakerStatus | null {
    const breaker = this.circuitBreakers.get(channelId);
    return breaker ? breaker.getStatus() : null;
  }

  /**
   * Reset rate limit for a channel
   */
  resetRateLimit(channelId: string): void {
    this.rateLimiters.delete(channelId);
    this.logger.info('Rate limit reset', { channelId });
  }

  /**
   * Reset circuit breaker for a channel
   */
  resetCircuitBreaker(channelId: string): void {
    this.circuitBreakers.delete(channelId);
    this.logger.info('Circuit breaker reset', { channelId });
  }

  /**
   * Update rate limit configuration
   */
  updateConfig(channelType: string, config: IRateLimitConfig): void {
    this.configs.set(channelType.toLowerCase(), config);
    this.logger.info('Rate limit config updated', { channelType, config });
  }

  /**
   * Clean up old window data
   */
  private cleanupOldWindows(limiter: Map<string, number[]>, cutoff: number): void {
    const keysToDelete: string[] = [];

    for (const [key, timestamps] of limiter) {
      const validTimestamps = timestamps.filter(t => t > cutoff);

      if (validTimestamps.length === 0) {
        keysToDelete.push(key);
      } else if (validTimestamps.length < timestamps.length) {
        limiter.set(key, validTimestamps);
      }
    }

    keysToDelete.forEach(key => limiter.delete(key));
  }

  /**
   * Get statistics
   */
  getStatistics(): any {
    const stats = {
      activeChannels: this.rateLimiters.size,
      circuitBreakers: {
        total: this.circuitBreakers.size,
        open: 0,
        halfOpen: 0,
        closed: 0
      },
      rateLimits: {} as any
    };

    // Count circuit breaker states
    for (const breaker of this.circuitBreakers.values()) {
      const status = breaker.getStatus();
      if (status.state === 'open') stats.circuitBreakers.open++;
      else if (status.state === 'half-open') stats.circuitBreakers.halfOpen++;
      else stats.circuitBreakers.closed++;
    }

    // Get rate limit configs
    for (const [type, config] of this.configs) {
      stats.rateLimits[type] = config;
    }

    return stats;
  }
}