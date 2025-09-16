// Auth Validators - Sprint 1 con validación robusta
// Validación de requests usando express-validator o Joi
import { body, ValidationChain } from 'express-validator';
/**
 * Validación para login
 * Clean Code: Validaciones claras y descriptivas
 */
export const loginValidation: ValidationChain[] = [
  body('email')
    .notEmpty().withMessage('Email is required')
    .isEmail().withMessage('Invalid email format')
    .normalizeEmail(),
  body('password')
    .notEmpty().withMessage('Password is required')
    .isLength({ min: 1 }).withMessage('Password cannot be empty'),
  body('company_id')
    .optional()
    .isUUID().withMessage('Invalid company ID format')
];
/**
 * Validación para registro
 * Seguridad: Validación exhaustiva de datos de entrada
 */
export const registerValidation: ValidationChain[] = [
  body('email')
    .notEmpty().withMessage('Email is required')
    .isEmail().withMessage('Invalid email format')
    .normalizeEmail(),
  body('password')
    .notEmpty().withMessage('Password is required')
    .isLength({ min: 8 }).withMessage('Password must be at least 8 characters')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
    .withMessage('Password must contain at least one uppercase, one lowercase, and one number'),
  body('first_name')
    .notEmpty().withMessage('First name is required')
    .isLength({ min: 2, max: 100 }).withMessage('First name must be between 2 and 100 characters')
    .trim(),
  body('last_name')
    .notEmpty().withMessage('Last name is required')
    .isLength({ min: 2, max: 100 }).withMessage('Last name must be between 2 and 100 characters')
    .trim(),
  body('company_name')
    .optional()
    .isLength({ min: 2, max: 255 }).withMessage('Company name must be between 2 and 255 characters')
    .trim(),
  body('company_id')
    .optional()
    .isUUID().withMessage('Invalid company ID format'),
  body('invitation_code')
    .optional()
    .isAlphanumeric().withMessage('Invalid invitation code format')
];
/**
 * Validación para cambio de contraseña
 */
export const changePasswordValidation: ValidationChain[] = [
  body('currentPassword')
    .notEmpty().withMessage('Current password is required'),
  body('newPassword')
    .notEmpty().withMessage('New password is required')
    .isLength({ min: 8 }).withMessage('Password must be at least 8 characters')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
    .withMessage('Password must contain at least one uppercase, one lowercase, and one number')
    .custom((value, { req }) => value !== req.body.currentPassword)
    .withMessage('New password must be different from current password')
];
/**
 * Validación para solicitud de recuperación de contraseña
 */
export const forgotPasswordValidation: ValidationChain[] = [
  body('email')
    .notEmpty().withMessage('Email is required')
    .isEmail().withMessage('Invalid email format')
    .normalizeEmail()
];
/**
 * Validación para reseteo de contraseña
 */
export const resetPasswordValidation: ValidationChain[] = [
  body('token')
    .notEmpty().withMessage('Reset token is required')
    .isLength({ min: 20 }).withMessage('Invalid reset token'),
  body('newPassword')
    .notEmpty().withMessage('New password is required')
    .isLength({ min: 8 }).withMessage('Password must be at least 8 characters')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
    .withMessage('Password must contain at least one uppercase, one lowercase, and one number')
];
/**
 * Validación para cambio de empresa
 */
export const switchCompanyValidation: ValidationChain[] = [
  body('companyId')
    .notEmpty().withMessage('Company ID is required')
    .isUUID().withMessage('Invalid company ID format')
];
