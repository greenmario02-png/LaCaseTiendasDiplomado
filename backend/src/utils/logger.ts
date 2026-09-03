/**
 * Logger estructurado con niveles y formato consistente.
 * En producción usa JSON (para agregación); en desarrollo formato legible.
 */
const isProduction = process.env.NODE_ENV === 'production';

type Level = 'info' | 'warn' | 'error' | 'debug';

function log(level: Level, message: string, meta?: unknown) {
  const entry = {
    level,
    message,
    timestamp: new Date().toISOString(),
    ...(meta !== undefined ? { meta } : {}),
  };

  if (isProduction) {
    // JSON para herramientas de observabilidad (ELK, CloudWatch, etc.)
    console[level === 'error' ? 'error' : level === 'warn' ? 'warn' : 'log'](JSON.stringify(entry));
    return;
  }

  const color = {
    info: '\x1b[36m',
    warn: '\x1b[33m',
    error: '\x1b[31m',
    debug: '\x1b[90m',
  }[level];

  const prefix = `${color}[${level.toUpperCase()}]\x1b[0m`;
  console[level === 'error' ? 'error' : 'log'](
    `${prefix} ${new Date().toISOString()} ${message}`,
    meta !== undefined ? (meta as object) : ''
  );
}

export const logger = {
  info: (message: string, meta?: unknown) => log('info', message, meta),
  warn: (message: string, meta?: unknown) => log('warn', message, meta),
  error: (message: string, meta?: unknown) => log('error', message, meta),
  debug: (message: string, meta?: unknown) => log('debug', message, meta),
};
