import React, { useState, useEffect } from 'react';
import { 
  FileText, 
  Calendar, 
  Download, 
  Send,
  Clock,
  CheckCircle,
  AlertCircle,
  Filter,
  Plus,
  Settings,
  Share2
} from 'lucide-react';
import { ChartContainer } from './shared/ChartContainer';
import { ReportBuilder } from './reporting/ReportBuilder';
import { ScheduledReports } from './reporting/ScheduledReports';
import { ReportTemplates } from './reporting/ReportTemplates';
import { ReportHistory } from './reporting/ReportHistory';
import { DateRangePicker } from './shared/DateRangePicker';

interface ReportingInterfaceProps {
  organizationId: string;
  userRole: 'admin' | 'manager' | 'analyst' | 'viewer';
}

export const ReportingInterface: React.FC<ReportingInterfaceProps> = ({
  organizationId,
  userRole,
}) => {
  const [activeTab, setActiveTab] = useState<'builder' | 'scheduled' | 'templates' | 'history'>('builder');
  const [loading, setLoading] = useState(false);
  const [reportStats, setReportStats] = useState({
    totalReports: 0,
    scheduledReports: 0,
    lastGenerated: null as Date | null,
    avgGenerationTime: 0,
  });

  useEffect(() => {
    fetchReportStats();
  }, [organizationId]);

  const fetchReportStats = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/analytics/reports/stats', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ organizationId }),
      });
      
      if (response.ok) {
        const data = await response.json();
        setReportStats(data.stats);
      }
    } catch (error) {
      console.error('Error fetching report stats:', error);
    } finally {
      setLoading(false);
    }
  };

  const canCreateReports = ['admin', 'manager', 'analyst'].includes(userRole);
  const canScheduleReports = ['admin', 'manager'].includes(userRole);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Reporting Center</h1>
          <p className="text-gray-500 mt-1">Generate, schedule, and manage analytics reports</p>
        </div>
        {canCreateReports && (
          <button className="mt-4 sm:mt-0 inline-flex items-center px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors">
            <Plus className="w-5 h-5 mr-2" />
            New Report
          </button>
        )}
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-lg shadow-sm border p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Total Reports</p>
              <p className="text-2xl font-bold text-gray-900">{reportStats.totalReports}</p>
            </div>
            <FileText className="w-8 h-8 text-gray-400" />
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Scheduled</p>
              <p className="text-2xl font-bold text-gray-900">{reportStats.scheduledReports}</p>
            </div>
            <Calendar className="w-8 h-8 text-gray-400" />
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Last Generated</p>
              <p className="text-sm font-medium text-gray-900">
                {reportStats.lastGenerated 
                  ? new Date(reportStats.lastGenerated).toLocaleDateString()
                  : 'Never'}
              </p>
            </div>
            <Clock className="w-8 h-8 text-gray-400" />
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Avg. Time</p>
              <p className="text-2xl font-bold text-gray-900">{reportStats.avgGenerationTime}s</p>
            </div>
            <Settings className="w-8 h-8 text-gray-400" />
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white rounded-lg shadow-sm border">
        <div className="border-b">
          <nav className="flex -mb-px">
            <button
              onClick={() => setActiveTab('builder')}
              className={`px-6 py-3 text-sm font-medium border-b-2 transition-colors ${
                activeTab === 'builder'
                  ? 'border-indigo-600 text-indigo-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              Report Builder
            </button>
            {canScheduleReports && (
              <button
                onClick={() => setActiveTab('scheduled')}
                className={`px-6 py-3 text-sm font-medium border-b-2 transition-colors ${
                  activeTab === 'scheduled'
                    ? 'border-indigo-600 text-indigo-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                Scheduled Reports
              </button>
            )}
            <button
              onClick={() => setActiveTab('templates')}
              className={`px-6 py-3 text-sm font-medium border-b-2 transition-colors ${
                activeTab === 'templates'
                  ? 'border-indigo-600 text-indigo-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              Templates
            </button>
            <button
              onClick={() => setActiveTab('history')}
              className={`px-6 py-3 text-sm font-medium border-b-2 transition-colors ${
                activeTab === 'history'
                  ? 'border-indigo-600 text-indigo-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              History
            </button>
          </nav>
        </div>

        <div className="p-6">
          {activeTab === 'builder' && canCreateReports && (
            <ReportBuilder organizationId={organizationId} />
          )}
          {activeTab === 'scheduled' && canScheduleReports && (
            <ScheduledReports organizationId={organizationId} />
          )}
          {activeTab === 'templates' && (
            <ReportTemplates 
              organizationId={organizationId} 
              canCreate={canCreateReports}
            />
          )}
          {activeTab === 'history' && (
            <ReportHistory organizationId={organizationId} />
          )}
        </div>
      </div>

      {/* Quick Actions */}
      <div className="bg-gray-50 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <button className="flex items-center justify-between p-4 bg-white rounded-lg border hover:shadow-sm transition-shadow">
            <div className="flex items-center space-x-3">
              <Download className="w-5 h-5 text-indigo-600" />
              <div className="text-left">
                <p className="font-medium text-gray-900">Export Data</p>
                <p className="text-sm text-gray-500">Download raw analytics data</p>
              </div>
            </div>
          </button>

          <button className="flex items-center justify-between p-4 bg-white rounded-lg border hover:shadow-sm transition-shadow">
            <div className="flex items-center space-x-3">
              <Send className="w-5 h-5 text-green-600" />
              <div className="text-left">
                <p className="font-medium text-gray-900">Email Report</p>
                <p className="text-sm text-gray-500">Send report to stakeholders</p>
              </div>
            </div>
          </button>

          <button className="flex items-center justify-between p-4 bg-white rounded-lg border hover:shadow-sm transition-shadow">
            <div className="flex items-center space-x-3">
              <Share2 className="w-5 h-5 text-purple-600" />
              <div className="text-left">
                <p className="font-medium text-gray-900">Share Dashboard</p>
                <p className="text-sm text-gray-500">Create shareable link</p>
              </div>
            </div>
          </button>
        </div>
      </div>

      {/* Recent Reports Preview */}
      <ChartContainer
        title="Recent Report Performance"
        subtitle="Generation times and success rates"
        loading={loading}
        onRefresh={fetchReportStats}
      >
        <div className="space-y-3">
          {[
            { name: 'Monthly Executive Summary', status: 'completed', time: '12s', date: '2 hours ago' },
            { name: 'OCEAN Analysis Q4', status: 'completed', time: '8s', date: '1 day ago' },
            { name: 'Team Performance Report', status: 'completed', time: '15s', date: '2 days ago' },
            { name: 'Engagement Metrics', status: 'failed', time: '-', date: '3 days ago' },
            { name: 'Industry Benchmark Report', status: 'completed', time: '22s', date: '1 week ago' },
          ].map((report, index) => (
            <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <div className="flex items-center space-x-3">
                {report.status === 'completed' ? (
                  <CheckCircle className="w-5 h-5 text-green-600" />
                ) : (
                  <AlertCircle className="w-5 h-5 text-red-600" />
                )}
                <div>
                  <p className="font-medium text-gray-900">{report.name}</p>
                  <p className="text-sm text-gray-500">{report.date}</p>
                </div>
              </div>
              <div className="flex items-center space-x-4">
                <span className="text-sm text-gray-600">
                  {report.time !== '-' ? `Generated in ${report.time}` : 'Failed'}
                </span>
                <button className="text-indigo-600 hover:text-indigo-700">
                  <Download className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      </ChartContainer>
    </div>
  );
};