// Meta BI System Architecture
// Comprehensive system architecture for scalable business intelligence

import { MetaBIConfig } from './types';

export interface MetaBIArchitecture {
  // Core components
  components: {
    dataIngestion: DataIngestionLayer;
    anonymization: AnonymizationLayer;
    analyticsDatabase: AnalyticsDatabaseLayer;
    streamProcessing: StreamProcessingLayer;
    batchProcessing: BatchProcessingLayer;
    apiGateway: APIGatewayLayer;
    analytics: AnalyticsLayer;
    monitoring: MonitoringLayer;
    security: SecurityLayer;
  };
  
  // Data flow configuration
  dataFlow: DataFlowConfiguration;
  
  // Scaling configuration
  scaling: ScalingConfiguration;
  
  // Deployment configuration
  deployment: DeploymentConfiguration;
}

export interface DataIngestionLayer {
  sources: Array<{
    name: string;
    type: 'supabase' | 'postgresql' | 'api' | 'webhook';
    connection: string;
    tables: string[];
    syncFrequency: 'realtime' | 'batch' | 'manual';
    transformations: TransformationRule[];
  }>;
  
  ingestionPipeline: {
    parallelism: number;
    batchSize: number;
    errorHandling: 'retry' | 'skip' | 'dlq';
    retryConfig: {
      maxRetries: number;
      backoffMs: number;
      exponentialBackoff: boolean;
    };
  };
  
  changeDataCapture: {
    enabled: boolean;
    method: 'wal' | 'triggers' | 'polling';
    latencyTarget: number;
  };
}

export interface AnonymizationLayer {
  pipeline: {
    stages: Array<{
      name: string;
      type: 'hash' | 'encrypt' | 'tokenize' | 'generalize' | 'suppress';
      fields: string[];
      preserveFormat: boolean;
      consistency: 'global' | 'session' | 'none';
    }>;
    
    validation: {
      enabled: boolean;
      checks: Array<{
        type: 'no_pii' | 'relationship_preserved' | 'format_valid';
        threshold: number;
      }>;
    };
  };
  
  privacyTechniques: {
    differential_privacy: {
      enabled: boolean;
      epsilon: number;
      delta: number;
    };
    
    k_anonymity: {
      enabled: boolean;
      k_value: number;
      quasi_identifiers: string[];
    };
    
    l_diversity: {
      enabled: boolean;
      l_value: number;
      sensitive_attributes: string[];
    };
  };
}

export interface AnalyticsDatabaseLayer {
  primaryStore: {
    type: 'postgresql' | 'clickhouse' | 'snowflake' | 'bigquery';
    configuration: {
      cluster: {
        nodes: number;
        replication: number;
        sharding: 'hash' | 'range' | 'directory';
      };
      storage: {
        compression: 'lz4' | 'zstd' | 'gzip';
        partitioning: 'time' | 'hash' | 'range';
        retention: string;
      };
    };
  };
  
  cacheLayer: {
    type: 'redis' | 'memcached' | 'hazelcast';
    configuration: {
      cluster: boolean;
      persistence: boolean;
      eviction: 'lru' | 'lfu' | 'ttl';
      ttl: number;
    };
  };
  
  searchEngine: {
    type: 'elasticsearch' | 'opensearch' | 'solr';
    configuration: {
      indices: string[];
      shards: number;
      replicas: number;
      analyzers: string[];
    };
  };
}

export interface StreamProcessingLayer {
  framework: {
    type: 'kafka-streams' | 'apache-flink' | 'apache-spark' | 'pulsar-functions';
    configuration: {
      parallelism: number;
      checkpointing: {
        enabled: boolean;
        interval: number;
      };
      watermarks: {
        enabled: boolean;
        maxOutOfOrderness: number;
      };
    };
  };
  
  topologies: Array<{
    name: string;
    inputTopics: string[];
    outputTopics: string[];
    processors: Array<{
      type: 'map' | 'filter' | 'aggregate' | 'join' | 'window';
      configuration: Record<string, any>;
    }>;
  }>;
  
  windowing: {
    types: Array<'tumbling' | 'sliding' | 'session'>;
    sizes: number[];
    allowedLateness: number;
  };
}

export interface BatchProcessingLayer {
  scheduler: {
    type: 'kubernetes-cron' | 'airflow' | 'prefect' | 'dagster';
    configuration: {
      maxConcurrentJobs: number;
      retryPolicy: {
        maxRetries: number;
        backoffSeconds: number;
      };
    };
  };
  
  jobs: Array<{
    name: string;
    schedule: string;
    type: 'etl' | 'ml_training' | 'aggregation' | 'export';
    resources: {
      cpu: string;
      memory: string;
      disk: string;
    };
    dependencies: string[];
  }>;
  
  dataOrchestration: {
    lineageTracking: boolean;
    dataQuality: boolean;
    alerting: boolean;
  };
}

export interface APIGatewayLayer {
  gateway: {
    type: 'kong' | 'envoy' | 'nginx' | 'aws-api-gateway';
    configuration: {
      rateLimit: {
        requests: number;
        window: string;
        burst: number;
      };
      authentication: {
        methods: Array<'jwt' | 'oauth2' | 'api-key' | 'mtls'>;
        providers: string[];
      };
      caching: {
        enabled: boolean;
        ttl: number;
        varyBy: string[];
      };
    };
  };
  
  endpoints: Array<{
    path: string;
    methods: string[];
    handler: string;
    rateLimit?: number;
    authentication?: boolean;
    caching?: boolean;
  }>;
}

export interface AnalyticsLayer {
  engines: Array<{
    type: 'sql' | 'olap' | 'graph' | 'ml';
    configuration: {
      maxQueryTime: number;
      maxResultSize: number;
      cacheResults: boolean;
    };
  }>;
  
  precomputedViews: Array<{
    name: string;
    sql: string;
    refreshSchedule: string;
    materialized: boolean;
  }>;
  
  machineLearning: {
    framework: 'tensorflow' | 'pytorch' | 'scikit-learn' | 'xgboost';
    models: Array<{
      name: string;
      type: 'classification' | 'regression' | 'clustering' | 'anomaly';
      features: string[];
      target: string;
      retrainingSchedule: string;
    }>;
  };
}

export interface MonitoringLayer {
  observability: {
    metrics: {
      collector: 'prometheus' | 'datadog' | 'new-relic';
      retention: string;
      alerts: AlertConfiguration[];
    };
    
    logging: {
      system: 'elasticsearch' | 'loki' | 'fluentd';
      level: 'debug' | 'info' | 'warn' | 'error';
      structured: boolean;
    };
    
    tracing: {
      system: 'jaeger' | 'zipkin' | 'datadog';
      sampling: number;
      retention: string;
    };
  };
  
  dataQuality: {
    checks: Array<{
      name: string;
      type: 'completeness' | 'accuracy' | 'consistency' | 'validity';
      threshold: number;
      schedule: string;
    }>;
    
    profiling: {
      enabled: boolean;
      schedule: string;
      metrics: string[];
    };
  };
}

export interface SecurityLayer {
  encryption: {
    atRest: {
      algorithm: 'AES-256' | 'ChaCha20-Poly1305';
      keyManagement: 'aws-kms' | 'azure-kv' | 'gcp-kms' | 'hashicorp-vault';
      keyRotation: number;
    };
    
    inTransit: {
      protocol: 'TLS' | 'mTLS';
      version: '1.2' | '1.3';
      ciphers: string[];
    };
  };
  
  accessControl: {
    rbac: {
      enabled: boolean;
      roles: string[];
      permissions: string[];
    };
    
    abac: {
      enabled: boolean;
      policies: string[];
    };
  };
  
  audit: {
    enabled: boolean;
    events: string[];
    retention: string;
    realtime: boolean;
  };
}

export interface DataFlowConfiguration {
  stages: Array<{
    name: string;
    input: string;
    output: string;
    processing: 'stream' | 'batch' | 'hybrid';
    latency: 'real-time' | 'near-real-time' | 'batch';
    sla: {
      latency: number;
      throughput: number;
      availability: number;
    };
  }>;
  
  errorHandling: {
    deadLetterQueue: boolean;
    retryPolicy: {
      maxRetries: number;
      backoffStrategy: 'fixed' | 'exponential' | 'linear';
    };
    alerting: boolean;
  };
}

export interface ScalingConfiguration {
  horizontalScaling: {
    enabled: boolean;
    minInstances: number;
    maxInstances: number;
    targetCPU: number;
    targetMemory: number;
    scaleUpCooldown: number;
    scaleDownCooldown: number;
  };
  
  verticalScaling: {
    enabled: boolean;
    minResources: ResourceLimits;
    maxResources: ResourceLimits;
  };
  
  dataPartitioning: {
    strategy: 'time' | 'hash' | 'range' | 'directory';
    keyField: string;
    partitionCount: number;
    rebalancing: boolean;
  };
}

export interface DeploymentConfiguration {
  platform: 'kubernetes' | 'docker-compose' | 'cloud-native';
  
  kubernetes?: {
    namespace: string;
    serviceMesh: 'istio' | 'linkerd' | 'consul-connect';
    storage: {
      class: string;
      size: string;
      replicas: number;
    };
  };
  
  cloudNative?: {
    provider: 'aws' | 'gcp' | 'azure';
    services: Record<string, string>;
    networking: {
      vpc: string;
      subnets: string[];
      securityGroups: string[];
    };
  };
  
  cicd: {
    platform: 'github-actions' | 'gitlab-ci' | 'jenkins' | 'tekton';
    stages: string[];
    environments: string[];
    approval: boolean;
  };
}

export interface TransformationRule {
  field: string;
  type: 'rename' | 'cast' | 'format' | 'calculate' | 'lookup';
  parameters: Record<string, any>;
  condition?: string;
}

export interface AlertConfiguration {
  name: string;
  condition: string;
  severity: 'info' | 'warning' | 'critical';
  channels: string[];
  throttle: number;
}

export interface ResourceLimits {
  cpu: string;
  memory: string;
  disk?: string;
}

/**
 * Create default Meta BI Architecture configuration
 */
export function createDefaultArchitecture(): MetaBIArchitecture {
  return {
    components: {
      dataIngestion: {
        sources: [
          {
            name: 'supabase-operational',
            type: 'supabase',
            connection: process.env.SUPABASE_URL || '',
            tables: ['assessments', 'assessment_responses', 'assessment_question_responses', 'assessment_scores', 'users', 'organizations'],
            syncFrequency: 'realtime',
            transformations: []
          }
        ],
        ingestionPipeline: {
          parallelism: 4,
          batchSize: 1000,
          errorHandling: 'retry',
          retryConfig: {
            maxRetries: 3,
            backoffMs: 1000,
            exponentialBackoff: true
          }
        },
        changeDataCapture: {
          enabled: true,
          method: 'wal',
          latencyTarget: 1000
        }
      },
      
      anonymization: {
        pipeline: {
          stages: [
            {
              name: 'pii-removal',
              type: 'suppress',
              fields: ['email', 'phone', 'ip_address', 'user_agent'],
              preserveFormat: false,
              consistency: 'none'
            },
            {
              name: 'identifier-hashing',
              type: 'hash',
              fields: ['user_id', 'organization_id', 'assessment_id'],
              preserveFormat: false,
              consistency: 'global'
            },
            {
              name: 'geographic-generalization',
              type: 'generalize',
              fields: ['ip_address'],
              preserveFormat: true,
              consistency: 'session'
            }
          ],
          validation: {
            enabled: true,
            checks: [
              {
                type: 'no_pii',
                threshold: 0.0
              },
              {
                type: 'relationship_preserved',
                threshold: 0.95
              }
            ]
          }
        },
        privacyTechniques: {
          differential_privacy: {
            enabled: true,
            epsilon: 1.0,
            delta: 0.00001
          },
          k_anonymity: {
            enabled: true,
            k_value: 5,
            quasi_identifiers: ['organization_size', 'industry', 'geographic_region']
          },
          l_diversity: {
            enabled: true,
            l_value: 2,
            sensitive_attributes: ['assessment_scores']
          }
        }
      },
      
      analyticsDatabase: {
        primaryStore: {
          type: 'postgresql',
          configuration: {
            cluster: {
              nodes: 3,
              replication: 2,
              sharding: 'hash'
            },
            storage: {
              compression: 'lz4',
              partitioning: 'time',
              retention: '2 years'
            }
          }
        },
        cacheLayer: {
          type: 'redis',
          configuration: {
            cluster: true,
            persistence: true,
            eviction: 'lru',
            ttl: 3600
          }
        },
        searchEngine: {
          type: 'elasticsearch',
          configuration: {
            indices: ['assessments', 'responses', 'analytics'],
            shards: 5,
            replicas: 1,
            analyzers: ['standard', 'keyword', 'text']
          }
        }
      },
      
      streamProcessing: {
        framework: {
          type: 'kafka-streams',
          configuration: {
            parallelism: 8,
            checkpointing: {
              enabled: true,
              interval: 10000
            },
            watermarks: {
              enabled: true,
              maxOutOfOrderness: 5000
            }
          }
        },
        topologies: [
          {
            name: 'real-time-anonymization',
            inputTopics: ['raw-assessment-data'],
            outputTopics: ['anonymized-assessment-data'],
            processors: [
              {
                type: 'map',
                configuration: {
                  function: 'anonymizeRecord'
                }
              }
            ]
          },
          {
            name: 'real-time-aggregation',
            inputTopics: ['anonymized-assessment-data'],
            outputTopics: ['aggregated-metrics'],
            processors: [
              {
                type: 'aggregate',
                configuration: {
                  groupBy: ['organization_hash', 'assessment_type'],
                  window: 'tumbling',
                  windowSize: 300000
                }
              }
            ]
          }
        ],
        windowing: {
          types: ['tumbling', 'sliding'],
          sizes: [60000, 300000, 900000],
          allowedLateness: 10000
        }
      },
      
      batchProcessing: {
        scheduler: {
          type: 'kubernetes-cron',
          configuration: {
            maxConcurrentJobs: 10,
            retryPolicy: {
              maxRetries: 3,
              backoffSeconds: 30
            }
          }
        },
        jobs: [
          {
            name: 'daily-aggregation',
            schedule: '0 2 * * *',
            type: 'aggregation',
            resources: {
              cpu: '2',
              memory: '4Gi',
              disk: '10Gi'
            },
            dependencies: []
          },
          {
            name: 'ml-model-training',
            schedule: '0 3 * * 0',
            type: 'ml_training',
            resources: {
              cpu: '4',
              memory: '8Gi',
              disk: '20Gi'
            },
            dependencies: ['daily-aggregation']
          }
        ],
        dataOrchestration: {
          lineageTracking: true,
          dataQuality: true,
          alerting: true
        }
      },
      
      apiGateway: {
        gateway: {
          type: 'kong',
          configuration: {
            rateLimit: {
              requests: 1000,
              window: '1h',
              burst: 100
            },
            authentication: {
              methods: ['jwt', 'api-key'],
              providers: ['auth0', 'cognito']
            },
            caching: {
              enabled: true,
              ttl: 300,
              varyBy: ['user', 'query']
            }
          }
        },
        endpoints: [
          {
            path: '/api/v1/analytics/patterns',
            methods: ['GET'],
            handler: 'assessmentPatterns',
            rateLimit: 100,
            authentication: true,
            caching: true
          },
          {
            path: '/api/v1/analytics/ocean',
            methods: ['GET'],
            handler: 'oceanTraits',
            rateLimit: 100,
            authentication: true,
            caching: true
          }
        ]
      },
      
      analytics: {
        engines: [
          {
            type: 'sql',
            configuration: {
              maxQueryTime: 30000,
              maxResultSize: 1000000,
              cacheResults: true
            }
          },
          {
            type: 'olap',
            configuration: {
              maxQueryTime: 60000,
              maxResultSize: 5000000,
              cacheResults: true
            }
          }
        ],
        precomputedViews: [
          {
            name: 'daily_assessment_metrics',
            sql: `SELECT date_trunc('day', created_at) as day, 
                         count(*) as total_assessments,
                         avg(completion_rate) as avg_completion_rate
                  FROM anonymized_assessments 
                  GROUP BY day`,
            refreshSchedule: '0 1 * * *',
            materialized: true
          }
        ],
        machineLearning: {
          framework: 'scikit-learn',
          models: [
            {
              name: 'assessment_completion_predictor',
              type: 'classification',
              features: ['assessment_type', 'organization_size', 'industry'],
              target: 'completion_rate',
              retrainingSchedule: '0 2 * * 0'
            }
          ]
        }
      },
      
      monitoring: {
        observability: {
          metrics: {
            collector: 'prometheus',
            retention: '30d',
            alerts: [
              {
                name: 'high_error_rate',
                condition: 'error_rate > 0.05',
                severity: 'critical',
                channels: ['slack', 'email'],
                throttle: 300
              }
            ]
          },
          logging: {
            system: 'elasticsearch',
            level: 'info',
            structured: true
          },
          tracing: {
            system: 'jaeger',
            sampling: 0.1,
            retention: '7d'
          }
        },
        dataQuality: {
          checks: [
            {
              name: 'completeness_check',
              type: 'completeness',
              threshold: 0.95,
              schedule: '0 */6 * * *'
            },
            {
              name: 'accuracy_check',
              type: 'accuracy',
              threshold: 0.98,
              schedule: '0 */6 * * *'
            }
          ],
          profiling: {
            enabled: true,
            schedule: '0 1 * * *',
            metrics: ['nulls', 'duplicates', 'outliers', 'cardinality']
          }
        }
      },
      
      security: {
        encryption: {
          atRest: {
            algorithm: 'AES-256',
            keyManagement: 'aws-kms',
            keyRotation: 90
          },
          inTransit: {
            protocol: 'TLS',
            version: '1.3',
            ciphers: ['TLS_AES_256_GCM_SHA384', 'TLS_CHACHA20_POLY1305_SHA256']
          }
        },
        accessControl: {
          rbac: {
            enabled: true,
            roles: ['admin', 'analyst', 'viewer'],
            permissions: ['read', 'write', 'delete', 'export']
          },
          abac: {
            enabled: false,
            policies: []
          }
        },
        audit: {
          enabled: true,
          events: ['login', 'query', 'export', 'admin'],
          retention: '2 years',
          realtime: true
        }
      }
    },
    
    dataFlow: {
      stages: [
        {
          name: 'ingestion',
          input: 'operational-db',
          output: 'raw-stream',
          processing: 'stream',
          latency: 'real-time',
          sla: {
            latency: 1000,
            throughput: 10000,
            availability: 99.9
          }
        },
        {
          name: 'anonymization',
          input: 'raw-stream',
          output: 'anonymized-stream',
          processing: 'stream',
          latency: 'real-time',
          sla: {
            latency: 500,
            throughput: 10000,
            availability: 99.9
          }
        },
        {
          name: 'analytics-storage',
          input: 'anonymized-stream',
          output: 'analytics-db',
          processing: 'hybrid',
          latency: 'near-real-time',
          sla: {
            latency: 5000,
            throughput: 5000,
            availability: 99.95
          }
        }
      ],
      errorHandling: {
        deadLetterQueue: true,
        retryPolicy: {
          maxRetries: 3,
          backoffStrategy: 'exponential'
        },
        alerting: true
      }
    },
    
    scaling: {
      horizontalScaling: {
        enabled: true,
        minInstances: 2,
        maxInstances: 20,
        targetCPU: 70,
        targetMemory: 80,
        scaleUpCooldown: 300,
        scaleDownCooldown: 600
      },
      verticalScaling: {
        enabled: false,
        minResources: {
          cpu: '1',
          memory: '2Gi'
        },
        maxResources: {
          cpu: '8',
          memory: '16Gi'
        }
      },
      dataPartitioning: {
        strategy: 'time',
        keyField: 'created_at',
        partitionCount: 12,
        rebalancing: true
      }
    },
    
    deployment: {
      platform: 'kubernetes',
      kubernetes: {
        namespace: 'ioc-meta-bi',
        serviceMesh: 'istio',
        storage: {
          class: 'fast-ssd',
          size: '100Gi',
          replicas: 3
        }
      },
      cicd: {
        platform: 'github-actions',
        stages: ['test', 'build', 'deploy'],
        environments: ['dev', 'staging', 'prod'],
        approval: true
      }
    }
  };
}

/**
 * Validate Meta BI Architecture configuration
 */
export function validateArchitecture(architecture: MetaBIArchitecture): boolean {
  // Basic validation logic
  if (!architecture.components) return false;
  if (!architecture.dataFlow) return false;
  if (!architecture.scaling) return false;
  if (!architecture.deployment) return false;
  
  return true;
}

/**
 * Get recommended configuration based on scale
 */
export function getRecommendedConfiguration(scale: 'small' | 'medium' | 'large' | 'enterprise'): Partial<MetaBIArchitecture> {
  const configurations = {
    small: {
      scaling: {
        horizontalScaling: {
          enabled: true,
          minInstances: 1,
          maxInstances: 5,
          targetCPU: 80,
          targetMemory: 85,
          scaleUpCooldown: 180,
          scaleDownCooldown: 300
        }
      }
    },
    medium: {
      scaling: {
        horizontalScaling: {
          enabled: true,
          minInstances: 2,
          maxInstances: 10,
          targetCPU: 70,
          targetMemory: 80,
          scaleUpCooldown: 300,
          scaleDownCooldown: 600
        }
      }
    },
    large: {
      scaling: {
        horizontalScaling: {
          enabled: true,
          minInstances: 3,
          maxInstances: 20,
          targetCPU: 70,
          targetMemory: 80,
          scaleUpCooldown: 300,
          scaleDownCooldown: 600
        }
      }
    },
    enterprise: {
      scaling: {
        horizontalScaling: {
          enabled: true,
          minInstances: 5,
          maxInstances: 50,
          targetCPU: 60,
          targetMemory: 70,
          scaleUpCooldown: 300,
          scaleDownCooldown: 900
        }
      }
    }
  };
  
  return configurations[scale];
}