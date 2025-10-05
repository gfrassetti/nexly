// api/src/routes/twilioWebhook.ts
import { Router, Request, Response } from 'express';
import { processIncomingWhatsAppMessage } from '../services/twilioWhatsAppService';
import logger from '../utils/logger';
import { config } from '../config';

const router = Router();

/**
 * Validar la firma del webhook de Twilio para seguridad
 */
function validateTwilioSignature(req: Request): boolean {
  try {
    const twilioSignature = req.headers['x-twilio-signature'] as string;
    const webhookUrl = `${config.apiUrl}/twilio-webhook`;
    const body = JSON.stringify(req.body);
    
    if (!twilioSignature || !config.twilioAuthToken) {
      logger.warn('Missing Twilio signature or auth token for webhook validation');
      return false;
    }

    // Usar la librería de validación de Twilio
    const { validateRequest } = require('twilio');
    return validateRequest(config.twilioAuthToken, twilioSignature, webhookUrl, body);
  } catch (error: any) {
    logger.error('Error validating Twilio signature', { error: error.message });
    return false;
  }
}

/**
 * Filtrar información sensible del body para logging
 */
function sanitizeWebhookBody(body: any): any {
  const sanitized = { ...body };
  
  // Remover campos sensibles
  delete sanitized.Body; // Contenido del mensaje
  delete sanitized.From; // Número del remitente
  delete sanitized.To; // Número del destinatario
  
  // Mantener solo campos de identificación y estado
  return {
    MessageSid: sanitized.MessageSid,
    MessageStatus: sanitized.MessageStatus,
    SmsStatus: sanitized.SmsStatus,
    AccountSid: sanitized.AccountSid,
    NumMedia: sanitized.NumMedia,
    MediaContentType0: sanitized.MediaContentType0,
    // Timestamps
    Timestamp: sanitized.Timestamp
  };
}

/**
 * POST /twilio-webhook
 * Webhook para recibir mensajes de WhatsApp Business de Twilio
 * Implementa validación de firma y procesamiento asíncrono
 */
router.post("/", async (req: Request, res: Response) => {
  // 1. Validar firma de Twilio para seguridad
  if (!validateTwilioSignature(req)) {
    logger.warn('Invalid Twilio webhook signature', {
      ip: req.ip,
      userAgent: req.get('User-Agent'),
      timestamp: new Date().toISOString()
    });
    return res.status(403).send('Forbidden');
  }

  // 2. Responder inmediatamente para evitar timeouts de Twilio
  res.status(200).send('OK');

  // 3. Procesar webhook de forma asíncrona
  setImmediate(async () => {
    try {
      const sanitizedBody = sanitizeWebhookBody(req.body);
      logger.info('Twilio WhatsApp webhook received', { 
        body: sanitizedBody,
        messageSid: req.body.MessageSid,
        messageStatus: req.body.MessageStatus
      });
      
      // Procesar webhook según el tipo de evento
      const result = await processIncomingWhatsAppMessage(req.body);
      
      if (result.success) {
        logger.info('WhatsApp webhook processed successfully', {
          messageSid: req.body.MessageSid,
          eventType: req.body.MessageStatus || 'message'
        });
      } else {
        logger.error('WhatsApp webhook processing failed', {
          messageSid: req.body.MessageSid,
          error: result.error
        });
      }
    } catch (error: any) {
      logger.error('Error in async Twilio webhook processing', { 
        error: error.message,
        messageSid: req.body.MessageSid,
        stack: error.stack
      });
    }
  });
});

export default router;
