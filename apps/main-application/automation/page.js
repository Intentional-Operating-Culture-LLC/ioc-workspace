'use client';

import { useState, useEffect } from 'react';
import { ChevronRightIcon, PlayIcon, ClockIcon, CheckCircleIcon, ExclamationTriangleIcon } from '@heroicons/react/24/outline';

export default function AutomationPage() {
  const [commands, setCommands] = useState([]);
  const [loading, setLoading] = useState(true);
  const [executionResults, setExecutionResults] = useState({});
  const [executingCommands, setExecutingCommands] = useState(new Set());

  // Fetch available commands on mount
  useEffect(() => {
    fetchCommands();
  }, []);

  const fetchCommands = async () => {
    try {
      const response = await fetch('/api/automation/execute-command');
      const data = await response.json();
      
      if (data.commands) {
        // Group commands by category
        const groupedCommands = groupCommandsByCategory(data.commands);
        setCommands(groupedCommands);
      }
    } catch (error) {
      console.error('Failed to fetch commands:', error);
      // Fallback to basic commands if full automation isn't available
      setCommands({
        'System Tests': [
          { key: 'test-echo', description: 'Test basic connection' },
          { key: 'system-info', description: 'Get system information' },
          { key: 'disk-usage', description: 'Check disk usage' },
          { key: 'memory-usage', description: 'Check memory usage' },
          { key: 'claude-tools-test', description: 'Test Claude tools directory' }
        ]
      });
    } finally {
      setLoading(false);
    }
  };

  const groupCommandsByCategory = (commands) => {
    const categories = {
      'Campaign Management': ['campaign-analyze', 'campaign-optimize', 'campaign-report'],
      'Lead Management': ['leads-score', 'leads-nurture', 'leads-report'],
      'Sales Pipeline': ['sales-analyze', 'sales-forecast', 'sales-bottlenecks'],
      'Performance Monitoring': ['performance-monitor', 'performance-alerts', 'website-health'],
      'Content Optimization': ['content-analyze', 'seo-recommendations', 'content-metrics'],
      'Executive Dashboard': ['executive-report', 'executive-summary', 'kpi-dashboard'],
      'Quick Access': ['quick-health', 'quick-alerts', 'quick-recommendations'],
      'Automation Management': ['automation-status', 'automation-run-all', 'automation-schedule'],
      'Batch Operations': ['batch-optimize', 'batch-reports']
    };

    const grouped = {};
    
    Object.entries(categories).forEach(([category, categoryCommands]) => {
      grouped[category] = commands.filter(cmd => categoryCommands.includes(cmd.key));
    });

    return grouped;
  };

  const executeCommand = async (commandKey, background = false) => {
    setExecutingCommands(prev => new Set(prev).add(commandKey));
    
    try {
      // Check if this is a system test command
      const isSystemTest = ['test-echo', 'system-info', 'disk-usage', 'memory-usage', 'claude-tools-test'].includes(commandKey);
      
      const endpoint = isSystemTest ? '/api/automation/test-connection' : '/api/automation/execute-command';
      const payload = isSystemTest ? { command: commandKey } : {
        command: commandKey,
        options: { background, timeout: 60000 }
      };

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload)
      });

      const result = await response.json();
      
      setExecutionResults(prev => ({
        ...prev,
        [commandKey]: {
          ...result,
          timestamp: new Date().toISOString()
        }
      }));

      return result;
    } catch (error) {
      console.error('Command execution failed:', error);
      setExecutionResults(prev => ({
        ...prev,
        [commandKey]: {
          success: false,
          error: error.message,
          timestamp: new Date().toISOString()
        }
      }));
    } finally {
      setExecutingCommands(prev => {
        const newSet = new Set(prev);
        newSet.delete(commandKey);
        return newSet;
      });
    }
  };

  const getResultIcon = (result) => {
    if (!result) return null;
    
    if (result.success) {
      return <CheckCircleIcon className="w-5 h-5 text-green-500" />;
    } else {
      return <ExclamationTriangleIcon className="w-5 h-5 text-red-500" />;
    }
  };

  const formatDuration = (duration) => {
    if (!duration) return '';
    return duration < 1000 ? `${duration}ms` : `${(duration / 1000).toFixed(1)}s`;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading automation commands...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Claude Automation</h1>
          <p className="mt-2 text-gray-600">
            Execute marketing, sales, and operational automation commands
          </p>
          <div className="mt-4 space-x-3">
            <a
              href="/automation/test"
              className="inline-flex items-center px-3 py-2 text-sm bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 transition-colors"
            >
              Test Connection
            </a>
            <a
              href="/automation/status"
              className="inline-flex items-center px-3 py-2 text-sm bg-blue-100 text-blue-700 rounded-md hover:bg-blue-200 transition-colors"
            >
              System Status
            </a>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="mb-8 bg-white rounded-lg shadow-sm p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <button
              onClick={() => executeCommand('quick-health')}
              disabled={executingCommands.has('quick-health')}
              className="flex items-center justify-center px-4 py-3 bg-green-50 text-green-700 rounded-lg hover:bg-green-100 transition-colors disabled:opacity-50"
            >
              {executingCommands.has('quick-health') ? (
                <ClockIcon className="w-5 h-5 mr-2 animate-spin" />
              ) : (
                <PlayIcon className="w-5 h-5 mr-2" />
              )}
              Health Check
            </button>
            
            <button
              onClick={() => executeCommand('quick-alerts')}
              disabled={executingCommands.has('quick-alerts')}
              className="flex items-center justify-center px-4 py-3 bg-yellow-50 text-yellow-700 rounded-lg hover:bg-yellow-100 transition-colors disabled:opacity-50"
            >
              {executingCommands.has('quick-alerts') ? (
                <ClockIcon className="w-5 h-5 mr-2 animate-spin" />
              ) : (
                <PlayIcon className="w-5 h-5 mr-2" />
              )}
              Check Alerts
            </button>
            
            <button
              onClick={() => executeCommand('automation-status')}
              disabled={executingCommands.has('automation-status')}
              className="flex items-center justify-center px-4 py-3 bg-blue-50 text-blue-700 rounded-lg hover:bg-blue-100 transition-colors disabled:opacity-50"
            >
              {executingCommands.has('automation-status') ? (
                <ClockIcon className="w-5 h-5 mr-2 animate-spin" />
              ) : (
                <PlayIcon className="w-5 h-5 mr-2" />
              )}
              System Status
            </button>
            
            <button
              onClick={() => executeCommand('executive-summary')}
              disabled={executingCommands.has('executive-summary')}
              className="flex items-center justify-center px-4 py-3 bg-purple-50 text-purple-700 rounded-lg hover:bg-purple-100 transition-colors disabled:opacity-50"
            >
              {executingCommands.has('executive-summary') ? (
                <ClockIcon className="w-5 h-5 mr-2 animate-spin" />
              ) : (
                <PlayIcon className="w-5 h-5 mr-2" />
              )}
              Executive Summary
            </button>
          </div>
        </div>

        {/* Command Categories */}
        <div className="space-y-6">
          {Object.entries(commands).map(([category, categoryCommands]) => (
            <div key={category} className="bg-white rounded-lg shadow-sm">
              <div className="px-6 py-4 border-b border-gray-200">
                <h3 className="text-lg font-semibold text-gray-900">{category}</h3>
              </div>
              <div className="p-6">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {categoryCommands.map((command) => (
                    <div
                      key={command.key}
                      className="border border-gray-200 rounded-lg p-4 hover:border-gray-300 transition-colors"
                    >
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="font-medium text-gray-900">{command.key}</h4>
                        {getResultIcon(executionResults[command.key])}
                      </div>
                      <p className="text-sm text-gray-600 mb-4">{command.description}</p>
                      
                      {executionResults[command.key] && (
                        <div className="mb-3 p-2 bg-gray-50 rounded text-xs">
                          <div className="flex items-center justify-between">
                            <span className={executionResults[command.key].success ? 'text-green-600' : 'text-red-600'}>
                              {executionResults[command.key].success ? 'Success' : 'Failed'}
                            </span>
                            <span className="text-gray-500">
                              {formatDuration(executionResults[command.key].duration)}
                            </span>
                          </div>
                          {executionResults[command.key].error && (
                            <div className="mt-1 text-red-600">
                              {executionResults[command.key].error}
                            </div>
                          )}
                        </div>
                      )}
                      
                      <div className="flex space-x-2">
                        <button
                          onClick={() => executeCommand(command.key)}
                          disabled={executingCommands.has(command.key)}
                          className="flex-1 flex items-center justify-center px-3 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm"
                        >
                          {executingCommands.has(command.key) ? (
                            <ClockIcon className="w-4 h-4 mr-1 animate-spin" />
                          ) : (
                            <PlayIcon className="w-4 h-4 mr-1" />
                          )}
                          Run
                        </button>
                        <button
                          onClick={() => executeCommand(command.key, true)}
                          disabled={executingCommands.has(command.key)}
                          className="px-3 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm"
                        >
                          Background
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Recent Results */}
        {Object.keys(executionResults).length > 0 && (
          <div className="mt-8 bg-white rounded-lg shadow-sm">
            <div className="px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">Recent Results</h3>
            </div>
            <div className="p-6">
              <div className="space-y-4">
                {Object.entries(executionResults)
                  .sort(([,a], [,b]) => new Date(b.timestamp) - new Date(a.timestamp))
                  .slice(0, 5)
                  .map(([commandKey, result]) => (
                    <div
                      key={`${commandKey}-${result.timestamp}`}
                      className="flex items-center justify-between p-4 bg-gray-50 rounded-lg"
                    >
                      <div className="flex items-center space-x-3">
                        {getResultIcon(result)}
                        <div>
                          <p className="font-medium text-gray-900">{commandKey}</p>
                          <p className="text-sm text-gray-500">
                            {new Date(result.timestamp).toLocaleString()}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-sm text-gray-600">
                          {formatDuration(result.duration)}
                        </p>
                        {result.success && result.parsedOutput && (
                          <p className="text-xs text-green-600">JSON output available</p>
                        )}
                      </div>
                    </div>
                  ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}