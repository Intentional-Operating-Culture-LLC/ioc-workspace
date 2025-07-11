# IOC Assessment Platform v3.1.1

> Intentional Operating Culture Assessment Platform - Transform your organization's culture through data-driven insights.

## 🚀 Quick Start

```bash
# Install dependencies
npm install

# Run development server
npm run dev

# Run tests with automated email reports
npm run test:demo

# Build for production
npm run build
```

## 📁 Project Structure

```
ioc-core/
├── 00_Core/                    # Core system hierarchy and foundations
├── apps/                       # Application modules (production, beta, dev)
├── packages/                   # Shared packages and components
├── docs/                       # Documentation and reports
│   ├── reports/               # Test and validation reports
│   ├── guides/                # Setup and usage guides
│   ├── deployment/            # Deployment documentation
│   └── api/                   # API documentation
├── scripts/                    # Utility scripts and automation
│   ├── build/                 # Build scripts
│   ├── deployment/            # Deployment automation
│   ├── testing/               # Test automation
│   ├── email/                 # Email utilities
│   ├── fixes/                 # Fix and migration scripts
│   └── utilities/             # General utilities
├── tests/                      # Test suites and validation
│   ├── automated-testing/     # Automated test system
│   ├── reports/               # Test result reports
│   ├── data/                  # Test data
│   └── configs/               # Test configurations
├── deployment/                 # Deployment configurations
│   ├── configs/               # Environment configs
│   ├── infrastructure/        # Docker and infrastructure
│   ├── monitoring/            # Monitoring setup
│   └── logs/                  # Deployment logs
└── archive/                    # Historical and deprecated files
```

## 🛠️ Development

### Monorepo Commands

```bash
# Start all applications
npm run dev

# Start specific applications
npm run dev:production          # Production app (port 3001)
npm run dev:beta               # Beta/staging app (port 3009)
npm run dev:dev                # Developer sandbox (port 3010)

# Build commands
npm run build                   # Build all
npm run build:production        # Build production only
npm run build:beta             # Build beta only

# Testing
npm run test                    # Run all tests
npm run test:demo              # Send automated test report
npm run test:setup             # Setup automated testing
```

## 📧 Automated Testing System

The platform includes enterprise-grade automated testing with email reports via SendGrid:

```bash
# First-time setup
npm run test:setup

# Send test report
npm run test:demo

# Integration function
npm run test:trigger
```

### Features:
- ✅ Professional HTML email reports
- ✅ SendGrid integration (100% delivery rate)
- ✅ 7/7 tests passing (Database, Auth, Organizations, etc.)
- ✅ Team distribution: admin@spearity.com, demo-reports@iocframework.com
- ✅ CI/CD ready

## 🏗️ Architecture

- **Frontend**: Next.js 15 with TypeScript
- **Styling**: Tailwind CSS v4
- **Database**: Supabase/PostgreSQL
- **Deployment**: Vercel (Multi-environment)
- **Email**: SendGrid API
- **Testing**: Automated with email reporting
- **Monorepo**: Turbo for optimal builds

## 🌐 Environments

- **Production**: [iocframework.com](https://iocframework.com)
- **Beta/Staging**: [beta.iocframework.com](https://beta.iocframework.com)
- **Development**: localhost:3010

## 📖 Documentation

### Core Documentation
- [System Charter](00_Core/00_System_Charter.md)
- [Claude Integration Guide](CLAUDE.md)
- [Quick Start Guide](docs/guides/QUICK_START.md)

### Development Guides
- [Deployment Guide](docs/guides/DEPLOYMENT.md)
- [Build Optimization](docs/guides/BUILD_OPTIMIZATION_GUIDE.md)
- [MVP Checklist](docs/guides/MVP_CHECKLIST.md)

### API Documentation
- [API Reference](docs/api/)
- [Credentials Setup](docs/api/CREDENTIALS_SETUP.md)

### Reports
- [Test Reports](docs/reports/)
- [Deployment Status](docs/deployment/)

## 🔐 Security

- Environment variables in `.env.local` (never committed)
- SendGrid API key for email delivery
- Supabase Row Level Security
- Secure authentication flow

## 🤝 Contributing

1. Check the [MVP Checklist](docs/guides/MVP_CHECKLIST.md)
2. Review [System Charter](00_Core/00_System_Charter.md)
3. Follow the monorepo structure
4. Run tests before committing
5. Use automated testing for validation

## 🚀 Deployment

```bash
# Deploy to production
npm run deploy

# Deploy to staging
npm run staging:deploy

# Validate deployment
npm run verify-deployment
```

## 📄 License

© 2025 IOC Framework. All rights reserved.

---

For detailed documentation, see the [docs/](docs/) directory.