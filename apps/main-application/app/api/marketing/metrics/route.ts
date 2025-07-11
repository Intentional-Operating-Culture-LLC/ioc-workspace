import { NextRequest, NextResponse } from 'next/server';
import { createAppDirectoryClient } from "@ioc/shared/data-access/supabase/server";
import { DashboardMetrics } from "@ioc/shared/types";
export async function GET(request: NextRequest) {
    try {
        const supabase = await createAppDirectoryClient();
        // Check authentication
        const { data: { user }, error: authError } = await supabase.auth.getUser();
        if (authError || !user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }
        // Get organization ID from user metadata or query params
        const organizationId = request.nextUrl.searchParams.get('organization_id') ||
            user.user_metadata?.organization_id;
        if (!organizationId) {
            return NextResponse.json({ error: 'Organization ID required' }, { status: 400 });
        }
        // Fetch dashboard metrics from the dashboard_metrics table (cached values)
        const { data: cachedMetrics, error: cacheError } = await supabase
            .from('dashboard_metrics')
            .select('*')
            .eq('organization_id', organizationId)
            .in('metric_key', [
            'total_campaigns',
            'active_campaigns',
            'total_spend',
            'total_revenue',
            'roi',
            'total_impressions',
            'total_clicks',
            'total_conversions',
            'avg_ctr',
            'avg_conversion_rate',
            'top_performing_channel',
            'budget_utilization'
        ]);
        if (cacheError) {
            console.error('Error fetching cached metrics:', cacheError);
        }
        // Convert cached metrics to object
        const metricsMap = (cachedMetrics || []).reduce((acc, metric) => {
            acc[metric.metric_key] = metric.metric_value || metric.metric_data;
            return acc;
        }, {} as Record<string, any>);
        // If some metrics are missing, calculate them
        if (Object.keys(metricsMap).length < 12) {
            // Fetch campaign summary from materialized view
            const { data: campaignSummary, error: summaryError } = await supabase
                .from('campaign_summary')
                .select('*')
                .eq('organization_id', organizationId);
            if (summaryError) {
                console.error('Error fetching campaign summary:', summaryError);
            }
            // Calculate missing metrics
            const campaigns = campaignSummary || [];
            const activeCampaigns = campaigns.filter(c => c.status === 'active');
            const totals = campaigns.reduce((acc, campaign) => ({
                spend: acc.spend + (campaign.total_cost || 0),
                revenue: acc.revenue + (campaign.total_revenue || 0),
                impressions: acc.impressions + (campaign.total_impressions || 0),
                clicks: acc.clicks + (campaign.total_clicks || 0),
                conversions: acc.conversions + (campaign.total_conversions || 0),
            }), { spend: 0, revenue: 0, impressions: 0, clicks: 0, conversions: 0 });
            // Calculate ROI
            const roi = totals.spend > 0 ? ((totals.revenue - totals.spend) / totals.spend) * 100 : 0;
            // Calculate CTR and conversion rate
            const avgCtr = totals.impressions > 0 ? (totals.clicks / totals.impressions) * 100 : 0;
            const avgConversionRate = totals.clicks > 0 ? (totals.conversions / totals.clicks) * 100 : 0;
            // Get budget utilization
            const { data: budgetData } = await supabase
                .from('marketing_budgets')
                .select('total_budget, spent_budget')
                .eq('organization_id', organizationId)
                .gte('period_end', new Date().toISOString())
                .order('period_start', { ascending: false })
                .limit(1)
                .single();
            const budgetUtilization = budgetData && budgetData.total_budget > 0
                ? (budgetData.spent_budget / budgetData.total_budget) * 100
                : 0;
            // Determine top performing channel
            const channelPerformance = campaigns.reduce((acc, campaign) => {
                if (!acc[campaign.channel]) {
                    acc[campaign.channel] = { revenue: 0, count: 0 };
                }
                acc[campaign.channel].revenue += campaign.total_revenue || 0;
                acc[campaign.channel].count += 1;
                return acc;
            }, {} as Record<string, {
                revenue: number;
                count: number;
            }>);
            const topChannel = Object.entries(channelPerformance)
                .sort(([, a], [, b]) => (b as any).revenue - (a as any).revenue)[0]?.[0] || 'direct';
            // Merge calculated metrics with cached ones
            metricsMap.total_campaigns = metricsMap.total_campaigns || campaigns.length;
            metricsMap.active_campaigns = metricsMap.active_campaigns || activeCampaigns.length;
            metricsMap.total_spend = metricsMap.total_spend || totals.spend;
            metricsMap.total_revenue = metricsMap.total_revenue || totals.revenue;
            metricsMap.roi = metricsMap.roi || roi;
            metricsMap.total_impressions = metricsMap.total_impressions || totals.impressions;
            metricsMap.total_clicks = metricsMap.total_clicks || totals.clicks;
            metricsMap.total_conversions = metricsMap.total_conversions || totals.conversions;
            metricsMap.avg_ctr = metricsMap.avg_ctr || avgCtr;
            metricsMap.avg_conversion_rate = metricsMap.avg_conversion_rate || avgConversionRate;
            metricsMap.top_performing_channel = metricsMap.top_performing_channel || topChannel;
            metricsMap.budget_utilization = metricsMap.budget_utilization || budgetUtilization;
        }
        const metrics: DashboardMetrics = {
            total_campaigns: Number(metricsMap.total_campaigns) || 0,
            active_campaigns: Number(metricsMap.active_campaigns) || 0,
            total_spend: Number(metricsMap.total_spend) || 0,
            total_revenue: Number(metricsMap.total_revenue) || 0,
            roi: Number(metricsMap.roi) || 0,
            total_impressions: Number(metricsMap.total_impressions) || 0,
            total_clicks: Number(metricsMap.total_clicks) || 0,
            total_conversions: Number(metricsMap.total_conversions) || 0,
            avg_ctr: Number(metricsMap.avg_ctr) || 0,
            avg_conversion_rate: Number(metricsMap.avg_conversion_rate) || 0,
            top_performing_channel: metricsMap.top_performing_channel || 'direct',
            budget_utilization: Number(metricsMap.budget_utilization) || 0,
        };
        return NextResponse.json({ data: metrics, status: 200 });
    }
    catch (error) {
        console.error('Error in marketing metrics API:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
