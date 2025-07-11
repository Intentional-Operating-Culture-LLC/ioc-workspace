# Developer Scripts

This directory contains utility scripts for the IOC Developer Sandbox. These scripts help automate common development tasks and improve productivity.

## Available Scripts

### 🧩 Component Generator
```bash
./create-component.js
```
Interactive component generator that creates:
- React component with TypeScript
- Test file
- Storybook story
- CSS module (optional)
- Automatic index exports

**Example:**
```bash
./create-component.js
# Component name: Button
# Path: ui/buttons
# Include tests? Y
# Include Storybook story? Y
# Include CSS module? Y
# Client component? Y
```

### 🌐 API Route Generator
```bash
./create-api.js
```
Creates Next.js API routes with:
- Multiple HTTP methods support
- Request validation with Zod
- Authentication boilerplate
- Database integration examples
- Test file generation

**Example:**
```bash
./create-api.js
# Route path: users/[id]
# Methods: GET,POST,PUT,DELETE
# Include auth? Y
# Include validation? Y
# Include database? Y
```

### 📄 Page Generator
```bash
./create-page.js
```
Generates Next.js pages with:
- App Router structure
- Metadata configuration
- Loading states
- Error boundaries
- Protected routes
- Dynamic routing

**Example:**
```bash
./create-page.js
# Page path: dashboard/analytics
# Page title: Analytics Dashboard
# Protected route? Y
# Include layout? N
# Include loading? Y
# Include error boundary? Y
```

### 🛠️ Development Helpers
```bash
./dev-helpers.js <command>
```

Available commands:
- `clean` - Remove build artifacts and caches
- `analyze` - Analyze bundle size
- `typecheck` - Run TypeScript type checking
- `check` - Run all checks (lint, types, tests)
- `index-components` - Generate component index file
- `setup-hooks` - Setup git hooks
- `scripts` - List available npm scripts
- `info` - Show environment information
- `help` - Show help message

**Examples:**
```bash
./dev-helpers.js clean        # Clean build artifacts
./dev-helpers.js check        # Run all checks
./dev-helpers.js info         # Show environment info
```

## Making Scripts Executable

If scripts are not executable, run:
```bash
chmod +x *.js
```

## Adding New Scripts

When creating new scripts:

1. Add shebang at the top: `#!/usr/bin/env node`
2. Make it executable: `chmod +x script-name.js`
3. Add proper error handling
4. Include help/usage information
5. Use colors for better CLI output
6. Update this README

## Script Development Guidelines

- Use Node.js built-in modules when possible
- Provide interactive prompts for user input
- Validate user input before proceeding
- Show clear success/error messages
- Use consistent color coding:
  - Blue: Information
  - Green: Success
  - Yellow: Warning
  - Red: Error
- Generate files with proper formatting and comments

## Environment Variables

Scripts may use these environment variables:
- `NODE_ENV` - Development environment
- `DATABASE_URL` - Database connection
- `NEXT_PUBLIC_*` - Public environment variables

## Contributing

Feel free to add new scripts or improve existing ones. Make sure to:
1. Test thoroughly
2. Document usage
3. Handle edge cases
4. Follow existing patterns