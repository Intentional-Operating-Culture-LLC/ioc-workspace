import { NextResponse } from 'next/server';
import { exec } from 'child_process';
import { promisify } from 'util';
import path from 'path';
import fs from 'fs';

const execAsync = promisify(exec);

const CLAUDE_TOOLS_DIR = '/home/darren/ioc-core/tools/claude';
const VOICE_INTERFACE_SCRIPT = path.join(CLAUDE_TOOLS_DIR, 'claude-voice-interface.py');
const VOICE_LOGS_DIR = path.join(CLAUDE_TOOLS_DIR, 'logs', 'voice');

// Ensure voice logs directory exists
if (!fs.existsSync(VOICE_LOGS_DIR)) {
  fs.mkdirSync(VOICE_LOGS_DIR, { recursive: true });
}

// Check if voice interface dependencies are installed
async function checkVoiceDependencies() {
  try {
    const { stdout } = await execAsync(
      `cd "${CLAUDE_TOOLS_DIR}" && python3 -c "import speech_recognition, pyttsx3, pyaudio; print('Voice dependencies available')"`
    );
    return { available: true, message: 'Voice dependencies are installed' };
  } catch (error) {
    return { 
      available: false, 
      message: 'Voice dependencies not installed',
      error: error.message
    };
  }
}

// Check voice interface status
async function getVoiceStatus() {
  try {
    // Check if voice interface is running
    const { stdout: processCheck } = await execAsync(
      "ps aux | grep 'claude-voice-interface.py' | grep -v grep || echo 'Not running'"
    );
    
    const isRunning = !processCheck.includes('Not running');
    
    // Check dependencies
    const dependencies = await checkVoiceDependencies();
    
    // Get recent voice logs
    const voiceLogs = await getRecentVoiceLogs();
    
    // Test voice recognition capability
    const voiceTest = await testVoiceCapability();
    
    return {
      isRunning,
      dependencies,
      voiceTest,
      logs: voiceLogs,
      timestamp: new Date().toISOString()
    };
    
  } catch (error) {
    return {
      isRunning: false,
      error: error.message,
      timestamp: new Date().toISOString()
    };
  }
}

// Get recent voice logs
async function getRecentVoiceLogs() {
  try {
    const logFiles = fs.readdirSync(VOICE_LOGS_DIR)
      .filter(file => file.endsWith('.json'))
      .sort((a, b) => {
        const aTime = fs.statSync(path.join(VOICE_LOGS_DIR, a)).mtime;
        const bTime = fs.statSync(path.join(VOICE_LOGS_DIR, b)).mtime;
        return bTime - aTime;
      })
      .slice(0, 10); // Get last 10 logs
    
    const logs = logFiles.map(file => {
      const logPath = path.join(VOICE_LOGS_DIR, file);
      const logData = JSON.parse(fs.readFileSync(logPath, 'utf8'));
      return {
        filename: file,
        ...logData
      };
    });
    
    return logs;
    
  } catch (error) {
    return [];
  }
}

// Test voice capability
async function testVoiceCapability() {
  try {
    const { stdout } = await execAsync(
      `cd "${CLAUDE_TOOLS_DIR}" && python3 -c "
import speech_recognition as sr
import pyttsx3
import json

try:
    r = sr.Recognizer()
    m = sr.Microphone()
    engine = pyttsx3.init()
    
    voices = engine.getProperty('voices')
    voice_list = [{'name': v.name, 'id': v.id} for v in voices[:3]]
    
    result = {
        'microphone_available': True,
        'speech_recognition_available': True,
        'text_to_speech_available': True,
        'voices': voice_list
    }
    
except Exception as e:
    result = {
        'microphone_available': False,
        'speech_recognition_available': False,
        'text_to_speech_available': False,
        'error': str(e)
    }
    
print(json.dumps(result))
"`,
      { timeout: 10000 }
    );
    
    return JSON.parse(stdout.trim());
    
  } catch (error) {
    return {
      microphone_available: false,
      speech_recognition_available: false,
      text_to_speech_available: false,
      error: error.message
    };
  }
}

// Start voice interface
async function startVoiceInterface() {
  try {
    // Check if already running
    const { stdout: processCheck } = await execAsync(
      "ps aux | grep 'claude-voice-interface.py' | grep -v grep || echo 'Not running'"
    );
    
    if (!processCheck.includes('Not running')) {
      return {
        success: false,
        message: 'Voice interface is already running'
      };
    }
    
    // Start voice interface in background
    const command = `cd "${CLAUDE_TOOLS_DIR}" && nohup python3 claude-voice-interface.py start > "${VOICE_LOGS_DIR}/voice_interface.log" 2>&1 &`;
    
    exec(command, (error, stdout, stderr) => {
      if (error) {
        console.error('Voice interface start error:', error);
      }
    });
    
    // Wait a moment for startup
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    return {
      success: true,
      message: 'Voice interface started successfully',
      timestamp: new Date().toISOString()
    };
    
  } catch (error) {
    return {
      success: false,
      message: 'Failed to start voice interface',
      error: error.message
    };
  }
}

// Stop voice interface
async function stopVoiceInterface() {
  try {
    // Find and kill voice interface process
    await execAsync(
      "pkill -f 'claude-voice-interface.py' || echo 'No process found'"
    );
    
    return {
      success: true,
      message: 'Voice interface stopped successfully',
      timestamp: new Date().toISOString()
    };
    
  } catch (error) {
    return {
      success: false,
      message: 'Failed to stop voice interface',
      error: error.message
    };
  }
}

// Execute voice command
async function executeVoiceCommand(command) {
  try {
    const voiceCommand = `cd "${CLAUDE_TOOLS_DIR}" && python3 claude-voice-interface.py test`;
    
    const { stdout, stderr } = await execAsync(voiceCommand, { 
      timeout: 15000
    });
    
    return {
      success: true,
      command,
      output: stdout,
      stderr: stderr || null,
      timestamp: new Date().toISOString()
    };
    
  } catch (error) {
    return {
      success: false,
      command,
      error: error.message,
      timestamp: new Date().toISOString()
    };
  }
}

// GET /api/automation/voice-status
export async function GET() {
  try {
    const status = await getVoiceStatus();
    return NextResponse.json(status);
    
  } catch (error) {
    console.error('Voice status check error:', error);
    return NextResponse.json(
      { error: 'Failed to check voice status', details: error.message },
      { status: 500 }
    );
  }
}

// POST /api/automation/voice-status
export async function POST(request) {
  try {
    const { action, command } = await request.json();
    
    let result;
    
    switch (action) {
      case 'start':
        result = await startVoiceInterface();
        break;
        
      case 'stop':
        result = await stopVoiceInterface();
        break;
        
      case 'execute':
        if (!command) {
          return NextResponse.json(
            { error: 'Command is required for execute action' },
            { status: 400 }
          );
        }
        result = await executeVoiceCommand(command);
        break;
        
      case 'test':
        result = await testVoiceCapability();
        break;
        
      default:
        return NextResponse.json(
          { error: 'Invalid action. Use: start, stop, execute, or test' },
          { status: 400 }
        );
    }
    
    return NextResponse.json(result);
    
  } catch (error) {
    console.error('Voice interface action error:', error);
    return NextResponse.json(
      { error: 'Failed to execute voice interface action', details: error.message },
      { status: 500 }
    );
  }
}
