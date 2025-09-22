// api/src/middleware/security.ts
import { Request, Response, NextFunction } from 'express';
import rateLimit from 'express-rate-limit';
import helmet from 'helmet';
import { CustomError } from '../utils/errorHandler';

// Rate limiting para pagos
export const paymentRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 5, // máximo 5 intentos por IP
  message: {
    success: false,
    error: 'Demasiados intentos de pago. Intenta nuevamente en 15 minutos.'
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// Rate limiting general
export const generalRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 100, // máximo 100 requests por IP
  message: {
    success: false,
    error: 'Demasiadas solicitudes. Intenta nuevamente en 15 minutos.'
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// Validar origen de webhooks
export const validateWebhookOrigin = (req: Request, res: Response, next: NextFunction) => {
  const origin = req.headers.origin as string | undefined;
  const referer = req.headers.referer as string | undefined;
  
  // Lista de orígenes permitidos
  const allowedOrigins: string[] = [
    'https://api.mercadopago.com',
    'https://www.mercadopago.com.ar',
    process.env.FRONTEND_URL
  ].filter((url): url is string => Boolean(url));

  // Para webhooks de Mercado Pago, verificar que venga de su dominio
  if (req.path.includes('/webhook')) {
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
