/**
 * @fileoverview Advanced feature flag management system
 * @description Enterprise-grade feature flag system with environment-specific configurations
 */

const { z } = require('zod');

/**
 * Feature flag schema with metadata
 */
const featureFlagSchema = z.object({
  key: z.string(),
  enabled: z.boolean(),
  description: z.string(),
  environment: z.array(z.enum(['development', 'staging', 'beta', 'production', 'all'])),
  rolloutPercentage: z.number().min(0).max(100).optional(),
  enabledForUsers: z.array(z.string()).optional(),
  enabledForRoles: z.array(z.string()).optional(),
  enabledAfter: z.string().datetime().optional(),
  disabledAfter: z.string().datetime().optional(),
  dependencies: z.array(z.string()).optional(),
  metadata: z.record(z.any()).optional(),
});

/**
 * Feature flag definitions
 */
const FEATURE_FLAGS = {
  // Authentication & Security
  AUTH_ENABLED: {
    key: 'AUTH_ENABLED',
    description: 'Enable authentication system',
    environment: ['all'],
    enabled: true,
  },
  TWO_FACTOR_AUTH: {
    key: 'TWO_FACTOR_AUTH',
    description: 'Enable two-factor authentication',
    environment: ['production', 'beta'],
    enabled: true,
    dependencies: ['AUTH_ENABLED'],
  },
  PASSWORDLESS_AUTH: {
    key: 'PASSWORDLESS_AUTH',
    description: 'Enable passwordless authentication via magic links',
    environment: ['beta', 'development'],
    enabled: false,
    rolloutPercentage: 10,
  },
  BIOMETRIC_AUTH: {
    key: 'BIOMETRIC_AUTH',
    description: 'Enable biometric authentication (WebAuthn)',
    environment: ['beta', 'development'],
    enabled: false,
  },
  
  // Payment & Commerce
  PAYMENTS_ENABLED: {
    key: 'PAYMENTS_ENABLED',
    description: 'Enable payment processing',
    environment: ['production', 'beta'],
    enabled: false,
  },
  STRIPE_PAYMENTS: {
    key: 'STRIPE_PAYMENTS',
    description: 'Enable Stripe payment integration',
    environment: ['production', 'beta'],
    enabled: false,
    dependencies: ['PAYMENTS_ENABLED'],
  },
  SUBSCRIPTION_BILLING: {
    key: 'SUBSCRIPTION_BILLING',
    description: 'Enable subscription-based billing',
    environment: ['production', 'beta'],
    enabled: false,
    dependencies: ['PAYMENTS_ENABLED'],
  },
  
  // Analytics & Monitoring
  ANALYTICS_ENABLED: {
    key: 'ANALYTICS_ENABLED',
    description: 'Enable analytics tracking',
    environment: ['all'],
    enabled: true,
  },
  ADVANCED_ANALYTICS: {
    key: 'ADVANCED_ANALYTICS',
    description: 'Enable advanced analytics with user behavior tracking',
    environment: ['production'],
    enabled: false,
    dependencies: ['ANALYTICS_ENABLED'],
  },
  PERFORMANCE_METRICS: {
    key: 'PERFORMANCE_METRICS',
    description: 'Enable performance metrics collection',
    environment: ['production', 'beta'],
    enabled: true,
  },
  ERROR_TRACKING: {
    key: 'ERROR_TRACKING',
    description: 'Enable error tracking and reporting',
    environment: ['all'],
    enabled: true,
  },
  
  // UI/UX Features
  DARK_MODE: {
    key: 'DARK_MODE',
    description: 'Enable dark mode theme',
    environment: ['all'],
    enabled: true,
  },
  EXPERIMENTAL_UI: {
    key: 'EXPERIMENTAL_UI',
    description: 'Enable experimental UI components',
    environment: ['beta', 'development'],
    enabled: false,
    rolloutPercentage: 25,
  },
  ACCESSIBILITY_TOOLS: {
    key: 'ACCESSIBILITY_TOOLS',
    description: 'Enable enhanced accessibility tools',
    environment: ['all'],
    enabled: true,
  },
  PROGRESSIVE_WEB_APP: {
    key: 'PROGRESSIVE_WEB_APP',
    description: 'Enable PWA features',
    environment: ['production', 'beta'],
    enabled: true,
  },
  
  // API Features
  API_V2: {
    key: 'API_V2',
    description: 'Enable API version 2',
    environment: ['beta', 'development'],
    enabled: false,
    enabledAfter: '2024-03-01T00:00:00Z',
  },
  GRAPHQL_API: {
    key: 'GRAPHQL_API',
    description: 'Enable GraphQL API endpoint',
    environment: ['beta', 'development'],
    enabled: false,
  },
  WEBSOCKET_SUPPORT: {
    key: 'WEBSOCKET_SUPPORT',
    description: 'Enable WebSocket connections',
    environment: ['production', 'beta'],
    enabled: true,
  },
  API_RATE_LIMITING: {
    key: 'API_RATE_LIMITING',
    description: 'Enable API rate limiting',
    environment: ['all'],
    enabled: true,
  },
  
  // Data & Storage
  DATA_EXPORT: {
    key: 'DATA_EXPORT',
    description: 'Enable data export functionality',
    environment: ['all'],
    enabled: true,
  },
  DATA_IMPORT: {
    key: 'DATA_IMPORT',
    description: 'Enable data import functionality',
    environment: ['beta', 'development'],
    enabled: false,
  },
  CLOUD_STORAGE: {
    key: 'CLOUD_STORAGE',
    description: 'Enable cloud storage integration',
    environment: ['all'],
    enabled: true,
  },
  FILE_VERSIONING: {
    key: 'FILE_VERSIONING',
    description: 'Enable file versioning system',
    environment: ['production', 'beta'],
    enabled: false,
    dependencies: ['CLOUD_STORAGE'],
  },
  
  // Communication
  EMAIL_NOTIFICATIONS: {
    key: 'EMAIL_NOTIFICATIONS',
    description: 'Enable email notifications',
    environment: ['all'],
    enabled: true,
  },
  PUSH_NOTIFICATIONS: {
    key: 'PUSH_NOTIFICATIONS',
    description: 'Enable push notifications',
    environment: ['production', 'beta'],
    enabled: false,
  },
  SMS_NOTIFICATIONS: {
    key: 'SMS_NOTIFICATIONS',
    description: 'Enable SMS notifications',
    environment: ['production'],
    enabled: false,
  },
  IN_APP_MESSAGING: {
    key: 'IN_APP_MESSAGING',
    description: 'Enable in-app messaging system',
    environment: ['beta', 'development'],
    enabled: false,
  },
  
  // Development & Testing
  DEBUG_MODE: {
    key: 'DEBUG_MODE',
    description: 'Enable debug mode with verbose logging',
    environment: ['development', 'beta'],
    enabled: false,
  },
  BETA_TESTING: {
    key: 'BETA_TESTING',
    description: 'Enable beta testing features',
    environment: ['beta'],
    enabled: true,
  },
  FEATURE_PREVIEW: {
    key: 'FEATURE_PREVIEW',
    description: 'Enable feature preview for selected users',
    environment: ['beta', 'development'],
    enabled: false,
    enabledForRoles: ['admin', 'beta-tester'],
  },
  
  // Infrastructure
  MAINTENANCE_MODE: {
    key: 'MAINTENANCE_MODE',
    description: 'Enable maintenance mode',
    environment: ['all'],
    enabled: false,
  },
  READ_ONLY_MODE: {
    key: 'READ_ONLY_MODE',
    description: 'Enable read-only mode for database',
    environment: ['all'],
    enabled: false,
  },
  BACKUP_SYSTEM: {
    key: 'BACKUP_SYSTEM',
    description: 'Enable automated backup system',
    environment: ['production'],
    enabled: true,
  },
  
  // AI & Machine Learning
  AI_ASSISTANT: {
    key: 'AI_ASSISTANT',
    description: 'Enable AI assistant features',
    environment: ['production', 'beta'],
    enabled: false,
    rolloutPercentage: 5,
  },
  SMART_SEARCH: {
    key: 'SMART_SEARCH',
    description: 'Enable AI-powered smart search',
    environment: ['beta', 'development'],
    enabled: false,
    dependencies: ['AI_ASSISTANT'],
  },
  CONTENT_RECOMMENDATIONS: {
    key: 'CONTENT_RECOMMENDATIONS',
    description: 'Enable ML-based content recommendations',
    environment: ['production', 'beta'],
    enabled: false,
  },
  
  // Compliance & Security
  GDPR_COMPLIANCE: {
    key: 'GDPR_COMPLIANCE',
    description: 'Enable GDPR compliance features',
    environment: ['production'],
    enabled: true,
  },
  CCPA_COMPLIANCE: {
    key: 'CCPA_COMPLIANCE',
    description: 'Enable CCPA compliance features',
    environment: ['production'],
    enabled: false,
  },
  AUDIT_LOGGING: {
    key: 'AUDIT_LOGGING',
    description: 'Enable comprehensive audit logging',
    environment: ['production'],
    enabled: true,
  },
  DATA_ENCRYPTION_AT_REST: {
    key: 'DATA_ENCRYPTION_AT_REST',
    description: 'Enable data encryption at rest',
    environment: ['production'],
    enabled: true,
  },
};

/**
 * Feature flag manager
 */
class FeatureFlagManager {
  constructor(environment = 'development', config = {}) {
    this.environment = environment;
    this.flags = this._initializeFlags();
    this.overrides = config.overrides || {};
    this.user = config.user || null;
    this.metadata = config.metadata || {};
  }

  /**
   * Initialize flags for current environment
   */
  _initializeFlags() {
    const flags = {};
    
    Object.entries(FEATURE_FLAGS).forEach(([key, flag]) => {
      if (flag.environment.includes('all') || flag.environment.includes(this.environment)) {
        flags[key] = {
          ...flag,
          enabled: this._getEnvironmentValue(key, flag.enabled),
        };
      }
    });
    
    return flags;
  }

  /**
   * Get environment-specific value
   */
  _getEnvironmentValue(key, defaultValue) {
    const envKey = `FEATURE_${key}`;
    const envValue = process.env[envKey];
    
    if (envValue !== undefined) {
      return envValue === 'true';
    }
    
    return defaultValue;
  }

  /**
   * Check if feature is enabled
   */
  isEnabled(key, context = {}) {
    const flag = this.flags[key];
    
    if (!flag) {
      return false;
    }
    
    // Check overrides first
    if (this.overrides[key] !== undefined) {
      return this.overrides[key];
    }
    
    // Check if disabled
    if (!flag.enabled) {
      return false;
    }
    
    // Check date constraints
    if (flag.enabledAfter && new Date() < new Date(flag.enabledAfter)) {
      return false;
    }
    
    if (flag.disabledAfter && new Date() > new Date(flag.disabledAfter)) {
      return false;
    }
    
    // Check dependencies
    if (flag.dependencies) {
      for (const dep of flag.dependencies) {
        if (!this.isEnabled(dep, context)) {
          return false;
        }
      }
    }
    
    // Check user-specific enablement
    const user = context.user || this.user;
    if (user) {
      if (flag.enabledForUsers && flag.enabledForUsers.includes(user.id)) {
        return true;
      }
      
      if (flag.enabledForRoles && user.roles) {
        const hasRole = user.roles.some(role => flag.enabledForRoles.includes(role));
        if (hasRole) {
          return true;
        }
      }
    }
    
    // Check rollout percentage
    if (flag.rolloutPercentage !== undefined && flag.rolloutPercentage < 100) {
      const hash = this._hashString(user?.id || context.sessionId || 'anonymous');
      const percentage = (hash % 100) + 1;
      return percentage <= flag.rolloutPercentage;
    }
    
    return true;
  }

  /**
   * Get all enabled features
   */
  getEnabledFeatures(context = {}) {
    return Object.keys(this.flags).filter(key => this.isEnabled(key, context));
  }

  /**
   * Get feature metadata
   */
  getFeature(key) {
    return this.flags[key] || null;
  }

  /**
   * Get all features
   */
  getAllFeatures() {
    return this.flags;
  }

  /**
   * Set override for testing
   */
  setOverride(key, value) {
    this.overrides[key] = value;
  }

  /**
   * Clear all overrides
   */
  clearOverrides() {
    this.overrides = {};
  }

  /**
   * Simple string hashing for rollout
   */
  _hashString(str) {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return Math.abs(hash);
  }

  /**
   * Export configuration for client
   */
  getClientConfig() {
    const clientFlags = {};
    
    Object.entries(this.flags).forEach(([key, flag]) => {
      if (!flag.key.includes('SECRET') && !flag.key.includes('PRIVATE')) {
        clientFlags[key] = this.isEnabled(key);
      }
    });
    
    return clientFlags;
  }
}

/**
 * Create feature flag manager for environment
 */
function createFeatureFlagManager(environment = process.env.NODE_ENV || 'development', config = {}) {
  return new FeatureFlagManager(environment, config);
}

module.exports = {
  FEATURE_FLAGS,
  FeatureFlagManager,
  createFeatureFlagManager,
  featureFlagSchema,
};