// api/src/routes/subscriptions.ts
/* "Lee el estado de suscripciones desde la DB y maneja operaciones CRUD de suscripciones"
Endpoint /status que lee suscripciones desde la base de datos
Maneja pausar, reactivar, cancelar suscripciones */


import express from 'express';
import authenticateToken from '../middleware/auth';
import Subscription from '../models/Subscription';
import { User } from '../models/User';
import { asyncHandler, CustomError } from '../utils/errorHandler';
import { validateSubscriptionData, paymentRateLimit } from '../middleware/security';
import { stripeService } from '../services/stripe';

const router = express.Router();
/**
 * Activar período de prueba gratuito de 24 horas (sin suscripción)
 */
router.post('/start-free-trial', authenticateToken, asyncHandler(async (req: any, res: any) => {
  try {
    const userId = req.user?.id;

    if (!userId) {
      throw new CustomError('Usuario no encontrado', 401);
    }

    // Obtener usuario
    const user = await User.findById(userId);
    if (!user) {
      throw new CustomError('Usuario no encontrado', 404);
    }

    // Verificar si ya usó el período de prueba gratuito
    if (user.freeTrialUsed) {
      return res.status(400).json({
        success: false,
        error: 'Ya has utilizado tu período de prueba gratuito de 24 horas'
      });
    }

    // Verificar si ya tiene CUALQUIER suscripción (activa, cancelada, pausada, etc.)
    const existingSubscription = await Subscription.findOne({ userId });
    if (existingSubscription) {
      return res.status(400).json({
        success: false,
        error: 'No puedes usar el período de prueba gratuito si ya tienes o tuviste una suscripción'
      });
    }

    // Activar período de prueba gratuito
    user.startFreeTrial();
    await user.save();

    return res.json({
      success: true,
      message: 'Período de prueba gratuito de 24 horas activado',
      freeTrial: {
        startDate: user.freeTrialStartDate,
        endDate: user.freeTrialEndDate,
        timeRemaining: user.getFreeTrialTimeRemaining()
      }
    });

  } catch (error) {
    console.error('Error starting free trial:', error);
    throw error;
  }
}));

/**
 * Obtener información del período de prueba gratuito
 */
router.get('/free-trial-status', authenticateToken, asyncHandler(async (req: any, res: any) => {
  try {
    const userId = req.user?.id;

    if (!userId) {
      throw new CustomError('Usuario no encontrado', 401);
    }

    const user = await User.findById(userId);
    if (!user) {
      throw new CustomError('Usuario no encontrado', 404);
    }

    const isActive = user.isFreeTrialActive();
    const canUse = user.canUseFreeTrial();
    const timeRemaining = user.getFreeTrialTimeRemaining();

    return res.json({
      success: true,
      freeTrial: {
        used: user.freeTrialUsed,
        canUse,
        isActive,
        startDate: user.freeTrialStartDate,
        endDate: user.freeTrialEndDate,
        timeRemaining,
        hoursRemaining: Math.ceil(timeRemaining / (1000 * 60 * 60))
      }
    });

  } catch (error) {
    console.error('Error getting free trial status:', error);
    throw error;
  }
}));

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

    if (!planType || !['crecimiento', 'pro', 'business'].includes(planType)) {
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
      status: 'trialing',
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
      status: { $in: ['trialing', 'active'] }
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
      status: 'trialing',
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
    let user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }

    // CRÍTICO: Buscar la suscripción MÁS RECIENTE y ACTIVA primero
    // No traer suscripciones canceladas si hay una activa
    let subscription = await Subscription.findOne({ 
      userId,
      status: { $nin: ['canceled', 'incomplete_expired'] } // Excluir canceladas y expiradas
    }).sort({ createdAt: -1 }); // Ordenar por más reciente primero

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
      // Incluir información del período de prueba gratuito
      const freeTrialInfo = {
        used: user.freeTrialUsed,
        canUse: user.canUseFreeTrial(),
        isActive: user.isFreeTrialActive(),
        startDate: user.freeTrialStartDate,
        endDate: user.freeTrialEndDate,
        timeRemaining: user.getFreeTrialTimeRemaining(),
        hoursRemaining: Math.ceil(user.getFreeTrialTimeRemaining() / (1000 * 60 * 60))
      };

      return res.json({
        hasSubscription: false,
        status: 'none',
        userSubscriptionStatus: user.subscription_status,
        subscription: null,
        freeTrial: freeTrialInfo
      });
    }

    // CRÍTICO: Sincronizar con Stripe si el trial terminó pero el status sigue siendo 'trialing'
    // Esto corrige el problema cuando el webhook no procesó el evento de pago automático
    if (subscription.stripeSubscriptionId && subscription.trialEndDate && subscription.status === 'trialing') {
      const now = new Date();
      const trialEnd = new Date(subscription.trialEndDate);
      
      // Si el trial terminó hace más de 5 minutos (para dar tiempo al webhook)
      if (now > trialEnd && (now.getTime() - trialEnd.getTime()) > 5 * 60 * 1000) {
        try {
          console.log(`🔄 Trial terminó pero status sigue siendo 'trialing'. Sincronizando con Stripe...`);
          
          // Obtener el estado real de Stripe
          const stripeSubscription = await stripeService.getSubscription(subscription.stripeSubscriptionId);
          
          // Determinar el plan correcto
          const priceId = stripeSubscription.items.data[0]?.price?.id || '';
          const mapPriceIdToPlanType = (priceId: string): 'crecimiento' | 'pro' | 'business' => {
            const basicPriceId = process.env.STRIPE_BASIC_PRICE_ID;
            const premiumPriceId = process.env.STRIPE_PREMIUM_PRICE_ID;
            const enterprisePriceId = process.env.STRIPE_ENTERPRISE_PRICE_ID;
            
            if (priceId === basicPriceId) return 'crecimiento';
            if (priceId === premiumPriceId) return 'pro';
            if (priceId === enterprisePriceId) return 'business';
            
            // Fallback por nombre
            if (priceId.includes('premium') || priceId.includes('pro')) return 'pro';
            if (priceId.includes('enterprise') || priceId.includes('business')) return 'business';
            return 'crecimiento';
          };
          const planType = mapPriceIdToPlanType(priceId);
          
          // Actualizar el estado según lo que Stripe reporta
          const stripeStatus = stripeSubscription.status;
          
          if (stripeStatus === 'active') {
            console.log(`✅ Actualizando suscripción de 'trialing' a 'active' después de sincronización con Stripe`);
            
            // Actualizar suscripción en DB
            subscription.status = 'active';
            subscription.planType = planType;
            subscription.lastPaymentDate = new Date();
            // No eliminar trialEndDate, solo marcarlo como completado en el status
            subscription.pausedAt = undefined; // Limpiar pausa si existía
            
            const stripeSub = stripeSubscription as any;
            if (stripeSub.current_period_start) {
              subscription.currentPeriodStart = new Date(stripeSub.current_period_start * 1000);
            }
            if (stripeSub.current_period_end) {
              subscription.currentPeriodEnd = new Date(stripeSub.current_period_end * 1000);
            }
            
            await subscription.save();
            
            // Actualizar estado del usuario
            user.subscription_status = 'active_paid';
            user.selectedPlan = planType;
            user.freeTrialUsed = true;
            await user.save();
            
            console.log(`✅ Suscripción sincronizada: ${subscription._id} -> active_paid`);
          } else if (stripeStatus === 'past_due' || stripeStatus === 'unpaid') {
            console.log(`⚠️ Suscripción en Stripe está '${stripeStatus}'. Actualizando...`);
            subscription.status = stripeStatus as any;
            subscription.lastPaymentAttempt = new Date();
            await subscription.save();
            
            // El usuario puede seguir con active_trial o active_paid hasta que expire completamente
          } else if (stripeStatus === 'canceled') {
            console.log(`⚠️ Suscripción fue cancelada en Stripe. Actualizando...`);
            subscription.status = 'canceled';
            const stripeSub = stripeSubscription as any;
            subscription.cancelledAt = stripeSub.canceled_at 
              ? new Date(stripeSub.canceled_at * 1000)
              : new Date();
            // Mantener trialEndDate para referencia histórica
            await subscription.save();
            
            user.subscription_status = 'cancelled';
            await user.save();
          } else if (stripeStatus === 'paused' || stripeSubscription.pause_collection) {
            console.log(`⚠️ Suscripción está pausada en Stripe. Actualizando...`);
            subscription.status = 'paused';
            subscription.pausedAt = new Date();
            await subscription.save();
            
            // Usuario puede seguir con active_paid aunque esté pausada
          } else if (stripeStatus === 'incomplete' || stripeStatus === 'incomplete_expired') {
            console.log(`⚠️ Suscripción está incompleta en Stripe: '${stripeStatus}'. Actualizando...`);
            subscription.status = stripeStatus as any;
            await subscription.save();
          } else {
            console.log(`⚠️ Estado desconocido de Stripe: '${stripeStatus}'. Manteniendo estado local.`);
          }
          
          // Recargar la suscripción desde la DB después de actualizar para obtener los valores actualizados
          const updatedSubscription = await Subscription.findById(subscription._id);
          if (updatedSubscription) {
            subscription = updatedSubscription;
            // También recargar el usuario
            const updatedUser = await User.findById(userId);
            if (updatedUser) {
              user = updatedUser;
            }
          }
        } catch (error: any) {
          console.error('⚠️ Error al sincronizar con Stripe (continuando con estado local):', {
            message: error.message,
            subscriptionId: subscription.stripeSubscriptionId,
            error: error
          });
          // Continuar con el estado local si hay error al sincronizar
          // No bloquear la respuesta por un error de sincronización
        }
      }
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
      const now = new Date();
      const trialEnd = new Date(subscription.trialEndDate);
      const diffTime = trialEnd.getTime() - now.getTime();
      daysRemaining = Math.max(0, Math.floor(diffTime / (1000 * 60 * 60 * 24)));
    }
    
    if (subscription.gracePeriodEndDate) {
      const now = new Date();
      const graceEnd = new Date(subscription.gracePeriodEndDate);
      const diffTime = graceEnd.getTime() - now.getTime();
      gracePeriodDaysRemaining = Math.max(0, Math.floor(diffTime / (1000 * 60 * 60 * 24)));
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
    const finalPlanType = planType || user.selectedPlan || 'crecimiento';

    // Verificar si ya tiene una suscripción activa
    const existingActive = await Subscription.findOne({
      userId,
      status: { $in: ['active', 'paused'] }
    });

    if (existingActive) {
      return res.status(400).json({ error: 'Ya tienes una suscripción activa' });
    }

    // Redirigir a Stripe para el pago
    res.json({
      success: true,
      message: 'Redirigiendo a Stripe para completar el pago',
      redirectUrl: '/stripe/create-payment-link'
    });

  } catch (error) {
    console.error('Error creating payment link:', error);
    throw error;
  }
}));


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

    // Reactivar suscripción
    (subscription as any).reactivateSubscription();
    await subscription.save();

    res.json({
      success: true,
      message: 'Suscripción reactivada exitosamente',
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
      status: { $in: ['trialing', 'active', 'paused'] }
    });

    if (!subscription) {
      throw new CustomError('No tienes una suscripción activa para cancelar', 404);
    }


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
