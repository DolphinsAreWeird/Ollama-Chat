// preload.js - Secure bridge between renderer and main processes
const { contextBridge, ipcRenderer } = require('electron');

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld('electronAPI', {
  saveChatToFile: (content) => ipcRenderer.invoke('save-file', content),
  onNewChat: (callback) => ipcRenderer.on('new-chat', callback),
  onExportChat: (callback) => ipcRenderer.on('export-chat', callback)
});