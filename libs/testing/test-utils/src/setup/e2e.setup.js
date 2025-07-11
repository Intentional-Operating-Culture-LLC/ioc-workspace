/**
 * E2E test specific setup
 */

// Set e2e test environment
process.env.TEST_TYPE = 'e2e';

// Use staging/test URLs for e2e tests
process.env.NEXT_PUBLIC_APP_URL = process.env.E2E_APP_URL || 'http://localhost:3000';
process.env.API_URL = process.env.E2E_API_URL || 'http://localhost:3000/api';

// Increase timeouts for e2e tests
jest.setTimeout(60000);

// Global helpers for e2e tests
global.waitForSelector = async (page, selector, timeout = 30000) => {
  await page.waitForSelector(selector, { timeout });
};

global.waitForNavigation = async (page, options = {}) => {
  await page.waitForNavigation({ waitUntil: 'networkidle0', ...options });
};