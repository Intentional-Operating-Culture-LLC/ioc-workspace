# IOC Core Shared Configuration

This package provides shared configuration files for the IOC Core monorepo, ensuring consistency across all applications and environments.

## Features

- **Next.js Configuration**: Base Next.js config with security headers, image optimization, and webpack customizations
- **Tailwind CSS Configuration**: Shared design system with IOC brand colors and utilities
- **TypeScript Configuration**: Base TypeScript settings with strict mode and path aliases
- **ESLint Configuration**: Code quality rules for React, Next.js, and TypeScript
- **PostCSS Configuration**: Tailwind CSS processing with autoprefixer support

## Usage

### Next.js Configuration

```javascript
// next.config.js
const { createNextConfig } = require('@ioc-core/config/next');

module.exports = createNextConfig({
  env: 'production', // or 'development' / 'staging'
  extend: {
    // Add app-specific overrides here
  },
});
```

### Tailwind CSS Configuration

```javascript
// tailwind.config.js
const { createTailwindConfig } = require('@ioc-core/config/tailwind');

module.exports = createTailwindConfig({
  additionalContent: ['./custom/**/*.{js,ts,jsx,tsx}'],
  extend: {
    // Add app-specific customizations
  },
});
```

### TypeScript Configuration

```json
// tsconfig.json
{
  "extends": "@ioc-core/config/typescript"
}
```

For staging environments with relaxed settings:
```json
// tsconfig.json
{
  "extends": "./packages/config/src/tsconfig.staging.json"
}
```

### ESLint Configuration

```javascript
// .eslintrc.js
const { createEslintConfig } = require('@ioc-core/config/eslint');

module.exports = createEslintConfig({
  env: 'development',
  extend: {
    // Add app-specific rules
  },
});
```

### PostCSS Configuration

```javascript
// postcss.config.js
const { createPostcssConfig } = require('@ioc-core/config/postcss');

module.exports = createPostcssConfig({
  legacy: false, // Use new @tailwindcss/postcss plugin
});
```

## IOC Brand Colors

The shared configuration includes the complete IOC brand palette:

### Primary Colors
- `ioc-navy`: #1e3a8a
- `ioc-blue`: #3b82f6
- `ioc-light-blue`: #60a5fa
- `ioc-slate`: #334155
- `ioc-gray`: #64748b

### Extended Palette
- `ioc-dark-navy`: #1e2a5a
- `ioc-medium-blue`: #2563eb
- `ioc-sky`: #0ea5e9
- `ioc-light-gray`: #94a3b8
- `ioc-dark-gray`: #475569

### Semantic Colors
- `ioc-success`: #059669
- `ioc-warning`: #d97706
- `ioc-error`: #dc2626
- `ioc-info`: #0284c7

## Environment-Specific Configurations

### Development
- Console logging enabled
- Strict TypeScript checking
- All ESLint rules active

### Staging
- Relaxed TypeScript settings
- Custom staging environment variables
- Legacy Tailwind plugin support

### Production
- Console logging disabled
- Strict ESLint rules
- Production optimizations enabled

## Directory Structure

```
packages/config/
├── src/
│   ├── index.js              # Main exports
│   ├── next.config.js        # Next.js configurations
│   ├── tailwind.config.js    # Tailwind CSS configurations
│   ├── tsconfig.json         # TypeScript configurations
│   ├── tsconfig.base.json    # Base TypeScript settings
│   ├── tsconfig.staging.json # Staging TypeScript settings
│   ├── eslint.config.js      # ESLint configurations
│   ├── postcss.config.js     # PostCSS configurations
│   ├── brand-colors.js       # IOC brand colors
│   └── utils.js              # Utility functions
├── package.json
└── README.md
```

## Migration Guide

To migrate an existing application to use shared configurations:

1. **Update package.json** to include the config package:
   ```json
   {
     "devDependencies": {
       "@ioc-core/config": "workspace:*"
     }
   }
   ```

2. **Replace configuration files** with shared config imports:
   - `next.config.js` → Use `createNextConfig()`
   - `tailwind.config.js` → Use `createTailwindConfig()`
   - `tsconfig.json` → Extend shared config
   - `postcss.config.js` → Use `createPostcssConfig()`

3. **Test the build process** to ensure all configurations work correctly

## Development

To modify shared configurations:

1. Edit files in `packages/config/src/`
2. Test changes across all applications
3. Update version and publish changes

## Contributing

When adding new configuration options:

1. Follow the factory pattern for extensibility
2. Support environment-specific overrides
3. Document new features in this README
4. Test with all applications in the monorepo