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

    const { returnUrl, failureUrl } = req.body;

    if (!returnUrl || !failureUrl) {
      return res.status(400).json({ error: 'returnUrl y failureUrl son requeridos' });
    }

    logger.info('Creating WhatsApp Embedded Signup session', {
      userId,
      returnUrl,
      failureUrl
    });

    // Verificar que tenemos las configuraciones necesarias
    if (!config.nexlyFacebookBusinessId) {
      logger.error('NEXLY_FACEBOOK_BUSINESS_ID not configured');
      return res.status(500).json({
        success: false,
        error: 'Configuración de Facebook Business Manager faltante'
      });
    }

    if (!config.twilioPartnerSolutionId) {
      logger.error('TWILIO_PARTNER_SOLUTION_ID not configured');
      return res.status(500).json({
        success: false,
        error: 'Partner Solution ID no configurado. Necesitas completar el Tech Provider Program primero.'
      });
    }

    // Configurar parámetros para Embedded Signup según documentación de Twilio
    const signupParams = new URLSearchParams({
      // Account SID de la cuenta maestra de Twilio
      accountSid: config.twilioAccountSid || '',
      
      // Facebook Business Manager ID de Nexly (requerido para el Embedded Signup)
      facebookBusinessId: config.nexlyFacebookBusinessId,
      
      // Partner Solution ID (requerido para Tech Provider Program)
      partnerSolutionId: config.twilioPartnerSolutionId,
      
      // URLs de retorno (importante: deben ser HTTPS en producción)
      returnUrl: returnUrl,
      failureUrl: failureUrl,
      
      // Payload con información del usuario (se devuelve en la URL de retorno)
      payload: JSON.stringify({ 
        userId: userId, 
        sessionId: `signup_${userId}_${Date.now()}`,
        timestamp: new Date().toISOString()
      }),
      
      // Configuración de la aplicación
      appName: 'Nexly',
      
      // Configuración de branding (opcional)
      brandingColor: '#10B981',
      
      // Configuración específica para WhatsApp Business
      solutionId: 'whatsapp_business_api'
    });

    // Si usas números SMS-capables de Twilio, agregar featureType para saltar pasos de número
    // Twilio manejará los OTPs automáticamente via Senders API
    // Nota: Este parámetro puede variar según la documentación de Twilio
    // Si Twilio requiere pasarlo como parámetro de URL, descomenta la siguiente línea:
    // if (config.twilioPhoneNumberType === 'sms_capable') {
    //   signupParams.append('featureType', 'only_waba_sharing');
    // }

    // URL oficial de Twilio para Embedded Signup de WhatsApp Business
    const twilioSignupUrl = `https://www.twilio.com/console/whatsapp/embedded-signup?${signupParams.toString()}`;

    logger.info('Generated Twilio Embedded Signup URL', {
      userId,
      signupUrl: twilioSignupUrl,
      params: Object.fromEntries(signupParams),
      config: {
        hasAccountSid: !!config.twilioAccountSid,
        hasFacebookBusinessId: !!config.nexlyFacebookBusinessId,
        facebookBusinessId: config.nexlyFacebookBusinessId
      }
    });

    res.json({
      success: true,
      signupUrl: twilioSignupUrl,
      sessionId: `signup_${userId}_${Date.now()}`
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

// Callback para manejar el redireccionamiento de éxito del Embedded Signup
router.get('/onboarding-callback', async (req: Request, res: Response) => {
  try {
    // Leer los parámetros de Twilio de la URL
    const { 
      TwilioNumber, 
      WhatsAppBusinessAccountId, 
      FacebookBusinessId,
      SubaccountSid,
      payload 
    } = req.query;

    logger.info('Received WhatsApp onboarding callback from Twilio', {
      TwilioNumber,
      WhatsAppBusinessAccountId,
      FacebookBusinessId,
      SubaccountSid,
      allQueryParams: req.query
    });

    if (!payload) {
      logger.error('Missing payload in callback');
      return res.redirect(`${config.frontendUrl}/dashboard/integrations/connect/whatsapp/error?msg=Datos incompletos`);
    }

    let userId: string;
    try {
      const payloadData = JSON.parse(payload as string);
      userId = payloadData.userId;
    } catch (parseError: any) {
      logger.error('Error parsing payload', { error: parseError.message, payload });
      return res.redirect(`${config.frontendUrl}/dashboard/integrations/connect/whatsapp/error?msg=Error procesando datos`);
    }

    if (!TwilioNumber || !WhatsAppBusinessAccountId || !userId) {
      logger.error('Missing required parameters in callback', {
        hasTwilioNumber: !!TwilioNumber,
        hasWabaId: !!WhatsAppBusinessAccountId,
        hasUserId: !!userId
      });
      return res.redirect(`${config.frontendUrl}/dashboard/integrations/connect/whatsapp/error?msg=Datos incompletos`);
    }

    // Normalizar el número de teléfono
    const phoneNumber = TwilioNumber.toString().startsWith('whatsapp:')
      ? TwilioNumber.toString()
      : `whatsapp:${TwilioNumber}`;

    logger.info('Processing WhatsApp signup callback', {
      phoneNumber,
      wabaId: WhatsAppBusinessAccountId,
      userId,
      subaccountSid: SubaccountSid
    });

    // Obtener información del usuario para el nombre del subaccount
    const user = await User.findById(userId);
    const customerName = user?.username || user?.email || `Customer ${userId}`;

    // 1. Verificar o crear subaccount para este cliente
    let subaccountSid = SubaccountSid?.toString();
    let subaccountAuthToken: string | undefined;

    // Buscar si ya existe una integración con este WABA (cliente existente)
    const existingIntegration = await Integration.findOne({
      'meta.wabaId': WhatsAppBusinessAccountId.toString()
    });

    if (existingIntegration && existingIntegration.meta?.twilioSubaccountSid) {
      // Cliente existente: usar subaccount existente
      subaccountSid = existingIntegration.meta.twilioSubaccountSid;
      subaccountAuthToken = existingIntegration.meta.twilioSubaccountAuthToken;
      
      logger.info('Using existing subaccount for customer', {
        subaccountSid,
        userId,
        wabaId: WhatsAppBusinessAccountId
      });
    } else if (!subaccountSid) {
      // Cliente nuevo: crear subaccount
      const subaccountResult = await createTwilioSubaccount(customerName, userId);
      
      if (!subaccountResult.success) {
        logger.error('Failed to create Twilio subaccount', {
          error: subaccountResult.error,
          userId,
          wabaId: WhatsAppBusinessAccountId
        });
        throw new Error('Failed to create Twilio subaccount');
      }

      subaccountSid = subaccountResult.subaccountSid;
      subaccountAuthToken = subaccountResult.authToken;

      logger.info('Created new Twilio subaccount for customer', {
        subaccountSid,
        userId,
        wabaId: WhatsAppBusinessAccountId
      });
    } else {
      // Twilio ya creó el subaccount, necesitamos obtener el AuthToken
      // Nota: Si Twilio creó el subaccount, puede que no tengamos el AuthToken inmediatamente
      // En este caso, necesitarías recuperarlo de Twilio o almacenarlo cuando se crea
      logger.warn('Subaccount already exists but AuthToken may be missing', {
        subaccountSid,
        userId
      });
      
      // Intentar obtener el AuthToken del subaccount desde Twilio
      try {
        const masterClient = new Twilio(config.twilioAccountSid, config.twilioAuthToken);
        const account = await masterClient.api.v2010.accounts(subaccountSid).fetch();
        subaccountAuthToken = account.authToken;
      } catch (error: any) {
        logger.error('Failed to fetch subaccount AuthToken', {
          error: error.message,
          subaccountSid
        });
        // Continuar sin AuthToken por ahora, se puede obtener después
      }
    }

    // 2. Registrar el WhatsApp Sender usando la Senders API
    // Verificar si es el primer sender para este WABA
    const isFirstSender = !existingIntegration;
    
    const senderRegistration = await registerWhatsAppSender(
      phoneNumber,
      WhatsAppBusinessAccountId.toString(),
      subaccountSid!,
      subaccountAuthToken || config.twilioAuthToken, // Fallback al master token si no hay subaccount token
      isFirstSender,
      customerName // Profile name para números SMS-capables
    );

    if (!senderRegistration.success) {
      logger.error('Failed to register WhatsApp Sender', {
        error: senderRegistration.error,
        phoneNumber,
        wabaId: WhatsAppBusinessAccountId,
        subaccountSid
      });
      // Continuar de todas formas, ya que el WABA ya está creado
    }

    // 3. Crear o actualizar la integración en la base de datos
    const integration = await Integration.findOneAndUpdate(
      {
        userId,
        provider: 'whatsapp',
        $or: [
          { 'meta.wabaId': WhatsAppBusinessAccountId.toString() },
          { 'meta.whatsappNumber': phoneNumber }
        ]
      },
      {
        userId,
        provider: 'whatsapp',
        externalId: WhatsAppBusinessAccountId.toString(),
        phoneNumberId: phoneNumber,
        status: 'linked',
        meta: {
          whatsappNumber: phoneNumber,
          wabaId: WhatsAppBusinessAccountId.toString(),
          twilioSubaccountSid: subaccountSid,
          twilioSubaccountAuthToken: subaccountAuthToken,
          facebookBusinessId: FacebookBusinessId?.toString(),
          senderId: senderRegistration.senderId,
          senderStatus: senderRegistration.senderStatus || 'pending',
          registeredVia: 'twilio_embedded_signup',
          registrationDate: new Date(),
          isActive: true
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
        phoneNumber,
        wabaId: WhatsAppBusinessAccountId
      });
      throw new Error('Failed to create WhatsApp integration');
    }

    logger.info('WhatsApp integration created/updated successfully', {
      integrationId: String(integration._id) || integration.id,
      userId,
      phoneNumber,
      wabaId: WhatsAppBusinessAccountId,
      senderId: senderRegistration.senderId
    });

    // 3. Redirigir al frontend de éxito
    const successUrl = `${config.frontendUrl}/dashboard/integrations/connect/whatsapp/success?phone=${encodeURIComponent(TwilioNumber.toString())}`;
    return res.redirect(successUrl);

  } catch (error: any) {
    logger.error('Error processing Twilio onboarding callback', {
      error: error.message,
      stack: error.stack,
      query: req.query
    });
    const errorUrl = `${config.frontendUrl}/dashboard/integrations/connect/whatsapp/error?msg=${encodeURIComponent('Error procesando el registro')}`;
    res.redirect(errorUrl);
  }
});

export default router;
