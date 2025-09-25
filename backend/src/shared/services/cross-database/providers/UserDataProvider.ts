/**
 * User Data Provider
 * Provides user data from the shared database for cross-database enrichment
 */

import { injectable, inject } from 'inversify';
import { TYPES } from '@/container/types';
import { UserRepository } from '@/modules/auth/repositories/UserRepository';
import { UserBasicInfo } from '@/shared/types/cross-database.types';
import { Logger } from 'winston';

/**
 * Provider for fetching user data from the shared database
 */
@injectable()
export class UserDataProvider {
  constructor(
    @inject(TYPES.UserRepository) private userRepository: UserRepository,
    @inject(TYPES.Logger) private logger: Logger
  ) {}

  /**
   * Fetch users by IDs from shared database
   * @param ids Array of user IDs to fetch
   * @returns Array of users with basic information
   */
  async fetchUsersByIds(ids: number[]): Promise<UserBasicInfo[]> {
    if (ids.length === 0) return [];

    try {
      // Use the batch method we added to UserRepository
      const users = await this.userRepository.findBasicInfoByIds(ids);

      // Transform to UserBasicInfo if needed
      return users.map(user => ({
        id: user.id,
        email: user.email,
        name: user.name || `${user.firstName} ${user.lastName}`.trim() || user.email,
        firstName: user.firstName || user.first_name,
        lastName: user.lastName || user.last_name,
        avatar: user.avatar,
        status: user.status
      }));
    } catch (error) {
      this.logger.error('Error fetching users by IDs', {
        error,
        ids,
        count: ids.length
      });
      return [];
    }
  }

  /**
   * Fetch all active user IDs for cache preloading
   * @param limit Maximum number of user IDs to return
   * @returns Array of active user IDs
   */
  async fetchActiveUserIds(limit: number = 1000): Promise<number[]> {
    try {
      return await this.userRepository.getActiveUserIds(limit);
    } catch (error) {
      this.logger.error('Error fetching active user IDs', { error, limit });
      return [];
    }
  }

  /**
   * Fetch a single user by ID
   * @param id User ID to fetch
   * @returns User basic info or null if not found
   */
  async fetchUserById(id: number): Promise<UserBasicInfo | null> {
    try {
      const users = await this.fetchUsersByIds([id]);
      return users[0] || null;
    } catch (error) {
      this.logger.error('Error fetching user by ID', { error, id });
      return null;
    }
  }

  /**
   * Check if user exists
   * @param id User ID to check
   * @returns True if user exists
   */
  async userExists(id: number): Promise<boolean> {
    try {
      const user = await this.fetchUserById(id);
      return user !== null;
    } catch (error) {
      this.logger.error('Error checking if user exists', { error, id });
      return false;
    }
  }
}