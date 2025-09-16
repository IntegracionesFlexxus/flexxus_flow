/**
 * Auth Schemas - Zod validation schemas for AuthController
 * Sprint 2 & 3 - Validation layer
 */
import { z } from 'zod';
/**
 * Login schema
 */
export const LoginSchema = z.object({
  email: z.string()
    .min(1, 'Email is required')
    .email('Invalid email format'),
  password: z.string()
    .min(1, 'Password is required'),
  companyId: z.string().uuid('Invalid company ID format').optional()
});
/**
 * Register schema
 */
export const RegisterSchema = z.object({
  email: z.string()
    .min(1, 'Email is required')
    .email('Invalid email format'),
  password: z.string()
    .min(8, 'Password must be at least 8 characters')
    .regex(
      /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/,
      'Password must contain at least one uppercase, one lowercase, and one number'
    ),
  firstName: z.string()
    .min(2, 'First name must be at least 2 characters')
    .max(100, 'First name must be less than 100 characters'),
  lastName: z.string()
    .min(2, 'Last name must be at least 2 characters')
    .max(100, 'Last name must be less than 100 characters'),
  companyName: z.string()
    .min(2, 'Company name must be at least 2 characters')
    .max(255, 'Company name must be less than 255 characters')
    .optional(),
  companyId: z.string().uuid('Invalid company ID format').optional(),
  invitationCode: z.string().optional()
});
/**
 * Refresh token schema
 */
export const RefreshTokenSchema = z.object({
  refreshToken: z.string().optional(),
  companyId: z.string().uuid('Invalid company ID format').optional()
});
/**
 * Switch company schema
 */
export const SwitchCompanySchema = z.object({
  companyId: z.string()
    .uuid('Invalid company ID format')
});
/**
 * Change password schema
 */
export const ChangePasswordSchema = z.object({
  currentPassword: z.string()
    .min(1, 'Current password is required'),
  newPassword: z.string()
    .min(8, 'Password must be at least 8 characters')
    .regex(
      /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/,
      'Password must contain at least one uppercase, one lowercase, and one number'
    )
}).refine(data => data.currentPassword !== data.newPassword, {
  message: 'New password must be different from current password',
  path: ['newPassword']
});
/**
 * Forgot password schema
 */
export const ForgotPasswordSchema = z.object({
  email: z.string()
    .min(1, 'Email is required')
    .email('Invalid email format')
});
/**
 * Reset password schema
 */
export const ResetPasswordSchema = z.object({
  token: z.string()
    .min(20, 'Invalid reset token'),
  newPassword: z.string()
    .min(8, 'Password must be at least 8 characters')
    .regex(
      /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/,
      'Password must contain at least one uppercase, one lowercase, and one number'
    )
});
// Export types
export type LoginData = z.infer<typeof LoginSchema>;
export type RegisterData = z.infer<typeof RegisterSchema>;
export type RefreshTokenData = z.infer<typeof RefreshTokenSchema>;
export type SwitchCompanyData = z.infer<typeof SwitchCompanySchema>;
export type ChangePasswordData = z.infer<typeof ChangePasswordSchema>;
export type ForgotPasswordData = z.infer<typeof ForgotPasswordSchema>;
export type ResetPasswordData = z.infer<typeof ResetPasswordSchema>;
