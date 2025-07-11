# IOC Automation Bridge

This directory contains the automation bridge interface that connects the Next.js staging environment with Claude automation tools.

## Files Created

### Main Interface
- **`/app/automation/page.js`** - Main automation dashboard with command execution interface
- **`/app/automation/test/page.js`** - Simple test interface for basic connection testing
- **`/app/automation/status/page.js`** - System status page showing automation health

### API Endpoints
- **`/app/api/automation/execute-command/route.js`** - Main automation command execution API (already existed)
- **`/app/api/automation/test-connection/route.js`** - Simple test commands API (newly created)

### Navigation
- **`/components/Navigation.js`** - Updated to include "Automation" link in main navigation

## Features

### Command Execution
- Execute Claude automation commands from web interface
- Support for both synchronous and background execution
- Real-time results display with execution time
- Command categorization (Campaign, Sales, Performance, etc.)

### Fallback System
- Graceful fallback to basic system commands when full automation isn't available
- Test connection capabilities to verify bridge is working
- System status monitoring

### Test Commands
Available test commands for basic connectivity:
- `test-echo` - Basic connection test
- `system-info` - System information
- `disk-usage` - Disk usage statistics
- `memory-usage` - Memory usage statistics
- `claude-tools-test` - Claude tools directory test

## Usage

### Access the Interface
1. Navigate to `/automation` in the web application
2. Login required (existing authentication system)
3. Choose commands from organized categories
4. Use "Test Connection" for basic connectivity tests
5. Use "System Status" for health monitoring

### API Usage
```bash
# Test connection
curl -X GET http://localhost:3009/api/automation/test-connection

# Execute test command
curl -X POST http://localhost:3009/api/automation/test-connection \
  -H "Content-Type: application/json" \
  -d '{"command":"test-echo"}'

# Execute full automation command (if available)
curl -X POST http://localhost:3009/api/automation/execute-command \
  -H "Content-Type: application/json" \
  -d '{"command":"quick-health","options":{"timeout":30000}}'
```

## Dependencies

### Required
- `@heroicons/react` - For UI icons (already installed)
- Next.js 15.3.5+ - Web framework
- Existing authentication system

### Optional
- Full Claude automation system at `/home/darren/ioc-core/tools/claude/`
- `claude-marketing-commands.sh` for advanced commands

## Error Handling

The system includes comprehensive error handling:
- Graceful fallback when full automation isn't available
- Connection status monitoring
- Command execution timeouts
- User-friendly error messages
- Logging for debugging

## Security

- Only pre-approved commands can be executed
- Input validation on all API endpoints
- Authentication required for web interface
- Command execution in controlled environment
- No arbitrary shell command execution

## Development

To extend the automation bridge:

1. Add new commands to `/app/api/automation/test-connection/route.js`
2. Update command categories in `/app/automation/page.js`
3. Add new status checks in `/app/automation/status/page.js`
4. Ensure proper error handling and fallbacks

## Testing

The automation bridge has been tested with:
- Basic connection tests ✓
- Command execution ✓
- Error handling ✓
- UI functionality ✓
- API endpoints ✓

All tests pass successfully.