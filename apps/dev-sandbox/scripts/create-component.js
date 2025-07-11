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

async function createComponent() {
  try {
    console.log(`${colors.blue}${colors.bright}Component Generator${colors.reset}\n`);

    // Get component details
    const componentName = await question('Component name (e.g., Button): ');
    if (!componentName) {
      throw new Error('Component name is required');
    }

    const componentPath = await question('Path relative to components/ (e.g., ui/buttons): ') || '';
    const includeTests = (await question('Include tests? (Y/n): ')).toLowerCase() !== 'n';
    const includeStory = (await question('Include Storybook story? (Y/n): ')).toLowerCase() !== 'n';
    const includeStyles = (await question('Include CSS module? (Y/n): ')).toLowerCase() !== 'n';
    const isClient = (await question('Client component? (Y/n): ')).toLowerCase() !== 'n';

    // Create component directory
    const baseDir = path.join(process.cwd(), 'components', componentPath);
    const componentDir = path.join(baseDir, componentName);
    
    if (fs.existsSync(componentDir)) {
      const overwrite = (await question(`${colors.yellow}Component already exists. Overwrite? (y/N): ${colors.reset}`)).toLowerCase() === 'y';
      if (!overwrite) {
        console.log('Operation cancelled');
        rl.close();
        return;
      }
    }

    fs.mkdirSync(componentDir, { recursive: true });

    // Component content
    const componentContent = `${isClient ? "'use client';\n\n" : ''}import React from 'react';
${includeStyles ? `import styles from './${componentName}.module.css';\n` : ''}
interface ${componentName}Props {
  children?: React.ReactNode;
  className?: string;
}

export const ${componentName}: React.FC<${componentName}Props> = ({ 
  children, 
  className = '' 
}) => {
  return (
    <div className={\`${includeStyles ? `\${styles.container} ` : ''}\${className}\`}>
      {children}
    </div>
  );
};

${componentName}.displayName = '${componentName}';
`;

    // Index file content
    const indexContent = `export { ${componentName} } from './${componentName}';
export type { ${componentName}Props } from './${componentName}';
`;

    // Test file content
    const testContent = `import React from 'react';
import { render, screen } from '@testing-library/react';
import { ${componentName} } from './${componentName}';

describe('${componentName}', () => {
  it('renders without crashing', () => {
    render(<${componentName}>Test Content</${componentName}>);
    expect(screen.getByText('Test Content')).toBeInTheDocument();
  });

  it('applies custom className', () => {
    const { container } = render(
      <${componentName} className="custom-class">Test</${componentName}>
    );
    expect(container.firstChild).toHaveClass('custom-class');
  });
});
`;

    // Story file content
    const storyContent = `import type { Meta, StoryObj } from '@storybook/react';
import { ${componentName} } from './${componentName}';

const meta = {
  title: '${componentPath ? componentPath + '/' : ''}${componentName}',
  component: ${componentName},
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
  argTypes: {
    className: { control: 'text' },
  },
} satisfies Meta<typeof ${componentName}>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    children: 'Default ${componentName}',
  },
};

export const WithCustomClass: Story = {
  args: {
    children: 'Styled ${componentName}',
    className: 'custom-style',
  },
};
`;

    // CSS module content
    const styleContent = `.container {
  /* Add your styles here */
  padding: 1rem;
  border-radius: 0.5rem;
  background-color: var(--background);
  color: var(--foreground);
}
`;

    // Write files
    fs.writeFileSync(path.join(componentDir, `${componentName}.tsx`), componentContent);
    fs.writeFileSync(path.join(componentDir, 'index.ts'), indexContent);
    
    if (includeTests) {
      fs.writeFileSync(path.join(componentDir, `${componentName}.test.tsx`), testContent);
    }
    
    if (includeStory) {
      fs.writeFileSync(path.join(componentDir, `${componentName}.stories.tsx`), storyContent);
    }
    
    if (includeStyles) {
      fs.writeFileSync(path.join(componentDir, `${componentName}.module.css`), styleContent);
    }

    console.log(`\n${colors.green}✓ Component created successfully!${colors.reset}`);
    console.log(`\nFiles created:`);
    console.log(`  - ${path.relative(process.cwd(), path.join(componentDir, `${componentName}.tsx`))}`);
    console.log(`  - ${path.relative(process.cwd(), path.join(componentDir, 'index.ts'))}`);
    if (includeTests) {
      console.log(`  - ${path.relative(process.cwd(), path.join(componentDir, `${componentName}.test.tsx`))}`);
    }
    if (includeStory) {
      console.log(`  - ${path.relative(process.cwd(), path.join(componentDir, `${componentName}.stories.tsx`))}`);
    }
    if (includeStyles) {
      console.log(`  - ${path.relative(process.cwd(), path.join(componentDir, `${componentName}.module.css`))}`);
    }

    console.log(`\n${colors.blue}Import with:${colors.reset}`);
    console.log(`  import { ${componentName} } from '@/components/${componentPath ? componentPath + '/' : ''}${componentName}';`);

  } catch (error) {
    console.error(`${colors.red}Error: ${error.message}${colors.reset}`);
  } finally {
    rl.close();
  }
}

createComponent();