import { NextResponse } from 'next/server';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

// POST /api/automation/test-connection
export async function POST(request) {
  try {
    const { command } = await request.json();
    
    // Simple test commands that don't require complex dependencies
    const testCommands = {
      'system-info': 'uname -a && echo "System: $(date)"',
      'disk-usage': 'df -h | head -5',
      'memory-usage': 'free -h',
      'claude-tools-test': 'ls -la /home/darren/ioc-core/tools/claude/ | head -10',
      'test-echo': 'echo "Automation bridge connection successful at $(date)"'
    };
    
    if (!testCommands[command]) {
      return NextResponse.json(
        { error: 'Unknown test command' },
        { status: 400 }
      );
    }
    
    const startTime = Date.now();
    const { stdout, stderr } = await execAsync(testCommands[command], { 
      timeout: 10000
    });
    
    const duration = Date.now() - startTime;
    
    return NextResponse.json({
      success: true,
      command,
      duration,
      timestamp: new Date().toISOString(),
      output: stdout,
      stderr: stderr || null
    });
    
  } catch (error) {
    return NextResponse.json(
      { error: 'Test command failed', details: error.message },
      { status: 500 }
    );
  }
}

// GET /api/automation/test-connection
export async function GET() {
  return NextResponse.json({
    status: 'ok',
    message: 'Automation bridge connection test endpoint',
    availableCommands: [
      'system-info',
      'disk-usage', 
      'memory-usage',
      'claude-tools-test',
      'test-echo'
    ]
  });
}