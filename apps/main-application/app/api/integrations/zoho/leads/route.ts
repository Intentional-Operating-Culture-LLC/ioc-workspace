import { NextRequest, NextResponse } from 'next/server';
import { createAppDirectoryClient } from "@ioc/shared/data-access/supabase/server";
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
        const limit = parseInt(searchParams.get('limit') || '10');
        const status = searchParams.get('status');
        const source = searchParams.get('source');
        if (!organizationId) {
            return NextResponse.json({ error: 'Organization ID required' }, { status: 400 });
        }
        // Fetch leads from Zoho CRM or local cache
        const leads = await fetchZohoLeads(organizationId, { limit, status: status || undefined, source: source || undefined });
        return NextResponse.json({
            data: leads,
            total: leads.length,
            lastUpdated: new Date().toISOString(),
            status: 200
        });
    }
    catch (error) {
        console.error('Error in Zoho leads API:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
async function fetchZohoLeads(organizationId: string, options: {
    limit?: number;
    status?: string;
    source?: string;
}) {
    try {
        // In a real implementation, this would:
        // 1. Check if we have cached data that's recent enough
        // 2. If not, fetch from Zoho CRM API using the credentials
        // 3. Cache the results for future requests
        // For now, return mock data that simulates real Zoho leads
        const mockLeads = [
            {
                id: 'lead_1',
                first_name: 'Sarah',
                last_name: 'Johnson',
                company: 'TechCorp Inc',
                email: 'sarah.johnson@techcorp.com',
                phone: '+1-555-0123',
                lead_source: 'Website',
                lead_status: 'Qualified',
                created_time: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
                rating: 'Hot',
                industry: 'Technology',
                annual_revenue: 5000000,
                employees: 250,
                website: 'https://techcorp.com',
                description: 'Enterprise software solution inquiry for 500+ user deployment',
                owner: 'John Sales',
                last_activity: new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString(),
                score: 92
            },
            {
                id: 'lead_2',
                first_name: 'Michael',
                last_name: 'Chen',
                company: 'StartupXYZ',
                email: 'michael@startupxyz.com',
                phone: '+1-555-0456',
                lead_source: 'Social Media',
                lead_status: 'New',
                created_time: new Date(Date.now() - 5 * 60 * 60 * 1000).toISOString(),
                rating: 'Warm',
                industry: 'Software',
                annual_revenue: 1000000,
                employees: 25,
                website: 'https://startupxyz.com',
                description: 'Looking for cost-effective solution for growing team',
                owner: 'Jane Sales',
                last_activity: new Date(Date.now() - 1 * 60 * 60 * 1000).toISOString(),
                score: 78
            },
            {
                id: 'lead_3',
                first_name: 'Emily',
                last_name: 'Rodriguez',
                company: 'Global Solutions Ltd',
                email: 'emily.r@globalsol.com',
                phone: '+1-555-0789',
                lead_source: 'Email Campaign',
                lead_status: 'Contacted',
                created_time: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
                rating: 'Cold',
                industry: 'Manufacturing',
                annual_revenue: 15000000,
                employees: 500,
                website: 'https://globalsolutions.com',
                description: 'Manufacturing process optimization requirements',
                owner: 'Bob Sales',
                last_activity: new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString(),
                score: 65
            },
            {
                id: 'lead_4',
                first_name: 'David',
                last_name: 'Kim',
                company: 'FinTech Innovations',
                email: 'david.kim@fintechinno.com',
                phone: '+1-555-0321',
                lead_source: 'Referral',
                lead_status: 'Qualified',
                created_time: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
                rating: 'Hot',
                industry: 'Financial Services',
                annual_revenue: 8000000,
                employees: 150,
                website: 'https://fintechinnovations.com',
                description: 'Compliance and security solution evaluation',
                owner: 'Alice Sales',
                last_activity: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
                score: 88
            },
            {
                id: 'lead_5',
                first_name: 'Lisa',
                last_name: 'Thompson',
                company: 'Healthcare Plus',
                email: 'lisa.thompson@healthcareplus.com',
                phone: '+1-555-0654',
                lead_source: 'Trade Show',
                lead_status: 'New',
                created_time: new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString(),
                rating: 'Warm',
                industry: 'Healthcare',
                annual_revenue: 12000000,
                employees: 300,
                website: 'https://healthcareplus.com',
                description: 'Patient management system upgrade project',
                owner: 'Chris Sales',
                last_activity: new Date(Date.now() - 30 * 60 * 1000).toISOString(),
                score: 82
            }
        ];
        // Apply filters
        let filteredLeads = mockLeads;
        if (options.status) {
            filteredLeads = filteredLeads.filter(lead => lead.lead_status.toLowerCase() === options.status!.toLowerCase());
        }
        if (options.source) {
            filteredLeads = filteredLeads.filter(lead => lead.lead_source.toLowerCase().includes(options.source!.toLowerCase()));
        }
        // Apply limit
        if (options.limit) {
            filteredLeads = filteredLeads.slice(0, options.limit);
        }
        return filteredLeads;
    }
    catch (error) {
        console.error('Error fetching Zoho leads:', error);
        throw error;
    }
}
// POST endpoint to create a new lead
export async function POST(request: NextRequest) {
    try {
        const supabase = await createAppDirectoryClient();
        // Check authentication
        const { data: { user }, error: authError } = await supabase.auth.getUser();
        if (authError || !user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }
        const leadData = await request.json();
        const organizationId = leadData.organization_id || user.user_metadata?.organization_id;
        if (!organizationId) {
            return NextResponse.json({ error: 'Organization ID required' }, { status: 400 });
        }
        // Validate required fields
        const requiredFields = ['first_name', 'last_name', 'email', 'company'];
        const missingFields = requiredFields.filter(field => !leadData[field]);
        if (missingFields.length > 0) {
            return NextResponse.json({ error: `Missing required fields: ${missingFields.join(', ')}` }, { status: 400 });
        }
        // Create lead in Zoho CRM
        const createdLead = await createZohoLead(organizationId, leadData);
        return NextResponse.json({
            data: createdLead,
            message: 'Lead created successfully',
            status: 201
        });
    }
    catch (error) {
        console.error('Error creating Zoho lead:', error);
        return NextResponse.json({ error: 'Failed to create lead' }, { status: 500 });
    }
}
async function createZohoLead(organizationId: string, leadData: any) {
    try {
        // In a real implementation, this would:
        // 1. Get Zoho CRM credentials for the organization
        // 2. Use the Zoho CRM API to create the lead
        // 3. Store the lead data locally for caching
        // 4. Return the created lead with Zoho ID
        // For now, simulate lead creation
        const newLead = {
            id: `lead_${Date.now()}`,
            ...leadData,
            created_time: new Date().toISOString(),
            lead_status: leadData.lead_status || 'New',
            owner: 'System',
            score: Math.floor(Math.random() * 40) + 50, // Random score between 50-90
            last_activity: new Date().toISOString()
        };
        // Simulate API delay
        await new Promise(resolve => setTimeout(resolve, 1000));
        return newLead;
    }
    catch (error) {
        console.error('Error creating lead in Zoho:', error);
        throw error;
    }
}
