import { NextResponse } from 'next/server';
import { api } from "@ioc/shared/data-access";
import {
  createOrganizationRoute,
  validateRequestBody,
  ErrorResponses } from
"@ioc/shared/api-utils";

const { ReportsService, ReportGenerator } = api.reports;

// POST /api/reports/[id]/generate - Generate report content
export const POST = createOrganizationRoute(async (request, context) => {
  const { params } = context;
  const reportId = params.id;

  const { data: body, error: validationError } = await validateRequestBody(request, {
    force_regenerate: { type: 'boolean', required: false },
    export_format: { type: 'string', required: false },
    template_id: { type: 'string', required: false }
  });
  if (validationError) return validationError;

  const reportsService = new ReportsService(context.supabase);
  const reportGenerator = new ReportGenerator(context.supabase);

  // Get report details
  const report = await reportsService.getReport({
    reportId,
    organizationId: context.organizationId
  });

  if (!report) {
    return ErrorResponses.NotFound('Report not found');
  }

  // Generate report content
  const result = await reportGenerator.generateReport({
    reportId,
    organizationId: context.organizationId,
    forceRegenerate: body.force_regenerate || false,
    exportFormat: body.export_format || 'json',
    templateId: body.template_id
  });

  return NextResponse.json(result);
});