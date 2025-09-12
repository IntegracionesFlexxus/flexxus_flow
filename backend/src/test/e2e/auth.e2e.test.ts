/**
 * Authentication E2E Tests
 * Sprint 4 - Tests end-to-end para flujos de autenticación
 */

import { TestRequest } from '@/test/utils/TestRequest';
import { UserBuilder } from '@/test/builders/UserBuilder';
import { AuthBuilder } from '@/test/builders/AuthBuilder';
import { getTestContext } from '@/test/setup/e2e.setup';

describe('Authentication E2E Tests', () => {
  let request: TestRequest;
  let testUser: any;
  
  beforeAll(async () => {
    const context = getTestContext();
    request = new TestRequest(context.app);
    
    // Create test user
    testUser = await new UserBuilder()
      .withEmail('e2e.test@example.com')
      .withPassword('TestPassword123!')
      .withName('E2E Test User')
      .build();
  });
  
  describe('POST /api/auth/login', () => {
    it('should successfully login with valid credentials', async () => {
      const response = await request.post('/api/auth/login', {
        email: testUser.email,
        password: 'TestPassword123!'
      });
      
      TestRequest.expectSuccess(response);
      expect(response.body).toHaveProperty('accessToken');
      expect(response.body).toHaveProperty('refreshToken');
      expect(response.body).toHaveProperty('user');
      expect(response.body.user.email).toBe(testUser.email);
    });
    
    it('should fail with invalid credentials', async () => {
      const response = await request.post('/api/auth/login', {
        email: testUser.email,
        password: 'WrongPassword'
      });
      
      TestRequest.expectError(response, 401, /invalid credentials/i);
    });
    
    it('should fail with non-existent user', async () => {
      const response = await request.post('/api/auth/login', {
        email: 'nonexistent@example.com',
        password: 'AnyPassword123!'
      });
      
      TestRequest.expectError(response, 401, /user not found/i);
    });
    
    it('should validate required fields', async () => {
      const response = await request.post('/api/auth/login', {});
      
      TestRequest.expectValidation(response);
      expect(response.body.errors).toContainEqual(
        expect.objectContaining({ field: 'email' })
      );
      expect(response.body.errors).toContainEqual(
        expect.objectContaining({ field: 'password' })
      );
    });
    
    it('should rate limit after multiple failed attempts', async () => {
      // Make multiple failed login attempts
      for (let i = 0; i < 5; i++) {
        await request.post('/api/auth/login', {
          email: testUser.email,
          password: 'WrongPassword'
        });
      }
      
      // Next attempt should be rate limited
      const response = await request.post('/api/auth/login', {
        email: testUser.email,
        password: 'TestPassword123!'
      });
      
      expect(response.status).toBe(429);
      expect(response.body.message).toMatch(/too many requests/i);
    });
  });
  
  describe('POST /api/auth/refresh', () => {
    let refreshToken: string;
    
    beforeAll(async () => {
      const loginResponse = await request.post('/api/auth/login', {
        email: testUser.email,
        password: 'TestPassword123!'
      });
      refreshToken = loginResponse.body.refreshToken;
    });
    
    it('should refresh access token with valid refresh token', async () => {
      const response = await request.post('/api/auth/refresh', {
        refreshToken
      });
      
      TestRequest.expectSuccess(response);
      expect(response.body).toHaveProperty('accessToken');
      expect(response.body).toHaveProperty('refreshToken');
    });
    
    it('should fail with invalid refresh token', async () => {
      const response = await request.post('/api/auth/refresh', {
        refreshToken: 'invalid-refresh-token'
      });
      
      TestRequest.expectError(response, 401, /invalid token/i);
    });
    
    it('should fail with expired refresh token', async () => {
      const expiredToken = AuthBuilder.createExpiredToken();
      
      const response = await request.post('/api/auth/refresh', {
        refreshToken: expiredToken
      });
      
      TestRequest.expectError(response, 401, /expired/i);
    });
  });
  
  describe('POST /api/auth/logout', () => {
    let accessToken: string;
    
    beforeAll(async () => {
      const loginResponse = await request.post('/api/auth/login', {
        email: testUser.email,
        password: 'TestPassword123!'
      });
      accessToken = loginResponse.body.accessToken;
    });
    
    it('should successfully logout authenticated user', async () => {
      const response = await request
        .authenticate(accessToken)
        .post('/api/auth/logout');
      
      TestRequest.expectSuccess(response);
      expect(response.body.message).toMatch(/logged out/i);
    });
    
    it('should fail without authentication', async () => {
      const response = await request.post('/api/auth/logout');
      
      TestRequest.expectUnauthorized(response);
    });
    
    it('should invalidate token after logout', async () => {
      // First logout
      await request
        .authenticate(accessToken)
        .post('/api/auth/logout');
      
      // Try to use same token
      const response = await request
        .authenticate(accessToken)
        .get('/api/auth/me');
      
      TestRequest.expectUnauthorized(response);
    });
  });
  
  describe('GET /api/auth/me', () => {
    let accessToken: string;
    
    beforeAll(async () => {
      const loginResponse = await request.post('/api/auth/login', {
        email: testUser.email,
        password: 'TestPassword123!'
      });
      accessToken = loginResponse.body.accessToken;
    });
    
    it('should return current user profile', async () => {
      const response = await request
        .authenticate(accessToken)
        .get('/api/auth/me');
      
      TestRequest.expectSuccess(response);
      expect(response.body).toHaveProperty('id');
      expect(response.body.email).toBe(testUser.email);
      expect(response.body.name).toBe(testUser.name);
    });
    
    it('should fail without authentication', async () => {
      const response = await request.get('/api/auth/me');
      
      TestRequest.expectUnauthorized(response);
    });
    
    it('should fail with invalid token', async () => {
      const response = await request
        .authenticate('invalid-token')
        .get('/api/auth/me');
      
      TestRequest.expectUnauthorized(response);
    });
  });
  
  describe('Password Reset Flow', () => {
    it('should complete full password reset flow', async () => {
      // Step 1: Request password reset
      const resetRequest = await request.post('/api/auth/password/reset-request', {
        email: testUser.email
      });
      
      TestRequest.expectSuccess(resetRequest);
      expect(resetRequest.body.message).toMatch(/reset email sent/i);
      
      // In real test, we would capture the reset token from email
      // For E2E test, we'll simulate it
      const resetToken = 'test-reset-token';
      
      // Step 2: Verify reset token
      const verifyResponse = await request.get(`/api/auth/password/verify-token/${resetToken}`);
      
      TestRequest.expectSuccess(verifyResponse);
      expect(verifyResponse.body.valid).toBe(true);
      
      // Step 3: Reset password
      const newPassword = 'NewPassword456!';
      const resetResponse = await request.post('/api/auth/password/reset', {
        token: resetToken,
        password: newPassword,
        confirmPassword: newPassword
      });
      
      TestRequest.expectSuccess(resetResponse);
      expect(resetResponse.body.message).toMatch(/password reset successful/i);
      
      // Step 4: Login with new password
      const loginResponse = await request.post('/api/auth/login', {
        email: testUser.email,
        password: newPassword
      });
      
      TestRequest.expectSuccess(loginResponse);
      expect(loginResponse.body).toHaveProperty('accessToken');
    });
  });
  
  describe('Registration Flow', () => {
    it('should complete full registration flow', async () => {
      const newUser = {
        email: 'newuser@example.com',
        password: 'NewUser123!',
        name: 'New User',
        companyName: 'New Company'
      };
      
      // Step 1: Register
      const registerResponse = await request.post('/api/auth/register', newUser);
      
      TestRequest.expectSuccess(registerResponse);
      expect(registerResponse.body).toHaveProperty('user');
      expect(registerResponse.body).toHaveProperty('verificationEmailSent');
      expect(registerResponse.body.user.email).toBe(newUser.email);
      
      // In real test, we would capture verification token from email
      const verificationToken = 'test-verification-token';
      
      // Step 2: Verify email
      const verifyResponse = await request.get(`/api/auth/verify-email/${verificationToken}`);
      
      TestRequest.expectSuccess(verifyResponse);
      expect(verifyResponse.body.message).toMatch(/email verified/i);
      
      // Step 3: Login
      const loginResponse = await request.post('/api/auth/login', {
        email: newUser.email,
        password: newUser.password
      });
      
      TestRequest.expectSuccess(loginResponse);
      expect(loginResponse.body).toHaveProperty('accessToken');
      expect(loginResponse.body.user.email_verified).toBe(true);
    });
    
    it('should prevent duplicate registration', async () => {
      const response = await request.post('/api/auth/register', {
        email: testUser.email,
        password: 'AnyPassword123!',
        name: 'Duplicate User',
        companyName: 'Any Company'
      });
      
      TestRequest.expectError(response, 409, /already exists/i);
    });
  });
});