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

- **Ctrl+Shift+T**: Toggle always on top
- **Ctrl+N**: Open new window (automatically positioned for dual-window setup)
- **Ctrl+R**: Reload current window
- **Ctrl+Shift+I**: Toggle Developer Tools
- **Ctrl+Q**: Quit application

## Features

- **Font Enhancement**: Uses JetBrains Mono font family for all text, improving code block readability
- **External Link Handling**: ALL external links automatically open in your default browser instead of creating new Electron windows
- **Always on Top**: Pin the window above all other applications with Ctrl+Shift+T or via the View menu
- **Window State Persistence**: Remembers window size, position, and always-on-top state between sessions
- **Dual Window Support**: Open a second window (Ctrl+N) that automatically positions in a vertical split layout for cross-referencing
- **Application Menu**: Native menu with keyboard shortcuts for common actions
- **Secure Architecture**: Implements Electron's security best practices with context isolation and sandboxing
- **Lightweight**: Minimal overhead over the web interface

### Why External Links Open in Default Browser

This application implements aggressive external link handling for several important reasons:

1. **Ad Blocking & Privacy**: Chromium-based browsers (including Electron) have limited ad blocking capabilities due to Manifest V3 restrictions. Your default browser likely has powerful extensions like uBlock Origin, Privacy Badger, or custom filters that provide a much cleaner browsing experience.

2. **Extension Ecosystem**: Your main browser has extensions for password management, privacy protection, custom CSS, accessibility tools, and other workflow enhancements that aren't available in Electron's stripped-down environment.

3. **User Choice**: You've carefully configured your default browser with specific settings, bookmarks, and workflows. External links should respect this choice rather than forcing you into a bare Chromium environment.

4. **Security**: Your main browser receives regular security updates and has mature security features. Electron applications often lag behind in security patches.

The application uses a "nuclear option" approach - **NO** new Electron windows will ever open. All external navigation is redirected to your default browser, while internal ChatGPT navigation (sidebar, chat switching, etc.) works normally within the same window. This ensures the application behaves exactly like the web version while respecting your browsing preferences.

## Technical Details

- Built with Electron
- Uses contextBridge for secure IPC communication
- Implements multiple layers of external link interception:
  - Main process `setWindowOpenHandler` - denies ALL new window requests
  - Main process `will-navigate` event - catches navigation attempts
  - Preload script click interception - aggressive event handling
  - `window.open` override - complete replacement to prevent new windows
  - Form submission and middle-click protection
- Font loading via Google Fonts CDN
- Window state persistence with JSON configuration file
- Global keyboard shortcuts with proper cleanup
- Dynamic window positioning for dual-window layouts
- MutationObserver for monitoring dynamic content changes

## Requirements

- Node.js
- npm
- Linux desktop environment

## License

This project provides a desktop wrapper for ChatGPT and is intended for personal use.
