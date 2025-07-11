import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from "@ioc/shared/data-access";
export async function POST(request: NextRequest, context: {
    params: Promise<{
        id: string;
    }>;
}) {
    try {
        const supabase = await createServerClient();
        // Check authentication
        const { data: { user }, error: authError } = await supabase.auth.getUser();
        if (authError || !user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }
        const params = await context.params;
        const insightId = params.id;
        const body = await request.json();
        const { action } = body;
        if (!action || !['accept', 'dismiss'].includes(action)) {
            return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
        }
        // Get the insight to verify ownership
        const { data: insight, error: insightError } = await supabase
            .from('ai_insights')
            .select('*')
            .eq('id', insightId)
            .single();
        if (insightError || !insight) {
            return NextResponse.json({ error: 'Insight not found' }, { status: 404 });
        }
        // Verify organization access
        const organizationId = user.user_metadata?.organization_id;
        if (!organizationId || insight.organization_id !== organizationId) {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }
        // Update the insight
        const { data: updatedInsight, error: updateError } = await supabase
            .from('ai_insights')
            .update({
            action_taken: true,
            action_details: {
                action,
                timestamp: new Date().toISOString(),
                user_id: user.id,
            },
            updated_at: new Date().toISOString(),
        })
            .eq('id', insightId)
            .select()
            .single();
        if (updateError) {
            console.error('Error updating insight:', updateError);
            return NextResponse.json({ error: 'Failed to update insight' }, { status: 500 });
        }
        // If action is 'accept', implement the recommendation
        if (action === 'accept' && insight.is_actionable) {
            await implementInsightAction(supabase, insight);
        }
        return NextResponse.json({
            data: updatedInsight,
            message: `Insight ${action === 'accept' ? 'accepted and applied' : 'dismissed'}`,
            status: 200
        });
    }
    catch (error) {
        console.error('Error in insight action API:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
async function implementInsightAction(supabase: any, insight: any) {
    // In a production environment, this would implement the actual changes
    // based on the insight type and recommendations
    switch (insight.insight_type) {
        case 'recommendation':
            // Implement recommendation logic
            if (insight.data.optimal_time_range) {
                // Update campaign scheduling
                console.log('Updating campaign schedule based on insight:', insight.id);
            }
            break;
        case 'anomaly':
            // Handle anomaly response
            if (insight.data.affected_campaigns) {
                // Flag campaigns for review
                console.log('Flagging campaigns for anomaly review:', insight.data.affected_campaigns);
            }
            break;
        case 'prediction':
            // Implement predictive action
            if (insight.data.recommended_daily_budget) {
                // Adjust budget allocation
                console.log('Adjusting budget based on prediction:', insight.data.recommended_daily_budget);
            }
            break;
        default:
            console.log('No automated action for insight type:', insight.insight_type);
    }
}
