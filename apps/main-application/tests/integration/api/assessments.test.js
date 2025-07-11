/**
 * Integration tests for assessments API
 */

import { GET, POST } from '../../../app/api/assessments/route';
import { GET as getAssessmentById } from '../../../app/api/assessments/[id]/route';
import { POST as submitAssessment } from '../../../app/api/assessments/[id]/submit/route';
import {
  createMockRequest,
  createAuthenticatedRequest,
  createTestDatabase,
  createTestAssessment,
  createTestUser,
  seedTestData } from
"@ioc/testing/test-utils";

describe('Assessments API Integration', () => {
  let db;
  let testUser;
  let testOrg;

  beforeAll(async () => {
    db = createTestDatabase();
    const seededData = await seedTestData(db.client);
    testOrg = seededData.organization;
    testUser = seededData.users[0];
  });

  afterAll(async () => {
    await db.cleanup();
  });

  describe('GET /api/assessments', () => {
    it('should return assessments for authenticated user', async () => {
      // Create test assessments
      const assessment1 = await db.client.
      from('assessments').
      insert(createTestAssessment({
        organization_id: testOrg.id,
        created_by: testUser.id
      })).
      select().
      single();

      const assessment2 = await db.client.
      from('assessments').
      insert(createTestAssessment({
        organization_id: testOrg.id,
        created_by: testUser.id
      })).
      select().
      single();

      const request = createAuthenticatedRequest('/api/assessments', 'test-token');
      const response = await GET(request);

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.data).toHaveLength(2);
      expect(data.data[0].id).toBe(assessment1.data.id);
    });

    it('should filter assessments by query parameters', async () => {
      const request = createAuthenticatedRequest('/api/assessments', 'test-token', {
        searchParams: { type: 'skills', status: 'published' }
      });

      const response = await GET(request);
      expect(response.status).toBe(200);

      const data = await response.json();
      data.data.forEach((assessment) => {
        expect(assessment.type).toBe('skills');
        expect(assessment.status).toBe('published');
      });
    });
  });

  describe('POST /api/assessments', () => {
    it('should create a new assessment', async () => {
      const newAssessment = {
        title: 'Integration Test Assessment',
        description: 'Test description',
        type: 'performance',
        questions: [
        {
          text: 'Question 1',
          type: 'single_choice',
          options: ['A', 'B', 'C'],
          required: true
        }]

      };

      const request = createAuthenticatedRequest('/api/assessments', 'test-token', {
        method: 'POST',
        body: newAssessment
      });

      const response = await POST(request);
      expect(response.status).toBe(201);

      const data = await response.json();
      expect(data.title).toBe(newAssessment.title);
      expect(data.questions).toHaveLength(1);

      // Verify in database
      const dbResult = await db.client.
      from('assessments').
      select().
      eq('id', data.id).
      single();

      expect(dbResult.data).toBeTruthy();
      expect(dbResult.data.title).toBe(newAssessment.title);
    });
  });

  describe('Assessment submission flow', () => {
    it('should complete full assessment workflow', async () => {
      // 1. Create assessment
      const assessment = await db.client.
      from('assessments').
      insert(createTestAssessment({
        organization_id: testOrg.id,
        created_by: testUser.id,
        status: 'published'
      })).
      select().
      single();

      // 2. Get assessment by ID
      const getRequest = createAuthenticatedRequest(
        `/api/assessments/${assessment.data.id}`,
        'test-token'
      );
      const getResponse = await getAssessmentById(getRequest, { params: { id: assessment.data.id } });
      expect(getResponse.status).toBe(200);

      // 3. Submit assessment response
      const answers = {
        q1: 'Option A',
        q2: 'Option B',
        q3: 'Option C'
      };

      const submitRequest = createAuthenticatedRequest(
        `/api/assessments/${assessment.data.id}/submit`,
        'test-token',
        { method: 'POST', body: { answers } }
      );

      const submitResponse = await submitAssessment(submitRequest, { params: { id: assessment.data.id } });
      expect(submitResponse.status).toBe(201);

      const submitData = await submitResponse.json();
      expect(submitData.assessment_id).toBe(assessment.data.id);
      expect(submitData.score).toBeGreaterThan(0);

      // 4. Verify response in database
      const dbResponse = await db.client.
      from('assessment_responses').
      select().
      eq('id', submitData.id).
      single();

      expect(dbResponse.data).toBeTruthy();
      expect(dbResponse.data.answers).toEqual(answers);
    });
  });
});