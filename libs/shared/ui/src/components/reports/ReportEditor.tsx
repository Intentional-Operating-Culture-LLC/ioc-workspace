'use client';

import React, { useState, useEffect } from 'react';
import { 
  DocumentTextIcon, 
  ChartBarIcon, 
  TableCellsIcon,
  LightBulbIcon,
  ExclamationTriangleIcon,
  ArrowLeftIcon,
  SaveIcon,
  EyeIcon,
  SparklesIcon
} from '@heroicons/react/24/outline';
import { WorkflowManager } from './WorkflowManager';

interface Section {
  id: string;
  type: string;
  title: string;
  content: any;
  editable: boolean;
}

interface ReportEditorProps {
  report: any;
  organizationId: string;
  user: any;
  onSave: (report: any) => void;
  onCancel: () => void;
}

export function ReportEditor({ report, organizationId, user, onSave, onCancel }: ReportEditorProps) {
  const [sections, setSections] = useState<Section[]>([]);
  const [activeSection, setActiveSection] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  const [showWorkflow, setShowWorkflow] = useState(false);

  useEffect(() => {
    initializeSections();
  }, [report]);

  const initializeSections = () => {
    if (report.content && report.content.sections) {
      const sectionsList = Object.entries(report.content.sections).map(([id, content]: [string, any]) => ({
        id,
        type: content.type || 'text',
        title: getSectionTitle(id, content),
        content,
        editable: !content.generated_at || content.type === 'text'
      }));
      setSections(sectionsList);
      if (sectionsList.length > 0) {
        setActiveSection(sectionsList[0].id);
      }
    }
  };

  const getSectionTitle = (id: string, content: any) => {
    if (content.title) return content.title;
    
    switch (content.type) {
      case 'executive_summary':
        return 'Executive Summary';
      case 'metrics_dashboard':
        return 'Key Metrics';
      case 'trend_analysis':
        return 'Trend Analysis';
      case 'performance_insights':
        return 'Performance Insights';
      case 'alerts_warnings':
        return 'Alerts & Warnings';
      case 'recommendations':
        return 'Recommendations';
      case 'detailed_analytics':
        return 'Detailed Analytics';
      case 'user_activity':
        return 'User Activity';
      case 'assessment_summary':
        return 'Assessment Summary';
      default:
        return id.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
    }
  };

  const getSectionIcon = (type: string) => {
    switch (type) {
      case 'metrics_dashboard':
      case 'detailed_analytics':
        return ChartBarIcon;
      case 'executive_summary':
      case 'text':
        return DocumentTextIcon;
      case 'table':
      case 'user_activity':
      case 'assessment_summary':
        return TableCellsIcon;
      case 'performance_insights':
      case 'recommendations':
        return LightBulbIcon;
      case 'alerts_warnings':
        return ExclamationTriangleIcon;
      default:
        return DocumentTextIcon;
    }
  };

  const updateSectionContent = (sectionId: string, newContent: any) => {
    setSections(sections.map(section => 
      section.id === sectionId 
        ? { ...section, content: { ...section.content, ...newContent } }
        : section
    ));
    setHasChanges(true);
  };

  const saveReport = async () => {
    setLoading(true);
    try {
      // Reconstruct the report content
      const updatedContent = {
        ...report.content,
        sections: sections.reduce((acc, section) => {
          acc[section.id] = section.content;
          return acc;
        }, {} as any)
      };

      const response = await fetch(`/api/reports/${report.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          organizationId,
          content: updatedContent
        })
      });

      if (response.ok) {
        const data = await response.json();
        setHasChanges(false);
        onSave(data.report);
      }
    } catch (error) {
      console.error('Error saving report:', error);
    } finally {
      setLoading(false);
    }
  };

  const regenerateSection = async (sectionId: string) => {
    setLoading(true);
    try {
      const response = await fetch('/api/reports/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          reportId: report.id,
          organizationId,
          sectionId,
          force: true
        })
      });

      if (response.ok) {
        const data = await response.json();
        // Update the specific section
        if (data.report?.content?.sections?.[sectionId]) {
          updateSectionContent(sectionId, data.report.content.sections[sectionId]);
        }
      }
    } catch (error) {
      console.error('Error regenerating section:', error);
    } finally {
      setLoading(false);
    }
  };

  const activeContentSection = sections.find(s => s.id === activeSection);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center">
              <button
                onClick={onCancel}
                className="mr-4 p-2 text-gray-400 hover:text-gray-600"
              >
                <ArrowLeftIcon className="h-5 w-5" />
              </button>
              <div>
                <h1 className="text-xl font-semibold text-gray-900">{report.title}</h1>
                <p className="text-sm text-gray-500">
                  {report.report_period_start} - {report.report_period_end}
                </p>
              </div>
            </div>
            <div className="flex items-center space-x-3">
              <button
                onClick={() => setShowWorkflow(true)}
                className="btn-secondary"
              >
                <DocumentTextIcon className="h-5 w-5 mr-2" />
                Workflow
              </button>
              <button
                onClick={saveReport}
                disabled={!hasChanges || loading}
                className="btn-primary"
              >
                <SaveIcon className="h-5 w-5 mr-2" />
                {loading ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Sidebar - Section Navigation */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-lg shadow-sm">
              <div className="p-4 border-b">
                <h3 className="text-lg font-medium text-gray-900">Sections</h3>
              </div>
              <nav className="space-y-1 p-2">
                {sections.map((section) => {
                  const Icon = getSectionIcon(section.type);
                  return (
                    <button
                      key={section.id}
                      onClick={() => setActiveSection(section.id)}
                      className={`w-full flex items-center px-3 py-2 text-sm font-medium rounded-md ${
                        activeSection === section.id
                          ? 'bg-indigo-100 text-indigo-700'
                          : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                      }`}
                    >
                      <Icon className="h-5 w-5 mr-3" />
                      <span className="truncate">{section.title}</span>
                    </button>
                  );
                })}
              </nav>
            </div>
          </div>

          {/* Main Content - Section Editor */}
          <div className="lg:col-span-3">
            {activeContentSection ? (
              <div className="bg-white rounded-lg shadow-sm">
                <div className="p-6 border-b">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center">
                      {React.createElement(getSectionIcon(activeContentSection.type), {
                        className: "h-6 w-6 mr-3 text-indigo-600"
                      })}
                      <h2 className="text-xl font-semibold text-gray-900">
                        {activeContentSection.title}
                      </h2>
                    </div>
                    <div className="flex items-center space-x-2">
                      {!activeContentSection.editable && (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                          Auto-generated
                        </span>
                      )}
                      <button
                        onClick={() => regenerateSection(activeContentSection.id)}
                        className="btn-secondary text-sm"
                        disabled={loading}
                      >
                        <SparklesIcon className="h-4 w-4 mr-1" />
                        Regenerate
                      </button>
                    </div>
                  </div>
                </div>

                <div className="p-6">
                  <SectionEditor
                    section={activeContentSection}
                    onUpdate={(content) => updateSectionContent(activeContentSection.id, content)}
                    editable={activeContentSection.editable}
                    loading={loading}
                  />
                </div>
              </div>
            ) : (
              <div className="bg-white rounded-lg shadow-sm p-6 text-center">
                <DocumentTextIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No Section Selected</h3>
                <p className="text-gray-600">Select a section from the sidebar to edit</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Workflow Modal */}
      {showWorkflow && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-10 mx-auto p-5 border max-w-4xl shadow-lg rounded-md bg-white">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-medium text-gray-900">Editorial Workflow</h3>
              <button
                onClick={() => setShowWorkflow(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                ×
              </button>
            </div>
            <WorkflowManager
              reportId={report.id}
              organizationId={organizationId}
              user={user}
            />
          </div>
        </div>
      )}
    </div>
  );
}

interface SectionEditorProps {
  section: Section;
  onUpdate: (content: any) => void;
  editable: boolean;
  loading: boolean;
}

function SectionEditor({ section, onUpdate, editable, loading }: SectionEditorProps) {
  const renderSectionContent = () => {
    switch (section.type) {
      case 'executive_summary':
        return (
          <ExecutiveSummaryEditor
            content={section.content}
            onUpdate={onUpdate}
            editable={editable}
          />
        );
      
      case 'metrics_dashboard':
        return (
          <MetricsDashboardEditor
            content={section.content}
            onUpdate={onUpdate}
            editable={editable}
          />
        );
      
      case 'text':
        return (
          <TextEditor
            content={section.content}
            onUpdate={onUpdate}
            editable={editable}
          />
        );
      
      case 'alerts_warnings':
        return (
          <AlertsEditor
            content={section.content}
            onUpdate={onUpdate}
            editable={editable}
          />
        );
      
      default:
        return (
          <GenericSectionEditor
            content={section.content}
            onUpdate={onUpdate}
            editable={editable}
          />
        );
    }
  };

  if (loading) {
    return (
      <div className="text-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mx-auto"></div>
        <p className="text-gray-600 mt-4">Updating section...</p>
      </div>
    );
  }

  return renderSectionContent();
}

// Executive Summary Editor
function ExecutiveSummaryEditor({ content, onUpdate, editable }: any) {
  const [narrative, setNarrative] = useState(content.narrative || '');

  const handleUpdate = (field: string, value: any) => {
    onUpdate({ [field]: value });
  };

  return (
    <div className="space-y-6">
      {/* Key Metrics Display */}
      <div>
        <h4 className="text-lg font-medium text-gray-900 mb-4">Key Metrics</h4>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {content.key_metrics && Object.entries(content.key_metrics).map(([key, value]: [string, any]) => (
            <div key={key} className="bg-gray-50 rounded-lg p-4">
              <p className="text-sm font-medium text-gray-600">
                {key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
              </p>
              <p className="text-2xl font-bold text-gray-900">{value}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Narrative */}
      <div>
        <h4 className="text-lg font-medium text-gray-900 mb-4">Executive Narrative</h4>
        {editable ? (
          <textarea
            value={narrative}
            onChange={(e) => {
              setNarrative(e.target.value);
              handleUpdate('narrative', e.target.value);
            }}
            className="w-full h-32 p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
            placeholder="Enter executive summary narrative..."
          />
        ) : (
          <div className="bg-gray-50 rounded-lg p-4">
            <p className="text-gray-900">{content.narrative}</p>
          </div>
        )}
      </div>

      {/* Highlights */}
      {content.highlights && content.highlights.length > 0 && (
        <div>
          <h4 className="text-lg font-medium text-gray-900 mb-4">Key Highlights</h4>
          <div className="space-y-3">
            {content.highlights.map((highlight: any, index: number) => (
              <div key={index} className={`p-4 rounded-lg border-l-4 ${
                highlight.type === 'positive' ? 'border-green-400 bg-green-50' :
                highlight.type === 'negative' ? 'border-red-400 bg-red-50' :
                'border-blue-400 bg-blue-50'
              }`}>
                <h5 className="font-medium text-gray-900">{highlight.title}</h5>
                <p className="text-gray-700 mt-1">{highlight.description}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// Metrics Dashboard Editor
function MetricsDashboardEditor({ content, onUpdate, editable }: any) {
  return (
    <div className="space-y-6">
      {/* Primary Metrics */}
      {content.primary_metrics && (
        <div>
          <h4 className="text-lg font-medium text-gray-900 mb-4">Primary Metrics</h4>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {content.primary_metrics.map((metric: any, index: number) => (
              <div key={index} className="bg-white border border-gray-200 rounded-lg p-6">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium text-gray-600">{metric.label}</p>
                  <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                    metric.trend === 'up' ? 'bg-green-100 text-green-800' :
                    metric.trend === 'down' ? 'bg-red-100 text-red-800' :
                    'bg-gray-100 text-gray-800'
                  }`}>
                    {metric.change > 0 ? '+' : ''}{metric.change.toFixed(1)}%
                  </span>
                </div>
                <p className="text-3xl font-bold text-gray-900 mt-2">
                  {metric.format === 'percentage' ? `${metric.value.toFixed(1)}%` : metric.value}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Secondary Metrics */}
      {content.secondary_metrics && (
        <div>
          <h4 className="text-lg font-medium text-gray-900 mb-4">Additional Metrics</h4>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {content.secondary_metrics.map((metric: any, index: number) => (
              <div key={index} className="bg-gray-50 rounded-lg p-4">
                <p className="text-sm font-medium text-gray-600">{metric.label}</p>
                <p className="text-xl font-bold text-gray-900">{metric.value}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Chart Data Preview */}
      {content.chart_data && (
        <div>
          <h4 className="text-lg font-medium text-gray-900 mb-4">Activity Chart</h4>
          <div className="bg-gray-50 rounded-lg p-4">
            <p className="text-sm text-gray-600">Chart data available - would render interactive chart here</p>
            <pre className="text-xs text-gray-500 mt-2 overflow-x-auto">
              {JSON.stringify(content.chart_data, null, 2)}
            </pre>
          </div>
        </div>
      )}
    </div>
  );
}

// Text Editor
function TextEditor({ content, onUpdate, editable }: any) {
  const [text, setText] = useState(content.content || '');

  const handleUpdate = () => {
    onUpdate({ content: text });
  };

  return (
    <div>
      {editable ? (
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          onBlur={handleUpdate}
          className="w-full h-64 p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
          placeholder="Enter content..."
        />
      ) : (
        <div className="bg-gray-50 rounded-lg p-4">
          <div className="prose max-w-none">
            {content.content?.split('\n').map((line: string, index: number) => (
              <p key={index} className="mb-2">{line}</p>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// Alerts Editor
function AlertsEditor({ content, onUpdate, editable }: any) {
  return (
    <div>
      <h4 className="text-lg font-medium text-gray-900 mb-4">Alerts & Warnings</h4>
      {content.alerts && content.alerts.length > 0 ? (
        <div className="space-y-3">
          {content.alerts.map((alert: any, index: number) => (
            <div key={index} className={`p-4 rounded-lg border-l-4 ${
              alert.severity === 'critical' ? 'border-red-400 bg-red-50' :
              alert.severity === 'warning' ? 'border-yellow-400 bg-yellow-50' :
              'border-blue-400 bg-blue-50'
            }`}>
              <div className="flex items-center justify-between">
                <h5 className="font-medium text-gray-900">{alert.title}</h5>
                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                  alert.severity === 'critical' ? 'bg-red-100 text-red-800' :
                  alert.severity === 'warning' ? 'bg-yellow-100 text-yellow-800' :
                  'bg-blue-100 text-blue-800'
                }`}>
                  {alert.severity}
                </span>
              </div>
              <p className="text-gray-700 mt-1">{alert.description}</p>
              {alert.metric_value && (
                <p className="text-sm text-gray-600 mt-2">
                  Current: {alert.metric_value} | Threshold: {alert.threshold_value}
                </p>
              )}
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-8 text-gray-500">
          No alerts or warnings for this period
        </div>
      )}
    </div>
  );
}

// Generic Section Editor
function GenericSectionEditor({ content, onUpdate, editable }: any) {
  return (
    <div>
      <h4 className="text-lg font-medium text-gray-900 mb-4">Section Content</h4>
      <div className="bg-gray-50 rounded-lg p-4">
        <pre className="text-sm text-gray-700 whitespace-pre-wrap overflow-x-auto">
          {JSON.stringify(content, null, 2)}
        </pre>
      </div>
      {editable && (
        <p className="text-sm text-gray-500 mt-2">
          This section type doesn't have a custom editor yet. Content is displayed as JSON.
        </p>
      )}
    </div>
  );
}