const { app, BrowserWindow, session, ipcMain, shell, Menu, globalShortcut } = require('electron');
const path = require('path');
const fs = require('fs');

// Configuration file path
const configPath = path.join(__dirname, 'window-state.json');

// Store window references
let windows = [];

// Load window state from config file
function loadWindowState() {
  try {
    if (fs.existsSync(configPath)) {
      return JSON.parse(fs.readFileSync(configPath, 'utf8'));
    }
  } catch (error) {
    console.log('Error loading window state:', error);
  }
  
  // Default window state
  return {
    width: 1000,
    height: 800,
    x: undefined,
    y: undefined,
    alwaysOnTop: false
  };
}

// Save window state to config file
function saveWindowState(windowState) {
  try {
    fs.writeFileSync(configPath, JSON.stringify(windowState, null, 2));
  } catch (error) {
    console.log('Error saving window state:', error);
  }
}

// Get screen dimensions for dual window positioning
function getScreenDimensions() {
  const { screen } = require('electron');
  const primaryDisplay = screen.getPrimaryDisplay();
  return primaryDisplay.workAreaSize;
}

function createWindow(isSecondWindow = false) {
  const savedState = loadWindowState();
  
  let windowOptions = {
    width: isSecondWindow ? Math.floor(savedState.width / 2) : savedState.width,
    height: savedState.height,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      sandbox: true
    },
    alwaysOnTop: savedState.alwaysOnTop
  };

  // Position windows for side-by-side layout
  if (isSecondWindow && windows.length > 0) {
    const firstWindow = windows[0];
    const firstBounds = firstWindow.getBounds();
    
    // Resize first window to half width
    firstWindow.setBounds({
      x: firstBounds.x,
      y: firstBounds.y,
      width: Math.floor(firstBounds.width / 2),
      height: firstBounds.height
    });
    
    // Position second window to the right
    windowOptions.x = firstBounds.x + Math.floor(firstBounds.width / 2);
    windowOptions.y = firstBounds.y;
  } else {
    windowOptions.x = savedState.x;
    windowOptions.y = savedState.y;
  }

  const win = new BrowserWindow(windowOptions);
  windows.push(win);

  // Load ChatGPT directly
  win.loadURL('https://chat.openai.com');

  // Handle new window requests (like link clicks)
  win.webContents.setWindowOpenHandler(({ url }) => {
    console.log('New window requested for URL:', url);
    
    // Check if it's an external link
    if ((url.startsWith('http://') || url.startsWith('https://')) && 
        !url.includes('chat.openai.com') && 
        !url.includes('chatgpt.com') &&
        !url.includes('openai.com')) {
      console.log('Opening external URL in default browser:', url);
      shell.openExternal(url);
      return { action: 'deny' }; // Prevent opening in Electron
    }
    
    // Allow internal navigation
    return { action: 'allow' };
  });

  // Handle navigation attempts
  win.webContents.on('will-navigate', (event, navigationUrl) => {
    console.log('Navigation attempt to:', navigationUrl);
    
    // If it's an external link, open in default browser and prevent navigation
    if ((navigationUrl.startsWith('http://') || navigationUrl.startsWith('https://')) && 
        !navigationUrl.includes('chat.openai.com') && 
        !navigationUrl.includes('chatgpt.com') &&
        !navigationUrl.includes('openai.com') &&
        navigationUrl !== 'https://chat.openai.com/') {
      console.log('Preventing navigation, opening in default browser:', navigationUrl);
      event.preventDefault();
      shell.openExternal(navigationUrl);
    }
  });

  // Save window state when moved or resized
  win.on('moved', () => saveCurrentWindowState(win));
  win.on('resized', () => saveCurrentWindowState(win));
  
  // Remove window from array when closed
  win.on('closed', () => {
    const index = windows.indexOf(win);
    if (index > -1) {
      windows.splice(index, 1);
    }
  });

  return win;
}

// Save current window state
function saveCurrentWindowState(win) {
  if (win && !win.isDestroyed()) {
    const bounds = win.getBounds();
    const windowState = {
      width: bounds.width,
      height: bounds.height,
      x: bounds.x,
      y: bounds.y,
      alwaysOnTop: win.isAlwaysOnTop()
    };
    saveWindowState(windowState);
  }
}

// Toggle always on top for all windows
function toggleAlwaysOnTop() {
  const currentState = windows.length > 0 ? windows[0].isAlwaysOnTop() : false;
  const newState = !currentState;
  
  windows.forEach(win => {
    if (!win.isDestroyed()) {
      win.setAlwaysOnTop(newState);
    }
  });
  
  // Save the new state
  if (windows.length > 0) {
    saveCurrentWindowState(windows[0]);
  }
  
  console.log('Always on top:', newState ? 'enabled' : 'disabled');
}

// Create application menu
function createMenu() {
  const template = [
    {
      label: 'File',
      submenu: [
        {
          label: 'New Window',
          accelerator: 'CmdOrCtrl+N',
          click: () => {
            console.log('Creating second window...');
            createWindow(true);
          }
        },
        { type: 'separator' },
        {
          label: 'Quit',
          accelerator: process.platform === 'darwin' ? 'Cmd+Q' : 'Ctrl+Q',
          click: () => app.quit()
        }
      ]
    },
    {
      label: 'View',
      submenu: [
        {
          label: 'Always on Top',
          accelerator: 'CmdOrCtrl+T',
          type: 'checkbox',
          checked: windows.length > 0 ? windows[0].isAlwaysOnTop() : false,
          click: toggleAlwaysOnTop
        },
        { type: 'separator' },
        {
          label: 'Reload',
          accelerator: 'CmdOrCtrl+R',
          click: (item, focusedWindow) => {
            if (focusedWindow) focusedWindow.reload();
          }
        },
        {
          label: 'Toggle Developer Tools',
          accelerator: process.platform === 'darwin' ? 'Alt+Cmd+I' : 'Ctrl+Shift+I',
          click: (item, focusedWindow) => {
            if (focusedWindow) focusedWindow.webContents.toggleDevTools();
          }
        }
      ]
    }
  ];

  const menu = Menu.buildFromTemplate(template);
  Menu.setApplicationMenu(menu);
}

// Handle IPC messages
ipcMain.handle('open-external', (event, url) => {
  console.log('Main process: Opening external URL:', url);
  shell.openExternal(url);
});

ipcMain.handle('toggle-always-on-top', () => {
  toggleAlwaysOnTop();
});

ipcMain.handle('toggle-split-view', () => {
  // Send message to renderer to toggle split view
  if (windows.length > 0) {
    windows[0].webContents.send('toggle-split-view');
  }
});

app.whenReady().then(() => {
  createWindow();
  createMenu();
  
  // Register global shortcuts
  globalShortcut.register('CommandOrControl+T', () => {
    toggleAlwaysOnTop();
    // Update menu checkbox
    createMenu();
  });
  
  globalShortcut.register('CommandOrControl+N', () => {
    console.log('Global shortcut Ctrl+N pressed, creating second window...');
    createWindow(true);
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

app.on('will-quit', () => {
  // Unregister all shortcuts
  globalShortcut.unregisterAll();
});