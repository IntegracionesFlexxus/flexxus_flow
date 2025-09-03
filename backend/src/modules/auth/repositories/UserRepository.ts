// User Repository Implementation - Sprint 1

import { injectable, inject } from 'inversify';
import { BaseRepository } from '../../../shared/database/repositories/BaseRepository';
import { IDatabaseConnection } from '../../../shared/database/interfaces/IDatabaseConnection';
import { IUserRepository } from '../interfaces/IUserRepository';
import { User } from '../types/auth.types';
import { TYPES } from '../../../container/types';

@injectable()
export class UserRepository extends BaseRepository<User> implements IUserRepository {
  constructor(
    @inject(TYPES.SharedConnection) db: IDatabaseConnection
  ) {
    super('users', db);
  }

  async findByEmail(email: string): Promise<User | null> {
    return await this.findOneByField('email', email.toLowerCase());
  }

  async updateLastLogin(id: string): Promise<void> {
    const query = `
      UPDATE ${this.tableName}
      SET last_login_at = NOW(), updated_at = NOW()
      WHERE id = $1 AND deleted_at IS NULL
    `;
    await this.db.query(query, [id]);
  }

  async verifyEmail(id: string): Promise<void> {
    const query = `
      UPDATE ${this.tableName}
      SET email_verified_at = NOW(), updated_at = NOW()
      WHERE id = $1 AND deleted_at IS NULL
    `;
    await this.db.query(query, [id]);
  }

  async exists(email: string): Promise<boolean> {
    const query = `
      SELECT EXISTS(
        SELECT 1 FROM ${this.tableName}
        WHERE email = $1 AND deleted_at IS NULL
      ) as exists
    `;
    const results = await this.db.query<{ exists: boolean }>(query, [email.toLowerCase()]);
    return results[0].exists;
  }

  // Override create to handle email normalization
  async create(data: Partial<User>): Promise<User> {
    if (data.email) {
      data.email = data.email.toLowerCase();
    }
    return super.create(data);
  }
}