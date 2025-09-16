// User Service Interface - Sprint 1

import { User } from '../types/auth.types';

export interface IUserService {
  getUserById(id: string): Promise<User | null>;
  getUserByEmail(email: string): Promise<User | null>;
  createUser(data: Partial<User>): Promise<User>;
  updateUser(id: string, data: Partial<User>): Promise<User | null>;
  deleteUser(id: string): Promise<boolean>;
  getAllUsers(limit?: number, offset?: number): Promise<User[]>;
  verifyUserEmail(id: string): Promise<void>;
  updateUserLastLogin(id: string): Promise<void>;
  changePassword(userId: string, currentPassword: string, newPassword: string): Promise<void>;
  validatePassword(password: string, hash: string): Promise<boolean>;
  hashPassword(password: string): Promise<string>;
}