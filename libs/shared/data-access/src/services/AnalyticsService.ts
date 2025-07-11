/**
 * Analytics Service
 * Provides unified analytics functionality across the platform
 */

import {
  IAnalyticsService,
  ServiceHealth,
  AnalyticsEvent,
  MetricsQuery,
  MetricsResult,
  TimeSeriesData,
  ReportOptions,
  Report,
  DashboardData,
  DashboardWidget,
  ExportOptions,
  ExportResult
} from './interfaces';
import { supabase } from '../supabase/client';
import { v4 as uuidv4 } from 'uuid';

export class AnalyticsService implements IAnalyticsService {
  name = 'AnalyticsService';
  private eventQueue: AnalyticsEvent[] = [];
  private flushInterval: NodeJS.Timeout | null = null;
  private flushBatchSize = 100;
  private flushIntervalMs = 5000; // 5 seconds

  async initialize(): Promise<void> {
    console.log('🚀 Initializing Analytics Service...');
    
    // Start the event flush interval
    this.startEventFlushing();
    
    console.log('✅ Analytics Service initialized');
  }

  async shutdown(): Promise<void> {
    console.log('🛑 Shutting down Analytics Service...');
    
    // Stop the flush interval
    if (this.flushInterval) {
      clearInterval(this.flushInterval);
      this.flushInterval = null;
    }
    
    // Flush any remaining events
    await this.flushEvents();
    
    console.log('✅ Analytics Service shut down');
  }

  async healthCheck(): Promise<ServiceHealth> {
    try {
      // Check database connectivity
      const { count, error } = await supabase
        .from('analytics_events')
        .select('id', { count: 'exact', head: true });

      if (error) throw error;

      return {
        status: 'healthy',
        message: 'Analytics Service is operational',
        lastCheck: new Date(),
        details: {
          eventQueueSize: this.eventQueue.length,
          totalEvents: count || 0,
          flushIntervalMs: this.flushIntervalMs,
          flushBatchSize: this.flushBatchSize
        }
      };
    } catch (error: any) {
      return {
        status: 'unhealthy',
        message: `Health check failed: ${error.message}`,
        lastCheck: new Date(),
        details: { error: error.message }
      };
    }
  }

  async trackEvent(event: AnalyticsEvent): Promise<void> {
    // Add event to queue with timestamp
    this.eventQueue.push({
      ...event,
      timestamp: event.timestamp || new Date()
    });

    // Flush if batch size is reached
    if (this.eventQueue.length >= this.flushBatchSize) {
      await this.flushEvents();
    }
  }

  async getMetrics(options: MetricsQuery): Promise<MetricsResult> {
    try {
      // Build the query based on options
      let query = supabase
        .from('analytics_metrics')
        .select('*')
        .gte('timestamp', options.startDate.toISOString())
        .lte('timestamp', options.endDate.toISOString());

      // Apply filters
      if (options.filters) {
        for (const [key, value] of Object.entries(options.filters)) {
          query = query.eq(key, value);
        }
      }

      const { data, error } = await query;
      if (error) throw error;

      // Aggregate metrics
      const metrics: Record<string, number> = {};
      const dimensions: Record<string, any[]> = {};
      const timeSeries: TimeSeriesData[] = [];

      // Initialize metrics
      options.metrics.forEach(metric => {
        metrics[metric] = 0;
      });

      // Initialize dimensions
      options.dimensions?.forEach(dimension => {
        dimensions[dimension] = [];
      });

      // Process data
      data.forEach(record => {
        // Aggregate metrics
        options.metrics.forEach(metric => {
          if (record[metric] !== undefined) {
            metrics[metric] += record[metric];
          }
        });

        // Collect dimension values
        options.dimensions?.forEach(dimension => {
          if (record[dimension] !== undefined && !dimensions[dimension].includes(record[dimension])) {
            dimensions[dimension].push(record[dimension]);
          }
        });

        // Build time series if granularity is specified
        if (options.granularity) {
          const timestamp = this.roundTimestamp(new Date(record.timestamp), options.granularity);
          let timePoint = timeSeries.find(tp => tp.timestamp.getTime() === timestamp.getTime());
          
          if (!timePoint) {
            timePoint = {
              timestamp,
              values: {}
            };
            timeSeries.push(timePoint);
          }

          options.metrics.forEach(metric => {
            if (record[metric] !== undefined) {
              timePoint!.values[metric] = (timePoint!.values[metric] || 0) + record[metric];
            }
          });
        }
      });

      // Sort time series
      timeSeries.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());

      return {
        metrics,
        dimensions,
        timeSeries: options.granularity ? timeSeries : undefined
      };
    } catch (error: any) {
      throw new Error(`Failed to get metrics: ${error.message}`);
    }
  }

  async generateReport(options: ReportOptions): Promise<Report> {
    try {
      const reportId = uuidv4();
      
      // Get metrics data
      const metricsResult = await this.getMetrics({
        metrics: options.metrics,
        dimensions: options.dimensions,
        filters: options.filters,
        startDate: options.startDate,
        endDate: options.endDate
      });

      // Format report data based on type
      let reportData: any;
      
      switch (options.type) {
        case 'summary':
          reportData = {
            period: {
              start: options.startDate,
              end: options.endDate
            },
            metrics: metricsResult.metrics,
            topDimensions: this.getTopDimensions(metricsResult.dimensions)
          };
          break;
          
        case 'detailed':
          reportData = {
            period: {
              start: options.startDate,
              end: options.endDate
            },
            metrics: metricsResult.metrics,
            dimensions: metricsResult.dimensions,
            timeSeries: metricsResult.timeSeries
          };
          break;
          
        case 'custom':
          reportData = metricsResult;
          break;
      }

      const report: Report = {
        id: reportId,
        name: `${options.type} Report - ${new Date().toISOString()}`,
        type: options.type,
        data: reportData,
        generatedAt: new Date()
      };

      // Store report
      const { error } = await supabase
        .from('analytics_reports')
        .insert({
          id: report.id,
          name: report.name,
          type: report.type,
          data: report.data,
          generated_at: report.generatedAt
        });

      if (error) throw error;

      // Generate export URL if format is specified
      if (options.format && options.format !== 'json') {
        report.url = await this.generateReportExport(report, options.format);
      }

      return report;
    } catch (error: any) {
      throw new Error(`Failed to generate report: ${error.message}`);
    }
  }

  async getDashboardData(dashboardId: string): Promise<DashboardData> {
    try {
      // Get dashboard configuration
      const { data: dashboardConfig, error: dashboardError } = await supabase
        .from('dashboards')
        .select('*')
        .eq('id', dashboardId)
        .single();

      if (dashboardError) throw dashboardError;

      // Get widgets for this dashboard
      const { data: widgetsData, error: widgetsError } = await supabase
        .from('dashboard_widgets')
        .select('*')
        .eq('dashboard_id', dashboardId)
        .order('position');

      if (widgetsError) throw widgetsError;

      // Fetch data for each widget
      const widgets: DashboardWidget[] = await Promise.all(
        widgetsData.map(async (widget) => {
          const widgetData = await this.getWidgetData(widget);
          return {
            id: widget.id,
            type: widget.type,
            title: widget.title,
            data: widgetData,
            config: widget.config || {}
          };
        })
      );

      return {
        dashboardId,
        widgets,
        lastUpdated: new Date()
      };
    } catch (error: any) {
      throw new Error(`Failed to get dashboard data: ${error.message}`);
    }
  }

  async exportData(options: ExportOptions): Promise<ExportResult> {
    try {
      const exportId = uuidv4();
      
      // Create export record
      const { error: createError } = await supabase
        .from('analytics_exports')
        .insert({
          id: exportId,
          type: options.type,
          format: options.format,
          status: 'pending',
          created_at: new Date()
        });

      if (createError) throw createError;

      // Start export process asynchronously
      this.processExport(exportId, options).catch(error => {
        console.error(`Export ${exportId} failed:`, error);
      });

      return {
        exportId,
        status: 'pending'
      };
    } catch (error: any) {
      throw new Error(`Failed to start export: ${error.message}`);
    }
  }

  private startEventFlushing(): void {
    this.flushInterval = setInterval(async () => {
      if (this.eventQueue.length > 0) {
        await this.flushEvents();
      }
    }, this.flushIntervalMs);
  }

  private async flushEvents(): Promise<void> {
    if (this.eventQueue.length === 0) return;

    // Take events from queue
    const events = this.eventQueue.splice(0, this.flushBatchSize);

    try {
      // Store events in database
      const { error } = await supabase
        .from('analytics_events')
        .insert(events.map(event => ({
          type: event.type,
          user_id: event.userId,
          session_id: event.sessionId,
          properties: event.properties,
          timestamp: event.timestamp
        })));

      if (error) throw error;
    } catch (error) {
      console.error('Failed to flush analytics events:', error);
      // Put events back in queue for retry
      this.eventQueue.unshift(...events);
    }
  }

  private roundTimestamp(date: Date, granularity: string): Date {
    const rounded = new Date(date);
    
    switch (granularity) {
      case 'hour':
        rounded.setMinutes(0, 0, 0);
        break;
      case 'day':
        rounded.setHours(0, 0, 0, 0);
        break;
      case 'week':
        const day = rounded.getDay();
        const diff = rounded.getDate() - day;
        rounded.setDate(diff);
        rounded.setHours(0, 0, 0, 0);
        break;
      case 'month':
        rounded.setDate(1);
        rounded.setHours(0, 0, 0, 0);
        break;
    }
    
    return rounded;
  }

  private getTopDimensions(dimensions: Record<string, any[]>, limit: number = 5): Record<string, any[]> {
    const topDimensions: Record<string, any[]> = {};
    
    for (const [key, values] of Object.entries(dimensions)) {
      topDimensions[key] = values.slice(0, limit);
    }
    
    return topDimensions;
  }

  private async getWidgetData(widget: any): Promise<any> {
    switch (widget.type) {
      case 'metric':
        return this.getMetricWidgetData(widget);
      case 'chart':
        return this.getChartWidgetData(widget);
      case 'table':
        return this.getTableWidgetData(widget);
      case 'map':
        return this.getMapWidgetData(widget);
      default:
        return null;
    }
  }

  private async getMetricWidgetData(widget: any): Promise<any> {
    const config = widget.config || {};
    const { data, error } = await supabase
      .from('analytics_metrics')
      .select(config.metric || '*')
      .single();

    if (error) throw error;
    return data;
  }

  private async getChartWidgetData(widget: any): Promise<any> {
    const config = widget.config || {};
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - (config.days || 30));

    const result = await this.getMetrics({
      metrics: config.metrics || [],
      dimensions: config.dimensions || [],
      startDate,
      endDate,
      granularity: config.granularity || 'day'
    });

    return result.timeSeries || [];
  }

  private async getTableWidgetData(widget: any): Promise<any> {
    const config = widget.config || {};
    const { data, error } = await supabase
      .from(config.table || 'analytics_events')
      .select(config.columns || '*')
      .limit(config.limit || 100);

    if (error) throw error;
    return data;
  }

  private async getMapWidgetData(widget: any): Promise<any> {
    const config = widget.config || {};
    const { data, error } = await supabase
      .from('analytics_location_data')
      .select('*')
      .limit(config.limit || 1000);

    if (error) throw error;
    return data;
  }

  private async generateReportExport(report: Report, format: 'csv' | 'pdf'): Promise<string> {
    // In a real implementation, this would generate the actual file
    // For now, return a placeholder URL
    const exportUrl = `https://iocframework.com/api/analytics/reports/${report.id}/export.${format}`;
    
    // Store export URL
    await supabase
      .from('analytics_reports')
      .update({ export_url: exportUrl })
      .eq('id', report.id);

    return exportUrl;
  }

  private async processExport(exportId: string, options: ExportOptions): Promise<void> {
    try {
      // Update status to processing
      await supabase
        .from('analytics_exports')
        .update({ status: 'processing' })
        .eq('id', exportId);

      // Get data based on export type
      let data: any;
      
      switch (options.type) {
        case 'contacts':
          data = await this.exportContacts(options);
          break;
        case 'campaigns':
          data = await this.exportCampaigns(options);
          break;
        case 'analytics':
          data = await this.exportAnalytics(options);
          break;
        case 'custom':
          data = await this.exportCustom(options);
          break;
      }

      // Generate export file URL (placeholder)
      const exportUrl = `https://iocframework.com/api/analytics/exports/${exportId}.${options.format}`;
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 7); // 7 days expiry

      // Update export record
      await supabase
        .from('analytics_exports')
        .update({
          status: 'completed',
          url: exportUrl,
          expires_at: expiresAt,
          completed_at: new Date()
        })
        .eq('id', exportId);
    } catch (error: any) {
      // Update status to failed
      await supabase
        .from('analytics_exports')
        .update({
          status: 'failed',
          error: error.message,
          failed_at: new Date()
        })
        .eq('id', exportId);
    }
  }

  private async exportContacts(options: ExportOptions): Promise<any> {
    const query = supabase.from('contacts').select(options.fields?.join(',') || '*');
    
    if (options.filters) {
      for (const [key, value] of Object.entries(options.filters)) {
        query.eq(key, value);
      }
    }

    const { data, error } = await query;
    if (error) throw error;
    return data;
  }

  private async exportCampaigns(options: ExportOptions): Promise<any> {
    const query = supabase.from('campaigns').select(options.fields?.join(',') || '*');
    
    if (options.filters) {
      for (const [key, value] of Object.entries(options.filters)) {
        query.eq(key, value);
      }
    }

    const { data, error } = await query;
    if (error) throw error;
    return data;
  }

  private async exportAnalytics(options: ExportOptions): Promise<any> {
    const query = supabase.from('analytics_events').select(options.fields?.join(',') || '*');
    
    if (options.filters) {
      for (const [key, value] of Object.entries(options.filters)) {
        query.eq(key, value);
      }
    }

    const { data, error } = await query;
    if (error) throw error;
    return data;
  }

  private async exportCustom(options: ExportOptions): Promise<any> {
    // Custom export logic based on filters
    const { data, error } = await supabase
      .rpc('custom_export', options.filters || {});

    if (error) throw error;
    return data;
  }
}

// Export singleton instance
export const analyticsService = new AnalyticsService();