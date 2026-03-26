# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

PomoFocus is an Electron-based desktop Pomodoro timer application. It implements the Pomodoro Technique with automatic mode transitions: Focus → Short Break → Long Break (after 4 sessions). The app includes session logging to a CSV file and configurable timer durations via a settings window.

## Development Commands

All commands are run from the `app/` directory.

### Getting Started
```bash
npm install              # Install dependencies
npm start                # Launch the Electron app
npm run watch            # Auto-reload on file changes (recommended for development)
```

### Building Packages
```bash
npm run package-win      # Build Windows installer
npm run package-mac      # Build macOS app
npm run package-linux    # Build Linux app
npm run build            # Build using electron-builder
```

### Linting
```bash
xo                       # Run XO linter (configured in package.json)
```

## Architecture Overview

### Entry Point & Main Process
- **app/main.js**: Electron main process
  - Creates the main timer window (`home/index.html`)
  - Manages the settings window (`settings/index.html`)
  - Handles IPC communication between windows
  - Triggers system notifications when sessions complete
  - Manages window state (always-on-top setting)

### Configuration System
- **app/config.json**: Persisted application settings
  - `dark_theme`: Boolean for theme preference
  - `time_data`: Object containing focus, short_break, and long_break durations (MM:SS format)
  - `always_on_top`: Boolean to keep window on top of other applications
  - Modified by the settings window and persisted to disk

### Main Timer Window (Home)
- **app/home/index.js**: Core timer logic
  - Loads configuration from `config.json`
  - Manages timer state (focus vs break mode)
  - Implements the Pomodoro cycle: 4 focus sessions → long break → repeat
  - Handles spacebar to start/pause
  - Integrates logging system
  - Triggers notifications and alarm sound on session end

### Session Logging System
The logging feature writes to `~/pomofocus-logs.csv`:
- **prepareLog()**: Called when a session ends, captures start/end times and session type
- **commitLog()**: Writes the prepared log to CSV with an optional user note
- **updateDailyTotal()**: Calculates and displays total focus time for the current day
- Note input field: Users can press Enter after a session ends to add notes before committing

### Settings Window
- **app/settings/index.js**: Manages configuration changes
  - Loads current settings from `config.json`
  - Provides UI controls for timer durations, theme, and always-on-top setting
  - Saves changes and triggers app reload via `ReloadMain` IPC event
  - Auto-closes after saving

### IPC Communication
Main → Renderer:
- `ShowNotification_focus`: Sends notification for focus mode
- `ShowNotification_shortbreak`: Sends notification for short break
- `ShowNotification_longbreak`: Sends notification for long break
- `Pause-timer`: Triggers pause/resume from main process

Renderer → Main:
- `closeApp`: Close main window
- `minApp`: Minimize main window
- `openSettings`: Open settings window
- `closeSetting`: Close settings window
- `minSetting`: Minimize settings window
- `ReloadMain`: Restart app to apply settings changes

## Key Implementation Details

### Timer Loop
The core timer runs on a 1-second interval using `setInterval`. When a session completes:
1. Alarm sound plays
2. Notification is sent
3. Session is logged (time captured, awaiting user note)
4. Mode transitions to next phase (focus → break or break → focus)
5. Timer resets to new duration and continues automatically

### State Management
Global variables track:
- `focusTime`, `shortBreakTime`, `longBreakTime`: Current durations (in minutes)
- `isBreak`: Boolean indicating if in break or focus mode
- `workCount`: Counter for session number (increments to determine long break timing)
- `currentSessionStartTime`: Timestamp when current session started
- `pendingLog`: Object holding session data awaiting note input

### File Access Pattern
The app uses relative paths from the `app/` directory:
- `config.json`: Configuration file in app root
- `home/` and `settings/`: Directories for renderer windows
- `sound/alarm.mp3`: Alarm sound file
- CSV logs written to user home directory: `~/pomofocus-logs.csv`

## Common Development Tasks

### Adding a New Timer Mode
1. Add new duration field to `config.json` structure
2. Add configuration UI elements to `settings/index.html` and corresponding JavaScript in `settings/index.js`
3. Add mode variable to `home/index.js` (e.g., `newModeTime`)
4. Update the timer transition logic in `startTimer()` to include new mode in cycle
5. Add new notification IPC event in `main.js` if needed

### Modifying Timer Durations
Durations use MM:SS string format. To change defaults:
1. Update `config.json` time_data values
2. These are parsed as minutes in `home/index.js`: `parseInt(data.time_data.focus_time.split(":")[0])`

### Debugging Logs
Check `~/pomofocus-logs.csv` to see session history. The CSV format is:
```
Start Time,End Time,Session Type,Note
```

Session types are "Focus" or "Break". Notes are optional and quoted if they contain commas.

## Known Limitations & Technical Notes

- **nodeIntegration and contextIsolation**: Currently enabled in main process windows. This is a security trade-off that allows direct Node.js access from renderer processes.
- **CSV Parsing**: The `updateDailyTotal()` function uses a simple date string comparison (`startsWith(today)`) which may have edge cases across timezone boundaries
- **Theme**: Dark theme toggle is configured but styling may not be fully implemented across all components
- **Always-on-top**: Applies globally to main window; settings window is modal and always visible when open
