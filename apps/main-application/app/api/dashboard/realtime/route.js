import { NextResponse } from 'next/server';
import { api } from "@ioc/shared/data-access";
import {
  createOrganizationRoute,
  ErrorResponses } from
"@ioc/shared/api-utils";

const { DashboardService } = api.dashboard;

// GET /api/dashboard/realtime - Get real-time dashboard data
export const GET = createOrganizationRoute(async (request, context) => {
  const dashboardService = new DashboardService(context.supabase);
  const result = await dashboardService.getRealtimeData({
    organizationId: context.organizationId
  });

  return NextResponse.json(result);
});