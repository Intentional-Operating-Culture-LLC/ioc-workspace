/**
 * API Route Template
 * Use this as a starting point for Next.js API routes
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

// Request validation schemas
const GetQuerySchema = z.object({
  page: z.string().optional().transform(val => val ? parseInt(val) : 1),
  limit: z.string().optional().transform(val => val ? parseInt(val) : 10),
});

const PostBodySchema = z.object({
  name: z.string().min(1, 'Name is required'),
  email: z.string().email('Invalid email format'),
  // Add your schema fields here
});

// Type definitions
type GetQuery = z.infer<typeof GetQuerySchema>;
type PostBody = z.infer<typeof PostBodySchema>;

/**
 * GET handler
 * @description Handles GET requests to this endpoint
 */
export async function GET(request: NextRequest) {
  try {
    // Parse and validate query parameters
    const { searchParams } = new URL(request.url);
    const queryResult = GetQuerySchema.safeParse({
      page: searchParams.get('page'),
      limit: searchParams.get('limit'),
    });

    if (!queryResult.success) {
      return NextResponse.json(
        { error: 'Invalid query parameters', details: queryResult.error.flatten() },
        { status: 400 }
      );
    }

    const { page, limit } = queryResult.data;

    // Your business logic here
    const data = {
      items: [],
      pagination: {
        page,
        limit,
        total: 0,
      },
    };

    return NextResponse.json(data);
  } catch (error) {
    console.error('GET error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * POST handler
 * @description Handles POST requests to this endpoint
 */
export async function POST(request: NextRequest) {
  try {
    // Parse request body
    const body = await request.json();

    // Validate request body
    const validationResult = PostBodySchema.safeParse(body);
    if (!validationResult.success) {
      return NextResponse.json(
        { error: 'Invalid request data', details: validationResult.error.flatten() },
        { status: 400 }
      );
    }

    const data = validationResult.data;

    // Your business logic here
    const result = {
      id: crypto.randomUUID(),
      ...data,
      createdAt: new Date().toISOString(),
    };

    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    console.error('POST error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * PUT handler
 * @description Handles PUT requests to this endpoint
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;
    const body = await request.json();

    // Validation logic here

    // Your business logic here
    const result = {
      id,
      ...body,
      updatedAt: new Date().toISOString(),
    };

    return NextResponse.json(result);
  } catch (error) {
    console.error('PUT error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * DELETE handler
 * @description Handles DELETE requests to this endpoint
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;

    // Your business logic here

    return NextResponse.json({ message: 'Resource deleted successfully', id });
  } catch (error) {
    console.error('DELETE error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// Optional: Export config for runtime
export const runtime = 'edge'; // 'nodejs' (default) | 'edge'

// Optional: Export config for dynamic routes
export const dynamic = 'auto'; // 'auto' | 'force-dynamic' | 'error' | 'force-static'

// Optional: Segment config
export const revalidate = 60; // Revalidate every 60 seconds