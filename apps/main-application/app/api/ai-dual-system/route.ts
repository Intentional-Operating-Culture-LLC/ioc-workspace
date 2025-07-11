/**
 * Dual-AI System API Routes
 * Main entry point for dual-AI generation and validation workflow
 */
import { NextRequest, NextResponse } from 'next/server';
import { DualAIService } from "@ioc/shared/data-access/ai-dual-system/services/dual-ai-service";
import { GenerationRequest, ValidationRequest } from "@ioc/shared/data-access/ai-dual-system/core/interfaces";
import { logger } from "@ioc/shared/data-access/ai-dual-system/utils/logger";
import { metrics } from "@ioc/shared/data-access/ai-dual-system/utils/metrics";
// Initialize dual-AI service
const dualAIService = new DualAIService();
/**
 * POST /api/ai-dual-system
 * Generate and validate content using the dual-AI workflow
 */
export async function POST(request: NextRequest) {
    const traceId = `trace_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const startTime = Date.now();
    try {
        // Parse request body
        const body = await request.json();
        const { userId, organizationId, type, context, options } = body;
        // Validate required fields
        if (!userId || !type || !context) {
            return NextResponse.json({ error: 'Missing required fields: userId, type, context' }, { status: 400 });
        }
        logger.info('Dual-AI request started', {
            traceId,
            userId,
            organizationId,
            type,
            contextKeys: Object.keys(context)
        });
        // Create generation request
        const generationRequest: GenerationRequest = {
            id: `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            userId,
            organizationId: organizationId || 'default',
            type,
            context,
            options,
            timestamp: new Date()
        };
        // Execute dual-AI workflow
        const result = await dualAIService.generateAndValidate(generationRequest);
        // Record metrics
        const duration = Date.now() - startTime;
        metrics.record('dual_ai_request_completed', {
            type,
            status: result.status,
            duration,
            hasDisagreement: !!result.disagreement
        });
        logger.info('Dual-AI request completed', {
            traceId,
            requestId: generationRequest.id,
            status: result.status,
            duration
        });
        return NextResponse.json({
            success: true,
            data: result,
            metadata: {
                traceId,
                requestId: generationRequest.id,
                processingTime: duration
            }
        });
    }
    catch (error) {
        const duration = Date.now() - startTime;
        logger.error('Dual-AI request failed', {
            traceId,
            error: error.message,
            duration
        });
        metrics.record('dual_ai_request_error', {
            error: error.constructor.name,
            duration
        });
        return NextResponse.json({
            success: false,
            error: error.message,
            metadata: {
                traceId,
                processingTime: duration
            }
        }, { status: 500 });
    }
}
/**
 * GET /api/ai-dual-system
 * Get system health and status
 */
export async function GET(request: NextRequest) {
    try {
        const health = await dualAIService.getSystemHealth();
        return NextResponse.json({
            success: true,
            data: {
                status: health.healthy ? 'healthy' : 'degraded',
                components: health.components,
                metrics: health.metrics,
                timestamp: new Date().toISOString()
            }
        });
    }
    catch (error) {
        logger.error('Health check failed', {
            error: error.message
        });
        return NextResponse.json({
            success: false,
            error: 'Health check failed',
            data: {
                status: 'unhealthy',
                timestamp: new Date().toISOString()
            }
        }, { status: 503 });
    }
}
