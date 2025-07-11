/**
 * Database Integration Tests for OCEAN Assessment Schema
 */

import { createClient } from '@supabase/supabase-js';
import { oceanMappings } from "@ioc/shared/data-access/src/assessment/ocean-mappings";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

describe('OCEAN Database Schema Integration', () => {
  let supabase;

  beforeAll(() => {
    supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { persistSession: false }
    });
  });

  afterAll(async () => {
    await supabase.auth.signOut();
  });

  describe('Schema Migration Verification', () => {
    test('should have all required OCEAN assessment tables', async () => {
      const tables = [
      'assessments',
      'assessment_responses',
      'assessment_nodes',
      'assessment_ocean_mappings',
      'assessment_scores',
      'assessment_raters'];


      for (const table of tables) {
        const { data, error } = await supabase.
        from(table).
        select('*').
        limit(1);

        expect(error).toBeNull();
        expect(data).toBeDefined();
      }
    });

    test('should have correct column types for OCEAN scores', async () => {
      const { data, error } = await supabase.
      from('assessment_scores').
      select('*').
      limit(1);

      if (data && data.length > 0) {
        const score = data[0];
        expect(typeof score.openness).toBe('number');
        expect(typeof score.conscientiousness).toBe('number');
        expect(typeof score.extraversion).toBe('number');
        expect(typeof score.agreeableness).toBe('number');
        expect(typeof score.neuroticism).toBe('number');
      }
    });

    test('should have proper indexes on frequently queried columns', async () => {
      const { data, error } = await supabase.
      rpc('get_index_info', { table_name: 'assessment_scores' });

      expect(error).toBeNull();
      const indexNames = data.map((idx) => idx.index_name);

      expect(indexNames).toContain('idx_assessment_scores_user_id');
      expect(indexNames).toContain('idx_assessment_scores_assessment_id');
      expect(indexNames).toContain('idx_assessment_scores_created_at');
    });
  });

  describe('Node Hierarchy Integrity', () => {
    test('should maintain parent-child relationships correctly', async () => {
      const { data: nodes, error } = await supabase.
      from('assessment_nodes').
      select('*').
      order('path');

      expect(error).toBeNull();

      // Verify path consistency
      nodes.forEach((node) => {
        if (node.parent_id) {
          const parent = nodes.find((n) => n.id === node.parent_id);
          expect(parent).toBeDefined();
          expect(node.path.startsWith(parent.path)).toBe(true);
        }
      });
    });

    test('should enforce node level constraints', async () => {
      const { data: nodes, error } = await supabase.
      from('assessment_nodes').
      select('*');

      expect(error).toBeNull();

      nodes.forEach((node) => {
        const pathParts = node.path.split('.');
        expect(node.level).toBe(pathParts.length - 1);
      });
    });

    test('should prevent circular dependencies', async () => {
      // Attempt to create a circular dependency
      const { error } = await supabase.
      from('assessment_nodes').
      update({ parent_id: 999 }).
      eq('id', 1);

      expect(error).toBeDefined();
      expect(error.message).toContain('circular');
    });
  });

  describe('OCEAN Mapping Consistency', () => {
    test('should have valid OCEAN mappings for all question nodes', async () => {
      const { data: questions, error } = await supabase.
      from('assessment_nodes').
      select('*, assessment_ocean_mappings(*)').
      eq('type', 'question');

      expect(error).toBeNull();

      questions.forEach((question) => {
        expect(question.assessment_ocean_mappings).toBeDefined();
        expect(question.assessment_ocean_mappings.length).toBeGreaterThan(0);

        // Verify mapping weights sum to 1
        const totalWeight = question.assessment_ocean_mappings.reduce(
          (sum, mapping) => sum + mapping.weight, 0
        );
        expect(totalWeight).toBeCloseTo(1.0, 2);
      });
    });

    test('should validate OCEAN dimension values', async () => {
      const validDimensions = ['openness', 'conscientiousness', 'extraversion', 'agreeableness', 'neuroticism'];

      const { data: mappings, error } = await supabase.
      from('assessment_ocean_mappings').
      select('*');

      expect(error).toBeNull();

      mappings.forEach((mapping) => {
        expect(validDimensions).toContain(mapping.dimension);
        expect(mapping.weight).toBeGreaterThan(0);
        expect(mapping.weight).toBeLessThanOrEqual(1);
      });
    });
  });

  describe('Performance Benchmarks', () => {
    test('should retrieve user assessments within 100ms', async () => {
      const startTime = Date.now();

      const { data, error } = await supabase.
      from('assessments').
      select(`
          *,
          assessment_scores(*),
          assessment_responses(*)
        `).
      eq('user_id', 'test-user-id').
      limit(10);

      const duration = Date.now() - startTime;

      expect(error).toBeNull();
      expect(duration).toBeLessThan(100);
    });

    test('should calculate OCEAN scores for 100 responses within 200ms', async () => {
      const startTime = Date.now();

      const { data: responses, error } = await supabase.
      from('assessment_responses').
      select(`
          *,
          assessment_nodes(
            assessment_ocean_mappings(*)
          )
        `).
      limit(100);

      const scores = calculateOceanScores(responses);
      const duration = Date.now() - startTime;

      expect(error).toBeNull();
      expect(duration).toBeLessThan(200);
      expect(scores).toHaveProperty('openness');
    });

    test('should handle concurrent assessment submissions', async () => {
      const promises = Array(10).fill(null).map((_, i) =>
      supabase.
      from('assessments').
      insert({
        user_id: `test-user-${i}`,
        type: 'ocean_basic',
        status: 'in_progress'
      })
      );

      const results = await Promise.all(promises);

      results.forEach((result) => {
        expect(result.error).toBeNull();
      });
    });
  });
});

// Helper function to calculate OCEAN scores
function calculateOceanScores(responses) {
  const scores = {
    openness: 0,
    conscientiousness: 0,
    extraversion: 0,
    agreeableness: 0,
    neuroticism: 0
  };

  responses.forEach((response) => {
    if (response.assessment_nodes?.assessment_ocean_mappings) {
      response.assessment_nodes.assessment_ocean_mappings.forEach((mapping) => {
        scores[mapping.dimension] += response.value * mapping.weight;
      });
    }
  });

  // Normalize scores
  Object.keys(scores).forEach((dimension) => {
    scores[dimension] = scores[dimension] / responses.length;
  });

  return scores;
}