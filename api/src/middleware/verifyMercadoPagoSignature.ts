import crypto from "crypto";
import { Request } from "express";

/**
 * Verificar la firma de webhooks de MercadoPago
 * MercadoPago envía un header X-Signature con la firma HMAC-SHA256
 */
export function verifyMercadoPagoSignature(req: Request): boolean {
  const signature = req.headers['x-signature'] as string;
  const webhookSecret = process.env.MERCADOPAGO_WEBHOOK_SECRET;
  
  if (!signature || !webhookSecret) {
    console.warn('Missing MercadoPago signature or webhook secret');
    return false;
  }

  try {
    // Obtener el raw body (debe ser configurado en el middleware de parsing)
    const rawBody: Buffer | undefined = (req as any).rawBody;
    if (!rawBody || !(rawBody instanceof Buffer)) {
      console.warn('Missing raw body for MercadoPago signature verification');
      return false;
    }

    // MercadoPago envía la firma en formato: "ts=timestamp,v1=signature"
    const signatureParts = signature.split(',');
    let timestamp = '';
    let receivedSignature = '';

    for (const part of signatureParts) {
      const [key, value] = part.split('=');
      if (key === 'ts') {
        timestamp = value;
      } else if (key === 'v1') {
        receivedSignature = value;
      }
    }

    if (!timestamp || !receivedSignature) {
      console.warn('Invalid MercadoPago signature format');
      return false;
    }

    // Verificar que el timestamp no sea muy antiguo (máximo 5 minutos)
    const currentTime = Math.floor(Date.now() / 1000);
    const signatureTime = parseInt(timestamp);
    
    if (Math.abs(currentTime - signatureTime) > 300) { // 5 minutos
      console.warn('MercadoPago signature timestamp too old');
      return false;
    }

    // Crear la firma esperada
    const payload = `${timestamp}.${rawBody.toString('utf8')}`;
    const expectedSignature = crypto
      .createHmac('sha256', webhookSecret)
      .update(payload)
      .digest('hex');

    // Comparación segura de firmas
    const expectedBuffer = Buffer.from(expectedSignature, 'hex');
    const receivedBuffer = Buffer.from(receivedSignature, 'hex');

    if (expectedBuffer.length !== receivedBuffer.length) {
      console.warn('MercadoPago signature length mismatch');
      return false;
    }

    return crypto.timingSafeEqual(expectedBuffer, receivedBuffer);

  } catch (error) {
    console.error('Error verifying MercadoPago signature:', error);
    return false;
  }
}

/**
 * Middleware para verificar webhooks de MercadoPago
 */
export const mercadoPagoWebhookVerification = (req: Request, res: any, next: any) => {
  // Solo verificar en producción o cuando esté configurado el secret
  if (process.env.NODE_ENV === 'production' || process.env.MERCADOPAGO_WEBHOOK_SECRET) {
    const isValid = verifyMercadoPagoSignature(req);
    
    if (!isValid) {
      console.warn(`Invalid MercadoPago webhook signature from IP: ${req.ip}`);
      return res.status(403).json({ 
        success: false, 
        error: 'Invalid webhook signature' 
      });
    }
  }

  next();
};
