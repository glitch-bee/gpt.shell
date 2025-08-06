const { app, BrowserWindow, session, ipcMain, shell } = require('electron');
const path = require('path');

function createWindow () {
  const win = new BrowserWindow({
    width: 1000,
    height: 800,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      sandbox: true
    }
  });

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
}

// Handle opening external links in default browser
ipcMain.handle('open-external', (event, url) => {
  console.log('Main process: Opening external URL:', url);
  shell.openExternal(url);
});

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
