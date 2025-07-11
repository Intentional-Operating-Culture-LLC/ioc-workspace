import { createClient } from '@supabase/supabase-js';

export interface SystemPerformanceMetric {
  id: string;
  metric_type: string;
  metric_name: string;
  metric_value: number;
  metric_unit?: string;
  service_name?: string;
  endpoint?: string;
  status_code?: number;
  error_message?: string;
  recorded_at: string;
  created_at: string;
}

export interface ScheduledJobLog {
  id: string;
  job_name: string;
  job_type: string;
  status: 'running' | 'completed' | 'failed' | 'cancelled';
  started_at: string;
  completed_at?: string;
  duration_seconds?: number;
  rows_processed: number;
  error_message?: string;
  metadata?: Record<string, any>;
  created_at: string;
}

export interface ScheduledJobConfig {
  id: string;
  job_name: string;
  job_type: string;
  schedule_expression: string;
  is_active: boolean;
  last_run_at?: string;
  next_run_at?: string;
  failure_count: number;
  max_failures: number;
  timeout_seconds: number;
  configuration: Record<string, any>;
  created_at: string;
  updated_at: string;
}

export class SystemService {
  constructor(private supabase: ReturnType<typeof createClient>) {}

  async getPerformanceMetrics(params: {
    metricType?: string;
    serviceName?: string;
    periodStart?: string;
    periodEnd?: string;
    limit?: number;
  }): Promise<{ data: SystemPerformanceMetric[]; count: number }> {
    let query = this.supabase
      .from('system_performance_metrics')
      .select('*', { count: 'exact' })
      .order('recorded_at', { ascending: false });

    if (params.metricType) {
      query = query.eq('metric_type', params.metricType);
    }

    if (params.serviceName) {
      query = query.eq('service_name', params.serviceName);
    }

    if (params.periodStart) {
      query = query.gte('recorded_at', params.periodStart);
    }

    if (params.periodEnd) {
      query = query.lte('recorded_at', params.periodEnd);
    }

    if (params.limit) {
      query = query.limit(params.limit);
    }

    const { data, error, count } = await query;

    if (error) {
      throw new Error(`Failed to fetch performance metrics: ${error.message}`);
    }

    return { data: data || [], count: count || 0 };
  }

  async recordPerformanceMetric(params: {
    metricType: string;
    metricName: string;
    metricValue: number;
    metricUnit?: string;
    serviceName?: string;
    endpoint?: string;
    statusCode?: number;
    errorMessage?: string;
  }): Promise<SystemPerformanceMetric> {
    const { data, error } = await this.supabase
      .from('system_performance_metrics')
      .insert({
        metric_type: params.metricType,
        metric_name: params.metricName,
        metric_value: params.metricValue,
        metric_unit: params.metricUnit,
        service_name: params.serviceName,
        endpoint: params.endpoint,
        status_code: params.statusCode,
        error_message: params.errorMessage,
      })
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to record performance metric: ${error.message}`);
    }

    return data;
  }

  async getJobStatus(params: {
    jobName?: string;
    jobType?: string;
    status?: string;
    limit?: number;
  }): Promise<{ 
    logs: ScheduledJobLog[]; 
    configs: ScheduledJobConfig[];
    count: number;
  }> {
    // Get job logs
    let logsQuery = this.supabase
      .from('scheduled_job_logs')
      .select('*', { count: 'exact' })
      .order('started_at', { ascending: false });

    if (params.jobName) {
      logsQuery = logsQuery.eq('job_name', params.jobName);
    }

    if (params.jobType) {
      logsQuery = logsQuery.eq('job_type', params.jobType);
    }

    if (params.status) {
      logsQuery = logsQuery.eq('status', params.status);
    }

    if (params.limit) {
      logsQuery = logsQuery.limit(params.limit);
    }

    const { data: logs, error: logsError, count } = await logsQuery;

    if (logsError) {
      throw new Error(`Failed to fetch job logs: ${logsError.message}`);
    }

    // Get job configurations
    let configsQuery = this.supabase
      .from('scheduled_job_config')
      .select('*')
      .order('created_at', { ascending: false });

    if (params.jobName) {
      configsQuery = configsQuery.eq('job_name', params.jobName);
    }

    if (params.jobType) {
      configsQuery = configsQuery.eq('job_type', params.jobType);
    }

    const { data: configs, error: configsError } = await configsQuery;

    if (configsError) {
      throw new Error(`Failed to fetch job configs: ${configsError.message}`);
    }

    return { 
      logs: logs || [], 
      configs: (configs || []) as ScheduledJobConfig[],
      count: count || 0,
    };
  }

  async executeJob(params: {
    jobName: string;
    parameters?: Record<string, any>;
  }): Promise<{ success: boolean; jobId?: string; error?: string }> {
    try {
      // Log job start
      const { data: logId, error: logError } = await this.supabase
        .rpc('log_job_execution', {
          p_job_name: params.jobName,
          p_job_type: 'manual',
          p_status: 'running',
          p_metadata: params.parameters || {}
        });

      if (logError) {
        throw new Error(`Failed to log job start: ${logError.message}`);
      }

      // Execute the appropriate job function
      let result;
      switch (params.jobName) {
        case 'calculate_all_metrics':
          result = await this.supabase.rpc('job_calculate_all_metrics');
          break;
        case 'generate_all_aggregations':
          result = await this.supabase.rpc('job_generate_all_aggregations');
          break;
        case 'cleanup_old_data':
          result = await this.supabase.rpc('job_cleanup_old_data');
          break;
        case 'generate_weekly_reports':
          result = await this.supabase.rpc('job_generate_weekly_reports');
          break;
        case 'monitor_system_performance':
          result = await this.supabase.rpc('job_monitor_system_performance');
          break;
        default:
          throw new Error(`Unknown job: ${params.jobName}`);
      }

      if (result.error) {
        // Log job failure
        await this.supabase.rpc('log_job_execution', {
          p_job_name: params.jobName,
          p_job_type: 'manual',
          p_status: 'failed',
          p_error_message: result.error.message,
          p_metadata: params.parameters || {}
        });

        return { success: false, error: result.error.message };
      }

      // Log job completion
      await this.supabase.rpc('log_job_execution', {
        p_job_name: params.jobName,
        p_job_type: 'manual',
        p_status: 'completed',
        p_rows_processed: 1,
        p_metadata: { ...params.parameters, result: result.data }
      });

      return { success: true, jobId: logId as string };
    } catch (error) {
      // Log job failure
      await this.supabase.rpc('log_job_execution', {
        p_job_name: params.jobName,
        p_job_type: 'manual',
        p_status: 'failed',
        p_error_message: (error as Error).message,
        p_metadata: params.parameters || {}
      });

      return { success: false, error: (error as Error).message };
    }
  }

  async getSystemHealth(): Promise<{
    status: 'healthy' | 'warning' | 'critical';
    checks: Array<{
      name: string;
      status: 'pass' | 'fail' | 'warning';
      message: string;
      value?: number;
      threshold?: number;
    }>;
  }> {
    const checks = [];
    let overallStatus: 'healthy' | 'warning' | 'critical' = 'healthy';

    try {
      // Check database response time
      const dbStart = Date.now();
      await this.supabase.from('organizations').select('count').limit(1);
      const dbResponseTime = Date.now() - dbStart;

      if (dbResponseTime > 1000) {
        checks.push({
          name: 'Database Response Time',
          status: 'fail',
          message: `Database response time too high: ${dbResponseTime}ms`,
          value: dbResponseTime,
          threshold: 1000,
        });
        overallStatus = 'critical';
      } else if (dbResponseTime > 500) {
        checks.push({
          name: 'Database Response Time',
          status: 'warning',
          message: `Database response time elevated: ${dbResponseTime}ms`,
          value: dbResponseTime,
          threshold: 500,
        });
        if (overallStatus === 'healthy') overallStatus = 'warning';
      } else {
        checks.push({
          name: 'Database Response Time',
          status: 'pass',
          message: `Database responding normally: ${dbResponseTime}ms`,
          value: dbResponseTime,
        });
      }

      // Check recent error rates
      const { data: recentErrors } = await this.supabase
        .from('system_performance_metrics')
        .select('metric_value')
        .eq('metric_type', 'error_rate')
        .gte('recorded_at', new Date(Date.now() - 5 * 60 * 1000).toISOString())
        .order('recorded_at', { ascending: false });

      if (recentErrors && recentErrors.length > 0) {
        const avgErrorRate = recentErrors.reduce((sum, r) => sum + (r.metric_value as number), 0) / recentErrors.length;
        
        if (avgErrorRate > 0.05) {
          checks.push({
            name: 'Error Rate',
            status: 'fail',
            message: `High error rate: ${(avgErrorRate * 100).toFixed(2)}%`,
            value: avgErrorRate,
            threshold: 0.05,
          });
          overallStatus = 'critical';
        } else if (avgErrorRate > 0.01) {
          checks.push({
            name: 'Error Rate',
            status: 'warning',
            message: `Elevated error rate: ${(avgErrorRate * 100).toFixed(2)}%`,
            value: avgErrorRate,
            threshold: 0.01,
          });
          if (overallStatus === 'healthy') overallStatus = 'warning';
        } else {
          checks.push({
            name: 'Error Rate',
            status: 'pass',
            message: `Error rate normal: ${(avgErrorRate * 100).toFixed(2)}%`,
            value: avgErrorRate,
          });
        }
      } else {
        checks.push({
          name: 'Error Rate',
          status: 'pass',
          message: 'No recent errors recorded',
        });
      }

      // Check job failures
      const { data: failedJobs } = await this.supabase
        .from('scheduled_job_logs')
        .select('job_name')
        .eq('status', 'failed')
        .gte('started_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString());

      if (failedJobs && failedJobs.length > 5) {
        checks.push({
          name: 'Job Failures',
          status: 'fail',
          message: `High number of job failures: ${failedJobs.length} in last 24h`,
          value: failedJobs.length,
          threshold: 5,
        });
        overallStatus = 'critical';
      } else if (failedJobs && failedJobs.length > 2) {
        checks.push({
          name: 'Job Failures',
          status: 'warning',
          message: `Some job failures: ${failedJobs.length} in last 24h`,
          value: failedJobs.length,
          threshold: 2,
        });
        if (overallStatus === 'healthy') overallStatus = 'warning';
      } else {
        checks.push({
          name: 'Job Failures',
          status: 'pass',
          message: `Job execution stable: ${failedJobs?.length || 0} failures in last 24h`,
          value: failedJobs?.length || 0,
        });
      }

    } catch (error) {
      checks.push({
        name: 'System Health Check',
        status: 'fail',
        message: `Health check failed: ${(error as Error).message}`,
      });
      overallStatus = 'critical';
    }

    return {
      status: overallStatus,
      checks,
    };
  }

  async getJobConfiguration(jobName: string): Promise<ScheduledJobConfig | null> {
    const { data, error } = await this.supabase
      .from('scheduled_job_config')
      .select('*')
      .eq('job_name', jobName)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return null;
      }
      throw new Error(`Failed to fetch job configuration: ${error.message}`);
    }

    return data as ScheduledJobConfig;
  }

  async updateJobConfiguration(params: {
    jobName: string;
    scheduleExpression?: string;
    isActive?: boolean;
    maxFailures?: number;
    timeoutSeconds?: number;
    configuration?: Record<string, any>;
  }): Promise<ScheduledJobConfig> {
    const updateData: any = {};
    
    if (params.scheduleExpression) updateData.schedule_expression = params.scheduleExpression;
    if (params.isActive !== undefined) updateData.is_active = params.isActive;
    if (params.maxFailures !== undefined) updateData.max_failures = params.maxFailures;
    if (params.timeoutSeconds !== undefined) updateData.timeout_seconds = params.timeoutSeconds;
    if (params.configuration) updateData.configuration = params.configuration;

    const { data, error } = await this.supabase
      .from('scheduled_job_config')
      .update(updateData)
      .eq('job_name', params.jobName)
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to update job configuration: ${error.message}`);
    }

    return data as ScheduledJobConfig;
  }

  async getPerformanceReport(params: {
    periodStart?: string;
    periodEnd?: string;
  }): Promise<{
    summary: {
      avg_response_time: number;
      error_rate: number;
      total_requests: number;
      successful_jobs: number;
      failed_jobs: number;
    };
    trends: Array<{
      metric_name: string;
      values: Array<{ timestamp: string; value: number }>;
    }>;
    top_errors: Array<{
      endpoint: string;
      error_count: number;
      latest_error: string;
    }>;
  }> {
    const periodStart = params.periodStart || new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const periodEnd = params.periodEnd || new Date().toISOString();

    // Get performance summary
    const { data: metrics } = await this.supabase
      .from('system_performance_metrics')
      .select('*')
      .gte('recorded_at', periodStart)
      .lte('recorded_at', periodEnd);

    const responseTimeMetrics = metrics?.filter(m => m.metric_type === 'response_time') || [];
    const errorMetrics = metrics?.filter(m => m.metric_type === 'error_rate') || [];

    const summary = {
      avg_response_time: responseTimeMetrics.length > 0 
        ? responseTimeMetrics.reduce((sum, m) => sum + (m.metric_value as number), 0) / responseTimeMetrics.length 
        : 0,
      error_rate: errorMetrics.length > 0 
        ? errorMetrics.reduce((sum, m) => sum + (m.metric_value as number), 0) / errorMetrics.length 
        : 0,
      total_requests: responseTimeMetrics.length,
      successful_jobs: 0,
      failed_jobs: 0,
    };

    // Get job statistics
    const { data: jobLogs } = await this.supabase
      .from('scheduled_job_logs')
      .select('status')
      .gte('started_at', periodStart)
      .lte('started_at', periodEnd);

    if (jobLogs) {
      summary.successful_jobs = jobLogs.filter(j => j.status === 'completed').length;
      summary.failed_jobs = jobLogs.filter(j => j.status === 'failed').length;
    }

    // Get trends (simplified)
    const trends = [
      {
        metric_name: 'response_time',
        values: responseTimeMetrics.slice(-10).map(m => ({
          timestamp: m.recorded_at as string,
          value: m.metric_value as number,
        })),
      },
      {
        metric_name: 'error_rate',
        values: errorMetrics.slice(-10).map(m => ({
          timestamp: m.recorded_at as string,
          value: m.metric_value as number,
        })),
      },
    ];

    // Get top errors
    const errorMessages = metrics?.filter(m => m.error_message) || [];
    const errorGroups = errorMessages.reduce((acc, m) => {
      const key = (m.endpoint as string) || 'unknown';
      if (!acc[key]) {
        acc[key] = { endpoint: key, error_count: 0, latest_error: '' };
      }
      acc[key].error_count++;
      acc[key].latest_error = (m.error_message as string) || '';
      return acc;
    }, {} as Record<string, any>);

    const top_errors = Object.values(errorGroups)
      .sort((a: any, b: any) => b.error_count - a.error_count)
      .slice(0, 5);

    return {
      summary,
      trends,
      top_errors: top_errors as any,
    };
  }
}