import { Router, Request, Response } from 'express';
import { authenticateToken } from '../middleware/auth';
import logger from '../utils/logger';
import { config } from '../config';

const router = Router();

// Crear sesión de Embedded Signup para WhatsApp Business
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

    // Configurar parámetros para Embedded Signup según documentación de Twilio
    const signupParams = new URLSearchParams({
      // Account SID de la cuenta maestra de Twilio
      accountSid: config.twilioAccountSid || '',
      
      // Facebook Business Manager ID de Nexly (requerido para el Embedded Signup)
      facebookBusinessId: config.nexlyFacebookBusinessId,
      
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

// Callback para manejar el redireccionamiento de éxito del Embedded Signup
router.get('/onboarding-callback', async (req: Request, res: Response) => {
  try {
    // Leer los parámetros de Twilio de la URL
    const { 
      TwilioNumber, 
      WhatsAppBusinessAccountId, 
      FacebookBusinessId,
      payload 
    } = req.query;

    logger.info('Received WhatsApp onboarding callback', {
      TwilioNumber,
      WhatsAppBusinessAccountId,
      FacebookBusinessId,
      payload
    });

    if (!payload) {
      return res.redirect('/dashboard/integrations/connect/whatsapp/error?msg=Datos incompletos');
    }

    const { userId } = JSON.parse(payload as string);

    if (TwilioNumber && WhatsAppBusinessAccountId && userId) {
      logger.info('WhatsApp signup successful via redirect callback', { 
        TwilioNumber, 
        WhatsAppBusinessAccountId,
        userId 
      });
      
      // TODO: Actualizar la base de datos de Nexly
      // await createOrUpdateWhatsAppIntegration({
      //   userId,
      //   phoneNumber: TwilioNumber,
      //   whatsappBusinessId: WhatsAppBusinessAccountId,
      //   facebookBusinessId: FacebookBusinessId,
      //   status: 'active'
      // });
      
      // Redirigir al frontend de éxito
      return res.redirect(`/dashboard/integrations/connect/whatsapp/success?phone=${TwilioNumber}`);
    }

    res.redirect('/dashboard/integrations/connect/whatsapp/error?msg=Datos incompletos');

  } catch (error: any) {
    logger.error('Error processing Twilio onboarding callback', {
      error: error.message,
      stack: error.stack
    });
    res.redirect('/dashboard/integrations/connect/whatsapp/error');
  }
});

export default router;
