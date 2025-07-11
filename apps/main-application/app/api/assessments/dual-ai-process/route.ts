import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import AssessmentDualAIService from "@ioc/shared/data-access/src/ai-dual-system/services/assessment-dual-ai-service";
// Initialize the dual-AI service
const dualAIService = new AssessmentDualAIService(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, process.env.OPENAI_API_KEY!);
/**
 * POST /api/assessments/dual-ai-process
 * Process an assessment using the dual-AI workflow
 */
export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        // Validate request body
        const { responseId, options = {} } = body;
        if (!responseId) {
            return NextResponse.json({ error: 'Assessment response ID is required' }, { status: 400 });
        }
        // Get user context from headers (assuming auth middleware sets this)
        const userId = request.headers.get('x-user-id');
        const organizationId = request.headers.get('x-organization-id');
        if (!userId) {
            return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
        }
        // Get assessment details to determine context
        const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
        const { data: assessmentResponse, error: fetchError } = await supabase
            .from('assessment_responses')
            .select(`
        id,
        assessment:assessments!inner(
          id,
          type,
          title,
          settings,
          organization_id
        )
      `)
            .eq('id', responseId)
            .single();
        if (fetchError || !assessmentResponse) {
            return NextResponse.json({ error: 'Assessment response not found' }, { status: 404 });
        }
        // Check if user has access to this assessment
        if (assessmentResponse.assessment.organization_id !== organizationId) {
            return NextResponse.json({ error: 'Access denied to this assessment' }, { status: 403 });
        }
        // Determine assessment type and context
        const assessmentType = determineAssessmentType(assessmentResponse.assessment.type);
        const contextData = await buildContextData(assessmentResponse, body.contextData || {});
        // Prepare dual-AI request
        const dualAIRequest = {
            responseId,
            assessmentType,
            contextData,
            options: {
                confidenceThreshold: options.confidenceThreshold || 85,
                maxIterations: options.maxIterations || 3,
                reportStyle: options.reportStyle || 'standard'
            }
        };
        // Process with dual-AI workflow
        const result = await dualAIService.processAssessment(dualAIRequest);
        // Return results
        return NextResponse.json({
            success: true,
            data: {
                workflowId: result.workflowId,
                assessmentId: result.assessmentId,
                scores: result.finalScores.scores,
                interpretation: result.finalScores.interpretation,
                enhancedReport: result.enhancedReport,
                qualityMetrics: result.qualityMetrics
            },
            metadata: {
                processingTime: result.qualityMetrics.processingTime,
                iterations: result.qualityMetrics.iterationCount,
                confidence: result.qualityMetrics.overallConfidence,
                timestamp: new Date().toISOString()
            }
        });
    }
    catch (error) {
        console.error('Dual-AI processing error:', error);
        return NextResponse.json({
            error: 'Failed to process assessment with dual-AI workflow',
            details: process.env.NODE_ENV === 'development' ? error.message : undefined
        }, { status: 500 });
    }
}
/**
 * GET /api/assessments/dual-ai-process?workflowId=xxx
 * Get dual-AI workflow status and results
 */
export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const workflowId = searchParams.get('workflowId');
        if (!workflowId) {
            return NextResponse.json({ error: 'Workflow ID is required' }, { status: 400 });
        }
        const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
        // Get workflow details
        const { data: workflow, error: workflowError } = await supabase
            .from('assessment_ai_workflows')
            .select(`
        *,
        validation_nodes:assessment_validation_nodes(*),
        feedback:assessment_improvement_feedback(*),
        quality_metrics:assessment_ai_quality_metrics(*)
      `)
            .eq('id', workflowId)
            .single();
        if (workflowError || !workflow) {
            return NextResponse.json({ error: 'Workflow not found' }, { status: 404 });
        }
        // Calculate current progress
        const progress = calculateWorkflowProgress(workflow);
        return NextResponse.json({
            workflowId: workflow.id,
            status: workflow.status,
            progress,
            results: workflow.status === 'completed' ? {
                finalConfidence: workflow.final_confidence,
                iterations: workflow.iterations,
                processingTime: workflow.processing_time,
                qualityMetrics: workflow.quality_metrics[0] || null
            } : null,
            validationNodes: workflow.validation_nodes.map((node: any) => ({
                nodeId: node.node_id,
                nodeType: node.node_type,
                confidence: node.confidence_score,
                iteration: node.iteration,
                issues: node.validation_issues,
                suggestions: node.suggestions
            })),
            feedback: workflow.feedback.map((fb: any) => ({
                nodeId: fb.node_id,
                category: fb.feedback_category,
                severity: fb.severity,
                description: fb.issue_description,
                applied: fb.applied,
                confidenceImprovement: fb.confidence_after - fb.confidence_before
            }))
        });
    }
    catch (error) {
        console.error('Workflow status error:', error);
        return NextResponse.json({
            error: 'Failed to get workflow status',
            details: process.env.NODE_ENV === 'development' ? error.message : undefined
        }, { status: 500 });
    }
}
// Helper functions
function determineAssessmentType(type: string): 'individual' | 'executive' | 'organizational' {
    if (type.includes('executive') || type.includes('leadership')) {
        return 'executive';
    }
    if (type.includes('organization') || type.includes('culture') || type.includes('team')) {
        return 'organizational';
    }
    return 'individual';
}
async function buildContextData(assessmentResponse: any, userContextData: any) {
    // Extract context from assessment settings and user input
    const assessment = assessmentResponse.assessment;
    return {
        industry: userContextData.industry || assessment.settings?.industry,
        role: userContextData.role || assessment.settings?.targetRole,
        culturalContext: userContextData.culturalContext || assessment.settings?.culturalContext,
        targetAudience: determineTargetAudience(assessment.type, userContextData),
        assessmentTitle: assessment.title,
        assessmentType: assessment.type,
        organizationId: assessment.organization_id
    };
}
function determineTargetAudience(assessmentType: string, contextData: any): string {
    if (contextData.targetAudience) {
        return contextData.targetAudience;
    }
    if (assessmentType.includes('executive')) {
        return 'executives';
    }
    if (assessmentType.includes('manager')) {
        return 'managers';
    }
    if (assessmentType.includes('team')) {
        return 'team_members';
    }
    return 'individual';
}
function calculateWorkflowProgress(workflow: any) {
    const totalSteps = 4; // Generation, Validation, Improvement, Finalization
    let completedSteps = 0;
    if (workflow.a1_generation_id)
        completedSteps++;
    if (workflow.b1_validation_id)
        completedSteps++;
    if (workflow.iterations > 0)
        completedSteps++;
    if (workflow.status === 'completed')
        completedSteps = totalSteps;
    return {
        percentage: Math.round((completedSteps / totalSteps) * 100),
        currentStep: getCurrentStep(workflow.status, completedSteps),
        completedSteps,
        totalSteps
    };
}
function getCurrentStep(status: string, completedSteps: number): string {
    if (status === 'completed')
        return 'completed';
    if (status === 'failed')
        return 'failed';
    const steps = ['generating', 'validating', 'improving', 'finalizing'];
    return steps[completedSteps] || 'initializing';
}
