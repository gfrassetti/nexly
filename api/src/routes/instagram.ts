import express, { Request, Response } from "express";
import { Types } from "mongoose";
import { Integration } from "../models/Integration";
import logger from "../utils/logger";
import requireAuth from "../middleware/auth";

const router = express.Router();

// Obtener URL de autorización de Instagram
router.get("/oauth/url", requireAuth, async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: "Usuario no autenticado" });
    }

    const clientId = process.env.INSTAGRAM_CLIENT_ID;
    const redirectUri = process.env.INSTAGRAM_REDIRECT_URI || "http://localhost:3000/dashboard/integrations/connect/instagram/callback";
    
    if (!clientId) {
      return res.status(500).json({ error: "Instagram Client ID no configurado" });
    }

    const scopes = [
      "instagram_basic",
      "instagram_manage_messages",
      "pages_messaging",
      "pages_show_list"
    ].join(",");

    const authUrl = `https://www.facebook.com/v18.0/dialog/oauth?` +
      `client_id=${clientId}&` +
      `redirect_uri=${encodeURIComponent(redirectUri)}&` +
      `scope=${scopes}&` +
      `response_type=code&` +
      `state=${userId}`;

    res.json({ authUrl });
  } catch (error: any) {
    logger.error("Error generando URL de autorización de Instagram", {
      userId: req.user?.id,
      error: error.message
    });
    res.status(500).json({ error: "Error generando URL de autorización" });
  }
});

// Callback de OAuth de Instagram
router.post("/oauth/callback", requireAuth, async (req: Request, res: Response) => {
  try {
    const { code, state } = req.body;
    const userId = req.user?.id;

    if (!userId || userId !== state) {
      return res.status(401).json({ error: "Usuario no autenticado o estado inválido" });
    }

    if (!code) {
      return res.status(400).json({ error: "Código de autorización requerido" });
    }

    // Intercambiar código por token de acceso
    const tokenResponse = await fetch("https://graph.facebook.com/v18.0/oauth/access_token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: process.env.INSTAGRAM_CLIENT_ID!,
        client_secret: process.env.INSTAGRAM_CLIENT_SECRET!,
        redirect_uri: process.env.INSTAGRAM_REDIRECT_URI || "http://localhost:3000/dashboard/integrations/connect/instagram/callback",
        code: code
      })
    });

    const tokenData: any = await tokenResponse.json();

    if (!tokenData.access_token) {
      return res.status(400).json({ error: "Error obteniendo token de acceso" });
    }

    // Obtener información del usuario de Instagram
    const userResponse = await fetch(`https://graph.facebook.com/v18.0/me?access_token=${tokenData.access_token}`);
    const userData: any = await userResponse.json();

    // Crear o actualizar integración de Instagram
    const integration = await Integration.findOneAndUpdate(
      { userId: new Types.ObjectId(userId), provider: "instagram" },
      {
        userId: new Types.ObjectId(userId),
        provider: "instagram",
        externalId: userData.id,
        accessToken: tokenData.access_token,
        name: `Instagram - ${userData.name || userData.username}`,
        status: "linked",
        meta: {
          instagramUserId: userData.id,
          instagramUsername: userData.username,
          instagramName: userData.name,
          accessTokenExpires: tokenData.expires_in ? new Date(Date.now() + tokenData.expires_in * 1000) : undefined
        }
      },
      { upsert: true, new: true }
    );

    logger.info("Instagram integrado exitosamente", {
      userId,
      integrationId: integration._id,
      instagramUserId: userData.id
    });

    res.json({ 
      success: true, 
      message: "Instagram conectado exitosamente",
      integration: {
        id: integration._id,
        name: integration.name,
        status: integration.status
      }
    });

  } catch (error: any) {
    logger.error("Error en callback de Instagram", {
      userId: req.user?.id,
      error: error.message
    });
    res.status(500).json({ error: "Error conectando Instagram", details: error.message });
  }
});

// Obtener conversaciones de Instagram
router.get("/conversations", requireAuth, async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: "Usuario no autenticado" });
    }

    const integration = await Integration.findOne({
      userId: new Types.ObjectId(userId),
      provider: "instagram",
      status: "linked"
    });

    if (!integration) {
      return res.status(404).json({ error: "Instagram no está conectado" });
    }

    // Obtener conversaciones de Instagram
    const conversations = await getInstagramConversations(integration);
    
    res.json({ 
      success: true, 
      conversations: conversations 
    });

  } catch (error: any) {
    logger.error("Error obteniendo conversaciones de Instagram", {
      userId: req.user?.id,
      error: error.message
    });
    res.status(500).json({ error: "Error obteniendo conversaciones", details: error.message });
  }
});

// Obtener mensajes de una conversación específica
router.get("/conversations/:conversationId/messages", requireAuth, async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    const { conversationId } = req.params;
    
    if (!userId) {
      return res.status(401).json({ error: "Usuario no autenticado" });
    }

    const integration = await Integration.findOne({
      userId: new Types.ObjectId(userId),
      provider: "instagram",
      status: "linked"
    });

    if (!integration) {
      return res.status(404).json({ error: "Instagram no está conectado" });
    }

    // Obtener mensajes de la conversación
    const messages = await getInstagramMessages(integration, conversationId);
    
    res.json({ 
      success: true, 
      messages: messages 
    });

  } catch (error: any) {
    logger.error("Error obteniendo mensajes de Instagram", {
      userId: req.user?.id,
      conversationId: req.params.conversationId,
      error: error.message
    });
    res.status(500).json({ error: "Error obteniendo mensajes", details: error.message });
  }
});

// Enviar mensaje a Instagram
router.post("/send-message", requireAuth, async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    const { conversationId, message } = req.body;
    
    if (!userId) {
      return res.status(401).json({ error: "Usuario no autenticado" });
    }

    if (!conversationId || !message) {
      return res.status(400).json({ error: "conversationId y message son requeridos" });
    }

    const integration = await Integration.findOne({
      userId: new Types.ObjectId(userId),
      provider: "instagram",
      status: "linked"
    });

    if (!integration) {
      return res.status(404).json({ error: "Instagram no está conectado" });
    }

    // Enviar mensaje a Instagram
    const result = await sendInstagramMessage(integration, conversationId, message);
    
    if (result.success) {
      res.json({ success: true, message: "Mensaje enviado exitosamente" });
    } else {
      res.status(400).json({ error: result.error });
    }

  } catch (error: any) {
    logger.error("Error enviando mensaje a Instagram", {
      userId: req.user?.id,
      error: error.message
    });
    res.status(500).json({ error: "Error enviando mensaje", details: error.message });
  }
});

// Desconectar Instagram
router.delete("/disconnect", requireAuth, async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: "Usuario no autenticado" });
    }

    const result = await Integration.findOneAndDelete({
      userId: new Types.ObjectId(userId),
      provider: "instagram"
    });

    if (!result) {
      return res.status(404).json({ error: "Instagram no está conectado" });
    }

    logger.info("Instagram desconectado", { userId, integrationId: result._id });

    res.json({ success: true, message: "Instagram desconectado exitosamente" });

  } catch (error: any) {
    logger.error("Error desconectando Instagram", {
      userId: req.user?.id,
      error: error.message
    });
    res.status(500).json({ error: "Error desconectando Instagram", details: error.message });
  }
});

// Funciones auxiliares para Instagram
async function getInstagramConversations(integration: any): Promise<any[]> {
  try {
    const response = await fetch(`https://graph.facebook.com/v18.0/me/conversations?access_token=${integration.accessToken}`);
    const data: any = await response.json();
    
    if (data.data) {
      return data.data.map((conversation: any) => ({
        id: conversation.id,
        contactId: conversation.participants?.data?.[0]?.id || conversation.id,
        contactName: conversation.participants?.data?.[0]?.name || "Usuario de Instagram",
        lastMessage: "Último mensaje no disponible",
        lastMessageTime: new Date().toISOString(),
        unreadCount: 0,
        provider: "instagram",
        instagramConversationId: conversation.id
      }));
    }
    
    return [];
  } catch (error) {
    logger.error("Error obteniendo conversaciones de Instagram", { error });
    return [];
  }
}

async function getInstagramMessages(integration: any, conversationId: string): Promise<any[]> {
  try {
    const response = await fetch(`https://graph.facebook.com/v18.0/${conversationId}/messages?access_token=${integration.accessToken}`);
    const data: any = await response.json();
    
    if (data.data) {
      return data.data.map((message: any) => ({
        id: message.id,
        conversationId: conversationId,
        body: message.message || message.text || "[Mensaje no disponible]",
        direction: message.from?.id === integration.externalId ? "out" : "in",
        timestamp: message.created_time,
        provider: "instagram",
        instagramMessageId: message.id
      }));
    }
    
    return [];
  } catch (error) {
    logger.error("Error obteniendo mensajes de Instagram", { error, conversationId });
    return [];
  }
}

async function sendInstagramMessage(integration: any, conversationId: string, message: string): Promise<{success: boolean, error?: string}> {
  try {
    const response = await fetch(`https://graph.facebook.com/v18.0/${conversationId}/messages`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        message: message,
        access_token: integration.accessToken
      })
    });
    
    const data: any = await response.json();
    
    if (data.id) {
      return { success: true };
    } else {
      return { success: false, error: data.error?.message || "Error enviando mensaje" };
    }
  } catch (error) {
    logger.error("Error enviando mensaje a Instagram", { error, conversationId });
    return { success: false, error: "Error de conexión" };
  }
}

export default router;
