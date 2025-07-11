'use client';

import React, { useState, useEffect } from 'react';
import { 
  ArrowLeftIcon,
  PencilIcon,
  ShareIcon,
  DocumentArrowDownIcon,
  PrinterIcon,
  EyeIcon,
  ChartBarIcon,
  TableCellsIcon,
  LightBulbIcon,
  ExclamationTriangleIcon,
  DocumentTextIcon,
  CalendarIcon,
  UserIcon
} from '@heroicons/react/24/outline';

interface ReportViewerProps {
  report: any;
  organizationId: string;
  user: any;
  onEdit: () => void;
  onClose: () => void;
}

export function ReportViewer({ report, organizationId, user, onEdit, onClose }: ReportViewerProps) {
  const [sections, setSections] = useState<any[]>([]);
  const [activeSection, setActiveSection] = useState<string>('');
  const [showShareModal, setShowShareModal] = useState(false);

  useEffect(() => {
    if (report.content && report.content.sections) {
      const sectionsList = Object.entries(report.content.sections).map(([id, content]: [string, any]) => ({
        id,
        type: content.type || 'text',
        title: getSectionTitle(id, content),
        content
      }));
      setSections(sectionsList);
      if (sectionsList.length > 0) {
        setActiveSection(sectionsList[0].id);
      }
    }
  }, [report]);

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

  const exportReport = (format: 'pdf' | 'html' | 'json') => {
    // Implementation would handle different export formats
    console.log(`Exporting report as ${format}`);
  };

  const shareReport = (method: 'email' | 'link') => {
    // Implementation would handle sharing
    console.log(`Sharing report via ${method}`);
    setShowShareModal(false);
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
                onClick={onClose}
                className="mr-4 p-2 text-gray-400 hover:text-gray-600"
              >
                <ArrowLeftIcon className="h-5 w-5" />
              </button>
              <div>
                <h1 className="text-xl font-semibold text-gray-900">{report.title}</h1>
                <div className="flex items-center space-x-4 text-sm text-gray-500">
                  <div className="flex items-center">
                    <CalendarIcon className="h-4 w-4 mr-1" />
                    {report.report_period_start} - {report.report_period_end}
                  </div>
                  <div className="flex items-center">
                    <UserIcon className="h-4 w-4 mr-1" />
                    {report.created_by_user?.full_name}
                  </div>
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                    report.status === 'published' ? 'bg-blue-100 text-blue-800' :
                    report.status === 'approved' ? 'bg-green-100 text-green-800' :
                    report.status === 'review' ? 'bg-yellow-100 text-yellow-800' :
                    'bg-gray-100 text-gray-800'
                  }`}>
                    {report.status}
                  </span>
                </div>
              </div>
            </div>
            <div className="flex items-center space-x-3">
              <button
                onClick={() => setShowShareModal(true)}
                className="btn-secondary"
              >
                <ShareIcon className="h-5 w-5 mr-2" />
                Share
              </button>
              <div className="relative group">
                <button className="btn-secondary">
                  <DocumentArrowDownIcon className="h-5 w-5 mr-2" />
                  Export
                </button>
                <div className="absolute right-0 top-full mt-1 w-48 bg-white rounded-md shadow-lg border border-gray-200 z-10 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200">
                  <div className="py-1">
                    <button
                      onClick={() => exportReport('pdf')}
                      className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                    >
                      Export as PDF
                    </button>
                    <button
                      onClick={() => exportReport('html')}
                      className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                    >
                      Export as HTML
                    </button>
                    <button
                      onClick={() => exportReport('json')}
                      className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                    >
                      Export as JSON
                    </button>
                  </div>
                </div>
              </div>
              <button onClick={onEdit} className="btn-primary">
                <PencilIcon className="h-5 w-5 mr-2" />
                Edit
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Sidebar - Section Navigation */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-lg shadow-sm sticky top-6">
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
                      className={`w-full flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors ${
                        activeSection === section.id
                          ? 'bg-indigo-100 text-indigo-700'
                          : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                      }`}
                    >
                      <Icon className="h-5 w-5 mr-3 flex-shrink-0" />
                      <span className="truncate">{section.title}</span>
                    </button>
                  );
                })}
              </nav>
            </div>
          </div>

          {/* Main Content - Section Viewer */}
          <div className="lg:col-span-3">
            {activeContentSection ? (
              <div className="bg-white rounded-lg shadow-sm">
                <div className="p-6 border-b">
                  <div className="flex items-center">
                    {React.createElement(getSectionIcon(activeContentSection.type), {
                      className: "h-6 w-6 mr-3 text-indigo-600"
                    })}
                    <h2 className="text-xl font-semibold text-gray-900">
                      {activeContentSection.title}
                    </h2>
                    {activeContentSection.content.generated_at && (
                      <span className="ml-auto text-sm text-gray-500">
                        Generated {new Date(activeContentSection.content.generated_at).toLocaleString()}
                      </span>
                    )}
                  </div>
                </div>

                <div className="p-6">
                  <SectionViewer section={activeContentSection} />
                </div>
              </div>
            ) : (
              <div className="bg-white rounded-lg shadow-sm p-6 text-center">
                <EyeIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No Section Selected</h3>
                <p className="text-gray-600">Select a section from the sidebar to view</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Share Modal */}
      {showShareModal && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
            <div className="mt-3">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Share Report</h3>
              <div className="space-y-3">
                <button
                  onClick={() => shareReport('email')}
                  className="w-full btn-secondary justify-center"
                >
                  Share via Email
                </button>
                <button
                  onClick={() => shareReport('link')}
                  className="w-full btn-secondary justify-center"
                >
                  Copy Share Link
                </button>
              </div>
              <div className="flex justify-end mt-6">
                <button
                  onClick={() => setShowShareModal(false)}
                  className="btn-secondary"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

interface SectionViewerProps {
  section: any;
}

function SectionViewer({ section }: SectionViewerProps) {
  const renderSectionContent = () => {
    switch (section.type) {
      case 'executive_summary':
        return <ExecutiveSummaryViewer content={section.content} />;
      
      case 'metrics_dashboard':
        return <MetricsDashboardViewer content={section.content} />;
      
      case 'trend_analysis':
        return <TrendAnalysisViewer content={section.content} />;
      
      case 'performance_insights':
        return <PerformanceInsightsViewer content={section.content} />;
      
      case 'alerts_warnings':
        return <AlertsWarningsViewer content={section.content} />;
      
      case 'recommendations':
        return <RecommendationsViewer content={section.content} />;
      
      case 'text':
        return <TextViewer content={section.content} />;
      
      case 'table':
        return <TableViewer content={section.content} />;
      
      default:
        return <GenericSectionViewer content={section.content} />;
    }
  };

  return renderSectionContent();
}

// Executive Summary Viewer
function ExecutiveSummaryViewer({ content }: any) {
  return (
    <div className="space-y-8">
      {/* Key Metrics */}
      {content.key_metrics && (
        <div>
          <h4 className="text-lg font-semibold text-gray-900 mb-6">Key Metrics</h4>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            {Object.entries(content.key_metrics).map(([key, value]: [string, any]) => (
              <div key={key} className="bg-gradient-to-br from-indigo-50 to-blue-50 rounded-xl p-6 border border-indigo-100">
                <p className="text-sm font-medium text-indigo-600 mb-2">
                  {key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                </p>
                <p className="text-3xl font-bold text-indigo-900">{value.toLocaleString()}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Executive Narrative */}
      {content.narrative && (
        <div>
          <h4 className="text-lg font-semibold text-gray-900 mb-4">Executive Summary</h4>
          <div className="prose max-w-none">
            <p className="text-gray-700 leading-relaxed text-lg">{content.narrative}</p>
          </div>
        </div>
      )}

      {/* Key Highlights */}
      {content.highlights && content.highlights.length > 0 && (
        <div>
          <h4 className="text-lg font-semibold text-gray-900 mb-6">Key Highlights</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {content.highlights.map((highlight: any, index: number) => (
              <div key={index} className={`rounded-xl p-6 border-l-4 ${
                highlight.type === 'positive' ? 'border-green-400 bg-green-50' :
                highlight.type === 'negative' ? 'border-red-400 bg-red-50' :
                'border-blue-400 bg-blue-50'
              }`}>
                <h5 className="font-semibold text-gray-900 mb-2">{highlight.title}</h5>
                <p className="text-gray-700">{highlight.description}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Trends Preview */}
      {content.trends && (
        <div>
          <h4 className="text-lg font-semibold text-gray-900 mb-4">Trend Overview</h4>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {Object.entries(content.trends).map(([key, value]: [string, any]) => (
              <div key={key} className="bg-gray-50 rounded-lg p-4">
                <p className="text-sm font-medium text-gray-600 mb-1">
                  {key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                </p>
                <div className="flex items-center">
                  <span className={`text-lg font-bold ${
                    value > 0 ? 'text-green-600' : value < 0 ? 'text-red-600' : 'text-gray-600'
                  }`}>
                    {value > 0 ? '+' : ''}{value.toFixed(1)}%
                  </span>
                  <span className={`ml-2 text-xs ${
                    value > 0 ? 'text-green-600' : value < 0 ? 'text-red-600' : 'text-gray-600'
                  }`}>
                    {value > 0 ? '↗' : value < 0 ? '↘' : '→'}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// Metrics Dashboard Viewer
function MetricsDashboardViewer({ content }: any) {
  return (
    <div className="space-y-8">
      {/* Primary Metrics */}
      {content.primary_metrics && (
        <div>
          <h4 className="text-lg font-semibold text-gray-900 mb-6">Primary Metrics</h4>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {content.primary_metrics.map((metric: any, index: number) => (
              <div key={index} className="bg-white border-2 border-gray-100 rounded-xl p-6 hover:border-indigo-200 transition-colors">
                <div className="flex items-center justify-between mb-4">
                  <p className="text-sm font-medium text-gray-600">{metric.label}</p>
                  <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${
                    metric.trend === 'up' ? 'bg-green-100 text-green-800' :
                    metric.trend === 'down' ? 'bg-red-100 text-red-800' :
                    'bg-gray-100 text-gray-800'
                  }`}>
                    {metric.change > 0 ? '+' : ''}{metric.change.toFixed(1)}%
                  </span>
                </div>
                <p className="text-4xl font-bold text-gray-900 mb-2">
                  {metric.format === 'percentage' ? `${metric.value.toFixed(1)}%` : metric.value.toLocaleString()}
                </p>
                <div className={`flex items-center text-sm ${
                  metric.trend === 'up' ? 'text-green-600' :
                  metric.trend === 'down' ? 'text-red-600' :
                  'text-gray-600'
                }`}>
                  <span className="mr-1">
                    {metric.trend === 'up' ? '↗' : metric.trend === 'down' ? '↘' : '→'}
                  </span>
                  vs previous period
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Secondary Metrics */}
      {content.secondary_metrics && (
        <div>
          <h4 className="text-lg font-semibold text-gray-900 mb-6">Additional Metrics</h4>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            {content.secondary_metrics.map((metric: any, index: number) => (
              <div key={index} className="bg-gray-50 rounded-lg p-4 text-center">
                <p className="text-sm font-medium text-gray-600 mb-2">{metric.label}</p>
                <p className="text-2xl font-bold text-gray-900">{metric.value.toLocaleString()}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Chart Data Visualization */}
      {content.chart_data && (
        <div>
          <h4 className="text-lg font-semibold text-gray-900 mb-6">Activity Trends</h4>
          <div className="bg-gray-50 rounded-lg p-6">
            <p className="text-center text-gray-600 mb-4">Interactive Chart Would Appear Here</p>
            <div className="h-64 flex items-center justify-center border-2 border-dashed border-gray-300 rounded">
              <ChartBarIcon className="h-16 w-16 text-gray-400" />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Alerts and Warnings Viewer
function AlertsWarningsViewer({ content }: any) {
  if (!content.alerts || content.alerts.length === 0) {
    return (
      <div className="text-center py-12">
        <ExclamationTriangleIcon className="h-16 w-16 text-green-400 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">All Clear!</h3>
        <p className="text-gray-600">No alerts or warnings for this period</p>
      </div>
    );
  }

  const alertsByType = content.alerts.reduce((acc: any, alert: any) => {
    if (!acc[alert.severity]) acc[alert.severity] = [];
    acc[alert.severity].push(alert);
    return acc;
  }, {});

  return (
    <div className="space-y-6">
      {/* Summary */}
      {content.summary && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-red-50 rounded-lg p-4 text-center">
            <p className="text-sm font-medium text-red-600">Critical</p>
            <p className="text-2xl font-bold text-red-900">{content.summary.critical || 0}</p>
          </div>
          <div className="bg-yellow-50 rounded-lg p-4 text-center">
            <p className="text-sm font-medium text-yellow-600">Warning</p>
            <p className="text-2xl font-bold text-yellow-900">{content.summary.warning || 0}</p>
          </div>
          <div className="bg-blue-50 rounded-lg p-4 text-center">
            <p className="text-sm font-medium text-blue-600">Info</p>
            <p className="text-2xl font-bold text-blue-900">{content.summary.info || 0}</p>
          </div>
          <div className="bg-gray-50 rounded-lg p-4 text-center">
            <p className="text-sm font-medium text-gray-600">Total</p>
            <p className="text-2xl font-bold text-gray-900">{content.summary.total_alerts || 0}</p>
          </div>
        </div>
      )}

      {/* Alerts by Severity */}
      {Object.entries(alertsByType).map(([severity, alerts]: [string, any]) => (
        <div key={severity}>
          <h4 className={`text-lg font-semibold mb-4 ${
            severity === 'critical' ? 'text-red-700' :
            severity === 'warning' ? 'text-yellow-700' :
            'text-blue-700'
          }`}>
            {severity.charAt(0).toUpperCase() + severity.slice(1)} Alerts
          </h4>
          <div className="space-y-3">
            {alerts.map((alert: any, index: number) => (
              <div key={index} className={`p-6 rounded-xl border-l-4 ${
                alert.severity === 'critical' ? 'border-red-400 bg-red-50' :
                alert.severity === 'warning' ? 'border-yellow-400 bg-yellow-50' :
                'border-blue-400 bg-blue-50'
              }`}>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <h5 className="font-semibold text-gray-900 mb-2">{alert.title}</h5>
                    <p className="text-gray-700 mb-3">{alert.description}</p>
                    {alert.metric_value && alert.threshold_value && (
                      <div className="flex items-center space-x-4 text-sm text-gray-600">
                        <span>Current: <strong>{alert.metric_value}</strong></span>
                        <span>Threshold: <strong>{alert.threshold_value}</strong></span>
                      </div>
                    )}
                  </div>
                  <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${
                    alert.severity === 'critical' ? 'bg-red-100 text-red-800' :
                    alert.severity === 'warning' ? 'bg-yellow-100 text-yellow-800' :
                    'bg-blue-100 text-blue-800'
                  }`}>
                    {alert.severity}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

// Performance Insights Viewer
function PerformanceInsightsViewer({ content }: any) {
  if (!content.insights || content.insights.length === 0) {
    return (
      <div className="text-center py-12">
        <LightBulbIcon className="h-16 w-16 text-gray-400 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">No Insights Available</h3>
        <p className="text-gray-600">No performance insights were generated for this period</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {content.insights.map((insight: any, index: number) => (
        <div key={index} className="bg-gradient-to-r from-indigo-50 to-blue-50 rounded-xl p-6 border border-indigo-100">
          <div className="flex items-start space-x-4">
            <div className="flex-shrink-0">
              <LightBulbIcon className="h-8 w-8 text-indigo-600" />
            </div>
            <div className="flex-1">
              <h5 className="font-semibold text-gray-900 mb-2">{insight.title}</h5>
              <p className="text-gray-700 mb-4">{insight.description}</p>
              {insight.recommendations && insight.recommendations.length > 0 && (
                <div>
                  <h6 className="font-medium text-gray-900 mb-2">Recommendations:</h6>
                  <ul className="space-y-1">
                    {insight.recommendations.map((rec: string, idx: number) => (
                      <li key={idx} className="text-sm text-gray-600 flex items-start">
                        <span className="text-indigo-500 mr-2">•</span>
                        {rec}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              {insight.severity && (
                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium mt-3 ${
                  insight.severity === 'high' ? 'bg-red-100 text-red-800' :
                  insight.severity === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                  'bg-green-100 text-green-800'
                }`}>
                  {insight.severity} priority
                </span>
              )}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

// Text Viewer
function TextViewer({ content }: any) {
  return (
    <div className="prose max-w-none">
      {content.content?.split('\n').map((line: string, index: number) => (
        <p key={index} className="mb-4 text-gray-700 leading-relaxed">{line}</p>
      ))}
    </div>
  );
}

// Table Viewer
function TableViewer({ content }: any) {
  if (!content.data || content.data.length === 0) {
    return (
      <div className="text-center py-12">
        <TableCellsIcon className="h-16 w-16 text-gray-400 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">No Data Available</h3>
        <p className="text-gray-600">No table data for this period</p>
      </div>
    );
  }

  const headers = content.headers || Object.keys(content.data[0] || {});

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-50">
          <tr>
            {headers.map((header: string, index: number) => (
              <th key={index} className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                {header.replace(/_/g, ' ')}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {content.data.map((row: any, index: number) => (
            <tr key={index} className="hover:bg-gray-50">
              {headers.map((header: string, cellIndex: number) => (
                <td key={cellIndex} className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  {row[header]}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// Recommendations Viewer
function RecommendationsViewer({ content }: any) {
  if (!content.recommendations || content.recommendations.length === 0) {
    return (
      <div className="text-center py-12">
        <LightBulbIcon className="h-16 w-16 text-gray-400 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">No Recommendations</h3>
        <p className="text-gray-600">No recommendations available for this period</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {content.recommendations.map((recommendation: any, index: number) => (
        <div key={index} className="bg-green-50 border border-green-200 rounded-lg p-6">
          <div className="flex items-start space-x-3">
            <div className="flex-shrink-0">
              <span className={`inline-flex items-center justify-center h-8 w-8 rounded-full text-sm font-medium ${
                recommendation.priority === 'high' ? 'bg-red-100 text-red-800' :
                recommendation.priority === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                'bg-green-100 text-green-800'
              }`}>
                {index + 1}
              </span>
            </div>
            <div className="flex-1">
              <h5 className="font-semibold text-gray-900 mb-2">{recommendation.title}</h5>
              <p className="text-gray-700">{recommendation.description}</p>
              {recommendation.priority && (
                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium mt-2 ${
                  recommendation.priority === 'high' ? 'bg-red-100 text-red-800' :
                  recommendation.priority === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                  'bg-green-100 text-green-800'
                }`}>
                  {recommendation.priority} priority
                </span>
              )}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

// Trend Analysis Viewer
function TrendAnalysisViewer({ content }: any) {
  return (
    <div className="space-y-6">
      {content.trends && (
        <div>
          <h4 className="text-lg font-semibold text-gray-900 mb-4">Event Trends</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {Object.entries(content.trends).map(([eventType, data]: [string, any]) => (
              <div key={eventType} className="bg-gray-50 rounded-lg p-4">
                <h5 className="font-medium text-gray-900 mb-2">
                  {eventType.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                </h5>
                <div className="flex items-center justify-between">
                  <span className="text-2xl font-bold text-gray-900">{data.total_events}</span>
                  <span className={`text-sm ${
                    data.trend_direction === 'up' ? 'text-green-600' :
                    data.trend_direction === 'down' ? 'text-red-600' :
                    'text-gray-600'
                  }`}>
                    {data.trend_direction}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {content.insights && (
        <div>
          <h4 className="text-lg font-semibold text-gray-900 mb-4">Trend Insights</h4>
          <div className="space-y-3">
            {content.insights.map((insight: any, index: number) => (
              <div key={index} className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <p className="text-gray-700">{insight.description}</p>
                {insight.significance && (
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium mt-2 ${
                    insight.significance === 'high' ? 'bg-blue-100 text-blue-800' :
                    'bg-gray-100 text-gray-800'
                  }`}>
                    {insight.significance} significance
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// Generic Section Viewer for unsupported types
function GenericSectionViewer({ content }: any) {
  return (
    <div>
      <h4 className="text-lg font-semibold text-gray-900 mb-4">Section Content</h4>
      <div className="bg-gray-50 rounded-lg p-6">
        <pre className="text-sm text-gray-700 whitespace-pre-wrap overflow-x-auto">
          {JSON.stringify(content, null, 2)}
        </pre>
      </div>
    </div>
  );
}