/**
 * Encryption Service - Sprint 2
 * Siguiendo lineamientos nivel 2: encriptación de datos sensibles
 * Servicio centralizado para encriptación y hashing
 */

import { injectable, inject } from 'inversify';
import * as crypto from 'crypto';
import * as bcrypt from 'bcrypt';
import { Logger } from 'winston';
import { TYPES } from '@/container/types';
import { environment } from '@/config/environment';

export interface EncryptionOptions {
  algorithm?: string;
  encoding?: BufferEncoding;
  saltRounds?: number;
}

export interface EncryptedData {
  data: string;
  iv: string;
  authTag?: string;
  algorithm: string;
  timestamp: number;
}

export interface HashResult {
  hash: string;
  salt?: string;
  algorithm: string;
  iterations?: number;
}

@injectable()
export class EncryptionService {
  private readonly algorithm = 'aes-256-gcm';
  private readonly keyLength = 32;
  private readonly ivLength = 16;
  private readonly saltLength = 32;
  private readonly tagLength = 16;
  private readonly pbkdf2Iterations = 100000;
  private encryptionKey: Buffer;

  constructor(
    @inject(TYPES.Logger) private logger: Logger
  ) {
    this.encryptionKey = this.deriveEncryptionKey();
  }

  /**
   * Encrypt sensitive data
   */
  async encrypt(
    data: string | object,
    options: EncryptionOptions = {}
  ): Promise<EncryptedData> {
    try {
      const algorithm = options.algorithm || this.algorithm;
      const encoding = options.encoding || 'utf8';

      // Convert object to string if needed
      const plaintext = typeof data === 'object' ? JSON.stringify(data) : data;

      // Generate random IV
      const iv = crypto.randomBytes(this.ivLength);

      // Create cipher
      const cipher = crypto.createCipheriv(algorithm, this.encryptionKey, iv);

      // Encrypt data
      let encrypted = cipher.update(plaintext, encoding, 'hex');
      encrypted += cipher.final('hex');

      // Get auth tag for GCM mode
      let authTag: string | undefined;
      if (algorithm.includes('gcm')) {
        authTag = cipher.getAuthTag().toString('hex');
      }

      const result: EncryptedData = {
        data: encrypted,
        iv: iv.toString('hex'),
        authTag,
        algorithm,
        timestamp: Date.now(),
      };

      this.logger.debug('Data encrypted successfully', {
        algorithm,
        dataLength: plaintext.length,
      });

      return result;
    } catch (error) {
      this.logger.error('Encryption failed', { error: error.message });
      throw new Error('Failed to encrypt data');
    }
  }

  /**
   * Decrypt sensitive data
   */
  async decrypt(
    encryptedData: EncryptedData,
    options: EncryptionOptions = {}
  ): Promise<string> {
    try {
      const algorithm = encryptedData.algorithm || this.algorithm;
      const encoding = options.encoding || 'utf8';

      // Create decipher
      const decipher = crypto.createDecipheriv(
        algorithm,
        this.encryptionKey,
        Buffer.from(encryptedData.iv, 'hex')
      );

      // Set auth tag for GCM mode
      if (algorithm.includes('gcm') && encryptedData.authTag) {
        decipher.setAuthTag(Buffer.from(encryptedData.authTag, 'hex'));
      }

      // Decrypt data
      let decrypted = decipher.update(encryptedData.data, 'hex', encoding);
      decrypted += decipher.final(encoding);

      this.logger.debug('Data decrypted successfully', {
        algorithm,
        timestamp: encryptedData.timestamp,
      });

      return decrypted;
    } catch (error) {
      this.logger.error('Decryption failed', { error: error.message });
      throw new Error('Failed to decrypt data');
    }
  }

  /**
   * Hash password using bcrypt
   */
  async hashPassword(password: string): Promise<string> {
    try {
      const saltRounds = environment.security.bcryptRounds;
      const hash = await bcrypt.hash(password, saltRounds);

      this.logger.debug('Password hashed successfully', { saltRounds });

      return hash;
    } catch (error) {
      this.logger.error('Password hashing failed', { error: error.message });
      throw new Error('Failed to hash password');
    }
  }

  /**
   * Verify password against hash
   */
  async verifyPassword(password: string, hash: string): Promise<boolean> {
    try {
      const isValid = await bcrypt.compare(password, hash);

      this.logger.debug('Password verification completed', { isValid });

      return isValid;
    } catch (error) {
      this.logger.error('Password verification failed', { error: error.message });
      return false;
    }
  }

  /**
   * Hash data using SHA256
   */
  hashSHA256(data: string): string {
    return crypto
      .createHash('sha256')
      .update(data)
      .digest('hex');
  }

  /**
   * Hash data using SHA512
   */
  hashSHA512(data: string): string {
    return crypto
      .createHash('sha512')
      .update(data)
      .digest('hex');
  }

  /**
   * Create HMAC signature
   */
  createHMAC(data: string, secret: string, algorithm = 'sha256'): string {
    return crypto
      .createHmac(algorithm, secret)
      .update(data)
      .digest('hex');
  }

  /**
   * Verify HMAC signature
   */
  verifyHMAC(
    data: string,
    signature: string,
    secret: string,
    algorithm = 'sha256'
  ): boolean {
    const expectedSignature = this.createHMAC(data, secret, algorithm);
    return crypto.timingSafeEqual(
      Buffer.from(signature),
      Buffer.from(expectedSignature)
    );
  }

  /**
   * Hash data with salt using PBKDF2
   */
  async hashWithSalt(
    data: string,
    salt?: string,
    iterations?: number
  ): Promise<HashResult> {
    try {
      const actualSalt = salt || crypto.randomBytes(this.saltLength).toString('hex');
      const actualIterations = iterations || this.pbkdf2Iterations;

      const hash = crypto
        .pbkdf2Sync(data, actualSalt, actualIterations, 64, 'sha512')
        .toString('hex');

      return {
        hash,
        salt: actualSalt,
        algorithm: 'pbkdf2-sha512',
        iterations: actualIterations,
      };
    } catch (error) {
      this.logger.error('PBKDF2 hashing failed', { error: error.message });
      throw new Error('Failed to hash data');
    }
  }

  /**
   * Verify data against salted hash
   */
  async verifyHashWithSalt(
    data: string,
    hashResult: HashResult
  ): Promise<boolean> {
    try {
      if (!hashResult.salt || !hashResult.iterations) {
        throw new Error('Invalid hash result: missing salt or iterations');
      }

      const testHash = await this.hashWithSalt(
        data,
        hashResult.salt,
        hashResult.iterations
      );

      return crypto.timingSafeEqual(
        Buffer.from(hashResult.hash),
        Buffer.from(testHash.hash)
      );
    } catch (error) {
      this.logger.error('Hash verification failed', { error: error.message });
      return false;
    }
  }

  /**
   * Generate random token
   */
  generateToken(length = 32): string {
    return crypto.randomBytes(length).toString('hex');
  }

  /**
   * Generate secure random string
   */
  generateSecureRandom(
    length = 32,
    charset = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'
  ): string {
    const randomBytes = crypto.randomBytes(length);
    const result: string[] = [];

    for (let i = 0; i < length; i++) {
      result.push(charset[randomBytes[i] % charset.length]);
    }

    return result.join('');
  }

  /**
   * Encrypt field-level data for database storage
   */
  async encryptField(value: any): Promise<string> {
    if (value === null || value === undefined) {
      return value;
    }

    const encrypted = await this.encrypt(String(value));
    // Store as base64 encoded JSON for database
    return Buffer.from(JSON.stringify(encrypted)).toString('base64');
  }

  /**
   * Decrypt field-level data from database
   */
  async decryptField(encryptedValue: string): Promise<any> {
    if (!encryptedValue) {
      return null;
    }

    try {
      // Decode from base64 and parse JSON
      const encryptedData = JSON.parse(
        Buffer.from(encryptedValue, 'base64').toString('utf8')
      );

      return await this.decrypt(encryptedData);
    } catch (error) {
      this.logger.error('Field decryption failed', { error: error.message });
      return null;
    }
  }

  /**
   * Anonymize sensitive data for logging
   */
  anonymize(data: string, visibleChars = 4): string {
    if (!data || data.length <= visibleChars) {
      return '***';
    }

    const visible = data.slice(0, visibleChars);
    const hidden = '*'.repeat(Math.min(data.length - visibleChars, 10));

    return `${visible}${hidden}`;
  }

  /**
   * Mask sensitive fields in object
   */
  maskSensitiveData(
    obj: any,
    sensitiveFields: string[] = ['password', 'token', 'secret', 'key', 'ssn', 'creditCard']
  ): any {
    if (!obj || typeof obj !== 'object') {
      return obj;
    }

    const masked = { ...obj };

    for (const key of Object.keys(masked)) {
      if (sensitiveFields.some(field => key.toLowerCase().includes(field.toLowerCase()))) {
        masked[key] = this.anonymize(String(masked[key]));
      } else if (typeof masked[key] === 'object') {
        masked[key] = this.maskSensitiveData(masked[key], sensitiveFields);
      }
    }

    return masked;
  }

  /**
   * Generate key pair for asymmetric encryption
   */
  generateKeyPair(): {
    publicKey: string;
    privateKey: string;
  } {
    const { publicKey, privateKey } = crypto.generateKeyPairSync('rsa', {
      modulusLength: 2048,
      publicKeyEncoding: {
        type: 'spki',
        format: 'pem',
      },
      privateKeyEncoding: {
        type: 'pkcs8',
        format: 'pem',
      },
    });

    return { publicKey, privateKey };
  }

  /**
   * Encrypt with public key (asymmetric)
   */
  encryptWithPublicKey(data: string, publicKey: string): string {
    const encrypted = crypto.publicEncrypt(
      publicKey,
      Buffer.from(data, 'utf8')
    );

    return encrypted.toString('base64');
  }

  /**
   * Decrypt with private key (asymmetric)
   */
  decryptWithPrivateKey(encryptedData: string, privateKey: string): string {
    const decrypted = crypto.privateDecrypt(
      privateKey,
      Buffer.from(encryptedData, 'base64')
    );

    return decrypted.toString('utf8');
  }

  /**
   * Sign data with private key
   */
  signData(data: string, privateKey: string): string {
    const sign = crypto.createSign('SHA256');
    sign.update(data);
    sign.end();

    return sign.sign(privateKey, 'base64');
  }

  /**
   * Verify signature with public key
   */
  verifySignature(data: string, signature: string, publicKey: string): boolean {
    const verify = crypto.createVerify('SHA256');
    verify.update(data);
    verify.end();

    return verify.verify(publicKey, signature, 'base64');
  }

  /**
   * Derive encryption key from master key
   */
  private deriveEncryptionKey(): Buffer {
    const masterKey = process.env.ENCRYPTION_MASTER_KEY || 
      'default-master-key-change-in-production';
    const salt = process.env.ENCRYPTION_SALT || 'flexxus-encryption-salt';

    return crypto.pbkdf2Sync(
      masterKey,
      salt,
      this.pbkdf2Iterations,
      this.keyLength,
      'sha256'
    );
  }

  /**
   * Rotate encryption key
   */
  async rotateEncryptionKey(newMasterKey: string): Promise<void> {
    // This would typically involve:
    // 1. Re-encrypting all existing encrypted data with new key
    // 2. Updating the master key in secure storage
    // 3. Clearing any cached keys

    this.logger.info('Encryption key rotation initiated');

    // Update the key
    process.env.ENCRYPTION_MASTER_KEY = newMasterKey;
    this.encryptionKey = this.deriveEncryptionKey();

    this.logger.info('Encryption key rotation completed');
  }
}
