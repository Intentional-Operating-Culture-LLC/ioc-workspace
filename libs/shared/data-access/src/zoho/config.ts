/**
 * Zoho Campaigns Configuration Loader
 * Loads configuration from environment variables or configuration files
 */
import type { zoho } from "@ioc/shared/types";
type ZohoCampaignsConfig = zoho.ZohoCampaignsConfig;
type AutomationConfig = zoho.AutomationConfig;
type ZohoEnvironmentConfig = zoho.ZohoEnvironmentConfig;
// Conditionally import fs and path only in Node.js environment
let readFileSync: ((path: string, encoding: string) => string) | undefined;
let join: ((...paths: string[]) => string) | undefined;
// Use dynamic imports with proper typing to avoid bundler issues
if (typeof window === 'undefined' && typeof process !== 'undefined') {
    // We're in a Node.js environment
    try {
        // Use eval to prevent bundler from analyzing these imports
        const _require = eval('require');
        const fs = _require('fs');
        const path = _require('path');
        readFileSync = fs.readFileSync;
        join = path.join;
    }
    catch (error) {
        // In case modules are not available
        console.warn('Node.js modules not available in this environment');
    }
}
export class ZohoConfigLoader {
    private envConfig: ZohoEnvironmentConfig;
    private configPath: string;
    constructor(configPath?: string) {
        // Defer path construction to avoid build-time issues
        this.configPath = configPath || 'config/environments/zoho-complete.env';
        this.envConfig = {} as ZohoEnvironmentConfig; // Initialize as empty, load on demand
    }
    /**
     * Load configuration from environment variables or .env file
     */
    private loadEnvironmentConfig(): ZohoEnvironmentConfig {
        // Try to load from .env file first (only in Node.js environment)
        if (readFileSync && typeof window === 'undefined') {
            try {
                // Construct full path at runtime
                const fullPath = join && this.configPath.indexOf('/') !== 0
                    ? join(process.cwd(), this.configPath)
                    : this.configPath;
                const envFile = readFileSync(fullPath, 'utf8');
                const envVars: any = {};
                envFile.split('\n').forEach(line => {
                    const cleanLine = line.trim();
                    if (cleanLine && !cleanLine.startsWith('#') && cleanLine.includes('=')) {
                        const [key, ...valueParts] = cleanLine.split('=');
                        const value = valueParts.join('=').trim();
                        envVars[key.trim()] = value;
                    }
                });
                return {
                    ZOHO_CAMPAIGNS_CLIENT_ID: envVars.ZOHO_CAMPAIGNS_CLIENT_ID || (typeof process !== 'undefined' ? process.env.ZOHO_CAMPAIGNS_CLIENT_ID : ''),
                    ZOHO_CAMPAIGNS_CLIENT_SECRET: envVars.ZOHO_CAMPAIGNS_CLIENT_SECRET || (typeof process !== 'undefined' ? process.env.ZOHO_CAMPAIGNS_CLIENT_SECRET : ''),
                    ZOHO_CAMPAIGNS_REFRESH_TOKEN: envVars.ZOHO_CAMPAIGNS_REFRESH_TOKEN || (typeof process !== 'undefined' ? process.env.ZOHO_CAMPAIGNS_REFRESH_TOKEN : ''),
                    ZOHO_CAMPAIGNS_ACCESS_TOKEN: envVars.ZOHO_CAMPAIGNS_ACCESS_TOKEN || (typeof process !== 'undefined' ? process.env.ZOHO_CAMPAIGNS_ACCESS_TOKEN : ''),
                    ZOHO_REGION: envVars.ZOHO_REGION || (typeof process !== 'undefined' ? process.env.ZOHO_REGION : '') || 'com',
                    COMPANY_NAME: envVars.COMPANY_NAME || (typeof process !== 'undefined' ? process.env.COMPANY_NAME : '') || 'IOC Framework',
                    COMPANY_EMAIL: envVars.COMPANY_EMAIL || (typeof process !== 'undefined' ? process.env.COMPANY_EMAIL : '') || 'admin@iocframework.com',
                    COMPANY_ADDRESS: envVars.COMPANY_ADDRESS || (typeof process !== 'undefined' ? process.env.COMPANY_ADDRESS : '') || 'Your Company Address',
                    ENABLE_EMAIL_AUTOMATION: envVars.ENABLE_EMAIL_AUTOMATION || (typeof process !== 'undefined' ? process.env.ENABLE_EMAIL_AUTOMATION : '') || 'true',
                    MAX_REQUESTS_PER_MINUTE: envVars.MAX_REQUESTS_PER_MINUTE || (typeof process !== 'undefined' ? process.env.MAX_REQUESTS_PER_MINUTE : '') || '100',
                    BURST_SIZE: envVars.BURST_SIZE || (typeof process !== 'undefined' ? process.env.BURST_SIZE : '') || '10',
                    LOG_LEVEL: envVars.LOG_LEVEL || (typeof process !== 'undefined' ? process.env.LOG_LEVEL : '') || 'info',
                    DEBUG: envVars.DEBUG || (typeof process !== 'undefined' ? process.env.DEBUG : '') || 'false'
                };
            }
            catch (error) {
                // Fallback to environment variables only
            }
        }
        // Fallback to environment variables only (works in both Node.js and browser)
        return {
            ZOHO_CAMPAIGNS_CLIENT_ID: (typeof process !== 'undefined' ? process.env.ZOHO_CAMPAIGNS_CLIENT_ID : '') || '',
            ZOHO_CAMPAIGNS_CLIENT_SECRET: (typeof process !== 'undefined' ? process.env.ZOHO_CAMPAIGNS_CLIENT_SECRET : '') || '',
            ZOHO_CAMPAIGNS_REFRESH_TOKEN: (typeof process !== 'undefined' ? process.env.ZOHO_CAMPAIGNS_REFRESH_TOKEN : '') || '',
            ZOHO_CAMPAIGNS_ACCESS_TOKEN: (typeof process !== 'undefined' ? process.env.ZOHO_CAMPAIGNS_ACCESS_TOKEN : '') || '',
            ZOHO_REGION: (typeof process !== 'undefined' ? process.env.ZOHO_REGION : '') || 'com',
            COMPANY_NAME: (typeof process !== 'undefined' ? process.env.COMPANY_NAME : '') || 'IOC Framework',
            COMPANY_EMAIL: (typeof process !== 'undefined' ? process.env.COMPANY_EMAIL : '') || 'admin@iocframework.com',
            COMPANY_ADDRESS: (typeof process !== 'undefined' ? process.env.COMPANY_ADDRESS : '') || 'Your Company Address',
            ENABLE_EMAIL_AUTOMATION: (typeof process !== 'undefined' ? process.env.ENABLE_EMAIL_AUTOMATION : '') || 'true',
            MAX_REQUESTS_PER_MINUTE: (typeof process !== 'undefined' ? process.env.MAX_REQUESTS_PER_MINUTE : '') || '100',
            BURST_SIZE: (typeof process !== 'undefined' ? process.env.BURST_SIZE : '') || '10',
            LOG_LEVEL: (typeof process !== 'undefined' ? process.env.LOG_LEVEL : '') || 'info',
            DEBUG: (typeof process !== 'undefined' ? process.env.DEBUG : '') || 'false'
        };
    }
    /**
     * Ensure configuration is loaded
     */
    private ensureConfigLoaded(): void {
        if (!this.envConfig.ZOHO_CAMPAIGNS_CLIENT_ID) {
            this.envConfig = this.loadEnvironmentConfig();
        }
    }
    /**
     * Get basic Zoho Campaigns client configuration
     */
    public getCampaignsClientConfig(): ZohoCampaignsConfig {
        this.ensureConfigLoaded();
        this.validateRequiredCredentials();
        return {
            clientId: this.envConfig.ZOHO_CAMPAIGNS_CLIENT_ID,
            clientSecret: this.envConfig.ZOHO_CAMPAIGNS_CLIENT_SECRET,
            refreshToken: this.envConfig.ZOHO_CAMPAIGNS_REFRESH_TOKEN,
            accessToken: this.envConfig.ZOHO_CAMPAIGNS_ACCESS_TOKEN,
            region: this.envConfig.ZOHO_REGION,
            maxRetries: 3,
            retryDelay: 1000,
            timeout: 30000,
            rateLimit: {
                requestsPerMinute: parseInt(this.envConfig.MAX_REQUESTS_PER_MINUTE || '100'),
                burstSize: parseInt(this.envConfig.BURST_SIZE || '10')
            }
        };
    }
    /**
     * Get full automation service configuration
     */
    public getAutomationConfig(): AutomationConfig {
        const baseConfig = this.getCampaignsClientConfig();
        return {
            ...baseConfig,
            defaultFromEmail: this.envConfig.COMPANY_EMAIL || 'admin@iocframework.com',
            defaultFromName: this.envConfig.COMPANY_NAME || 'IOC Framework',
            defaultReplyTo: this.envConfig.COMPANY_EMAIL || 'admin@iocframework.com',
            companyName: this.envConfig.COMPANY_NAME || 'IOC Framework',
            companyAddress: this.envConfig.COMPANY_ADDRESS || 'Your Company Address',
            trackingEnabled: true,
            autoOptIn: false,
            unsubscribeLink: '[UNSUBSCRIBE]'
        };
    }
    /**
     * Get demo configuration for testing
     */
    public getDemoConfig(): AutomationConfig {
        const baseConfig = this.getAutomationConfig();
        return {
            ...baseConfig,
            defaultFromEmail: 'demo@iocframework.com',
            defaultFromName: 'IOC Demo',
            defaultReplyTo: 'demo@iocframework.com',
            companyName: 'IOC Framework Demo',
            companyAddress: 'Demo Address',
            trackingEnabled: true,
            autoOptIn: true,
            rateLimit: {
                requestsPerMinute: 10, // Lower for demo
                burstSize: 3
            }
        };
    }
    /**
     * Validate that all required credentials are present
     */
    private validateRequiredCredentials(): void {
        const required = [
            'ZOHO_CAMPAIGNS_CLIENT_ID',
            'ZOHO_CAMPAIGNS_CLIENT_SECRET',
            'ZOHO_CAMPAIGNS_REFRESH_TOKEN',
            'ZOHO_CAMPAIGNS_ACCESS_TOKEN'
        ];
        const missing = required.filter(key => !this.envConfig[key as keyof ZohoEnvironmentConfig]);
        if (missing.length > 0) {
            throw new Error(`Missing required Zoho Campaigns configuration: ${missing.join(', ')}`);
        }
    }
    /**
     * Check if configuration is valid
     */
    public isConfigValid(): boolean {
        try {
            this.ensureConfigLoaded();
            this.validateRequiredCredentials();
            return true;
        }
        catch (error) {
            return false;
        }
    }
    /**
     * Get configuration status
     */
    public getConfigStatus(): {
        isValid: boolean;
        hasCredentials: boolean;
        region: string;
        company: string;
        email: string;
        automationEnabled: boolean;
        rateLimit: {
            requestsPerMinute: number;
            burstSize: number;
        };
        debug: boolean;
    } {
        this.ensureConfigLoaded();
        return {
            isValid: this.isConfigValid(),
            hasCredentials: !!(this.envConfig.ZOHO_CAMPAIGNS_CLIENT_ID &&
                this.envConfig.ZOHO_CAMPAIGNS_CLIENT_SECRET &&
                this.envConfig.ZOHO_CAMPAIGNS_REFRESH_TOKEN &&
                this.envConfig.ZOHO_CAMPAIGNS_ACCESS_TOKEN),
            region: this.envConfig.ZOHO_REGION || 'com',
            company: this.envConfig.COMPANY_NAME || 'IOC Framework',
            email: this.envConfig.COMPANY_EMAIL || 'admin@iocframework.com',
            automationEnabled: this.envConfig.ENABLE_EMAIL_AUTOMATION === 'true',
            rateLimit: {
                requestsPerMinute: parseInt(this.envConfig.MAX_REQUESTS_PER_MINUTE || '100'),
                burstSize: parseInt(this.envConfig.BURST_SIZE || '10')
            },
            debug: this.envConfig.DEBUG === 'true'
        };
    }
    /**
     * Get raw environment configuration
     */
    public getRawConfig(): ZohoEnvironmentConfig {
        this.ensureConfigLoaded();
        return { ...this.envConfig };
    }
    /**
     * Update configuration path and reload
     */
    public updateConfigPath(newPath: string): void {
        this.configPath = newPath;
        this.envConfig = this.loadEnvironmentConfig();
    }
}
// Export a lazy-loaded default instance
let _zohoConfig: ZohoConfigLoader | null = null;
export const getZohoConfig = () => {
    if (!_zohoConfig) {
        _zohoConfig = new ZohoConfigLoader();
    }
    return _zohoConfig;
};
// For backward compatibility
export const zohoConfig = new Proxy({} as ZohoConfigLoader, {
    get(target, prop, receiver) {
        return Reflect.get(getZohoConfig(), prop, receiver);
    }
});
// Export factory functions for easy client creation
export function createCampaignsClient(configPath?: string): any {
    const loader = configPath ? new ZohoConfigLoader(configPath) : zohoConfig;
    const config = loader.getCampaignsClientConfig();
    // Dynamic import to avoid circular dependencies
    const _require = eval('require');
    const ZohoCampaignsClient = _require('./campaigns-client').default;
    return new ZohoCampaignsClient(config);
}
export function createAutomationService(configPath?: string): any {
    const loader = configPath ? new ZohoConfigLoader(configPath) : zohoConfig;
    const config = loader.getAutomationConfig();
    // Dynamic import to avoid circular dependencies
    const _require = eval('require');
    const CampaignAutomationService = _require('./campaign-automation').default;
    return new CampaignAutomationService(config);
}
export function createDemoService(configPath?: string): any {
    const loader = configPath ? new ZohoConfigLoader(configPath) : zohoConfig;
    const config = loader.getDemoConfig();
    // Dynamic import to avoid circular dependencies
    const _require = eval('require');
    const CampaignAutomationService = _require('./campaign-automation').default;
    return new CampaignAutomationService(config);
}
export default ZohoConfigLoader;
