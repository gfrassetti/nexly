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

    // Configurar parámetros para Embedded Signup
    const signupParams = new URLSearchParams({
      // Clave de la Cuenta Maestra (Master Account SID)
      accountSid: config.twilioAccountSid || '',
      
      // ID del Business Manager de Nexly (CRUCIAL para Twilio Embedded)
      facebookBusinessId: config.nexlyFacebookBusinessId || '',
      
      // URLs de retorno
      returnUrl,
      failureUrl,
      
      // Token único para identificar al usuario
      payload: JSON.stringify({ 
        userId, 
        sessionId: `signup_${userId}_${Date.now()}` 
      }),
      
      // Configuración de la aplicación
      appName: 'Nexly',
      appDescription: 'Plataforma de mensajería unificada para WhatsApp Business',
      
      // Configuración de branding
      brandingColor: '#10B981', // Verde de Nexly
      brandingLogo: `${req.protocol}://${req.get('host')}/logo_nexly.png`
    });

    // URL oficial de Twilio Embedded Signup
    const twilioSignupUrl = `https://www.twilio.com/console/whatsapp/embedded-signup?${signupParams.toString()}`;

    logger.info('Generated Twilio Embedded Signup URL', {
      userId,
      signupUrl: twilioSignupUrl
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
