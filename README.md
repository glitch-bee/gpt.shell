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

## Features

- **Font Enhancement**: Uses JetBrains Mono font family for all text, improving code block readability
- **External Link Handling**: Automatically opens external links in your default browser instead of within the application
- **Secure Architecture**: Implements Electron's security best practices with context isolation and sandboxing
- **Lightweight**: Minimal overhead over the web interface

## Technical Details

- Built with Electron
- Uses contextBridge for secure IPC communication
- Implements MutationObserver for dynamic link detection
- Font loading via Google Fonts CDN

## Requirements

- Node.js
- npm
- Linux desktop environment

## License

This project provides a desktop wrapper for ChatGPT and is intended for personal use.
