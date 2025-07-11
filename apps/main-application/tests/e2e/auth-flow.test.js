/**
 * E2E tests for authentication flow
 */

import { test, expect } from '@playwright/test';
import { createTestUser } from "@ioc/testing/test-utils";

const BASE_URL = process.env.E2E_APP_URL || 'http://localhost:3001';

test.describe('Authentication Flow', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(BASE_URL);
  });

  test('should complete signup flow', async ({ page }) => {
    // Navigate to signup
    await page.click('text=Sign Up');
    await expect(page).toHaveURL(/.*\/signup/);

    // Fill signup form
    const testUser = createTestUser();
    await page.fill('[name="email"]', testUser.email);
    await page.fill('[name="password"]', testUser.password);
    await page.fill('[name="confirmPassword"]', testUser.password);

    // Submit form
    await page.click('button[type="submit"]');

    // Should redirect to dashboard after successful signup
    await expect(page).toHaveURL(/.*\/dashboard/, { timeout: 10000 });
    await expect(page.locator('text=Welcome')).toBeVisible();
  });

  test('should complete login flow', async ({ page }) => {
    // Navigate to login
    await page.click('text=Log In');
    await expect(page).toHaveURL(/.*\/login/);

    // Fill login form
    await page.fill('[name="email"]', 'existing@test.com');
    await page.fill('[name="password"]', 'Test123!@#');

    // Submit form
    await page.click('button[type="submit"]');

    // Should redirect to dashboard
    await expect(page).toHaveURL(/.*\/dashboard/, { timeout: 10000 });
  });

  test('should handle invalid credentials', async ({ page }) => {
    await page.goto(`${BASE_URL}/login`);

    // Try to login with invalid credentials
    await page.fill('[name="email"]', 'invalid@test.com');
    await page.fill('[name="password"]', 'wrongpassword');
    await page.click('button[type="submit"]');

    // Should show error message
    await expect(page.locator('text=Invalid credentials')).toBeVisible();
    await expect(page).toHaveURL(/.*\/login/);
  });

  test('should protect authenticated routes', async ({ page }) => {
    // Try to access dashboard without authentication
    await page.goto(`${BASE_URL}/dashboard`);

    // Should redirect to login
    await expect(page).toHaveURL(/.*\/login/);
    await expect(page.locator('text=Please log in')).toBeVisible();
  });

  test('should complete logout flow', async ({ page, context }) => {
    // First login
    await page.goto(`${BASE_URL}/login`);
    await page.fill('[name="email"]', 'existing@test.com');
    await page.fill('[name="password"]', 'Test123!@#');
    await page.click('button[type="submit"]');
    await expect(page).toHaveURL(/.*\/dashboard/);

    // Logout
    await page.click('button[aria-label="User menu"]');
    await page.click('text=Sign Out');

    // Should redirect to home page
    await expect(page).toHaveURL(BASE_URL);

    // Try to access dashboard again
    await page.goto(`${BASE_URL}/dashboard`);
    await expect(page).toHaveURL(/.*\/login/);
  });

  test('should remember user session', async ({ page, context }) => {
    // Login
    await page.goto(`${BASE_URL}/login`);
    await page.fill('[name="email"]', 'existing@test.com');
    await page.fill('[name="password"]', 'Test123!@#');
    await page.click('button[type="submit"]');
    await expect(page).toHaveURL(/.*\/dashboard/);

    // Open new tab and navigate to dashboard
    const newPage = await context.newPage();
    await newPage.goto(`${BASE_URL}/dashboard`);

    // Should still be authenticated
    await expect(newPage).toHaveURL(/.*\/dashboard/);
    await expect(newPage.locator('text=Welcome')).toBeVisible();
  });
});