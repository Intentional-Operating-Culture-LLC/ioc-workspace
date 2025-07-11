import React, { useState, useEffect } from 'react';
import { Calendar, Clock, Edit2, Trash2, Plus, Send } from 'lucide-react';

interface ScheduledReportsProps {
  organizationId: string;
}

interface ScheduledReport {
  id: string;
  name: string;
  frequency: 'daily' | 'weekly' | 'monthly' | 'quarterly';
  nextRun: Date;
  recipients: string[];
  enabled: boolean;
}

export const ScheduledReports: React.FC<ScheduledReportsProps> = ({
  organizationId,
}) => {
  const [reports, setReports] = useState<ScheduledReport[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchScheduledReports();
  }, [organizationId]);

  const fetchScheduledReports = async () => {
    try {
      setLoading(true);
      // Mock data for now
      setReports([
        {
          id: '1',
          name: 'Weekly Executive Summary',
          frequency: 'weekly',
          nextRun: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000),
          recipients: ['ceo@company.com', 'cto@company.com'],
          enabled: true,
        },
        {
          id: '2',
          name: 'Monthly OCEAN Analysis',
          frequency: 'monthly',
          nextRun: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000),
          recipients: ['hr@company.com'],
          enabled: true,
        },
        {
          id: '3',
          name: 'Quarterly Performance Review',
          frequency: 'quarterly',
          nextRun: new Date(Date.now() + 45 * 24 * 60 * 60 * 1000),
          recipients: ['board@company.com'],
          enabled: false,
        },
      ]);
    } catch (error) {
      console.error('Error fetching scheduled reports:', error);
    } finally {
      setLoading(false);
    }
  };

  const toggleReport = (id: string) => {
    setReports(reports.map(report =>
      report.id === id ? { ...report, enabled: !report.enabled } : report
    ));
  };

  const deleteReport = (id: string) => {
    if (confirm('Are you sure you want to delete this scheduled report?')) {
      setReports(reports.filter(report => report.id !== id));
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-semibold text-gray-900">Scheduled Reports</h3>
        <button className="inline-flex items-center px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors">
          <Plus className="w-4 h-4 mr-2" />
          New Schedule
        </button>
      </div>

      <div className="space-y-4">
        {reports.map((report) => (
          <div
            key={report.id}
            className={`bg-white border rounded-lg p-6 ${
              !report.enabled ? 'opacity-60' : ''
            }`}
          >
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center space-x-3">
                  <h4 className="text-lg font-medium text-gray-900">{report.name}</h4>
                  <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                    report.enabled 
                      ? 'bg-green-100 text-green-700' 
                      : 'bg-gray-100 text-gray-700'
                  }`}>
                    {report.enabled ? 'Active' : 'Paused'}
                  </span>
                </div>
                
                <div className="mt-2 space-y-2">
                  <div className="flex items-center text-sm text-gray-600">
                    <Calendar className="w-4 h-4 mr-2" />
                    <span className="capitalize">{report.frequency}</span>
                  </div>
                  
                  <div className="flex items-center text-sm text-gray-600">
                    <Clock className="w-4 h-4 mr-2" />
                    Next run: {report.nextRun.toLocaleDateString()}
                  </div>
                  
                  <div className="flex items-center text-sm text-gray-600">
                    <Send className="w-4 h-4 mr-2" />
                    {report.recipients.length} recipient{report.recipients.length !== 1 ? 's' : ''}
                  </div>
                </div>
              </div>
              
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => toggleReport(report.id)}
                  className={`px-3 py-1.5 text-sm font-medium rounded-lg transition-colors ${
                    report.enabled
                      ? 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      : 'bg-green-100 text-green-700 hover:bg-green-200'
                  }`}
                >
                  {report.enabled ? 'Pause' : 'Resume'}
                </button>
                <button className="p-2 text-gray-400 hover:text-gray-600 transition-colors">
                  <Edit2 className="w-4 h-4" />
                </button>
                <button
                  onClick={() => deleteReport(report.id)}
                  className="p-2 text-red-400 hover:text-red-600 transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {reports.length === 0 && (
        <div className="text-center py-12">
          <Calendar className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-500">No scheduled reports yet</p>
          <p className="text-sm text-gray-400 mt-1">
            Create a schedule to automatically send reports to stakeholders
          </p>
        </div>
      )}
    </div>
  );
};