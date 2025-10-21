import { Router, Request, Response } from "express";
import { Types } from "mongoose";
import { Integration } from "../models/Integration";
import { User } from "../models/User";
import { checkAuth } from "../middleware/auth";
import { syncIntegration } from "../services/syncIntegration";
import { logger } from "../utils/logger";
import config from "../config";
import { DiscordService } from "../services/discordService";

const router = Router();

/**
 * POST /discord/connect
 * Conecta un bot de Discord a la cuenta del usuario
 */
router.post("/connect", checkAuth, async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    const { botToken, guildId, clientId } = req.body;

    if (!userId || !botToken || !guildId) {
      return res.status(400).json({
        error: "Faltan parámetros requeridos: botToken y guildId"
      });
    }

    // Validar que el usuario existe
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ error: "Usuario no encontrado" });
    }

    // Verificar límites de integración
    const currentIntegrations = await Integration.countDocuments({ 
      userId, 
      status: 'linked' 
    });

    // Límite básico - puedes ajustar según tu lógica de suscripción
    const maxIntegrations = 5; // Ajustar según plan de suscripción
    if (currentIntegrations >= maxIntegrations) {
      return res.status(400).json({
        error: "Has alcanzado el límite máximo de integraciones"
      });
    }

    // Crear o actualizar integración de Discord
    const integration = await Integration.findOneAndUpdate(
      { userId: new Types.ObjectId(userId), provider: "discord" },
      {
        userId: new Types.ObjectId(userId),
        provider: "discord",
        externalId: guildId,
        accessToken: botToken,
        name: `Discord Server - ${guildId}`,
        status: "pending",
        meta: {
          discordBotToken: botToken,
          discordGuildId: guildId,
          discordClientId: clientId,
          discordPermissions: "send_messages,read_messages,manage_messages"
        }
      },
      { upsert: true, new: true }
    );

    if (!integration) {
      return res.status(500).json({ error: "Error al crear la integración" });
    }

    // Intentar sincronizar la integración
    const syncResult = await syncIntegration(integration);

    if (!syncResult.ok) {
      logger.error("Error al sincronizar Discord", {
        userId,
        integrationId: integration._id,
        error: syncResult.error
      });
      
      return res.status(400).json({
        error: "Error al conectar con Discord",
        details: syncResult.error
      });
    }

    logger.info("Discord conectado exitosamente", {
      userId,
      integrationId: integration._id,
      guildId
    });

    res.json({
      success: true,
      integration: {
        id: integration._id,
        provider: integration.provider,
        name: integration.name,
        status: integration.status,
        meta: integration.meta
      }
    });

  } catch (error: any) {
    logger.error("Error al conectar Discord", {
      userId: req.user?.id,
      error: error.message,
      stack: error.stack
    });

    res.status(500).json({
      error: "Error interno del servidor",
      details: error.message
    });
  }
});

/**
 * GET /discord/status/:integrationId
 * Obtiene el estado de una integración de Discord
 */
router.get("/status/:integrationId", checkAuth, async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    const { integrationId } = req.params;

    if (!userId || !integrationId) {
      return res.status(400).json({
        error: "Faltan parámetros requeridos"
      });
    }

    const integration = await Integration.findOne({
      _id: integrationId,
      userId: new Types.ObjectId(userId),
      provider: "discord"
    });

    if (!integration) {
      return res.status(404).json({ error: "Integración no encontrada" });
    }

    res.json({
      integration: {
        id: integration._id,
        provider: integration.provider,
        name: integration.name,
        status: integration.status,
        externalId: integration.externalId,
        meta: integration.meta,
        createdAt: integration.createdAt,
        updatedAt: integration.updatedAt
      }
    });

  } catch (error: any) {
    logger.error("Error al obtener estado de Discord", {
      userId: req.user?.id,
      integrationId: req.params.integrationId,
      error: error.message
    });

    res.status(500).json({
      error: "Error interno del servidor",
      details: error.message
    });
  }
});

/**
 * DELETE /discord/disconnect/:integrationId
 * Desconecta una integración de Discord
 */
router.delete("/disconnect/:integrationId", checkAuth, async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    const { integrationId } = req.params;

    if (!userId || !integrationId) {
      return res.status(400).json({
        error: "Faltan parámetros requeridos"
      });
    }

    const integration = await Integration.findOneAndDelete({
      _id: integrationId,
      userId: new Types.ObjectId(userId),
      provider: "discord"
    });

    if (!integration) {
      return res.status(404).json({ error: "Integración no encontrada" });
    }

    logger.info("Discord desconectado exitosamente", {
      userId,
      integrationId,
      guildId: integration.externalId
    });

    res.json({
      success: true,
      message: "Discord desconectado exitosamente"
    });

  } catch (error: any) {
    logger.error("Error al desconectar Discord", {
      userId: req.user?.id,
      integrationId: req.params.integrationId,
      error: error.message
    });

    res.status(500).json({
      error: "Error interno del servidor",
      details: error.message
    });
  }
});

/**
 * POST /discord/webhook
 * Webhook para recibir mensajes de Discord
 */
router.post("/webhook", async (req: Request, res: Response) => {
  try {
    const payload = req.body;

    // Discord envía un ping inicial para verificar el webhook
    if (payload.type === 1) { // PING
      return res.json({ type: 1 }); // PONG
    }

    // Procesar mensajes de Discord
    if (payload.type === 0 && payload.data?.content) { // MESSAGE_CREATE
      // Buscar la integración de Discord que corresponde a este servidor
      const integration = await Integration.findOne({
        provider: "discord",
        externalId: payload.data.guild_id || payload.data.channel_id,
        status: "linked"
      });

      if (!integration) {
        logger.warn("Integración de Discord no encontrada para el webhook", {
          guildId: payload.data.guild_id,
          channelId: payload.data.channel_id
        });
        return res.json({ success: false, error: "Integration not found" });
      }

      // Procesar el mensaje usando el servicio de Discord
      const success = await DiscordService.processIncomingMessage(payload, integration);

      if (success) {
        logger.info("Mensaje de Discord procesado exitosamente", {
          messageId: payload.data.id,
          channelId: payload.data.channel_id,
          authorId: payload.data.author?.id,
          integrationId: integration._id
        });
      }
    }

    res.json({ success: true });

  } catch (error: any) {
    logger.error("Error en webhook de Discord", {
      error: error.message,
      body: req.body
    });

    res.status(500).json({
      error: "Error interno del servidor"
    });
  }
});

/**
 * POST /discord/send-message
 * Envía un mensaje a través de Discord
 */
router.post("/send-message", checkAuth, async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    const { integrationId, channelId, content } = req.body;

    if (!userId || !integrationId || !channelId || !content) {
      return res.status(400).json({
        error: "Faltan parámetros requeridos: integrationId, channelId y content"
      });
    }

    // Buscar la integración de Discord
    const integration = await Integration.findOne({
      _id: integrationId,
      userId: new Types.ObjectId(userId),
      provider: "discord",
      status: "linked"
    });

    if (!integration) {
      return res.status(404).json({ error: "Integración de Discord no encontrada" });
    }

    // Enviar el mensaje usando el servicio de Discord
    const success = await DiscordService.sendMessage(integration, channelId, content);

    if (success) {
      logger.info("Mensaje enviado exitosamente a Discord", {
        userId,
        integrationId,
        channelId,
        contentLength: content.length
      });

      res.json({
        success: true,
        message: "Mensaje enviado exitosamente"
      });
    } else {
      res.status(500).json({
        error: "Error al enviar el mensaje a Discord"
      });
    }

  } catch (error: any) {
    logger.error("Error al enviar mensaje a Discord", {
      userId: req.user?.id,
      error: error.message,
      body: req.body
    });

    res.status(500).json({
      error: "Error interno del servidor",
      details: error.message
    });
  }
});

export default router;
