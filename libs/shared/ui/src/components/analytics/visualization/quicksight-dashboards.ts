// QuickSight Dashboard Configurations for IOC Analytics

export interface DashboardConfig {
  id: string;
  name: string;
  description: string;
  minimumMRR: number; // Minimum MRR to enable this dashboard
  updateFrequency: 'realtime' | 'hourly' | 'daily' | 'weekly';
  datasets: string[];
  visuals: VisualConfig[];
}

export interface VisualConfig {
  id: string;
  type: 'KPI' | 'LINE' | 'BAR' | 'PIE' | 'DONUT' | 'HEATMAP' | 'TABLE' | 'PIVOT';
  title: string;
  query: string;
  formatting?: any;
}

// Executive Dashboard - Available at $500+ MRR
export const executiveDashboard: DashboardConfig = {
  id: 'executive-overview',
  name: 'Executive Overview',
  description: 'High-level business metrics and KPIs',
  minimumMRR: 500,
  updateFrequency: 'daily',
  datasets: ['assessment_events', 'subscription_events', 'user_events'],
  visuals: [
    {
      id: 'mrr-kpi',
      type: 'KPI',
      title: 'Monthly Recurring Revenue',
      query: `
        SELECT 
          SUM(metrics.monthly_revenue) as current_mrr,
          LAG(SUM(metrics.monthly_revenue), 1) OVER (ORDER BY month) as previous_mrr,
          (SUM(metrics.monthly_revenue) - LAG(SUM(metrics.monthly_revenue), 1) OVER (ORDER BY month)) / 
          LAG(SUM(metrics.monthly_revenue), 1) OVER (ORDER BY month) * 100 as growth_rate
        FROM subscription_events
        WHERE event_type = 'subscription.created'
          AND DATE_TRUNC('month', timestamp) = DATE_TRUNC('month', CURRENT_DATE)
      `
    },
    {
      id: 'user-growth',
      type: 'LINE',
      title: 'User Growth Trend',
      query: `
        SELECT 
          DATE_TRUNC('day', timestamp) as date,
          COUNT(DISTINCT user_id) as new_users,
          SUM(COUNT(DISTINCT user_id)) OVER (ORDER BY DATE_TRUNC('day', timestamp)) as cumulative_users
        FROM user_events
        WHERE event_type = 'user.registered'
          AND timestamp >= CURRENT_DATE - INTERVAL '30 days'
        GROUP BY 1
        ORDER BY 1
      `
    },
    {
      id: 'assessment-volume',
      type: 'BAR',
      title: 'Daily Assessment Volume',
      query: `
        SELECT 
          DATE_TRUNC('day', timestamp) as date,
          COUNT(CASE WHEN event_type = 'assessment.started' THEN 1 END) as started,
          COUNT(CASE WHEN event_type = 'assessment.completed' THEN 1 END) as completed,
          CAST(COUNT(CASE WHEN event_type = 'assessment.completed' THEN 1 END) AS FLOAT) / 
          NULLIF(COUNT(CASE WHEN event_type = 'assessment.started' THEN 1 END), 0) * 100 as completion_rate
        FROM assessment_events
        WHERE timestamp >= CURRENT_DATE - INTERVAL '7 days'
        GROUP BY 1
        ORDER BY 1
      `
    },
    {
      id: 'revenue-breakdown',
      type: 'PIE',
      title: 'Revenue by Plan Type',
      query: `
        SELECT 
          attributes.plan_type as plan,
          COUNT(*) as subscriptions,
          SUM(metrics.monthly_revenue) as revenue
        FROM subscription_events
        WHERE event_type = 'subscription.created'
          AND DATE_TRUNC('month', timestamp) = DATE_TRUNC('month', CURRENT_DATE)
        GROUP BY 1
      `
    }
  ]
};

// Assessment Analytics Dashboard - Available at $500+ MRR
export const assessmentDashboard: DashboardConfig = {
  id: 'assessment-analytics',
  name: 'Assessment Analytics',
  description: 'Detailed assessment performance and OCEAN metrics',
  minimumMRR: 500,
  updateFrequency: 'hourly',
  datasets: ['assessment_events', 'assessment_scores'],
  visuals: [
    {
      id: 'ocean-distribution',
      type: 'BAR',
      title: 'OCEAN Score Distribution',
      query: `
        WITH score_ranges AS (
          SELECT 
            CASE 
              WHEN metrics.ocean_openness < 30 THEN 'Low (0-30)'
              WHEN metrics.ocean_openness < 70 THEN 'Medium (30-70)'
              ELSE 'High (70-100)'
            END as openness_range,
            CASE 
              WHEN metrics.ocean_conscientiousness < 30 THEN 'Low (0-30)'
              WHEN metrics.ocean_conscientiousness < 70 THEN 'Medium (30-70)'
              ELSE 'High (70-100)'
            END as conscientiousness_range,
            -- Similar for other OCEAN dimensions
            COUNT(*) as count
          FROM assessment_events
          WHERE event_type = 'assessment.completed'
            AND timestamp >= CURRENT_DATE - INTERVAL '30 days'
          GROUP BY 1, 2
        )
        SELECT * FROM score_ranges
      `
    },
    {
      id: 'completion-time',
      type: 'LINE',
      title: 'Average Completion Time by Assessment Type',
      query: `
        SELECT 
          DATE_TRUNC('day', timestamp) as date,
          attributes.assessment_type,
          AVG(metrics.duration_seconds / 60.0) as avg_minutes,
          COUNT(*) as completions
        FROM assessment_events
        WHERE event_type = 'assessment.completed'
          AND timestamp >= CURRENT_DATE - INTERVAL '14 days'
        GROUP BY 1, 2
        ORDER BY 1, 2
      `
    },
    {
      id: 'ai-validation',
      type: 'HEATMAP',
      title: 'AI Validation Confidence Matrix',
      query: `
        SELECT 
          ROUND(metrics.ai_confidence * 10) / 10 as confidence_bucket,
          ROUND(metrics.dual_ai_agreement * 10) / 10 as agreement_bucket,
          COUNT(*) as assessments,
          AVG(metrics.composite_score) as avg_score
        FROM assessment_events
        WHERE event_type = 'assessment.completed'
          AND metrics.ai_confidence IS NOT NULL
          AND timestamp >= CURRENT_DATE - INTERVAL '7 days'
        GROUP BY 1, 2
        ORDER BY 1, 2
      `
    },
    {
      id: 'assessment-funnel',
      type: 'BAR',
      title: 'Assessment Completion Funnel',
      query: `
        WITH funnel AS (
          SELECT 
            attributes.assessment_type,
            SUM(CASE WHEN event_type = 'assessment.started' THEN 1 ELSE 0 END) as started,
            SUM(CASE WHEN event_type = 'assessment.completed' THEN 1 ELSE 0 END) as completed,
            SUM(CASE WHEN event_type = 'assessment.abandoned' THEN 1 ELSE 0 END) as abandoned
          FROM assessment_events
          WHERE timestamp >= CURRENT_DATE - INTERVAL '7 days'
          GROUP BY 1
        )
        SELECT 
          assessment_type,
          started,
          completed,
          abandoned,
          CAST(completed AS FLOAT) / NULLIF(started, 0) * 100 as completion_rate
        FROM funnel
        ORDER BY completion_rate DESC
      `
    }
  ]
};

// User Behavior Dashboard - Available at $1000+ MRR
export const userBehaviorDashboard: DashboardConfig = {
  id: 'user-behavior',
  name: 'User Behavior Analytics',
  description: 'User engagement and feature usage patterns',
  minimumMRR: 1000,
  updateFrequency: 'hourly',
  datasets: ['user_events', 'feature_events', 'session_events'],
  visuals: [
    {
      id: 'feature-adoption',
      type: 'BAR',
      title: 'Feature Adoption Rates',
      query: `
        SELECT 
          attributes.feature_name,
          COUNT(DISTINCT user_id) as unique_users,
          COUNT(*) as total_uses,
          COUNT(*) / COUNT(DISTINCT user_id) as uses_per_user
        FROM feature_events
        WHERE event_type LIKE 'feature.%.used'
          AND timestamp >= CURRENT_DATE - INTERVAL '30 days'
        GROUP BY 1
        ORDER BY unique_users DESC
        LIMIT 20
      `
    },
    {
      id: 'user-cohorts',
      type: 'LINE',
      title: 'Weekly Cohort Retention',
      query: `
        WITH cohorts AS (
          SELECT 
            user_id,
            DATE_TRUNC('week', MIN(timestamp)) as cohort_week
          FROM user_events
          WHERE event_type = 'user.registered'
          GROUP BY 1
        ),
        activity AS (
          SELECT 
            c.cohort_week,
            DATE_DIFF('week', c.cohort_week, DATE_TRUNC('week', e.timestamp)) as weeks_later,
            COUNT(DISTINCT e.user_id) as active_users
          FROM cohorts c
          JOIN user_events e ON c.user_id = e.user_id
          WHERE e.timestamp >= c.cohort_week
          GROUP BY 1, 2
        )
        SELECT 
          cohort_week,
          weeks_later,
          active_users,
          CAST(active_users AS FLOAT) / FIRST_VALUE(active_users) 
            OVER (PARTITION BY cohort_week ORDER BY weeks_later) * 100 as retention_rate
        FROM activity
        WHERE cohort_week >= CURRENT_DATE - INTERVAL '12 weeks'
          AND weeks_later <= 8
        ORDER BY cohort_week, weeks_later
      `
    },
    {
      id: 'engagement-score',
      type: 'DONUT',
      title: 'User Engagement Distribution',
      query: `
        WITH user_engagement AS (
          SELECT 
            user_id,
            COUNT(DISTINCT DATE_TRUNC('day', timestamp)) as active_days,
            COUNT(DISTINCT attributes.feature_category) as features_used,
            COUNT(*) as total_events,
            CASE 
              WHEN COUNT(DISTINCT DATE_TRUNC('day', timestamp)) >= 20 THEN 'High'
              WHEN COUNT(DISTINCT DATE_TRUNC('day', timestamp)) >= 10 THEN 'Medium'
              ELSE 'Low'
            END as engagement_level
          FROM user_events
          WHERE timestamp >= CURRENT_DATE - INTERVAL '30 days'
          GROUP BY 1
        )
        SELECT 
          engagement_level,
          COUNT(*) as users,
          AVG(active_days) as avg_active_days,
          AVG(features_used) as avg_features_used
        FROM user_engagement
        GROUP BY 1
      `
    }
  ]
};

// Revenue Analytics Dashboard - Available at $2000+ MRR
export const revenueDashboard: DashboardConfig = {
  id: 'revenue-analytics',
  name: 'Revenue Analytics',
  description: 'Detailed revenue metrics and forecasting',
  minimumMRR: 2000,
  updateFrequency: 'daily',
  datasets: ['subscription_events', 'payment_events', 'churn_analysis'],
  visuals: [
    {
      id: 'mrr-growth',
      type: 'LINE',
      title: 'MRR Growth & Composition',
      query: `
        WITH monthly_mrr AS (
          SELECT 
            DATE_TRUNC('month', timestamp) as month,
            SUM(CASE WHEN event_type = 'subscription.created' THEN metrics.monthly_revenue ELSE 0 END) as new_mrr,
            SUM(CASE WHEN event_type = 'subscription.upgraded' THEN metrics.revenue_delta ELSE 0 END) as expansion_mrr,
            SUM(CASE WHEN event_type = 'subscription.downgraded' THEN metrics.revenue_delta ELSE 0 END) as contraction_mrr,
            SUM(CASE WHEN event_type = 'subscription.cancelled' THEN -metrics.monthly_revenue ELSE 0 END) as churned_mrr
          FROM subscription_events
          WHERE timestamp >= CURRENT_DATE - INTERVAL '12 months'
          GROUP BY 1
        )
        SELECT 
          month,
          new_mrr,
          expansion_mrr,
          contraction_mrr,
          churned_mrr,
          SUM(new_mrr + expansion_mrr + contraction_mrr + churned_mrr) 
            OVER (ORDER BY month ROWS UNBOUNDED PRECEDING) as total_mrr
        FROM monthly_mrr
        ORDER BY month
      `
    },
    {
      id: 'ltv-analysis',
      type: 'TABLE',
      title: 'Customer Lifetime Value by Cohort',
      query: `
        WITH customer_revenue AS (
          SELECT 
            user_id,
            DATE_TRUNC('month', MIN(timestamp)) as cohort_month,
            SUM(metrics.total_revenue) as lifetime_revenue,
            COUNT(DISTINCT DATE_TRUNC('month', timestamp)) as active_months,
            MAX(CASE WHEN event_type = 'subscription.cancelled' THEN 1 ELSE 0 END) as churned
          FROM payment_events
          GROUP BY 1
        )
        SELECT 
          cohort_month,
          COUNT(*) as customers,
          AVG(lifetime_revenue) as avg_ltv,
          AVG(active_months) as avg_lifetime_months,
          SUM(CASE WHEN churned = 1 THEN 1 ELSE 0 END) * 100.0 / COUNT(*) as churn_rate
        FROM customer_revenue
        GROUP BY 1
        ORDER BY 1 DESC
      `
    },
    {
      id: 'payment-failure',
      type: 'BAR',
      title: 'Payment Failure Analysis',
      query: `
        SELECT 
          attributes.error_code,
          COUNT(*) as failures,
          AVG(metrics.amount) as avg_amount,
          COUNT(DISTINCT user_id) as affected_users
        FROM payment_events
        WHERE event_type = 'payment.failed'
          AND timestamp >= CURRENT_DATE - INTERVAL '30 days'
        GROUP BY 1
        ORDER BY failures DESC
      `
    }
  ]
};

// Operational Dashboard - Available at $5000+ MRR
export const operationalDashboard: DashboardConfig = {
  id: 'operational-metrics',
  name: 'Operational Metrics',
  description: 'System performance and operational KPIs',
  minimumMRR: 5000,
  updateFrequency: 'realtime',
  datasets: ['api_events', 'system_events', 'error_events'],
  visuals: [
    {
      id: 'api-performance',
      type: 'LINE',
      title: 'API Response Times (P50, P95, P99)',
      query: `
        SELECT 
          DATE_TRUNC('hour', timestamp) as hour,
          PERCENTILE_CONT(0.50) WITHIN GROUP (ORDER BY metrics.response_time) as p50,
          PERCENTILE_CONT(0.95) WITHIN GROUP (ORDER BY metrics.response_time) as p95,
          PERCENTILE_CONT(0.99) WITHIN GROUP (ORDER BY metrics.response_time) as p99,
          COUNT(*) as requests
        FROM api_events
        WHERE event_type = 'api.usage'
          AND timestamp >= CURRENT_TIMESTAMP - INTERVAL '24 hours'
        GROUP BY 1
        ORDER BY 1
      `
    },
    {
      id: 'error-rates',
      type: 'BAR',
      title: 'Error Rates by Category',
      query: `
        SELECT 
          attributes.error_category,
          attributes.error_code,
          COUNT(*) as error_count,
          COUNT(DISTINCT user_id) as affected_users,
          COUNT(DISTINCT attributes.endpoint) as affected_endpoints
        FROM error_events
        WHERE timestamp >= CURRENT_TIMESTAMP - INTERVAL '24 hours'
        GROUP BY 1, 2
        ORDER BY error_count DESC
        LIMIT 20
      `
    },
    {
      id: 'system-health',
      type: 'TABLE',
      title: 'System Health Metrics',
      query: `
        SELECT 
          'API Availability' as metric,
          (1 - SUM(CASE WHEN attributes.status_code >= 500 THEN 1 ELSE 0 END) * 1.0 / COUNT(*)) * 100 as value,
          'percentage' as unit
        FROM api_events
        WHERE timestamp >= CURRENT_TIMESTAMP - INTERVAL '1 hour'
        
        UNION ALL
        
        SELECT 
          'Average Response Time' as metric,
          AVG(metrics.response_time) as value,
          'ms' as unit
        FROM api_events
        WHERE timestamp >= CURRENT_TIMESTAMP - INTERVAL '1 hour'
        
        UNION ALL
        
        SELECT 
          'Active Users' as metric,
          COUNT(DISTINCT user_id) as value,
          'users' as unit
        FROM user_events
        WHERE timestamp >= CURRENT_TIMESTAMP - INTERVAL '1 hour'
      `
    }
  ]
};

// Dashboard manager to control access based on MRR
export class DashboardManager {
  private dashboards: DashboardConfig[] = [
    executiveDashboard,
    assessmentDashboard,
    userBehaviorDashboard,
    revenueDashboard,
    operationalDashboard
  ];
  
  getAvailableDashboards(currentMRR: number): DashboardConfig[] {
    return this.dashboards.filter(dashboard => currentMRR >= dashboard.minimumMRR);
  }
  
  getDashboardCost(dashboards: DashboardConfig[]): number {
    // Base QuickSight author cost
    let cost = 24; // $24/month for author
    
    // Add costs based on update frequency
    dashboards.forEach(dashboard => {
      switch (dashboard.updateFrequency) {
        case 'realtime':
          cost += 10; // Additional cost for real-time processing
          break;
        case 'hourly':
          cost += 5;
          break;
        case 'daily':
          cost += 2;
          break;
        case 'weekly':
          cost += 1;
          break;
      }
    });
    
    // Add SPICE cost (estimate based on data volume)
    const dataVolume = dashboards.length * 0.5; // 0.5GB per dashboard estimate
    if (dataVolume > 1) {
      cost += (dataVolume - 1) * 0.25; // $0.25 per GB after first GB
    }
    
    return cost;
  }
  
  generateDashboardSQL(dashboard: DashboardConfig): string {
    // Generate complete SQL for creating a dashboard
    const sqls = dashboard.visuals.map(visual => {
      return `
-- ${visual.title}
CREATE OR REPLACE VIEW ${dashboard.id}_${visual.id} AS
${visual.query};
      `;
    });
    
    return sqls.join('\n\n');
  }
}