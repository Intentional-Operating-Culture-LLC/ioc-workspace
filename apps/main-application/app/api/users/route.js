import { NextResponse } from 'next/server';
import { api } from "@ioc/shared/data-access";
import {
  createOrganizationRoute,
  validateRequestBody,
  validateQueryParams,
  createPaginatedResponse,
  ErrorResponses } from
"@ioc/shared/api-utils";

const { UserService, listUsersQuerySchema, inviteUserSchema, updateUserSchema, removeUserQuerySchema } = api.users;

// GET /api/users - List users in organization
export const GET = createOrganizationRoute(async (request, context) => {
  const { data: params, error: validationError } = validateQueryParams(request, listUsersQuerySchema);
  if (validationError) return validationError;

  const userService = new UserService(context.supabase);
  const result = await userService.listUsers(params);

  return NextResponse.json(result);
});

// POST /api/users - Invite user to organization
export const POST = createOrganizationRoute(async (request, context) => {
  const { data: body, error: validationError } = await validateRequestBody(request, inviteUserSchema);
  if (validationError) return validationError;

  // Only admins and owners can invite users
  if (!['owner', 'admin'].includes(context.userRole)) {
    return ErrorResponses.forbidden('Insufficient permissions');
  }

  const userService = new UserService(context.supabase);
  const result = await userService.inviteUser({
    ...body,
    invitedBy: context.userId
  });

  return NextResponse.json(result, { status: 201 });
}, ['owner', 'admin']);

// PUT /api/users - Update user profile
export const PUT = createOrganizationRoute(async (request, context) => {
  const { data: body, error: validationError } = await validateRequestBody(request, updateUserSchema.partial());
  if (validationError) return validationError;

  const { user_id, ...updateData } = body;
  const targetUserId = user_id || context.userId;

  const userService = new UserService(context.supabase);

  // Check permissions
  if (targetUserId !== context.userId) {
    const canUpdate = await userService.canUpdateUser(context.userId, targetUserId);
    if (!canUpdate) {
      return ErrorResponses.forbidden('Insufficient permissions');
    }
  }

  const updatedUser = await userService.updateUser(targetUserId, updateData, context.userId);

  return NextResponse.json({
    user: updatedUser,
    message: 'User updated successfully'
  });
});

// DELETE /api/users - Remove user from organization
export const DELETE = createOrganizationRoute(async (request, context) => {
  const { data: params, error: validationError } = validateQueryParams(request, removeUserQuerySchema);
  if (validationError) return validationError;

  // Only admins and owners can remove users
  if (!['owner', 'admin'].includes(context.userRole)) {
    return ErrorResponses.forbidden('Insufficient permissions');
  }

  const userService = new UserService(context.supabase);
  const result = await userService.removeUser({
    userId: params.user_id,
    organizationId: params.organization_id,
    removedBy: context.userId
  });

  return NextResponse.json(result);
}, ['owner', 'admin']);