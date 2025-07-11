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
        const limit = parseInt(searchParams.get('limit') || '10');
        const stage = searchParams.get('stage') || undefined;
        const minAmount = searchParams.get('min_amount');
        const maxAmount = searchParams.get('max_amount');
        if (!organizationId) {
            return NextResponse.json({ error: 'Organization ID required' }, { status: 400 });
        }
        // Fetch deals from Zoho CRM
        const deals = await fetchZohoDeals(organizationId, {
            limit,
            stage,
            minAmount: minAmount ? parseFloat(minAmount) : undefined,
            maxAmount: maxAmount ? parseFloat(maxAmount) : undefined
        });
        return NextResponse.json({
            data: deals,
            total: deals.length,
            lastUpdated: new Date().toISOString(),
            status: 200
        });
    }
    catch (error) {
        console.error('Error in Zoho deals API:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
async function fetchZohoDeals(organizationId: string, options: {
    limit?: number;
    stage?: string;
    minAmount?: number;
    maxAmount?: number;
}) {
    try {
        // Mock deals data that simulates real Zoho CRM deals
        const mockDeals = [
            {
                id: 'deal_1',
                deal_name: 'TechCorp Enterprise License',
                account_name: 'TechCorp Inc',
                amount: 45000,
                stage: 'Negotiation',
                closing_date: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000).toISOString(),
                probability: 75,
                contact_name: 'Sarah Johnson',
                created_time: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
                owner: 'John Sales',
                lead_source: 'Website',
                deal_type: 'New Business',
                next_step: 'Contract review and approval',
                description: 'Enterprise software license for 500+ users with premium support',
                expected_revenue: 33750,
                campaign_source: 'Q4 Enterprise Campaign',
                last_activity: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
                activities_count: 15,
                emails_count: 8,
                calls_count: 4,
                meetings_count: 3
            },
            {
                id: 'deal_2',
                deal_name: 'StartupXYZ Integration Package',
                account_name: 'StartupXYZ',
                amount: 12000,
                stage: 'Proposal',
                closing_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
                probability: 50,
                contact_name: 'Michael Chen',
                created_time: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000).toISOString(),
                owner: 'Jane Sales',
                lead_source: 'Social Media',
                deal_type: 'New Business',
                next_step: 'Proposal presentation scheduled',
                description: 'Custom integration package for growing startup',
                expected_revenue: 6000,
                campaign_source: 'Social Media Campaign',
                last_activity: new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString(),
                activities_count: 8,
                emails_count: 5,
                calls_count: 2,
                meetings_count: 1
            },
            {
                id: 'deal_3',
                deal_name: 'Global Solutions Manufacturing Suite',
                account_name: 'Global Solutions Ltd',
                amount: 75000,
                stage: 'Qualification',
                closing_date: new Date(Date.now() + 45 * 24 * 60 * 60 * 1000).toISOString(),
                probability: 30,
                contact_name: 'Emily Rodriguez',
                created_time: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString(),
                owner: 'Bob Sales',
                lead_source: 'Email Campaign',
                deal_type: 'New Business',
                next_step: 'Technical requirements gathering',
                description: 'Complete manufacturing process optimization suite',
                expected_revenue: 22500,
                campaign_source: 'Manufacturing Vertical Campaign',
                last_activity: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
                activities_count: 6,
                emails_count: 4,
                calls_count: 1,
                meetings_count: 1
            },
            {
                id: 'deal_4',
                deal_name: 'FinTech Security Implementation',
                account_name: 'FinTech Innovations',
                amount: 65000,
                stage: 'Needs Analysis',
                closing_date: new Date(Date.now() + 20 * 24 * 60 * 60 * 1000).toISOString(),
                probability: 60,
                contact_name: 'David Kim',
                created_time: new Date(Date.now() - 25 * 24 * 60 * 60 * 1000).toISOString(),
                owner: 'Alice Sales',
                lead_source: 'Referral',
                deal_type: 'New Business',
                next_step: 'Security audit and compliance review',
                description: 'Financial services security and compliance solution',
                expected_revenue: 39000,
                campaign_source: 'Referral Program',
                last_activity: new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString(),
                activities_count: 12,
                emails_count: 7,
                calls_count: 3,
                meetings_count: 2
            },
            {
                id: 'deal_5',
                deal_name: 'Healthcare Plus Patient Management',
                account_name: 'Healthcare Plus',
                amount: 55000,
                stage: 'Value Proposition',
                closing_date: new Date(Date.now() + 35 * 24 * 60 * 60 * 1000).toISOString(),
                probability: 40,
                contact_name: 'Lisa Thompson',
                created_time: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
                owner: 'Chris Sales',
                lead_source: 'Trade Show',
                deal_type: 'Upgrade',
                next_step: 'ROI analysis and business case preparation',
                description: 'Patient management system upgrade with advanced analytics',
                expected_revenue: 22000,
                campaign_source: 'Healthcare Trade Show',
                last_activity: new Date(Date.now() - 8 * 60 * 60 * 1000).toISOString(),
                activities_count: 9,
                emails_count: 6,
                calls_count: 2,
                meetings_count: 1
            },
            {
                id: 'deal_6',
                deal_name: 'RetailCorp Digital Transformation',
                account_name: 'RetailCorp',
                amount: 95000,
                stage: 'Closed Won',
                closing_date: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
                probability: 100,
                contact_name: 'Mark Wilson',
                created_time: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString(),
                owner: 'John Sales',
                lead_source: 'Website',
                deal_type: 'New Business',
                next_step: 'Project kickoff and implementation planning',
                description: 'Complete digital transformation initiative',
                expected_revenue: 95000,
                campaign_source: 'Digital Transformation Campaign',
                last_activity: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
                activities_count: 25,
                emails_count: 15,
                calls_count: 6,
                meetings_count: 4
            }
        ];
        // Apply filters
        let filteredDeals = mockDeals;
        if (options.stage) {
            filteredDeals = filteredDeals.filter(deal => deal.stage.toLowerCase() === options.stage!.toLowerCase());
        }
        if (options.minAmount) {
            filteredDeals = filteredDeals.filter(deal => deal.amount >= options.minAmount!);
        }
        if (options.maxAmount) {
            filteredDeals = filteredDeals.filter(deal => deal.amount <= options.maxAmount!);
        }
        // Apply limit
        if (options.limit) {
            filteredDeals = filteredDeals.slice(0, options.limit);
        }
        return filteredDeals;
    }
    catch (error) {
        console.error('Error fetching Zoho deals:', error);
        throw error;
    }
}
// POST endpoint to create a new deal
export async function POST(request: NextRequest) {
    try {
        const supabase = await createServerClient();
        // Check authentication
        const { data: { user }, error: authError } = await supabase.auth.getUser();
        if (authError || !user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }
        const dealData = await request.json();
        const organizationId = dealData.organization_id || user.user_metadata?.organization_id;
        if (!organizationId) {
            return NextResponse.json({ error: 'Organization ID required' }, { status: 400 });
        }
        // Validate required fields
        const requiredFields = ['deal_name', 'account_name', 'amount', 'stage', 'closing_date'];
        const missingFields = requiredFields.filter(field => !dealData[field]);
        if (missingFields.length > 0) {
            return NextResponse.json({ error: `Missing required fields: ${missingFields.join(', ')}` }, { status: 400 });
        }
        // Create deal in Zoho CRM
        const createdDeal = await createZohoDeal(organizationId, dealData);
        return NextResponse.json({
            data: createdDeal,
            message: 'Deal created successfully',
            status: 201
        });
    }
    catch (error) {
        console.error('Error creating Zoho deal:', error);
        return NextResponse.json({ error: 'Failed to create deal' }, { status: 500 });
    }
}
async function createZohoDeal(organizationId: string, dealData: any) {
    try {
        // In a real implementation, this would use the Zoho CRM API
        const newDeal = {
            id: `deal_${Date.now()}`,
            ...dealData,
            created_time: new Date().toISOString(),
            owner: 'System',
            last_activity: new Date().toISOString(),
            activities_count: 0,
            emails_count: 0,
            calls_count: 0,
            meetings_count: 0,
            expected_revenue: dealData.amount * (dealData.probability || 50) / 100
        };
        // Simulate API delay
        await new Promise(resolve => setTimeout(resolve, 1000));
        return newDeal;
    }
    catch (error) {
        console.error('Error creating deal in Zoho:', error);
        throw error;
    }
}
