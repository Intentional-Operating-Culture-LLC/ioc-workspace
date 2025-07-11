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
        const accountName = searchParams.get('account_name') || undefined;
        const email = searchParams.get('email') || undefined;
        if (!organizationId) {
            return NextResponse.json({ error: 'Organization ID required' }, { status: 400 });
        }
        // Fetch contacts from Zoho CRM
        const contacts = await fetchZohoContacts(organizationId, {
            limit,
            accountName,
            email
        });
        return NextResponse.json({
            data: contacts,
            total: contacts.length,
            lastUpdated: new Date().toISOString(),
            status: 200
        });
    }
    catch (error) {
        console.error('Error in Zoho contacts API:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
async function fetchZohoContacts(organizationId: string, options: {
    limit?: number;
    accountName?: string;
    email?: string;
}) {
    try {
        // Mock contacts data
        const mockContacts = [
            {
                id: 'contact_1',
                first_name: 'Sarah',
                last_name: 'Johnson',
                email: 'sarah.johnson@techcorp.com',
                account_name: 'TechCorp Inc',
                phone: '+1-555-0123',
                mobile: '+1-555-0124',
                title: 'VP of Technology',
                department: 'Technology',
                reports_to: 'John Davis - CTO',
                mailing_street: '123 Tech Street',
                mailing_city: 'San Francisco',
                mailing_state: 'CA',
                mailing_zip: '94102',
                mailing_country: 'USA',
                created_time: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
                last_activity: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
                lead_score: 92,
                contact_type: 'Decision Maker',
                social_linkedin: 'https://linkedin.com/in/sarahjohnson',
                social_twitter: '@sarahj_tech'
            },
            {
                id: 'contact_2',
                first_name: 'Michael',
                last_name: 'Chen',
                email: 'michael@startupxyz.com',
                account_name: 'StartupXYZ',
                phone: '+1-555-0456',
                title: 'Founder & CEO',
                department: 'Executive',
                mailing_street: '456 Startup Blvd',
                mailing_city: 'Austin',
                mailing_state: 'TX',
                mailing_zip: '73301',
                mailing_country: 'USA',
                created_time: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000).toISOString(),
                last_activity: new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString(),
                lead_score: 78,
                contact_type: 'Decision Maker',
                social_linkedin: 'https://linkedin.com/in/michaelchen',
                social_twitter: '@mchen_startup'
            },
            {
                id: 'contact_3',
                first_name: 'Emily',
                last_name: 'Rodriguez',
                email: 'emily.r@globalsol.com',
                account_name: 'Global Solutions Ltd',
                phone: '+1-555-0789',
                mobile: '+1-555-0790',
                title: 'Operations Director',
                department: 'Operations',
                reports_to: 'Robert Smith - COO',
                mailing_street: '789 Global Ave',
                mailing_city: 'Chicago',
                mailing_state: 'IL',
                mailing_zip: '60601',
                mailing_country: 'USA',
                created_time: new Date(Date.now() - 20 * 24 * 60 * 60 * 1000).toISOString(),
                last_activity: new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString(),
                lead_score: 65,
                contact_type: 'Influencer',
                social_linkedin: 'https://linkedin.com/in/emilyrodriguez'
            },
            {
                id: 'contact_4',
                first_name: 'David',
                last_name: 'Kim',
                email: 'david.kim@fintechinno.com',
                account_name: 'FinTech Innovations',
                phone: '+1-555-0321',
                title: 'Chief Security Officer',
                department: 'Security',
                reports_to: 'Jennifer Lee - CTO',
                mailing_street: '321 Finance Way',
                mailing_city: 'New York',
                mailing_state: 'NY',
                mailing_zip: '10001',
                mailing_country: 'USA',
                created_time: new Date(Date.now() - 25 * 24 * 60 * 60 * 1000).toISOString(),
                last_activity: new Date(Date.now() - 1 * 60 * 60 * 1000).toISOString(),
                lead_score: 88,
                contact_type: 'Decision Maker',
                social_linkedin: 'https://linkedin.com/in/davidkim-security'
            },
            {
                id: 'contact_5',
                first_name: 'Lisa',
                last_name: 'Thompson',
                email: 'lisa.thompson@healthcareplus.com',
                account_name: 'Healthcare Plus',
                phone: '+1-555-0654',
                mobile: '+1-555-0655',
                title: 'IT Director',
                department: 'Information Technology',
                reports_to: 'Mark Williams - CIO',
                mailing_street: '654 Healthcare Drive',
                mailing_city: 'Boston',
                mailing_state: 'MA',
                mailing_zip: '02101',
                mailing_country: 'USA',
                created_time: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
                last_activity: new Date(Date.now() - 30 * 60 * 1000).toISOString(),
                lead_score: 82,
                contact_type: 'Technical Evaluator',
                social_linkedin: 'https://linkedin.com/in/lisathompson-healthcare'
            },
            {
                id: 'contact_6',
                first_name: 'Mark',
                last_name: 'Wilson',
                email: 'mark.wilson@retailcorp.com',
                account_name: 'RetailCorp',
                phone: '+1-555-0987',
                title: 'VP of Digital Strategy',
                department: 'Strategy',
                reports_to: 'Susan Brown - Chief Strategy Officer',
                mailing_street: '987 Retail Plaza',
                mailing_city: 'Seattle',
                mailing_state: 'WA',
                mailing_zip: '98101',
                mailing_country: 'USA',
                created_time: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString(),
                last_activity: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
                lead_score: 95,
                contact_type: 'Champion',
                social_linkedin: 'https://linkedin.com/in/markwilson-retail',
                social_twitter: '@mwilson_retail'
            }
        ];
        // Apply filters
        let filteredContacts = mockContacts;
        if (options.accountName) {
            filteredContacts = filteredContacts.filter(contact => contact.account_name.toLowerCase().includes(options.accountName!.toLowerCase()));
        }
        if (options.email) {
            filteredContacts = filteredContacts.filter(contact => contact.email.toLowerCase().includes(options.email!.toLowerCase()));
        }
        // Apply limit
        if (options.limit) {
            filteredContacts = filteredContacts.slice(0, options.limit);
        }
        return filteredContacts;
    }
    catch (error) {
        console.error('Error fetching Zoho contacts:', error);
        throw error;
    }
}
