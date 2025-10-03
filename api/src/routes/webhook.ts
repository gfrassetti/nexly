import { Router, Request, Response } from "express";
import { config } from "../config";
import logger from "../utils/logger";
import { Message } from "../models/Message";
import { Contact } from "../models/Contact";
import { Conversation } from "../models/Conversation";
import { Integration } from "../models/Integration";
import { verifyMetaSignature } from "../middleware/verifyMetaSignature";
import {
  WhatsAppWebhookPayload,
  WhatsAppMessage,
  WhatsAppContact,
  WhatsAppChangeValue,
  ProcessedMessage,
  MessageProcessingResult
} from "../types/whatsapp";

const router = Router();

// Verificación del webhook (GET) - Según documentación de Meta
router.get("/", (req: Request, res: Response) => {
  const mode = req.query["hub.mode"];
  const token = req.query["hub.verify_token"];
  const challenge = req.query["hub.challenge"];

  logger.info('Webhook verification request received', {
    mode,
    hasToken: !!token,
    hasChallenge: !!challenge,
    timestamp: new Date().toISOString()
  });

  if (mode === "subscribe" && token === config.webhookVerifyToken) {
    logger.info('Webhook verification successful', {
      mode,
      timestamp: new Date().toISOString()
    });
    res.status(200).send(challenge);
  } else {
    logger.error('Webhook verification failed', {
      mode,
      hasToken: !!token,
      expectedToken: !!config.webhookVerifyToken,
      timestamp: new Date().toISOString()
    });
    res.status(403).send("Forbidden");
  }
});

// Notificaciones de mensajes (POST) - Según documentación de Meta
router.post("/", async (req: Request, res: Response) => {
  logger.info('Webhook notification received', {
    hasBody: !!req.body,
    bodyKeys: req.body ? Object.keys(req.body) : [],
    timestamp: new Date().toISOString()
  });

  // Verificar firma de Meta para seguridad
  if (!verifyMetaSignature(req)) {
    logger.error('Invalid Meta signature in webhook', {
      timestamp: new Date().toISOString()
    });
    return res.status(403).send("Forbidden");
  }
  
  try {
    const body = req.body as WhatsAppWebhookPayload;
    
    if (body.object === "whatsapp_business_account") {
      let totalMessagesProcessed = 0;
      let totalErrors = 0;

      for (const entry of body.entry || []) {
        for (const change of entry.changes || []) {
          if (change.field === "messages") {
            const result = await processWhatsAppMessages(change.value);
            totalMessagesProcessed += result.processed;
            totalErrors += result.errors;
          }
        }
      }

      logger.info('Webhook processing completed', {
        totalMessagesProcessed,
        totalErrors,
        timestamp: new Date().toISOString()
      });
    }
    
    res.status(200).send("OK");
  } catch (error: any) {
    logger.error('Error processing webhook', {
      error: error.message,
      stack: error.stack,
      timestamp: new Date().toISOString()
    });
    res.status(500).send("Internal Server Error");
  }
});

/**
 * Procesa los mensajes de WhatsApp y los guarda en la base de datos
 */
async function processWhatsAppMessages(webhookData: WhatsAppChangeValue): Promise<{processed: number, errors: number}> {
  const messages = webhookData?.messages || [];
  const contacts = webhookData?.contacts || [];
  const metadata = webhookData?.metadata || {};
  
  if (messages.length === 0) {
    logger.info('No messages to process in webhook');
    return { processed: 0, errors: 0 };
  }

  logger.info('Processing WhatsApp messages', {
    messageCount: messages.length,
    contactCount: contacts.length,
    phoneNumberId: metadata.phone_number_id
  });
  
  // Crear un mapa de contactos para acceso rápido
  const contactsMap = new Map<string, WhatsAppContact>();
  for (const contact of contacts) {
    contactsMap.set(contact.wa_id, contact);
  }
  
  let processed = 0;
  let errors = 0;
  
  for (const message of messages) {
    try {
      const result = await processIndividualMessage(message, contactsMap, metadata);
      if (result.success) {
        processed++;
      } else {
        errors++;
        logger.error('Failed to process message', {
          messageId: message.id,
          error: result.error
        });
      }
    } catch (error: any) {
      errors++;
      logger.error('Unexpected error processing message', {
        messageId: message.id,
        error: error.message,
        stack: error.stack
      });
    }
  }

  return { processed, errors };
}

/**
 * Procesa un mensaje individual
 */
async function processIndividualMessage(
  message: WhatsAppMessage, 
  contactsMap: Map<string, WhatsAppContact>, 
  metadata: any
): Promise<MessageProcessingResult> {
  try {
    // Buscar la integración de WhatsApp para este usuario
    const integration = await Integration.findOne({
      provider: "whatsapp",
      phoneNumberId: metadata.phone_number_id
    });

    if (!integration) {
      logger.warn('WhatsApp integration not found', {
        phoneNumberId: metadata.phone_number_id,
        messageId: message.id
      });
      return { success: false, error: 'Integration not found' };
    }

    // Buscar o crear contacto
    let contact = await Contact.findOne({
      userId: integration.userId,
      phone: message.from
    });

    if (!contact) {
      const contactData = contactsMap.get(message.from);
      contact = new Contact({
        userId: integration.userId,
        phone: message.from,
        name: contactData?.profile?.name || `Contacto ${message.from}`,
        integrationId: integration._id
      });
      await contact.save();
      
      logger.info('New contact created', {
        contactId: contact._id,
        phone: message.from,
        name: contact.name
      });
    }

    // Buscar o crear conversación
    let conversation = await Conversation.findOne({
      tenantId: integration.userId.toString(),
      contactId: contact._id,
      channel: "whatsapp"
    });

    if (!conversation) {
      conversation = new Conversation({
        tenantId: integration.userId.toString(),
        contactId: contact._id,
        channel: "whatsapp",
        status: "open"
      });
      await conversation.save();
      
      logger.info('New conversation created', {
        conversationId: conversation._id,
        contactId: contact._id
      });
    }

    // Crear mensaje en la base de datos
    const processedMessage = extractMessageContent(message);
    if (processedMessage.content) {
      const newMessage = new Message({
        userId: integration.userId,
        contactId: contact._id,
        conversationId: conversation._id,
        integrationId: integration._id,
        direction: "in",
        body: processedMessage.content,
        provider: "whatsapp",
        externalMessageId: message.id
      });

      await newMessage.save();
      
      logger.info('Message saved to database', {
        messageId: newMessage._id,
        externalMessageId: message.id,
        type: message.type,
        from: message.from
      });

      return { success: true, messageId: newMessage._id.toString() };
    } else {
      return { success: false, error: 'No content extracted from message' };
    }

  } catch (error: any) {
    return { 
      success: false, 
      error: error.message 
    };
  }
}

/**
 * Extrae el contenido del mensaje según su tipo
 * Retorna una representación más amigable para la UI
 */
function extractMessageContent(message: WhatsAppMessage): ProcessedMessage {
  switch (message.type) {
    case 'text':
      return {
        type: 'text',
        content: message.text?.body || '',
        metadata: {}
      };
    
    case 'image':
      return {
        type: 'image',
        content: message.image?.caption || 'Imagen',
        metadata: {
          imageId: message.image?.id
        }
      };
    
    case 'document':
      return {
        type: 'document',
        content: `Documento: ${message.document?.filename || 'Archivo'}`,
        metadata: {
          documentFilename: message.document?.filename
        }
      };
    
    case 'audio':
      return {
        type: 'audio',
        content: 'Mensaje de voz',
        metadata: {
          audioId: message.audio?.id
        }
      };
    
    case 'video':
      return {
        type: 'video',
        content: `Video: ${message.video?.caption || 'Video'}`,
        metadata: {
          videoId: message.video?.id
        }
      };
    
    case 'sticker':
      return {
        type: 'sticker',
        content: 'Sticker',
        metadata: {
          stickerId: message.sticker?.id
        }
      };
    
    case 'location':
      return {
        type: 'location',
        content: `Ubicación: ${message.location?.name || 'Ubicación compartida'}`,
        metadata: {
          location: {
            latitude: message.location?.latitude || 0,
            longitude: message.location?.longitude || 0,
            name: message.location?.name
          }
        }
      };
    
    case 'contacts':
      return {
        type: 'contacts',
        content: `Contacto: ${message.contacts?.[0]?.name?.formatted_name || 'Contacto compartido'}`,
        metadata: {}
      };
    
    case 'interactive':
      const interactiveType = message.interactive?.type || 'interactive';
      const interactiveTitle = message.interactive?.button_reply?.title || 
                              message.interactive?.list_reply?.title || 
                              'Interacción';
      
      return {
        type: 'interactive',
        content: `Interacción: ${interactiveTitle}`,
        metadata: {
          interactiveType,
          interactiveTitle
        }
      };
    
    default:
      return {
        type: message.type,
        content: `Mensaje de tipo: ${message.type}`,
        metadata: {}
      };
  }
}

export default router;