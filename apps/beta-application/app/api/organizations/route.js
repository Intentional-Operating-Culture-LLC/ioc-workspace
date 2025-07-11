import { NextResponse } from 'next/server';
import { api } from "@ioc/shared/data-access";
import {
  createProtectedRoute,
  validateRequestBody,
  validateQueryParams,
  validateOrganizationAccess,
  ErrorResponses } from
"@ioc/shared/api-utils";

const { OrganizationService, listOrganizationsQuerySchema, createOrganizationSchema, updateOrganizationSchema } = api.organizations;

// GET /api/organizations - List organizations for authenticated user
export const GET = createProtectedRoute(async (request, context) => {
  const { data: params, error: validationError } = validateQueryParams(request, listOrganizationsQuerySchema);
  if (validationError) return validationError;

  const organizationService = new OrganizationService(context.supabase);
  const result = await organizationService.listUserOrganizations({
    userId: context.userId,
    ...params
  });

  return NextResponse.json(result);
});

// POST /api/organizations - Create new organization
export const POST = createProtectedRoute(async (request, context) => {
  const { data: body, error: validationError } = await validateRequestBody(request, createOrganizationSchema);
  if (validationError) return validationError;

  const organizationService = new OrganizationService(context.supabase);
  const organization = await organizationService.createOrganization(body, context.userId);

  return NextResponse.json({
    organization,
    message: 'Organization created successfully'
  }, { status: 201 });
});

// PUT /api/organizations - Update organization
export const PUT = createProtectedRoute(async (request, context) => {
  const { data: body, error: validationError } = await validateRequestBody(request, updateOrganizationSchema);
  if (validationError) return validationError;

  const { organization_id, ...updateData } = body;

  if (!organization_id) {
    return ErrorResponses.badRequest('Organization ID is required');
  }

  // Check if user has permission to update
  const { error: accessError } = await validateOrganizationAccess(
    context.supabase,
    context.userId,
    organization_id,
    ['owner', 'admin']
  );
  if (accessError) return accessError;

  const organizationService = new OrganizationService(context.supabase);
  const updated = await organizationService.updateOrganization(organization_id, updateData, context.userId);

  return NextResponse.json({
    organization: updated,
    message: 'Organization updated successfully'
  });
});

// DELETE /api/organizations - Delete organization
export const DELETE = createProtectedRoute(async (request, context) => {
  const { searchParams } = new URL(request.url);
  const organizationId = searchParams.get('organization_id');

  if (!organizationId) {
    return ErrorResponses.badRequest('Organization ID is required');
  }

  // Only owners can delete organizations
  const { error: accessError } = await validateOrganizationAccess(
    context.supabase,
    context.userId,
    organizationId,
    ['owner']
  );
  if (accessError) return accessError;

  const organizationService = new OrganizationService(context.supabase);
  const result = await organizationService.deleteOrganization(organizationId, context.userId);

  return NextResponse.json(result);
});