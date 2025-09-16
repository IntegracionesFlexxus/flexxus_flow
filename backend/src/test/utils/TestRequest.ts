/**
 * Test Request Utility
 * Sprint 4 - Wrapper para SuperTest con autenticación y helpers
 */
import supertest, { SuperTest, Test, Response } from 'supertest';
import { Application } from 'express';
import { AuthBuilder } from '@/test/builders/AuthBuilder';
export interface TestRequestOptions {
  token?: string;
  headers?: Record<string, string>;
  query?: Record<string, any>;
  timeout?: number;
}
export class TestRequest {
  private request: SuperTest<Test>;
  private defaultHeaders: Record<string, string> = {
    'Content-Type': 'application/json'
  };
  private authToken?: string;
  constructor(app: Application) {
    this.request = supertest(app);
  }
  /**
   * Set authentication token for all requests
   */
  authenticate(token?: string): TestRequest {
    this.authToken = token || AuthBuilder.createAccessToken();
    return this;
  }
  /**
   * Set authentication with specific user
   */
  authenticateAs(userId: string, companyId: string, role: string = 'user'): TestRequest {
    this.authToken = AuthBuilder.createAccessToken({ userId, companyId, role });
    return this;
  }
  /**
   * Clear authentication
   */
  unauthenticate(): TestRequest {
    this.authToken = undefined;
    return this;
  }
  /**
   * Set default headers
   */
  setHeaders(headers: Record<string, string>): TestRequest {
    this.defaultHeaders = { ...this.defaultHeaders, ...headers };
    return this;
  }
  /**
   * GET request
   */
  async get(url: string, options: TestRequestOptions = {}): Promise<Response> {
    let req = this.request.get(url);
    req = this.applyOptions(req, options);
    return req;
  }
  /**
   * POST request
   */
  async post(url: string, body?: any, options: TestRequestOptions = {}): Promise<Response> {
    let req = this.request.post(url);
    if (body) {
      req = req.send(body);
    }
    req = this.applyOptions(req, options);
    return req;
  }
  /**
   * PUT request
   */
  async put(url: string, body?: any, options: TestRequestOptions = {}): Promise<Response> {
    let req = this.request.put(url);
    if (body) {
      req = req.send(body);
    }
    req = this.applyOptions(req, options);
    return req;
  }
  /**
   * PATCH request
   */
  async patch(url: string, body?: any, options: TestRequestOptions = {}): Promise<Response> {
    let req = this.request.patch(url);
    if (body) {
      req = req.send(body);
    }
    req = this.applyOptions(req, options);
    return req;
  }
  /**
   * DELETE request
   */
  async delete(url: string, options: TestRequestOptions = {}): Promise<Response> {
    let req = this.request.delete(url);
    req = this.applyOptions(req, options);
    return req;
  }
  /**
   * Upload file
   */
  async upload(
    url: string,
    fieldName: string,
    filePath: string,
    additionalFields?: Record<string, any>,
    options: TestRequestOptions = {}
  ): Promise<Response> {
    let req = this.request.post(url);
    // Remove Content-Type for multipart
    const headers = { ...this.defaultHeaders };
    delete headers['Content-Type'];
    req = req.attach(fieldName, filePath);
    if (additionalFields) {
      Object.entries(additionalFields).forEach(([key, value]) => {
        req = req.field(key, value);
      });
    }
    // Apply headers and auth
    Object.entries(headers).forEach(([key, value]) => {
      req = req.set(key, value);
    });
    if (options.headers) {
      Object.entries(options.headers).forEach(([key, value]) => {
        req = req.set(key, value);
      });
    }
    const token = options.token || this.authToken;
    if (token) {
      req = req.set('Authorization', `Bearer ${token}`);
    }
    return req;
  }
  /**
   * Apply options to request
   */
  private applyOptions(req: Test, options: TestRequestOptions): Test {
    // Apply default headers
    Object.entries(this.defaultHeaders).forEach(([key, value]) => {
      req = req.set(key, value);
    });
    // Apply custom headers
    if (options.headers) {
      Object.entries(options.headers).forEach(([key, value]) => {
        req = req.set(key, value);
      });
    }
    // Apply authentication
    const token = options.token || this.authToken;
    if (token) {
      req = req.set('Authorization', `Bearer ${token}`);
    }
    // Apply query parameters
    if (options.query) {
      req = req.query(options.query);
    }
    // Apply timeout
    if (options.timeout) {
      req = req.timeout(options.timeout);
    }
    return req;
  }
  /**
   * Expect helpers for common assertions
   */
  static expectSuccess(response: Response): void {
    expect(response.status).toBeGreaterThanOrEqual(200);
    expect(response.status).toBeLessThan(300);
  }
  static expectError(response: Response, status: number, message?: string | RegExp): void {
    expect(response.status).toBe(status);
    if (message) {
      if (typeof message === 'string') {
        expect(response.body.message || response.body.error).toBe(message);
      } else {
        expect(response.body.message || response.body.error).toMatch(message);
      }
    }
  }
  static expectUnauthorized(response: Response): void {
    expect(response.status).toBe(401);
    expect(response.body.message || response.body.error).toMatch(/unauthorized|authentication/i);
  }
  static expectForbidden(response: Response): void {
    expect(response.status).toBe(403);
    expect(response.body.message || response.body.error).toMatch(/forbidden|permission|access/i);
  }
  static expectValidation(response: Response, field?: string): void {
    expect(response.status).toBe(400);
    if (field) {
      expect(response.body.errors).toBeDefined();
      const fieldError = response.body.errors.find((e: any) => e.field === field || e.param === field);
      expect(fieldError).toBeDefined();
    }
  }
  static expectPagination(response: Response): void {
    expect(response.body).toHaveProperty('data');
    expect(response.body).toHaveProperty('total');
    expect(response.body).toHaveProperty('page');
    expect(response.body).toHaveProperty('limit');
    expect(Array.isArray(response.body.data)).toBe(true);
  }
}
