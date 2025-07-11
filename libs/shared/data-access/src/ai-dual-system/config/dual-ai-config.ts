/**
 * Dual-AI System Configuration
 * Centralized configuration management for all components
 */

import { ModelProvider, ContentType } from '../core/interfaces';

export class DualAIConfig {
  private static instance: DualAIConfig;
  private config: DualAIConfiguration;

  private constructor() {
    this.config = this.loadConfiguration();
    this.validateConfiguration();
  }

  public static getInstance(): DualAIConfig {
    if (!DualAIConfig.instance) {
      DualAIConfig.instance = new DualAIConfig();
    }
    return DualAIConfig.instance;
  }

  public get(): DualAIConfiguration {
    return { ...this.config };
  }

  public getGenerator(): GeneratorConfiguration {
    return { ...this.config.generator };
  }

  public getValidator(): ValidatorConfiguration {
    return { ...this.config.validator };
  }

  public getDisagreementHandler(): DisagreementHandlerConfiguration {
    return { ...this.config.disagreementHandler };
  }

  public getLearning(): LearningConfiguration {
    return { ...this.config.learning };
  }

  public getInfrastructure(): InfrastructureConfiguration {
    return { ...this.config.infrastructure };
  }

  public getSecurity(): SecurityConfiguration {
    return { ...this.config.security };
  }

  public getMonitoring(): MonitoringConfiguration {
    return { ...this.config.monitoring };
  }

  private loadConfiguration(): DualAIConfiguration {
    const env = process.env.NODE_ENV || 'development';
    
    const baseConfig: DualAIConfiguration = {
      environment: env,
      version: '1.0.0',
      
      generator: this.loadGeneratorConfig(),
      validator: this.loadValidatorConfig(),
      disagreementHandler: this.loadDisagreementHandlerConfig(),
      learning: this.loadLearningConfig(),
      infrastructure: this.loadInfrastructureConfig(),
      security: this.loadSecurityConfig(),
      monitoring: this.loadMonitoringConfig()
    };

    // Apply environment-specific overrides
    return this.applyEnvironmentOverrides(baseConfig, env);
  }

  private loadGeneratorConfig(): GeneratorConfiguration {
    return {
      models: {
        primary: {
          assessment: {
            provider: (process.env.A1_ASSESSMENT_PROVIDER as ModelProvider) || 'openai',
            model: process.env.A1_ASSESSMENT_MODEL || 'gpt-4-turbo',
            temperature: parseFloat(process.env.A1_ASSESSMENT_TEMPERATURE || '0.7'),
            maxTokens: parseInt(process.env.A1_ASSESSMENT_MAX_TOKENS || '4096'),
            topP: parseFloat(process.env.A1_ASSESSMENT_TOP_P || '0.9')
          },
          report: {
            provider: (process.env.A1_REPORT_PROVIDER as ModelProvider) || 'openai',
            model: process.env.A1_REPORT_MODEL || 'gpt-4-turbo',
            temperature: parseFloat(process.env.A1_REPORT_TEMPERATURE || '0.6'),
            maxTokens: parseInt(process.env.A1_REPORT_MAX_TOKENS || '4096')
          },
          coaching: {
            provider: (process.env.A1_COACHING_PROVIDER as ModelProvider) || 'anthropic',
            model: process.env.A1_COACHING_MODEL || 'claude-3-opus-20240229',
            temperature: parseFloat(process.env.A1_COACHING_TEMPERATURE || '0.8'),
            maxTokens: parseInt(process.env.A1_COACHING_MAX_TOKENS || '4096')
          },
          insight: {
            provider: (process.env.A1_INSIGHT_PROVIDER as ModelProvider) || 'anthropic',
            model: process.env.A1_INSIGHT_MODEL || 'claude-3-sonnet-20240229',
            temperature: parseFloat(process.env.A1_INSIGHT_TEMPERATURE || '0.7'),
            maxTokens: parseInt(process.env.A1_INSIGHT_MAX_TOKENS || '3000')
          },
          recommendation: {
            provider: (process.env.A1_RECOMMENDATION_PROVIDER as ModelProvider) || 'openai',
            model: process.env.A1_RECOMMENDATION_MODEL || 'gpt-4-turbo',
            temperature: parseFloat(process.env.A1_RECOMMENDATION_TEMPERATURE || '0.6'),
            maxTokens: parseInt(process.env.A1_RECOMMENDATION_MAX_TOKENS || '3000')
          }
        },
        fallback: {
          provider: (process.env.A1_FALLBACK_PROVIDER as ModelProvider) || 'openai',
          model: process.env.A1_FALLBACK_MODEL || 'gpt-3.5-turbo',
          temperature: 0.7,
          maxTokens: 2048
        }
      },
      
      performance: {
        batchConcurrency: parseInt(process.env.A1_BATCH_CONCURRENCY || '5'),
        requestTimeout: parseInt(process.env.A1_REQUEST_TIMEOUT || '30000'),
        retryAttempts: parseInt(process.env.A1_RETRY_ATTEMPTS || '3'),
        retryDelay: parseInt(process.env.A1_RETRY_DELAY || '1000')
      },

      rateLimit: {
        requestsPerMinute: parseInt(process.env.A1_REQUESTS_PER_MINUTE || '100'),
        requestsPerHour: parseInt(process.env.A1_REQUESTS_PER_HOUR || '1000'),
        tokensPerMinute: parseInt(process.env.A1_TOKENS_PER_MINUTE || '50000'),
        concurrentRequests: parseInt(process.env.A1_CONCURRENT_REQUESTS || '10')
      },

      prompts: {
        templatesPath: process.env.A1_PROMPTS_PATH || '/app/prompts',
        enableDynamic: process.env.A1_ENABLE_DYNAMIC_PROMPTS === 'true',
        cacheTemplates: process.env.A1_CACHE_TEMPLATES !== 'false',
        versionControl: process.env.A1_PROMPT_VERSIONING === 'true'
      }
    };
  }

  private loadValidatorConfig(): ValidatorConfiguration {
    return {
      models: {
        primary: {
          provider: (process.env.B1_PRIMARY_PROVIDER as ModelProvider) || 'anthropic',
          model: process.env.B1_PRIMARY_MODEL || 'claude-3-opus-20240229',
          temperature: parseFloat(process.env.B1_PRIMARY_TEMPERATURE || '0.1'),
          maxTokens: parseInt(process.env.B1_PRIMARY_MAX_TOKENS || '2048')
        },
        secondary: {
          provider: (process.env.B1_SECONDARY_PROVIDER as ModelProvider) || 'openai',
          model: process.env.B1_SECONDARY_MODEL || 'gpt-4-turbo',
          temperature: parseFloat(process.env.B1_SECONDARY_TEMPERATURE || '0.1'),
          maxTokens: parseInt(process.env.B1_SECONDARY_MAX_TOKENS || '2048')
        }
      },

      validation: {
        enableEthicalReview: process.env.B1_ENABLE_ETHICAL_REVIEW !== 'false',
        enableBiasDetection: process.env.B1_ENABLE_BIAS_DETECTION !== 'false',
        enableQualityCheck: process.env.B1_ENABLE_QUALITY_CHECK !== 'false',
        enableComplianceCheck: process.env.B1_ENABLE_COMPLIANCE_CHECK !== 'false',
        
        thresholds: {
          ethicalScore: parseFloat(process.env.B1_ETHICAL_THRESHOLD || '0.8'),
          biasScore: parseFloat(process.env.B1_BIAS_THRESHOLD || '0.8'),
          qualityScore: parseFloat(process.env.B1_QUALITY_THRESHOLD || '0.7'),
          complianceScore: parseFloat(process.env.B1_COMPLIANCE_THRESHOLD || '0.8'),
          overallScore: parseFloat(process.env.B1_OVERALL_THRESHOLD || '0.75')
        }
      },

      performance: {
        batchConcurrency: parseInt(process.env.B1_BATCH_CONCURRENCY || '10'),
        requestTimeout: parseInt(process.env.B1_REQUEST_TIMEOUT || '20000'),
        urgentRequestTimeout: parseInt(process.env.B1_URGENT_TIMEOUT || '10000')
      },

      rules: {
        rulesPath: process.env.B1_RULES_PATH || '/app/validation-rules',
        enableDynamicRules: process.env.B1_ENABLE_DYNAMIC_RULES === 'true',
        reloadInterval: parseInt(process.env.B1_RULES_RELOAD_INTERVAL || '300000')
      }
    };
  }

  private loadDisagreementHandlerConfig(): DisagreementHandlerConfiguration {
    return {
      escalation: {
        confidenceDelta: parseFloat(process.env.DISAGREEMENT_CONFIDENCE_DELTA || '0.3'),
        severityThreshold: (process.env.DISAGREEMENT_SEVERITY_THRESHOLD as any) || 'high',
        issueCountThreshold: parseInt(process.env.DISAGREEMENT_ISSUE_COUNT_THRESHOLD || '3'),
        autoEscalateEthical: process.env.DISAGREEMENT_AUTO_ESCALATE_ETHICAL !== 'false',
        autoEscalateCritical: process.env.DISAGREEMENT_AUTO_ESCALATE_CRITICAL !== 'false'
      },

      resolution: {
        enableAutomaticResolution: process.env.DISAGREEMENT_ENABLE_AUTO_RESOLUTION !== 'false',
        resolutionTimeout: parseInt(process.env.DISAGREEMENT_RESOLUTION_TIMEOUT || '60000'),
        maxResolutionAttempts: parseInt(process.env.DISAGREEMENT_MAX_RESOLUTION_ATTEMPTS || '3'),
        requireHumanApproval: process.env.DISAGREEMENT_REQUIRE_HUMAN_APPROVAL === 'true'
      },

      humanReview: {
        queueName: process.env.DISAGREEMENT_HUMAN_REVIEW_QUEUE || 'human-review',
        maxQueueSize: parseInt(process.env.DISAGREEMENT_MAX_QUEUE_SIZE || '1000'),
        priorityWeights: {
          critical: 1,
          high: 2,
          medium: 3,
          low: 4
        },
        notifications: {
          email: process.env.DISAGREEMENT_EMAIL_NOTIFICATIONS === 'true',
          slack: process.env.DISAGREEMENT_SLACK_NOTIFICATIONS === 'true',
          webhookUrl: process.env.DISAGREEMENT_WEBHOOK_URL
        }
      }
    };
  }

  private loadLearningConfig(): LearningConfiguration {
    return {
      processing: {
        batchSize: parseInt(process.env.LEARNING_BATCH_SIZE || '100'),
        batchInterval: parseInt(process.env.LEARNING_BATCH_INTERVAL || '300000'),
        processingConcurrency: parseInt(process.env.LEARNING_PROCESSING_CONCURRENCY || '5'),
        maxRetentionDays: parseInt(process.env.LEARNING_MAX_RETENTION_DAYS || '90')
      },

      retraining: {
        enableAutoRetraining: process.env.LEARNING_ENABLE_AUTO_RETRAINING === 'true',
        
        triggers: {
          disagreementRate: {
            enabled: process.env.LEARNING_TRIGGER_DISAGREEMENT_RATE === 'true',
            threshold: parseFloat(process.env.LEARNING_DISAGREEMENT_RATE_THRESHOLD || '0.15'),
            timeWindow: parseInt(process.env.LEARNING_DISAGREEMENT_TIME_WINDOW || '86400000')
          },
          accuracyDrop: {
            enabled: process.env.LEARNING_TRIGGER_ACCURACY_DROP === 'true',
            threshold: parseFloat(process.env.LEARNING_ACCURACY_DROP_THRESHOLD || '0.8'),
            timeWindow: parseInt(process.env.LEARNING_ACCURACY_TIME_WINDOW || '86400000')
          },
          feedbackScore: {
            enabled: process.env.LEARNING_TRIGGER_FEEDBACK_SCORE === 'true',
            threshold: parseFloat(process.env.LEARNING_FEEDBACK_SCORE_THRESHOLD || '0.7'),
            timeWindow: parseInt(process.env.LEARNING_FEEDBACK_TIME_WINDOW || '86400000')
          },
          timeBased: {
            enabled: process.env.LEARNING_TRIGGER_TIME_BASED === 'true',
            interval: parseInt(process.env.LEARNING_TIME_BASED_INTERVAL || '604800000') // 1 week
          }
        }
      },

      insights: {
        enableInsightGeneration: process.env.LEARNING_ENABLE_INSIGHTS !== 'false',
        insightThreshold: parseFloat(process.env.LEARNING_INSIGHT_THRESHOLD || '0.7'),
        maxInsightsPerBatch: parseInt(process.env.LEARNING_MAX_INSIGHTS_PER_BATCH || '10')
      }
    };
  }

  private loadInfrastructureConfig(): InfrastructureConfiguration {
    return {
      cache: {
        redis: {
          enabled: process.env.CACHE_REDIS_ENABLED === 'true',
          url: process.env.REDIS_URL || 'redis://localhost:6379',
          keyPrefix: process.env.CACHE_REDIS_PREFIX || 'dual_ai',
          maxRetries: parseInt(process.env.CACHE_REDIS_MAX_RETRIES || '3'),
          retryDelay: parseInt(process.env.CACHE_REDIS_RETRY_DELAY || '1000')
        },
        
        memory: {
          maxSize: parseInt(process.env.CACHE_MEMORY_MAX_SIZE || '1000'),
          ttl: parseInt(process.env.CACHE_MEMORY_TTL || '300'),
          maxTtl: parseInt(process.env.CACHE_MEMORY_MAX_TTL || '1800'),
          cleanupInterval: parseInt(process.env.CACHE_MEMORY_CLEANUP_INTERVAL || '60000')
        },

        policies: {
          defaultTtl: parseInt(process.env.CACHE_DEFAULT_TTL || '3600'),
          generation: {
            ttl: parseInt(process.env.CACHE_GENERATION_TTL || '1800'),
            enableCaching: process.env.CACHE_GENERATION_ENABLED !== 'false'
          },
          validation: {
            ttl: parseInt(process.env.CACHE_VALIDATION_TTL || '900'),
            enableCaching: process.env.CACHE_VALIDATION_ENABLED !== 'false'
          }
        }
      },

      queue: {
        provider: (process.env.QUEUE_PROVIDER as 'memory' | 'redis' | 'sqs') || 'memory',
        redis: {
          url: process.env.QUEUE_REDIS_URL || process.env.REDIS_URL || 'redis://localhost:6379'
        },
        sqs: {
          region: process.env.QUEUE_SQS_REGION || 'us-east-1',
          accessKeyId: process.env.AWS_ACCESS_KEY_ID,
          secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
        },

        settings: {
          defaultMaxSize: parseInt(process.env.QUEUE_DEFAULT_MAX_SIZE || '10000'),
          defaultConcurrency: parseInt(process.env.QUEUE_DEFAULT_CONCURRENCY || '5'),
          monitoringInterval: parseInt(process.env.QUEUE_MONITORING_INTERVAL || '30000'),
          healthCheckInterval: parseInt(process.env.QUEUE_HEALTH_CHECK_INTERVAL || '60000')
        },

        queues: {
          generation: {
            maxSize: parseInt(process.env.QUEUE_GENERATION_MAX_SIZE || '5000'),
            concurrency: parseInt(process.env.QUEUE_GENERATION_CONCURRENCY || '10')
          },
          validation: {
            maxSize: parseInt(process.env.QUEUE_VALIDATION_MAX_SIZE || '10000'),
            concurrency: parseInt(process.env.QUEUE_VALIDATION_CONCURRENCY || '20')
          },
          learning: {
            maxSize: parseInt(process.env.QUEUE_LEARNING_MAX_SIZE || '50000'),
            concurrency: parseInt(process.env.QUEUE_LEARNING_CONCURRENCY || '5')
          }
        }
      },

      database: {
        url: process.env.DATABASE_URL || 'postgresql://localhost:5432/ioc_dual_ai',
        ssl: process.env.DATABASE_SSL === 'true',
        maxConnections: parseInt(process.env.DATABASE_MAX_CONNECTIONS || '20'),
        connectionTimeout: parseInt(process.env.DATABASE_CONNECTION_TIMEOUT || '30000'),
        queryTimeout: parseInt(process.env.DATABASE_QUERY_TIMEOUT || '10000'),
        
        migrations: {
          autoRun: process.env.DATABASE_AUTO_MIGRATE === 'true',
          directory: process.env.DATABASE_MIGRATIONS_DIR || '/app/migrations'
        }
      }
    };
  }

  private loadSecurityConfig(): SecurityConfiguration {
    return {
      encryption: {
        algorithm: process.env.SECURITY_ENCRYPTION_ALGORITHM || 'aes-256-gcm',
        keyRotationInterval: parseInt(process.env.SECURITY_KEY_ROTATION_INTERVAL || '86400000'),
        enableEncryption: process.env.SECURITY_ENABLE_ENCRYPTION === 'true'
      },

      apiKeys: {
        openai: process.env.OPENAI_API_KEY,
        anthropic: process.env.ANTHROPIC_API_KEY,
        google: process.env.GOOGLE_API_KEY
      },

      authentication: {
        jwtSecret: process.env.JWT_SECRET,
        jwtExpirationTime: process.env.JWT_EXPIRATION_TIME || '24h',
        enableApiKeyAuth: process.env.ENABLE_API_KEY_AUTH === 'true',
        enableJwtAuth: process.env.ENABLE_JWT_AUTH !== 'false'
      },

      dataProtection: {
        enableDataMasking: process.env.SECURITY_ENABLE_DATA_MASKING === 'true',
        enableAuditLogging: process.env.SECURITY_ENABLE_AUDIT_LOGGING !== 'false',
        retentionPolicy: {
          userContent: parseInt(process.env.SECURITY_USER_CONTENT_RETENTION || '2592000000'), // 30 days
          auditLogs: parseInt(process.env.SECURITY_AUDIT_LOG_RETENTION || '7776000000'), // 90 days
          learningData: parseInt(process.env.SECURITY_LEARNING_DATA_RETENTION || '7776000000') // 90 days
        }
      }
    };
  }

  private loadMonitoringConfig(): MonitoringConfiguration {
    return {
      metrics: {
        enabled: process.env.MONITORING_METRICS_ENABLED !== 'false',
        endpoint: process.env.METRICS_ENDPOINT,
        apiKey: process.env.METRICS_API_KEY,
        flushInterval: parseInt(process.env.METRICS_FLUSH_INTERVAL || '60000'),
        batchSize: parseInt(process.env.METRICS_BATCH_SIZE || '100')
      },

      logging: {
        level: (process.env.LOG_LEVEL as 'debug' | 'info' | 'warn' | 'error') || 'info',
        format: (process.env.LOG_FORMAT as 'json' | 'text') || 'json',
        destination: process.env.LOG_DESTINATION || 'console',
        
        external: {
          enabled: process.env.LOG_EXTERNAL_ENABLED === 'true',
          endpoint: process.env.LOG_ENDPOINT,
          apiKey: process.env.LOG_API_KEY
        }
      },

      alerts: {
        enabled: process.env.MONITORING_ALERTS_ENABLED === 'true',
        
        channels: {
          email: {
            enabled: process.env.ALERTS_EMAIL_ENABLED === 'true',
            recipients: process.env.ALERTS_EMAIL_RECIPIENTS?.split(',') || [],
            smtpUrl: process.env.SMTP_URL
          },
          slack: {
            enabled: process.env.ALERTS_SLACK_ENABLED === 'true',
            webhookUrl: process.env.SLACK_WEBHOOK_URL,
            channel: process.env.SLACK_ALERT_CHANNEL || '#alerts'
          },
          webhook: {
            enabled: process.env.ALERTS_WEBHOOK_ENABLED === 'true',
            url: process.env.ALERTS_WEBHOOK_URL
          }
        },

        thresholds: {
          errorRate: parseFloat(process.env.ALERTS_ERROR_RATE_THRESHOLD || '0.05'),
          responseTime: parseInt(process.env.ALERTS_RESPONSE_TIME_THRESHOLD || '5000'),
          queueDepth: parseInt(process.env.ALERTS_QUEUE_DEPTH_THRESHOLD || '1000'),
          disagreementRate: parseFloat(process.env.ALERTS_DISAGREEMENT_RATE_THRESHOLD || '0.2')
        }
      },

      healthChecks: {
        enabled: process.env.MONITORING_HEALTH_CHECKS_ENABLED !== 'false',
        interval: parseInt(process.env.HEALTH_CHECK_INTERVAL || '30000'),
        timeout: parseInt(process.env.HEALTH_CHECK_TIMEOUT || '10000'),
        endpoints: {
          generator: process.env.HEALTH_CHECK_GENERATOR_ENDPOINT,
          validator: process.env.HEALTH_CHECK_VALIDATOR_ENDPOINT,
          cache: process.env.HEALTH_CHECK_CACHE_ENDPOINT,
          database: process.env.HEALTH_CHECK_DATABASE_ENDPOINT
        }
      }
    };
  }

  private applyEnvironmentOverrides(config: DualAIConfiguration, env: string): DualAIConfiguration {
    switch (env) {
      case 'development':
        return this.applyDevelopmentOverrides(config);
      case 'staging':
        return this.applyStagingOverrides(config);
      case 'production':
        return this.applyProductionOverrides(config);
      default:
        return config;
    }
  }

  private applyDevelopmentOverrides(config: DualAIConfiguration): DualAIConfiguration {
    return {
      ...config,
      monitoring: {
        ...config.monitoring,
        logging: {
          ...config.monitoring.logging,
          level: 'debug'
        }
      },
      infrastructure: {
        ...config.infrastructure,
        cache: {
          ...config.infrastructure.cache,
          redis: {
            ...config.infrastructure.cache.redis,
            enabled: false // Use memory cache in development
          }
        }
      }
    };
  }

  private applyStagingOverrides(config: DualAIConfiguration): DualAIConfiguration {
    return {
      ...config,
      learning: {
        ...config.learning,
        retraining: {
          ...config.learning.retraining,
          enableAutoRetraining: false // Disable auto-retraining in staging
        }
      }
    };
  }

  private applyProductionOverrides(config: DualAIConfiguration): DualAIConfiguration {
    return {
      ...config,
      monitoring: {
        ...config.monitoring,
        logging: {
          ...config.monitoring.logging,
          level: 'warn' // Reduce logging in production
        },
        alerts: {
          ...config.monitoring.alerts,
          enabled: true // Always enable alerts in production
        }
      },
      security: {
        ...config.security,
        dataProtection: {
          ...config.security.dataProtection,
          enableDataMasking: true,
          enableAuditLogging: true
        }
      }
    };
  }

  private validateConfiguration(): void {
    const requiredApiKeys = [];

    // Check for required API keys based on configured providers
    const generators = Object.values(this.config.generator.models.primary);
    const validators = [
      this.config.validator.models.primary,
      this.config.validator.models.secondary
    ];

    [...generators, ...validators].forEach(model => {
      if (model.provider === 'openai' && !this.config.security.apiKeys.openai) {
        requiredApiKeys.push('OPENAI_API_KEY');
      }
      if (model.provider === 'anthropic' && !this.config.security.apiKeys.anthropic) {
        requiredApiKeys.push('ANTHROPIC_API_KEY');
      }
      if (model.provider === 'google' && !this.config.security.apiKeys.google) {
        requiredApiKeys.push('GOOGLE_API_KEY');
      }
    });

    if (requiredApiKeys.length > 0) {
      throw new Error(`Missing required API keys: ${requiredApiKeys.join(', ')}`);
    }

    // Validate database URL if using external database
    if (!this.config.infrastructure.database.url) {
      throw new Error('DATABASE_URL is required');
    }

    // Validate Redis URL if Redis is enabled
    if (this.config.infrastructure.cache.redis.enabled && !this.config.infrastructure.cache.redis.url) {
      throw new Error('REDIS_URL is required when Redis caching is enabled');
    }

    // Validate JWT secret if JWT auth is enabled
    if (this.config.security.authentication.enableJwtAuth && !this.config.security.authentication.jwtSecret) {
      throw new Error('JWT_SECRET is required when JWT authentication is enabled');
    }
  }
}

// Configuration interfaces
export interface DualAIConfiguration {
  environment: string;
  version: string;
  generator: GeneratorConfiguration;
  validator: ValidatorConfiguration;
  disagreementHandler: DisagreementHandlerConfiguration;
  learning: LearningConfiguration;
  infrastructure: InfrastructureConfiguration;
  security: SecurityConfiguration;
  monitoring: MonitoringConfiguration;
}

export interface GeneratorConfiguration {
  models: {
    primary: Record<ContentType, ModelConfiguration>;
    fallback: ModelConfiguration;
  };
  performance: {
    batchConcurrency: number;
    requestTimeout: number;
    retryAttempts: number;
    retryDelay: number;
  };
  rateLimit: {
    requestsPerMinute: number;
    requestsPerHour: number;
    tokensPerMinute: number;
    concurrentRequests: number;
  };
  prompts: {
    templatesPath: string;
    enableDynamic: boolean;
    cacheTemplates: boolean;
    versionControl: boolean;
  };
}

export interface ValidatorConfiguration {
  models: {
    primary: ModelConfiguration;
    secondary: ModelConfiguration;
  };
  validation: {
    enableEthicalReview: boolean;
    enableBiasDetection: boolean;
    enableQualityCheck: boolean;
    enableComplianceCheck: boolean;
    thresholds: {
      ethicalScore: number;
      biasScore: number;
      qualityScore: number;
      complianceScore: number;
      overallScore: number;
    };
  };
  performance: {
    batchConcurrency: number;
    requestTimeout: number;
    urgentRequestTimeout: number;
  };
  rules: {
    rulesPath: string;
    enableDynamicRules: boolean;
    reloadInterval: number;
  };
}

export interface DisagreementHandlerConfiguration {
  escalation: {
    confidenceDelta: number;
    severityThreshold: string;
    issueCountThreshold: number;
    autoEscalateEthical: boolean;
    autoEscalateCritical: boolean;
  };
  resolution: {
    enableAutomaticResolution: boolean;
    resolutionTimeout: number;
    maxResolutionAttempts: number;
    requireHumanApproval: boolean;
  };
  humanReview: {
    queueName: string;
    maxQueueSize: number;
    priorityWeights: Record<string, number>;
    notifications: {
      email: boolean;
      slack: boolean;
      webhookUrl?: string;
    };
  };
}

export interface LearningConfiguration {
  processing: {
    batchSize: number;
    batchInterval: number;
    processingConcurrency: number;
    maxRetentionDays: number;
  };
  retraining: {
    enableAutoRetraining: boolean;
    triggers: {
      disagreementRate: {
        enabled: boolean;
        threshold: number;
        timeWindow: number;
      };
      accuracyDrop: {
        enabled: boolean;
        threshold: number;
        timeWindow: number;
      };
      feedbackScore: {
        enabled: boolean;
        threshold: number;
        timeWindow: number;
      };
      timeBased: {
        enabled: boolean;
        interval: number;
      };
    };
  };
  insights: {
    enableInsightGeneration: boolean;
    insightThreshold: number;
    maxInsightsPerBatch: number;
  };
}

export interface InfrastructureConfiguration {
  cache: {
    redis: {
      enabled: boolean;
      url: string;
      keyPrefix: string;
      maxRetries: number;
      retryDelay: number;
    };
    memory: {
      maxSize: number;
      ttl: number;
      maxTtl: number;
      cleanupInterval: number;
    };
    policies: {
      defaultTtl: number;
      generation: {
        ttl: number;
        enableCaching: boolean;
      };
      validation: {
        ttl: number;
        enableCaching: boolean;
      };
    };
  };
  queue: {
    provider: 'memory' | 'redis' | 'sqs';
    redis: {
      url: string;
    };
    sqs: {
      region: string;
      accessKeyId?: string;
      secretAccessKey?: string;
    };
    settings: {
      defaultMaxSize: number;
      defaultConcurrency: number;
      monitoringInterval: number;
      healthCheckInterval: number;
    };
    queues: {
      generation: {
        maxSize: number;
        concurrency: number;
      };
      validation: {
        maxSize: number;
        concurrency: number;
      };
      learning: {
        maxSize: number;
        concurrency: number;
      };
    };
  };
  database: {
    url: string;
    ssl: boolean;
    maxConnections: number;
    connectionTimeout: number;
    queryTimeout: number;
    migrations: {
      autoRun: boolean;
      directory: string;
    };
  };
}

export interface SecurityConfiguration {
  encryption: {
    algorithm: string;
    keyRotationInterval: number;
    enableEncryption: boolean;
  };
  apiKeys: {
    openai?: string;
    anthropic?: string;
    google?: string;
  };
  authentication: {
    jwtSecret?: string;
    jwtExpirationTime: string;
    enableApiKeyAuth: boolean;
    enableJwtAuth: boolean;
  };
  dataProtection: {
    enableDataMasking: boolean;
    enableAuditLogging: boolean;
    retentionPolicy: {
      userContent: number;
      auditLogs: number;
      learningData: number;
    };
  };
}

export interface MonitoringConfiguration {
  metrics: {
    enabled: boolean;
    endpoint?: string;
    apiKey?: string;
    flushInterval: number;
    batchSize: number;
  };
  logging: {
    level: 'debug' | 'info' | 'warn' | 'error';
    format: 'json' | 'text';
    destination: string;
    external: {
      enabled: boolean;
      endpoint?: string;
      apiKey?: string;
    };
  };
  alerts: {
    enabled: boolean;
    channels: {
      email: {
        enabled: boolean;
        recipients: string[];
        smtpUrl?: string;
      };
      slack: {
        enabled: boolean;
        webhookUrl?: string;
        channel: string;
      };
      webhook: {
        enabled: boolean;
        url?: string;
      };
    };
    thresholds: {
      errorRate: number;
      responseTime: number;
      queueDepth: number;
      disagreementRate: number;
    };
  };
  healthChecks: {
    enabled: boolean;
    interval: number;
    timeout: number;
    endpoints: {
      generator?: string;
      validator?: string;
      cache?: string;
      database?: string;
    };
  };
}

export interface ModelConfiguration {
  provider: ModelProvider;
  model: string;
  temperature?: number;
  maxTokens?: number;
  topP?: number;
  frequencyPenalty?: number;
  presencePenalty?: number;
}

// Export the singleton instance
export const dualAIConfig = DualAIConfig.getInstance();