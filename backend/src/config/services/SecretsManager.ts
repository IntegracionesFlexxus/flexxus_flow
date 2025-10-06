// TODO: SECURITY REVIEW - Este archivo contiene información sensible
// Verificar que todos los logs estén correctamente sanitizados

/**
 * Secrets Manager Service - Sprint 2
 * Siguiendo lineamientos nivel 2: gestión segura de secretos
 * Manejo centralizado de credenciales y datos sensibles
 */
import { injectable, inject } from 'inversify';
import { TYPES } from '@/container/types';
import { environment } from '@/config/environment';
import * as crypto from 'crypto';
import * as fs from 'fs';
import * as path from 'path';
import { promisify } from 'util';
const readFile = promisify(fs.readFile);
const writeFile = promisify(fs.writeFile);
const mkdir = promisify(fs.mkdir);
const access = promisify(fs.access);
export interface Secret {
  key: string;
  value: string;
  metadata?: {
    description?: string;
    createdAt: Date;
    updatedAt: Date;
    expiresAt?: Date;
    tags?: string[];
    rotation?: {
      enabled: boolean;
      intervalDays?: number;
      lastRotated?: Date;
    };
  };
}
export interface EncryptedSecret {
  key: string;
  encryptedValue: string;
  iv: string;
  authTag: string;
  metadata?: Secret['metadata'];
}
export interface SecretsManagerOptions {
  storageProvider?: 'file' | 'env' | 'vault' | 'aws' | 'azure';
  encryptionAlgorithm?: string;
  keyDerivationIterations?: number;
  secretsPath?: string;
  autoRotate?: boolean;
  rotationIntervalDays?: number;
  cacheEnabled?: boolean;
  cacheTTL?: number;
}
@injectable()
export class SecretsManager {
  private secrets: Map<string, Secret> = new Map();
  private encryptionKey: Buffer;
  private readonly algorithm = 'aes-256-gcm';
  private readonly options: SecretsManagerOptions;
  private secretsFilePath: string;
  private rotationTimers: Map<string, NodeJS.Timeout> = new Map();
  private cache: Map<string, { value: string; expiresAt: number }> = new Map();
  private logger: any;
  
  constructor(options: SecretsManagerOptions = {}) {
    // Simple logger fallback for now
    this.logger = {
      info: (msg: string, ...args: any[]) => console.log(msg, ...args),
      error: (msg: string, ...args: any[]) => console.error(msg, ...args),
      warn: (msg: string, ...args: any[]) => console.warn(msg, ...args),
      debug: (msg: string, ...args: any[]) => console.debug(msg, ...args)
    };
    this.options = {
      storageProvider: 'file',
      encryptionAlgorithm: 'aes-256-gcm',
      keyDerivationIterations: 100000,
      secretsPath: path.join(process.cwd(), '.secrets'),
      autoRotate: false,
      rotationIntervalDays: 90,
      cacheEnabled: true,
      cacheTTL: 300, // 5 minutes
      ...options,
    };
    this.secretsFilePath = path.join(this.options.secretsPath!, 'secrets.enc');
    this.encryptionKey = this.deriveEncryptionKey();
    this.initialize();
  }
  /**
   * Initialize secrets manager
   */
  private async initialize(): Promise<void> {
    await this.ensureSecretsDirectory();
    await this.loadSecrets();
    if (this.options.autoRotate) {
      this.setupAutoRotation();
    }
    // Setup cache cleanup
    if (this.options.cacheEnabled) {
      setInterval(() => this.cleanupCache(), 60000); // Clean every minute
    }
  }
  /**
   * Get secret value
   */
  async getSecret(key: string): Promise<string | null> {
    // Check cache first
    if (this.options.cacheEnabled) {
      const cached = this.cache.get(key);
      if (cached && cached.expiresAt > Date.now()) {
        return cached.value;
      }
    }
    const secret = this.secrets.get(key);
    if (!secret) {
      return null;
    }
    // Check if secret has expired
    if (secret.metadata?.expiresAt && secret.metadata.expiresAt < new Date()) {
      this.logger.warn(`Secret '${key}' has expired`);
      return null;
    }
    // Cache the value
    if (this.options.cacheEnabled) {
      this.cache.set(key, {
        value: secret.value,
        expiresAt: Date.now() + (this.options.cacheTTL! * 1000),
      });
    }
    return secret.value;
  }
  /**
   * Set secret value
   */
  async setSecret(
    key: string,
    value: string,
    metadata?: Partial<Secret['metadata']>
  ): Promise<void> {
    const now = new Date();
    const existingSecret = this.secrets.get(key);
    const secret: Secret = {
      key,
      value,
      metadata: {
        ...existingSecret?.metadata,
        ...metadata,
        createdAt: existingSecret?.metadata?.createdAt || now,
        updatedAt: now,
      },
    };
    this.secrets.set(key, secret);
    // Clear cache
    this.cache.delete(key);
    // Save to persistent storage
    await this.saveSecrets();
    // Setup rotation if enabled
    if (metadata?.rotation?.enabled) {
      this.setupRotationTimer(key, metadata.rotation.intervalDays || this.options.rotationIntervalDays!);
    }
  }
  /**
   * Delete secret
   */
  async deleteSecret(key: string): Promise<boolean> {
    const deleted = this.secrets.delete(key);
    if (deleted) {
      // Clear cache
      this.cache.delete(key);
      // Cancel rotation timer
      const timer = this.rotationTimers.get(key);
      if (timer) {
        clearTimeout(timer);
        this.rotationTimers.delete(key);
      }
      await this.saveSecrets();
    }
    return deleted;
  }
  /**
   * List all secret keys
   */
  listSecrets(): string[] {
    return Array.from(this.secrets.keys());
  }
  /**
   * Check if secret exists
   */
  hasSecret(key: string): boolean {
    return this.secrets.has(key);
  }
  /**
   * Rotate secret
   */
  async rotateSecret(key: string, newValue?: string): Promise<string> {
    const secret = this.secrets.get(key);
    if (!secret) {
      throw new Error(`Secret '${key}' not found`);
    }
    // Generate new value if not provided
    const rotatedValue = newValue || this.generateSecretValue();
    // Update secret
    await this.setSecret(key, rotatedValue, {
      ...secret.metadata,
      rotation: {
        enabled: secret.metadata?.rotation?.enabled || false,
        intervalDays: secret.metadata?.rotation?.intervalDays,
        lastRotated: new Date(),
      },
    });
    this.logger.info(`🔄 Secret '${key}' rotated successfully`);
    return rotatedValue;
  }
  /**
   * Bulk import secrets
import { ILoggerService } from '@/shared/services/logger/LoggerService';
import { environment } from '@/config/environment';
   */
  async importSecrets(secrets: Record<string, string>): Promise<void> {
    for (const [key, value] of Object.entries(secrets)) {
      await this.setSecret(key, value);
    }
  }
  /**
   * Export secrets (with optional filtering)
   */
  async exportSecrets(filter?: string[]): Promise<Record<string, string>> {
    const exported: Record<string, string> = {};
    for (const [key, secret] of this.secrets.entries()) {
      if (!filter || filter.includes(key)) {
        exported[key] = secret.value;
      }
    }
    return exported;
  }
  /**
   * Validate secret format
   */
  validateSecret(key: string, pattern?: RegExp): boolean {
    const secret = this.secrets.get(key);
    if (!secret) {
      return false;
    }
    if (pattern) {
      return pattern.test(secret.value);
    }
    return true;
  }
  /**
   * Derive encryption key from master key
   */
  private deriveEncryptionKey(): Buffer {
    const masterKey = environment.security.secretsMasterKey;
    const salt = environment.security.secretsSalt;
    return crypto.pbkdf2Sync(
      masterKey,
      salt,
      this.options.keyDerivationIterations!,
      32,
      'sha256'
    );
  }
  /**
   * Encrypt secret value
   */
  private encryptSecret(secret: Secret): EncryptedSecret {
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv(this.algorithm, this.encryptionKey, iv);
    let encrypted = cipher.update(secret.value, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    const authTag = cipher.getAuthTag();
    return {
      key: secret.key,
      encryptedValue: encrypted,
      iv: iv.toString('hex'),
      authTag: authTag.toString('hex'),
      metadata: secret.metadata,
    };
  }
  /**
   * Decrypt secret value
   */
  private decryptSecret(encryptedSecret: EncryptedSecret): Secret {
    const decipher = crypto.createDecipheriv(
      this.algorithm,
      this.encryptionKey,
      Buffer.from(encryptedSecret.iv, 'hex')
    );
    decipher.setAuthTag(Buffer.from(encryptedSecret.authTag, 'hex'));
    let decrypted = decipher.update(encryptedSecret.encryptedValue, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return {
      key: encryptedSecret.key,
      value: decrypted,
      metadata: encryptedSecret.metadata,
    };
  }
  /**
   * Load secrets from storage
   */
  private async loadSecrets(): Promise<void> {
    try {
      await access(this.secretsFilePath);
      const encryptedData = await readFile(this.secretsFilePath, 'utf8');
      const encryptedSecrets: EncryptedSecret[] = JSON.parse(encryptedData);
      for (const encryptedSecret of encryptedSecrets) {
        try {
          const secret = this.decryptSecret(encryptedSecret);
          this.secrets.set(secret.key, secret);
        } catch (error) {
          this.logger.error(`Failed to decrypt secret '${encryptedSecret.key}':`, error);
        }
      }
      this.logger.info(`✅ Loaded ${this.secrets.size} secrets`);
    } catch (error) {
      if ((error as any).code !== 'ENOENT') {
        this.logger.error('Failed to load secrets:', error);
      }
    }
  }
  /**
   * Save secrets to storage
   */
  private async saveSecrets(): Promise<void> {
    const encryptedSecrets: EncryptedSecret[] = [];
    for (const secret of this.secrets.values()) {
      encryptedSecrets.push(this.encryptSecret(secret));
    }
    await writeFile(
      this.secretsFilePath,
      JSON.stringify(encryptedSecrets, null, 2),
      'utf8'
    );
  }
  /**
   * Ensure secrets directory exists
   */
  private async ensureSecretsDirectory(): Promise<void> {
    try {
      await access(this.options.secretsPath!);
    } catch {
      await mkdir(this.options.secretsPath!, { recursive: true });
    }
  }
  /**
   * Setup automatic rotation
   */
  private setupAutoRotation(): void {
    for (const [key, secret] of this.secrets.entries()) {
      if (secret.metadata?.rotation?.enabled) {
        const intervalDays = secret.metadata.rotation.intervalDays || this.options.rotationIntervalDays!;
        this.setupRotationTimer(key, intervalDays);
      }
    }
  }
  /**
   * Setup rotation timer for a secret
   */
  private setupRotationTimer(key: string, intervalDays: number): void {
    // Clear existing timer
    const existingTimer = this.rotationTimers.get(key);
    if (existingTimer) {
      clearTimeout(existingTimer);
    }
    // Set new timer
    const timer = setTimeout(async () => {
      try {
        await this.rotateSecret(key);
      } catch (error) {
        this.logger.error(`Failed to auto-rotate secret '${key}':`, error);
      }
    }, intervalDays * 24 * 60 * 60 * 1000);
    this.rotationTimers.set(key, timer);
  }
  /**
   * Generate secure random secret value
   */
  private generateSecretValue(length = 32): string {
    return crypto.randomBytes(length).toString('base64');
  }
  /**
   * Cleanup expired cache entries
   */
  private cleanupCache(): void {
    const now = Date.now();
    for (const [key, entry] of this.cache.entries()) {
      if (entry.expiresAt < now) {
        this.cache.delete(key);
      }
    }
  }
  /**
   * Dispose of resources
   */
  dispose(): void {
    // Clear rotation timers
    for (const timer of this.rotationTimers.values()) {
      clearTimeout(timer);
    }
    this.rotationTimers.clear();
    // Clear caches
    this.secrets.clear();
    this.cache.clear();
    this.logger.info('🔚 SecretsManager disposed');
  }
}
/**
 * Secret validation patterns
 */
export const SecretPatterns = {
  JWT_SECRET: /^[A-Za-z0-9+/]{32,}$/,
  API_KEY: /^[A-Za-z0-9]{32,64}$/,
  DATABASE_PASSWORD: /^.{8,}$/,
  EMAIL_PASSWORD: /^.{8,}$/,
  ENCRYPTION_KEY: /^[A-Fa-f0-9]{64}$/,
};
