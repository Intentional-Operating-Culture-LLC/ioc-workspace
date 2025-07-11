import { NextResponse } from 'next/server';
import { api } from "@ioc/shared/data-access";
import {
  createOrganizationRoute,
  validateQueryParams,
  ErrorResponses } from
"@ioc/shared/api-utils";

const { ReportsService, ReportExporter } = api.reports;

// GET /api/reports/[id]/export - Export report in various formats
export const GET = createOrganizationRoute(async (request, context) => {
  const { params } = context;
  const reportId = params.id;

  const { data: queryParams, error: validationError } = validateQueryParams(request, {
    format: { type: 'string', required: false },
    include_charts: { type: 'boolean', required: false },
    include_raw_data: { type: 'boolean', required: false }
  });
  if (validationError) return validationError;

  const reportsService = new ReportsService(context.supabase);
  const reportExporter = new ReportExporter(context.supabase);

  // Get report details
  const report = await reportsService.getReport({
    reportId,
    organizationId: context.organizationId
  });

  if (!report) {
    return ErrorResponses.NotFound('Report not found');
  }

  const format = queryParams.format || 'pdf';
  const includeCharts = queryParams.include_charts !== false;
  const includeRawData = queryParams.include_raw_data || false;

  try {
    const exportResult = await reportExporter.exportReport({
      reportId,
      organizationId: context.organizationId,
      format,
      includeCharts,
      includeRawData
    });

    // Set appropriate headers based on format
    const headers = {};
    switch (format) {
      case 'pdf':
        headers['Content-Type'] = 'application/pdf';
        headers['Content-Disposition'] = `attachment; filename="report-${reportId}.pdf"`;
        break;
      case 'excel':
        headers['Content-Type'] = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
        headers['Content-Disposition'] = `attachment; filename="report-${reportId}.xlsx"`;
        break;
      case 'csv':
        headers['Content-Type'] = 'text/csv';
        headers['Content-Disposition'] = `attachment; filename="report-${reportId}.csv"`;
        break;
      default:
        headers['Content-Type'] = 'application/json';
    }

    return new NextResponse(exportResult.data, {
      status: 200,
      headers
    });
  } catch (error) {
    return ErrorResponses.InternalError(`Export failed: ${error.message}`);
  }
});