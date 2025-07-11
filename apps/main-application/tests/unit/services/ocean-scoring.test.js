/**
 * Unit Tests for OCEAN Scoring Service
 */

import {
  calculateOceanScores,
  aggregateMultiRaterScores,
  detectDarkSidePatterns,
  validateScoreRange } from
"@ioc/shared/data-access/src/assessment/ocean-scoring";

describe('OCEAN Scoring Service', () => {
  describe('Score Calculation', () => {
    test('should calculate basic OCEAN scores correctly', () => {
      const responses = [
      {
        nodeId: 1,
        value: 4,
        mappings: [
        { dimension: 'openness', weight: 0.8 },
        { dimension: 'extraversion', weight: 0.2 }]

      },
      {
        nodeId: 2,
        value: 3,
        mappings: [
        { dimension: 'conscientiousness', weight: 1.0 }]

      },
      {
        nodeId: 3,
        value: 5,
        mappings: [
        { dimension: 'agreeableness', weight: 0.6 },
        { dimension: 'neuroticism', weight: -0.4 }]

      }];


      const scores = calculateOceanScores(responses);

      expect(scores.openness).toBeCloseTo(3.2, 1);
      expect(scores.conscientiousness).toBeCloseTo(3.0, 1);
      expect(scores.extraversion).toBeCloseTo(0.8, 1);
      expect(scores.agreeableness).toBeCloseTo(3.0, 1);
      expect(scores.neuroticism).toBeCloseTo(-2.0, 1);
    });

    test('should handle reverse-scored items', () => {
      const responses = [
      {
        nodeId: 1,
        value: 5,
        reverse: true,
        mappings: [
        { dimension: 'neuroticism', weight: 0.8 }]

      }];


      const scores = calculateOceanScores(responses);

      // Reverse scoring: 5 becomes 1
      expect(scores.neuroticism).toBeCloseTo(0.8, 1);
    });

    test('should normalize scores to 0-100 range', () => {
      const responses = generateRandomResponses(50);
      const scores = calculateOceanScores(responses, { normalize: true });

      Object.values(scores).forEach((score) => {
        expect(score).toBeGreaterThanOrEqual(0);
        expect(score).toBeLessThanOrEqual(100);
      });
    });

    test('should handle missing or invalid responses', () => {
      const responses = [
      { nodeId: 1, value: null, mappings: [{ dimension: 'openness', weight: 1 }] },
      { nodeId: 2, value: undefined, mappings: [{ dimension: 'openness', weight: 1 }] },
      { nodeId: 3, value: 'invalid', mappings: [{ dimension: 'openness', weight: 1 }] },
      { nodeId: 4, value: 3, mappings: [{ dimension: 'openness', weight: 1 }] }];


      const scores = calculateOceanScores(responses);

      // Should only count valid response
      expect(scores.openness).toBeCloseTo(3.0, 1);
    });
  });

  describe('Multi-Rater Aggregation', () => {
    test('should aggregate scores using weighted average', () => {
      const raterScores = [
      {
        raterId: 'self',
        weight: 0.4,
        scores: { openness: 80, conscientiousness: 70, extraversion: 60, agreeableness: 75, neuroticism: 40 }
      },
      {
        raterId: 'manager',
        weight: 0.3,
        scores: { openness: 75, conscientiousness: 85, extraversion: 65, agreeableness: 70, neuroticism: 35 }
      },
      {
        raterId: 'peer1',
        weight: 0.15,
        scores: { openness: 78, conscientiousness: 72, extraversion: 70, agreeableness: 80, neuroticism: 45 }
      },
      {
        raterId: 'peer2',
        weight: 0.15,
        scores: { openness: 82, conscientiousness: 75, extraversion: 68, agreeableness: 78, neuroticism: 38 }
      }];


      const aggregated = aggregateMultiRaterScores(raterScores);

      expect(aggregated.openness).toBeCloseTo(78.3, 1);
      expect(aggregated.conscientiousness).toBeCloseTo(75.85, 1);
      expect(aggregated.extraversion).toBeCloseTo(64.95, 1);
      expect(aggregated.agreeableness).toBeCloseTo(74.7, 1);
      expect(aggregated.neuroticism).toBeCloseTo(38.95, 1);
    });

    test('should handle missing rater data', () => {
      const raterScores = [
      {
        raterId: 'self',
        weight: 0.5,
        scores: { openness: 80, conscientiousness: 70, extraversion: 60, agreeableness: 75, neuroticism: 40 }
      },
      {
        raterId: 'manager',
        weight: 0.5,
        scores: null // Missing scores
      }];


      const aggregated = aggregateMultiRaterScores(raterScores);

      // Should only use self scores
      expect(aggregated.openness).toBe(80);
      expect(aggregated.conscientiousness).toBe(70);
    });

    test('should detect significant rater discrepancies', () => {
      const raterScores = [
      {
        raterId: 'self',
        weight: 0.5,
        scores: { openness: 90, conscientiousness: 85, extraversion: 80, agreeableness: 88, neuroticism: 20 }
      },
      {
        raterId: 'manager',
        weight: 0.5,
        scores: { openness: 50, conscientiousness: 45, extraversion: 40, agreeableness: 48, neuroticism: 60 }
      }];


      const result = aggregateMultiRaterScores(raterScores, { detectDiscrepancies: true });

      expect(result.discrepancies).toBeDefined();
      expect(result.discrepancies.openness).toBeGreaterThan(30);
      expect(result.discrepancies.conscientiousness).toBeGreaterThan(30);
    });
  });

  describe('Dark Side Pattern Detection', () => {
    test('should detect high neuroticism with low agreeableness', () => {
      const scores = {
        openness: 60,
        conscientiousness: 70,
        extraversion: 50,
        agreeableness: 25,
        neuroticism: 85
      };

      const patterns = detectDarkSidePatterns(scores);

      expect(patterns).toContain('volatility_risk');
      expect(patterns).toContain('interpersonal_difficulties');
    });

    test('should detect narcissistic tendencies', () => {
      const scores = {
        openness: 40,
        conscientiousness: 30,
        extraversion: 90,
        agreeableness: 20,
        neuroticism: 30
      };

      const patterns = detectDarkSidePatterns(scores);

      expect(patterns).toContain('narcissistic_tendencies');
    });

    test('should detect perfectionism risk', () => {
      const scores = {
        openness: 50,
        conscientiousness: 95,
        extraversion: 40,
        agreeableness: 60,
        neuroticism: 75
      };

      const patterns = detectDarkSidePatterns(scores);

      expect(patterns).toContain('perfectionism_risk');
      expect(patterns).toContain('burnout_risk');
    });

    test('should return empty array for balanced profiles', () => {
      const scores = {
        openness: 65,
        conscientiousness: 70,
        extraversion: 60,
        agreeableness: 68,
        neuroticism: 45
      };

      const patterns = detectDarkSidePatterns(scores);

      expect(patterns).toEqual([]);
    });
  });

  describe('Score Validation', () => {
    test('should validate score ranges', () => {
      expect(validateScoreRange(50)).toBe(true);
      expect(validateScoreRange(0)).toBe(true);
      expect(validateScoreRange(100)).toBe(true);
      expect(validateScoreRange(-1)).toBe(false);
      expect(validateScoreRange(101)).toBe(false);
      expect(validateScoreRange(null)).toBe(false);
      expect(validateScoreRange('50')).toBe(false);
    });

    test('should validate complete score set', () => {
      const validScores = {
        openness: 60,
        conscientiousness: 70,
        extraversion: 55,
        agreeableness: 65,
        neuroticism: 45
      };

      const invalidScores = {
        openness: 60,
        conscientiousness: 70,
        extraversion: 55,
        agreeableness: 65
        // Missing neuroticism
      };

      expect(validateScoreSet(validScores)).toBe(true);
      expect(validateScoreSet(invalidScores)).toBe(false);
    });
  });
});

// Helper functions
function generateRandomResponses(count) {
  const dimensions = ['openness', 'conscientiousness', 'extraversion', 'agreeableness', 'neuroticism'];
  return Array(count).fill(null).map((_, i) => ({
    nodeId: i + 1,
    value: Math.floor(Math.random() * 5) + 1,
    mappings: [{
      dimension: dimensions[i % dimensions.length],
      weight: Math.random() * 0.5 + 0.5
    }]
  }));
}

function validateScoreSet(scores) {
  const requiredDimensions = ['openness', 'conscientiousness', 'extraversion', 'agreeableness', 'neuroticism'];
  return requiredDimensions.every((dim) =>
  scores.hasOwnProperty(dim) && validateScoreRange(scores[dim])
  );
}