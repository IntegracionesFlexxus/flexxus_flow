/**
 * User Specifications
 * Sprint 4 - Especificaciones de negocio para usuarios
 */

import { BaseSpecification } from '@/core/specifications/ISpecification';

interface User {
  id: string;
  email: string;
  isActive?: boolean;
  emailVerified?: boolean;
  companyId?: string;
  lastLoginAt?: Date;
  createdAt?: Date;
}

/**
 * Active Users Specification
 */
export class ActiveUsersSpecification extends BaseSpecification<User> {
  isSatisfiedBy(candidate: User): boolean {
    return candidate.isActive === true;
  }
}

/**
 * Users By Company Specification
 */
export class UsersByCompanySpecification extends BaseSpecification<User> {
  constructor(private companyId: string) {
    super();
  }

  isSatisfiedBy(candidate: User): boolean {
    return candidate.companyId === this.companyId;
  }
}

/**
 * Verified Email Users Specification
 */
export class VerifiedEmailUsersSpecification extends BaseSpecification<User> {
  isSatisfiedBy(candidate: User): boolean {
    return candidate.emailVerified === true;
  }
}

/**
 * Recent Login Specification
 */
export class RecentLoginSpecification extends BaseSpecification<User> {
  constructor(private days: number = 30) {
    super();
  }

  isSatisfiedBy(candidate: User): boolean {
    if (!candidate.lastLoginAt) return false;
    const daysAgo = new Date();
    daysAgo.setDate(daysAgo.getDate() - this.days);
    return candidate.lastLoginAt >= daysAgo;
  }
}

/**
 * Users By Email Pattern Specification
 */
export class UsersByEmailPatternSpecification extends BaseSpecification<User> {
  constructor(private pattern: string) {
    super();
  }

  isSatisfiedBy(candidate: User): boolean {
    return candidate.email.includes(this.pattern);
  }
}

/**
 * Inactive Users Specification
 */
export class InactiveUsersSpecification extends BaseSpecification<User> {
  isSatisfiedBy(candidate: User): boolean {
    return candidate.isActive === false;
  }
}

/**
 * Active Company Users Specification
 */
export class ActiveCompanyUsersSpecification extends BaseSpecification<User> {
  constructor(private companyId: string) {
    super();
  }

  isSatisfiedBy(candidate: User): boolean {
    return candidate.companyId === this.companyId && candidate.isActive === true;
  }
}

/**
 * Verified Active Users Specification
 */
export class VerifiedActiveUsersSpecification extends BaseSpecification<User> {
  isSatisfiedBy(candidate: User): boolean {
    return candidate.isActive === true && candidate.emailVerified === true;
  }
}
