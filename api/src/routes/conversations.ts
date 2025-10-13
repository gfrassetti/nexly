import { Router, Request, Response } from "express";
import mongoose from "mongoose";
import handleAuth from "../middleware/auth";
import { Conversation } from "../models/Conversation";
import { Contact } from "../models/Contact";
import { Message } from "../models/Message";
import { Integration } from "../models/Integration";

type AuthRequest = Request & { user?: { id?: string; _id?: string } };

const router = Router();
router.use(handleAuth);

function buildUserIdFilter(rawUserId: string) {
  if (mongoose.isValidObjectId(rawUserId)) {
    return new mongoose.Types.ObjectId(rawUserId);
  }
  return rawUserId;
}

// Listar conversaciones del usuario
router.get("/", async (req: AuthRequest, res: Response) => {
  try {
    const rawUserId = req.user?.id || req.user?._id;
    if (!rawUserId) return res.status(401).json({ error: "no_user_in_token" });

    const { channel, status, page = 1, limit = 20 } = req.query;
    const skip = (Number(page) - 1) * Number(limit);

    // Construir filtros
    const filter: any = { tenantId: rawUserId };
    if (channel) filter.channel = channel;
    if (status) filter.status = status;

    // Obtener conversaciones con información del contacto
    const conversations = await Conversation.find(filter)
      .populate('contactId', 'name phone email')
      .sort({ updatedAt: -1 })
      .skip(skip)
      .limit(Number(limit))
      .lean();

    // Obtener el último mensaje de cada conversación
    const conversationsWithLastMessage = await Promise.all(
      conversations.map(async (conversation) => {
        const lastMessage = await Message.findOne({
          conversationId: conversation._id
        })
        .sort({ createdAt: -1 })
        .select('body direction createdAt')
        .lean();

        return {
          ...conversation,
          lastMessage: lastMessage || null
        };
      })
    );

    const total = await Conversation.countDocuments(filter);

    return res.json({
      conversations: conversationsWithLastMessage,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        pages: Math.ceil(total / Number(limit))
      }
    });
  } catch (err: any) {
    console.error("conversations_list_failed:", err?.message || err);
    return res.status(500).json({ error: "conversations_list_failed", detail: err?.message });
  }
});

// Obtener una conversación específica con sus mensajes
router.get("/:conversationId", async (req: AuthRequest, res: Response) => {
  try {
    const rawUserId = req.user?.id || req.user?._id;
    if (!rawUserId) return res.status(401).json({ error: "no_user_in_token" });

    const { conversationId } = req.params;
    const { page = 1, limit = 50 } = req.query;
    const skip = (Number(page) - 1) * Number(limit);

    // Verificar que la conversación pertenece al usuario
    const conversation = await Conversation.findOne({
      _id: conversationId,
      tenantId: rawUserId
    }).populate('contactId', 'name phone email');

    if (!conversation) {
      return res.status(404).json({ error: "conversation_not_found" });
    }

    // Obtener mensajes de la conversación
    const messages = await Message.find({
      conversationId: conversation._id
    })
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(Number(limit))
    .lean();

    const totalMessages = await Message.countDocuments({
      conversationId: conversation._id
    });

    return res.json({
      conversation,
      messages: messages.reverse(), // Ordenar cronológicamente
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total: totalMessages,
        pages: Math.ceil(totalMessages / Number(limit))
      }
    });
  } catch (err: any) {
    console.error("conversation_get_failed:", err?.message || err);
    return res.status(500).json({ error: "conversation_get_failed", detail: err?.message });
  }
});

// Actualizar estado de conversación (abrir/cerrar)
router.patch("/:conversationId/status", async (req: AuthRequest, res: Response) => {
  try {
    const rawUserId = req.user?.id || req.user?._id;
    if (!rawUserId) return res.status(401).json({ error: "no_user_in_token" });

    const { conversationId } = req.params;
    const { status } = req.body;

    if (!status || !['open', 'closed'].includes(status)) {
      return res.status(400).json({ error: "invalid_status" });
    }

    const conversation = await Conversation.findOneAndUpdate(
      {
        _id: conversationId,
        tenantId: rawUserId
      },
      { status },
      { new: true }
    ).populate('contactId', 'name phone email');

    if (!conversation) {
      return res.status(404).json({ error: "conversation_not_found" });
    }

    return res.json(conversation);
  } catch (err: any) {
    console.error("conversation_status_update_failed:", err?.message || err);
    return res.status(500).json({ error: "conversation_status_update_failed", detail: err?.message });
  }
});

// Enviar mensaje en una conversación (unificado para todos los canales)
router.post("/:conversationId/send-message", async (req: AuthRequest, res: Response) => {
  try {
    const rawUserId = req.user?.id || req.user?._id;
    if (!rawUserId) return res.status(401).json({ error: "no_user_in_token" });

    const { conversationId } = req.params;
    const { body } = req.body;

    if (!body) {
      return res.status(400).json({ error: "message_body_required" });
    }

    // Verificar que la conversación pertenece al usuario y obtener información
    const conversation = await Conversation.findOne({
      _id: conversationId,
      tenantId: rawUserId
    }).populate('contactId');

    if (!conversation) {
      return res.status(404).json({ error: "conversation_not_found" });
    }

    const contact = conversation.contactId as any;
    const channel = conversation.channel;

    // ⚠️ FIREWALL FINANCIERO - Verificar límites ANTES de enviar ⚠️
    const { checkAndIncrementUsage } = require('../services/messageLimits');
    const usageCheck = await checkAndIncrementUsage(rawUserId, channel);
    
    if (!usageCheck.allowed) {
      console.log(`🛑 Mensaje bloqueado - Límite alcanzado:`, {
        userId: rawUserId,
        channel,
        reason: usageCheck.reason
      });
      
      return res.status(429).json({ 
        error: "message_limit_exceeded",
        message: usageCheck.reason,
        used: usageCheck.used,
        limit: usageCheck.limit,
        remaining: 0
      });
    }
    
    console.log(`✅ Mensaje permitido - Uso actual:`, {
      userId: rawUserId,
      channel,
      used: usageCheck.used,
      limit: usageCheck.limit,
      remaining: usageCheck.remaining
    });

    // Buscar la integración del usuario para este canal
    const integration = await Integration.findOne({
      userId: buildUserIdFilter(rawUserId),
      provider: channel,
      status: 'linked'
    });

    if (!integration) {
      return res.status(400).json({ 
        error: "integration_not_found",
        message: `No hay una integración activa para ${channel}` 
      });
    }

    let externalMessageId: string | null = null;
    let sendResult: any = null;

    // Enviar mensaje según el canal
    switch (channel) {
      case 'whatsapp': {
        // Usar Twilio para enviar mensaje de WhatsApp
        const { sendWhatsAppMessage } = require('../services/twilioWhatsAppService');
        
        const toNumber = contact.phone || contact.externalId;
        if (!toNumber) {
          return res.status(400).json({ error: "contact_phone_missing" });
        }

        sendResult = await sendWhatsAppMessage(
          {
            to: toNumber.startsWith('whatsapp:') ? toNumber : `whatsapp:${toNumber}`,
            body: body
          },
          rawUserId
        );

        if (!sendResult.success) {
          return res.status(500).json({ 
            error: "whatsapp_send_failed",
            message: sendResult.error 
          });
        }

        externalMessageId = sendResult.messageId;
        break;
      }

      case 'telegram': {
        // Usar servicio de Telegram
        const { telegramMTProtoService } = require('../services/telegramMTProtoService');
        const { TelegramSession } = require('../models/TelegramSession');

        const session = await TelegramSession.findOne({
          userId: buildUserIdFilter(rawUserId),
          isActive: true,
          authState: 'authenticated'
        });

        if (!session || !session.sessionString) {
          return res.status(400).json({ error: "telegram_not_connected" });
        }

        const connected = await telegramMTProtoService.connect(rawUserId, session.sessionString);
        if (!connected) {
          return res.status(500).json({ error: "telegram_connection_failed" });
        }

        const telegramChatId = contact.platformData?.telegramUserId || contact.externalId;
        if (!telegramChatId) {
          return res.status(400).json({ error: "telegram_chat_id_missing" });
        }

        sendResult = await telegramMTProtoService.sendMessage(rawUserId, parseInt(telegramChatId), body);
        
        if (!sendResult.success) {
          return res.status(500).json({ 
            error: "telegram_send_failed",
            message: sendResult.error 
          });
        }

        externalMessageId = sendResult.messageId?.toString();
        break;
      }

      case 'messenger':
      case 'instagram': {
        // TODO: Implementar envío para Messenger/Instagram usando Meta API
        return res.status(501).json({ 
          error: "not_implemented",
          message: `El envío de mensajes para ${channel} aún no está implementado` 
        });
      }

      default:
        return res.status(400).json({ 
          error: "unsupported_channel",
          message: `Canal ${channel} no soportado` 
        });
    }

    // Guardar mensaje en la base de datos
    const message = await Message.create({
      userId: buildUserIdFilter(rawUserId),
      contactId: contact._id,
      integrationId: integration._id,
      conversationId: conversation._id,
      direction: 'out',
      body: body,
      provider: channel,
      externalMessageId: externalMessageId,
      from: 'business', // Indica que el mensaje fue enviado por el negocio
      timestamp: new Date(),
      isRead: true // Los mensajes salientes se marcan como leídos automáticamente
    });

    // Actualizar la conversación
    conversation.status = 'open'; // Reabrir si estaba cerrada
    await conversation.save();

    // Actualizar el contacto
    if (contact) {
      contact.lastInteraction = new Date();
      contact.lastMessagePreview = body.substring(0, 100);
      await contact.save();
    }

    console.log(`✅ Mensaje ${channel} enviado exitosamente:`, {
      conversationId,
      messageId: message._id.toString(),
      externalMessageId,
      channel
    });

    return res.json({
      success: true,
      message: message,
      externalMessageId: externalMessageId
    });

  } catch (err: any) {
    console.error("send_message_failed:", err?.message || err);
    return res.status(500).json({ error: "send_message_failed", detail: err?.message });
  }
});

// Obtener estadísticas de conversaciones
router.get("/stats/overview", async (req: AuthRequest, res: Response) => {
  try {
    const rawUserId = req.user?.id || req.user?._id;
    if (!rawUserId) return res.status(401).json({ error: "no_user_in_token" });

    const [totalConversations, openConversations, closedConversations] = await Promise.all([
      Conversation.countDocuments({ tenantId: rawUserId }),
      Conversation.countDocuments({ tenantId: rawUserId, status: 'open' }),
      Conversation.countDocuments({ tenantId: rawUserId, status: 'closed' })
    ]);

    // Conversaciones por canal
    const conversationsByChannel = await Conversation.aggregate([
      { $match: { tenantId: rawUserId } },
      { $group: { _id: '$channel', count: { $sum: 1 } } }
    ]);

    // Mensajes por canal (últimos 30 días)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const messagesByChannel = await Message.aggregate([
      { $match: { userId: buildUserIdFilter(rawUserId), createdAt: { $gte: thirtyDaysAgo } } },
      { $group: { _id: '$provider', count: { $sum: 1 } } }
    ]);

    return res.json({
      totalConversations,
      openConversations,
      closedConversations,
      conversationsByChannel: conversationsByChannel.reduce((acc, item) => {
        acc[item._id] = item.count;
        return acc;
      }, {}),
      messagesByChannel: messagesByChannel.reduce((acc, item) => {
        acc[item._id] = item.count;
        return acc;
      }, {})
    });
  } catch (err: any) {
    console.error("conversation_stats_failed:", err?.message || err);
    return res.status(500).json({ error: "conversation_stats_failed", detail: err?.message });
  }
});

export default router;
