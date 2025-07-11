/**
 * End-to-End Tests for OCEAN Assessment Flow
 * Using Playwright for cross-browser testing
 */

import { test, expect } from '@playwright/test';
import { generateUser, cleanupTestData } from './helpers/test-utils';

// Test configuration
test.describe.configure({ mode: 'parallel' });

test.describe('OCEAN Assessment E2E Flow', () => {
  let testUser;

  test.beforeEach(async ({ page }) => {
    // Create test user
    testUser = await generateUser();
    
    // Login
    await page.goto('/login');
    await page.fill('[name="email"]', testUser.email);
    await page.fill('[name="password"]', testUser.password);
    await page.click('[type="submit"]');
    
    // Wait for redirect to dashboard
    await page.waitForURL('/dashboard');
  });

  test.afterEach(async () => {
    // Cleanup test data
    await cleanupTestData(testUser.id);
  });

  test('Complete basic OCEAN assessment lifecycle', async ({ page }) => {
    // Navigate to assessments
    await page.click('text=Assessments');
    await page.waitForSelector('[data-testid="assessments-page"]');

    // Start new assessment
    await page.click('text=Start New Assessment');
    await page.click('[data-assessment-type="ocean_basic"]');
    await page.click('text=Begin Assessment');

    // Verify assessment started
    await expect(page.locator('[data-testid="assessment-progress"]')).toBeVisible();
    await expect(page.locator('text=Question 1 of 50')).toBeVisible();

    // Complete first section (10 questions)
    for (let i = 0; i < 10; i++) {
      // Select random answer
      const options = page.locator('[role="radio"]');
      const count = await options.count();
      const randomIndex = Math.floor(Math.random() * count);
      await options.nth(randomIndex).click();

      // Click next or submit
      if (i < 9) {
        await page.click('text=Next');
        await page.waitForSelector(`text=Question ${i + 2} of 50`);
      }
    }

    // Save progress
    await page.click('text=Save Progress');
    await expect(page.locator('text=Progress saved')).toBeVisible();

    // Test resume functionality
    await page.goto('/dashboard');
    await page.click('text=Resume Assessment');
    await expect(page.locator('text=Question 11 of 50')).toBeVisible();

    // Complete remaining questions quickly
    await completeRemainingQuestions(page, 11, 50);

    // Submit assessment
    await page.click('text=Submit Assessment');
    await page.click('text=Confirm Submission');

    // Wait for results
    await page.waitForSelector('[data-testid="assessment-results"]');
    
    // Verify results display
    await expect(page.locator('text=Your OCEAN Profile')).toBeVisible();
    await expect(page.locator('[data-dimension="openness"]')).toBeVisible();
    await expect(page.locator('[data-dimension="conscientiousness"]')).toBeVisible();
    await expect(page.locator('[data-dimension="extraversion"]')).toBeVisible();
    await expect(page.locator('[data-dimension="agreeableness"]')).toBeVisible();
    await expect(page.locator('[data-dimension="neuroticism"]')).toBeVisible();

    // Download report
    const [download] = await Promise.all([
      page.waitForEvent('download'),
      page.click('text=Download Report')
    ]);
    
    expect(download.suggestedFilename()).toMatch(/ocean-assessment-.*\.pdf/);
  });

  test('Emotional regulation assessment flow', async ({ page }) => {
    // Start emotional regulation assessment
    await page.goto('/assessments/new');
    await page.click('[data-assessment-type="emotional_regulation"]');
    await page.click('text=Start Assessment');

    // Answer scenario-based questions
    const scenarios = [
      {
        question: 'conflict with colleague',
        response: 'seek understanding'
      },
      {
        question: 'unexpected criticism',
        response: 'reflect and learn'
      },
      {
        question: 'high-pressure deadline',
        response: 'prioritize and communicate'
      }
    ];

    for (const scenario of scenarios) {
      await page.waitForSelector(`text=/${scenario.question}/i`);
      await page.click(`text=/${scenario.response}/i`);
      await page.click('text=Next');
    }

    // Complete Likert scale questions
    for (let i = 0; i < 20; i++) {
      await page.click('[role="radio"][value="4"]');
      if (i < 19) {
        await page.click('text=Next');
      }
    }

    // Submit and view results
    await page.click('text=Submit Assessment');
    await page.waitForSelector('[data-testid="emotional-regulation-results"]');

    // Verify emotional regulation insights
    await expect(page.locator('text=Emotional Awareness')).toBeVisible();
    await expect(page.locator('text=Response Flexibility')).toBeVisible();
    await expect(page.locator('text=Recovery Time')).toBeVisible();
  });

  test('Executive 360 feedback process', async ({ page, context }) => {
    // Start 360 assessment
    await page.goto('/assessments/new');
    await page.click('[data-assessment-type="ocean_360"]');
    
    // Configure raters
    await page.fill('[name="manager_email"]', 'manager@example.com');
    await page.fill('[name="peer_emails[0]"]', 'peer1@example.com');
    await page.fill('[name="peer_emails[1]"]', 'peer2@example.com');
    await page.fill('[name="direct_report_emails[0]"]', 'report1@example.com');
    
    // Set deadline
    await page.fill('[name="deadline"]', '2024-12-31');
    
    // Send invitations
    await page.click('text=Send Invitations');
    await expect(page.locator('text=Invitations sent successfully')).toBeVisible();

    // Complete self-assessment
    await page.click('text=Complete Your Self-Assessment');
    await completeRemainingQuestions(page, 1, 30);
    await page.click('text=Submit Self-Assessment');

    // Simulate manager completing assessment in new context
    const managerPage = await context.newPage();
    await simulateRaterCompletion(managerPage, 'manager@example.com', testUser.email);

    // Check progress dashboard
    await page.goto('/assessments/360/progress');
    await expect(page.locator('text=Self: Completed')).toBeVisible();
    await expect(page.locator('text=Manager: Completed')).toBeVisible();
    await expect(page.locator('text=Peers: 0/2')).toBeVisible();

    // Wait for minimum responses (simulate time passing)
    await page.evaluate(() => {
      // Mock time advancement
      Date.now = () => new Date('2024-12-15').getTime();
    });

    // View partial results
    await page.click('text=View Preliminary Results');
    await expect(page.locator('[data-testid="360-comparison-chart"]')).toBeVisible();
    await expect(page.locator('text=Self vs Manager Comparison')).toBeVisible();
  });

  test('Dark side intervention workflow', async ({ page }) => {
    // Complete assessment with extreme scores
    await page.goto('/assessments/new');
    await page.click('[data-assessment-type="ocean_basic"]');
    await page.click('text=Begin Assessment');

    // Answer to trigger dark side patterns
    // High neuroticism, low agreeableness pattern
    await answerForDarkSidePattern(page);

    // Submit assessment
    await page.click('text=Submit Assessment');
    
    // Wait for results with alerts
    await page.waitForSelector('[data-testid="dark-side-alert"]');
    
    // Verify dark side detection
    await expect(page.locator('text=Potential Risk Areas Identified')).toBeVisible();
    await expect(page.locator('text=Volatility Risk')).toBeVisible();
    await expect(page.locator('[data-severity="high"]')).toBeVisible();

    // View detailed analysis
    await page.click('text=View Detailed Analysis');
    await expect(page.locator('text=Behavioral Indicators')).toBeVisible();
    await expect(page.locator('text=Impact on Team')).toBeVisible();
    await expect(page.locator('text=Development Recommendations')).toBeVisible();

    // Access intervention resources
    await page.click('text=Access Development Resources');
    await expect(page.locator('[data-testid="intervention-plan"]')).toBeVisible();
    
    // Schedule coaching session
    await page.click('text=Schedule Coaching Session');
    await page.selectOption('[name="coach"]', 'coach-1');
    await page.fill('[name="preferred_date"]', '2024-12-20');
    await page.click('text=Confirm Booking');
    
    await expect(page.locator('text=Coaching session scheduled')).toBeVisible();
  });

  test('Assessment accessibility and keyboard navigation', async ({ page }) => {
    await page.goto('/assessments/new');
    
    // Test keyboard navigation
    await page.keyboard.press('Tab');
    await expect(page.locator('[data-assessment-type="ocean_basic"]')).toBeFocused();
    
    await page.keyboard.press('Enter');
    await page.keyboard.press('Tab');
    await expect(page.locator('text=Begin Assessment')).toBeFocused();
    
    await page.keyboard.press('Enter');
    
    // Navigate through questions with keyboard
    for (let i = 0; i < 5; i++) {
      // Tab to first option
      await page.keyboard.press('Tab');
      await page.keyboard.press('Tab');
      
      // Select with arrow keys
      await page.keyboard.press('ArrowRight');
      await page.keyboard.press('ArrowRight');
      await page.keyboard.press('Space');
      
      // Tab to next button
      await page.keyboard.press('Tab');
      await page.keyboard.press('Enter');
    }
    
    // Verify progress
    await expect(page.locator('text=Question 6 of')).toBeVisible();
  });

  test('Performance and loading states', async ({ page }) => {
    // Enable network throttling
    await page.route('**/*', route => {
      setTimeout(() => route.continue(), 1000);
    });

    await page.goto('/assessments/new');
    
    // Verify loading states
    await page.click('[data-assessment-type="ocean_basic"]');
    await expect(page.locator('[data-testid="loading-spinner"]')).toBeVisible();
    await expect(page.locator('text=Loading assessment...')).toBeVisible();
    
    await page.click('text=Begin Assessment');
    
    // Measure performance metrics
    const metrics = await page.evaluate(() => {
      const navigation = performance.getEntriesByType('navigation')[0];
      const paint = performance.getEntriesByName('first-contentful-paint')[0];
      
      return {
        domContentLoaded: navigation.domContentLoadedEventEnd - navigation.domContentLoadedEventStart,
        loadComplete: navigation.loadEventEnd - navigation.loadEventStart,
        firstContentfulPaint: paint ? paint.startTime : null
      };
    });
    
    // Assert performance thresholds
    expect(metrics.domContentLoaded).toBeLessThan(3000);
    expect(metrics.firstContentfulPaint).toBeLessThan(2000);
  });

  test('Error handling and recovery', async ({ page }) => {
    // Simulate network failure
    await page.route('**/api/assessments/**', route => route.abort());
    
    await page.goto('/assessments/new');
    await page.click('[data-assessment-type="ocean_basic"]');
    await page.click('text=Begin Assessment');
    
    // Verify error message
    await expect(page.locator('text=Unable to start assessment')).toBeVisible();
    await expect(page.locator('text=Try Again')).toBeVisible();
    
    // Restore network and retry
    await page.unroute('**/api/assessments/**');
    await page.click('text=Try Again');
    
    // Verify recovery
    await expect(page.locator('text=Question 1 of')).toBeVisible();
    
    // Test auto-save failure recovery
    await page.route('**/api/assessments/*/save', route => route.abort());
    
    // Answer question
    await page.click('[role="radio"][value="4"]');
    await page.click('text=Next');
    
    // Wait for auto-save attempt
    await page.waitForTimeout(5000);
    
    // Verify offline indicator
    await expect(page.locator('[data-testid="offline-indicator"]')).toBeVisible();
    await expect(page.locator('text=Changes saved locally')).toBeVisible();
    
    // Restore connection
    await page.unroute('**/api/assessments/*/save');
    
    // Verify sync
    await expect(page.locator('text=Synced with server')).toBeVisible();
  });
});

// Helper functions
async function completeRemainingQuestions(page, start, total) {
  for (let i = start; i <= total; i++) {
    const options = page.locator('[role="radio"]');
    const count = await options.count();
    await options.nth(Math.floor(Math.random() * count)).click();
    
    if (i < total) {
      await page.click('text=Next');
      await page.waitForSelector(`text=Question ${i + 1} of ${total}`);
    }
  }
}

async function answerForDarkSidePattern(page) {
  // Answer pattern: High neuroticism, low agreeableness
  const patterns = {
    neuroticism: 5, // Strongly agree
    agreeableness: 1, // Strongly disagree
    others: 3 // Neutral
  };
  
  for (let i = 0; i < 50; i++) {
    let value = patterns.others;
    
    // Identify question type by content
    const questionText = await page.locator('[data-testid="question-text"]').textContent();
    
    if (questionText.match(/worry|anxious|stress|upset/i)) {
      value = patterns.neuroticism;
    } else if (questionText.match(/trust|help|cooperate|kind/i)) {
      value = patterns.agreeableness;
    }
    
    await page.click(`[role="radio"][value="${value}"]`);
    
    if (i < 49) {
      await page.click('text=Next');
    }
  }
}

async function simulateRaterCompletion(page, raterEmail, targetEmail) {
  // Navigate to rater link (would normally be from email)
  await page.goto(`/assessments/360/rate?rater=${raterEmail}&target=${targetEmail}`);
  
  // Complete abbreviated rater assessment
  for (let i = 0; i < 30; i++) {
    await page.click('[role="radio"][value="4"]');
    if (i < 29) {
      await page.click('text=Next');
    }
  }
  
  await page.click('text=Submit Feedback');
  await expect(page.locator('text=Thank you for your feedback')).toBeVisible();
}