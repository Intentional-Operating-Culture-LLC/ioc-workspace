/**
 * Performance Testing Scripts for OCEAN Assessment
 * Using k6 for load testing
 */

import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate, Trend } from 'k6/metrics';
import { htmlReport } from 'https://raw.githubusercontent.com/benc-uk/k6-reporter/main/dist/bundle.js';

// Custom metrics
const errorRate = new Rate('errors');
const assessmentDuration = new Trend('assessment_completion_time');
const scoreCalculationTime = new Trend('score_calculation_time');
const apiResponseTime = new Trend('api_response_time');

// Test configuration
export const options = {
  scenarios: {
    // Smoke test
    smoke: {
      executor: 'constant-vus',
      vus: 1,
      duration: '1m',
    },
    // Average load test
    average_load: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        { duration: '2m', target: 50 },
        { duration: '5m', target: 50 },
        { duration: '2m', target: 0 },
      ],
      gracefulRampDown: '30s',
      startTime: '2m',
    },
    // Stress test
    stress: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        { duration: '2m', target: 100 },
        { duration: '5m', target: 100 },
        { duration: '2m', target: 200 },
        { duration: '5m', target: 200 },
        { duration: '2m', target: 0 },
      ],
      gracefulRampDown: '30s',
      startTime: '11m',
    },
    // Spike test
    spike: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        { duration: '10s', target: 500 },
        { duration: '1m', target: 500 },
        { duration: '10s', target: 0 },
      ],
      gracefulRampDown: '10s',
      startTime: '27m',
    },
  },
  thresholds: {
    http_req_duration: ['p(95)<500', 'p(99)<1000'],
    errors: ['rate<0.05'],
    assessment_completion_time: ['p(95)<120000'], // 2 minutes
    score_calculation_time: ['p(95)<200'], // 200ms
    api_response_time: ['p(95)<300'], // 300ms
  },
};

const BASE_URL = __ENV.BASE_URL || 'http://localhost:3001';

// Test data
const testUsers = generateTestUsers(1000);
const assessmentResponses = generateAssessmentResponses();

export function setup() {
  // Setup test data in database
  console.log('Setting up test data...');
  
  const setupRes = http.post(
    `${BASE_URL}/api/test/setup`,
    JSON.stringify({ users: testUsers }),
    { headers: { 'Content-Type': 'application/json' } }
  );
  
  check(setupRes, {
    'Setup successful': (r) => r.status === 200,
  });
  
  return { testUsers };
}

export default function (data) {
  const user = data.testUsers[Math.floor(Math.random() * data.testUsers.length)];
  const startTime = new Date();
  
  // 1. User login
  const loginRes = http.post(
    `${BASE_URL}/api/auth/login`,
    JSON.stringify({
      email: user.email,
      password: user.password,
    }),
    {
      headers: { 'Content-Type': 'application/json' },
      tags: { name: 'Login' },
    }
  );
  
  check(loginRes, {
    'Login successful': (r) => r.status === 200,
  });
  
  if (loginRes.status !== 200) {
    errorRate.add(1);
    return;
  }
  
  const authToken = loginRes.json('token');
  const headers = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${authToken}`,
  };
  
  // 2. Create new assessment
  const createStartTime = new Date();
  const createRes = http.post(
    `${BASE_URL}/api/assessments`,
    JSON.stringify({
      type: 'ocean_basic',
      metadata: { source: 'load_test' },
    }),
    {
      headers,
      tags: { name: 'CreateAssessment' },
    }
  );
  
  apiResponseTime.add(new Date() - createStartTime);
  
  check(createRes, {
    'Assessment created': (r) => r.status === 201,
  });
  
  if (createRes.status !== 201) {
    errorRate.add(1);
    return;
  }
  
  const assessmentId = createRes.json('id');
  
  // 3. Submit responses in batches
  const batchSize = 10;
  const batches = Math.ceil(assessmentResponses.length / batchSize);
  
  for (let i = 0; i < batches; i++) {
    const batch = assessmentResponses.slice(i * batchSize, (i + 1) * batchSize);
    
    const batchStartTime = new Date();
    const batchRes = http.put(
      `${BASE_URL}/api/assessments/${assessmentId}`,
      JSON.stringify({ responses: batch }),
      {
        headers,
        tags: { name: 'SubmitBatch' },
      }
    );
    
    apiResponseTime.add(new Date() - batchStartTime);
    
    check(batchRes, {
      'Batch submitted': (r) => r.status === 200,
    });
    
    if (batchRes.status !== 200) {
      errorRate.add(1);
    }
    
    // Simulate user thinking time
    sleep(Math.random() * 2 + 1);
  }
  
  // 4. Complete assessment and calculate scores
  const completeStartTime = new Date();
  const completeRes = http.post(
    `${BASE_URL}/api/assessments/${assessmentId}/submit`,
    JSON.stringify({}),
    {
      headers,
      tags: { name: 'CompleteAssessment' },
    }
  );
  
  scoreCalculationTime.add(new Date() - completeStartTime);
  
  check(completeRes, {
    'Assessment completed': (r) => r.status === 200,
    'Scores calculated': (r) => r.json('scores') !== null,
    'All dimensions present': (r) => {
      const scores = r.json('scores');
      return scores && 
        scores.openness !== undefined &&
        scores.conscientiousness !== undefined &&
        scores.extraversion !== undefined &&
        scores.agreeableness !== undefined &&
        scores.neuroticism !== undefined;
    },
  });
  
  if (completeRes.status !== 200) {
    errorRate.add(1);
  }
  
  // 5. Retrieve results
  const resultsRes = http.get(
    `${BASE_URL}/api/assessments/${assessmentId}`,
    {
      headers,
      tags: { name: 'GetResults' },
    }
  );
  
  check(resultsRes, {
    'Results retrieved': (r) => r.status === 200,
  });
  
  // Record total assessment duration
  assessmentDuration.add(new Date() - startTime);
  
  // 6. Concurrent operations test
  if (Math.random() < 0.1) { // 10% of users
    performConcurrentOperations(assessmentId, headers);
  }
}

export function teardown(data) {
  // Cleanup test data
  console.log('Cleaning up test data...');
  
  const cleanupRes = http.post(
    `${BASE_URL}/api/test/cleanup`,
    JSON.stringify({ users: data.testUsers }),
    { headers: { 'Content-Type': 'application/json' } }
  );
  
  check(cleanupRes, {
    'Cleanup successful': (r) => r.status === 200,
  });
}

export function handleSummary(data) {
  return {
    'performance-report.html': htmlReport(data),
    'performance-summary.json': JSON.stringify(data, null, 2),
  };
}

// Helper functions
function generateTestUsers(count) {
  const users = [];
  for (let i = 0; i < count; i++) {
    users.push({
      email: `loadtest${i}@example.com`,
      password: 'TestPassword123!',
      name: `Load Test User ${i}`,
    });
  }
  return users;
}

function generateAssessmentResponses() {
  const responses = [];
  for (let i = 1; i <= 50; i++) {
    responses.push({
      nodeId: i,
      value: Math.floor(Math.random() * 5) + 1,
      timestamp: new Date().toISOString(),
    });
  }
  return responses;
}

function performConcurrentOperations(assessmentId, headers) {
  const operations = [
    // Get assessment details
    () => http.get(`${BASE_URL}/api/assessments/${assessmentId}`, { headers }),
    
    // Get user's assessment history
    () => http.get(`${BASE_URL}/api/assessments`, { headers }),
    
    // Get assessment analytics
    () => http.get(`${BASE_URL}/api/analytics/assessments/${assessmentId}`, { headers }),
    
    // Download report (simulated)
    () => http.get(`${BASE_URL}/api/assessments/${assessmentId}/report`, { headers }),
  ];
  
  // Execute all operations concurrently
  const results = operations.map(op => op());
  
  results.forEach((res, index) => {
    check(res, {
      [`Concurrent operation ${index} successful`]: (r) => r.status === 200,
    });
  });
}

// Scenario-specific tests
export function testDatabaseConnection() {
  const res = http.get(`${BASE_URL}/api/health/database`, {
    tags: { name: 'DatabaseHealth' },
  });
  
  check(res, {
    'Database connected': (r) => r.status === 200,
    'Response time < 100ms': (r) => r.timings.duration < 100,
  });
}

export function testCachePerformance() {
  const assessmentId = 'cached-assessment-123';
  
  // First request (cache miss)
  const firstRes = http.get(`${BASE_URL}/api/assessments/${assessmentId}/scores`);
  const firstTime = firstRes.timings.duration;
  
  // Second request (cache hit)
  const secondRes = http.get(`${BASE_URL}/api/assessments/${assessmentId}/scores`);
  const secondTime = secondRes.timings.duration;
  
  check(null, {
    'Cache improves performance': () => secondTime < firstTime * 0.5,
  });
}

export function testMultiRaterScenario() {
  const assessment360Id = 'assessment-360-test';
  const raters = ['self', 'manager', 'peer1', 'peer2', 'peer3'];
  
  const submissions = raters.map(rater => {
    const startTime = new Date();
    const res = http.post(
      `${BASE_URL}/api/assessments/${assessment360Id}/rate`,
      JSON.stringify({
        raterId: rater,
        responses: generateAssessmentResponses(),
      }),
      {
        headers: { 'Content-Type': 'application/json' },
        tags: { name: 'MultiRaterSubmission' },
      }
    );
    
    return {
      rater,
      duration: new Date() - startTime,
      status: res.status,
    };
  });
  
  // Verify all submissions successful
  submissions.forEach(sub => {
    check(null, {
      [`${sub.rater} submission successful`]: () => sub.status === 200,
      [`${sub.rater} submission < 1s`]: () => sub.duration < 1000,
    });
  });
  
  // Test aggregation performance
  const aggregateStartTime = new Date();
  const aggregateRes = http.get(
    `${BASE_URL}/api/assessments/${assessment360Id}/aggregate`,
    {
      headers: { 'Content-Type': 'application/json' },
      tags: { name: 'AggregateScores' },
    }
  );
  
  const aggregationTime = new Date() - aggregateStartTime;
  
  check(aggregateRes, {
    'Aggregation successful': (r) => r.status === 200,
    'Aggregation < 500ms': () => aggregationTime < 500,
    'All rater scores included': (r) => {
      const data = r.json();
      return data.raterCount === raters.length;
    },
  });
}