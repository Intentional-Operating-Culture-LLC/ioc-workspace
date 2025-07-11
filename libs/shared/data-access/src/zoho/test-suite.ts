/**
 * Zoho Campaigns Test Suite
 * Comprehensive testing for email campaigns with demo users
 */
import CampaignAutomationService from './campaign-automation';
import type { zoho } from "@ioc/shared/types";
type CampaignConfig = zoho.CampaignConfig;
type EmailTemplate = zoho.EmailTemplate;
import ZohoCampaignsClient from './campaigns-client';
import ZohoCampaignsMonitor from './monitoring';
import { createDemoService, createAutomationService } from './config';
export interface TestConfig {
    demoUsers: string[];
    testListName: string;
    testTemplates: EmailTemplate[];
    enableRealSending: boolean;
    enableMonitoring: boolean;
    testTimeout: number; // seconds
    retryAttempts: number;
    skipCleanup: boolean;
}
export interface TestResult {
    testName: string;
    success: boolean;
    duration: number;
    message: string;
    data?: any;
    errors?: any[];
}
export interface TestSuite {
    name: string;
    tests: TestResult[];
    summary: {
        total: number;
        passed: number;
        failed: number;
        skipped: number;
        duration: number;
    };
    startTime: Date;
    endTime: Date;
}
export class ZohoCampaignsTestSuite {
    private automationService: CampaignAutomationService;
    private client: ZohoCampaignsClient;
    private monitor: ZohoCampaignsMonitor | null = null;
    private config: TestConfig;
    private results: TestResult[] = [];
    private testListKey: string = '';
    private createdTemplates: any[] = [];
    private createdCampaigns: any[] = [];
    constructor(config: Partial<TestConfig> = {}) {
        this.config = {
            demoUsers: ['demo_user001@iocframework.com', 'demo_user002@iocframework.com'],
            testListName: 'IOC Demo Test List',
            testTemplates: this.getDefaultTestTemplates(),
            enableRealSending: false,
            enableMonitoring: true,
            testTimeout: 30,
            retryAttempts: 2,
            skipCleanup: false,
            ...config
        };
        this.automationService = createDemoService();
        this.client = this.automationService.getClient();
        if (this.config.enableMonitoring) {
            this.monitor = new ZohoCampaignsMonitor();
            this.setupMonitoring();
        }
    }
    private setupMonitoring(): void {
        if (!this.monitor)
            return;
        this.monitor.info('TEST_SUITE', 'Test suite monitoring initialized');
        // Monitor automation service events
        this.automationService.on('campaignSent', (result) => {
            this.monitor?.info('CAMPAIGN', 'Campaign sent successfully', result);
        });
        this.automationService.on('campaignError', (error) => {
            this.monitor?.error('CAMPAIGN', 'Campaign failed', error);
        });
        this.automationService.on('rateLimitHit', (error) => {
            this.monitor?.warn('RATE_LIMIT', 'Rate limit hit', error);
        });
    }
    // ========== TEST EXECUTION ==========
    /**
     * Run all tests
     */
    public async runAllTests(): Promise<TestSuite> {
        const suite: TestSuite = {
            name: 'Zoho Campaigns Complete Test Suite',
            tests: [],
            summary: {
                total: 0,
                passed: 0,
                failed: 0,
                skipped: 0,
                duration: 0
            },
            startTime: new Date(),
            endTime: new Date()
        };
        this.monitor?.info('TEST_SUITE', 'Starting comprehensive test suite');
        try {
            // Setup tests
            await this.runTest('setup', this.setupTestEnvironment.bind(this));
            // Basic API tests
            await this.runTest('api-health-check', this.testApiHealthCheck.bind(this));
            await this.runTest('authentication', this.testAuthentication.bind(this));
            await this.runTest('rate-limiting', this.testRateLimiting.bind(this));
            // List management tests
            await this.runTest('create-mailing-list', this.testCreateMailingList.bind(this));
            await this.runTest('add-contacts', this.testAddContacts.bind(this));
            await this.runTest('manage-contacts', this.testManageContacts.bind(this));
            // Template management tests
            await this.runTest('create-templates', this.testCreateTemplates.bind(this));
            await this.runTest('manage-templates', this.testManageTemplates.bind(this));
            // Campaign tests
            await this.runTest('create-campaign', this.testCreateCampaign.bind(this));
            await this.runTest('send-test-emails', this.testSendTestEmails.bind(this));
            if (this.config.enableRealSending) {
                await this.runTest('send-real-campaign', this.testSendRealCampaign.bind(this));
                await this.runTest('track-delivery', this.testTrackDelivery.bind(this));
                await this.runTest('analyze-performance', this.testAnalyzePerformance.bind(this));
            }
            // Automation tests
            await this.runTest('automation-sequence', this.testAutomationSequence.bind(this));
            await this.runTest('monitoring-system', this.testMonitoringSystem.bind(this));
            // Error handling tests
            await this.runTest('error-handling', this.testErrorHandling.bind(this));
            await this.runTest('retry-logic', this.testRetryLogic.bind(this));
            // Integration tests
            await this.runTest('full-workflow', this.testFullWorkflow.bind(this));
            // Cleanup
            if (!this.config.skipCleanup) {
                await this.runTest('cleanup', this.cleanupTestEnvironment.bind(this));
            }
        }
        catch (error) {
            this.monitor?.error('TEST_SUITE', 'Test suite failed', error instanceof Error ? error : new Error(String(error)));
        }
        suite.endTime = new Date();
        const duration = suite.endTime.getTime() - suite.startTime.getTime();
        suite.tests = this.results;
        // Calculate summary
        suite.summary.total = this.results.length;
        suite.summary.passed = this.results.filter(r => r.success).length;
        suite.summary.failed = this.results.filter(r => !r.success).length;
        suite.summary.skipped = 0;
        suite.summary.duration = duration;
        this.monitor?.info('TEST_SUITE', 'Test suite completed', {
            summary: suite.summary,
            duration: suite.summary.duration
        });
        return suite;
    }
    /**
     * Run a single test with monitoring and error handling
     */
    private async runTest(testName: string, testFunction: () => Promise<any>): Promise<void> {
        const startTime = Date.now();
        const result: TestResult = {
            testName,
            success: false,
            duration: 0,
            message: '',
            data: null,
            errors: []
        };
        this.monitor?.info('TEST', `Starting test: ${testName}`);
        try {
            // Set timeout
            const timeoutPromise = new Promise((_, reject) => {
                setTimeout(() => reject(new Error(`Test timeout after ${this.config.testTimeout}s`)), this.config.testTimeout * 1000);
            });
            // Run test with timeout
            const testPromise = testFunction();
            const testData = await Promise.race([testPromise, timeoutPromise]);
            result.success = true;
            result.message = `Test ${testName} passed`;
            result.data = testData;
            this.monitor?.info('TEST', `Test passed: ${testName}`, { duration: Date.now() - startTime });
        }
        catch (error) {
            result.success = false;
            result.message = `Test ${testName} failed: ${error instanceof Error ? error.message : String(error)}`;
            result.errors = [error];
            this.monitor?.error('TEST', `Test failed: ${testName}`, error instanceof Error ? error : new Error(String(error)));
        }
        result.duration = Date.now() - startTime;
        this.results.push(result);
    }
    // ========== SETUP AND CLEANUP ==========
    private async setupTestEnvironment(): Promise<any> {
        this.monitor?.info('TEST_SETUP', 'Setting up test environment');
        // Verify configuration
        const configStatus = this.automationService.getConfig();
        if (!configStatus.clientId) {
            throw new Error('Missing Zoho Campaigns client ID');
        }
        // Test basic connectivity
        const healthy = await this.client.healthCheck();
        if (!healthy) {
            this.monitor?.warn('TEST_SETUP', 'Health check failed, but continuing with tests');
        }
        return { configStatus, healthy };
    }
    private async cleanupTestEnvironment(): Promise<any> {
        this.monitor?.info('TEST_CLEANUP', 'Cleaning up test environment');
        const cleanupResults = {
            campaigns: 0,
            templates: 0,
            lists: 0,
            errors: [] as Array<{
                type: string;
                id: string;
                error: string;
            }>
        };
        // Cleanup campaigns
        for (const campaign of this.createdCampaigns) {
            try {
                await this.client.deleteCampaign(campaign.campaignkey);
                cleanupResults.campaigns++;
            }
            catch (error) {
                cleanupResults.errors.push({ type: 'campaign', id: campaign.campaignkey, error: error instanceof Error ? error.message : String(error) });
            }
        }
        // Cleanup templates
        for (const template of this.createdTemplates) {
            try {
                await this.client.deleteTemplate(template.templatekey);
                cleanupResults.templates++;
            }
            catch (error) {
                cleanupResults.errors.push({ type: 'template', id: template.templatekey, error: error instanceof Error ? error.message : String(error) });
            }
        }
        // Cleanup test list
        if (this.testListKey) {
            try {
                await this.client.deleteMailingList(this.testListKey);
                cleanupResults.lists++;
            }
            catch (error) {
                cleanupResults.errors.push({ type: 'list', id: this.testListKey, error: error instanceof Error ? error.message : String(error) });
            }
        }
        return cleanupResults;
    }
    // ========== API TESTS ==========
    private async testApiHealthCheck(): Promise<any> {
        const healthy = await this.client.healthCheck();
        return { healthy };
    }
    private async testAuthentication(): Promise<any> {
        const tokenInfo = this.client.getTokenInfo();
        const accountDetails = await this.client.getAccountDetails();
        return {
            hasToken: !!tokenInfo,
            tokenValid: tokenInfo?.expiresAt ? tokenInfo.expiresAt > new Date() : false,
            accountDetails
        };
    }
    private async testRateLimiting(): Promise<any> {
        const initialStatus = this.client.getRateLimitStatus();
        // Make a few requests to test rate limiting
        const requests = [];
        for (let i = 0; i < 5; i++) {
            requests.push(this.client.getSenderEmails());
        }
        await Promise.all(requests);
        const finalStatus = this.client.getRateLimitStatus();
        return {
            initialRemaining: initialStatus.remaining,
            finalRemaining: finalStatus.remaining,
            rateLimitWorking: finalStatus.remaining < initialStatus.remaining
        };
    }
    // ========== LIST MANAGEMENT TESTS ==========
    private async testCreateMailingList(): Promise<any> {
        const listData = {
            listName: this.config.testListName,
            description: 'Test mailing list for IOC Framework demo',
            confirmationFromEmail: 'demo@iocframework.com',
            confirmationFromName: 'IOC Demo'
        };
        const result = await this.automationService.createSmartMailingList(listData);
        this.testListKey = result.listkey;
        return {
            listKey: this.testListKey,
            listName: result.listname,
            status: result.status
        };
    }
    private async testAddContacts(): Promise<any> {
        if (!this.testListKey) {
            throw new Error('No test list available');
        }
        const contacts = this.config.demoUsers.map(email => ({
            email,
            firstName: email.split('@')[0],
            lastName: 'Demo',
            customFields: {
                'Company': 'IOC Framework',
                'Role': 'Demo User'
            }
        }));
        const result = await this.automationService.addContactsToList(this.testListKey, contacts);
        return {
            contactsAdded: contacts.length,
            result
        };
    }
    private async testManageContacts(): Promise<any> {
        if (!this.testListKey) {
            throw new Error('No test list available');
        }
        // Get contacts
        const contacts = await this.client.getContacts(this.testListKey);
        // Test updating a contact
        const firstContact = contacts[0];
        if (firstContact) {
            await this.client.updateContact(this.testListKey, firstContact.contactemail, {
                'First Name': 'Updated',
                'Last Name': 'Name',
                'Custom Field': 'Updated Value'
            });
        }
        // Get updated contacts
        const updatedContacts = await this.client.getContacts(this.testListKey);
        return {
            originalCount: contacts.length,
            updatedCount: updatedContacts.length,
            firstContact: firstContact?.contactemail,
            updated: true
        };
    }
    // ========== TEMPLATE TESTS ==========
    private async testCreateTemplates(): Promise<any> {
        const createdTemplates = [];
        for (const template of this.config.testTemplates) {
            const result = await this.automationService.createTemplate(template);
            createdTemplates.push(result);
            this.createdTemplates.push(result);
        }
        return {
            templatesCreated: createdTemplates.length,
            templates: createdTemplates.map(t => ({
                key: t.templatekey,
                name: t.templatename
            }))
        };
    }
    private async testManageTemplates(): Promise<any> {
        if (this.createdTemplates.length === 0) {
            throw new Error('No templates available for testing');
        }
        const template = this.createdTemplates[0];
        // Test getting template
        const retrieved = await this.client.getTemplate(template.templatekey);
        // Test updating template
        await this.client.updateTemplate(template.templatekey, {
            subject: 'Updated Test Subject',
            htmlcontent: retrieved.htmlcontent + '\n<p>Updated content</p>'
        });
        // Get updated template
        const updated = await this.client.getTemplate(template.templatekey);
        return {
            originalSubject: retrieved.subject,
            updatedSubject: updated.subject,
            updated: updated.subject !== retrieved.subject
        };
    }
    // ========== CAMPAIGN TESTS ==========
    private async testCreateCampaign(): Promise<any> {
        if (!this.testListKey || this.createdTemplates.length === 0) {
            throw new Error('Missing test list or templates');
        }
        const template = this.createdTemplates[0];
        const campaignConfig: CampaignConfig = {
            name: 'IOC Demo Test Campaign',
            subject: 'Test Campaign from IOC Framework',
            template: template.templatename,
            mailingList: this.testListKey,
            testEmails: this.config.demoUsers,
            variables: {
                'COMPANY_NAME': 'IOC Framework',
                'FIRST_NAME': 'Demo User'
            }
        };
        const result = await this.automationService.sendAutomatedCampaign(campaignConfig);
        this.createdCampaigns.push({ campaignkey: result.campaignKey });
        return {
            campaignKey: result.campaignKey,
            success: result.success,
            message: result.message
        };
    }
    private async testSendTestEmails(): Promise<any> {
        if (this.createdCampaigns.length === 0) {
            throw new Error('No campaigns available for testing');
        }
        const campaign = this.createdCampaigns[0];
        const result = await this.client.sendTestEmail(campaign.campaignkey, this.config.demoUsers);
        return {
            campaignKey: campaign.campaignkey,
            testEmails: this.config.demoUsers,
            result
        };
    }
    private async testSendRealCampaign(): Promise<any> {
        if (!this.config.enableRealSending) {
            throw new Error('Real sending is disabled');
        }
        if (this.createdCampaigns.length === 0) {
            throw new Error('No campaigns available for sending');
        }
        const campaign = this.createdCampaigns[0];
        const result = await this.client.sendCampaign(campaign.campaignkey);
        return {
            campaignKey: campaign.campaignkey,
            sent: true,
            result
        };
    }
    private async testTrackDelivery(): Promise<any> {
        if (this.createdCampaigns.length === 0) {
            throw new Error('No campaigns available for tracking');
        }
        const campaign = this.createdCampaigns[0];
        // Wait a bit for delivery
        await new Promise(resolve => setTimeout(resolve, 10000));
        const stats = await this.client.getCampaignStats(campaign.campaignkey);
        return {
            campaignKey: campaign.campaignkey,
            stats
        };
    }
    private async testAnalyzePerformance(): Promise<any> {
        if (this.createdCampaigns.length === 0) {
            throw new Error('No campaigns available for analysis');
        }
        const campaign = this.createdCampaigns[0];
        const analytics = await this.automationService.getCampaignAnalytics(campaign.campaignkey);
        return {
            campaignKey: campaign.campaignkey,
            analytics
        };
    }
    // ========== AUTOMATION TESTS ==========
    private async testAutomationSequence(): Promise<any> {
        if (!this.testListKey || this.createdTemplates.length === 0) {
            throw new Error('Missing test list or templates');
        }
        const sequence = {
            id: 'test-sequence-001',
            name: 'Demo Automation Sequence',
            triggerType: 'immediate' as const,
            triggerData: {},
            campaigns: [
                {
                    name: 'Welcome Email',
                    subject: 'Welcome to IOC Framework Demo',
                    template: this.createdTemplates[0].templatename,
                    mailingList: this.testListKey,
                    testEmails: this.config.demoUsers,
                    variables: {
                        'COMPANY_NAME': 'IOC Framework',
                        'FIRST_NAME': 'Demo User'
                    }
                }
            ],
            delays: [0],
            enabled: true
        };
        const report = await this.automationService.executeAutomationSequence(sequence);
        return {
            sequenceId: sequence.id,
            report
        };
    }
    private async testMonitoringSystem(): Promise<any> {
        if (!this.monitor) {
            throw new Error('Monitoring is disabled');
        }
        // Test logging
        this.monitor.info('TEST', 'Test log message');
        this.monitor.warn('TEST', 'Test warning message');
        this.monitor.error('TEST', 'Test error message');
        // Test metrics
        this.monitor.recordMetric('test_metric', 100);
        this.monitor.recordMetric('test_metric', 200);
        // Generate report
        const report = this.monitor.generateDailyReport();
        return {
            logsRecorded: this.monitor.getLogBuffer().length,
            metricsRecorded: this.monitor.getMetricsBuffer().length,
            report
        };
    }
    // ========== ERROR HANDLING TESTS ==========
    private async testErrorHandling(): Promise<any> {
        const errorTests = [];
        // Test invalid campaign creation
        try {
            await this.client.createCampaign({
                campaignName: 'Invalid Campaign',
                subject: 'Test',
                fromEmail: 'invalid-email',
                fromName: 'Test',
                replyTo: 'test@test.com',
                mailingList: 'invalid-list'
            });
            errorTests.push({ test: 'invalid-campaign', handled: false });
        }
        catch (error) {
            errorTests.push({ test: 'invalid-campaign', handled: true, error: error instanceof Error ? error.message : String(error) });
        }
        // Test invalid template access
        try {
            await this.client.getTemplate('invalid-template-key');
            errorTests.push({ test: 'invalid-template', handled: false });
        }
        catch (error) {
            errorTests.push({ test: 'invalid-template', handled: true, error: error instanceof Error ? error.message : String(error) });
        }
        return {
            errorTests,
            allHandled: errorTests.every(test => test.handled)
        };
    }
    private async testRetryLogic(): Promise<any> {
        const metrics = this.client.getMetrics();
        const initialRequests = metrics.totalRequests;
        // This should trigger retry logic if there are network issues
        try {
            await this.client.get('/nonexistent-endpoint');
        }
        catch (error) {
            // Expected to fail
        }
        const finalMetrics = this.client.getMetrics();
        return {
            initialRequests,
            finalRequests: finalMetrics.totalRequests,
            retryAttempts: finalMetrics.totalRequests - initialRequests,
            retryLogicWorked: finalMetrics.totalRequests > initialRequests
        };
    }
    // ========== INTEGRATION TESTS ==========
    private async testFullWorkflow(): Promise<any> {
        // This test runs a complete end-to-end workflow
        const workflowResults = {
            listCreated: false,
            contactsAdded: false,
            templateCreated: false,
            campaignCreated: false,
            testEmailSent: false,
            analyticsRetrieved: false
        };
        // Create a new list for this test
        const listResult = await this.automationService.createSmartMailingList({
            listName: 'Full Workflow Test List',
            description: 'Test list for full workflow validation'
        });
        workflowResults.listCreated = true;
        // Add contacts
        await this.automationService.addContactsToList(listResult.listkey, [
            { email: 'workflow-test@iocframework.com', firstName: 'Workflow', lastName: 'Test' }
        ]);
        workflowResults.contactsAdded = true;
        // Create template
        const templateResult = await this.automationService.createTemplate({
            name: 'Workflow Test Template',
            subject: 'Full Workflow Test',
            htmlContent: '<h1>Workflow Test</h1><p>This is a test of the full workflow.</p>',
            textContent: 'Workflow Test\n\nThis is a test of the full workflow.'
        });
        workflowResults.templateCreated = true;
        // Create and send campaign
        const campaignResult = await this.automationService.sendAutomatedCampaign({
            name: 'Full Workflow Test Campaign',
            subject: 'Full Workflow Test',
            template: templateResult.templatename,
            mailingList: listResult.listkey,
            testEmails: ['workflow-test@iocframework.com']
        });
        workflowResults.campaignCreated = true;
        // Send test email
        await this.client.sendTestEmail(campaignResult.campaignKey, ['workflow-test@iocframework.com']);
        workflowResults.testEmailSent = true;
        // Get analytics
        const analytics = await this.automationService.getCampaignAnalytics(campaignResult.campaignKey);
        workflowResults.analyticsRetrieved = true;
        // Cleanup
        await this.client.deleteCampaign(campaignResult.campaignKey);
        await this.client.deleteTemplate(templateResult.templatekey);
        await this.client.deleteMailingList(listResult.listkey);
        return {
            workflowResults,
            allStepsCompleted: Object.values(workflowResults).every(step => step === true),
            campaignKey: campaignResult.campaignKey,
            analytics
        };
    }
    // ========== HELPER METHODS ==========
    private getDefaultTestTemplates(): EmailTemplate[] {
        return [
            {
                name: 'Demo Welcome Email',
                subject: 'Welcome to IOC Framework Demo!',
                htmlContent: `
          <html>
            <body>
              <h1>Welcome to IOC Framework!</h1>
              <p>Dear [[FIRST_NAME]],</p>
              <p>Thank you for joining our demo! We're excited to show you what IOC Framework can do.</p>
              <p>This is a test email sent via our Zoho Campaigns integration.</p>
              <p>Best regards,<br>The IOC Framework Team</p>
            </body>
          </html>
        `,
                textContent: 'Welcome to IOC Framework!\n\nDear [[FIRST_NAME]],\n\nThank you for joining our demo!\n\nBest regards,\nThe IOC Framework Team',
                variables: ['FIRST_NAME', 'COMPANY_NAME']
            },
            {
                name: 'Demo Newsletter',
                subject: 'IOC Framework Demo Newsletter',
                htmlContent: `
          <html>
            <body>
              <h1>IOC Framework Newsletter</h1>
              <p>Hi [[FIRST_NAME]],</p>
              <p>Here's what's new in the IOC Framework demo:</p>
              <ul>
                <li>New campaign automation features</li>
                <li>Enhanced analytics and reporting</li>
                <li>Improved email template editor</li>
              </ul>
              <p>This is a demonstration of our newsletter template.</p>
              <p>Best regards,<br>The IOC Framework Team</p>
            </body>
          </html>
        `,
                textContent: 'IOC Framework Newsletter\n\nHi [[FIRST_NAME]],\n\nHere\'s what\'s new in the demo:\n- New features\n- Enhanced analytics\n- Improved templates\n\nBest regards,\nThe IOC Framework Team',
                variables: ['FIRST_NAME']
            }
        ];
    }
    // ========== CLEANUP ==========
    public async destroy(): Promise<void> {
        await this.automationService.destroy();
        if (this.monitor) {
            await this.monitor.destroy();
        }
    }
    // ========== GETTERS ==========
    public getResults(): TestResult[] {
        return [...this.results];
    }
    public getConfig(): TestConfig {
        return { ...this.config };
    }
    public getAutomationService(): CampaignAutomationService {
        return this.automationService;
    }
    public getMonitor(): ZohoCampaignsMonitor | null {
        return this.monitor;
    }
}
export default ZohoCampaignsTestSuite;
