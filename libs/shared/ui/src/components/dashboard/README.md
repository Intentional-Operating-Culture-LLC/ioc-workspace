# IOC Assessment Dashboard Components

A comprehensive suite of React/Next.js UI components for building interactive assessment dashboards with advanced features including data visualization, report management, admin controls, and accessibility support.

## 📋 Table of Contents

- [Components Overview](#components-overview)
- [Installation & Setup](#installation--setup)
- [Component Documentation](#component-documentation)
- [Usage Examples](#usage-examples)
- [Accessibility Features](#accessibility-features)
- [Theming & Customization](#theming--customization)
- [Performance Considerations](#performance-considerations)
- [Contributing](#contributing)

## 🚀 Components Overview

### Main Dashboard Components

1. **InteractiveAssessmentDashboard** - Main dashboard layout with responsive grid and navigation
2. **AssessmentVisualizationSuite** - Interactive data visualization components for assessment metrics
3. **ReportManagementInterface** - Report management with rich text editing and workflow
4. **AdminControlPanel** - Admin interface for metrics configuration and user management
5. **AdvancedFeaturesModule** - Search, notifications, and accessibility features

### Key Features

- ✅ **Responsive Design** - Mobile-optimized layouts with adaptive grids
- ✅ **Real-time Data** - Live updates and real-time status indicators  
- ✅ **Rich Visualizations** - Charts, graphs, and interactive data displays
- ✅ **Report Management** - Rich text editing with version control and approval workflows
- ✅ **Admin Controls** - Comprehensive admin panel for system management
- ✅ **Accessibility** - WCAG compliant with screen reader support
- ✅ **Search & Notifications** - Global search and real-time notification system
- ✅ **Collaboration** - Commenting, sharing, and collaborative editing
- ✅ **Export Capabilities** - Multiple export formats (PDF, Excel, PNG, etc.)
- ✅ **Theming Support** - Light/dark mode with customizable themes

## 📦 Installation & Setup

### Prerequisites

```bash
npm install react react-dom next
npm install @heroicons/react recharts
npm install styled-components # optional
```

### Basic Setup

```tsx
import {
  InteractiveAssessmentDashboard,
  AssessmentVisualizationSuite,
  ReportManagementInterface,
  AdminControlPanel,
  AdvancedFeaturesModule
} from '@ioc/ui/components/dashboard';

// Basic dashboard usage
function MyDashboard() {
  const metrics = {
    totalAssessments: 150,
    activeAssessments: 25,
    completedAssessments: 125,
    averageCompletionTime: 45,
    completionRate: 83.3,
    participationRate: 92.1,
    avgScore: 78.5,
    improvement: 12.3
  };

  return (
    <InteractiveAssessmentDashboard
      metrics={metrics}
      timeRange="month"
      onTimeRangeChange={(range) => console.log('Time range changed:', range)}
      realTimeData={true}
    />
  );
}
```

## 📚 Component Documentation

### InteractiveAssessmentDashboard

Main dashboard component with comprehensive layout and navigation.

#### Props

```tsx
interface DashboardProps {
  metrics: AssessmentMetrics;
  timeRange: 'week' | 'month' | 'quarter' | 'year';
  onTimeRangeChange: (range: 'week' | 'month' | 'quarter' | 'year') => void;
  isLoading?: boolean;
  realTimeData?: boolean;
}
```

#### Features

- **Responsive Grid Layout** - Adaptive metric cards and chart containers
- **Navigation Sidebar** - Hierarchical navigation with section jumping
- **Header Controls** - Time range selector, refresh, and export options
- **Real-time Indicators** - Live status updates and data refresh
- **Mobile Optimization** - Touch-friendly interface with collapsible sidebar

#### Usage Example

```tsx
<InteractiveAssessmentDashboard
  metrics={{
    totalAssessments: 150,
    activeAssessments: 25,
    completedAssessments: 125,
    averageCompletionTime: 45,
    completionRate: 83.3,
    participationRate: 92.1,
    avgScore: 78.5,
    improvement: 12.3
  }}
  timeRange="month"
  onTimeRangeChange={(range) => setTimeRange(range)}
  realTimeData={true}
  isLoading={false}
/>
```

### AssessmentVisualizationSuite

Advanced data visualization components with interactive charts and analytics.

#### Props

```tsx
interface VisualizationSuiteProps {
  analytics: AssessmentAnalytics;
  onExport?: (chartId: string, format: 'png' | 'svg' | 'pdf') => void;
  onFilter?: (chartId: string, filters: Record<string, any>) => void;
  realTimeEnabled?: boolean;
  interactiveMode?: boolean;
}
```

#### Chart Types

- **Bar Charts** - Assessment completion rates and comparisons
- **Line Charts** - Performance trends over time
- **Pie Charts** - Assessment type distribution
- **Radar Charts** - OCEAN model coverage visualization
- **Area Charts** - User engagement metrics
- **Composed Charts** - Combined metrics with multiple data series

#### Usage Example

```tsx
<AssessmentVisualizationSuite
  analytics={{
    completionRates: [
      { name: 'Jan', value: 45 },
      { name: 'Feb', value: 52 },
      { name: 'Mar', value: 61 }
    ],
    oceanCoverage: [
      { name: 'Openness', value: 85 },
      { name: 'Conscientiousness', value: 92 }
    ],
    performanceMetrics: [],
    userEngagement: [],
    assessmentTypes: [],
    businessImpact: []
  }}
  onExport={(chartId, format) => exportChart(chartId, format)}
  realTimeEnabled={true}
  interactiveMode={true}
/>
```

### ReportManagementInterface

Comprehensive report management with rich text editing and workflow management.

#### Props

```tsx
interface ReportManagementProps {
  initialReports?: Report[];
  onCreateReport?: () => void;
  onUpdateReport?: (report: Report) => void;
  onDeleteReport?: (reportId: string) => void;
  onExportReport?: (reportId: string, format: string) => void;
  onShareReport?: (reportId: string) => void;
  canCreateReports?: boolean;
  canEditReports?: boolean;
  canDeleteReports?: boolean;
}
```

#### Features

- **Rich Text Editor** - Full-featured editor with formatting, tables, and media
- **Version Control** - Track changes and maintain version history
- **Approval Workflow** - Multi-step approval process with comments
- **Export Options** - PDF, DOCX, HTML, Markdown, Excel, PowerPoint
- **Collaboration** - Real-time editing with commenting system
- **Search & Filter** - Advanced filtering and search capabilities

#### Usage Example

```tsx
<ReportManagementInterface
  initialReports={reports}
  onCreateReport={() => createNewReport()}
  onUpdateReport={(report) => updateReport(report)}
  onExportReport={(id, format) => exportReport(id, format)}
  canCreateReports={true}
  canEditReports={true}
  canDeleteReports={true}
/>
```

### AdminControlPanel

Administrative interface for system configuration and user management.

#### Props

```tsx
interface AdminControlPanelProps {
  initialConfig?: Partial<AdminConfig>;
  onConfigUpdate?: (config: AdminConfig) => void;
  onUserAction?: (action: string, userId: string, data?: any) => void;
  onSystemAction?: (action: string, data?: any) => void;
  canManageUsers?: boolean;
  canManageSystem?: boolean;
  canViewLogs?: boolean;
  canManageIntegrations?: boolean;
}
```

#### Features

- **System Health Monitoring** - Real-time system status and service monitoring
- **User Management** - User creation, role assignment, and permissions
- **Metrics Configuration** - Alert thresholds and data retention settings
- **Security Settings** - Rate limiting, IP management, and audit logs
- **Integration Management** - Third-party service configuration
- **Backup & Recovery** - Automated backup configuration and monitoring

#### Usage Example

```tsx
<AdminControlPanel
  onConfigUpdate={(config) => saveConfig(config)}
  onUserAction={(action, userId, data) => handleUserAction(action, userId, data)}
  canManageUsers={true}
  canManageSystem={true}
  canViewLogs={true}
/>
```

### AdvancedFeaturesModule

Search, notifications, and accessibility features module.

#### Props

```tsx
interface AdvancedFeaturesProps {
  onSearch?: (query: string) => Promise<SearchResult[]>;
  onSearchResultSelect?: (result: SearchResult) => void;
  notifications?: Notification[];
  onNotificationAction?: (notificationId: string, action: string, data?: any) => void;
  accessibilitySettings?: AccessibilitySettings;
  onAccessibilityChange?: (settings: AccessibilitySettings) => void;
  enableSearch?: boolean;
  enableNotifications?: boolean;
  enableAccessibility?: boolean;
  enableCollaboration?: boolean;
}
```

#### Features

- **Global Search** - Intelligent search across all content types
- **Notification Center** - Real-time notifications with action buttons
- **Accessibility Settings** - Comprehensive accessibility customization
- **Keyboard Navigation** - Full keyboard support with shortcuts
- **Screen Reader Support** - ARIA labels and announcements
- **Multi-language Support** - Internationalization ready

#### Usage Example

```tsx
<AdvancedFeaturesModule
  onSearch={async (query) => await searchAPI(query)}
  onSearchResultSelect={(result) => navigateToResult(result)}
  notifications={notifications}
  accessibilitySettings={a11ySettings}
  onAccessibilityChange={(settings) => updateA11ySettings(settings)}
  enableSearch={true}
  enableNotifications={true}
  enableAccessibility={true}
/>
```

## ♿ Accessibility Features

### WCAG 2.1 AA Compliance

- **Semantic HTML** - Proper heading hierarchy and landmark elements
- **Keyboard Navigation** - Full keyboard accessibility with logical tab order
- **Screen Reader Support** - ARIA labels, descriptions, and live regions
- **Color Contrast** - High contrast mode and color-blind friendly options
- **Focus Management** - Visible focus indicators and focus trapping
- **Alternative Text** - Comprehensive alt text for images and charts

### Accessibility Settings

```tsx
const accessibilitySettings = {
  screenReader: false,
  highContrast: false,
  largeText: false,
  reducedMotion: false,
  focusVisible: true,
  keyboardNavigation: true,
  colorBlindSupport: false,
  fontSize: 16,
  lineHeight: 1.5,
  colorScheme: 'auto',
  language: 'en',
  announcements: true,
  alternativeText: true,
  skipLinks: true
};
```

### Keyboard Shortcuts

- **Ctrl/Cmd + K** - Open global search
- **Ctrl/Cmd + /** - Open help
- **Tab** - Navigate forward
- **Shift + Tab** - Navigate backward
- **Enter** - Activate focused element
- **Escape** - Close modals/dropdowns
- **Arrow Keys** - Navigate lists and menus

## 🎨 Theming & Customization

### Color Palettes

```tsx
const colorPalettes = {
  primary: ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6'],
  ocean: ['#1E40AF', '#059669', '#D97706', '#DC2626', '#7C3AED'],
  performance: ['#22C55E', '#EAB308', '#F97316', '#EF4444'],
  engagement: ['#6366F1', '#8B5CF6', '#EC4899', '#F59E0B'],
  neutral: ['#6B7280', '#9CA3AF', '#D1D5DB', '#F3F4F6']
};
```

### Theme Customization

```tsx
// Custom theme provider
<DashboardThemeProvider theme={{
  colors: {
    primary: '#3B82F6',
    secondary: '#10B981',
    accent: '#F59E0B',
    danger: '#EF4444'
  },
  typography: {
    fontFamily: 'Inter, sans-serif',
    fontSize: {
      sm: '0.875rem',
      base: '1rem',
      lg: '1.125rem',
      xl: '1.25rem'
    }
  },
  spacing: {
    xs: '0.25rem',
    sm: '0.5rem',
    md: '1rem',
    lg: '1.5rem',
    xl: '2rem'
  }
}}>
  <InteractiveAssessmentDashboard />
</DashboardThemeProvider>
```

## ⚡ Performance Considerations

### Optimization Features

- **Lazy Loading** - Dynamic imports for heavy components
- **Virtualization** - Virtual scrolling for large data sets
- **Memoization** - React.memo and useMemo for expensive calculations
- **Code Splitting** - Route-based and component-based code splitting
- **Debounced Search** - Optimized search with request debouncing
- **Caching** - Intelligent data caching and invalidation

### Performance Best Practices

```tsx
// Lazy loading example
const AssessmentVisualizationSuite = lazy(() => 
  import('./AssessmentVisualizationSuite')
);

// Memoized metrics calculation
const calculatedMetrics = useMemo(() => {
  return calculateMetrics(rawData);
}, [rawData]);

// Debounced search
const debouncedSearch = useCallback(
  debounce(async (query) => {
    const results = await searchAPI(query);
    setResults(results);
  }, 300),
  []
);
```

## 🔧 Development & Contributing

### Project Structure

```
src/components/dashboard/
├── InteractiveAssessmentDashboard.tsx
├── AssessmentVisualizationSuite.tsx
├── ReportManagementInterface.tsx
├── AdminControlPanel.tsx
├── AdvancedFeaturesModule.tsx
├── charts/
│   ├── BarChart.tsx
│   └── LineChart.tsx
├── index.ts
└── README.md
```

### Development Setup

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Run tests
npm run test

# Build components
npm run build

# Type checking
npm run type-check

# Lint code
npm run lint
```

### Testing

```tsx
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { InteractiveAssessmentDashboard } from './InteractiveAssessmentDashboard';

describe('InteractiveAssessmentDashboard', () => {
  it('renders metrics correctly', () => {
    const metrics = {
      totalAssessments: 150,
      completionRate: 83.3
    };
    
    render(<InteractiveAssessmentDashboard metrics={metrics} />);
    
    expect(screen.getByText('150')).toBeInTheDocument();
    expect(screen.getByText('83.3%')).toBeInTheDocument();
  });
  
  it('handles time range changes', async () => {
    const onTimeRangeChange = jest.fn();
    
    render(
      <InteractiveAssessmentDashboard 
        onTimeRangeChange={onTimeRangeChange}
      />
    );
    
    fireEvent.click(screen.getByText('Month'));
    
    await waitFor(() => {
      expect(onTimeRangeChange).toHaveBeenCalledWith('month');
    });
  });
});
```

### Contributing Guidelines

1. **Follow TypeScript best practices** - Use proper typing and interfaces
2. **Maintain accessibility standards** - Ensure WCAG 2.1 AA compliance
3. **Write comprehensive tests** - Unit tests and integration tests
4. **Document new features** - Update README and add JSDoc comments
5. **Follow design system** - Use consistent spacing, colors, and typography
6. **Optimize performance** - Consider bundle size and runtime performance

### Code Style

```tsx
// Component structure example
interface ComponentProps {
  // Required props first
  data: DataType;
  onAction: (id: string) => void;
  
  // Optional props with defaults
  isLoading?: boolean;
  showHeader?: boolean;
  className?: string;
}

export const Component: React.FC<ComponentProps> = ({
  data,
  onAction,
  isLoading = false,
  showHeader = true,
  className = ''
}) => {
  // Hooks
  const [state, setState] = useState();
  
  // Event handlers
  const handleClick = useCallback(() => {
    onAction('id');
  }, [onAction]);
  
  // Render
  return (
    <div className={`component-base ${className}`}>
      {/* Component content */}
    </div>
  );
};
```

## 📄 License

This project is part of the IOC Framework and follows the project's licensing terms.

## 🤝 Support

For questions, issues, or contributions:

- **Documentation**: Check the README files in each component directory
- **Issues**: Create an issue in the project repository
- **Discussions**: Use GitHub Discussions for questions and feature requests
- **Contact**: Reach out to the development team

---

Built with ❤️ for the IOC Assessment Platform