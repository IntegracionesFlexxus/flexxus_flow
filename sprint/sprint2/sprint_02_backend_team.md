# Sprint 02 - Backend Team

## Información del Sprint
- **Duración:** Semanas 3-4 (2 semanas)
- **Equipo:** Backend Team (4 desarrolladores)
- **Objetivo:** Implementar sistema completo de autenticación multi-empresa con JWT y feature flags

## Objetivos Específicos

### Objetivo Principal
Desarrollar un sistema robusto de autenticación multi-empresa con JWT, gestión de feature flags dinámicos y APIs completas para el manejo de usuarios y empresas.

### Objetivos Técnicos
1. Implementar autenticación JWT con refresh tokens
2. Crear sistema de feature flags con evaluación en tiempo real
3. Desarrollar APIs completas para gestión de usuarios multi-empresa
4. Implementar middleware de autorización granular
5. Establecer sistema de auditoría de actividades
6. Configurar rate limiting y seguridad avanzada

## Tareas Detalladas

### 1. Sistema de Autenticación JWT

#### 1.1 JWT Service: shared/services/JwtService.ts
```typescript
import jwt from 'jsonwebtoken';
import { injectable, inject } from 'inversify';
import { Logger } from 'winston';
import { TYPES } from '@/container/types';
import { environment } from '@config/environment';
import crypto from 'crypto';

export interface JwtPayload {
  userId: string;
  companyId: string;
  email: string;
  role: string;
  sessionId: string;
  iat?: number;
  exp?: number;
}

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  refreshExpiresIn: number;
}

@injectable()
export class JwtService {
  constructor(
    @inject(TYPES.Logger) private logger: Logger
  ) {}

  async generateTokenPair(payload: Omit<JwtPayload, 'iat' | 'exp'>): Promise<TokenPair> {
    const accessTokenExpiry = '15m';
    const refreshTokenExpiry = '7d';
    
    // Generate access token
    const accessToken = jwt.sign(
      payload,
      environment.jwt.secret,
      {
        expiresIn: accessTokenExpiry,
        issuer: 'sistema-gestion',
        audience: 'sistema-gestion-client'
      }
    );

    // Generate refresh token with different secret
    const refreshToken = jwt.sign(
      { 
        userId: payload.userId, 
        sessionId: payload.sessionId,
        tokenType: 'refresh'
      },
      environment.jwt.refreshSecret,
      {
        expiresIn: refreshTokenExpiry,
        issuer: 'sistema-gestion',
        audience: 'sistema-gestion-client'
      }
    );

    return {
      accessToken,
      refreshToken,
      expiresIn: 15 * 60, // 15 minutes in seconds
      refreshExpiresIn: 7 * 24 * 60 * 60 // 7 days in seconds
    };
  }

  async verifyAccessToken(token: string): Promise<JwtPayload> {
    try {
      const decoded = jwt.verify(
        token,
        environment.jwt.secret,
        {
          issuer: 'sistema-gestion',
          audience: 'sistema-gestion-client'
        }
      ) as JwtPayload;
      
      return decoded;
    } catch (error) {
      this.logger.warn('Invalid access token', { error: error.message });
      throw new Error('Invalid or expired token');
    }
  }

  async verifyRefreshToken(token: string): Promise<{ userId: string; sessionId: string }> {
    try {
      const decoded = jwt.verify(
        token,
        environment.jwt.refreshSecret,
        {
          issuer: 'sistema-gestion',
          audience: 'sistema-gestion-client'
        }
      ) as any;
      
      if (decoded.tokenType !== 'refresh') {
        throw new Error('Invalid token type');
      }
      
      return {
        userId: decoded.userId,
        sessionId: decoded.sessionId
      };
    } catch (error) {
      this.logger.warn('Invalid refresh token', { error: error.message });
      throw new Error('Invalid or expired refresh token');
    }
  }

  hashToken(token: string): string {
    return crypto.createHash('sha256').update(token).digest('hex');
  }

  generateSessionId(): string {
    return crypto.randomUUID();
  }
}
```

#### 1.2 Session Service: modules/auth/services/SessionService.ts
```typescript
import { injectable, inject } from 'inversify';
import { Logger } from 'winston';
import { TYPES } from '@/container/types';
import { ISessionRepository } from '../interfaces/ISessionRepository';
import { JwtService, TokenPair } from '@shared/services/JwtService';

export interface SessionData {
  userId: string;
  companyId: string;
  deviceInfo: {
    userAgent?: string;
    ip?: string;
    deviceFingerprint?: string;
  };
  location?: {
    country?: string;
    city?: string;
    timezone?: string;
  };
}

export interface Session {
  id: string;
  userId: string;
  companyId: string;
  tokenHash: string;
  refreshTokenHash: string;
  deviceInfo: any;
  ipAddress?: string;
  userAgent?: string;
  active: boolean;
  lastActivityAt: Date;
  expiresAt: Date;
  refreshExpiresAt: Date;
  createdAt: Date;
}

@injectable()
export class SessionService {
  constructor(
    @inject(TYPES.SessionRepository) private sessionRepository: ISessionRepository,
    @inject(TYPES.JwtService) private jwtService: JwtService,
    @inject(TYPES.Logger) private logger: Logger
  ) {}

  async createSession(
    userId: string,
    companyId: string,
    email: string,
    role: string,
    deviceInfo: SessionData['deviceInfo'],
    location?: SessionData['location']
  ): Promise<{ session: Session; tokens: TokenPair }> {
    const sessionId = this.jwtService.generateSessionId();
    
    // Generate token pair
    const tokens = await this.jwtService.generateTokenPair({
      userId,
      companyId,
      email,
      role,
      sessionId
    });

    // Hash tokens for storage
    const tokenHash = this.jwtService.hashToken(tokens.accessToken);
    const refreshTokenHash = this.jwtService.hashToken(tokens.refreshToken);

    // Calculate expiry dates
    const now = new Date();
    const expiresAt = new Date(now.getTime() + tokens.expiresIn * 1000);
    const refreshExpiresAt = new Date(now.getTime() + tokens.refreshExpiresIn * 1000);

    // Create session record
    const session = await this.sessionRepository.create({
      id: sessionId,
      userId,
      companyId,
      tokenHash,
      refreshTokenHash,
      deviceInfo,
      ipAddress: deviceInfo.ip,
      userAgent: deviceInfo.userAgent,
      country: location?.country,
      city: location?.city,
      timezone: location?.timezone,
      active: true,
      lastActivityAt: now,
      expiresAt,
      refreshExpiresAt
    });

    this.logger.info('Session created', {
      userId,
      companyId,
      sessionId,
      ip: deviceInfo.ip
    });

    return { session, tokens };
  }

  async validateSession(tokenHash: string): Promise<Session | null> {
    const session = await this.sessionRepository.findByTokenHash(tokenHash);
    
    if (!session || !session.active || session.expiresAt < new Date()) {
      return null;
    }

    // Update last activity
    await this.sessionRepository.updateLastActivity(session.id);
    
    return session;
  }

  async refreshSession(refreshTokenHash: string): Promise<TokenPair | null> {
    const session = await this.sessionRepository.findByRefreshTokenHash(refreshTokenHash);
    
    if (!session || !session.active || session.refreshExpiresAt < new Date()) {
      return null;
    }

    // Get user info for new tokens
    const user = await this.getUserWithRole(session.userId, session.companyId);
    if (!user) {
      return null;
    }

    // Generate new token pair
    const tokens = await this.jwtService.generateTokenPair({
      userId: session.userId,
      companyId: session.companyId,
      email: user.email,
      role: user.role,
      sessionId: session.id
    });

    // Update session with new token hashes
    const newTokenHash = this.jwtService.hashToken(tokens.accessToken);
    const newRefreshTokenHash = this.jwtService.hashToken(tokens.refreshToken);
    
    await this.sessionRepository.updateTokens(session.id, newTokenHash, newRefreshTokenHash);

    return tokens;
  }

  async invalidateSession(sessionId: string): Promise<void> {
    await this.sessionRepository.invalidate(sessionId);
    this.logger.info('Session invalidated', { sessionId });
  }

  async invalidateUserSessions(userId: string, exceptSessionId?: string): Promise<number> {
    const count = await this.sessionRepository.invalidateUserSessions(userId, exceptSessionId);
    this.logger.info('User sessions invalidated', { userId, count, exceptSessionId });
    return count;
  }

  async cleanupExpiredSessions(): Promise<number> {
    const count = await this.sessionRepository.cleanupExpired();
    this.logger.info('Expired sessions cleaned up', { count });
    return count;
  }

  private async getUserWithRole(userId: string, companyId: string): Promise<{ email: string; role: string } | null> {
    // This would typically fetch from user repository
    // Implementation depends on user repository interface
    return null; // Placeholder
  }
}
```

### 2. Sistema de Feature Flags

#### 2.1 Feature Flag Service: modules/auth/services/FeatureFlagService.ts
```typescript
import { injectable, inject } from 'inversify';
import { Logger } from 'winston';
import { TYPES } from '@/container/types';
import { IFeatureFlagRepository } from '../interfaces/IFeatureFlagRepository';

export interface FeatureFlag {
  id: string;
  companyId: string;
  featureName: string;
  enabled: boolean;
  config: Record<string, any>;
  rolloutPercentage: number;
  rolloutRules: Record<string, any>;
  environment: string;
  startsAt?: Date;
  expiresAt?: Date;
}

export interface FeatureFlagEvaluationContext {
  userId: string;
  companyId: string;
  userRole: string;
  environment: string;
  userAttributes?: Record<string, any>;
}

@injectable()
export class FeatureFlagService {
  private flagCache = new Map<string, FeatureFlag[]>();
  private cacheExpiry = new Map<string, number>();
  private readonly CACHE_TTL = 5 * 60 * 1000; // 5 minutes

  constructor(
    @inject(TYPES.FeatureFlagRepository) private flagRepository: IFeatureFlagRepository,
    @inject(TYPES.Logger) private logger: Logger
  ) {}

  async isEnabled(
    featureName: string,
    context: FeatureFlagEvaluationContext
  ): Promise<boolean> {
    try {
      const flag = await this.getFeatureFlag(featureName, context.companyId, context.environment);
      
      if (!flag) {
        return false;
      }

      // Check if flag is active based on time constraints
      if (!this.isTimeActive(flag)) {
        return false;
      }

      // Check rollout percentage
      if (!this.isInRollout(flag, context)) {
        return false;
      }

      // Check rollout rules
      if (!this.matchesRolloutRules(flag, context)) {
        return false;
      }

      return flag.enabled;
    } catch (error) {
      this.logger.error('Error evaluating feature flag', {
        featureName,
        companyId: context.companyId,
        error: error.message
      });
      return false; // Fail safe
    }
  }

  async getFeatureConfig<T = any>(
    featureName: string,
    context: FeatureFlagEvaluationContext
  ): Promise<T | null> {
    const isEnabled = await this.isEnabled(featureName, context);
    if (!isEnabled) {
      return null;
    }

    const flag = await this.getFeatureFlag(featureName, context.companyId, context.environment);
    return flag?.config as T || null;
  }

  async getAllFlags(companyId: string, environment: string = 'production'): Promise<Record<string, boolean>> {
    const flags = await this.getCompanyFlags(companyId, environment);
    const result: Record<string, boolean> = {};

    for (const flag of flags) {
      result[flag.featureName] = flag.enabled && this.isTimeActive(flag);
    }

    return result;
  }

  async updateFeatureFlag(
    companyId: string,
    featureName: string,
    updates: Partial<FeatureFlag>
  ): Promise<FeatureFlag> {
    const flag = await this.flagRepository.update(companyId, featureName, updates);
    
    // Invalidate cache
    this.invalidateCache(companyId);
    
    this.logger.info('Feature flag updated', {
      companyId,
      featureName,
      updates
    });
    
    return flag;
  }

  async createFeatureFlag(flagData: Omit<FeatureFlag, 'id'>): Promise<FeatureFlag> {
    const flag = await this.flagRepository.create(flagData);
    
    // Invalidate cache
    this.invalidateCache(flagData.companyId);
    
    this.logger.info('Feature flag created', {
      companyId: flagData.companyId,
      featureName: flagData.featureName
    });
    
    return flag;
  }

  private async getFeatureFlag(
    featureName: string,
    companyId: string,
    environment: string
  ): Promise<FeatureFlag | null> {
    const flags = await this.getCompanyFlags(companyId, environment);
    return flags.find(f => f.featureName === featureName) || null;
  }

  private async getCompanyFlags(companyId: string, environment: string): Promise<FeatureFlag[]> {
    const cacheKey = `${companyId}:${environment}`;
    const now = Date.now();
    
    // Check cache
    if (this.flagCache.has(cacheKey) && this.cacheExpiry.get(cacheKey)! > now) {
      return this.flagCache.get(cacheKey)!;
    }

    // Fetch from database
    const flags = await this.flagRepository.findByCompany(companyId, environment);
    
    // Update cache
    this.flagCache.set(cacheKey, flags);
    this.cacheExpiry.set(cacheKey, now + this.CACHE_TTL);
    
    return flags;
  }

  private isTimeActive(flag: FeatureFlag): boolean {
    const now = new Date();
    
    if (flag.startsAt && now < flag.startsAt) {
      return false;
    }
    
    if (flag.expiresAt && now > flag.expiresAt) {
      return false;
    }
    
    return true;
  }

  private isInRollout(flag: FeatureFlag, context: FeatureFlagEvaluationContext): boolean {
    if (flag.rolloutPercentage >= 100) {
      return true;
    }

    // Use consistent hash based on user ID
    const hash = this.hashString(`${flag.featureName}:${context.userId}`);
    const percentage = hash % 100;
    
    return percentage < flag.rolloutPercentage;
  }

  private matchesRolloutRules(flag: FeatureFlag, context: FeatureFlagEvaluationContext): boolean {
    if (!flag.rolloutRules || Object.keys(flag.rolloutRules).length === 0) {
      return true;
    }

    // Role-based rules
    if (flag.rolloutRules.roles && Array.isArray(flag.rolloutRules.roles)) {
      if (!flag.rolloutRules.roles.includes(context.userRole)) {
        return false;
      }
    }

    // User attribute rules
    if (flag.rolloutRules.userAttributes && context.userAttributes) {
      for (const [key, value] of Object.entries(flag.rolloutRules.userAttributes)) {
        if (context.userAttributes[key] !== value) {
          return false;
        }
      }
    }

    return true;
  }

  private hashString(str: string): number {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32bit integer
    }
    return Math.abs(hash);
  }

  private invalidateCache(companyId: string): void {
    for (const key of this.flagCache.keys()) {
      if (key.startsWith(companyId + ':')) {
        this.flagCache.delete(key);
        this.cacheExpiry.delete(key);
      }
    }
  }
}
```

### 3. Middleware de Autenticación y Autorización

#### 3.1 Authentication Middleware: shared/middleware/auth.ts
```typescript
import { Request, Response, NextFunction } from 'express';
import { container } from '@/container/container';
import { TYPES } from '@/container/types';
import { JwtService } from '@shared/services/JwtService';
import { SessionService } from '@modules/auth/services/SessionService';
import { Logger } from 'winston';

// Extend Request interface
declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string;
        email: string;
        companyId: string;
        role: string;
        sessionId: string;
      };
    }
  }
}

export const authenticateToken = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  const logger = container.get<Logger>(TYPES.Logger);
  const jwtService = container.get<JwtService>(TYPES.JwtService);
  const sessionService = container.get<SessionService>(TYPES.SessionService);
  
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

    if (!token) {
      res.status(401).json({
        success: false,
        message: 'Access token required'
      });
      return;
    }

    // Verify JWT token
    const payload = await jwtService.verifyAccessToken(token);
    
    // Validate session
    const tokenHash = jwtService.hashToken(token);
    const session = await sessionService.validateSession(tokenHash);
    
    if (!session) {
      res.status(401).json({
        success: false,
        message: 'Invalid or expired session'
      });
      return;
    }

    // Set user context
    req.user = {
      id: payload.userId,
      email: payload.email,
      companyId: payload.companyId,
      role: payload.role,
      sessionId: payload.sessionId
    };

    // Set database context for RLS
    req.app.locals.db?.query(`SET app.current_user_id = '${payload.userId}'`);
    req.app.locals.db?.query(`SET app.current_company_id = '${payload.companyId}'`);

    next();
  } catch (error) {
    logger.warn('Authentication failed', {
      error: error.message,
      ip: req.ip,
      userAgent: req.get('User-Agent')
    });
    
    res.status(401).json({
      success: false,
      message: 'Invalid or expired token'
    });
  }
};

export const requireRole = (allowedRoles: string[]) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({
        success: false,
        message: 'Authentication required'
      });
      return;
    }

    if (!allowedRoles.includes(req.user.role)) {
      res.status(403).json({
        success: false,
        message: 'Insufficient permissions'
      });
      return;
    }

    next();
  };
};

export const requireFeatureFlag = (featureName: string) => {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    if (!req.user) {
      res.status(401).json({
        success: false,
        message: 'Authentication required'
      });
      return;
    }

    try {
      const featureFlagService = container.get<FeatureFlagService>(TYPES.FeatureFlagService);
      
      const isEnabled = await featureFlagService.isEnabled(featureName, {
        userId: req.user.id,
        companyId: req.user.companyId,
        userRole: req.user.role,
        environment: process.env.NODE_ENV || 'development'
      });

      if (!isEnabled) {
        res.status(403).json({
          success: false,
          message: 'Feature not available'
        });
        return;
      }

      next();
    } catch (error) {
      const logger = container.get<Logger>(TYPES.Logger);
      logger.error('Feature flag check failed', {
        featureName,
        userId: req.user.id,
        companyId: req.user.companyId,
        error: error.message
      });
      
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  };
};
```

### 4. Controllers de Autenticación

#### 4.1 Auth Controller: modules/auth/controllers/AuthController.ts
```typescript
import { Request, Response } from 'express';
import { injectable, inject } from 'inversify';
import { Logger } from 'winston';
import { TYPES } from '@/container/types';
import { IAuthService } from '../interfaces/IAuthService';
import { SessionService } from '../services/SessionService';
import { body, validationResult } from 'express-validator';

@injectable()
export class AuthController {
  constructor(
    @inject(TYPES.AuthService) private authService: IAuthService,
    @inject(TYPES.SessionService) private sessionService: SessionService,
    @inject(TYPES.Logger) private logger: Logger
  ) {}

  // Validation rules
  static loginValidation = [
    body('email').isEmail().normalizeEmail(),
    body('password').isLength({ min: 6 }),
  ];

  static registerValidation = [
    body('email').isEmail().normalizeEmail(),
    body('password').isLength({ min: 8 }).matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/),
    body('firstName').isLength({ min: 2 }).trim(),
    body('lastName').isLength({ min: 2 }).trim(),
    body('companyName').isLength({ min: 2 }).trim(),
  ];

  login = async (req: Request, res: Response): Promise<void> => {
    try {
      // Validate input
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(400).json({
          success: false,
          message: 'Validation failed',
          errors: errors.array()
        });
        return;
      }

      const { email, password } = req.body;
      
      // Get device info
      const deviceInfo = {
        userAgent: req.get('User-Agent'),
        ip: req.ip,
        deviceFingerprint: req.get('X-Device-Fingerprint')
      };

      // Authenticate user
      const authResult = await this.authService.authenticate(email, password);
      
      if (!authResult.success) {
        res.status(401).json({
          success: false,
          message: authResult.message
        });
        return;
      }

      const { user, companies } = authResult;
      
      // Handle company selection
      let selectedCompany;
      if (companies.length === 1) {
        selectedCompany = companies[0];
      } else if (req.body.companyId) {
        selectedCompany = companies.find(c => c.id === req.body.companyId);
        if (!selectedCompany) {
          res.status(400).json({
            success: false,
            message: 'Invalid company selection'
          });
          return;
        }
      } else {
        // Multiple companies, need selection
        res.status(200).json({
          success: true,
          requiresCompanySelection: true,
          user: {
            id: user.id,
            email: user.email,
            firstName: user.firstName,
            lastName: user.lastName
          },
          companies: companies.map(c => ({
            id: c.id,
            name: c.name,
            plan: c.plan
          }))
        });
        return;
      }

      // Create session
      const { session, tokens } = await this.sessionService.createSession(
        user.id,
        selectedCompany.id,
        user.email,
        selectedCompany.role,
        deviceInfo
      );

      this.logger.info('User logged in', {
        userId: user.id,
        companyId: selectedCompany.id,
        sessionId: session.id,
        ip: req.ip
      });

      res.status(200).json({
        success: true,
        message: 'Login successful',
        data: {
          user: {
            id: user.id,
            email: user.email,
            firstName: user.firstName,
            lastName: user.lastName,
            avatar: user.avatar
          },
          company: {
            id: selectedCompany.id,
            name: selectedCompany.name,
            plan: selectedCompany.plan,
            features: selectedCompany.features
          },
          tokens: {
            accessToken: tokens.accessToken,
            refreshToken: tokens.refreshToken,
            expiresIn: tokens.expiresIn
          }
        }
      });

    } catch (error) {
      this.logger.error('Login error', {
        error: error.message,
        stack: error.stack,
        ip: req.ip
      });
      
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  };

  register = async (req: Request, res: Response): Promise<void> => {
    try {
      // Validate input
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(400).json({
          success: false,
          message: 'Validation failed',
          errors: errors.array()
        });
        return;
      }

      const { email, password, firstName, lastName, companyName } = req.body;
      
      // Register user and company
      const result = await this.authService.register({
        email,
        password,
        firstName,
        lastName,
        companyName
      });

      if (!result.success) {
        res.status(400).json({
          success: false,
          message: result.message
        });
        return;
      }

      this.logger.info('User registered', {
        userId: result.user.id,
        companyId: result.company.id,
        email
      });

      res.status(201).json({
        success: true,
        message: 'Registration successful',
        data: {
          user: result.user,
          company: result.company
        }
      });

    } catch (error) {
      this.logger.error('Registration error', {
        error: error.message,
        stack: error.stack
      });
      
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  };

  refreshToken = async (req: Request, res: Response): Promise<void> => {
    try {
      const { refreshToken } = req.body;
      
      if (!refreshToken) {
        res.status(400).json({
          success: false,
          message: 'Refresh token required'
        });
        return;
      }

      const jwtService = container.get<JwtService>(TYPES.JwtService);
      const tokenHash = jwtService.hashToken(refreshToken);
      
      const tokens = await this.sessionService.refreshSession(tokenHash);
      
      if (!tokens) {
        res.status(401).json({
          success: false,
          message: 'Invalid refresh token'
        });
        return;
      }

      res.status(200).json({
        success: true,
        data: {
          accessToken: tokens.accessToken,
          refreshToken: tokens.refreshToken,
          expiresIn: tokens.expiresIn
        }
      });

    } catch (error) {
      this.logger.error('Token refresh error', {
        error: error.message
      });
      
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  };

  logout = async (req: Request, res: Response): Promise<void> => {
    try {
      if (!req.user) {
        res.status(401).json({
          success: false,
          message: 'Not authenticated'
        });
        return;
      }

      await this.sessionService.invalidateSession(req.user.sessionId);
      
      this.logger.info('User logged out', {
        userId: req.user.id,
        sessionId: req.user.sessionId
      });

      res.status(200).json({
        success: true,
        message: 'Logout successful'
      });

    } catch (error) {
      this.logger.error('Logout error', {
        error: error.message,
        userId: req.user?.id
      });
      
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  };
}
```

### 5. Rate Limiting y Seguridad

#### 5.1 Rate Limiting Middleware: shared/middleware/rateLimiter.ts
```typescript
import rateLimit from 'express-rate-limit';
import { Request, Response } from 'express';
import { container } from '@/container/container';
import { TYPES } from '@/container/types';
import { Logger } from 'winston';

// Rate limiting configurations
export const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per windowMs
  message: {
    success: false,
    message: 'Too many requests, please try again later.'
  },
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req: Request, res: Response) => {
    const logger = container.get<Logger>(TYPES.Logger);
    logger.warn('Rate limit exceeded', {
      ip: req.ip,
      userAgent: req.get('User-Agent'),
      path: req.path
    });
    
    res.status(429).json({
      success: false,
      message: 'Too many requests, please try again later.',
      retryAfter: Math.round(req.rateLimit.resetTime / 1000)
    });
  }
});

export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // Limit each IP to 5 login requests per windowMs
  skipSuccessfulRequests: true,
  message: {
    success: false,
    message: 'Too many login attempts, please try again later.'
  }
});

export const apiLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 60, // Limit each IP to 60 API requests per minute
  message: {
    success: false,
    message: 'API rate limit exceeded.'
  }
});

// Company-specific rate limiter
export const createCompanyLimiter = (requestsPerMinute: number) => {
  return rateLimit({
    windowMs: 1 * 60 * 1000, // 1 minute
    max: requestsPerMinute,
    keyGenerator: (req: Request) => {
      return req.user?.companyId || req.ip;
    },
    message: {
      success: false,
      message: 'Company API rate limit exceeded.'
    }
  });
};
```

## Criterios de Aceptación

### Funcionales
- [ ] Sistema de login/logout funcionando con JWT
- [ ] Refresh token mechanism implementado y funcional
- [ ] Multi-company user selection funcionando
- [ ] Feature flags evaluándose correctamente en tiempo real
- [ ] Session management con invalidación automática
- [ ] Rate limiting aplicado a endpoints críticos

### Técnicos
- [ ] JWT tokens seguros con claims apropiados
- [ ] Session validation < 10ms para requests autenticados
- [ ] Feature flag evaluation < 5ms con caching
- [ ] Rate limiting funcionando sin impacto en performance
- [ ] Database context setting para RLS funcionando
- [ ] Audit logging de actividades críticas

### Seguridad
- [ ] Tokens JWT firmados con secrets seguros
- [ ] Session tokens hasheados en base de datos
- [ ] Rate limiting previendo ataques de fuerza bruta
- [ ] Input validation en todos los endpoints
- [ ] Error messages no revelando información sensible
- [ ] Session invalidation funcionando correctamente

### Performance
- [ ] Authentication middleware < 10ms overhead
- [ ] Feature flag caching reduciendo database calls
- [ ] Session cleanup automático sin impacto
- [ ] Rate limiting con mínima latencia
- [ ] Database queries optimizadas para auth flows

## Riesgos y Mitigaciones

### Riesgo: JWT secret compromise
**Mitigación:** Key rotation strategy y monitoring de patrones anómalos

### Riesgo: Feature flag cache inconsistency
**Mitigación:** TTL corto y invalidación explícita en updates críticos

### Riesgo: Session table growth impactando performance
**Mitigación:** Cleanup job automático y monitoring de table size

### Riesgo: Rate limiting bypass por attackers distribuidos
**Mitigación:** Multiple layers (IP, user, company) y monitoring avanzado

## Entregables

### Core Services
1. **JwtService** - Generación y validación de tokens JWT
2. **SessionService** - Gestión completa de sesiones de usuario
3. **FeatureFlagService** - Evaluación de feature flags con caching
4. **AuthService** - Lógica de negocio de autenticación
5. **UserService** - CRUD operations para usuarios

### Middleware Components
1. **authenticateToken** - Middleware de autenticación JWT
2. **requireRole** - Middleware de autorización por rol
3. **requireFeatureFlag** - Middleware de feature flag validation
4. **rateLimiter** - Rate limiting configurations
5. **auditLogger** - Logging automático de actividades

### API Controllers
1. **AuthController** - Login, register, refresh, logout
2. **UserController** - Gestión de usuarios y perfiles
3. **CompanyController** - Switching y management de empresas
4. **FeatureFlagController** - Admin interface para feature flags

### Repository Interfaces
1. **IUserRepository** - Interface para operaciones de usuario
2. **ICompanyRepository** - Interface para operaciones de empresa
3. **ISessionRepository** - Interface para gestión de sesiones
4. **IFeatureFlagRepository** - Interface para feature flags
5. **IAuditLogRepository** - Interface para audit trail

### Configuration
1. **JWT configuration** con secrets y expiry times
2. **Rate limiting rules** por endpoint y user type
3. **Feature flag defaults** para nuevas empresas
4. **Session cleanup schedule** y retention policies
5. **Audit log configuration** para compliance

### Testing Suite
1. **JWT service tests** - Token generation y validation
2. **Session management tests** - Create, validate, invalidate flows
3. **Feature flag tests** - Evaluation logic y rollout rules
4. **Authentication flow tests** - End-to-end login/logout
5. **Rate limiting tests** - Behavior under different loads

### Documentation
1. **Authentication Guide** - JWT implementation details
2. **Feature Flag Usage** - How to implement y evaluate flags
3. **Session Management** - Best practices y security considerations
4. **API Security** - Rate limiting y security headers
5. **Troubleshooting Guide** - Common issues y solutions

## Dependencies

### Externas
- Database tables del Database Team (Sprint 2)
- JWT secrets configurados en environment
- Redis para session caching (opcional pero recomendado)

### Internas
- Shared database connection del Sprint 1
- Logger service del Sprint 1
- Error handling middleware del Sprint 1
- Container DI configurado del Sprint 1