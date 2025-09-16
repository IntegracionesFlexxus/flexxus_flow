/**
 * RoleRepository Tests - Verify BaseRepository integration
 */

import 'reflect-metadata';
import { RoleRepository } from '@/modules/auth/repositories/RoleRepository';
import { IDatabaseConnection } from '@/shared/database/interfaces/IDatabaseConnection';
import { Logger } from 'winston';

// Mock database connection
const mockDb: IDatabaseConnection = {
  query: jest.fn(),
  connect: jest.fn().mockResolvedValue({
    query: jest.fn(),
    release: jest.fn()
  })
};

// Mock logger
const mockLogger = {
  debug: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn()
} as unknown as Logger;

describe('RoleRepository', () => {
  let roleRepository: RoleRepository;

  beforeEach(() => {
    jest.clearAllMocks();
    roleRepository = new RoleRepository(mockDb, mockLogger);
  });

  describe('BaseRepository Integration', () => {
    it('should initialize with BaseRepository features', () => {
      expect(roleRepository).toBeDefined();
      // Test that inherited methods exist
      expect(roleRepository.create).toBeDefined();
      expect(roleRepository.findById).toBeDefined();
      expect(roleRepository.update).toBeDefined();
      expect(roleRepository.delete).toBeDefined();
      expect(roleRepository.findAll).toBeDefined();
      expect(roleRepository.findOne).toBeDefined();
    });

    it('should use BaseRepository create method', async () => {
      const roleData = {
        name: 'Test Role',
        description: 'Test Description',
        companyId: 'company-123',
        isSystemRole: false,
        status: 'active'
      };

      const expectedDbData = {
        name: 'Test Role',
        description: 'Test Description',
        company_id: 'company-123',
        is_system_role: false,
        status: 'active'
      };

      const mockResult = {
        rows: [{ id: 'role-123', ...expectedDbData }]
      };

      (mockDb.query as jest.Mock).mockResolvedValue(mockResult);

      const result = await roleRepository.create(roleData);

      expect(mockDb.query).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO roles'),
        expect.arrayContaining([
          'Test Role',
          'Test Description',
          'company-123',
          false,
          'active'
        ])
      );
      expect(result).toEqual(mockResult.rows[0]);
    });

    it('should use custom findById with user count', async () => {
      const roleId = 'role-123';
      const mockResult = [
        {
          id: roleId,
          name: 'Admin',
          user_count: 5
        }
      ];

      (mockDb.query as jest.Mock).mockResolvedValue(mockResult);

      const result = await roleRepository.findById(roleId);

      expect(mockDb.query).toHaveBeenCalledWith(
        expect.stringContaining('COUNT(DISTINCT ur.user_id) as user_count'),
        [roleId]
      );
      expect(result).toEqual(mockResult[0]);
    });

    it('should cache permission queries', async () => {
      const roleId = 'role-123';
      const mockPermissions = [
        { id: 'perm-1', resource: 'users', action: 'read' },
        { id: 'perm-2', resource: 'users', action: 'write' }
      ];

      (mockDb.query as jest.Mock).mockResolvedValue(mockPermissions);

      // First call - should hit database
      const result1 = await roleRepository.getRolePermissions(roleId);
      expect(mockDb.query).toHaveBeenCalledTimes(1);
      expect(result1).toEqual(mockPermissions);

      // Second call - should use cache
      const result2 = await roleRepository.getRolePermissions(roleId);
      expect(mockDb.query).toHaveBeenCalledTimes(1); // Still 1, not 2
      expect(result2).toEqual(mockPermissions);
    });

    it('should handle transaction in assignPermissions', async () => {
      const roleId = 'role-123';
      const permissionIds = ['perm-1', 'perm-2'];

      const mockClient = {
        query: jest.fn(),
        release: jest.fn()
      };

      (mockDb.connect as jest.Mock).mockResolvedValue(mockClient);

      await roleRepository.assignPermissions(roleId, permissionIds);

      expect(mockClient.query).toHaveBeenCalledWith('BEGIN');
      expect(mockClient.query).toHaveBeenCalledWith(
        'DELETE FROM role_permissions WHERE role_id = $1',
        [roleId]
      );
      expect(mockClient.query).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO role_permissions'),
        [roleId, ...permissionIds]
      );
      expect(mockClient.query).toHaveBeenCalledWith('COMMIT');
      expect(mockClient.release).toHaveBeenCalled();
    });

    it('should rollback transaction on error', async () => {
      const roleId = 'role-123';
      const permissionIds = ['perm-1', 'perm-2'];

      const mockClient = {
        query: jest.fn().mockImplementation((sql: string) => {
          if (sql.includes('INSERT')) {
            throw new Error('Database error');
          }
        }),
        release: jest.fn()
      };

      (mockDb.connect as jest.Mock).mockResolvedValue(mockClient);

      await expect(
        roleRepository.assignPermissions(roleId, permissionIds)
      ).rejects.toThrow('Database error');

      expect(mockClient.query).toHaveBeenCalledWith('ROLLBACK');
      expect(mockClient.release).toHaveBeenCalled();
    });

    it('should validate parameters in executeQuery', async () => {
      // Test that SQL injection attempts are caught
      const maliciousId = "'; DROP TABLE roles; --";
      
      await expect(
        roleRepository.findById(maliciousId)
      ).rejects.toThrow();

      expect(mockLogger.error).toHaveBeenCalledWith(
        expect.stringContaining('Invalid parameter'),
        expect.any(Object)
      );
    });
  });
});