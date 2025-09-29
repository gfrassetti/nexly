// src/routes/integrations.ts
import { Router, Request, Response } from "express";
import mongoose, { Types } from "mongoose";
import axios from "axios";
import crypto from "crypto";
import handleAuth from "../middleware/auth";
import { Integration, IntegrationDoc } from "../models/Integration";
import { syncIntegration } from "../services/syncIntegration";
import { config } from "../config";

type AuthRequest = Request & { user?: { id?: string; _id?: string } };

const router = Router();

// Función helper para generar appsecret_proof
function generateAppSecretProof(accessToken: string): string {
  return crypto
    .createHmac('sha256', config.metaAppSecret)
    .update(accessToken)
    .digest('hex');
}

// Middleware de auth para todas las rutas EXCEPTO los callbacks OAuth
router.use((req, res, next) => {
  // Excluir los callbacks OAuth del middleware de autenticación
  if (req.path === "/oauth/whatsapp/callback" || 
      req.path === "/oauth/instagram/callback" ||
      req.path === "/test-callback") {
    return next();
  }
  return handleAuth(req, res, next);
});

/**
 * GET /integrations
 * Lista integraciones del usuario autenticado.
 */
router.get("/", async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id || req.user?._id;
    if (!userId) return res.status(401).json({ error: "no_user_in_token" });

    const items = await Integration.find({ userId }).lean();
    const withShape = items.map((it) => ({
      _id: it._id,
      userId: it.userId,
      provider: it.provider,
      externalId: it.externalId,
      phoneNumberId: it.phoneNumberId,
      accessToken: it.accessToken ? "********" : undefined,
      name: it.name,
      status: it.status ?? "pending",
      meta: it.meta ?? {},
      createdAt: it.createdAt,
      updatedAt: it.updatedAt,
    }));
    res.json(withShape);
  } catch (err) {
    console.error("integrations_list_failed:", err);
    res.status(500).json({ error: "integrations_list_failed" });
  }
});

/**
 * GET /integrations/connect/instagram
 * Inicia el flujo OAuth para conectar Instagram Business
 */
router.get("/connect/instagram", async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id || req.user?._id;
    if (!userId) return res.status(401).json({ error: "no_user_in_token" });

    if (!config.metaAppId) {
      return res.status(500).json({ error: "meta_app_not_configured" });
    }

    // Verificar si ya tiene Instagram conectado
    const existing = await Integration.findOne({ 
      userId, 
      provider: "instagram" 
    });

    if (existing && existing.status === "linked") {
      return res.status(409).json({ 
        error: "instagram_already_connected",
        integration: existing._id 
      });
    }

    // Generar state para seguridad OAuth
    const state = `${userId}_${Date.now()}`;
    
    // URL de autorización de Meta - Permisos de Instagram
    const authUrl = `https://www.facebook.com/v19.0/dialog/oauth?` +
      `client_id=${config.metaAppId}&` +
      `redirect_uri=${config.apiUrl}/integrations/oauth/instagram/callback&` +
      `scope=instagram_basic,instagram_manage_messages,pages_show_list,pages_messaging&` +
      `response_type=code&` +
      `state=${state}`;

    res.json({ 
      authUrl,
      state 
    });
  } catch (err) {
    console.error("instagram_connect_failed:", err);
    res.status(500).json({ error: "instagram_connect_failed" });
  }
});

/**
 * GET /integrations/connect/whatsapp
 * Inicia el flujo OAuth para conectar WhatsApp Business
 */
router.get("/connect/whatsapp", async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id || req.user?._id;
    if (!userId) return res.status(401).json({ error: "no_user_in_token" });

    if (!config.metaAppId) {
      return res.status(500).json({ error: "meta_app_not_configured" });
    }

    // Verificar si ya tiene WhatsApp conectado
    const existing = await Integration.findOne({ 
      userId, 
      provider: "whatsapp" 
    });

    if (existing && existing.status === "linked") {
      return res.status(409).json({ 
        error: "whatsapp_already_connected",
        integration: existing._id 
      });
    }

    // Generar state para seguridad OAuth
    const state = `${userId}_${Date.now()}`;
    
    // URL de autorización de Meta - Permisos de WhatsApp Business
    const authUrl = `https://www.facebook.com/v19.0/dialog/oauth?` +
      `client_id=${config.metaAppId}&` +
      `redirect_uri=${config.apiUrl}/integrations/oauth/whatsapp/callback&` +
      `scope=whatsapp_business_management,whatsapp_business_messaging&` +
      `response_type=code&` +
      `state=${state}`;

    res.json({ 
      authUrl,
      state 
    });
  } catch (err) {
    console.error("whatsapp_connect_failed:", err);
    res.status(500).json({ error: "whatsapp_connect_failed" });
  }
});

/**
 * GET /integrations/oauth/instagram/callback
 * Callback del OAuth de Instagram
 */
router.get("/oauth/instagram/callback", async (req: Request, res: Response) => {
  try {
    console.log("🔍 Instagram OAuth Callback recibido:");
    console.log("  - Query params:", req.query);
    
    const { code, state, error } = req.query;

    if (error) {
      console.log("❌ Error en Instagram OAuth:", error);
      return res.redirect(`${config.frontendUrl}/dashboard/integrations?error=instagram_oauth_denied`);
    }

    if (!code || !state) {
      return res.redirect(`${config.frontendUrl}/dashboard/integrations?error=instagram_missing_code`);
    }

    // Extraer userId del state
    const userId = state.toString().split('_')[0];
    if (!userId) {
      return res.redirect(`${config.frontendUrl}/dashboard/integrations?error=instagram_invalid_state`);
    }

    // Intercambiar código por token de acceso
    console.log("🔄 Intercambiando código por token de Instagram...");
    const tokenResponse = await axios.post(
      'https://graph.facebook.com/v19.0/oauth/access_token',
      {
        client_id: config.metaAppId,
        client_secret: config.metaAppSecret,
        redirect_uri: `${config.apiUrl}/integrations/oauth/instagram/callback`,
        code: code
      }
    );

    console.log("✅ Token de Instagram recibido:", tokenResponse.data);
    const { access_token } = tokenResponse.data;

    // Obtener información del token
    const tokenInfo = await axios.get(
      `https://graph.facebook.com/v19.0/me`,
      {
        params: { 
          access_token,
          appsecret_proof: generateAppSecretProof(access_token)
        }
      }
    );

    // Obtener páginas de Instagram
    const pagesResponse = await axios.get(
      `https://graph.facebook.com/v19.0/me/accounts`,
      {
        params: { 
          access_token,
          fields: 'id,name,instagram_business_account',
          appsecret_proof: generateAppSecretProof(access_token)
        }
      }
    );

    const instagramPage = pagesResponse.data.data?.find((page: any) => page.instagram_business_account);
    if (!instagramPage) {
      return res.redirect(`${config.frontendUrl}/dashboard/integrations?error=no_instagram_account`);
    }

    // Crear o actualizar integración
    const integration = await Integration.findOneAndUpdate(
      { userId, provider: "instagram" },
      {
        userId: new Types.ObjectId(userId),
        provider: "instagram",
        externalId: instagramPage.instagram_business_account.id,
        accessToken: access_token,
        name: `Instagram Business - ${instagramPage.name}`,
        status: "pending"
      },
      { upsert: true, new: true }
    );

    // Sincronizar para obtener metadata
    await syncIntegration(integration);

    res.redirect(`${config.frontendUrl}/dashboard/integrations?success=instagram_connected`);
  } catch (err: any) {
    console.error("instagram_oauth_callback_failed:", err?.response?.data || err?.message);
    res.redirect(`${config.frontendUrl}/dashboard/integrations?error=instagram_oauth_failed`);
  }
});

/**
 * GET /integrations/test-callback
 * Ruta de prueba para verificar si el routing funciona
 */
router.get("/test-callback", async (req: Request, res: Response) => {
  console.log("🧪 TEST CALLBACK - Ruta de prueba funcionando!");
  console.log("  - URL completa:", req.url);
  console.log("  - Path:", req.path);
  console.log("  - Query params:", req.query);
  
  res.json({
    success: true,
    message: "Test callback funcionando correctamente",
    url: req.url,
    path: req.path,
    query: req.query,
    timestamp: new Date().toISOString()
  });
});

/**
 * GET /integrations/oauth/whatsapp/callback
 * Callback del OAuth de WhatsApp
 */
router.get("/oauth/whatsapp/callback", async (req: Request, res: Response) => {
  try {
    console.log("🔍 OAuth Callback recibido:");
    console.log("  - URL completa:", req.url);
    console.log("  - Path:", req.path);
    console.log("  - Query params:", req.query);
    console.log("  - Code:", req.query.code);
    console.log("  - State:", req.query.state);
    console.log("  - Error:", req.query.error);
    console.log("  - Headers:", req.headers);
    
    const { code, state, error } = req.query;

    if (error) {
      console.log("❌ Error en OAuth:", error);
      return res.redirect(`${config.frontendUrl}/dashboard/integrations?error=oauth_denied`);
    }

    if (!code || !state) {
      return res.redirect(`${config.frontendUrl}/dashboard/integrations?error=missing_code`);
    }

    // Extraer userId del state
    const userId = state.toString().split('_')[0];
    if (!userId) {
      return res.redirect(`${config.frontendUrl}/dashboard/integrations?error=invalid_state`);
    }

    // Intercambiar código por token de acceso
    console.log("🔄 Intercambiando código por token...");
    const tokenResponse = await axios.post(
      'https://graph.facebook.com/v19.0/oauth/access_token',
      {
        client_id: config.metaAppId,
        client_secret: config.metaAppSecret,
        redirect_uri: `${config.apiUrl}/integrations/oauth/whatsapp/callback`,
        code: code
      }
    );

    console.log("✅ Token recibido:", tokenResponse.data);
    const { access_token } = tokenResponse.data;

    // Obtener información del token (para verificar permisos)
    const tokenInfo = await axios.get(
      `https://graph.facebook.com/v19.0/me`,
      {
        params: { 
          access_token,
          appsecret_proof: generateAppSecretProof(access_token)
        },
        headers: { Authorization: `Bearer ${access_token}` }
      }
    );

    // Obtener WhatsApp Business Account ID
    const wabaResponse = await axios.get(
      `https://graph.facebook.com/v19.0/me/businesses`,
      {
        params: { 
          access_token,
          fields: 'id,name,whatsapp_business_accounts',
          appsecret_proof: generateAppSecretProof(access_token)
        }
      }
    );

    // Por ahora, usamos el primer WABA disponible
    const waba = wabaResponse.data.data?.[0];
    if (!waba) {
      return res.redirect(`${config.frontendUrl}/dashboard/integrations?error=no_waba_found`);
    }

    // Obtener phone number ID
    const phoneNumbersResponse = await axios.get(
      `https://graph.facebook.com/v19.0/${waba.whatsapp_business_accounts.data[0].id}/phone_numbers`,
      {
        params: { 
          access_token,
          appsecret_proof: generateAppSecretProof(access_token)
        },
        headers: { Authorization: `Bearer ${access_token}` }
      }
    );

    const phoneNumber = phoneNumbersResponse.data.data?.[0];
    if (!phoneNumber) {
      return res.redirect(`${config.frontendUrl}/dashboard/integrations?error=no_phone_number`);
    }

    // Crear o actualizar integración
    const integration = await Integration.findOneAndUpdate(
      { userId, provider: "whatsapp" },
      {
        userId: new Types.ObjectId(userId),
        provider: "whatsapp",
        externalId: waba.whatsapp_business_accounts.data[0].id,
        phoneNumberId: phoneNumber.id,
        accessToken: access_token,
        name: `WhatsApp Business - ${phoneNumber.display_phone_number}`,
        status: "pending"
      },
      { upsert: true, new: true }
    );

    // Sincronizar para obtener metadata
    await syncIntegration(integration);

    res.redirect(`${config.frontendUrl}/dashboard/integrations?success=whatsapp_connected`);
  } catch (err: any) {
    console.error("whatsapp_oauth_callback_failed:", err?.response?.data || err?.message);
    res.redirect(`${config.frontendUrl}/dashboard/integrations?error=oauth_failed`);
  }
});

/**
 * POST /integrations
 * Crea una integración manual (para casos especiales)
 */
router.post("/", async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id || req.user?._id;
    if (!userId) return res.status(401).json({ error: "no_user_in_token" });

    const { provider, externalId, phoneNumberId, accessToken, name } = req.body || {};
    if (!provider) return res.status(400).json({ error: "missing_provider" });

    // Para WhatsApp, redirigir al flujo OAuth
    if (provider === "whatsapp") {
      return res.status(400).json({ 
        error: "use_oauth_flow",
        message: "Use GET /integrations/connect/whatsapp for WhatsApp integration"
      });
    }

    const doc = await Integration.create({
      userId: new Types.ObjectId(userId),
      provider,
      externalId,
      phoneNumberId,
      accessToken,
      name,
      status: "pending",
    } as Partial<IntegrationDoc>);

    const sync = await syncIntegration(doc);
    const fresh = await Integration.findById(doc._id).lean();

    res.status(201).json({
      _id: fresh?._id,
      userId: fresh?.userId,
      provider: fresh?.provider,
      externalId: fresh?.externalId,
      phoneNumberId: fresh?.phoneNumberId,
      accessToken: fresh?.accessToken ? "********" : undefined,
      name: fresh?.name,
      status: fresh?.status ?? "pending",
      meta: fresh?.meta ?? {},
      createdAt: fresh?.createdAt,
      updatedAt: fresh?.updatedAt,
      sync,
    });
  } catch (err: any) {
    if (err?.code === 11000) {
      return res.status(409).json({ error: "integration_already_exists" });
    }
    console.error("integration_create_failed:", err);
    res.status(500).json({ error: "integration_create_failed" });
  }
});

/**
 * POST /integrations/:id/sync
 * Fuerza re-sincronización de una integración existente.
 */
router.post("/:id/sync", async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id || req.user?._id;
    if (!userId) return res.status(401).json({ error: "no_user_in_token" });

    const { id } = req.params;
    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({ error: "invalid_id" });
    }

    const integration = await Integration.findOne({ _id: id, userId });
    if (!integration) return res.status(404).json({ error: "not_found" });

    const result = await syncIntegration(integration);

    const fresh = await Integration.findById(id).lean();
    res.json({
      _id: fresh?._id,
      userId: fresh?.userId,
      provider: fresh?.provider,
      externalId: fresh?.externalId,
      phoneNumberId: fresh?.phoneNumberId,
      accessToken: fresh?.accessToken ? "********" : undefined,
      name: fresh?.name,
      status: fresh?.status ?? "pending",
      meta: fresh?.meta ?? {},
      createdAt: fresh?.createdAt,
      updatedAt: fresh?.updatedAt,
      sync: result,
    });
  } catch (err) {
    console.error("integration_sync_failed:", err);
    res.status(500).json({ error: "integration_sync_failed" });
  }
});

/**
 * PUT /integrations/:id
 * Actualiza campos editables (ej: name, phoneNumberId, accessToken, externalId)
 * y vuelve a intentar sync.
 */
router.put("/:id", async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id || req.user?._id;
    if (!userId) return res.status(401).json({ error: "no_user_in_token" });

    const { id } = req.params;
    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({ error: "invalid_id" });
    }

    const allowed: Partial<IntegrationDoc> = {};
    const { name, phoneNumberId, accessToken, externalId } = req.body || {};

    if (typeof name === "string") allowed.name = name;
    if (typeof phoneNumberId === "string") allowed.phoneNumberId = phoneNumberId;
    if (typeof accessToken === "string") allowed.accessToken = accessToken;
    if (typeof externalId === "string") allowed.externalId = externalId;

    const updated = await Integration.findOneAndUpdate(
      { _id: id, userId },
      { $set: allowed },
      { new: true }
    );

    if (!updated) return res.status(404).json({ error: "not_found" });

    // re-sync después de actualizar credenciales/ids
    const sync = await syncIntegration(updated);

    const fresh = await Integration.findById(id).lean();
    res.json({
      _id: fresh?._id,
      userId: fresh?.userId,
      provider: fresh?.provider,
      externalId: fresh?.externalId,
      phoneNumberId: fresh?.phoneNumberId,
      accessToken: fresh?.accessToken ? "********" : undefined,
      name: fresh?.name,
      status: fresh?.status ?? "pending",
      meta: fresh?.meta ?? {},
      createdAt: fresh?.createdAt,
      updatedAt: fresh?.updatedAt,
      sync,
    });
  } catch (err: any) {
    if (err?.code === 11000) {
      return res.status(409).json({ error: "integration_already_exists" });
    }
    console.error("integration_update_failed:", err);
    res.status(500).json({ error: "integration_update_failed" });
  }
});

/**
 * GET /integrations/conversations
 * Obtiene las conversaciones de WhatsApp del usuario
 */
router.get("/conversations", async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id || req.user?._id;
    if (!userId) return res.status(401).json({ error: "no_user_in_token" });

    const { provider = "whatsapp" } = req.query;

    // Buscar integraciones del usuario
    const integrations = await Integration.find({ 
      userId, 
      provider,
      status: "linked"
    });

    if (integrations.length === 0) {
      return res.json({ conversations: [] });
    }

    // Por ahora, devolver conversaciones de ejemplo
    // En producción, esto vendría de la API de Meta
    const conversations = [
      {
        id: "conv_1",
        contactId: "contact_1",
        contactName: "Juan Pérez",
        contactPhone: "+5491123456789",
        lastMessage: "Hola, ¿cómo estás?",
        lastMessageTime: new Date().toISOString(),
        unreadCount: 2,
        provider: provider
      },
      {
        id: "conv_2", 
        contactId: "contact_2",
        contactName: "María García",
        contactPhone: "+549876543210",
        lastMessage: "Gracias por la información",
        lastMessageTime: new Date(Date.now() - 3600000).toISOString(),
        unreadCount: 0,
        provider: provider
      }
    ];

    res.json({ conversations });
  } catch (err) {
    console.error("conversations_fetch_failed:", err);
    res.status(500).json({ error: "conversations_fetch_failed" });
  }
});

/**
 * GET /integrations/conversations/:id/messages
 * Obtiene los mensajes de una conversación específica
 */
router.get("/conversations/:id/messages", async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id || req.user?._id;
    if (!userId) return res.status(401).json({ error: "no_user_in_token" });

    const { id } = req.params;

    // Por ahora, devolver mensajes de ejemplo
    // En producción, esto vendría de la API de Meta
    const messages = [
      {
        id: "msg_1",
        conversationId: id,
        from: "customer",
        to: "business",
        body: "Hola, ¿tienen disponibilidad para mañana?",
        timestamp: new Date(Date.now() - 7200000).toISOString(),
        status: "delivered"
      },
      {
        id: "msg_2",
        conversationId: id,
        from: "business", 
        to: "customer",
        body: "¡Hola! Sí, tenemos disponibilidad. ¿A qué hora te conviene?",
        timestamp: new Date(Date.now() - 3600000).toISOString(),
        status: "delivered"
      },
      {
        id: "msg_3",
        conversationId: id,
        from: "customer",
        to: "business", 
        body: "Perfecto, a las 3 PM",
        timestamp: new Date().toISOString(),
        status: "delivered"
      }
    ];

    res.json({ messages });
  } catch (err) {
    console.error("messages_fetch_failed:", err);
    res.status(500).json({ error: "messages_fetch_failed" });
  }
});

/**
 * POST /integrations/conversations/:id/reply
 * Envía una respuesta a una conversación
 */
router.post("/conversations/:id/reply", async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id || req.user?._id;
    if (!userId) return res.status(401).json({ error: "no_user_in_token" });

    const { id } = req.params;
    const { message } = req.body;

    if (!message) {
      return res.status(400).json({ error: "message_required" });
    }

    // Buscar la integración de WhatsApp del usuario
    const integration = await Integration.findOne({
      userId,
      provider: "whatsapp",
      status: "linked"
    });

    if (!integration || !integration.accessToken || !integration.phoneNumberId) {
      return res.status(400).json({ error: "whatsapp_not_connected" });
    }

    // Obtener el número del contacto desde la conversación
    // Por ahora, usar un número de ejemplo
    const toNumber = "+5491123456789"; // En producción, esto vendría de la DB

    // Enviar mensaje a través de la API de Meta
    const response = await axios.post(
      `https://graph.facebook.com/v22.0/${integration.phoneNumberId}/messages`,
      {
        messaging_product: "whatsapp",
        to: toNumber,
        type: "text",
        text: {
          body: message
        }
      },
      {
        headers: {
          'Authorization': `Bearer ${integration.accessToken}`,
          'Content-Type': 'application/json'
        }
      }
    );

    res.json({
      success: true,
      messageId: response.data.messages[0].id,
      timestamp: new Date().toISOString()
    });

  } catch (err: any) {
    console.error("reply_send_failed:", err?.response?.data || err?.message);
    res.status(500).json({ 
      error: "reply_send_failed",
      details: err?.response?.data || err?.message 
    });
  }
});

/**
 * POST /integrations/send-instagram
 * Envía un mensaje de Instagram usando la integración del cliente
 */
router.post("/send-instagram", async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id || req.user?._id;
    if (!userId) return res.status(401).json({ error: "no_user_in_token" });

    const { to, message } = req.body;
    
    if (!to || !message) {
      return res.status(400).json({ error: "missing_to_or_message" });
    }

    // Buscar la integración de Instagram del cliente
    const integration = await Integration.findOne({
      userId,
      provider: "instagram",
      status: "linked"
    });

    if (!integration || !integration.accessToken || !integration.externalId) {
      return res.status(400).json({ 
        error: "instagram_not_connected",
        message: "El cliente debe conectar su Instagram Business primero"
      });
    }

    // Enviar mensaje a través de la API de Instagram
    const response = await axios.post(
      `https://graph.facebook.com/v19.0/${integration.externalId}/messages`,
      {
        recipient: { id: to },
        message: { text: message }
      },
      {
        headers: {
          'Authorization': `Bearer ${integration.accessToken}`,
          'Content-Type': 'application/json'
        }
      }
    );

    res.json({ 
      success: true, 
      messageId: response.data.message_id,
      response: response.data 
    });
  } catch (err: any) {
    console.error("instagram_send_failed:", err?.response?.data || err?.message);
    res.status(500).json({ 
      error: "instagram_send_failed",
      details: err?.response?.data || err?.message 
    });
  }
});

/**
 * POST /integrations/send-whatsapp
 * Envía un mensaje de WhatsApp usando la integración del cliente
 * ARQUITECTURA SaaS: Usa el token del cliente, no el token de sistema
 */
router.post("/send-whatsapp", async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id || req.user?._id;
    if (!userId) return res.status(401).json({ error: "no_user_in_token" });

    const { to, message } = req.body;
    
    if (!to || !message) {
      return res.status(400).json({ error: "missing_to_or_message" });
    }

    // Buscar la integración de WhatsApp del cliente
    const integration = await Integration.findOne({
      userId,
      provider: "whatsapp",
      status: "linked"
    });

    if (!integration || !integration.accessToken || !integration.phoneNumberId) {
      return res.status(400).json({ 
        error: "whatsapp_not_connected",
        message: "El cliente debe conectar su WhatsApp Business primero"
      });
    }

    // Usar el token del cliente (no el token de sistema)
    const response = await axios.post(
      `https://graph.facebook.com/v19.0/${integration.phoneNumberId}/messages`,
      {
        messaging_product: "whatsapp",
        to: to,
        type: "text",
        text: {
          body: message
        }
      },
      {
        headers: {
          'Authorization': `Bearer ${integration.accessToken}`,
          'Content-Type': 'application/json'
        }
      }
    );

    res.json({ 
      success: true, 
      messageId: response.data.messages[0].id,
      response: response.data 
    });
  } catch (err: any) {
    console.error("whatsapp_send_failed:", err?.response?.data || err?.message);
    res.status(500).json({ 
      error: "whatsapp_send_failed",
      details: err?.response?.data || err?.message 
    });
  }
});

/**
 * DELETE /integrations/:id
 * Elimina una integración del usuario.
 */
router.delete("/:id", async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id || req.user?._id;
    if (!userId) return res.status(401).json({ error: "no_user_in_token" });

    const { id } = req.params;
    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({ error: "invalid_id" });
    }

    const deleted = await Integration.findOneAndDelete({ _id: id, userId }).lean();
    if (!deleted) return res.status(404).json({ error: "not_found" });

    res.json({ ok: true });
  } catch (err) {
    console.error("integration_delete_failed:", err);
    res.status(500).json({ error: "integration_delete_failed" });
  }
});

/**
 * GET /integrations/verify-meta-config
 * Verificar configuración de Meta WhatsApp
 */
router.get("/verify-meta-config", async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id || req.user?._id;
    if (!userId) return res.status(401).json({ error: "no_user_in_token" });

    const verification = {
      environment: {
        metaAppId: !!config.metaAppId,
        metaAppSecret: !!config.metaAppSecret,
        metaAccessToken: !!config.metaAccessToken,
        metaPhoneNumberId: !!config.metaPhoneNumberId,
        metaWabaId: !!config.metaWabaId,
        webhookVerifyToken: !!config.webhookVerifyToken,
        apiUrl: !!config.apiUrl,
      },
      webhook: {
        url: `${config.apiUrl}/webhook`,
        token: config.webhookVerifyToken
      },
      metaApi: {
        connected: false,
        phoneNumber: null,
        verifiedName: null,
        error: null
      }
    };

    // Probar conexión con Meta API
    if (config.metaAccessToken && config.metaPhoneNumberId) {
      try {
        const phoneResponse = await axios.get(
          `https://graph.facebook.com/v19.0/${config.metaPhoneNumberId}`,
          {
            params: {
              access_token: config.metaAccessToken,
              fields: 'display_phone_number,verified_name'
            }
          }
        );
        
        verification.metaApi.connected = true;
        verification.metaApi.phoneNumber = phoneResponse.data.display_phone_number;
        verification.metaApi.verifiedName = phoneResponse.data.verified_name;
      } catch (error: any) {
        verification.metaApi.error = error.response?.data?.error?.message || error.message;
      }
    }

    res.json(verification);
  } catch (err) {
    console.error("verify_meta_config_failed:", err);
    res.status(500).json({ error: "verify_meta_config_failed" });
  }
});

/**
 * GET /integrations/webhook-token
 * Obtener el token de verificación del webhook
 */
router.get("/webhook-token", async (req: Request, res: Response) => {
  try {
    res.json({
      webhookVerifyToken: config.webhookVerifyToken,
      webhookUrl: `${config.apiUrl}/webhook`,
      instructions: {
        metaConsole: "Ve a Meta Developer Console → WhatsApp → Configuración",
        webhookSection: "En la sección Webhook, usa estos valores:",
        callbackUrl: `${config.apiUrl}/webhook`,
        verifyToken: config.webhookVerifyToken
      }
    });
  } catch (err) {
    console.error("webhook_token_failed:", err);
    res.status(500).json({ error: "webhook_token_failed" });
  }
});

/**
 * POST /integrations/admin/create-test-phone
 * TAREA ADMINISTRATIVA: Crear número de teléfono de prueba usando token de sistema
 * Solo para administradores - no para clientes
 */
router.post("/admin/create-test-phone", async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id || req.user?._id;
    if (!userId) return res.status(401).json({ error: "no_user_in_token" });

    // Verificar si es administrador (puedes implementar lógica de admin aquí)
    // Por ahora, solo verificar que tenga token de sistema
    if (!config.metaAccessToken || !config.metaWabaId) {
      return res.status(500).json({ 
        error: "system_token_not_configured",
        message: "Token de sistema no configurado para tareas administrativas"
      });
    }

    const { phoneNumber } = req.body;
    
    if (!phoneNumber) {
      return res.status(400).json({ error: "phone_number_required" });
    }

    // Usar token de sistema para crear número de prueba
    const response = await axios.post(
      `https://graph.facebook.com/v19.0/${config.metaWabaId}/phone_numbers`,
      {
        phone_number: phoneNumber,
        verified_name: "Test Business"
      },
      {
        headers: {
          'Authorization': `Bearer ${config.metaAccessToken}`,
          'Content-Type': 'application/json'
        }
      }
    );

    res.json({ 
      success: true, 
      phoneNumberId: response.data.id,
      phoneNumber: response.data.display_phone_number,
      message: "Número de prueba creado exitosamente"
    });
  } catch (err: any) {
    console.error("create_test_phone_failed:", err?.response?.data || err?.message);
    res.status(500).json({ 
      error: "create_test_phone_failed",
      details: err?.response?.data || err?.message 
    });
  }
});

/**
 * GET /integrations/admin/system-status
 * TAREA ADMINISTRATIVA: Verificar estado del sistema usando token de sistema
 */
router.get("/admin/system-status", async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id || req.user?._id;
    if (!userId) return res.status(401).json({ error: "no_user_in_token" });

    // Verificar configuración del token de sistema
    const systemStatus = {
      systemToken: {
        configured: !!config.metaAccessToken,
        wabaId: !!config.metaWabaId,
        phoneNumberId: !!config.metaPhoneNumberId
      },
      systemApi: {
        connected: false,
        wabaInfo: null,
        phoneNumbers: [],
        error: null
      }
    };

    // Probar conexión con token de sistema
    if (config.metaAccessToken && config.metaWabaId) {
      try {
        const wabaResponse = await axios.get(
          `https://graph.facebook.com/v19.0/${config.metaWabaId}`,
          {
            params: {
              access_token: config.metaAccessToken,
              fields: 'id,name,display_phone_number'
            }
          }
        );

        const phoneNumbersResponse = await axios.get(
          `https://graph.facebook.com/v19.0/${config.metaWabaId}/phone_numbers`,
          {
            params: {
              access_token: config.metaAccessToken
            }
          }
        );

        systemStatus.systemApi.connected = true;
        systemStatus.systemApi.wabaInfo = wabaResponse.data;
        systemStatus.systemApi.phoneNumbers = phoneNumbersResponse.data.data;
      } catch (error: any) {
        systemStatus.systemApi.error = error.response?.data?.error?.message || error.message;
      }
    }

    res.json(systemStatus);
  } catch (err) {
    console.error("system_status_failed:", err);
    res.status(500).json({ error: "system_status_failed" });
  }
});

export default router;
