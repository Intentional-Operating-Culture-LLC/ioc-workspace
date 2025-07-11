# OCEAN Assessment Testing Suite

This comprehensive testing suite ensures the reliability, performance, and quality of the OCEAN personality assessment integration.

## Test Structure

```
tests/
├── unit/                    # Unit tests for individual components
│   ├── services/           # Business logic tests
│   └── components/         # UI component tests
├── integration/            # Integration tests
│   ├── api/               # API endpoint tests
│   └── database/          # Database schema tests
├── e2e/                    # End-to-end tests
│   ├── helpers/           # Test utilities
│   └── *.spec.js          # Test scenarios
├── performance/            # Performance tests
│   └── ocean-load-testing.js
└── setup/                  # Test configuration
    ├── unit.setup.js
    └── integration.setup.js
```

## Running Tests

### Quick Start

```bash
# Run all tests
npm test

# Run specific test suites
npm run test:unit
npm run test:integration
npm run test:e2e
npm run test:performance

# Run with coverage
npm run test:coverage

# Run comprehensive test suite
./scripts/run-ocean-tests.sh
```

### Test Commands

| Command | Description |
|---------|-------------|
| `npm test` | Run all tests |
| `npm run test:unit` | Run unit tests only |
| `npm run test:integration` | Run integration tests |
| `npm run test:e2e` | Run end-to-end tests |
| `npm run test:watch` | Run tests in watch mode |
| `npm run test:coverage` | Generate coverage report |
| `npm run test:performance` | Run performance tests |

## Test Categories

### 1. Database Integration Tests

Tests database schema integrity, migrations, and query performance:

- Schema migration verification
- Node hierarchy integrity
- OCEAN mapping consistency
- Query performance benchmarks

### 2. Service Layer Tests

Validates business logic and calculations:

- OCEAN score calculation accuracy
- Multi-rater aggregation
- Dark side pattern detection
- Score validation rules

### 3. API Endpoint Tests

Tests all REST API endpoints:

- CRUD operations
- Authentication/authorization
- Error handling
- Rate limiting
- Response time benchmarks

### 4. UI Component Tests

Tests React components:

- Component rendering
- User interactions
- Accessibility compliance
- Cross-browser compatibility

### 5. End-to-End Tests

Complete user journey tests:

- Assessment lifecycle
- Emotional regulation flow
- 360 feedback process
- Dark side interventions

### 6. Performance Tests

Load and stress testing:

- Concurrent user handling
- Response time under load
- Database query performance
- Score calculation efficiency

## Test Configuration

### Environment Variables

Create `.env.test` file:

```env
NODE_ENV=test
TEST_SUPABASE_URL=http://localhost:54321
TEST_SUPABASE_SERVICE_KEY=your-test-key
TEST_BASE_URL=http://localhost:3001
```

### Database Setup

```bash
# Setup test database
npm run db:test:setup

# Run migrations
npm run db:test:migrate

# Seed test data
npm run db:test:seed

# Clean test database
npm run db:test:clean
```

## Writing Tests

### Unit Test Example

```javascript
import { calculateOceanScores } from '@ioc/lib/src/assessment/ocean-scoring';

describe('OCEAN Scoring', () => {
  test('should calculate scores correctly', () => {
    const responses = [
      { nodeId: 1, value: 4, mappings: [{ dimension: 'openness', weight: 1 }] }
    ];
    
    const scores = calculateOceanScores(responses);
    expect(scores.openness).toBe(4);
  });
});
```

### Integration Test Example

```javascript
describe('Assessment API', () => {
  test('should create assessment', async () => {
    const response = await request(app)
      .post('/api/assessments')
      .set('Authorization', 'Bearer token')
      .send({ type: 'ocean_basic' });
      
    expect(response.status).toBe(201);
    expect(response.body.id).toBeDefined();
  });
});
```

### E2E Test Example

```javascript
test('Complete assessment flow', async ({ page }) => {
  await page.goto('/assessments/new');
  await page.click('[data-assessment-type="ocean_basic"]');
  await page.click('text=Begin Assessment');
  
  // Complete assessment...
  
  await expect(page.locator('[data-testid="results"]')).toBeVisible();
});
```

## CI/CD Integration

Tests run automatically on:

- Push to main/develop branches
- Pull requests
- Scheduled daily runs

### GitHub Actions Workflow

The `.github/workflows/ocean-testing.yml` file configures:

- Parallel test execution
- Multi-browser testing
- Coverage reporting
- Performance benchmarks
- Security scanning

## Test Reports

### Coverage Reports

- HTML: `coverage/final/index.html`
- LCOV: `coverage/final/lcov.info`
- JSON: `coverage/final/coverage-final.json`

### E2E Reports

- Playwright HTML: `playwright-report/index.html`
- Videos: `playwright-report/videos/`
- Screenshots: `playwright-report/screenshots/`

### Performance Reports

- HTML: `performance-report.html`
- JSON: `performance-summary.json`
- Metrics: `test-results/perf-results.json`

## Troubleshooting

### Common Issues

1. **Database connection errors**
   ```bash
   # Ensure test database is running
   npm run db:test:start
   ```

2. **Port conflicts**
   ```bash
   # Use different port
   TEST_PORT=3002 npm run test:e2e
   ```

3. **Flaky tests**
   ```bash
   # Run with retries
   npm run test:e2e -- --retries=2
   ```

### Debug Mode

```bash
# Run tests with debug output
DEBUG=* npm test

# Run specific test with debugging
npm test -- --grep "OCEAN scoring" --inspect
```

## Best Practices

1. **Test Isolation**: Each test should be independent
2. **Data Cleanup**: Always clean up test data
3. **Mocking**: Mock external services appropriately
4. **Assertions**: Use specific, meaningful assertions
5. **Performance**: Keep tests fast and focused
6. **Documentation**: Document complex test scenarios

## Maintenance

### Updating Test Data

```bash
# Regenerate test fixtures
npm run generate:test-data

# Update snapshots
npm test -- -u
```

### Adding New Tests

1. Create test file in appropriate directory
2. Follow naming convention: `*.test.js` or `*.spec.js`
3. Import necessary utilities from `test-utils`
4. Add to relevant test suite in CI configuration

## Contact

For questions or issues with the testing suite:

- Create an issue in the repository
- Contact the QA team
- Check the testing documentation wiki