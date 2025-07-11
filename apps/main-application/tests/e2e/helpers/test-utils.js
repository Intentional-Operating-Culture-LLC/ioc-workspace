/**
 * E2E Test Utilities
 */

import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.TEST_SUPABASE_URL || 'http://localhost:54321',
  process.env.TEST_SUPABASE_SERVICE_KEY || 'test-service-key'
);

export async function generateUser() {
  const timestamp = Date.now();
  const email = `e2e-test-${timestamp}@example.com`;
  const password = 'E2ETestPassword123!';
  
  const { data: authData, error: authError } = await supabase.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });
  
  if (authError) throw authError;
  
  const { data: userData, error: userError } = await supabase
    .from('users')
    .insert({
      id: authData.user.id,
      email,
      name: `E2E Test User ${timestamp}`,
      role: 'user',
    })
    .select()
    .single();
  
  if (userError) throw userError;
  
  return {
    id: userData.id,
    email,
    password,
    name: userData.name,
  };
}

export async function cleanupTestData(userId) {
  if (!userId) return;
  
  try {
    // Clean up in correct order
    await supabase.from('assessment_scores').delete().eq('user_id', userId);
    await supabase.from('assessment_responses').delete().eq('user_id', userId);
    await supabase.from('assessment_raters').delete().eq('user_id', userId);
    await supabase.from('assessments').delete().eq('user_id', userId);
    await supabase.from('users').delete().eq('id', userId);
    await supabase.auth.admin.deleteUser(userId);
  } catch (error) {
    console.error('Cleanup error:', error);
  }
}

export async function createTestAssessment(userId, type = 'ocean_basic') {
  const { data, error } = await supabase
    .from('assessments')
    .insert({
      user_id: userId,
      type,
      status: 'in_progress',
      metadata: {
        test: true,
        created_at: new Date().toISOString(),
      },
    })
    .select()
    .single();
  
  if (error) throw error;
  return data;
}

export async function seedTestQuestions() {
  const questions = [];
  const dimensions = ['openness', 'conscientiousness', 'extraversion', 'agreeableness', 'neuroticism'];
  
  for (let i = 1; i <= 50; i++) {
    const dimension = dimensions[(i - 1) % 5];
    questions.push({
      id: i,
      type: 'question',
      text: `Test question ${i} for ${dimension}`,
      dimension,
      order: i,
      metadata: {
        category: dimension,
        reverse_scored: i % 7 === 0,
      },
    });
  }
  
  const { error } = await supabase
    .from('assessment_nodes')
    .upsert(questions, { onConflict: 'id' });
  
  if (error) throw error;
  
  // Add OCEAN mappings
  const mappings = questions.map(q => ({
    node_id: q.id,
    dimension: q.dimension,
    weight: 1.0,
  }));
  
  const { error: mappingError } = await supabase
    .from('assessment_ocean_mappings')
    .upsert(mappings, { onConflict: 'node_id,dimension' });
  
  if (mappingError) throw mappingError;
}

export function generateMockResponses(count = 50) {
  const responses = [];
  for (let i = 1; i <= count; i++) {
    responses.push({
      node_id: i,
      value: Math.floor(Math.random() * 5) + 1,
      timestamp: new Date().toISOString(),
    });
  }
  return responses;
}

export async function waitForElement(page, selector, options = {}) {
  const { timeout = 5000, state = 'visible' } = options;
  return page.waitForSelector(selector, { timeout, state });
}

export async function fillAssessmentResponse(page, questionNumber, value) {
  const questionSelector = `[data-question-number="${questionNumber}"]`;
  await waitForElement(page, questionSelector);
  
  const radioSelector = `${questionSelector} input[value="${value}"]`;
  await page.click(radioSelector);
}

export async function completeAssessment(page, responses) {
  for (let i = 0; i < responses.length; i++) {
    await fillAssessmentResponse(page, i + 1, responses[i]);
    
    if (i < responses.length - 1) {
      await page.click('[data-testid="next-button"]');
    }
  }
  
  await page.click('[data-testid="submit-button"]');
  await page.click('[data-testid="confirm-submit"]');
}

export async function verifyOceanScores(page, expectedRanges) {
  const dimensions = ['openness', 'conscientiousness', 'extraversion', 'agreeableness', 'neuroticism'];
  
  for (const dimension of dimensions) {
    const scoreElement = await page.locator(`[data-dimension="${dimension}"] [data-testid="score-value"]`);
    const scoreText = await scoreElement.textContent();
    const score = parseInt(scoreText);
    
    if (expectedRanges[dimension]) {
      const { min, max } = expectedRanges[dimension];
      expect(score).toBeGreaterThanOrEqual(min);
      expect(score).toBeLessThanOrEqual(max);
    }
  }
}

export async function setupMockAPI(page) {
  await page.route('**/api/analytics/**', route => {
    route.fulfill({
      status: 200,
      body: JSON.stringify({ success: true }),
    });
  });
  
  await page.route('**/api/monitoring/**', route => {
    route.fulfill({
      status: 200,
      body: JSON.stringify({ status: 'healthy' }),
    });
  });
}