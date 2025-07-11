'use client';

import { useState } from 'react';

export default function AutomationTestPage() {
  const [results, setResults] = useState({});
  const [executing, setExecuting] = useState(new Set());

  const testCommands = [
    { key: 'test-echo', label: 'Test Echo' },
    { key: 'system-info', label: 'System Info' },
    { key: 'disk-usage', label: 'Disk Usage' },
    { key: 'memory-usage', label: 'Memory Usage' },
    { key: 'claude-tools-test', label: 'Claude Tools Test' }
  ];

  const executeTest = async (command) => {
    setExecuting(prev => new Set(prev).add(command));
    
    try {
      const response = await fetch('/api/automation/test-connection', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ command })
      });

      const result = await response.json();
      
      setResults(prev => ({
        ...prev,
        [command]: result
      }));
    } catch (error) {
      setResults(prev => ({
        ...prev,
        [command]: { error: error.message, success: false }
      }));
    } finally {
      setExecuting(prev => {
        const newSet = new Set(prev);
        newSet.delete(command);
        return newSet;
      });
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">Automation Bridge Test</h1>
        
        <div className="bg-white rounded-lg shadow-sm p-6 mb-8">
          <h2 className="text-xl font-semibold mb-4">Connection Tests</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {testCommands.map((cmd) => (
              <div key={cmd.key} className="border rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="font-medium">{cmd.label}</h3>
                  <button
                    onClick={() => executeTest(cmd.key)}
                    disabled={executing.has(cmd.key)}
                    className="px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
                  >
                    {executing.has(cmd.key) ? 'Running...' : 'Test'}
                  </button>
                </div>
                
                {results[cmd.key] && (
                  <div className="mt-3 p-3 bg-gray-50 rounded text-sm">
                    {results[cmd.key].success ? (
                      <div>
                        <div className="text-green-600 font-medium mb-1">Success</div>
                        <div className="text-gray-600">
                          Duration: {results[cmd.key].duration}ms
                        </div>
                        <pre className="mt-2 text-xs bg-white p-2 rounded overflow-x-auto">
                          {results[cmd.key].output}
                        </pre>
                      </div>
                    ) : (
                      <div>
                        <div className="text-red-600 font-medium mb-1">Error</div>
                        <div className="text-red-600 text-xs">
                          {results[cmd.key].error || results[cmd.key].details}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
        
        <div className="text-center">
          <a
            href="/automation"
            className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Back to Automation Dashboard
          </a>
        </div>
      </div>
    </div>
  );
}