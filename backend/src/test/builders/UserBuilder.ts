/**
 * User Test Data Builder
 * Sprint 4 - Builder pattern para datos de usuario en tests
 */
import { v4 as uuidv4 } from 'uuid';
import bcrypt from 'bcrypt';
export interface TestUser {
  id: string;
  email: string;
  password?: string;
  password_hash?: string;
  name: string;
  company_id: string;
  is_active: boolean;
  email_verified: boolean;
  last_login?: Date;
  created_at: Date;
  updated_at: Date;
  deleted_at?: Date | null;
  role?: string;
  permissions?: string[];
  preferences?: Record<string, any>;
  settings?: Record<string, any>;
}
export class UserBuilder {
  private user: TestUser;
  constructor() {
    const now = new Date();
    this.user = {
      id: uuidv4(),
      email: `user_${Date.now()}@test.com`,
      password: 'Test123!@#',
      name: 'Test User',
      company_id: uuidv4(),
      is_active: true,
      email_verified: true,
      last_login: now,
      created_at: now,
      updated_at: now,
      deleted_at: null,
      role: 'user',
      permissions: [],
      preferences: {},
      settings: {}
    };
  }
  withId(id: string): UserBuilder {
    this.user.id = id;
    return this;
  }
  withEmail(email: string): UserBuilder {
    this.user.email = email;
    return this;
  }
  withPassword(password: string): UserBuilder {
    this.user.password = password;
    return this;
  }
  withHashedPassword(hash: string): UserBuilder {
    delete this.user.password;
    this.user.password_hash = hash;
    return this;
  }
  withName(name: string): UserBuilder {
    this.user.name = name;
    return this;
  }
  withCompanyId(companyId: string): UserBuilder {
    this.user.company_id = companyId;
    return this;
  }
  withRole(role: string): UserBuilder {
    this.user.role = role;
    return this;
  }
  withPermissions(...permissions: string[]): UserBuilder {
    this.user.permissions = permissions;
    return this;
  }
  withPreferences(preferences: Record<string, any>): UserBuilder {
    this.user.preferences = preferences;
    return this;
  }
  withSettings(settings: Record<string, any>): UserBuilder {
    this.user.settings = settings;
    return this;
  }
  asActive(): UserBuilder {
    this.user.is_active = true;
    return this;
  }
  asInactive(): UserBuilder {
    this.user.is_active = false;
    return this;
  }
  asVerified(): UserBuilder {
    this.user.email_verified = true;
    return this;
  }
  asUnverified(): UserBuilder {
    this.user.email_verified = false;
    return this;
  }
  asDeleted(): UserBuilder {
    this.user.deleted_at = new Date();
    return this;
  }
  withLastLogin(date: Date): UserBuilder {
    this.user.last_login = date;
    return this;
  }
  withoutLastLogin(): UserBuilder {
    delete this.user.last_login;
    return this;
  }
  withCreatedAt(date: Date): UserBuilder {
    this.user.created_at = date;
    return this;
  }
  withUpdatedAt(date: Date): UserBuilder {
    this.user.updated_at = date;
    return this;
  }
  async build(): Promise<TestUser> {
    // Hash password if provided
    if (this.user.password && !this.user.password_hash) {
      this.user.password_hash = await bcrypt.hash(this.user.password, 10);
      delete this.user.password;
    }
    return { ...this.user };
  }
  buildSync(): TestUser {
    // For synchronous building without password hashing
    if (this.user.password && !this.user.password_hash) {
      this.user.password_hash = bcrypt.hashSync(this.user.password, 10);
      delete this.user.password;
    }
    return { ...this.user };
  }
  // Preset builders for common test scenarios
  static admin(): UserBuilder {
    return new UserBuilder()
      .withRole('admin')
      .withPermissions('users:read', 'users:write', 'users:delete', 'companies:manage')
      .withEmail('admin@test.com')
      .withName('Admin User');
  }
  static regularUser(): UserBuilder {
    return new UserBuilder()
      .withRole('user')
      .withPermissions('profile:read', 'profile:write')
      .withEmail('user@test.com')
      .withName('Regular User');
  }
  static inactiveUser(): UserBuilder {
    return new UserBuilder()
      .asInactive()
      .asUnverified()
      .withEmail('inactive@test.com')
      .withName('Inactive User');
  }
  static deletedUser(): UserBuilder {
    return new UserBuilder()
      .asDeleted()
      .withEmail('deleted@test.com')
      .withName('Deleted User');
  }
  static newUser(): UserBuilder {
    return new UserBuilder()
      .asUnverified()
      .withoutLastLogin()
      .withEmail('newuser@test.com')
      .withName('New User');
  }
  // Bulk creation helpers
  static async createMany(count: number, customizer?: (builder: UserBuilder, index: number) => UserBuilder): Promise<TestUser[]> {
    const users: TestUser[] = [];
    for (let i = 0; i < count; i++) {
      let builder = new UserBuilder()
        .withEmail(`user_${i}@test.com`)
        .withName(`User ${i}`);
      if (customizer) {
        builder = customizer(builder, i);
      }
      users.push(await builder.build());
    }
    return users;
  }
  static createManySync(count: number, customizer?: (builder: UserBuilder, index: number) => UserBuilder): TestUser[] {
    const users: TestUser[] = [];
    for (let i = 0; i < count; i++) {
      let builder = new UserBuilder()
        .withEmail(`user_${i}@test.com`)
        .withName(`User ${i}`);
      if (customizer) {
        builder = customizer(builder, i);
      }
      users.push(builder.buildSync());
    }
    return users;
  }
}
