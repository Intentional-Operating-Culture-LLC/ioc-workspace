#!/usr/bin/env node

/**
 * Zoho Campaigns API Client - Example Usage
 * Demonstrates all major features with production-ready code
 */

import {
  createAutomationService,
  createDemoService,
  ZohoCampaignsClient,
  CampaignAutomationService,
  ZohoCampaignsMonitor,
  ZohoCampaignsTestSuite,
  zohoConfig
} from './index';

// Example 1: Basic Client Usage
async function basicClientExample() {
  console.log('🔧 Example 1: Basic Client Usage');
  console.log('================================\n');

  // Create client with configuration
  const client = new ZohoCampaignsClient({
    clientId: 'your_client_id',
    clientSecret: 'your_client_secret',
    refreshToken: 'your_refresh_token',
    accessToken: 'your_access_token',
    region: 'com'
  });

  try {
    // Get account information
    const account = await client.getAccountDetails();
    console.log('Account:', account);

    // Create a mailing list
    const mailingList = await client.createMailingList({
      listName: 'Example List',
      description: 'An example mailing list'
    });
    console.log('Created list:', mailingList.listname);

    // Add contacts to the list
    await client.addContact(mailingList.listkey, {
      email: 'example@example.com',
      firstName: 'Example',
      lastName: 'User'
    });
    console.log('Added contact to list');

    // Create an email template
    const template = await client.createTemplate({
      templateName: 'Example Template',
      subject: 'Welcome to our service!',
      htmlContent: '<h1>Welcome!</h1><p>Thank you for joining us.</p>'
    });
    console.log('Created template:', template.templatename);

    // Create and send campaign
    const campaign = await client.createCampaign({
      campaignName: 'Example Campaign',
      subject: 'Welcome to our service!',
      fromEmail: 'noreply@example.com',
      fromName: 'Example Company',
      replyTo: 'support@example.com',
      mailingList: mailingList.listkey,
      template: template.templatekey
    });
    console.log('Created campaign:', campaign.campaignname);

    // Send campaign
    await client.sendCampaign(campaign.campaignkey);
    console.log('Campaign sent successfully');

    // Get campaign statistics
    const stats = await client.getCampaignStats(campaign.campaignkey);
    console.log('Campaign stats:', stats);

  } catch (error) {
    console.error('Error:', error instanceof Error ? error.message : String(error));
  } finally {
    client.destroy();
  }
}

// Example 2: Automation Service Usage
async function automationServiceExample() {
  console.log('\n🤖 Example 2: Automation Service Usage');
  console.log('======================================\n');

  // Create automation service (loads config automatically)
  const service = createAutomationService();

  try {
    // Quick setup with default templates
    const setup = await service.quickSetup({
      listName: 'Automated Demo List',
      contactEmails: ['demo@example.com', 'test@example.com']
    });
    console.log('Quick setup completed:', setup.mailingList.listname);

    // Send automated campaign
    const campaignResult = await service.sendAutomatedCampaign({
      name: 'Automated Welcome Campaign',
      subject: 'Welcome to our automated service!',
      template: 'Demo Welcome',
      mailingList: setup.mailingList.listkey,
      testEmails: ['demo@example.com'],
      variables: {
        'FIRST_NAME': 'Demo User',
        'COMPANY_NAME': 'Example Company'
      }
    });
    console.log('Automated campaign sent:', campaignResult.campaignKey);

    // Create automation sequence
    const sequence = {
      id: 'welcome-sequence-001',
      name: 'Welcome Email Sequence',
      triggerType: 'immediate' as const,
      triggerData: {},
      campaigns: [
        {
          name: 'Welcome Email',
          subject: 'Welcome to Example Company!',
          template: 'Demo Welcome',
          mailingList: setup.mailingList.listkey,
          variables: {
            'FIRST_NAME': 'Demo User',
            'COMPANY_NAME': 'Example Company'
          }
        },
        {
          name: 'Follow-up Email',
          subject: 'Getting started with Example Company',
          template: 'Demo Welcome',
          mailingList: setup.mailingList.listkey,
          variables: {
            'FIRST_NAME': 'Demo User',
            'COMPANY_NAME': 'Example Company'
          }
        }
      ],
      delays: [0, 1440], // Second email after 24 hours
      enabled: true
    };

    // Execute automation sequence
    const report = await service.executeAutomationSequence(sequence);
    console.log('Automation sequence completed:', report);

    // Get campaign analytics
    const analytics = await service.getCampaignAnalytics(campaignResult.campaignKey);
    console.log('Campaign analytics:', analytics.performance);

  } catch (error) {
    console.error('Error:', error instanceof Error ? error.message : String(error));
  } finally {
    await service.destroy();
  }
}

// Example 3: Monitoring and Alerting
async function monitoringExample() {
  console.log('\n📊 Example 3: Monitoring and Alerting');
  console.log('======================================\n');

  // Create monitoring instance
  const monitor = new ZohoCampaignsMonitor({
    logLevel: 'info',
    enableConsoleLogging: true,
    enableFileLogging: true,
    enableMetrics: true,
    enableAlerts: true
  });

  // Setup event listeners
  monitor.on('log', (entry) => {
    if (entry.level === 'error') {
      console.log(`🔴 Error: ${entry.message}`);
    }
  });

  monitor.on('alertTriggered', (alert) => {
    console.log(`🚨 Alert: ${alert.alert.name} triggered`);
  });

  monitor.on('alertResolved', (alert) => {
    console.log(`✅ Alert: ${alert.alert.name} resolved`);
  });

  // Log some events
  monitor.info('EXAMPLE', 'Starting monitoring example');
  monitor.warn('EXAMPLE', 'This is a warning message');
  monitor.error('EXAMPLE', 'This is an error message');

  // Record metrics
  monitor.recordMetric('example_metric', 100);
  monitor.recordMetric('bounce_rate', 2.5);
  monitor.recordMetric('delivery_rate', 98.5);

  // Add custom alert
  monitor.addAlert({
    id: 'example-alert',
    name: 'Example Alert',
    type: 'threshold',
    metric: 'bounce_rate',
    condition: 'gt',
    threshold: 5.0,
    timeWindow: 10,
    enabled: true,
    notifications: {
      email: ['admin@example.com']
    }
  });

  // Generate report
  const report = monitor.generateDailyReport();
  console.log('Daily report:', report.summary);

  // Get alert status
  const alertStatus = monitor.getAlertStatus();
  console.log('Alert status:', alertStatus);

  // Cleanup
  await monitor.destroy();
}

// Example 4: Testing Suite
async function testingSuiteExample() {
  console.log('\n🧪 Example 4: Testing Suite');
  console.log('============================\n');

  // Create test suite
  const testSuite = new ZohoCampaignsTestSuite({
    demoUsers: ['demo_user001@example.com', 'demo_user002@example.com'],
    testListName: 'Example Test List',
    enableRealSending: false, // Set to true for real email tests
    enableMonitoring: true,
    testTimeout: 30,
    skipCleanup: false
  });

  try {
    // Run all tests
    const results = await testSuite.runAllTests();
    
    console.log('Test Results Summary:');
    console.log(`Total: ${results.summary.total}`);
    console.log(`Passed: ${results.summary.passed}`);
    console.log(`Failed: ${results.summary.failed}`);
    console.log(`Duration: ${results.summary.duration}ms`);

    // Show failed tests
    const failedTests = results.tests.filter(test => !test.success);
    if (failedTests.length > 0) {
      console.log('\nFailed Tests:');
      failedTests.forEach(test => {
        console.log(`- ${test.testName}: ${test.message}`);
      });
    }

  } catch (error) {
    console.error('Test suite error:', error instanceof Error ? error.message : String(error));
  } finally {
    await testSuite.destroy();
  }
}

// Example 5: Configuration Management
async function configurationExample() {
  console.log('\n⚙️ Example 5: Configuration Management');
  console.log('======================================\n');

  // Check configuration status
  const configStatus = zohoConfig.getConfigStatus();
  console.log('Configuration Status:');
  console.log(`Valid: ${configStatus.isValid}`);
  console.log(`Has Credentials: ${configStatus.hasCredentials}`);
  console.log(`Region: ${configStatus.region}`);
  console.log(`Company: ${configStatus.company}`);
  console.log(`Email: ${configStatus.email}`);

  // Get different configurations
  const clientConfig = zohoConfig.getCampaignsClientConfig();
  console.log('Client config region:', clientConfig.region);

  const automationConfig = zohoConfig.getAutomationConfig();
  console.log('Automation config company:', automationConfig.companyName);

  const demoConfig = zohoConfig.getDemoConfig();
  console.log('Demo config rate limit:', demoConfig.rateLimit);

  // Create services with different configs
  const productionService = createAutomationService();
  const demoService = createDemoService();

  console.log('Production service created');
  console.log('Demo service created');

  // Cleanup
  await productionService.destroy();
  await demoService.destroy();
}

// Example 6: Advanced Campaign Features
async function advancedCampaignExample() {
  console.log('\n🚀 Example 6: Advanced Campaign Features');
  console.log('=========================================\n');

  const service = createDemoService();

  try {
    // Create custom template with variables
    const customTemplate = await service.createTemplate({
      name: 'Advanced Custom Template',
      subject: 'Welcome {{FIRST_NAME}} to {{COMPANY_NAME}}!',
      htmlContent: `
        <html>
          <body>
            <h1>Welcome {{FIRST_NAME}}!</h1>
            <p>Thank you for joining {{COMPANY_NAME}}. Here's what you can expect:</p>
            <ul>
              <li>{{FEATURE_1}}</li>
              <li>{{FEATURE_2}}</li>
              <li>{{FEATURE_3}}</li>
            </ul>
            <p>Visit our website: <a href="{{WEBSITE_URL}}">{{WEBSITE_URL}}</a></p>
            <p>Best regards,<br>The {{COMPANY_NAME}} Team</p>
          </body>
        </html>
      `,
      variables: ['FIRST_NAME', 'COMPANY_NAME', 'FEATURE_1', 'FEATURE_2', 'FEATURE_3', 'WEBSITE_URL']
    });

    // Create mailing list with custom settings
    const mailingList = await service.createSmartMailingList({
      listName: 'Advanced Demo List',
      description: 'Advanced demo with custom settings',
      confirmationSubject: 'Please confirm your subscription to {{COMPANY_NAME}}',
      confirmationMessage: 'Thank you for subscribing to {{COMPANY_NAME}}!'
    });

    // Add contacts with custom fields
    await service.addContactsToList(mailingList.listkey, [
      {
        email: 'advanced_demo@example.com',
        firstName: 'Advanced',
        lastName: 'Demo',
        customFields: {
          'Company': 'Example Corp',
          'Role': 'Manager',
          'Industry': 'Technology',
          'Plan': 'Premium'
        }
      }
    ]);

    // Send campaign with advanced variables
    const campaignResult = await service.sendAutomatedCampaign({
      name: 'Advanced Demo Campaign',
      subject: 'Welcome to our advanced features!',
      template: 'Advanced Custom Template',
      mailingList: mailingList.listkey,
      testEmails: ['advanced_demo@example.com'],
      variables: {
        'FIRST_NAME': 'Advanced',
        'COMPANY_NAME': 'Example Corp',
        'FEATURE_1': 'Advanced Analytics',
        'FEATURE_2': 'Real-time Monitoring',
        'FEATURE_3': 'Automated Workflows',
        'WEBSITE_URL': 'https://example.com'
      }
    });

    console.log('Advanced campaign sent:', campaignResult.campaignKey);

    // Start real-time monitoring
    await service.startCampaignMonitoring(campaignResult.campaignKey, 1);

    // Listen for monitoring updates
    service.on('campaignMonitorUpdate', (data: any) => {
      console.log('Campaign monitoring update:', data.analytics.performance);
    });

    // Wait for some updates
    await new Promise(resolve => setTimeout(resolve, 5000));

    // Stop monitoring
    service.stopCampaignMonitoring(campaignResult.campaignKey);

    // Get detailed analytics
    const analytics = await service.getCampaignAnalytics(campaignResult.campaignKey);
    console.log('Advanced analytics:', analytics);

  } catch (error) {
    console.error('Advanced campaign error:', error instanceof Error ? error.message : String(error));
  } finally {
    await service.destroy();
  }
}

// Main function to run all examples
async function main() {
  console.log('🎯 Zoho Campaigns API Client - Example Usage');
  console.log('=============================================\n');

  const examples = [
    { name: 'Basic Client Usage', fn: basicClientExample },
    { name: 'Automation Service', fn: automationServiceExample },
    { name: 'Monitoring & Alerting', fn: monitoringExample },
    { name: 'Testing Suite', fn: testingSuiteExample },
    { name: 'Configuration Management', fn: configurationExample },
    { name: 'Advanced Campaign Features', fn: advancedCampaignExample }
  ];

  const runExample = process.argv[2];

  if (runExample) {
    const example = examples.find(ex => ex.name.toLowerCase().includes(runExample.toLowerCase()));
    if (example) {
      console.log(`Running example: ${example.name}`);
      await example.fn();
      return;
    } else {
      console.log(`Example "${runExample}" not found.`);
      console.log('Available examples:');
      examples.forEach((ex, i) => {
        console.log(`${i + 1}. ${ex.name}`);
      });
      return;
    }
  }

  // Run all examples
  for (const example of examples) {
    try {
      await example.fn();
      console.log(`✅ ${example.name} completed successfully\n`);
    } catch (error) {
      console.log(`❌ ${example.name} failed: ${error instanceof Error ? error.message : String(error)}\n`);
    }
  }

  console.log('🎉 All examples completed!');
}

// Run examples if called directly
if (require.main === module) {
  main().catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
}

export {
  basicClientExample,
  automationServiceExample,
  monitoringExample,
  testingSuiteExample,
  configurationExample,
  advancedCampaignExample
};