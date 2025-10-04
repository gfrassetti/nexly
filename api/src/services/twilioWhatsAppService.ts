// api/src/services/twilioWhatsAppService.ts
import twilio from 'twilio';
import { config } from '../config';
import logger from '../utils/logger';

// Inicializar cliente de Twilio
const client = twilio(config.twilioAccountSid, config.twilioAuthToken);

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
 * Enviar mensaje de WhatsApp usando Twilio
 */
export async function sendWhatsAppMessage(
  message: TwilioWhatsAppMessage,
  userPhoneNumberId?: string
): Promise<TwilioWhatsAppResponse> {
  try {
    logger.info('Sending WhatsApp message via Twilio', {
      to: message.to,
      body: message.body,
      from: message.from || config.twilioWhatsAppNumber,
      userPhoneNumberId
    });

    // Usar el número de WhatsApp del usuario si está disponible, sino usar el sandbox
    const fromNumber = userPhoneNumberId ? `whatsapp:${userPhoneNumberId}` : config.twilioWhatsAppNumber;

    const twilioMessage = await client.messages.create({
      body: message.body,
      from: fromNumber,
      to: message.to.startsWith('whatsapp:') ? message.to : `whatsapp:${message.to}`,
    });

    logger.info('WhatsApp message sent successfully via Twilio', {
      messageSid: twilioMessage.sid,
      to: message.to,
      status: twilioMessage.status
    });

    return {
      success: true,
      messageId: twilioMessage.sid,
      sid: twilioMessage.sid
    };

  } catch (error: any) {
    logger.error('Failed to send WhatsApp message via Twilio', {
      error: error.message,
      code: error.code,
      to: message.to,
      body: message.body
    });

    return {
      success: false,
      error: error.message || 'Unknown error occurred'
    };
  }
}

/**
 * Obtener información de un mensaje de Twilio
 */
export async function getMessageStatus(messageSid: string) {
  try {
    const message = await client.messages(messageSid).fetch();
    
    return {
      success: true,
      status: message.status,
      direction: message.direction,
      dateCreated: message.dateCreated,
      dateUpdated: message.dateUpdated,
      errorCode: message.errorCode,
      errorMessage: message.errorMessage
    };
  } catch (error: any) {
    logger.error('Failed to get message status from Twilio', {
      messageSid,
      error: error.message
    });

    return {
      success: false,
      error: error.message || 'Unknown error occurred'
    };
  }
}

/**
 * Verificar configuración de Twilio
 */
export async function verifyTwilioConfig(): Promise<{
  success: boolean;
  error?: string;
  accountSid?: string;
  phoneNumbers?: any[];
}> {
  try {
    // Verificar credenciales básicas
    if (!config.twilioAccountSid || !config.twilioAuthToken) {
      return {
        success: false,
        error: 'Twilio credentials not configured'
      };
    }

    // Obtener información de la cuenta
    const account = await client.api.accounts(config.twilioAccountSid).fetch();
    
    // Obtener números de teléfono disponibles
    const phoneNumbers = await client.incomingPhoneNumbers.list({
      limit: 20
    });

    logger.info('Twilio configuration verified successfully', {
      accountSid: account.sid,
      accountStatus: account.status,
      phoneNumbersCount: phoneNumbers.length
    });

    return {
      success: true,
      accountSid: account.sid,
      phoneNumbers: phoneNumbers.map(phone => ({
        sid: phone.sid,
        phoneNumber: phone.phoneNumber,
        friendlyName: phone.friendlyName
      }))
    };

  } catch (error: any) {
    logger.error('Failed to verify Twilio configuration', {
      error: error.message,
      code: error.code
    });

    return {
      success: false,
      error: error.message || 'Failed to verify Twilio configuration'
    };
  }
}

/**
 * Procesar webhook de Twilio para mensajes entrantes
 */
export function processTwilioWebhook(body: any): {
  success: boolean;
  messageData?: {
    messageSid: string;
    from: string;
    to: string;
    body: string;
    timestamp: string;
    status: string;
  };
  error?: string;
} {
  try {
    logger.info('Processing Twilio webhook', {
      messageSid: body.MessageSid,
      from: body.From,
      to: body.To,
      body: body.Body
    });

    return {
      success: true,
      messageData: {
        messageSid: body.MessageSid,
        from: body.From,
        to: body.To,
        body: body.Body,
        timestamp: new Date().toISOString(),
        status: body.MessageStatus || 'received'
      }
    };

  } catch (error: any) {
    logger.error('Failed to process Twilio webhook', {
      error: error.message,
      body: body
    });

    return {
      success: false,
      error: error.message || 'Failed to process webhook'
    };
  }
}

export default {
  sendWhatsAppMessage,
  getMessageStatus,
  verifyTwilioConfig,
  processTwilioWebhook
};
