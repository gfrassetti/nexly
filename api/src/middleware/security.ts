// api/src/middleware/security.ts
import { Request, Response, NextFunction } from 'express';
import rateLimit from 'express-rate-limit';
import helmet from 'helmet';
import { CustomError } from '../utils/errorHandler';

// Rate limiting para pagos
export const paymentRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 10, // máximo 10 intentos por IP (aumentado de 5)
  message: {
    success: false,
    error: 'Demasiados intentos de pago. Intenta nuevamente en 15 minutos.'
  },
  standardHeaders: true,
  legacyHeaders: false,
  // Permitir más intentos si es el mismo usuario
  skip: (req: any) => {
    // En desarrollo, permitir más intentos
    return process.env.NODE_ENV === 'development';
  }
});

// Rate limiting general - más permisivo para uso normal
export const generalRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 1000, // máximo 1000 requests por IP (aumentado de 100)
  message: {
    success: false,
    error: 'Demasiadas solicitudes. Intenta nuevamente en 15 minutos.'
  },
  standardHeaders: true,
  legacyHeaders: false,
  // Permitir más requests si es el mismo usuario autenticado
  skip: (req: any) => {
    // En desarrollo, permitir más requests
    if (process.env.NODE_ENV === 'development') return true;
    
    // Si el usuario está autenticado, permitir más requests
    const token = req.headers.authorization;
    if (token && token.startsWith('Bearer ')) return true;
    
    return false;
  }
});

// Rate limiting específico para suscripciones - menos restrictivo
export const subscriptionRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 200, // máximo 200 requests por IP para suscripciones
  message: {
    success: false,
    error: 'Demasiadas solicitudes de suscripción. Intenta nuevamente en 15 minutos.'
  },
  standardHeaders: true,
  legacyHeaders: false,
  // Permitir más requests si es el mismo usuario autenticado
  skip: (req: any) => {
    // En desarrollo, permitir más requests
    if (process.env.NODE_ENV === 'development') return true;
    
    // Si el usuario está autenticado, permitir más requests
    const token = req.headers.authorization;
    if (token && token.startsWith('Bearer ')) return true;
    
    return false;
  }
});

// Validar origen de webhooks
export const validateWebhookOrigin = (req: Request, res: Response, next: NextFunction) => {
  const origin = req.headers.origin as string | undefined;
  const referer = req.headers.referer as string | undefined;
  
  // Lista de orígenes permitidos
  const allowedOrigins: string[] = [
    'https://api.mercadopago.com',
    'https://www.mercadopago.com.ar',
    'https://graph.facebook.com',
    'https://www.facebook.com',
    'https://api.facebook.com',
    process.env.FRONTEND_URL
  ].filter((url): url is string => Boolean(url));

  // Para webhooks, verificar que venga de un dominio autorizado
  if (req.path.includes('/webhook')) {
    // Permitir requests de verificación de Meta (GET requests sin origin)
    if (req.method === 'GET' && req.query['hub.verify_token']) {
      return next();
    }
    
    const isAuthorized = allowedOrigins.some(allowed => 
      (origin && origin.includes(allowed)) || (referer && referer.includes(allowed))
    );
    
    if (!isAuthorized) {
      throw new CustomError('Origen no autorizado para webhook', 403);
    }
  }

  next();
};

// Sanitizar datos de entrada
export const sanitizePaymentData = (req: Request, res: Response, next: NextFunction) => {
  if (req.body) {
    // Remover campos sensibles que no deberían estar en el body
    delete req.body.password;
    delete req.body.token;
    delete req.body.secret;
    
    // Limitar tamaño de campos
    if (req.body.payer_email && req.body.payer_email.length > 254) {
      req.body.payer_email = req.body.payer_email.substring(0, 254);
    }
    
    if (req.body.reason && req.body.reason.length > 500) {
      req.body.reason = req.body.reason.substring(0, 500);
    }
  }
  
  next();
};

// Validar datos de suscripción
export const validateSubscriptionData = (req: Request, res: Response, next: NextFunction) => {
  const { planType } = req.body;
  
  if (!planType || !['basic', 'premium'].includes(planType)) {
    throw new CustomError('Tipo de plan inválido', 400);
  }
  
  // Validar que no haya campos adicionales sospechosos
  const allowedFields = ['planType'];
  const requestFields = Object.keys(req.body);
  const hasInvalidFields = requestFields.some(field => !allowedFields.includes(field));
  
  if (hasInvalidFields) {
    throw new CustomError('Campos no permitidos en la solicitud', 400);
  }
  
  next();
};

// Configuración de Helmet para seguridad
export const securityHeaders = helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
      connectSrc: ["'self'", "https://api.mercadopago.com"],
      frameSrc: ["'self'", "https://www.mercadopago.com.ar"],
    },
  },
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true
  }
});
