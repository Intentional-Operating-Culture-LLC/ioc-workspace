/**
 * CloudWatch Configuration for IOC Analytics
 * Lean monitoring setup optimized for free tier with growth scaling
 */

export interface MetricConfig {
  metricName: string;
  namespace: string;
  dimensions?: Record<string, string>;
  unit?: 'Count' | 'Percent' | 'Milliseconds' | 'None';
  storageResolution?: 60 | 1; // 60s for free tier, 1s for high-res
}

export interface DashboardWidget {
  type: 'metric' | 'log' | 'text';
  title: string;
  width: number;
  height: number;
  properties: any;
}

// Free tier: 10 custom metrics, 3 dashboards, 5GB logs
export const FREE_TIER_LIMITS = {
  customMetrics: 10,
  dashboards: 3,
  dashboardsPerMonth: 1000000, // 1M requests
  logsIngestionGB: 5,
  logsStorageDays: 7,
  alarmsPerRegion: 10,
  metricStreams: 2
};

// Essential metrics within free tier
export const ESSENTIAL_METRICS: MetricConfig[] = [
  // Business KPIs (5 metrics)
  {
    metricName: 'AssessmentCompleted',
    namespace: 'IOC/Business',
    unit: 'Count'
  },
  {
    metricName: 'DualAIValidationSuccess',
    namespace: 'IOC/Business',
    unit: 'Percent'
  },
  {
    metricName: 'DailyActiveUsers',
    namespace: 'IOC/Business',
    unit: 'Count'
  },
  {
    metricName: 'RevenueTracked',
    namespace: 'IOC/Business',
    unit: 'None' // Dollar amount
  },
  {
    metricName: 'TrialConversion',
    namespace: 'IOC/Business',
    unit: 'Percent'
  },
  
  // System Health (5 metrics)
  {
    metricName: 'LambdaErrors',
    namespace: 'IOC/System',
    unit: 'Count'
  },
  {
    metricName: 'APILatency',
    namespace: 'IOC/System',
    unit: 'Milliseconds'
  },
  {
    metricName: 'S3ProcessingTime',
    namespace: 'IOC/System',
    unit: 'Milliseconds'
  },
  {
    metricName: 'CostPerAssessment',
    namespace: 'IOC/System',
    unit: 'None' // Dollar amount
  },
  {
    metricName: 'ErrorRate',
    namespace: 'IOC/System',
    unit: 'Percent'
  }
];

// Growth-based metric additions
export const GROWTH_METRICS = {
  // $500 MRR - Add detailed user metrics
  tier1: [
    'UserRetention30Day',
    'AssessmentCompletionTime',
    'IndustryBreakdown',
    'FeatureAdoption'
  ],
  
  // $2K MRR - Add performance metrics
  tier2: [
    'DetailedAPIMetrics',
    'DatabasePerformance',
    'CacheHitRate',
    'QueueDepth'
  ],
  
  // $5K MRR - Add anomaly detection
  tier3: [
    'AnomalyDetection',
    'PredictiveScaling',
    'UserBehaviorPatterns',
    'RevenueForecasting'
  ],
  
  // $10K MRR - Full observability
  tier4: [
    'DistributedTracing',
    'RealTimeAnalytics',
    'CustomDashboards',
    'AdvancedAlerting'
  ]
};

// Dashboard configurations
export const DASHBOARD_CONFIGS = {
  // Dashboard 1: Business Metrics (Free Tier)
  businessMetrics: {
    name: 'IOC-Business-KPIs',
    widgets: [
      // Assessment Completion Rate
      {
        type: 'metric',
        title: 'Assessment Completion Rate',
        width: 12,
        height: 6,
        properties: {
          metrics: [
            ['IOC/Business', 'AssessmentCompleted', { stat: 'Sum' }],
            ['.', '.', { stat: 'Average' }]
          ],
          period: 300,
          stat: 'Average',
          region: 'us-east-1',
          title: 'Assessment Completions'
        }
      },
      // Revenue Tracking
      {
        type: 'metric',
        title: 'Revenue Metrics',
        width: 12,
        height: 6,
        properties: {
          metrics: [
            ['IOC/Business', 'RevenueTracked', { stat: 'Sum' }],
            ['...', { stat: 'Average' }]
          ],
          period: 86400, // Daily
          stat: 'Sum',
          region: 'us-east-1',
          title: 'Daily Revenue'
        }
      },
      // User Activity
      {
        type: 'metric',
        title: 'Active Users',
        width: 12,
        height: 6,
        properties: {
          metrics: [
            ['IOC/Business', 'DailyActiveUsers', { stat: 'Maximum' }]
          ],
          period: 86400,
          stat: 'Maximum',
          region: 'us-east-1',
          title: 'Daily Active Users'
        }
      },
      // OCEAN Score Summary
      {
        type: 'log',
        title: 'OCEAN Score Distribution',
        width: 12,
        height: 6,
        properties: {
          query: `fields @timestamp, oceanScores
            | filter @message like /OCEAN_CALCULATED/
            | stats avg(oceanScores.O) as Openness,
                    avg(oceanScores.C) as Conscientiousness,
                    avg(oceanScores.E) as Extraversion,
                    avg(oceanScores.A) as Agreeableness,
                    avg(oceanScores.N) as Neuroticism
                    by bin(1d)`,
          region: 'us-east-1'
        }
      }
    ]
  },
  
  // Dashboard 2: System Health (Free Tier)
  systemHealth: {
    name: 'IOC-System-Health',
    widgets: [
      // Error Rate
      {
        type: 'metric',
        title: 'Error Rate',
        width: 8,
        height: 6,
        properties: {
          metrics: [
            ['IOC/System', 'ErrorRate', { stat: 'Average' }],
            ['IOC/System', 'LambdaErrors', { stat: 'Sum' }]
          ],
          period: 300,
          stat: 'Average',
          region: 'us-east-1',
          title: 'System Errors',
          yAxis: {
            left: { min: 0, max: 100 }
          }
        }
      },
      // API Performance
      {
        type: 'metric',
        title: 'API Performance',
        width: 8,
        height: 6,
        properties: {
          metrics: [
            ['IOC/System', 'APILatency', { stat: 'Average' }],
            ['...', { stat: 'p99' }]
          ],
          period: 300,
          stat: 'Average',
          region: 'us-east-1',
          title: 'API Latency (ms)'
        }
      },
      // Lambda Performance
      {
        type: 'metric',
        title: 'Lambda Functions',
        width: 8,
        height: 6,
        properties: {
          metrics: [
            ['AWS/Lambda', 'Duration', { stat: 'Average' }],
            ['.', 'Errors', { stat: 'Sum' }],
            ['.', 'Throttles', { stat: 'Sum' }]
          ],
          period: 300,
          stat: 'Average',
          region: 'us-east-1',
          title: 'Lambda Performance'
        }
      }
    ]
  },
  
  // Dashboard 3: Cost Tracking (Free Tier)
  costTracking: {
    name: 'IOC-Cost-Monitor',
    widgets: [
      // Cost per Assessment
      {
        type: 'metric',
        title: 'Cost Efficiency',
        width: 12,
        height: 6,
        properties: {
          metrics: [
            ['IOC/System', 'CostPerAssessment', { stat: 'Average' }]
          ],
          period: 86400,
          stat: 'Average',
          region: 'us-east-1',
          title: 'Cost per Assessment ($)'
        }
      },
      // Service Breakdown
      {
        type: 'text',
        title: 'Cost Breakdown',
        width: 12,
        height: 6,
        properties: {
          markdown: `## Daily Cost Targets
          
          | Service | Free Tier | Current | Target |
          |---------|-----------|---------|--------|
          | Lambda | 1M req/mo | Track | < $0.10/day |
          | S3 | 5GB | Track | < $0.05/day |
          | CloudWatch | 10 metrics | Track | $0/day |
          | Total | - | Track | < $0.50/day |
          
          **Next Review**: When MRR > $500`
        }
      }
    ]
  }
};

// Alarm configurations (critical only)
export const ALARM_CONFIGS = [
  {
    name: 'HighErrorRate',
    metric: 'ErrorRate',
    threshold: 5, // 5% error rate
    evaluationPeriods: 2,
    description: 'Error rate exceeds 5% for 10 minutes'
  },
  {
    name: 'HighCostPerAssessment',
    metric: 'CostPerAssessment',
    threshold: 0.10, // $0.10 per assessment
    evaluationPeriods: 3,
    description: 'Cost per assessment exceeds $0.10'
  },
  {
    name: 'LowDualAISuccess',
    metric: 'DualAIValidationSuccess',
    threshold: 80, // 80% success rate
    comparisonOperator: 'LessThanThreshold',
    evaluationPeriods: 2,
    description: 'Dual AI validation below 80% success'
  },
  {
    name: 'HighAPILatency',
    metric: 'APILatency',
    threshold: 1000, // 1 second
    evaluationPeriods: 3,
    description: 'API latency exceeds 1 second'
  }
];

// Log insights queries for scheduled reports
export const LOG_INSIGHTS_QUERIES = {
  // Weekly business report
  weeklyBusinessReport: `
    fields @timestamp, @message
    | filter @message like /ASSESSMENT_COMPLETED|REVENUE_TRACKED|USER_ACTIVE/
    | stats count() by event_type
    | sort count desc
  `,
  
  // Daily error summary
  dailyErrorSummary: `
    fields @timestamp, error_type, error_message
    | filter @message like /ERROR/
    | stats count() by error_type
    | sort count desc
    | limit 10
  `,
  
  // OCEAN score trends
  oceanScoreTrends: `
    fields @timestamp, userId, oceanScores
    | filter @message like /OCEAN_CALCULATED/
    | stats avg(oceanScores.O) as avg_O,
            avg(oceanScores.C) as avg_C,
            avg(oceanScores.E) as avg_E,
            avg(oceanScores.A) as avg_A,
            avg(oceanScores.N) as avg_N
            by datefloor(@timestamp, 1d)
  `,
  
  // Cost analysis
  costAnalysis: `
    fields @timestamp, service, cost
    | filter @message like /COST_TRACKED/
    | stats sum(cost) by service
    | sort sum desc
  `
};

// Metric publication helper
export class MetricPublisher {
  private namespace: string;
  
  constructor(namespace: string = 'IOC/Business') {
    this.namespace = namespace;
  }
  
  async publishMetric(
    metricName: string,
    value: number,
    unit: string = 'None',
    dimensions?: Record<string, string>
  ): Promise<void> {
    // Implementation would use AWS SDK
    // This is a placeholder for the actual metric publication
    console.log(`Publishing metric: ${metricName} = ${value} ${unit}`);
  }
  
  async publishBusinessMetrics(data: {
    assessmentsCompleted: number;
    dailyActiveUsers: number;
    revenue: number;
    conversionRate: number;
    dualAISuccessRate: number;
  }): Promise<void> {
    await Promise.all([
      this.publishMetric('AssessmentCompleted', data.assessmentsCompleted, 'Count'),
      this.publishMetric('DailyActiveUsers', data.dailyActiveUsers, 'Count'),
      this.publishMetric('RevenueTracked', data.revenue, 'None'),
      this.publishMetric('TrialConversion', data.conversionRate, 'Percent'),
      this.publishMetric('DualAIValidationSuccess', data.dualAISuccessRate, 'Percent')
    ]);
  }
  
  async publishSystemMetrics(data: {
    errorCount: number;
    totalRequests: number;
    avgLatency: number;
    s3ProcessingTime: number;
    costPerAssessment: number;
  }): Promise<void> {
    const errorRate = (data.errorCount / data.totalRequests) * 100;
    
    await Promise.all([
      this.publishMetric('LambdaErrors', data.errorCount, 'Count'),
      this.publishMetric('ErrorRate', errorRate, 'Percent'),
      this.publishMetric('APILatency', data.avgLatency, 'Milliseconds'),
      this.publishMetric('S3ProcessingTime', data.s3ProcessingTime, 'Milliseconds'),
      this.publishMetric('CostPerAssessment', data.costPerAssessment, 'None')
    ]);
  }
}

// Log filtering for cost reduction
export const LOG_FILTER_PATTERNS = {
  // Only log important events
  essential: [
    'ASSESSMENT_COMPLETED',
    'ERROR',
    'REVENUE_TRACKED',
    'USER_REGISTERED',
    'TRIAL_STARTED',
    'TRIAL_CONVERTED',
    'DUAL_AI_VALIDATION',
    'OCEAN_CALCULATED'
  ],
  
  // Exclude verbose logs
  exclude: [
    'DEBUG',
    'TRACE',
    'INFO:Request',
    'INFO:Response',
    'HealthCheck'
  ]
};

// Growth scaling configuration
export const MONITORING_GROWTH_PLAN = {
  // Current: Free Tier
  current: {
    customMetrics: 10,
    dashboards: 3,
    detailedMonitoring: false,
    logRetentionDays: 7,
    alarms: 4
  },
  
  // $500 MRR
  tier1: {
    customMetrics: 15,
    dashboards: 5,
    detailedMonitoring: false,
    logRetentionDays: 14,
    alarms: 8,
    additions: ['User retention metrics', 'Industry analytics']
  },
  
  // $2K MRR
  tier2: {
    customMetrics: 25,
    dashboards: 8,
    detailedMonitoring: true,
    logRetentionDays: 30,
    alarms: 15,
    additions: ['Performance dashboard', 'Cache metrics', 'Queue monitoring']
  },
  
  // $5K MRR
  tier3: {
    customMetrics: 50,
    dashboards: 15,
    detailedMonitoring: true,
    logRetentionDays: 60,
    alarms: 25,
    additions: ['Anomaly detection', 'Predictive analytics', 'Custom metrics']
  },
  
  // $10K MRR
  tier4: {
    customMetrics: 'unlimited',
    dashboards: 'unlimited',
    detailedMonitoring: true,
    logRetentionDays: 90,
    alarms: 'unlimited',
    additions: ['Full APM', 'Distributed tracing', 'Real-time analytics']
  }
};