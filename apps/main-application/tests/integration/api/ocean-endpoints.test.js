/**
 * API Endpoint Integration Tests for OCEAN Assessment
 */

import { createMocks } from 'node-mocks-http';
import { createClient } from '@supabase/supabase-js';
import * as assessmentHandlers from '../../../app/api/assessments/route';
import * as assessmentDetailHandlers from '../../../app/api/assessments/[id]/route';
import * as submitHandlers from '../../../app/api/assessments/[id]/submit/route';

jest.mock('@supabase/supabase-js');

describe('OCEAN Assessment API Endpoints', () => {
  let mockSupabase;

  beforeEach(() => {
    mockSupabase = {
      auth: {
        getUser: jest.fn(),
        admin: {
          createUser: jest.fn(),
          deleteUser: jest.fn()
        }
      },
      from: jest.fn(() => ({
        select: jest.fn().mockReturnThis(),
        insert: jest.fn().mockReturnThis(),
        update: jest.fn().mockReturnThis(),
        delete: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockReturnThis(),
        order: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis()
      }))
    };

    createClient.mockReturnValue(mockSupabase);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('GET /api/assessments', () => {
    test('should return user assessments with authentication', async () => {
      const mockAssessments = [
        {
          id: '1',
          type: 'ocean_basic',
          status: 'completed',
          created_at: new Date().toISOString(),
          scores: {
            openness: 75,
            conscientiousness: 80,
            extraversion: 65,
            agreeableness: 70,
            neuroticism: 40
          }
        }
      ];

      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: { id: 'user-123' } },
        error: null
      });

      mockSupabase.from().select().mockResolvedValue({
        data: mockAssessments,
        error: null
      });

      const { req, res } = createMocks({
        method: 'GET',
        headers: {
          authorization: 'Bearer valid-token'
        }
      });

      await assessmentHandlers.GET(req);

      expect(res._getStatusCode()).toBe(200);
      const responseData = JSON.parse(res._getData());
      expect(responseData).toEqual(mockAssessments);
    });

    test('should return 401 without authentication', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: null },
        error: new Error('Not authenticated')
      });

      const { req, res } = createMocks({
        method: 'GET'
      });

      await assessmentHandlers.GET(req);

      expect(res._getStatusCode()).toBe(401);
    });

    test('should handle query parameters for filtering', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: { id: 'user-123' } },
        error: null
      });

      const { req, res } = createMocks({
        method: 'GET',
        query: {
          type: 'ocean_360',
          status: 'in_progress',
          limit: '10'
        },
        headers: {
          authorization: 'Bearer valid-token'
        }
      });

      await assessmentHandlers.GET(req);

      expect(mockSupabase.from).toHaveBeenCalledWith('assessments');
      expect(mockSupabase.from().eq).toHaveBeenCalledWith('type', 'ocean_360');
      expect(mockSupabase.from().eq).toHaveBeenCalledWith('status', 'in_progress');
      expect(mockSupabase.from().limit).toHaveBeenCalledWith(10);
    });
  });

  describe('POST /api/assessments', () => {
    test('should create new assessment with valid data', async () => {
      const newAssessment = {
        type: 'ocean_basic',
        metadata: {
          purpose: 'self_evaluation',
          context: 'annual_review'
        }
      };

      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: { id: 'user-123' } },
        error: null
      });

      mockSupabase.from().insert().single().mockResolvedValue({
        data: { id: 'assessment-123', ...newAssessment, status: 'in_progress' },
        error: null
      });

      const { req, res } = createMocks({
        method: 'POST',
        headers: {
          authorization: 'Bearer valid-token',
          'content-type': 'application/json'
        },
        body: newAssessment
      });

      await assessmentHandlers.POST(req);

      expect(res._getStatusCode()).toBe(201);
      const responseData = JSON.parse(res._getData());
      expect(responseData.id).toBe('assessment-123');
      expect(responseData.status).toBe('in_progress');
    });

    test('should validate assessment type', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: { id: 'user-123' } },
        error: null
      });

      const { req, res } = createMocks({
        method: 'POST',
        headers: {
          authorization: 'Bearer valid-token',
          'content-type': 'application/json'
        },
        body: {
          type: 'invalid_type'
        }
      });

      await assessmentHandlers.POST(req);

      expect(res._getStatusCode()).toBe(400);
      const responseData = JSON.parse(res._getData());
      expect(responseData.error).toContain('Invalid assessment type');
    });
  });

  describe('PUT /api/assessments/[id]', () => {
    test('should update assessment responses', async () => {
      const assessmentId = 'assessment-123';
      const responses = [
        { nodeId: 1, value: 4 },
        { nodeId: 2, value: 3 },
        { nodeId: 3, value: 5 }
      ];

      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: { id: 'user-123' } },
        error: null
      });

      mockSupabase.from().update().eq().mockResolvedValue({
        data: { id: assessmentId, responses },
        error: null
      });

      const { req, res } = createMocks({
        method: 'PUT',
        headers: {
          authorization: 'Bearer valid-token',
          'content-type': 'application/json'
        },
        query: { id: assessmentId },
        body: { responses }
      });

      await assessmentDetailHandlers.PUT(req);

      expect(res._getStatusCode()).toBe(200);
      expect(mockSupabase.from().update).toHaveBeenCalledWith(
        expect.objectContaining({ responses })
      );
    });

    test('should enforce ownership before update', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: { id: 'user-123' } },
        error: null
      });

      mockSupabase.from().select().single().mockResolvedValue({
        data: { user_id: 'different-user' },
        error: null
      });

      const { req, res } = createMocks({
        method: 'PUT',
        headers: {
          authorization: 'Bearer valid-token'
        },
        query: { id: 'assessment-123' },
        body: { responses: [] }
      });

      await assessmentDetailHandlers.PUT(req);

      expect(res._getStatusCode()).toBe(403);
    });
  });

  describe('POST /api/assessments/[id]/submit', () => {
    test('should calculate OCEAN scores on submission', async () => {
      const assessmentId = 'assessment-123';
      const responses = generateCompleteResponses();

      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: { id: 'user-123' } },
        error: null
      });

      // Mock getting assessment with responses
      mockSupabase.from().select().single().mockResolvedValue({
        data: {
          id: assessmentId,
          user_id: 'user-123',
          status: 'in_progress',
          responses
        },
        error: null
      });

      // Mock score calculation and update
      mockSupabase.from().update().eq().mockResolvedValue({
        data: {
          id: assessmentId,
          status: 'completed',
          scores: {
            openness: 72,
            conscientiousness: 78,
            extraversion: 65,
            agreeableness: 70,
            neuroticism: 42
          }
        },
        error: null
      });

      const { req, res } = createMocks({
        method: 'POST',
        headers: {
          authorization: 'Bearer valid-token'
        },
        query: { id: assessmentId }
      });

      await submitHandlers.POST(req);

      expect(res._getStatusCode()).toBe(200);
      const responseData = JSON.parse(res._getData());
      expect(responseData.status).toBe('completed');
      expect(responseData.scores).toBeDefined();
      expect(responseData.scores.openness).toBeDefined();
    });

    test('should validate completeness before submission', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: { id: 'user-123' } },
        error: null
      });

      mockSupabase.from().select().single().mockResolvedValue({
        data: {
          id: 'assessment-123',
          user_id: 'user-123',
          status: 'in_progress',
          responses: [{ nodeId: 1, value: 3 }] // Incomplete
        },
        error: null
      });

      const { req, res } = createMocks({
        method: 'POST',
        headers: {
          authorization: 'Bearer valid-token'
        },
        query: { id: 'assessment-123' }
      });

      await submitHandlers.POST(req);

      expect(res._getStatusCode()).toBe(400);
      const responseData = JSON.parse(res._getData());
      expect(responseData.error).toContain('incomplete');
    });
  });

  describe('Rate Limiting and Performance', () => {
    test('should handle rate limiting headers', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: { id: 'user-123' } },
        error: null
      });

      const { req, res } = createMocks({
        method: 'GET',
        headers: {
          authorization: 'Bearer valid-token',
          'x-forwarded-for': '192.168.1.1'
        }
      });

      await assessmentHandlers.GET(req);

      expect(res._getHeaders()).toHaveProperty('x-ratelimit-limit');
      expect(res._getHeaders()).toHaveProperty('x-ratelimit-remaining');
    });

    test('should return 429 when rate limit exceeded', async () => {
      // Simulate multiple requests
      const promises = Array(101).fill(null).map(() => {
        const { req, res } = createMocks({
          method: 'GET',
          headers: {
            authorization: 'Bearer valid-token',
            'x-forwarded-for': '192.168.1.1'
          }
        });
        return assessmentHandlers.GET(req);
      });

      await Promise.all(promises);
      
      // The 101st request should be rate limited
      const { req, res } = createMocks({
        method: 'GET',
        headers: {
          authorization: 'Bearer valid-token',
          'x-forwarded-for': '192.168.1.1'
        }
      });

      await assessmentHandlers.GET(req);

      expect(res._getStatusCode()).toBe(429);
    });
  });

  describe('Error Handling', () => {
    test('should handle database errors gracefully', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: { id: 'user-123' } },
        error: null
      });

      mockSupabase.from().select().mockResolvedValue({
        data: null,
        error: new Error('Database connection failed')
      });

      const { req, res } = createMocks({
        method: 'GET',
        headers: {
          authorization: 'Bearer valid-token'
        }
      });

      await assessmentHandlers.GET(req);

      expect(res._getStatusCode()).toBe(500);
      const responseData = JSON.parse(res._getData());
      expect(responseData.error).toBe('Internal server error');
      expect(responseData.details).toBeUndefined(); // Don't expose internal errors
    });

    test('should validate request body structure', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: { id: 'user-123' } },
        error: null
      });

      const { req, res } = createMocks({
        method: 'POST',
        headers: {
          authorization: 'Bearer valid-token',
          'content-type': 'application/json'
        },
        body: 'invalid-json'
      });

      await assessmentHandlers.POST(req);

      expect(res._getStatusCode()).toBe(400);
      const responseData = JSON.parse(res._getData());
      expect(responseData.error).toContain('Invalid request body');
    });
  });
});

// Helper function to generate complete assessment responses
function generateCompleteResponses() {
  const responses = [];
  const dimensions = ['openness', 'conscientiousness', 'extraversion', 'agreeableness', 'neuroticism'];
  
  for (let i = 1; i <= 50; i++) {
    responses.push({
      nodeId: i,
      value: Math.floor(Math.random() * 5) + 1,
      timestamp: new Date().toISOString()
    });
  }
  
  return responses;
}