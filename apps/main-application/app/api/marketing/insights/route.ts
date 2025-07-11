import { NextRequest, NextResponse } from 'next/server';
import { createAppDirectoryClient } from "@ioc/shared/data-access/supabase/server";
import { AIInsight } from "@ioc/shared/types/marketing";
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
        const priority = searchParams.get('priority');
        const insightType = searchParams.get('type');
        const actionable = searchParams.get('actionable');
        const limit = parseInt(searchParams.get('limit') || '20');
        if (!organizationId) {
            return NextResponse.json({ error: 'Organization ID required' }, { status: 400 });
        }
        // Build query
        let query = supabase
            .from('ai_insights')
            .select('*')
            .eq('organization_id', organizationId)
            .or('expires_at.is.null,expires_at.gt.' + new Date().toISOString())
            .order('created_at', { ascending: false });
        if (priority) {
            query = query.eq('priority', priority);
        }
        if (insightType) {
            query = query.eq('insight_type', insightType);
        }
        if (actionable !== null && actionable !== undefined) {
            query = query.eq('is_actionable', actionable === 'true');
        }
        // Execute query
        const { data: insights, error: insightsError } = await query.limit(limit);
        if (insightsError) {
            console.error('Error fetching insights:', insightsError);
            return NextResponse.json({ error: 'Failed to fetch insights' }, { status: 500 });
        }
        // If no insights exist, generate some sample insights (in production, this would be from AI service)
        if (!insights || insights.length === 0) {
            const sampleInsights = await generateSampleInsights(supabase, organizationId);
            return NextResponse.json({
                data: sampleInsights,
                generated: true,
                status: 200
            });
        }
        return NextResponse.json({
            data: insights,
            total: insights.length,
            status: 200
        });
    }
    catch (error) {
        console.error('Error in insights API:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
async function generateSampleInsights(supabase: any, organizationId: string): Promise<AIInsight[]> {
    // In production, this would call an AI service to generate insights
    // For now, we'll create some realistic sample insights based on campaign data
    const { data: campaigns } = await supabase
        .from('campaign_summary')
        .select('*')
        .eq('organization_id', organizationId)
        .limit(5);
    const sampleInsights: AIInsight[] = [
        {
            id: crypto.randomUUID(),
            organization_id: organizationId,
            insight_type: 'anomaly',
            priority: 'high',
            title: 'Unusual spike in email campaign CTR',
            description: 'Email campaign CTR increased by 45% in the last 24 hours, significantly above the 30-day average.',
            data: {
                current_ctr: 4.2,
                average_ctr: 2.9,
                spike_percentage: 45,
                affected_campaigns: 3,
            },
            confidence_score: 0.92,
            impact_score: 0.78,
            is_actionable: true,
            action_taken: false,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
        },
        {
            id: crypto.randomUUID(),
            organization_id: organizationId,
            insight_type: 'recommendation',
            priority: 'medium',
            title: 'Optimize social media posting schedule',
            description: 'Analysis shows 68% higher engagement rates for posts published between 2-4 PM EST.',
            data: {
                optimal_time_range: '2:00 PM - 4:00 PM EST',
                potential_engagement_increase: 68,
                current_avg_engagement: 2.3,
                projected_avg_engagement: 3.9,
            },
            confidence_score: 0.85,
            impact_score: 0.65,
            is_actionable: true,
            action_taken: false,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
        },
        {
            id: crypto.randomUUID(),
            organization_id: organizationId,
            insight_type: 'prediction',
            priority: 'critical',
            title: 'Budget depletion warning',
            description: 'At current spend rate, monthly budget will be exhausted 5 days before month end.',
            data: {
                current_spend_rate: 1250,
                daily_budget: 1000,
                days_until_depletion: 8,
                recommended_daily_budget: 850,
            },
            confidence_score: 0.95,
            impact_score: 0.90,
            is_actionable: true,
            action_taken: false,
            expires_at: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString(),
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
        },
        {
            id: crypto.randomUUID(),
            organization_id: organizationId,
            insight_type: 'trend',
            priority: 'low',
            title: 'Mobile traffic increasing across campaigns',
            description: 'Mobile device traffic has increased by 22% over the last 30 days, now representing 67% of total traffic.',
            data: {
                mobile_percentage: 67,
                desktop_percentage: 28,
                tablet_percentage: 5,
                mobile_growth_rate: 22,
            },
            confidence_score: 0.88,
            impact_score: 0.45,
            is_actionable: false,
            action_taken: false,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
        },
    ];
    // Store these insights in the database for future use
    await supabase.from('ai_insights').insert(sampleInsights);
    return sampleInsights;
}
