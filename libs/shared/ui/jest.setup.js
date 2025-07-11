// Jest setup for shared-ui
require('@testing-library/jest-dom');

// Mock React components that might have issues in test environment
jest.mock('react-dom/client', () => ({
  createRoot: jest.fn(() => ({
    render: jest.fn(),
    unmount: jest.fn(),
  })),
}));

// Mock environment variables
process.env.NODE_ENV = 'test';