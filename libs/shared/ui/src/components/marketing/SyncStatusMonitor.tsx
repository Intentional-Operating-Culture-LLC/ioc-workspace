'use client';

import { useEffect, useState } from 'react';
import { 
  CloudArrowUpIcon, 
  CloudArrowDownIcon, 
  ExclamationTriangleIcon,
  CheckCircleIcon,
  ClockIcon 
} from '@heroicons/react/24/outline';
import { XMarkIcon } from '@heroicons/react/24/solid';

interface SyncStatus {
  service: string;
  status: 'connected' | 'syncing' | 'error' | 'disconnected';
  lastSync: string;
  nextSync?: string;
  recordsProcessed?: number;
  errorMessage?: string;
}

export function SyncStatusMonitor() {
  const [syncStatuses, setSyncStatuses] = useState<SyncStatus[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchSyncStatus();
    // Refresh sync status every 30 seconds
    const interval = setInterval(fetchSyncStatus, 30000);
    return () => clearInterval(interval);
  }, []);

  const fetchSyncStatus = async () => {
    try {
      const response = await fetch('/api/integrations/sync-status');
      if (!response.ok) throw new Error('Failed to fetch sync status');
      const data = await response.json();
      setSyncStatuses(data.data);
    } catch (error) {
      console.error('Error fetching sync status:', error);
      // Fallback to mock data for demo
      setSyncStatuses([
        {
          service: 'Zoho CRM',
          status: 'connected',
          lastSync: new Date(Date.now() - 5 * 60 * 1000).toISOString(),
          nextSync: new Date(Date.now() + 10 * 60 * 1000).toISOString(),
          recordsProcessed: 127
        },
        {
          service: 'Zoho Analytics',
          status: 'syncing',
          lastSync: new Date(Date.now() - 2 * 60 * 1000).toISOString(),
          recordsProcessed: 89
        },
        {
          service: 'Google Analytics',
          status: 'connected',
          lastSync: new Date(Date.now() - 1 * 60 * 1000).toISOString(),
          nextSync: new Date(Date.now() + 14 * 60 * 1000).toISOString(),
          recordsProcessed: 1543
        },
        {
          service: 'Facebook Ads',
          status: 'error',
          lastSync: new Date(Date.now() - 45 * 60 * 1000).toISOString(),
          errorMessage: 'API rate limit exceeded'
        }
      ]);
    } finally {
      setLoading(false);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'connected':
        return <CheckCircleIcon className="h-4 w-4 text-green-500" />;
      case 'syncing':
        return <CloudArrowDownIcon className="h-4 w-4 text-blue-500 animate-pulse" />;
      case 'error':
        return <ExclamationTriangleIcon className="h-4 w-4 text-red-500" />;
      case 'disconnected':
        return <XMarkIcon className="h-4 w-4 text-gray-400" />;
      default:
        return <ClockIcon className="h-4 w-4 text-gray-400" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'connected':
        return 'bg-green-100 text-green-800';
      case 'syncing':
        return 'bg-blue-100 text-blue-800';
      case 'error':
        return 'bg-red-100 text-red-800';
      case 'disconnected':
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const formatTimeAgo = (timestamp: string) => {
    const now = new Date();
    const time = new Date(timestamp);
    const diffInMinutes = Math.floor((now.getTime() - time.getTime()) / (1000 * 60));
    
    if (diffInMinutes < 1) return 'Just now';
    if (diffInMinutes === 1) return '1 minute ago';
    if (diffInMinutes < 60) return `${diffInMinutes} minutes ago`;
    
    const diffInHours = Math.floor(diffInMinutes / 60);
    if (diffInHours === 1) return '1 hour ago';
    if (diffInHours < 24) return `${diffInHours} hours ago`;
    
    const diffInDays = Math.floor(diffInHours / 24);
    return `${diffInDays} day${diffInDays === 1 ? '' : 's'} ago`;
  };

  const overallStatus = syncStatuses.length > 0 
    ? syncStatuses.some(s => s.status === 'error') 
      ? 'error'
      : syncStatuses.some(s => s.status === 'syncing')
        ? 'syncing'
        : 'connected'
    : 'disconnected';

  if (loading) {
    return (
      <div className="flex items-center space-x-2 px-3 py-2 bg-gray-100 rounded-md animate-pulse">
        <div className="w-4 h-4 bg-gray-300 rounded-full"></div>
        <div className="w-16 h-4 bg-gray-300 rounded"></div>
      </div>
    );
  }

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`flex items-center space-x-2 px-3 py-2 rounded-md border text-sm font-medium transition-colors ${
          overallStatus === 'error'
            ? 'bg-red-50 border-red-200 text-red-700 hover:bg-red-100'
            : overallStatus === 'syncing'
            ? 'bg-blue-50 border-blue-200 text-blue-700 hover:bg-blue-100'
            : 'bg-green-50 border-green-200 text-green-700 hover:bg-green-100'
        }`}
      >
        {getStatusIcon(overallStatus)}
        <span>Sync Status</span>
        <CloudArrowUpIcon className="h-4 w-4" />
      </button>

      {isOpen && (
        <div className="absolute right-0 top-full mt-2 w-80 bg-white rounded-md shadow-lg border border-gray-200 z-50">
          <div className="p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-medium text-gray-900">Integration Status</h3>
              <button
                onClick={() => setIsOpen(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <XMarkIcon className="h-4 w-4" />
              </button>
            </div>
            
            <div className="space-y-3">
              {syncStatuses.map((sync) => (
                <div key={sync.service} className="flex items-start justify-between">
                  <div className="flex items-start space-x-3 flex-1">
                    {getStatusIcon(sync.status)}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <p className="text-sm font-medium text-gray-900 truncate">
                          {sync.service}
                        </p>
                        <span className={`ml-2 inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${getStatusColor(sync.status)}`}>
                          {sync.status}
                        </span>
                      </div>
                      <div className="mt-1 text-xs text-gray-500">
                        <p>Last sync: {formatTimeAgo(sync.lastSync)}</p>
                        {sync.recordsProcessed && (
                          <p>{sync.recordsProcessed.toLocaleString()} records processed</p>
                        )}
                        {sync.nextSync && sync.status === 'connected' && (
                          <p>Next sync: {formatTimeAgo(sync.nextSync)} (scheduled)</p>
                        )}
                        {sync.errorMessage && (
                          <p className="text-red-600 font-medium">{sync.errorMessage}</p>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-4 pt-3 border-t border-gray-100">
              <button
                onClick={fetchSyncStatus}
                className="w-full flex items-center justify-center space-x-2 px-3 py-2 text-sm text-indigo-600 hover:text-indigo-800 transition-colors"
              >
                <CloudArrowDownIcon className="h-4 w-4" />
                <span>Refresh Status</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}