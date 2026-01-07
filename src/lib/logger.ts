/**
 * Simple debug logger that only logs when DEBUG=true environment variable is set.
 * Use this instead of console.log for debug statements that shouldn't appear in production.
 */

const isDebugEnabled = process.env.DEBUG === 'true';

/**
 * Debug logger - only outputs when DEBUG=true
 */
export const debug = {
  log: (...args: unknown[]) => {
    if (isDebugEnabled) {
      console.log(...args);
    }
  },
  error: (...args: unknown[]) => {
    if (isDebugEnabled) {
      console.error(...args);
    }
  },
  warn: (...args: unknown[]) => {
    if (isDebugEnabled) {
      console.warn(...args);
    }
  },
};
