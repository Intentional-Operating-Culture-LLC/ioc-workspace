import React, { useState } from 'react';
import { 
  Plus, 
  Trash2, 
  Move, 
  Eye, 
  Save,
  Download,
  Send,
  BarChart3,
  PieChart,
  TrendingUp,
  Table,
  FileText
} from 'lucide-react';

interface ReportBuilderProps {
  organizationId: string;
}

interface ReportSection {
  id: string;
  type: 'chart' | 'table' | 'text' | 'metric';
  title: string;
  config: any;
}

const sectionTypes = [
  { type: 'chart', label: 'Chart', icon: BarChart3 },
  { type: 'table', label: 'Table', icon: Table },
  { type: 'metric', label: 'Metric', icon: TrendingUp },
  { type: 'text', label: 'Text', icon: FileText },
];

export const ReportBuilder: React.FC<ReportBuilderProps> = ({
  organizationId,
}) => {
  const [reportName, setReportName] = useState('Untitled Report');
  const [sections, setSections] = useState<ReportSection[]>([]);
  const [selectedSection, setSelectedSection] = useState<string | null>(null);
  const [isPreviewMode, setIsPreviewMode] = useState(false);

  const addSection = (type: string) => {
    const newSection: ReportSection = {
      id: `section-${Date.now()}`,
      type: type as any,
      title: `New ${type}`,
      config: {},
    };
    setSections([...sections, newSection]);
    setSelectedSection(newSection.id);
  };

  const removeSection = (id: string) => {
    setSections(sections.filter(s => s.id !== id));
    if (selectedSection === id) {
      setSelectedSection(null);
    }
  };

  const updateSection = (id: string, updates: Partial<ReportSection>) => {
    setSections(sections.map(s => 
      s.id === id ? { ...s, ...updates } : s
    ));
  };

  const moveSection = (id: string, direction: 'up' | 'down') => {
    const index = sections.findIndex(s => s.id === id);
    if (
      (direction === 'up' && index === 0) ||
      (direction === 'down' && index === sections.length - 1)
    ) {
      return;
    }

    const newSections = [...sections];
    const newIndex = direction === 'up' ? index - 1 : index + 1;
    [newSections[index], newSections[newIndex]] = [newSections[newIndex], newSections[index]];
    setSections(newSections);
  };

  const saveReport = async () => {
    try {
      const response = await fetch('/api/analytics/reports/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          organizationId,
          name: reportName,
          sections,
        }),
      });

      if (response.ok) {
        alert('Report saved successfully!');
      }
    } catch (error) {
      console.error('Error saving report:', error);
      alert('Failed to save report');
    }
  };

  const generateReport = async () => {
    try {
      const response = await fetch('/api/analytics/reports/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          organizationId,
          name: reportName,
          sections,
        }),
      });

      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${reportName.replace(/\s+/g, '_')}.pdf`;
        a.click();
      }
    } catch (error) {
      console.error('Error generating report:', error);
      alert('Failed to generate report');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <input
          type="text"
          value={reportName}
          onChange={(e) => setReportName(e.target.value)}
          className="text-2xl font-bold text-gray-900 bg-transparent border-none focus:outline-none focus:ring-2 focus:ring-indigo-500 rounded px-2"
          placeholder="Report Name"
        />
        <div className="flex items-center space-x-3">
          <button
            onClick={() => setIsPreviewMode(!isPreviewMode)}
            className="inline-flex items-center px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
          >
            <Eye className="w-4 h-4 mr-2" />
            {isPreviewMode ? 'Edit' : 'Preview'}
          </button>
          <button
            onClick={saveReport}
            className="inline-flex items-center px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
          >
            <Save className="w-4 h-4 mr-2" />
            Save
          </button>
          <button
            onClick={generateReport}
            className="inline-flex items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
          >
            <Download className="w-4 h-4 mr-2" />
            Export
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Section Types */}
        {!isPreviewMode && (
          <div className="lg:col-span-1">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Add Section</h3>
            <div className="space-y-2">
              {sectionTypes.map(({ type, label, icon: Icon }) => (
                <button
                  key={type}
                  onClick={() => addSection(type)}
                  className="w-full flex items-center px-4 py-3 bg-white border rounded-lg hover:bg-gray-50 transition-colors"
                >
                  <Icon className="w-5 h-5 text-gray-400 mr-3" />
                  <span className="text-sm font-medium text-gray-700">{label}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Report Canvas */}
        <div className={isPreviewMode ? 'lg:col-span-4' : 'lg:col-span-3'}>
          <div className="bg-white rounded-lg shadow-sm border min-h-[600px] p-6">
            {sections.length === 0 ? (
              <div className="text-center py-12">
                <PieChart className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-500">
                  {isPreviewMode 
                    ? 'No sections added yet' 
                    : 'Click a section type to start building your report'}
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {sections.map((section, index) => (
                  <div
                    key={section.id}
                    className={`border rounded-lg p-4 ${
                      selectedSection === section.id && !isPreviewMode
                        ? 'border-indigo-500 bg-indigo-50'
                        : 'border-gray-200'
                    }`}
                    onClick={() => !isPreviewMode && setSelectedSection(section.id)}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <input
                        type="text"
                        value={section.title}
                        onChange={(e) => updateSection(section.id, { title: e.target.value })}
                        className="font-medium text-gray-900 bg-transparent border-none focus:outline-none focus:ring-2 focus:ring-indigo-500 rounded px-1"
                        onClick={(e) => e.stopPropagation()}
                        disabled={isPreviewMode}
                      />
                      {!isPreviewMode && (
                        <div className="flex items-center space-x-2">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              moveSection(section.id, 'up');
                            }}
                            className="p-1 text-gray-400 hover:text-gray-600"
                            disabled={index === 0}
                          >
                            ↑
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              moveSection(section.id, 'down');
                            }}
                            className="p-1 text-gray-400 hover:text-gray-600"
                            disabled={index === sections.length - 1}
                          >
                            ↓
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              removeSection(section.id);
                            }}
                            className="p-1 text-red-400 hover:text-red-600"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      )}
                    </div>

                    {/* Section Content Placeholder */}
                    <div className="h-32 bg-gray-100 rounded flex items-center justify-center text-gray-500">
                      {section.type === 'chart' && <BarChart3 className="w-8 h-8" />}
                      {section.type === 'table' && <Table className="w-8 h-8" />}
                      {section.type === 'metric' && <TrendingUp className="w-8 h-8" />}
                      {section.type === 'text' && <FileText className="w-8 h-8" />}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Section Configuration Panel */}
      {selectedSection && !isPreviewMode && (
        <div className="bg-white rounded-lg shadow-sm border p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Section Configuration</h3>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Data Source
              </label>
              <select className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500">
                <option>Assessment Results</option>
                <option>User Analytics</option>
                <option>Performance Metrics</option>
                <option>OCEAN Scores</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Visualization Type
              </label>
              <select className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500">
                <option>Line Chart</option>
                <option>Bar Chart</option>
                <option>Pie Chart</option>
                <option>Scatter Plot</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Time Range
              </label>
              <select className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500">
                <option>Last 7 days</option>
                <option>Last 30 days</option>
                <option>Last 90 days</option>
                <option>This year</option>
              </select>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};