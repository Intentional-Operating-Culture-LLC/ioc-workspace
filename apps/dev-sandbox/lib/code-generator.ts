/**
 * Code Generation Utilities
 * Provides utilities for generating code snippets, templates, and boilerplate
 */

export interface GeneratorOptions {
  name: string;
  type?: 'component' | 'hook' | 'api' | 'page' | 'util';
  typescript?: boolean;
  includeTests?: boolean;
  includeStyles?: boolean;
}

export interface ComponentOptions extends GeneratorOptions {
  props?: Array<{ name: string; type: string; required?: boolean }>;
  state?: Array<{ name: string; type: string; initial?: string }>;
  hooks?: string[];
  imports?: string[];
}

/**
 * Generate a React component
 */
export function generateComponent(options: ComponentOptions): string {
  const {
    name,
    props = [],
    state = [],
    hooks = [],
    imports = [],
    typescript = true,
    includeStyles = false,
  } = options;

  const propsInterface = typescript && props.length > 0 ? `
interface ${name}Props {
${props.map(p => `  ${p.name}${p.required ? '' : '?'}: ${p.type};`).join('\n')}
}
` : '';

  const componentProps = props.length > 0
    ? typescript
      ? `{ ${props.map(p => p.name).join(', ')} }: ${name}Props`
      : `{ ${props.map(p => p.name).join(', ')} }`
    : '';

  const stateDeclarations = state.map(s => 
    `  const [${s.name}, set${capitalize(s.name)}] = useState${typescript ? `<${s.type}>` : ''}(${s.initial || 'null'});`
  ).join('\n');

  const hookDeclarations = hooks.map(h => `  ${h}`).join('\n');

  const code = `import React${state.length > 0 ? ', { useState }' : ''} from 'react';
${imports.join('\n')}
${includeStyles ? `import styles from './${name}.module.css';\n` : ''}
${propsInterface}
export ${typescript ? 'const' : 'function'} ${name}${typescript ? ': React.FC' + (props.length > 0 ? `<${name}Props>` : '') : ''}${typescript ? ' = ' : ''}(${componentProps}) ${typescript ? '=>' : ''} {
${stateDeclarations}
${hookDeclarations}

  return (
    <div${includeStyles ? ` className={styles.container}` : ''}>
      {/* ${name} component */}
    </div>
  );
}${typescript ? ';' : ''}

${name}.displayName = '${name}';
`;

  return code.trim();
}

/**
 * Generate a custom React hook
 */
export function generateHook(name: string, options: { params?: string[]; returns?: string } = {}): string {
  const { params = [], returns = 'void' } = options;
  
  const hookName = name.startsWith('use') ? name : `use${capitalize(name)}`;
  const paramList = params.join(', ');

  const code = `import { useState, useEffect, useCallback } from 'react';

export function ${hookName}(${paramList})${returns !== 'void' ? `: ${returns}` : ''} {
  // Hook implementation
  const [state, setState] = useState();

  useEffect(() => {
    // Effect logic
  }, []);

  const handleAction = useCallback(() => {
    // Handler logic
  }, []);

  return ${returns !== 'void' ? '{ state, handleAction }' : ''};
}
`;

  return code.trim();
}

/**
 * Generate an API handler
 */
export function generateApiHandler(method: string, options: { auth?: boolean; validation?: boolean } = {}): string {
  const { auth = false, validation = false } = options;

  const imports = [
    `import { NextRequest, NextResponse } from 'next/server';`,
    auth ? `import { getServerSession } from 'next-auth';` : '',
    validation ? `import { z } from 'zod';` : '',
  ].filter(Boolean).join('\n');

  const authCheck = auth ? `
  const session = await getServerSession();
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
` : '';

  const validationLogic = validation ? `
  // Validate request body
  const schema = z.object({
    // Define your schema here
  });

  try {
    const body = await request.json();
    const validated = schema.parse(body);
  } catch (error) {
    return NextResponse.json({ error: 'Invalid request data' }, { status: 400 });
  }
` : '';

  const code = `${imports}

export async function ${method}(request: NextRequest) {
  try {${authCheck}${validationLogic}
    // Handler logic here
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('${method} error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
`;

  return code.trim();
}

/**
 * Generate TypeScript types from a schema
 */
export function generateTypes(schema: Record<string, any>, name: string): string {
  const generateTypeFromValue = (value: any, indent = 0): string => {
    const spacing = '  '.repeat(indent);
    
    if (Array.isArray(value)) {
      if (value.length === 0) return 'any[]';
      return `Array<${generateTypeFromValue(value[0], indent)}>`;
    }
    
    if (value === null) return 'null';
    if (typeof value === 'boolean') return 'boolean';
    if (typeof value === 'number') return 'number';
    if (typeof value === 'string') return 'string';
    
    if (typeof value === 'object') {
      const props = Object.entries(value).map(([key, val]) => 
        `${spacing}  ${key}: ${generateTypeFromValue(val, indent + 1)};`
      ).join('\n');
      
      return `{\n${props}\n${spacing}}`;
    }
    
    return 'any';
  };

  return `export interface ${name} ${generateTypeFromValue(schema)}`;
}

/**
 * Generate test boilerplate
 */
export function generateTest(name: string, type: 'component' | 'hook' | 'api' | 'util'): string {
  switch (type) {
    case 'component':
      return `import React from 'react';
import { render, screen } from '@testing-library/react';
import { ${name} } from './${name}';

describe('${name}', () => {
  it('renders without crashing', () => {
    render(<${name} />);
  });

  it('displays expected content', () => {
    render(<${name} />);
    // Add assertions
  });
});`;

    case 'hook':
      return `import { renderHook, act } from '@testing-library/react';
import { ${name} } from './${name}';

describe('${name}', () => {
  it('should initialize with default values', () => {
    const { result } = renderHook(() => ${name}());
    // Add assertions
  });

  it('should handle state updates', () => {
    const { result } = renderHook(() => ${name}());
    
    act(() => {
      // Trigger state update
    });
    
    // Add assertions
  });
});`;

    case 'api':
      return `import { NextRequest } from 'next/server';
import { GET, POST } from './route';

describe('API Route', () => {
  describe('GET', () => {
    it('should return data successfully', async () => {
      const request = new NextRequest('http://localhost:3000/api/test');
      const response = await GET(request);
      
      expect(response.status).toBe(200);
      // Add more assertions
    });
  });

  describe('POST', () => {
    it('should handle valid data', async () => {
      const request = new NextRequest('http://localhost:3000/api/test', {
        method: 'POST',
        body: JSON.stringify({ test: 'data' }),
      });
      
      const response = await POST(request);
      expect(response.status).toBe(201);
    });
  });
});`;

    case 'util':
      return `import { ${name} } from './${name}';

describe('${name}', () => {
  it('should work correctly', () => {
    // Add test cases
    expect(${name}()).toBeDefined();
  });
});`;

    default:
      return '';
  }
}

/**
 * Generate CSS module boilerplate
 */
export function generateStyles(componentName: string): string {
  return `.container {
  /* ${componentName} styles */
  padding: 1rem;
  border-radius: 0.5rem;
}

.title {
  font-size: 1.5rem;
  font-weight: 600;
  margin-bottom: 1rem;
}

.content {
  color: var(--text-secondary);
}

/* Responsive styles */
@media (max-width: 768px) {
  .container {
    padding: 0.75rem;
  }
}
`;
}

/**
 * Generate Storybook story
 */
export function generateStory(componentName: string, props: any[] = []): string {
  const argTypes = props.map(p => `    ${p.name}: { control: '${getControlType(p.type)}' },`).join('\n');
  const defaultArgs = props.map(p => `    ${p.name}: ${getDefaultValue(p.type)},`).join('\n');

  return `import type { Meta, StoryObj } from '@storybook/react';
import { ${componentName} } from './${componentName}';

const meta = {
  title: 'Components/${componentName}',
  component: ${componentName},
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
  argTypes: {
${argTypes}
  },
} satisfies Meta<typeof ${componentName}>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
${defaultArgs}
  },
};

export const Playground: Story = {
  args: {
${defaultArgs}
  },
};
`;
}

// Utility functions
function capitalize(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

function getControlType(type: string): string {
  switch (type.toLowerCase()) {
    case 'boolean':
      return 'boolean';
    case 'number':
      return 'number';
    case 'string':
      return 'text';
    default:
      return 'object';
  }
}

function getDefaultValue(type: string): string {
  switch (type.toLowerCase()) {
    case 'boolean':
      return 'false';
    case 'number':
      return '0';
    case 'string':
      return "'Sample text'";
    case 'array':
      return '[]';
    default:
      return '{}';
  }
}