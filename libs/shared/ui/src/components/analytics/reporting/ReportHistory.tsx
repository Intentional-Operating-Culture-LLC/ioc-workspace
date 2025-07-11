import React, { useState, useEffect } from 'react';
import { FileText, Download, Eye, Mail, CheckCircle, AlertCircle, Clock } from 'lucide-react';
import { format } from 'date-fns';

interface ReportHistoryProps {
  organizationId: string;
}

interface HistoricalReport {
  id: string;
  name: string;
  type: string;
  generatedAt: Date;
  generatedBy: string;
  status: 'completed' | 'failed' | 'processing';
  size: number;
  recipients?: string[];
  processingTime: number; // seconds
}

export const ReportHistory: React.FC<ReportHistoryProps> = ({
  organizationId,
}) => {
  const [reports, setReports] = useState<HistoricalReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'completed' | 'failed' | 'processing'>('all');

  useEffect(() => {
    fetchReportHistory();
  }, [organizationId]);

  const fetchReportHistory = async () => {
    try {
      setLoading(true);
      // Mock data for now
      setReports([
        {
          id: '1',
          name: 'Q4 2023 Executive Summary',
          type: 'Executive Report',
          generatedAt: new Date(Date.now() - 2 * 60 * 60 * 1000),
          generatedBy: 'John Doe',
          status: 'completed',
          size: 2.4,
          recipients: ['ceo@company.com', 'board@company.com'],
          processingTime: 12,
        },
        {
          id: '2',
          name: 'OCEAN Analysis - Engineering Team',
          type: 'Assessment Report',
          generatedAt: new Date(Date.now() - 24 * 60 * 60 * 1000),
          generatedBy: 'Jane Smith',
          status: 'completed',
          size: 1.8,
          processingTime: 8,
        },
        {
          id: '3',
          name: 'Monthly Performance Metrics',
          type: 'Analytics Report',
          generatedAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
          generatedBy: 'System',
          status: 'failed',
          size: 0,
          processingTime: 0,
        },
        {
          id: '4',
          name: 'Real-time Dashboard Export',
          type: 'Dashboard Export',
          generatedAt: new Date(Date.now() - 5 * 60 * 1000),
          generatedBy: 'Current User',
          status: 'processing',
          size: 0,
          processingTime: 0,
        },
      ]);
    } catch (error) {
      console.error('Error fetching report history:', error);
    } finally {
      setLoading(false);
    }
  };

  const downloadReport = async (reportId: string) => {
    // Implement download logic
    console.log('Downloading report:', reportId);
  };

  const viewReport = async (reportId: string) => {
    // Implement view logic
    console.log('Viewing report:', reportId);
  };

  const resendReport = async (reportId: string) => {
    // Implement resend logic
    console.log('Resending report:', reportId);
  };

  const filteredReports = filter === 'all' 
    ? reports 
    : reports.filter(r => r.status === filter);

  const statusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="w-5 h-5 text-green-600" />;
      case 'failed':
        return <AlertCircle className="w-5 h-5 text-red-600" />;
      case 'processing':
        return <Clock className="w-5 h-5 text-yellow-600 animate-spin" />;
      default:
        return null;
    }
  };

  const statusLabel = (status: string) => {
    switch (status) {
      case 'completed':
        return 'text-green-600 bg-green-50';
      case 'failed':
        return 'text-red-600 bg-red-50';
      case 'processing':
        return 'text-yellow-600 bg-yellow-50';
      default:
        return 'text-gray-600 bg-gray-50';
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
      {/* Filter Tabs */}
      <div className="flex items-center space-x-2">
        {(['all', 'completed', 'failed', 'processing'] as const).map((status) => (
          <button
            key={status}
            onClick={() => setFilter(status)}
            className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors capitalize ${
              filter === status
                ? 'bg-indigo-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            {status}
          </button>
        ))}
      </div>

      {/* Reports Table */}
      <div className="bg-white rounded-lg shadow-sm border overflow-hidden">
        <table className="min-w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Report
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Generated
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Status
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Size
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {filteredReports.map((report) => (
              <tr key={report.id} className="hover:bg-gray-50">
                <td className="px-6 py-4">
                  <div>
                    <p className="text-sm font-medium text-gray-900">{report.name}</p>
                    <p className="text-sm text-gray-500">{report.type}</p>
                  </div>
                </td>
                <td className="px-6 py-4">
                  <div>
                    <p className="text-sm text-gray-900">
                      {format(report.generatedAt, 'MMM d, yyyy')}
                    </p>
                    <p className="text-sm text-gray-500">
                      {format(report.generatedAt, 'h:mm a')} by {report.generatedBy}
                    </p>
                  </div>
                </td>
                <td className="px-6 py-4">
                  <div className="flex items-center">
                    {statusIcon(report.status)}
                    <span className={`ml-2 px-2 py-1 text-xs font-medium rounded-full capitalize ${
                      statusLabel(report.status)
                    }`}>
                      {report.status}
                    </span>
                  </div>
                </td>
                <td className="px-6 py-4">
                  <p className="text-sm text-gray-900">
                    {report.size > 0 ? `${report.size} MB` : '-'}
                  </p>
                  {report.processingTime > 0 && (
                    <p className="text-xs text-gray-500">
                      {report.processingTime}s
                    </p>
                  )}
                </td>
                <td className="px-6 py-4 text-right">
                  <div className="flex items-center justify-end space-x-2">
                    {report.status === 'completed' && (
                      <>
                        <button
                          onClick={() => viewReport(report.id)}
                          className="p-1 text-gray-400 hover:text-gray-600"
                          title="View"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => downloadReport(report.id)}
                          className="p-1 text-gray-400 hover:text-gray-600"
                          title="Download"
                        >
                          <Download className="w-4 h-4" />
                        </button>
                        {report.recipients && (
                          <button
                            onClick={() => resendReport(report.id)}
                            className="p-1 text-gray-400 hover:text-gray-600"
                            title="Resend"
                          >
                            <Mail className="w-4 h-4" />
                          </button>
                        )}
                      </>
                    )}
                    {report.status === 'failed' && (
                      <button className="text-sm text-indigo-600 hover:text-indigo-700">
                        Retry
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {filteredReports.length === 0 && (
        <div className="text-center py-12">
          <FileText className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-500">No reports found</p>
        </div>
      )}
    </div>
  );
};