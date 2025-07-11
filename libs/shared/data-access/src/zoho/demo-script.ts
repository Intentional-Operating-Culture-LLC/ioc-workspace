#!/usr/bin/env node

/**
 * Zoho Campaigns Demo Script
 * Demonstrates all functionality with demo users
 */

import { 
  createDemoService, 
  createAutomationService, 
  ZohoCampaignsTestSuite,
  ZohoCampaignsMonitor,
  zohoConfig 
} from './index';

import { writeFileSync } from 'fs';
import { join } from 'path';

// Demo configuration
const DEMO_CONFIG = {
  demoUsers: ['demo_user001@iocframework.com', 'demo_user002@iocframework.com'],
  enableRealSending: process.env.ENABLE_REAL_SENDING === 'true',
  enableMonitoring: true,
  testTimeout: 60, // 1 minute timeout
  skipCleanup: process.env.SKIP_CLEANUP === 'true'
};

async function main() {
  console.log('🚀 Starting Zoho Campaigns Demo Script');
  console.log('=====================================');

  // Check configuration
  const configStatus = zohoConfig.getConfigStatus();
  console.log('\n📋 Configuration Status:');
  console.log(`   Valid: ${configStatus.isValid}`);
  console.log(`   Has Credentials: ${configStatus.hasCredentials}`);
  console.log(`   Region: ${configStatus.region}`);
  console.log(`   Company: ${configStatus.company}`);
  console.log(`   Email: ${configStatus.email}`);
  console.log(`   Automation Enabled: ${configStatus.automationEnabled}`);
  console.log(`   Rate Limit: ${configStatus.rateLimit.requestsPerMinute}/min`);

  if (!configStatus.isValid) {
    console.error('❌ Invalid configuration. Please check your Zoho Campaigns credentials.');
    process.exit(1);
  }

  // Initialize services
  console.log('\n🔧 Initializing Services...');
  const automationService = createDemoService();
  const monitor = new ZohoCampaignsMonitor({
    logLevel: 'info',
    enableConsoleLogging: true,
    enableFileLogging: true
  });

  // Setup monitoring
  setupMonitoring(monitor);

  try {
    // Run demo scenarios
    await runQuickSetupDemo(automationService, monitor);
    await runCampaignDemo(automationService, monitor);
    await runAutomationDemo(automationService, monitor);
    
    // Run comprehensive tests
    if (process.env.RUN_TESTS === 'true') {
      await runTestSuite(monitor);
    }

  } catch (error) {
    console.error('❌ Demo failed:', error);
    monitor.error('DEMO', 'Demo script failed', error instanceof Error ? error : new Error(String(error)));
  } finally {
    // Cleanup
    await automationService.destroy();
    await monitor.destroy();
    console.log('\n✅ Demo completed successfully!');
  }
}

function setupMonitoring(monitor: ZohoCampaignsMonitor) {
  console.log('📊 Setting up monitoring...');

  monitor.on('log', (entry) => {
    if (entry.level === 'error') {
      console.error(`🔴 ${entry.category}: ${entry.message}`);
    } else if (entry.level === 'warn') {
      console.warn(`🟡 ${entry.category}: ${entry.message}`);
    }
  });

  monitor.on('alertTriggered', (alert) => {
    console.warn(`🚨 ALERT: ${alert.alert.name} - ${alert.status.currentValue}`);
  });

  monitor.on('alertResolved', (alert) => {
    console.log(`✅ RESOLVED: ${alert.alert.name}`);
  });
}

async function runQuickSetupDemo(automationService: any, monitor: ZohoCampaignsMonitor) {
  console.log('\n🎯 Demo 1: Quick Setup');
  console.log('=====================');

  monitor.info('DEMO', 'Starting quick setup demo');

  try {
    const setupResult = await automationService.quickSetup({
      listName: 'IOC Framework Demo List',
      contactEmails: DEMO_CONFIG.demoUsers,
      welcomeTemplate: {
        name: 'Demo Welcome',
        subject: 'Welcome to IOC Framework Demo!',
        htmlContent: `
          <html>
            <body>
              <h1>Welcome to IOC Framework!</h1>
              <p>Dear [[FIRST_NAME]],</p>
              <p>Thank you for joining our demo! This email was sent automatically using our Zoho Campaigns integration.</p>
              <p>Features demonstrated:</p>
              <ul>
                <li>Automated list creation</li>
                <li>Contact management</li>
                <li>Template creation</li>
                <li>Email sending</li>
              </ul>
              <p>Best regards,<br>The IOC Framework Team</p>
            </body>
          </html>
        `,
        variables: ['FIRST_NAME']
      }
    });

    console.log('✅ Quick setup completed!');
    console.log(`   📋 Mailing List: ${setupResult.mailingList.listname}`);
    console.log(`   📧 Templates: ${setupResult.templates.length}`);
    console.log(`   👥 Contacts: ${setupResult.contacts.length}`);

    monitor.info('DEMO', 'Quick setup completed successfully', setupResult);

    return setupResult;

  } catch (error) {
    console.error('❌ Quick setup failed:', error);
    monitor.error('DEMO', 'Quick setup failed', error instanceof Error ? error : new Error(String(error)));
    throw error;
  }
}

async function runCampaignDemo(automationService: any, monitor: ZohoCampaignsMonitor) {
  console.log('\n📧 Demo 2: Campaign Creation and Sending');
  console.log('=======================================');

  monitor.info('DEMO', 'Starting campaign demo');

  try {
    // Get mailing lists
    const lists = await automationService.getClient().getMailingLists();
    if (lists.length === 0) {
      throw new Error('No mailing lists available. Run quick setup first.');
    }

    const testList = lists[0];

    // Create campaign
    const campaignResult = await automationService.sendAutomatedCampaign({
      name: 'IOC Framework Demo Campaign',
      subject: 'Live Demo: IOC Framework Email Automation',
      template: 'Demo Welcome',
      mailingList: testList.listkey,
      testEmails: DEMO_CONFIG.demoUsers,
      variables: {
        'FIRST_NAME': 'Demo User',
        'COMPANY_NAME': 'IOC Framework'
      }
    });

    console.log('✅ Campaign created and sent!');
    console.log(`   🎯 Campaign Key: ${campaignResult.campaignKey}`);
    console.log(`   📤 Status: ${campaignResult.message}`);

    // Wait for delivery and get analytics
    console.log('\n📊 Waiting for delivery analytics...');
    await new Promise(resolve => setTimeout(resolve, 15000)); // Wait 15 seconds

    const analytics = await automationService.getCampaignAnalytics(campaignResult.campaignKey);
    console.log('📈 Campaign Analytics:');
    console.log(`   📧 Total Recipients: ${analytics.stats.totalRecipients || 0}`);
    console.log(`   ✅ Delivered: ${analytics.stats.deliveredCount || 0}`);
    console.log(`   👀 Opened: ${analytics.stats.openCount || 0}`);
    console.log(`   🔗 Clicked: ${analytics.stats.clickCount || 0}`);
    console.log(`   📊 Delivery Rate: ${analytics.performance.deliveryRate || 0}%`);

    monitor.info('DEMO', 'Campaign demo completed successfully', {
      campaignKey: campaignResult.campaignKey,
      analytics
    });

    return campaignResult;

  } catch (error) {
    console.error('❌ Campaign demo failed:', error);
    monitor.error('DEMO', 'Campaign demo failed', error instanceof Error ? error : new Error(String(error)));
    throw error;
  }
}

async function runAutomationDemo(automationService: any, monitor: ZohoCampaignsMonitor) {
  console.log('\n🤖 Demo 3: Automation Sequence');
  console.log('==============================');

  monitor.info('DEMO', 'Starting automation sequence demo');

  try {
    // Get mailing lists
    const lists = await automationService.getClient().getMailingLists();
    if (lists.length === 0) {
      throw new Error('No mailing lists available. Run quick setup first.');
    }

    const testList = lists[0];

    // Create automation sequence
    const sequence = {
      id: 'demo-sequence-001',
      name: 'IOC Framework Demo Sequence',
      triggerType: 'immediate' as const,
      triggerData: {},
      campaigns: [
        {
          name: 'Welcome Email',
          subject: 'Welcome to IOC Framework!',
          template: 'Demo Welcome',
          mailingList: testList.listkey,
          testEmails: DEMO_CONFIG.demoUsers,
          variables: {
            'FIRST_NAME': 'Demo User',
            'COMPANY_NAME': 'IOC Framework'
          }
        },
        {
          name: 'Follow-up Email',
          subject: 'IOC Framework Features Overview',
          template: 'Demo Welcome', // Reusing template for demo
          mailingList: testList.listkey,
          testEmails: DEMO_CONFIG.demoUsers,
          variables: {
            'FIRST_NAME': 'Demo User',
            'COMPANY_NAME': 'IOC Framework'
          }
        }
      ],
      delays: [0, 2], // Second email after 2 minutes
      enabled: true
    };

    console.log('🚀 Executing automation sequence...');
    console.log(`   📋 Sequence: ${sequence.name}`);
    console.log(`   📧 Campaigns: ${sequence.campaigns.length}`);
    console.log(`   ⏱️ Delays: ${sequence.delays.join(', ')} minutes`);

    const report = await automationService.executeAutomationSequence(sequence);

    console.log('✅ Automation sequence completed!');
    console.log(`   📊 Total Campaigns: ${report.totalCampaigns}`);
    console.log(`   ✅ Successful: ${report.successfulCampaigns}`);
    console.log(`   ❌ Failed: ${report.failedCampaigns}`);
    console.log(`   ⏱️ Duration: ${report.duration}ms`);

    monitor.info('DEMO', 'Automation sequence completed successfully', report);

    return report;

  } catch (error) {
    console.error('❌ Automation demo failed:', error);
    monitor.error('DEMO', 'Automation demo failed', error instanceof Error ? error : new Error(String(error)));
    throw error;
  }
}

async function runTestSuite(monitor: ZohoCampaignsMonitor) {
  console.log('\n🧪 Demo 4: Comprehensive Test Suite');
  console.log('===================================');

  monitor.info('DEMO', 'Starting comprehensive test suite');

  try {
    const testSuite = new ZohoCampaignsTestSuite({
      ...DEMO_CONFIG,
      enableRealSending: DEMO_CONFIG.enableRealSending
    });

    console.log('🔍 Running comprehensive tests...');
    console.log('   (This may take several minutes)');

    const results = await testSuite.runAllTests();

    console.log('\n📊 Test Results:');
    console.log(`   📋 Total Tests: ${results.summary.total}`);
    console.log(`   ✅ Passed: ${results.summary.passed}`);
    console.log(`   ❌ Failed: ${results.summary.failed}`);
    console.log(`   ⏱️ Duration: ${results.summary.duration}ms`);

    // Show failed tests
    const failedTests = results.tests.filter(test => !test.success);
    if (failedTests.length > 0) {
      console.log('\n❌ Failed Tests:');
      failedTests.forEach(test => {
        console.log(`   - ${test.testName}: ${test.message}`);
      });
    }

    // Save detailed results
    const resultsPath = join(process.cwd(), 'zoho-campaigns-test-results.json');
    writeFileSync(resultsPath, JSON.stringify(results, null, 2));
    console.log(`\n💾 Detailed results saved to: ${resultsPath}`);

    monitor.info('DEMO', 'Test suite completed', results.summary);

    await testSuite.destroy();
    return results;

  } catch (error) {
    console.error('❌ Test suite failed:', error);
    monitor.error('DEMO', 'Test suite failed', error instanceof Error ? error : new Error(String(error)));
    throw error;
  }
}

// Run the demo
if (require.main === module) {
  main().catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
}

export { main as runDemo };