/**
 * Zoho Campaigns API Client
 * Production-ready implementation with authentication, rate limiting, and comprehensive error handling
 */
import axios, { AxiosInstance, AxiosRequestConfig, AxiosResponse, InternalAxiosRequestConfig } from 'axios';
import { EventEmitter } from 'events';
import type { zoho } from "@ioc/shared/types";
type ZohoCampaignsConfig = zoho.ZohoCampaignsConfig;
type ZohoCampaignsError = zoho.ZohoCampaignsError;
type TokenInfo = zoho.TokenInfo;
type RateLimitStatus = zoho.RateLimitStatus;
type RequestMetrics = zoho.RequestMetrics;
// Extend the axios request config to include metadata
declare module 'axios' {
    interface InternalAxiosRequestConfig {
        metadata?: {
            startTime: number;
        };
    }
}
export class ZohoCampaignsClient extends EventEmitter {
    private httpClient: AxiosInstance;
    private config: ZohoCampaignsConfig;
    private tokenInfo: TokenInfo | null = null;
    private rateLimitStatus: RateLimitStatus;
    private requestQueue: Array<() => Promise<any>> = [];
    private isProcessingQueue = false;
    private metrics: RequestMetrics = {
        totalRequests: 0,
        successfulRequests: 0,
        failedRequests: 0,
        rateLimitHits: 0,
        averageResponseTime: 0
    };
    constructor(config: ZohoCampaignsConfig) {
        super();
        this.config = {
            region: 'com',
            baseURL: `https://campaigns.zoho.${config.region || 'com'}/api/v1.1`,
            timeout: 30000,
            maxRetries: 3,
            retryDelay: 1000,
            rateLimit: {
                requestsPerMinute: 100,
                burstSize: 10
            },
            ...config
        };
        this.rateLimitStatus = {
            remaining: this.config.rateLimit!.requestsPerMinute,
            resetTime: new Date(Date.now() + 60000),
            limit: this.config.rateLimit!.requestsPerMinute
        };
        this.httpClient = axios.create({
            baseURL: this.config.baseURL,
            timeout: this.config.timeout,
            headers: {
                'Content-Type': 'application/json',
                'User-Agent': 'IOC-Framework-ZohoCampaigns/1.0.0'
            }
        });
        this.setupInterceptors();
        this.setupRateLimitManager();
        this.initializeToken();
    }
    private setupInterceptors(): void {
        // Request interceptor for authentication and metrics
        this.httpClient.interceptors.request.use((config: InternalAxiosRequestConfig) => {
            const startTime = Date.now();
            config.metadata = { startTime };
            if (this.tokenInfo?.accessToken) {
                config.headers.Authorization = `Bearer ${this.tokenInfo.accessToken}`;
            }
            this.metrics.totalRequests++;
            return config;
        }, (error) => {
            this.metrics.failedRequests++;
            return Promise.reject(error);
        });
        // Response interceptor for metrics and error handling
        this.httpClient.interceptors.response.use((response) => {
            const endTime = Date.now();
            const duration = endTime - (response.config.metadata?.startTime || endTime);
            this.updateMetrics(duration, true);
            // Update rate limit status from headers
            this.updateRateLimitFromHeaders(response.headers);
            return response;
        }, async (error) => {
            const endTime = Date.now();
            const duration = endTime - (error.config?.metadata?.startTime || endTime);
            this.updateMetrics(duration, false);
            // Handle token refresh for 401 errors
            if (error.response?.status === 401 && !error.config?._retry) {
                error.config._retry = true;
                try {
                    await this.refreshAccessToken();
                    error.config.headers.Authorization = `Bearer ${this.tokenInfo?.accessToken}`;
                    return this.httpClient.request(error.config);
                }
                catch (refreshError) {
                    this.emit('authenticationError', refreshError);
                }
            }
            // Handle rate limiting
            if (error.response?.status === 429) {
                this.metrics.rateLimitHits++;
                this.emit('rateLimitHit', error);
                // Implement exponential backoff
                const retryAfter = parseInt(error.response.headers['retry-after'] || '60');
                await this.delay(retryAfter * 1000);
                if (!error.config?._retryCount) {
                    error.config._retryCount = 0;
                }
                if (error.config._retryCount < this.config.maxRetries!) {
                    error.config._retryCount++;
                    return this.httpClient.request(error.config);
                }
            }
            return Promise.reject(this.createError(error));
        });
    }
    private setupRateLimitManager(): void {
        // Reset rate limit counter every minute
        setInterval(() => {
            this.rateLimitStatus = {
                remaining: this.config.rateLimit!.requestsPerMinute,
                resetTime: new Date(Date.now() + 60000),
                limit: this.config.rateLimit!.requestsPerMinute
            };
            this.processQueue();
        }, 60000);
    }
    private async initializeToken(): Promise<void> {
        if (this.config.accessToken && this.config.refreshToken) {
            this.tokenInfo = {
                accessToken: this.config.accessToken,
                expiresAt: new Date(Date.now() + 3600000), // Assume 1 hour expiry
                refreshToken: this.config.refreshToken
            };
        }
        else {
            throw new Error('Initial access token and refresh token are required');
        }
    }
    private async refreshAccessToken(): Promise<void> {
        try {
            const response = await axios.post(`https://accounts.zoho.${this.config.region}/oauth/v2/token`, null, {
                params: {
                    grant_type: 'refresh_token',
                    client_id: this.config.clientId,
                    client_secret: this.config.clientSecret,
                    refresh_token: this.tokenInfo?.refreshToken || this.config.refreshToken
                }
            });
            const { access_token, expires_in } = response.data;
            this.tokenInfo = {
                accessToken: access_token,
                expiresAt: new Date(Date.now() + (expires_in * 1000)),
                refreshToken: this.tokenInfo?.refreshToken || this.config.refreshToken
            };
            this.emit('tokenRefreshed', this.tokenInfo);
        }
        catch (error) {
            this.emit('tokenRefreshError', error);
            throw new Error('Failed to refresh access token');
        }
    }
    private updateMetrics(duration: number, success: boolean): void {
        if (success) {
            this.metrics.successfulRequests++;
        }
        else {
            this.metrics.failedRequests++;
        }
        // Update average response time
        const totalResponseTime = this.metrics.averageResponseTime * (this.metrics.totalRequests - 1);
        this.metrics.averageResponseTime = (totalResponseTime + duration) / this.metrics.totalRequests;
    }
    private updateRateLimitFromHeaders(headers: any): void {
        if (headers['x-ratelimit-remaining']) {
            this.rateLimitStatus.remaining = parseInt(headers['x-ratelimit-remaining']);
        }
        if (headers['x-ratelimit-reset']) {
            this.rateLimitStatus.resetTime = new Date(parseInt(headers['x-ratelimit-reset']) * 1000);
        }
    }
    private createError(error: any): ZohoCampaignsError {
        return {
            code: error.response?.data?.code || 'UNKNOWN_ERROR',
            message: error.response?.data?.message || error.message || 'Unknown error occurred',
            details: error.response?.data,
            statusCode: error.response?.status,
            timestamp: new Date().toISOString()
        };
    }
    private async delay(ms: number): Promise<void> {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
    private async processQueue(): Promise<void> {
        if (this.isProcessingQueue || this.requestQueue.length === 0) {
            return;
        }
        this.isProcessingQueue = true;
        while (this.requestQueue.length > 0 && this.rateLimitStatus.remaining > 0) {
            const request = this.requestQueue.shift();
            if (request) {
                try {
                    await request();
                    this.rateLimitStatus.remaining--;
                }
                catch (error) {
                    this.emit('queueError', error);
                }
            }
        }
        this.isProcessingQueue = false;
    }
    public async makeRequest<T = any>(method: string, endpoint: string, data?: any, config?: AxiosRequestConfig): Promise<T> {
        return new Promise((resolve, reject) => {
            const requestFunction = async () => {
                try {
                    const response: AxiosResponse<T> = await this.httpClient.request({
                        method,
                        url: endpoint,
                        data,
                        ...config
                    });
                    resolve(response.data);
                }
                catch (error) {
                    reject(error);
                }
            };
            // Check rate limit before making request
            if (this.rateLimitStatus.remaining <= 0) {
                this.requestQueue.push(requestFunction);
                this.emit('rateLimitQueued', { endpoint, method });
            }
            else {
                requestFunction();
            }
        });
    }
    public async get<T = any>(endpoint: string, config?: AxiosRequestConfig): Promise<T> {
        return this.makeRequest<T>('GET', endpoint, null, config);
    }
    public async post<T = any>(endpoint: string, data?: any, config?: AxiosRequestConfig): Promise<T> {
        return this.makeRequest<T>('POST', endpoint, data, config);
    }
    public async put<T = any>(endpoint: string, data?: any, config?: AxiosRequestConfig): Promise<T> {
        return this.makeRequest<T>('PUT', endpoint, data, config);
    }
    public async patch<T = any>(endpoint: string, data?: any, config?: AxiosRequestConfig): Promise<T> {
        return this.makeRequest<T>('PATCH', endpoint, data, config);
    }
    public async delete<T = any>(endpoint: string, config?: AxiosRequestConfig): Promise<T> {
        return this.makeRequest<T>('DELETE', endpoint, null, config);
    }
    public getMetrics(): RequestMetrics {
        return { ...this.metrics };
    }
    public getRateLimitStatus(): RateLimitStatus {
        return { ...this.rateLimitStatus };
    }
    public getTokenInfo(): TokenInfo | null {
        return this.tokenInfo ? { ...this.tokenInfo } : null;
    }
    public async healthCheck(): Promise<boolean> {
        try {
            await this.get('/healthcheck');
            return true;
        }
        catch (error) {
            return false;
        }
    }
    // ========== CAMPAIGN MANAGEMENT METHODS ==========
    /**
     * Create a new email campaign
     */
    public async createCampaign(campaignData: {
        campaignName: string;
        subject: string;
        fromEmail: string;
        fromName: string;
        replyTo: string;
        mailingList: string;
        template?: string;
        htmlContent?: string;
        textContent?: string;
        scheduledTime?: string;
        timezone?: string;
    }): Promise<any> {
        const payload = {
            campaignname: campaignData.campaignName,
            subject: campaignData.subject,
            fromaddress: campaignData.fromEmail,
            fromname: campaignData.fromName,
            replyto: campaignData.replyTo,
            mailinglist: campaignData.mailingList,
            ...(campaignData.template && { template: campaignData.template }),
            ...(campaignData.htmlContent && { htmlcontent: campaignData.htmlContent }),
            ...(campaignData.textContent && { textcontent: campaignData.textContent }),
            ...(campaignData.scheduledTime && { scheduledtime: campaignData.scheduledTime }),
            ...(campaignData.timezone && { timezone: campaignData.timezone })
        };
        return this.post('/campaigns', payload);
    }
    /**
     * Send a campaign immediately
     */
    public async sendCampaign(campaignKey: string): Promise<any> {
        return this.post(`/campaigns/${campaignKey}/actions/send`);
    }
    /**
     * Schedule a campaign for future sending
     */
    public async scheduleCampaign(campaignKey: string, scheduledTime: string, timezone: string = 'UTC'): Promise<any> {
        return this.post(`/campaigns/${campaignKey}/actions/schedule`, {
            scheduledtime: scheduledTime,
            timezone: timezone
        });
    }
    /**
     * Get campaign details
     */
    public async getCampaign(campaignKey: string): Promise<any> {
        return this.get(`/campaigns/${campaignKey}`);
    }
    /**
     * Get all campaigns
     */
    public async getCampaigns(params?: {
        range?: string;
        status?: string;
        limit?: number;
        offset?: number;
    }): Promise<any> {
        const queryParams = new URLSearchParams();
        if (params?.range)
            queryParams.append('range', params.range);
        if (params?.status)
            queryParams.append('status', params.status);
        if (params?.limit)
            queryParams.append('limit', params.limit.toString());
        if (params?.offset)
            queryParams.append('offset', params.offset.toString());
        const query = queryParams.toString();
        return this.get(`/campaigns${query ? `?${query}` : ''}`);
    }
    /**
     * Update campaign
     */
    public async updateCampaign(campaignKey: string, updateData: any): Promise<any> {
        return this.patch(`/campaigns/${campaignKey}`, updateData);
    }
    /**
     * Delete campaign
     */
    public async deleteCampaign(campaignKey: string): Promise<any> {
        return this.delete(`/campaigns/${campaignKey}`);
    }
    /**
     * Get campaign statistics
     */
    public async getCampaignStats(campaignKey: string): Promise<any> {
        return this.get(`/campaigns/${campaignKey}/stats`);
    }
    /**
     * Get campaign reports
     */
    public async getCampaignReports(campaignKey: string, reportType: string = 'summary'): Promise<any> {
        return this.get(`/campaigns/${campaignKey}/reports/${reportType}`);
    }
    // ========== MAILING LIST MANAGEMENT METHODS ==========
    /**
     * Create a new mailing list
     */
    public async createMailingList(listData: {
        listName: string;
        description?: string;
        reminderMessage?: string;
        confirmationMessage?: string;
        confirmationSubject?: string;
        confirmationFromEmail?: string;
        confirmationFromName?: string;
    }): Promise<any> {
        const payload = {
            listname: listData.listName,
            ...(listData.description && { listdesc: listData.description }),
            ...(listData.reminderMessage && { remindermessage: listData.reminderMessage }),
            ...(listData.confirmationMessage && { confirmationmessage: listData.confirmationMessage }),
            ...(listData.confirmationSubject && { confirmationsubject: listData.confirmationSubject }),
            ...(listData.confirmationFromEmail && { confirmationfromemail: listData.confirmationFromEmail }),
            ...(listData.confirmationFromName && { confirmationfromname: listData.confirmationFromName })
        };
        return this.post('/lists', payload);
    }
    /**
     * Get all mailing lists
     */
    public async getMailingLists(params?: {
        range?: string;
        limit?: number;
        offset?: number;
    }): Promise<any> {
        const queryParams = new URLSearchParams();
        if (params?.range)
            queryParams.append('range', params.range);
        if (params?.limit)
            queryParams.append('limit', params.limit.toString());
        if (params?.offset)
            queryParams.append('offset', params.offset.toString());
        const query = queryParams.toString();
        return this.get(`/lists${query ? `?${query}` : ''}`);
    }
    /**
     * Get mailing list details
     */
    public async getMailingList(listKey: string): Promise<any> {
        return this.get(`/lists/${listKey}`);
    }
    /**
     * Update mailing list
     */
    public async updateMailingList(listKey: string, updateData: any): Promise<any> {
        return this.patch(`/lists/${listKey}`, updateData);
    }
    /**
     * Delete mailing list
     */
    public async deleteMailingList(listKey: string): Promise<any> {
        return this.delete(`/lists/${listKey}`);
    }
    // ========== CONTACT MANAGEMENT METHODS ==========
    /**
     * Add a contact to a mailing list
     */
    public async addContact(listKey: string, contactData: {
        email: string;
        firstName?: string;
        lastName?: string;
        contactInfo?: {
            [key: string]: string;
        };
    }): Promise<any> {
        const payload = {
            contactinfo: JSON.stringify({
                'Contact Email': contactData.email,
                ...(contactData.firstName && { 'First Name': contactData.firstName }),
                ...(contactData.lastName && { 'Last Name': contactData.lastName }),
                ...(contactData.contactInfo && contactData.contactInfo)
            })
        };
        return this.post(`/lists/${listKey}/contacts`, payload);
    }
    /**
     * Add multiple contacts to a mailing list
     */
    public async addContacts(listKey: string, contacts: Array<{
        email: string;
        firstName?: string;
        lastName?: string;
        contactInfo?: {
            [key: string]: string;
        };
    }>): Promise<any> {
        const contactsData = contacts.map(contact => ({
            'Contact Email': contact.email,
            ...(contact.firstName && { 'First Name': contact.firstName }),
            ...(contact.lastName && { 'Last Name': contact.lastName }),
            ...(contact.contactInfo && contact.contactInfo)
        }));
        return this.post(`/lists/${listKey}/contacts`, {
            contactinfo: JSON.stringify(contactsData)
        });
    }
    /**
     * Get contacts from a mailing list
     */
    public async getContacts(listKey: string, params?: {
        range?: string;
        status?: string;
        limit?: number;
        offset?: number;
    }): Promise<any> {
        const queryParams = new URLSearchParams();
        if (params?.range)
            queryParams.append('range', params.range);
        if (params?.status)
            queryParams.append('status', params.status);
        if (params?.limit)
            queryParams.append('limit', params.limit.toString());
        if (params?.offset)
            queryParams.append('offset', params.offset.toString());
        const query = queryParams.toString();
        return this.get(`/lists/${listKey}/contacts${query ? `?${query}` : ''}`);
    }
    /**
     * Get contact details
     */
    public async getContact(listKey: string, contactEmail: string): Promise<any> {
        return this.get(`/lists/${listKey}/contacts/${encodeURIComponent(contactEmail)}`);
    }
    /**
     * Update contact
     */
    public async updateContact(listKey: string, contactEmail: string, updateData: any): Promise<any> {
        return this.patch(`/lists/${listKey}/contacts/${encodeURIComponent(contactEmail)}`, {
            contactinfo: JSON.stringify(updateData)
        });
    }
    /**
     * Remove contact from mailing list
     */
    public async removeContact(listKey: string, contactEmail: string): Promise<any> {
        return this.delete(`/lists/${listKey}/contacts/${encodeURIComponent(contactEmail)}`);
    }
    /**
     * Unsubscribe contact from mailing list
     */
    public async unsubscribeContact(listKey: string, contactEmail: string): Promise<any> {
        return this.post(`/lists/${listKey}/contacts/${encodeURIComponent(contactEmail)}/actions/unsubscribe`);
    }
    // ========== EMAIL TEMPLATE MANAGEMENT METHODS ==========
    /**
     * Create email template
     */
    public async createTemplate(templateData: {
        templateName: string;
        subject: string;
        htmlContent: string;
        textContent?: string;
        templateType?: string;
    }): Promise<any> {
        const payload = {
            templatename: templateData.templateName,
            subject: templateData.subject,
            htmlcontent: templateData.htmlContent,
            ...(templateData.textContent && { textcontent: templateData.textContent }),
            ...(templateData.templateType && { templatetype: templateData.templateType })
        };
        return this.post('/templates', payload);
    }
    /**
     * Get all templates
     */
    public async getTemplates(params?: {
        range?: string;
        limit?: number;
        offset?: number;
    }): Promise<any> {
        const queryParams = new URLSearchParams();
        if (params?.range)
            queryParams.append('range', params.range);
        if (params?.limit)
            queryParams.append('limit', params.limit.toString());
        if (params?.offset)
            queryParams.append('offset', params.offset.toString());
        const query = queryParams.toString();
        return this.get(`/templates${query ? `?${query}` : ''}`);
    }
    /**
     * Get template details
     */
    public async getTemplate(templateKey: string): Promise<any> {
        return this.get(`/templates/${templateKey}`);
    }
    /**
     * Update template
     */
    public async updateTemplate(templateKey: string, updateData: any): Promise<any> {
        return this.patch(`/templates/${templateKey}`, updateData);
    }
    /**
     * Delete template
     */
    public async deleteTemplate(templateKey: string): Promise<any> {
        return this.delete(`/templates/${templateKey}`);
    }
    // ========== ANALYTICS AND TRACKING METHODS ==========
    /**
     * Get bounce reports
     */
    public async getBounceReports(campaignKey: string, params?: {
        range?: string;
        limit?: number;
        offset?: number;
    }): Promise<any> {
        const queryParams = new URLSearchParams();
        if (params?.range)
            queryParams.append('range', params.range);
        if (params?.limit)
            queryParams.append('limit', params.limit.toString());
        if (params?.offset)
            queryParams.append('offset', params.offset.toString());
        const query = queryParams.toString();
        return this.get(`/campaigns/${campaignKey}/reports/bounce${query ? `?${query}` : ''}`);
    }
    /**
     * Get click reports
     */
    public async getClickReports(campaignKey: string, params?: {
        range?: string;
        limit?: number;
        offset?: number;
    }): Promise<any> {
        const queryParams = new URLSearchParams();
        if (params?.range)
            queryParams.append('range', params.range);
        if (params?.limit)
            queryParams.append('limit', params.limit.toString());
        if (params?.offset)
            queryParams.append('offset', params.offset.toString());
        const query = queryParams.toString();
        return this.get(`/campaigns/${campaignKey}/reports/click${query ? `?${query}` : ''}`);
    }
    /**
     * Get open reports
     */
    public async getOpenReports(campaignKey: string, params?: {
        range?: string;
        limit?: number;
        offset?: number;
    }): Promise<any> {
        const queryParams = new URLSearchParams();
        if (params?.range)
            queryParams.append('range', params.range);
        if (params?.limit)
            queryParams.append('limit', params.limit.toString());
        if (params?.offset)
            queryParams.append('offset', params.offset.toString());
        const query = queryParams.toString();
        return this.get(`/campaigns/${campaignKey}/reports/open${query ? `?${query}` : ''}`);
    }
    /**
     * Get unsubscribe reports
     */
    public async getUnsubscribeReports(campaignKey: string, params?: {
        range?: string;
        limit?: number;
        offset?: number;
    }): Promise<any> {
        const queryParams = new URLSearchParams();
        if (params?.range)
            queryParams.append('range', params.range);
        if (params?.limit)
            queryParams.append('limit', params.limit.toString());
        if (params?.offset)
            queryParams.append('offset', params.offset.toString());
        const query = queryParams.toString();
        return this.get(`/campaigns/${campaignKey}/reports/unsubscribe${query ? `?${query}` : ''}`);
    }
    /**
     * Get spam reports
     */
    public async getSpamReports(campaignKey: string, params?: {
        range?: string;
        limit?: number;
        offset?: number;
    }): Promise<any> {
        const queryParams = new URLSearchParams();
        if (params?.range)
            queryParams.append('range', params.range);
        if (params?.limit)
            queryParams.append('limit', params.limit.toString());
        if (params?.offset)
            queryParams.append('offset', params.offset.toString());
        const query = queryParams.toString();
        return this.get(`/campaigns/${campaignKey}/reports/spam${query ? `?${query}` : ''}`);
    }
    // ========== UTILITY METHODS ==========
    /**
     * Test email delivery
     */
    public async sendTestEmail(campaignKey: string, testEmails: string[]): Promise<any> {
        return this.post(`/campaigns/${campaignKey}/actions/test`, {
            emailids: testEmails
        });
    }
    /**
     * Get account details
     */
    public async getAccountDetails(): Promise<any> {
        return this.get('/account');
    }
    /**
     * Get organization details
     */
    public async getOrganizationDetails(): Promise<any> {
        return this.get('/organization');
    }
    /**
     * Get sender email addresses
     */
    public async getSenderEmails(): Promise<any> {
        return this.get('/senderemails');
    }
    /**
     * Add sender email address
     */
    public async addSenderEmail(senderEmail: string, senderName?: string): Promise<any> {
        const payload = {
            senderemail: senderEmail,
            ...(senderName && { sendername: senderName })
        };
        return this.post('/senderemails', payload);
    }
    /**
     * Verify sender email address
     */
    public async verifySenderEmail(senderEmail: string): Promise<any> {
        return this.post(`/senderemails/${encodeURIComponent(senderEmail)}/actions/verify`);
    }
    public destroy(): void {
        this.removeAllListeners();
        this.requestQueue = [];
    }
}
// ========== TYPES AND INTERFACES ==========
export interface Campaign {
    campaignKey: string;
    campaignName: string;
    subject: string;
    fromEmail: string;
    fromName: string;
    status: string;
    createdTime: string;
    scheduledTime?: string;
    sentTime?: string;
    totalRecipients?: number;
    deliveredCount?: number;
    openCount?: number;
    clickCount?: number;
    bounceCount?: number;
    unsubscribeCount?: number;
}
export interface MailingList {
    listKey: string;
    listName: string;
    description?: string;
    activeCount: number;
    bounceCount: number;
    unsubscribeCount: number;
    createdTime: string;
    modifiedTime: string;
}
export interface Contact {
    contactEmail: string;
    firstName?: string;
    lastName?: string;
    status: string;
    subscribedTime?: string;
    unsubscribedTime?: string;
    bounceCount?: number;
    customFields?: {
        [key: string]: string;
    };
}
export interface Template {
    templateKey: string;
    templateName: string;
    subject: string;
    htmlContent: string;
    textContent?: string;
    templateType: string;
    createdTime: string;
    modifiedTime: string;
}
export interface CampaignStats {
    campaignKey: string;
    totalRecipients: number;
    deliveredCount: number;
    openCount: number;
    clickCount: number;
    bounceCount: number;
    unsubscribeCount: number;
    spamCount: number;
    deliveryRate: number;
    openRate: number;
    clickRate: number;
    bounceRate: number;
    unsubscribeRate: number;
    spamRate: number;
}
export interface DeliveryReport {
    contactEmail: string;
    status: string;
    timestamp: string;
    reason?: string;
    errorCode?: string;
}
export default ZohoCampaignsClient;
