import { Database } from '@/database/types';
import { createClient } from '@supabase/supabase-js';

export interface WeeklyReport {
  id: string;
  organization_id: string;
  report_period_start: string;
  report_period_end: string;
  report_type: string;
  title: string;
  executive_summary?: string;
  status: 'draft' | 'generated' | 'reviewed' | 'published' | 'archived';
  template_id?: string;
  generated_by?: string;
  reviewed_by?: string;
  published_at?: string;
  created_at: string;
  updated_at: string;
  metadata?: Record<string, any>;
}

export interface ReportSection {
  id: string;
  report_id: string;
  section_type: string;
  section_title: string;
  section_order: number;
  content?: string;
  charts_data?: Record<string, any>;
  tables_data?: Record<string, any>;
  insights?: Record<string, any>;
  created_at: string;
  updated_at: string;
}

export interface ReportTemplate {
  id: string;
  name: string;
  description?: string;
  template_type: string;
  target_audience: string;
  sections_config: Record<string, any>;
  styling_config?: Record<string, any>;
  export_formats: string;
  is_default: boolean;
  is_active: boolean;
  created_by?: string;
  created_at: string;
  updated_at: string;
}

export interface ReportDistributionList {
  id: string;
  organization_id: string;
  list_name: string;
  description?: string;
  recipient_emails: string[];
  recipient_roles: string[];
  distribution_schedule: string;
  schedule_day_of_week?: number;
  schedule_time?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export class ReportsService {
  constructor(private supabase: ReturnType<typeof createClient>) {}

  async getReports(params: {
    organizationId: string;
    reportType?: string;
    status?: string;
    periodStart?: string;
    periodEnd?: string;
    limit?: number;
  }): Promise<{ data: WeeklyReport[]; count: number }> {
    let query = this.supabase
      .from('weekly_reports')
      .select('*', { count: 'exact' })
      .eq('organization_id', params.organizationId)
      .eq('is_active', true)
      .order('report_period_start', { ascending: false });

    if (params.reportType) {
      query = query.eq('report_type', params.reportType);
    }

    if (params.status) {
      query = query.eq('status', params.status);
    }

    if (params.periodStart) {
      query = query.gte('report_period_start', params.periodStart);
    }

    if (params.periodEnd) {
      query = query.lte('report_period_end', params.periodEnd);
    }

    if (params.limit) {
      query = query.limit(params.limit);
    }

    const { data, error, count } = await query;

    if (error) {
      throw new Error(`Failed to fetch reports: ${error.message}`);
    }

    return { data: data || [], count: count || 0 };
  }

  async getReport(params: {
    reportId: string;
    organizationId: string;
  }): Promise<WeeklyReport & { sections: ReportSection[] } | null> {
    const { data: report, error: reportError } = await this.supabase
      .from('weekly_reports')
      .select('*')
      .eq('id', params.reportId)
      .eq('organization_id', params.organizationId)
      .eq('is_active', true)
      .single();

    if (reportError) {
      if (reportError.code === 'PGRST116') {
        return null;
      }
      throw new Error(`Failed to fetch report: ${reportError.message}`);
    }

    const { data: sections, error: sectionsError } = await this.supabase
      .from('report_sections')
      .select('*')
      .eq('report_id', params.reportId)
      .order('section_order', { ascending: true });

    if (sectionsError) {
      throw new Error(`Failed to fetch report sections: ${sectionsError.message}`);
    }

    return {
      ...report,
      sections: sections || [],
    };
  }

  async createReport(params: {
    organizationId: string;
    userId: string;
    reportType?: string;
    title: string;
    reportPeriodStart: string;
    reportPeriodEnd: string;
    templateId?: string;
    executiveSummary?: string;
    metadata?: Record<string, any>;
  }): Promise<WeeklyReport> {
    const { data, error } = await this.supabase
      .from('weekly_reports')
      .insert({
        organization_id: params.organizationId,
        report_type: params.reportType || 'standard',
        title: params.title,
        report_period_start: params.reportPeriodStart,
        report_period_end: params.reportPeriodEnd,
        template_id: params.templateId,
        executive_summary: params.executiveSummary,
        generated_by: params.userId,
        metadata: params.metadata,
        status: 'draft',
      })
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to create report: ${error.message}`);
    }

    return data;
  }

  async updateReport(params: {
    reportId: string;
    organizationId: string;
    userId: string;
    title?: string;
    executiveSummary?: string;
    status?: string;
    metadata?: Record<string, any>;
  }): Promise<WeeklyReport> {
    const updateData: any = {};

    if (params.title) updateData.title = params.title;
    if (params.executiveSummary) updateData.executive_summary = params.executiveSummary;
    if (params.status) updateData.status = params.status;
    if (params.metadata) updateData.metadata = params.metadata;

    if (params.status === 'reviewed') {
      updateData.reviewed_by = params.userId;
    }

    if (params.status === 'published') {
      updateData.published_at = new Date().toISOString();
    }

    const { data, error } = await this.supabase
      .from('weekly_reports')
      .update(updateData)
      .eq('id', params.reportId)
      .eq('organization_id', params.organizationId)
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to update report: ${error.message}`);
    }

    return data;
  }

  async deleteReport(params: {
    reportId: string;
    organizationId: string;
  }): Promise<{ success: boolean }> {
    const { error } = await this.supabase
      .from('weekly_reports')
      .update({ is_active: false })
      .eq('id', params.reportId)
      .eq('organization_id', params.organizationId);

    if (error) {
      throw new Error(`Failed to delete report: ${error.message}`);
    }

    return { success: true };
  }

  async addReportSection(params: {
    reportId: string;
    organizationId: string;
    sectionType: string;
    sectionTitle: string;
    sectionOrder: number;
    content?: string;
    chartsData?: Record<string, any>;
    tablesData?: Record<string, any>;
    insights?: Record<string, any>;
  }): Promise<ReportSection> {
    // Verify report belongs to organization
    const { data: report } = await this.supabase
      .from('weekly_reports')
      .select('id')
      .eq('id', params.reportId)
      .eq('organization_id', params.organizationId)
      .single();

    if (!report) {
      throw new Error('Report not found or access denied');
    }

    const { data, error } = await this.supabase
      .from('report_sections')
      .insert({
        report_id: params.reportId,
        section_type: params.sectionType,
        section_title: params.sectionTitle,
        section_order: params.sectionOrder,
        content: params.content,
        charts_data: params.chartsData,
        tables_data: params.tablesData,
        insights: params.insights,
      })
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to add report section: ${error.message}`);
    }

    return data;
  }

  async updateReportSection(params: {
    sectionId: string;
    reportId: string;
    organizationId: string;
    sectionTitle?: string;
    sectionOrder?: number;
    content?: string;
    chartsData?: Record<string, any>;
    tablesData?: Record<string, any>;
    insights?: Record<string, any>;
  }): Promise<ReportSection> {
    // Verify report belongs to organization
    const { data: report } = await this.supabase
      .from('weekly_reports')
      .select('id')
      .eq('id', params.reportId)
      .eq('organization_id', params.organizationId)
      .single();

    if (!report) {
      throw new Error('Report not found or access denied');
    }

    const updateData: any = {};
    if (params.sectionTitle) updateData.section_title = params.sectionTitle;
    if (params.sectionOrder !== undefined) updateData.section_order = params.sectionOrder;
    if (params.content) updateData.content = params.content;
    if (params.chartsData) updateData.charts_data = params.chartsData;
    if (params.tablesData) updateData.tables_data = params.tablesData;
    if (params.insights) updateData.insights = params.insights;

    const { data, error } = await this.supabase
      .from('report_sections')
      .update(updateData)
      .eq('id', params.sectionId)
      .eq('report_id', params.reportId)
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to update report section: ${error.message}`);
    }

    return data;
  }

  async deleteReportSection(params: {
    sectionId: string;
    reportId: string;
    organizationId: string;
  }): Promise<{ success: boolean }> {
    // Verify report belongs to organization
    const { data: report } = await this.supabase
      .from('weekly_reports')
      .select('id')
      .eq('id', params.reportId)
      .eq('organization_id', params.organizationId)
      .single();

    if (!report) {
      throw new Error('Report not found or access denied');
    }

    const { error } = await this.supabase
      .from('report_sections')
      .delete()
      .eq('id', params.sectionId)
      .eq('report_id', params.reportId);

    if (error) {
      throw new Error(`Failed to delete report section: ${error.message}`);
    }

    return { success: true };
  }

  async getTemplates(params: {
    templateType?: string;
    targetAudience?: string;
    isActive?: boolean;
  }): Promise<{ data: ReportTemplate[]; count: number }> {
    let query = this.supabase
      .from('report_templates')
      .select('*', { count: 'exact' })
      .order('created_at', { ascending: false });

    if (params.templateType) {
      query = query.eq('template_type', params.templateType);
    }

    if (params.targetAudience) {
      query = query.eq('target_audience', params.targetAudience);
    }

    if (params.isActive !== undefined) {
      query = query.eq('is_active', params.isActive);
    }

    const { data, error, count } = await query;

    if (error) {
      throw new Error(`Failed to fetch report templates: ${error.message}`);
    }

    return { data: data || [], count: count || 0 };
  }

  async createTemplate(params: {
    userId: string;
    name: string;
    description?: string;
    templateType: string;
    targetAudience: string;
    sectionsConfig: Record<string, any>;
    stylingConfig?: Record<string, any>;
    exportFormats?: string;
    isDefault?: boolean;
  }): Promise<ReportTemplate> {
    const { data, error } = await this.supabase
      .from('report_templates')
      .insert({
        name: params.name,
        description: params.description,
        template_type: params.templateType,
        target_audience: params.targetAudience,
        sections_config: params.sectionsConfig,
        styling_config: params.stylingConfig,
        export_formats: params.exportFormats || 'pdf,excel',
        is_default: params.isDefault || false,
        created_by: params.userId,
      })
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to create report template: ${error.message}`);
    }

    return data;
  }

  async getDistributionLists(params: {
    organizationId: string;
    isActive?: boolean;
  }): Promise<{ data: ReportDistributionList[]; count: number }> {
    let query = this.supabase
      .from('report_distribution_lists')
      .select('*', { count: 'exact' })
      .eq('organization_id', params.organizationId)
      .order('created_at', { ascending: false });

    if (params.isActive !== undefined) {
      query = query.eq('is_active', params.isActive);
    }

    const { data, error, count } = await query;

    if (error) {
      throw new Error(`Failed to fetch distribution lists: ${error.message}`);
    }

    return { data: data || [], count: count || 0 };
  }

  async createDistributionList(params: {
    organizationId: string;
    listName: string;
    description?: string;
    recipientEmails: string[];
    recipientRoles: string[];
    distributionSchedule: string;
    scheduleDayOfWeek?: number;
    scheduleTime?: string;
  }): Promise<ReportDistributionList> {
    const { data, error } = await this.supabase
      .from('report_distribution_lists')
      .insert({
        organization_id: params.organizationId,
        list_name: params.listName,
        description: params.description,
        recipient_emails: params.recipientEmails,
        recipient_roles: params.recipientRoles,
        distribution_schedule: params.distributionSchedule,
        schedule_day_of_week: params.scheduleDayOfWeek,
        schedule_time: params.scheduleTime,
      })
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to create distribution list: ${error.message}`);
    }

    return data;
  }
}