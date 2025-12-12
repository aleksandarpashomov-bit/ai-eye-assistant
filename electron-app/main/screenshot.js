/**
 * Screenshot Module
 * Handles cross-platform screen capture functionality
 */

const screenshot = require('screenshot-desktop');
const { log } = require('./logger');

/**
 * Capture the current screen
 * Returns a base64-encoded image string
 * 
 * @returns {Promise<string|null>} Base64 image data or null on failure
 */
async function captureScreen() {
  try {
    log('info', 'Initiating screen capture...');
    
    // Capture all displays (returns array of buffers)
    // For simplicity, we capture the primary display
    const imgBuffer = await screenshot({ format: 'png' });
    
    // Convert buffer to base64
    const base64Image = imgBuffer.toString('base64');
    
    log('info', `Screenshot captured: ${Math.round(imgBuffer.length / 1024)}KB`);
    
    return base64Image;
    
  } catch (error) {
    log('error', `Screenshot capture failed: ${error.message}`);
    
    // Handle specific error cases
    if (error.message.includes('permission')) {
      throw new Error('Screen capture permission denied. Please grant permission in system settings.');
    }
    
    throw error;
  }
}

/**
 * Get list of available displays
 * Useful for multi-monitor setups
 * 
 * @returns {Promise<Array>} Array of display information
 */
async function getDisplays() {
  try {
    const displays = await screenshot.listDisplays();
    log('info', `Found ${displays.length} display(s)`);
    return displays;
  } catch (error) {
    log('error', `Failed to list displays: ${error.message}`);
    return [];
  }
}

/**
 * Capture a specific display by ID
 * 
 * @param {string} displayId - The display ID to capture
 * @returns {Promise<string|null>} Base64 image data or null on failure
 */
async function captureDisplay(displayId) {
  try {
    const imgBuffer = await screenshot({ screen: displayId, format: 'png' });
    return imgBuffer.toString('base64');
  } catch (error) {
    log('error', `Failed to capture display ${displayId}: ${error.message}`);
    throw error;
  }
}

module.exports = {
  captureScreen,
  getDisplays,
  captureDisplay
};
