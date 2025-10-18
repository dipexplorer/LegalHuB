// src/utils/logger.js
// Utility to control console output based on environment

// Store original console methods
const originalConsole = {
  log: console.log,
  warn: console.warn,
  error: console.error,
  info: console.info,
  debug: console.debug,
};

// Determine if we should suppress logs
const shouldSuppressLogs = () => {
  return process.env.NODE_ENV === 'test' && process.env.SUPPRESS_CONSOLE !== 'false';
};

// Conditional console methods
const conditionalConsole = {
  log: (...args) => {
    if (!shouldSuppressLogs()) originalConsole.log(...args);
  },
  warn: (...args) => {
    if (!shouldSuppressLogs()) originalConsole.warn(...args);
  },
  error: (...args) => {
    if (!shouldSuppressLogs()) originalConsole.error(...args);
  },
  info: (...args) => {
    if (!shouldSuppressLogs()) originalConsole.info(...args);
  },
  debug: (...args) => {
    if (!shouldSuppressLogs()) originalConsole.debug(...args);
  },
};

// Replace console methods
if (shouldSuppressLogs()) {
  console.log = conditionalConsole.log;
  console.warn = conditionalConsole.warn;
  console.error = conditionalConsole.error;
  console.info = conditionalConsole.info;
  console.debug = conditionalConsole.debug;
}

// Export both the conditional console and original methods
module.exports = {
  conditionalConsole,
  originalConsole,
  shouldSuppressLogs,
  restoreOriginalConsole: () => {
    console.log = originalConsole.log;
    console.warn = originalConsole.warn;
    console.error = originalConsole.error;
    console.info = originalConsole.info;
    console.debug = originalConsole.debug;
  },
  useConditionalConsole: () => {
    if (shouldSuppressLogs()) {
      console.log = conditionalConsole.log;
      console.warn = conditionalConsole.warn;
      console.error = conditionalConsole.error;
      console.info = conditionalConsole.info;
      console.debug = conditionalConsole.debug;
    }
  }
};
