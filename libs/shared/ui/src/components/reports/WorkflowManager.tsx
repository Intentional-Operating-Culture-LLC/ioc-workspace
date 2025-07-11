'use client';

import React, { useState, useEffect } from 'react';
import { 
  CheckCircleIcon, 
  ClockIcon, 
  XCircleIcon,
  UserIcon,
  ChatBubbleLeftIcon,
  PlusIcon,
  ArrowRightIcon,
  ExclamationTriangleIcon
} from '@heroicons/react/24/outline';

interface WorkflowStep {
  id: string;
  step_name: string;
  step_type: string;
  status: 'pending' | 'in_progress' | 'completed' | 'rejected';
  assignee?: {
    id: string;
    full_name: string;
    email: string;
  };
  due_date?: string;
  completed_at?: string;
  notes?: string;
}

interface Comment {
  id: string;
  section_id?: string;
  comment_text: string;
  comment_type: string;
  is_resolved: boolean;
  created_at: string;
  user: {
    id: string;
    full_name: string;
    email: string;
  };
  resolved_by_user?: {
    id: string;
    full_name: string;
    email: string;
  };
  resolved_at?: string;
}

interface WorkflowManagerProps {
  reportId: string;
  organizationId: string;
  user: any;
}

export function WorkflowManager({ reportId, organizationId, user }: WorkflowManagerProps) {
  const [workflowSteps, setWorkflowSteps] = useState<WorkflowStep[]>([]);
  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'workflow' | 'comments'>('workflow');
  const [newComment, setNewComment] = useState({
    text: '',
    type: 'general',
    sectionId: ''
  });

  useEffect(() => {
    loadWorkflowData();
  }, [reportId]);

  const loadWorkflowData = async () => {
    try {
      const response = await fetch(`/api/reports/workflow?reportId=${reportId}&organizationId=${organizationId}`);
      if (response.ok) {
        const data = await response.json();
        setWorkflowSteps(data.workflow_steps || []);
        setComments(data.comments || []);
      }
    } catch (error) {
      console.error('Error loading workflow data:', error);
    } finally {
      setLoading(false);
    }
  };

  const advanceStep = async (stepId: string, notes?: string) => {
    try {
      const response = await fetch('/api/reports/workflow', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'advance_step',
          reportId,
          organizationId,
          stepId,
          notes
        })
      });

      if (response.ok) {
        loadWorkflowData();
      }
    } catch (error) {
      console.error('Error advancing step:', error);
    }
  };

  const rejectStep = async (stepId: string, notes: string) => {
    try {
      const response = await fetch('/api/reports/workflow', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'reject_step',
          reportId,
          organizationId,
          stepId,
          notes
        })
      });

      if (response.ok) {
        loadWorkflowData();
      }
    } catch (error) {
      console.error('Error rejecting step:', error);
    }
  };

  const addComment = async () => {
    if (!newComment.text.trim()) return;

    try {
      const response = await fetch('/api/reports/workflow', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'add_comment',
          reportId,
          organizationId,
          sectionId: newComment.sectionId || null,
          commentText: newComment.text,
          commentType: newComment.type
        })
      });

      if (response.ok) {
        setNewComment({ text: '', type: 'general', sectionId: '' });
        loadWorkflowData();
      }
    } catch (error) {
      console.error('Error adding comment:', error);
    }
  };

  const resolveComment = async (commentId: string) => {
    try {
      const response = await fetch('/api/reports/workflow', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'resolve_comment',
          reportId,
          organizationId,
          commentId
        })
      });

      if (response.ok) {
        loadWorkflowData();
      }
    } catch (error) {
      console.error('Error resolving comment:', error);
    }
  };

  const getStepIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircleIcon className="h-6 w-6 text-green-500" />;
      case 'in_progress':
        return <ClockIcon className="h-6 w-6 text-yellow-500" />;
      case 'rejected':
        return <XCircleIcon className="h-6 w-6 text-red-500" />;
      default:
        return <ClockIcon className="h-6 w-6 text-gray-400" />;
    }
  };

  const getStepColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'bg-green-50 border-green-200';
      case 'in_progress':
        return 'bg-yellow-50 border-yellow-200';
      case 'rejected':
        return 'bg-red-50 border-red-200';
      default:
        return 'bg-gray-50 border-gray-200';
    }
  };

  const canAdvanceStep = (step: WorkflowStep) => {
    return step.status === 'in_progress' && (
      !step.assignee || step.assignee.id === user.id
    );
  };

  const canRejectStep = (step: WorkflowStep) => {
    return step.status === 'in_progress' && step.step_type !== 'draft' && (
      !step.assignee || step.assignee.id === user.id
    );
  };

  if (loading) {
    return (
      <div className="text-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mx-auto"></div>
        <p className="text-gray-600 mt-4">Loading workflow...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          {[
            { id: 'workflow', name: 'Workflow', count: workflowSteps.length },
            { id: 'comments', name: 'Comments', count: comments.filter(c => !c.is_resolved).length }
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === tab.id
                  ? 'border-indigo-500 text-indigo-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              {tab.name}
              {tab.count > 0 && (
                <span className={`ml-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                  activeTab === tab.id
                    ? 'bg-indigo-100 text-indigo-600'
                    : 'bg-gray-100 text-gray-600'
                }`}>
                  {tab.count}
                </span>
              )}
            </button>
          ))}
        </nav>
      </div>

      {activeTab === 'workflow' && (
        <div className="space-y-4">
          <h3 className="text-lg font-medium text-gray-900">Editorial Workflow</h3>
          
          {/* Workflow Steps */}
          <div className="space-y-4">
            {workflowSteps.map((step, index) => (
              <div key={step.id} className={`border rounded-lg p-4 ${getStepColor(step.status)}`}>
                <div className="flex items-start justify-between">
                  <div className="flex items-start space-x-3">
                    <div className="flex-shrink-0">
                      {getStepIcon(step.status)}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center space-x-2">
                        <h4 className="text-sm font-medium text-gray-900">{step.step_name}</h4>
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          step.status === 'completed' ? 'bg-green-100 text-green-800' :
                          step.status === 'in_progress' ? 'bg-yellow-100 text-yellow-800' :
                          step.status === 'rejected' ? 'bg-red-100 text-red-800' :
                          'bg-gray-100 text-gray-800'
                        }`}>
                          {step.status.replace('_', ' ')}
                        </span>
                      </div>
                      
                      {step.assignee && (
                        <div className="flex items-center mt-1 text-sm text-gray-600">
                          <UserIcon className="h-4 w-4 mr-1" />
                          {step.assignee.full_name}
                        </div>
                      )}
                      
                      {step.due_date && (
                        <p className="text-sm text-gray-600 mt-1">
                          Due: {new Date(step.due_date).toLocaleDateString()}
                        </p>
                      )}
                      
                      {step.completed_at && (
                        <p className="text-sm text-gray-600 mt-1">
                          Completed: {new Date(step.completed_at).toLocaleDateString()}
                        </p>
                      )}
                      
                      {step.notes && (
                        <div className="mt-2 p-2 bg-white rounded border">
                          <p className="text-sm text-gray-700">{step.notes}</p>
                        </div>
                      )}
                    </div>
                  </div>
                  
                  {/* Action Buttons */}
                  <div className="flex items-center space-x-2">
                    {canAdvanceStep(step) && (
                      <button
                        onClick={() => advanceStep(step.id)}
                        className="btn-primary text-sm"
                      >
                        <ArrowRightIcon className="h-4 w-4 mr-1" />
                        Advance
                      </button>
                    )}
                    {canRejectStep(step) && (
                      <button
                        onClick={() => {
                          const notes = prompt('Rejection reason (optional):');
                          if (notes !== null) {
                            rejectStep(step.id, notes);
                          }
                        }}
                        className="btn-secondary text-sm text-red-600 hover:text-red-700"
                      >
                        <XCircleIcon className="h-4 w-4 mr-1" />
                        Reject
                      </button>
                    )}
                  </div>
                </div>
                
                {/* Progress Line */}
                {index < workflowSteps.length - 1 && (
                  <div className="ml-3 mt-4">
                    <div className={`w-px h-6 ${
                      step.status === 'completed' ? 'bg-green-300' : 'bg-gray-300'
                    }`}></div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {activeTab === 'comments' && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-medium text-gray-900">Comments & Feedback</h3>
          </div>

          {/* Add Comment Form */}
          <div className="bg-gray-50 rounded-lg p-4">
            <h4 className="text-sm font-medium text-gray-900 mb-3">Add Comment</h4>
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <select
                  value={newComment.type}
                  onChange={(e) => setNewComment({ ...newComment, type: e.target.value })}
                  className="input text-sm"
                >
                  <option value="general">General</option>
                  <option value="suggestion">Suggestion</option>
                  <option value="approval">Approval</option>
                  <option value="rejection">Rejection</option>
                </select>
                <input
                  type="text"
                  value={newComment.sectionId}
                  onChange={(e) => setNewComment({ ...newComment, sectionId: e.target.value })}
                  placeholder="Section ID (optional)"
                  className="input text-sm"
                />
              </div>
              <textarea
                value={newComment.text}
                onChange={(e) => setNewComment({ ...newComment, text: e.target.value })}
                placeholder="Enter your comment..."
                className="w-full h-20 p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-sm"
              />
              <div className="flex justify-end">
                <button
                  onClick={addComment}
                  disabled={!newComment.text.trim()}
                  className="btn-primary text-sm"
                >
                  <PlusIcon className="h-4 w-4 mr-1" />
                  Add Comment
                </button>
              </div>
            </div>
          </div>

          {/* Comments List */}
          <div className="space-y-4">
            {comments.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <ChatBubbleLeftIcon className="h-12 w-12 mx-auto mb-4 text-gray-400" />
                <p>No comments yet</p>
              </div>
            ) : (
              comments.map((comment) => (
                <div key={comment.id} className={`border rounded-lg p-4 ${
                  comment.is_resolved ? 'bg-gray-50 opacity-75' : 'bg-white'
                }`}>
                  <div className="flex items-start justify-between">
                    <div className="flex items-start space-x-3">
                      <div className="flex-shrink-0">
                        <div className="h-8 w-8 bg-indigo-100 rounded-full flex items-center justify-center">
                          <span className="text-sm font-medium text-indigo-600">
                            {comment.user.full_name.charAt(0)}
                          </span>
                        </div>
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center space-x-2">
                          <p className="text-sm font-medium text-gray-900">
                            {comment.user.full_name}
                          </p>
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                            comment.comment_type === 'approval' ? 'bg-green-100 text-green-800' :
                            comment.comment_type === 'rejection' ? 'bg-red-100 text-red-800' :
                            comment.comment_type === 'suggestion' ? 'bg-blue-100 text-blue-800' :
                            'bg-gray-100 text-gray-800'
                          }`}>
                            {comment.comment_type}
                          </span>
                          {comment.section_id && (
                            <span className="text-xs text-gray-500">
                              Section: {comment.section_id}
                            </span>
                          )}
                        </div>
                        <p className="text-sm text-gray-600 mt-1">
                          {new Date(comment.created_at).toLocaleString()}
                        </p>
                        <div className="mt-2">
                          <p className="text-sm text-gray-900">{comment.comment_text}</p>
                        </div>
                        {comment.is_resolved && comment.resolved_by_user && (
                          <div className="mt-2 p-2 bg-green-50 rounded border border-green-200">
                            <p className="text-xs text-green-700">
                              Resolved by {comment.resolved_by_user.full_name} on{' '}
                              {new Date(comment.resolved_at!).toLocaleDateString()}
                            </p>
                          </div>
                        )}
                      </div>
                    </div>
                    
                    {!comment.is_resolved && (
                      <button
                        onClick={() => resolveComment(comment.id)}
                        className="text-sm text-green-600 hover:text-green-700 font-medium"
                      >
                        Resolve
                      </button>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}