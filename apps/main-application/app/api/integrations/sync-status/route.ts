import { NextRequest, NextResponse } from 'next/server';
import { createAppDirectoryClient } from "@ioc/shared/data-access/supabase/server";
interface SyncStatus {
    service: string;
    status: 'connected' | 'syncing' | 'error' | 'disconnected';
    lastSync: string;
    nextSync?: string;
    recordsProcessed?: number;
    errorMessage?: string;
    health_score?: number;
}
export async function GET(request: NextRequest) {
    try {
        const supabase = await createAppDirectoryClient();
        // Check authentication
        const { data: { user }, error: authError } = await supabase.auth.getUser();
        if (authError || !user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }
        // Get organization ID
        const organizationId = request.nextUrl.searchParams.get('organization_id') ||
            user.user_metadata?.organization_id;
        if (!organizationId) {
            return NextResponse.json({ error: 'Organization ID required' }, { status: 400 });
        }
        // Fetch sync status data from database
        const { data: syncStatuses, error: syncError } = await supabase
            .from('integration_sync_status')
            .select('*')
            .eq('organization_id', organizationId)
            .order('last_sync', { ascending: false });
        if (syncError) {
            console.error('Error fetching sync status:', syncError);
        }
        // If no data in database, fetch from integration services
        let integrationStatuses: SyncStatus[] = [];
        if (!syncStatuses || syncStatuses.length === 0) {
            integrationStatuses = await fetchLiveIntegrationStatus(organizationId);
        }
        else {
            integrationStatuses = syncStatuses.map(status => ({
                service: status.service_name,
                status: status.status,
                lastSync: status.last_sync,
                nextSync: status.next_sync,
                recordsProcessed: status.records_processed,
                errorMessage: status.error_message,
                health_score: status.health_score
            }));
        }
        // Calculate overall health score
        const overallHealth = calculateOverallHealth(integrationStatuses);
        return NextResponse.json({
            data: integrationStatuses,
            overallHealth,
            lastUpdated: new Date().toISOString(),
            status: 200
        });
    }
    catch (error) {
        console.error('Error in sync status API:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
async function fetchLiveIntegrationStatus(organizationId: string): Promise<SyncStatus[]> {
    try {
        // This would make actual API calls to check integration status
        // For now, we'll simulate the status checks
        const integrations = [
            'Zoho CRM',
            'Zoho Analytics',
            'Zoho Books',
            'Google Analytics',
            'Facebook Ads',
            'LinkedIn Ads',
            'Mailchimp',
            'HubSpot'
        ];
        const statuses: SyncStatus[] = [];
        for (const integration of integrations) {
            const status = await checkIntegrationHealth(integration, organizationId);
            statuses.push(status);
        }
        return statuses;
    }
    catch (error) {
        console.error('Error fetching live integration status:', error);
        return getMockSyncStatuses();
    }
}
async function checkIntegrationHealth(serviceName: string, organizationId: string): Promise<SyncStatus> {
    try {
        // Simulate API health checks based on service
        const now = new Date();
        let status: SyncStatus;
        switch (serviceName) {
            case 'Zoho CRM':
                status = {
                    service: serviceName,
                    status: 'connected',
                    lastSync: new Date(now.getTime() - 5 * 60 * 1000).toISOString(),
                    nextSync: new Date(now.getTime() + 10 * 60 * 1000).toISOString(),
                    recordsProcessed: 127,
                    health_score: 95
                };
                break;
            case 'Zoho Analytics':
                status = {
                    service: serviceName,
                    status: Math.random() > 0.7 ? 'syncing' : 'connected',
                    lastSync: new Date(now.getTime() - 2 * 60 * 1000).toISOString(),
                    recordsProcessed: 89,
                    health_score: 88
                };
                break;
            case 'Google Analytics':
                status = {
                    service: serviceName,
                    status: 'connected',
                    lastSync: new Date(now.getTime() - 1 * 60 * 1000).toISOString(),
                    nextSync: new Date(now.getTime() + 14 * 60 * 1000).toISOString(),
                    recordsProcessed: 1543,
                    health_score: 92
                };
                break;
            case 'Facebook Ads':
                // Simulate an occasional error
                const hasError = Math.random() > 0.8;
                status = {
                    service: serviceName,
                    status: hasError ? 'error' : 'connected',
                    lastSync: new Date(now.getTime() - (hasError ? 45 : 8) * 60 * 1000).toISOString(),
                    recordsProcessed: hasError ? 0 : 234,
                    errorMessage: hasError ? 'API rate limit exceeded' : undefined,
                    health_score: hasError ? 25 : 85
                };
                break;
            case 'Zoho Books':
                status = {
                    service: serviceName,
                    status: 'connected',
                    lastSync: new Date(now.getTime() - 15 * 60 * 1000).toISOString(),
                    nextSync: new Date(now.getTime() + 45 * 60 * 1000).toISOString(),
                    recordsProcessed: 56,
                    health_score: 90
                };
                break;
            default:
                // Check if integration is configured
                const isConfigured = Math.random() > 0.3; // 70% chance of being configured
                status = {
                    service: serviceName,
                    status: isConfigured ? 'connected' : 'disconnected',
                    lastSync: isConfigured ? new Date(now.getTime() - Math.random() * 60 * 60 * 1000).toISOString() : '',
                    recordsProcessed: isConfigured ? Math.floor(Math.random() * 500) + 50 : 0,
                    health_score: isConfigured ? Math.floor(Math.random() * 30) + 70 : 0
                };
        }
        return status;
    }
    catch (error) {
        console.error(`Error checking ${serviceName} health:`, error);
        return {
            service: serviceName,
            status: 'error',
            lastSync: new Date(Date.now() - 60 * 60 * 1000).toISOString(),
            errorMessage: 'Health check failed',
            health_score: 0
        };
    }
}
function calculateOverallHealth(statuses: SyncStatus[]): number {
    if (statuses.length === 0)
        return 0;
    const weights = {
        'connected': 1.0,
        'syncing': 0.8,
        'error': 0.2,
        'disconnected': 0.0
    };
    const weightedSum = statuses.reduce((sum, status) => {
        const weight = weights[status.status] || 0;
        const healthScore = (status.health_score || 0) / 100;
        return sum + (weight * healthScore);
    }, 0);
    return Math.round((weightedSum / statuses.length) * 100);
}
function getMockSyncStatuses(): SyncStatus[] {
    const now = new Date();
    return [
        {
            service: 'Zoho CRM',
            status: 'connected',
            lastSync: new Date(now.getTime() - 5 * 60 * 1000).toISOString(),
            nextSync: new Date(now.getTime() + 10 * 60 * 1000).toISOString(),
            recordsProcessed: 127,
            health_score: 95
        },
        {
            service: 'Zoho Analytics',
            status: 'syncing',
            lastSync: new Date(now.getTime() - 2 * 60 * 1000).toISOString(),
            recordsProcessed: 89,
            health_score: 88
        },
        {
            service: 'Google Analytics',
            status: 'connected',
            lastSync: new Date(now.getTime() - 1 * 60 * 1000).toISOString(),
            nextSync: new Date(now.getTime() + 14 * 60 * 1000).toISOString(),
            recordsProcessed: 1543,
            health_score: 92
        },
        {
            service: 'Facebook Ads',
            status: 'error',
            lastSync: new Date(now.getTime() - 45 * 60 * 1000).toISOString(),
            errorMessage: 'API rate limit exceeded',
            health_score: 25
        },
        {
            service: 'Zoho Books',
            status: 'connected',
            lastSync: new Date(now.getTime() - 15 * 60 * 1000).toISOString(),
            nextSync: new Date(now.getTime() + 45 * 60 * 1000).toISOString(),
            recordsProcessed: 56,
            health_score: 90
        }
    ];
}
// POST endpoint to trigger manual sync
export async function POST(request: NextRequest) {
    try {
        const supabase = await createAppDirectoryClient();
        // Check authentication
        const { data: { user }, error: authError } = await supabase.auth.getUser();
        if (authError || !user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }
        const body = await request.json();
        const { service, organizationId } = body;
        if (!service || !organizationId) {
            return NextResponse.json({ error: 'Service and organization ID required' }, { status: 400 });
        }
        // Trigger manual sync for the specified service
        const syncResult = await triggerManualSync(service, organizationId);
        return NextResponse.json({
            data: syncResult,
            message: `Manual sync triggered for ${service}`,
            status: 200
        });
    }
    catch (error) {
        console.error('Error triggering manual sync:', error);
        return NextResponse.json({ error: 'Failed to trigger sync' }, { status: 500 });
    }
}
async function triggerManualSync(service: string, organizationId: string) {
    // This would trigger the actual sync process
    // For now, we'll simulate it
    const syncStartTime = new Date().toISOString();
    // Simulate sync process
    await new Promise(resolve => setTimeout(resolve, 2000));
    return {
        service,
        organizationId,
        syncStartTime,
        status: 'syncing',
        estimatedCompletion: new Date(Date.now() + 5 * 60 * 1000).toISOString()
    };
}
