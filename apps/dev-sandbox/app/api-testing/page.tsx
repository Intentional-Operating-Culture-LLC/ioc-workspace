'use client';

import { useState } from 'react';
import { 
  PlayIcon, 
  ClipboardDocumentIcon,
  CheckIcon,
  ChevronDownIcon,
  ChevronUpIcon,
  KeyIcon,
  ClockIcon
} from '@heroicons/react/24/outline';

type HttpMethod = 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';

interface RequestHistory {
  id: string;
  method: HttpMethod;
  url: string;
  timestamp: Date;
  status?: number;
  duration?: number;
}

interface Header {
  key: string;
  value: string;
  enabled: boolean;
}

const commonEndpoints = [
  { name: 'Get Users', method: 'GET' as HttpMethod, url: '/api/users' },
  { name: 'Get User by ID', method: 'GET' as HttpMethod, url: '/api/users/1' },
  { name: 'Create User', method: 'POST' as HttpMethod, url: '/api/users', body: '{\n  "name": "John Doe",\n  "email": "john@example.com"\n}' },
  { name: 'Update User', method: 'PUT' as HttpMethod, url: '/api/users/1', body: '{\n  "name": "Jane Doe"\n}' },
  { name: 'Delete User', method: 'DELETE' as HttpMethod, url: '/api/users/1' },
];

export default function ApiTestingPage() {
  const [method, setMethod] = useState<HttpMethod>('GET');
  const [url, setUrl] = useState('http://localhost:3009/api/');
  const [headers, setHeaders] = useState<Header[]>([
    { key: 'Content-Type', value: 'application/json', enabled: true },
    { key: 'Authorization', value: '', enabled: false }
  ]);
  const [body, setBody] = useState('');
  const [response, setResponse] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [history, setHistory] = useState<RequestHistory[]>([]);
  const [showHeaders, setShowHeaders] = useState(true);
  const [showBody, setShowBody] = useState(true);
  const [responseTime, setResponseTime] = useState<number | null>(null);
  const [copied, setCopied] = useState<string | null>(null);

  const methodColors: Record<HttpMethod, string> = {
    GET: 'text-green-400 bg-green-400/10',
    POST: 'text-blue-400 bg-blue-400/10',
    PUT: 'text-yellow-400 bg-yellow-400/10',
    DELETE: 'text-red-400 bg-red-400/10',
    PATCH: 'text-purple-400 bg-purple-400/10'
  };

  const sendRequest = async () => {
    setLoading(true);
    setError(null);
    setResponse(null);
    const startTime = Date.now();

    try {
      const activeHeaders: Record<string, string> = {};
      headers.forEach(header => {
        if (header.enabled && header.key && header.value) {
          activeHeaders[header.key] = header.value;
        }
      });

      const options: RequestInit = {
        method,
        headers: activeHeaders,
      };

      if (['POST', 'PUT', 'PATCH'].includes(method) && body) {
        options.body = body;
      }

      const res = await fetch(url, options);
      const duration = Date.now() - startTime;
      setResponseTime(duration);

      const contentType = res.headers.get('content-type');
      let data;
      
      if (contentType?.includes('application/json')) {
        data = await res.json();
      } else {
        data = await res.text();
      }

      setResponse({
        status: res.status,
        statusText: res.statusText,
        headers: Object.fromEntries(res.headers),
        data
      });

      // Add to history
      const historyItem: RequestHistory = {
        id: Date.now().toString(),
        method,
        url,
        timestamp: new Date(),
        status: res.status,
        duration
      };
      setHistory(prev => [historyItem, ...prev].slice(0, 10));

    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
      setResponseTime(Date.now() - startTime);
    } finally {
      setLoading(false);
    }
  };

  const addHeader = () => {
    setHeaders([...headers, { key: '', value: '', enabled: true }]);
  };

  const updateHeader = (index: number, field: 'key' | 'value' | 'enabled', value: string | boolean) => {
    const newHeaders = [...headers];
    if (field === 'enabled') {
      newHeaders[index].enabled = value as boolean;
    } else {
      newHeaders[index][field] = value as string;
    }
    setHeaders(newHeaders);
  };

  const removeHeader = (index: number) => {
    setHeaders(headers.filter((_, i) => i !== index));
  };

  const copyToClipboard = async (text: string, id: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(id);
      setTimeout(() => setCopied(null), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  const loadEndpoint = (endpoint: typeof commonEndpoints[0]) => {
    setMethod(endpoint.method);
    setUrl(`http://localhost:3009${endpoint.url}`);
    if (endpoint.body) {
      setBody(endpoint.body);
    } else {
      setBody('');
    }
  };

  const formatJson = (obj: any) => {
    try {
      return JSON.stringify(obj, null, 2);
    } catch {
      return obj;
    }
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-4 text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-purple-600">
            API Testing Interface
          </h1>
          <p className="text-gray-400 text-lg">
            Test and debug API endpoints with an interactive request builder
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Request Builder */}
          <div className="lg:col-span-2 space-y-6">
            {/* Request URL Bar */}
            <div className="dev-card">
              <div className="flex gap-4">
                <select
                  value={method}
                  onChange={(e) => setMethod(e.target.value as HttpMethod)}
                  className="dev-input w-32"
                >
                  <option value="GET">GET</option>
                  <option value="POST">POST</option>
                  <option value="PUT">PUT</option>
                  <option value="DELETE">DELETE</option>
                  <option value="PATCH">PATCH</option>
                </select>
                <input
                  type="text"
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  placeholder="Enter request URL..."
                  className="dev-input flex-1"
                />
                <button
                  onClick={sendRequest}
                  disabled={loading || !url}
                  className="dev-button flex items-center gap-2"
                >
                  <PlayIcon className="h-4 w-4" />
                  {loading ? 'Sending...' : 'Send'}
                </button>
              </div>
            </div>

            {/* Headers Section */}
            <div className="dev-card">
              <div 
                className="flex items-center justify-between cursor-pointer mb-4"
                onClick={() => setShowHeaders(!showHeaders)}
              >
                <h3 className="text-lg font-semibold">Headers</h3>
                {showHeaders ? (
                  <ChevronUpIcon className="h-5 w-5 text-gray-400" />
                ) : (
                  <ChevronDownIcon className="h-5 w-5 text-gray-400" />
                )}
              </div>
              
              {showHeaders && (
                <div className="space-y-2">
                  {headers.map((header, index) => (
                    <div key={index} className="flex gap-2 items-center">
                      <input
                        type="checkbox"
                        checked={header.enabled}
                        onChange={(e) => updateHeader(index, 'enabled', e.target.checked)}
                        className="w-4 h-4 rounded border-gray-600 bg-gray-700 text-cyan-400"
                      />
                      <input
                        type="text"
                        value={header.key}
                        onChange={(e) => updateHeader(index, 'key', e.target.value)}
                        placeholder="Header name"
                        className="dev-input flex-1"
                      />
                      <input
                        type="text"
                        value={header.value}
                        onChange={(e) => updateHeader(index, 'value', e.target.value)}
                        placeholder="Header value"
                        className="dev-input flex-1"
                      />
                      <button
                        onClick={() => removeHeader(index)}
                        className="text-gray-400 hover:text-red-400 transition-colors"
                      >
                        ×
                      </button>
                    </div>
                  ))}
                  <button
                    onClick={addHeader}
                    className="text-cyan-400 hover:text-cyan-300 text-sm"
                  >
                    + Add header
                  </button>
                </div>
              )}
            </div>

            {/* Body Section */}
            {['POST', 'PUT', 'PATCH'].includes(method) && (
              <div className="dev-card">
                <div 
                  className="flex items-center justify-between cursor-pointer mb-4"
                  onClick={() => setShowBody(!showBody)}
                >
                  <h3 className="text-lg font-semibold">Body</h3>
                  {showBody ? (
                    <ChevronUpIcon className="h-5 w-5 text-gray-400" />
                  ) : (
                    <ChevronDownIcon className="h-5 w-5 text-gray-400" />
                  )}
                </div>
                
                {showBody && (
                  <textarea
                    value={body}
                    onChange={(e) => setBody(e.target.value)}
                    placeholder="Request body (JSON)"
                    className="dev-input w-full h-48 font-mono text-sm"
                  />
                )}
              </div>
            )}

            {/* Response Section */}
            {(response || error || loading) && (
              <div className="dev-card">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold">Response</h3>
                  {responseTime && (
                    <div className="flex items-center gap-2 text-sm text-gray-400">
                      <ClockIcon className="h-4 w-4" />
                      {responseTime}ms
                    </div>
                  )}
                </div>
                
                {loading && (
                  <div className="text-center py-8">
                    <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-cyan-400"></div>
                  </div>
                )}
                
                {error && (
                  <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-4 text-red-400">
                    {error}
                  </div>
                )}
                
                {response && (
                  <div className="space-y-4">
                    {/* Status */}
                    <div className="flex items-center gap-4">
                      <span className={`px-3 py-1 rounded-full text-sm font-semibold ${
                        response.status >= 200 && response.status < 300 
                          ? 'bg-green-500/20 text-green-400'
                          : response.status >= 400 
                          ? 'bg-red-500/20 text-red-400'
                          : 'bg-yellow-500/20 text-yellow-400'
                      }`}>
                        {response.status} {response.statusText}
                      </span>
                    </div>
                    
                    {/* Response Body */}
                    <div className="relative">
                      <pre className="overflow-x-auto p-4 bg-gray-950 rounded text-sm">
                        <code className="language-json text-gray-300">
                          {typeof response.data === 'object' 
                            ? formatJson(response.data)
                            : response.data}
                        </code>
                      </pre>
                      <button
                        onClick={() => copyToClipboard(
                          typeof response.data === 'object' 
                            ? formatJson(response.data)
                            : response.data,
                          'response'
                        )}
                        className="absolute top-2 right-2 text-gray-400 hover:text-white transition-colors"
                      >
                        {copied === 'response' ? (
                          <CheckIcon className="h-5 w-5 text-green-400" />
                        ) : (
                          <ClipboardDocumentIcon className="h-5 w-5" />
                        )}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Common Endpoints */}
            <div className="dev-card">
              <h3 className="text-lg font-semibold mb-4">Common Endpoints</h3>
              <div className="space-y-2">
                {commonEndpoints.map((endpoint, index) => (
                  <button
                    key={index}
                    onClick={() => loadEndpoint(endpoint)}
                    className="w-full text-left p-3 bg-gray-800 hover:bg-gray-700 rounded-lg transition-colors"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-white">{endpoint.name}</span>
                      <span className={`px-2 py-1 rounded text-xs font-semibold ${methodColors[endpoint.method]}`}>
                        {endpoint.method}
                      </span>
                    </div>
                    <div className="text-xs text-gray-400 mt-1 font-mono">
                      {endpoint.url}
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Request History */}
            {history.length > 0 && (
              <div className="dev-card">
                <h3 className="text-lg font-semibold mb-4">History</h3>
                <div className="space-y-2">
                  {history.map((item) => (
                    <button
                      key={item.id}
                      onClick={() => {
                        setMethod(item.method);
                        setUrl(item.url);
                      }}
                      className="w-full text-left p-3 bg-gray-800 hover:bg-gray-700 rounded-lg transition-colors"
                    >
                      <div className="flex items-center justify-between">
                        <span className={`px-2 py-1 rounded text-xs font-semibold ${methodColors[item.method]}`}>
                          {item.method}
                        </span>
                        {item.status && (
                          <span className={`text-xs ${
                            item.status >= 200 && item.status < 300 
                              ? 'text-green-400'
                              : item.status >= 400 
                              ? 'text-red-400'
                              : 'text-yellow-400'
                          }`}>
                            {item.status}
                          </span>
                        )}
                      </div>
                      <div className="text-xs text-gray-400 mt-1 font-mono truncate">
                        {item.url}
                      </div>
                      <div className="text-xs text-gray-500 mt-1">
                        {item.timestamp.toLocaleTimeString()}
                        {item.duration && ` • ${item.duration}ms`}
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Auth Helper */}
            <div className="dev-card">
              <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <KeyIcon className="h-5 w-5" />
                Authentication
              </h3>
              <p className="text-gray-400 text-sm mb-3">
                Add authentication headers quickly:
              </p>
              <div className="space-y-2">
                <button
                  onClick={() => {
                    const authHeader = headers.find(h => h.key === 'Authorization');
                    if (authHeader) {
                      authHeader.value = 'Bearer YOUR_TOKEN_HERE';
                      authHeader.enabled = true;
                      setHeaders([...headers]);
                    } else {
                      setHeaders([...headers, { 
                        key: 'Authorization', 
                        value: 'Bearer YOUR_TOKEN_HERE', 
                        enabled: true 
                      }]);
                    }
                  }}
                  className="w-full text-left p-2 bg-gray-800 hover:bg-gray-700 rounded text-sm transition-colors"
                >
                  Bearer Token
                </button>
                <button
                  onClick={() => {
                    const authHeader = headers.find(h => h.key === 'Authorization');
                    if (authHeader) {
                      authHeader.value = 'Basic ' + btoa('username:password');
                      authHeader.enabled = true;
                      setHeaders([...headers]);
                    } else {
                      setHeaders([...headers, { 
                        key: 'Authorization', 
                        value: 'Basic ' + btoa('username:password'), 
                        enabled: true 
                      }]);
                    }
                  }}
                  className="w-full text-left p-2 bg-gray-800 hover:bg-gray-700 rounded text-sm transition-colors"
                >
                  Basic Auth
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}