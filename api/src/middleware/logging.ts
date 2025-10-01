import { Request, Response, NextFunction } from 'express';
import logger, { logRequest } from '../utils/logger';

// Tipo extendido para requests con usuario autenticado
type AuthRequest = Request & { user?: { id?: string; _id?: string } };

/**
 * Middleware para logging general de requests HTTP
 */
export function requestLogging(req: Request, res: Response, next: NextFunction) {
  const startTime = Date.now();
  
  // Interceptar cuando se envía la respuesta
  res.on('finish', () => {
    const responseTime = Date.now() - startTime;
    logRequest(req, res, responseTime);
  });
  
  next();
}

/**
 * Middleware específico para logging de requests de integrations
 */
export function integrationLogging(req: AuthRequest, res: Response, next: NextFunction) {
  const startTime = Date.now();
  const originalSend = res.send;

  // Interceptar la respuesta
  res.send = function(data) {
    const responseTime = Date.now() - startTime;
    
    // Log específico para requests de integrations
    if (req.path.includes('/integrations')) {
      logger.info('Integration Request', {
        method: req.method,
        path: req.path,
        statusCode: res.statusCode,
        responseTime: `${responseTime}ms`,
        userId: req.user?.id || req.user?._id || 'anonymous',
        userAgent: req.get('User-Agent'),
        ip: req.ip || req.connection.remoteAddress,
        timestamp: new Date().toISOString()
      });
    }
    
    return originalSend.call(this, data);
  };
  
  next();
}

/**
 * Middleware para logging de errores
 */
export function errorLogging(error: Error, req: AuthRequest, res: Response, next: NextFunction) {
  logger.error('Request Error', {
    error: error.message,
    stack: error.stack,
    method: req.method,
    url: req.url,
    userId: req.user?.id || req.user?._id || 'anonymous',
    ip: req.ip || req.connection.remoteAddress,
    userAgent: req.get('User-Agent'),
    timestamp: new Date().toISOString()
  });
  
  next(error);
}
