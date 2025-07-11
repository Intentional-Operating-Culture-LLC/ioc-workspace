'use client';

import { useState } from 'react';
import { 
  ClipboardDocumentIcon,
  CheckIcon,
  ArrowDownTrayIcon,
  CodeBracketIcon,
  DocumentIcon,
  ServerIcon,
  CubeIcon
} from '@heroicons/react/24/outline';

interface Template {
  id: string;
  name: string;
  description: string;
  category: 'component' | 'page' | 'api' | 'hook';
  icon: React.ComponentType<{ className?: string }>;
  variables?: Array<{
    name: string;
    label: string;
    placeholder: string;
    default?: string;
  }>;
  generate: (vars: Record<string, string>) => string;
}

const templates: Template[] = [
  {
    id: 'react-component',
    name: 'React Component',
    description: 'A TypeScript React functional component with props',
    category: 'component',
    icon: CubeIcon,
    variables: [
      { name: 'componentName', label: 'Component Name', placeholder: 'MyComponent' },
      { name: 'props', label: 'Props (comma separated)', placeholder: 'title: string, onClick: () => void' }
    ],
    generate: (vars) => {
      const propsArray = vars.props ? vars.props.split(',').map(p => p.trim()) : [];
      const propsInterface = propsArray.length > 0 
        ? `interface ${vars.componentName}Props {\n${propsArray.map(p => `  ${p};`).join('\n')}\n}\n\n`
        : '';
      
      return `'use client';

import { FC } from 'react';

${propsInterface}export const ${vars.componentName}: FC${propsInterface ? `<${vars.componentName}Props>` : ''} = (${propsInterface ? 'props' : ''}) => {
  return (
    <div className="p-4">
      <h2>${vars.componentName}</h2>
      {/* Your component content here */}
    </div>
  );
};

export default ${vars.componentName};`;
    }
  },
  {
    id: 'nextjs-page',
    name: 'Next.js Page',
    description: 'A Next.js 14 app directory page with metadata',
    category: 'page',
    icon: DocumentIcon,
    variables: [
      { name: 'pageName', label: 'Page Name', placeholder: 'Dashboard' },
      { name: 'title', label: 'Page Title', placeholder: 'My Dashboard' },
      { name: 'description', label: 'Page Description', placeholder: 'Dashboard for managing resources' }
    ],
    generate: (vars) => `import { Metadata } from 'next';

export const metadata: Metadata = {
  title: '${vars.title || vars.pageName}',
  description: '${vars.description || `${vars.pageName} page`}',
};

export default function ${vars.pageName}Page() {
  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-4xl font-bold mb-8">${vars.title || vars.pageName}</h1>
      <p className="text-gray-600">${vars.description || 'Page content goes here'}</p>
      
      {/* Add your page content here */}
    </div>
  );
}`
  },
  {
    id: 'api-route',
    name: 'API Route',
    description: 'Next.js API route with TypeScript and error handling',
    category: 'api',
    icon: ServerIcon,
    variables: [
      { name: 'routeName', label: 'Route Name', placeholder: 'users' },
      { name: 'methods', label: 'HTTP Methods (comma separated)', placeholder: 'GET, POST', default: 'GET' }
    ],
    generate: (vars) => {
      const methods = vars.methods.split(',').map(m => m.trim().toUpperCase());
      const handlers = methods.map(method => {
        if (method === 'GET') {
          return `export async function GET(request: Request) {
  try {
    // Fetch data logic here
    const data = await fetch${vars.routeName}();
    
    return Response.json(data);
  } catch (error) {
    console.error('GET /${vars.routeName} error:', error);
    return Response.json(
      { error: 'Internal Server Error' },
      { status: 500 }
    );
  }
}`;
        } else if (method === 'POST') {
          return `export async function POST(request: Request) {
  try {
    const body = await request.json();
    
    // Validate input
    if (!body.name) {
      return Response.json(
        { error: 'Name is required' },
        { status: 400 }
      );
    }
    
    // Create resource logic here
    const created = await create${vars.routeName}(body);
    
    return Response.json(created, { status: 201 });
  } catch (error) {
    console.error('POST /${vars.routeName} error:', error);
    return Response.json(
      { error: 'Internal Server Error' },
      { status: 500 }
    );
  }
}`;
        } else if (method === 'PUT') {
          return `export async function PUT(request: Request) {
  try {
    const body = await request.json();
    
    // Update resource logic here
    const updated = await update${vars.routeName}(body);
    
    return Response.json(updated);
  } catch (error) {
    console.error('PUT /${vars.routeName} error:', error);
    return Response.json(
      { error: 'Internal Server Error' },
      { status: 500 }
    );
  }
}`;
        } else if (method === 'DELETE') {
          return `export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    
    if (!id) {
      return Response.json(
        { error: 'ID is required' },
        { status: 400 }
      );
    }
    
    // Delete resource logic here
    await delete${vars.routeName}(id);
    
    return Response.json({ success: true });
  } catch (error) {
    console.error('DELETE /${vars.routeName} error:', error);
    return Response.json(
      { error: 'Internal Server Error' },
      { status: 500 }
    );
  }
}`;
        }
        return '';
      }).filter(Boolean).join('\n\n');
      
      return `import { NextRequest } from 'next/server';

// Mock functions - replace with actual implementation
async function fetch${vars.routeName}() {
  return { data: [] };
}

async function create${vars.routeName}(data: any) {
  return { id: '1', ...data };
}

async function update${vars.routeName}(data: any) {
  return { id: '1', ...data };
}

async function delete${vars.routeName}(id: string) {
  return { id };
}

${handlers}`;
    }
  },
  {
    id: 'custom-hook',
    name: 'Custom Hook',
    description: 'React custom hook with TypeScript',
    category: 'hook',
    icon: CodeBracketIcon,
    variables: [
      { name: 'hookName', label: 'Hook Name (without use prefix)', placeholder: 'FetchData' },
      { name: 'returnType', label: 'Return Type', placeholder: '{ data: T[], loading: boolean, error: Error | null }' }
    ],
    generate: (vars) => `import { useState, useEffect } from 'react';

${vars.returnType ? `type Use${vars.hookName}Return = ${vars.returnType};` : ''}

export function use${vars.hookName}()${vars.returnType ? `: Use${vars.hookName}Return` : ''} {
  const [data, setData] = useState${vars.returnType?.includes('T[]') ? '<T[]>' : ''}([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    const fetch${vars.hookName} = async () => {
      try {
        setLoading(true);
        // Add your data fetching logic here
        const response = await fetch('/api/data');
        const result = await response.json();
        setData(result);
      } catch (err) {
        setError(err instanceof Error ? err : new Error('Unknown error'));
      } finally {
        setLoading(false);
      }
    };

    fetch${vars.hookName}();
  }, []);

  return { data, loading, error };
}`
  },
  {
    id: 'form-component',
    name: 'Form Component',
    description: 'React form component with validation',
    category: 'component',
    icon: DocumentIcon,
    variables: [
      { name: 'formName', label: 'Form Name', placeholder: 'ContactForm' },
      { name: 'fields', label: 'Form Fields (comma separated)', placeholder: 'name, email, message' }
    ],
    generate: (vars) => {
      const fields = vars.fields.split(',').map(f => f.trim());
      
      return `'use client';

import { useState, FormEvent } from 'react';

interface ${vars.formName}Data {
${fields.map(f => `  ${f}: string;`).join('\n')}
}

export default function ${vars.formName}() {
  const [formData, setFormData] = useState<${vars.formName}Data>({
${fields.map(f => `    ${f}: '',`).join('\n')}
  });
  const [errors, setErrors] = useState<Partial<${vars.formName}Data>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const validate = (): boolean => {
    const newErrors: Partial<${vars.formName}Data> = {};
    
${fields.map(f => `    if (!formData.${f}) {
      newErrors.${f} = '${f.charAt(0).toUpperCase() + f.slice(1)} is required';
    }`).join('\n')}
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    
    if (!validate()) return;
    
    setIsSubmitting(true);
    try {
      // Submit form data
      const response = await fetch('/api/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });
      
      if (response.ok) {
        // Handle success
        alert('Form submitted successfully!');
        setFormData({
${fields.map(f => `          ${f}: '',`).join('\n')}
        });
      }
    } catch (error) {
      console.error('Form submission error:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4 max-w-md mx-auto">
${fields.map(f => `      <div>
        <label htmlFor="${f}" className="block text-sm font-medium mb-1">
          ${f.charAt(0).toUpperCase() + f.slice(1)}
        </label>
        ${f === 'message' ? `<textarea
          id="${f}"
          value={formData.${f}}
          onChange={(e) => setFormData({ ...formData, ${f}: e.target.value })}
          className="dev-input w-full h-32"
          placeholder="Enter your ${f}"
        />` : `<input
          type="${f === 'email' ? 'email' : 'text'}"
          id="${f}"
          value={formData.${f}}
          onChange={(e) => setFormData({ ...formData, ${f}: e.target.value })}
          className="dev-input w-full"
          placeholder="Enter your ${f}"
        />`}
        {errors.${f} && (
          <p className="text-red-400 text-sm mt-1">{errors.${f}}</p>
        )}
      </div>`).join('\n')}
      
      <button
        type="submit"
        disabled={isSubmitting}
        className="dev-button w-full"
      >
        {isSubmitting ? 'Submitting...' : 'Submit'}
      </button>
    </form>
  );
}`;
    }
  }
];

const categoryIcons = {
  component: CubeIcon,
  page: DocumentIcon,
  api: ServerIcon,
  hook: CodeBracketIcon,
};

export default function TemplatesPage() {
  const [selectedTemplate, setSelectedTemplate] = useState<Template | null>(null);
  const [variables, setVariables] = useState<Record<string, string>>({});
  const [generatedCode, setGeneratedCode] = useState('');
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  const categories = ['all', ...Array.from(new Set(templates.map(t => t.category)))];

  const filteredTemplates = selectedCategory === 'all' 
    ? templates 
    : templates.filter(t => t.category === selectedCategory);

  const handleSelectTemplate = (template: Template) => {
    setSelectedTemplate(template);
    const defaultVars: Record<string, string> = {};
    template.variables?.forEach(v => {
      defaultVars[v.name] = v.default || '';
    });
    setVariables(defaultVars);
    setGeneratedCode('');
  };

  const handleGenerate = () => {
    if (!selectedTemplate) return;
    const code = selectedTemplate.generate(variables);
    setGeneratedCode(code);
  };

  const copyToClipboard = async (text: string, id: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  const downloadCode = () => {
    if (!generatedCode || !selectedTemplate) return;
    
    const blob = new Blob([generatedCode], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${variables.componentName || variables.pageName || variables.routeName || variables.formName || variables.hookName || 'template'}.${selectedTemplate.category === 'api' ? 'ts' : 'tsx'}`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-4 text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-purple-600">
            Code Templates
          </h1>
          <p className="text-gray-400 text-lg">
            Generate boilerplate code for common patterns with customizable templates
          </p>
        </div>

        {/* Category Filter */}
        <div className="mb-6 flex gap-2">
          {categories.map(category => (
            <button
              key={category}
              onClick={() => setSelectedCategory(category)}
              className={`px-4 py-2 rounded-lg transition-colors ${
                selectedCategory === category
                  ? 'bg-cyan-500 text-white'
                  : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
              }`}
            >
              {category.charAt(0).toUpperCase() + category.slice(1)}
            </button>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Template List */}
          <div className="lg:col-span-1">
            <div className="dev-card">
              <h2 className="text-xl font-semibold mb-4">Available Templates</h2>
              <div className="space-y-2">
                {filteredTemplates.map(template => {
                  const Icon = template.icon;
                  return (
                    <button
                      key={template.id}
                      onClick={() => handleSelectTemplate(template)}
                      className={`w-full text-left p-4 rounded-lg transition-colors ${
                        selectedTemplate?.id === template.id
                          ? 'bg-cyan-500/20 border border-cyan-500/50'
                          : 'bg-gray-800 hover:bg-gray-700'
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <Icon className="h-5 w-5 text-cyan-400 mt-0.5" />
                        <div className="flex-1">
                          <h3 className="font-semibold text-white">{template.name}</h3>
                          <p className="text-sm text-gray-400 mt-1">{template.description}</p>
                          <span className="inline-block mt-2 px-2 py-1 bg-gray-700 text-gray-300 rounded text-xs">
                            {template.category}
                          </span>
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Template Configuration and Output */}
          <div className="lg:col-span-2 space-y-6">
            {selectedTemplate ? (
              <>
                {/* Configuration */}
                <div className="dev-card">
                  <h2 className="text-xl font-semibold mb-4">Configure Template</h2>
                  <div className="space-y-4">
                    {selectedTemplate.variables?.map(variable => (
                      <div key={variable.name}>
                        <label htmlFor={variable.name} className="block text-sm font-medium mb-1">
                          {variable.label}
                        </label>
                        <input
                          type="text"
                          id={variable.name}
                          value={variables[variable.name] || ''}
                          onChange={(e) => setVariables({
                            ...variables,
                            [variable.name]: e.target.value
                          })}
                          placeholder={variable.placeholder}
                          className="dev-input w-full"
                        />
                      </div>
                    ))}
                    <button
                      onClick={handleGenerate}
                      className="dev-button"
                    >
                      Generate Code
                    </button>
                  </div>
                </div>

                {/* Generated Code */}
                {generatedCode && (
                  <div className="dev-card">
                    <div className="flex items-center justify-between mb-4">
                      <h2 className="text-xl font-semibold">Generated Code</h2>
                      <div className="flex gap-2">
                        <button
                          onClick={() => copyToClipboard(generatedCode, 'code')}
                          className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors"
                        >
                          {copiedId === 'code' ? (
                            <>
                              <CheckIcon className="h-5 w-5 text-green-400" />
                              <span className="text-sm text-green-400">Copied!</span>
                            </>
                          ) : (
                            <>
                              <ClipboardDocumentIcon className="h-5 w-5" />
                              <span className="text-sm">Copy</span>
                            </>
                          )}
                        </button>
                        <button
                          onClick={downloadCode}
                          className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors"
                        >
                          <ArrowDownTrayIcon className="h-5 w-5" />
                          <span className="text-sm">Download</span>
                        </button>
                      </div>
                    </div>
                    <pre className="overflow-x-auto p-4 bg-gray-950 rounded text-sm">
                      <code className="language-typescript text-gray-300">{generatedCode}</code>
                    </pre>
                  </div>
                )}
              </>
            ) : (
              <div className="dev-card text-center py-16">
                <CodeBracketIcon className="h-16 w-16 text-gray-600 mx-auto mb-4" />
                <p className="text-gray-400">Select a template to get started</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}