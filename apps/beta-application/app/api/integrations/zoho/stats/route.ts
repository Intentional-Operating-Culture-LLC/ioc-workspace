import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from "@ioc/shared/data-access";
export async function GET(request: NextRequest) {
    try {
        const supabase = await createServerClient();
        // Check authentication
        const { data: { user }, error: authError } = await supabase.auth.getUser();
        if (authError || !user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }
        // Get query parameters
        const searchParams = request.nextUrl.searchParams;
        const organizationId = searchParams.get('organization_id') || user.user_metadata?.organization_id;
        const period = searchParams.get('period') || '30d';
        if (!organizationId) {
            return NextResponse.json({ error: 'Organization ID required' }, { status: 400 });
        }
        // Calculate date range based on period
        const now = new Date();
        let startDate: Date;
        switch (period) {
            case '7d':
                startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
                break;
            case '90d':
                startDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
                break;
            default: // 30d
                startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        }
        // Fetch CRM statistics
        const stats = await fetchZohoCRMStats(organizationId, startDate, period);
        return NextResponse.json({
            data: stats,
            period,
            dateRange: {
                start: startDate.toISOString(),
                end: now.toISOString()
            },
            lastUpdated: new Date().toISOString(),
            status: 200
        });
    }
    catch (error) {
        console.error('Error in Zoho stats API:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
async function fetchZohoCRMStats(organizationId: string, startDate: Date, period: string) {
    try {
        // In a real implementation, this would:
        // 1. Fetch data from Zoho CRM APIs
        // 2. Calculate metrics based on the actual data
        // 3. Cache results for performance
        // For now, return realistic mock statistics
        const stats = {
            // Lead Statistics
            total_leads: 1247,
            new_leads: period === '7d' ? 35 : period === '30d' ? 148 : 387,
            qualified_leads: 423,
            converted_leads: 89,
            lead_conversion_rate: 21.0,
            // Deal Statistics  
            total_deals: 89,
            open_deals: 67,
            closed_won_deals: 18,
            closed_lost_deals: 4,
            total_deal_value: 892000,
            won_deal_value: 245000,
            lost_deal_value: 35000,
            avg_deal_size: 10022,
            win_rate: 81.8, // Won deals / (Won + Lost) deals
            // Pipeline Statistics
            pipeline_value: 647000,
            weighted_pipeline: 388200,
            deals_in_negotiation: 8,
            deals_in_proposal: 12,
            deals_in_qualification: 15,
            deals_in_needs_analysis: 18,
            deals_in_value_proposition: 14,
            // Activity Statistics
            activities_completed: period === '7d' ? 156 : period === '30d' ? 672 : 1834,
            calls_made: period === '7d' ? 45 : period === '30d' ? 198 : 542,
            emails_sent: period === '7d' ? 89 : period === '30d' ? 378 : 1032,
            meetings_held: period === '7d' ? 22 : period === '30d' ? 96 : 260,
            // Contact Statistics
            total_contacts: 1456,
            active_contacts: 892,
            new_contacts: period === '7d' ? 28 : period === '30d' ? 124 : 334,
            // Performance Metrics
            sales_velocity: 18.5, // Days to close
            quota_attainment: 87.3,
            forecast_accuracy: 92.1,
            // Revenue Statistics
            monthly_revenue: 125000,
            quarterly_revenue: 375000,
            yearly_revenue: 1500000,
            revenue_growth_rate: 23.5,
            // Top Performers
            top_sales_rep: {
                name: 'John Sales',
                deals_closed: 8,
                revenue_generated: 89000
            },
            top_lead_source: {
                source: 'Website',
                leads_generated: 342,
                conversion_rate: 28.4
            },
            top_industry: {
                industry: 'Technology',
                deals: 23,
                revenue: 156000
            },
            // Trend Data
            monthly_trends: [
                { month: 'Jan', leads: 98, deals: 6, revenue: 78000 },
                { month: 'Feb', leads: 112, deals: 8, revenue: 95000 },
                { month: 'Mar', leads: 134, deals: 9, revenue: 112000 },
                { month: 'Apr', leads: 148, deals: 11, revenue: 125000 }
            ],
            // Lead Source Performance
            lead_sources: [
                { source: 'Website', leads: 423, qualified: 156, conversion_rate: 36.9 },
                { source: 'Social Media', leads: 298, qualified: 89, conversion_rate: 29.9 },
                { source: 'Email Campaign', leads: 234, qualified: 78, conversion_rate: 33.3 },
                { source: 'Referral', leads: 187, qualified: 67, conversion_rate: 35.8 },
                { source: 'Trade Show', leads: 105, qualified: 33, conversion_rate: 31.4 }
            ],
            // Deal Stage Distribution
            stage_distribution: [
                { stage: 'Qualification', count: 15, value: 125000 },
                { stage: 'Needs Analysis', count: 18, value: 189000 },
                { stage: 'Value Proposition', count: 14, value: 156000 },
                { stage: 'Proposal', count: 12, value: 98000 },
                { stage: 'Negotiation', count: 8, value: 79000 }
            ],
            // Industry Performance
            industry_performance: [
                { industry: 'Technology', deals: 23, revenue: 156000, avg_deal_size: 6783 },
                { industry: 'Healthcare', deals: 18, revenue: 134000, avg_deal_size: 7444 },
                { industry: 'Financial Services', deals: 15, revenue: 128000, avg_deal_size: 8533 },
                { industry: 'Manufacturing', deals: 12, revenue: 98000, avg_deal_size: 8167 },
                { industry: 'Retail', deals: 21, revenue: 89000, avg_deal_size: 4238 }
            ]
        };
        return stats;
    }
    catch (error) {
        console.error('Error fetching Zoho CRM stats:', error);
        // Return basic stats as fallback
        return {
            total_leads: 1247,
            qualified_leads: 423,
            total_deals: 89,
            total_deal_value: 245000,
            avg_deal_size: 2753,
            win_rate: 23.5,
            conversion_rate: 33.9,
            pipeline_velocity: 18.5
        };
    }
}
