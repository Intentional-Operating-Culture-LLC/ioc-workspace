// Analytics Database Schema and Operations
// Independent database design for anonymized assessment analytics

import { Pool, PoolClient } from 'pg';
import { 
  AnonymizedAssessment, 
  AnonymizedAssessmentResponse, 
  AnonymizedQuestionResponse, 
  AnonymizedAssessmentScore,
  ProcessingJob,
  DataQualityMetrics,
  SystemHealthMetrics
} from './types';

export interface AnalyticsDBConfig {
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
    connectionTimeoutMillis: number;
  };
  partitioning: {
    enabled: boolean;
    strategy: 'time' | 'hash';
    interval: 'daily' | 'weekly' | 'monthly';
  };
  compression: {
    enabled: boolean;
    algorithm: 'lz4' | 'zstd' | 'gzip';
  };
  indexing: {
    autoOptimize: boolean;
    analysisInterval: number;
  };
}

export class AnalyticsDatabase {
  private pool: Pool;
  private config: AnalyticsDBConfig;
  
  constructor(config: AnalyticsDBConfig) {
    this.config = config;
    this.pool = new Pool({
      host: config.host,
      port: config.port,
      database: config.database,
      user: config.username,
      password: config.password,
      ssl: config.ssl,
      min: config.pool.min,
      max: config.pool.max,
      idleTimeoutMillis: config.pool.idleTimeoutMillis,
      connectionTimeoutMillis: config.pool.connectionTimeoutMillis,
    });
  }
  
  /**
   * Initialize database schema
   */
  public async initializeSchema(): Promise<void> {
    const client = await this.pool.connect();
    
    try {
      await client.query('BEGIN');
      
      // Create extensions
      await client.query(`
        CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
        CREATE EXTENSION IF NOT EXISTS "pg_stat_statements";
        CREATE EXTENSION IF NOT EXISTS "pg_trgm";
        CREATE EXTENSION IF NOT EXISTS "btree_gin";
      `);
      
      // Core anonymized data tables
      await this.createCoreDataTables(client);
      
      // Aggregated analytics tables
      await this.createAnalyticsTables(client);
      
      // System monitoring tables
      await this.createMonitoringTables(client);
      
      // Create indexes
      await this.createIndexes(client);
      
      // Create partitions if enabled
      if (this.config.partitioning.enabled) {
        await this.createPartitions(client);
      }
      
      // Create functions and triggers
      await this.createFunctionsAndTriggers(client);
      
      await client.query('COMMIT');
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }
  
  /**
   * Create core anonymized data tables
   */
  private async createCoreDataTables(client: PoolClient): Promise<void> {
    // Anonymized assessments table
    await client.query(`
      CREATE TABLE IF NOT EXISTS anonymized_assessments (
        id VARCHAR(64) PRIMARY KEY,
        org_hash VARCHAR(64) NOT NULL,
        type VARCHAR(50) NOT NULL,
        status VARCHAR(20) NOT NULL,
        created_at TIMESTAMP WITH TIME ZONE NOT NULL,
        updated_at TIMESTAMP WITH TIME ZONE NOT NULL,
        question_count INTEGER DEFAULT 0,
        time_limit_minutes INTEGER,
        settings_hash VARCHAR(64),
        industry_category VARCHAR(100),
        org_size_category VARCHAR(50),
        
        -- Metadata
        ingested_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        data_version INTEGER DEFAULT 1,
        data_quality_score DECIMAL(5,2),
        
        -- Indexes
        CONSTRAINT chk_status CHECK (status IN ('draft', 'published', 'archived')),
        CONSTRAINT chk_type CHECK (type IN ('self', 'peer', 'manager', '360', 'custom')),
        CONSTRAINT chk_question_count CHECK (question_count >= 0),
        CONSTRAINT chk_time_limit CHECK (time_limit_minutes > 0 OR time_limit_minutes IS NULL)
      );
    `);
    
    // Anonymized assessment responses table
    await client.query(`
      CREATE TABLE IF NOT EXISTS anonymized_assessment_responses (
        id VARCHAR(64) PRIMARY KEY,
        assessment_hash VARCHAR(64) NOT NULL,
        respondent_hash VARCHAR(64) NOT NULL,
        subject_hash VARCHAR(64),
        status VARCHAR(20) NOT NULL,
        submitted_at TIMESTAMP WITH TIME ZONE,
        time_spent_seconds INTEGER DEFAULT 0,
        created_at TIMESTAMP WITH TIME ZONE NOT NULL,
        completion_percentage INTEGER DEFAULT 0,
        device_type VARCHAR(20),
        browser_family VARCHAR(50),
        geographic_region VARCHAR(100),
        timezone VARCHAR(50),
        
        -- Metadata
        ingested_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        data_version INTEGER DEFAULT 1,
        data_quality_score DECIMAL(5,2),
        
        -- Constraints
        CONSTRAINT chk_response_status CHECK (status IN ('in_progress', 'submitted', 'expired')),
        CONSTRAINT chk_completion_percentage CHECK (completion_percentage >= 0 AND completion_percentage <= 100),
        CONSTRAINT chk_time_spent CHECK (time_spent_seconds >= 0),
        CONSTRAINT chk_device_type CHECK (device_type IN ('Desktop', 'Mobile', 'Tablet', 'Unknown'))
      );
    `);
    
    // Anonymized question responses table
    await client.query(`
      CREATE TABLE IF NOT EXISTS anonymized_question_responses (
        id VARCHAR(64) PRIMARY KEY,
        response_hash VARCHAR(64) NOT NULL,
        question_hash VARCHAR(64) NOT NULL,
        question_type VARCHAR(20) NOT NULL,
        question_order INTEGER NOT NULL,
        answer_value_hash VARCHAR(64),
        answer_category VARCHAR(50),
        confidence_score DECIMAL(5,2),
        time_spent_seconds INTEGER DEFAULT 0,
        created_at TIMESTAMP WITH TIME ZONE NOT NULL,
        answer_length INTEGER,
        answer_complexity_score INTEGER,
        
        -- Metadata
        ingested_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        data_version INTEGER DEFAULT 1,
        data_quality_score DECIMAL(5,2),
        
        -- Constraints
        CONSTRAINT chk_question_type CHECK (question_type IN ('text', 'textarea', 'select', 'multiselect', 'scale', 'boolean', 'likert')),
        CONSTRAINT chk_question_order CHECK (question_order > 0),
        CONSTRAINT chk_confidence_score CHECK (confidence_score >= 0 AND confidence_score <= 1),
        CONSTRAINT chk_time_spent_q CHECK (time_spent_seconds >= 0),
        CONSTRAINT chk_answer_length CHECK (answer_length >= 0 OR answer_length IS NULL),
        CONSTRAINT chk_complexity_score CHECK (answer_complexity_score >= 0 AND answer_complexity_score <= 100 OR answer_complexity_score IS NULL)
      );
    `);
    
    // Anonymized assessment scores table
    await client.query(`
      CREATE TABLE IF NOT EXISTS anonymized_assessment_scores (
        id VARCHAR(64) PRIMARY KEY,
        assessment_hash VARCHAR(64) NOT NULL,
        response_hash VARCHAR(64) NOT NULL,
        dimension VARCHAR(50) NOT NULL,
        score DECIMAL(8,4) NOT NULL,
        percentile DECIMAL(5,2),
        raw_score DECIMAL(8,4),
        scoring_method VARCHAR(50),
        created_at TIMESTAMP WITH TIME ZONE NOT NULL,
        updated_at TIMESTAMP WITH TIME ZONE NOT NULL,
        
        -- Metadata
        ingested_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        data_version INTEGER DEFAULT 1,
        data_quality_score DECIMAL(5,2),
        
        -- Constraints
        CONSTRAINT chk_score_range CHECK (score >= 0 AND score <= 100),
        CONSTRAINT chk_percentile_range CHECK (percentile >= 0 AND percentile <= 100 OR percentile IS NULL),
        CONSTRAINT chk_dimension CHECK (dimension IN ('openness', 'conscientiousness', 'extraversion', 'agreeableness', 'neuroticism', 'overall', 'custom'))
      );
    `);
  }
  
  /**
   * Create aggregated analytics tables
   */
  private async createAnalyticsTables(client: PoolClient): Promise<void> {
    // Daily assessment metrics
    await client.query(`
      CREATE TABLE IF NOT EXISTS daily_assessment_metrics (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        date DATE NOT NULL,
        total_assessments INTEGER DEFAULT 0,
        total_responses INTEGER DEFAULT 0,
        completion_rate DECIMAL(5,2) DEFAULT 0,
        avg_time_spent_seconds INTEGER DEFAULT 0,
        unique_organizations INTEGER DEFAULT 0,
        unique_respondents INTEGER DEFAULT 0,
        device_breakdown JSONB,
        browser_breakdown JSONB,
        geographic_breakdown JSONB,
        industry_breakdown JSONB,
        
        -- Metadata
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        
        -- Constraints
        CONSTRAINT unique_daily_metrics UNIQUE (date),
        CONSTRAINT chk_completion_rate CHECK (completion_rate >= 0 AND completion_rate <= 100)
      );
    `);
    
    // OCEAN trait distributions
    await client.query(`
      CREATE TABLE IF NOT EXISTS ocean_trait_distributions (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        period_start DATE NOT NULL,
        period_end DATE NOT NULL,
        trait_name VARCHAR(20) NOT NULL,
        industry_category VARCHAR(100),
        org_size_category VARCHAR(50),
        sample_size INTEGER NOT NULL,
        mean_score DECIMAL(8,4),
        median_score DECIMAL(8,4),
        std_dev DECIMAL(8,4),
        percentile_25 DECIMAL(8,4),
        percentile_75 DECIMAL(8,4),
        percentile_90 DECIMAL(8,4),
        percentile_95 DECIMAL(8,4),
        percentile_99 DECIMAL(8,4),
        
        -- Metadata
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        
        -- Constraints
        CONSTRAINT chk_trait_name CHECK (trait_name IN ('openness', 'conscientiousness', 'extraversion', 'agreeableness', 'neuroticism')),
        CONSTRAINT chk_sample_size CHECK (sample_size > 0),
        CONSTRAINT chk_period_order CHECK (period_start <= period_end)
      );
    `);
    
    // Benchmarking data
    await client.query(`
      CREATE TABLE IF NOT EXISTS benchmarking_data (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        category VARCHAR(100) NOT NULL,
        subcategory VARCHAR(100),
        metric_name VARCHAR(100) NOT NULL,
        metric_value DECIMAL(12,4) NOT NULL,
        percentile_rank DECIMAL(5,2),
        sample_size INTEGER NOT NULL,
        confidence_interval_lower DECIMAL(12,4),
        confidence_interval_upper DECIMAL(12,4),
        period_start DATE NOT NULL,
        period_end DATE NOT NULL,
        
        -- Metadata
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        
        -- Constraints
        CONSTRAINT chk_benchmark_sample_size CHECK (sample_size > 0),
        CONSTRAINT chk_percentile_rank CHECK (percentile_rank >= 0 AND percentile_rank <= 100 OR percentile_rank IS NULL)
      );
    `);
    
    // Dual AI validation metrics
    await client.query(`
      CREATE TABLE IF NOT EXISTS dual_ai_validation_metrics (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        period_start DATE NOT NULL,
        period_end DATE NOT NULL,
        total_validations INTEGER DEFAULT 0,
        agreement_rate DECIMAL(5,2) DEFAULT 0,
        disagreement_patterns JSONB,
        validation_accuracy DECIMAL(5,2) DEFAULT 0,
        false_positive_rate DECIMAL(5,2) DEFAULT 0,
        false_negative_rate DECIMAL(5,2) DEFAULT 0,
        avg_processing_time_ms INTEGER DEFAULT 0,
        median_processing_time_ms INTEGER DEFAULT 0,
        p95_processing_time_ms INTEGER DEFAULT 0,
        p99_processing_time_ms INTEGER DEFAULT 0,
        
        -- Metadata
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        
        -- Constraints
        CONSTRAINT chk_validation_rates CHECK (
          agreement_rate >= 0 AND agreement_rate <= 100 AND
          validation_accuracy >= 0 AND validation_accuracy <= 100 AND
          false_positive_rate >= 0 AND false_positive_rate <= 100 AND
          false_negative_rate >= 0 AND false_negative_rate <= 100
        )
      );
    `);
    
    // Predictive analytics results
    await client.query(`
      CREATE TABLE IF NOT EXISTS predictive_analytics_results (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        model_name VARCHAR(100) NOT NULL,
        model_version VARCHAR(20) NOT NULL,
        prediction_target VARCHAR(100) NOT NULL,
        accuracy_metrics JSONB,
        feature_importance JSONB,
        prediction_confidence DECIMAL(5,2),
        training_data_size INTEGER,
        validation_data_size INTEGER,
        model_trained_at TIMESTAMP WITH TIME ZONE,
        
        -- Metadata
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        
        -- Constraints
        CONSTRAINT chk_prediction_confidence CHECK (prediction_confidence >= 0 AND prediction_confidence <= 1 OR prediction_confidence IS NULL),
        CONSTRAINT chk_data_sizes CHECK (training_data_size > 0 AND validation_data_size > 0)
      );
    `);
  }
  
  /**
   * Create monitoring tables
   */
  private async createMonitoringTables(client: PoolClient): Promise<void> {
    // Processing jobs
    await client.query(`
      CREATE TABLE IF NOT EXISTS processing_jobs (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        job_type VARCHAR(50) NOT NULL,
        status VARCHAR(20) NOT NULL DEFAULT 'pending',
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        started_at TIMESTAMP WITH TIME ZONE,
        completed_at TIMESTAMP WITH TIME ZONE,
        error_message TEXT,
        records_processed INTEGER DEFAULT 0,
        records_total INTEGER DEFAULT 0,
        progress_percentage DECIMAL(5,2) DEFAULT 0,
        metadata JSONB,
        
        -- Constraints
        CONSTRAINT chk_job_type CHECK (job_type IN ('anonymization', 'aggregation', 'ml_training', 'export', 'cleanup')),
        CONSTRAINT chk_job_status CHECK (status IN ('pending', 'running', 'completed', 'failed', 'cancelled')),
        CONSTRAINT chk_progress CHECK (progress_percentage >= 0 AND progress_percentage <= 100),
        CONSTRAINT chk_records CHECK (records_processed >= 0 AND records_total >= 0)
      );
    `);
    
    // Data quality metrics
    await client.query(`
      CREATE TABLE IF NOT EXISTS data_quality_metrics (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        dataset VARCHAR(100) NOT NULL,
        completeness DECIMAL(5,2) DEFAULT 0,
        accuracy DECIMAL(5,2) DEFAULT 0,
        consistency DECIMAL(5,2) DEFAULT 0,
        validity DECIMAL(5,2) DEFAULT 0,
        timeliness DECIMAL(5,2) DEFAULT 0,
        anomaly_count INTEGER DEFAULT 0,
        data_freshness_hours INTEGER DEFAULT 0,
        schema_compliance DECIMAL(5,2) DEFAULT 0,
        
        -- Constraints
        CONSTRAINT chk_quality_metrics CHECK (
          completeness >= 0 AND completeness <= 100 AND
          accuracy >= 0 AND accuracy <= 100 AND
          consistency >= 0 AND consistency <= 100 AND
          validity >= 0 AND validity <= 100 AND
          timeliness >= 0 AND timeliness <= 100 AND
          schema_compliance >= 0 AND schema_compliance <= 100
        )
      );
    `);
    
    // System health metrics
    await client.query(`
      CREATE TABLE IF NOT EXISTS system_health_metrics (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        cpu_usage DECIMAL(5,2) DEFAULT 0,
        memory_usage DECIMAL(5,2) DEFAULT 0,
        disk_usage DECIMAL(5,2) DEFAULT 0,
        network_io DECIMAL(12,2) DEFAULT 0,
        active_connections INTEGER DEFAULT 0,
        avg_response_time_ms INTEGER DEFAULT 0,
        slow_queries INTEGER DEFAULT 0,
        failed_queries INTEGER DEFAULT 0,
        cache_hit_rate DECIMAL(5,2) DEFAULT 0,
        error_rate DECIMAL(5,2) DEFAULT 0,
        
        -- Constraints
        CONSTRAINT chk_system_metrics CHECK (
          cpu_usage >= 0 AND cpu_usage <= 100 AND
          memory_usage >= 0 AND memory_usage <= 100 AND
          disk_usage >= 0 AND disk_usage <= 100 AND
          cache_hit_rate >= 0 AND cache_hit_rate <= 100 AND
          error_rate >= 0 AND error_rate <= 100
        )
      );
    `);
    
    // Audit log
    await client.query(`
      CREATE TABLE IF NOT EXISTS audit_log (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        event_type VARCHAR(50) NOT NULL,
        user_id VARCHAR(64),
        resource_type VARCHAR(50),
        resource_id VARCHAR(64),
        action VARCHAR(50) NOT NULL,
        details JSONB,
        ip_address INET,
        user_agent TEXT,
        session_id VARCHAR(64),
        
        -- Constraints
        CONSTRAINT chk_event_type CHECK (event_type IN ('query', 'export', 'admin', 'system', 'error')),
        CONSTRAINT chk_action CHECK (action IN ('create', 'read', 'update', 'delete', 'export', 'login', 'logout'))
      );
    `);
  }
  
  /**
   * Create indexes for optimal query performance
   */
  private async createIndexes(client: PoolClient): Promise<void> {
    // Primary data indexes
    await client.query(`
      -- Anonymized assessments indexes
      CREATE INDEX IF NOT EXISTS idx_assessments_org_hash ON anonymized_assessments(org_hash);
      CREATE INDEX IF NOT EXISTS idx_assessments_type ON anonymized_assessments(type);
      CREATE INDEX IF NOT EXISTS idx_assessments_status ON anonymized_assessments(status);
      CREATE INDEX IF NOT EXISTS idx_assessments_created_at ON anonymized_assessments(created_at);
      CREATE INDEX IF NOT EXISTS idx_assessments_industry ON anonymized_assessments(industry_category);
      CREATE INDEX IF NOT EXISTS idx_assessments_org_size ON anonymized_assessments(org_size_category);
      CREATE INDEX IF NOT EXISTS idx_assessments_composite ON anonymized_assessments(type, status, created_at);
      
      -- Anonymized responses indexes
      CREATE INDEX IF NOT EXISTS idx_responses_assessment_hash ON anonymized_assessment_responses(assessment_hash);
      CREATE INDEX IF NOT EXISTS idx_responses_respondent_hash ON anonymized_assessment_responses(respondent_hash);
      CREATE INDEX IF NOT EXISTS idx_responses_status ON anonymized_assessment_responses(status);
      CREATE INDEX IF NOT EXISTS idx_responses_created_at ON anonymized_assessment_responses(created_at);
      CREATE INDEX IF NOT EXISTS idx_responses_submitted_at ON anonymized_assessment_responses(submitted_at);
      CREATE INDEX IF NOT EXISTS idx_responses_device ON anonymized_assessment_responses(device_type);
      CREATE INDEX IF NOT EXISTS idx_responses_browser ON anonymized_assessment_responses(browser_family);
      CREATE INDEX IF NOT EXISTS idx_responses_region ON anonymized_assessment_responses(geographic_region);
      CREATE INDEX IF NOT EXISTS idx_responses_composite ON anonymized_assessment_responses(assessment_hash, status, submitted_at);
      
      -- Question responses indexes
      CREATE INDEX IF NOT EXISTS idx_question_responses_response_hash ON anonymized_question_responses(response_hash);
      CREATE INDEX IF NOT EXISTS idx_question_responses_question_hash ON anonymized_question_responses(question_hash);
      CREATE INDEX IF NOT EXISTS idx_question_responses_type ON anonymized_question_responses(question_type);
      CREATE INDEX IF NOT EXISTS idx_question_responses_created_at ON anonymized_question_responses(created_at);
      CREATE INDEX IF NOT EXISTS idx_question_responses_composite ON anonymized_question_responses(response_hash, question_order);
      
      -- Assessment scores indexes
      CREATE INDEX IF NOT EXISTS idx_scores_assessment_hash ON anonymized_assessment_scores(assessment_hash);
      CREATE INDEX IF NOT EXISTS idx_scores_response_hash ON anonymized_assessment_scores(response_hash);
      CREATE INDEX IF NOT EXISTS idx_scores_dimension ON anonymized_assessment_scores(dimension);
      CREATE INDEX IF NOT EXISTS idx_scores_score ON anonymized_assessment_scores(score);
      CREATE INDEX IF NOT EXISTS idx_scores_created_at ON anonymized_assessment_scores(created_at);
      CREATE INDEX IF NOT EXISTS idx_scores_composite ON anonymized_assessment_scores(dimension, score, created_at);
    `);
    
    // Analytics indexes
    await client.query(`
      -- Daily metrics indexes
      CREATE INDEX IF NOT EXISTS idx_daily_metrics_date ON daily_assessment_metrics(date);
      CREATE INDEX IF NOT EXISTS idx_daily_metrics_completion_rate ON daily_assessment_metrics(completion_rate);
      
      -- OCEAN trait distributions indexes
      CREATE INDEX IF NOT EXISTS idx_ocean_distributions_period ON ocean_trait_distributions(period_start, period_end);
      CREATE INDEX IF NOT EXISTS idx_ocean_distributions_trait ON ocean_trait_distributions(trait_name);
      CREATE INDEX IF NOT EXISTS idx_ocean_distributions_industry ON ocean_trait_distributions(industry_category);
      CREATE INDEX IF NOT EXISTS idx_ocean_distributions_org_size ON ocean_trait_distributions(org_size_category);
      CREATE INDEX IF NOT EXISTS idx_ocean_distributions_composite ON ocean_trait_distributions(trait_name, industry_category, period_start);
      
      -- Benchmarking data indexes
      CREATE INDEX IF NOT EXISTS idx_benchmarking_category ON benchmarking_data(category);
      CREATE INDEX IF NOT EXISTS idx_benchmarking_subcategory ON benchmarking_data(subcategory);
      CREATE INDEX IF NOT EXISTS idx_benchmarking_metric ON benchmarking_data(metric_name);
      CREATE INDEX IF NOT EXISTS idx_benchmarking_period ON benchmarking_data(period_start, period_end);
      CREATE INDEX IF NOT EXISTS idx_benchmarking_composite ON benchmarking_data(category, metric_name, period_start);
      
      -- Dual AI validation metrics indexes
      CREATE INDEX IF NOT EXISTS idx_dual_ai_period ON dual_ai_validation_metrics(period_start, period_end);
      CREATE INDEX IF NOT EXISTS idx_dual_ai_agreement_rate ON dual_ai_validation_metrics(agreement_rate);
      
      -- Predictive analytics indexes
      CREATE INDEX IF NOT EXISTS idx_predictive_model_name ON predictive_analytics_results(model_name);
      CREATE INDEX IF NOT EXISTS idx_predictive_model_version ON predictive_analytics_results(model_version);
      CREATE INDEX IF NOT EXISTS idx_predictive_target ON predictive_analytics_results(prediction_target);
      CREATE INDEX IF NOT EXISTS idx_predictive_trained_at ON predictive_analytics_results(model_trained_at);
    `);
    
    // Monitoring indexes
    await client.query(`
      -- Processing jobs indexes
      CREATE INDEX IF NOT EXISTS idx_processing_jobs_type ON processing_jobs(job_type);
      CREATE INDEX IF NOT EXISTS idx_processing_jobs_status ON processing_jobs(status);
      CREATE INDEX IF NOT EXISTS idx_processing_jobs_created_at ON processing_jobs(created_at);
      CREATE INDEX IF NOT EXISTS idx_processing_jobs_composite ON processing_jobs(job_type, status, created_at);
      
      -- Data quality metrics indexes
      CREATE INDEX IF NOT EXISTS idx_data_quality_timestamp ON data_quality_metrics(timestamp);
      CREATE INDEX IF NOT EXISTS idx_data_quality_dataset ON data_quality_metrics(dataset);
      CREATE INDEX IF NOT EXISTS idx_data_quality_completeness ON data_quality_metrics(completeness);
      CREATE INDEX IF NOT EXISTS idx_data_quality_accuracy ON data_quality_metrics(accuracy);
      
      -- System health metrics indexes
      CREATE INDEX IF NOT EXISTS idx_system_health_timestamp ON system_health_metrics(timestamp);
      CREATE INDEX IF NOT EXISTS idx_system_health_cpu ON system_health_metrics(cpu_usage);
      CREATE INDEX IF NOT EXISTS idx_system_health_memory ON system_health_metrics(memory_usage);
      CREATE INDEX IF NOT EXISTS idx_system_health_error_rate ON system_health_metrics(error_rate);
      
      -- Audit log indexes
      CREATE INDEX IF NOT EXISTS idx_audit_log_timestamp ON audit_log(timestamp);
      CREATE INDEX IF NOT EXISTS idx_audit_log_event_type ON audit_log(event_type);
      CREATE INDEX IF NOT EXISTS idx_audit_log_user_id ON audit_log(user_id);
      CREATE INDEX IF NOT EXISTS idx_audit_log_resource_type ON audit_log(resource_type);
      CREATE INDEX IF NOT EXISTS idx_audit_log_action ON audit_log(action);
      CREATE INDEX IF NOT EXISTS idx_audit_log_composite ON audit_log(event_type, action, timestamp);
    `);
    
    // GIN indexes for JSONB columns
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_daily_metrics_device_breakdown_gin ON daily_assessment_metrics USING gin(device_breakdown);
      CREATE INDEX IF NOT EXISTS idx_daily_metrics_browser_breakdown_gin ON daily_assessment_metrics USING gin(browser_breakdown);
      CREATE INDEX IF NOT EXISTS idx_daily_metrics_geographic_breakdown_gin ON daily_assessment_metrics USING gin(geographic_breakdown);
      CREATE INDEX IF NOT EXISTS idx_daily_metrics_industry_breakdown_gin ON daily_assessment_metrics USING gin(industry_breakdown);
      CREATE INDEX IF NOT EXISTS idx_dual_ai_disagreement_patterns_gin ON dual_ai_validation_metrics USING gin(disagreement_patterns);
      CREATE INDEX IF NOT EXISTS idx_predictive_accuracy_metrics_gin ON predictive_analytics_results USING gin(accuracy_metrics);
      CREATE INDEX IF NOT EXISTS idx_predictive_feature_importance_gin ON predictive_analytics_results USING gin(feature_importance);
      CREATE INDEX IF NOT EXISTS idx_processing_jobs_metadata_gin ON processing_jobs USING gin(metadata);
      CREATE INDEX IF NOT EXISTS idx_audit_log_details_gin ON audit_log USING gin(details);
    `);
  }
  
  /**
   * Create partitions for time-based data
   */
  private async createPartitions(client: PoolClient): Promise<void> {
    if (this.config.partitioning.strategy === 'time') {
      // Create partitions for the next 12 months
      const currentDate = new Date();
      for (let i = 0; i < 12; i++) {
        const partitionDate = new Date(currentDate.getFullYear(), currentDate.getMonth() + i, 1);
        const nextPartitionDate = new Date(currentDate.getFullYear(), currentDate.getMonth() + i + 1, 1);
        
        const partitionName = `${partitionDate.getFullYear()}_${String(partitionDate.getMonth() + 1).padStart(2, '0')}`;
        
        // Create partitions for time-based tables
        await client.query(`
          CREATE TABLE IF NOT EXISTS anonymized_assessment_responses_${partitionName} 
          PARTITION OF anonymized_assessment_responses
          FOR VALUES FROM ('${partitionDate.toISOString().split('T')[0]}') TO ('${nextPartitionDate.toISOString().split('T')[0]}');
        `);
        
        await client.query(`
          CREATE TABLE IF NOT EXISTS anonymized_question_responses_${partitionName}
          PARTITION OF anonymized_question_responses
          FOR VALUES FROM ('${partitionDate.toISOString().split('T')[0]}') TO ('${nextPartitionDate.toISOString().split('T')[0]}');
        `);
        
        await client.query(`
          CREATE TABLE IF NOT EXISTS anonymized_assessment_scores_${partitionName}
          PARTITION OF anonymized_assessment_scores
          FOR VALUES FROM ('${partitionDate.toISOString().split('T')[0]}') TO ('${nextPartitionDate.toISOString().split('T')[0]}');
        `);
      }
    }
  }
  
  /**
   * Create functions and triggers
   */
  private async createFunctionsAndTriggers(client: PoolClient): Promise<void> {
    // Function to update timestamps
    await client.query(`
      CREATE OR REPLACE FUNCTION update_updated_at_column()
      RETURNS TRIGGER AS $$
      BEGIN
        NEW.updated_at = NOW();
        RETURN NEW;
      END;
      $$ language 'plpgsql';
    `);
    
    // Triggers for updated_at columns
    const tablesWithUpdatedAt = [
      'daily_assessment_metrics',
      'ocean_trait_distributions',
      'benchmarking_data',
      'dual_ai_validation_metrics',
      'predictive_analytics_results'
    ];
    
    for (const table of tablesWithUpdatedAt) {
      await client.query(`
        CREATE TRIGGER update_${table}_updated_at 
        BEFORE UPDATE ON ${table}
        FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
      `);
    }
    
    // Function to calculate data quality score
    await client.query(`
      CREATE OR REPLACE FUNCTION calculate_data_quality_score(
        completeness DECIMAL,
        accuracy DECIMAL,
        consistency DECIMAL,
        validity DECIMAL,
        timeliness DECIMAL
      )
      RETURNS DECIMAL AS $$
      BEGIN
        RETURN (completeness * 0.3 + accuracy * 0.3 + consistency * 0.2 + validity * 0.1 + timeliness * 0.1);
      END;
      $$ language 'plpgsql';
    `);
    
    // Function to generate system health score
    await client.query(`
      CREATE OR REPLACE FUNCTION calculate_system_health_score(
        cpu_usage DECIMAL,
        memory_usage DECIMAL,
        disk_usage DECIMAL,
        error_rate DECIMAL
      )
      RETURNS DECIMAL AS $$
      BEGIN
        RETURN GREATEST(0, 100 - (cpu_usage * 0.3 + memory_usage * 0.3 + disk_usage * 0.2 + error_rate * 0.2));
      END;
      $$ language 'plpgsql';
    `);
  }
  
  /**
   * Insert anonymized assessment data
   */
  public async insertAnonymizedAssessment(assessment: AnonymizedAssessment): Promise<void> {
    const client = await this.pool.connect();
    
    try {
      await client.query(`
        INSERT INTO anonymized_assessments (
          id, org_hash, type, status, created_at, updated_at, question_count,
          time_limit_minutes, settings_hash, industry_category, org_size_category
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
        ON CONFLICT (id) DO UPDATE SET
          org_hash = EXCLUDED.org_hash,
          type = EXCLUDED.type,
          status = EXCLUDED.status,
          updated_at = EXCLUDED.updated_at,
          question_count = EXCLUDED.question_count,
          time_limit_minutes = EXCLUDED.time_limit_minutes,
          settings_hash = EXCLUDED.settings_hash,
          industry_category = EXCLUDED.industry_category,
          org_size_category = EXCLUDED.org_size_category
      `, [
        assessment.id,
        assessment.org_hash,
        assessment.type,
        assessment.status,
        assessment.created_at,
        assessment.updated_at,
        assessment.question_count,
        assessment.time_limit_minutes,
        assessment.settings_hash,
        assessment.industry_category,
        assessment.org_size_category
      ]);
    } finally {
      client.release();
    }
  }
  
  /**
   * Insert anonymized assessment response data
   */
  public async insertAnonymizedAssessmentResponse(response: AnonymizedAssessmentResponse): Promise<void> {
    const client = await this.pool.connect();
    
    try {
      await client.query(`
        INSERT INTO anonymized_assessment_responses (
          id, assessment_hash, respondent_hash, subject_hash, status, submitted_at,
          time_spent_seconds, created_at, completion_percentage, device_type,
          browser_family, geographic_region, timezone
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
        ON CONFLICT (id) DO UPDATE SET
          assessment_hash = EXCLUDED.assessment_hash,
          respondent_hash = EXCLUDED.respondent_hash,
          subject_hash = EXCLUDED.subject_hash,
          status = EXCLUDED.status,
          submitted_at = EXCLUDED.submitted_at,
          time_spent_seconds = EXCLUDED.time_spent_seconds,
          completion_percentage = EXCLUDED.completion_percentage,
          device_type = EXCLUDED.device_type,
          browser_family = EXCLUDED.browser_family,
          geographic_region = EXCLUDED.geographic_region,
          timezone = EXCLUDED.timezone
      `, [
        response.id,
        response.assessment_hash,
        response.respondent_hash,
        response.subject_hash,
        response.status,
        response.submitted_at,
        response.time_spent_seconds,
        response.created_at,
        response.completion_percentage,
        response.device_type,
        response.browser_family,
        response.geographic_region,
        response.timezone
      ]);
    } finally {
      client.release();
    }
  }
  
  /**
   * Insert batch of anonymized data
   */
  public async insertBatch(data: {
    assessments?: AnonymizedAssessment[];
    responses?: AnonymizedAssessmentResponse[];
    questionResponses?: AnonymizedQuestionResponse[];
    scores?: AnonymizedAssessmentScore[];
  }): Promise<void> {
    const client = await this.pool.connect();
    
    try {
      await client.query('BEGIN');
      
      // Insert assessments
      if (data.assessments && data.assessments.length > 0) {
        for (const assessment of data.assessments) {
          await this.insertAnonymizedAssessment(assessment);
        }
      }
      
      // Insert responses
      if (data.responses && data.responses.length > 0) {
        for (const response of data.responses) {
          await this.insertAnonymizedAssessmentResponse(response);
        }
      }
      
      // Insert question responses
      if (data.questionResponses && data.questionResponses.length > 0) {
        for (const questionResponse of data.questionResponses) {
          await client.query(`
            INSERT INTO anonymized_question_responses (
              id, response_hash, question_hash, question_type, question_order,
              answer_value_hash, answer_category, confidence_score, time_spent_seconds,
              created_at, answer_length, answer_complexity_score
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
            ON CONFLICT (id) DO NOTHING
          `, [
            questionResponse.id,
            questionResponse.response_hash,
            questionResponse.question_hash,
            questionResponse.question_type,
            questionResponse.question_order,
            questionResponse.answer_value_hash,
            questionResponse.answer_category,
            questionResponse.confidence_score,
            questionResponse.time_spent_seconds,
            questionResponse.created_at,
            questionResponse.answer_length,
            questionResponse.answer_complexity_score
          ]);
        }
      }
      
      // Insert scores
      if (data.scores && data.scores.length > 0) {
        for (const score of data.scores) {
          await client.query(`
            INSERT INTO anonymized_assessment_scores (
              id, assessment_hash, response_hash, dimension, score, percentile,
              raw_score, scoring_method, created_at, updated_at
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
            ON CONFLICT (id) DO UPDATE SET
              score = EXCLUDED.score,
              percentile = EXCLUDED.percentile,
              raw_score = EXCLUDED.raw_score,
              scoring_method = EXCLUDED.scoring_method,
              updated_at = EXCLUDED.updated_at
          `, [
            score.id,
            score.assessment_hash,
            score.response_hash,
            score.dimension,
            score.score,
            score.percentile,
            score.raw_score,
            score.scoring_method,
            score.created_at,
            score.updated_at
          ]);
        }
      }
      
      await client.query('COMMIT');
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }
  
  /**
   * Create processing job
   */
  public async createProcessingJob(job: Omit<ProcessingJob, 'id' | 'created_at'>): Promise<string> {
    const client = await this.pool.connect();
    
    try {
      const result = await client.query(`
        INSERT INTO processing_jobs (
          job_type, status, started_at, completed_at, error_message,
          records_processed, records_total, progress_percentage, metadata
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        RETURNING id
      `, [
        job.type,
        job.status,
        job.started_at,
        job.completed_at,
        job.error_message,
        job.records_processed,
        job.records_total,
        job.progress_percentage,
        job.metadata
      ]);
      
      return result.rows[0].id;
    } finally {
      client.release();
    }
  }
  
  /**
   * Update processing job
   */
  public async updateProcessingJob(id: string, updates: Partial<ProcessingJob>): Promise<void> {
    const client = await this.pool.connect();
    
    try {
      const setClause = Object.keys(updates)
        .map((key, index) => `${key} = $${index + 2}`)
        .join(', ');
      
      const values = [id, ...Object.values(updates)];
      
      await client.query(`
        UPDATE processing_jobs 
        SET ${setClause}
        WHERE id = $1
      `, values);
    } finally {
      client.release();
    }
  }
  
  /**
   * Record data quality metrics
   */
  public async recordDataQualityMetrics(metrics: DataQualityMetrics): Promise<void> {
    const client = await this.pool.connect();
    
    try {
      await client.query(`
        INSERT INTO data_quality_metrics (
          timestamp, dataset, completeness, accuracy, consistency, validity,
          timeliness, anomaly_count, data_freshness_hours, schema_compliance
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      `, [
        metrics.timestamp,
        metrics.dataset,
        metrics.completeness,
        metrics.accuracy,
        metrics.consistency,
        metrics.validity,
        metrics.timeliness,
        metrics.anomaly_count,
        metrics.data_freshness_hours,
        metrics.schema_compliance
      ]);
    } finally {
      client.release();
    }
  }
  
  /**
   * Record system health metrics
   */
  public async recordSystemHealthMetrics(metrics: SystemHealthMetrics): Promise<void> {
    const client = await this.pool.connect();
    
    try {
      await client.query(`
        INSERT INTO system_health_metrics (
          timestamp, cpu_usage, memory_usage, disk_usage, network_io,
          active_connections, avg_response_time_ms, slow_queries, failed_queries,
          cache_hit_rate, error_rate
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
      `, [
        metrics.timestamp,
        metrics.cpu_usage,
        metrics.memory_usage,
        metrics.disk_usage,
        metrics.network_io,
        metrics.active_connections,
        metrics.query_performance.avg_response_time,
        metrics.query_performance.slow_queries,
        metrics.query_performance.failed_queries,
        metrics.cache_hit_rate,
        metrics.error_rate
      ]);
    } finally {
      client.release();
    }
  }
  
  /**
   * Get database statistics
   */
  public async getDatabaseStatistics(): Promise<{
    totalAssessments: number;
    totalResponses: number;
    totalQuestionResponses: number;
    totalScores: number;
    dataQualityScore: number;
    systemHealthScore: number;
  }> {
    const client = await this.pool.connect();
    
    try {
      const result = await client.query(`
        SELECT 
          (SELECT COUNT(*) FROM anonymized_assessments) as total_assessments,
          (SELECT COUNT(*) FROM anonymized_assessment_responses) as total_responses,
          (SELECT COUNT(*) FROM anonymized_question_responses) as total_question_responses,
          (SELECT COUNT(*) FROM anonymized_assessment_scores) as total_scores,
          (SELECT AVG(completeness + accuracy + consistency + validity + timeliness) / 5 
           FROM data_quality_metrics 
           WHERE timestamp >= NOW() - INTERVAL '1 hour') as data_quality_score,
          (SELECT AVG(calculate_system_health_score(cpu_usage, memory_usage, disk_usage, error_rate))
           FROM system_health_metrics 
           WHERE timestamp >= NOW() - INTERVAL '1 hour') as system_health_score
      `);
      
      return {
        totalAssessments: parseInt(result.rows[0].total_assessments),
        totalResponses: parseInt(result.rows[0].total_responses),
        totalQuestionResponses: parseInt(result.rows[0].total_question_responses),
        totalScores: parseInt(result.rows[0].total_scores),
        dataQualityScore: parseFloat(result.rows[0].data_quality_score) || 0,
        systemHealthScore: parseFloat(result.rows[0].system_health_score) || 0
      };
    } finally {
      client.release();
    }
  }
  
  /**
   * Close database connection
   */
  public async close(): Promise<void> {
    await this.pool.end();
  }
}

/**
 * Create default analytics database configuration
 */
export function createDefaultAnalyticsDBConfig(): AnalyticsDBConfig {
  return {
    host: process.env.ANALYTICS_DB_HOST || 'localhost',
    port: parseInt(process.env.ANALYTICS_DB_PORT || '5432'),
    database: process.env.ANALYTICS_DB_NAME || 'ioc_analytics',
    username: process.env.ANALYTICS_DB_USER || 'postgres',
    password: process.env.ANALYTICS_DB_PASSWORD || 'password',
    ssl: process.env.ANALYTICS_DB_SSL === 'true',
    pool: {
      min: 2,
      max: 20,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 2000
    },
    partitioning: {
      enabled: true,
      strategy: 'time',
      interval: 'monthly'
    },
    compression: {
      enabled: true,
      algorithm: 'lz4'
    },
    indexing: {
      autoOptimize: true,
      analysisInterval: 3600000 // 1 hour
    }
  };
}