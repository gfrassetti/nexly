// api/src/routes/twilioWebhook.ts
import { Router, Request, Response } from 'express';
import { Integration } from '../models/Integration';
import { Message } from '../models/Message';
import { Contact } from '../models/Contact';
import { Conversation } from '../models/Conversation';
import { config } from '../config';
import logger from '../utils/logger';

const router = Router();

/**
 * POST /twilio-webhook
 * Webhook para recibir mensajes de WhatsApp de Twilio
 */
router.post("/", async (req: Request, res: Response) => {
  try {
    console.log("📨 Twilio webhook recibido:", {
      body: req.body,
      headers: req.headers
    });

    const { MessageSid, From, To, Body, MessageStatus, NumMedia } = req.body;

    // Verificar que sea un mensaje válido
    if (!MessageSid || !From || !To) {
      logger.warn('Invalid Twilio webhook received', {
        messageSid: MessageSid,
        from: From,
        to: To
      });
      return res.status(400).json({ error: "Invalid webhook data" });
    }

    // Extraer el número de teléfono del usuario (remover whatsapp: prefix)
    const userPhoneNumber = To.replace('whatsapp:', '');
    const contactPhoneNumber = From.replace('whatsapp:', '');

    // Buscar la integración de WhatsApp que corresponde a este número
    const integration = await Integration.findOne({
      phoneNumberId: userPhoneNumber,
      provider: "whatsapp",
      status: "linked"
    });

    if (!integration) {
      logger.warn('No WhatsApp integration found for phone number', {
        userPhoneNumber,
        messageSid: MessageSid
      });
      return res.status(404).json({ error: "Integration not found" });
    }

    // Buscar o crear contacto
    let contact = await Contact.findOne({
      userId: integration.userId,
      phone: contactPhoneNumber
    });

    if (!contact) {
      contact = await Contact.create({
        userId: integration.userId,
        name: contactPhoneNumber, // Usar número como nombre inicial
        phone: contactPhoneNumber,
        provider: "whatsapp",
        integrationId: integration._id
      });
      logger.info('New contact created', {
        contactId: contact._id,
        phone: contactPhoneNumber,
        userId: integration.userId
      });
    }

    // Buscar o crear conversación
    let conversation = await Conversation.findOne({
      userId: integration.userId,
      contactId: contact._id,
      integrationId: integration._id
    });

    if (!conversation) {
      conversation = await Conversation.create({
        userId: integration.userId,
        contactId: contact._id,
        integrationId: integration._id,
        provider: "whatsapp",
        status: "active"
      });
      logger.info('New conversation created', {
        conversationId: conversation._id,
        contactId: contact._id,
        userId: integration.userId
      });
    }

    // Crear mensaje
    const message = await Message.create({
      userId: integration.userId,
      conversationId: conversation._id,
      integrationId: integration._id,
      externalId: MessageSid,
      from: contactPhoneNumber,
      to: userPhoneNumber,
      body: Body || '',
      direction: 'inbound',
      status: MessageStatus || 'received',
      provider: "whatsapp",
      metadata: {
        twilioMessageSid: MessageSid,
        numMedia: NumMedia || 0
      }
    });

    // Actualizar última actividad de la conversación
    await Conversation.findByIdAndUpdate(conversation._id, {
      lastMessageAt: new Date(),
      lastMessage: Body || '',
      unreadCount: { $inc: 1 }
    });

    logger.info('WhatsApp message processed successfully', {
      messageId: message._id,
      messageSid: MessageSid,
      conversationId: conversation._id,
      contactId: contact._id,
      userId: integration.userId,
      from: contactPhoneNumber,
      to: userPhoneNumber
    });

    // Responder a Twilio con status 200
    res.status(200).json({ status: "received" });

  } catch (error: any) {
    logger.error('Error processing Twilio webhook', {
      error: error.message,
      stack: error.stack,
      body: req.body
    });

    // Aún así responder 200 para evitar reenvíos de Twilio
    res.status(200).json({ status: "error", message: error.message });
  }
});

/**
 * GET /twilio-webhook
 * Webhook para verificación de Twilio (si es necesario)
 */
router.get("/", (req: Request, res: Response) => {
  logger.info('Twilio webhook GET request', {
    query: req.query,
    headers: req.headers
  });
  
  res.status(200).json({ status: "webhook_active" });
});

export default router;
