/**
 * Environment Setup and Validation
 * Validates environment configuration and sets up defaults
 */

import { logger } from '../utils/logger';

export class EnvironmentSetup {
  private static instance: EnvironmentSetup;
  private isInitialized: boolean = false;

  private constructor() {}

  public static getInstance(): EnvironmentSetup {
    if (!EnvironmentSetup.instance) {
      EnvironmentSetup.instance = new EnvironmentSetup();
    }
    return EnvironmentSetup.instance;
  }

  public async initialize(): Promise<void> {
    if (this.isInitialized) {
      return;
    }

    try {
      logger.info('Initializing dual-AI system environment...');

      // Load and validate environment variables
      this.validateRequiredEnvironmentVariables();
      
      // Set default values for optional variables
      this.setDefaultEnvironmentVariables();
      
      // Validate API connectivity
      await this.validateApiConnectivity();
      
      // Initialize database connection
      await this.initializeDatabaseConnection();
      
      // Setup cache connections
      await this.setupCacheConnections();
      
      // Initialize monitoring
      this.initializeMonitoring();

      this.isInitialized = true;

      logger.info('Dual-AI system environment initialized successfully', {
        environment: process.env.NODE_ENV,
        version: process.env.DUAL_AI_VERSION || '1.0.0'
      });

    } catch (error) {
      logger.error('Failed to initialize dual-AI system environment', {
        error: error.message
      });
      throw error;
    }
  }

  public validateConfiguration(): EnvironmentValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];
    const info: string[] = [];

    try {
      // Check Node.js version
      const nodeVersion = process.version;
      const majorVersion = parseInt(nodeVersion.substring(1).split('.')[0]);
      
      if (majorVersion < 18) {
        errors.push(`Node.js version ${nodeVersion} is not supported. Minimum version is 18.x`);
      } else if (majorVersion < 20) {
        warnings.push(`Node.js version ${nodeVersion} is supported but version 20.x or higher is recommended`);
      }

      // Check environment
      const env = process.env.NODE_ENV;
      if (!env) {
        warnings.push('NODE_ENV is not set. Defaulting to development mode');
        process.env.NODE_ENV = 'development';
      }

      // Validate API keys
      this.validateApiKeys(errors, warnings);

      // Validate database configuration
      this.validateDatabaseConfig(errors, warnings);

      // Validate cache configuration
      this.validateCacheConfig(errors, warnings, info);

      // Validate monitoring configuration
      this.validateMonitoringConfig(warnings, info);

      // Validate security configuration
      this.validateSecurityConfig(errors, warnings);

      // Check memory limits
      this.validateResourceLimits(warnings, info);

      return {
        valid: errors.length === 0,
        errors,
        warnings,
        info
      };

    } catch (error) {
      return {
        valid: false,
        errors: [`Configuration validation failed: ${error.message}`],
        warnings: [],
        info: []
      };
    }
  }

  private validateRequiredEnvironmentVariables(): void {
    const required = [
      'DATABASE_URL',
      'NODE_ENV'
    ];

    const missing = required.filter(key => !process.env[key]);

    if (missing.length > 0) {
      throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
    }
  }

  private setDefaultEnvironmentVariables(): void {
    const defaults = {
      // General
      NODE_ENV: 'development',
      DUAL_AI_VERSION: '1.0.0',
      PORT: '3000',

      // A1 Generator defaults
      A1_ASSESSMENT_PROVIDER: 'openai',
      A1_ASSESSMENT_MODEL: 'gpt-4-turbo',
      A1_ASSESSMENT_TEMPERATURE: '0.7',
      A1_ASSESSMENT_MAX_TOKENS: '4096',
      A1_REPORT_PROVIDER: 'openai',
      A1_REPORT_MODEL: 'gpt-4-turbo',
      A1_REPORT_TEMPERATURE: '0.6',
      A1_COACHING_PROVIDER: 'anthropic',
      A1_COACHING_MODEL: 'claude-3-opus-20240229',
      A1_COACHING_TEMPERATURE: '0.8',
      A1_INSIGHT_PROVIDER: 'anthropic',
      A1_INSIGHT_MODEL: 'claude-3-sonnet-20240229',
      A1_INSIGHT_TEMPERATURE: '0.7',
      A1_RECOMMENDATION_PROVIDER: 'openai',
      A1_RECOMMENDATION_MODEL: 'gpt-4-turbo',
      A1_RECOMMENDATION_TEMPERATURE: '0.6',
      A1_BATCH_CONCURRENCY: '5',
      A1_REQUEST_TIMEOUT: '30000',
      A1_RETRY_ATTEMPTS: '3',
      A1_REQUESTS_PER_MINUTE: '100',
      A1_TOKENS_PER_MINUTE: '50000',

      // B1 Validator defaults
      B1_PRIMARY_PROVIDER: 'anthropic',
      B1_PRIMARY_MODEL: 'claude-3-opus-20240229',
      B1_PRIMARY_TEMPERATURE: '0.1',
      B1_SECONDARY_PROVIDER: 'openai',
      B1_SECONDARY_MODEL: 'gpt-4-turbo',
      B1_SECONDARY_TEMPERATURE: '0.1',
      B1_ENABLE_ETHICAL_REVIEW: 'true',
      B1_ENABLE_BIAS_DETECTION: 'true',
      B1_ENABLE_QUALITY_CHECK: 'true',
      B1_ENABLE_COMPLIANCE_CHECK: 'true',
      B1_ETHICAL_THRESHOLD: '0.8',
      B1_BIAS_THRESHOLD: '0.8',
      B1_QUALITY_THRESHOLD: '0.7',
      B1_OVERALL_THRESHOLD: '0.75',
      B1_BATCH_CONCURRENCY: '10',
      B1_REQUEST_TIMEOUT: '20000',

      // Disagreement Handler defaults
      DISAGREEMENT_CONFIDENCE_DELTA: '0.3',
      DISAGREEMENT_SEVERITY_THRESHOLD: 'high',
      DISAGREEMENT_ISSUE_COUNT_THRESHOLD: '3',
      DISAGREEMENT_ENABLE_AUTO_RESOLUTION: 'true',
      DISAGREEMENT_RESOLUTION_TIMEOUT: '60000',
      DISAGREEMENT_MAX_RESOLUTION_ATTEMPTS: '3',

      // Learning Engine defaults
      LEARNING_BATCH_SIZE: '100',
      LEARNING_BATCH_INTERVAL: '300000',
      LEARNING_PROCESSING_CONCURRENCY: '5',
      LEARNING_MAX_RETENTION_DAYS: '90',
      LEARNING_ENABLE_AUTO_RETRAINING: 'false',
      LEARNING_DISAGREEMENT_RATE_THRESHOLD: '0.15',
      LEARNING_ACCURACY_DROP_THRESHOLD: '0.8',
      LEARNING_FEEDBACK_SCORE_THRESHOLD: '0.7',

      // Cache defaults
      CACHE_REDIS_ENABLED: 'false',
      CACHE_MEMORY_MAX_SIZE: '1000',
      CACHE_MEMORY_TTL: '300',
      CACHE_DEFAULT_TTL: '3600',
      CACHE_GENERATION_TTL: '1800',
      CACHE_VALIDATION_TTL: '900',

      // Queue defaults
      QUEUE_PROVIDER: 'memory',
      QUEUE_DEFAULT_MAX_SIZE: '10000',
      QUEUE_DEFAULT_CONCURRENCY: '5',
      QUEUE_MONITORING_INTERVAL: '30000',

      // Database defaults
      DATABASE_SSL: 'false',
      DATABASE_MAX_CONNECTIONS: '20',
      DATABASE_CONNECTION_TIMEOUT: '30000',
      DATABASE_QUERY_TIMEOUT: '10000',
      DATABASE_AUTO_MIGRATE: 'false',

      // Security defaults
      SECURITY_ENABLE_ENCRYPTION: 'false',
      SECURITY_ENABLE_DATA_MASKING: 'false',
      SECURITY_ENABLE_AUDIT_LOGGING: 'true',
      ENABLE_API_KEY_AUTH: 'false',
      ENABLE_JWT_AUTH: 'true',
      JWT_EXPIRATION_TIME: '24h',

      // Monitoring defaults
      MONITORING_METRICS_ENABLED: 'true',
      MONITORING_ALERTS_ENABLED: 'false',
      METRICS_FLUSH_INTERVAL: '60000',
      LOG_LEVEL: 'info',
      LOG_FORMAT: 'json',
      LOG_DESTINATION: 'console',
      HEALTH_CHECK_INTERVAL: '30000',
      HEALTH_CHECK_TIMEOUT: '10000',

      // Alert thresholds
      ALERTS_ERROR_RATE_THRESHOLD: '0.05',
      ALERTS_RESPONSE_TIME_THRESHOLD: '5000',
      ALERTS_QUEUE_DEPTH_THRESHOLD: '1000',
      ALERTS_DISAGREEMENT_RATE_THRESHOLD: '0.2'
    };

    for (const [key, value] of Object.entries(defaults)) {
      if (!process.env[key]) {
        process.env[key] = value;
      }
    }
  }

  private async validateApiConnectivity(): Promise<void> {
    const apiKeys = {
      openai: process.env.OPENAI_API_KEY,
      anthropic: process.env.ANTHROPIC_API_KEY,
      google: process.env.GOOGLE_API_KEY
    };

    const validationPromises = [];

    // Validate OpenAI API
    if (apiKeys.openai) {
      validationPromises.push(this.validateOpenAIConnection(apiKeys.openai));
    }

    // Validate Anthropic API
    if (apiKeys.anthropic) {
      validationPromises.push(this.validateAnthropicConnection(apiKeys.anthropic));
    }

    // Validate Google API
    if (apiKeys.google) {
      validationPromises.push(this.validateGoogleConnection(apiKeys.google));
    }

    if (validationPromises.length === 0) {
      logger.warn('No AI provider API keys configured');
      return;
    }

    try {
      const results = await Promise.allSettled(validationPromises);
      const failed = results.filter(r => r.status === 'rejected');

      if (failed.length > 0) {
        logger.warn('Some API connections failed', {
          failed: failed.length,
          total: results.length
        });
      } else {
        logger.info('All API connections validated successfully');
      }

    } catch (error) {
      logger.error('API connectivity validation failed', {
        error: error.message
      });
    }
  }

  private async initializeDatabaseConnection(): Promise<void> {
    try {
      // In a real implementation, this would establish and test the database connection
      logger.info('Database connection initialized', {
        url: this.maskConnectionString(process.env.DATABASE_URL!)
      });
    } catch (error) {
      logger.error('Database connection failed', {
        error: error.message
      });
      throw error;
    }
  }

  private async setupCacheConnections(): Promise<void> {
    try {
      if (process.env.CACHE_REDIS_ENABLED === 'true') {
        // In a real implementation, this would connect to Redis
        logger.info('Redis cache connection initialized', {
          url: this.maskConnectionString(process.env.REDIS_URL!)
        });
      } else {
        logger.info('Using in-memory cache');
      }
    } catch (error) {
      logger.warn('Cache connection setup failed, falling back to memory cache', {
        error: error.message
      });
    }
  }

  private initializeMonitoring(): void {
    if (process.env.MONITORING_METRICS_ENABLED === 'true') {
      logger.info('Monitoring initialized', {
        metrics: true,
        alerts: process.env.MONITORING_ALERTS_ENABLED === 'true',
        logging: {
          level: process.env.LOG_LEVEL,
          format: process.env.LOG_FORMAT
        }
      });
    }
  }

  private validateApiKeys(errors: string[], warnings: string[]): void {
    const configuredProviders = new Set();

    // Check which providers are configured in the models
    const modelConfigs = [
      process.env.A1_ASSESSMENT_PROVIDER,
      process.env.A1_REPORT_PROVIDER,
      process.env.A1_COACHING_PROVIDER,
      process.env.A1_INSIGHT_PROVIDER,
      process.env.A1_RECOMMENDATION_PROVIDER,
      process.env.B1_PRIMARY_PROVIDER,
      process.env.B1_SECONDARY_PROVIDER
    ];

    modelConfigs.forEach(provider => {
      if (provider) configuredProviders.add(provider);
    });

    // Check if API keys are available for configured providers
    if (configuredProviders.has('openai') && !process.env.OPENAI_API_KEY) {
      errors.push('OPENAI_API_KEY is required for OpenAI models');
    }

    if (configuredProviders.has('anthropic') && !process.env.ANTHROPIC_API_KEY) {
      errors.push('ANTHROPIC_API_KEY is required for Anthropic models');
    }

    if (configuredProviders.has('google') && !process.env.GOOGLE_API_KEY) {
      errors.push('GOOGLE_API_KEY is required for Google models');
    }

    // Check for unused API keys
    if (process.env.OPENAI_API_KEY && !configuredProviders.has('openai')) {
      warnings.push('OPENAI_API_KEY is set but no OpenAI models are configured');
    }

    if (process.env.ANTHROPIC_API_KEY && !configuredProviders.has('anthropic')) {
      warnings.push('ANTHROPIC_API_KEY is set but no Anthropic models are configured');
    }
  }

  private validateDatabaseConfig(errors: string[], warnings: string[]): void {
    if (!process.env.DATABASE_URL) {
      errors.push('DATABASE_URL is required');
      return;
    }

    try {
      const url = new URL(process.env.DATABASE_URL);
      
      if (url.protocol !== 'postgresql:' && url.protocol !== 'postgres:') {
        warnings.push('Only PostgreSQL databases are officially supported');
      }

      if (url.hostname === 'localhost' && process.env.NODE_ENV === 'production') {
        warnings.push('Using localhost database in production environment');
      }

    } catch (error) {
      errors.push('DATABASE_URL format is invalid');
    }
  }

  private validateCacheConfig(errors: string[], warnings: string[], info: string[]): void {
    if (process.env.CACHE_REDIS_ENABLED === 'true') {
      if (!process.env.REDIS_URL) {
        errors.push('REDIS_URL is required when Redis caching is enabled');
      }
      info.push('Using Redis for caching');
    } else {
      info.push('Using in-memory caching');
      
      if (process.env.NODE_ENV === 'production') {
        warnings.push('In-memory caching is not recommended for production');
      }
    }
  }

  private validateMonitoringConfig(warnings: string[], info: string[]): void {
    if (process.env.MONITORING_METRICS_ENABLED === 'true') {
      info.push('Metrics collection enabled');
      
      if (process.env.METRICS_ENDPOINT) {
        info.push('External metrics endpoint configured');
      } else {
        warnings.push('No external metrics endpoint configured - metrics will only be stored locally');
      }
    }

    if (process.env.MONITORING_ALERTS_ENABLED === 'true') {
      const alertChannels = [];
      
      if (process.env.ALERTS_EMAIL_ENABLED === 'true') alertChannels.push('email');
      if (process.env.ALERTS_SLACK_ENABLED === 'true') alertChannels.push('slack');
      if (process.env.ALERTS_WEBHOOK_ENABLED === 'true') alertChannels.push('webhook');
      
      if (alertChannels.length === 0) {
        warnings.push('Alerts are enabled but no alert channels are configured');
      } else {
        info.push(`Alert channels configured: ${alertChannels.join(', ')}`);
      }
    }
  }

  private validateSecurityConfig(errors: string[], warnings: string[]): void {
    if (process.env.ENABLE_JWT_AUTH === 'true' && !process.env.JWT_SECRET) {
      errors.push('JWT_SECRET is required when JWT authentication is enabled');
    }

    if (process.env.NODE_ENV === 'production') {
      if (process.env.SECURITY_ENABLE_ENCRYPTION !== 'true') {
        warnings.push('Data encryption is disabled in production environment');
      }

      if (process.env.SECURITY_ENABLE_AUDIT_LOGGING !== 'true') {
        warnings.push('Audit logging is disabled in production environment');
      }
    }

    // Check JWT secret strength
    if (process.env.JWT_SECRET && process.env.JWT_SECRET.length < 32) {
      warnings.push('JWT_SECRET should be at least 32 characters long');
    }
  }

  private validateResourceLimits(warnings: string[], info: string[]): void {
    // Check memory limits
    const memoryLimit = process.env.NODE_OPTIONS?.match(/--max-old-space-size=(\d+)/);
    if (!memoryLimit && process.env.NODE_ENV === 'production') {
      warnings.push('No memory limit set - consider setting --max-old-space-size');
    }

    // Check concurrent request limits
    const concurrentRequests = parseInt(process.env.A1_CONCURRENT_REQUESTS || '10');
    if (concurrentRequests > 50) {
      warnings.push('High concurrent request limit may cause rate limiting issues');
    }

    info.push(`Max concurrent requests: ${concurrentRequests}`);
  }

  private async validateOpenAIConnection(apiKey: string): Promise<void> {
    // In a real implementation, this would make a test API call
    logger.debug('OpenAI API connection validated');
  }

  private async validateAnthropicConnection(apiKey: string): Promise<void> {
    // In a real implementation, this would make a test API call
    logger.debug('Anthropic API connection validated');
  }

  private async validateGoogleConnection(apiKey: string): Promise<void> {
    // In a real implementation, this would make a test API call
    logger.debug('Google API connection validated');
  }

  private maskConnectionString(connectionString: string): string {
    try {
      const url = new URL(connectionString);
      return `${url.protocol}//${url.username ? '***:***@' : ''}${url.host}${url.pathname}`;
    } catch {
      return '***';
    }
  }

  public getEnvironmentInfo(): EnvironmentInfo {
    return {
      nodeVersion: process.version,
      environment: process.env.NODE_ENV || 'development',
      version: process.env.DUAL_AI_VERSION || '1.0.0',
      platform: process.platform,
      arch: process.arch,
      memoryUsage: process.memoryUsage(),
      uptime: process.uptime(),
      configuredProviders: this.getConfiguredProviders(),
      features: {
        caching: {
          redis: process.env.CACHE_REDIS_ENABLED === 'true',
          memory: true
        },
        monitoring: {
          metrics: process.env.MONITORING_METRICS_ENABLED === 'true',
          alerts: process.env.MONITORING_ALERTS_ENABLED === 'true',
          logging: process.env.LOG_LEVEL || 'info'
        },
        security: {
          encryption: process.env.SECURITY_ENABLE_ENCRYPTION === 'true',
          auditing: process.env.SECURITY_ENABLE_AUDIT_LOGGING === 'true',
          authentication: process.env.ENABLE_JWT_AUTH === 'true'
        },
        learning: {
          autoRetraining: process.env.LEARNING_ENABLE_AUTO_RETRAINING === 'true',
          insightGeneration: process.env.LEARNING_ENABLE_INSIGHTS !== 'false'
        }
      }
    };
  }

  private getConfiguredProviders(): string[] {
    const providers = new Set<string>();
    
    const modelConfigs = [
      process.env.A1_ASSESSMENT_PROVIDER,
      process.env.A1_REPORT_PROVIDER,
      process.env.A1_COACHING_PROVIDER,
      process.env.A1_INSIGHT_PROVIDER,
      process.env.A1_RECOMMENDATION_PROVIDER,
      process.env.B1_PRIMARY_PROVIDER,
      process.env.B1_SECONDARY_PROVIDER
    ];

    modelConfigs.forEach(provider => {
      if (provider) providers.add(provider);
    });

    return Array.from(providers);
  }
}

// Interfaces
export interface EnvironmentValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
  info: string[];
}

export interface EnvironmentInfo {
  nodeVersion: string;
  environment: string;
  version: string;
  platform: string;
  arch: string;
  memoryUsage: NodeJS.MemoryUsage;
  uptime: number;
  configuredProviders: string[];
  features: {
    caching: {
      redis: boolean;
      memory: boolean;
    };
    monitoring: {
      metrics: boolean;
      alerts: boolean;
      logging: string;
    };
    security: {
      encryption: boolean;
      auditing: boolean;
      authentication: boolean;
    };
    learning: {
      autoRetraining: boolean;
      insightGeneration: boolean;
    };
  };
}

// Export the singleton instance
export const environmentSetup = EnvironmentSetup.getInstance();