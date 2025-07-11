'use client';

import React, { useState, useEffect } from 'react';
import { 
  DocumentTextIcon, 
  PlusIcon, 
  ChartBarIcon, 
  ShareIcon,
  EyeIcon,
  PencilIcon,
  TrashIcon,
  ClockIcon,
  CheckCircleIcon,
  XCircleIcon,
  ExclamationTriangleIcon
} from '@heroicons/react/24/outline';
import { ReportTemplateManager } from './ReportTemplateManager';
import { ReportEditor } from './ReportEditor';
import { ReportViewer } from './ReportViewer';
import { ReportAnalytics } from './ReportAnalytics';
import { WorkflowManager } from './WorkflowManager';
import { DistributionManager } from './DistributionManager';

interface Report {
  id: string;
  title: string;
  status: 'draft' | 'review' | 'approved' | 'published' | 'archived';
  template: {
    name: string;
    template_type: string;
  };
  report_period_start: string;
  report_period_end: string;
  created_at: string;
  generated_at?: string;
  published_at?: string;
  created_by_user: {
    full_name: string;
    email: string;
  };
  workflow_steps?: any[];
}

interface ReportsManagerProps {
  organizationId: string;
  user: any;
}

export function ReportsManager({ organizationId, user }: ReportsManagerProps) {
  const [reports, setReports] = useState<Report[]>([]);
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'reports' | 'templates' | 'analytics' | 'distribution'>('reports');
  const [selectedReport, setSelectedReport] = useState<Report | null>(null);
  const [view, setView] = useState<'list' | 'edit' | 'view' | 'create'>('list');
  const [filters, setFilters] = useState({
    status: '',
    type: '',
    dateRange: '30d'
  });

  useEffect(() => {
    loadReports();
    loadTemplates();
  }, [organizationId, filters]);

  const loadReports = async () => {
    try {
      const params = new URLSearchParams({
        organizationId,
        ...(filters.status && { status: filters.status }),
        ...(filters.type && { type: filters.type }),
        limit: '50'
      });

      const response = await fetch(`/api/reports?${params}`);
      if (response.ok) {
        const data = await response.json();
        setReports(data.reports || []);
      }
    } catch (error) {
      console.error('Error loading reports:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadTemplates = async () => {
    try {
      const response = await fetch(`/api/reports/templates?organizationId=${organizationId}`);
      if (response.ok) {
        const data = await response.json();
        setTemplates(data.templates || []);
      }
    } catch (error) {
      console.error('Error loading templates:', error);
    }
  };

  const createReport = async (templateId: string, reportData: any) => {
    try {
      const response = await fetch('/api/reports', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          templateId,
          organizationId,
          ...reportData,
          autoGenerate: true
        })
      });

      if (response.ok) {
        const data = await response.json();
        setReports([data.reportInstance, ...reports]);
        setView('list');
        return data.reportInstance;
      }
    } catch (error) {
      console.error('Error creating report:', error);
    }
  };

  const generateReport = async (reportId: string, force = false) => {
    try {
      const response = await fetch('/api/reports/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          reportId,
          organizationId,
          force
        })
      });

      if (response.ok) {
        loadReports();
      }
    } catch (error) {
      console.error('Error generating report:', error);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'draft':
        return <PencilIcon className="h-5 w-5 text-gray-400" />;
      case 'review':
        return <ClockIcon className="h-5 w-5 text-yellow-500" />;
      case 'approved':
        return <CheckCircleIcon className="h-5 w-5 text-green-500" />;
      case 'published':
        return <CheckCircleIcon className="h-5 w-5 text-blue-500" />;
      default:
        return <ExclamationTriangleIcon className="h-5 w-5 text-gray-400" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'draft':
        return 'bg-gray-100 text-gray-800';
      case 'review':
        return 'bg-yellow-100 text-yellow-800';
      case 'approved':
        return 'bg-green-100 text-green-800';
      case 'published':
        return 'bg-blue-100 text-blue-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  if (view === 'edit' && selectedReport) {
    return (
      <ReportEditor
        report={selectedReport}
        organizationId={organizationId}
        user={user}
        onSave={(updatedReport) => {
          setReports(reports.map(r => r.id === updatedReport.id ? updatedReport : r));
          setView('list');
        }}
        onCancel={() => setView('list')}
      />
    );
  }

  if (view === 'view' && selectedReport) {
    return (
      <ReportViewer
        report={selectedReport}
        organizationId={organizationId}
        user={user}
        onEdit={() => setView('edit')}
        onClose={() => setView('list')}
      />
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Weekly Reports</h1>
          <p className="text-gray-600">Manage automated weekly reporting system</p>
        </div>
        <div className="flex items-center space-x-3">
          <button
            onClick={() => setView('create')}
            className="btn-primary"
          >
            <PlusIcon className="h-5 w-5 mr-2" />
            New Report
          </button>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          {[
            { id: 'reports', name: 'Reports', icon: DocumentTextIcon },
            { id: 'templates', name: 'Templates', icon: DocumentTextIcon },
            { id: 'analytics', name: 'Analytics', icon: ChartBarIcon },
            { id: 'distribution', name: 'Distribution', icon: ShareIcon }
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
              <tab.icon className="h-5 w-5 mr-2" />
              {tab.name}
            </button>
          ))}
        </nav>
      </div>

      {/* Content */}
      {activeTab === 'reports' && (
        <div className="space-y-6">
          {/* Filters */}
          <div className="bg-gray-50 p-4 rounded-lg">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Status
                </label>
                <select
                  value={filters.status}
                  onChange={(e) => setFilters({ ...filters, status: e.target.value })}
                  className="input"
                >
                  <option value="">All Statuses</option>
                  <option value="draft">Draft</option>
                  <option value="review">Review</option>
                  <option value="approved">Approved</option>
                  <option value="published">Published</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Type
                </label>
                <select
                  value={filters.type}
                  onChange={(e) => setFilters({ ...filters, type: e.target.value })}
                  className="input"
                >
                  <option value="">All Types</option>
                  <option value="weekly">Weekly</option>
                  <option value="monthly">Monthly</option>
                  <option value="quarterly">Quarterly</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Date Range
                </label>
                <select
                  value={filters.dateRange}
                  onChange={(e) => setFilters({ ...filters, dateRange: e.target.value })}
                  className="input"
                >
                  <option value="7d">Last 7 days</option>
                  <option value="30d">Last 30 days</option>
                  <option value="90d">Last 90 days</option>
                </select>
              </div>
              <div className="flex items-end">
                <button
                  onClick={() => setFilters({ status: '', type: '', dateRange: '30d' })}
                  className="btn-secondary w-full"
                >
                  Clear Filters
                </button>
              </div>
            </div>
          </div>

          {/* Reports List */}
          {loading ? (
            <div className="text-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto"></div>
              <p className="text-gray-600 mt-4">Loading reports...</p>
            </div>
          ) : reports.length === 0 ? (
            <div className="text-center py-12">
              <DocumentTextIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No reports found</h3>
              <p className="text-gray-600 mb-6">Get started by creating your first report</p>
              <button
                onClick={() => setView('create')}
                className="btn-primary"
              >
                <PlusIcon className="h-5 w-5 mr-2" />
                Create Report
              </button>
            </div>
          ) : (
            <div className="bg-white shadow overflow-hidden sm:rounded-md">
              <ul className="divide-y divide-gray-200">
                {reports.map((report) => (
                  <li key={report.id}>
                    <div className="px-4 py-4 flex items-center justify-between hover:bg-gray-50">
                      <div className="flex items-center min-w-0 flex-1">
                        <div className="flex-shrink-0">
                          {getStatusIcon(report.status)}
                        </div>
                        <div className="ml-4 min-w-0 flex-1">
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="text-sm font-medium text-gray-900 truncate">
                                {report.title}
                              </p>
                              <div className="flex items-center mt-1">
                                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(report.status)}`}>
                                  {report.status}
                                </span>
                                <span className="ml-2 text-xs text-gray-500">
                                  {report.template.name} ({report.template.template_type})
                                </span>
                              </div>
                            </div>
                            <div className="text-right">
                              <p className="text-sm text-gray-900">
                                {report.report_period_start} - {report.report_period_end}
                              </p>
                              <p className="text-xs text-gray-500">
                                Created {new Date(report.created_at).toLocaleDateString()}
                              </p>
                            </div>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2 ml-4">
                        {!report.generated_at && (
                          <button
                            onClick={() => generateReport(report.id)}
                            className="btn-secondary text-sm"
                            title="Generate Report"
                          >
                            Generate
                          </button>
                        )}
                        <button
                          onClick={() => {
                            setSelectedReport(report);
                            setView('view');
                          }}
                          className="p-2 text-gray-400 hover:text-gray-600"
                          title="View Report"
                        >
                          <EyeIcon className="h-5 w-5" />
                        </button>
                        <button
                          onClick={() => {
                            setSelectedReport(report);
                            setView('edit');
                          }}
                          className="p-2 text-gray-400 hover:text-gray-600"
                          title="Edit Report"
                        >
                          <PencilIcon className="h-5 w-5" />
                        </button>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      {activeTab === 'templates' && (
        <ReportTemplateManager
          organizationId={organizationId}
          user={user}
          templates={templates}
          onTemplateChange={loadTemplates}
        />
      )}

      {activeTab === 'analytics' && (
        <ReportAnalytics
          organizationId={organizationId}
          user={user}
        />
      )}

      {activeTab === 'distribution' && (
        <DistributionManager
          organizationId={organizationId}
          user={user}
        />
      )}

      {/* Create Report Modal */}
      {view === 'create' && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
            <div className="mt-3">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Create New Report</h3>
              <CreateReportForm
                templates={templates}
                onSubmit={createReport}
                onCancel={() => setView('list')}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

interface CreateReportFormProps {
  templates: any[];
  onSubmit: (templateId: string, data: any) => void;
  onCancel: () => void;
}

function CreateReportForm({ templates, onSubmit, onCancel }: CreateReportFormProps) {
  const [formData, setFormData] = useState({
    templateId: '',
    title: '',
    reportPeriodStart: '',
    reportPeriodEnd: ''
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (formData.templateId && formData.title && formData.reportPeriodStart && formData.reportPeriodEnd) {
      onSubmit(formData.templateId, {
        title: formData.title,
        reportPeriodStart: formData.reportPeriodStart,
        reportPeriodEnd: formData.reportPeriodEnd
      });
    }
  };

  // Set default dates (last week)
  React.useEffect(() => {
    const today = new Date();
    const lastWeekEnd = new Date(today);
    lastWeekEnd.setDate(today.getDate() - 1);
    const lastWeekStart = new Date(lastWeekEnd);
    lastWeekStart.setDate(lastWeekEnd.getDate() - 6);

    setFormData(prev => ({
      ...prev,
      reportPeriodStart: lastWeekStart.toISOString().split('T')[0],
      reportPeriodEnd: lastWeekEnd.toISOString().split('T')[0]
    }));
  }, []);

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Template
        </label>
        <select
          value={formData.templateId}
          onChange={(e) => setFormData({ ...formData, templateId: e.target.value })}
          className="input"
          required
        >
          <option value="">Select a template</option>
          {templates.map((template) => (
            <option key={template.id} value={template.id}>
              {template.name} ({template.template_type})
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Report Title
        </label>
        <input
          type="text"
          value={formData.title}
          onChange={(e) => setFormData({ ...formData, title: e.target.value })}
          className="input"
          placeholder="Weekly Report - Week of..."
          required
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Period Start
          </label>
          <input
            type="date"
            value={formData.reportPeriodStart}
            onChange={(e) => setFormData({ ...formData, reportPeriodStart: e.target.value })}
            className="input"
            required
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Period End
          </label>
          <input
            type="date"
            value={formData.reportPeriodEnd}
            onChange={(e) => setFormData({ ...formData, reportPeriodEnd: e.target.value })}
            className="input"
            required
          />
        </div>
      </div>

      <div className="flex justify-end space-x-3 mt-6">
        <button
          type="button"
          onClick={onCancel}
          className="btn-secondary"
        >
          Cancel
        </button>
        <button
          type="submit"
          className="btn-primary"
        >
          Create Report
        </button>
      </div>
    </form>
  );
}