/**
 * IOC Core - Compliance Dashboard
 * Real-time compliance monitoring and visualization
 */
import React, { useState, useEffect, useCallback } from 'react';
import { Card, Grid, Box, Typography, LinearProgress, Chip, Alert, Button } from '@mui/material';
import { Security, VerifiedUser, Warning, Error as ErrorIcon, CheckCircle, Schedule, Assessment, Shield, Lock, Policy, Gavel, DataUsage } from '@mui/icons-material';
import { useTheme } from '@mui/material/styles';
import { LineChart, Line, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar } from 'recharts';
import { getDefaultComplianceManager, checkComplianceStatus, getComplianceDashboardData } from "@ioc/shared/data-access/compliance";
interface ComplianceDashboardProps {
    refreshInterval?: number;
    onViolationClick?: (violation: any) => void;
    onReportGenerate?: (type: string) => void;
}
interface ComplianceMetrics {
    overallScore: number;
    violations: {
        active: number;
        resolved: number;
    };
    risks: {
        high: number;
        medium: number;
        low: number;
    };
    dataRequests: {
        pending: number;
        completed: number;
    };
}
interface RegulationStatus {
    name: string;
    score: number;
    status: 'compliant' | 'partial' | 'non-compliant';
    requirements: {
        total: number;
        compliant: number;
    };
}
export const ComplianceDashboard: React.FC<ComplianceDashboardProps> = ({ refreshInterval = 60000, // 1 minute
onViolationClick, onReportGenerate }) => {
    const theme = useTheme();
    const [loading, setLoading] = useState(true);
    const [metrics, setMetrics] = useState<ComplianceMetrics | null>(null);
    const [regulations, setRegulations] = useState<RegulationStatus[]>([]);
    const [scoreHistory, setScoreHistory] = useState<Array<{
        date: string;
        score: number;
    }>>([]);
    const [violations, setViolations] = useState<any[]>([]);
    const [upcomingAudits, setUpcomingAudits] = useState<any[]>([]);
    const [alerts, setAlerts] = useState<any[]>([]);
    // Fetch compliance data
    const fetchComplianceData = useCallback(async () => {
        try {
            const manager = getDefaultComplianceManager();
            const dashboardData = await getComplianceDashboardData(manager);
            const status = await checkComplianceStatus(manager);
            setMetrics(dashboardData.metrics);
            setScoreHistory(dashboardData.trends.scoreHistory.map(item => ({
                date: new Date(item.date).toLocaleDateString(),
                score: item.score
            })));
            setAlerts(dashboardData.alerts);
            setUpcomingAudits(dashboardData.upcomingAudits);
            // Mock regulation data - in production would come from actual data
            setRegulations([
                {
                    name: 'GDPR',
                    score: 92,
                    status: 'compliant',
                    requirements: { total: 50, compliant: 46 }
                },
                {
                    name: 'CCPA',
                    score: 88,
                    status: 'compliant',
                    requirements: { total: 30, compliant: 26 }
                },
                {
                    name: 'SOC2',
                    score: 95,
                    status: 'compliant',
                    requirements: { total: 100, compliant: 95 }
                },
                {
                    name: 'HIPAA',
                    score: 78,
                    status: 'partial',
                    requirements: { total: 80, compliant: 62 }
                }
            ]);
            // Mock violations - in production would come from actual data
            setViolations([
                {
                    id: '1',
                    severity: 'high',
                    regulation: 'GDPR',
                    description: 'Data retention policy exceeded for user profiles',
                    detectedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
                    status: 'active'
                },
                {
                    id: '2',
                    severity: 'medium',
                    regulation: 'CCPA',
                    description: 'Opt-out mechanism not prominently displayed',
                    detectedAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
                    status: 'active'
                }
            ]);
            setLoading(false);
        }
        catch (error) {
            console.error('Failed to fetch compliance data:', error);
            setLoading(false);
        }
    }, []);
    useEffect(() => {
        fetchComplianceData();
        const interval = setInterval(fetchComplianceData, refreshInterval);
        return () => clearInterval(interval);
    }, [fetchComplianceData, refreshInterval]);
    // Calculate risk distribution for pie chart
    const riskDistribution = metrics ? [
        { name: 'High Risk', value: metrics.risks.high, color: theme.palette.error.main },
        { name: 'Medium Risk', value: metrics.risks.medium, color: theme.palette.warning.main },
        { name: 'Low Risk', value: metrics.risks.low, color: theme.palette.success.main }
    ] : [];
    // Prepare radar chart data for regulations
    const radarData = regulations.map(reg => ({
        regulation: reg.name,
        score: reg.score,
        target: 85
    }));
    // Score color based on value
    const getScoreColor = (score: number) => {
        if (score >= 90)
            return theme.palette.success.main;
        if (score >= 80)
            return theme.palette.warning.main;
        return theme.palette.error.main;
    };
    // Severity chip color
    const getSeverityColor = (severity: string) => {
        switch (severity) {
            case 'critical': return 'error';
            case 'high': return 'error';
            case 'medium': return 'warning';
            case 'low': return 'info';
            default: return 'default';
        }
    };
    if (loading) {
        return (<Box sx={{ p: 3 }}>
        <Typography variant="h5" gutterBottom>Compliance Dashboard</Typography>
        <LinearProgress />
      </Box>);
    }
    return (<Box sx={{ p: 3 }}>
      <Grid container spacing={3}>
        {/* Header */}
        <Grid item xs={12}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
            <Typography variant="h4" component="h1">
              <Shield sx={{ mr: 1, verticalAlign: 'middle' }}/>
              Compliance Dashboard
            </Typography>
            <Box>
              <Button variant="outlined" startIcon={<Assessment />} onClick={() => onReportGenerate?.('compliance')} sx={{ mr: 1 }}>
                Generate Report
              </Button>
              <Button variant="contained" startIcon={<Policy />} onClick={() => onReportGenerate?.('audit')}>
                Audit Report
              </Button>
            </Box>
          </Box>
        </Grid>

        {/* Alerts */}
        {alerts.length > 0 && (<Grid item xs={12}>
            {alerts.map((alert, index) => (<Alert key={index} severity={alert.severity} sx={{ mb: 1 }} onClose={() => setAlerts(alerts.filter((_, i) => i !== index))}>
                {alert.message}
              </Alert>))}
          </Grid>)}

        {/* Overall Compliance Score */}
        <Grid item xs={12} md={4}>
          <Card sx={{ p: 3, height: '100%' }}>
            <Box sx={{ textAlign: 'center' }}>
              <Typography variant="h6" gutterBottom>
                Overall Compliance Score
              </Typography>
              <Box sx={{ position: 'relative', display: 'inline-block', mt: 2 }}>
                <CircularProgressWithLabel value={metrics?.overallScore || 0} size={180} thickness={8} color={getScoreColor(metrics?.overallScore || 0)}/>
              </Box>
              <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
                Target: 85% | Status: {metrics?.overallScore >= 85 ? 'Compliant' : 'Non-Compliant'}
              </Typography>
            </Box>
          </Card>
        </Grid>

        {/* Violations Summary */}
        <Grid item xs={12} md={4}>
          <Card sx={{ p: 3, height: '100%' }}>
            <Typography variant="h6" gutterBottom>
              <Warning sx={{ mr: 1, verticalAlign: 'middle' }}/>
              Violations
            </Typography>
            <Box sx={{ mt: 3 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
                <Typography variant="body2">Active Violations</Typography>
                <Typography variant="h4" color="error">
                  {metrics?.violations.active || 0}
                </Typography>
              </Box>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
                <Typography variant="body2">Resolved (30d)</Typography>
                <Typography variant="h4" color="success.main">
                  {metrics?.violations.resolved || 0}
                </Typography>
              </Box>
              <LinearProgress variant="determinate" value={((metrics?.violations.resolved || 0) / ((metrics?.violations.active || 0) + (metrics?.violations.resolved || 1))) * 100} sx={{ mt: 2 }}/>
              <Typography variant="caption" color="text.secondary">
                Resolution Rate: {Math.round(((metrics?.violations.resolved || 0) / ((metrics?.violations.active || 0) + (metrics?.violations.resolved || 1))) * 100)}%
              </Typography>
            </Box>
          </Card>
        </Grid>

        {/* Risk Distribution */}
        <Grid item xs={12} md={4}>
          <Card sx={{ p: 3, height: '100%' }}>
            <Typography variant="h6" gutterBottom>
              <ErrorIcon sx={{ mr: 1, verticalAlign: 'middle' }}/>
              Risk Distribution
            </Typography>
            <Box sx={{ height: 200, mt: 2 }}>
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={riskDistribution} cx="50%" cy="50%" labelLine={false} label={({ name, value }) => `${name}: ${value}`} outerRadius={70} fill="#8884d8" dataKey="value">
                    {riskDistribution.map((entry, index) => (<Cell key={`cell-${index}`} fill={entry.color}/>))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </Box>
          </Card>
        </Grid>

        {/* Regulation Compliance */}
        <Grid item xs={12} md={8}>
          <Card sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>
              <Gavel sx={{ mr: 1, verticalAlign: 'middle' }}/>
              Regulatory Compliance
            </Typography>
            <Box sx={{ height: 300, mt: 2 }}>
              <ResponsiveContainer width="100%" height="100%">
                <RadarChart data={radarData}>
                  <PolarGrid />
                  <PolarAngleAxis dataKey="regulation"/>
                  <PolarRadiusAxis angle={90} domain={[0, 100]}/>
                  <Radar name="Current Score" dataKey="score" stroke={theme.palette.primary.main} fill={theme.palette.primary.main} fillOpacity={0.6}/>
                  <Radar name="Target" dataKey="target" stroke={theme.palette.grey[400]} fill={theme.palette.grey[400]} fillOpacity={0.2}/>
                  <Legend />
                </RadarChart>
              </ResponsiveContainer>
            </Box>
            <Grid container spacing={2} sx={{ mt: 2 }}>
              {regulations.map((reg) => (<Grid item xs={6} sm={3} key={reg.name}>
                  <Box sx={{ textAlign: 'center' }}>
                    <Typography variant="h6" color={getScoreColor(reg.score)}>
                      {reg.score}%
                    </Typography>
                    <Typography variant="body2">{reg.name}</Typography>
                    <Typography variant="caption" color="text.secondary">
                      {reg.requirements.compliant}/{reg.requirements.total} Requirements
                    </Typography>
                  </Box>
                </Grid>))}
            </Grid>
          </Card>
        </Grid>

        {/* Data Subject Requests */}
        <Grid item xs={12} md={4}>
          <Card sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>
              <DataUsage sx={{ mr: 1, verticalAlign: 'middle' }}/>
              Data Subject Requests
            </Typography>
            <Box sx={{ mt: 3 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
                <Typography variant="body2">Pending</Typography>
                <Typography variant="h5" color="warning.main">
                  {metrics?.dataRequests.pending || 0}
                </Typography>
              </Box>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
                <Typography variant="body2">Completed (30d)</Typography>
                <Typography variant="h5">
                  {metrics?.dataRequests.completed || 0}
                </Typography>
              </Box>
              <Box sx={{ mt: 3 }}>
                <Typography variant="caption" color="text.secondary">
                  Average Response Time
                </Typography>
                <Typography variant="h6">24.5 hours</Typography>
                <LinearProgress variant="determinate" value={75} color="success" sx={{ mt: 1 }}/>
                <Typography variant="caption" color="text.secondary">
                  Target: 30 days (GDPR)
                </Typography>
              </Box>
            </Box>
          </Card>
        </Grid>

        {/* Compliance Score Trend */}
        <Grid item xs={12} md={8}>
          <Card sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>
              Compliance Score Trend
            </Typography>
            <Box sx={{ height: 300, mt: 2 }}>
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={scoreHistory.length > 0 ? scoreHistory : generateMockScoreHistory()}>
                  <CartesianGrid strokeDasharray="3 3"/>
                  <XAxis dataKey="date"/>
                  <YAxis domain={[0, 100]}/>
                  <Tooltip />
                  <Legend />
                  <Line type="monotone" dataKey="score" stroke={theme.palette.primary.main} name="Compliance Score" strokeWidth={2}/>
                </LineChart>
              </ResponsiveContainer>
            </Box>
          </Card>
        </Grid>

        {/* Active Violations */}
        <Grid item xs={12} md={4}>
          <Card sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>
              Active Violations
            </Typography>
            <Box sx={{ mt: 2 }}>
              {violations.slice(0, 5).map((violation) => (<Box key={violation.id} sx={{
                p: 2,
                mb: 1,
                border: 1,
                borderColor: 'divider',
                borderRadius: 1,
                cursor: 'pointer',
                '&:hover': { bgcolor: 'action.hover' }
            }} onClick={() => onViolationClick?.(violation)}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                    <Chip label={violation.severity} size="small" color={getSeverityColor(violation.severity) as any}/>
                    <Typography variant="caption" color="text.secondary">
                      {new Date(violation.detectedAt).toLocaleDateString()}
                    </Typography>
                  </Box>
                  <Typography variant="body2" gutterBottom>
                    {violation.description}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {violation.regulation}
                  </Typography>
                </Box>))}
              {violations.length > 5 && (<Button fullWidth sx={{ mt: 1 }}>
                  View All ({violations.length})
                </Button>)}
            </Box>
          </Card>
        </Grid>

        {/* Upcoming Audits */}
        <Grid item xs={12}>
          <Card sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>
              <Schedule sx={{ mr: 1, verticalAlign: 'middle' }}/>
              Upcoming Audits
            </Typography>
            <Grid container spacing={2} sx={{ mt: 2 }}>
              {upcomingAudits.length > 0 ? upcomingAudits.map((audit, index) => (<Grid item xs={12} sm={6} md={3} key={index}>
                  <Box sx={{ p: 2, border: 1, borderColor: 'divider', borderRadius: 1 }}>
                    <Typography variant="subtitle1" gutterBottom>
                      {audit.regulation}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      {new Date(audit.date).toLocaleDateString()}
                    </Typography>
                    <Typography variant="caption" display="block">
                      Scope: {audit.scope}
                    </Typography>
                    <Chip label={`${Math.ceil((new Date(audit.date).getTime() - Date.now()) / (24 * 60 * 60 * 1000))} days`} size="small" color="primary" sx={{ mt: 1 }}/>
                  </Box>
                </Grid>)) : (<Grid item xs={12}>
                  <Typography variant="body2" color="text.secondary" align="center">
                    No upcoming audits scheduled
                  </Typography>
                </Grid>)}
            </Grid>
          </Card>
        </Grid>

        {/* Quick Actions */}
        <Grid item xs={12}>
          <Card sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>
              Quick Actions
            </Typography>
            <Grid container spacing={2} sx={{ mt: 1 }}>
              <Grid item>
                <Button variant="outlined" startIcon={<Assessment />}>
                  Run Compliance Check
                </Button>
              </Grid>
              <Grid item>
                <Button variant="outlined" startIcon={<Lock />}>
                  Review Access Controls
                </Button>
              </Grid>
              <Grid item>
                <Button variant="outlined" startIcon={<Security />}>
                  Security Scan
                </Button>
              </Grid>
              <Grid item>
                <Button variant="outlined" startIcon={<VerifiedUser />}>
                  Privacy Assessment
                </Button>
              </Grid>
            </Grid>
          </Card>
        </Grid>
      </Grid>
    </Box>);
};
// Helper component for circular progress
const CircularProgressWithLabel: React.FC<{
    value: number;
    size: number;
    thickness: number;
    color: string;
}> = ({ value, size, thickness, color }) => {
    return (<Box sx={{ position: 'relative', display: 'inline-flex' }}>
      <Box sx={{
            width: size,
            height: size,
            borderRadius: '50%',
            border: `${thickness}px solid`,
            borderColor: 'action.disabled',
            position: 'absolute'
        }}/>
      <Box sx={{
            width: size,
            height: size,
            borderRadius: '50%',
            border: `${thickness}px solid`,
            borderColor: color,
            borderRightColor: 'transparent',
            borderBottomColor: 'transparent',
            transform: `rotate(${-90 + (value / 100) * 360}deg)`,
            transition: 'transform 0.6s ease-in-out'
        }}/>
      <Box sx={{
            top: 0,
            left: 0,
            bottom: 0,
            right: 0,
            position: 'absolute',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
        }}>
        <Typography variant="h2" component="div" color={color}>
          {`${Math.round(value)}%`}
        </Typography>
      </Box>
    </Box>);
};
// Generate mock score history for demo
const generateMockScoreHistory = () => {
    const data = [];
    const today = new Date();
    for (let i = 29; i >= 0; i--) {
        const date = new Date(today);
        date.setDate(date.getDate() - i);
        data.push({
            date: date.toLocaleDateString(),
            score: 85 + Math.floor(Math.random() * 10) - 5
        });
    }
    return data;
};
export default ComplianceDashboard;
