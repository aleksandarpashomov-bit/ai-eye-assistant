/**
 * Logger Module
 * Centralized logging with file and console output
 */

const winston = require('winston');
const path = require('path');
const { app } = require('electron');

let logger = null;

/**
 * Initialize the logging system
 * Creates log files in the user data directory
 */
function initLogger() {
  // Get user data path for log storage
  const logDir = path.join(app.getPath('userData'), 'logs');
  
  // Create logger with multiple transports
  logger = winston.createLogger({
    level: 'info',
    format: winston.format.combine(
      winston.format.timestamp({
        format: 'YYYY-MM-DD HH:mm:ss'
      }),
      winston.format.errors({ stack: true }),
      winston.format.printf(({ level, message, timestamp, stack }) => {
        return `${timestamp} [${level.toUpperCase()}]: ${stack || message}`;
      })
    ),
    transports: [
      // Console output (for development)
      new winston.transports.Console({
        format: winston.format.combine(
          winston.format.colorize(),
          winston.format.printf(({ level, message, timestamp }) => {
            return `${timestamp} [${level}]: ${message}`;
          })
        )
      }),
      // File output - all logs
      new winston.transports.File({
        filename: path.join(logDir, 'app.log'),
        maxsize: 5242880, // 5MB
        maxFiles: 3,
        tailable: true
      }),
      // File output - errors only
      new winston.transports.File({
        filename: path.join(logDir, 'error.log'),
        level: 'error',
        maxsize: 5242880,
        maxFiles: 3,
        tailable: true
      })
    ]
  });

  log('info', 'Logger initialized');
}

/**
 * Log a message
 * 
 * @param {string} level - Log level (info, warn, error, debug)
 * @param {string} message - Message to log
 */
function log(level, message) {
  if (logger) {
    logger.log(level, message);
  } else {
    // Fallback to console if logger not initialized
    console.log(`[${level.toUpperCase()}]: ${message}`);
  }
}

/**
 * Log an info message
 * @param {string} message - Message to log
 */
function info(message) {
  log('info', message);
}

/**
 * Log a warning message
 * @param {string} message - Message to log
 */
function warn(message) {
  log('warn', message);
}

/**
 * Log an error message
 * @param {string} message - Message to log
 */
function error(message) {
  log('error', message);
}

/**
 * Log a debug message
 * @param {string} message - Message to log
 */
function debug(message) {
  log('debug', message);
}

module.exports = {
  initLogger,
  log,
  info,
  warn,
  error,
  debug
};
