import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from "@ioc/shared/data-access";
import { MetricType } from "@ioc/shared/types/marketing";
import { TimeSeriesData } from "@ioc/shared/types/analytics";
interface RealTimeMetric {
    type: MetricType;
    current: number;
    previous: number;
    trend: TimeSeriesData[];
}
export async function GET(request: NextRequest) {
    try {
        const supabase = await createServerClient();
        // Check authentication
        const { data: { user }, error: authError } = await supabase.auth.getUser();
        if (authError || !user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }
        const organizationId = request.nextUrl.searchParams.get('organization_id') ||
            user.user_metadata?.organization_id;
        if (!organizationId) {
            return NextResponse.json({ error: 'Organization ID required' }, { status: 400 });
        }
        // Get real-time metrics for the last 30 minutes
        const now = new Date();
        const thirtyMinutesAgo = new Date(now.getTime() - 30 * 60 * 1000);
        const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
        // Fetch metrics for the last hour (to calculate previous period)
        const { data: metricsData, error: metricsError } = await supabase
            .from('campaign_metrics')
            .select('metric_type, metric_date, metric_hour, value, created_at')
            .eq('organization_id', organizationId)
            .gte('created_at', oneHourAgo.toISOString())
            .order('created_at', { ascending: true });
        if (metricsError) {
            console.error('Error fetching real-time metrics:', metricsError);
            return NextResponse.json({ error: 'Failed to fetch real-time metrics' }, { status: 500 });
        }
        // Process metrics by type
        const metricTypes: MetricType[] = ['impression', 'click', 'conversion', 'engagement', 'revenue', 'cost'];
        const processedMetrics: RealTimeMetric[] = [];
        for (const metricType of metricTypes) {
            const typeMetrics = metricsData.filter((m: any) => m.metric_type === metricType);
            // Calculate current (last 30 min) and previous (30-60 min ago) values
            const currentMetrics = typeMetrics.filter((m: any) => new Date(m.created_at) >= thirtyMinutesAgo);
            const previousMetrics = typeMetrics.filter((m: any) => new Date(m.created_at) < thirtyMinutesAgo && new Date(m.created_at) >= oneHourAgo);
            const current = currentMetrics.reduce((sum: number, m: any) => sum + m.value, 0);
            const previous = previousMetrics.reduce((sum: number, m: any) => sum + m.value, 0);
            // Create time series data (5-minute intervals)
            const trend: TimeSeriesData[] = [];
            for (let i = 0; i < 6; i++) {
                const intervalEnd = new Date(now.getTime() - i * 5 * 60 * 1000);
                const intervalStart = new Date(intervalEnd.getTime() - 5 * 60 * 1000);
                const intervalMetrics = currentMetrics.filter((m: any) => {
                    const metricTime = new Date(m.created_at);
                    return metricTime >= intervalStart && metricTime < intervalEnd;
                });
                const intervalValue = intervalMetrics.reduce((sum: number, m: any) => sum + m.value, 0);
                trend.unshift({
                    timestamp: intervalEnd.toISOString(),
                    value: intervalValue,
                });
            }
            processedMetrics.push({
                type: metricType,
                current,
                previous,
                trend,
            });
        }
        return NextResponse.json({
            data: processedMetrics,
            timestamp: now.toISOString(),
            status: 200
        });
    }
    catch (error) {
        console.error('Error in real-time metrics API:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
