// api/src/routes/stripe/index.ts
// Endpoints para gestión de suscripciones con Stripe


import express, { Request, Response } from 'express';
import authenticateToken from '../../middleware/auth';
import { stripeService } from '../../services/stripe';
import Subscription from '../../models/Subscription';
import { User } from '../../models/User';
import { asyncHandler, CustomError } from '../../utils/errorHandler';
import { validateSubscriptionData, paymentRateLimit } from '../../middleware/security';
import { stripeWebhookVerification } from '../../middleware/verifyStripeSignature';

// Tipos para mejor type safety
interface AuthenticatedRequest extends Request {
  user?: { 
    id: string; 
    email: string; 
    subscription_status?: string;
    selectedPlan?: string;
  };
}

// Constantes para URLs y configuración
const STRIPE_CONFIG = {
  SUCCESS_URL: '/dashboard',
  CANCEL_URL: '/pricing',
  PLAN_AMOUNTS: {
    basic: 100000, // $1000 ARS en centavos
    premium: 150000 // $1500 ARS en centavos
  },
  CURRENCY: 'ars'
} as const;

const router = express.Router();

// Obtener información completa de la suscripción desde Stripe
router.get('/subscription-info', authenticateToken, asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({ error: 'Usuario no autenticado' });
    }

    // Buscar la suscripción MÁS RECIENTE del usuario en nuestra base de datos
    const subscription = await Subscription.findOne({ userId }).sort({ updatedAt: -1 });

    if (!subscription) {
      return res.status(404).json({ subscription: null });
    }

    // Si no tiene stripeSubscriptionId, devolver datos básicos
    if (!subscription.stripeSubscriptionId) {
      return res.json({
        subscription: {
          id: subscription._id,
          status: subscription.status,
          planType: subscription.planType,
          trialEndDate: subscription.trialEndDate,
          currentPeriodEnd: subscription.endDate || null,
          amount: STRIPE_CONFIG.PLAN_AMOUNTS[subscription.planType as keyof typeof STRIPE_CONFIG.PLAN_AMOUNTS] || STRIPE_CONFIG.PLAN_AMOUNTS.basic,
          currency: STRIPE_CONFIG.CURRENCY
        },
        customer: null
      });
    }

    // Obtener información completa desde Stripe
    const stripeSubscription = await stripeService.getSubscription(subscription.stripeSubscriptionId) as any;
    
    // Obtener información del customer
    let customer = null;
    if (stripeSubscription.customer && typeof stripeSubscription.customer === 'string') {
      customer = await stripeService.getCustomer(stripeSubscription.customer);
    }

    // Obtener información del método de pago por defecto
    let paymentMethod = null;
    if (customer && !customer.deleted && customer.invoice_settings?.default_payment_method && typeof customer.invoice_settings.default_payment_method === 'string') {
      paymentMethod = await stripeService.getPaymentMethod(
        customer.invoice_settings.default_payment_method
      );
    }

    // Formatear respuesta
    const response = {
      subscription: {
        id: subscription._id,
        stripeSubscriptionId: stripeSubscription.id,
        status: stripeSubscription.status,
        planType: subscription.planType,
        trialEndDate: subscription.trialEndDate,
        currentPeriodEnd: stripeSubscription.current_period_end ? new Date(stripeSubscription.current_period_end * 1000).toISOString() : null,
        currentPeriodStart: stripeSubscription.current_period_start ? new Date(stripeSubscription.current_period_start * 1000).toISOString() : null,
        amount: stripeSubscription.items?.data?.[0]?.price?.unit_amount || 0,
        currency: stripeSubscription.currency || 'usd',
        cancelAtPeriodEnd: stripeSubscription.cancel_at_period_end,
        canceledAt: stripeSubscription.canceled_at ? new Date(stripeSubscription.canceled_at * 1000).toISOString() : null,
        pauseCollection: stripeSubscription.pause_collection
      },
      customer: customer && !customer.deleted ? {
        id: customer.id,
        email: customer.email || null,
        name: customer.name || null
      } : null,
      paymentMethod: paymentMethod ? {
        id: paymentMethod.id,
        type: paymentMethod.type,
        card: paymentMethod.card ? {
          brand: paymentMethod.card.brand,
          last4: paymentMethod.card.last4,
          exp_month: paymentMethod.card.exp_month,
          exp_year: paymentMethod.card.exp_year
        } : null
      } : null
    };

    res.json(response);
  } catch (error) {
    console.error('Error getting subscription info:', error);
    res.status(500).json({ error: 'Error al obtener información de la suscripción' });
  }
}));

// Obtener facturas del usuario
router.get('/invoices', authenticateToken, asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ error: 'Usuario no autenticado' });

    const subscription = await Subscription.findOne({ userId });
    if (!subscription || !subscription.stripeSubscriptionId) {
      return res.json({ invoices: [] });
    }

    // Obtener facturas desde Stripe
    const invoices = await stripeService.getInvoices(subscription.stripeSubscriptionId);
    
    res.json({ invoices });
  } catch (error) {
    console.error('Error getting invoices:', error);
    res.status(500).json({ error: 'Error al obtener facturas' });
  }
}));

// Crear enlace de pago para activar suscripción con Stripe
router.post('/create-payment-link', authenticateToken, paymentRateLimit, asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
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
      console.log(`User ${user._id} subscription_status updated to: ${user.subscription_status}`);
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

    console.log('🔄 Creando nueva suscripción en Stripe');
    
    const successUrl = `${process.env.FRONTEND_URL}${STRIPE_CONFIG.SUCCESS_URL}`;
    const cancelUrl = `${process.env.FRONTEND_URL}${STRIPE_CONFIG.CANCEL_URL}`;
    let stripeSession;
    
    if (finalPlanType === 'crecimiento') {
      stripeSession = await stripeService.createBasicPlan(user.email, successUrl, cancelUrl);
    } else if (finalPlanType === 'pro') {
      stripeSession = await stripeService.createPremiumPlan(user.email, successUrl, cancelUrl);
    } else if (finalPlanType === 'business') {
      stripeSession = await stripeService.createEnterprisePlan(user.email, successUrl, cancelUrl);
    } else {
      throw new CustomError('Tipo de plan no válido', 400);
    }

    // Verificar que Stripe creó la sesión exitosamente
    if (!stripeSession || !stripeSession.id) {
      throw new CustomError('Error al crear la sesión de pago en Stripe', 500);
    }

    // NO crear suscripción aquí - solo crear la sesión de Stripe
    // La suscripción se creará en el webhook cuando el pago se complete exitosamente
    console.log('✅ Sesión de Stripe creada, esperando confirmación de pago en webhook');

    res.json({
      success: true,
      paymentUrl: stripeSession.url,
      sessionId: stripeSession.id,
      stripeSubscriptionId: stripeSession.subscription, // Más claro que subscriptionId
    });

  } catch (error) {
    console.error('Error creating Stripe payment link:', error);
    throw error;
  }
}));

// Webhook movido a /stripe/webhook.ts para evitar duplicación

// Cancelar suscripción de Stripe
router.put('/cancel-subscription', authenticateToken, asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      throw new CustomError('Usuario no autenticado', 401);
    }

    const subscription = await Subscription.findOne({ userId });
    if (!subscription || !subscription.stripeSubscriptionId) {
      throw new CustomError('No tienes una suscripción activa o no vinculada a Stripe', 404);
    }

    // Si tiene ID de Stripe, cancelar allí también
    if (subscription.stripeSubscriptionId) {
      try {
        await stripeService.cancelSubscription(subscription.stripeSubscriptionId);
      } catch (error) {
        console.error('Error cancelling in Stripe:', error);
        // Continuar con la cancelación local aunque falle en Stripe
      }
    }

    // Cancelar con período de gracia (7 días por defecto)
    (subscription as any).cancelSubscription(7);
    await subscription.save();

    // Actualizar estado del usuario
    const user = await User.findById(userId);
    if (user) {
      user.subscription_status = 'cancelled';
      await user.save();
    }

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
  } catch (error: any) {
    console.error('Error cancelling Stripe subscription:', error);
    res.status(error.statusCode || 500).json({
      success: false,
      error: error.message || 'Error interno del servidor'
    });
  }
}));

// Endpoint para corregir estado de suscripciones existentes
router.post('/fix-trial-status', authenticateToken, asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({ error: 'Usuario no autenticado' });
    }

    const subscription = await Subscription.findOne({ userId });

    if (!subscription) {
      return res.status(404).json({ error: 'No se encontró suscripción' });
    }

    // Si la suscripción está activa pero aún está dentro del período de prueba, corregir el estado
    if (subscription.status === 'active' && subscription.trialEndDate && new Date() < subscription.trialEndDate) {
      subscription.status = 'trialing';
      await subscription.save();

      // Actualizar estado del usuario
      const user = await User.findById(userId);
      if (user) {
        user.subscription_status = 'active_trial';
        await user.save();
      }

      return res.json({
        success: true,
        message: 'Estado de suscripción corregido a período de prueba',
        subscription: {
          id: subscription._id,
          status: subscription.status,
          trialEndDate: subscription.trialEndDate
        }
      });
    }

    return res.json({
      success: true,
      message: 'La suscripción ya está en el estado correcto',
      subscription: {
        id: subscription._id,
        status: subscription.status,
        trialEndDate: subscription.trialEndDate
      }
    });

  } catch (error) {
    console.error('Error fixing trial status:', error);
    throw error;
  }
}));

// Cancelar suscripción de Stripe (endpoint legacy)
router.post('/cancel', authenticateToken, asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
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

    // Si tiene ID de Stripe, cancelar allí también
    if (subscription.stripeSubscriptionId) {
      try {
        await stripeService.cancelSubscription(subscription.stripeSubscriptionId);
      } catch (error) {
        console.error('Error cancelling in Stripe:', error);
        // Continuar con la cancelación local aunque falle en Stripe
      }
    }

    // Cancelar con período de gracia (0 días para trials, 7 días para otros)
    const gracePeriodDays = subscription.status === 'trialing' ? 0 : 7;
    (subscription as any).cancelSubscription(gracePeriodDays);
    await subscription.save();

    // Actualizar el estado del usuario
    const user = await User.findById(subscription.userId);
    if (user) {
      user.subscription_status = 'cancelled';
      await user.save();
      console.log(`User ${user._id} subscription_status updated to: ${user.subscription_status}`);
    }

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
    console.error('Error cancelling Stripe subscription:', error);
    throw error;
  }
}));

// Pausar suscripción de Stripe
router.post('/pause', authenticateToken, asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
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

    // Pausar en Stripe si existe
    if (subscription.stripeSubscriptionId) {
      try {
        await stripeService.pauseSubscription(subscription.stripeSubscriptionId);
      } catch (error) {
        console.error('Error pausing in Stripe:', error);
        // Continuar con la pausa local aunque falle en Stripe
      }
    }

    (subscription as any).pauseSubscription();
    await subscription.save();

    // Actualizar el estado del usuario
    const user = await User.findById(subscription.userId);
    if (user) {
      user.subscription_status = 'cancelled'; // Usuario pausado = cancelado en nuestro sistema
      await user.save();
      console.log(`User ${user._id} subscription_status updated to: ${user.subscription_status}`);
    }

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
    console.error('Error pausing Stripe subscription:', error);
    throw error;
  }
}));

// Cambiar plan de suscripción
router.post('/change-plan', authenticateToken, asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    const { newPlanType } = req.body;

    if (!userId) {
      throw new CustomError('Usuario no autenticado', 401);
    }

    if (!newPlanType || !['crecimiento', 'pro', 'business'].includes(newPlanType)) {
      throw new CustomError('Tipo de plan inválido', 400);
    }

    // Buscar suscripción actual
    const currentSubscription = await Subscription.findOne({
      userId,
      status: 'active'
    });

    if (!currentSubscription) {
      throw new CustomError('No tienes una suscripción activa para cambiar', 404);
    }

    // Verificar que no esté cambiando al mismo plan
    if (currentSubscription.planType === newPlanType) {
      throw new CustomError('Ya tienes el plan seleccionado', 400);
    }

    // Crear nueva sesión de checkout para el nuevo plan
    const user = await User.findById(userId);
    if (!user) {
      throw new CustomError('Usuario no encontrado', 404);
    }

    const successUrl = `${process.env.FRONTEND_URL}/dashboard?plan_change_success=true&session_id={CHECKOUT_SESSION_ID}`;
    const cancelUrl = `${process.env.FRONTEND_URL}/dashboard?plan_change_cancelled=true`;
    
    let stripeSession;
    if (newPlanType === 'crecimiento') {
      stripeSession = await stripeService.createBasicPlan(user.email, successUrl, cancelUrl);
    } else if (newPlanType === 'pro') {
      stripeSession = await stripeService.createPremiumPlan(user.email, successUrl, cancelUrl);
    } else if (newPlanType === 'business') {
      stripeSession = await stripeService.createEnterprisePlan(user.email, successUrl, cancelUrl);
    }

    if (!stripeSession || !stripeSession.id) {
      throw new CustomError('Error al crear la sesión de pago para el nuevo plan', 500);
    }

    // Marcar la suscripción actual como pendiente de cambio
    currentSubscription.status = 'incomplete';
    await currentSubscription.save();

    res.json({
      success: true,
      paymentUrl: stripeSession.url,
      sessionId: stripeSession.id,
      message: `Redirigiendo para cambiar a Plan ${newPlanType.charAt(0).toUpperCase() + newPlanType.slice(1)}`
    });

  } catch (error: any) {
    console.error('Error changing subscription plan:', error);
    res.status(error.statusCode || 500).json({
      success: false,
      error: error.message || 'Error interno del servidor'
    });
  }
}));

// Reactivar suscripción pausada de Stripe
router.post('/reactivate', authenticateToken, asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
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

    // Reactivar en Stripe si existe
    if (subscription.stripeSubscriptionId) {
      try {
        await stripeService.resumeSubscription(subscription.stripeSubscriptionId);
      } catch (error) {
        console.error('Error reactivating in Stripe:', error);
        // Continuar con la reactivación local aunque falle en Stripe
      }
    }

    // Reactivar localmente
    (subscription as any).reactivateSubscription();
    await subscription.save();

    // Actualizar el estado del usuario
    const user = await User.findById(subscription.userId);
    if (user) {
      user.subscription_status = 'active_trial';
      await user.save();
      console.log(`User ${user._id} subscription_status updated to: ${user.subscription_status}`);
    }

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
    console.error('Error reactivating Stripe subscription:', error);
    throw error;
  }
}));

// Obtener configuración pública de Stripe
router.get('/config', (req: Request, res: Response) => {
  try {
    const config = stripeService.getPublicConfig();
    res.json(config);
  } catch (error) {
    console.error('Error getting Stripe config:', error);
    res.status(500).json({ error: 'Error obteniendo configuración de Stripe' });
  }
});

export default router;
