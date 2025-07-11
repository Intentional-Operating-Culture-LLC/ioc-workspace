/**
 * Email Service (TypeScript)
 * Unified email service for all email operations
 */

import axios, { AxiosError } from 'axios';
import { EventEmitter } from 'events';
import { IEmailService, ServiceHealth, TransactionalEmailOptions, CampaignEmailOptions, TestEmailOptions, EmailSendResult, EmailTemplate, CampaignStats, EmailRecipient } from './interfaces';
import { configurationService } from './ConfigurationService';

interface AccessTokenCache {
  token: string;
  expiresAt: number;
}

export class EmailService extends EventEmitter implements IEmailService {
  name = 'EmailService';
  private accessTokenCache: Map<string, AccessTokenCache> = new Map();
  private retryAttempts: number;
  private retryDelay: number;
  private tokenExpiryBuffer = 5 * 60 * 1000; // 5 minutes buffer

  constructor() {
    super();
    this.retryAttempts = configurationService.get<number>('rateLimiting.retryAttempts') || 3;
    this.retryDelay = configurationService.get<number>('rateLimiting.retryDelay') || 1000;
  }

  async initialize(): Promise<void> {
    console.log('🚀 Initializing Email Service...');
    
    // Validate configuration
    const validation = configurationService.validate();
    if (!validation.valid) {
      console.warn('⚠️  Configuration validation warnings:', validation.warnings);
    }
    
    console.log('✅ Email Service initialized');
  }

  async shutdown(): Promise<void> {
    console.log('🛑 Shutting down Email Service...');
    this.accessTokenCache.clear();
    this.removeAllListeners();
    console.log('✅ Email Service shut down');
  }

  async healthCheck(): Promise<ServiceHealth> {
    try {
      // Try to get an access token to verify credentials
      await this.getAccessToken('campaigns');
      
      return {
        status: 'healthy',
        message: 'Email Service is operational',
        lastCheck: new Date(),
        details: {
          tokensCached: this.accessTokenCache.size,
          retryAttempts: this.retryAttempts,
          retryDelay: this.retryDelay
        }
      };
    } catch (error: any) {
      return {
        status: 'unhealthy',
        message: `Email Service health check failed: ${error.message}`,
        lastCheck: new Date(),
        details: { error: error.message }
      };
    }
  }

  async sendTransactionalEmail(options: TransactionalEmailOptions): Promise<EmailSendResult> {
    try {
      const accessToken = await this.getAccessToken('campaigns');
      
      const mailData = {
        from: {
          address: options.fromEmail || configurationService.get<string>('company.email'),
          name: options.fromName || configurationService.get<string>('company.name')
        },
        to: Array.isArray(options.to) ? options.to.map(email => ({ address: email })) : [{ address: options.to }],
        subject: options.subject,
        htmlbody: options.htmlContent || options.content,
        textbody: options.textContent || this.stripHtml(options.content || ''),
        cc: options.cc ? (Array.isArray(options.cc) ? options.cc.map(email => ({ address: email })) : [{ address: options.cc }]) : undefined,
        bcc: options.bcc ? (Array.isArray(options.bcc) ? options.bcc.map(email => ({ address: email })) : [{ address: options.bcc }]) : undefined
      };

      const response = await this.executeWithRetry(async () => {
        return axios.post('https://mail.zoho.com/api/accounts/0/messages', mailData, {
          headers: {
            'Authorization': `Zoho-oauthtoken ${accessToken}`,
            'Content-Type': 'application/json'
          }
        });
      });

      this.emit('transactional_sent', { 
        to: options.to,
        subject: options.subject,
        response: response.data
      });

      return {
        success: true,
        messageId: response.data.messageId,
        details: response.data
      };
    } catch (error: any) {
      this.emit('error', { 
        action: 'sendTransactionalEmail', 
        error: error.message 
      });
      
      return {
        success: false,
        error: error.message
      };
    }
  }

  async sendCampaignEmail(options: CampaignEmailOptions): Promise<EmailSendResult> {
    try {
      const accessToken = await this.getAccessToken('campaigns');
      
      // Ensure we have a list
      let listKey = options.listKey;
      if (!listKey && options.listName) {
        const list = await this.createOrGetMailingList({
          listname: options.listName,
          description: `List for ${options.campaignName}`
        });
        listKey = list.listkey || list.list_key;
      }

      if (!listKey) {
        throw new Error('No mailing list specified or created');
      }

      // Add recipients if provided
      if (options.recipients && options.recipients.length > 0) {
        for (const recipient of options.recipients) {
          await this.addContactToList(recipient, listKey);
        }
      }

      // Prepare campaign data
      const emailData = new URLSearchParams({
        resfmt: 'JSON',
        listkey: listKey,
        from_email: options.fromEmail || configurationService.get<string>('company.email'),
        from_name: options.fromName || configurationService.get<string>('company.name'),
        subject: options.subject,
        content: options.htmlContent || options.content || '',
        textcontent: options.textContent || this.stripHtml(options.content || ''),
        campaign_name: options.campaignName
      });

      // Send the campaign
      const response = await this.executeWithRetry(async () => {
        return axios.post('https://campaigns.zoho.com/api/v1.1/sendmailinglist', emailData, {
          headers: {
            'Authorization': `Zoho-oauthtoken ${accessToken}`,
            'Content-Type': 'application/x-www-form-urlencoded'
          }
        });
      });

      this.emit('campaign_sent', { 
        campaignName: options.campaignName,
        subject: options.subject,
        recipients: options.recipients?.length || 0,
        response: response.data
      });

      return {
        success: true,
        campaignId: response.data.campaignkey,
        details: response.data
      };
    } catch (error: any) {
      this.emit('error', { 
        action: 'sendCampaignEmail', 
        error: error.message 
      });
      
      return {
        success: false,
        error: error.message
      };
    }
  }

  async sendTestEmail(options?: TestEmailOptions): Promise<EmailSendResult> {
    const timestamp = new Date().toLocaleString('en-US', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      timeZoneName: 'short'
    });

    const defaultOptions: CampaignEmailOptions = {
      campaignName: options?.campaignName || 'IOC Test Campaign',
      subject: options?.subject || `IOC Framework Test Email - ${timestamp}`,
      content: options?.content || this.getDefaultTestEmailContent(timestamp),
      listName: options?.listName || 'IOC Test List',
      recipients: [{ 
        email: options?.to || 'demo_user001@iocframework.com',
        firstName: 'Demo',
        lastName: 'User'
      }]
    };

    try {
      const result = await this.sendCampaignEmail(defaultOptions);
      console.log('✅ Test email sent successfully');
      return result;
    } catch (error: any) {
      console.error('❌ Failed to send test email:', error.message);
      throw error;
    }
  }

  async getEmailTemplates(): Promise<EmailTemplate[]> {
    try {
      const accessToken = await this.getAccessToken('campaigns');
      
      const response = await this.executeWithRetry(async () => {
        return axios.get('https://campaigns.zoho.com/api/v1.1/gettemplates', {
          headers: {
            'Authorization': `Zoho-oauthtoken ${accessToken}`
          },
          params: {
            resfmt: 'JSON'
          }
        });
      });

      const templates = response.data?.template_list || [];
      
      return templates.map((template: any) => ({
        id: template.template_id,
        name: template.template_name,
        subject: template.subject,
        content: template.content,
        category: template.category,
        createdAt: new Date(template.created_time),
        updatedAt: new Date(template.modified_time)
      }));
    } catch (error: any) {
      this.emit('error', { 
        action: 'getEmailTemplates', 
        error: error.message 
      });
      return [];
    }
  }

  async getCampaignStats(campaignId: string): Promise<CampaignStats> {
    try {
      const accessToken = await this.getAccessToken('campaigns');
      
      const response = await this.executeWithRetry(async () => {
        return axios.get('https://campaigns.zoho.com/api/v1.1/getcampaigndetails', {
          headers: {
            'Authorization': `Zoho-oauthtoken ${accessToken}`
          },
          params: {
            resfmt: 'JSON',
            campaignkey: campaignId
          }
        });
      });

      const stats = response.data;
      
      return {
        campaignId,
        sent: parseInt(stats.sent_count || '0'),
        delivered: parseInt(stats.delivered_count || '0'),
        opened: parseInt(stats.opened_count || '0'),
        clicked: parseInt(stats.clicked_count || '0'),
        bounced: parseInt(stats.bounced_count || '0'),
        unsubscribed: parseInt(stats.unsubscribed_count || '0'),
        spam: parseInt(stats.spam_count || '0'),
        lastUpdated: new Date()
      };
    } catch (error: any) {
      this.emit('error', { 
        action: 'getCampaignStats', 
        error: error.message 
      });
      throw error;
    }
  }

  private async getAccessToken(service: string = 'campaigns'): Promise<string> {
    const cacheKey = `token_${service}`;
    const cached = this.accessTokenCache.get(cacheKey);
    
    if (cached && cached.expiresAt > Date.now() + this.tokenExpiryBuffer) {
      return cached.token;
    }

    try {
      const serviceConfig = configurationService.get<any>(`zoho.services.${service}`);
      if (!serviceConfig) {
        throw new Error(`Unknown service: ${service}`);
      }

      const response = await axios.post('https://accounts.zoho.com/oauth/v2/token', null, {
        params: {
          grant_type: 'refresh_token',
          client_id: serviceConfig.clientId,
          client_secret: serviceConfig.clientSecret,
          refresh_token: serviceConfig.refreshToken
        }
      });

      const { access_token, expires_in } = response.data;
      
      // Cache the token
      this.accessTokenCache.set(cacheKey, {
        token: access_token,
        expiresAt: Date.now() + (expires_in * 1000)
      });

      this.emit('token_refreshed', { service, expiresIn: expires_in });
      return access_token;
    } catch (error: any) {
      this.emit('error', { 
        action: 'getAccessToken', 
        service, 
        error: error.response?.data || error.message 
      });
      throw new Error(`Failed to get access token for ${service}: ${error.message}`);
    }
  }

  private async executeWithRetry<T>(requestFn: () => Promise<T>, attempt: number = 1): Promise<T> {
    try {
      return await requestFn();
    } catch (error: any) {
      if (attempt < this.retryAttempts) {
        const delay = this.retryDelay * Math.pow(2, attempt - 1); // Exponential backoff
        this.emit('retry', { attempt, delay, error: error.message });
        
        await new Promise(resolve => setTimeout(resolve, delay));
        return this.executeWithRetry(requestFn, attempt + 1);
      }
      throw error;
    }
  }

  private async createOrGetMailingList(listData: { listname: string; description: string }): Promise<any> {
    const accessToken = await this.getAccessToken('campaigns');
    
    return this.executeWithRetry(async () => {
      // First try to get existing lists
      const getListsResponse = await axios.get('https://campaigns.zoho.com/api/v1.1/getmailinglists', {
        headers: {
          'Authorization': `Zoho-oauthtoken ${accessToken}`
        },
        params: {
          resfmt: 'JSON',
          range: 100
        }
      });

      const lists = getListsResponse.data?.list_of_details || [];
      const existingList = lists.find((list: any) => list.listname === listData.listname);

      if (existingList) {
        this.emit('list_found', { listId: existingList.listkey, name: existingList.listname });
        return existingList;
      }

      // Create new list if not found
      const createData = new URLSearchParams({
        listname: listData.listname,
        description: listData.description,
        resfmt: 'JSON'
      });

      const createResponse = await axios.post('https://campaigns.zoho.com/api/v1.1/json/listcreate', createData, {
        headers: {
          'Authorization': `Zoho-oauthtoken ${accessToken}`,
          'Content-Type': 'application/x-www-form-urlencoded'
        }
      });

      this.emit('list_created', { response: createResponse.data });
      return createResponse.data;
    });
  }

  private async addContactToList(contact: EmailRecipient, listKey: string): Promise<any> {
    const accessToken = await this.getAccessToken('campaigns');
    
    return this.executeWithRetry(async () => {
      const contactData = new URLSearchParams({
        resfmt: 'JSON',
        listkey: listKey,
        contactinfo: JSON.stringify({
          'First Name': contact.firstName || '',
          'Last Name': contact.lastName || '',
          'Contact Email': contact.email,
          ...contact.customFields
        })
      });

      const response = await axios.post('https://campaigns.zoho.com/api/v1.1/json/listsubscribe', contactData, {
        headers: {
          'Authorization': `Zoho-oauthtoken ${accessToken}`,
          'Content-Type': 'application/x-www-form-urlencoded'
        }
      });

      this.emit('contact_added', { email: contact.email, listKey, response: response.data });
      return response.data;
    });
  }

  private getDefaultTestEmailContent(timestamp: string): string {
    return `
      <html>
      <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
        <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
          <h2 style="color: #0066cc;">IOC Framework Integration Test</h2>
          <p>This is a test email from the IOC Framework Zoho integration.</p>
          <p><strong>Timestamp:</strong> ${timestamp}</p>
          <hr style="border: 1px solid #ddd; margin: 20px 0;">
          <h3>Integration Status</h3>
          <ul>
            <li>✅ Authentication: <span style="color: green;">Working</span></li>
            <li>✅ API Connection: <span style="color: green;">Active</span></li>
            <li>✅ Email Service: <span style="color: green;">Operational</span></li>
          </ul>
          <p>If you received this email, the integration is working correctly!</p>
          <hr style="border: 1px solid #ddd; margin: 20px 0;">
          <p style="color: #666; font-size: 12px;">
            IOC Framework | Intelligence Operations Center<br>
            <a href="https://iocframework.com" style="color: #0066cc;">iocframework.com</a>
          </p>
        </div>
      </body>
      </html>
    `;
  }

  private stripHtml(html: string): string {
    return html.replace(/<[^>]*>/g, '')
               .replace(/\s+/g, ' ')
               .trim();
  }
}

// Export singleton instance
export const emailService = new EmailService();