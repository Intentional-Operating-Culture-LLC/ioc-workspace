// Jest setup for shared-data-access
// Mock fetch for Node.js environment
const fetch = require('jest-fetch-mock');

// Enable fetch mocking
fetch.enableMocks();

// Mock environment variables
process.env.NODE_ENV = 'test';
process.env.SUPABASE_URL = 'http://localhost:54321';
process.env.SUPABASE_ANON_KEY = 'test-key';