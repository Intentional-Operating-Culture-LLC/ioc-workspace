import { NextResponse } from 'next/server';
import path from 'path';
import fs from 'fs';

const CLAUDE_TOOLS_DIR = '/home/darren/ioc-core/tools/claude';
const LOGS_DIR = path.join(CLAUDE_TOOLS_DIR, 'logs');

// Ensure logs directory exists
if (!fs.existsSync(LOGS_DIR)) {
  fs.mkdirSync(LOGS_DIR, { recursive: true });
}

// Get automation logs
async function getAutomationLogs(options = {}) {
  try {
    const {
      limit = 50,
      offset = 0,
      type = 'all', // 'all', 'automation', 'voice', 'ml', 'error'
      startDate,
      endDate,
      command
    } = options;
    
    const logTypes = {
      automation: 'automation_*.json',
      voice: 'voice/*.json',
      ml: 'ml/prediction_*.json',
      error: 'automation_error_*.json'
    };
    
    let logFiles = [];
    
    if (type === 'all') {
      // Get all log files
      const getAllFiles = (dir, pattern) => {
        try {
          if (!fs.existsSync(dir)) return [];
          return fs.readdirSync(dir)
            .filter(file => {
              if (pattern.includes('*')) {
                const regex = new RegExp(pattern.replace('*', '.*'));
                return regex.test(file);
              }
              return file.endsWith('.json');
            })
            .map(file => ({ file, dir, type: 'automation' }));
        } catch (error) {
          return [];
        }
      };
      
      logFiles = [
        ...getAllFiles(LOGS_DIR, 'automation_*.json').map(item => ({ ...item, type: 'automation' })),
        ...getAllFiles(LOGS_DIR, 'automation_error_*.json').map(item => ({ ...item, type: 'error' })),
        ...getAllFiles(path.join(LOGS_DIR, 'voice'), '*.json').map(item => ({ ...item, type: 'voice' })),
        ...getAllFiles(path.join(LOGS_DIR, 'ml'), 'prediction_*.json').map(item => ({ ...item, type: 'ml' }))
      ];
    } else if (logTypes[type]) {
      const pattern = logTypes[type];
      const logDir = pattern.includes('/') ? path.join(LOGS_DIR, pattern.split('/')[0]) : LOGS_DIR;
      const filePattern = pattern.includes('/') ? pattern.split('/')[1] : pattern;
      
      if (fs.existsSync(logDir)) {
        logFiles = fs.readdirSync(logDir)
          .filter(file => {
            if (filePattern.includes('*')) {
              const regex = new RegExp(filePattern.replace('*', '.*'));
              return regex.test(file);
            }
            return file.endsWith('.json');
          })
          .map(file => ({ file, dir: logDir, type }));
      }
    }
    
    // Sort by modification time (newest first)
    logFiles.sort((a, b) => {
      const aTime = fs.statSync(path.join(a.dir, a.file)).mtime;
      const bTime = fs.statSync(path.join(b.dir, b.file)).mtime;
      return bTime - aTime;
    });
    
    // Parse and filter logs
    const logs = [];
    
    for (const { file, dir, type } of logFiles) {
      try {
        const logPath = path.join(dir, file);
        const logData = JSON.parse(fs.readFileSync(logPath, 'utf8'));
        
        // Add metadata
        const logEntry = {
          id: file.replace('.json', ''),
          filename: file,
          type,
          ...logData,
          file_timestamp: fs.statSync(logPath).mtime.toISOString()
        };
        
        // Apply filters
        if (startDate && new Date(logEntry.timestamp || logEntry.file_timestamp) < new Date(startDate)) {
          continue;
        }
        
        if (endDate && new Date(logEntry.timestamp || logEntry.file_timestamp) > new Date(endDate)) {
          continue;
        }
        
        if (command && logEntry.command && !logEntry.command.includes(command)) {
          continue;
        }
        
        logs.push(logEntry);
        
      } catch (error) {
        // Skip malformed log files
        console.warn(`Skipping malformed log file: ${file}`);
      }
    }
    
    // Apply pagination
    const paginatedLogs = logs.slice(offset, offset + limit);
    
    return {
      logs: paginatedLogs,
      totalLogs: logs.length,
      totalFiles: logFiles.length,
      pagination: {
        limit,
        offset,
        hasMore: offset + limit < logs.length
      },
      filters: {
        type,
        startDate,
        endDate,
        command
      }
    };
    
  } catch (error) {
    throw new Error(`Failed to get automation logs: ${error.message}`);
  }
}

// Get log statistics
async function getLogStatistics(timeRange = '24h') {
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
      case '30d':
        startTime = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        break;
      default:
        startTime = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    }
    
    const logs = await getAutomationLogs({ 
      limit: 1000, 
      startDate: startTime.toISOString() 
    });
    
    const stats = {
      timeRange,
      totalLogs: logs.logs.length,
      byType: {},
      byCommand: {},
      successRate: 0,
      errorCount: 0,
      averageDuration: 0,
      recentActivity: []
    };
    
    let totalDuration = 0;
    let successCount = 0;
    let durationCount = 0;
    
    for (const log of logs.logs) {
      // Count by type
      stats.byType[log.type] = (stats.byType[log.type] || 0) + 1;
      
      // Count by command
      if (log.command) {
        stats.byCommand[log.command] = (stats.byCommand[log.command] || 0) + 1;
      }
      
      // Success rate
      if (log.success === true) {
        successCount++;
      }
      
      // Error count
      if (log.success === false || log.error) {
        stats.errorCount++;
      }
      
      // Duration
      if (log.duration && typeof log.duration === 'number') {
        totalDuration += log.duration;
        durationCount++;
      }
      
      // Recent activity (last 10 items)
      if (stats.recentActivity.length < 10) {
        stats.recentActivity.push({
          timestamp: log.timestamp || log.file_timestamp,
          type: log.type,
          command: log.command,
          success: log.success,
          duration: log.duration
        });
      }
    }
    
    stats.successRate = logs.logs.length > 0 ? successCount / logs.logs.length : 0;
    stats.averageDuration = durationCount > 0 ? totalDuration / durationCount : 0;
    
    return stats;
    
  } catch (error) {
    throw new Error(`Failed to get log statistics: ${error.message}`);
  }
}

// Clear old logs
async function clearOldLogs(olderThan = '30d') {
  try {
    const now = new Date();
    let cutoffTime;
    
    switch (olderThan) {
      case '1d':
        cutoffTime = new Date(now.getTime() - 24 * 60 * 60 * 1000);
        break;
      case '7d':
        cutoffTime = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case '30d':
        cutoffTime = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        break;
      default:
        cutoffTime = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    }
    
    const logDirs = [
      LOGS_DIR,
      path.join(LOGS_DIR, 'voice'),
      path.join(LOGS_DIR, 'ml')
    ];
    
    let deletedCount = 0;
    
    for (const logDir of logDirs) {
      if (!fs.existsSync(logDir)) continue;
      
      const files = fs.readdirSync(logDir)
        .filter(file => file.endsWith('.json'))
        .map(file => {
          const filePath = path.join(logDir, file);
          const stat = fs.statSync(filePath);
          return { file, path: filePath, mtime: stat.mtime };
        })
        .filter(item => item.mtime < cutoffTime);
      
      for (const item of files) {
        try {
          fs.unlinkSync(item.path);
          deletedCount++;
        } catch (error) {
          console.warn(`Failed to delete log file: ${item.path}`);
        }
      }
    }
    
    return {
      success: true,
      deletedCount,
      cutoffTime: cutoffTime.toISOString(),
      message: `Deleted ${deletedCount} log files older than ${olderThan}`
    };
    
  } catch (error) {
    return {
      success: false,
      error: error.message
    };
  }
}

// GET /api/automation/automation-logs
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action') || 'list';
    
    if (action === 'list') {
      const options = {
        limit: parseInt(searchParams.get('limit') || '50'),
        offset: parseInt(searchParams.get('offset') || '0'),
        type: searchParams.get('type') || 'all',
        startDate: searchParams.get('startDate'),
        endDate: searchParams.get('endDate'),
        command: searchParams.get('command')
      };
      
      const result = await getAutomationLogs(options);
      return NextResponse.json(result);
    }
    
    if (action === 'stats') {
      const timeRange = searchParams.get('timeRange') || '24h';
      const stats = await getLogStatistics(timeRange);
      return NextResponse.json(stats);
    }
    
    return NextResponse.json(
      { error: 'Invalid action. Use: list or stats' },
      { status: 400 }
    );
    
  } catch (error) {
    console.error('Automation logs GET error:', error);
    return NextResponse.json(
      { error: 'Failed to get automation logs', details: error.message },
      { status: 500 }
    );
  }
}

// POST /api/automation/automation-logs
export async function POST(request) {
  try {
    const { action, ...options } = await request.json();
    
    if (action === 'clear') {
      const olderThan = options.olderThan || '30d';
      const result = await clearOldLogs(olderThan);
      return NextResponse.json(result);
    }
    
    return NextResponse.json(
      { error: 'Invalid action. Use: clear' },
      { status: 400 }
    );
    
  } catch (error) {
    console.error('Automation logs POST error:', error);
    return NextResponse.json(
      { error: 'Failed to execute automation logs action', details: error.message },
      { status: 500 }
    );
  }
}

// DELETE /api/automation/automation-logs
export async function DELETE(request) {
  try {
    const { searchParams } = new URL(request.url);
    const logId = searchParams.get('id');
    
    if (!logId) {
      return NextResponse.json(
        { error: 'Log ID is required' },
        { status: 400 }
      );
    }
    
    // Find and delete the log file
    const logFile = `${logId}.json`;
    const possiblePaths = [
      path.join(LOGS_DIR, logFile),
      path.join(LOGS_DIR, 'voice', logFile),
      path.join(LOGS_DIR, 'ml', logFile)
    ];
    
    let deleted = false;
    
    for (const logPath of possiblePaths) {
      if (fs.existsSync(logPath)) {
        fs.unlinkSync(logPath);
        deleted = true;
        break;
      }
    }
    
    if (!deleted) {
      return NextResponse.json(
        { error: 'Log file not found' },
        { status: 404 }
      );
    }
    
    return NextResponse.json({
      success: true,
      message: `Log ${logId} deleted successfully`
    });
    
  } catch (error) {
    console.error('Automation logs DELETE error:', error);
    return NextResponse.json(
      { error: 'Failed to delete automation log', details: error.message },
      { status: 500 }
    );
  }
}
