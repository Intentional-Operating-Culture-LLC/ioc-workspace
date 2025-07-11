import { NextResponse } from 'next/server';
import { api } from "@ioc/shared/data-access";
import {
  createOrganizationRoute,
  validateRequestBody,
  ErrorResponses } from
"@ioc/shared/api-utils";

const { ReportsService, updateReportSchema } = api.reports;

// GET /api/reports/[id] - Get specific report
export const GET = createOrganizationRoute(async (request, context) => {
  const { params } = context;
  const reportId = params.id;

  const reportsService = new ReportsService(context.supabase);
  const result = await reportsService.getReport({
    reportId,
    organizationId: context.organizationId
  });

  if (!result) {
    return ErrorResponses.NotFound('Report not found');
  }

  return NextResponse.json(result);
});

// PUT /api/reports/[id] - Update report
export const PUT = createOrganizationRoute(async (request, context) => {
  const { params } = context;
  const reportId = params.id;

  const { data: body, error: validationError } = await validateRequestBody(request, updateReportSchema);
  if (validationError) return validationError;

  const reportsService = new ReportsService(context.supabase);
  const result = await reportsService.updateReport({
    reportId,
    organizationId: context.organizationId,
    userId: context.userId,
    ...body
  });

  return NextResponse.json(result);
});

// DELETE /api/reports/[id] - Delete report
export const DELETE = createOrganizationRoute(async (request, context) => {
  const { params } = context;
  const reportId = params.id;

  const reportsService = new ReportsService(context.supabase);
  const result = await reportsService.deleteReport({
    reportId,
    organizationId: context.organizationId
  });

  return NextResponse.json(result);
});