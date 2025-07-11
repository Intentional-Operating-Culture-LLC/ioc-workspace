import { NextRequest, NextResponse } from 'next/server';
import { createAppDirectoryClient } from "@ioc/shared/data-access/supabase/server";
import { AttributionData, ChannelType } from "@ioc/shared/types/marketing";
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
        const startDate = searchParams.get('start_date') || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
        const endDate = searchParams.get('end_date') || new Date().toISOString();
        if (!organizationId) {
            return NextResponse.json({ error: 'Organization ID required' }, { status: 400 });
        }
        // Fetch customer journeys with conversion data
        const { data: journeys, error: journeysError } = await supabase
            .from('customer_journeys')
            .select('*')
            .eq('organization_id', organizationId)
            .not('conversion_date', 'is', null)
            .gte('conversion_date', startDate)
            .lte('conversion_date', endDate);
        if (journeysError) {
            console.error('Error fetching customer journeys:', journeysError);
            return NextResponse.json({ error: 'Failed to fetch attribution data' }, { status: 500 });
        }
        // Process attribution data by channel
        const channelAttribution: Record<ChannelType, AttributionData> = {
            email: createEmptyAttribution('email'),
            social: createEmptyAttribution('social'),
            search: createEmptyAttribution('search'),
            display: createEmptyAttribution('display'),
            video: createEmptyAttribution('video'),
            affiliate: createEmptyAttribution('affiliate'),
            direct: createEmptyAttribution('direct'),
        };
        // Process each customer journey
        journeys.forEach(journey => {
            const touchpoints = journey.touchpoints as any[];
            const totalTouchpoints = touchpoints.length;
            const conversionValue = journey.conversion_value || 0;
            touchpoints.forEach((touchpoint, index) => {
                const channel = touchpoint.channel as ChannelType;
                if (!channelAttribution[channel])
                    return;
                // Increment touchpoint count
                channelAttribution[channel].touchpoints += 1;
                channelAttribution[channel].attributed_conversions += 1 / totalTouchpoints;
                // First touch attribution
                if (index === 0) {
                    channelAttribution[channel].first_touch_conversions += 1;
                }
                // Last touch attribution
                if (index === totalTouchpoints - 1) {
                    channelAttribution[channel].last_touch_conversions += 1;
                }
                // Linear attribution (equal credit)
                channelAttribution[channel].linear_attribution_value += conversionValue / totalTouchpoints;
                // Time decay attribution (more recent touchpoints get more credit)
                const timeDecayWeight = calculateTimeDecayWeight(index, totalTouchpoints);
                channelAttribution[channel].time_decay_attribution_value += conversionValue * timeDecayWeight;
                // Attributed revenue (using linear model by default)
                channelAttribution[channel].attributed_revenue += conversionValue / totalTouchpoints;
            });
        });
        // Convert to array and filter out channels with no activity
        const attributionData: AttributionData[] = Object.values(channelAttribution)
            .filter(data => data.touchpoints > 0)
            .sort((a, b) => b.attributed_revenue - a.attributed_revenue);
        return NextResponse.json({
            data: attributionData,
            period: { start_date: startDate, end_date: endDate },
            total_journeys: journeys.length,
            status: 200
        });
    }
    catch (error) {
        console.error('Error in attribution API:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
function createEmptyAttribution(channel: ChannelType): AttributionData {
    return {
        channel,
        touchpoints: 0,
        attributed_conversions: 0,
        attributed_revenue: 0,
        first_touch_conversions: 0,
        last_touch_conversions: 0,
        linear_attribution_value: 0,
        time_decay_attribution_value: 0,
    };
}
function calculateTimeDecayWeight(position: number, totalTouchpoints: number): number {
    // Time decay: more recent touchpoints get exponentially more credit
    // Using a 7-day half-life model
    const daysFromConversion = (totalTouchpoints - position - 1) * 2; // Assume 2 days between touchpoints on average
    const halfLife = 7; // 7-day half-life
    const weight = Math.pow(0.5, daysFromConversion / halfLife);
    // Normalize weights so they sum to 1
    let totalWeight = 0;
    for (let i = 0; i < totalTouchpoints; i++) {
        const days = (totalTouchpoints - i - 1) * 2;
        totalWeight += Math.pow(0.5, days / halfLife);
    }
    return weight / totalWeight;
}
