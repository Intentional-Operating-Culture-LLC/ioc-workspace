/**
 * Analytics factory for test data generation
 */

import { v4 as uuidv4 } from 'uuid';

export interface TestAnalyticsEvent {
  id: string;
  event_type: string;
  user_id?: string;
  organization_id: string;
  properties: Record<string, any>;
  timestamp: string;
}

export interface TestMetric {
  id: string;
  name: string;
  value: number;
  type: 'counter' | 'gauge' | 'histogram';
  tags: Record<string, string>;
  timestamp: string;
}

let eventCounter = 0;
let metricCounter = 0;

export function createTestAnalyticsEvent(
  overrides?: Partial<TestAnalyticsEvent>
): TestAnalyticsEvent {
  eventCounter++;
  
  return {
    id: uuidv4(),
    event_type: `test_event_${eventCounter}`,
    organization_id: uuidv4(),
    properties: {
      source: 'test',
      version: '1.0.0',
    },
    timestamp: new Date().toISOString(),
    ...overrides,
  };
}

export function createTestMetric(overrides?: Partial<TestMetric>): TestMetric {
  metricCounter++;
  
  return {
    id: uuidv4(),
    name: `test_metric_${metricCounter}`,
    value: Math.random() * 100,
    type: 'gauge',
    tags: {
      environment: 'test',
      service: 'test-service',
    },
    timestamp: new Date().toISOString(),
    ...overrides,
  };
}

export function createTestAnalyticsEvents(
  count: number,
  overrides?: Partial<TestAnalyticsEvent>
): TestAnalyticsEvent[] {
  return Array.from({ length: count }, () => createTestAnalyticsEvent(overrides));
}

export function createTestMetrics(
  count: number,
  overrides?: Partial<TestMetric>
): TestMetric[] {
  return Array.from({ length: count }, () => createTestMetric(overrides));
}