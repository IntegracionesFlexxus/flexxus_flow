/**
 * Development Authentication Bypass Middleware
 * WARNING: This should ONLY be used in development environment
 * It bypasses authentication for testing purposes
 */

import { Request, Response, NextFunction } from 'express';

export const devAuthBypass = (req: Request, res: Response, next: NextFunction): void => {
  // Only bypass in development mode
  if (process.env.NODE_ENV !== 'development') {
    return next();
  }

  // Check if bypass is enabled via environment variable
  if (process.env.DEV_AUTH_BYPASS !== 'true') {
    return next();
  }

  // If no authorization header or it's a test token, bypass auth
  if (!req.headers.authorization || req.headers.authorization === 'Bearer test-token') {
    // Set mock user data
    (req as any).user = {
      id: 1,
      email: 'dev@test.com',
      name: 'Development User',
      company_id: '0a8e08a1-fdad-4caa-b90e-d8d791fa82ee',
      role: 'admin',
      permissions: ['*'] // All permissions for dev
    };

    // Also set company context if provided in headers
    if (req.headers['x-company-id']) {
      (req as any).company = {
        id: req.headers['x-company-id'],
        name: 'Flexxus Demo Company'
      };
    }

    console.log('⚠️  DEV AUTH BYPASS ACTIVE - Request authenticated as dev user');
  }

  next();
};

export default devAuthBypass;