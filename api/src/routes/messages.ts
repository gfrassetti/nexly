import { Router, Request, Response } from "express";
import mongoose from "mongoose";
import handleAuth from "../middleware/auth";
import { Message } from "../models/Message";
import { Contact } from "../models/Contact";
import { Integration } from "../models/Integration";
import MessageLimit from "../models/MessageLimit";
import { getIntegrationMessageLimit } from "../services/messageLimits";
import { createWhatsAppService } from "../services/whatsappService";
import logger from "../utils/logger";

type AuthRequest = Request & { user?: { id?: string; _id?: string } };

const router = Router();
router.use(handleAuth);

function buildUserIdFilter(rawUserId: string) {
  if (mongoose.isValidObjectId(rawUserId)) {
    return new mongoose.Types.ObjectId(rawUserId);
  }
  return rawUserId;
}

// Listar mensajes por contacto o integración
router.get("/", async (req: AuthRequest, res: Response) => {
  try {
    const rawUserId = req.user?.id || req.user?._id;
    if (!rawUserId) return res.status(401).json({ error: "no_user_in_token" });

    const contactId = req.query.contactId as string | undefined;
    const integrationId = req.query.integrationId as string | undefined;

    const filter: any = { userId: buildUserIdFilter(rawUserId) };
    if (contactId) filter.contactId = contactId;
    if (integrationId) filter.integrationId = integrationId;

    const messages = await Message.find(filter).sort({ createdAt: 1 }).lean();
    return res.json(messages ?? []);
  } catch (err: any) {
    console.error("messages_list_failed:", err?.message || err);
    return res.status(500).json({ error: "messages_list_failed", detail: err?.message });
  }
});

// Enviar mensaje hacia una integración
router.post("/send", async (req: AuthRequest, res: Response) => {
  try {
    const rawUserId = req.user?.id || req.user?._id;
    if (!rawUserId) return res.status(401).json({ error: "no_user_in_token" });

    const { provider, to, body } = req.body;
    if (!provider || !to || !body) {
      return res.status(400).json({ error: "missing_fields" });
    }

    const integration = await Integration.findOne({ userId: buildUserIdFilter(rawUserId), provider });
    if (!integration) return res.status(400).json({ error: "no_integration_found" });

    // Verificar límites de mensajes
    const integrationId = (integration._id as mongoose.Types.ObjectId).toString();
    const maxMessages = await getIntegrationMessageLimit(rawUserId, integrationId);
    const todayLimit = await MessageLimit.getTodayLimit(rawUserId, integrationId);
    
    if (todayLimit && !todayLimit.canSendMessage()) {
      return res.status(429).json({ 
        error: "message_limit_exceeded", 
        detail: `Has alcanzado el límite de ${maxMessages} mensajes por día para ${provider}`,
        limit: maxMessages,
        used: todayLimit.messageCount,
        remaining: 0
      });
    }

    // Enviar mensaje real según el proveedor
    let messageId: string | null = null;
    
    if (provider === 'whatsapp') {
      // Enviar mensaje usando Twilio (con subaccount del usuario)
      try {
        const { sendWhatsAppMessage } = require('../services/twilioWhatsAppService');
        const response = await sendWhatsAppMessage({
          to: to,
          body: body
        }, rawUserId);

        if (!response.success) {
          return res.status(500).json({ 
            error: "whatsapp_send_failed", 
            detail: response.error || 'Error enviando mensaje' 
          });
        }

        messageId = response.messageId || response.sid;
        
        logger.info('WhatsApp message sent successfully', {
          messageId,
          to,
          userId: rawUserId,
          bodyLength: body.length
        });
      } catch (error: any) {
        logger.error('Error sending WhatsApp message', {
          error: error.message,
          to,
          userId: rawUserId
        });
        return res.status(500).json({ 
          error: "whatsapp_send_failed", 
          detail: error.message 
        });
      }
    } else {
      // Para otros proveedores (Instagram, Messenger), por ahora solo log
      console.log(`[SEND] ${provider} -> ${to}: ${body}`);
    }

    // asegurar contacto
    let contact = await Contact.findOne({ userId: buildUserIdFilter(rawUserId), phone: to });
    if (!contact) {
      contact = await Contact.create({
        userId: buildUserIdFilter(rawUserId),
        integrationId: integration._id,
        name: to,
        phone: to,
        email: "",
      });
    }

    const msg = await Message.create({
      userId: buildUserIdFilter(rawUserId),
      contactId: contact._id,
      integrationId: integration._id,
      direction: "out",
      body,
      externalMessageId: messageId, // ID del mensaje en WhatsApp
      provider: provider,
    });

    // Incrementar contador de mensajess
    await MessageLimit.incrementMessageCount(
      rawUserId, 
      integrationId, 
      provider, 
      maxMessages
    );

    return res.json(msg);
  } catch (err: any) {
    console.error("message_send_failed:", err?.message || err);
    return res.status(500).json({ error: "message_send_failed", detail: err?.message });
  }
});

// Marcar mensaje como leído en WhatsApp
router.post("/mark-read", async (req: AuthRequest, res: Response) => {
  try {
    const rawUserId = req.user?.id || req.user?._id;
    if (!rawUserId) return res.status(401).json({ error: "no_user_in_token" });

    const { messageId } = req.body;
    if (!messageId) {
      return res.status(400).json({ error: "message_id_required" });
    }

    // Buscar el mensaje en la base de datos
    const message = await Message.findOne({
      _id: messageId,
      userId: buildUserIdFilter(rawUserId),
      direction: "in" // Solo mensajes entrantes pueden ser marcados como leídos
    });

    if (!message) {
      return res.status(404).json({ error: "message_not_found" });
    }

    // Buscar la integración para obtener credenciales de WhatsApp
    const integration = await Integration.findById(message.integrationId);
    if (!integration || integration.provider !== 'whatsapp') {
      return res.status(400).json({ error: "invalid_integration" });
    }

    if (!integration.accessToken || !integration.phoneNumberId) {
      return res.status(400).json({ 
        error: "whatsapp_config_missing", 
        detail: "Faltan credenciales de WhatsApp" 
      });
    }

    // Marcar como leído en WhatsApp
    try {
      const whatsappService = createWhatsAppService(
        integration.accessToken, 
        integration.phoneNumberId
      );
      await whatsappService.markMessageAsRead(message.externalMessageId || '');
      
      return res.json({ success: true, message: "Mensaje marcado como leído" });
    } catch (error: any) {
      console.error('Error marcando mensaje como leído en WhatsApp:', error.message);
      return res.status(500).json({ 
        error: "whatsapp_mark_read_failed", 
        detail: error.message 
      });
    }

  } catch (err: any) {
    console.error("mark_read_failed:", err?.message || err);
    return res.status(500).json({ error: "mark_read_failed", detail: err?.message });
  }
});

// Obtener límites de mensajes del usuario
router.get("/limits", async (req: AuthRequest, res: Response) => {
  try {
    const rawUserId = req.user?.id || req.user?._id;
    if (!rawUserId) return res.status(401).json({ error: "no_user_in_token" });

    const { provider } = req.query;
    
    if (provider) {
      // Límites para una integración específica
      const integration = await Integration.findOne({ 
        userId: buildUserIdFilter(rawUserId), 
        provider: provider as string 
      });
      
      if (!integration) {
        return res.status(404).json({ error: "integration_not_found" });
      }

      const integrationId = (integration._id as mongoose.Types.ObjectId).toString();
      const maxMessages = await getIntegrationMessageLimit(rawUserId, integrationId);
      const todayLimit = await MessageLimit.getTodayLimit(rawUserId, integrationId);

      return res.json({
        provider,
        maxMessages,
        usedToday: todayLimit?.messageCount || 0,
        remaining: todayLimit?.getRemainingMessages() || maxMessages,
        canSend: todayLimit ? todayLimit.canSendMessage() : true,
      });
    } else {
      // Límites para todas las integraciones
      const integrations = await Integration.find({ userId: buildUserIdFilter(rawUserId) });
      const limits = [];

      for (const integration of integrations) {
        const integrationId = (integration._id as mongoose.Types.ObjectId).toString();
        const maxMessages = await getIntegrationMessageLimit(rawUserId, integrationId);
        const todayLimit = await MessageLimit.getTodayLimit(rawUserId, integrationId);

        limits.push({
          provider: integration.provider,
          maxMessages,
          usedToday: todayLimit?.messageCount || 0,
          remaining: todayLimit?.getRemainingMessages() || maxMessages,
          canSend: todayLimit ? todayLimit.canSendMessage() : true,
        });
      }

      return res.json({ limits });
    }
  } catch (err: any) {
    console.error("get_limits_failed:", err?.message || err);
    return res.status(500).json({ error: "get_limits_failed", detail: err?.message });
  }
});

export default router;

