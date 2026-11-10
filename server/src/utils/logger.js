import { env } from '../config/env.js';

function formatLog(level, message, meta) {
  const timestamp = new Date().toISOString();
  const entry = {
    timestamp,
    level,
    message,
    ...(meta ? { meta } : {}),
  };
  return JSON.stringify(entry);
}

export const logger = {
  info: (message, meta) => {
    console.log(formatLog('info', message, meta));
  },
  warn: (message, meta) => {
    console.warn(formatLog('warn', message, meta));
  },
  error: (message, meta) => {
    console.error(formatLog('error', message, meta));
  },
  debug: (message, meta) => {
    if (env.NODE_ENV !== 'production') {
      console.debug(formatLog('debug', message, meta));
    }
  },
};

