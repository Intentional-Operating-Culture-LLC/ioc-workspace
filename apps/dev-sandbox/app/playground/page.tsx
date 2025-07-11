'use client';

import { useState, useEffect } from 'react';
import { 
  PlayIcon, 
  ArrowPathIcon,
  ShareIcon,
  DocumentDuplicateIcon,
  CodeBracketIcon,
  EyeIcon,
  Cog6ToothIcon,
  CheckIcon
} from '@heroicons/react/24/outline';

interface CodeExample {
  name: string;
  code: string;
  description: string;
}

const codeExamples: CodeExample[] = [
  {
    name: 'React Counter',
    description: 'Simple counter component with hooks',
    code: `function Counter() {
  const [count, setCount] = useState(0);
  
  return (
    <div className="p-6 bg-gray-800 rounded-lg text-center">
      <h2 className="text-2xl font-bold mb-4">Counter: {count}</h2>
      <div className="flex gap-4 justify-center">
        <button 
          onClick={() => setCount(count - 1)}
          className="px-4 py-2 bg-red-600 hover:bg-red-700 rounded"
        >
          Decrement
        </button>
        <button 
          onClick={() => setCount(count + 1)}
          className="px-4 py-2 bg-green-600 hover:bg-green-700 rounded"
        >
          Increment
        </button>
      </div>
    </div>
  );
}`
  },
  {
    name: 'Todo List',
    description: 'Interactive todo list with add/remove',
    code: `function TodoList() {
  const [todos, setTodos] = useState([]);
  const [input, setInput] = useState('');
  
  const addTodo = () => {
    if (input.trim()) {
      setTodos([...todos, { id: Date.now(), text: input }]);
      setInput('');
    }
  };
  
  const removeTodo = (id) => {
    setTodos(todos.filter(todo => todo.id !== id));
  };
  
  return (
    <div className="p-6 bg-gray-800 rounded-lg">
      <h2 className="text-2xl font-bold mb-4">Todo List</h2>
      <div className="flex gap-2 mb-4">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyPress={(e) => e.key === 'Enter' && addTodo()}
          placeholder="Add a todo..."
          className="flex-1 px-3 py-2 bg-gray-700 rounded"
        />
        <button 
          onClick={addTodo}
          className="px-4 py-2 bg-cyan-600 hover:bg-cyan-700 rounded"
        >
          Add
        </button>
      </div>
      <ul className="space-y-2">
        {todos.map(todo => (
          <li key={todo.id} className="flex items-center justify-between bg-gray-700 p-3 rounded">
            <span>{todo.text}</span>
            <button 
              onClick={() => removeTodo(todo.id)}
              className="text-red-400 hover:text-red-300"
            >
              Remove
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}`
  },
  {
    name: 'Fetch Data',
    description: 'Component that fetches and displays data',
    code: `function DataFetcher() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  
  const fetchData = async () => {
    setLoading(true);
    try {
      // Simulating API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      setData({
        users: [
          { id: 1, name: 'John Doe', email: 'john@example.com' },
          { id: 2, name: 'Jane Smith', email: 'jane@example.com' },
          { id: 3, name: 'Bob Johnson', email: 'bob@example.com' }
        ]
      });
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };
  
  return (
    <div className="p-6 bg-gray-800 rounded-lg">
      <h2 className="text-2xl font-bold mb-4">User Data</h2>
      <button 
        onClick={fetchData}
        disabled={loading}
        className="mb-4 px-4 py-2 bg-purple-600 hover:bg-purple-700 rounded disabled:opacity-50"
      >
        {loading ? 'Loading...' : 'Fetch Data'}
      </button>
      {data && (
        <div className="space-y-2">
          {data.users.map(user => (
            <div key={user.id} className="bg-gray-700 p-3 rounded">
              <div className="font-semibold">{user.name}</div>
              <div className="text-gray-400 text-sm">{user.email}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}`
  }
];

export default function PlaygroundPage() {
  const [code, setCode] = useState(codeExamples[0].code);
  const [preview, setPreview] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'code' | 'preview'>('code');
  const [theme, setTheme] = useState<'dark' | 'light'>('dark');
  const [fontSize, setFontSize] = useState(14);
  const [autoRun, setAutoRun] = useState(true);
  const [copied, setCopied] = useState(false);
  const [shareUrl, setShareUrl] = useState('');

  // Simple transpilation (in production, use a proper transpiler)
  const transpileCode = (code: string): string => {
    try {
      // Basic transformation - in production use Babel
      let transformed = code;
      
      // Convert JSX-like syntax to React.createElement calls (simplified)
      transformed = transformed.replace(
        /<(\w+)([^>]*)>(.*?)<\/\1>/gs,
        (match, tag, attrs, children) => {
          return `React.createElement('${tag}', {${attrs}}, ${children ? `'${children}'` : 'null'})`;
        }
      );
      
      // Wrap in IIFE
      transformed = `
        (() => {
          const { useState, useEffect } = React;
          ${transformed}
          return typeof Counter !== 'undefined' ? Counter() : 
                 typeof TodoList !== 'undefined' ? TodoList() :
                 typeof DataFetcher !== 'undefined' ? DataFetcher() :
                 'No component found';
        })()
      `;
      
      return transformed;
    } catch (err) {
      throw new Error('Failed to transpile code');
    }
  };

  const runCode = () => {
    try {
      setError(null);
      // In production, use a proper sandbox iframe
      const result = transpileCode(code);
      setPreview(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    }
  };

  useEffect(() => {
    if (autoRun) {
      const timer = setTimeout(() => {
        runCode();
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [code, autoRun]);

  const copyCode = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  const shareCode = () => {
    // In production, implement proper sharing functionality
    const encodedCode = btoa(code);
    const url = `${window.location.origin}/playground?code=${encodedCode}`;
    setShareUrl(url);
  };

  const loadExample = (example: CodeExample) => {
    setCode(example.code);
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      <div className="h-screen flex flex-col">
        {/* Header */}
        <div className="border-b border-gray-700 px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-6">
              <h1 className="text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-purple-600">
                Code Playground
              </h1>
              
              {/* Example Selector */}
              <select
                onChange={(e) => {
                  const example = codeExamples.find(ex => ex.name === e.target.value);
                  if (example) loadExample(example);
                }}
                className="dev-input text-sm"
              >
                {codeExamples.map(example => (
                  <option key={example.name} value={example.name}>
                    {example.name}
                  </option>
                ))}
              </select>
            </div>
            
            {/* Toolbar */}
            <div className="flex items-center gap-2">
              <button
                onClick={runCode}
                className="flex items-center gap-2 px-3 py-1.5 bg-green-600 hover:bg-green-700 rounded text-sm"
              >
                <PlayIcon className="h-4 w-4" />
                Run
              </button>
              
              <button
                onClick={() => setAutoRun(!autoRun)}
                className={`flex items-center gap-2 px-3 py-1.5 rounded text-sm ${
                  autoRun ? 'bg-cyan-600 hover:bg-cyan-700' : 'bg-gray-700 hover:bg-gray-600'
                }`}
              >
                <ArrowPathIcon className="h-4 w-4" />
                Auto
              </button>
              
              <button
                onClick={copyCode}
                className="flex items-center gap-2 px-3 py-1.5 bg-gray-700 hover:bg-gray-600 rounded text-sm"
              >
                {copied ? (
                  <>
                    <CheckIcon className="h-4 w-4 text-green-400" />
                    Copied!
                  </>
                ) : (
                  <>
                    <DocumentDuplicateIcon className="h-4 w-4" />
                    Copy
                  </>
                )}
              </button>
              
              <button
                onClick={shareCode}
                className="flex items-center gap-2 px-3 py-1.5 bg-gray-700 hover:bg-gray-600 rounded text-sm"
              >
                <ShareIcon className="h-4 w-4" />
                Share
              </button>
              
              <div className="flex items-center gap-2 px-3 py-1.5 bg-gray-800 rounded">
                <Cog6ToothIcon className="h-4 w-4 text-gray-400" />
                <select
                  value={fontSize}
                  onChange={(e) => setFontSize(Number(e.target.value))}
                  className="bg-transparent text-sm outline-none"
                >
                  <option value="12">12px</option>
                  <option value="14">14px</option>
                  <option value="16">16px</option>
                  <option value="18">18px</option>
                </select>
              </div>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 flex">
          {/* Editor Panel */}
          <div className="flex-1 flex flex-col border-r border-gray-700">
            <div className="flex border-b border-gray-700">
              <button
                onClick={() => setActiveTab('code')}
                className={`flex items-center gap-2 px-4 py-2 ${
                  activeTab === 'code' 
                    ? 'bg-gray-800 text-cyan-400 border-b-2 border-cyan-400' 
                    : 'text-gray-400 hover:text-white'
                }`}
              >
                <CodeBracketIcon className="h-4 w-4" />
                Code
              </button>
              <button
                onClick={() => setActiveTab('preview')}
                className={`flex items-center gap-2 px-4 py-2 md:hidden ${
                  activeTab === 'preview' 
                    ? 'bg-gray-800 text-cyan-400 border-b-2 border-cyan-400' 
                    : 'text-gray-400 hover:text-white'
                }`}
              >
                <EyeIcon className="h-4 w-4" />
                Preview
              </button>
            </div>
            
            {activeTab === 'code' && (
              <div className="flex-1 relative">
                <textarea
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  className={`w-full h-full p-4 bg-gray-950 text-gray-300 font-mono resize-none outline-none`}
                  style={{ fontSize: `${fontSize}px` }}
                  spellCheck={false}
                />
              </div>
            )}
          </div>

          {/* Preview Panel */}
          <div className={`flex-1 flex flex-col ${activeTab === 'code' ? 'hidden md:flex' : 'flex'}`}>
            <div className="flex items-center justify-between px-4 py-2 border-b border-gray-700 bg-gray-800">
              <span className="flex items-center gap-2 text-sm font-medium">
                <EyeIcon className="h-4 w-4" />
                Preview
              </span>
              <button
                onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
                className="text-sm text-gray-400 hover:text-white"
              >
                Theme: {theme}
              </button>
            </div>
            
            <div className={`flex-1 p-4 overflow-auto ${theme === 'light' ? 'bg-white text-gray-900' : 'bg-gray-950'}`}>
              {error ? (
                <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-4 text-red-400">
                  <div className="font-semibold mb-1">Error:</div>
                  <div className="font-mono text-sm">{error}</div>
                </div>
              ) : (
                <div className="space-y-4">
                  {/* In production, render actual React components in sandboxed iframe */}
                  <div className="bg-gray-800 rounded-lg p-6 text-center">
                    <CodeBracketIcon className="h-16 w-16 text-gray-600 mx-auto mb-4" />
                    <p className="text-gray-400">
                      Component preview would render here in production.
                    </p>
                    <p className="text-sm text-gray-500 mt-2">
                      This is a simplified demo. Full playground requires a sandboxed execution environment.
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Share Modal */}
        {shareUrl && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
            <div className="bg-gray-800 rounded-lg p-6 max-w-md w-full">
              <h3 className="text-lg font-semibold mb-4">Share Your Code</h3>
              <input
                type="text"
                value={shareUrl}
                readOnly
                className="dev-input w-full mb-4"
                onClick={(e) => e.currentTarget.select()}
              />
              <div className="flex gap-2">
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(shareUrl);
                    setShareUrl('');
                  }}
                  className="dev-button flex-1"
                >
                  Copy Link
                </button>
                <button
                  onClick={() => setShareUrl('')}
                  className="px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}