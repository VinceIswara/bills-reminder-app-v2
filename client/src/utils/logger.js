// Logger utility to standardize and control logging

const LOG_LEVEL = {
  DEBUG: 0,
  INFO: 1,
  WARN: 2,
  ERROR: 3,
  NONE: 4
};

// Set the minimum log level - can be controlled by environment
const MIN_LOG_LEVEL = process.env.NODE_ENV === 'production' 
  ? LOG_LEVEL.ERROR  // Only show errors in production
  : LOG_LEVEL.INFO;  // Show info and above in development

export const logger = {
  debug: (...args) => {
    if (MIN_LOG_LEVEL <= LOG_LEVEL.DEBUG) {
      console.debug('[DEBUG]', ...args);
    }
  },
  
  info: (...args) => {
    if (MIN_LOG_LEVEL <= LOG_LEVEL.INFO) {
      console.log('[INFO]', ...args);
    }
  },
  
  warn: (...args) => {
    if (MIN_LOG_LEVEL <= LOG_LEVEL.WARN) {
      console.warn('[WARN]', ...args);
    }
  },
  
  error: (...args) => {
    if (MIN_LOG_LEVEL <= LOG_LEVEL.ERROR) {
      console.error('[ERROR]', ...args);
    }
  },
  
  // Group related logs (useful for authentication flows)
  group: (name, fn, collapsed = true) => {
    if (MIN_LOG_LEVEL <= LOG_LEVEL.DEBUG) {
      const method = collapsed ? console.groupCollapsed : console.group;
      method(`[GROUP] ${name}`);
      try {
        fn();
      } finally {
        console.groupEnd();
      }
    }
  }
};

export default logger;
