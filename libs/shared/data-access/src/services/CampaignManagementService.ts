/**
 * Campaign Management Service
 * Manages email campaigns and multi-channel marketing campaigns
 */

import {
  ICampaignManagementService,
  ServiceHealth,
  Campaign,
  CampaignCreateOptions,
  CampaignFilters,
  CampaignPerformance,
  LinkPerformance
} from './interfaces';
import { supabase } from '../supabase/client';
import { v4 as uuidv4 } from 'uuid';

export class CampaignManagementService implements ICampaignManagementService {
  name = 'CampaignManagementService';
  private campaignCache: Map<string, Campaign> = new Map();

  async initialize(): Promise<void> {
    console.log('🚀 Initializing Campaign Management Service...');
    // Initialize any necessary resources
    console.log('✅ Campaign Management Service initialized');
  }

  async shutdown(): Promise<void> {
    console.log('🛑 Shutting down Campaign Management Service...');
    this.campaignCache.clear();
    console.log('✅ Campaign Management Service shut down');
  }

  async healthCheck(): Promise<ServiceHealth> {
    try {
      // Check database connectivity
      const { count, error } = await supabase
        .from('campaigns')
        .select('id', { count: 'exact', head: true });

      if (error) throw error;

      return {
        status: 'healthy',
        message: 'Campaign Management Service is operational',
        lastCheck: new Date(),
        details: {
          campaignCount: count || 0,
          cacheSize: this.campaignCache.size
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

  async createCampaign(options: CampaignCreateOptions): Promise<Campaign> {
    const campaign: Campaign = {
      id: uuidv4(),
      name: options.name,
      type: options.type,
      status: 'draft',
      subject: options.subject,
      content: options.content,
      audience: options.audience,
      schedule: options.schedule,
      metadata: options.metadata || {},
      createdAt: new Date(),
      updatedAt: new Date()
    };

    try {
      const { data, error } = await supabase
        .from('campaigns')
        .insert({
          id: campaign.id,
          name: campaign.name,
          type: campaign.type,
          status: campaign.status,
          subject: campaign.subject,
          content: campaign.content,
          audience: campaign.audience,
          schedule: campaign.schedule,
          metadata: campaign.metadata,
          created_at: campaign.createdAt,
          updated_at: campaign.updatedAt
        })
        .select()
        .single();

      if (error) throw error;

      // Cache the campaign
      this.campaignCache.set(campaign.id, campaign);

      // If scheduled, set up the scheduling
      if (campaign.schedule?.startTime) {
        await this.scheduleCampaign(campaign.id, campaign.schedule.startTime);
      }

      return campaign;
    } catch (error: any) {
      throw new Error(`Failed to create campaign: ${error.message}`);
    }
  }

  async updateCampaign(campaignId: string, updates: Partial<Campaign>): Promise<Campaign> {
    try {
      // Get existing campaign
      const existing = await this.getCampaign(campaignId);
      
      const updatedCampaign = {
        ...existing,
        ...updates,
        updatedAt: new Date()
      };

      const { data, error } = await supabase
        .from('campaigns')
        .update({
          name: updatedCampaign.name,
          type: updatedCampaign.type,
          status: updatedCampaign.status,
          subject: updatedCampaign.subject,
          content: updatedCampaign.content,
          audience: updatedCampaign.audience,
          schedule: updatedCampaign.schedule,
          metadata: updatedCampaign.metadata,
          updated_at: updatedCampaign.updatedAt
        })
        .eq('id', campaignId)
        .select()
        .single();

      if (error) throw error;

      // Update cache
      this.campaignCache.set(campaignId, updatedCampaign);

      return updatedCampaign;
    } catch (error: any) {
      throw new Error(`Failed to update campaign: ${error.message}`);
    }
  }

  async deleteCampaign(campaignId: string): Promise<void> {
    try {
      const { error } = await supabase
        .from('campaigns')
        .delete()
        .eq('id', campaignId);

      if (error) throw error;

      // Remove from cache
      this.campaignCache.delete(campaignId);
    } catch (error: any) {
      throw new Error(`Failed to delete campaign: ${error.message}`);
    }
  }

  async getCampaign(campaignId: string): Promise<Campaign> {
    // Check cache first
    const cached = this.campaignCache.get(campaignId);
    if (cached) {
      return cached;
    }

    try {
      const { data, error } = await supabase
        .from('campaigns')
        .select('*')
        .eq('id', campaignId)
        .single();

      if (error) throw error;

      const campaign: Campaign = {
        id: data.id,
        name: data.name,
        type: data.type,
        status: data.status,
        subject: data.subject,
        content: data.content,
        audience: data.audience,
        schedule: data.schedule,
        metadata: data.metadata,
        createdAt: new Date(data.created_at),
        updatedAt: new Date(data.updated_at)
      };

      // Cache the campaign
      this.campaignCache.set(campaignId, campaign);

      return campaign;
    } catch (error: any) {
      throw new Error(`Failed to get campaign: ${error.message}`);
    }
  }

  async listCampaigns(filters?: CampaignFilters): Promise<Campaign[]> {
    try {
      let query = supabase.from('campaigns').select('*');

      if (filters) {
        if (filters.status) {
          query = query.eq('status', filters.status);
        }
        if (filters.type) {
          query = query.eq('type', filters.type);
        }
        if (filters.startDate) {
          query = query.gte('created_at', filters.startDate.toISOString());
        }
        if (filters.endDate) {
          query = query.lte('created_at', filters.endDate.toISOString());
        }
        if (filters.search) {
          query = query.or(`name.ilike.%${filters.search}%,subject.ilike.%${filters.search}%`);
        }
      }

      const { data, error } = await query.order('created_at', { ascending: false });

      if (error) throw error;

      return data.map(item => ({
        id: item.id,
        name: item.name,
        type: item.type,
        status: item.status,
        subject: item.subject,
        content: item.content,
        audience: item.audience,
        schedule: item.schedule,
        metadata: item.metadata,
        createdAt: new Date(item.created_at),
        updatedAt: new Date(item.updated_at)
      }));
    } catch (error: any) {
      throw new Error(`Failed to list campaigns: ${error.message}`);
    }
  }

  async scheduleCampaign(campaignId: string, scheduleTime: Date): Promise<void> {
    try {
      await this.updateCampaign(campaignId, {
        status: 'scheduled',
        schedule: {
          startTime: scheduleTime
        }
      });

      // In a real implementation, you would set up a job scheduler here
      // For now, we'll just update the status
      console.log(`Campaign ${campaignId} scheduled for ${scheduleTime}`);
    } catch (error: any) {
      throw new Error(`Failed to schedule campaign: ${error.message}`);
    }
  }

  async pauseCampaign(campaignId: string): Promise<void> {
    try {
      await this.updateCampaign(campaignId, {
        status: 'paused'
      });

      // In a real implementation, you would pause any ongoing campaign activities
      console.log(`Campaign ${campaignId} paused`);
    } catch (error: any) {
      throw new Error(`Failed to pause campaign: ${error.message}`);
    }
  }

  async resumeCampaign(campaignId: string): Promise<void> {
    try {
      const campaign = await this.getCampaign(campaignId);
      
      if (campaign.status !== 'paused') {
        throw new Error('Campaign is not paused');
      }

      await this.updateCampaign(campaignId, {
        status: 'active'
      });

      // In a real implementation, you would resume campaign activities
      console.log(`Campaign ${campaignId} resumed`);
    } catch (error: any) {
      throw new Error(`Failed to resume campaign: ${error.message}`);
    }
  }

  async getCampaignPerformance(campaignId: string): Promise<CampaignPerformance> {
    try {
      // Get campaign metrics
      const { data: metricsData, error: metricsError } = await supabase
        .from('campaign_metrics')
        .select('*')
        .eq('campaign_id', campaignId)
        .single();

      if (metricsError && metricsError.code !== 'PGRST116') {
        throw metricsError;
      }

      // Get link performance
      const { data: linksData, error: linksError } = await supabase
        .from('campaign_link_clicks')
        .select('*')
        .eq('campaign_id', campaignId);

      if (linksError) throw linksError;

      // Get device breakdown
      const { data: deviceData, error: deviceError } = await supabase
        .from('campaign_device_stats')
        .select('*')
        .eq('campaign_id', campaignId);

      if (deviceError) throw deviceError;

      // Get location breakdown
      const { data: locationData, error: locationError } = await supabase
        .from('campaign_location_stats')
        .select('*')
        .eq('campaign_id', campaignId);

      if (locationError) throw locationError;

      // Aggregate data
      const metrics = metricsData || {
        sent: 0,
        delivered: 0,
        opened: 0,
        clicked: 0,
        converted: 0,
        revenue: 0
      };

      const topLinks: LinkPerformance[] = (linksData || []).map(link => ({
        url: link.url,
        clicks: link.clicks,
        uniqueClicks: link.unique_clicks,
        conversionRate: link.conversion_rate
      }));

      const deviceBreakdown: Record<string, number> = {};
      (deviceData || []).forEach(device => {
        deviceBreakdown[device.device_type] = device.count;
      });

      const locationBreakdown: Record<string, number> = {};
      (locationData || []).forEach(location => {
        locationBreakdown[location.country] = location.count;
      });

      const performance: CampaignPerformance = {
        campaignId,
        metrics: {
          sent: metrics.sent,
          delivered: metrics.delivered,
          opened: metrics.opened,
          clicked: metrics.clicked,
          converted: metrics.converted,
          revenue: metrics.revenue
        },
        engagement: {
          openRate: metrics.sent > 0 ? (metrics.opened / metrics.sent) * 100 : 0,
          clickRate: metrics.delivered > 0 ? (metrics.clicked / metrics.delivered) * 100 : 0,
          conversionRate: metrics.clicked > 0 ? (metrics.converted / metrics.clicked) * 100 : 0
        },
        topLinks,
        deviceBreakdown,
        locationBreakdown
      };

      return performance;
    } catch (error: any) {
      throw new Error(`Failed to get campaign performance: ${error.message}`);
    }
  }

  /**
   * Helper method to track campaign event
   */
  async trackCampaignEvent(campaignId: string, eventType: string, data?: any): Promise<void> {
    try {
      const { error } = await supabase
        .from('campaign_events')
        .insert({
          campaign_id: campaignId,
          event_type: eventType,
          data,
          timestamp: new Date()
        });

      if (error) throw error;
    } catch (error: any) {
      console.error(`Failed to track campaign event: ${error.message}`);
    }
  }

  /**
   * Helper method to send campaign (integration with EmailService)
   */
  async sendCampaign(campaignId: string): Promise<void> {
    try {
      const campaign = await this.getCampaign(campaignId);
      
      if (campaign.status !== 'scheduled' && campaign.status !== 'draft') {
        throw new Error('Campaign must be in draft or scheduled status to send');
      }

      // Update status to active
      await this.updateCampaign(campaignId, {
        status: 'active'
      });

      // Track send event
      await this.trackCampaignEvent(campaignId, 'campaign_started');

      // In a real implementation, this would integrate with EmailService
      // to actually send the campaign
      console.log(`Campaign ${campaignId} is now active and sending`);
    } catch (error: any) {
      throw new Error(`Failed to send campaign: ${error.message}`);
    }
  }
}

// Export singleton instance
export const campaignManagementService = new CampaignManagementService();