// Meta BI System Types
// Comprehensive type definitions for the Meta BI system

export interface MetaBIConfig {
  // Database configuration
  analyticsDatabase: {
    host: string;
    port: number;
    database: string;
    username: string;
    password: string;
    ssl: boolean;
    pool: {
      min: number;
      max: number;
      idleTimeoutMillis: number;
    };
  };
  
  // Stream processing configuration
  streamProcessing: {
    provider: 'kafka' | 'pulsar' | 'redis-streams';
    brokers: string[];
    topics: {
      rawData: string;
      anonymizedData: string;
      processedData: string;
      alerts: string;
    };
    batchSize: number;
    maxWaitTimeMs: number;
  };
  
  // Anonymization configuration
  anonymization: {
    hashSalt: string;
    preserveRelationships: boolean;
    retentionDays: number;
    piiFields: string[];
    sensitiveFields: string[];
  };
  
  // Security configuration
  security: {
    encryption: {
      algorithm: string;
      keyRotationDays: number;
    };
    access: {
      rbac: boolean;
      auditAll: boolean;
      sessionTimeout: number;
    };
  };
  
  // Performance configuration
  performance: {
    cacheSize: number;
    cacheTtlSeconds: number;
    batchProcessingSize: number;
    maxConcurrentQueries: number;
  };
}

// Anonymized data types
export interface AnonymizedAssessment {
  id: string; // Anonymized hash
  org_hash: string; // Organization hash
  type: string;
  status: string;
  created_at: string;
  updated_at: string;
  question_count: number;
  time_limit_minutes?: number;
  settings_hash: string;
  industry_category?: string;
  org_size_category?: string;
}

export interface AnonymizedAssessmentResponse {
  id: string; // Anonymized hash
  assessment_hash: string;
  respondent_hash: string;
  subject_hash?: string;
  status: string;
  submitted_at?: string;
  time_spent_seconds: number;
  created_at: string;
  completion_percentage: number;
  device_type: string;
  browser_family: string;
  geographic_region: string;
  timezone: string;
}

export interface AnonymizedQuestionResponse {
  id: string; // Anonymized hash
  response_hash: string;
  question_hash: string;
  question_type: string;
  question_order: number;
  answer_value_hash: string;
  answer_category: string;
  confidence_score?: number;
  time_spent_seconds: number;
  created_at: string;
  answer_length?: number;
  answer_complexity_score?: number;
}

export interface AnonymizedAssessmentScore {
  id: string; // Anonymized hash
  assessment_hash: string;
  response_hash: string;
  dimension: string;
  score: number;
  percentile?: number;
  raw_score?: number;
  scoring_method: string;
  created_at: string;
  updated_at: string;
}

// Analytics aggregation types
export interface AssessmentPatternAnalytics {
  period: string;
  total_assessments: number;
  completion_rate: number;
  average_time_spent: number;
  popular_assessment_types: Array<{
    type: string;
    count: number;
    percentage: number;
  }>;
  industry_distribution: Array<{
    industry: string;
    count: number;
    completion_rate: number;
  }>;
  geographic_distribution: Array<{
    region: string;
    count: number;
    avg_score: number;
  }>;
}

export interface OCEANTraitAnalytics {
  period: string;
  trait_distributions: {
    openness: TraitDistribution;
    conscientiousness: TraitDistribution;
    extraversion: TraitDistribution;
    agreeableness: TraitDistribution;
    neuroticism: TraitDistribution;
  };
  cross_trait_correlations: Array<{
    trait1: string;
    trait2: string;
    correlation: number;
    significance: number;
  }>;
  industry_trait_profiles: Array<{
    industry: string;
    trait_averages: Record<string, number>;
    sample_size: number;
  }>;
}

export interface TraitDistribution {
  mean: number;
  median: number;
  std_dev: number;
  percentiles: Record<string, number>;
  sample_size: number;
}

export interface BenchmarkingData {
  category: string;
  subcategory?: string;
  metric_name: string;
  metric_value: number;
  percentile_rank: number;
  sample_size: number;
  confidence_interval: {
    lower: number;
    upper: number;
  };
  updated_at: string;
}

export interface DualAIValidationMetrics {
  period: string;
  total_validations: number;
  agreement_rate: number;
  disagreement_patterns: Array<{
    question_type: string;
    disagreement_rate: number;
    common_reasons: string[];
  }>;
  validation_accuracy: number;
  false_positive_rate: number;
  false_negative_rate: number;
  processing_time_stats: {
    mean: number;
    median: number;
    p95: number;
    p99: number;
  };
}

export interface PredictiveAnalytics {
  model_type: string;
  prediction_target: string;
  accuracy_metrics: {
    precision: number;
    recall: number;
    f1_score: number;
    auc_roc: number;
  };
  feature_importance: Array<{
    feature: string;
    importance: number;
  }>;
  prediction_confidence: number;
  model_version: string;
  last_trained: string;
}

// Data processing types
export interface ProcessingJob {
  id: string;
  type: 'anonymization' | 'aggregation' | 'ml_training' | 'export';
  status: 'pending' | 'running' | 'completed' | 'failed' | 'cancelled';
  created_at: string;
  started_at?: string;
  completed_at?: string;
  error_message?: string;
  records_processed: number;
  records_total: number;
  progress_percentage: number;
  metadata: Record<string, any>;
}

export interface DataQualityMetrics {
  timestamp: string;
  dataset: string;
  completeness: number;
  accuracy: number;
  consistency: number;
  validity: number;
  timeliness: number;
  anomaly_count: number;
  data_freshness_hours: number;
  schema_compliance: number;
}

export interface SystemHealthMetrics {
  timestamp: string;
  cpu_usage: number;
  memory_usage: number;
  disk_usage: number;
  network_io: number;
  active_connections: number;
  query_performance: {
    avg_response_time: number;
    slow_queries: number;
    failed_queries: number;
  };
  cache_hit_rate: number;
  error_rate: number;
}

// API types
export interface MetaBIQuery {
  type: 'assessment_patterns' | 'ocean_traits' | 'benchmarking' | 'predictive' | 'dual_ai';
  filters: {
    date_range: {
      start: string;
      end: string;
    };
    industry?: string[];
    organization_size?: string[];
    assessment_type?: string[];
    geographic_region?: string[];
    custom_filters?: Record<string, any>;
  };
  aggregation: {
    granularity: 'day' | 'week' | 'month' | 'quarter' | 'year';
    group_by?: string[];
    metrics?: string[];
  };
  options: {
    include_confidence: boolean;
    include_metadata: boolean;
    max_results?: number;
    format?: 'json' | 'csv' | 'parquet';
  };
}

export interface MetaBIResponse<T = any> {
  success: boolean;
  data: T;
  metadata: {
    query_id: string;
    execution_time_ms: number;
    records_returned: number;
    cache_hit: boolean;
    data_freshness: string;
    confidence_score?: number;
  };
  pagination?: {
    page: number;
    limit: number;
    total: number;
    has_next: boolean;
  };
  errors?: Array<{
    code: string;
    message: string;
    field?: string;
  }>;
}

// Export types
export interface ExportRequest {
  format: 'json' | 'csv' | 'parquet' | 'xlsx';
  query: MetaBIQuery;
  destination: {
    type: 's3' | 'gcs' | 'azure' | 'local';
    path: string;
    credentials?: Record<string, string>;
  };
  options: {
    compress: boolean;
    encryption: boolean;
    split_files: boolean;
    max_file_size_mb?: number;
  };
}

export interface ExportJob {
  id: string;
  request: ExportRequest;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  created_at: string;
  started_at?: string;
  completed_at?: string;
  error_message?: string;
  file_urls?: string[];
  file_sizes?: number[];
  records_exported: number;
  progress_percentage: number;
}