// User Repository Interface - Sprint 1

import { User } from '../types/auth.types';

export interface IUserRepository {
  findById(id: string): Promise<User | null>;
  findByEmail(email: string): Promise<User | null>;
  create(data: Partial<User>): Promise<User>;
  update(id: string, data: Partial<User>): Promise<User | null>;
  delete(id: string): Promise<boolean>;
  findAll(limit?: number, offset?: number): Promise<User[]>;
  updateLastLogin(id: string): Promise<void>;
  verifyEmail(id: string): Promise<void>;
  exists(email: string): Promise<boolean>;
}