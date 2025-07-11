'use client';

import { useState, useEffect } from 'react';
import { CheckCircleIcon, XCircleIcon, ClockIcon } from '@heroicons/react/24/outline';

export default function AutomationStatusPage() {
  const [status, setStatus] = useState({
    bridge: null,
    tools: null,
    commands: null
  });
  
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkStatus();
  }, []);

  const checkStatus = async () => {
    setLoading(true);
    
    const results = {
      bridge: await checkBridge(),
      tools: await checkTools(),
      commands: await checkCommands()
    };
    
    setStatus(results);
    setLoading(false);
  };

  const checkBridge = async () => {
    try {
      const response = await fetch('/api/automation/test-connection');
      const data = await response.json();
      return {
        status: response.ok ? 'healthy' : 'error',
        message: data.message || 'Bridge connection test endpoint available',
        details: data
      };
    } catch (error) {
      return {
        status: 'error',
        message: 'Failed to connect to automation bridge',
        details: { error: error.message }
      };
    }
  };

  const checkTools = async () => {
    try {
      const response = await fetch('/api/automation/test-connection', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ command: 'claude-tools-test' })
      });
      const data = await response.json();
      return {
        status: data.success ? 'healthy' : 'error',
        message: data.success ? 'Claude tools directory accessible' : 'Claude tools directory not accessible',
        details: data
      };
    } catch (error) {
      return {
        status: 'error',
        message: 'Failed to check Claude tools',
        details: { error: error.message }
      };
    }
  };

  const checkCommands = async () => {
    try {
      const response = await fetch('/api/automation/execute-command');
      const data = await response.json();
      return {
        status: response.ok ? 'healthy' : 'warning',
        message: data.commands ? `${data.commands.length} automation commands available` : 'Full automation system not available',
        details: data
      };
    } catch (error) {
      return {
        status: 'warning',
        message: 'Full automation system not available, using basic commands',
        details: { error: error.message }
      };
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'healthy':
        return <CheckCircleIcon className="w-6 h-6 text-green-500" />;
      case 'warning':
        return <ClockIcon className="w-6 h-6 text-yellow-500" />;
      case 'error':
        return <XCircleIcon className="w-6 h-6 text-red-500" />;
      default:
        return <ClockIcon className="w-6 h-6 text-gray-400 animate-spin" />;
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'healthy':
        return 'border-green-200 bg-green-50';
      case 'warning':
        return 'border-yellow-200 bg-yellow-50';
      case 'error':
        return 'border-red-200 bg-red-50';
      default:
        return 'border-gray-200 bg-gray-50';
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Checking automation status...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Automation System Status</h1>
          <p className="mt-2 text-gray-600">
            Current status of the Claude automation bridge and related systems
          </p>
        </div>

        <div className="space-y-6">
          {/* Bridge Status */}
          <div className={`rounded-lg border-2 p-6 ${getStatusColor(status.bridge?.status)}`}>
            <div className="flex items-center">
              {getStatusIcon(status.bridge?.status)}
              <div className="ml-4">
                <h3 className="text-lg font-semibold text-gray-900">Automation Bridge</h3>
                <p className="text-gray-600">{status.bridge?.message}</p>
              </div>
            </div>
          </div>

          {/* Tools Status */}
          <div className={`rounded-lg border-2 p-6 ${getStatusColor(status.tools?.status)}`}>
            <div className="flex items-center">
              {getStatusIcon(status.tools?.status)}
              <div className="ml-4">
                <h3 className="text-lg font-semibold text-gray-900">Claude Tools</h3>
                <p className="text-gray-600">{status.tools?.message}</p>
              </div>
            </div>
          </div>

          {/* Commands Status */}
          <div className={`rounded-lg border-2 p-6 ${getStatusColor(status.commands?.status)}`}>
            <div className="flex items-center">
              {getStatusIcon(status.commands?.status)}
              <div className="ml-4">
                <h3 className="text-lg font-semibold text-gray-900">Automation Commands</h3>
                <p className="text-gray-600">{status.commands?.message}</p>
              </div>
            </div>
          </div>
        </div>

        {/* System Information */}
        <div className="mt-8 bg-white rounded-lg shadow-sm p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">System Information</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <h4 className="font-medium text-gray-700">Bridge Status</h4>
              <p className="text-sm text-gray-600">
                {status.bridge?.status === 'healthy' ? 'Connected' : 'Disconnected'}
              </p>
            </div>
            <div>
              <h4 className="font-medium text-gray-700">Tools Directory</h4>
              <p className="text-sm text-gray-600">/home/darren/ioc-core/tools/claude/</p>
            </div>
            <div>
              <h4 className="font-medium text-gray-700">Available Commands</h4>
              <p className="text-sm text-gray-600">
                {status.commands?.details?.totalCommands || 5} commands
              </p>
            </div>
            <div>
              <h4 className="font-medium text-gray-700">Last Check</h4>
              <p className="text-sm text-gray-600">
                {new Date().toLocaleTimeString()}
              </p>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="mt-8 flex justify-center space-x-4">
          <button
            onClick={checkStatus}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Refresh Status
          </button>
          <a
            href="/automation"
            className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
          >
            Back to Automation
          </a>
        </div>
      </div>
    </div>
  );
}