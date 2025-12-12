/**
 * Main Process Entry Point
 * Handles application lifecycle, window management, and IPC communication
 */

const { app, BrowserWindow, ipcMain, systemPreferences, dialog } = require('electron');
const path = require('path');
const Store = require('electron-store');

// Import custom modules
const { createTray, updateTrayMenu } = require('./tray');
const { captureScreen } = require('./screenshot');
const { analyzeImage, setApiKey } = require('./api');
const { initLogger, log } = require('./logger');

// Initialize persistent storage
const store = new Store({
  defaults: {
    captureInterval: 10000,        // 10 seconds default
    autoCapture: false,            // Auto-capture disabled by default
    openaiApiKey: '',              // User's OpenAI API key
    minimizeToTray: true,          // Minimize to tray instead of closing
    showNotifications: true        // Show system notifications
  }
});

// Global references
let mainWindow = null;
let tray = null;
let captureIntervalId = null;
let isCapturing = false;

/**
 * Request screen capture permission on macOS
 * Windows handles this differently through system dialogs
 */
async function requestScreenCapturePermission() {
  if (process.platform === 'darwin') {
    // Check if we have screen capture permission
    const hasPermission = systemPreferences.getMediaAccessStatus('screen');
    
    if (hasPermission !== 'granted') {
      // On macOS, we need to trigger the permission dialog
      // This is done by attempting a capture
      const result = await dialog.showMessageBox(mainWindow, {
        type: 'info',
        title: 'Screen Capture Permission Required',
        message: 'This app needs permission to capture your screen.',
        detail: 'Please grant Screen Recording permission in System Preferences > Security & Privacy > Privacy > Screen Recording.\n\nAfter granting permission, you may need to restart the app.',
        buttons: ['Open System Preferences', 'Later']
      });

      if (result.response === 0) {
        // Open System Preferences to the Screen Recording pane
        require('child_process').exec('open x-apple.systempreferences:com.apple.preference.security?Privacy_ScreenCapture');
      }
      
      return false;
    }
    return true;
  }
  
  // Windows doesn't require explicit permission for screen capture
  return true;
}

/**
 * Create the main application window
 */
function createWindow() {
  mainWindow = new BrowserWindow({
    width: 900,
    height: 700,
    minWidth: 600,
    minHeight: 500,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false
    },
    icon: path.join(__dirname, '../assets/icon.png'),
    show: false,  // Don't show until ready
    titleBarStyle: process.platform === 'darwin' ? 'hiddenInset' : 'default'
  });

  // Load the renderer HTML
  mainWindow.loadFile(path.join(__dirname, '../renderer/index.html'));

  // Show window when ready
  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
  });

  // Handle window close - minimize to tray if enabled
  mainWindow.on('close', (event) => {
    if (store.get('minimizeToTray') && !app.isQuitting) {
      event.preventDefault();
      mainWindow.hide();
      return false;
    }
  });

  // Clean up on window close
  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

/**
 * Start automatic screenshot capture
 */
function startAutoCapture() {
  if (captureIntervalId) {
    clearInterval(captureIntervalId);
  }

  const interval = store.get('captureInterval');
  log('info', `Starting auto-capture with interval: ${interval}ms`);

  captureIntervalId = setInterval(async () => {
    if (!isCapturing) {
      await performCapture();
    }
  }, interval);

  store.set('autoCapture', true);
  updateTrayMenu(tray, true, store);
  
  if (mainWindow) {
    mainWindow.webContents.send('auto-capture-status', true);
  }
}

/**
 * Stop automatic screenshot capture
 */
function stopAutoCapture() {
  if (captureIntervalId) {
    clearInterval(captureIntervalId);
    captureIntervalId = null;
  }

  log('info', 'Stopped auto-capture');
  store.set('autoCapture', false);
  updateTrayMenu(tray, false, store);
  
  if (mainWindow) {
    mainWindow.webContents.send('auto-capture-status', false);
  }
}

/**
 * Perform a single screenshot capture and analysis
 */
async function performCapture() {
  if (isCapturing) return;
  
  isCapturing = true;
  log('info', 'Performing screen capture...');

  try {
    // Notify renderer that capture is starting
    if (mainWindow) {
      mainWindow.webContents.send('capture-started');
    }

    // Capture the screen
    const screenshot = await captureScreen();
    
    if (!screenshot) {
      throw new Error('Failed to capture screenshot');
    }

    log('info', 'Screenshot captured successfully');

    // Check if API key is configured
    const apiKey = store.get('openaiApiKey');
    if (!apiKey) {
      throw new Error('OpenAI API key not configured. Please add your API key in Settings.');
    }

    // Set the API key for the request
    setApiKey(apiKey);

    // Send to AI for analysis
    if (mainWindow) {
      mainWindow.webContents.send('analyzing');
    }

    const analysis = await analyzeImage(screenshot);
    
    log('info', 'Analysis complete');

    // Send results to renderer
    if (mainWindow) {
      mainWindow.webContents.send('capture-complete', {
        success: true,
        analysis: analysis,
        timestamp: new Date().toISOString()
      });
    }

    // Show notification if enabled
    if (store.get('showNotifications')) {
      const { Notification } = require('electron');
      new Notification({
        title: 'AI Analysis Complete',
        body: analysis.substring(0, 100) + (analysis.length > 100 ? '...' : '')
      }).show();
    }

  } catch (error) {
    log('error', `Capture/analysis error: ${error.message}`);
    
    if (mainWindow) {
      mainWindow.webContents.send('capture-complete', {
        success: false,
        error: error.message
      });
    }
  } finally {
    isCapturing = false;
  }
}

/**
 * Set up IPC handlers for renderer communication
 */
function setupIPC() {
  // Handle immediate capture request ("Help me now" button)
  ipcMain.handle('capture-now', async () => {
    const hasPermission = await requestScreenCapturePermission();
    if (hasPermission) {
      await performCapture();
    }
    return hasPermission;
  });

  // Toggle auto-capture
  ipcMain.handle('toggle-auto-capture', async (event, enabled) => {
    const hasPermission = await requestScreenCapturePermission();
    if (!hasPermission) return false;

    if (enabled) {
      startAutoCapture();
    } else {
      stopAutoCapture();
    }
    return enabled;
  });

  // Get current settings
  ipcMain.handle('get-settings', () => {
    return {
      captureInterval: store.get('captureInterval'),
      autoCapture: store.get('autoCapture'),
      openaiApiKey: store.get('openaiApiKey'),
      minimizeToTray: store.get('minimizeToTray'),
      showNotifications: store.get('showNotifications')
    };
  });

  // Update settings
  ipcMain.handle('update-settings', (event, settings) => {
    if (settings.captureInterval !== undefined) {
      store.set('captureInterval', settings.captureInterval);
      // Restart auto-capture if active
      if (store.get('autoCapture')) {
        startAutoCapture();
      }
    }
    if (settings.openaiApiKey !== undefined) {
      store.set('openaiApiKey', settings.openaiApiKey);
    }
    if (settings.minimizeToTray !== undefined) {
      store.set('minimizeToTray', settings.minimizeToTray);
    }
    if (settings.showNotifications !== undefined) {
      store.set('showNotifications', settings.showNotifications);
    }
    
    log('info', 'Settings updated');
    return true;
  });

  // Check screen capture permission
  ipcMain.handle('check-permission', async () => {
    if (process.platform === 'darwin') {
      return systemPreferences.getMediaAccessStatus('screen') === 'granted';
    }
    return true;
  });

  // Show main window (from tray)
  ipcMain.on('show-window', () => {
    if (mainWindow) {
      mainWindow.show();
      mainWindow.focus();
    }
  });
}

/**
 * Application initialization
 */
app.whenReady().then(async () => {
  // Initialize logger
  initLogger();
  log('info', 'Application starting...');

  // Create main window
  createWindow();

  // Create system tray
  tray = createTray(mainWindow, store);

  // Set up IPC communication
  setupIPC();

  // Restore auto-capture if it was enabled
  if (store.get('autoCapture')) {
    const hasPermission = await requestScreenCapturePermission();
    if (hasPermission) {
      startAutoCapture();
    }
  }

  // macOS: Re-create window when dock icon is clicked
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    } else if (mainWindow) {
      mainWindow.show();
    }
  });
});

// Quit when all windows are closed (except on macOS)
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

// Clean up before quitting
app.on('before-quit', () => {
  app.isQuitting = true;
  stopAutoCapture();
  log('info', 'Application shutting down');
});

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  log('error', `Uncaught exception: ${error.message}`);
});
