/**
 * Renderer Process JavaScript
 * Handles UI interactions and communicates with main process via IPC
 */

// DOM Elements
const elements = {
  captureBtn: document.getElementById('capture-btn'),
  autoCaptureToggle: document.getElementById('auto-capture-toggle'),
  intervalDisplay: document.getElementById('interval-display'),
  statusIndicator: document.getElementById('status-indicator'),
  statusDot: document.querySelector('.status-dot'),
  statusText: document.querySelector('.status-text'),
  permissionStatus: document.getElementById('permission-status'),
  permissionText: document.querySelector('.permission-text'),
  resultsContent: document.getElementById('results-content'),
  lastCaptureTime: document.getElementById('last-capture-time'),
  historyPanel: document.getElementById('history-panel'),
  historyToggle: document.getElementById('history-toggle'),
  historyContent: document.getElementById('history-content'),
  settingsBtn: document.getElementById('settings-btn'),
  settingsModal: document.getElementById('settings-modal'),
  closeSettings: document.getElementById('close-settings'),
  cancelSettings: document.getElementById('cancel-settings'),
  saveSettings: document.getElementById('save-settings'),
  apiKeyInput: document.getElementById('api-key'),
  toggleApiKey: document.getElementById('toggle-api-key'),
  captureInterval: document.getElementById('capture-interval'),
  intervalValue: document.getElementById('interval-value'),
  notificationsToggle: document.getElementById('notifications-toggle'),
  minimizeTrayToggle: document.getElementById('minimize-tray-toggle'),
  loadingOverlay: document.getElementById('loading-overlay'),
  loadingText: document.getElementById('loading-text'),
  toastContainer: document.getElementById('toast-container')
};

// Application state
let state = {
  isAutoCaptureEnabled: false,
  captureInterval: 10000,
  analysisHistory: [],
  settings: {}
};

/**
 * Initialize the application
 */
async function init() {
  // Load settings from main process
  await loadSettings();
  
  // Check screen capture permission
  await checkPermission();
  
  // Set up event listeners
  setupEventListeners();
  
  // Set up IPC listeners
  setupIPCListeners();
  
  // Load history from localStorage
  loadHistory();
  
  console.log('App initialized');
}

/**
 * Load settings from main process
 */
async function loadSettings() {
  try {
    state.settings = await window.electronAPI.getSettings();
    
    // Update UI with current settings
    elements.autoCaptureToggle.checked = state.settings.autoCapture;
    state.isAutoCaptureEnabled = state.settings.autoCapture;
    state.captureInterval = state.settings.captureInterval;
    
    updateIntervalDisplay();
    updateAutoCapturStatus();
    
    // Update settings modal inputs
    elements.apiKeyInput.value = state.settings.openaiApiKey || '';
    elements.captureInterval.value = state.settings.captureInterval / 1000;
    elements.intervalValue.textContent = `${state.settings.captureInterval / 1000} seconds`;
    elements.notificationsToggle.checked = state.settings.showNotifications;
    elements.minimizeTrayToggle.checked = state.settings.minimizeToTray;
    
  } catch (error) {
    console.error('Failed to load settings:', error);
    showToast('Failed to load settings', 'error');
  }
}

/**
 * Check screen capture permission
 */
async function checkPermission() {
  try {
    const hasPermission = await window.electronAPI.checkPermission();
    
    const permissionIcon = elements.permissionStatus.querySelector('.permission-icon');
    const permissionText = elements.permissionStatus.querySelector('.permission-text');
    
    if (hasPermission) {
      elements.permissionStatus.classList.add('granted');
      elements.permissionStatus.classList.remove('denied');
      permissionIcon.textContent = '✓';
      permissionText.textContent = 'Screen capture enabled';
    } else {
      elements.permissionStatus.classList.add('denied');
      elements.permissionStatus.classList.remove('granted');
      permissionIcon.textContent = '⚠';
      permissionText.textContent = 'Screen capture permission required';
    }
  } catch (error) {
    console.error('Permission check failed:', error);
  }
}

/**
 * Set up event listeners for UI interactions
 */
function setupEventListeners() {
  // Capture Now button
  elements.captureBtn.addEventListener('click', handleCaptureNow);
  
  // Auto-capture toggle
  elements.autoCaptureToggle.addEventListener('change', handleAutoCaptureToggle);
  
  // History panel toggle
  elements.historyToggle.addEventListener('click', () => {
    elements.historyPanel.classList.toggle('expanded');
  });
  
  // Settings modal
  elements.settingsBtn.addEventListener('click', openSettings);
  elements.closeSettings.addEventListener('click', closeSettings);
  elements.cancelSettings.addEventListener('click', closeSettings);
  elements.saveSettings.addEventListener('click', saveSettings);
  
  // Close modal on backdrop click
  elements.settingsModal.querySelector('.modal-backdrop').addEventListener('click', closeSettings);
  
  // API key visibility toggle
  elements.toggleApiKey.addEventListener('click', () => {
    const input = elements.apiKeyInput;
    input.type = input.type === 'password' ? 'text' : 'password';
  });
  
  // Capture interval slider
  elements.captureInterval.addEventListener('input', (e) => {
    elements.intervalValue.textContent = `${e.target.value} seconds`;
  });
  
  // Keyboard shortcuts
  document.addEventListener('keydown', (e) => {
    // Escape to close modal
    if (e.key === 'Escape' && elements.settingsModal.classList.contains('open')) {
      closeSettings();
    }
    // Ctrl/Cmd + Shift + C for instant capture
    if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'C') {
      handleCaptureNow();
    }
  });
}

/**
 * Set up IPC event listeners from main process
 */
function setupIPCListeners() {
  // Capture started
  window.electronAPI.onCaptureStarted(() => {
    showLoading('Capturing screen...');
    setStatus('capturing', 'Capturing...');
  });
  
  // Analyzing
  window.electronAPI.onAnalyzing(() => {
    setLoadingText('Analyzing with AI...');
  });
  
  // Capture complete
  window.electronAPI.onCaptureComplete((data) => {
    hideLoading();
    
    if (data.success) {
      setStatus('ready', 'Ready');
      displayAnalysis(data.analysis, data.timestamp);
      addToHistory(data.analysis, data.timestamp);
      showToast('Analysis complete', 'success');
    } else {
      setStatus('error', 'Error');
      displayError(data.error);
      showToast(data.error, 'error');
    }
  });
  
  // Auto-capture status changed
  window.electronAPI.onAutoCaptureStatus((enabled) => {
    state.isAutoCaptureEnabled = enabled;
    elements.autoCaptureToggle.checked = enabled;
    updateAutoCapturStatus();
  });
}

/**
 * Handle "Capture Now" button click
 */
async function handleCaptureNow() {
  elements.captureBtn.disabled = true;
  
  try {
    await window.electronAPI.captureNow();
  } catch (error) {
    hideLoading();
    showToast('Capture failed: ' + error.message, 'error');
  } finally {
    elements.captureBtn.disabled = false;
  }
}

/**
 * Handle auto-capture toggle
 */
async function handleAutoCaptureToggle(e) {
  const enabled = e.target.checked;
  
  try {
    const result = await window.electronAPI.toggleAutoCapture(enabled);
    state.isAutoCaptureEnabled = result;
    e.target.checked = result;
    updateAutoCapturStatus();
    
    if (result) {
      showToast('Auto-capture enabled', 'success');
    } else {
      showToast('Auto-capture disabled', 'warning');
    }
  } catch (error) {
    e.target.checked = !enabled;
    showToast('Failed to toggle auto-capture', 'error');
  }
}

/**
 * Update auto-capture status in UI
 */
function updateAutoCapturStatus() {
  if (state.isAutoCaptureEnabled) {
    elements.captureBtn.classList.add('auto-active');
  } else {
    elements.captureBtn.classList.remove('auto-active');
  }
}

/**
 * Update interval display
 */
function updateIntervalDisplay() {
  const seconds = state.captureInterval / 1000;
  elements.intervalDisplay.textContent = `Every ${seconds}s`;
}

/**
 * Set status indicator
 */
function setStatus(status, text) {
  elements.statusDot.className = 'status-dot';
  if (status !== 'ready') {
    elements.statusDot.classList.add(status);
  }
  elements.statusText.textContent = text;
}

/**
 * Display analysis result
 */
function displayAnalysis(analysis, timestamp) {
  elements.resultsContent.innerHTML = `
    <div class="analysis-text">${escapeHtml(analysis)}</div>
  `;
  
  elements.lastCaptureTime.textContent = formatTime(timestamp);
}

/**
 * Display error message
 */
function displayError(error) {
  elements.resultsContent.innerHTML = `
    <div class="error-message">
      <strong>Error:</strong> ${escapeHtml(error)}
    </div>
  `;
}

/**
 * Add analysis to history
 */
function addToHistory(analysis, timestamp) {
  state.analysisHistory.unshift({
    analysis,
    timestamp
  });
  
  // Keep only last 10 items
  if (state.analysisHistory.length > 10) {
    state.analysisHistory.pop();
  }
  
  // Save to localStorage
  localStorage.setItem('analysisHistory', JSON.stringify(state.analysisHistory));
  
  // Update history UI
  renderHistory();
}

/**
 * Load history from localStorage
 */
function loadHistory() {
  try {
    const saved = localStorage.getItem('analysisHistory');
    if (saved) {
      state.analysisHistory = JSON.parse(saved);
      renderHistory();
    }
  } catch (error) {
    console.error('Failed to load history:', error);
  }
}

/**
 * Render history items
 */
function renderHistory() {
  if (state.analysisHistory.length === 0) {
    elements.historyContent.innerHTML = '<p class="no-history">No recent analyses</p>';
    return;
  }
  
  elements.historyContent.innerHTML = state.analysisHistory.map((item, index) => `
    <div class="history-item" data-index="${index}">
      <div class="history-item-time">${formatTime(item.timestamp)}</div>
      <div class="history-item-preview">${escapeHtml(item.analysis.substring(0, 100))}...</div>
    </div>
  `).join('');
  
  // Add click handlers
  elements.historyContent.querySelectorAll('.history-item').forEach(item => {
    item.addEventListener('click', () => {
      const index = parseInt(item.dataset.index);
      const historyItem = state.analysisHistory[index];
      displayAnalysis(historyItem.analysis, historyItem.timestamp);
    });
  });
}

/**
 * Open settings modal
 */
function openSettings() {
  elements.settingsModal.classList.add('open');
}

/**
 * Close settings modal
 */
function closeSettings() {
  elements.settingsModal.classList.remove('open');
}

/**
 * Save settings
 */
async function saveSettings() {
  const newSettings = {
    openaiApiKey: elements.apiKeyInput.value,
    captureInterval: parseInt(elements.captureInterval.value) * 1000,
    showNotifications: elements.notificationsToggle.checked,
    minimizeToTray: elements.minimizeTrayToggle.checked
  };
  
  try {
    await window.electronAPI.updateSettings(newSettings);
    state.settings = { ...state.settings, ...newSettings };
    state.captureInterval = newSettings.captureInterval;
    updateIntervalDisplay();
    closeSettings();
    showToast('Settings saved', 'success');
  } catch (error) {
    showToast('Failed to save settings', 'error');
  }
}

/**
 * Show loading overlay
 */
function showLoading(text) {
  elements.loadingText.textContent = text;
  elements.loadingOverlay.classList.add('visible');
}

/**
 * Hide loading overlay
 */
function hideLoading() {
  elements.loadingOverlay.classList.remove('visible');
}

/**
 * Set loading text
 */
function setLoadingText(text) {
  elements.loadingText.textContent = text;
}

/**
 * Show toast notification
 */
function showToast(message, type = 'success') {
  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  toast.innerHTML = `<span class="toast-message">${escapeHtml(message)}</span>`;
  
  elements.toastContainer.appendChild(toast);
  
  // Auto-remove after 4 seconds
  setTimeout(() => {
    toast.style.animation = 'slideIn 0.3s ease reverse';
    setTimeout(() => toast.remove(), 300);
  }, 4000);
}

/**
 * Format timestamp
 */
function formatTime(timestamp) {
  const date = new Date(timestamp);
  return date.toLocaleTimeString(undefined, {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  });
}

/**
 * Escape HTML to prevent XSS
 */
function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', init);
