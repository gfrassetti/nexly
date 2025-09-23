// api/src/routes/stripe.ts
import express from 'express';
import authenticateToken from '../middleware/auth';
import { stripeService } from '../services/stripe';
import Subscription from '../models/Subscription';
import { User } from '../models/User';
import { asyncHandler, CustomError } from '../utils/errorHandler';
import { validateSubscriptionData, paymentRateLimit } from '../middleware/security';
import { stripeWebhookVerification } from '../middleware/verifyStripeSignature';

const router = express.Router();

/**
 * Obtener información completa de la suscripción desde Stripe
 */
router.get('/subscription-info', authenticateToken, asyncHandler(async (req: any, res: any) => {
  try {
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({ error: 'Usuario no autenticado' });
    }

    // Buscar la suscripción del usuario en nuestra base de datos
    const subscription = await Subscription.findOne({ userId });

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
          currentPeriodEnd: subscription.currentPeriodEnd,
          amount: subscription.planType === 'basic' ? 2999 : 4999, // en centavos
          currency: 'usd'
        },
        customer: null
      });
    }

    // Obtener información completa desde Stripe
    const stripeSubscription = await stripeService.getSubscription(subscription.stripeSubscriptionId);
    
    // Obtener información del customer
    let customer = null;
    if (stripeSubscription.customer) {
      customer = await stripeService.getCustomer(stripeSubscription.customer);
    }

    // Obtener información del método de pago por defecto
    let paymentMethod = null;
    if (customer?.invoice_settings?.default_payment_method) {
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
        currentPeriodEnd: new Date(stripeSubscription.current_period_end * 1000).toISOString(),
        currentPeriodStart: new Date(stripeSubscription.current_period_start * 1000).toISOString(),
        amount: stripeSubscription.items?.data?.[0]?.price?.unit_amount || 0,
        currency: stripeSubscription.currency || 'usd',
        cancelAtPeriodEnd: stripeSubscription.cancel_at_period_end,
        canceledAt: stripeSubscription.canceled_at ? new Date(stripeSubscription.canceled_at * 1000).toISOString() : null,
        pauseCollection: stripeSubscription.pause_collection
      },
      customer: customer ? {
        id: customer.id,
        email: customer.email,
        name: customer.name
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

/**
 * Crear enlace de pago para activar suscripción con Stripe
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
      console.log(`User ${user._id} subscription_status updated to: ${user.subscription_status}`);
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

    console.log('🔄 Creando nueva suscripción en Stripe');
    
    const successUrl = `${process.env.FRONTEND_URL}/dashboard/subscription/success`;
    const cancelUrl = `${process.env.FRONTEND_URL}/pricing`;
    let stripeSession;
    
    if (finalPlanType === 'basic') {
      stripeSession = await stripeService.createBasicPlan(user.email, successUrl, cancelUrl);
    } else {
      stripeSession = await stripeService.createPremiumPlan(user.email, successUrl, cancelUrl);
    }

    // Verificar que Stripe creó la sesión exitosamente
    if (!stripeSession || !stripeSession.id) {
      throw new CustomError('Error al crear la sesión de pago en Stripe', 500);
    }

    // Verificar si ya existe una suscripción pendiente
    const existingPending = await Subscription.findOne({
      userId,
      status: 'trial'
    });

    let savedSubscription;
    
    if (existingPending) {
      // Actualizar la suscripción existente con el nuevo ID de Stripe
      existingPending.stripeSubscriptionId = stripeSession.subscription as string;
      existingPending.stripeSessionId = stripeSession.id;
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
        stripeSubscriptionId: stripeSession.subscription as string,
        stripeSessionId: stripeSession.id,
      });

      await subscription.save();
      savedSubscription = subscription;
    }

    res.json({
      success: true,
      paymentUrl: stripeSession.url,
      sessionId: stripeSession.id,
      subscriptionId: stripeSession.subscription,
    });

  } catch (error) {
    console.error('Error creating Stripe payment link:', error);
    throw error;
  }
}));

/**
 * Webhook de Stripe para actualizar estado de suscripciones
 */
router.post('/webhook', express.raw({ type: 'application/json' }), stripeWebhookVerification, async (req: any, res) => {
  try {
    const event = req.stripeEvent;

    console.log('Received Stripe webhook:', event.type);

    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object;
        console.log('Checkout session completed:', session.id);
        break;
      }

      case 'customer.subscription.created': {
        const subscription = event.data.object;
        console.log('Subscription created:', subscription.id);
        
        // Buscar la suscripción en nuestra BD
        const dbSubscription = await Subscription.findOne({
          stripeSubscriptionId: subscription.id
        });

        if (dbSubscription) {
          // Si es el primer pago exitoso, activar la suscripción
          if (subscription.status === 'active') {
            dbSubscription.status = 'active';
            dbSubscription.autoRenew = true;
            await dbSubscription.save();

            // Actualizar el estado del usuario
            const user = await User.findById(dbSubscription.userId);
            if (user) {
              user.subscription_status = 'active_trial';
              await user.save();
              console.log(`User ${user._id} subscription_status updated to: ${user.subscription_status}`);
            }
          }

          console.log(`Subscription ${subscription.id} created with status: ${subscription.status}`);
        }
        break;
      }

      case 'customer.subscription.updated': {
        const subscription = event.data.object;
        console.log('Subscription updated:', subscription.id);
        
        // Buscar la suscripción en nuestra BD
        const dbSubscription = await Subscription.findOne({
          stripeSubscriptionId: subscription.id
        });

        if (dbSubscription) {
          // Actualizar estado según Stripe
          let newStatus = dbSubscription.status;
          let userStatus: string | null = null;

          switch (subscription.status) {
            case 'active':
              newStatus = 'active';
              userStatus = 'active_trial';
              break;
            case 'canceled':
              newStatus = 'canceled';
              userStatus = 'none';
              break;
            case 'paused':
              newStatus = 'paused';
              userStatus = 'cancelled'; // Usuario pausado = cancelado en nuestro sistema
              break;
            case 'past_due':
              newStatus = 'past_due';
              userStatus = 'cancelled'; // Usuario con pago fallido = cancelado
              break;
            case 'unpaid':
              newStatus = 'canceled';
              userStatus = 'none';
              break;
            case 'incomplete':
            case 'incomplete_expired':
              newStatus = 'trialing'; // Mantener en trial si el pago no se completó
              userStatus = 'trial_pending_payment_method';
              break;
          }

          dbSubscription.status = newStatus;
          await dbSubscription.save();

          // Actualizar el estado del usuario
          const user = await User.findById(dbSubscription.userId);
          if (user && userStatus !== null) {
            user.subscription_status = userStatus as any;
            await user.save();
            console.log(`User ${user._id} subscription_status updated to: ${user.subscription_status}`);
          }

          console.log(`Subscription ${subscription.id} updated to status: ${newStatus}`);
        }
        break;
      }

      case 'customer.subscription.deleted': {
        const subscription = event.data.object;
        console.log('Subscription deleted:', subscription.id);
        
        // Buscar la suscripción en nuestra BD
        const dbSubscription = await Subscription.findOne({
          stripeSubscriptionId: subscription.id
        });

        if (dbSubscription) {
          dbSubscription.status = 'canceled';
          await dbSubscription.save();

          // Actualizar el estado del usuario
          const user = await User.findById(dbSubscription.userId);
          if (user) {
            user.subscription_status = 'none';
            await user.save();
            console.log(`User ${user._id} subscription_status updated to: ${user.subscription_status}`);
          }

          console.log(`Subscription ${subscription.id} cancelled`);
        }
        break;
      }

      case 'invoice.payment_succeeded': {
        const invoice = event.data.object;
        console.log('Invoice payment succeeded:', invoice.id);
        
        // Si es una factura de suscripción, actualizar el estado
        if (invoice.subscription) {
          const dbSubscription = await Subscription.findOne({
            stripeSubscriptionId: invoice.subscription
          });

          if (dbSubscription && dbSubscription.status !== 'active') {
            dbSubscription.status = 'active';
            dbSubscription.autoRenew = true;
            await dbSubscription.save();

            // Actualizar el estado del usuario
            const user = await User.findById(dbSubscription.userId);
            if (user) {
              user.subscription_status = 'active_trial';
              await user.save();
              console.log(`User ${user._id} subscription_status updated to: ${user.subscription_status}`);
            }

            console.log(`Subscription ${invoice.subscription} activated after successful payment`);
          }
        }
        break;
      }

      case 'invoice.payment_failed': {
        const invoice = event.data.object;
        console.log('Invoice payment failed:', invoice.id);
        
        // Si es una factura de suscripción, marcar como past_due
        if (invoice.subscription) {
          const dbSubscription = await Subscription.findOne({
            stripeSubscriptionId: invoice.subscription
          });

          if (dbSubscription) {
            dbSubscription.status = 'past_due';
            await dbSubscription.save();

            // Actualizar el estado del usuario
            const user = await User.findById(dbSubscription.userId);
            if (user) {
              user.subscription_status = 'cancelled'; // Usuario con pago fallido = cancelado
              await user.save();
              console.log(`User ${user._id} subscription_status updated to: ${user.subscription_status}`);
            }

            console.log(`Subscription ${invoice.subscription} marked as past_due`);
          }
        }
        break;
      }

      default:
        console.log(`Unhandled event type: ${event.type}`);
    }

    res.status(200).json({ success: true });

  } catch (error) {
    console.error('Error processing Stripe webhook:', error);
    res.status(500).json({ error: 'Error procesando webhook' });
  }
});

/**
 * Cancelar suscripción de Stripe
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

/**
 * Pausar suscripción de Stripe
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

/**
 * Reactivar suscripción pausada de Stripe
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

/**
 * Obtener configuración pública de Stripe
 */
router.get('/config', (req, res) => {
  try {
    const config = stripeService.getPublicConfig();
    res.json(config);
  } catch (error) {
    console.error('Error getting Stripe config:', error);
    res.status(500).json({ error: 'Error obteniendo configuración de Stripe' });
  }
});

export default router;
