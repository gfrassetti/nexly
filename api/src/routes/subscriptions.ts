// api/src/routes/subscriptions.ts
import express from 'express';
import authenticateToken from '../middleware/auth';
import { mercadoPagoService } from '../services/mercadopago';
import Subscription from '../models/Subscription';
import { User } from '../models/User';
import { asyncHandler, CustomError } from '../utils/errorHandler';
import { validateSubscriptionData, paymentRateLimit } from '../middleware/security';
import { mercadoPagoWebhookVerification } from '../middleware/verifyMercadoPagoSignature';

const router = express.Router();

/**
 * Iniciar trial gratuito (sin pago)
 */
router.post('/start-trial', authenticateToken, asyncHandler(async (req: any, res: any) => {
  try {
    const { planType } = req.body;
    const userId = req.user?.id;

    if (!userId) {
      throw new CustomError('Usuario no encontrado', 401);
    }

    if (!planType || !['basic', 'premium'].includes(planType)) {
      throw new CustomError('Tipo de plan inválido', 400);
    }

    // Verificar si ya tiene una suscripción activa
    const existingSubscription = await Subscription.findOne({ userId });
    
    if (existingSubscription && (existingSubscription.status === 'trialing' || existingSubscription.status === 'active')) {
      return res.json({
        success: true,
        message: 'Ya tienes una suscripción activa',
        subscription: existingSubscription
      });
    }

    // Crear nueva suscripción con trial
    const trialStartDate = new Date();
    const trialEndDate = new Date();
    trialEndDate.setDate(trialEndDate.getDate() + 7); // 7 días de trial

    const subscription = new Subscription({
      userId,
      planType,
      status: 'trial',
      startDate: trialStartDate,
      endDate: trialEndDate,
      // Estados se calculan dinámicamente con métodos
      trialStartDate,
      trialEndDate
    });

    await subscription.save();

    res.json({
      success: true,
      message: 'Trial iniciado exitosamente',
      subscription: {
        id: subscription._id,
        planType: subscription.planType,
        status: subscription.status,
        trialEndDate: subscription.trialEndDate,
        isTrialActive: (subscription as any).isTrialActive()
      }
    });

  } catch (error: any) {
    console.error('Error iniciando trial:', error);
    throw new CustomError(error.message || 'Error iniciando trial', 500);
  }
}));

/**
 * Crear una nueva suscripción (iniciar trial)
 */
router.post('/create', authenticateToken, validateSubscriptionData, asyncHandler(async (req: any, res: any) => {
  try {
    const { planType } = req.body;
    const userId = req.user?.id;

    if (!userId) {
      throw new CustomError('Usuario no autenticado', 401);
    }

    // Verificar si ya tiene una suscripción activa
    const existingSubscription = await Subscription.findOne({
      userId,
      status: { $in: ['trial', 'active'] }
    });

    if (existingSubscription) {
      throw new CustomError('Ya tienes una suscripción activa', 400);
    }

    // Crear suscripción con período de prueba
    const startDate = new Date();
    const trialEndDate = new Date();
    trialEndDate.setDate(trialEndDate.getDate() + 7); // 7 días de prueba

    const subscription = new Subscription({
      userId,
      planType,
      status: 'trial',
      startDate,
      trialEndDate,
      autoRenew: false, // No auto-renovar hasta que confirme el pago
    });

    await subscription.save();

    // Verificar que se guardó correctamente
    const savedSubscription = await Subscription.findById(subscription._id);
    if (!savedSubscription) {
      throw new CustomError('Error al guardar la suscripción en la base de datos', 500);
    }

    res.json({
      success: true,
      subscription: {
        id: subscription._id,
        planType: subscription.planType,
        status: subscription.status,
        trialEndDate: subscription.trialEndDate,
        daysRemaining: Math.ceil((subscription.trialEndDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24)),
      }
    });
  } catch (error) {
    console.error('Error creating subscription:', error);
    throw error; // El asyncHandler se encarga del resto
  }
}));

/**
 * Obtener información de la suscripción del usuario
 */
router.get('/status', authenticateToken, asyncHandler(async (req: any, res: any) => {
  try {
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({ error: 'Usuario no autenticado' });
    }

    // Obtener información del usuario
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }

    const subscription = await Subscription.findOne({ userId });

    // Si el usuario está en trial_pending_payment_method pero no tiene suscripción, es normal
    if (!subscription && user.subscription_status === 'trial_pending_payment_method') {
      return res.json({
        hasSubscription: false,
        status: 'trial_pending_payment_method',
        userSubscriptionStatus: user.subscription_status,
        subscription: null
      });
    }

    if (!subscription) {
      return res.json({
        hasSubscription: false,
        status: 'none',
        userSubscriptionStatus: user.subscription_status,
        subscription: null
      });
    }

    const isTrialActive = (subscription as any).isTrialActive();
    const isActive = (subscription as any).isActive();
    const isPaused = (subscription as any).isPaused();
    const isCancelled = (subscription as any).isCancelled();
    const isInGracePeriod = (subscription as any).isInGracePeriod();
    
    // Calcular días restantes según el estado
    let daysRemaining = 0;
    let gracePeriodDaysRemaining = 0;
    
    if (subscription.trialEndDate) {
      daysRemaining = Math.ceil((subscription.trialEndDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
    }
    
    if (subscription.gracePeriodEndDate) {
      gracePeriodDaysRemaining = Math.ceil((subscription.gracePeriodEndDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
    }

    res.json({
      hasSubscription: true,
      subscription: {
        id: subscription._id,
        planType: subscription.planType,
        status: subscription.status,
        trialEndDate: subscription.trialEndDate,
        daysRemaining: Math.max(0, daysRemaining),
        gracePeriodDaysRemaining: Math.max(0, gracePeriodDaysRemaining),
        isTrialActive,
        isActive,
        isPaused,
        isCancelled,
        isInGracePeriod,
        pausedAt: subscription.pausedAt,
        cancelledAt: subscription.cancelledAt,
        gracePeriodEndDate: subscription.gracePeriodEndDate,
        maxIntegrations: (subscription as any).getMaxIntegrations(),
        canUseFeature: (subscription as any).canUseFeature.bind(subscription),
        stripeSubscriptionId: subscription.stripeSubscriptionId,
        // mercadoPagoSubscriptionId: subscription.mercadoPagoSubscriptionId, // Comentado - solo Stripe ahora
      },
      userSubscriptionStatus: user.subscription_status
    });

  } catch (error) {
    console.error('Error getting subscription status:', error);
    throw error;
  }
}));

/**
 * Crear enlace de pago para activar suscripción
 */
router.post('/create-payment-link', authenticateToken, paymentRateLimit, asyncHandler(async (req: any, res: any) => {
  try {
    const { planType } = req.body;
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({ error: 'Usuario no autenticado' });
    }

    // Verificar el estado del usuario
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }

    // Si el usuario no está en estado correcto, resetear a pendiente de pago
    if (user.subscription_status !== 'trial_pending_payment_method') {
      user.subscription_status = 'trial_pending_payment_method';
      await user.save();
    }

    // Usar el plan del usuario si no se proporciona uno en el body
    const finalPlanType = planType || user.selectedPlan || 'basic';

    // Verificar si ya tiene una suscripción activa
    const existingActive = await Subscription.findOne({
      userId,
      status: { $in: ['active', 'paused'] }
    });

    if (existingActive) {
      return res.status(400).json({ error: 'Ya tienes una suscripción activa' });
    }

    // Para evitar errores 106 y 145, siempre crear una nueva suscripción en MercadoPago
    // Esto imita el comportamiento exitoso del flujo desde pricing
    console.log('🔄 Creando nueva suscripción en MercadoPago (evitando errores 106/145)');
    
    const backUrl = `${process.env.FRONTEND_URL}/dashboard/subscription/success`;
    let mercadoPagoSubscription;
    
    if (finalPlanType === 'basic') {
      mercadoPagoSubscription = await mercadoPagoService.createBasicPlan(user.email, backUrl);
    } else {
      mercadoPagoSubscription = await mercadoPagoService.createPremiumPlan(user.email, backUrl);
    }

    // Verificar que MercadoPago creó la suscripción exitosamente
    if (!mercadoPagoSubscription || !mercadoPagoSubscription.id) {
      throw new CustomError('Error al crear la suscripción en MercadoPago', 500);
    }

    // Verificar si ya existe una suscripción pendiente
    const existingPending = await Subscription.findOne({
      userId,
      status: 'trial'
    });

    let savedSubscription;
    
    if (existingPending) {
      // Actualizar la suscripción existente con el nuevo ID de MercadoPago
      // existingPending.mercadoPagoSubscriptionId = mercadoPagoSubscription.id; // Comentado - solo Stripe ahora
      await existingPending.save();
      savedSubscription = existingPending;
    } else {
      // Crear nueva suscripción en la base de datos
      const startDate = new Date();
      const trialEndDate = new Date();
      trialEndDate.setDate(trialEndDate.getDate() + 7); // 7 días de prueba

      const subscription = new Subscription({
        userId,
        planType: finalPlanType,
        status: 'trial',
        startDate,
        trialEndDate,
        autoRenew: false,
        mercadoPagoSubscriptionId: mercadoPagoSubscription.id,
      });

      await subscription.save();
      savedSubscription = subscription;
    }

    res.json({
      success: true,
      paymentUrl: mercadoPagoSubscription.init_point,
      subscriptionId: mercadoPagoSubscription.id,
    });

  } catch (error) {
    console.error('Error creating payment link:', error);
    throw error;
  }
}));

/**
 * Webhook de Mercado Pago para actualizar estado de suscripciones
 */
router.post('/webhook', mercadoPagoWebhookVerification, async (req, res) => {
  try {
    // Validar origen del webhook
    const origin = req.headers.origin || req.headers.referer;
    const allowedOrigins = [
      'https://api.mercadopago.com',
      'https://www.mercadopago.com.ar'
    ];
    
    if (!allowedOrigins.some(allowed => origin?.includes(allowed))) {
      console.error('Webhook origin not authorized:', origin);
      return res.status(403).json({ error: 'Origin not authorized' });
    }

    const { type, data } = req.body;

    if (type === 'subscription_preapproval') {
      const subscriptionId = data.id;
      
      // Obtener información actualizada de Mercado Pago
      const mpSubscription = await mercadoPagoService.getSubscription(subscriptionId);
      
      // Buscar la suscripción en nuestra BD
      const subscription = await Subscription.findOne({
        mercadoPagoSubscriptionId: subscriptionId
      });

      if (subscription) {
        // Actualizar estado según Mercado Pago
        const mpStatus = mpSubscription.status;
        let newStatus = subscription.status;

        switch (mpStatus) {
          case 'authorized':
            newStatus = 'active';
            subscription.autoRenew = true;
            break;
          case 'cancelled':
            newStatus = 'canceled';
            break;
          case 'paused':
            newStatus = 'canceled';
            break;
        }

        subscription.status = newStatus;
        await subscription.save();

        // Actualizar el estado del usuario en la tabla User
        const user = await User.findById(subscription.userId);
        if (user) {
          if (mpStatus === 'authorized') {
            // Si MercadoPago confirma el método de pago, cambiar a active_trial
            user.subscription_status = 'active_trial';
          } else if (mpStatus === 'cancelled') {
            // Si se cancela, volver a none
            user.subscription_status = 'none';
          }
          await user.save();
          
          console.log(`User ${user._id} subscription_status updated to: ${user.subscription_status}`);
        }

        console.log(`Subscription ${subscriptionId} updated to status: ${newStatus}`);
      }
    }

    res.status(200).json({ success: true });

  } catch (error) {
    console.error('Error processing webhook:', error);
    res.status(500).json({ error: 'Error procesando webhook' });
  }
});

/**
 * Pausar suscripción
 */
router.post('/pause', authenticateToken, asyncHandler(async (req: any, res: any) => {
  try {
    const userId = req.user?.id;

    if (!userId) {
      throw new CustomError('Usuario no autenticado', 401);
    }

    const subscription = await Subscription.findOne({
      userId,
      status: { $in: ['active'] }
    });

    if (!subscription) {
      throw new CustomError('No tienes una suscripción activa para pausar', 404);
    }

    // Pausar en Mercado Pago si existe
    // if (subscription.mercadoPagoSubscriptionId) {
    //   try {
    //     await mercadoPagoService.cancelSubscription(subscription.mercadoPagoSubscriptionId);
    //   } catch (error) {
    //     console.error('Error pausing in Mercado Pago:', error);
    //     // Continuar con la pausa local aunque falle en MP
    //   }
    // } // Comentado - solo Stripe ahora

    (subscription as any).pauseSubscription();
    await subscription.save();

    res.json({
      success: true,
      message: 'Suscripción pausada exitosamente',
      subscription: {
        id: subscription._id,
        status: subscription.status,
        pausedAt: subscription.pausedAt,
        originalEndDate: subscription.originalEndDate
      }
    });

  } catch (error) {
    console.error('Error pausing subscription:', error);
    throw error;
  }
}));

/**
 * Reactivar suscripción pausada
 */
router.post('/reactivate', authenticateToken, asyncHandler(async (req: any, res: any) => {
  try {
    const userId = req.user?.id;

    if (!userId) {
      throw new CustomError('Usuario no autenticado', 401);
    }

    const subscription = await Subscription.findOne({
      userId,
      status: 'paused'
    });

    if (!subscription) {
      throw new CustomError('No tienes una suscripción pausada para reactivar', 404);
    }

    // Crear nuevo enlace de pago en Mercado Pago
    const user = await User.findById(userId);
    if (!user) {
      throw new CustomError('Usuario no encontrado', 404);
    }

    const backUrl = `${process.env.FRONTEND_URL}/dashboard/subscription/success`;
    
    let mercadoPagoSubscription;
    if (subscription.planType === 'basic') {
      mercadoPagoSubscription = await mercadoPagoService.createBasicPlan(user.email, backUrl);
    } else {
      mercadoPagoSubscription = await mercadoPagoService.createPremiumPlan(user.email, backUrl);
    }

    // Actualizar suscripción
    (subscription as any).reactivateSubscription();
    // subscription.mercadoPagoSubscriptionId = mercadoPagoSubscription.id; // Comentado - solo Stripe ahora
    await subscription.save();

    res.json({
      success: true,
      message: 'Suscripción reactivada exitosamente',
      paymentUrl: mercadoPagoSubscription.init_point,
      subscription: {
        id: subscription._id,
        status: subscription.status,
        endDate: subscription.endDate
      }
    });

  } catch (error) {
    console.error('Error reactivating subscription:', error);
    throw error;
  }
}));


/**
 * Resetear rate limiting para pagos (solo para desarrollo o casos especiales)
 */
router.post('/reset-payment-limit', authenticateToken, asyncHandler(async (req: any, res: any) => {
  try {
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({ error: 'Usuario no autenticado' });
    }

    // En producción, solo permitir esto en casos muy específicos
    if (process.env.NODE_ENV === 'production') {
      return res.status(403).json({ error: 'Esta función no está disponible en producción' });
    }

    // Aquí podrías implementar lógica para resetear el rate limit
    // Por ahora, solo confirmamos que la solicitud fue recibida
    console.log(`Rate limit reset requested for user ${userId}`);

    res.json({
      success: true,
      message: 'Rate limit reset solicitado (solo disponible en desarrollo)'
    });

  } catch (error) {
    console.error('Error resetting payment limit:', error);
    throw error;
  }
}));

/**
 * Cancelar suscripción
 */
router.post('/cancel', authenticateToken, asyncHandler(async (req: any, res: any) => {
  try {
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({ error: 'Usuario no autenticado' });
    }

    const subscription = await Subscription.findOne({
      userId,
      status: { $in: ['trial', 'active', 'paused'] }
    });

    if (!subscription) {
      throw new CustomError('No tienes una suscripción activa para cancelar', 404);
    }

    // Si tiene ID de Mercado Pago, cancelar allí también
    // if (subscription.mercadoPagoSubscriptionId) {
    //   try {
    //     await mercadoPagoService.cancelSubscription(subscription.mercadoPagoSubscriptionId);
    //   } catch (error) {
    //     console.error('Error cancelling in Mercado Pago:', error);
    //     // Continuar con la cancelación local aunque falle en MP
    //   }
    // } // Comentado - solo Stripe ahora

    // Cancelar con período de gracia (7 días por defecto)
    (subscription as any).cancelSubscription(7);
    await subscription.save();

    res.json({
      success: true,
      message: 'Suscripción cancelada exitosamente. Tienes 7 días de acceso restante.',
      subscription: {
        id: subscription._id,
        status: subscription.status,
        cancelledAt: subscription.cancelledAt,
        gracePeriodEndDate: subscription.gracePeriodEndDate
      }
    });

  } catch (error) {
    console.error('Error cancelling subscription:', error);
    throw error;
  }
}));

export default router;
