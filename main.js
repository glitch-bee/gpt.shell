const { app, BrowserWindow, session, ipcMain, shell, Menu, globalShortcut, clipboard, Notification } = require('electron');
const path = require('path');
const fs = require('fs');

// Force Electron to use Ozone platform with X11 and apply anti-blur hints on Linux
app.commandLine.appendSwitch('enable-features', 'UseOzonePlatform');
app.commandLine.appendSwitch('ozone-platform', 'x11');
if (process.platform === 'linux') {
  app.commandLine.appendSwitch('ozone-platform-hint', 'x11');
  app.commandLine.appendSwitch('high-dpi-support', '1');
  app.commandLine.appendSwitch('force-device-scale-factor', '1');
  app.commandLine.appendSwitch('use-gl', 'desktop');
  // User-specified anti-blur and font rendering flags
  app.commandLine.appendSwitch('enable-gpu-rasterization');
  app.commandLine.appendSwitch('enable-zero-copy');
  app.commandLine.appendSwitch('disable-font-subpixel-positioning', 'false');
  app.commandLine.appendSwitch('enable-lcd-text-aa');
  app.commandLine.appendSwitch('force-color-profile', 'srgb');
  app.commandLine.appendSwitch('disable-smooth-scrolling');
  app.commandLine.appendSwitch('disable-skia-runtime-opts');
  // User-specified GPU and font flags for further testing
  app.commandLine.appendSwitch('disable-gpu');
  app.commandLine.appendSwitch('disable-gpu-compositing');
  app.commandLine.appendSwitch('enable-font-antialiasing');
  app.commandLine.appendSwitch('disable-lcd-text-aa', 'false');
}

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
    alwaysOnTop: false,
    useNord: false
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
  }
  const win = new BrowserWindow(windowOptions);
  windows.push(win);
  // init theme flag for this window from saved state
  win.__useNord = !!savedState.useNord;



  // Load ChatGPT directly
  win.loadURL('https://chat.openai.com');

  // Inject Nord CSS if enabled
  let nordCssKey = null;
  const injectNord = async () => {
    try {
      const css = fs.readFileSync(path.join(__dirname, 'themes', 'nord-polar.css'), 'utf8');
      nordCssKey = await win.webContents.insertCSS(css, { cssOrigin: 'author' });
    } catch (e) {
      console.log('Failed to inject Nord CSS:', e);
    }
  };
  const removeNord = () => {
    if (nordCssKey) {
      try { win.webContents.removeInsertedCSS(nordCssKey); } catch {}
      nordCssKey = null;
    }
  };

  win.webContents.on('did-finish-load', () => {
    if (savedState.useNord) injectNord();
  });

  // Handle new window requests (like link clicks)
  win.webContents.setWindowOpenHandler(({ url }) => {
    console.log('New window requested for URL:', url);
    
    // DENY ALL new windows - open everything external in default browser
    // Only allow same-origin/internal ChatGPT navigation within the same window
    if (url.startsWith('http://') || url.startsWith('https://')) {
  console.log('Opening ALL external URLs in default browser:', url);
  openExternalSafe(url);
    }
    
    // ALWAYS deny new window creation - force everything to stay in one window or go to default browser
    return { action: 'deny' };
  });

  // Handle navigation attempts
  win.webContents.on('will-navigate', (event, navigationUrl) => {
    console.log('Navigation attempt to:', navigationUrl);
    
    const currentUrl = win.webContents.getURL();
    console.log('Current URL:', currentUrl);
    
    // Allow navigation within the same origin (ChatGPT internal navigation)
    const isInternalNavigation = navigationUrl.includes('chat.openai.com') || 
                                navigationUrl.includes('chatgpt.com') ||
                                navigationUrl.includes('openai.com') ||
                                navigationUrl === 'https://chat.openai.com/' ||
                                navigationUrl.startsWith('https://chat.openai.com/') ||
                                navigationUrl.startsWith('https://chatgpt.com/');
    
    if (!isInternalNavigation && (navigationUrl.startsWith('http://') || navigationUrl.startsWith('https://'))) {
      console.log('Preventing external navigation, opening in default browser:', navigationUrl);
      event.preventDefault();
      openExternalSafe(navigationUrl);
    }
  });

  // Additional safety net: catch any other new window attempts
  win.webContents.on('new-window', (event, url) => {
    console.log('Legacy new-window event fired for:', url);
    event.preventDefault();
    if (url.startsWith('http://') || url.startsWith('https://')) {
  openExternalSafe(url);
    }
  });

  // Catch iframe navigation attempts
  win.webContents.on('did-create-window', (childWindow, details) => {
    console.log('Child window creation attempted for:', details.url);
    // Immediately close any child windows and open in default browser instead
    childWindow.destroy();
    if (details.url && (details.url.startsWith('http://') || details.url.startsWith('https://'))) {
  openExternalSafe(details.url);
    }
  });

  // Save window state when moved or resized
  win.on('moved', () => saveCurrentWindowState(win));
  win.on('resized', () => saveCurrentWindowState(win));
  
  // Remove window from array when closed
  win.on('closed', () => {
    // attempt to cleanup injected CSS handle
    if (win.__nordCssKey) {
      try { win.webContents.removeInsertedCSS(win.__nordCssKey); } catch {}
    }
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
      alwaysOnTop: win.isAlwaysOnTop(),
      useNord: (() => { try { return win.__useNord === true; } catch { return false; } })()
    };
    saveWindowState(windowState);
  }
}

// Normalize and safely open external URLs; fallback to clipboard + notification on failure
function openExternalSafe(rawUrl) {
  try {
    let url = String(rawUrl || '').trim();
    if (!url) return;

    // If missing protocol but looks like a host/path, prefix https
    if (!/^https?:\/\//i.test(url) && /[^\s]+\.[^\s]{2,}/.test(url)) {
      url = 'https://' + url;
    }

    // Validate URL
    try {
      const u = new URL(url);
      url = u.toString();
    } catch {
      // Not a valid URL; copy to clipboard and notify
      clipboard.writeText(String(rawUrl));
      new Notification({
        title: 'Link looks invalid',
        body: 'Copied to clipboard so you can paste it into your browser.'
      }).show();
      return;
    }

    shell.openExternal(url).catch((err) => {
      console.error('openExternal failed:', err, 'for', url);
      clipboard.writeText(url);
      new Notification({
        title: 'Couldn\'t open link',
        body: 'Copied to clipboard. Paste in your browser.'
      }).show();
    });
  } catch (err) {
    console.error('openExternalSafe error for', rawUrl, err);
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
  // New Window option removed per request
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
          accelerator: 'CmdOrCtrl+Shift+T',
          type: 'checkbox',
          checked: windows.length > 0 ? windows[0].isAlwaysOnTop() : false,
          click: toggleAlwaysOnTop
        },
  { type: 'separator' },
        {
          label: 'Nord Polar Theme',
          type: 'checkbox',
          checked: (() => { try { return windows[0]?.__useNord === true; } catch { return false; } })(),
          click: () => {
            const use = !(windows[0]?.__useNord === true);
            windows.forEach(w => {
              if (!w.isDestroyed()) {
                w.__useNord = use;
                if (use) {
                  try {
                    const css = fs.readFileSync(path.join(__dirname, 'themes', 'nord-polar.css'), 'utf8');
                    w.webContents.insertCSS(css, { cssOrigin: 'author' }).then((key) => { w.__nordCssKey = key; }).catch(()=>{});
                  } catch {}
                } else if (w.__nordCssKey) {
                  try { w.webContents.removeInsertedCSS(w.__nordCssKey); } catch {}
                  w.__nordCssKey = null;
                }
              }
            });
            // Persist using first window's state
            if (windows[0]) saveCurrentWindowState(windows[0]);
            // Rebuild menu to reflect checkbox state
            createMenu();
          }
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
  openExternalSafe(url);
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
  globalShortcut.register('CommandOrControl+Shift+T', () => {
    toggleAlwaysOnTop();
    // Update menu checkbox
    createMenu();
  });
  
  // Removed global Ctrl+N new window shortcut
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

app.on('will-quit', () => {
  // Unregister all shortcuts
  globalShortcut.unregisterAll();
});