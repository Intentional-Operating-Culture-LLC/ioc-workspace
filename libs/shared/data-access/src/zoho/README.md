# Zoho Campaigns API Client Library

A production-ready Zoho Campaigns API client with full automation capabilities for programmatic email sending.

## 🚀 Features

- **Complete API Coverage**: Full support for campaigns, lists, contacts, templates, and analytics
- **Production-Ready**: Built-in authentication, rate limiting, error handling, and retry logic
- **Automation Framework**: High-level automation service for complex email sequences
- **Real-time Monitoring**: Comprehensive logging, metrics, and alerting system
- **Testing Suite**: Complete test suite with demo user support
- **TypeScript Support**: Full TypeScript definitions and type safety
- **Configuration Management**: Flexible configuration with environment variable support

## 📦 Installation

```bash
# Install dependencies
npm install axios

# If using TypeScript
npm install -D typescript @types/node
```

## 🔧 Configuration

### Environment Variables

Create a `.env` file or set environment variables:

```env
ZOHO_CAMPAIGNS_CLIENT_ID=your_client_id
ZOHO_CAMPAIGNS_CLIENT_SECRET=your_client_secret
ZOHO_CAMPAIGNS_REFRESH_TOKEN=your_refresh_token
ZOHO_CAMPAIGNS_ACCESS_TOKEN=your_access_token
ZOHO_REGION=com
COMPANY_NAME=Your Company
COMPANY_EMAIL=admin@yourcompany.com
```

### Using Configuration File

```typescript
import { ZohoConfigLoader } from './config';

const config = new ZohoConfigLoader('/path/to/zoho-complete.env');
const automationService = config.getAutomationService();
```

## 🏁 Quick Start

### Basic Usage

```typescript
import { createAutomationService } from './zoho';

const service = createAutomationService();

// Quick setup with demo users
const setup = await service.quickSetup({
  listName: 'My Demo List',
  contactEmails: ['demo_user001@iocframework.com', 'demo_user002@iocframework.com']
});

// Send a campaign
const campaign = await service.sendAutomatedCampaign({
  name: 'Welcome Campaign',
  subject: 'Welcome to our service!',
  template: 'Demo Welcome',
  mailingList: setup.mailingList.listkey,
  testEmails: ['demo_user001@iocframework.com']
});
```

### Advanced Usage

```typescript
import { 
  CampaignAutomationService, 
  ZohoCampaignsMonitor,
  ZohoCampaignsTestSuite 
} from './zoho';

// Create automation service
const automation = new CampaignAutomationService({
  clientId: 'your_client_id',
  clientSecret: 'your_client_secret',
  refreshToken: 'your_refresh_token',
  accessToken: 'your_access_token',
  defaultFromEmail: 'noreply@yourcompany.com',
  defaultFromName: 'Your Company',
  companyName: 'Your Company',
  companyAddress: 'Your Address'
});

// Setup monitoring
const monitor = new ZohoCampaignsMonitor();
monitor.on('alertTriggered', (alert) => {
  console.log('Alert:', alert.alert.name);
});

// Run automation sequence
const sequence = {
  id: 'welcome-sequence',
  name: 'Welcome Email Sequence',
  triggerType: 'immediate',
  campaigns: [
    {
      name: 'Welcome Email',
      subject: 'Welcome!',
      template: 'welcome-template',
      mailingList: 'your-list-key'
    }
  ],
  delays: [0],
  enabled: true
};

const report = await automation.executeAutomationSequence(sequence);
```

## 🎯 Demo Script

Run the complete demo with your credentials:

```bash
# Set up environment
export ZOHO_CAMPAIGNS_CLIENT_ID="your_client_id"
export ZOHO_CAMPAIGNS_CLIENT_SECRET="your_client_secret"
export ZOHO_CAMPAIGNS_REFRESH_TOKEN="your_refresh_token"
export ZOHO_CAMPAIGNS_ACCESS_TOKEN="your_access_token"

# Run demo (test mode)
npx ts-node demo-script.ts

# Run with real email sending
ENABLE_REAL_SENDING=true npx ts-node demo-script.ts

# Run with comprehensive tests
RUN_TESTS=true npx ts-node demo-script.ts
```

## 🧪 Testing

### Running Tests

```typescript
import { ZohoCampaignsTestSuite } from './zoho';

const testSuite = new ZohoCampaignsTestSuite({
  demoUsers: ['demo_user001@iocframework.com', 'demo_user002@iocframework.com'],
  enableRealSending: false, // Set to true for real email tests
  enableMonitoring: true
});

const results = await testSuite.runAllTests();
console.log('Test Results:', results.summary);
```

### Test Categories

- **API Tests**: Authentication, rate limiting, basic connectivity
- **List Management**: Creating lists, adding/managing contacts
- **Template Management**: Creating, updating, deleting templates
- **Campaign Management**: Creating, sending, tracking campaigns
- **Automation Tests**: Testing email sequences and automation workflows
- **Error Handling**: Testing error scenarios and retry logic
- **Integration Tests**: End-to-end workflow testing

## 📊 Monitoring

### Setting up Monitoring

```typescript
import { ZohoCampaignsMonitor } from './zoho';

const monitor = new ZohoCampaignsMonitor({
  logLevel: 'info',
  enableFileLogging: true,
  enableMetrics: true,
  enableAlerts: true
});

// Custom alerts
monitor.addAlert({
  id: 'custom-alert',
  name: 'Custom Alert',
  type: 'threshold',
  metric: 'bounceRate',
  condition: 'gt',
  threshold: 3.0,
  timeWindow: 15,
  enabled: true,
  notifications: {
    email: ['admin@yourcompany.com']
  }
});
```

### Metrics and Logging

```typescript
// Record custom metrics
monitor.recordMetric('custom_metric', 100);

// Log events
monitor.info('CAMPAIGN', 'Campaign sent successfully', { campaignId: 'abc123' });
monitor.error('ERROR', 'Campaign failed', error);

// Generate reports
const report = monitor.generateDailyReport();
```

## 🔄 Automation Workflows

### Creating Automation Sequences

```typescript
// Welcome sequence
const welcomeSequence = {
  id: 'welcome-001',
  name: 'New User Welcome Sequence',
  triggerType: 'immediate',
  campaigns: [
    {
      name: 'Welcome Email',
      subject: 'Welcome to {{COMPANY_NAME}}!',
      template: 'welcome-template',
      mailingList: 'new-users-list'
    },
    {
      name: 'Getting Started',
      subject: 'Getting Started with {{COMPANY_NAME}}',
      template: 'getting-started-template',
      mailingList: 'new-users-list'
    }
  ],
  delays: [0, 1440], // Second email after 24 hours
  enabled: true
};

// Execute sequence
const report = await automation.executeAutomationSequence(welcomeSequence);
```

### Template Variables

```typescript
// Create template with variables
const template = {
  name: 'Welcome Template',
  subject: 'Welcome {{FIRST_NAME}}!',
  htmlContent: `
    <h1>Welcome {{FIRST_NAME}}!</h1>
    <p>Thank you for joining {{COMPANY_NAME}}.</p>
  `,
  variables: ['FIRST_NAME', 'COMPANY_NAME']
};

// Send campaign with variables
const campaign = await automation.sendAutomatedCampaign({
  name: 'Welcome Campaign',
  subject: 'Welcome to IOC Framework!',
  template: 'Welcome Template',
  mailingList: 'demo-list',
  variables: {
    'FIRST_NAME': 'John',
    'COMPANY_NAME': 'IOC Framework'
  }
});
```

## 📈 Analytics and Reporting

### Campaign Analytics

```typescript
// Get comprehensive analytics
const analytics = await automation.getCampaignAnalytics(campaignKey);

console.log('Performance:', analytics.performance);
console.log('Stats:', analytics.stats);
console.log('Reports:', analytics.reports);
```

### Real-time Monitoring

```typescript
// Start real-time monitoring
await automation.startCampaignMonitoring(campaignKey, 5); // Check every 5 minutes

// Listen for updates
automation.on('campaignMonitorUpdate', (data) => {
  console.log('Campaign Update:', data.analytics);
});

// Stop monitoring
automation.stopCampaignMonitoring(campaignKey);
```

## 🔧 Advanced Configuration

### Rate Limiting

```typescript
const service = new CampaignAutomationService({
  // ... other config
  rateLimit: {
    requestsPerMinute: 100,
    burstSize: 10
  }
});
```

### Error Handling

```typescript
// Event-based error handling
service.on('authenticationError', (error) => {
  console.error('Auth error:', error);
  // Implement token refresh logic
});

service.on('rateLimitHit', (error) => {
  console.warn('Rate limit hit:', error);
  // Implement backoff logic
});
```

### Custom Templates

```typescript
// Create custom template
const customTemplate = {
  name: 'Custom Newsletter',
  subject: 'Monthly Update from {{COMPANY_NAME}}',
  htmlContent: `
    <html>
      <body>
        <h1>{{COMPANY_NAME}} Newsletter</h1>
        <p>Dear {{FIRST_NAME}},</p>
        <div>{{CONTENT}}</div>
        <p>Best regards,<br>The {{COMPANY_NAME}} Team</p>
      </body>
    </html>
  `,
  variables: ['COMPANY_NAME', 'FIRST_NAME', 'CONTENT']
};

const template = await automation.createTemplate(customTemplate);
```

## 🚀 Production Deployment

### Docker Deployment

```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
RUN npm run build
CMD ["npm", "start"]
```

### Environment Variables for Production

```env
NODE_ENV=production
ZOHO_CAMPAIGNS_CLIENT_ID=your_prod_client_id
ZOHO_CAMPAIGNS_CLIENT_SECRET=your_prod_client_secret
ZOHO_CAMPAIGNS_REFRESH_TOKEN=your_prod_refresh_token
ZOHO_CAMPAIGNS_ACCESS_TOKEN=your_prod_access_token
ZOHO_REGION=com

# Company info
COMPANY_NAME=Your Company
COMPANY_EMAIL=admin@yourcompany.com
COMPANY_ADDRESS=Your Address

# Rate limiting
MAX_REQUESTS_PER_MINUTE=100
BURST_SIZE=10

# Monitoring
LOG_LEVEL=info
ENABLE_EMAIL_AUTOMATION=true
ENABLE_REAL_TIME_SYNC=true
```

### Health Checks

```typescript
// Health check endpoint
app.get('/health', async (req, res) => {
  try {
    const healthy = await automationService.getClient().healthCheck();
    const metrics = automationService.getClient().getMetrics();
    
    res.json({
      status: healthy ? 'healthy' : 'unhealthy',
      timestamp: new Date().toISOString(),
      metrics: {
        totalRequests: metrics.totalRequests,
        successRate: metrics.successfulRequests / metrics.totalRequests,
        averageResponseTime: metrics.averageResponseTime
      }
    });
  } catch (error) {
    res.status(500).json({ status: 'error', error: error.message });
  }
});
```

## 🔍 Troubleshooting

### Common Issues

1. **Authentication Errors**
   - Check client ID, secret, and tokens
   - Verify token expiration
   - Ensure correct region setting

2. **Rate Limiting**
   - Check rate limit settings
   - Implement proper backoff logic
   - Monitor rate limit status

3. **Campaign Creation Failures**
   - Verify mailing list exists
   - Check template validity
   - Ensure sender email is verified

4. **Delivery Issues**
   - Check recipient email validity
   - Verify sender reputation
   - Monitor bounce rates

### Debug Mode

```typescript
// Enable debug logging
const monitor = new ZohoCampaignsMonitor({
  logLevel: 'debug',
  enableConsoleLogging: true
});

// Enable debug in client
const service = new CampaignAutomationService({
  // ... config
  debug: true
});
```

## 📚 API Reference

### ZohoCampaignsClient

Core API client with all Zoho Campaigns endpoints.

#### Methods

- `createCampaign(data)` - Create new campaign
- `sendCampaign(key)` - Send campaign
- `getCampaigns(params)` - Get campaigns
- `createMailingList(data)` - Create mailing list
- `addContact(listKey, contact)` - Add contact to list
- `createTemplate(data)` - Create email template
- `getCampaignStats(key)` - Get campaign statistics

### CampaignAutomationService

High-level automation service for complex workflows.

#### Methods

- `quickSetup(options)` - Quick setup with defaults
- `sendAutomatedCampaign(config)` - Send single campaign
- `executeAutomationSequence(sequence)` - Execute campaign sequence
- `getCampaignAnalytics(key)` - Get detailed analytics
- `startCampaignMonitoring(key)` - Start real-time monitoring

### ZohoCampaignsMonitor

Monitoring and alerting system.

#### Methods

- `info(category, message, data)` - Log info message
- `error(category, message, error)` - Log error
- `recordMetric(metric, value)` - Record metric
- `addAlert(config)` - Add custom alert
- `generateDailyReport()` - Generate daily report

## 📄 License

MIT License - see LICENSE file for details.

## 🤝 Contributing

1. Fork the repository
2. Create feature branch
3. Make changes
4. Add tests
5. Submit pull request

## 📞 Support

For support and questions:
- Email: support@iocframework.com
- Documentation: https://iocframework.com/docs
- GitHub Issues: https://github.com/iocframework/zoho-campaigns

---

**Built with ❤️ by the IOC Framework Team**