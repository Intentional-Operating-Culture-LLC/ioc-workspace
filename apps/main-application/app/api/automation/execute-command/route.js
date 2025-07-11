import { NextResponse } from 'next/server';
import { exec } from 'child_process';
import { promisify } from 'util';
import path from 'path';
import fs from 'fs';

const execAsync = promisify(exec);

const CLAUDE_TOOLS_DIR = '/home/darren/ioc-core/tools/claude';
const LOGS_DIR = path.join(CLAUDE_TOOLS_DIR, 'logs');

// Ensure logs directory exists
if (!fs.existsSync(LOGS_DIR)) {
  fs.mkdirSync(LOGS_DIR, { recursive: true });
}

// Available automation commands
const AUTOMATION_COMMANDS = {
  // Campaign Management
  'campaign-analyze': 'claude-campaign-analyze',
  'campaign-optimize': 'claude-campaign-optimize',
  'campaign-report': 'claude-campaign-report',
  
  // Lead Management
  'leads-score': 'claude-leads-score',
  'leads-nurture': 'claude-leads-nurture',
  'leads-report': 'claude-leads-report',
  
  // Sales Pipeline
  'sales-analyze': 'claude-sales-analyze',
  'sales-forecast': 'claude-sales-forecast',
  'sales-bottlenecks': 'claude-sales-bottlenecks',
  
  // Performance Monitoring
  'performance-monitor': 'claude-performance-monitor',
  'performance-alerts': 'claude-performance-alerts',
  'website-health': 'claude-website-health',
  
  // Content Optimization
  'content-analyze': 'claude-content-analyze',
  'seo-recommendations': 'claude-seo-recommendations',
  'content-metrics': 'claude-content-metrics',
  
  // Executive Dashboard
  'executive-report': 'claude-executive-report',
  'executive-summary': 'claude-executive-summary',
  'kpi-dashboard': 'claude-kpi-dashboard',
  
  // Automation Management
  'automation-status': 'claude-automation-status',
  'automation-run-all': 'claude-automation-run-all',
  'automation-schedule': 'claude-automation-schedule',
  
  // Quick Access
  'quick-health': 'claude-quick-health',
  'quick-alerts': 'claude-quick-alerts',
  'quick-recommendations': 'claude-quick-recommendations',
  
  // Batch Operations
  'batch-optimize': 'claude-batch-optimize',
  'batch-reports': 'claude-batch-reports'
};

// Command validation and security
function validateCommand(command) {
  if (!command || typeof command !== 'string') {
    return { valid: false, error: 'Command must be a valid string' };
  }
  
  if (!AUTOMATION_COMMANDS[command]) {
    return { valid: false, error: `Unknown command: ${command}` };
  }
  
  return { valid: true, claudeCommand: AUTOMATION_COMMANDS[command] };
}

// Execute automation command
async function executeCommand(claudeCommand, options = {}) {
  const { timeout = 30000, background = false } = options;
  
  try {
    // Source the commands script and execute
    const commandScript = `
      cd "${CLAUDE_TOOLS_DIR}" && 
      source ./claude-marketing-commands.sh && 
      ${claudeCommand}
    `;
    
    const startTime = Date.now();
    
    if (background) {
      // Execute in background for long-running commands
      exec(commandScript, (error, stdout, stderr) => {
        const duration = Date.now() - startTime;
        const logEntry = {
          command: claudeCommand,
          timestamp: new Date().toISOString(),
          duration,
          success: !error,
          error: error?.message,
          stdout: stdout?.substring(0, 1000), // Limit log size
          stderr: stderr?.substring(0, 1000)
        };
        
        // Save to log file
        const logFile = path.join(LOGS_DIR, `automation_${Date.now()}.json`);
        fs.writeFileSync(logFile, JSON.stringify(logEntry, null, 2));
      });
      
      return {
        success: true,
        message: `Command ${claudeCommand} started in background`,
        background: true,
        startTime: new Date().toISOString()
      };
    }
    
    // Execute synchronously
    const { stdout, stderr } = await execAsync(commandScript, { 
      timeout,
      cwd: CLAUDE_TOOLS_DIR,
      env: { ...process.env, PATH: `${CLAUDE_TOOLS_DIR}:${process.env.PATH}` }
    });
    
    const duration = Date.now() - startTime;
    
    // Parse JSON output if available
    let parsedOutput = null;
    try {
      const jsonMatch = stdout.match(/\{[^}]*\}/g);
      if (jsonMatch) {
        parsedOutput = JSON.parse(jsonMatch[jsonMatch.length - 1]);
      }
    } catch (parseError) {
      // Not JSON output, that's okay
    }
    
    const result = {
      success: true,
      command: claudeCommand,
      duration,
      timestamp: new Date().toISOString(),
      output: stdout,
      parsedOutput,
      stderr: stderr || null
    };
    
    // Save to log file
    const logFile = path.join(LOGS_DIR, `automation_${Date.now()}.json`);
    fs.writeFileSync(logFile, JSON.stringify(result, null, 2));
    
    return result;
    
  } catch (error) {
    const duration = Date.now() - startTime;
    const errorResult = {
      success: false,
      command: claudeCommand,
      duration,
      timestamp: new Date().toISOString(),
      error: error.message,
      stderr: error.stderr || null
    };
    
    // Save error to log file
    const logFile = path.join(LOGS_DIR, `automation_error_${Date.now()}.json`);
    fs.writeFileSync(logFile, JSON.stringify(errorResult, null, 2));
    
    return errorResult;
  }
}

// POST /api/automation/execute-command
export async function POST(request) {
  try {
    const { command, options = {} } = await request.json();
    
    // Validate command
    const validation = validateCommand(command);
    if (!validation.valid) {
      return NextResponse.json(
        { error: validation.error },
        { status: 400 }
      );
    }
    
    // Execute command
    const result = await executeCommand(validation.claudeCommand, options);
    
    return NextResponse.json(result);
    
  } catch (error) {
    console.error('Automation command execution error:', error);
    return NextResponse.json(
      { error: 'Failed to execute automation command', details: error.message },
      { status: 500 }
    );
  }
}

// GET /api/automation/execute-command - Get available commands
export async function GET() {
  try {
    const commands = Object.keys(AUTOMATION_COMMANDS).map(key => ({
      key,
      command: AUTOMATION_COMMANDS[key],
      description: getCommandDescription(key)
    }));
    
    return NextResponse.json({
      commands,
      totalCommands: commands.length
    });
    
  } catch (error) {
    console.error('Failed to get automation commands:', error);
    return NextResponse.json(
      { error: 'Failed to get automation commands' },
      { status: 500 }
    );
  }
}

// Helper function to get command descriptions
function getCommandDescription(key) {
  const descriptions = {
    'campaign-analyze': 'Analyze marketing campaign performance',
    'campaign-optimize': 'Optimize marketing campaigns',
    'campaign-report': 'Generate campaign performance report',
    'leads-score': 'Score leads based on engagement and profile',
    'leads-nurture': 'Generate lead nurturing recommendations',
    'leads-report': 'Generate leads performance report',
    'sales-analyze': 'Analyze sales pipeline performance',
    'sales-forecast': 'Generate sales revenue forecast',
    'sales-bottlenecks': 'Identify sales pipeline bottlenecks',
    'performance-monitor': 'Monitor system and website performance',
    'performance-alerts': 'Check for performance alerts',
    'website-health': 'Check website health metrics',
    'content-analyze': 'Analyze content performance and engagement',
    'seo-recommendations': 'Generate SEO optimization recommendations',
    'content-metrics': 'Get content performance metrics',
    'executive-report': 'Generate executive dashboard report',
    'executive-summary': 'Get executive summary metrics',
    'kpi-dashboard': 'Display key performance indicators',
    'automation-status': 'Check automation system status',
    'automation-run-all': 'Run all automation processes',
    'automation-schedule': 'Start automation scheduler',
    'quick-health': 'Quick system health check',
    'quick-alerts': 'Quick alerts overview',
    'quick-recommendations': 'Quick AI recommendations',
    'batch-optimize': 'Run batch optimization processes',
    'batch-reports': 'Generate batch reports'
  };
  
  return descriptions[key] || 'Automation command';
}
