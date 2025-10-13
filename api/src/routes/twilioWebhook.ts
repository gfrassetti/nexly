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
 * Procesar actualización de estado de mensaje
 */
async function processMessageStatusUpdate(payload: any): Promise<void> {
  try {
    const { MessageSid, MessageStatus, ErrorCode, ErrorMessage } = payload;
    
    logger.info('Processing WhatsApp message status update', {
      messageSid: MessageSid,
      status: MessageStatus,
      hasError: !!ErrorCode
    });

    // Buscar el mensaje en la base de datos
    const Message = require('../models/Message').default;
    const message = await Message.findOne({ externalMessageId: MessageSid });

    if (!message) {
      logger.warn('Message not found for status update', { messageSid: MessageSid });
      return;
    }

    // Mapear estados de Twilio a nuestros estados internos
    const statusMap: { [key: string]: string } = {
      'queued': 'queued',
      'sending': 'sending',
      'sent': 'sent',
      'delivered': 'delivered',
      'read': 'read',
      'failed': 'failed',
      'undelivered': 'failed'
    };

    const newStatus = statusMap[MessageStatus] || MessageStatus;

    // Actualizar el mensaje
    message.status = newStatus;
    
    if (ErrorCode) {
      message.errorCode = ErrorCode;
      message.errorMessage = ErrorMessage;
    }
    
    await message.save();

    logger.info('Message status updated successfully', {
      messageId: message._id.toString(),
      messageSid: MessageSid,
      oldStatus: message.status,
      newStatus: newStatus
    });

  } catch (error: any) {
    logger.error('Error processing message status update', {
      error: error.message,
      payload,
      stack: error.stack
    });
  }
}

/**
 * POST /twilio-webhook
 * Webhook para recibir mensajes de WhatsApp Business de Twilio
 * Implementa validación de firma y procesamiento asíncrono
 * Maneja tanto mensajes entrantes como actualizaciones de estado
 */
router.post("/", async (req: Request, res: Response) => {
  // 1. Validar firma de Twilio para seguridad (solo en producción)
  if (config.isProduction && !validateTwilioSignature(req)) {
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
      const { MessageStatus, SmsStatus } = req.body;
      
      // Determinar el tipo de evento
      const eventType = MessageStatus || SmsStatus;
      const isStatusUpdate = ['queued', 'sending', 'sent', 'delivered', 'read', 'failed', 'undelivered'].includes(eventType);
      const isIncomingMessage = eventType === 'received' || !MessageStatus;
      
      logger.info('Twilio WhatsApp webhook received', { 
        body: sanitizedBody,
        messageSid: req.body.MessageSid,
        messageStatus: eventType,
        eventType: isStatusUpdate ? 'status_update' : 'incoming_message'
      });
      
      // Procesar webhook según el tipo de evento
      if (isStatusUpdate) {
        // Actualización de estado de mensaje saliente
        await processMessageStatusUpdate(req.body);
      } else if (isIncomingMessage) {
        // Mensaje entrante nuevo
        const result = await processIncomingWhatsAppMessage(req.body);
        
        if (result.success) {
          logger.info('WhatsApp webhook processed successfully', {
            messageSid: req.body.MessageSid,
            eventType: 'incoming_message',
            messageId: result.messageId
          });
        } else {
          logger.error('WhatsApp webhook processing failed', {
            messageSid: req.body.MessageSid,
            error: result.error
          });
        }
      } else {
        logger.warn('Unknown webhook event type', {
          messageSid: req.body.MessageSid,
          messageStatus: eventType
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
