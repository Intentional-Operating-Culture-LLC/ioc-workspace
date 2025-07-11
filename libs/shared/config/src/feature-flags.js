/**
 * @fileoverview Feature flags management system
 * @description Environment-specific feature toggles with runtime evaluation
 */

const { getEnvironmentConfig } = require('./env-schema');

/**
 * Feature flag configuration with environment-specific defaults
 */
const FEATURE_DEFINITIONS = {
  // Core features
  auth: {
    key: 'FEATURE_AUTH_ENABLED',
    name: 'Authentication System',
    description: 'Enable user authentication and authorization',
    environments: {
      production: true,
      staging: true,
      development: true,
      test: true,
    },
    dependencies: [],
    rollout: {
      production: 100,
      staging: 100,
      development: 100,
      test: 100,
    },
  },
  
  payments: {
    key: 'FEATURE_PAYMENTS_ENABLED',
    name: 'Payment Processing',
    description: 'Enable payment processing and subscription management',
    environments: {
      production: false,
      staging: true,
      development: true,
      test: false,
    },
    dependencies: ['auth'],
    rollout: {
      production: 0,
      staging: 100,
      development: 100,
      test: 0,
    },
  },
  
  analytics: {
    key: 'FEATURE_ANALYTICS_ENABLED',
    name: 'Analytics and Tracking',
    description: 'Enable user analytics and event tracking',
    environments: {
      production: true,
      staging: true,
      development: false,
      test: false,
    },
    dependencies: [],
    rollout: {
      production: 100,
      staging: 100,
      development: 0,
      test: 0,
    },
  },
  
  // System features
  maintenance: {
    key: 'FEATURE_MAINTENANCE_MODE',
    name: 'Maintenance Mode',
    description: 'Enable maintenance mode to block user access',
    environments: {
      production: false,
      staging: false,
      development: false,
      test: false,
    },
    dependencies: [],
    rollout: {
      production: 0,
      staging: 0,
      development: 0,
      test: 0,
    },
  },
  
  debug: {
    key: 'FEATURE_DEBUG_MODE',
    name: 'Debug Mode',
    description: 'Enable debug logging and development tools',
    environments: {
      production: false,
      staging: true,
      development: true,
      test: true,
    },
    dependencies: [],
    rollout: {
      production: 0,
      staging: 100,
      development: 100,
      test: 100,
    },
  },
  
  // Beta features
  betaTesting: {
    key: 'FEATURE_BETA_TESTING',
    name: 'Beta Testing Features',
    description: 'Enable beta testing features and experiments',
    environments: {
      production: false,
      staging: true,
      development: true,
      test: true,
    },
    dependencies: [],
    rollout: {
      production: 0,
      staging: 100,
      development: 100,
      test: 100,
    },
  },
  
  experimentalUI: {
    key: 'FEATURE_EXPERIMENTAL_UI',
    name: 'Experimental UI Components',
    description: 'Enable experimental UI components and designs',
    environments: {
      production: false,
      staging: true,
      development: true,
      test: false,
    },
    dependencies: ['betaTesting'],
    rollout: {
      production: 0,
      staging: 50,
      development: 100,
      test: 0,
    },
  },
  
  performanceMetrics: {
    key: 'FEATURE_PERFORMANCE_METRICS',
    name: 'Performance Metrics',
    description: 'Enable performance monitoring and metrics collection',
    environments: {
      production: true,
      staging: true,
      development: false,
      test: false,
    },
    dependencies: [],
    rollout: {
      production: 100,
      staging: 100,
      development: 0,
      test: 0,
    },
  },
  
  // Security features
  advancedSecurity: {
    key: 'FEATURE_ADVANCED_SECURITY',
    name: 'Advanced Security',
    description: 'Enable advanced security features and monitoring',
    environments: {
      production: true,
      staging: true,
      development: false,
      test: false,
    },
    dependencies: ['auth'],
    rollout: {
      production: 100,
      staging: 100,
      development: 0,
      test: 0,
    },
  },
  
  // API features
  apiV2: {
    key: 'FEATURE_API_V2',
    name: 'API V2',
    description: 'Enable new API v2 endpoints',
    environments: {
      production: false,
      staging: true,
      development: true,
      test: true,
    },
    dependencies: [],
    rollout: {
      production: 0,
      staging: 80,
      development: 100,
      test: 100,
    },
  },
  
  rateLimiting: {
    key: 'FEATURE_RATE_LIMITING',
    name: 'API Rate Limiting',
    description: 'Enable API rate limiting and throttling',
    environments: {
      production: true,
      staging: true,
      development: false,
      test: false,
    },
    dependencies: [],
    rollout: {
      production: 100,
      staging: 100,
      development: 0,
      test: 0,
    },
  },
  
  // Notification features
  emailNotifications: {
    key: 'FEATURE_EMAIL_NOTIFICATIONS',
    name: 'Email Notifications',
    description: 'Enable email notification system',
    environments: {
      production: true,
      staging: true,
      development: false,
      test: false,
    },
    dependencies: ['auth'],
    rollout: {
      production: 100,
      staging: 100,
      development: 0,
      test: 0,
    },
  },
  
  pushNotifications: {
    key: 'FEATURE_PUSH_NOTIFICATIONS',
    name: 'Push Notifications',
    description: 'Enable push notification system',
    environments: {
      production: false,
      staging: true,
      development: true,
      test: false,
    },
    dependencies: ['auth'],
    rollout: {
      production: 0,
      staging: 70,
      development: 100,
      test: 0,
    },
  },
  
  // Data features
  dataExport: {
    key: 'FEATURE_DATA_EXPORT',
    name: 'Data Export',
    description: 'Enable user data export functionality',
    environments: {
      production: true,
      staging: true,
      development: true,
      test: true,
    },
    dependencies: ['auth'],
    rollout: {
      production: 100,
      staging: 100,
      development: 100,
      test: 100,
    },
  },
  
  dataImport: {
    key: 'FEATURE_DATA_IMPORT',
    name: 'Data Import',
    description: 'Enable bulk data import functionality',
    environments: {
      production: false,
      staging: true,
      development: true,
      test: true,
    },
    dependencies: ['auth'],
    rollout: {
      production: 0,
      staging: 60,
      development: 100,
      test: 100,
    },
  },
};

/**
 * Feature flag manager class
 */
class FeatureFlagManager {
  constructor(config = null) {
    this.config = config || getEnvironmentConfig();
    this.environment = this.config.NODE_ENV || 'development';
    this.cache = new Map();
    this.cacheTimeout = 5 * 60 * 1000; // 5 minutes
  }
  
  /**
   * Check if a feature is enabled
   */
  isEnabled(featureName, userId = null) {
    const cacheKey = `${featureName}:${userId || 'global'}`;
    
    // Check cache first
    if (this.cache.has(cacheKey)) {
      const cached = this.cache.get(cacheKey);
      if (Date.now() - cached.timestamp < this.cacheTimeout) {
        return cached.value;
      }
    }
    
    const result = this._evaluateFeature(featureName, userId);
    
    // Cache result
    this.cache.set(cacheKey, {
      value: result,
      timestamp: Date.now(),
    });
    
    return result;
  }
  
  /**
   * Get all enabled features
   */
  getEnabledFeatures(userId = null) {
    const enabled = {};
    
    for (const featureName in FEATURE_DEFINITIONS) {
      enabled[featureName] = this.isEnabled(featureName, userId);
    }
    
    return enabled;
  }
  
  /**
   * Get feature configuration
   */
  getFeatureConfig(featureName) {
    return FEATURE_DEFINITIONS[featureName];
  }
  
  /**
   * Get all feature definitions
   */
  getAllFeatures() {
    return FEATURE_DEFINITIONS;
  }
  
  /**
   * Evaluate feature flag with environment and rollout logic
   */
  _evaluateFeature(featureName, userId = null) {
    const feature = FEATURE_DEFINITIONS[featureName];
    
    if (!feature) {
      console.warn(`Unknown feature flag: ${featureName}`);
      return false;
    }
    
    // Check environment variable override
    const envValue = this.config[feature.key];
    if (envValue !== undefined) {
      return Boolean(envValue);
    }
    
    // Check environment-specific default
    const envDefault = feature.environments[this.environment];
    if (envDefault === undefined) {
      return false;
    }
    
    // If environment default is false, feature is disabled
    if (!envDefault) {
      return false;
    }
    
    // Check dependencies
    if (feature.dependencies && feature.dependencies.length > 0) {
      for (const dependency of feature.dependencies) {
        if (!this.isEnabled(dependency, userId)) {
          return false;
        }
      }
    }
    
    // Check rollout percentage
    const rolloutPercentage = feature.rollout[this.environment] || 0;
    if (rolloutPercentage === 0) {
      return false;
    }
    
    if (rolloutPercentage === 100) {
      return true;
    }
    
    // Calculate rollout based on user ID or random
    const hash = userId ? this._hashUserId(userId) : Math.random() * 100;
    return hash < rolloutPercentage;
  }
  
  /**
   * Hash user ID for consistent rollout
   */
  _hashUserId(userId) {
    let hash = 0;
    for (let i = 0; i < userId.length; i++) {
      const char = userId.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash) % 100;
  }
  
  /**
   * Clear feature flag cache
   */
  clearCache() {
    this.cache.clear();
  }
  
  /**
   * Get feature flag analytics
   */
  getAnalytics() {
    const analytics = {
      environment: this.environment,
      totalFeatures: Object.keys(FEATURE_DEFINITIONS).length,
      enabledFeatures: 0,
      disabledFeatures: 0,
      betaFeatures: 0,
      productionFeatures: 0,
      features: {},
    };
    
    for (const [name, feature] of Object.entries(FEATURE_DEFINITIONS)) {
      const isEnabled = this.isEnabled(name);
      const envDefault = feature.environments[this.environment];
      
      analytics.features[name] = {
        enabled: isEnabled,
        environmentDefault: envDefault,
        rolloutPercentage: feature.rollout[this.environment] || 0,
        dependencies: feature.dependencies || [],
      };
      
      if (isEnabled) {
        analytics.enabledFeatures++;
      } else {
        analytics.disabledFeatures++;
      }
      
      if (name.includes('beta') || name.includes('experimental')) {
        analytics.betaFeatures++;
      }
      
      if (feature.environments.production) {
        analytics.productionFeatures++;
      }
    }
    
    return analytics;
  }
}

/**
 * Create feature flag manager instance
 */
function createFeatureFlagManager(config = null) {
  return new FeatureFlagManager(config);
}

/**
 * Default feature flag manager instance
 */
const defaultFeatureFlagManager = createFeatureFlagManager();

/**
 * Convenience functions using default manager
 */
const isFeatureEnabled = (featureName, userId = null) => {
  return defaultFeatureFlagManager.isEnabled(featureName, userId);
};

const getEnabledFeatures = (userId = null) => {
  return defaultFeatureFlagManager.getEnabledFeatures(userId);
};

const getFeatureConfig = (featureName) => {
  return defaultFeatureFlagManager.getFeatureConfig(featureName);
};

const getAllFeatures = () => {
  return defaultFeatureFlagManager.getAllFeatures();
};

const getFeatureAnalytics = () => {
  return defaultFeatureFlagManager.getAnalytics();
};

module.exports = {
  FEATURE_DEFINITIONS,
  FeatureFlagManager,
  createFeatureFlagManager,
  defaultFeatureFlagManager,
  isFeatureEnabled,
  getEnabledFeatures,
  getFeatureConfig,
  getAllFeatures,
  getFeatureAnalytics,
};