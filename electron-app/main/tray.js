/**
 * System Tray Module
 * Handles system tray / menu bar integration for background operation
 */

const { Tray, Menu, nativeImage, app } = require('electron');
const path = require('path');
const { log } = require('./logger');

let tray = null;

/**
 * Create the system tray icon and menu
 * 
 * @param {BrowserWindow} mainWindow - Reference to the main window
 * @param {Store} store - Electron store instance for settings
 * @returns {Tray} The created tray instance
 */
function createTray(mainWindow, store) {
  // Create tray icon (use template image on macOS for proper menu bar appearance)
  const iconPath = process.platform === 'darwin' 
    ? path.join(__dirname, '../assets/tray-iconTemplate.png')
    : path.join(__dirname, '../assets/tray-icon.png');
  
  // Create a fallback icon if file doesn't exist
  let icon;
  try {
    icon = nativeImage.createFromPath(iconPath);
    if (icon.isEmpty()) {
      // Create a simple default icon
      icon = createDefaultIcon();
    }
  } catch (error) {
    icon = createDefaultIcon();
  }
  
  tray = new Tray(icon);
  
  // Set tooltip
  tray.setToolTip('AI Screen Assistant');
  
  // Build initial context menu
  const contextMenu = buildContextMenu(mainWindow, store, store.get('autoCapture'));
  tray.setContextMenu(contextMenu);
  
  // Double-click to show window (Windows behavior)
  if (process.platform === 'win32') {
    tray.on('double-click', () => {
      if (mainWindow) {
        mainWindow.show();
        mainWindow.focus();
      }
    });
  }
  
  // Single click to show window (macOS behavior)
  if (process.platform === 'darwin') {
    tray.on('click', () => {
      if (mainWindow) {
        mainWindow.show();
        mainWindow.focus();
      }
    });
  }
  
  log('info', 'System tray created');
  
  return tray;
}

/**
 * Build the context menu for the tray
 * 
 * @param {BrowserWindow} mainWindow - Reference to the main window
 * @param {Store} store - Electron store instance
 * @param {boolean} isAutoCaptureEnabled - Current auto-capture status
 * @returns {Menu} The built context menu
 */
function buildContextMenu(mainWindow, store, isAutoCaptureEnabled) {
  return Menu.buildFromTemplate([
    {
      label: 'Show AI Screen Assistant',
      click: () => {
        if (mainWindow) {
          mainWindow.show();
          mainWindow.focus();
        }
      }
    },
    { type: 'separator' },
    {
      label: 'Capture Now',
      click: () => {
        if (mainWindow) {
          mainWindow.webContents.send('trigger-capture');
        }
      }
    },
    {
      label: isAutoCaptureEnabled ? '✓ Auto-Capture Enabled' : 'Auto-Capture Disabled',
      click: () => {
        const newState = !isAutoCaptureEnabled;
        if (mainWindow) {
          mainWindow.webContents.send('toggle-auto-from-tray', newState);
        }
      }
    },
    { type: 'separator' },
    {
      label: 'Settings',
      click: () => {
        if (mainWindow) {
          mainWindow.show();
          mainWindow.focus();
          mainWindow.webContents.send('open-settings');
        }
      }
    },
    { type: 'separator' },
    {
      label: 'Quit',
      click: () => {
        app.isQuitting = true;
        app.quit();
      }
    }
  ]);
}

/**
 * Update the tray menu when auto-capture status changes
 * 
 * @param {Tray} trayInstance - The tray instance to update
 * @param {boolean} isAutoCaptureEnabled - New auto-capture status
 * @param {Store} store - Electron store instance
 */
function updateTrayMenu(trayInstance, isAutoCaptureEnabled, store) {
  if (!trayInstance) return;
  
  // Get mainWindow from the global reference
  const { BrowserWindow } = require('electron');
  const mainWindow = BrowserWindow.getAllWindows()[0];
  
  const contextMenu = buildContextMenu(mainWindow, store, isAutoCaptureEnabled);
  trayInstance.setContextMenu(contextMenu);
  
  // Update tooltip to reflect status
  const status = isAutoCaptureEnabled ? 'Auto-capture ON' : 'Auto-capture OFF';
  trayInstance.setToolTip(`AI Screen Assistant - ${status}`);
}

/**
 * Create a simple default icon programmatically
 * Used as fallback when icon files are missing
 * 
 * @returns {NativeImage} A simple default icon
 */
function createDefaultIcon() {
  // Create a simple 16x16 icon
  const size = 16;
  const canvas = Buffer.alloc(size * size * 4);
  
  // Fill with a simple pattern (purple circle)
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const idx = (y * size + x) * 4;
      const centerX = size / 2;
      const centerY = size / 2;
      const distance = Math.sqrt(Math.pow(x - centerX, 2) + Math.pow(y - centerY, 2));
      
      if (distance <= size / 2 - 1) {
        // Purple color
        canvas[idx] = 138;     // R
        canvas[idx + 1] = 79;  // G
        canvas[idx + 2] = 255; // B
        canvas[idx + 3] = 255; // A
      } else {
        // Transparent
        canvas[idx] = 0;
        canvas[idx + 1] = 0;
        canvas[idx + 2] = 0;
        canvas[idx + 3] = 0;
      }
    }
  }
  
  return nativeImage.createFromBuffer(canvas, { width: size, height: size });
}

/**
 * Destroy the tray icon
 */
function destroyTray() {
  if (tray) {
    tray.destroy();
    tray = null;
  }
}

module.exports = {
  createTray,
  updateTrayMenu,
  destroyTray
};
