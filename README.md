# GPT Shell

A lightweight Electron wrapper for ChatGPT that provides a native desktop experience on Linux.

## Description

This application creates a desktop shell around the ChatGPT web interface, offering:

- Native desktop window management
- JetBrains Mono font integration for improved code readability
- External link handling that opens links in your default browser
- Secure IPC communication between processes

## Installation

1. Clone the repository:
```bash
git clone https://github.com/glitch-bee/gpt.shell.git
cd gpt.shell
```

2. Install dependencies:
```bash
npm install
```

## Usage

Start the application:
```bash
npm start
```

The application will open ChatGPT in a dedicated desktop window with enhanced typography and proper external link handling.

### Keyboard Shortcuts

- **Ctrl+T**: Toggle always on top
- **Ctrl+N**: Open new window (automatically positioned for dual-window setup)
- **Ctrl+R**: Reload current window
- **Ctrl+Shift+I**: Toggle Developer Tools
- **Ctrl+Q**: Quit application

## Features

- **Font Enhancement**: Uses JetBrains Mono font family for all text, improving code block readability
- **External Link Handling**: Automatically opens external links in your default browser instead of within the application
- **Always on Top**: Pin the window above all other applications with Ctrl+T or via the View menu
- **Window State Persistence**: Remembers window size, position, and always-on-top state between sessions
- **Dual Window Support**: Open a second window (Ctrl+N) that automatically positions in a vertical split layout for cross-referencing
- **Application Menu**: Native menu with keyboard shortcuts for common actions
- **Secure Architecture**: Implements Electron's security best practices with context isolation and sandboxing
- **Lightweight**: Minimal overhead over the web interface

## Technical Details

- Built with Electron
- Uses contextBridge for secure IPC communication
- Implements MutationObserver for dynamic link detection
- Font loading via Google Fonts CDN
- Window state persistence with JSON configuration file
- Global keyboard shortcuts with proper cleanup
- Dynamic window positioning for dual-window layouts

## Requirements

- Node.js
- npm
- Linux desktop environment

## License

This project provides a desktop wrapper for ChatGPT and is intended for personal use.
