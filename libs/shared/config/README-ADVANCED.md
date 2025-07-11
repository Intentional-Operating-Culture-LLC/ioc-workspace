# @ioc-core/config - Advanced Features

Advanced configuration package for IOC Core with comprehensive environment management, security hardening, and validation.

## Features

- 🔐 **Advanced Environment Management**: Type-safe environment variables with Zod validation
- 🚀 **Environment-Specific Configurations**: Optimized settings for production, beta, and development
- 🛡️ **Security Hardening**: CSP, security headers, rate limiting, and session management
- 🎯 **Feature Flags**: Advanced feature flag system with rollout strategies
- 🔑 **Secret Management**: Secure secret storage with rotation and encryption
- 🗄️ **Database Configuration**: Connection pooling, replicas, and health checks
- ✅ **Validation Scripts**: Environment validation and health checks
- 📊 **Monitoring Ready**: APM, metrics, and observability configurations

## Installation

```bash
npm install @ioc-core/config
```

## Quick Start

### 1. Initialize Configuration

```javascript
import { initialize } from '@ioc-core/config';

// Initialize configuration for your environment
const config = initialize({
  environment: process.env.NODE_ENV || 'development'
});
```

### 2. Environment Validation

```bash
# Validate current environment
npm run validate:env

# Validate production environment
npm run validate:env:prod

# Run health checks
npm run health:check
```

### 3. Use in Next.js

```javascript
// next.config.js
const { createNextConfig } = require('@ioc-core/config/next');

module.exports = createNextConfig(process.env.NODE_ENV);
```

## Configuration Modules

### Environment Variables

```javascript
import { validateEnvironment } from '@ioc-core/config';

// Validate environment variables
const result = validateEnvironment(process.env);
if (!result.success) {
  console.error('Environment validation failed:', result.errors);
}
```

### Feature Flags

```javascript
import { createFeatureFlagManager } from '@ioc-core/config';

const flags = createFeatureFlagManager('production');

// Check if feature is enabled
if (flags.isEnabled('PAYMENTS_ENABLED')) {
  // Enable payment processing
}

// Get all enabled features
const enabledFeatures = flags.getEnabledFeatures();

// Check with user context
const userContext = { user: { id: '123', roles: ['admin'] } };
if (flags.isEnabled('BETA_FEATURE', userContext)) {
  // Show beta feature
}
```

### Security Configuration

```javascript
import { createSecurityConfig } from '@ioc-core/config';

const security = createSecurityConfig('production');

// Get security headers
const headers = security.headers;

// Get CSP configuration
const csp = security.csp;

// Get rate limiting config
const rateLimit = security.rateLimit;
```

### Database Configuration

```javascript
import { createDatabaseConfig } from '@ioc-core/config';

// Get PostgreSQL configuration
const dbConfig = createDatabaseConfig('production', 'postgresql');

// Get replica configuration
const replicaConfig = createDatabaseConfig('production').getReplicaConfig();

// Get health check queries
const healthQueries = createDatabaseConfig('production').getHealthCheckQueries();
```

### Secret Management

```javascript
import { createSecretManager } from '@ioc-core/config';

const secrets = createSecretManager('production');

// Get secret
const apiKey = await secrets.getSecret('API_KEY');

// Set secret with validation
await secrets.setSecret('NEW_API_KEY', 'value', {
  expiresAt: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000) // 90 days
});

// Rotate secret
const newSecret = await secrets.rotateSecret('DATABASE_PASSWORD');

// Check secrets needing rotation
const needsRotation = await secrets.getSecretsNeedingRotation(90);
```

## Environment Templates

Use the provided templates for quick setup:

- `apps/production/.env.example` - Basic production template
- `apps/production/.env.example.advanced` - Complete production template
- `apps/beta/.env.example` - Basic beta/staging template
- `apps/beta/.env.example.advanced` - Complete beta/staging template

## Validation Scripts

### Environment Validation

```bash
# Basic validation
node node_modules/@ioc-core/config/validation/env

# With options
node node_modules/@ioc-core/config/validation/env \
  --env production \
  --verbose \
  --output report.json \
  --strict
```

### Health Checks

```bash
# Run health checks
node node_modules/@ioc-core/config/validation/health
```

## Advanced Usage

### Custom Environment Schema

```javascript
import { advancedBaseSchema } from '@ioc-core/config';
import { z } from 'zod';

// Extend base schema
const customSchema = advancedBaseSchema.extend({
  CUSTOM_API_URL: z.string().url(),
  CUSTOM_TIMEOUT: z.coerce.number().int().min(1000),
});

// Validate with custom schema
const validated = customSchema.parse(process.env);
```

### Feature Flag Providers

```javascript
// Use remote feature flag provider
const flags = createFeatureFlagManager('production', {
  provider: 'remote',
  remoteUrl: 'https://api.flags.example.com',
  cacheEnabled: true,
  cacheTTL: 300000, // 5 minutes
});
```

### Security Policy Customization

```javascript
import { CSPBuilder, SecurityHeadersConfig } from '@ioc-core/config/security';

// Build custom CSP
const cspBuilder = new CSPBuilder('production');
cspBuilder
  .addSource('script-src', 'https://trusted-cdn.com')
  .addSource('img-src', 'https://images.example.com')
  .addNonce('random-nonce-here');

const csp = cspBuilder.build();

// Custom security headers
const headers = new SecurityHeadersConfig('production');
headers
  .addHeader('X-Custom-Header', 'value')
  .removeHeader('X-Powered-By');
```

## Environment Differences

### Production
- Strict security policies
- Optimized caching
- Connection pooling
- Required monitoring
- No debug features

### Beta/Staging
- Relaxed security for testing
- Debug features enabled
- Beta feature flags
- Test user creation
- Enhanced logging

### Development
- Minimal security
- All features enabled
- Verbose logging
- No SSL requirements
- Mock services available

## Best Practices

1. **Always validate environments** before deployment
2. **Use environment templates** as starting points
3. **Rotate secrets regularly** (90 days recommended)
4. **Enable monitoring** in production
5. **Use feature flags** for gradual rollouts
6. **Test configurations** in beta before production
7. **Keep secrets out** of version control
8. **Use read replicas** for production databases
9. **Enable rate limiting** for all public APIs
10. **Configure proper CSP** for security

## Environment Variables Reference

### Core Configuration
- `NODE_ENV` - Environment mode (production/staging/development)
- `DEPLOYMENT_ENV` - Deployment environment identifier
- `DEPLOYMENT_REGION` - AWS/cloud region
- `APP_VERSION` - Application version
- `PORT` - Main application port

### Security
- `NEXTAUTH_SECRET` - NextAuth encryption key (64+ chars in production)
- `ENCRYPTION_KEY` - General encryption key
- `JWT_SECRET` - JWT signing secret
- `SESSION_MAX_AGE` - Session duration in seconds

### Database
- `DATABASE_URL` - Primary database connection
- `DATABASE_REPLICA_URL` - Read replica connection
- `DATABASE_SSL_MODE` - SSL enforcement level
- `DATABASE_POOL_MIN/MAX` - Connection pool limits

### Caching
- `REDIS_URL` - Redis connection string
- `CACHE_STRATEGY` - memory/redis/hybrid
- `CACHE_TTL_*` - Cache TTL settings

### Monitoring
- `SENTRY_DSN` - Error tracking
- `APM_ENABLED` - Application performance monitoring
- `METRICS_ENABLED` - Metrics collection
- `LOG_LEVEL` - Logging verbosity

### Feature Flags
- `FEATURE_*` - Feature toggle flags
- `FEATURE_FLAGS_PROVIDER` - env/config/remote
- `FEATURE_FLAGS_CACHE_TTL` - Cache duration

## Contributing

See the main repository CONTRIBUTING.md for guidelines.

## License

ISC