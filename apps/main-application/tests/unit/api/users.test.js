/**
 * Unit tests for users API route
 */

import { GET, POST } from '../../../app/api/users/route';
import { createMockRequest, expectSuccessResponse, expectErrorResponse } from "@ioc/testing/test-utils";
import { createTestUser, createTestOrganization } from "@ioc/testing/test-utils";

// Mock the database module
jest.mock('../../../lib/db/users', () => ({
  getUsers: jest.fn(),
  createUser: jest.fn(),
  getUserById: jest.fn()
}));

import * as usersDb from '../../../lib/db/users';

describe('Users API Route', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('GET /api/users', () => {
    it('should return all users', async () => {
      const mockUsers = [
      createTestUser({ id: '1', email: 'user1@test.com' }),
      createTestUser({ id: '2', email: 'user2@test.com' })];


      usersDb.getUsers.mockResolvedValue(mockUsers);

      const request = createMockRequest('/api/users');
      const response = await GET(request);

      const data = await expectSuccessResponse(response);
      expect(data).toHaveLength(2);
      expect(data[0].email).toBe('user1@test.com');
    });

    it('should handle database errors', async () => {
      usersDb.getUsers.mockRejectedValue(new Error('Database error'));

      const request = createMockRequest('/api/users');
      const response = await GET(request);

      await expectErrorResponse(response, 500);
    });
  });

  describe('POST /api/users', () => {
    it('should create a new user', async () => {
      const newUser = {
        email: 'newuser@test.com',
        role: 'user',
        organization_id: '123'
      };

      const createdUser = createTestUser(newUser);
      usersDb.createUser.mockResolvedValue(createdUser);

      const request = createMockRequest('/api/users', {
        method: 'POST',
        body: newUser
      });

      const response = await POST(request);
      const data = await expectSuccessResponse(response, 201);

      expect(data.email).toBe(newUser.email);
      expect(usersDb.createUser).toHaveBeenCalledWith(expect.objectContaining(newUser));
    });

    it('should validate required fields', async () => {
      const request = createMockRequest('/api/users', {
        method: 'POST',
        body: { role: 'user' } // missing email
      });

      const response = await POST(request);
      await expectErrorResponse(response, 400);
    });
  });
});