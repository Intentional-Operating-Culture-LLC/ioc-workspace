/**
 * A1 Generator API Routes
 * Direct access to the A1 Generator component
 */
import { NextRequest, NextResponse } from 'next/server';
import { A1Generator } from "@ioc/shared/data-access/ai-dual-system/core/a1-generator";
import { GenerationRequest } from "@ioc/shared/data-access/ai-dual-system/core/interfaces";
import { logger } from "@ioc/shared/data-access/ai-dual-system/utils/logger";
import { metrics } from "@ioc/shared/data-access/ai-dual-system/utils/metrics";
// Initialize A1 Generator
const a1Generator = new A1Generator({
    modelConfigs: [
        ['assessment', { provider: 'openai', model: 'gpt-4-turbo', temperature: 0.7 }],
        ['report', { provider: 'openai', model: 'gpt-4-turbo', temperature: 0.6 }],
        ['coaching', { provider: 'anthropic', model: 'claude-3-opus-20240229', temperature: 0.8 }],
        ['insight', { provider: 'anthropic', model: 'claude-3-sonnet-20240229', temperature: 0.7 }],
        ['recommendation', { provider: 'openai', model: 'gpt-4-turbo', temperature: 0.6 }]
    ],
    promptTemplates: [
        ['assessment', 'Generate a comprehensive assessment based on the provided context...'],
        ['report', 'Create a detailed report analyzing the given data...'],
        ['coaching', 'Provide personalized coaching recommendations...'],
        ['insight', 'Generate actionable insights from the analysis...'],
        ['recommendation', 'Provide strategic recommendations based on findings...']
    ],
    capabilities: {
        supportedTypes: ['assessment', 'report', 'coaching', 'insight', 'recommendation'],
        maxTokens: 4096,
        languages: ['en', 'es', 'fr', 'de'],
        specializations: ['ocean_personality', 'leadership_development', 'team_dynamics'],
        rateLimit: {
            requestsPerMinute: 100,
            requestsPerHour: 1000,
            tokensPerMinute: 50000,
            concurrentRequests: 10
        }
    },
    providers: {
        openai: { apiKey: process.env.OPENAI_API_KEY! },
        anthropic: { apiKey: process.env.ANTHROPIC_API_KEY! }
    }
});
/**
 * POST /api/ai-dual-system/generate
 * Generate content using A1 Generator
 */
export async function POST(request: NextRequest) {
    const traceId = `gen_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const startTime = Date.now();
    try {
        const body = await request.json();
        const { userId, organizationId, type, context, options } = body;
        // Validate required fields
        if (!userId || !type || !context) {
            return NextResponse.json({ error: 'Missing required fields: userId, type, context' }, { status: 400 });
        }
        logger.info('Generation request started', {
            traceId,
            userId,
            type,
            contextSize: JSON.stringify(context).length
        });
        // Create generation request
        const generationRequest: GenerationRequest = {
            id: traceId,
            userId,
            organizationId: organizationId || 'default',
            type,
            context,
            options,
            timestamp: new Date()
        };
        // Generate content
        const result = await a1Generator.generate(generationRequest);
        const duration = Date.now() - startTime;
        logger.info('Generation completed', {
            traceId,
            type,
            confidence: result.metadata.confidence,
            duration
        });
        return NextResponse.json({
            success: true,
            data: {
                requestId: result.requestId,
                content: result.content,
                metadata: result.metadata,
                processingTime: result.processingTime,
                tokenUsage: result.tokenUsage
            },
            metadata: {
                traceId,
                duration
            }
        });
    }
    catch (error) {
        const duration = Date.now() - startTime;
        logger.error('Generation failed', {
            traceId,
            error: error.message,
            duration
        });
        return NextResponse.json({
            success: false,
            error: error.message,
            metadata: {
                traceId,
                duration
            }
        }, { status: 500 });
    }
}
/**
 * POST /api/ai-dual-system/generate/batch
 * Generate multiple pieces of content in batch
 */
export async function PUT(request: NextRequest) {
    const batchId = `batch_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const startTime = Date.now();
    try {
        const body = await request.json();
        const { requests } = body;
        if (!Array.isArray(requests) || requests.length === 0) {
            return NextResponse.json({ error: 'Requests must be a non-empty array' }, { status: 400 });
        }
        logger.info('Batch generation started', {
            batchId,
            requestCount: requests.length
        });
        // Convert to GenerationRequest objects
        const generationRequests: GenerationRequest[] = requests.map((req, index) => ({
            id: `${batchId}_${index}`,
            userId: req.userId,
            organizationId: req.organizationId || 'default',
            type: req.type,
            context: req.context,
            options: req.options,
            timestamp: new Date()
        }));
        // Execute batch generation
        const results = await a1Generator.generateBatch(generationRequests);
        const duration = Date.now() - startTime;
        logger.info('Batch generation completed', {
            batchId,
            total: requests.length,
            successful: results.length,
            duration
        });
        return NextResponse.json({
            success: true,
            data: {
                batchId,
                results: results.map(result => ({
                    requestId: result.requestId,
                    content: result.content,
                    metadata: result.metadata,
                    processingTime: result.processingTime,
                    tokenUsage: result.tokenUsage
                })),
                summary: {
                    total: requests.length,
                    successful: results.length,
                    failed: requests.length - results.length
                }
            },
            metadata: {
                batchId,
                duration
            }
        });
    }
    catch (error) {
        const duration = Date.now() - startTime;
        logger.error('Batch generation failed', {
            batchId,
            error: error.message,
            duration
        });
        return NextResponse.json({
            success: false,
            error: error.message,
            metadata: {
                batchId,
                duration
            }
        }, { status: 500 });
    }
}
/**
 * GET /api/ai-dual-system/generate
 * Get A1 Generator capabilities and health
 */
export async function GET(request: NextRequest) {
    try {
        const [capabilities, health] = await Promise.all([
            a1Generator.getCapabilities(),
            a1Generator.getHealth()
        ]);
        return NextResponse.json({
            success: true,
            data: {
                capabilities,
                health,
                timestamp: new Date().toISOString()
            }
        });
    }
    catch (error) {
        logger.error('Generator status check failed', {
            error: error.message
        });
        return NextResponse.json({
            success: false,
            error: 'Generator status check failed'
        }, { status: 503 });
    }
}
