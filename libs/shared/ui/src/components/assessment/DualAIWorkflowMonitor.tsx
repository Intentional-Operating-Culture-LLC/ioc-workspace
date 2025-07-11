/**
 * Dual-AI Workflow Monitor Component
 * Provides real-time monitoring and control of dual-AI assessment processing
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Progress } from '../ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import {
  CheckCircle,
  XCircle,
  Clock,
  AlertTriangle,
  RefreshCw,
  Brain,
  Shield,
  TrendingUp,
  Eye
} from 'lucide-react';

interface WorkflowNode {
  nodeId: string;
  nodeType: 'scoring' | 'insight' | 'recommendation' | 'context';
  confidence: number;
  iteration: number;
  issues: string[];
  suggestions: string[];
}

interface WorkflowFeedback {
  nodeId: string;
  category: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  applied: boolean;
  confidenceImprovement: number;
}

interface WorkflowStatus {
  workflowId: string;
  status: 'pending' | 'in_progress' | 'completed' | 'failed';
  progress: {
    percentage: number;
    currentStep: string;
    completedSteps: number;
    totalSteps: number;
  };
  results?: {
    finalConfidence: number;
    iterations: number;
    processingTime: number;
    qualityMetrics: any;
  };
  validationNodes: WorkflowNode[];
  feedback: WorkflowFeedback[];
}

interface DualAIWorkflowMonitorProps {
  responseId: string;
  onComplete?: (results: any) => void;
  onError?: (error: string) => void;
  autoStart?: boolean;
  options?: {
    confidenceThreshold?: number;
    maxIterations?: number;
    reportStyle?: 'standard' | 'executive' | 'coaching';
  };
}

export const DualAIWorkflowMonitor: React.FC<DualAIWorkflowMonitorProps> = ({
  responseId,
  onComplete,
  onError,
  autoStart = false,
  options = {}
}) => {
  const [workflowStatus, setWorkflowStatus] = useState<WorkflowStatus | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pollingInterval, setPollingInterval] = useState<NodeJS.Timeout | null>(null);

  // Start dual-AI processing
  const startProcessing = useCallback(async () => {
    setIsProcessing(true);
    setError(null);

    try {
      const response = await fetch('/api/assessments/dual-ai-process', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          responseId,
          options
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to start processing');
      }

      const result = await response.json();
      
      if (result.success) {
        // Start monitoring the workflow
        startPolling(result.data.workflowId);
      } else {
        throw new Error(result.error || 'Processing failed');
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      setError(errorMessage);
      setIsProcessing(false);
      onError?.(errorMessage);
    }
  }, [responseId, options, onError]);

  // Poll workflow status
  const startPolling = useCallback((workflowId: string) => {
    const poll = async () => {
      try {
        const response = await fetch(`/api/assessments/dual-ai-process?workflowId=${workflowId}`);
        
        if (!response.ok) {
          throw new Error('Failed to get workflow status');
        }

        const status: WorkflowStatus = await response.json();
        setWorkflowStatus(status);

        if (status.status === 'completed') {
          setIsProcessing(false);
          if (pollingInterval) {
            clearInterval(pollingInterval);
            setPollingInterval(null);
          }
          onComplete?.(status.results);
        } else if (status.status === 'failed') {
          setIsProcessing(false);
          if (pollingInterval) {
            clearInterval(pollingInterval);
            setPollingInterval(null);
          }
          const errorMsg = 'Workflow processing failed';
          setError(errorMsg);
          onError?.(errorMsg);
        }
      } catch (err) {
        console.error('Polling error:', err);
        // Continue polling on transient errors
      }
    };

    // Initial poll
    poll();

    // Set up polling interval
    const interval = setInterval(poll, 2000); // Poll every 2 seconds
    setPollingInterval(interval);

    return interval;
  }, [pollingInterval, onComplete, onError]);

  // Auto-start if enabled
  useEffect(() => {
    if (autoStart && !isProcessing && !workflowStatus) {
      startProcessing();
    }
  }, [autoStart, isProcessing, workflowStatus, startProcessing]);

  // Cleanup polling on unmount
  useEffect(() => {
    return () => {
      if (pollingInterval) {
        clearInterval(pollingInterval);
      }
    };
  }, [pollingInterval]);

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="h-5 w-5 text-green-500" />;
      case 'failed':
        return <XCircle className="h-5 w-5 text-red-500" />;
      case 'in_progress':
        return <RefreshCw className="h-5 w-5 text-blue-500 animate-spin" />;
      default:
        return <Clock className="h-5 w-5 text-gray-500" />;
    }
  };

  const getConfidenceBadge = (confidence: number) => {
    if (confidence >= 90) return <Badge variant="default" className="bg-green-500">Excellent</Badge>;
    if (confidence >= 85) return <Badge variant="default" className="bg-blue-500">Good</Badge>;
    if (confidence >= 70) return <Badge variant="secondary">Fair</Badge>;
    return <Badge variant="destructive">Needs Review</Badge>;
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return 'text-red-600';
      case 'high': return 'text-orange-600';
      case 'medium': return 'text-yellow-600';
      default: return 'text-blue-600';
    }
  };

  return (
    <div className="space-y-6">
      {/* Main Status Card */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Brain className="h-6 w-6 text-blue-500" />
              <CardTitle>Dual-AI Assessment Processing</CardTitle>
            </div>
            {workflowStatus && getStatusIcon(workflowStatus.status)}
          </div>
          <CardDescription>
            Advanced AI workflow for enhanced assessment quality and validation
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Controls */}
          {!isProcessing && !workflowStatus && (
            <Button onClick={startProcessing} className="w-full">
              <Brain className="h-4 w-4 mr-2" />
              Start Dual-AI Processing
            </Button>
          )}

          {error && (
            <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
              <div className="flex items-start">
                <XCircle className="h-5 w-5 text-red-500 mt-0.5 mr-2" />
                <p className="text-red-700 text-sm">{error}</p>
              </div>
            </div>
          )}

          {/* Progress */}
          {workflowStatus && (
            <div className="space-y-3">
              <div className="flex items-center justify-between text-sm">
                <span className="font-medium">Progress: {workflowStatus.progress.currentStep}</span>
                <span>{workflowStatus.progress.percentage}%</span>
              </div>
              <Progress value={workflowStatus.progress.percentage} className="h-2" />
              
              {workflowStatus.results && (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-4">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-blue-600">
                      {workflowStatus.results.finalConfidence}%
                    </div>
                    <div className="text-xs text-gray-500">Final Confidence</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-green-600">
                      {workflowStatus.results.iterations}
                    </div>
                    <div className="text-xs text-gray-500">Iterations</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-purple-600">
                      {Math.round(workflowStatus.results.processingTime / 1000)}s
                    </div>
                    <div className="text-xs text-gray-500">Processing Time</div>
                  </div>
                  <div className="text-center">
                    {getConfidenceBadge(workflowStatus.results.finalConfidence)}
                    <div className="text-xs text-gray-500 mt-1">Quality Rating</div>
                  </div>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Detailed Monitoring */}
      {workflowStatus && (
        <Tabs defaultValue="nodes" className="space-y-4">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="nodes" className="flex items-center space-x-2">
              <Eye className="h-4 w-4" />
              <span>Validation Nodes</span>
            </TabsTrigger>
            <TabsTrigger value="feedback" className="flex items-center space-x-2">
              <TrendingUp className="h-4 w-4" />
              <span>Improvements</span>
            </TabsTrigger>
            <TabsTrigger value="quality" className="flex items-center space-x-2">
              <Shield className="h-4 w-4" />
              <span>Quality Metrics</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="nodes" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Node-Level Validation</CardTitle>
                <CardDescription>
                  Individual component confidence scores and validation results
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {workflowStatus.validationNodes.map((node) => (
                    <div key={node.nodeId} className="border rounded-lg p-4">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center space-x-2">
                          <Badge variant="outline">{node.nodeType}</Badge>
                          <span className="font-medium">{node.nodeId}</span>
                        </div>
                        <div className="flex items-center space-x-2">
                          {getConfidenceBadge(node.confidence)}
                          <span className="text-sm text-gray-500">
                            {node.confidence}%
                          </span>
                        </div>
                      </div>
                      
                      {node.issues.length > 0 && (
                        <div className="mt-2">
                          <p className="text-sm font-medium text-gray-700 mb-1">Issues:</p>
                          <ul className="text-sm text-red-600 space-y-1">
                            {node.issues.map((issue, idx) => (
                              <li key={idx} className="flex items-start">
                                <AlertTriangle className="h-3 w-3 mt-0.5 mr-1 flex-shrink-0" />
                                {issue}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                      
                      {node.suggestions.length > 0 && (
                        <div className="mt-2">
                          <p className="text-sm font-medium text-gray-700 mb-1">Suggestions:</p>
                          <ul className="text-sm text-blue-600 space-y-1">
                            {node.suggestions.map((suggestion, idx) => (
                              <li key={idx} className="flex items-start">
                                <CheckCircle className="h-3 w-3 mt-0.5 mr-1 flex-shrink-0" />
                                {suggestion}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="feedback" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Iterative Improvements</CardTitle>
                <CardDescription>
                  Feedback-driven enhancements and confidence improvements
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {workflowStatus.feedback.map((feedback, idx) => (
                    <div key={idx} className="border rounded-lg p-4">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center space-x-2">
                          <Badge variant="outline">{feedback.nodeId}</Badge>
                          <Badge variant="secondary" className={getSeverityColor(feedback.severity)}>
                            {feedback.severity}
                          </Badge>
                        </div>
                        <div className="flex items-center space-x-2">
                          {feedback.applied ? (
                            <CheckCircle className="h-4 w-4 text-green-500" />
                          ) : (
                            <Clock className="h-4 w-4 text-gray-500" />
                          )}
                          {feedback.applied && feedback.confidenceImprovement > 0 && (
                            <span className="text-sm text-green-600 font-medium">
                              +{feedback.confidenceImprovement.toFixed(1)}%
                            </span>
                          )}
                        </div>
                      </div>
                      <p className="text-sm text-gray-700">{feedback.description}</p>
                    </div>
                  ))}
                  
                  {workflowStatus.feedback.length === 0 && (
                    <div className="text-center py-8 text-gray-500">
                      <CheckCircle className="h-12 w-12 mx-auto mb-2 text-green-500" />
                      <p>No improvements needed - all nodes passed validation!</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="quality" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Quality Assurance Metrics</CardTitle>
                <CardDescription>
                  Comprehensive quality assessment and validation statistics
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <h4 className="font-medium text-gray-900">Confidence Distribution</h4>
                    {workflowStatus.validationNodes.map((node) => (
                      <div key={node.nodeId} className="space-y-2">
                        <div className="flex justify-between text-sm">
                          <span>{node.nodeId}</span>
                          <span>{node.confidence}%</span>
                        </div>
                        <Progress value={node.confidence} className="h-2" />
                      </div>
                    ))}
                  </div>
                  
                  <div className="space-y-4">
                    <h4 className="font-medium text-gray-900">Quality Summary</h4>
                    <div className="space-y-3">
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600">Average Confidence</span>
                        <span className="text-sm font-medium">
                          {(workflowStatus.validationNodes.reduce((sum, node) => sum + node.confidence, 0) / workflowStatus.validationNodes.length).toFixed(1)}%
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600">Total Issues</span>
                        <span className="text-sm font-medium">
                          {workflowStatus.validationNodes.reduce((sum, node) => sum + node.issues.length, 0)}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600">Improvements Applied</span>
                        <span className="text-sm font-medium">
                          {workflowStatus.feedback.filter(f => f.applied).length}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600">Processing Steps</span>
                        <span className="text-sm font-medium">
                          {workflowStatus.progress.completedSteps} / {workflowStatus.progress.totalSteps}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
};

export default DualAIWorkflowMonitor;