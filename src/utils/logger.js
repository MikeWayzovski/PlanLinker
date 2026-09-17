const LOG_STORAGE_KEY = 'sheethop_logs';
const MAX_LOGS = 1000;

export const Logger = {
  _log: (level, message, data = null) => {
    const timestamp = new Date().toISOString();
    const logEntry = { timestamp, level, message, data };

    if (level === 'ERROR') console.error(`[${timestamp}] ${message}`, data || '');
    else if (level === 'WARN') console.warn(`[${timestamp}] ${message}`, data || '');
    else console.log(`[${timestamp}] [${level}] ${message}`, data || '');

    try {
      const existingLogs = JSON.parse(localStorage.getItem(LOG_STORAGE_KEY) || '[]');
      existingLogs.push(logEntry);
      if (existingLogs.length > MAX_LOGS) existingLogs.shift();
      localStorage.setItem(LOG_STORAGE_KEY, JSON.stringify(existingLogs));
    } catch (error) {
      console.error('Could not persist log entry to localStorage', error);
    }
  },

  info: (message, data) => Logger._log('INFO', message, data),
  warn: (message, data) => Logger._log('WARN', message, data),
  error: (message, data) => Logger._log('ERROR', message, data),
  success: (message, data) => Logger._log('SUCCESS', message, data),

  getLogs: () => {
    try {
      return JSON.parse(localStorage.getItem(LOG_STORAGE_KEY) || '[]');
    } catch {
      return [];
    }
  },

  exportLogs: () => {
    const logs = Logger.getLogs();
    if (logs.length === 0) return false;

    const logText = logs
      .map((l) => `[${l.timestamp}] [${l.level}] ${l.message} ${l.data ? JSON.stringify(l.data) : ''}`)
      .join('\n');
    const blob = new Blob([logText], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);

    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `sheethop-logs-${new Date().toISOString().slice(0, 10)}.txt`;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    URL.revokeObjectURL(url);
    return true;
  },

  clearLogs: () => localStorage.removeItem(LOG_STORAGE_KEY),
};
