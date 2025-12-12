/**
 * Preload Script
 * Exposes secure APIs to the renderer process via contextBridge
 * This maintains security by not exposing Node.js directly to the renderer
 */

const { contextBridge, ipcRenderer } = require('electron');

// Expose protected methods to the renderer process
contextBridge.exposeInMainWorld('electronAPI', {
  // Capture screenshot and analyze immediately
  captureNow: () => ipcRenderer.invoke('capture-now'),
  
  // Toggle automatic capture mode
  toggleAutoCapture: (enabled) => ipcRenderer.invoke('toggle-auto-capture', enabled),
  
  // Get current settings
  getSettings: () => ipcRenderer.invoke('get-settings'),
  
  // Update settings
  updateSettings: (settings) => ipcRenderer.invoke('update-settings', settings),
  
  // Check if screen capture permission is granted
  checkPermission: () => ipcRenderer.invoke('check-permission'),
  
  // Event listeners for main process events
  onCaptureStarted: (callback) => {
    ipcRenderer.on('capture-started', callback);
    return () => ipcRenderer.removeListener('capture-started', callback);
  },
  
  onAnalyzing: (callback) => {
    ipcRenderer.on('analyzing', callback);
    return () => ipcRenderer.removeListener('analyzing', callback);
  },
  
  onCaptureComplete: (callback) => {
    ipcRenderer.on('capture-complete', (event, data) => callback(data));
    return () => ipcRenderer.removeListener('capture-complete', callback);
  },
  
  onAutoCaptureStatus: (callback) => {
    ipcRenderer.on('auto-capture-status', (event, status) => callback(status));
    return () => ipcRenderer.removeListener('auto-capture-status', callback);
  },
  
  // Show main window (useful when called from tray)
  showWindow: () => ipcRenderer.send('show-window'),
  
  // Platform detection
  platform: process.platform
});
