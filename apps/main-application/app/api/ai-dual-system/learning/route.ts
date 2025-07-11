/**
 * Continuous Learning API Routes
 * Manage learning events, insights, and model retraining
 */
import { NextRequest, NextResponse } from 'next/server';
import { ContinuousLearningEngine } from "@ioc/shared/data-access/ai-dual-system/core/continuous-learning-engine";
import { LearningEvent, LearningData, LearningImpact, RetrainingOptions } from "@ioc/shared/data-access/ai-dual-system/core/interfaces";
import { logger } from "@ioc/shared/data-access/ai-dual-system/utils/logger";
import { metrics } from "@ioc/shared/data-access/ai-dual-system/utils/metrics";
// Initialize learning engine (would be configured properly in production)
const learningEngine = new ContinuousLearningEngine({
    learningQueue: null as any,
    insightEngine: null as any,
    retrainingPipeline: null as any,
    modelRegistry: null as any,
    learningConfig: {
        batchSize: 100,
        batchInterval: 300000, // 5 minutes
        processingConcurrency: 5,
        retrainingTriggers: []
    }
});
/**
 * POST /api/ai-dual-system/learning/events
 * Record a learning event
 */
export async function POST(request: NextRequest) {
    const traceId = `learn_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    try {
        const body = await request.json();
        const { type, sourceId, sourceType, data, impact } = body;
        // Validate required fields
        if (!type || !sourceId || !sourceType || !data || !impact) {
            return NextResponse.json({ error: 'Missing required fields: type, sourceId, sourceType, data, impact' }, { status: 400 });
        }
        // Validate impact structure
        if (typeof impact.score !== 'number' || impact.score < -1 || impact.score > 1) {
            return NextResponse.json({ error: 'Impact score must be a number between -1 and 1' }, { status: 400 });
        }
        logger.info('Recording learning event', {
            traceId,
            type,
            sourceId,
            sourceType,
            impactScore: impact.score
        });
        const learningEvent: LearningEvent = {
            id: `event_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            type,
            sourceId,
            sourceType,
            data: data as LearningData,
            impact: impact as LearningImpact,
            timestamp: new Date()
        };
        await learningEngine.recordEvent(learningEvent);
        logger.info('Learning event recorded', {
            traceId,
            eventId: learningEvent.id,
            type
        });
        metrics.record('learning_event_recorded', {
            type,
            sourceType,
            impactScore: impact.score
        });
        return NextResponse.json({
            success: true,
            data: {
                eventId: learningEvent.id,
                recordedAt: learningEvent.timestamp.toISOString()
            },
            metadata: {
                traceId
            }
        });
    }
    catch (error) {
        logger.error('Failed to record learning event', {
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
 * GET /api/ai-dual-system/learning/insights
 * Get current learning insights
 */
export async function GET(request: NextRequest) {
    const traceId = `insights_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    try {
        logger.info('Fetching learning insights', {
            traceId
        });
        const insights = await learningEngine.getInsights();
        logger.info('Learning insights fetched', {
            traceId,
            count: insights.length
        });
        return NextResponse.json({
            success: true,
            data: {
                insights: insights.map(insight => ({
                    id: insight.id,
                    type: insight.type,
                    description: insight.description,
                    impact: insight.impact,
                    confidence: insight.confidence,
                    recommendations: insight.recommendations,
                    evidence: insight.evidence
                })),
                total: insights.length,
                summary: {
                    highImpact: insights.filter(i => i.impact === 'high').length,
                    mediumImpact: insights.filter(i => i.impact === 'medium').length,
                    lowImpact: insights.filter(i => i.impact === 'low').length,
                    avgConfidence: insights.reduce((sum, i) => sum + i.confidence, 0) / insights.length
                }
            },
            metadata: {
                traceId
            }
        });
    }
    catch (error) {
        logger.error('Failed to fetch learning insights', {
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
 * POST /api/ai-dual-system/learning/retrain
 * Trigger model retraining
 */
export async function PUT(request: NextRequest) {
    const traceId = `retrain_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    try {
        const body = await request.json();
        const { targetModel, options } = body;
        if (!targetModel) {
            return NextResponse.json({ error: 'Missing targetModel' }, { status: 400 });
        }
        logger.info('Triggering model retraining', {
            traceId,
            targetModel,
            options
        });
        const retrainingOptions: RetrainingOptions = {
            dataSource: options?.dataSource,
            validationSplit: options?.validationSplit || 0.2,
            epochs: options?.epochs || 3,
            priority: options?.priority || 'normal'
        };
        await learningEngine.triggerRetraining(targetModel, retrainingOptions);
        logger.info('Model retraining triggered', {
            traceId,
            targetModel,
            priority: retrainingOptions.priority
        });
        metrics.record('retraining_triggered', {
            model: targetModel,
            priority: retrainingOptions.priority,
            source: 'api'
        });
        return NextResponse.json({
            success: true,
            data: {
                targetModel,
                triggeredAt: new Date().toISOString(),
                options: retrainingOptions
            },
            metadata: {
                traceId
            }
        });
    }
    catch (error) {
        logger.error('Failed to trigger retraining', {
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
 * POST /api/ai-dual-system/learning/process-batch
 * Manually trigger learning batch processing
 */
export async function PATCH(request: NextRequest) {
    const traceId = `batch_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    try {
        logger.info('Triggering manual learning batch processing', {
            traceId
        });
        const result = await learningEngine.processLearningBatch();
        logger.info('Learning batch processing completed', {
            traceId,
            processed: result.processed,
            insights: result.insights,
            errors: result.errors,
            duration: result.duration
        });
        metrics.record('learning_batch_manual', {
            processed: result.processed,
            insights: result.insights,
            errors: result.errors,
            duration: result.duration
        });
        return NextResponse.json({
            success: true,
            data: {
                processed: result.processed,
                insights: result.insights,
                errors: result.errors,
                duration: result.duration,
                nextBatch: result.nextBatch?.toISOString()
            },
            metadata: {
                traceId
            }
        });
    }
    catch (error) {
        logger.error('Failed to process learning batch', {
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
 * GET /api/ai-dual-system/learning/metrics
 * Get learning system metrics
 */
export async function HEAD(request: NextRequest) {
    const traceId = `metrics_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    try {
        logger.info('Fetching learning metrics', {
            traceId
        });
        const learningMetrics = await learningEngine.getMetrics();
        logger.info('Learning metrics fetched', {
            traceId,
            totalEvents: learningMetrics.totalEvents
        });
        return NextResponse.json({
            success: true,
            data: {
                metrics: learningMetrics,
                systemStatus: {
                    processingRate: learningMetrics.processedEvents / learningMetrics.totalEvents,
                    pendingBacklog: learningMetrics.pendingEvents,
                    avgImpact: learningMetrics.averageImpactScore,
                    lastUpdate: new Date().toISOString()
                }
            },
            metadata: {
                traceId
            }
        });
    }
    catch (error) {
        logger.error('Failed to fetch learning metrics', {
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
