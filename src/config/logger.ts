// /Users/diegocrisafulli/Documents/repo/cart498final/src/config/logger.ts
import winston, { Logform } from 'winston'; // Import Logform for type info
import { env } from './env'; // Assuming env configures LOG_LEVEL

const { combine, timestamp, printf, colorize, align } = winston.format;

// Define type for log info object used by the format function
interface LogInfo extends Logform.TransformableInfo {
  timestamp?: string; // Make timestamp optional
  // Add other properties if necessary
}

const logFormat = printf(({ level, message, timestamp: ts, ...metadata }: LogInfo) => {
  let msg = `${ts} [${level}]: ${message}`;
  if (Object.keys(metadata).length > 0) {
    // Only include metadata if it exists and is not empty
    const metaString = JSON.stringify(metadata, null, 2);
    if (metaString !== '{}') {
       msg += ` ${metaString}`;
    }
  }
  return msg;
});

const logger = winston.createLogger({
  level: env.LOG_LEVEL || 'info', // Default to 'info' if not set in env
  format: combine(
    colorize(),
    timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    align(),
    logFormat
  ),
  transports: [
    new winston.transports.Console(),
    // Optionally add file transports
    // new winston.transports.File({ filename: 'error.log', level: 'error' }),
    // new winston.transports.File({ filename: 'combined.log' }),
  ],
  exceptionHandlers: [
    new winston.transports.Console(),
    // new winston.transports.File({ filename: 'exceptions.log' })
  ],
  rejectionHandlers: [
    new winston.transports.Console(),
    // new winston.transports.File({ filename: 'rejections.log' })
  ]
});

export default logger;
