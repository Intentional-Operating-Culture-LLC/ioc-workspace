#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const readline = require('readline');
const { promisify } = require('util');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

const question = promisify(rl.question).bind(rl);

// Color codes for terminal output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  green: '\x1b[32m',
  blue: '\x1b[34m',
  red: '\x1b[31m',
  yellow: '\x1b[33m'
};

async function createApiRoute() {
  try {
    console.log(`${colors.blue}${colors.bright}API Route Generator${colors.reset}\n`);

    // Get API route details
    const routePath = await question('API route path (e.g., users/[id] or auth/login): ');
    if (!routePath) {
      throw new Error('Route path is required');
    }

    const methods = await question('HTTP methods (comma-separated, e.g., GET,POST,PUT,DELETE): ') || 'GET';
    const includeAuth = (await question('Include authentication? (y/N): ')).toLowerCase() === 'y';
    const includeValidation = (await question('Include request validation? (y/N): ')).toLowerCase() === 'y';
    const includeDatabase = (await question('Include database example? (y/N): ')).toLowerCase() === 'y';

    // Create route directory
    const apiDir = path.join(process.cwd(), 'app', 'api', routePath);
    
    if (fs.existsSync(path.join(apiDir, 'route.ts'))) {
      const overwrite = (await question(`${colors.yellow}Route already exists. Overwrite? (y/N): ${colors.reset}`)).toLowerCase() === 'y';
      if (!overwrite) {
        console.log('Operation cancelled');
        rl.close();
        return;
      }
    }

    fs.mkdirSync(apiDir, { recursive: true });

    // Parse methods
    const methodList = methods.split(',').map(m => m.trim().toUpperCase());

    // Generate imports
    const imports = [`import { NextRequest, NextResponse } from 'next/server';`];
    if (includeAuth) {
      imports.push(`import { getServerSession } from 'next-auth';`);
      imports.push(`import { authOptions } from '@/lib/auth';`);
    }
    if (includeValidation) {
      imports.push(`import { z } from 'zod';`);
    }
    if (includeDatabase) {
      imports.push(`import { createClient } from '@supabase/supabase-js';`);
    }

    // Generate validation schema if needed
    const validationSchema = includeValidation ? `
// Request validation schemas
const createSchema = z.object({
  name: z.string().min(1),
  email: z.string().email().optional(),
});

const updateSchema = z.object({
  name: z.string().min(1).optional(),
  email: z.string().email().optional(),
});
` : '';

    // Generate auth check function
    const authCheck = includeAuth ? `
async function checkAuth() {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: 401 }
    );
  }
  return session;
}
` : '';

    // Generate database client
    const dbClient = includeDatabase ? `
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
);
` : '';

    // Generate method handlers
    const handlers = methodList.map(method => {
      let handler = `export async function ${method}(
  request: NextRequest,
  { params }: { params: { ${routePath.includes('[') ? routePath.match(/\[(\w+)\]/g)?.map(p => p.slice(1, -1)).join(', ') : ''} } }
) {
  try {`;

      if (includeAuth) {
        handler += `
    const session = await checkAuth();
    if (session instanceof NextResponse) return session;
`;
      }

      switch (method) {
        case 'GET':
          handler += `
    ${routePath.includes('[') ? `const { ${routePath.match(/\[(\w+)\]/g)?.map(p => p.slice(1, -1)).join(', ')} } = params;` : ''}
    
    ${includeDatabase ? `// Example database query
    const { data, error } = await supabase
      .from('your_table')
      .select('*')${routePath.includes('[id]') ? `
      .eq('id', id)
      .single();` : ';'}
    
    if (error) {
      return NextResponse.json(
        { error: error.message },
        { status: 400 }
      );
    }` : '// Add your GET logic here'}

    return NextResponse.json(${includeDatabase ? 'data' : '{ message: "GET request successful" }'});`;
          break;

        case 'POST':
          handler += `
    const body = await request.json();
    
    ${includeValidation ? `// Validate request body
    const validationResult = createSchema.safeParse(body);
    if (!validationResult.success) {
      return NextResponse.json(
        { error: 'Invalid request data', details: validationResult.error.flatten() },
        { status: 400 }
      );
    }
    const data = validationResult.data;` : ''}
    
    ${includeDatabase ? `// Example database insert
    const { data: newItem, error } = await supabase
      .from('your_table')
      .insert([${includeValidation ? 'data' : 'body'}])
      .select()
      .single();
    
    if (error) {
      return NextResponse.json(
        { error: error.message },
        { status: 400 }
      );
    }` : '// Add your POST logic here'}

    return NextResponse.json(
      ${includeDatabase ? 'newItem' : '{ message: "POST request successful", data: body }'}, 
      { status: 201 }
    );`;
          break;

        case 'PUT':
        case 'PATCH':
          handler += `
    ${routePath.includes('[') ? `const { ${routePath.match(/\[(\w+)\]/g)?.map(p => p.slice(1, -1)).join(', ')} } = params;` : ''}
    const body = await request.json();
    
    ${includeValidation ? `// Validate request body
    const validationResult = updateSchema.safeParse(body);
    if (!validationResult.success) {
      return NextResponse.json(
        { error: 'Invalid request data', details: validationResult.error.flatten() },
        { status: 400 }
      );
    }
    const data = validationResult.data;` : ''}
    
    ${includeDatabase ? `// Example database update
    const { data: updatedItem, error } = await supabase
      .from('your_table')
      .update(${includeValidation ? 'data' : 'body'})${routePath.includes('[id]') ? `
      .eq('id', id)` : ''}
      .select()
      .single();
    
    if (error) {
      return NextResponse.json(
        { error: error.message },
        { status: 400 }
      );
    }` : '// Add your ' + method + ' logic here'}

    return NextResponse.json(${includeDatabase ? 'updatedItem' : '{ message: "' + method + ' request successful", data: body }'});`;
          break;

        case 'DELETE':
          handler += `
    ${routePath.includes('[') ? `const { ${routePath.match(/\[(\w+)\]/g)?.map(p => p.slice(1, -1)).join(', ')} } = params;` : ''}
    
    ${includeDatabase ? `// Example database delete
    const { error } = await supabase
      .from('your_table')
      .delete()${routePath.includes('[id]') ? `
      .eq('id', id);` : ';'}
    
    if (error) {
      return NextResponse.json(
        { error: error.message },
        { status: 400 }
      );
    }` : '// Add your DELETE logic here'}

    return NextResponse.json({ message: "DELETE request successful" });`;
          break;
      }

      handler += `
  } catch (error) {
    console.error('${method} ${routePath} error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}`;

      return handler;
    }).join('\n\n');

    // Generate complete route file
    const routeContent = `${imports.join('\n')}
${validationSchema}${authCheck}${dbClient}
${handlers}
`;

    // Write route file
    fs.writeFileSync(path.join(apiDir, 'route.ts'), routeContent);

    // Create a test file for the API route
    const testContent = `import { NextRequest } from 'next/server';
import { ${methodList.join(', ')} } from './route';

describe('API Route: ${routePath}', () => {
  ${methodList.map(method => `
  describe('${method}', () => {
    it('should handle ${method} request', async () => {
      const request = new NextRequest('http://localhost:3000/api/${routePath}', {
        method: '${method}',
        ${method !== 'GET' && method !== 'DELETE' ? `headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ test: 'data' }),` : ''}
      });

      const response = await ${method}(request, {
        params: { ${routePath.includes('[') ? routePath.match(/\[(\w+)\]/g)?.map(p => `${p.slice(1, -1)}: 'test-id'`).join(', ') : ''} }
      });

      expect(response.status).toBeLessThan(500);
    });
  });`).join('\n')}
});
`;

    fs.writeFileSync(path.join(apiDir, 'route.test.ts'), testContent);

    console.log(`\n${colors.green}✓ API route created successfully!${colors.reset}`);
    console.log(`\nFiles created:`);
    console.log(`  - ${path.relative(process.cwd(), path.join(apiDir, 'route.ts'))}`);
    console.log(`  - ${path.relative(process.cwd(), path.join(apiDir, 'route.test.ts'))}`);
    console.log(`\n${colors.blue}API endpoint:${colors.reset} /api/${routePath}`);
    console.log(`${colors.blue}Methods:${colors.reset} ${methodList.join(', ')}`);

  } catch (error) {
    console.error(`${colors.red}Error: ${error.message}${colors.reset}`);
  } finally {
    rl.close();
  }
}

createApiRoute();