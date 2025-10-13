// api/src/services/twilioWhatsAppService.ts
import { Twilio } from 'twilio';
import { config } from '../config';
import logger from '../utils/logger';

// Cliente Master de Twilio - Cuenta Única para todos los usuarios
// Este es el único cliente que necesitamos (Modelo Master)
const twilioClient = config.twilioAccountSid && config.twilioAuthToken && config.twilioAccountSid.startsWith('AC') 
  ? new Twilio(config.twilioAccountSid, config.twilioAuthToken)
  : null;

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
 * Enviar mensaje de WhatsApp usando la cuenta Master de Twilio
 * Modelo de Cuenta Única - Nexly paga todos los costos
 */
export async function sendWhatsAppMessage(
  message: TwilioWhatsAppMessage,
  userId: string
): Promise<TwilioWhatsAppResponse> {
  try {
    if (!twilioClient) {
      return {
        success: false,
        error: "Twilio client not initialized. Check your TWILIO_ACCOUNT_SID and TWILIO_AUTH_TOKEN."
      };
    }

    logger.info('Sending WhatsApp message via Master account', {
      to: message.to,
      userId,
      bodyLength: message.body.length
    });

    // 1. Buscar la integración del usuario para obtener su número de WhatsApp
    const Integration = require('../models/Integration').default;
    const integration = await Integration.findOne({
      userId,
      provider: "whatsapp",
      status: "linked"
    });

    if (!integration || !integration.meta?.whatsappNumber) {
      return {
        success: false,
        error: "User WhatsApp integration not found or WhatsApp number not configured."
      };
    }

    // 2. Usar el número de WhatsApp del usuario como "from"
    const fromNumber = integration.meta.whatsappNumber.startsWith('whatsapp:') 
      ? integration.meta.whatsappNumber 
      : `whatsapp:${integration.meta.whatsappNumber}`;

    // 3. Enviar mensaje usando el cliente Master
    const twilioMessage = await twilioClient.messages.create({
      body: message.body,
      from: fromNumber,
      to: message.to.startsWith('whatsapp:') ? message.to : `whatsapp:${message.to}`,
    });

    logger.info('WhatsApp message sent successfully via Master account', {
      messageSid: twilioMessage.sid,
      to: message.to,
      from: fromNumber,
      status: twilioMessage.status,
      userId
    });

    return {
      success: true,
      messageId: twilioMessage.sid,
      sid: twilioMessage.sid
    };

  } catch (error: any) {
    logger.error('Error sending WhatsApp message via Master account', {
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
    const { Body, From, To, MessageSid, MessageStatus, NumMedia, MediaUrl0, MediaContentType0 } = payload;
    
    // Extraer números de teléfono
    const fromNumber = From.replace('whatsapp:', '');
    const toNumber = To.replace('whatsapp:', '');

    logger.info('Processing incoming WhatsApp message from webhook', { 
      from: fromNumber,
      to: toNumber,
      body: Body?.substring(0, 50),
      messageSid: MessageSid,
      status: MessageStatus,
      hasMedia: NumMedia > 0,
      userId
    });

    // 1. Encontrar el usuario propietario del número de WhatsApp Business (toNumber)
    const Integration = require('../models/Integration').default;
    const integration = await Integration.findOne({
      provider: "whatsapp",
      status: "linked",
      $or: [
        { 'meta.whatsappNumber': `whatsapp:${toNumber}` },
        { 'meta.whatsappNumber': toNumber },
        { phoneNumberId: toNumber },
        { externalId: toNumber }
      ]
    });

    if (!integration) {
      logger.warn('No integration found for incoming WhatsApp message', {
        toNumber,
        messageSid: MessageSid
      });
      return {
        success: false,
        error: 'No integration found for this WhatsApp number'
      };
    }

    const ownerId = integration.userId;

    // 2. Crear/actualizar contacto (fromNumber)
    const Contact = require('../models/Contact').default;
    let contact = await Contact.findOne({
      userId: ownerId,
      provider: 'whatsapp',
      $or: [
        { phone: fromNumber },
        { externalId: fromNumber }
      ]
    });

    if (!contact) {
      contact = await Contact.create({
        userId: ownerId,
        provider: 'whatsapp',
        phone: fromNumber,
        externalId: fromNumber,
        name: fromNumber, // Se actualizará con el nombre real si está disponible
        integrationId: integration._id.toString(),
        lastInteraction: new Date(),
        lastMessagePreview: Body?.substring(0, 100) || '[Media]',
        unreadCount: 1,
        platformData: {
          waId: fromNumber
        }
      });

      logger.info('New WhatsApp contact created', {
        contactId: contact._id.toString(),
        phone: fromNumber,
        userId: ownerId.toString()
      });
    } else {
      // Actualizar información del contacto
      contact.lastInteraction = new Date();
      contact.lastMessagePreview = Body?.substring(0, 100) || '[Media]';
      contact.unreadCount = (contact.unreadCount || 0) + 1;
      await contact.save();

      logger.info('WhatsApp contact updated', {
        contactId: contact._id.toString(),
        phone: fromNumber,
        unreadCount: contact.unreadCount
      });
    }

    // 3. Crear/actualizar conversación
    const Conversation = require('../models/Conversation').default;
    let conversation = await Conversation.findOne({
      tenantId: ownerId.toString(),
      contactId: contact._id,
      channel: 'whatsapp'
    });

    if (!conversation) {
      conversation = await Conversation.create({
        tenantId: ownerId.toString(),
        contactId: contact._id,
        channel: 'whatsapp',
        status: 'open'
      });

      logger.info('New WhatsApp conversation created', {
        conversationId: conversation._id.toString(),
        contactId: contact._id.toString(),
        userId: ownerId.toString()
      });
    } else {
      // Reabrir conversación si está cerrada
      if (conversation.status === 'closed') {
        conversation.status = 'open';
        await conversation.save();
      }
    }

    // 4. Guardar mensaje en la base de datos
    const Message = require('../models/Message').default;
    const message = await Message.create({
      userId: ownerId,
      contactId: contact._id,
      integrationId: integration._id,
      conversationId: conversation._id,
      direction: 'in',
      body: Body || '[Media]',
      provider: 'whatsapp',
      externalMessageId: MessageSid,
      from: fromNumber,
      senderName: contact.name,
      timestamp: new Date(),
      isRead: false
    });

    logger.info('WhatsApp message saved to database', {
      messageId: message._id.toString(),
      externalMessageId: MessageSid,
      from: fromNumber,
      to: toNumber,
      userId: ownerId.toString()
    });

    // 5. Actualizar métricas de uso (opcional - puede implementarse después)
    // TODO: Implementar sistema de métricas si es necesario

    logger.info('WhatsApp message processed successfully from webhook', { 
      messageSid: MessageSid, 
      fromNumber, 
      toNumber,
      userId: ownerId.toString(),
      messageId: message._id.toString()
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
 * Obtener métricas de uso de WhatsApp desde la base de datos
 * En el modelo Master, las métricas se obtienen de los mensajes guardados en la DB
 * (No desde Twilio, ya que la factura es consolidada)
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
    totalMessages: number;
  };
  error?: string;
}> {
  try {
    logger.info('Fetching WhatsApp usage metrics from database', {
      userId,
      startDate,
      endDate
    });

    // Verificar que el usuario tiene integración de WhatsApp
    const Integration = require('../models/Integration').default;
    const integration = await Integration.findOne({
      userId,
      provider: "whatsapp",
      status: "linked"
    });

    if (!integration) {
      return {
        success: false,
        error: "User WhatsApp integration not found"
      };
    }

    // Obtener métricas desde la base de datos (mensajes guardados)
    const Message = require('../models/Message').default;
    
    const dateFilter: any = {
      userId,
      provider: 'whatsapp'
    };

    if (startDate || endDate) {
      dateFilter.timestamp = {};
      if (startDate) dateFilter.timestamp.$gte = startDate;
      if (endDate) dateFilter.timestamp.$lte = endDate;
    }

    const [messagesSent, messagesReceived] = await Promise.all([
      Message.countDocuments({ ...dateFilter, direction: 'out' }),
      Message.countDocuments({ ...dateFilter, direction: 'in' })
    ]);

    const metrics = {
      messagesSent,
      messagesReceived,
      totalMessages: messagesSent + messagesReceived
    };

    logger.info('WhatsApp usage metrics fetched successfully from database', {
      userId,
      ...metrics
    });

    return {
      success: true,
      metrics
    };

  } catch (error: any) {
    logger.error('Error fetching WhatsApp usage metrics from database', {
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
 * Verificar configuración de Twilio Master Account
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

    if (!twilioClient) {
      return { success: false, error: "Twilio client not initialized. Check your credentials." };
    }

    // Test authentication by fetching account details
    const account = await twilioClient.api.v2010.accounts(config.twilioAccountSid).fetch();
    logger.info('Twilio Master account verified successfully', { 
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
    logger.error('Error verifying Twilio Master account configuration', {
      error: error.message,
      code: error.code,
      moreInfo: error.moreInfo
    });
    return { success: false, error: error.message };
  }
}

/**
 * Verificar que el usuario tiene una integración de WhatsApp configurada
 * En el modelo Master, solo verificamos que la integración existe
 */
export async function verifyUserWhatsAppIntegration(
  userId: string
): Promise<{ 
  success: boolean; 
  error?: string; 
  whatsappNumber?: string;
}> {
  try {
    const Integration = require('../models/Integration').default;
    const integration = await Integration.findOne({
      userId,
      provider: "whatsapp",
      status: "linked"
    });

    if (!integration || !integration.meta?.whatsappNumber) {
      return {
        success: false,
        error: "User WhatsApp integration not found or WhatsApp number not configured"
      };
    }
    
    logger.info('User WhatsApp integration verified', {
      userId,
      whatsappNumber: integration.meta.whatsappNumber
    });

    return {
      success: true,
      whatsappNumber: integration.meta.whatsappNumber
    };

  } catch (error: any) {
    logger.error('Error verifying user WhatsApp integration', {
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
