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
import { 
  generateMetaEmbeddedSignupUrl,
  processIncomingWhatsAppMessage,
  fetchWhatsAppUsageMetrics,
  verifyTwilioConfig,
  verifyUserWhatsAppIntegration
} from "../services/twilioWhatsAppService";

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
  logger.info("Simple test endpoint hit", { path: req.path, method: req.method });
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
  logger.info("Callback test endpoint hit", { 
    path: req.path, 
    method: req.method,
    query: req.query
  });
  
  res.json({ 
    message: "Callback test funciona",
    timestamp: new Date().toISOString(),
    path: req.path,
    method: req.method,
    query: req.query
  });
});

/**
 * GET /integrations/twilio/onboarding/callback
 * Callback del onboarding de Twilio WhatsApp Business
 * Implementa validación de seguridad y manejo robusto de errores
 */
router.get("/twilio/onboarding/callback", async (req: Request, res: Response) => {
  try {
    const { user_id, account_sid, phone_number_id, status, error, state } = req.query as {
      user_id?: string;
      account_sid?: string;
      phone_number_id?: string;
      status?: string;
      error?: string;
      state?: string;
    };

    logger.info("Twilio WhatsApp Onboarding Callback recibido", { 
      query: req.query,
      hasState: !!state,
      hasUserId: !!user_id
    });

    // Validar parámetros requeridos
    if (error) {
      logIntegrationError(new Error(error), user_id || "unknown", "twilio_whatsapp_onboarding_failed", { 
        error,
        query: req.query 
      });
      return res.redirect(`${config.frontendUrl}/dashboard/integrations?error=twilio_whatsapp_onboarding_failed&details=${encodeURIComponent(error)}`);
    }

    if (!user_id || !account_sid || !phone_number_id) {
      logIntegrationError(new Error("Missing required parameters"), "unknown", "twilio_missing_parameters", { 
        query: req.query 
      });
      return res.redirect(`${config.frontendUrl}/dashboard/integrations?error=twilio_missing_parameters`);
    }

    if (status !== 'success') {
      logIntegrationError(new Error(`Onboarding failed with status: ${status}`), user_id, "twilio_onboarding_failed", { 
        status,
        query: req.query 
      });
      return res.redirect(`${config.frontendUrl}/dashboard/integrations?error=twilio_onboarding_failed&status=${status}`);
    }

    // Validar que el userId sea un ObjectId válido
    if (!mongoose.isValidObjectId(user_id)) {
      logIntegrationError(new Error("Invalid user ID format"), user_id, "twilio_invalid_user_id", { 
        user_id,
        query: req.query 
      });
      return res.redirect(`${config.frontendUrl}/dashboard/integrations?error=twilio_invalid_user_id`);
    }

    // Crear o actualizar integración de WhatsApp
    const integration = await Integration.findOneAndUpdate(
      { userId: user_id, provider: "whatsapp" },
      {
        userId: new Types.ObjectId(user_id),
        provider: "whatsapp",
        externalId: account_sid,
        phoneNumberId: phone_number_id,
        accessToken: "twilio_managed", // Twilio maneja la autenticación
        name: `WhatsApp Business - ${phone_number_id}`,
        status: "linked",
        meta: {
          twilioAccountSid: account_sid,
          onboardingCompleted: true,
          onboardingDate: new Date()
        }
      },
      { upsert: true, new: true }
    );

    if (!integration) {
      logIntegrationError(new Error("Failed to create/update integration"), user_id, "twilio_integration_creation_failed", { 
        query: req.query 
      });
      return res.redirect(`${config.frontendUrl}/dashboard/integrations?error=twilio_integration_creation_failed`);
    }

    // Log successful WhatsApp integration
    logIntegrationSuccess('twilio_whatsapp_onboarding_completed', user_id, {
      integrationId: (integration as any)._id?.toString() || 'unknown',
      whatsappAccountSid: account_sid,
      phoneNumberId: phone_number_id
    });

    logger.info("Twilio WhatsApp Onboarding completado exitosamente", { 
      userId: user_id,
      integrationId: (integration as any)._id?.toString() || 'unknown',
      accountSid: account_sid
    });

    res.redirect(`${config.frontendUrl}/dashboard/integrations?success=whatsapp_connected&provider=twilio`);

  } catch (err: any) {
    const userId = req.query.user_id ? req.query.user_id.toString() : "unknown";
    
    logIntegrationError(err, userId, "twilio_whatsapp_onboarding_callback", { 
      errorResponse: err?.response?.data,
      errorMessage: err?.message,
      errorStatus: err?.response?.status,
      query: req.query
    });
    
    // Determinar el tipo de error específico
    let errorType = "twilio_whatsapp_onboarding_failed";
    if (err?.response?.status === 400) {
      errorType = "twilio_invalid_request";
    } else if (err?.response?.status === 401) {
      errorType = "twilio_unauthorized";
    }
    
    res.redirect(`${config.frontendUrl}/dashboard/integrations?error=${errorType}&details=${encodeURIComponent(err?.message || 'Unknown error')}`);
  }
});

// Middleware de auth para todas las rutas EXCEPTO los callbacks OAuth
router.use((req, res, next) => {
  // Excluir los callbacks OAuth del middleware de autenticación
  // Nota: req.path ya no incluye /integrations porque se monta en app.use("/integrations", ...)
  if (req.path === "/oauth/instagram/callback" ||
      req.path === "/twilio/onboarding/callback" ||
      req.path === "/whatsapp/meta-callback" ||
      req.path === "/whatsapp/webhook" ||
      req.path === "/test-callback" ||
      req.path === "/debug/simple-test" ||
      req.path === "/debug/callback-test" ||
      req.path === "/debug/simulate-callback" ||
      req.path === "/debug/simulate-twilio-callback") {
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
router.get("/", handleAuth, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id || req.user?._id;
    console.log('🔍 Integrations GET - userId extraído:', userId);
    console.log('🔍 Integrations GET - req.user completo:', req.user);
    
    if (!userId) {
      const errorResponse: ApiErrorResponse = { 
        error: "authentication_required",
        message: "Token de autenticación requerido"
      };
      return res.status(401).json(errorResponse);
    }

    console.log('🔍 Integrations GET - Buscando integraciones para userId:', userId);
    const items = await Integration.find({ userId }).lean();
    console.log('🔍 Integrations GET - Integraciones encontradas:', items.length, items);
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
 * Inicia el flujo de conexión de WhatsApp Business usando Twilio Onboarding
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

    // Verificar configuración de Twilio
    if (!config.twilioAccountSid || !config.twilioAuthToken) {
      logIntegrationError(new Error('Twilio not configured'), userId, 'whatsapp_connect_start', {
        hasAccountSid: !!config.twilioAccountSid,
        hasAuthToken: !!config.twilioAuthToken
      });
      
      const errorResponse: ApiErrorResponse = { 
        error: "twilio_not_configured",
        message: "Twilio no está configurado"
      };
      return res.status(500).json(errorResponse);
    }

    // Verificar límites de integraciones
    const limitsCheck = await checkIntegrationLimits(userId);
    if (!limitsCheck.canConnect) {
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

    // Usar servicio importado

    // Generar enlace de Embedded Signup de Meta
    const onboardingResult = await generateMetaEmbeddedSignupUrl(userId);

    if (!onboardingResult.success) {
      logIntegrationError(new Error(onboardingResult.error), userId, 'whatsapp_onboarding_failed', {
        endpoint: req.path,
        method: req.method,
        provider: 'whatsapp_twilio'
      });
      
      const errorResponse: ApiErrorResponse = { 
        error: "onboarding_link_failed",
        message: "Error al generar enlace de onboarding",
        details: onboardingResult.error
      };
      return res.status(500).json(errorResponse);
    }

    // Log WhatsApp connect attempt
    logIntegrationActivity('whatsapp_connect_start', userId, {
      endpoint: req.path,
      method: req.method,
      provider: 'whatsapp_twilio',
      onboardingUrl: onboardingResult.signupUrl
    });

    res.json({ 
      success: true,
      message: "Redirigiendo a Meta para configurar WhatsApp Business",
      signupUrl: onboardingResult.signupUrl,
      instructions: {
        step1: "Se abrirá una ventana emergente de Meta para configurar WhatsApp Business",
        step2: "Inicia sesión en tu cuenta de Meta Business Manager",
        step3: "Crea o selecciona una cuenta de WhatsApp Business (WABA)",
        step4: "Registra y verifica tu número de teléfono con código OTP",
        step5: "Acepta los términos y condiciones y serás redirigido de vuelta a NEXLY"
      }
    });

  } catch (err: any) {
    const userId = req.user?.id || req.user?._id;
    logIntegrationError(err, userId || 'unknown', 'whatsapp_connect_start', {
      endpoint: req.path,
      method: req.method,
      provider: 'whatsapp_twilio',
      errorType: 'connection_initialization_error'
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
 * POST /integrations/whatsapp/credentials
 * Conecta WhatsApp Business usando credenciales de Meta del usuario
 */
router.post("/whatsapp/credentials", async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id || req.user?._id;
    if (!userId) {
      const errorResponse: ApiErrorResponse = { 
        error: "authentication_required",
        message: "Token de autenticación requerido"
      };
      return res.status(401).json(errorResponse);
    }

    const { phoneNumberId, accessToken, phoneNumber } = req.body;

    if (!phoneNumberId || !accessToken) {
      const errorResponse: ApiErrorResponse = { 
        error: "missing_credentials",
        message: "Phone Number ID y Access Token son requeridos"
      };
      return res.status(400).json(errorResponse);
    }

    // Verificar límites de integraciones
    const limitsCheck = await checkIntegrationLimits(userId);
    if (!limitsCheck.canConnect) {
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

    // Crear o actualizar integración
    const integration = await Integration.findOneAndUpdate(
      { userId, provider: "whatsapp" },
      {
        userId: new Types.ObjectId(userId),
        provider: "whatsapp",
        externalId: phoneNumberId,
        phoneNumberId: phoneNumberId,
        accessToken: accessToken,
        name: phoneNumber ? `WhatsApp Business - ${phoneNumber}` : `WhatsApp Business - ${phoneNumberId}`,
        status: "pending"
      },
      { upsert: true, new: true }
    );

    // Sincronizar para obtener metadata
    await syncIntegration(integration);

    // Log successful WhatsApp integration
    logIntegrationSuccess('whatsapp_credentials_connected', userId, {
      integrationId: (integration as any)._id?.toString() || 'unknown',
      phoneNumberId: phoneNumberId,
      phoneNumber: phoneNumber
    });

    res.status(201).json({
      success: true,
      message: "WhatsApp Business conectado exitosamente",
      integration: {
        _id: (integration._id as Types.ObjectId),
        provider: integration.provider,
        name: integration.name,
        status: integration.status,
        phoneNumberId: integration.phoneNumberId
      }
    });

  } catch (err: any) {
    const userId = req.user?.id || req.user?._id;
    logIntegrationError(err, userId || 'unknown', 'whatsapp_credentials_connect', {
      endpoint: req.path,
      method: req.method,
      provider: 'whatsapp_twilio'
    });
    
    const errorResponse: ApiErrorResponse = { 
      error: "whatsapp_connect_failed",
      message: "Error al conectar WhatsApp Business",
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
 * GET /integrations/debug/simulate-twilio-callback
 * Simular el callback de Twilio WhatsApp Onboarding para testing
 */
router.get("/debug/simulate-twilio-callback", async (req: Request, res: Response) => {
  if (config.isProduction) {
    return res.status(404).json({ error: "not_found" });
  }

  console.log("🧪 SIMULANDO CALLBACK Twilio WhatsApp Onboarding:");
  console.log("  - Query params:", req.query);
  
  const { userId, success = 'true', error } = req.query;
  
  if (!userId) {
    return res.status(400).json({ 
      error: "missing_user_id",
      message: "Usa: ?userId=tu_user_id&success=true" 
    });
  }

  if (error || success !== 'true') {
    // Simular error
    const errorType = error || 'twilio_whatsapp_onboarding_failed';
    const redirectUrl = `${config.frontendUrl}/dashboard/integrations?error=${errorType}`;
    console.log("❌ Simulando error de Twilio, redirigiendo a:", redirectUrl);
    res.redirect(redirectUrl);
  } else {
    // Simular éxito - crear integración de prueba
    try {
      const integration = await Integration.findOneAndUpdate(
        { userId, provider: "whatsapp" },
        {
          userId: new Types.ObjectId(userId as string),
          provider: "whatsapp",
          externalId: "test_twilio_account_123",
          phoneNumberId: "test_phone_number_456",
          accessToken: "twilio_managed",
          name: "WhatsApp Business - Test",
          status: "linked",
          meta: {
            twilioAccountSid: "test_twilio_account_123",
            onboardingCompleted: true,
            onboardingDate: new Date(),
            testMode: true
          }
        },
        { upsert: true, new: true }
      );

      // Log successful test integration
      logIntegrationSuccess('twilio_whatsapp_test_onboarding_completed', userId as string, {
        integrationId: (integration as any)._id?.toString() || 'unknown',
        testMode: true
      });

      const redirectUrl = `${config.frontendUrl}/dashboard/integrations?success=whatsapp_connected&provider=twilio`;
      console.log("✅ Simulando éxito de Twilio, redirigiendo a:", redirectUrl);
      res.redirect(redirectUrl);
    } catch (err: any) {
      console.error("Error creating test integration:", err);
      const redirectUrl = `${config.frontendUrl}/dashboard/integrations?error=twilio_test_failed`;
      res.redirect(redirectUrl);
    }
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
      twilioAccountSid: !!config.twilioAccountSid,
      twilioAuthToken: !!config.twilioAuthToken,
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
      simulateInstagramSuccess: `${config.apiUrl}/integrations/debug/simulate-callback?userId=${userId}&provider=instagram&success=true`,
      simulateInstagramError: `${config.apiUrl}/integrations/debug/simulate-callback?userId=${userId}&provider=instagram&success=false&error=oauth_denied`,
      simulateTwilioSuccess: `${config.apiUrl}/integrations/debug/simulate-twilio-callback?userId=${userId}&success=true`,
      simulateTwilioError: `${config.apiUrl}/integrations/debug/simulate-twilio-callback?userId=${userId}&success=false&error=twilio_whatsapp_onboarding_failed`
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
      result.nextSteps.push("❌ Configurar META_APP_ID y META_APP_SECRET para Instagram");
    }
    
    if (!configCheck.twilioAccountSid || !configCheck.twilioAuthToken) {
      result.nextSteps.push("❌ Configurar TWILIO_ACCOUNT_SID y TWILIO_AUTH_TOKEN para WhatsApp");
    }
    
    if (!limitsInfo.canConnect) {
      result.nextSteps.push("❌ Usuario sin suscripción activa o límite alcanzado");
    }

    if (existingIntegrations.length === 0) {
      result.nextSteps.push("🔄 No hay integraciones. Probar conectar Instagram o WhatsApp");
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

// Duplicate Instagram callback removed

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
/* asd */
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

    // Para Telegram, obtener chats reales
    if (provider === "telegram") {
      try {
        // Importar el servicio de Telegram
        const { telegramMTProtoService } = await import("../services/telegramMTProtoService");
        const { TelegramSession } = await import("../models/TelegramSession");

        // Buscar sesión activa de Telegram
        const session = await TelegramSession.findOne({
          userId: new Types.ObjectId(userId),
          isActive: true,
          authState: 'authenticated'
        });

        if (!session || !session.sessionString) {
          return res.json({ conversations: [] });
        }

        // Conectar con Telegram
        const connected = await telegramMTProtoService.connect(userId, session.sessionString);
        if (!connected) {
          return res.json({ conversations: [] });
        }

        // Obtener chats reales
        const chatsResult = await telegramMTProtoService.getChats(userId);
        
        if (!chatsResult.success || !chatsResult.chats) {
          return res.json({ conversations: [] });
        }

        // Convertir chats de Telegram al formato esperado
        const conversations = chatsResult.chats.map((chat, index) => ({
          id: `telegram_${chat.id}`,
          contactId: `telegram_contact_${chat.id}`,
          contactName: chat.title || chat.username || `Chat ${chat.id}`,
          contactPhone: chat.username ? `@${chat.username}` : undefined,
          lastMessage: "Último mensaje no disponible", // TODO: Obtener último mensaje real
          lastMessageTime: new Date().toISOString(),
          unreadCount: 0, // TODO: Implementar conteo de no leídos
          provider: "telegram",
          chatType: chat.type,
          telegramChatId: chat.id,
          telegramUsername: chat.username
        }));

        logger.info('Conversaciones de Telegram obtenidas', { 
          userId, 
          chatCount: conversations.length 
        });

        return res.json({ conversations });
      } catch (telegramError) {
        logger.error('Error obteniendo chats de Telegram', { 
          userId, 
          error: telegramError instanceof Error ? telegramError.message : 'Error desconocido' 
        });
        return res.json({ conversations: [] });
      }
    }

    // Para otras plataformas, devolver conversaciones de ejemplo por ahora
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

    // Si es un chat de Telegram (ID empieza con telegram_)
    if (id.startsWith('telegram_')) {
      try {
        // Extraer el chat ID de Telegram
        const telegramChatId = parseInt(id.replace('telegram_', ''));
        
        // Importar el servicio de Telegram
        const { telegramMTProtoService } = await import("../services/telegramMTProtoService");
        const { TelegramSession } = await import("../models/TelegramSession");

        // Buscar sesión activa de Telegram
        const session = await TelegramSession.findOne({
          userId: new Types.ObjectId(userId),
          isActive: true,
          authState: 'authenticated'
        });

        if (!session || !session.sessionString) {
          return res.json({ messages: [] });
        }

        // Conectar con Telegram
        const connected = await telegramMTProtoService.connect(userId, session.sessionString);
        if (!connected) {
          return res.json({ messages: [] });
        }

        // Obtener mensajes reales del chat
        const messagesResult = await telegramMTProtoService.getMessages(userId, telegramChatId, 50);
        
        if (!messagesResult.success || !messagesResult.messages) {
          return res.json({ messages: [] });
        }

        // Convertir mensajes de Telegram al formato esperado
        const messages = messagesResult.messages.map((msg) => ({
          id: `telegram_msg_${msg.id}`,
          conversationId: id,
          from: msg.isOutgoing ? "business" : "customer",
          to: msg.isOutgoing ? "customer" : "business",
          body: msg.text || "[Mensaje no disponible]",
          timestamp: msg.date.toISOString(),
          status: "delivered",
          telegramMessageId: msg.id,
          telegramFromId: msg.fromId
        }));

        logger.info('Mensajes de Telegram obtenidos', { 
          userId, 
          chatId: telegramChatId,
          messageCount: messages.length 
        });

        return res.json({ messages });
      } catch (telegramError) {
        logger.error('Error obteniendo mensajes de Telegram', { 
          userId, 
          chatId: id,
          error: telegramError instanceof Error ? telegramError.message : 'Error desconocido' 
        });
        return res.json({ messages: [] });
      }
    }

    // Para otras plataformas, devolver mensajes de ejemplo por ahora
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

    // Si es un chat de Telegram (ID empieza con telegram_)
    if (id.startsWith('telegram_')) {
      try {
        // Extraer el chat ID de Telegram
        const telegramChatId = parseInt(id.replace('telegram_', ''));
        
        // Importar el servicio de Telegram
        const { telegramMTProtoService } = await import("../services/telegramMTProtoService");
        const { TelegramSession } = await import("../models/TelegramSession");

        // Buscar sesión activa de Telegram
        const session = await TelegramSession.findOne({
          userId: new Types.ObjectId(userId),
          isActive: true,
          authState: 'authenticated'
        });

        if (!session || !session.sessionString) {
          return res.status(400).json({ error: "telegram_not_connected" });
        }

        // Conectar con Telegram
        const connected = await telegramMTProtoService.connect(userId, session.sessionString);
        if (!connected) {
          return res.status(500).json({ error: "telegram_connection_failed" });
        }

        // Enviar mensaje real a través de Telegram
        const sendResult = await telegramMTProtoService.sendMessage(userId, telegramChatId, message);
        
        if (!sendResult.success) {
          return res.status(500).json({ 
            error: "telegram_send_failed",
            message: sendResult.error 
          });
        }

        logger.info('Mensaje de Telegram enviado', { 
          userId, 
          chatId: telegramChatId,
          messageId: sendResult.messageId 
        });

        return res.json({ 
          success: true, 
          messageId: sendResult.messageId,
          message: "Mensaje enviado exitosamente" 
        });
      } catch (telegramError) {
        logger.error('Error enviando mensaje de Telegram', { 
          userId, 
          chatId: id,
          error: telegramError instanceof Error ? telegramError.message : 'Error desconocido' 
        });
        return res.status(500).json({ 
          error: "telegram_send_failed",
          message: "Error enviando mensaje de Telegram" 
        });
      }
    }

    // Para WhatsApp (lógica existente)
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
 * Envía un mensaje de WhatsApp usando Twilio (sin credenciales de Meta)
 */
router.post("/send-whatsapp", async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id || req.user?._id;
    if (!userId) return res.status(401).json({ error: "no_user_in_token" });

    const { to, message } = req.body;
    
    if (!to || !message) {
      return res.status(400).json({ error: "missing_to_or_message" });
    }

    // Importar el servicio de Twilio
    const { sendWhatsAppMessage } = require('../services/twilioWhatsAppService');

    // Enviar mensaje usando Twilio (sin credenciales de usuario)
    const result = await sendWhatsAppMessage(
      {
        to: to,
        body: message
      },
      undefined // No necesitamos phoneNumberId del usuario para Twilio
    );

    if (result.success) {
      // Importar modelos correctamente
      const ContactModel = require('../models/Contact');
      const ConversationModel = require('../models/Conversation');
      const MessageModel = require('../models/Message');
      const { Types } = require('mongoose');

      // Buscar o crear contacto
      let contact = await ContactModel.findOne({ userId, phoneNumber: to });
      if (!contact) {
        contact = await ContactModel.create({
          userId: new Types.ObjectId(userId),
          phoneNumber: to,
          name: to, // Usar número como nombre por defecto
          provider: 'whatsapp'
        });
      }

      // Buscar o crear conversación
      let conversation = await ConversationModel.findOne({ 
        userId, 
        contactId: contact._id, 
        provider: 'whatsapp' 
      });
      if (!conversation) {
        conversation = await ConversationModel.create({
          userId: new Types.ObjectId(userId),
          contactId: contact._id,
          provider: 'whatsapp',
          lastMessageAt: new Date(),
          unreadCount: 0,
          externalId: `twilio_${to}_${config.twilioWhatsAppNumber}`
        });
      } else {
        (conversation as any).lastMessageAt = new Date();
        await conversation.save();
      }

      // Guardar mensaje en la base de datos
      await MessageModel.create({
        userId: new Types.ObjectId(userId),
        conversationId: conversation._id,
        contactId: contact._id,
        externalId: result.messageId,
        from: config.twilioWhatsAppNumber?.replace('whatsapp:', '') || 'nexly',
        to: to,
        body: message,
        direction: 'outbound',
        status: 'sent',
        timestamp: new Date()
      });

      // Log successful message send
      logIntegrationActivity('whatsapp_message_sent', userId, {
        messageId: result.messageId,
        to: to,
        provider: 'whatsapp_twilio',
        conversationId: conversation._id.toString()
      });

      res.json({ 
        success: true, 
        messageId: result.messageId,
        sid: result.sid,
        timestamp: new Date().toISOString(),
        conversationId: conversation._id
      });
    } else {
      res.status(500).json({ 
        error: "whatsapp_send_failed",
        message: result.error || "Error al enviar mensaje"
      });
    }

  } catch (err: any) {
    const userId = req.user?.id || req.user?._id;
    logIntegrationError(err, userId || 'unknown', 'whatsapp_send_message', {
      provider: 'whatsapp_twilio'
    });
    
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
router.delete("/:id", handleAuth, async (req: AuthRequest, res: Response) => {
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
 * POST /integrations/fix-stripe-radar
 * Endpoint para manejar problemas de Stripe Radar en modo test
 */
router.post("/fix-stripe-radar", async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id || req.user?._id;
    if (!userId) return res.status(401).json({ error: "no_user_in_token" });

    // Buscar suscripciones con estado past_due o unpaid
    const subscriptions = await Subscription.find({
      userId,
      status: { $in: ['past_due', 'unpaid'] }
    });

    if (subscriptions.length === 0) {
      return res.json({
        success: true,
        message: "No hay suscripciones con problemas de pago"
      });
    }

    // Actualizar suscripciones a estado activo (solo en modo test)
    if (config.isDevelopment || config.nodeEnv === 'development') {
      await Promise.all(subscriptions.map(sub => 
        Subscription.findByIdAndUpdate(sub._id, {
          status: 'active',
          lastPaymentAttempt: new Date()
        })
      ));

      res.json({
        success: true,
        message: "Suscripciones actualizadas a estado activo (modo test)",
        subscriptionsFixed: subscriptions.length
      });
    } else {
      res.status(400).json({
        success: false,
        message: "Esta función solo está disponible en modo desarrollo"
      });
    }

  } catch (error: any) {
    console.error("Error fixing Stripe Radar issue:", error);
    res.status(500).json({
      success: false,
      error: "Error al arreglar problema de Stripe Radar",
      details: error.message
    });
  }
});

/**
 * GET /integrations/twilio/test
 * Endpoint de prueba para verificar configuración de Twilio
 */
router.get("/twilio/test", async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id || req.user?._id;
    if (!userId) return res.status(401).json({ error: "no_user_in_token" });

    // Importar el servicio de Twilio
    const { verifyTwilioConfig, sendWhatsAppMessage } = require('../services/twilioWhatsAppService');

    // Verificar configuración
    const configResult = await verifyTwilioConfig();

    if (!configResult.success) {
      return res.status(500).json({
        success: false,
        error: "Twilio configuration failed",
        details: configResult.error
      });
    }

    // Probar envío de mensaje (solo si se proporciona un número de prueba)
    const { testNumber } = req.query;
    let testResult = null;

    if (testNumber) {
      testResult = await sendWhatsAppMessage({
        to: testNumber as string,
        body: "🧪 Mensaje de prueba desde NEXLY - Twilio WhatsApp funcionando correctamente!"
      });
    }

    res.json({
      success: true,
      message: "Twilio WhatsApp configurado correctamente",
      config: {
        accountSid: configResult.accountSid,
        phoneNumbers: configResult.phoneNumbers,
        sandboxNumber: config.twilioWhatsAppNumber
      },
      test: testResult ? {
        sent: testResult.success,
        messageId: testResult.messageId,
        error: testResult.error
      } : {
        message: "Usa ?testNumber=whatsapp:+tu_numero para probar envío"
      }
    });

  } catch (error: any) {
    console.error("Twilio test failed:", error);
    res.status(500).json({
      success: false,
      error: "Twilio test failed",
      details: error.message
    });
  }
});

/**
 * GET /integrations/whatsapp/meta-callback
 * Callback del Embedded Signup de Meta para WhatsApp Business
 */
router.get("/whatsapp/meta-callback", async (req: Request, res: Response) => {
  try {
    console.log("🔍 Meta WhatsApp Embedded Signup Callback recibido:");
    console.log("  - Query params:", req.query);
    
    const { user_id, whatsapp_sender_id, status, error } = req.query;

    if (error) {
      console.log("❌ Error en Meta WhatsApp Embedded Signup:", error);
      return res.redirect(`${config.frontendUrl}/dashboard/integrations?error=meta_whatsapp_signup_failed&details=${encodeURIComponent(error as string)}`);
    }

    if (!user_id || !whatsapp_sender_id) {
      return res.redirect(`${config.frontendUrl}/dashboard/integrations?error=meta_missing_parameters`);
    }

    if (status !== 'success') {
      return res.redirect(`${config.frontendUrl}/dashboard/integrations?error=meta_signup_failed&status=${status}`);
    }

    const userId = user_id as string;
    const senderId = whatsapp_sender_id as string;

    // Crear o actualizar integración de WhatsApp con el sender_id de Meta
    const integration = await Integration.findOneAndUpdate(
      { userId, provider: "whatsapp" },
      {
        userId: new Types.ObjectId(userId),
        provider: "whatsapp",
        externalId: senderId,
        accessToken: "meta_managed", // Meta maneja la autenticación
        name: `WhatsApp Business - ${senderId}`,
        status: "linked",
        meta: {
          whatsappSenderId: senderId,
          registeredVia: 'meta_embedded_signup',
          registrationDate: new Date(),
          status: 'online',
          // Nota: subaccountSid y subaccountAuthToken deben ser proporcionados
          // por el usuario después del proceso de Meta Embedded Signup
          // a través de un formulario adicional o proceso de configuración
          subaccountSid: null, // Se llenará en un paso posterior
          subaccountAuthToken: null, // Se llenará en un paso posterior
          setupComplete: false // Indica que falta completar la configuración de subcuenta
        }
      },
      { upsert: true, new: true }
    );

    // Log successful WhatsApp integration
    logIntegrationSuccess('meta_whatsapp_signup_completed', userId, {
      integrationId: (integration as any)._id?.toString() || 'unknown',
      whatsappSenderId: senderId
    });

    console.log("✅ Meta WhatsApp Embedded Signup completado exitosamente");
    res.redirect(`${config.frontendUrl}/dashboard/integrations?success=whatsapp_connected&provider=meta`);

  } catch (err: any) {
    const userId = req.query.user_id ? req.query.user_id.toString() : "unknown";
    
    // Log detallado del error
    console.error("❌ Meta WhatsApp Embedded Signup Callback Error:", {
      message: err?.message,
      query: req.query,
      userId: userId
    });
    
    logIntegrationError(err, userId, "meta_whatsapp_signup_callback", { 
      errorMessage: err?.message,
      query: req.query
    });
    
    res.redirect(`${config.frontendUrl}/dashboard/integrations?error=meta_whatsapp_signup_failed`);
  }
});

/**
 * POST /integrations/whatsapp/webhook
 * Webhook para recibir mensajes de WhatsApp desde Twilio
 * Este endpoint debe ser configurado en Twilio para recibir mensajes en tiempo real
 */
router.post("/whatsapp/webhook", async (req: Request, res: Response) => {
  try {
    logger.info("WhatsApp webhook recibido desde Twilio", { 
      messageSid: req.body.MessageSid,
      messageStatus: req.body.MessageStatus
    });
    
    // Procesar el mensaje entrante
    const result = await processIncomingWhatsAppMessage(req.body);

    if (result.success) {
      logger.info("WhatsApp webhook procesado exitosamente", {
        messageSid: req.body.MessageSid
      });
      res.status(200).send();
    } else {
      logger.error("Error procesando mensaje de WhatsApp", {
        messageSid: req.body.MessageSid,
        error: result.error
      });
      res.status(500).send();
    }
  } catch (error: any) {
    logger.error("Error en webhook de WhatsApp", {
      error: error.message,
      messageSid: req.body.MessageSid,
      stack: error.stack
    });
    res.status(500).send('Error processing webhook');
  }
});

/**
 * GET /integrations/whatsapp/usage-metrics
 * Obtener métricas de uso de WhatsApp por usuario
 */
router.get("/whatsapp/usage-metrics", async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id || req.user?._id;
    if (!userId) return res.status(401).json({ error: "no_user_in_token" });

    const { startDate, endDate } = req.query;

    // Verificar que el usuario tenga una integración de WhatsApp
    const integration = await Integration.findOne({
      userId,
      provider: "whatsapp",
      status: "linked"
    });

    if (!integration) {
      return res.status(404).json({
        success: false,
        error: "whatsapp_not_connected",
        message: "WhatsApp integration not found"
      });
    }

    // Usar servicio importado

    // Obtener métricas de uso por usuario
    const result = await fetchWhatsAppUsageMetrics(
      userId,
      startDate ? new Date(startDate as string) : undefined,
      endDate ? new Date(endDate as string) : undefined
    );

    if (!result.success) {
      return res.status(500).json({
        success: false,
        error: "Failed to fetch usage metrics",
        details: result.error
      });
    }

    // Log successful fetch
    logIntegrationActivity('whatsapp_usage_metrics_fetched', userId, {
      messagesSent: result.metrics?.messagesSent || 0,
      messagesReceived: result.metrics?.messagesReceived || 0,
      totalMessages: result.metrics?.totalMessages || 0
    });

    res.json({
      success: true,
      userId,
      period: {
        startDate: startDate || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
        endDate: endDate || new Date()
      },
      metrics: result.metrics
    });

  } catch (error: any) {
    const userId = req.user?.id || req.user?._id;
    logIntegrationError(error, userId || 'unknown', 'whatsapp_usage_metrics', {
      userId
    });

    res.status(500).json({
      success: false,
      error: "Failed to fetch usage metrics",
      details: error.message
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

/**
 * Endpoint temporal para arreglar suscripciones con estado incorrecto
 * Solo disponible en desarrollo
 */
router.post("/fix-subscription-status", async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id || req.user?._id;
    if (!userId) return res.status(401).json({ error: "no_user_in_token" });

    if (!config.isDevelopment) {
      return res.status(400).json({
        success: false,
        message: "Esta función solo está disponible en modo desarrollo"
      });
    }

    const Subscription = require('../models/Subscription').default;
    
    // Buscar suscripciones con stripeSubscriptionId pero status 'trialing'
    const subscriptions = await Subscription.find({
      userId,
      stripeSubscriptionId: { $exists: true, $ne: null },
      status: 'trialing'
    });

    if (subscriptions.length === 0) {
      return res.json({
        success: true,
        message: "No hay suscripciones que necesiten corrección"
      });
    }

    // Actualizar todas las suscripciones encontradas
    const updatePromises = subscriptions.map((sub: any) => 
      Subscription.findByIdAndUpdate(sub._id, { status: 'active' })
    );

    await Promise.all(updatePromises);

    res.json({
      success: true,
      message: `Se corrigieron ${subscriptions.length} suscripciones`,
      subscriptionsFixed: subscriptions.length
    });

  } catch (error: any) {
    console.error("Error fixing subscription status:", error);
    res.status(500).json({
      success: false,
      error: "Error al corregir estado de suscripciones",
      details: error.message
    });
  }
});




// Endpoint eliminado: complete-subaccount-setup
// En el modelo Master, no se necesita configurar subcuentas individuales

export default router;
