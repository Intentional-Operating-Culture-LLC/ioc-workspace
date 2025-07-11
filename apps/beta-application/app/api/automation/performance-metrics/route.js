import { NextResponse } from 'next/server';
import { exec } from 'child_process';
import { promisify } from 'util';
import path from 'path';
import fs from 'fs';

const execAsync = promisify(exec);

const CLAUDE_TOOLS_DIR = '/home/darren/ioc-core/tools/claude';
const METRICS_DIR = path.join(CLAUDE_TOOLS_DIR, 'metrics');
const STAGING_URL = 'http://localhost:3008';

// Ensure metrics directory exists
if (!fs.existsSync(METRICS_DIR)) {
  fs.mkdirSync(METRICS_DIR, { recursive: true });
}

// Performance metrics collection
async function collectPerformanceMetrics() {
  try {
    const metrics = {
      timestamp: new Date().toISOString(),
      system: await getSystemMetrics(),
      automation: await getAutomationMetrics(),
      api: await getAPIMetrics(),
      database: await getDatabaseMetrics(),
      staging: await getStagingMetrics()
    };
    
    // Save metrics to file
    const metricsFile = path.join(METRICS_DIR, `metrics_${Date.now()}.json`);
    fs.writeFileSync(metricsFile, JSON.stringify(metrics, null, 2));
    
    return metrics;
    
  } catch (error) {
    throw new Error(`Failed to collect performance metrics: ${error.message}`);
  }
}

// Get system metrics
async function getSystemMetrics() {
  try {
    const metrics = {};
    
    // CPU usage
    try {
      const { stdout: cpuInfo } = await execAsync('top -bn1 | grep "Cpu(s)" | sed "s/.*, *\\([0-9.]*\\)%* id.*/\\1/" | awk "{print 100 - $1}"');
      metrics.cpu_usage = parseFloat(cpuInfo.trim()) || 0;
    } catch (error) {
      metrics.cpu_usage = 0;
    }
    
    // Memory usage
    try {
      const { stdout: memInfo } = await execAsync('free -m | awk "NR==2{printf \"%s %s %.2f\n\", $3,$2,$3*100/$2}"');
      const [used, total, percentage] = memInfo.trim().split(' ');
      metrics.memory = {
        used: parseInt(used) || 0,
        total: parseInt(total) || 0,
        percentage: parseFloat(percentage) || 0
      };
    } catch (error) {
      metrics.memory = { used: 0, total: 0, percentage: 0 };
    }
    
    // Disk usage
    try {
      const { stdout: diskInfo } = await execAsync('df -h / | awk "NR==2{print $5}" | sed "s/%//"');
      metrics.disk_usage = parseFloat(diskInfo.trim()) || 0;
    } catch (error) {
      metrics.disk_usage = 0;
    }
    
    // Load average
    try {
      const { stdout: loadInfo } = await execAsync('uptime | awk -F"load average:" "{print $2}" | awk "{print $1}" | sed "s/,//"');
      metrics.load_average = parseFloat(loadInfo.trim()) || 0;
    } catch (error) {
      metrics.load_average = 0;
    }
    
    // Process count
    try {
      const { stdout: processInfo } = await execAsync('ps aux | wc -l');
      metrics.process_count = parseInt(processInfo.trim()) || 0;
    } catch (error) {
      metrics.process_count = 0;
    }
    
    return metrics;
    
  } catch (error) {
    return { error: error.message };
  }
}

// Get automation metrics
async function getAutomationMetrics() {
  try {
    const metrics = {};
    
    // Count automation processes
    try {
      const { stdout: processInfo } = await execAsync('ps aux | grep -E "(claude-|python.*automation)" | grep -v grep | wc -l');
      metrics.active_processes = parseInt(processInfo.trim()) || 0;
    } catch (error) {
      metrics.active_processes = 0;
    }
    
    // Check automation log metrics
    const logsDir = path.join(CLAUDE_TOOLS_DIR, 'logs');
    if (fs.existsSync(logsDir)) {
      const logFiles = fs.readdirSync(logsDir)
        .filter(file => file.startsWith('automation_') && file.endsWith('.json'))
        .sort((a, b) => {
          const aTime = fs.statSync(path.join(logsDir, a)).mtime;
          const bTime = fs.statSync(path.join(logsDir, b)).mtime;
          return bTime - aTime;
        })
        .slice(0, 100); // Last 100 logs
      
      let successCount = 0;
      let totalDuration = 0;
      let errorCount = 0;
      
      for (const file of logFiles) {
        try {
          const logPath = path.join(logsDir, file);
          const logData = JSON.parse(fs.readFileSync(logPath, 'utf8'));
          
          if (logData.success === true) {
            successCount++;
          } else if (logData.success === false) {
            errorCount++;
          }
          
          if (logData.duration) {
            totalDuration += logData.duration;
          }
        } catch (error) {
          // Skip malformed logs
        }
      }
      
      metrics.recent_executions = logFiles.length;
      metrics.success_rate = logFiles.length > 0 ? successCount / logFiles.length : 0;
      metrics.error_rate = logFiles.length > 0 ? errorCount / logFiles.length : 0;
      metrics.average_execution_time = logFiles.length > 0 ? totalDuration / logFiles.length : 0;
    } else {
      metrics.recent_executions = 0;
      metrics.success_rate = 0;
      metrics.error_rate = 0;
      metrics.average_execution_time = 0;
    }
    
    return metrics;
    
  } catch (error) {
    return { error: error.message };
  }
}

// Get API metrics
async function getAPIMetrics() {
  try {
    const metrics = {};
    
    // Test API response times
    const apiEndpoints = [
      '/api/health',
      '/api/automation/execute-command',
      '/api/automation/voice-status',
      '/api/automation/ml-predictions'
    ];
    
    const endpointMetrics = [];
    
    for (const endpoint of apiEndpoints) {
      try {
        const startTime = Date.now();
        const response = await fetch(`${STAGING_URL}${endpoint}`, {
          method: 'GET',
          timeout: 5000
        });
        const endTime = Date.now();
        
        endpointMetrics.push({
          endpoint,
          response_time: endTime - startTime,
          status: response.status,
          success: response.ok
        });
      } catch (error) {
        endpointMetrics.push({
          endpoint,
          response_time: 0,
          status: 0,
          success: false,
          error: error.message
        });
      }
    }
    
    metrics.endpoints = endpointMetrics;
    metrics.average_response_time = endpointMetrics.reduce((sum, ep) => sum + ep.response_time, 0) / endpointMetrics.length;
    metrics.success_rate = endpointMetrics.filter(ep => ep.success).length / endpointMetrics.length;
    
    return metrics;
    
  } catch (error) {
    return { error: error.message };
  }
}

// Get database metrics
async function getDatabaseMetrics() {
  try {
    const metrics = {};
    
    // Check database connection
    try {
      const { stdout: dbInfo } = await execAsync('ps aux | grep -E "(postgres|mysql|mongo)" | grep -v grep | wc -l');
      metrics.database_processes = parseInt(dbInfo.trim()) || 0;
    } catch (error) {
      metrics.database_processes = 0;
    }
    
    // Check database connections (if PostgreSQL)
    try {
      const { stdout: connInfo } = await execAsync('netstat -an | grep 5432 | wc -l');
      metrics.database_connections = parseInt(connInfo.trim()) || 0;
    } catch (error) {
      metrics.database_connections = 0;
    }
    
    return metrics;
    
  } catch (error) {
    return { error: error.message };
  }
}

// Get staging environment metrics
async function getStagingMetrics() {
  try {
    const metrics = {};
    
    // Test staging environment
    try {
      const startTime = Date.now();
      const response = await fetch(STAGING_URL, {
        method: 'GET',
        timeout: 10000
      });
      const endTime = Date.now();
      
      metrics.staging_response_time = endTime - startTime;
      metrics.staging_status = response.status;
      metrics.staging_available = response.ok;
      
      // Get response headers for additional info
      metrics.staging_headers = {
        'content-type': response.headers.get('content-type'),
        'content-length': response.headers.get('content-length'),
        'server': response.headers.get('server')
      };
      
    } catch (error) {
      metrics.staging_response_time = 0;
      metrics.staging_status = 0;
      metrics.staging_available = false;
      metrics.staging_error = error.message;
    }
    
    // Check for Next.js process
    try {
      const { stdout: nextjsInfo } = await execAsync('ps aux | grep -E "(next|node.*3008)" | grep -v grep | wc -l');
      metrics.nextjs_processes = parseInt(nextjsInfo.trim()) || 0;
    } catch (error) {
      metrics.nextjs_processes = 0;
    }
    
    return metrics;
    
  } catch (error) {
    return { error: error.message };
  }
}

// Get historical metrics
async function getHistoricalMetrics(timeRange = '24h') {
  try {
    const now = new Date();
    let startTime;
    
    switch (timeRange) {
      case '1h':
        startTime = new Date(now.getTime() - 60 * 60 * 1000);
        break;
      case '24h':
        startTime = new Date(now.getTime() - 24 * 60 * 60 * 1000);
        break;
      case '7d':
        startTime = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      default:
        startTime = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    }
    
    const metricsFiles = fs.readdirSync(METRICS_DIR)
      .filter(file => file.startsWith('metrics_') && file.endsWith('.json'))
      .map(file => {
        const filePath = path.join(METRICS_DIR, file);
        const stat = fs.statSync(filePath);
        return { file, path: filePath, mtime: stat.mtime };
      })
      .filter(item => item.mtime >= startTime)
      .sort((a, b) => a.mtime - b.mtime);
    
    const historicalData = [];
    
    for (const item of metricsFiles) {
      try {
        const metricsData = JSON.parse(fs.readFileSync(item.path, 'utf8'));
        historicalData.push(metricsData);
      } catch (error) {
        // Skip malformed files
      }
    }
    
    return {
      timeRange,
      dataPoints: historicalData.length,
      data: historicalData
    };
    
  } catch (error) {
    return {
      timeRange,
      dataPoints: 0,
      data: [],
      error: error.message
    };
  }
}

// Get performance summary
async function getPerformanceSummary() {
  try {
    const currentMetrics = await collectPerformanceMetrics();
    const historical = await getHistoricalMetrics('24h');
    
    // Calculate trends
    const trends = {};
    
    if (historical.data.length >= 2) {
      const latest = historical.data[historical.data.length - 1];
      const previous = historical.data[historical.data.length - 2];
      
      trends.cpu_usage = latest.system.cpu_usage - previous.system.cpu_usage;
      trends.memory_usage = latest.system.memory.percentage - previous.system.memory.percentage;
      trends.api_response_time = latest.api.average_response_time - previous.api.average_response_time;
      trends.automation_success_rate = latest.automation.success_rate - previous.automation.success_rate;
    }
    
    // Performance alerts
    const alerts = [];
    
    if (currentMetrics.system.cpu_usage > 85) {
      alerts.push({ type: 'warning', message: 'High CPU usage detected', value: currentMetrics.system.cpu_usage });
    }
    
    if (currentMetrics.system.memory.percentage > 90) {
      alerts.push({ type: 'critical', message: 'High memory usage detected', value: currentMetrics.system.memory.percentage });
    }
    
    if (currentMetrics.api.average_response_time > 5000) {
      alerts.push({ type: 'warning', message: 'Slow API response times', value: currentMetrics.api.average_response_time });
    }
    
    if (!currentMetrics.staging.staging_available) {
      alerts.push({ type: 'critical', message: 'Staging environment unavailable' });
    }
    
    return {
      current: currentMetrics,
      trends,
      alerts,
      historicalPoints: historical.dataPoints,
      lastUpdated: new Date().toISOString()
    };
    
  } catch (error) {
    return {
      error: error.message,
      lastUpdated: new Date().toISOString()
    };
  }
}

// GET /api/automation/performance-metrics
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action') || 'current';
    
    if (action === 'current') {
      const metrics = await collectPerformanceMetrics();
      return NextResponse.json(metrics);
    }
    
    if (action === 'historical') {
      const timeRange = searchParams.get('timeRange') || '24h';
      const historical = await getHistoricalMetrics(timeRange);
      return NextResponse.json(historical);
    }
    
    if (action === 'summary') {
      const summary = await getPerformanceSummary();
      return NextResponse.json(summary);
    }
    
    return NextResponse.json(
      { error: 'Invalid action. Use: current, historical, or summary' },
      { status: 400 }
    );
    
  } catch (error) {
    console.error('Performance metrics GET error:', error);
    return NextResponse.json(
      { error: 'Failed to get performance metrics', details: error.message },
      { status: 500 }
    );
  }
}

// POST /api/automation/performance-metrics
export async function POST(request) {
  try {
    const { action } = await request.json();
    
    if (action === 'collect') {
      const metrics = await collectPerformanceMetrics();
      return NextResponse.json({
        success: true,
        message: 'Performance metrics collected successfully',
        metrics
      });
    }
    
    return NextResponse.json(
      { error: 'Invalid action. Use: collect' },
      { status: 400 }
    );
    
  } catch (error) {
    console.error('Performance metrics POST error:', error);
    return NextResponse.json(
      { error: 'Failed to execute performance metrics action', details: error.message },
      { status: 500 }
    );
  }
}
