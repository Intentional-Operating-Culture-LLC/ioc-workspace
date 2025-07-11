/**
 * Zoho Campaigns Automation Service
 * High-level automation wrapper for common campaign operations
 */
import ZohoCampaignsClient from './campaigns-client';
import type { zoho } from "@ioc/shared/types";
type ZohoCampaignsConfig = zoho.ZohoCampaignsConfig;
type AutomationConfig = zoho.AutomationConfig;
type EmailTemplate = zoho.EmailTemplate;
type CampaignConfig = zoho.CampaignConfig;
type AutomationSequence = zoho.AutomationSequence;
import { EventEmitter } from 'events';
export interface CampaignSequence {
    campaigns: CampaignConfig[];
    delays?: number[]; // delays in minutes between campaigns
    enabled: boolean;
}
export interface CampaignResult {
    campaignKey: string;
    success: boolean;
    message: string;
    stats?: any;
    errors?: any[];
}
export interface AutomationReport {
    sequenceId: string;
    totalCampaigns: number;
    successfulCampaigns: number;
    failedCampaigns: number;
    totalRecipients: number;
    deliveredCount: number;
    openCount: number;
    clickCount: number;
    bounceCount: number;
    unsubscribeCount: number;
    results: CampaignResult[];
    startTime: Date;
    endTime: Date;
    duration: number;
}
export class CampaignAutomationService extends EventEmitter {
    private client: ZohoCampaignsClient;
    private config: AutomationConfig;
    private activeSequences: Map<string, AutomationSequence> = new Map();
    private sequenceTimers: Map<string, NodeJS.Timeout> = new Map();
    constructor(config: AutomationConfig) {
        super();
        this.config = config;
        this.client = new ZohoCampaignsClient(config);
        this.setupEventListeners();
    }
    private setupEventListeners(): void {
        this.client.on('rateLimitHit', (error) => {
            this.emit('rateLimitHit', error);
        });
        this.client.on('authenticationError', (error) => {
            this.emit('authenticationError', error);
        });
        this.client.on('tokenRefreshed', (tokenInfo) => {
            this.emit('tokenRefreshed', tokenInfo);
        });
    }
    // ========== QUICK SETUP METHODS ==========
    /**
     * Quick setup for new users - creates default mailing list and templates
     */
    public async quickSetup(options: {
        listName: string;
        welcomeTemplate?: EmailTemplate;
        newsletterTemplate?: EmailTemplate;
        contactEmails?: string[];
    }): Promise<{
        mailingList: any | null;
        templates: any[];
        contacts: any[];
    }> {
        const results: {
            mailingList: any | null;
            templates: any[];
            contacts: any[];
        } = {
            mailingList: null,
            templates: [] as any[],
            contacts: [] as any[]
        };
        try {
            // Create mailing list
            results.mailingList = await this.createSmartMailingList({
                listName: options.listName,
                description: `Automated mailing list for ${options.listName}`,
                confirmationFromEmail: this.config.defaultFromEmail,
                confirmationFromName: this.config.defaultFromName,
                confirmationSubject: 'Please confirm your subscription',
                confirmationMessage: 'Thank you for subscribing! Please confirm your subscription by clicking the link below.'
            });
            // Create default templates
            const defaultTemplates = [
                options.welcomeTemplate || this.getDefaultWelcomeTemplate(),
                options.newsletterTemplate || this.getDefaultNewsletterTemplate()
            ];
            for (const template of defaultTemplates) {
                const createdTemplate = await this.createTemplate(template);
                results.templates.push(createdTemplate);
            }
            // Add contacts if provided
            if (options.contactEmails?.length) {
                const contacts = options.contactEmails.map(email => ({
                    email,
                    firstName: '',
                    lastName: ''
                }));
                if (results.mailingList?.listkey) {
                    const addedContacts = await this.addContactsToList(results.mailingList.listkey, contacts);
                    results.contacts = addedContacts;
                }
            }
            this.emit('quickSetupComplete', results);
            return results;
        }
        catch (error) {
            this.emit('quickSetupError', error);
            throw error;
        }
    }
    /**
     * Send a single campaign with full automation
     */
    public async sendAutomatedCampaign(config: CampaignConfig): Promise<CampaignResult> {
        const result: CampaignResult = {
            campaignKey: '',
            success: false,
            message: '',
            stats: null,
            errors: []
        };
        try {
            // Get template
            const template = await this.getTemplateByName(config.template);
            if (!template) {
                throw new Error(`Template '${config.template}' not found`);
            }
            // Process variables if provided
            let htmlContent = template.htmlcontent;
            let textContent = template.textcontent;
            let subject = config.subject;
            if (config.variables) {
                htmlContent = this.processTemplateVariables(htmlContent, config.variables);
                textContent = this.processTemplateVariables(textContent || '', config.variables);
                subject = this.processTemplateVariables(subject, config.variables);
            }
            // Create campaign
            const campaignData = {
                campaignName: config.name,
                subject: subject,
                fromEmail: config.fromEmail || this.config.defaultFromEmail,
                fromName: config.fromName || this.config.defaultFromName,
                replyTo: config.replyTo || this.config.defaultReplyTo,
                mailingList: config.mailingList,
                htmlContent: htmlContent,
                textContent: textContent
            };
            const campaign = await this.client.createCampaign(campaignData);
            result.campaignKey = campaign.campaignkey;
            // Send test emails if provided
            if (config.testEmails?.length) {
                await this.client.sendTestEmail(result.campaignKey, config.testEmails);
                this.emit('testEmailSent', {
                    campaignKey: result.campaignKey,
                    testEmails: config.testEmails
                });
            }
            // Schedule or send immediately
            if (config.schedule) {
                const scheduledTime = config.schedule.sendAt.toISOString();
                const timezone = config.schedule.timezone || 'UTC';
                await this.client.scheduleCampaign(result.campaignKey, scheduledTime, timezone);
                result.message = `Campaign scheduled for ${scheduledTime}`;
            }
            else {
                await this.client.sendCampaign(result.campaignKey);
                result.message = 'Campaign sent successfully';
            }
            result.success = true;
            // Get initial stats
            setTimeout(async () => {
                try {
                    result.stats = await this.client.getCampaignStats(result.campaignKey);
                    this.emit('campaignStatsUpdated', result);
                }
                catch (error) {
                    // Stats might not be available immediately
                }
            }, 30000); // Wait 30 seconds for stats
            this.emit('campaignSent', result);
            return result;
        }
        catch (error) {
            result.errors = [error];
            result.message = `Failed to send campaign: ${error instanceof Error ? error.message : String(error)}`;
            this.emit('campaignError', result);
            throw error;
        }
    }
    /**
     * Create and execute an automation sequence
     */
    public async executeAutomationSequence(sequence: AutomationSequence): Promise<AutomationReport> {
        const report: AutomationReport = {
            sequenceId: sequence.id,
            totalCampaigns: sequence.campaigns?.length || 0,
            successfulCampaigns: 0,
            failedCampaigns: 0,
            totalRecipients: 0,
            deliveredCount: 0,
            openCount: 0,
            clickCount: 0,
            bounceCount: 0,
            unsubscribeCount: 0,
            results: [],
            startTime: new Date(),
            endTime: new Date(),
            duration: 0
        };
        try {
            this.activeSequences.set(sequence.id, sequence);
            this.emit('sequenceStarted', sequence);
            for (let i = 0; i < (sequence.campaigns?.length || 0); i++) {
                const campaign = sequence.campaigns![i];
                const delay = sequence.delays?.[i] || 0;
                // Wait for delay if specified
                if (delay > 0 && i > 0) {
                    await this.delay(delay * 60 * 1000); // Convert minutes to milliseconds
                }
                try {
                    const result = await this.sendAutomatedCampaign(campaign);
                    report.results.push(result);
                    report.successfulCampaigns++;
                    // Accumulate stats
                    if (result.stats) {
                        report.totalRecipients += result.stats.totalRecipients || 0;
                        report.deliveredCount += result.stats.deliveredCount || 0;
                        report.openCount += result.stats.openCount || 0;
                        report.clickCount += result.stats.clickCount || 0;
                        report.bounceCount += result.stats.bounceCount || 0;
                        report.unsubscribeCount += result.stats.unsubscribeCount || 0;
                    }
                }
                catch (error) {
                    report.failedCampaigns++;
                    report.results.push({
                        campaignKey: '',
                        success: false,
                        message: `Failed: ${error instanceof Error ? error.message : String(error)}`,
                        errors: [error]
                    });
                }
            }
            report.endTime = new Date();
            report.duration = report.endTime.getTime() - report.startTime.getTime();
            this.activeSequences.delete(sequence.id);
            this.emit('sequenceCompleted', report);
            return report;
        }
        catch (error) {
            this.activeSequences.delete(sequence.id);
            this.emit('sequenceError', { sequence, error });
            throw error;
        }
    }
    // ========== TEMPLATE MANAGEMENT ==========
    /**
     * Create a template with smart defaults
     */
    public async createTemplate(template: EmailTemplate): Promise<any> {
        // Add default footer and tracking if enabled
        let htmlContent = template.htmlContent;
        let textContent = template.textContent || this.htmlToText(htmlContent);
        if (this.config.trackingEnabled) {
            htmlContent = this.addTrackingPixel(htmlContent);
        }
        // Add unsubscribe link
        const unsubscribeLink = this.config.unsubscribeLink || '[UNSUBSCRIBE]';
        htmlContent = this.addUnsubscribeLink(htmlContent, unsubscribeLink);
        textContent = this.addUnsubscribeLink(textContent, unsubscribeLink);
        return this.client.createTemplate({
            templateName: template.name,
            subject: template.subject,
            htmlContent: htmlContent,
            textContent: textContent
        });
    }
    /**
     * Get template by name
     */
    public async getTemplateByName(templateName: string): Promise<any> {
        const templates = await this.client.getTemplates();
        return templates.find((t: any) => t.templatename === templateName);
    }
    // ========== CONTACT MANAGEMENT ==========
    /**
     * Create a smart mailing list with confirmation
     */
    public async createSmartMailingList(listData: {
        listName: string;
        description?: string;
        confirmationFromEmail?: string;
        confirmationFromName?: string;
        confirmationSubject?: string;
        confirmationMessage?: string;
    }): Promise<any> {
        return this.client.createMailingList({
            listName: listData.listName,
            description: listData.description,
            confirmationFromEmail: listData.confirmationFromEmail || this.config.defaultFromEmail,
            confirmationFromName: listData.confirmationFromName || this.config.defaultFromName,
            confirmationSubject: listData.confirmationSubject || 'Please confirm your subscription',
            confirmationMessage: listData.confirmationMessage || 'Thank you for subscribing!'
        });
    }
    /**
     * Add contacts to list with validation
     */
    public async addContactsToList(listKey: string, contacts: Array<{
        email: string;
        firstName?: string;
        lastName?: string;
        customFields?: {
            [key: string]: string;
        };
    }>): Promise<any[]> {
        const validContacts = contacts.filter(contact => this.validateEmail(contact.email));
        if (validContacts.length === 0) {
            throw new Error('No valid email addresses provided');
        }
        const results = [];
        // Add contacts in batches of 50
        const batchSize = 50;
        for (let i = 0; i < validContacts.length; i += batchSize) {
            const batch = validContacts.slice(i, i + batchSize);
            try {
                const result = await this.client.addContacts(listKey, batch);
                results.push(result);
            }
            catch (error) {
                this.emit('contactAddError', { batch, error });
                throw error;
            }
        }
        return results;
    }
    // ========== ANALYTICS AND MONITORING ==========
    /**
     * Get comprehensive campaign analytics
     */
    public async getCampaignAnalytics(campaignKey: string): Promise<any> {
        const [stats, bounceReport, clickReport, openReport, unsubscribeReport, spamReport] = await Promise.all([
            this.client.getCampaignStats(campaignKey),
            this.client.getBounceReports(campaignKey),
            this.client.getClickReports(campaignKey),
            this.client.getOpenReports(campaignKey),
            this.client.getUnsubscribeReports(campaignKey),
            this.client.getSpamReports(campaignKey)
        ]);
        return {
            stats,
            reports: {
                bounces: bounceReport,
                clicks: clickReport,
                opens: openReport,
                unsubscribes: unsubscribeReport,
                spam: spamReport
            },
            performance: {
                deliveryRate: stats.deliveryRate || 0,
                openRate: stats.openRate || 0,
                clickRate: stats.clickRate || 0,
                bounceRate: stats.bounceRate || 0,
                unsubscribeRate: stats.unsubscribeRate || 0,
                spamRate: stats.spamRate || 0
            }
        };
    }
    /**
     * Monitor campaign performance in real-time
     */
    public async startCampaignMonitoring(campaignKey: string, intervalMinutes: number = 5): Promise<void> {
        const monitor = setInterval(async () => {
            try {
                const analytics = await this.getCampaignAnalytics(campaignKey);
                this.emit('campaignMonitorUpdate', {
                    campaignKey,
                    analytics,
                    timestamp: new Date()
                });
            }
            catch (error) {
                this.emit('campaignMonitorError', { campaignKey, error });
            }
        }, intervalMinutes * 60 * 1000);
        // Store monitor reference
        this.sequenceTimers.set(`monitor-${campaignKey}`, monitor);
    }
    /**
     * Stop campaign monitoring
     */
    public stopCampaignMonitoring(campaignKey: string): void {
        const monitor = this.sequenceTimers.get(`monitor-${campaignKey}`);
        if (monitor) {
            clearInterval(monitor);
            this.sequenceTimers.delete(`monitor-${campaignKey}`);
        }
    }
    // ========== UTILITY METHODS ==========
    private processTemplateVariables(content: string, variables: {
        [key: string]: any;
    }): string {
        let processedContent = content;
        for (const [key, value] of Object.entries(variables)) {
            const regex = new RegExp(`\\[\\[${key}\\]\\]`, 'g');
            processedContent = processedContent.replace(regex, String(value));
        }
        return processedContent;
    }
    private addTrackingPixel(htmlContent: string): string {
        const trackingPixel = '<img src="[TRACKING_PIXEL]" width="1" height="1" style="display:none;" />';
        return htmlContent.replace('</body>', `${trackingPixel}</body>`);
    }
    private addUnsubscribeLink(content: string, unsubscribeLink: string): string {
        const unsubscribeText = `<br><br><small><a href="${unsubscribeLink}">Unsubscribe</a></small>`;
        return content.replace('</body>', `${unsubscribeText}</body>`);
    }
    private htmlToText(html: string): string {
        return html
            .replace(/<[^>]*>/g, '')
            .replace(/\s+/g, ' ')
            .trim();
    }
    private validateEmail(email: string): boolean {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
    }
    private async delay(ms: number): Promise<void> {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
    private getDefaultWelcomeTemplate(): EmailTemplate {
        return {
            name: 'Welcome Email',
            subject: 'Welcome to [[COMPANY_NAME]]!',
            htmlContent: `
        <html>
          <body>
            <h1>Welcome to [[COMPANY_NAME]]!</h1>
            <p>Dear [[FIRST_NAME]],</p>
            <p>Thank you for joining us! We're excited to have you on board.</p>
            <p>Here's what you can expect:</p>
            <ul>
              <li>Regular updates and insights</li>
              <li>Exclusive content and offers</li>
              <li>Priority support and assistance</li>
            </ul>
            <p>If you have any questions, feel free to reach out to us.</p>
            <p>Best regards,<br>The [[COMPANY_NAME]] Team</p>
          </body>
        </html>
      `,
            variables: ['COMPANY_NAME', 'FIRST_NAME']
        };
    }
    private getDefaultNewsletterTemplate(): EmailTemplate {
        return {
            name: 'Newsletter',
            subject: '[[COMPANY_NAME]] Newsletter - [[MONTH]] [[YEAR]]',
            htmlContent: `
        <html>
          <body>
            <h1>[[COMPANY_NAME]] Newsletter</h1>
            <p>Hi [[FIRST_NAME]],</p>
            <p>Here's what's happening this month:</p>
            <div>
              <h2>[[HEADLINE]]</h2>
              <p>[[CONTENT]]</p>
            </div>
            <p>Stay tuned for more updates!</p>
            <p>Best regards,<br>The [[COMPANY_NAME]] Team</p>
          </body>
        </html>
      `,
            variables: ['COMPANY_NAME', 'FIRST_NAME', 'MONTH', 'YEAR', 'HEADLINE', 'CONTENT']
        };
    }
    // ========== CLEANUP ==========
    public async destroy(): Promise<void> {
        // Clear all timers
        for (const timer of this.sequenceTimers.values()) {
            clearInterval(timer);
        }
        this.sequenceTimers.clear();
        // Clear active sequences
        this.activeSequences.clear();
        // Cleanup client
        this.client.destroy();
        this.removeAllListeners();
    }
    // ========== GETTERS ==========
    public getClient(): ZohoCampaignsClient {
        return this.client;
    }
    public getActiveSequences(): AutomationSequence[] {
        return Array.from(this.activeSequences.values());
    }
    public getConfig(): AutomationConfig {
        return { ...this.config };
    }
}
export default CampaignAutomationService;
