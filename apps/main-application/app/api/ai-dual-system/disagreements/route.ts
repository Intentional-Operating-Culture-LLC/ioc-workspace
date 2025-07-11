/**
 * Disagreement Management API Routes
 * Handle disagreements between A1 and B1 components
 */
import { NextRequest, NextResponse } from 'next/server';
import { DisagreementHandler } from "@ioc/shared/data-access/ai-dual-system/core/disagreement-handler";
import { DisagreementResolution, DisagreementFilters } from "@ioc/shared/data-access/ai-dual-system/core/interfaces";
import { logger } from "@ioc/shared/data-access/ai-dual-system/utils/logger";
import { metrics } from "@ioc/shared/data-access/ai-dual-system/utils/metrics";
// Initialize disagreement handler (would be configured properly in production)
const disagreementHandler = new DisagreementHandler({
    resolutionStrategies: [],
    escalationThresholds: {
        confidenceDelta: 0.3,
        severityThreshold: 'high',
        issueCountThreshold: 3
    },
    learningEngine: null as any, // Would be properly initialized
    humanReviewQueue: null as any // Would be properly initialized
});
/**
 * GET /api/ai-dual-system/disagreements
 * Get disagreements with optional filtering
 */
export async function GET(request: NextRequest) {
    const traceId = `disagr_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    try {
        const { searchParams } = new URL(request.url);
        // Parse query parameters
        const filters: DisagreementFilters = {};
        if (searchParams.get('status')) {
            filters.status = searchParams.get('status')!.split(',');
        }
        if (searchParams.get('severity')) {
            filters.severity = searchParams.get('severity')!.split(',') as any;
        }
        if (searchParams.get('type')) {
            filters.type = searchParams.get('type')!.split(',');
        }
        if (searchParams.get('limit')) {
            filters.limit = parseInt(searchParams.get('limit')!);
        }
        if (searchParams.get('start_date') && searchParams.get('end_date')) {
            filters.dateRange = {
                start: new Date(searchParams.get('start_date')!),
                end: new Date(searchParams.get('end_date')!)
            };
        }
        logger.info('Fetching disagreements', {
            traceId,
            filters
        });
        const disagreements = await disagreementHandler.getDisagreements(filters);
        logger.info('Disagreements fetched', {
            traceId,
            count: disagreements.length
        });
        return NextResponse.json({
            success: true,
            data: {
                disagreements: disagreements.map(d => ({
                    id: d.id,
                    requestId: d.requestId,
                    type: d.type,
                    severity: d.severity,
                    status: d.status,
                    generatorPosition: d.generatorPosition,
                    validatorPosition: d.validatorPosition,
                    resolution: d.resolution,
                    createdAt: d.createdAt,
                    resolvedAt: d.resolvedAt
                })),
                total: disagreements.length,
                filters
            },
            metadata: {
                traceId
            }
        });
    }
    catch (error) {
        logger.error('Failed to fetch disagreements', {
            traceId,
            error: error.message
        });
        return NextResponse.json({
            success: false,
            error: error.message,
            metadata: {
                traceId
            }
        }, { status: 500 });
    }
}
/**
 * POST /api/ai-dual-system/disagreements/[id]/resolve
 * Resolve a specific disagreement
 */
export async function POST(request: NextRequest) {
    const traceId = `resolve_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    try {
        const body = await request.json();
        const { disagreementId, resolution } = body;
        if (!disagreementId || !resolution) {
            return NextResponse.json({ error: 'Missing disagreementId or resolution' }, { status: 400 });
        }
        // Validate resolution structure
        if (!resolution.method || !resolution.explanation) {
            return NextResponse.json({ error: 'Resolution must include method and explanation' }, { status: 400 });
        }
        logger.info('Resolving disagreement', {
            traceId,
            disagreementId,
            method: resolution.method
        });
        const resolutionData: DisagreementResolution = {
            method: resolution.method,
            finalContent: resolution.finalContent,
            explanation: resolution.explanation,
            approver: resolution.approver,
            learningNotes: resolution.learningNotes || []
        };
        await disagreementHandler.resolveDisagreement(disagreementId, resolutionData);
        logger.info('Disagreement resolved', {
            traceId,
            disagreementId,
            method: resolution.method
        });
        metrics.record('disagreement_manually_resolved', {
            method: resolution.method,
            traceId
        });
        return NextResponse.json({
            success: true,
            data: {
                disagreementId,
                resolvedAt: new Date().toISOString(),
                method: resolution.method
            },
            metadata: {
                traceId
            }
        });
    }
    catch (error) {
        logger.error('Failed to resolve disagreement', {
            traceId,
            error: error.message
        });
        return NextResponse.json({
            success: false,
            error: error.message,
            metadata: {
                traceId
            }
        }, { status: 500 });
    }
}
/**
 * POST /api/ai-dual-system/disagreements/[id]/escalate
 * Escalate a disagreement for human review
 */
export async function PUT(request: NextRequest) {
    const traceId = `escalate_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    try {
        const body = await request.json();
        const { disagreementId, reason } = body;
        if (!disagreementId || !reason) {
            return NextResponse.json({ error: 'Missing disagreementId or reason' }, { status: 400 });
        }
        logger.info('Escalating disagreement', {
            traceId,
            disagreementId,
            reason
        });
        await disagreementHandler.escalateDisagreement(disagreementId, reason);
        logger.info('Disagreement escalated', {
            traceId,
            disagreementId,
            reason
        });
        metrics.record('disagreement_escalated', {
            reason: 'manual',
            traceId
        });
        return NextResponse.json({
            success: true,
            data: {
                disagreementId,
                escalatedAt: new Date().toISOString(),
                reason
            },
            metadata: {
                traceId
            }
        });
    }
    catch (error) {
        logger.error('Failed to escalate disagreement', {
            traceId,
            error: error.message
        });
        return NextResponse.json({
            success: false,
            error: error.message,
            metadata: {
                traceId
            }
        }, { status: 500 });
    }
}
