/**
 * Testing Framework Exports
 * Sprint 4 - Centralización de utilidades de testing
 */
// Test Builders
export { UserBuilder } from './builders/UserBuilder';
export { CompanyBuilder } from './builders/CompanyBuilder';
export { AuthBuilder } from './builders/AuthBuilder';
// Test Utilities
export { TestRequest } from './utils/TestRequest';
export { MockFactory } from './utils/MockFactory';
// Test Setup
export * from './setup/jest.setup';
export * from './setup/database.setup';
export * from './setup/e2e.setup';
// Type exports
export type { TestUser } from './builders/UserBuilder';
export type { TestCompany } from './builders/CompanyBuilder';
export type { TestToken, TestSession } from './builders/AuthBuilder';
export type { TestRequestOptions } from './utils/TestRequest';
export type { E2ETestContext } from './setup/e2e.setup';
