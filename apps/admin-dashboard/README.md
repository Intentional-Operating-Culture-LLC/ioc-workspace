# IOC Admin Dashboard

Real-time assessment metrics and administration dashboard for admin.iocframework.com.

## Features

- **Real-time Assessment Metrics**: Live tracking of assessment completions, progress, and analytics
- **OCEAN Analytics Dashboard**: Comprehensive personality assessment analytics with 30-facet analysis
- **System Health Monitoring**: Real-time system status and performance metrics
- **User & Organization Management**: Administrative interfaces for user and organization management
- **WebSocket Integration**: Live updates and real-time data streaming
- **Responsive Design**: Mobile-optimized dashboard with adaptive layouts

## Architecture

This admin dashboard is built as a standalone Next.js application within the IOC Core monorepo:

- **Frontend**: Next.js 14 with React 18, TypeScript, and Tailwind CSS
- **Real-time**: WebSocket integration with the existing IOC WebSocket infrastructure
- **State Management**: React hooks with real-time subscriptions
- **UI Components**: Framer Motion animations, Recharts visualization, Heroicons
- **Shared Packages**: Leverages @ioc/ui, @ioc/lib, @ioc/types, and @ioc/config

## Development

### Prerequisites

From the monorepo root, install dependencies:

```bash
npm install
```

### Start Development Server

```bash
# Start admin dashboard only
npm run dev:admin

# Or start all applications
npm run dev
```

The admin dashboard will be available at `http://localhost:3011`.

### Build for Production

```bash
# Build admin dashboard only  
npm run build:admin

# Or build all applications
npm run build
```

## Configuration

### Environment Variables

The admin dashboard uses the same environment configuration as other IOC apps:

- `NEXT_PUBLIC_SUPABASE_URL` - Supabase project URL
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` - Supabase anon key
- Other IOC-specific environment variables

### Authentication

Current implementation uses demo authentication (`admin/admin123`). In production, this should be replaced with:

- Supabase Auth integration
- Role-based access control (RBAC)
- Admin-specific permissions
- Session management

## Real-time Features

### WebSocket Integration

The dashboard connects to the existing IOC WebSocket infrastructure:

```typescript
// Subscribe to assessment metrics updates
const unsubscribe = subscribe('assessment_metrics', (data) => {
  setMetrics(prev => ({ ...prev, ...data }));
});
```

### Supported Real-time Channels

- `assessment_metrics` - Assessment completion and progress updates
- `assessment_events` - Live assessment activity feed  
- `system_health` - System status and performance alerts
- `user_activity` - User activity and engagement metrics

## Components

### Core Components

- `AdminDashboard` - Main dashboard layout and routing
- `AssessmentMetricsOverview` - Primary metrics dashboard with charts
- `RealTimeAssessmentFeed` - Live activity feed with animations
- `RealtimeProvider` - WebSocket connection and subscription management

### UI Components

- `MetricCard` - Reusable metric display cards with animations
- `AssessmentChart` - Chart component supporting line, bar, area, and pie charts
- `Navigation` - Sidebar navigation with view switching
- `Header` - Top header with connection status and user info

### Management Components

- `OceanAnalyticsDashboard` - OCEAN personality analytics (planned)
- `SystemHealthMonitor` - System monitoring interface (planned)
- `UserManagement` - User administration (planned)
- `OrganizationManagement` - Organization administration (planned)

## Data Flow

1. **Real-time Connection**: WebSocket connection established on app load
2. **Metric Fetching**: Initial data fetched from `/api/admin/metrics/assessments`
3. **Live Updates**: WebSocket messages update state in real-time
4. **Visual Updates**: Framer Motion animations provide smooth state transitions

## Deployment

### Subdomain Configuration

For `admin.iocframework.com`:

1. **DNS Configuration**: Point subdomain to deployment platform
2. **Routing**: Configure reverse proxy or platform routing
3. **SSL**: Ensure SSL certificate covers subdomain
4. **Environment**: Set production environment variables

### Platform Deployment

The admin dashboard can be deployed alongside other IOC apps or as a standalone service:

- **Vercel**: Supports monorepo deployment with subdomain routing
- **Docker**: Can be containerized as part of the larger IOC deployment
- **Traditional Hosting**: Can be built and deployed as static files with API proxy

## Security Considerations

- **Admin Authentication**: Implement robust admin authentication
- **API Security**: Secure admin API endpoints with proper authorization
- **Network Security**: Restrict admin dashboard access to authorized networks
- **Audit Logging**: Log all admin actions for security auditing
- **Session Management**: Implement secure session handling

## Performance

- **Bundle Size**: Optimized with Next.js automatic code splitting
- **Real-time Performance**: Efficient WebSocket connection pooling
- **Chart Performance**: Optimized chart rendering with Recharts
- **Caching**: Intelligent data caching with real-time invalidation

## Future Enhancements

- **Advanced Analytics**: Machine learning insights and predictions
- **Custom Dashboards**: User-configurable dashboard layouts
- **Export Capabilities**: PDF and Excel report generation
- **Mobile App**: Native mobile admin application
- **API Documentation**: Auto-generated API documentation interface
- **Audit Trails**: Comprehensive admin action logging and visualization

## Contributing

The admin dashboard follows the same contribution guidelines as the main IOC project. All changes should:

1. Include TypeScript types
2. Follow the existing component patterns
3. Include responsive design considerations
4. Maintain real-time functionality
5. Include proper error handling

## License

Part of the IOC Framework - see the main project license.