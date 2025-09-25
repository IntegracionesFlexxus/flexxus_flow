/**
 * Product Quote Management - Permissions Configuration
 * Sprint 19 - Complete permission definitions and role mappings
 */

export const PRODUCT_QUOTE_PERMISSIONS = {
  // Productos
  PRODUCT_VIEW: 'product_quote.products.view',
  PRODUCT_CREATE: 'product_quote.products.create',
  PRODUCT_UPDATE: 'product_quote.products.update',
  PRODUCT_DELETE: 'product_quote.products.delete',
  PRODUCT_IMPORT: 'product_quote.products.import',
  PRODUCT_EXPORT: 'product_quote.products.export',

  // Categorías
  CATEGORY_VIEW: 'product_quote.categories.view',
  CATEGORY_MANAGE: 'product_quote.categories.manage',

  // Precios
  PRICING_VIEW: 'product_quote.pricing.view',
  PRICING_RULES_CREATE: 'product_quote.pricing.rules.create',
  PRICING_RULES_UPDATE: 'product_quote.pricing.rules.update',
  PRICING_RULES_DELETE: 'product_quote.pricing.rules.delete',
  PRICING_OVERRIDE: 'product_quote.pricing.override',

  // Cotizaciones
  QUOTE_VIEW: 'product_quote.quotes.view',
  QUOTE_CREATE: 'product_quote.quotes.create',
  QUOTE_UPDATE: 'product_quote.quotes.update',
  QUOTE_DELETE: 'product_quote.quotes.delete',
  QUOTE_APPROVE: 'product_quote.quotes.approve',
  QUOTE_EXPORT: 'product_quote.quotes.export',

  // Documentos
  DOCUMENT_VIEW: 'product_quote.documents.view',
  DOCUMENT_GENERATE: 'product_quote.documents.generate',
  TEMPLATE_MANAGE: 'product_quote.documents.templates.manage',

  // Aprobaciones
  APPROVAL_VIEW: 'product_quote.approvals.view',
  APPROVAL_APPROVE: 'product_quote.approvals.approve',
  APPROVAL_DELEGATE: 'product_quote.approvals.delegate',
  WORKFLOW_MANAGE: 'product_quote.approvals.workflows.manage',

  // Revenue
  REVENUE_VIEW: 'product_quote.revenue.view',
  REVENUE_MANAGE: 'product_quote.revenue.manage'
} as const;

export type ProductQuotePermission = typeof PRODUCT_QUOTE_PERMISSIONS[keyof typeof PRODUCT_QUOTE_PERMISSIONS];

export const ROLE_PERMISSIONS: Record<string, ProductQuotePermission[]> = {
  admin: Object.values(PRODUCT_QUOTE_PERMISSIONS),

  sales_manager: [
    PRODUCT_QUOTE_PERMISSIONS.PRODUCT_VIEW,
    PRODUCT_QUOTE_PERMISSIONS.PRODUCT_CREATE,
    PRODUCT_QUOTE_PERMISSIONS.PRODUCT_UPDATE,
    PRODUCT_QUOTE_PERMISSIONS.CATEGORY_VIEW,
    PRODUCT_QUOTE_PERMISSIONS.PRICING_VIEW,
    PRODUCT_QUOTE_PERMISSIONS.PRICING_RULES_CREATE,
    PRODUCT_QUOTE_PERMISSIONS.PRICING_RULES_UPDATE,
    PRODUCT_QUOTE_PERMISSIONS.PRICING_OVERRIDE,
    PRODUCT_QUOTE_PERMISSIONS.QUOTE_VIEW,
    PRODUCT_QUOTE_PERMISSIONS.QUOTE_CREATE,
    PRODUCT_QUOTE_PERMISSIONS.QUOTE_UPDATE,
    PRODUCT_QUOTE_PERMISSIONS.QUOTE_DELETE,
    PRODUCT_QUOTE_PERMISSIONS.QUOTE_APPROVE,
    PRODUCT_QUOTE_PERMISSIONS.QUOTE_EXPORT,
    PRODUCT_QUOTE_PERMISSIONS.DOCUMENT_VIEW,
    PRODUCT_QUOTE_PERMISSIONS.DOCUMENT_GENERATE,
    PRODUCT_QUOTE_PERMISSIONS.APPROVAL_VIEW,
    PRODUCT_QUOTE_PERMISSIONS.APPROVAL_APPROVE,
    PRODUCT_QUOTE_PERMISSIONS.APPROVAL_DELEGATE,
    PRODUCT_QUOTE_PERMISSIONS.REVENUE_VIEW
  ],

  sales_rep: [
    PRODUCT_QUOTE_PERMISSIONS.PRODUCT_VIEW,
    PRODUCT_QUOTE_PERMISSIONS.CATEGORY_VIEW,
    PRODUCT_QUOTE_PERMISSIONS.PRICING_VIEW,
    PRODUCT_QUOTE_PERMISSIONS.QUOTE_VIEW,
    PRODUCT_QUOTE_PERMISSIONS.QUOTE_CREATE,
    PRODUCT_QUOTE_PERMISSIONS.QUOTE_UPDATE,
    PRODUCT_QUOTE_PERMISSIONS.DOCUMENT_VIEW,
    PRODUCT_QUOTE_PERMISSIONS.DOCUMENT_GENERATE,
    PRODUCT_QUOTE_PERMISSIONS.APPROVAL_VIEW
  ],

  viewer: [
    PRODUCT_QUOTE_PERMISSIONS.PRODUCT_VIEW,
    PRODUCT_QUOTE_PERMISSIONS.CATEGORY_VIEW,
    PRODUCT_QUOTE_PERMISSIONS.PRICING_VIEW,
    PRODUCT_QUOTE_PERMISSIONS.QUOTE_VIEW,
    PRODUCT_QUOTE_PERMISSIONS.DOCUMENT_VIEW,
    PRODUCT_QUOTE_PERMISSIONS.APPROVAL_VIEW,
    PRODUCT_QUOTE_PERMISSIONS.REVENUE_VIEW
  ]
};

/**
 * Permission Groups for UI organization
 */
export const PERMISSION_GROUPS = {
  'Product Management': [
    PRODUCT_QUOTE_PERMISSIONS.PRODUCT_VIEW,
    PRODUCT_QUOTE_PERMISSIONS.PRODUCT_CREATE,
    PRODUCT_QUOTE_PERMISSIONS.PRODUCT_UPDATE,
    PRODUCT_QUOTE_PERMISSIONS.PRODUCT_DELETE,
    PRODUCT_QUOTE_PERMISSIONS.PRODUCT_IMPORT,
    PRODUCT_QUOTE_PERMISSIONS.PRODUCT_EXPORT,
    PRODUCT_QUOTE_PERMISSIONS.CATEGORY_VIEW,
    PRODUCT_QUOTE_PERMISSIONS.CATEGORY_MANAGE
  ],
  'Pricing Management': [
    PRODUCT_QUOTE_PERMISSIONS.PRICING_VIEW,
    PRODUCT_QUOTE_PERMISSIONS.PRICING_RULES_CREATE,
    PRODUCT_QUOTE_PERMISSIONS.PRICING_RULES_UPDATE,
    PRODUCT_QUOTE_PERMISSIONS.PRICING_RULES_DELETE,
    PRODUCT_QUOTE_PERMISSIONS.PRICING_OVERRIDE
  ],
  'Quote Management': [
    PRODUCT_QUOTE_PERMISSIONS.QUOTE_VIEW,
    PRODUCT_QUOTE_PERMISSIONS.QUOTE_CREATE,
    PRODUCT_QUOTE_PERMISSIONS.QUOTE_UPDATE,
    PRODUCT_QUOTE_PERMISSIONS.QUOTE_DELETE,
    PRODUCT_QUOTE_PERMISSIONS.QUOTE_APPROVE,
    PRODUCT_QUOTE_PERMISSIONS.QUOTE_EXPORT
  ],
  'Document Management': [
    PRODUCT_QUOTE_PERMISSIONS.DOCUMENT_VIEW,
    PRODUCT_QUOTE_PERMISSIONS.DOCUMENT_GENERATE,
    PRODUCT_QUOTE_PERMISSIONS.TEMPLATE_MANAGE
  ],
  'Approval Management': [
    PRODUCT_QUOTE_PERMISSIONS.APPROVAL_VIEW,
    PRODUCT_QUOTE_PERMISSIONS.APPROVAL_APPROVE,
    PRODUCT_QUOTE_PERMISSIONS.APPROVAL_DELEGATE,
    PRODUCT_QUOTE_PERMISSIONS.WORKFLOW_MANAGE
  ],
  'Revenue Management': [
    PRODUCT_QUOTE_PERMISSIONS.REVENUE_VIEW,
    PRODUCT_QUOTE_PERMISSIONS.REVENUE_MANAGE
  ]
};

/**
 * Helper function to check if a user has specific permission
 */
export const hasPermission = (
  userPermissions: string[],
  requiredPermission: ProductQuotePermission
): boolean => {
  return userPermissions.includes(requiredPermission);
};

/**
 * Helper function to check if a user has any of the required permissions
 */
export const hasAnyPermission = (
  userPermissions: string[],
  requiredPermissions: ProductQuotePermission[]
): boolean => {
  return requiredPermissions.some(permission =>
    userPermissions.includes(permission)
  );
};

/**
 * Helper function to check if a user has all of the required permissions
 */
export const hasAllPermissions = (
  userPermissions: string[],
  requiredPermissions: ProductQuotePermission[]
): boolean => {
  return requiredPermissions.every(permission =>
    userPermissions.includes(permission)
  );
};

/**
 * Get permissions for a specific role
 */
export const getPermissionsForRole = (role: string): ProductQuotePermission[] => {
  return ROLE_PERMISSIONS[role] || [];
};

/**
 * Check if a role can perform an action
 */
export const canRolePerform = (
  role: string,
  permission: ProductQuotePermission
): boolean => {
  const rolePermissions = getPermissionsForRole(role);
  return rolePermissions.includes(permission);
};