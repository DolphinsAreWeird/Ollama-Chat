// main.js - Main Electron process
const { app, BrowserWindow, ipcMain, Menu, dialog, shell } = require('electron');
const path = require('path');
const fs = require('fs');
const http = require('http');

// Keep a global reference of the window object
let mainWindow;

function createWindow() {
  // Create the browser window
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 800,
    minHeight: 600,
    backgroundColor: '#f9f9f9',
    titleBarStyle: 'hiddenInset',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false
    }
  });

  // Load the index.html file
  mainWindow.loadFile(path.join(__dirname, 'renderer', 'index.html'));

  // Open external links in the default browser
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: 'deny' };
  });

  // Create the application menu
  const template = [
    {
      label: app.name,
      submenu: [
        { role: 'about' },
        { type: 'separator' },
        { role: 'services' },
        { type: 'separator' },
        { role: 'hide' },
        { role: 'hideOthers' },
        { role: 'unhide' },
        { type: 'separator' },
        { role: 'quit' }
      ]
    },
    {
      label: 'File',
      submenu: [
        {
          label: 'New Chat',
          accelerator: 'CmdOrCtrl+N',
          click: () => {
            mainWindow.webContents.send('new-chat');
          }
        },
        {
          label: 'Export Chat...',
          accelerator: 'CmdOrCtrl+S',
          click: () => {
            mainWindow.webContents.send('export-chat');
          }
        },
        { type: 'separator' },
        { role: 'close' }
      ]
    },
    {
      label: 'Edit',
      submenu: [
        { role: 'undo' },
        { role: 'redo' },
        { type: 'separator' },
        { role: 'cut' },
        { role: 'copy' },
        { role: 'paste' },
        { role: 'delete' },
        { type: 'separator' },
        { role: 'selectAll' }
      ]
    },
    {
      label: 'View',
      submenu: [
        { role: 'reload' },
        { role: 'forceReload' },
        { role: 'toggleDevTools' },
        { type: 'separator' },
        { role: 'resetZoom' },
        { role: 'zoomIn' },
        { role: 'zoomOut' },
        { type: 'separator' },
        { role: 'togglefullscreen' }
      ]
    },
    {
      label: 'Help',
      submenu: [
        {
          label: 'Ollama Documentation',
          click: async () => {
            await shell.openExternal('https://ollama.com/docs');
          }
        },
        {
          label: 'Check Ollama Server Status',
          click: () => {
            checkOllamaStatus();
          }
        }
      ]
    }
  ];

  const menu = Menu.buildFromTemplate(template);
  Menu.setApplicationMenu(menu);
}

// Check if Ollama server is running
function checkOllamaStatus() {
  const req = http.request({
    hostname: 'localhost',
    port: 11434,
    path: '/api/tags',
    method: 'GET',
    timeout: 2000
  }, (res) => {
    let data = '';
    res.on('data', (chunk) => {
      data += chunk;
    });
    res.on('end', () => {
      if (res.statusCode === 200) {
        dialog.showMessageBox({
          type: 'info',
          title: 'Ollama Status',
          message: 'Ollama server is running',
          detail: 'The Ollama server is active and responding on port 11434.'
        });
      } else {
        dialog.showErrorBox('Ollama Error', 'Ollama server returned an error: ' + res.statusCode);
      }
    });
  });

  req.on('error', (error) => {
    dialog.showErrorBox(
      'Ollama Not Running', 
      'The Ollama server does not appear to be running. Please start it with "ollama serve" in a terminal.'
    );
  });

  req.end();
}

// Handle file saving
ipcMain.handle('save-file', async (event, content) => {
  const { filePath } = await dialog.showSaveDialog({
    title: 'Save Chat',
    defaultPath: path.join(app.getPath('documents'), 'ollama-chat.md'),
    filters: [
      { name: 'Markdown', extensions: ['md'] },
      { name: 'Text', extensions: ['txt'] }
    ]
  });

  if (filePath) {
    fs.writeFileSync(filePath, content);
    return true;
  }
  return false;
});

// Initialize the app
app.whenReady().then(() => {
  createWindow();

  app.on('activate', function () {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

// Quit when all windows are closed, except on macOS
app.on('window-all-closed', function () {
  if (process.platform !== 'darwin') app.quit();
});