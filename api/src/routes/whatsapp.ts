import { Router, Request, Response } from 'express';
import { authenticateToken } from '../middleware/auth';
import logger from '../utils/logger';
import { config } from '../config';
import { Integration } from '../models/Integration';
import { User } from '../models/User';
import { Twilio } from 'twilio';
import axios from 'axios';

const router = Router();

/**
 * SECURITY: Este endpoint genera la URL de Twilio Embedded Signup.
 * ⚠️ IMPORTANTE: NUNCA expone el AuthToken de Twilio al frontend.
 * 
 * Flujo de seguridad:
 * 1. Frontend → Next.js API Route (/api/whatsapp/create-signup-session)
 * 2. Next.js API Route → Backend Express (/whatsapp/create-signup-session) 
 * 3. Backend genera URL de Twilio (solo URL, sin AuthToken)
 * 4. Backend devuelve URL al frontend
 * 5. Frontend abre pop-up con la URL (sin acceso a AuthToken)
 * 
 * El AuthToken de Twilio SOLO existe en el backend (variables de entorno).
 */
router.post('/create-signup-session', authenticateToken, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'Usuario no autenticado' });
    }

    logger.info('Creating WhatsApp Embedded Signup session with Meta Facebook SDK', {
      userId
    });

    // Verificar que tenemos las configuraciones necesarias para Meta Embedded Signup
    if (!config.metaConfigId) {
      logger.error('META_CONFIG_ID not configured');
      return res.status(500).json({
        success: false,
        error: 'Config ID de Meta faltante. Necesitas obtenerlo de tu Meta App Dashboard.'
      });
    }

    if (!config.twilioPartnerSolutionId) {
      logger.error('TWILIO_PARTNER_SOLUTION_ID not configured');
      return res.status(500).json({
        success: false,
        error: 'Partner Solution ID no configurado. Necesitas completar el Tech Provider Program primero.'
      });
    }

    if (!config.metaAppId) {
      logger.error('META_APP_ID not configured');
      return res.status(500).json({
        success: false,
        error: 'Meta App ID no configurado. Necesitas configurar tu Meta App ID.'
      });
    }

    // Devolver Config ID y Solution ID para usar con Facebook SDK
    // Según documentación de Meta: https://www.twilio.com/docs/whatsapp/isv/tech-provider-program/integration-guide
    logger.info('Returning Meta Embedded Signup configuration', {
      userId,
      hasConfigId: !!config.metaConfigId,
      hasSolutionId: !!config.twilioPartnerSolutionId,
      hasMetaAppId: !!config.metaAppId
    });

    res.json({
      success: true,
      configId: config.metaConfigId, // Config ID de Meta (obtenido del Meta App Dashboard)
      solutionId: config.twilioPartnerSolutionId, // Partner Solution ID de Twilio
      facebookAppId: config.metaAppId, // Meta App ID para inicializar Facebook SDK
      useTwilioNumbers: config.twilioPhoneNumberType === 'sms_capable' // Indicar si usamos números de Twilio
    });

  } catch (error: any) {
    logger.error('Error creating WhatsApp signup session', {
      userId: (req as any).user?.id,
      error: error.message,
      stack: error.stack
    });

    res.status(500).json({
      success: false,
      error: 'Error interno del servidor al crear sesión de registro'
    });
  }
});

/**
 * SECURITY: Crea un subaccount en Twilio para el cliente
 * ⚠️ Esta función SOLO se ejecuta en el BACKEND, nunca desde el frontend.
 * 
 * Cada cliente necesita su propio subaccount que se mapea a un WABA.
 * Un WABA = Un subaccount (regla de Twilio).
 */
async function createTwilioSubaccount(
  customerName: string,
  userId: string
): Promise<{ success: boolean; subaccountSid?: string; authToken?: string; error?: string }> {
  try {
    if (!config.twilioAccountSid || !config.twilioAuthToken) {
      return {
        success: false,
        error: 'Twilio credentials not configured'
      };
    }

    // Usar el cliente de Twilio (Master Account) para crear subaccount
    const masterClient = new Twilio(config.twilioAccountSid, config.twilioAuthToken);

    logger.info('Creating Twilio subaccount for customer', {
      customerName,
      userId
    });

    // Crear subaccount usando la Accounts API
    const account = await masterClient.api.v2010.accounts.create({
      friendlyName: customerName || `Nexly Customer - ${userId}`
    });

    logger.info('Twilio subaccount created successfully', {
      subaccountSid: account.sid,
      friendlyName: account.friendlyName,
      userId
    });

    return {
      success: true,
      subaccountSid: account.sid,
      authToken: account.authToken // AuthToken del subaccount (importante para futuras llamadas)
    };

  } catch (error: any) {
    logger.error('Error creating Twilio subaccount', {
      error: error.message,
      customerName,
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
 * SECURITY: Verifica el status de un WhatsApp Sender usando la Twilio Senders API
 * ⚠️ Esta función SOLO se ejecuta en el BACKEND, nunca desde el frontend.
 * 
 * Hace un GET request al endpoint de la Senders API para obtener el status actual del sender.
 */
async function checkWhatsAppSenderStatus(
  senderSid: string,
  subaccountSid: string,
  subaccountAuthToken: string
): Promise<{ success: boolean; status?: string; error?: string }> {
  try {
    // GET https://messaging.twilio.com/v2/Channels/Senders/{SenderSid}
    // Documentación: https://www.twilio.com/docs/whatsapp/isv/tech-provider-program/integration-guide#register-the-whatsapp-sender
    const response = await axios.get(
      `https://messaging.twilio.com/v2/Channels/Senders/${senderSid}`,
      {
        auth: {
          username: subaccountSid,
          password: subaccountAuthToken
        },
        headers: {
          'Content-Type': 'application/json'
        }
      }
    );

    const senderData = response.data;
    const status = senderData.status || 'UNKNOWN';

    logger.info('Sender status check successful', {
      senderSid,
      status
    });

    return {
      success: true,
      status: status // "CREATING", "ONLINE", "OFFLINE", etc.
    };

  } catch (error: any) {
    logger.error('Error checking sender status', {
      error: error.response?.data?.message || error.message,
      senderSid
    });

    return {
      success: false,
      error: error.response?.data?.message || error.message
    };
  }
}

/**
 * SECURITY: Registra un WhatsApp Sender usando la Twilio Senders API
 * ⚠️ Esta función SOLO se ejecuta en el BACKEND, nunca desde el frontend.
 * 
 * Usa el WABA ID y número de teléfono para registrar el sender en el subaccount.
 */
async function registerWhatsAppSender(
  phoneNumber: string,
  wabaId: string,
  subaccountSid: string,
  subaccountAuthToken: string,
  isFirstSender: boolean = true,
  profileName?: string
): Promise<{ success: boolean; senderId?: string; senderStatus?: string; error?: string }> {
  try {
    if (!subaccountSid || !subaccountAuthToken) {
      return {
        success: false,
        error: 'Subaccount credentials required'
      };
    }

    // Usar el cliente de Twilio del subaccount (NO el master account)
    const subaccountClient = new Twilio(subaccountSid, subaccountAuthToken);
    
    // Normalizar el número de teléfono según documentación de Twilio
    // sender_id debe incluir el prefijo "whatsapp:" (ej: "whatsapp:+15017122661")
    const senderId = phoneNumber.startsWith('whatsapp:') 
      ? phoneNumber 
      : `whatsapp:${phoneNumber}`;

    logger.info('Registering WhatsApp Sender via Senders API', {
      senderId,
      wabaId,
      subaccountSid,
      isFirstSender
    });

    // Configurar webhooks según documentación de Twilio
    const webhookBaseUrl = config.apiUrl || 'http://localhost:4000';
    
    // Preparar datos para la Senders API según documentación oficial
    // https://www.twilio.com/docs/whatsapp/isv/tech-provider-program/integration-guide#register-the-whatsapp-sender
    const senderData: any = {
      sender_id: senderId, // Debe incluir "whatsapp:" prefix
      webhook: {
        callback_url: `${webhookBaseUrl}/twilio-webhook/whatsapp`,
        callback_method: 'POST'
      }
    };

    // Solo incluir waba_id dentro de configuration si es el primer sender
    // Esto mapea el WABA al subaccount
    if (isFirstSender) {
      senderData.configuration = {
        waba_id: wabaId
      };
    }

    // Incluir profile solo si es un número SMS-capable de Twilio
    // profile.name es requerido para números SMS-capables según documentación
    if (profileName && config.twilioPhoneNumberType === 'sms_capable') {
      senderData.profile = {
        name: profileName,
        // Otros campos opcionales según documentación:
        // about, vertical, address, emails, websites, logo_url, description
      };
    }

    // Registrar el sender usando la Senders API oficial de Twilio
    // Endpoint: https://messaging.twilio.com/v2/Channels/Senders
    // Documentación: https://www.twilio.com/docs/whatsapp/isv/tech-provider-program/integration-guide#register-the-whatsapp-sender
    
    try {
      // Llamar al endpoint de la Senders API usando axios
      // Según documentación oficial: POST https://messaging.twilio.com/v2/Channels/Senders
      const response = await axios.post(
        'https://messaging.twilio.com/v2/Channels/Senders',
        senderData,
        {
          auth: {
            username: subaccountSid,
            password: subaccountAuthToken
          },
          headers: {
            'Content-Type': 'application/json'
          }
        }
      );

      const senderResponse = response.data;

      logger.info('Senders API response received', {
        senderSid: senderResponse.sid,
        status: senderResponse.status,
        senderId: senderResponse.sender_id
      });

      // El sender SID viene en la respuesta (formato XExxx)
      // Status puede ser: "CREATING", "ONLINE", "OFFLINE", etc.
      const senderSid = senderResponse.sid;
      const senderStatus = senderResponse.status || 'CREATING';

      return {
        success: true,
        senderId: senderSid, // Sender SID (XExxx)
        senderStatus: senderStatus // Status del sender
      };

    } catch (apiError: any) {
      logger.error('Senders API call failed', {
        error: apiError.response?.data?.message || apiError.message,
        status: apiError.response?.status,
        statusText: apiError.response?.statusText,
        senderId,
        wabaId
      });

      return {
        success: false,
        error: apiError.response?.data?.message || apiError.message || 'Failed to register WhatsApp Sender via Senders API'
      };
    }

  } catch (error: any) {
    logger.error('Error registering WhatsApp Sender', {
      error: error.message,
      phoneNumber,
      wabaId,
      subaccountSid,
      stack: error.stack
    });

    return {
      success: false,
      error: error.message
    };
  }
}

// Callback POST para recibir datos del frontend (Facebook SDK de Meta)
router.post('/onboarding-callback', authenticateToken, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id;
    if (!userId) {
      return res.status(401).json({ 
        success: false,
        error: 'Usuario no autenticado' 
      });
    }

    // Leer los datos de Meta Embedded Signup del body
    const { 
      phone_number_id,  // Phone Number ID de Meta
      waba_id           // WhatsApp Business Account ID de Meta
    } = req.body;

    logger.info('Received WhatsApp onboarding callback from Meta Embedded Signup', {
      phone_number_id,
      waba_id,
      userId
    });

    if (!phone_number_id || !waba_id) {
      logger.error('Missing required parameters from Meta Embedded Signup', {
        hasPhoneNumberId: !!phone_number_id,
        hasWabaId: !!waba_id,
        userId
      });
      return res.status(400).json({ 
        success: false,
        error: 'Datos incompletos de Meta Embedded Signup' 
      });
    }

    logger.info('Processing WhatsApp signup callback from Meta', {
      phone_number_id,
      waba_id,
      userId
    });

    // Obtener información del usuario para el nombre del subaccount
    const user = await User.findById(userId);
    const customerName = user?.username || user?.email || `Customer ${userId}`;

    // 1. Verificar o crear subaccount para este cliente
    let subaccountSid: string | undefined;
    let subaccountAuthToken: string | undefined;

    // Buscar si ya existe una integración con este WABA (cliente existente)
    const existingIntegration = await Integration.findOne({
      'meta.wabaId': waba_id.toString()
    });

    if (existingIntegration && existingIntegration.meta?.twilioSubaccountSid) {
      // Cliente existente: usar subaccount existente
      subaccountSid = existingIntegration.meta.twilioSubaccountSid;
      subaccountAuthToken = existingIntegration.meta.twilioSubaccountAuthToken;
      
      logger.info('Using existing subaccount for customer', {
        subaccountSid,
        userId,
        wabaId: waba_id
      });
    } else {
      // Cliente nuevo: crear subaccount
      const subaccountResult = await createTwilioSubaccount(customerName, userId);
      
      if (!subaccountResult.success) {
        logger.error('Failed to create Twilio subaccount', {
          error: subaccountResult.error,
          userId,
          wabaId: waba_id
        });
        return res.status(500).json({
          success: false,
          error: 'Failed to create Twilio subaccount'
        });
      }

      subaccountSid = subaccountResult.subaccountSid;
      subaccountAuthToken = subaccountResult.authToken;

      logger.info('Created new Twilio subaccount for customer', {
        subaccountSid,
        userId,
        wabaId: waba_id
      });
    }

    // 2. Obtener número de teléfono desde Meta Graph API
    // Según documentación de Twilio: Meta solo devuelve phone_number_id, necesitamos obtener el número real
    // Documentación: https://www.twilio.com/docs/whatsapp/isv/tech-provider-program/integration-guide#collect-the-phone-number
    let phoneNumber: string | undefined;
    let displayPhoneNumber: string | undefined;
    
    try {
      // Obtener número de teléfono desde Meta Graph API usando phone_number_id
      // Necesitamos un access token del WABA para hacer esta llamada
      // Por ahora, intentamos obtenerlo del cliente o usamos el App Access Token si está disponible
      const metaAccessToken = config.metaAccessToken; // Token de la app de Meta
      
      if (metaAccessToken && phone_number_id) {
        try {
          // Obtener información del número desde Meta Graph API
          // Endpoint: GET https://graph.facebook.com/v21.0/{phone_number_id}
          const phoneResponse = await axios.get(
            `https://graph.facebook.com/v21.0/${phone_number_id}`,
            {
              params: {
                fields: 'id,display_phone_number,verified_name',
                access_token: metaAccessToken
              }
            }
          );

          displayPhoneNumber = phoneResponse.data?.display_phone_number;
          
          // Convertir display_phone_number a formato E.164 si es necesario
          if (displayPhoneNumber) {
            // Asegurar formato E.164 (agregar + si no está)
            phoneNumber = displayPhoneNumber.startsWith('+') 
              ? `whatsapp:${displayPhoneNumber}` 
              : `whatsapp:+${displayPhoneNumber}`;
          }

          logger.info('Phone number obtained from Meta Graph API', {
            phone_number_id,
            display_phone_number: displayPhoneNumber,
            phoneNumber
          });
        } catch (phoneError: any) {
          logger.warn('Could not obtain phone number from Meta Graph API', {
            error: phoneError.message,
            phone_number_id,
            note: 'Sender registration will be delayed until phone number is available'
          });
          // Continuar sin número por ahora, se obtendrá después
        }
      } else {
        logger.warn('Meta Access Token not available, cannot fetch phone number', {
          hasAccessToken: !!metaAccessToken,
          phone_number_id
        });
      }
    } catch (error: any) {
      logger.warn('Error obtaining phone number from Meta', {
        error: error.message,
        phone_number_id
      });
      // Continuar sin número, se registrará después
    }

    // 3. Registrar el WhatsApp Sender si tenemos el número
    // Si no tenemos el número, se registrará después cuando esté disponible
    let senderRegistration: { success: boolean; senderId?: string; senderStatus?: string; error?: string } | null = null;
    
    if (phoneNumber && subaccountSid && subaccountAuthToken) {
      // Verificar si es el primer sender para este WABA
      const isFirstSender = !existingIntegration;
      
      senderRegistration = await registerWhatsAppSender(
        phoneNumber,
        waba_id.toString(),
        subaccountSid,
        subaccountAuthToken,
        isFirstSender,
        customerName // Profile name para números SMS-capables
      );

      if (!senderRegistration.success) {
        logger.error('Failed to register WhatsApp Sender', {
          error: senderRegistration.error,
          phoneNumber,
          wabaId: waba_id,
          subaccountSid
        });
        // Continuar de todas formas, ya que el WABA ya está creado
      }
    } else {
      logger.info('Skipping sender registration - phone number not available', {
        phone_number_id,
        waba_id,
        hasPhoneNumber: !!phoneNumber,
        note: 'Sender will be registered after obtaining phone number from Meta Graph API'
      });
    }

    // 3. Crear o actualizar la integración en la base de datos
    const integration = await Integration.findOneAndUpdate(
      {
        userId,
        provider: 'whatsapp',
        $or: [
          { 'meta.wabaId': waba_id.toString() },
          { 'meta.phoneNumberId': phone_number_id }
        ]
      },
      {
        userId,
        provider: 'whatsapp',
        externalId: waba_id.toString(),
        phoneNumberId: phone_number_id, // Meta Phone Number ID (diferente del número real)
        status: 'linked',
        meta: {
          phoneNumberId: phone_number_id, // Meta Phone Number ID
          wabaId: waba_id.toString(),
          twilioSubaccountSid: subaccountSid,
          twilioSubaccountAuthToken: subaccountAuthToken,
          whatsappNumber: phoneNumber || undefined, // Número en formato E.164 (si se obtuvo de Meta)
          displayPhoneNumber: displayPhoneNumber || undefined, // Número display (si se obtuvo de Meta)
          senderId: senderRegistration?.senderId, // Sender ID (si se registró)
          senderStatus: senderRegistration?.senderStatus || (phoneNumber ? 'pending' : undefined), // Status del sender
          registeredVia: 'meta_embedded_signup', // ✅ Usando Meta Embedded Signup
          registrationDate: new Date(),
          isActive: true,
          // Estado: pendiente si no se obtuvo el número o no se registró el sender
          needsPhoneNumber: !phoneNumber,
          needsSenderRegistration: !senderRegistration?.success && !!phoneNumber
        }
      },
      {
        upsert: true,
        new: true
      }
    );

    if (!integration) {
      logger.error('Failed to create/update WhatsApp integration', {
        userId,
        phone_number_id,
        waba_id
      });
      return res.status(500).json({
        success: false,
        error: 'Failed to create WhatsApp integration'
      });
    }

    logger.info('WhatsApp integration created/updated successfully via Meta Embedded Signup', {
      integrationId: String(integration._id) || integration.id,
      userId,
      phone_number_id,
      waba_id
    });

    // Devolver éxito al frontend (ya no redirigimos, el frontend maneja la UI)
    return res.json({
      success: true,
      message: 'WhatsApp integration registered successfully',
      integration: {
        id: integration._id,
        phone_number_id,
        waba_id,
        status: 'linked',
        note: 'Phone number will be obtained from Meta Graph API. Sender registration pending.'
      }
    });

  } catch (error: any) {
    logger.error('Error processing WhatsApp onboarding callback from Meta', {
      error: error.message,
      stack: error.stack,
      body: req.body
    });

    return res.status(500).json({
      success: false,
      error: error.message || 'Error procesando el registro de WhatsApp'
    });
  }
});

export default router;
