/**
 * Socket Rate Limiter Middleware
 * Rate limiting para conexiones WebSocket
 */

import { Socket } from 'socket.io';

interface ConnectionAttempt {
  count: number;
  firstAttemptAt: number;
  blockedUntil?: number;
}

/**
 * Rate limiter para conexiones WebSocket
 */
export class SocketRateLimiter {
  private ipAttempts: Map<string, ConnectionAttempt> = new Map();
  private userAttempts: Map<string, ConnectionAttempt> = new Map();

  // Configuration
  private readonly maxAttemptsPerIp: number = 10; // Max 10 connections per IP in window
  private readonly maxAttemptsPerUser: number = 5; // Max 5 connections per user in window
  private readonly windowMs: number = 60000; // 1 minute window
  private readonly blockDurationMs: number = 300000; // 5 minutes block

  constructor(options?: {
    maxAttemptsPerIp?: number;
    maxAttemptsPerUser?: number;
    windowMs?: number;
    blockDurationMs?: number;
  }) {
    if (options?.maxAttemptsPerIp) this.maxAttemptsPerIp = options.maxAttemptsPerIp;
    if (options?.maxAttemptsPerUser) this.maxAttemptsPerUser = options.maxAttemptsPerUser;
    if (options?.windowMs) this.windowMs = options.windowMs;
    if (options?.blockDurationMs) this.blockDurationMs = options.blockDurationMs;

    // Cleanup old entries every 5 minutes
    setInterval(() => this.cleanup(), 300000);
  }

  /**
   * Middleware function for Socket.io
   */
  middleware() {
    return async (socket: Socket, next: (err?: Error) => void) => {
      const ip = this.getClientIp(socket);
      const userId = (socket as any).userId; // Available after auth middleware

      // Check IP rate limit
      if (!this.checkIpLimit(ip)) {
        return next(new Error('Too many connection attempts from this IP. Please try again later.'));
      }

      // Check user rate limit (if authenticated)
      if (userId && !this.checkUserLimit(userId)) {
        return next(new Error('Too many connection attempts. Please try again later.'));
      }

      // Record attempt
      this.recordAttempt(ip, userId);

      next();
    };
  }

  /**
   * Check if IP is within rate limit
   */
  private checkIpLimit(ip: string): boolean {
    const attempt = this.ipAttempts.get(ip);

    if (!attempt) {
      return true;
    }

    const now = Date.now();

    // Check if blocked
    if (attempt.blockedUntil && attempt.blockedUntil > now) {
      return false;
    }

    // Check if window has expired
    if (now - attempt.firstAttemptAt > this.windowMs) {
      this.ipAttempts.delete(ip);
      return true;
    }

    // Check if exceeded limit
    if (attempt.count >= this.maxAttemptsPerIp) {
      attempt.blockedUntil = now + this.blockDurationMs;
      return false;
    }

    return true;
  }

  /**
   * Check if user is within rate limit
   */
  private checkUserLimit(userId: string): boolean {
    const attempt = this.userAttempts.get(userId);

    if (!attempt) {
      return true;
    }

    const now = Date.now();

    // Check if blocked
    if (attempt.blockedUntil && attempt.blockedUntil > now) {
      return false;
    }

    // Check if window has expired
    if (now - attempt.firstAttemptAt > this.windowMs) {
      this.userAttempts.delete(userId);
      return true;
    }

    // Check if exceeded limit
    if (attempt.count >= this.maxAttemptsPerUser) {
      attempt.blockedUntil = now + this.blockDurationMs;
      return false;
    }

    return true;
  }

  /**
   * Record connection attempt
   */
  private recordAttempt(ip: string, userId?: string): void {
    const now = Date.now();

    // Record IP attempt
    const ipAttempt = this.ipAttempts.get(ip);
    if (ipAttempt) {
      if (now - ipAttempt.firstAttemptAt > this.windowMs) {
        // Reset if window expired
        this.ipAttempts.set(ip, { count: 1, firstAttemptAt: now });
      } else {
        ipAttempt.count++;
      }
    } else {
      this.ipAttempts.set(ip, { count: 1, firstAttemptAt: now });
    }

    // Record user attempt
    if (userId) {
      const userAttempt = this.userAttempts.get(userId);
      if (userAttempt) {
        if (now - userAttempt.firstAttemptAt > this.windowMs) {
          // Reset if window expired
          this.userAttempts.set(userId, { count: 1, firstAttemptAt: now });
        } else {
          userAttempt.count++;
        }
      } else {
        this.userAttempts.set(userId, { count: 1, firstAttemptAt: now });
      }
    }
  }

  /**
   * Get client IP from socket
   */
  private getClientIp(socket: Socket): string {
    // Try to get real IP from headers (behind proxy)
    const forwardedFor = socket.handshake.headers['x-forwarded-for'];
    if (forwardedFor) {
      const ips = Array.isArray(forwardedFor) ? forwardedFor[0] : forwardedFor.split(',')[0];
      return ips.trim();
    }

    // Get from real IP header
    const realIp = socket.handshake.headers['x-real-ip'];
    if (realIp) {
      return Array.isArray(realIp) ? realIp[0] : realIp;
    }

    // Fallback to socket address
    return socket.handshake.address;
  }

  /**
   * Cleanup old entries
   */
  private cleanup(): void {
    const now = Date.now();

    // Cleanup IP attempts
    for (const [ip, attempt] of this.ipAttempts.entries()) {
      if (now - attempt.firstAttemptAt > this.windowMs + this.blockDurationMs) {
        this.ipAttempts.delete(ip);
      }
    }

    // Cleanup user attempts
    for (const [userId, attempt] of this.userAttempts.entries()) {
      if (now - attempt.firstAttemptAt > this.windowMs + this.blockDurationMs) {
        this.userAttempts.delete(userId);
      }
    }
  }

  /**
   * Get current stats
   */
  getStats() {
    return {
      trackedIps: this.ipAttempts.size,
      trackedUsers: this.userAttempts.size,
      config: {
        maxAttemptsPerIp: this.maxAttemptsPerIp,
        maxAttemptsPerUser: this.maxAttemptsPerUser,
        windowMs: this.windowMs,
        blockDurationMs: this.blockDurationMs
      }
    };
  }

  /**
   * Clear all rate limit data (useful for testing)
   */
  reset(): void {
    this.ipAttempts.clear();
    this.userAttempts.clear();
  }
}

// Create singleton instance
export const socketRateLimiter = new SocketRateLimiter({
  maxAttemptsPerIp: parseInt(process.env.SOCKET_RATE_LIMIT_IP || '10', 10),
  maxAttemptsPerUser: parseInt(process.env.SOCKET_RATE_LIMIT_USER || '5', 10),
  windowMs: parseInt(process.env.SOCKET_RATE_LIMIT_WINDOW_MS || '60000', 10),
  blockDurationMs: parseInt(process.env.SOCKET_RATE_LIMIT_BLOCK_MS || '300000', 10)
});
