/**
 * B1 Validator API Routes
 * Direct access to the B1 Validator component
 */
import { NextRequest, NextResponse } from 'next/server';
import { B1Validator } from "@ioc/shared/data-access/ai-dual-system/core/b1-validator";
import { ValidationRequest } from "@ioc/shared/data-access/ai-dual-system/core/interfaces";
import { logger } from "@ioc/shared/data-access/ai-dual-system/utils/logger";
import { metrics } from "@ioc/shared/data-access/ai-dual-system/utils/metrics";
// Initialize B1 Validator
const b1Validator = new B1Validator({
    validationRules: [
        {
            id: 'no_harmful_content',
            name: 'No Harmful Content',
            description: 'Detect harmful or offensive content',
            type: 'ethical',
            condition: 'content.contains_harmful_keywords()',
            severity: 'critical',
            active: true
        },
        {
            id: 'bias_detection',
            name: 'Bias Detection',
            description: 'Detect various forms of bias',
            type: 'bias',
            condition: 'content.has_bias()',
            severity: 'high',
            active: true
        },
        {
            id: 'quality_check',
            name: 'Quality Check',
            description: 'Ensure content meets quality standards',
            type: 'quality',
            condition: 'content.quality_score() >= 0.7',
            severity: 'medium',
            active: true
        }
    ],
    modelConfig: {
        provider: 'anthropic',
        model: 'claude-3-opus-20240229',
        temperature: 0.1
    },
    ethicalGuidelines: [
        {
            id: 'respect_autonomy',
            name: 'Respect for Autonomy',
            description: 'Respect individual autonomy and decision-making',
            category: 'autonomy',
            severity: 'critical'
        },
        {
            id: 'do_no_harm',
            name: 'Do No Harm',
            description: 'Avoid causing harm to individuals or groups',
            category: 'beneficence',
            severity: 'critical'
        }
    ],
    biasDetectors: [
        {
            id: 'gender_bias',
            name: 'Gender Bias Detector',
            type: 'gender',
            detect: async (content: any, context: any) => ({
                detected: false,
                type: 'gender',
                severity: 'low' as const,
                description: 'No gender bias detected',
                evidence: [],
                mitigation: 'No action needed'
            })
        }
    ],
    complianceRules: [
        {
            id: 'privacy_protection',
            name: 'Privacy Protection',
            description: 'Ensure content respects privacy guidelines',
            regulation: 'GDPR',
            severity: 'high'
        }
    ],
    providers: {
        anthropic: { apiKey: process.env.ANTHROPIC_API_KEY! }
    }
});
/**
 * POST /api/ai-dual-system/validate
 * Validate content using B1 Validator
 */
export async function POST(request: NextRequest) {
    const traceId = `val_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const startTime = Date.now();
    try {
        const body = await request.json();
        const { generationId, content, contentType, context, urgency } = body;
        // Validate required fields
        if (!generationId || !content || !contentType) {
            return NextResponse.json({ error: 'Missing required fields: generationId, content, contentType' }, { status: 400 });
        }
        logger.info('Validation request started', {
            traceId,
            generationId,
            contentType,
            urgency: urgency || false
        });
        // Create validation request
        const validationRequest: ValidationRequest = {
            id: traceId,
            generationId,
            content,
            contentType,
            context: context || {},
            urgency: urgency || false
        };
        // Validate content
        const result = await b1Validator.validate(validationRequest);
        const duration = Date.now() - startTime;
        logger.info('Validation completed', {
            traceId,
            generationId,
            status: result.status,
            issueCount: result.issues.length,
            overallScore: result.scores.overall,
            duration
        });
        return NextResponse.json({
            success: true,
            data: {
                requestId: result.requestId,
                status: result.status,
                issues: result.issues,
                suggestions: result.suggestions,
                scores: result.scores,
                metadata: result.metadata,
                processingTime: result.processingTime
            },
            metadata: {
                traceId,
                duration
            }
        });
    }
    catch (error) {
        const duration = Date.now() - startTime;
        logger.error('Validation failed', {
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
 * POST /api/ai-dual-system/validate/batch
 * Validate multiple pieces of content in batch
 */
export async function PUT(request: NextRequest) {
    const batchId = `vbatch_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const startTime = Date.now();
    try {
        const body = await request.json();
        const { requests } = body;
        if (!Array.isArray(requests) || requests.length === 0) {
            return NextResponse.json({ error: 'Requests must be a non-empty array' }, { status: 400 });
        }
        logger.info('Batch validation started', {
            batchId,
            requestCount: requests.length
        });
        // Convert to ValidationRequest objects
        const validationRequests: ValidationRequest[] = requests.map((req, index) => ({
            id: `${batchId}_${index}`,
            generationId: req.generationId,
            content: req.content,
            contentType: req.contentType,
            context: req.context || {},
            urgency: req.urgency || false
        }));
        // Execute batch validation
        const results = await b1Validator.validateBatch(validationRequests);
        const duration = Date.now() - startTime;
        logger.info('Batch validation completed', {
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
                    status: result.status,
                    issues: result.issues,
                    suggestions: result.suggestions,
                    scores: result.scores,
                    metadata: result.metadata,
                    processingTime: result.processingTime
                })),
                summary: {
                    total: requests.length,
                    successful: results.length,
                    failed: requests.length - results.length,
                    approvals: results.filter(r => r.status === 'approved').length,
                    rejections: results.filter(r => r.status === 'rejected').length,
                    modifications: results.filter(r => r.status === 'modified').length,
                    escalations: results.filter(r => r.status === 'escalated').length
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
        logger.error('Batch validation failed', {
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
 * GET /api/ai-dual-system/validate
 * Get B1 Validator status and configuration
 */
export async function GET(request: NextRequest) {
    try {
        const [rules, health] = await Promise.all([
            b1Validator.getValidationRules(),
            b1Validator.getHealth()
        ]);
        return NextResponse.json({
            success: true,
            data: {
                activeRules: rules.length,
                rules: rules.map(rule => ({
                    id: rule.id,
                    name: rule.name,
                    type: rule.type,
                    severity: rule.severity,
                    active: rule.active
                })),
                health,
                timestamp: new Date().toISOString()
            }
        });
    }
    catch (error) {
        logger.error('Validator status check failed', {
            error: error.message
        });
        return NextResponse.json({
            success: false,
            error: 'Validator status check failed'
        }, { status: 503 });
    }
}
/**
 * PUT /api/ai-dual-system/validate/rules
 * Update validation rules
 */
export async function PATCH(request: NextRequest) {
    const traceId = `rules_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    try {
        const body = await request.json();
        const { rules } = body;
        if (!Array.isArray(rules)) {
            return NextResponse.json({ error: 'Rules must be an array' }, { status: 400 });
        }
        logger.info('Updating validation rules', {
            traceId,
            ruleCount: rules.length
        });
        await b1Validator.updateRules(rules);
        logger.info('Validation rules updated', {
            traceId,
            ruleCount: rules.length
        });
        return NextResponse.json({
            success: true,
            data: {
                updated: rules.length,
                timestamp: new Date().toISOString()
            },
            metadata: {
                traceId
            }
        });
    }
    catch (error) {
        logger.error('Failed to update validation rules', {
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
