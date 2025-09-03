// User Service Implementation - Sprint 1
// Implementación completa con conexión a base de datos

import { injectable, inject } from 'inversify';
import bcrypt from 'bcryptjs';
import { IUserService } from '../interfaces/IUserService';
import { IUserRepository } from '../interfaces/IUserRepository';
import { User } from '../types/auth.types';
import { TYPES } from '../../../container/types';
import { environment } from '../../../config/environment';
import winston from 'winston';

@injectable()
export class UserService implements IUserService {
  constructor(
    @inject(TYPES.UserRepository) private userRepository: IUserRepository,
    @inject(TYPES.Logger) private logger: winston.Logger
  ) {}

  async getUserById(id: string): Promise<User | null> {
    try {
      return await this.userRepository.findById(id);
    } catch (error) {
      this.logger.error('Error getting user by id:', error);
      throw error;
    }
  }

  async getUserByEmail(email: string): Promise<User | null> {
    try {
      return await this.userRepository.findByEmail(email);
    } catch (error) {
      this.logger.error('Error getting user by email:', error);
      throw error;
    }
  }

  async createUser(data: Partial<User>): Promise<User> {
    try {
      // Check if user already exists
      if (data.email) {
        const exists = await this.userRepository.exists(data.email);
        if (exists) {
          throw new Error('User with this email already exists');
        }
      }

      // Hash password if provided
      if ((data as any).password) {
        data.password_hash = await this.hashPassword((data as any).password);
        delete (data as any).password;
      }

      // Set default values
      data.status = data.status || 'active';
      data.language = data.language || 'es';
      data.timezone = data.timezone || 'America/Argentina/Buenos_Aires';

      return await this.userRepository.create(data);
    } catch (error) {
      this.logger.error('Error creating user:', error);
      throw error;
    }
  }

  async updateUser(id: string, data: Partial<User>): Promise<User | null> {
    try {
      // Remove fields that shouldn't be updated directly
      delete data.id;
      delete data.password_hash;
      delete (data as any).password;

      return await this.userRepository.update(id, data);
    } catch (error) {
      this.logger.error('Error updating user:', error);
      throw error;
    }
  }

  async deleteUser(id: string): Promise<boolean> {
    try {
      return await this.userRepository.delete(id);
    } catch (error) {
      this.logger.error('Error deleting user:', error);
      throw error;
    }
  }

  async getAllUsers(limit?: number, offset?: number): Promise<User[]> {
    try {
      return await this.userRepository.findAll(limit, offset);
    } catch (error) {
      this.logger.error('Error getting all users:', error);
      throw error;
    }
  }

  async verifyUserEmail(id: string): Promise<void> {
    try {
      await this.userRepository.verifyEmail(id);
    } catch (error) {
      this.logger.error('Error verifying user email:', error);
      throw error;
    }
  }

  async updateUserLastLogin(id: string): Promise<void> {
    try {
      await this.userRepository.updateLastLogin(id);
    } catch (error) {
      this.logger.error('Error updating last login:', error);
      throw error;
    }
  }

  async changePassword(
    userId: string, 
    currentPassword: string, 
    newPassword: string
  ): Promise<void> {
    try {
      const user = await this.userRepository.findById(userId);
      if (!user) {
        throw new Error('User not found');
      }

      // Verify current password
      const isValid = await this.validatePassword(currentPassword, user.password_hash);
      if (!isValid) {
        throw new Error('Invalid current password');
      }

      // Hash new password
      const newPasswordHash = await this.hashPassword(newPassword);

      // Update password
      await this.userRepository.update(userId, {
        password_hash: newPasswordHash,
        password_changed_at: new Date()
      });

      this.logger.info(`Password changed for user ${userId}`);
    } catch (error) {
      this.logger.error('Error changing password:', error);
      throw error;
    }
  }

  async validatePassword(password: string, hash: string): Promise<boolean> {
    try {
      return await bcrypt.compare(password, hash);
    } catch (error) {
      this.logger.error('Error validating password:', error);
      return false;
    }
  }

  async hashPassword(password: string): Promise<string> {
    try {
      return await bcrypt.hash(password, environment.security.bcryptRounds);
    } catch (error) {
      this.logger.error('Error hashing password:', error);
      throw error;
    }
  }
}