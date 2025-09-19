// src/routes/integrations.ts
import { Router, Request, Response } from "express";
import mongoose, { Types } from "mongoose";
import axios from "axios";
import handleAuth from "../middleware/auth";
import { Integration, IntegrationDoc } from "../models/Integration";
import { syncIntegration } from "../services/syncIntegration";
import { config } from "../config";

type AuthRequest = Request & { user?: { id?: string; _id?: string } };

const router = Router();

// Todas requieren JWT excepto las de OAuth
router.use(handleAuth);

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
    
    // URL de autorización de Meta
    const authUrl = `https://www.facebook.com/v19.0/dialog/oauth?` +
      `client_id=${config.metaAppId}&` +
      `redirect_uri=${config.apiUrl}/api/integrations/oauth/whatsapp/callback&` +
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
 * GET /integrations/oauth/whatsapp/callback
 * Callback del OAuth de WhatsApp
 */
router.get("/oauth/whatsapp/callback", async (req: Request, res: Response) => {
  try {
    const { code, state, error } = req.query;

    if (error) {
      return res.redirect(`${config.frontendUrl}/integrations?error=oauth_denied`);
    }

    if (!code || !state) {
      return res.redirect(`${config.frontendUrl}/integrations?error=missing_code`);
    }

    // Extraer userId del state
    const userId = state.toString().split('_')[0];
    if (!userId) {
      return res.redirect(`${config.frontendUrl}/integrations?error=invalid_state`);
    }

    // Intercambiar código por token de acceso
    const tokenResponse = await axios.post(
      'https://graph.facebook.com/v19.0/oauth/access_token',
      {
        client_id: config.metaAppId,
        client_secret: config.metaAppSecret,
        redirect_uri: `${config.apiUrl}/api/integrations/oauth/whatsapp/callback`,
        code: code
      }
    );

    const { access_token } = tokenResponse.data;

    // Obtener información del token (para verificar permisos)
    const tokenInfo = await axios.get(
      `https://graph.facebook.com/v19.0/me`,
      {
        params: { access_token },
        headers: { Authorization: `Bearer ${access_token}` }
      }
    );

    // Obtener WhatsApp Business Account ID
    const wabaResponse = await axios.get(
      `https://graph.facebook.com/v19.0/me/businesses`,
      {
        params: { 
          access_token,
          fields: 'id,name,whatsapp_business_accounts'
        }
      }
    );

    // Por ahora, usamos el primer WABA disponible
    const waba = wabaResponse.data.data?.[0];
    if (!waba) {
      return res.redirect(`${config.frontendUrl}/integrations?error=no_waba_found`);
    }

    // Obtener phone number ID
    const phoneNumbersResponse = await axios.get(
      `https://graph.facebook.com/v19.0/${waba.whatsapp_business_accounts.data[0].id}/phone_numbers`,
      {
        params: { access_token },
        headers: { Authorization: `Bearer ${access_token}` }
      }
    );

    const phoneNumber = phoneNumbersResponse.data.data?.[0];
    if (!phoneNumber) {
      return res.redirect(`${config.frontendUrl}/integrations?error=no_phone_number`);
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

    res.redirect(`${config.frontendUrl}/integrations?success=whatsapp_connected`);
  } catch (err: any) {
    console.error("whatsapp_oauth_callback_failed:", err?.response?.data || err?.message);
    res.redirect(`${config.frontendUrl}/integrations?error=oauth_failed`);
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

export default router;
