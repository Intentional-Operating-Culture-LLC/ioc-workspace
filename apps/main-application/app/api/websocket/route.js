import { NextResponse } from 'next/server';
import { api } from "@ioc/shared/data-access";
import {
  createOrganizationRoute,
  ErrorResponses } from
"@ioc/shared/api-utils";

const { WebSocketService } = api.websocket;

// GET /api/websocket - WebSocket connection endpoint
export const GET = createOrganizationRoute(async (request, context) => {
  const upgrade = request.headers.get('upgrade');

  if (upgrade !== 'websocket') {
    return ErrorResponses.BadRequest('WebSocket upgrade required');
  }

  const webSocketService = new WebSocketService();

  try {
    // Initialize WebSocket connection
    const connectionInfo = await webSocketService.initializeConnection({
      organizationId: context.organizationId,
      userId: context.userId,
      request
    });

    return NextResponse.json(connectionInfo);
  } catch (error) {
    return ErrorResponses.InternalError(`WebSocket initialization failed: ${error.message}`);
  }
});