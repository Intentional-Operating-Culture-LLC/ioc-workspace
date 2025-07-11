/**
 * Test helper functions
 */

import { render, RenderOptions } from '@testing-library/react';
import { ReactElement } from 'react';

/**
 * Wait for a condition to be true
 */
export async function waitFor(
  condition: () => boolean | Promise<boolean>,
  timeout = 5000,
  interval = 100
): Promise<void> {
  const startTime = Date.now();
  
  while (Date.now() - startTime < timeout) {
    if (await condition()) {
      return;
    }
    await new Promise(resolve => setTimeout(resolve, interval));
  }
  
  throw new Error(`Timeout waiting for condition after ${timeout}ms`);
}

/**
 * Wait for async operations to complete
 */
export async function waitForAsync(): Promise<void> {
  await new Promise(resolve => setImmediate(resolve));
}

/**
 * Custom render with providers
 */
export interface CustomRenderOptions extends Omit<RenderOptions, 'wrapper'> {
  initialState?: Record<string, unknown>;
  router?: Record<string, unknown>;
}

export function renderWithProviders(
  ui: ReactElement,
  options?: CustomRenderOptions
) {
  // This would wrap with your app's providers
  // For now, just return the standard render
  return render(ui, options);
}

/**
 * Create a test wrapper component
 */
export function createWrapper(providers: React.FC<{ children: React.ReactNode }>[]) {
  return ({ children }: { children: React.ReactNode }) => {
    return providers.reduceRight(
      (acc, Provider) => <Provider>{acc}</Provider>,
      <>{children}</>
    );
  };
}

/**
 * Mock console methods
 */
export class ConsoleMock {
  private originalConsole: Record<string, any> = {};
  private mocks: Record<string, jest.Mock> = {};

  mock(methods: string[] = ['log', 'warn', 'error']) {
    methods.forEach(method => {
      this.originalConsole[method] = console[method as keyof Console];
      this.mocks[method] = jest.fn();
      (console as any)[method] = this.mocks[method];
    });
  }

  restore() {
    Object.entries(this.originalConsole).forEach(([method, original]) => {
      (console as any)[method] = original;
    });
  }

  getCalls(method: string) {
    return this.mocks[method]?.mock.calls || [];
  }

  clear() {
    Object.values(this.mocks).forEach(mock => mock.mockClear());
  }
}

/**
 * Test data generators
 */
export const generators = {
  /**
   * Generate random string
   */
  randomString(length = 10): string {
    const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    return Array.from({ length }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
  },

  /**
   * Generate random email
   */
  randomEmail(): string {
    return `test.${this.randomString(8)}@example.com`;
  },

  /**
   * Generate random UUID
   */
  randomUuid(): string {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
      const r = (Math.random() * 16) | 0;
      const v = c === 'x' ? r : (r & 0x3) | 0x8;
      return v.toString(16);
    });
  },

  /**
   * Generate random number
   */
  randomNumber(min = 0, max = 100): number {
    return Math.floor(Math.random() * (max - min + 1)) + min;
  },

  /**
   * Generate random boolean
   */
  randomBoolean(): boolean {
    return Math.random() < 0.5;
  },

  /**
   * Generate random date
   */
  randomDate(start = new Date(2020, 0, 1), end = new Date()): Date {
    return new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime()));
  },

  /**
   * Generate array of items
   */
  array<T>(count: number, generator: () => T): T[] {
    return Array.from({ length: count }, generator);
  },
};

/**
 * Assertion helpers
 */
export const assertions = {
  /**
   * Assert that an element has specific CSS classes
   */
  hasClasses(element: HTMLElement, ...classes: string[]) {
    classes.forEach(className => {
      expect(element).toHaveClass(className);
    });
  },

  /**
   * Assert that an element does not have specific CSS classes
   */
  doesNotHaveClasses(element: HTMLElement, ...classes: string[]) {
    classes.forEach(className => {
      expect(element).not.toHaveClass(className);
    });
  },

  /**
   * Assert that an API was called with specific parameters
   */
  apiCalledWith(mockFn: jest.Mock, expectedUrl: string, expectedOptions?: RequestInit) {
    expect(mockFn).toHaveBeenCalledWith(
      expect.stringContaining(expectedUrl),
      expectedOptions ? expect.objectContaining(expectedOptions) : expect.anything()
    );
  },

  /**
   * Assert that a promise rejects with specific error
   */
  async rejectsWith(promise: Promise<any>, errorMessage: string | RegExp) {
    await expect(promise).rejects.toThrow(errorMessage);
  },

  /**
   * Assert that a value is within range
   */
  isWithinRange(value: number, min: number, max: number) {
    expect(value).toBeGreaterThanOrEqual(min);
    expect(value).toBeLessThanOrEqual(max);
  },
};

/**
 * Performance testing helpers
 */
export class PerformanceTimer {
  private startTime: number = 0;
  private marks: Map<string, number> = new Map();

  start() {
    this.startTime = performance.now();
  }

  mark(name: string) {
    this.marks.set(name, performance.now());
  }

  measure(name: string, startMark?: string): number {
    const endTime = performance.now();
    const startTime = startMark ? this.marks.get(startMark) || this.startTime : this.startTime;
    return endTime - startTime;
  }

  getAllMeasurements(): Record<string, number> {
    const measurements: Record<string, number> = {};
    let previousTime = this.startTime;

    Array.from(this.marks.entries())
      .sort(([, a], [, b]) => a - b)
      .forEach(([name, time]) => {
        measurements[name] = time - previousTime;
        previousTime = time;
      });

    return measurements;
  }
}

/**
 * Memory leak detection helper
 */
export class MemoryLeakDetector {
  private initialMemory: number = 0;
  private measurements: number[] = [];

  start() {
    if (global.gc) {
      global.gc();
    }
    this.initialMemory = process.memoryUsage().heapUsed;
  }

  measure() {
    if (global.gc) {
      global.gc();
    }
    const currentMemory = process.memoryUsage().heapUsed;
    this.measurements.push(currentMemory - this.initialMemory);
  }

  isLeaking(threshold = 0.1): boolean {
    if (this.measurements.length < 2) return false;

    // Simple linear regression to detect upward trend
    const n = this.measurements.length;
    const sumX = (n * (n - 1)) / 2;
    const sumY = this.measurements.reduce((a, b) => a + b, 0);
    const sumXY = this.measurements.reduce((sum, y, x) => sum + x * y, 0);
    const sumX2 = (n * (n - 1) * (2 * n - 1)) / 6;

    const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
    const avgIncrease = slope / (sumY / n);

    return avgIncrease > threshold;
  }
}

/**
 * Snapshot testing helpers
 */
export function cleanSnapshot(obj: any): any {
  const cleaned = JSON.parse(JSON.stringify(obj));
  
  const clean = (item: any): any => {
    if (Array.isArray(item)) {
      return item.map(clean);
    }
    
    if (item && typeof item === 'object') {
      const result: any = {};
      
      Object.entries(item).forEach(([key, value]) => {
        // Remove dynamic values
        if (['id', 'createdAt', 'updatedAt', 'timestamp'].includes(key)) {
          result[key] = `[${key}]`;
        } else {
          result[key] = clean(value);
        }
      });
      
      return result;
    }
    
    return item;
  };
  
  return clean(cleaned);
}