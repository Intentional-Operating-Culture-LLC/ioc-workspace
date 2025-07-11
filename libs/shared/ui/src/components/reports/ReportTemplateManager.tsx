'use client';

import React, { useState } from 'react';
import { 
  PlusIcon, 
  DocumentTextIcon, 
  ChartBarIcon,
  TableCellsIcon,
  LightBulbIcon,
  ExclamationTriangleIcon,
  PencilIcon,
  TrashIcon,
  EyeIcon
} from '@heroicons/react/24/outline';

interface Template {
  id: string;
  name: string;
  description: string;
  template_type: string;
  sections: any[];
  created_at: string;
  is_active: boolean;
  created_by_user: {
    full_name: string;
  };
}

interface ReportTemplateManagerProps {
  organizationId: string;
  user: any;
  templates: Template[];
  onTemplateChange: () => void;
}

export function ReportTemplateManager({ organizationId, user, templates, onTemplateChange }: ReportTemplateManagerProps) {
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<Template | null>(null);
  const [view, setView] = useState<'list' | 'create' | 'edit'>('list');

  const createTemplate = async (templateData: any) => {
    try {
      const response = await fetch('/api/reports/templates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          organizationId,
          ...templateData
        })
      });

      if (response.ok) {
        onTemplateChange();
        setView('list');
        setShowCreateModal(false);
      }
    } catch (error) {
      console.error('Error creating template:', error);
    }
  };

  const deleteTemplate = async (templateId: string) => {
    if (!confirm('Are you sure you want to delete this template?')) return;

    try {
      const response = await fetch(`/api/reports/templates?templateId=${templateId}&organizationId=${organizationId}`, {
        method: 'DELETE'
      });

      if (response.ok) {
        onTemplateChange();
      }
    } catch (error) {
      console.error('Error deleting template:', error);
    }
  };

  if (view === 'create') {
    return (
      <TemplateEditor
        template={null}
        organizationId={organizationId}
        onSave={createTemplate}
        onCancel={() => setView('list')}
      />
    );
  }

  if (view === 'edit' && selectedTemplate) {
    return (
      <TemplateEditor
        template={selectedTemplate}
        organizationId={organizationId}
        onSave={(data) => {
          // Handle update
          onTemplateChange();
          setView('list');
        }}
        onCancel={() => setView('list')}
      />
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-medium text-gray-900">Report Templates</h3>
          <p className="text-gray-600">Manage reusable templates for automated reports</p>
        </div>
        <button
          onClick={() => setView('create')}
          className="btn-primary"
        >
          <PlusIcon className="h-5 w-5 mr-2" />
          Create Template
        </button>
      </div>

      {templates.length === 0 ? (
        <div className="text-center py-12">
          <DocumentTextIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No templates found</h3>
          <p className="text-gray-600 mb-6">Create your first report template to get started</p>
          <button
            onClick={() => setView('create')}
            className="btn-primary"
          >
            <PlusIcon className="h-5 w-5 mr-2" />
            Create Template
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {templates.map((template) => (
            <div key={template.id} className="bg-white border border-gray-200 rounded-lg p-6 hover:shadow-md transition-shadow">
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1">
                  <h4 className="text-lg font-medium text-gray-900 mb-2">{template.name}</h4>
                  <p className="text-sm text-gray-600 mb-3">{template.description}</p>
                  <div className="flex items-center space-x-2">
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-indigo-100 text-indigo-800">
                      {template.template_type}
                    </span>
                    <span className="text-xs text-gray-500">
                      {template.sections?.length || 0} sections
                    </span>
                  </div>
                </div>
              </div>
              
              <div className="mb-4">
                <p className="text-xs text-gray-500">
                  Created by {template.created_by_user?.full_name} on{' '}
                  {new Date(template.created_at).toLocaleDateString()}
                </p>
              </div>

              <div className="flex items-center justify-between pt-4 border-t border-gray-200">
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => {
                      setSelectedTemplate(template);
                      setView('edit');
                    }}
                    className="p-2 text-gray-400 hover:text-gray-600"
                    title="Edit Template"
                  >
                    <PencilIcon className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => deleteTemplate(template.id)}
                    className="p-2 text-gray-400 hover:text-red-600"
                    title="Delete Template"
                  >
                    <TrashIcon className="h-4 w-4" />
                  </button>
                </div>
                <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                  template.is_active 
                    ? 'bg-green-100 text-green-800' 
                    : 'bg-gray-100 text-gray-800'
                }`}>
                  {template.is_active ? 'Active' : 'Inactive'}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

interface TemplateEditorProps {
  template: Template | null;
  organizationId: string;
  onSave: (data: any) => void;
  onCancel: () => void;
}

function TemplateEditor({ template, organizationId, onSave, onCancel }: TemplateEditorProps) {
  const [formData, setFormData] = useState({
    name: template?.name || '',
    description: template?.description || '',
    templateType: template?.template_type || 'weekly',
    sections: template?.sections || []
  });

  const [availableSections] = useState([
    { 
      id: 'executive_summary', 
      name: 'Executive Summary', 
      type: 'executive_summary',
      icon: DocumentTextIcon,
      description: 'High-level overview with key metrics and narrative'
    },
    { 
      id: 'metrics_dashboard', 
      name: 'Metrics Dashboard', 
      type: 'metrics_dashboard',
      icon: ChartBarIcon,
      description: 'Primary and secondary metrics with trends'
    },
    { 
      id: 'trend_analysis', 
      name: 'Trend Analysis', 
      type: 'trend_analysis',
      icon: ChartBarIcon,
      description: 'Historical trends and pattern analysis'
    },
    { 
      id: 'performance_insights', 
      name: 'Performance Insights', 
      type: 'performance_insights',
      icon: LightBulbIcon,
      description: 'AI-generated insights and observations'
    },
    { 
      id: 'alerts_warnings', 
      name: 'Alerts & Warnings', 
      type: 'alerts_warnings',
      icon: ExclamationTriangleIcon,
      description: 'Critical alerts and threshold violations'
    },
    { 
      id: 'user_activity', 
      name: 'User Activity', 
      type: 'user_activity',
      icon: TableCellsIcon,
      description: 'User engagement and activity metrics'
    },
    { 
      id: 'assessment_summary', 
      name: 'Assessment Summary', 
      type: 'assessment_summary',
      icon: TableCellsIcon,
      description: 'Assessment completion and results summary'
    }
  ]);

  const addSection = (sectionTemplate: any) => {
    const newSection = {
      id: `${sectionTemplate.id}_${Date.now()}`,
      name: sectionTemplate.name,
      type: sectionTemplate.type,
      order_index: formData.sections.length,
      configuration: getDefaultSectionConfig(sectionTemplate.type),
      is_required: true,
      is_automated: true
    };

    setFormData({
      ...formData,
      sections: [...formData.sections, newSection]
    });
  };

  const removeSection = (index: number) => {
    const newSections = formData.sections.filter((_, i) => i !== index);
    setFormData({
      ...formData,
      sections: newSections.map((section, i) => ({ ...section, order_index: i }))
    });
  };

  const moveSection = (index: number, direction: 'up' | 'down') => {
    const newSections = [...formData.sections];
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    
    if (targetIndex >= 0 && targetIndex < newSections.length) {
      [newSections[index], newSections[targetIndex]] = [newSections[targetIndex], newSections[index]];
      setFormData({
        ...formData,
        sections: newSections.map((section, i) => ({ ...section, order_index: i }))
      });
    }
  };

  const getDefaultSectionConfig = (type: string) => {
    switch (type) {
      case 'metrics_dashboard':
        return {
          primary_metrics: ['total_users', 'active_assessments', 'completion_rate'],
          secondary_metrics: ['total_responses', 'new_users'],
          chart_type: 'line'
        };
      case 'alerts_warnings':
        return {
          thresholds: {
            completion_rate: { min: 70, severity: 'warning' },
            user_activity: { min: 10, severity: 'info' }
          }
        };
      case 'user_activity':
        return {
          table_columns: ['user_name', 'last_activity', 'assessments_completed'],
          sort_by: 'last_activity',
          limit: 20
        };
      default:
        return {};
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(formData);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-medium text-gray-900">
            {template ? 'Edit Template' : 'Create Template'}
          </h3>
          <p className="text-gray-600">Design a reusable template for automated reports</p>
        </div>
        <div className="flex items-center space-x-3">
          <button onClick={onCancel} className="btn-secondary">
            Cancel
          </button>
          <button onClick={handleSubmit} className="btn-primary">
            {template ? 'Update Template' : 'Create Template'}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Template Configuration */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white rounded-lg shadow-sm p-6">
            <h4 className="text-lg font-medium text-gray-900 mb-4">Template Details</h4>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Template Name
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="input"
                  placeholder="Weekly Performance Report"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Description
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="input h-20"
                  placeholder="Comprehensive weekly report covering key metrics and insights"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Template Type
                </label>
                <select
                  value={formData.templateType}
                  onChange={(e) => setFormData({ ...formData, templateType: e.target.value })}
                  className="input"
                >
                  <option value="weekly">Weekly</option>
                  <option value="monthly">Monthly</option>
                  <option value="quarterly">Quarterly</option>
                  <option value="custom">Custom</option>
                </select>
              </div>
            </div>
          </div>

          {/* Sections Configuration */}
          <div className="bg-white rounded-lg shadow-sm p-6">
            <h4 className="text-lg font-medium text-gray-900 mb-4">Report Sections</h4>
            
            {formData.sections.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <DocumentTextIcon className="h-12 w-12 mx-auto mb-4 text-gray-400" />
                <p>No sections added yet. Choose from available sections to build your template.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {formData.sections.map((section, index) => (
                  <div key={section.id} className="border border-gray-200 rounded-lg p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <span className="text-sm font-medium text-gray-500">
                          {index + 1}.
                        </span>
                        <div>
                          <p className="font-medium text-gray-900">{section.name}</p>
                          <p className="text-sm text-gray-500">{section.type}</p>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        <button
                          onClick={() => moveSection(index, 'up')}
                          disabled={index === 0}
                          className="p-1 text-gray-400 hover:text-gray-600 disabled:opacity-50"
                        >
                          ↑
                        </button>
                        <button
                          onClick={() => moveSection(index, 'down')}
                          disabled={index === formData.sections.length - 1}
                          className="p-1 text-gray-400 hover:text-gray-600 disabled:opacity-50"
                        >
                          ↓
                        </button>
                        <button
                          onClick={() => removeSection(index)}
                          className="p-1 text-gray-400 hover:text-red-600"
                        >
                          <TrashIcon className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Available Sections */}
        <div className="space-y-6">
          <div className="bg-white rounded-lg shadow-sm p-6">
            <h4 className="text-lg font-medium text-gray-900 mb-4">Available Sections</h4>
            <div className="space-y-3">
              {availableSections.map((sectionTemplate) => {
                const Icon = sectionTemplate.icon;
                const isAdded = formData.sections.some(s => s.type === sectionTemplate.type);
                
                return (
                  <div key={sectionTemplate.id} className={`border rounded-lg p-3 ${
                    isAdded ? 'border-gray-200 bg-gray-50' : 'border-gray-200 hover:border-indigo-300 cursor-pointer'
                  }`}>
                    <div className="flex items-start space-x-3">
                      <Icon className="h-5 w-5 text-indigo-600 flex-shrink-0 mt-0.5" />
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-gray-900">{sectionTemplate.name}</p>
                        <p className="text-sm text-gray-500">{sectionTemplate.description}</p>
                        {!isAdded && (
                          <button
                            onClick={() => addSection(sectionTemplate)}
                            className="mt-2 text-sm text-indigo-600 hover:text-indigo-700 font-medium"
                          >
                            Add Section
                          </button>
                        )}
                        {isAdded && (
                          <span className="mt-2 inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                            Added
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}