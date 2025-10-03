// src/routes/integrations.ts
import { Router, Request, Response } from "express";
import mongoose, { Types } from "mongoose";
import axios from "axios";
import crypto from "crypto";
import handleAuth from "../middleware/auth";
import { Integration, IntegrationDoc } from "../models/Integration";
import { User } from "../models/User";
import Subscription from "../models/Subscription";
import { syncIntegration } from "../services/syncIntegration";
import { config } from "../config";
import logger, { logIntegrationActivity, logIntegrationError, logIntegrationSuccess } from "../utils/logger";
import {
  IntegrationLimits,
  ApiErrorResponse,
  OAuthCallbackQuery,
  IntegrationConfig,
  MetaApiTestResult,
  SystemStatus,
  VerificationResult,
  IntegrationProvider,
  IntegrationStatus
} from "../types/integrations";

type AuthRequest = Request & { user?: { id?: string; _id?: string } };

const router = Router();

// Función helper para generar appsecret_proof
function generateAppSecretProof(accessToken: string): string {
  return crypto
    .createHmac('sha256', config.metaAppSecret)
    .update(accessToken)
    .digest('hex');
}

/**
 * Verifica los límites de integraciones del usuario
 */
async function checkIntegrationLimits(userId: string): Promise<IntegrationLimits> {
  try {
    // Obtener usuario
    const user = await User.findById(userId);
    if (!user) {
      return { 
        canConnect: false, 
        maxIntegrations: 0, 
        currentIntegrations: 0, 
        reason: 'Usuario no encontrado' 
      };
    }

    // Obtener integraciones actuales
    const currentIntegrations = await Integration.countDocuments({ userId, status: 'linked' });
    
    // Verificar si tiene alguna suscripción (activa, cancelada, pausada, etc.)
    const subscription = await Subscription.findOne({ userId });
    
    // Determinar límite máximo
    let maxIntegrations = 0;
    
    if (subscription) {
      // Si tiene suscripción (aunque esté cancelada/pausada), usar límites de suscripción
      maxIntegrations = (subscription as any).getMaxIntegrations();
    } else {
      // Solo si NO tiene ninguna suscripción, verificar período de prueba gratuito
      if (user.isFreeTrialActive()) {
        maxIntegrations = config.freeTrialMaxIntegrations;
      } else {
        // Sin suscripción ni período de prueba = sin integraciones
        maxIntegrations = 0;
      }
    }

    const canConnect = currentIntegrations < maxIntegrations;
    
    // Información del período de prueba gratuito
    const freeTrialInfo = {
      used: user.freeTrialUsed || false,
      canUse: user.canUseFreeTrial(),
      isActive: user.isFreeTrialActive(),
      timeRemaining: user.getFreeTrialTimeRemaining(),
      hoursRemaining: Math.ceil(user.getFreeTrialTimeRemaining() / (1000 * 60 * 60))
    };
    
    return {
      canConnect,
      maxIntegrations,
      currentIntegrations,
      reason: !canConnect ? `Has alcanzado el límite de ${maxIntegrations} integraciones` : undefined,
      freeTrialInfo
    };
  } catch (error: any) {
    logIntegrationError(error, userId, 'check_integration_limits', {
      function: 'checkIntegrationLimits'
    });
    return { 
      canConnect: false, 
      maxIntegrations: 0, 
      currentIntegrations: 0, 
      reason: 'Error interno del servidor' 
    };
  }
}

/**
 * GET /integrations/debug/simple-test
 * Endpoint simple para probar que el router funciona - DEBE IR ANTES del middleware de auth
 */
router.get("/debug/simple-test", (req: Request, res: Response) => {
  console.log("🧪 Simple test endpoint hit");
  res.json({ 
    message: "Router funciona correctamente",
    timestamp: new Date().toISOString(),
    path: req.path,
    method: req.method
  });
});

/**
 * GET /integrations/debug/callback-test
 * Endpoint de prueba para el callback - DEBE IR ANTES del middleware de auth
 */
router.get("/debug/callback-test", (req: Request, res: Response) => {
  console.log("🧪 Callback test endpoint hit");
  console.log("  - Query params:", req.query);
  console.log("  - Code:", req.query.code);
  console.log("  - State:", req.query.state);
  
  res.json({ 
    message: "Callback test funciona",
    timestamp: new Date().toISOString(),
    path: req.path,
    method: req.method,
    query: req.query
  });
});

/**
 * GET /integrations/oauth/whatsapp/callback
 * Callback del OAuth de WhatsApp - DEBE IR ANTES del middleware de auth
 */
router.get("/oauth/whatsapp/callback", async (req: Request, res: Response) => {
  console.log("🚀 INICIO: OAuth Callback recibido");
  console.log("  - Timestamp:", new Date().toISOString());
  console.log("  - URL completa:", req.url);
  console.log("  - Path:", req.path);
  console.log("  - Method:", req.method);
  console.log("  - Headers:", req.headers);
  console.log("  - Query:", req.query);
  
  // Log del inicio del callback
  logger.info('WhatsApp OAuth Callback Started', {
    endpoint: req.path,
    method: req.method,
    query: req.query,
    userAgent: req.get('User-Agent'),
    ip: req.ip || req.connection.remoteAddress,
    timestamp: new Date().toISOString()
  });
  
  // Asegurar que siempre se haga una redirección
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
      console.log("❌ Missing code or state:", { code: !!code, state: !!state });
      return res.redirect(`${config.frontendUrl}/dashboard/integrations?error=missing_code`);
    }

    // Extraer userId del state
    const userId = state.toString().split('_')[0];
    if (!userId) {
      console.log("❌ Invalid state format:", state);
      return res.redirect(`${config.frontendUrl}/dashboard/integrations?error=invalid_state`);
    }

    console.log("✅ Validando configuración Meta:", {
      hasAppId: !!config.metaAppId,
      hasAppSecret: !!config.metaAppSecret,
      apiUrl: config.apiUrl,
      frontendUrl: config.frontendUrl
    });

    // Verificar que las credenciales estén configuradas
    if (!config.metaAppId || !config.metaAppSecret) {
      console.error("❌ Credenciales de Meta no configuradas:", {
        hasAppId: !!config.metaAppId,
        hasAppSecret: !!config.metaAppSecret
      });
      return res.redirect(`${config.frontendUrl}/dashboard/integrations?error=meta_not_configured&errorMessage=${encodeURIComponent('Credenciales de Meta no configuradas')}`);
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
    console.log("🔍 Verificando token...");
    const tokenInfo = await axios.get(
      `https://graph.facebook.com/v19.0/me`,
      {
        params: { 
          access_token,
          appsecret_proof: generateAppSecretProof(access_token)
        }
      }
    );

    console.log("✅ Token verificado:", tokenInfo.data);

    // Obtener WhatsApp Business Account ID
    console.log("🔍 Obteniendo WhatsApp Business Account...");
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

    console.log("✅ WABA response:", wabaResponse.data);

    // Por ahora, usamos el primer WABA disponible
    const waba = wabaResponse.data.data?.[0];
    if (!waba) {
      console.log("❌ No WABA found in response:", wabaResponse.data);
      return res.redirect(`${config.frontendUrl}/dashboard/integrations?error=no_waba_found`);
    }

    console.log("✅ WABA encontrado:", waba);

    // Obtener phone number ID
    console.log("🔍 Obteniendo phone numbers...");
    const phoneNumbersResponse = await axios.get(
      `https://graph.facebook.com/v19.0/${waba.whatsapp_business_accounts.data[0].id}/phone_numbers`,
      {
        params: { 
          access_token,
          appsecret_proof: generateAppSecretProof(access_token)
        }
      }
    );

    console.log("✅ Phone numbers response:", phoneNumbersResponse.data);

    const phoneNumber = phoneNumbersResponse.data.data?.[0];
    if (!phoneNumber) {
      console.log("❌ No phone number found:", phoneNumbersResponse.data);
      return res.redirect(`${config.frontendUrl}/dashboard/integrations?error=no_phone_number`);
    }

    console.log("✅ Phone number encontrado:", phoneNumber);

    // Crear o actualizar integración
    console.log("🔍 Creando/actualizando integración...");
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

    console.log("✅ Integración creada/actualizada:", integration);

    // Sincronizar para obtener metadata
    console.log("🔍 Sincronizando integración...");
    await syncIntegration(integration);

    // Log successful WhatsApp integration
    logIntegrationSuccess('whatsapp_oauth_callback', userId, {
      integrationId: (integration as any)._id?.toString() || 'unknown',
      externalId: waba.whatsapp_business_accounts.data[0].id,
      phoneNumberId: phoneNumber.id,
      phoneNumber: phoneNumber.display_phone_number,
      endpoint: req.path,
      method: req.method,
      provider: 'whatsapp'
    });

    console.log("✅ ÉXITO: Redirigiendo al frontend con éxito");
    const successUrl = `${config.frontendUrl}/dashboard/integrations?success=whatsapp_connected`;
    console.log("🔗 URL de redirección:", successUrl);
    res.redirect(successUrl);
  } catch (err: any) {
    const userId = req.query.state ? req.query.state.toString().split('_')[0] : "unknown";
    
    // Log detallado del error
    console.error("❌ ERROR en callback de WhatsApp:", {
      message: err?.message,
      response: err?.response?.data,
      status: err?.response?.status,
      config: {
        url: err?.config?.url,
        method: err?.config?.method,
        data: err?.config?.data
      },
      query: req.query,
      userId: userId
    });
    
    // Log WhatsApp callback error
    logIntegrationError(err, userId, "whatsapp_oauth_callback", {
      endpoint: req.path,
      method: req.method,
      provider: 'whatsapp',
      errorResponse: err?.response?.data,
      errorMessage: err?.message,
      query: req.query
    });
    
    console.error("whatsapp_oauth_callback_failed:", err?.response?.data || err?.message);
    
    // Determinar el tipo de error específico
    let errorType = "whatsapp_oauth_failed";
    let errorMessage = "Error al conectar WhatsApp";
    
    if (err?.response?.status === 401) {
      errorType = "whatsapp_unauthorized";
      errorMessage = "No autorizado para conectar WhatsApp";
    } else if (err?.response?.status === 400) {
      errorType = "whatsapp_invalid_request";
      errorMessage = "Solicitud inválida a WhatsApp";
    } else if (err?.message?.includes("ENOTFOUND") || err?.message?.includes("ECONNREFUSED")) {
      errorType = "whatsapp_network_error";
      errorMessage = "Error de conexión con WhatsApp";
    } else if (err?.message?.includes("no WABA")) {
      errorType = "whatsapp_no_business_account";
      errorMessage = "No se encontró cuenta de WhatsApp Business";
    } else if (err?.message?.includes("no phone number")) {
      errorType = "whatsapp_no_phone_number";
      errorMessage = "No se encontró número de teléfono en WhatsApp Business";
    }
    
    const redirectUrl = `${config.frontendUrl}/dashboard/integrations?error=${errorType}&errorMessage=${encodeURIComponent(errorMessage)}`;
    console.log("❌ Redirigiendo con error:", redirectUrl);
    res.redirect(redirectUrl);
  }
});

// Middleware de auth para todas las rutas EXCEPTO los callbacks OAuth
router.use((req, res, next) => {
  // Excluir los callbacks OAuth del middleware de autenticación
  // Nota: req.path ya no incluye /integrations porque se monta en app.use("/integrations", ...)
  if (req.path === "/oauth/whatsapp/callback" || 
      req.path === "/oauth/instagram/callback" ||
      req.path === "/test-callback" ||
      req.path === "/debug/simple-test" ||
      req.path === "/debug/callback-test" ||
      req.path === "/debug/simulate-callback") {
    console.log("🔓 Excluyendo de auth:", req.path);
    return next();
  }
  console.log("🔒 Aplicando auth a:", req.path);
  return handleAuth(req, res, next);
});

/**
 * GET /integrations/limits
 * Obtiene información sobre los límites de integraciones del usuario
 */
router.get("/limits", async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id || req.user?._id;
    if (!userId) {
      const errorResponse: ApiErrorResponse = { 
        error: "authentication_required",
        message: "Token de autenticación requerido"
      };
      return res.status(401).json(errorResponse);
    }

    const limitsInfo = await checkIntegrationLimits(userId);
    
    logger.info('Integration limits requested', {
      userId,
      canConnect: limitsInfo.canConnect,
      currentIntegrations: limitsInfo.currentIntegrations,
      maxIntegrations: limitsInfo.maxIntegrations
    });

    res.json(limitsInfo);
  } catch (err: any) {
    const userId = req.user?.id || req.user?._id;
    logIntegrationError(err, userId || 'unknown', 'integration_limits_request', {
      endpoint: req.path,
      method: req.method
    });
    
    const errorResponse: ApiErrorResponse = { 
      error: "integration_limits_failed",
      message: "Error al obtener límites de integraciones",
      details: config.isDevelopment ? err.message : undefined
    };
    res.status(500).json(errorResponse);
  }
});

/**
 * GET /integrations
 * Lista integraciones del usuario autenticado.
 */
router.get("/", async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id || req.user?._id;
    if (!userId) {
      const errorResponse: ApiErrorResponse = { 
        error: "authentication_required",
        message: "Token de autenticación requerido"
      };
      return res.status(401).json(errorResponse);
    }

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

    // Log integration list request
    logIntegrationActivity('list_integrations', userId, {
      count: items.length,
      providers: items.map(item => item.provider),
      endpoint: req.path,
      method: req.method
    });

    res.json(withShape);
  } catch (err: any) {
    const userId = req.user?.id || req.user?._id;
    logIntegrationError(err, userId || 'unknown', 'list_integrations', {
      endpoint: req.path,
      method: req.method,
      errorType: 'database_error'
    });
    
    const errorResponse: ApiErrorResponse = { 
      error: "integrations_list_failed",
      message: "Error al obtener lista de integraciones",
      details: config.isDevelopment ? err.message : undefined
    };
    res.status(500).json(errorResponse);
  }
});

/**
 * GET /integrations/connect/instagram
 * Inicia el flujo OAuth para conectar Instagram Business
 */
router.get("/connect/instagram", async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id || req.user?._id;
    if (!userId) {
      const errorResponse: ApiErrorResponse = { 
        error: "authentication_required",
        message: "Token de autenticación requerido"
      };
      return res.status(401).json(errorResponse);
    }

    // Verificar configuración de Meta
    if (!config.metaAppId || !config.metaAppSecret) {
      logIntegrationError(new Error('Meta App not configured'), userId, 'instagram_connect_start', {
        hasAppId: !!config.metaAppId,
        hasAppSecret: !!config.metaAppSecret
      });
      
      const errorResponse: ApiErrorResponse = { 
        error: "meta_app_not_configured",
        message: "Configuración de Meta incompleta",
        details: "META_APP_ID y META_APP_SECRET son requeridos"
      };
      return res.status(500).json(errorResponse);
    }

    // Verificar límites de integraciones
    const limitsCheck = await checkIntegrationLimits(userId);
    if (!limitsCheck.canConnect) {
      // Verificar si está en período de prueba gratuito
      const user = await User.findById(userId);
      if (user && user.isFreeTrialActive()) {
        const errorResponse: ApiErrorResponse = {
          error: "free_trial_limit_reached",
          message: `Durante el período de prueba gratuito solo puedes conectar ${config.freeTrialMaxIntegrations} integraciones`,
          details: {
            maxIntegrations: config.freeTrialMaxIntegrations,
          currentIntegrations: limitsCheck.currentIntegrations,
            allowedProviders: config.freeTrialAllowedProviders
          }
        };
        return res.status(403).json(errorResponse);
      }
      
      const errorResponse: ApiErrorResponse = {
        error: "integration_limit_exceeded",
        message: limitsCheck.reason,
        details: {
        maxIntegrations: limitsCheck.maxIntegrations,
        currentIntegrations: limitsCheck.currentIntegrations
        }
      };
      return res.status(403).json(errorResponse);
    }

    // Verificar si ya tiene Instagram conectado
    const existing = await Integration.findOne({ 
      userId, 
      provider: "instagram" 
    });

    if (existing && existing.status === "linked") {
      const errorResponse: ApiErrorResponse = { 
        error: "instagram_already_connected",
        message: "Instagram ya está conectado",
        details: { integrationId: existing._id }
      };
      return res.status(409).json(errorResponse);
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

    logger.info('Instagram OAuth flow initiated', {
      userId,
      state,
      redirectUri: `${config.apiUrl}/integrations/oauth/instagram/callback`,
      provider: 'instagram'
    });

    res.json({ 
      authUrl,
      state 
    });
  } catch (err: any) {
    const userId = req.user?.id || req.user?._id;
    logIntegrationError(err, userId || 'unknown', 'instagram_connect_start', {
      endpoint: req.path,
      method: req.method,
      provider: 'instagram',
      errorType: 'oauth_initialization_error'
    });
    
    const errorResponse: ApiErrorResponse = { 
      error: "instagram_connect_failed",
      message: "Error al iniciar conexión con Instagram",
      details: config.isDevelopment ? err.message : undefined
    };
    res.status(500).json(errorResponse);
  }
});

/**
 * GET /integrations/connect/whatsapp
 * Inicia el flujo OAuth para conectar WhatsApp Business
 */
router.get("/connect/whatsapp", async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id || req.user?._id;
    if (!userId) {
      const errorResponse: ApiErrorResponse = { 
        error: "authentication_required",
        message: "Token de autenticación requerido"
      };
      return res.status(401).json(errorResponse);
    }

    if (!config.metaAppId) {
      logIntegrationError(new Error('Meta App ID not configured'), userId, 'whatsapp_connect_start', {
        hasAppId: !!config.metaAppId
      });
      
      const errorResponse: ApiErrorResponse = { 
        error: "meta_app_not_configured",
        message: "META_APP_ID no está configurado"
      };
      return res.status(500).json(errorResponse);
    }

    // Verificar límites de integraciones
    const limitsCheck = await checkIntegrationLimits(userId);
    if (!limitsCheck.canConnect) {
      // Verificar si está en período de prueba gratuito
      const user = await User.findById(userId);
      if (user && user.isFreeTrialActive()) {
        const errorResponse: ApiErrorResponse = {
          error: "free_trial_limit_reached",
          message: `Durante el período de prueba gratuito solo puedes conectar ${config.freeTrialMaxIntegrations} integraciones`,
          details: {
            maxIntegrations: config.freeTrialMaxIntegrations,
          currentIntegrations: limitsCheck.currentIntegrations,
            allowedProviders: config.freeTrialAllowedProviders
          }
        };
        return res.status(403).json(errorResponse);
      }
      
      const errorResponse: ApiErrorResponse = {
        error: "integration_limit_exceeded",
        message: limitsCheck.reason,
        details: {
        maxIntegrations: limitsCheck.maxIntegrations,
        currentIntegrations: limitsCheck.currentIntegrations
        }
      };
      return res.status(403).json(errorResponse);
    }

    // Verificar si ya tiene WhatsApp conectado
    const existing = await Integration.findOne({ 
      userId, 
      provider: "whatsapp" 
    });

    if (existing && existing.status === "linked") {
      const errorResponse: ApiErrorResponse = { 
        error: "whatsapp_already_connected",
        message: "WhatsApp ya está conectado",
        details: { integrationId: existing._id }
      };
      return res.status(409).json(errorResponse);
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

    // Log WhatsApp connect attempt
    logIntegrationActivity('whatsapp_connect_start', userId, {
      endpoint: req.path,
      method: req.method,
      provider: 'whatsapp',
      state: state,
      authUrl: authUrl
    });

    res.json({ 
      authUrl,
      state 
    });
  } catch (err: any) {
    const userId = req.user?.id || req.user?._id;
    logIntegrationError(err, userId || 'unknown', 'whatsapp_connect_start', {
      endpoint: req.path,
      method: req.method,
      provider: 'whatsapp',
      errorType: 'oauth_initialization_error'
    });
    
    const errorResponse: ApiErrorResponse = { 
      error: "whatsapp_connect_failed",
      message: "Error al iniciar conexión con WhatsApp",
      details: config.isDevelopment ? err.message : undefined
    };
    res.status(500).json(errorResponse);
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

    // Log successful Instagram integration
    logIntegrationSuccess('instagram_oauth_callback', userId, {
      integrationId: (integration as any)._id?.toString() || 'unknown',
      externalId: instagramPage.instagram_business_account.id,
      pageName: instagramPage.name
    });

    res.redirect(`${config.frontendUrl}/dashboard/integrations?success=instagram_connected`);
  } catch (err: any) {
    const userId = req.query.state ? req.query.state.toString().split('_')[0] : "unknown";
    
    // Log detallado del error
    console.error("❌ Instagram OAuth Callback Error:", {
      message: err?.message,
      response: err?.response?.data,
      status: err?.response?.status,
      config: {
        url: err?.config?.url,
        method: err?.config?.method,
        data: err?.config?.data
      },
      query: req.query,
      userId: userId
    });
    
    logIntegrationError(err, userId, "instagram_oauth_callback", { 
      errorResponse: err?.response?.data,
      errorMessage: err?.message,
      errorStatus: err?.response?.status,
      errorConfig: err?.config
    });
    
    // Determinar el tipo de error específico
    let errorType = "instagram_oauth_failed";
    if (err?.response?.status === 400) {
      errorType = "instagram_invalid_request";
    } else if (err?.response?.status === 401) {
      errorType = "instagram_unauthorized";
    } else if (err?.response?.data?.error?.code === 190) {
      errorType = "instagram_invalid_token";
    }
    
    res.redirect(`${config.frontendUrl}/dashboard/integrations?error=${errorType}`);
  }
});

/**
 * GET /integrations/debug/meta-config
 * Endpoint para verificar la configuración de Meta (solo en desarrollo)
 */
router.get("/debug/meta-config", async (req: AuthRequest, res: Response) => {
  if (config.isProduction) {
    return res.status(404).json({ error: "not_found" });
  }

  const userId = req.user?.id || req.user?._id;
  if (!userId) return res.status(401).json({ error: "no_user_in_token" });

  const configStatus = {
    metaAppId: {
      configured: !!config.metaAppId,
      value: config.metaAppId ? `${config.metaAppId.substring(0, 4)}...${config.metaAppId.substring(config.metaAppId.length - 4)}` : null
    },
    metaAppSecret: {
      configured: !!config.metaAppSecret,
      value: config.metaAppSecret ? `${config.metaAppSecret.substring(0, 4)}...` : null
    },
    apiUrl: config.apiUrl,
    frontendUrl: config.frontendUrl,
    redirectUri: `${config.apiUrl}/integrations/oauth/instagram/callback`,
    environment: config.nodeEnv
  };

  console.log("🔍 Meta Config Debug:", configStatus);
  res.json(configStatus);
});

/**
 * GET /integrations/debug/test-meta-api
 * Endpoint para probar la conexión directa con Meta API
 */
router.get("/debug/test-meta-api", async (req: AuthRequest, res: Response) => {
  if (config.isProduction) {
    return res.status(404).json({ error: "not_found" });
  }

  const userId = req.user?.id || req.user?._id;
  if (!userId) return res.status(401).json({ error: "no_user_in_token" });

  try {
    // Test 1: Verificar que podemos hacer una llamada básica a Meta API
    console.log("🧪 Testing Meta API connection...");
    
    const testUrl = `https://graph.facebook.com/v19.0/me?access_token=${config.metaAccessToken || 'NO_TOKEN'}`;
    
    let apiTest: {
      success: boolean;
      error: any;
      hasAccessToken: boolean;
      data?: any;
    } = {
      success: false,
      error: null,
      hasAccessToken: !!config.metaAccessToken
    };

    if (config.metaAccessToken) {
      try {
        const response = await axios.get(`https://graph.facebook.com/v19.0/me`, {
          params: { access_token: config.metaAccessToken },
          timeout: 10000
        });
        apiTest.success = true;
        apiTest.data = response.data;
      } catch (error: any) {
        apiTest.error = {
          message: error.message,
          status: error.response?.status,
          data: error.response?.data
        };
      }
    }

    // Test 2: Verificar configuración OAuth
    const oauthConfig = {
      authUrl: `https://www.facebook.com/v19.0/dialog/oauth?client_id=${config.metaAppId}&redirect_uri=${config.apiUrl}/integrations/oauth/instagram/callback&scope=instagram_basic,instagram_manage_messages,pages_show_list,pages_messaging&response_type=code&state=test`,
      redirectUri: `${config.apiUrl}/integrations/oauth/instagram/callback`,
      scopes: ['instagram_basic', 'instagram_manage_messages', 'pages_show_list', 'pages_messaging']
    };

    const result = {
      config: {
        metaAppId: config.metaAppId ? `${config.metaAppId.substring(0, 4)}...` : 'NOT_SET',
        metaAppSecret: config.metaAppSecret ? 'SET' : 'NOT_SET',
        metaAccessToken: config.metaAccessToken ? 'SET' : 'NOT_SET',
        apiUrl: config.apiUrl,
        frontendUrl: config.frontendUrl
      },
      apiTest,
      oauthConfig,
      recommendations: [] as string[]
    };

    // Generar recomendaciones
    if (!config.metaAppId) {
      result.recommendations.push("❌ META_APP_ID no está configurado");
    }
    if (!config.metaAppSecret) {
      result.recommendations.push("❌ META_APP_SECRET no está configurado");
    }
    if (!config.metaAccessToken) {
      result.recommendations.push("⚠️ META_ACCESS_TOKEN no está configurado (opcional para OAuth, pero útil para pruebas)");
    }
    if (!apiTest.success && config.metaAccessToken) {
      result.recommendations.push("❌ No se puede conectar con Meta API - verifica las credenciales");
    }
    if (apiTest.success) {
      result.recommendations.push("✅ Conexión con Meta API exitosa");
    }

    res.json(result);
  } catch (error: any) {
    console.error("Debug test failed:", error);
    res.status(500).json({ 
      error: "debug_test_failed", 
      message: error.message 
    });
  }
});

/**
 * GET /integrations/debug/simulate-callback
 * Simular el callback de OAuth para testing
 */
router.get("/debug/simulate-callback", async (req: Request, res: Response) => {
  if (config.isProduction) {
    return res.status(404).json({ error: "not_found" });
  }

  console.log("🧪 SIMULANDO CALLBACK OAuth:");
  console.log("  - Query params:", req.query);
  
  const { provider = 'instagram', userId, success = 'true' } = req.query;
  
  if (!userId) {
    return res.status(400).json({ 
      error: "missing_user_id",
      message: "Usa: ?userId=tu_user_id&provider=instagram&success=true" 
    });
  }

  if (success === 'true') {
    // Simular éxito
    const redirectUrl = `${config.frontendUrl}/dashboard/integrations?success=${provider}_connected`;
    console.log("✅ Simulando éxito, redirigiendo a:", redirectUrl);
    res.redirect(redirectUrl);
  } else {
    // Simular error
    const errorType = req.query.error || `${provider}_oauth_failed`;
    const redirectUrl = `${config.frontendUrl}/dashboard/integrations?error=${errorType}`;
    console.log("❌ Simulando error, redirigiendo a:", redirectUrl);
    res.redirect(redirectUrl);
  }
});

/**
 * GET /integrations/debug/flow-status
 * Verificar el estado completo del flujo OAuth
 */
router.get("/debug/flow-status", async (req: AuthRequest, res: Response) => {
  if (config.isProduction) {
    return res.status(404).json({ error: "not_found" });
  }

  const userId = req.user?.id || req.user?._id;
  if (!userId) return res.status(401).json({ error: "no_user_in_token" });

  try {
    // 1. Verificar configuración
    const configCheck = {
      metaAppId: !!config.metaAppId,
      metaAppSecret: !!config.metaAppSecret,
      apiUrl: config.apiUrl,
      frontendUrl: config.frontendUrl
    };

    // 2. Verificar integraciones existentes
    const existingIntegrations = await Integration.find({ userId }).lean();

    // 3. Verificar límites
    const limitsInfo = await checkIntegrationLimits(userId);

    // 4. Generar URLs de prueba
    const testUrls = {
      connectInstagram: `${config.apiUrl}/integrations/connect/instagram`,
      connectWhatsApp: `${config.apiUrl}/integrations/connect/whatsapp`,
      simulateSuccess: `${config.apiUrl}/integrations/debug/simulate-callback?userId=${userId}&provider=instagram&success=true`,
      simulateError: `${config.apiUrl}/integrations/debug/simulate-callback?userId=${userId}&provider=instagram&success=false&error=oauth_denied`
    };

    const result = {
      userId,
      timestamp: new Date().toISOString(),
      config: configCheck,
      integrations: {
        existing: existingIntegrations.map(i => ({
          provider: i.provider,
          status: i.status,
          name: i.name,
          createdAt: i.createdAt
        })),
        limits: limitsInfo
      },
      testUrls,
      nextSteps: [] as string[]
    };

    // Generar recomendaciones
    if (!configCheck.metaAppId || !configCheck.metaAppSecret) {
      result.nextSteps.push("❌ Configurar META_APP_ID y META_APP_SECRET");
    }
    
    if (!limitsInfo.canConnect) {
      result.nextSteps.push("❌ Usuario sin suscripción activa o límite alcanzado");
    }

    if (existingIntegrations.length === 0) {
      result.nextSteps.push("🔄 No hay integraciones. Probar conectar Instagram/WhatsApp");
    }

    const pendingIntegrations = existingIntegrations.filter(i => i.status === 'pending');
    if (pendingIntegrations.length > 0) {
      result.nextSteps.push(`⏳ ${pendingIntegrations.length} integraciones pendientes de sincronización`);
    }

    if (result.nextSteps.length === 0) {
      result.nextSteps.push("✅ Todo configurado correctamente");
    }

    res.json(result);
  } catch (error: any) {
    console.error("Flow status check failed:", error);
    res.status(500).json({ 
      error: "flow_status_failed", 
      message: error.message 
    });
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
 * GET /integrations/oauth/instagram/callback
 * Callback del OAuth de Instagram
 */
router.get("/oauth/instagram/callback", async (req: Request, res: Response) => {
  console.log("🚀 INICIO: OAuth Callback recibido");
  console.log("  - Timestamp:", new Date().toISOString());
  console.log("  - URL completa:", req.url);
  console.log("  - Path:", req.path);
  console.log("  - Method:", req.method);
  
  // Log del inicio del callback
  logger.info('WhatsApp OAuth Callback Started', {
    endpoint: req.path,
    method: req.method,
    query: req.query,
    userAgent: req.get('User-Agent'),
    ip: req.ip || req.connection.remoteAddress,
    timestamp: new Date().toISOString()
  });
  
  // Asegurar que siempre se haga una redirección
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
      console.log("❌ Missing code or state:", { code: !!code, state: !!state });
      return res.redirect(`${config.frontendUrl}/dashboard/integrations?error=missing_code`);
    }

    // Extraer userId del state
    const userId = state.toString().split('_')[0];
    if (!userId) {
      console.log("❌ Invalid state format:", state);
      return res.redirect(`${config.frontendUrl}/dashboard/integrations?error=invalid_state`);
    }

    console.log("✅ Validando configuración Meta:", {
      hasAppId: !!config.metaAppId,
      hasAppSecret: !!config.metaAppSecret,
      apiUrl: config.apiUrl,
      frontendUrl: config.frontendUrl
    });

    // Verificar que las credenciales estén configuradas
    if (!config.metaAppId || !config.metaAppSecret) {
      console.error("❌ Credenciales de Meta no configuradas:", {
        hasAppId: !!config.metaAppId,
        hasAppSecret: !!config.metaAppSecret
      });
      return res.redirect(`${config.frontendUrl}/dashboard/integrations?error=meta_not_configured&errorMessage=${encodeURIComponent('Credenciales de Meta no configuradas')}`);
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
    console.log("🔍 Verificando token...");
    const tokenInfo = await axios.get(
      `https://graph.facebook.com/v19.0/me`,
      {
        params: { 
          access_token,
          appsecret_proof: generateAppSecretProof(access_token)
        }
      }
    );

    console.log("✅ Token verificado:", tokenInfo.data);

    // Obtener WhatsApp Business Account ID
    console.log("🔍 Obteniendo WhatsApp Business Account...");
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

    console.log("✅ WABA response:", wabaResponse.data);

    // Por ahora, usamos el primer WABA disponible
    const waba = wabaResponse.data.data?.[0];
    if (!waba) {
      console.log("❌ No WABA found in response:", wabaResponse.data);
      return res.redirect(`${config.frontendUrl}/dashboard/integrations?error=no_waba_found`);
    }

    console.log("✅ WABA encontrado:", waba);

    // Obtener phone number ID
    console.log("🔍 Obteniendo phone numbers...");
    const phoneNumbersResponse = await axios.get(
      `https://graph.facebook.com/v19.0/${waba.whatsapp_business_accounts.data[0].id}/phone_numbers`,
      {
        params: { 
          access_token,
          appsecret_proof: generateAppSecretProof(access_token)
        }
      }
    );

    console.log("✅ Phone numbers response:", phoneNumbersResponse.data);

    const phoneNumber = phoneNumbersResponse.data.data?.[0];
    if (!phoneNumber) {
      console.log("❌ No phone number found:", phoneNumbersResponse.data);
      return res.redirect(`${config.frontendUrl}/dashboard/integrations?error=no_phone_number`);
    }

    console.log("✅ Phone number encontrado:", phoneNumber);

    // Crear o actualizar integración
    console.log("🔍 Creando/actualizando integración...");
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

    console.log("✅ Integración creada/actualizada:", integration);

    // Sincronizar para obtener metadata
    console.log("🔍 Sincronizando integración...");
    await syncIntegration(integration);

    // Log successful WhatsApp integration
    logIntegrationSuccess('whatsapp_oauth_callback', userId, {
      integrationId: (integration as any)._id?.toString() || 'unknown',
      externalId: waba.whatsapp_business_accounts.data[0].id,
      phoneNumberId: phoneNumber.id,
      phoneNumber: phoneNumber.display_phone_number,
      endpoint: req.path,
      method: req.method,
      provider: 'whatsapp'
    });

    console.log("✅ ÉXITO: Redirigiendo al frontend con éxito");
    const successUrl = `${config.frontendUrl}/dashboard/integrations?success=whatsapp_connected`;
    console.log("🔗 URL de redirección:", successUrl);
    res.redirect(successUrl);
  } catch (err: any) {
    const userId = req.query.state ? req.query.state.toString().split('_')[0] : "unknown";
    
    // Log detallado del error
    console.error("❌ ERROR en callback de WhatsApp:", {
      message: err?.message,
      response: err?.response?.data,
      status: err?.response?.status,
      config: {
        url: err?.config?.url,
        method: err?.config?.method,
        data: err?.config?.data
      },
      query: req.query,
      userId: userId
    });
    
    // Log WhatsApp callback error
    logIntegrationError(err, userId, "whatsapp_oauth_callback", {
      endpoint: req.path,
      method: req.method,
      provider: 'whatsapp',
      errorResponse: err?.response?.data,
      errorMessage: err?.message,
      query: req.query
    });
    
    console.error("whatsapp_oauth_callback_failed:", err?.response?.data || err?.message);
    
    // Determinar el tipo de error específico
    let errorType = "whatsapp_oauth_failed";
    let errorMessage = "Error al conectar WhatsApp";
    
    if (err?.response?.status === 401) {
      errorType = "whatsapp_unauthorized";
      errorMessage = "No autorizado para conectar WhatsApp";
    } else if (err?.response?.status === 400) {
      errorType = "whatsapp_invalid_request";
      errorMessage = "Solicitud inválida a WhatsApp";
    } else if (err?.message?.includes("ENOTFOUND") || err?.message?.includes("ECONNREFUSED")) {
      errorType = "whatsapp_network_error";
      errorMessage = "Error de conexión con WhatsApp";
    } else if (err?.message?.includes("no WABA")) {
      errorType = "whatsapp_no_business_account";
      errorMessage = "No se encontró cuenta de WhatsApp Business";
    } else if (err?.message?.includes("no phone number")) {
      errorType = "whatsapp_no_phone_number";
      errorMessage = "No se encontró número de teléfono en WhatsApp Business";
    }
    
    const redirectUrl = `${config.frontendUrl}/dashboard/integrations?error=${errorType}&errorMessage=${encodeURIComponent(errorMessage)}`;
    console.log("❌ Redirigiendo con error:", redirectUrl);
    res.redirect(redirectUrl);
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

    // Log integration deletion
    logIntegrationActivity('delete_integration', userId, {
      integrationId: id,
      provider: deleted.provider,
      externalId: deleted.externalId
    });

    res.json({ ok: true });
  } catch (err: any) {
    const userId = req.user?.id || req.user?._id;
    logIntegrationError(err, userId || 'unknown', 'delete_integration', {
      integrationId: req.params.id
    });
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
