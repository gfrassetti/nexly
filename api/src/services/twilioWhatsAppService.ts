// api/src/services/twilioWhatsAppService.ts
import { Twilio } from 'twilio';
import { config } from '../config';
import logger from '../utils/logger';

// Cliente principal de Twilio (para operaciones administrativas)
const mainClient = new Twilio(config.twilioAccountSid, config.twilioAuthToken);

export interface TwilioWhatsAppMessage {
  to: string;
  body: string;
  from?: string;
}

export interface TwilioWhatsAppResponse {
  success: boolean;
  messageId?: string;
  error?: string;
  sid?: string;
}

/**
 * Enviar mensaje de WhatsApp usando la subcuenta del usuario
 * Crea cliente de Twilio dinámicamente con las credenciales del usuario
 */
export async function sendWhatsAppMessage(
  message: TwilioWhatsAppMessage,
  userId: string
): Promise<TwilioWhatsAppResponse> {
  try {
    logger.info('Sending WhatsApp message via user subaccount', {
      to: message.to,
      body: message.body,
      userId
    });

    // 1. Buscar datos del usuario en la base de datos
    const Integration = require('../models/Integration').default;
    const integration = await Integration.findOne({
      userId,
      provider: "whatsapp",
      status: "linked"
    });

    if (!integration || !integration.meta?.subaccountSid || !integration.meta?.subaccountAuthToken || !integration.meta?.whatsappSenderId) {
      return {
        success: false,
        error: "User WhatsApp integration not found or incomplete. Please complete the setup process."
      };
    }

    // 2. Crear cliente de Twilio para la subcuenta del usuario
    const userClient = new Twilio(
      integration.meta.subaccountSid,
      integration.meta.subaccountAuthToken
    );

    // 3. Enviar mensaje con el Sender ID del usuario
    const fromNumber = `whatsapp:${integration.meta.whatsappSenderId}`;
    const twilioMessage = await userClient.messages.create({
      body: message.body,
      from: fromNumber,
      to: message.to.startsWith('whatsapp:') ? message.to : `whatsapp:${message.to}`,
    });

    logger.info('WhatsApp Business message sent successfully via user subaccount', {
      messageSid: twilioMessage.sid,
      to: message.to,
      from: fromNumber,
      status: twilioMessage.status,
      userId,
      subaccountSid: integration.meta.subaccountSid
    });

    return {
      success: true,
      messageId: twilioMessage.sid,
      sid: twilioMessage.sid
    };

  } catch (error: any) {
    logger.error('Error sending WhatsApp Business message via user subaccount', {
      error: error.message,
      code: error.code,
      moreInfo: error.moreInfo,
      to: message.to,
      userId
    });

    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Generar URL de Embedded Signup de Meta para registro de WhatsApp Business
 * Este es el flujo correcto para registrar números de WhatsApp
 */
export async function generateMetaEmbeddedSignupUrl(
  userId: string,
  businessName?: string
): Promise<{
  success: boolean;
  signupUrl?: string;
  error?: string;
}> {
  try {
    logger.info('Generating Meta Embedded Signup URL for WhatsApp Business', {
      userId,
      businessName
    });

    // URL de Embedded Signup de Meta para WhatsApp Business
    // Este es el flujo oficial para registrar números de WhatsApp
    const baseUrl = 'https://business.facebook.com/whatsapp/embedded-signup';
    
    // Parámetros para el Embedded Signup
    const params = new URLSearchParams({
      // Identificador único para asociar el signup con el usuario
      user_id: userId,
      // URL de callback para cuando se complete el proceso
      callback_url: `${config.apiUrl}/integrations/whatsapp/meta-callback`,
      // Configuración específica para WhatsApp Business
      product: 'whatsapp_business',
      // Nombre del negocio
      business_name: businessName || `Business - ${userId}`,
      // Idioma preferido
      language: 'es'
    });

    const signupUrl = `${baseUrl}?${params.toString()}`;

    logger.info('Meta Embedded Signup URL generated successfully', {
      userId,
      signupUrl,
      callbackUrl: `${config.apiUrl}/integrations/whatsapp/meta-callback`
    });

    return {
      success: true,
      signupUrl
    };

  } catch (error: any) {
    logger.error('Error generating Meta Embedded Signup URL', {
      error: error.message,
      userId,
      stack: error.stack
    });

    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Procesar webhook de mensaje entrante de WhatsApp
 * Esta función debe ser llamada desde el webhook de Twilio
 */
export async function processIncomingWhatsAppMessage(
  payload: any,
  userId?: string
): Promise<{
  success: boolean;
  messageId?: string;
  error?: string;
}> {
  try {
    const { Body, From, To, MessageSid, MessageStatus } = payload;
    
    // Extraer números de teléfono
    const fromNumber = From.replace('whatsapp:', '');
    const toNumber = To.replace('whatsapp:', '');

    logger.info('Processing incoming WhatsApp message from webhook', { 
      from: fromNumber,
      to: toNumber,
      body: Body,
      messageSid: MessageSid,
      status: MessageStatus,
      userId
    });

    // TODO: Implementar lógica para:
    // 1. Encontrar el usuario propietario del número de WhatsApp Business (toNumber)
    // 2. Crear/actualizar contacto (fromNumber)
    // 3. Crear/actualizar conversación
    // 4. Guardar mensaje en la base de datos
    // 5. Actualizar métricas de uso

    logger.info('WhatsApp message processed successfully from webhook', { 
      messageSid: MessageSid, 
      fromNumber, 
      toNumber,
      userId 
    });

    return {
      success: true,
      messageId: MessageSid
    };

  } catch (error: any) {
    logger.error('Error processing incoming WhatsApp message from webhook', {
      error: error.message,
      payload,
      userId,
      stack: error.stack
    });
    
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Obtener métricas de uso de WhatsApp desde la subcuenta del usuario
 * Usa la subcuenta específica para obtener métricas individuales
 */
export async function fetchWhatsAppUsageMetrics(
  userId: string,
  startDate?: Date,
  endDate?: Date
): Promise<{
  success: boolean;
  metrics?: {
    messagesSent: number;
    messagesReceived: number;
    totalCost: number;
    breakdown: any[];
    twilioCost: number;
    metaCost: number;
  };
  error?: string;
}> {
  try {
    logger.info('Fetching WhatsApp usage metrics from user subaccount', {
      userId,
      startDate,
      endDate
    });

    // 1. Buscar datos del usuario en la base de datos
    const Integration = require('../models/Integration').default;
    const integration = await Integration.findOne({
      userId,
      provider: "whatsapp",
      status: "linked"
    });

    if (!integration || !integration.meta?.subaccountSid || !integration.meta?.subaccountAuthToken) {
      return {
        success: false,
        error: "User WhatsApp integration not found or incomplete"
      };
    }

    // 2. Crear cliente de Twilio para la subcuenta del usuario
    const userClient = new Twilio(
      integration.meta.subaccountSid,
      integration.meta.subaccountAuthToken
    );

    // 3. Obtener métricas de uso desde la subcuenta del usuario
    const usage = await userClient.usage.records.list({
      category: 'whatsapp',
      startDate: startDate || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
      endDate: endDate || new Date()
    });

    // Procesar métricas con categorías específicas
    let messagesSent = 0;
    let messagesReceived = 0;
    let totalCost = 0;
    let twilioCost = 0;
    let metaCost = 0;
    const breakdown: any[] = [];

    usage.forEach(record => {
      const cost = parseFloat(record.price?.toString() || '0');
      totalCost += cost;

      // Categorizar costos entre Twilio y Meta
      if (record.category === 'whatsapp' && record.description?.includes('twilio')) {
        twilioCost += cost;
      } else if (record.category === 'whatsapp' && record.description?.includes('meta')) {
        metaCost += cost;
      }

      breakdown.push({
        category: record.category,
        description: record.description,
        count: record.count?.toString() || '0',
        price: record.price?.toString() || '0',
        priceUnit: record.priceUnit,
        subcategory: record.subresourceUris
      });

      // Contar mensajes usando categorías específicas
      if (record.description?.includes('whatsapp-outbound')) {
        messagesSent += parseInt(record.count?.toString() || '0');
      } else if (record.description?.includes('whatsapp-inbound')) {
        messagesReceived += parseInt(record.count?.toString() || '0');
      }
    });

    const metrics = {
      messagesSent,
      messagesReceived,
      totalCost,
      breakdown,
      twilioCost,
      metaCost
    };

    logger.info('WhatsApp usage metrics fetched successfully from user subaccount', {
      userId,
      subaccountSid: integration.meta.subaccountSid,
      messagesSent,
      messagesReceived,
      totalCost,
      twilioCost,
      metaCost
    });

    return {
      success: true,
      metrics
    };

  } catch (error: any) {
    logger.error('Error fetching WhatsApp usage metrics from user subaccount', {
      error: error.message,
      userId
    });

    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Verificar configuración de Twilio WhatsApp Business
 * Verifica la cuenta principal de Twilio
 */
export async function verifyTwilioConfig(): Promise<{ 
  success: boolean; 
  error?: string; 
  accountSid?: string; 
  accountStatus?: string;
}> {
  try {
    if (!config.twilioAccountSid || !config.twilioAuthToken) {
      return { success: false, error: "Twilio Account SID or Auth Token not configured." };
    }

    // Test authentication by fetching account details
    const account = await mainClient.api.v2010.accounts(config.twilioAccountSid).fetch();
    logger.info('Twilio main account verified successfully', { 
      accountSid: account.sid, 
      friendlyName: account.friendlyName,
      status: account.status
    });

    return {
      success: true,
      accountSid: account.sid,
      accountStatus: account.status
    };
  } catch (error: any) {
    logger.error('Error verifying Twilio main account configuration', {
      error: error.message,
      code: error.code,
      moreInfo: error.moreInfo
    });
    return { success: false, error: error.message };
  }
}

/**
 * Verificar configuración de subcuenta de usuario
 * Verifica las credenciales de la subcuenta del usuario
 */
export async function verifyUserSubaccount(
  userId: string
): Promise<{ 
  success: boolean; 
  error?: string; 
  subaccountSid?: string; 
  subaccountStatus?: string;
}> {
  try {
    // 1. Buscar datos del usuario en la base de datos
    const Integration = require('../models/Integration').default;
    const integration = await Integration.findOne({
      userId,
      provider: "whatsapp",
      status: "linked"
    });

    if (!integration || !integration.meta?.subaccountSid || !integration.meta?.subaccountAuthToken) {
      return {
        success: false,
        error: "User WhatsApp integration not found or incomplete"
      };
    }

    // 2. Crear cliente de Twilio para la subcuenta del usuario
    const userClient = new Twilio(
      integration.meta.subaccountSid,
      integration.meta.subaccountAuthToken
    );

    // 3. Verificar la subcuenta
    const subaccount = await userClient.api.v2010.accounts(integration.meta.subaccountSid).fetch();
    
    logger.info('User subaccount verified successfully', {
      userId,
      subaccountSid: subaccount.sid,
      status: subaccount.status,
      friendlyName: subaccount.friendlyName
    });

    return {
      success: true,
      subaccountSid: subaccount.sid,
      subaccountStatus: subaccount.status
    };

  } catch (error: any) {
    logger.error('Error verifying user subaccount', {
      error: error.message,
      userId
    });

    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Generar enlace de onboarding de Twilio para WhatsApp Business
 * Usa la API de remitentes (Senders API) de Twilio para automatizar el proceso
 */
export async function generateTwilioOnboardingLink(userId: string): Promise<{
  success: boolean;
  onboardingUrl?: string;
  error?: string;
}> {
  try {
    logger.info('Generating Twilio WhatsApp onboarding link', { userId });

    // Para WhatsApp Business, Twilio ofrece varias opciones de onboarding:
    // 1. WhatsApp Senders API - para números compatibles (recomendado)
    // 2. WhatsApp Business API - para configuración manual
    
    // Usamos la consola de Twilio para el onboarding de WhatsApp Business
    // que automatiza el proceso de verificación con Meta
    const baseUrl = 'https://console.twilio.com/us1/develop/sms/try-it-out/whatsapp-learn';
    
    // Parámetros para el onboarding usando Senders API
    const params = new URLSearchParams({
      // Identificador único para asociar el onboarding con el usuario
      user_id: userId,
      // URL de callback para cuando se complete el proceso
      callback_url: `${config.apiUrl}/integrations/twilio/onboarding/callback`,
      // Configuración específica para WhatsApp Business API
      product: 'whatsapp_business',
      // Usar Senders API para automatización
      method: 'senders_api',
      // Idioma preferido
      language: 'es',
      // Configuración de región
      region: 'us1'
    });

    const onboardingUrl = `${baseUrl}?${params.toString()}`;

    logger.info('Twilio WhatsApp Business onboarding link generated', {
      userId,
      onboardingUrl,
      callbackUrl: `${config.apiUrl}/integrations/twilio/onboarding/callback`,
      method: 'senders_api'
    });

    return {
      success: true,
      onboardingUrl
    };

  } catch (error: any) {
    logger.error('Error generating Twilio WhatsApp onboarding link', {
      error: error.message,
      userId,
      stack: error.stack
    });

    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Procesar callback de onboarding de Twilio
 */
export async function handleTwilioOnboardingCallback(payload: any): Promise<{
  success: boolean;
  userId?: string;
  whatsappAccountSid?: string;
  phoneNumberId?: string;
  error?: string;
}> {
  try {
    const { 
      user_id, 
      account_sid, 
      phone_number_id, 
      status, 
      error: callbackError 
    } = payload;

    logger.info('Twilio WhatsApp onboarding callback received', {
      userId: user_id,
      accountSid: account_sid,
      phoneNumberId: phone_number_id,
      status,
      error: callbackError
    });

    if (callbackError || status !== 'success') {
      return {
        success: false,
        error: callbackError || 'Onboarding failed',
        userId: user_id
      };
    }

    if (!user_id || !account_sid || !phone_number_id) {
      return {
        success: false,
        error: 'Missing required parameters from Twilio callback'
      };
    }

    logger.info('Twilio WhatsApp onboarding completed successfully', {
      userId: user_id,
      accountSid: account_sid,
      phoneNumberId: phone_number_id
    });

    return {
      success: true,
      userId: user_id,
      whatsappAccountSid: account_sid,
      phoneNumberId: phone_number_id
    };

  } catch (error: any) {
    logger.error('Error handling Twilio WhatsApp onboarding callback', {
      error: error.message,
      payload,
      stack: error.stack
    });

    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Procesar mensajes entrantes de WhatsApp Business via webhook
 */
export async function handleIncomingTwilioWhatsAppWebhook(payload: any) {
  try {
    const { Body, From, To, MessageSid } = payload;
    
    // Extraer números de teléfono
    const fromNumber = From.replace('whatsapp:', '');
    const toNumber = To.replace('whatsapp:', '');

    logger.info('Incoming Twilio WhatsApp Business message', { 
      from: fromNumber,
      to: toNumber,
      body: Body,
      messageSid: MessageSid
    });

    // TODO: Implementar lógica para:
    // 1. Encontrar el usuario propietario del número de WhatsApp Business
    // 2. Crear/actualizar contacto
    // 3. Crear/actualizar conversación
    // 4. Guardar mensaje en la base de datos

    logger.info('WhatsApp Business message processed successfully', { 
      messageSid: MessageSid, 
      fromNumber, 
      toNumber 
    });

    return {
      success: true,
      messageSid: MessageSid,
      from: fromNumber,
      to: toNumber,
      body: Body
    };

  } catch (error: any) {
    logger.error('Error handling incoming Twilio WhatsApp Business webhook', {
      error: error.message,
      payload,
      stack: error.stack
    });
    
    return {
      success: false,
      error: error.message
    };
  }
}
