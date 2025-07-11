# IOC Developer Sandbox Guide

Welcome to the IOC Developer Sandbox! This is your complete development environment for building, testing, and showcasing components, APIs, and features.

## 🚀 Quick Start

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Start Storybook
npm run storybook

# Run tests
npm test
```

## 📁 Project Structure

```
apps/dev/
├── app/                    # Next.js App Router pages
│   ├── api/               # API routes
│   ├── dashboard/         # Dashboard pages
│   ├── templates/         # Code templates
│   └── page.tsx           # Home page
├── components/            # React components
├── lib/                   # Utility libraries
│   ├── api-client.ts      # API testing utilities
│   ├── code-generator.ts  # Code generation
│   ├── syntax-highlighter.ts # Syntax highlighting
│   └── utils.ts           # General utilities
├── contexts/              # React contexts
├── scripts/               # Developer scripts
│   ├── create-component.js # Component generator
│   ├── create-api.js      # API route generator
│   ├── create-page.js     # Page generator
│   └── dev-helpers.js     # Development utilities
├── stories/               # Storybook stories
├── utils/                 # Additional utilities
├── .storybook/           # Storybook configuration
└── package.json          # Dependencies & scripts
```

## 🛠️ Development Tools

### Component Generator
Create new components with all the boilerplate:
```bash
npm run generate:component
```

Features:
- TypeScript interfaces
- Test files
- Storybook stories
- CSS modules
- Auto-indexing

### API Route Generator
Generate API routes with validation and auth:
```bash
npm run generate:api
```

Features:
- Multiple HTTP methods
- Zod validation
- Authentication
- Database examples
- Test generation

### Page Generator
Create Next.js pages with best practices:
```bash
npm run generate:page
```

Features:
- Metadata configuration
- Loading states
- Error boundaries
- Protected routes
- Dynamic routing

### Development Helpers
Various utility commands:
```bash
npm run dev:clean      # Clean build artifacts
npm run dev:check      # Run all checks
npm run dev:info       # Environment info
npm run dev:analyze    # Bundle analysis
```

## 📚 Available Libraries

### Code Generator (`lib/code-generator.ts`)
```typescript
import { generateComponent, generateHook, generateApiHandler } from '@/lib/code-generator';

// Generate a component
const code = generateComponent({
  name: 'MyComponent',
  props: [{ name: 'title', type: 'string', required: true }],
  includeTests: true,
});
```

### Syntax Highlighter (`lib/syntax-highlighter.ts`)
```typescript
import { highlightCode, formatCode } from '@/lib/syntax-highlighter';

// Highlight code with syntax highlighting
const highlighted = await highlightCode(code, {
  language: 'typescript',
  theme: 'github-dark',
  lineNumbers: true,
});
```

### API Client (`lib/api-client.ts`)
```typescript
import { ApiClient, createApiTestSuite } from '@/lib/api-client';

// Create API client
const client = new ApiClient('http://localhost:3000/api');

// Test endpoints
const suite = createApiTestSuite('http://localhost:3000/api');
const results = await suite.testCrud('/users', { name: 'Test User' });
```

### Utilities (`lib/utils.ts`)
```typescript
import { cn, debounce, formatBytes, timeAgo } from '@/lib/utils';

// Class name merging
const className = cn('base-class', conditional && 'conditional-class');

// Debounced function
const debouncedSearch = debounce(searchFunction, 300);

// Format utilities
const size = formatBytes(1024); // "1 KB"
const time = timeAgo(new Date()); // "just now"
```

## 🎨 Storybook

Storybook is configured for component development and documentation.

### Running Storybook
```bash
npm run storybook
```

### Creating Stories
Stories are automatically discovered from:
- `stories/**/*.stories.tsx`
- `components/**/*.stories.tsx`
- `app/**/*.stories.tsx`

Example story:
```typescript
import type { Meta, StoryObj } from '@storybook/react';
import { MyComponent } from './MyComponent';

const meta = {
  title: 'Components/MyComponent',
  component: MyComponent,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
} satisfies Meta<typeof MyComponent>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    title: 'Hello World',
  },
};
```

## 🧪 Testing

### Running Tests
```bash
npm test                # Run all tests
npm run test:watch      # Watch mode
npm run test:coverage   # Coverage report
```

### Writing Tests
Tests use Jest and React Testing Library:
```typescript
import { render, screen } from '@testing-library/react';
import { MyComponent } from './MyComponent';

describe('MyComponent', () => {
  it('renders correctly', () => {
    render(<MyComponent title="Test" />);
    expect(screen.getByText('Test')).toBeInTheDocument();
  });
});
```

## 📝 Code Templates

Ready-to-use templates are available in `app/templates/`:
- `component-template.tsx` - React component template
- `hook-template.ts` - Custom hook template
- `api-route-template.ts` - API route template
- `page-template.tsx` - Next.js page template

## 🔧 Configuration

### Environment Variables
Create `.env.local` for local development:
```env
# Database
DATABASE_URL=your_database_url

# Supabase
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key

# NextAuth
NEXTAUTH_SECRET=your_nextauth_secret
NEXTAUTH_URL=http://localhost:3010
```

### TypeScript
TypeScript is configured with strict mode and path aliases:
```typescript
// Use path aliases
import { Button } from '@/components/Button';
import { useAuth } from '@/lib/hooks/useAuth';
import { cn } from '@/lib/utils';
```

## 🚀 Deployment

The dev sandbox can be deployed like any Next.js application:

```bash
# Build for production
npm run build

# Start production server
npm start
```

## 💡 Tips & Best Practices

1. **Use the generators** - They create consistent, well-structured code
2. **Write tests** - All generators include test files
3. **Document with Storybook** - Create stories for all components
4. **Use TypeScript** - Strong typing prevents bugs
5. **Follow conventions** - Consistent naming and structure
6. **Leverage utilities** - Don't reinvent the wheel

## 🤝 Contributing

1. Create feature branches
2. Write tests for new features
3. Update documentation
4. Run checks before committing:
   ```bash
   npm run dev:check
   ```

## 📚 Resources

- [Next.js Documentation](https://nextjs.org/docs)
- [React Documentation](https://react.dev)
- [TypeScript Documentation](https://www.typescriptlang.org/docs)
- [Storybook Documentation](https://storybook.js.org/docs)
- [Testing Library Documentation](https://testing-library.com/docs)

---

Happy coding! 🎉