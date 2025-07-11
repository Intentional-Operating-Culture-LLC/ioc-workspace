import React, { useState, useEffect } from 'react';
import { FileText, Download, Eye, Copy, Star } from 'lucide-react';

interface ReportTemplatesProps {
  organizationId: string;
  canCreate: boolean;
}

interface ReportTemplate {
  id: string;
  name: string;
  description: string;
  category: string;
  favorite: boolean;
  lastUsed?: Date;
  uses: number;
}

export const ReportTemplates: React.FC<ReportTemplatesProps> = ({
  organizationId,
  canCreate,
}) => {
  const [templates, setTemplates] = useState<ReportTemplate[]>([]);
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchTemplates();
  }, [organizationId]);

  const fetchTemplates = async () => {
    try {
      setLoading(true);
      // Mock data for now
      setTemplates([
        {
          id: '1',
          name: 'Executive Summary',
          description: 'High-level overview with KPIs, trends, and insights',
          category: 'Executive',
          favorite: true,
          lastUsed: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
          uses: 145,
        },
        {
          id: '2',
          name: 'OCEAN Analysis Report',
          description: 'Detailed personality assessment results and distributions',
          category: 'Assessment',
          favorite: false,
          uses: 89,
        },
        {
          id: '3',
          name: 'Team Performance Report',
          description: 'Team dynamics, collaboration metrics, and recommendations',
          category: 'Performance',
          favorite: true,
          lastUsed: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
          uses: 67,
        },
        {
          id: '4',
          name: 'Monthly Analytics Summary',
          description: 'Comprehensive monthly metrics and trend analysis',
          category: 'Analytics',
          favorite: false,
          uses: 234,
        },
        {
          id: '5',
          name: 'Compliance Audit Report',
          description: 'Data privacy, anonymization, and compliance status',
          category: 'Compliance',
          favorite: false,
          uses: 12,
        },
      ]);
    } catch (error) {
      console.error('Error fetching templates:', error);
    } finally {
      setLoading(false);
    }
  };

  const toggleFavorite = (id: string) => {
    setTemplates(templates.map(template =>
      template.id === id ? { ...template, favorite: !template.favorite } : template
    ));
  };

  const categories = ['all', 'Executive', 'Assessment', 'Performance', 'Analytics', 'Compliance'];
  const filteredTemplates = selectedCategory === 'all' 
    ? templates 
    : templates.filter(t => t.category === selectedCategory);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Category Filter */}
      <div className="flex items-center space-x-2 overflow-x-auto pb-2">
        {categories.map((category) => (
          <button
            key={category}
            onClick={() => setSelectedCategory(category)}
            className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors whitespace-nowrap ${
              selectedCategory === category
                ? 'bg-indigo-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            {category === 'all' ? 'All Templates' : category}
          </button>
        ))}
      </div>

      {/* Templates Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredTemplates.map((template) => (
          <div
            key={template.id}
            className="bg-white border rounded-lg p-6 hover:shadow-md transition-shadow"
          >
            <div className="flex items-start justify-between mb-4">
              <FileText className="w-8 h-8 text-indigo-600" />
              <button
                onClick={() => toggleFavorite(template.id)}
                className={`p-1 ${
                  template.favorite ? 'text-yellow-500' : 'text-gray-300'
                } hover:text-yellow-500 transition-colors`}
              >
                <Star className="w-5 h-5" fill={template.favorite ? 'currentColor' : 'none'} />
              </button>
            </div>

            <h3 className="text-lg font-semibold text-gray-900 mb-2">{template.name}</h3>
            <p className="text-sm text-gray-600 mb-4">{template.description}</p>

            <div className="flex items-center justify-between text-xs text-gray-500 mb-4">
              <span>{template.uses} uses</span>
              {template.lastUsed && (
                <span>Last used {template.lastUsed.toLocaleDateString()}</span>
              )}
            </div>

            <div className="flex items-center space-x-2">
              {canCreate && (
                <button className="flex-1 inline-flex items-center justify-center px-3 py-2 bg-indigo-600 text-white text-sm rounded-lg hover:bg-indigo-700 transition-colors">
                  <Copy className="w-4 h-4 mr-1" />
                  Use Template
                </button>
              )}
              <button className="p-2 text-gray-400 hover:text-gray-600 transition-colors">
                <Eye className="w-4 h-4" />
              </button>
            </div>
          </div>
        ))}
      </div>

      {filteredTemplates.length === 0 && (
        <div className="text-center py-12">
          <FileText className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-500">No templates found in this category</p>
        </div>
      )}
    </div>
  );
};