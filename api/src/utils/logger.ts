import winston from 'winston';
import path from 'path';
import fs from 'fs';

// Crear directorio de logs solo en producción
const logsDir = path.join(process.cwd(), 'logs');
if (process.env.NODE_ENV === 'production' && !fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true });
}

// Niveles personalizados de logging
const customLevels = {
  levels: {
    debug: 0,
    http: 1,
    info: 2,
    warning: 3,
    error: 4,
    fatal: 5
  },
  colors: {
    debug: 'blue',
    http: 'cyan',
    info: 'green',
    warning: 'yellow',
    error: 'red',
    fatal: 'magenta'
  }
};

// Agregar colores a winston
winston.addColors(customLevels.colors);

// Formato para desarrollo (consola con colores)
const developmentFormat = winston.format.combine(
  winston.format.colorize({ all: true }),
  winston.format.timestamp({
    format: 'YYYY-MM-DD HH:mm:ss'
  }),
  winston.format.printf(({ timestamp, level, message, ...meta }) => {
    let log = `${timestamp} [${level}]: ${message}`;
    
    if (meta.userId) log += ` | User: ${meta.userId}`;
    if (meta.action) log += ` | Action: ${meta.action}`;
    if (meta.endpoint) log += ` | Endpoint: ${meta.endpoint}`;
    if (meta.method) log += ` | Method: ${meta.method}`;
    if (meta.provider) log += ` | Provider: ${meta.provider}`;
    if (meta.error) log += ` | Error: ${meta.error}`;
    if (meta.statusCode) log += ` | Status: ${meta.statusCode}`;
    
    return log;
  })
);

// Formato para producción (JSON con stack trace)
const productionFormat = winston.format.combine(
  winston.format.timestamp({
    format: 'YYYY-MM-DD HH:mm:ss'
  }),
  winston.format.errors({ stack: true }),
  winston.format.json()
);

// Logger para desarrollo (solo consola)
const createDevelopmentLogger = () => {
  return winston.createLogger({
    levels: customLevels.levels,
    level: 'info', // Solo info y superior en desarrollo
    format: developmentFormat,
    defaultMeta: { 
      service: 'nexly-api',
      environment: 'development',
      version: process.env.npm_package_version || '1.0.0'
    },
    transports: [
      new winston.transports.Console({
        silent: process.env.NODE_ENV === 'test'
      })
    ]
  });
};

// Logger para producción (archivos)
const createProductionLogger = () => {
  return winston.createLogger({
    levels: customLevels.levels,
    level: 'info', // Desde info en producción
    format: productionFormat,
    defaultMeta: { 
      service: 'nexly-api',
      environment: 'production',
      version: process.env.npm_package_version || '1.0.0'
    },
    transports: [
      new winston.transports.File({
        filename: path.join(logsDir, 'errors.log'),
        level: 'error',
        maxsize: 10 * 1024 * 1024, // 10MB
        maxFiles: 5
      })
    ],
    exceptionHandlers: [
      new winston.transports.File({
        filename: path.join(logsDir, 'exceptions.log'),
        format: productionFormat
      })
    ],
    rejectionHandlers: [
      new winston.transports.File({
        filename: path.join(logsDir, 'rejections.log'),
        format: productionFormat
      })
    ]
  });
};

// Crear logger según el entorno
const logger = process.env.NODE_ENV === 'production' 
  ? createProductionLogger() 
  : createDevelopmentLogger();

// Funciones específicas de logging optimizadas

export const logIntegrationActivity = (action: string, userId: string, details?: any) => {
  logger.info(`Integration: ${action}`, {
    userId,
    action,
    provider: details?.provider || 'unknown',
    endpoint: details?.endpoint || 'unknown',
    method: details?.method || 'unknown',
    timestamp: new Date().toISOString(),
    ...details
  });
};

export const logIntegrationSuccess = (action: string, userId: string, details?: any) => {
  logger.info(`Integration Success: ${action}`, {
    userId,
    action,
    status: 'success',
    provider: details?.provider || 'unknown',
    endpoint: details?.endpoint || 'unknown',
    method: details?.method || 'unknown',
    timestamp: new Date().toISOString(),
    ...details
  });
};

export const logIntegrationError = (error: Error, userId: string, action: string, details?: any) => {
  logger.error(`Integration Error: ${action}`, {
    userId,
    action,
    error: error.message,
    stack: error.stack,
    provider: details?.provider || 'unknown',
    endpoint: details?.endpoint || 'unknown',
    method: details?.method || 'unknown',
    timestamp: new Date().toISOString(),
    ...details
  });
};

export const logAuthActivity = (action: string, userId?: string, details?: any) => {
  logger.info(`Auth: ${action}`, {
    userId: userId || 'unknown',
    action,
    ...details
  });
};

export const logAuthError = (error: Error, action: string, userId?: string, details?: any) => {
  logger.error(`Auth Error: ${action}`, {
    userId: userId || 'unknown',
    action,
    error: error.message,
    stack: error.stack,
    ...details
  });
};

export const logDatabase = (operation: string, collection: string, details?: any) => {
  // Solo log en producción para evitar spam en desarrollo
  if (process.env.NODE_ENV === 'production') {
    logger.debug(`Database: ${operation} on ${collection}`, {
      operation,
      collection,
      ...details
    });
  }
};

export const logExternalService = (service: string, operation: string, details?: any) => {
  logger.info(`External Service: ${service} - ${operation}`, {
    service,
    operation,
    ...details
  });
};

// Función para logging de requests HTTP (optimizada para desarrollo)
export const logRequest = (req: any, res: any, responseTime: number) => {
  // En desarrollo, solo log errores y requests importantes
  if (process.env.NODE_ENV === 'development') {
    if (res.statusCode >= 400 || req.path.includes('/integrations') || req.path.includes('/auth')) {
      logger.http(`${req.method} ${req.path}`, {
        statusCode: res.statusCode,
        responseTime: `${responseTime}ms`,
        userId: req.user?.id || req.user?._id || 'anonymous',
        userAgent: req.get('User-Agent'),
        ip: req.ip || req.connection.remoteAddress
      });
    }
  } else {
    // En producción, log todos los requests
    logger.http(`${req.method} ${req.path}`, {
      statusCode: res.statusCode,
      responseTime: `${responseTime}ms`,
      userId: req.user?.id || req.user?._id || 'anonymous',
      userAgent: req.get('User-Agent'),
      ip: req.ip || req.connection.remoteAddress,
      timestamp: new Date().toISOString()
    });
  }
};

export default logger;
