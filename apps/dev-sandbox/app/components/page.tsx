'use client';

import { useState, useMemo } from 'react';
import { 
  MagnifyingGlassIcon, 
  ClipboardDocumentIcon,
  CheckIcon,
  ChevronDownIcon,
  ChevronRightIcon
} from '@heroicons/react/24/outline';

// Sample components data - in production, this would come from @ioc/ui
const componentsData = [
  {
    name: 'Button',
    category: 'Form',
    description: 'A customizable button component with multiple variants',
    props: [
      { name: 'variant', type: 'primary | secondary | danger', default: 'primary' },
      { name: 'size', type: 'sm | md | lg', default: 'md' },
      { name: 'disabled', type: 'boolean', default: 'false' },
      { name: 'onClick', type: '() => void', default: '-' }
    ],
    examples: [
      {
        title: 'Basic Usage',
        code: `<Button variant="primary" onClick={() => alert('Clicked!')}>
  Click me
</Button>`,
        preview: () => (
          <button className="dev-button">Click me</button>
        )
      },
      {
        title: 'All Variants',
        code: `<div className="flex gap-4">
  <Button variant="primary">Primary</Button>
  <Button variant="secondary">Secondary</Button>
  <Button variant="danger">Danger</Button>
</div>`,
        preview: () => (
          <div className="flex gap-4">
            <button className="dev-button">Primary</button>
            <button className="dev-button bg-gray-700 hover:bg-gray-600">Secondary</button>
            <button className="dev-button bg-red-600 hover:bg-red-700">Danger</button>
          </div>
        )
      }
    ]
  },
  {
    name: 'Card',
    category: 'Layout',
    description: 'A flexible container component for grouping content',
    props: [
      { name: 'padding', type: 'none | sm | md | lg', default: 'md' },
      { name: 'hover', type: 'boolean', default: 'false' },
      { name: 'className', type: 'string', default: '-' }
    ],
    examples: [
      {
        title: 'Basic Card',
        code: `<Card>
  <h3>Card Title</h3>
  <p>Card content goes here</p>
</Card>`,
        preview: () => (
          <div className="dev-card">
            <h3 className="text-lg font-semibold mb-2">Card Title</h3>
            <p className="text-gray-400">Card content goes here</p>
          </div>
        )
      }
    ]
  },
  {
    name: 'Input',
    category: 'Form',
    description: 'Text input component with built-in validation and styling',
    props: [
      { name: 'type', type: 'text | email | password | number', default: 'text' },
      { name: 'placeholder', type: 'string', default: '-' },
      { name: 'error', type: 'string', default: '-' },
      { name: 'disabled', type: 'boolean', default: 'false' }
    ],
    examples: [
      {
        title: 'Basic Input',
        code: `<Input 
  type="email" 
  placeholder="Enter your email"
  onChange={(e) => console.log(e.target.value)}
/>`,
        preview: () => (
          <input 
            type="email" 
            placeholder="Enter your email"
            className="dev-input w-full max-w-sm"
          />
        )
      }
    ]
  },
  {
    name: 'Modal',
    category: 'Overlay',
    description: 'A modal dialog component for important interactions',
    props: [
      { name: 'isOpen', type: 'boolean', required: true },
      { name: 'onClose', type: '() => void', required: true },
      { name: 'title', type: 'string', default: '-' },
      { name: 'size', type: 'sm | md | lg | xl', default: 'md' }
    ],
    examples: [
      {
        title: 'Basic Modal',
        code: `const [isOpen, setIsOpen] = useState(false);

<Button onClick={() => setIsOpen(true)}>Open Modal</Button>
<Modal 
  isOpen={isOpen} 
  onClose={() => setIsOpen(false)}
  title="Modal Title"
>
  <p>Modal content goes here</p>
</Modal>`,
        preview: () => (
          <button className="dev-button">Open Modal (Demo)</button>
        )
      }
    ]
  },
  {
    name: 'Tabs',
    category: 'Navigation',
    description: 'Tab navigation component for organizing content',
    props: [
      { name: 'items', type: 'Array<{label: string, content: ReactNode}>', required: true },
      { name: 'defaultActive', type: 'number', default: '0' },
      { name: 'onChange', type: '(index: number) => void', default: '-' }
    ],
    examples: [
      {
        title: 'Basic Tabs',
        code: `<Tabs 
  items={[
    { label: 'Tab 1', content: <p>Content 1</p> },
    { label: 'Tab 2', content: <p>Content 2</p> },
    { label: 'Tab 3', content: <p>Content 3</p> }
  ]}
/>`,
        preview: () => (
          <div className="border border-gray-700 rounded-lg p-4">
            <div className="flex gap-4 border-b border-gray-700 pb-2">
              <button className="text-cyan-400 border-b-2 border-cyan-400 pb-1">Tab 1</button>
              <button className="text-gray-400 hover:text-white">Tab 2</button>
              <button className="text-gray-400 hover:text-white">Tab 3</button>
            </div>
            <div className="mt-4">
              <p className="text-gray-400">Content 1</p>
            </div>
          </div>
        )
      }
    ]
  }
];

const categories = Array.from(new Set(componentsData.map(c => c.category)));

export default function ComponentsPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [expandedComponents, setExpandedComponents] = useState<Set<string>>(new Set());
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  const filteredComponents = useMemo(() => {
    return componentsData.filter(component => {
      const matchesSearch = searchQuery === '' || 
        component.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        component.description.toLowerCase().includes(searchQuery.toLowerCase());
      
      const matchesCategory = selectedCategory === 'all' || component.category === selectedCategory;
      
      return matchesSearch && matchesCategory;
    });
  }, [searchQuery, selectedCategory]);

  const toggleComponent = (name: string) => {
    setExpandedComponents(prev => {
      const newSet = new Set(prev);
      if (newSet.has(name)) {
        newSet.delete(name);
      } else {
        newSet.add(name);
      }
      return newSet;
    });
  };

  const copyToClipboard = async (code: string, id: string) => {
    try {
      await navigator.clipboard.writeText(code);
      setCopiedCode(id);
      setTimeout(() => setCopiedCode(null), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-4 text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-purple-600">
            Component Library
          </h1>
          <p className="text-gray-400 text-lg">
            Browse and explore all available @ioc/ui components with live examples and documentation
          </p>
        </div>

        {/* Search and Filters */}
        <div className="mb-8 flex flex-col md:flex-row gap-4">
          <div className="flex-1 relative">
            <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search components..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="dev-input w-full pl-10"
            />
          </div>
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="dev-input"
          >
            <option value="all">All Categories</option>
            {categories.map(category => (
              <option key={category} value={category}>{category}</option>
            ))}
          </select>
        </div>

        {/* Component Grid */}
        <div className="space-y-6">
          {filteredComponents.length === 0 ? (
            <div className="dev-card text-center py-12">
              <p className="text-gray-400">No components found matching your search.</p>
            </div>
          ) : (
            filteredComponents.map(component => (
              <div key={component.name} className="dev-card">
                {/* Component Header */}
                <div 
                  className="flex items-center justify-between cursor-pointer"
                  onClick={() => toggleComponent(component.name)}
                >
                  <div className="flex items-center gap-4">
                    <h2 className="text-2xl font-semibold text-white">{component.name}</h2>
                    <span className="px-3 py-1 bg-gray-700 text-gray-300 rounded-full text-sm">
                      {component.category}
                    </span>
                  </div>
                  {expandedComponents.has(component.name) ? (
                    <ChevronDownIcon className="h-5 w-5 text-gray-400" />
                  ) : (
                    <ChevronRightIcon className="h-5 w-5 text-gray-400" />
                  )}
                </div>
                
                <p className="text-gray-400 mt-2">{component.description}</p>

                {/* Expanded Content */}
                {expandedComponents.has(component.name) && (
                  <div className="mt-6 space-y-6">
                    {/* Props Table */}
                    <div>
                      <h3 className="text-lg font-semibold mb-3 text-cyan-400">Props</h3>
                      <div className="overflow-x-auto">
                        <table className="w-full">
                          <thead>
                            <tr className="border-b border-gray-700">
                              <th className="text-left py-2 px-4 text-gray-400">Name</th>
                              <th className="text-left py-2 px-4 text-gray-400">Type</th>
                              <th className="text-left py-2 px-4 text-gray-400">Default</th>
                              <th className="text-left py-2 px-4 text-gray-400">Required</th>
                            </tr>
                          </thead>
                          <tbody>
                            {component.props.map(prop => (
                              <tr key={prop.name} className="border-b border-gray-800">
                                <td className="py-2 px-4 font-mono text-sm text-purple-400">{prop.name}</td>
                                <td className="py-2 px-4 font-mono text-sm text-green-400">{prop.type}</td>
                                <td className="py-2 px-4 font-mono text-sm text-gray-400">
                                  {prop.default || '-'}
                                </td>
                                <td className="py-2 px-4">
                                  {prop.required ? (
                                    <span className="text-red-400">Yes</span>
                                  ) : (
                                    <span className="text-gray-500">No</span>
                                  )}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>

                    {/* Examples */}
                    <div>
                      <h3 className="text-lg font-semibold mb-3 text-cyan-400">Examples</h3>
                      <div className="space-y-4">
                        {component.examples.map((example, idx) => {
                          const codeId = `${component.name}-${idx}`;
                          return (
                            <div key={idx} className="bg-gray-800 rounded-lg p-4">
                              <div className="flex items-center justify-between mb-3">
                                <h4 className="font-semibold text-white">{example.title}</h4>
                                <button
                                  onClick={() => copyToClipboard(example.code, codeId)}
                                  className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors"
                                >
                                  {copiedCode === codeId ? (
                                    <>
                                      <CheckIcon className="h-4 w-4 text-green-400" />
                                      <span className="text-sm text-green-400">Copied!</span>
                                    </>
                                  ) : (
                                    <>
                                      <ClipboardDocumentIcon className="h-4 w-4" />
                                      <span className="text-sm">Copy</span>
                                    </>
                                  )}
                                </button>
                              </div>
                              
                              {/* Preview */}
                              <div className="mb-4 p-4 bg-gray-900 rounded border border-gray-700">
                                {example.preview()}
                              </div>
                              
                              {/* Code */}
                              <pre className="overflow-x-auto p-4 bg-gray-950 rounded text-sm">
                                <code className="language-jsx text-gray-300">{example.code}</code>
                              </pre>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}