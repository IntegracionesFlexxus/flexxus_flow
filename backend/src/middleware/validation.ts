/**
 * Validation Middleware
 * Handles request validation using express-validator
 */

import { Request, Response, NextFunction } from 'express';
import { validationResult } from 'express-validator';

/**
 * Middleware to validate request and return errors if any
 */
export const validateRequest = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  const errors = validationResult(req);

  if (!errors.isEmpty()) {
    res.status(400).json({
      success: false,
      errors: errors.array(),
      message: 'Validation failed'
    });
    return;
  }

  next();
};