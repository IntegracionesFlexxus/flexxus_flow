/**
 * OAuth Service - Sprint 09
 * Handles OAuth authentication flows for integrations
 */

import { injectable, inject } from 'inversify';
import { TYPES } from '@/container/types';
import { Pool } from 'pg';
import { IOAuthConfig, IOAuthToken } from './interfaces/IIntegration';
import { LoggerFactory } from '@/shared/services/logger/LoggerService';
import * as crypto from 'crypto';
import axios from 'axios';

@injectable()
export class OAuthService {
  private logger: any;
  private pendingAuthorizations: Map<string, IOAuthConfig> = new Map();

  constructor(
    @inject(TYPES.OmniConnection) private pool: Pool
  ) {
    this.logger = LoggerFactory.create({ file: __filename });
  }

  /**
   * Start OAuth authorization flow
   */
  async startAuthorization(
    integrationId: string,
    config: IOAuthConfig
  ): Promise<{ authorization_url: string; state: string }> {
    try {
      // Generate state for CSRF protection
      const state = this.generateState();
      
      // Store config with state
      this.pendingAuthorizations.set(state, {
        ...config,
        state
      });
      
      // Build authorization URL
      const params = new URLSearchParams({
        client_id: config.client_id,
        redirect_uri: config.redirect_uri,
        response_type: 'code',
        scope: config.scopes.join(' '),
        state,
        access_type: 'offline', // Request refresh token
        prompt: 'consent'
      });
      
      // Add PKCE if supported
      if (config.code_challenge_method) {
        const codeVerifier = this.generateCodeVerifier();
        const codeChallenge = this.generateCodeChallenge(codeVerifier);
        
        params.append('code_challenge', codeChallenge);
        params.append('code_challenge_method', config.code_challenge_method);
        
        // Store code verifier
        this.pendingAuthorizations.set(state, {
          ...config,
          state,
          code_challenge: codeVerifier // Store verifier, not challenge
        });
      }
      
      const authorizationUrl = `${config.authorization_url}?${params.toString()}`;
      
      // Store authorization request in database
      await this.storeAuthorizationRequest(integrationId, state, config);
      
      this.logger.info('OAuth authorization started', {
        integration_id: integrationId,
        state
      });
      
      return {
        authorization_url: authorizationUrl,
        state
      };
    } catch (error: any) {
      this.logger.error('Failed to start OAuth authorization', error);
      throw error;
    }
  }

  /**
   * Complete OAuth authorization flow
   */
  async completeAuthorization(
    code: string,
    state: string
  ): Promise<IOAuthToken> {
    try {
      // Get pending authorization
      const config = this.pendingAuthorizations.get(state);
      if (!config) {
        throw new Error('Invalid or expired authorization state');
      }
      
      // Exchange code for tokens
      const tokenData: any = {
        grant_type: 'authorization_code',
        code,
        redirect_uri: config.redirect_uri,
        client_id: config.client_id,
        client_secret: config.client_secret
      };
      
      // Add PKCE verifier if used
      if (config.code_challenge) {
        tokenData.code_verifier = config.code_challenge; // This is actually the verifier
      }
      
      const response = await axios.post(config.token_url, tokenData, {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        }
      });
      
      const token: IOAuthToken = {
        access_token: response.data.access_token,
        refresh_token: response.data.refresh_token,
        token_type: response.data.token_type || 'Bearer',
        expires_in: response.data.expires_in,
        expires_at: response.data.expires_in
          ? new Date(Date.now() + response.data.expires_in * 1000)
          : undefined,
        scope: response.data.scope,
        id_token: response.data.id_token
      };
      
      // Clean up pending authorization
      this.pendingAuthorizations.delete(state);
      
      // Get integration ID from state
      const integrationId = await this.getIntegrationIdFromState(state);
      if (integrationId) {
        // Store tokens
        await this.storeTokens(integrationId, token);
      }
      
      this.logger.info('OAuth authorization completed', { state });
      
      return token;
    } catch (error: any) {
      this.logger.error('Failed to complete OAuth authorization', error);
      throw error;
    }
  }

  /**
   * Refresh OAuth tokens
   */
  async refreshTokens(
    integrationId: string,
    refreshToken: string,
    config: Partial<IOAuthConfig>
  ): Promise<IOAuthToken> {
    try {
      if (!config.token_url || !config.client_id || !config.client_secret) {
        throw new Error('Missing OAuth configuration for refresh');
      }
      
      const tokenData = {
        grant_type: 'refresh_token',
        refresh_token: refreshToken,
        client_id: config.client_id,
        client_secret: config.client_secret
      };
      
      const response = await axios.post(config.token_url, tokenData, {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        }
      });
      
      const token: IOAuthToken = {
        access_token: response.data.access_token,
        refresh_token: response.data.refresh_token || refreshToken, // Keep old if not provided
        token_type: response.data.token_type || 'Bearer',
        expires_in: response.data.expires_in,
        expires_at: response.data.expires_in
          ? new Date(Date.now() + response.data.expires_in * 1000)
          : undefined,
        scope: response.data.scope
      };
      
      // Update stored tokens
      await this.storeTokens(integrationId, token);
      
      this.logger.info('OAuth tokens refreshed', { integration_id: integrationId });
      
      return token;
    } catch (error: any) {
      this.logger.error('Failed to refresh OAuth tokens', error);
      throw error;
    }
  }

  /**
   * Get stored OAuth tokens
   */
  async getTokens(integrationId: string): Promise<IOAuthToken | null> {
    try {
      const query = `
        SELECT access_token, refresh_token, token_type,
               expires_at, scope, id_token
        FROM oauth_tokens
        WHERE integration_id = $1;
      `;
      
      const result = await this.pool.query(query, [integrationId]);
      
      if (result.rows.length === 0) {
        return null;
      }
      
      const row = result.rows[0];
      
      // Decrypt tokens
      const decrypted = {
        access_token: await this.decryptToken(row.access_token),
        refresh_token: row.refresh_token ? await this.decryptToken(row.refresh_token) : undefined,
        token_type: row.token_type,
        expires_at: row.expires_at ? new Date(row.expires_at) : undefined,
        scope: row.scope,
        id_token: row.id_token ? await this.decryptToken(row.id_token) : undefined
      };
      
      // Check if token is expired and refresh if needed
      if (decrypted.expires_at && decrypted.expires_at < new Date()) {
        if (decrypted.refresh_token) {
          // Get integration config for refresh
          const config = await this.getIntegrationConfig(integrationId);
          if (config) {
            return await this.refreshTokens(
              integrationId,
              decrypted.refresh_token,
              config
            );
          }
        }
      }
      
      return decrypted;
    } catch (error: any) {
      this.logger.error('Failed to get OAuth tokens', error);
      return null;
    }
  }

  /**
   * Store OAuth tokens
   */
  private async storeTokens(
    integrationId: string,
    token: IOAuthToken
  ): Promise<void> {
    try {
      // Encrypt tokens
      const encryptedAccessToken = await this.encryptToken(token.access_token);
      const encryptedRefreshToken = token.refresh_token
        ? await this.encryptToken(token.refresh_token)
        : null;
      const encryptedIdToken = token.id_token
        ? await this.encryptToken(token.id_token)
        : null;
      
      // Get company ID
      const companyId = await this.getCompanyId(integrationId);
      const provider = await this.getProvider(integrationId);
      
      const query = `
        INSERT INTO oauth_tokens (
          company_id, integration_id, provider,
          access_token, refresh_token, token_type,
          expires_at, scope, id_token
        ) VALUES (
          $1, $2, $3, $4, $5, $6, $7, $8, $9
        )
        ON CONFLICT (integration_id)
        DO UPDATE SET
          access_token = EXCLUDED.access_token,
          refresh_token = EXCLUDED.refresh_token,
          token_type = EXCLUDED.token_type,
          expires_at = EXCLUDED.expires_at,
          scope = EXCLUDED.scope,
          id_token = EXCLUDED.id_token,
          updated_at = CURRENT_TIMESTAMP;
      `;
      
      await this.pool.query(query, [
        companyId,
        integrationId,
        provider,
        encryptedAccessToken,
        encryptedRefreshToken,
        token.token_type,
        token.expires_at,
        token.scope,
        encryptedIdToken
      ]);
      
      this.logger.info('OAuth tokens stored', { integration_id: integrationId });
    } catch (error: any) {
      this.logger.error('Failed to store OAuth tokens', error);
      throw error;
    }
  }

  /**
   * Revoke OAuth tokens
   */
  async revokeTokens(
    integrationId: string,
    revokeUrl?: string
  ): Promise<void> {
    try {
      // Get tokens
      const tokens = await this.getTokens(integrationId);
      if (!tokens) {
        return;
      }
      
      // Revoke with provider if URL provided
      if (revokeUrl) {
        try {
          await axios.post(revokeUrl, {
            token: tokens.access_token
          });
        } catch (error) {
          this.logger.warn('Failed to revoke token with provider', error);
        }
      }
      
      // Delete from database
      const query = `
        DELETE FROM oauth_tokens WHERE integration_id = $1;
      `;
      
      await this.pool.query(query, [integrationId]);
      
      this.logger.info('OAuth tokens revoked', { integration_id: integrationId });
    } catch (error: any) {
      this.logger.error('Failed to revoke OAuth tokens', error);
      throw error;
    }
  }

  /**
   * Generate random state
   */
  private generateState(): string {
    return crypto.randomBytes(32).toString('hex');
  }

  /**
   * Generate PKCE code verifier
   */
  private generateCodeVerifier(): string {
    return crypto.randomBytes(32).toString('base64url');
  }

  /**
   * Generate PKCE code challenge
   */
  private generateCodeChallenge(verifier: string): string {
    return crypto
      .createHash('sha256')
      .update(verifier)
      .digest('base64url');
  }

  /**
   * Encrypt token
   */
  private async encryptToken(token: string): Promise<string> {
    // Use environment variable for encryption key
    const key = process.env.OAUTH_ENCRYPTION_KEY || 'default-encryption-key';
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv('aes-256-cbc', Buffer.from(key, 'hex'), iv);
    
    let encrypted = cipher.update(token, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    
    return iv.toString('hex') + ':' + encrypted;
  }

  /**
   * Decrypt token
   */
  private async decryptToken(encryptedToken: string): Promise<string> {
    const key = process.env.OAUTH_ENCRYPTION_KEY || 'default-encryption-key';
    const parts = encryptedToken.split(':');
    const iv = Buffer.from(parts[0], 'hex');
    const encrypted = parts[1];
    
    const decipher = crypto.createDecipheriv('aes-256-cbc', Buffer.from(key, 'hex'), iv);
    
    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    
    return decrypted;
  }

  /**
   * Store authorization request
   */
  private async storeAuthorizationRequest(
    integrationId: string,
    state: string,
    config: IOAuthConfig
  ): Promise<void> {
    // Store state mapping in database or cache
    // This would typically use Redis for temporary storage
    // For now, using in-memory map
    this.pendingAuthorizations.set(state, config);
  }

  /**
   * Get integration ID from state
   */
  private async getIntegrationIdFromState(state: string): Promise<string | null> {
    // In production, this would query the database or cache
    // For now, returning mock ID
    return 'mock-integration-id';
  }

  /**
   * Get integration config
   */
  private async getIntegrationConfig(integrationId: string): Promise<Partial<IOAuthConfig> | null> {
    const query = `
      SELECT config FROM integration_configs WHERE id = $1;
    `;
    
    const result = await this.pool.query(query, [integrationId]);
    
    if (result.rows.length === 0) {
      return null;
    }
    
    return result.rows[0].config;
  }

  /**
   * Get company ID for integration
   */
  private async getCompanyId(integrationId: string): Promise<string> {
    const query = `
      SELECT company_id FROM integration_configs WHERE id = $1;
    `;
    
    const result = await this.pool.query(query, [integrationId]);
    
    if (result.rows.length === 0) {
      throw new Error(`Integration ${integrationId} not found`);
    }
    
    return result.rows[0].company_id;
  }

  /**
   * Get provider for integration
   */
  private async getProvider(integrationId: string): Promise<string> {
    const query = `
      SELECT provider FROM integration_configs WHERE id = $1;
    `;
    
    const result = await this.pool.query(query, [integrationId]);
    
    if (result.rows.length === 0) {
      throw new Error(`Integration ${integrationId} not found`);
    }
    
    return result.rows[0].provider;
  }
}