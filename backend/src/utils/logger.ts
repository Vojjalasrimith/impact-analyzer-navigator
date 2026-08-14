import winston from 'winston';

const baseLogger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.colorize(),
    winston.format.printf(({ timestamp, level, message, label, ...meta }) => {
      const metaStr = Object.keys(meta).length ? ` ${JSON.stringify(meta)}` : '';
      return `${timestamp} [${level}]${label ? ` [${label}]` : ''} ${message}${metaStr}`;
    })
  ),
  transports: [new winston.transports.Console()]
});

export interface ScopedLogger {
  info: (message: string, meta?: Record<string, unknown>) => void;
  warn: (message: string, meta?: Record<string, unknown>) => void;
  error: (message: string, meta?: Record<string, unknown>) => void;
  debug: (message: string, meta?: Record<string, unknown>) => void;
}

/**
 * createLogger('EntityController')('createEntity') -> a scoped logger that prefixes every
 * line with "[EntityController:createEntity]", console-only (no file transport).
 */
export function createLogger(controllerName: string) {
  return function (serviceName: string): ScopedLogger {
    const label = `${controllerName}:${serviceName}`;
    return {
      info: (message, meta) => baseLogger.info(message, { label, ...meta }),
      warn: (message, meta) => baseLogger.warn(message, { label, ...meta }),
      error: (message, meta) => baseLogger.error(message, { label, ...meta }),
      debug: (message, meta) => baseLogger.debug(message, { label, ...meta })
    };
  };
}
