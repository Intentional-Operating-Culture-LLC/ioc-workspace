import { NextRequest, NextResponse } from 'next/server';
import { createAppDirectoryClient } from "@ioc/shared/data-access/supabase/server";
import { CampaignPerformance } from "@ioc/shared/types/marketing";
export async function GET(request: NextRequest) {
    try {
        const supabase = await createAppDirectoryClient();
        // Check authentication
        const { data: { user }, error: authError } = await supabase.auth.getUser();
        if (authError || !user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }
        // Get query parameters
        const searchParams = request.nextUrl.searchParams;
        const organizationId = searchParams.get('organization_id') || user.user_metadata?.organization_id;
        const status = searchParams.get('status');
        const channel = searchParams.get('channel');
        const limit = parseInt(searchParams.get('limit') || '10');
        const offset = parseInt(searchParams.get('offset') || '0');
        if (!organizationId) {
            return NextResponse.json({ error: 'Organization ID required' }, { status: 400 });
        }
        // Build query
        let query = supabase
            .from('campaign_summary')
            .select('*')
            .eq('organization_id', organizationId);
        if (status) {
            query = query.eq('status', status);
        }
        if (channel) {
            query = query.eq('channel', channel);
        }
        // Execute query
        const { data: campaigns, error: campaignsError } = await query
            .order('total_revenue', { ascending: false })
            .range(offset, offset + limit - 1);
        if (campaignsError) {
            console.error('Error fetching campaigns:', campaignsError);
            return NextResponse.json({ error: 'Failed to fetch campaigns' }, { status: 500 });
        }
        // Get 30-day comparison data for trends
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        const campaignIds = campaigns.map(c => c.id);
        // Fetch previous period metrics for comparison
        const { data: previousMetrics } = await supabase
            .from('campaign_metrics')
            .select('campaign_id, metric_type, value')
            .in('campaign_id', campaignIds)
            .lt('metric_date', thirtyDaysAgo.toISOString())
            .gte('metric_date', new Date(thirtyDaysAgo.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString());
        // Group previous metrics by campaign
        const previousMetricsByCampaign = (previousMetrics || []).reduce((acc, metric) => {
            if (!acc[metric.campaign_id]) {
                acc[metric.campaign_id] = {
                    revenue: 0,
                    impressions: 0,
                    clicks: 0,
                    conversions: 0,
                };
            }
            switch (metric.metric_type) {
                case 'revenue':
                    acc[metric.campaign_id].revenue += metric.value;
                    break;
                case 'impression':
                    acc[metric.campaign_id].impressions += metric.value;
                    break;
                case 'click':
                    acc[metric.campaign_id].clicks += metric.value;
                    break;
                case 'conversion':
                    acc[metric.campaign_id].conversions += metric.value;
                    break;
            }
            return acc;
        }, {} as Record<string, any>);
        // Transform data to CampaignPerformance format
        const performanceData: CampaignPerformance[] = campaigns.map(campaign => {
            const previousPeriod = previousMetricsByCampaign[campaign.id] || {
                revenue: 0,
                impressions: 0,
                clicks: 0,
                conversions: 0,
            };
            // Calculate current metrics
            const impressions = campaign.total_impressions || 0;
            const clicks = campaign.total_clicks || 0;
            const conversions = campaign.total_conversions || 0;
            const revenue = campaign.total_revenue || 0;
            const cost = campaign.total_cost || 0;
            // Calculate rates
            const ctr = impressions > 0 ? (clicks / impressions) * 100 : 0;
            const conversionRate = clicks > 0 ? (conversions / clicks) * 100 : 0;
            const roi = cost > 0 ? ((revenue - cost) / cost) * 100 : 0;
            // Calculate trend
            const currentValue = revenue;
            const previousValue = previousPeriod.revenue;
            const trendPercentage = previousValue > 0
                ? ((currentValue - previousValue) / previousValue) * 100
                : currentValue > 0 ? 100 : 0;
            const trend = trendPercentage > 5 ? 'up' : trendPercentage < -5 ? 'down' : 'stable';
            return {
                campaign_id: campaign.id,
                campaign_name: campaign.name,
                channel: campaign.channel,
                status: campaign.status,
                impressions,
                clicks,
                conversions,
                revenue,
                cost,
                roi,
                ctr,
                conversion_rate: conversionRate,
                trend,
                trend_percentage: trendPercentage,
            };
        });
        return NextResponse.json({
            data: performanceData,
            total: campaigns.length,
            offset,
            limit,
            status: 200
        });
    }
    catch (error) {
        console.error('Error in campaign performance API:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
