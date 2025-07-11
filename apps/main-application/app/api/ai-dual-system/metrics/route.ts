/**
 * Metrics and Monitoring API Routes
 * Provide system metrics, performance data, and health information
 */
import { NextRequest, NextResponse } from 'next/server';
import { metrics, getDashboardMetrics } from "@ioc/shared/data-access/ai-dual-system/utils/metrics";
import { logger } from "@ioc/shared/data-access/ai-dual-system/utils/logger";
/**
 * GET /api/ai-dual-system/metrics
 * Get comprehensive system metrics
 */
export async function GET(request: NextRequest) {
    const traceId = `metrics_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    try {
        const { searchParams } = new URL(request.url);
        const timeRangeHours = parseInt(searchParams.get('timeRange') || '24');
        const metricType = searchParams.get('type') || 'dashboard';
        logger.info('Fetching system metrics', {
            traceId,
            timeRangeHours,
            metricType
        });
        let responseData;
        switch (metricType) {
            case 'dashboard':
                responseData = getDashboardMetrics(timeRangeHours);
                break;
            case 'raw':
                const timeRange = {
                    start: Date.now() - (timeRangeHours * 60 * 60 * 1000),
                    end: Date.now()
                };
                responseData = {
                    metrics: metrics.getMetrics(undefined, timeRange),
                    timeRange
                };
                break;
            case 'performance':
                responseData = {
                    generation: {
                        avgDuration: metrics.getAggregatedMetrics('generation_duration', 'avg'),
                        p95Duration: metrics.getAggregatedMetrics('generation_duration', 'p95'),
                        p99Duration: metrics.getAggregatedMetrics('generation_duration', 'p99'),
                        throughput: metrics.getAggregatedMetrics('generation_success', 'count') / timeRangeHours
                    },
                    validation: {
                        avgDuration: metrics.getAggregatedMetrics('validation_duration', 'avg'),
                        p95Duration: metrics.getAggregatedMetrics('validation_duration', 'p95'),
                        p99Duration: metrics.getAggregatedMetrics('validation_duration', 'p99'),
                        throughput: metrics.getAggregatedMetrics('validation_success', 'count') / timeRangeHours
                    },
                    system: {
                        errorRate: metrics.getAggregatedMetrics('generation_error', 'count') +
                            metrics.getAggregatedMetrics('validation_error', 'count'),
                        cacheHitRate: metrics.getAggregatedMetrics('cache_hit', 'count') /
                            (metrics.getAggregatedMetrics('cache_hit', 'count') +
                                metrics.getAggregatedMetrics('cache_miss', 'count'))
                    }
                };
                break;
            case 'quality':
                responseData = {
                    concordance: {
                        rate: (metrics.getAggregatedMetrics('validation_success', 'count') -
                            metrics.getAggregatedMetrics('disagreement_detected', 'count')) /
                            metrics.getAggregatedMetrics('validation_success', 'count'),
                        trend: 'stable' // Would calculate actual trend
                    },
                    confidence: {
                        generation: metrics.getAggregatedMetrics('generation_confidence', 'avg'),
                        validation: metrics.getAggregatedMetrics('validation_overall_score', 'avg')
                    },
                    quality: {
                        ethical: metrics.getAggregatedMetrics('validation_ethical_score', 'avg'),
                        bias: metrics.getAggregatedMetrics('validation_bias_score', 'avg'),
                        overall: metrics.getAggregatedMetrics('validation_quality_score', 'avg')
                    }
                };
                break;
            default:
                return NextResponse.json({ error: 'Invalid metric type. Use: dashboard, raw, performance, quality' }, { status: 400 });
        }
        logger.info('System metrics fetched', {
            traceId,
            metricType,
            timeRangeHours
        });
        return NextResponse.json({
            success: true,
            data: responseData,
            metadata: {
                traceId,
                timeRange: timeRangeHours,
                type: metricType,
                generatedAt: new Date().toISOString()
            }
        });
    }
    catch (error) {
        logger.error('Failed to fetch system metrics', {
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
 * POST /api/ai-dual-system/metrics
 * Record custom metrics
 */
export async function POST(request: NextRequest) {
    const traceId = `record_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    try {
        const body = await request.json();
        const { name, value, tags, type } = body;
        if (!name || typeof value !== 'number') {
            return NextResponse.json({ error: 'Missing required fields: name (string), value (number)' }, { status: 400 });
        }
        logger.info('Recording custom metric', {
            traceId,
            name,
            value,
            tags,
            type
        });
        // Record metric based on type
        switch (type) {
            case 'counter':
                metrics.increment(name, tags);
                break;
            case 'gauge':
                metrics.gauge(name, value, tags);
                break;
            case 'histogram':
                metrics.histogram(name, value, tags);
                break;
            default:
                metrics.record(name, value, tags);
        }
        logger.info('Custom metric recorded', {
            traceId,
            name,
            value
        });
        return NextResponse.json({
            success: true,
            data: {
                name,
                value,
                type: type || 'gauge',
                recordedAt: new Date().toISOString()
            },
            metadata: {
                traceId
            }
        });
    }
    catch (error) {
        logger.error('Failed to record custom metric', {
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
 * GET /api/ai-dual-system/metrics/health
 * Get system health status
 */
export async function HEAD(request: NextRequest) {
    const traceId = `health_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    try {
        logger.info('Checking system health', {
            traceId
        });
        // Get recent metrics to assess health
        const recentTimeRange = {
            start: Date.now() - (5 * 60 * 1000), // Last 5 minutes
            end: Date.now()
        };
        const recentErrors = metrics.getMetrics('.*_error', recentTimeRange).length;
        const recentRequests = metrics.getMetrics('.*_success', recentTimeRange).length;
        const errorRate = recentRequests > 0 ? recentErrors / recentRequests : 0;
        // Calculate health scores
        const healthScores = {
            errorRate: Math.max(0, 1 - (errorRate * 10)), // Penalize high error rates
            throughput: Math.min(1, recentRequests / 100), // Normalize to 100 requests baseline
            responseTime: Math.max(0, 1 - (metrics.getAggregatedMetrics('.*_duration', 'avg', recentTimeRange) / 5000)) // Penalize > 5s
        };
        const overallHealth = Object.values(healthScores).reduce((sum, score) => sum + score, 0) / 3;
        let status: 'healthy' | 'degraded' | 'unhealthy';
        if (overallHealth > 0.8)
            status = 'healthy';
        else if (overallHealth > 0.5)
            status = 'degraded';
        else
            status = 'unhealthy';
        const healthData = {
            status,
            overall: overallHealth,
            scores: healthScores,
            details: {
                errorRate,
                recentErrors,
                recentRequests,
                avgResponseTime: metrics.getAggregatedMetrics('.*_duration', 'avg', recentTimeRange)
            },
            recommendations: []
        };
        // Add recommendations based on health
        if (errorRate > 0.1) {
            healthData.recommendations.push('High error rate detected - investigate recent failures');
        }
        if (healthScores.responseTime < 0.5) {
            healthData.recommendations.push('Response times are high - consider scaling or optimization');
        }
        if (recentRequests < 10) {
            healthData.recommendations.push('Low request volume - system may be underutilized');
        }
        logger.info('System health checked', {
            traceId,
            status,
            overallHealth: Math.round(overallHealth * 100)
        });
        return NextResponse.json({
            success: true,
            data: healthData,
            metadata: {
                traceId,
                checkedAt: new Date().toISOString()
            }
        });
    }
    catch (error) {
        logger.error('Failed to check system health', {
            traceId,
            error: error.message
        });
        return NextResponse.json({
            success: false,
            error: error.message,
            data: {
                status: 'unhealthy',
                overall: 0,
                details: {
                    error: error.message
                }
            },
            metadata: {
                traceId
            }
        }, { status: 500 });
    }
}
/**
 * DELETE /api/ai-dual-system/metrics
 * Clear metrics (admin only)
 */
export async function DELETE(request: NextRequest) {
    const traceId = `clear_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    try {
        // In production, this would check admin authentication
        const { searchParams } = new URL(request.url);
        const confirm = searchParams.get('confirm');
        if (confirm !== 'true') {
            return NextResponse.json({ error: 'Must include confirm=true to clear metrics' }, { status: 400 });
        }
        logger.warn('Clearing all metrics', {
            traceId
        });
        await metrics.flush();
        logger.warn('All metrics cleared', {
            traceId
        });
        return NextResponse.json({
            success: true,
            data: {
                cleared: true,
                clearedAt: new Date().toISOString()
            },
            metadata: {
                traceId
            }
        });
    }
    catch (error) {
        logger.error('Failed to clear metrics', {
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
