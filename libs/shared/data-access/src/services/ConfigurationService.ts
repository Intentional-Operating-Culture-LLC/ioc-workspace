/**
 * Unified Configuration Service
 * Manages all configuration for Zoho integration and other services
 */

import { IConfigurationService, ServiceHealth, ValidationResult, ValidationError, ValidationWarning } from './interfaces';
import * as fs from 'fs';
import * as path from 'path';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config();

export class ConfigurationService implements IConfigurationService {
  name = 'ConfigurationService';
  private config: Record<string, any> = {};
  private subscribers: Map<string, Set<(value: any) => void>> = new Map();
  private configPath: string;
  private environment: string;

  constructor(configPath?: string) {
    this.environment = process.env.NODE_ENV || 'development';
    this.configPath = configPath || path.join(process.cwd(), 'config');
    this.loadConfiguration();
  }

  async initialize(): Promise<void> {
    console.log('🚀 Initializing Configuration Service...');
    await this.reload();
    console.log('✅ Configuration Service initialized');
  }

  async shutdown(): Promise<void> {
    console.log('🛑 Shutting down Configuration Service...');
    this.subscribers.clear();
    console.log('✅ Configuration Service shut down');
  }

  async healthCheck(): Promise<ServiceHealth> {
    const validation = this.validate();
    return {
      status: validation.valid ? 'healthy' : validation.errors.length > 0 ? 'unhealthy' : 'degraded',
      message: validation.valid ? 'Configuration is valid' : `${validation.errors.length} errors, ${validation.warnings.length} warnings`,
      lastCheck: new Date(),
      details: {
        errors: validation.errors,
        warnings: validation.warnings,
        environment: this.environment
      }
    };
  }

  get<T = any>(key: string): T {
    const keys = key.split('.');
    let value: any = this.config;
    
    for (const k of keys) {
      value = value?.[k];
      if (value === undefined) break;
    }
    
    return value as T;
  }

  set(key: string, value: any): void {
    const keys = key.split('.');
    let current = this.config;
    
    for (let i = 0; i < keys.length - 1; i++) {
      if (!current[keys[i]]) {
        current[keys[i]] = {};
      }
      current = current[keys[i]];
    }
    
    current[keys[keys.length - 1]] = value;
    this.notifySubscribers(key, value);
  }

  getAll(): Record<string, any> {
    return { ...this.config };
  }

  validate(): ValidationResult {
    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];

    // Validate Zoho configuration
    this.validateZohoConfig(errors, warnings);
    
    // Validate database configuration
    this.validateDatabaseConfig(errors, warnings);
    
    // Validate security configuration
    this.validateSecurityConfig(errors, warnings);
    
    // Validate feature flags
    this.validateFeatureFlags(errors, warnings);

    return {
      valid: errors.length === 0,
      errors,
      warnings
    };
  }

  async reload(): Promise<void> {
    this.loadConfiguration();
    
    // Notify all subscribers about the reload
    for (const [key, callbacks] of this.subscribers.entries()) {
      const value = this.get(key);
      callbacks.forEach(callback => callback(value));
    }
  }

  subscribe(key: string, callback: (value: any) => void): () => void {
    if (!this.subscribers.has(key)) {
      this.subscribers.set(key, new Set());
    }
    
    this.subscribers.get(key)!.add(callback);
    
    // Return unsubscribe function
    return () => {
      const callbacks = this.subscribers.get(key);
      if (callbacks) {
        callbacks.delete(callback);
        if (callbacks.size === 0) {
          this.subscribers.delete(key);
        }
      }
    };
  }

  private loadConfiguration(): void {
    // Base configuration
    this.config = {
      // Company Information
      company: {
        name: process.env.COMPANY_NAME || 'IOC Framework',
        email: process.env.COMPANY_EMAIL || 'admin@iocframework.com',
        website: process.env.COMPANY_WEBSITE || 'https://iocframework.com'
      },

      // Zoho Configuration
      zoho: {
        organization: {
          orgId: process.env.ZOHO_ORG_ID,
          region: process.env.ZOHO_REGION || 'com',
          apiDomain: `https://www.zohoapis.${process.env.ZOHO_REGION || 'com'}`
        },
        services: {
          crm: {
            clientId: process.env.ZOHO_CRM_CLIENT_ID,
            clientSecret: process.env.ZOHO_CRM_CLIENT_SECRET,
            refreshToken: process.env.ZOHO_CRM_REFRESH_TOKEN,
            baseUrl: '/crm/v2',
            scopes: [
              'ZohoCRM.modules.ALL',
              'ZohoCRM.settings.ALL',
              'ZohoCRM.org.ALL',
              'ZohoCRM.bulk.ALL',
              'ZohoCRM.notifications.ALL'
            ]
          },
          campaigns: {
            clientId: process.env.ZOHO_CAMPAIGNS_CLIENT_ID,
            clientSecret: process.env.ZOHO_CAMPAIGNS_CLIENT_SECRET,
            refreshToken: process.env.ZOHO_CAMPAIGNS_REFRESH_TOKEN,
            baseUrl: '/campaigns/v1.1',
            scopes: [
              'ZohoCampaigns.campaign.ALL',
              'ZohoCampaigns.contact.ALL',
              'ZohoCampaigns.list.ALL',
              'ZohoCampaigns.email.ALL'
            ]
          },
          analytics: {
            clientId: process.env.ZOHO_ANALYTICS_CLIENT_ID,
            clientSecret: process.env.ZOHO_ANALYTICS_CLIENT_SECRET,
            refreshToken: process.env.ZOHO_ANALYTICS_REFRESH_TOKEN,
            baseUrl: '/analyticsapi/v2',
            scopes: [
              'ZohoAnalytics.data.ALL',
              'ZohoAnalytics.modeling.ALL',
              'ZohoAnalytics.embed.ALL'
            ]
          },
          forms: {
            clientId: process.env.ZOHO_FORMS_CLIENT_ID,
            clientSecret: process.env.ZOHO_FORMS_CLIENT_SECRET,
            refreshToken: process.env.ZOHO_FORMS_REFRESH_TOKEN,
            baseUrl: '/forms/v1',
            scopes: [
              'ZohoForms.form.ALL',
              'ZohoForms.report.ALL',
              'ZohoForms.dashboard.ALL'
            ]
          },
          desk: {
            clientId: process.env.ZOHO_DESK_CLIENT_ID,
            clientSecret: process.env.ZOHO_DESK_CLIENT_SECRET,
            refreshToken: process.env.ZOHO_DESK_REFRESH_TOKEN,
            baseUrl: '/desk/v1',
            scopes: [
              'Desk.tickets.ALL',
              'Desk.contacts.ALL',
              'Desk.settings.ALL'
            ]
          }
        },
        webhooks: {
          secret: process.env.ZOHO_WEBHOOK_SECRET,
          baseUrl: process.env.WEBHOOK_BASE_URL || 'https://iocframework.com/api/zoho',
          endpoints: {
            crm: '/webhooks/crm',
            campaigns: '/webhooks/campaigns',
            forms: '/webhooks/forms',
            desk: '/webhooks/desk'
          }
        }
      },

      // Database Configuration
      database: {
        supabase: {
          url: process.env.SUPABASE_URL,
          anonKey: process.env.SUPABASE_ANON_KEY,
          serviceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY
        }
      },

      // Email Configuration
      email: {
        smtp: {
          host: process.env.SMTP_HOST || 'smtp.zoho.com',
          port: parseInt(process.env.SMTP_PORT || '587'),
          secure: false,
          auth: {
            user: process.env.SMTP_USER || 'admin@iocframework.com',
            pass: process.env.SMTP_PASS
          }
        }
      },

      // Analytics Configuration
      analytics: {
        googleAnalyticsId: process.env.GOOGLE_ANALYTICS_ID,
        googleTagManagerId: process.env.GOOGLE_TAG_MANAGER_ID,
        facebookPixelId: process.env.FACEBOOK_PIXEL_ID
      },

      // API Rate Limiting
      rateLimiting: {
        maxRequestsPerMinute: parseInt(process.env.MAX_REQUESTS_PER_MINUTE || '100'),
        burstSize: parseInt(process.env.BURST_SIZE || '10'),
        retryAttempts: 3,
        retryDelay: 1000 // milliseconds
      },

      // Security
      security: {
        jwtSecret: process.env.JWT_SECRET,
        encryptionKey: process.env.ENCRYPTION_KEY,
        tokenExpiry: '24h'
      },

      // Feature Flags
      features: {
        leadScoring: process.env.ENABLE_LEAD_SCORING === 'true',
        emailAutomation: process.env.ENABLE_EMAIL_AUTOMATION === 'true',
        analyticsSync: process.env.ENABLE_ANALYTICS_SYNC === 'true',
        webhookProcessing: process.env.ENABLE_WEBHOOK_PROCESSING === 'true',
        realTimeSync: process.env.ENABLE_REAL_TIME_SYNC === 'true'
      },

      // Monitoring Configuration
      monitoring: {
        healthCheckInterval: parseInt(process.env.HEALTH_CHECK_INTERVAL || '300000'),
        syncInterval: parseInt(process.env.SYNC_INTERVAL || '300000'),
        reportInterval: parseInt(process.env.REPORT_INTERVAL || '86400000')
      },

      // Lead Scoring Rules
      leadScoring: {
        rules: {
          demographic: {
            title: {
              'CEO': 25,
              'CTO': 20,
              'Director': 15,
              'Manager': 10,
              'VP': 18,
              'President': 22
            },
            companySize: {
              '1000+': 25,
              '201-1000': 20,
              '51-200': 15,
              '11-50': 10,
              '1-10': 5
            },
            industry: {
              'Technology': 20,
              'Consulting': 18,
              'Finance': 15,
              'Healthcare': 15,
              'Manufacturing': 12,
              'Retail': 10
            }
          },
          behavioral: {
            leadSource: {
              'Demo Request': 30,
              'Pricing Page': 25,
              'Partner Referral': 25,
              'Contact Form': 20,
              'Content Download': 15,
              'Newsletter': 10,
              'Social Media': 8,
              'Cold Outreach': 5
            },
            engagement: {
              'Website Visit': 2,
              'Email Open': 3,
              'Email Click': 5,
              'Form Submission': 10,
              'Demo Attended': 25,
              'Sales Call': 20
            },
            primaryInterest: {
              'Enterprise Solution': 25,
              'Partner Program': 20,
              'Assessment Tools': 15,
              'Analytics Platform': 15
            }
          },
          negative: {
            email: {
              '@competitor.com': -50,
              '@student.': -25,
              '@test.': -30,
              '@temp-mail.': -40
            },
            behavior: {
              'Unsubscribed': -100,
              'Bounced Email': -20,
              'No Response 30 Days': -10
            }
          }
        },
        thresholds: {
          hot: 80,
          warm: 50,
          cold: 0
        }
      }
    };

    // Try to load environment-specific configuration
    try {
      const envConfigPath = path.join(this.configPath, `${this.environment}.json`);
      if (fs.existsSync(envConfigPath)) {
        const envConfig = JSON.parse(fs.readFileSync(envConfigPath, 'utf-8'));
        this.mergeConfig(this.config, envConfig);
      }
    } catch (error) {
      console.warn(`Failed to load environment configuration: ${error}`);
    }

    // Try to load local configuration (for development)
    try {
      const localConfigPath = path.join(this.configPath, 'local.json');
      if (fs.existsSync(localConfigPath)) {
        const localConfig = JSON.parse(fs.readFileSync(localConfigPath, 'utf-8'));
        this.mergeConfig(this.config, localConfig);
      }
    } catch (error) {
      console.warn(`Failed to load local configuration: ${error}`);
    }
  }

  private mergeConfig(target: any, source: any): void {
    for (const key in source) {
      if (source.hasOwnProperty(key)) {
        if (typeof source[key] === 'object' && !Array.isArray(source[key]) && source[key] !== null) {
          if (!target[key]) target[key] = {};
          this.mergeConfig(target[key], source[key]);
        } else {
          target[key] = source[key];
        }
      }
    }
  }

  private validateZohoConfig(errors: ValidationError[], warnings: ValidationWarning[]): void {
    // Check organization ID
    if (!this.get('zoho.organization.orgId')) {
      errors.push({
        key: 'zoho.organization.orgId',
        message: 'Zoho Organization ID is required'
      });
    }

    // Check service configurations
    const services = ['crm', 'campaigns', 'analytics', 'forms', 'desk'];
    for (const service of services) {
      const serviceConfig = this.get(`zoho.services.${service}`);
      
      if (!serviceConfig?.clientId) {
        warnings.push({
          key: `zoho.services.${service}.clientId`,
          message: `${service.toUpperCase()} Client ID is missing`,
          suggestion: `Set ZOHO_${service.toUpperCase()}_CLIENT_ID environment variable`
        });
      }
      
      if (!serviceConfig?.clientSecret) {
        warnings.push({
          key: `zoho.services.${service}.clientSecret`,
          message: `${service.toUpperCase()} Client Secret is missing`,
          suggestion: `Set ZOHO_${service.toUpperCase()}_CLIENT_SECRET environment variable`
        });
      }
      
      if (!serviceConfig?.refreshToken) {
        warnings.push({
          key: `zoho.services.${service}.refreshToken`,
          message: `${service.toUpperCase()} Refresh Token is missing`,
          suggestion: `Set ZOHO_${service.toUpperCase()}_REFRESH_TOKEN environment variable`
        });
      }
    }
  }

  private validateDatabaseConfig(errors: ValidationError[], warnings: ValidationWarning[]): void {
    if (!this.get('database.supabase.url')) {
      errors.push({
        key: 'database.supabase.url',
        message: 'Supabase URL is required'
      });
    }

    if (!this.get('database.supabase.anonKey')) {
      errors.push({
        key: 'database.supabase.anonKey',
        message: 'Supabase Anonymous Key is required'
      });
    }
  }

  private validateSecurityConfig(errors: ValidationError[], warnings: ValidationWarning[]): void {
    if (!this.get('security.jwtSecret')) {
      errors.push({
        key: 'security.jwtSecret',
        message: 'JWT Secret is required for authentication'
      });
    }

    if (!this.get('security.encryptionKey')) {
      warnings.push({
        key: 'security.encryptionKey',
        message: 'Encryption key is missing',
        suggestion: 'Set ENCRYPTION_KEY environment variable for enhanced security'
      });
    }
  }

  private validateFeatureFlags(errors: ValidationError[], warnings: ValidationWarning[]): void {
    const features = this.get('features');
    if (!features || Object.keys(features).length === 0) {
      warnings.push({
        key: 'features',
        message: 'No feature flags configured',
        suggestion: 'Configure feature flags for better control over functionality'
      });
    }
  }

  private notifySubscribers(key: string, value: any): void {
    // Notify exact key subscribers
    const exactCallbacks = this.subscribers.get(key);
    if (exactCallbacks) {
      exactCallbacks.forEach(callback => callback(value));
    }

    // Notify parent key subscribers
    const parts = key.split('.');
    for (let i = parts.length - 1; i > 0; i--) {
      const parentKey = parts.slice(0, i).join('.');
      const parentCallbacks = this.subscribers.get(parentKey);
      if (parentCallbacks) {
        const parentValue = this.get(parentKey);
        parentCallbacks.forEach(callback => callback(parentValue));
      }
    }
  }
}

// Export singleton instance
export const configurationService = new ConfigurationService();