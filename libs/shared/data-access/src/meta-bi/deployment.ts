// Meta BI System Deployment Configuration
// Complete deployment setup for day 1 launch

import { 
  MetaBIConfig, 
  AnalyticsDBConfig, 
  StreamProcessorConfig, 
  BatchProcessorConfig,
  AnalyticsEngineConfig,
  MonitoringConfig,
  SecurityConfig
} from './types';
import { 
  createDefaultAnalyticsDBConfig,
  createDefaultStreamConfig,
  createDefaultBatchConfig,
  createDefaultAnalyticsConfig,
  createDefaultMonitoringConfig,
  createDefaultSecurityConfig
} from './index';

export interface DeploymentConfig {
  environment: 'development' | 'staging' | 'production';
  infrastructure: {
    platform: 'kubernetes' | 'docker-compose' | 'bare-metal';
    cloud: {
      provider?: 'aws' | 'gcp' | 'azure';
      region?: string;
      vpc?: string;
    };
    scaling: {
      minInstances: number;
      maxInstances: number;
      autoScaling: boolean;
    };
  };
  databases: {
    analytics: AnalyticsDBConfig;
    operational: {
      host: string;
      port: number;
      database: string;
      username: string;
      password: string;
    };
  };
  processing: {
    stream: StreamProcessorConfig;
    batch: BatchProcessorConfig;
  };
  analytics: AnalyticsEngineConfig;
  monitoring: MonitoringConfig;
  security: SecurityConfig;
  networking: {
    loadBalancer: {
      enabled: boolean;
      type: 'alb' | 'nlb' | 'nginx' | 'traefik';
      ssl: boolean;
    };
    cdn: {
      enabled: boolean;
      provider?: 'cloudflare' | 'cloudfront' | 'fastly';
    };
  };
  storage: {
    exports: {
      type: 's3' | 'gcs' | 'azure-blob' | 'local';
      bucket?: string;
      region?: string;
      retention: string;
    };
    backups: {
      enabled: boolean;
      schedule: string;
      retention: string;
      encryption: boolean;
    };
  };
}

export class MetaBISystemDeployer {
  private config: DeploymentConfig;
  
  constructor(config: DeploymentConfig) {
    this.config = config;
  }
  
  /**
   * Generate Kubernetes deployment manifests
   */
  public generateKubernetesManifests(): {
    namespace: string;
    deployments: any[];
    services: any[];
    configMaps: any[];
    secrets: any[];
    ingress?: any;
  } {
    
    const namespace = `ioc-meta-bi-${this.config.environment}`;
    
    return {
      namespace,
      deployments: [
        this.generateAnalyticsDBDeployment(),
        this.generateProcessingDeployment(),
        this.generateAnalyticsAPIDeployment(),
        this.generateMonitoringDeployment()
      ],
      services: [
        this.generateAnalyticsDBService(),
        this.generateProcessingService(),
        this.generateAnalyticsAPIService(),
        this.generateMonitoringService()
      ],
      configMaps: [
        this.generateSystemConfigMap(),
        this.generateMonitoringConfigMap()
      ],
      secrets: [
        this.generateDatabaseSecrets(),
        this.generateAPISecrets()
      ],
      ingress: this.config.networking.loadBalancer.enabled ? this.generateIngress() : undefined
    };
  }
  
  /**
   * Generate Docker Compose configuration
   */
  public generateDockerCompose(): any {
    return {
      version: '3.8',
      services: {
        'analytics-db': this.generateAnalyticsDBService(),
        'processing-engine': this.generateProcessingEngineService(),
        'analytics-api': this.generateAnalyticsAPIService(),
        'monitoring': this.generateMonitoringSystemService(),
        'redis-cache': this.generateRedisCacheService(),
        'nginx-proxy': this.config.networking.loadBalancer.enabled ? this.generateNginxProxyService() : undefined
      },
      networks: {
        'meta-bi-network': {
          driver: 'bridge'
        }
      },
      volumes: {
        'analytics-data': {},
        'monitoring-data': {},
        'export-data': {}
      }
    };
  }
  
  /**
   * Generate environment variables
   */
  public generateEnvironmentVariables(): Record<string, string> {
    return {
      // Environment
      NODE_ENV: this.config.environment,
      
      // Analytics Database
      ANALYTICS_DB_HOST: this.config.databases.analytics.host,
      ANALYTICS_DB_PORT: this.config.databases.analytics.port.toString(),
      ANALYTICS_DB_NAME: this.config.databases.analytics.database,
      ANALYTICS_DB_USER: this.config.databases.analytics.username,
      ANALYTICS_DB_PASSWORD: this.config.databases.analytics.password,
      ANALYTICS_DB_SSL: this.config.databases.analytics.ssl.toString(),
      
      // Operational Database
      OPERATIONAL_DB_HOST: this.config.databases.operational.host,
      OPERATIONAL_DB_PORT: this.config.databases.operational.port.toString(),
      OPERATIONAL_DB_NAME: this.config.databases.operational.database,
      OPERATIONAL_DB_USER: this.config.databases.operational.username,
      OPERATIONAL_DB_PASSWORD: this.config.databases.operational.password,
      
      // Processing
      STREAM_BATCH_SIZE: this.config.processing.stream.batchSize.toString(),
      STREAM_MAX_WAIT_TIME: this.config.processing.stream.maxWaitTimeMs.toString(),
      BATCH_CHUNK_SIZE: this.config.processing.batch.chunkSize.toString(),
      BATCH_MAX_CONCURRENCY: this.config.processing.batch.maxConcurrency.toString(),
      
      // Security
      ANONYMIZATION_SALT: process.env.ANONYMIZATION_SALT || 'change-in-production',
      ENCRYPTION_KEY: process.env.ENCRYPTION_KEY || 'change-in-production',
      JWT_SECRET: process.env.JWT_SECRET || 'change-in-production',
      
      // Monitoring
      MONITORING_ENABLED: this.config.monitoring.alerting.enabled.toString(),
      METRICS_INTERVAL: this.config.monitoring.metrics.interval.toString(),
      
      // Storage
      EXPORT_STORAGE_TYPE: this.config.storage.exports.type,
      EXPORT_STORAGE_BUCKET: this.config.storage.exports.bucket || '',
      EXPORT_STORAGE_REGION: this.config.storage.exports.region || '',
      
      // Networking
      LOAD_BALANCER_ENABLED: this.config.networking.loadBalancer.enabled.toString(),
      CDN_ENABLED: this.config.networking.cdn.enabled.toString(),
      
      // Scaling
      MIN_INSTANCES: this.config.infrastructure.scaling.minInstances.toString(),
      MAX_INSTANCES: this.config.infrastructure.scaling.maxInstances.toString(),
      AUTO_SCALING: this.config.infrastructure.scaling.autoScaling.toString()
    };
  }
  
  /**
   * Generate health check configuration
   */
  public generateHealthChecks(): {
    database: HealthCheck;
    processing: HealthCheck;
    analytics: HealthCheck;
    monitoring: HealthCheck;
  } {
    return {
      database: {
        endpoint: '/health/database',
        interval: 30,
        timeout: 5,
        retries: 3,
        initialDelay: 10
      },
      processing: {
        endpoint: '/health/processing',
        interval: 30,
        timeout: 10,
        retries: 3,
        initialDelay: 15
      },
      analytics: {
        endpoint: '/health/analytics',
        interval: 30,
        timeout: 5,
        retries: 3,
        initialDelay: 10
      },
      monitoring: {
        endpoint: '/health/monitoring',
        interval: 60,
        timeout: 5,
        retries: 2,
        initialDelay: 5
      }
    };
  }
  
  /**
   * Generate backup configuration
   */
  public generateBackupConfig(): {
    schedule: string;
    retention: string;
    compression: boolean;
    encryption: boolean;
    destinations: BackupDestination[];
  } {
    return {
      schedule: this.config.storage.backups.schedule,
      retention: this.config.storage.backups.retention,
      compression: true,
      encryption: this.config.storage.backups.encryption,
      destinations: [
        {
          type: this.config.storage.exports.type,
          path: 'backups/',
          region: this.config.storage.exports.region,
          bucket: this.config.storage.exports.bucket
        }
      ]
    };
  }
  
  /**
   * Generate scaling configuration
   */
  public generateScalingConfig(): {
    horizontal: HorizontalScalingConfig;
    vertical: VerticalScalingConfig;
  } {
    return {
      horizontal: {
        enabled: this.config.infrastructure.scaling.autoScaling,
        minReplicas: this.config.infrastructure.scaling.minInstances,
        maxReplicas: this.config.infrastructure.scaling.maxInstances,
        targetCPUUtilization: 70,
        targetMemoryUtilization: 80,
        scaleUpCooldown: 300,
        scaleDownCooldown: 600
      },
      vertical: {
        enabled: false,
        minResources: {
          cpu: '500m',
          memory: '1Gi'
        },
        maxResources: {
          cpu: '4',
          memory: '8Gi'
        }
      }
    };
  }
  
  /**
   * Generate monitoring configuration
   */
  public generateMonitoringStackConfig(): {
    prometheus: any;
    grafana: any;
    alertmanager: any;
  } {
    return {
      prometheus: {
        scrapeInterval: '30s',
        evaluationInterval: '30s',
        retentionTime: '15d',
        scrapeConfigs: [
          {
            jobName: 'meta-bi-analytics-api',
            staticConfigs: [
              { targets: ['analytics-api:3000'] }
            ]
          },
          {
            jobName: 'meta-bi-processing',
            staticConfigs: [
              { targets: ['processing-engine:3001'] }
            ]
          }
        ]
      },
      grafana: {
        adminUser: 'admin',
        adminPassword: process.env.GRAFANA_PASSWORD || 'admin',
        datasources: [
          {
            name: 'Prometheus',
            type: 'prometheus',
            url: 'http://prometheus:9090'
          },
          {
            name: 'Analytics DB',
            type: 'postgres',
            url: `postgres://${this.config.databases.analytics.username}:${this.config.databases.analytics.password}@${this.config.databases.analytics.host}:${this.config.databases.analytics.port}/${this.config.databases.analytics.database}`
          }
        ],
        dashboards: [
          'meta-bi-overview',
          'data-quality-metrics',
          'system-performance',
          'security-audit'
        ]
      },
      alertmanager: {
        globalConfig: {
          smtpSmarthost: process.env.SMTP_HOST || 'localhost:587',
          smtpFrom: process.env.ALERT_FROM_EMAIL || 'alerts@iocframework.com'
        },
        route: {
          groupBy: ['alertname'],
          groupWait: '10s',
          groupInterval: '10s',
          repeatInterval: '1h',
          receiver: 'web.hook'
        },
        receivers: [
          {
            name: 'web.hook',
            webhookConfigs: [
              {
                url: process.env.ALERT_WEBHOOK_URL || 'http://localhost:5001/alerts'
              }
            ]
          }
        ]
      }
    };
  }
  
  // Private helper methods for generating Kubernetes resources
  
  private generateAnalyticsDBDeployment(): any {
    return {
      apiVersion: 'apps/v1',
      kind: 'Deployment',
      metadata: {
        name: 'analytics-db',
        namespace: `ioc-meta-bi-${this.config.environment}`
      },
      spec: {
        replicas: this.config.infrastructure.scaling.minInstances,
        selector: {
          matchLabels: {
            app: 'analytics-db'
          }
        },
        template: {
          metadata: {
            labels: {
              app: 'analytics-db'
            }
          },
          spec: {
            containers: [
              {
                name: 'postgres',
                image: 'postgres:15-alpine',
                env: [
                  {
                    name: 'POSTGRES_DB',
                    value: this.config.databases.analytics.database
                  },
                  {
                    name: 'POSTGRES_USER',
                    value: this.config.databases.analytics.username
                  },
                  {
                    name: 'POSTGRES_PASSWORD',
                    valueFrom: {
                      secretKeyRef: {
                        name: 'analytics-db-secret',
                        key: 'password'
                      }
                    }
                  }
                ],
                ports: [
                  {
                    containerPort: 5432
                  }
                ],
                volumeMounts: [
                  {
                    name: 'analytics-data',
                    mountPath: '/var/lib/postgresql/data'
                  }
                ],
                resources: {
                  requests: {
                    cpu: '500m',
                    memory: '1Gi'
                  },
                  limits: {
                    cpu: '2',
                    memory: '4Gi'
                  }
                }
              }
            ],
            volumes: [
              {
                name: 'analytics-data',
                persistentVolumeClaim: {
                  claimName: 'analytics-db-pvc'
                }
              }
            ]
          }
        }
      }
    };
  }
  
  private generateProcessingDeployment(): any {
    return {
      apiVersion: 'apps/v1',
      kind: 'Deployment',
      metadata: {
        name: 'processing-engine',
        namespace: `ioc-meta-bi-${this.config.environment}`
      },
      spec: {
        replicas: this.config.infrastructure.scaling.minInstances,
        selector: {
          matchLabels: {
            app: 'processing-engine'
          }
        },
        template: {
          metadata: {
            labels: {
              app: 'processing-engine'
            }
          },
          spec: {
            containers: [
              {
                name: 'processing',
                image: 'ioc/meta-bi-processing:latest',
                env: this.generateContainerEnv(),
                ports: [
                  {
                    containerPort: 3001
                  }
                ],
                resources: {
                  requests: {
                    cpu: '1',
                    memory: '2Gi'
                  },
                  limits: {
                    cpu: '4',
                    memory: '8Gi'
                  }
                },
                livenessProbe: {
                  httpGet: {
                    path: '/health',
                    port: 3001
                  },
                  initialDelaySeconds: 30,
                  periodSeconds: 30
                },
                readinessProbe: {
                  httpGet: {
                    path: '/ready',
                    port: 3001
                  },
                  initialDelaySeconds: 10,
                  periodSeconds: 10
                }
              }
            ]
          }
        }
      }
    };
  }
  
  private generateAnalyticsAPIDeployment(): any {
    return {
      apiVersion: 'apps/v1',
      kind: 'Deployment',
      metadata: {
        name: 'analytics-api',
        namespace: `ioc-meta-bi-${this.config.environment}`
      },
      spec: {
        replicas: this.config.infrastructure.scaling.minInstances,
        selector: {
          matchLabels: {
            app: 'analytics-api'
          }
        },
        template: {
          metadata: {
            labels: {
              app: 'analytics-api'
            }
          },
          spec: {
            containers: [
              {
                name: 'api',
                image: 'ioc/meta-bi-api:latest',
                env: this.generateContainerEnv(),
                ports: [
                  {
                    containerPort: 3000
                  }
                ],
                resources: {
                  requests: {
                    cpu: '500m',
                    memory: '1Gi'
                  },
                  limits: {
                    cpu: '2',
                    memory: '4Gi'
                  }
                },
                livenessProbe: {
                  httpGet: {
                    path: '/health',
                    port: 3000
                  },
                  initialDelaySeconds: 30,
                  periodSeconds: 30
                },
                readinessProbe: {
                  httpGet: {
                    path: '/ready',
                    port: 3000
                  },
                  initialDelaySeconds: 10,
                  periodSeconds: 10
                }
              }
            ]
          }
        }
      }
    };
  }
  
  private generateMonitoringDeployment(): any {
    return {
      apiVersion: 'apps/v1',
      kind: 'Deployment',
      metadata: {
        name: 'monitoring',
        namespace: `ioc-meta-bi-${this.config.environment}`
      },
      spec: {
        replicas: 1,
        selector: {
          matchLabels: {
            app: 'monitoring'
          }
        },
        template: {
          metadata: {
            labels: {
              app: 'monitoring'
            }
          },
          spec: {
            containers: [
              {
                name: 'prometheus',
                image: 'prom/prometheus:latest',
                ports: [
                  {
                    containerPort: 9090
                  }
                ],
                volumeMounts: [
                  {
                    name: 'prometheus-config',
                    mountPath: '/etc/prometheus'
                  }
                ]
              },
              {
                name: 'grafana',
                image: 'grafana/grafana:latest',
                ports: [
                  {
                    containerPort: 3000
                  }
                ],
                env: [
                  {
                    name: 'GF_SECURITY_ADMIN_PASSWORD',
                    valueFrom: {
                      secretKeyRef: {
                        name: 'monitoring-secret',
                        key: 'grafana-password'
                      }
                    }
                  }
                ]
              }
            ],
            volumes: [
              {
                name: 'prometheus-config',
                configMap: {
                  name: 'prometheus-config'
                }
              }
            ]
          }
        }
      }
    };
  }
  
  private generateAnalyticsDBService(): any {
    return {
      apiVersion: 'v1',
      kind: 'Service',
      metadata: {
        name: 'analytics-db',
        namespace: `ioc-meta-bi-${this.config.environment}`
      },
      spec: {
        selector: {
          app: 'analytics-db'
        },
        ports: [
          {
            port: 5432,
            targetPort: 5432
          }
        ]
      }
    };
  }
  
  private generateProcessingService(): any {
    return {
      apiVersion: 'v1',
      kind: 'Service',
      metadata: {
        name: 'processing-engine',
        namespace: `ioc-meta-bi-${this.config.environment}`
      },
      spec: {
        selector: {
          app: 'processing-engine'
        },
        ports: [
          {
            port: 3001,
            targetPort: 3001
          }
        ]
      }
    };
  }
  
  private generateAnalyticsAPIService(): any {
    return {
      apiVersion: 'v1',
      kind: 'Service',
      metadata: {
        name: 'analytics-api',
        namespace: `ioc-meta-bi-${this.config.environment}`
      },
      spec: {
        selector: {
          app: 'analytics-api'
        },
        ports: [
          {
            port: 3000,
            targetPort: 3000
          }
        ],
        type: this.config.networking.loadBalancer.enabled ? 'LoadBalancer' : 'ClusterIP'
      }
    };
  }
  
  private generateMonitoringService(): any {
    return {
      apiVersion: 'v1',
      kind: 'Service',
      metadata: {
        name: 'monitoring',
        namespace: `ioc-meta-bi-${this.config.environment}`
      },
      spec: {
        selector: {
          app: 'monitoring'
        },
        ports: [
          {
            name: 'prometheus',
            port: 9090,
            targetPort: 9090
          },
          {
            name: 'grafana',
            port: 3000,
            targetPort: 3000
          }
        ]
      }
    };
  }
  
  private generateSystemConfigMap(): any {
    return {
      apiVersion: 'v1',
      kind: 'ConfigMap',
      metadata: {
        name: 'meta-bi-config',
        namespace: `ioc-meta-bi-${this.config.environment}`
      },
      data: {
        'config.json': JSON.stringify({
          environment: this.config.environment,
          processing: this.config.processing,
          analytics: this.config.analytics,
          monitoring: this.config.monitoring
        }, null, 2)
      }
    };
  }
  
  private generateMonitoringConfigMap(): any {
    return {
      apiVersion: 'v1',
      kind: 'ConfigMap',
      metadata: {
        name: 'prometheus-config',
        namespace: `ioc-meta-bi-${this.config.environment}`
      },
      data: {
        'prometheus.yml': `
global:
  scrape_interval: 30s
  evaluation_interval: 30s

scrape_configs:
  - job_name: 'meta-bi-analytics-api'
    static_configs:
      - targets: ['analytics-api:3000']
  
  - job_name: 'meta-bi-processing'
    static_configs:
      - targets: ['processing-engine:3001']
  
  - job_name: 'meta-bi-database'
    static_configs:
      - targets: ['analytics-db:5432']
        `
      }
    };
  }
  
  private generateDatabaseSecrets(): any {
    return {
      apiVersion: 'v1',
      kind: 'Secret',
      metadata: {
        name: 'analytics-db-secret',
        namespace: `ioc-meta-bi-${this.config.environment}`
      },
      type: 'Opaque',
      data: {
        password: Buffer.from(this.config.databases.analytics.password).toString('base64')
      }
    };
  }
  
  private generateAPISecrets(): any {
    return {
      apiVersion: 'v1',
      kind: 'Secret',
      metadata: {
        name: 'api-secrets',
        namespace: `ioc-meta-bi-${this.config.environment}`
      },
      type: 'Opaque',
      data: {
        'anonymization-salt': Buffer.from(process.env.ANONYMIZATION_SALT || 'change-in-production').toString('base64'),
        'encryption-key': Buffer.from(process.env.ENCRYPTION_KEY || 'change-in-production').toString('base64'),
        'jwt-secret': Buffer.from(process.env.JWT_SECRET || 'change-in-production').toString('base64')
      }
    };
  }
  
  private generateIngress(): any {
    return {
      apiVersion: 'networking.k8s.io/v1',
      kind: 'Ingress',
      metadata: {
        name: 'meta-bi-ingress',
        namespace: `ioc-meta-bi-${this.config.environment}`,
        annotations: {
          'nginx.ingress.kubernetes.io/rewrite-target': '/',
          'nginx.ingress.kubernetes.io/ssl-redirect': this.config.networking.loadBalancer.ssl.toString()
        }
      },
      spec: {
        rules: [
          {
            host: `meta-bi-${this.config.environment}.iocframework.com`,
            http: {
              paths: [
                {
                  path: '/api',
                  pathType: 'Prefix',
                  backend: {
                    service: {
                      name: 'analytics-api',
                      port: {
                        number: 3000
                      }
                    }
                  }
                },
                {
                  path: '/monitoring',
                  pathType: 'Prefix',
                  backend: {
                    service: {
                      name: 'monitoring',
                      port: {
                        number: 3000
                      }
                    }
                  }
                }
              ]
            }
          }
        ],
        tls: this.config.networking.loadBalancer.ssl ? [
          {
            secretName: 'meta-bi-tls',
            hosts: [
              `meta-bi-${this.config.environment}.iocframework.com`
            ]
          }
        ] : undefined
      }
    };
  }
  
  private generateContainerEnv(): any[] {
    const envVars = this.generateEnvironmentVariables();
    return Object.entries(envVars).map(([name, value]) => ({
      name,
      value
    }));
  }
  
  // Docker Compose service generators (simplified versions)
  
  private generateProcessingEngineService(): any {
    return {
      image: 'ioc/meta-bi-processing:latest',
      container_name: 'meta-bi-processing',
      environment: this.generateEnvironmentVariables(),
      ports: ['3001:3001'],
      networks: ['meta-bi-network'],
      depends_on: ['analytics-db', 'redis-cache'],
      restart: 'unless-stopped',
      volumes: ['export-data:/app/exports'],
      healthcheck: {
        test: ['CMD', 'curl', '-f', 'http://localhost:3001/health'],
        interval: '30s',
        timeout: '10s',
        retries: 3,
        start_period: '40s'
      }
    };
  }
  
  private generateAnalyticsAPIService(): any {
    return {
      image: 'ioc/meta-bi-api:latest',
      container_name: 'meta-bi-api',
      environment: this.generateEnvironmentVariables(),
      ports: ['3000:3000'],
      networks: ['meta-bi-network'],
      depends_on: ['analytics-db', 'redis-cache'],
      restart: 'unless-stopped',
      healthcheck: {
        test: ['CMD', 'curl', '-f', 'http://localhost:3000/health'],
        interval: '30s',
        timeout: '5s',
        retries: 3,
        start_period: '30s'
      }
    };
  }
  
  private generateMonitoringSystemService(): any {
    return {
      image: 'prom/prometheus:latest',
      container_name: 'meta-bi-monitoring',
      ports: ['9090:9090'],
      networks: ['meta-bi-network'],
      volumes: [
        'monitoring-data:/prometheus',
        './monitoring/prometheus.yml:/etc/prometheus/prometheus.yml'
      ],
      restart: 'unless-stopped'
    };
  }
  
  private generateRedisCacheService(): any {
    return {
      image: 'redis:7-alpine',
      container_name: 'meta-bi-redis',
      ports: ['6379:6379'],
      networks: ['meta-bi-network'],
      restart: 'unless-stopped',
      volumes: ['redis-data:/data'],
      command: 'redis-server --appendonly yes'
    };
  }
  
  private generateNginxProxyService(): any {
    return {
      image: 'nginx:alpine',
      container_name: 'meta-bi-proxy',
      ports: ['80:80', '443:443'],
      networks: ['meta-bi-network'],
      depends_on: ['analytics-api', 'processing-engine'],
      volumes: [
        './nginx/nginx.conf:/etc/nginx/nginx.conf',
        './nginx/ssl:/etc/nginx/ssl'
      ],
      restart: 'unless-stopped'
    };
  }
}

// Supporting interfaces

export interface HealthCheck {
  endpoint: string;
  interval: number;
  timeout: number;
  retries: number;
  initialDelay: number;
}

export interface BackupDestination {
  type: string;
  path: string;
  region?: string;
  bucket?: string;
}

export interface HorizontalScalingConfig {
  enabled: boolean;
  minReplicas: number;
  maxReplicas: number;
  targetCPUUtilization: number;
  targetMemoryUtilization: number;
  scaleUpCooldown: number;
  scaleDownCooldown: number;
}

export interface VerticalScalingConfig {
  enabled: boolean;
  minResources: {
    cpu: string;
    memory: string;
  };
  maxResources: {
    cpu: string;
    memory: string;
  };
}

/**
 * Create production deployment configuration
 */
export function createProductionDeploymentConfig(): DeploymentConfig {
  return {
    environment: 'production',
    infrastructure: {
      platform: 'kubernetes',
      cloud: {
        provider: 'aws',
        region: 'us-east-1',
        vpc: 'vpc-12345678'
      },
      scaling: {
        minInstances: 3,
        maxInstances: 20,
        autoScaling: true
      }
    },
    databases: {
      analytics: {
        ...createDefaultAnalyticsDBConfig(),
        host: 'analytics-db-cluster.us-east-1.rds.amazonaws.com',
        ssl: true,
        pool: {
          min: 5,
          max: 50,
          idleTimeoutMillis: 30000,
          connectionTimeoutMillis: 2000
        }
      },
      operational: {
        host: 'operational-db.us-east-1.rds.amazonaws.com',
        port: 5432,
        database: 'ioc_production',
        username: 'ioc_user',
        password: process.env.OPERATIONAL_DB_PASSWORD || 'change-in-production'
      }
    },
    processing: {
      stream: {
        ...createDefaultStreamConfig(),
        batchSize: 500,
        parallelism: 8
      },
      batch: {
        ...createDefaultBatchConfig(),
        chunkSize: 5000,
        maxConcurrency: 8
      }
    },
    analytics: {
      ...createDefaultAnalyticsConfig(),
      caching: {
        enabled: true,
        ttlSeconds: 300,
        maxSize: 10000
      }
    },
    monitoring: {
      ...createDefaultMonitoringConfig(),
      alerting: {
        enabled: true,
        channels: [
          {
            type: 'slack',
            config: {
              url: process.env.SLACK_WEBHOOK_URL,
              severity: ['warning', 'critical']
            }
          },
          {
            type: 'pagerduty',
            config: {
              apiKey: process.env.PAGERDUTY_API_KEY,
              severity: ['critical']
            }
          }
        ],
        rules: [
          {
            name: 'high_error_rate',
            condition: 'error_rate > 5',
            severity: 'critical',
            threshold: 5,
            duration: 300000,
            channels: ['slack', 'pagerduty']
          },
          {
            name: 'high_response_time',
            condition: 'avg_response_time > 5000',
            severity: 'warning',
            threshold: 5000,
            duration: 600000,
            channels: ['slack']
          }
        ],
        throttleMs: 300000
      }
    },
    security: createDefaultSecurityConfig(),
    networking: {
      loadBalancer: {
        enabled: true,
        type: 'alb',
        ssl: true
      },
      cdn: {
        enabled: true,
        provider: 'cloudfront'
      }
    },
    storage: {
      exports: {
        type: 's3',
        bucket: 'ioc-meta-bi-exports',
        region: 'us-east-1',
        retention: '1y'
      },
      backups: {
        enabled: true,
        schedule: '0 2 * * *',
        retention: '30d',
        encryption: true
      }
    }
  };
}

/**
 * Create development deployment configuration
 */
export function createDevelopmentDeploymentConfig(): DeploymentConfig {
  return {
    environment: 'development',
    infrastructure: {
      platform: 'docker-compose',
      cloud: {},
      scaling: {
        minInstances: 1,
        maxInstances: 3,
        autoScaling: false
      }
    },
    databases: {
      analytics: {
        ...createDefaultAnalyticsDBConfig(),
        host: 'localhost',
        port: 5433,
        ssl: false
      },
      operational: {
        host: 'localhost',
        port: 5432,
        database: 'ioc_development',
        username: 'postgres',
        password: 'postgres'
      }
    },
    processing: {
      stream: createDefaultStreamConfig(),
      batch: createDefaultBatchConfig()
    },
    analytics: createDefaultAnalyticsConfig(),
    monitoring: {
      ...createDefaultMonitoringConfig(),
      alerting: {
        ...createDefaultMonitoringConfig().alerting,
        enabled: false
      }
    },
    security: createDefaultSecurityConfig(),
    networking: {
      loadBalancer: {
        enabled: false,
        type: 'nginx',
        ssl: false
      },
      cdn: {
        enabled: false
      }
    },
    storage: {
      exports: {
        type: 'local',
        retention: '7d'
      },
      backups: {
        enabled: false,
        schedule: '0 2 * * *',
        retention: '7d',
        encryption: false
      }
    }
  };
}