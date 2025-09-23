import { Router, Request, Response } from "express";
import Stripe from "stripe";
import handleAuth from "../middleware/auth";
import { default as Subscription, ISubscription } from "../models/Subscription";

const router = Router();
router.use(handleAuth);

// Inicializar Stripe
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2025-08-27.basil',
});

type AuthRequest = Request & { user?: { id?: string; _id?: string } };

// Pausar suscripción usando la nueva API nativa de Stripe
router.post('/pause', async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id || req.user?._id;
    const { subscriptionId, pauseBehavior = 'mark_uncollectible', resumeBehavior = 'create_prorations' } = req.body;

    if (!userId) {
      return res.status(401).json({ error: 'Usuario no autenticado' });
    }

    if (!subscriptionId) {
      return res.status(400).json({ error: 'ID de suscripción requerido' });
    }

    // Buscar la suscripción en nuestra base de datos
    const subscription = await Subscription.findOne({
      userId,
      stripeSubscriptionId: subscriptionId
    });

    if (!subscription) {
      return res.status(404).json({ error: 'Suscripción no encontrada' });
    }

    // Pausar la suscripción usando la API nativa de Stripe
    const pausedSubscription = await stripe.subscriptions.update(subscriptionId, {
      pause_collection: {
        behavior: pauseBehavior, // 'keep_as_draft', 'mark_uncollectible', o 'void'
      },
      proration_behavior: resumeBehavior, // Para cuando se reanude
    });

    // Actualizar nuestra base de datos
    await Subscription.findOneAndUpdate(
      { userId, stripeSubscriptionId: subscriptionId },
      {
        status: 'paused',
        // Estados se calculan dinámicamente con métodos
        pausedAt: new Date(),
        updatedAt: new Date(),
      }
    );

    console.log(`Subscription ${subscriptionId} paused successfully`);

    res.json({
      success: true,
      message: 'Suscripción pausada exitosamente',
      subscription: pausedSubscription
    });

  } catch (error: any) {
    console.error('Error pausing subscription:', error);
    
    // Manejar errores específicos de Stripe
    if (error.type === 'StripeInvalidRequestError') {
      return res.status(400).json({ 
        error: 'Error en la solicitud a Stripe',
        details: error.message 
      });
    }
    
    res.status(500).json({ 
      error: 'Error interno del servidor',
      details: error.message 
    });
  }
});

// Reanudar suscripción pausada
router.post('/resume', async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id || req.user?._id;
    const { subscriptionId } = req.body;

    if (!userId) {
      return res.status(401).json({ error: 'Usuario no autenticado' });
    }

    if (!subscriptionId) {
      return res.status(400).json({ error: 'ID de suscripción requerido' });
    }

    // Buscar la suscripción en nuestra base de datos
    const subscription = await Subscription.findOne({
      userId,
      stripeSubscriptionId: subscriptionId
    });

    if (!subscription) {
      return res.status(404).json({ error: 'Suscripción no encontrada' });
    }

    // Reanudar la suscripción usando la API nativa de Stripe
    const resumedSubscription = await stripe.subscriptions.update(subscriptionId, {
      pause_collection: null, // Remover la pausa
      proration_behavior: 'create_prorations', // Crear proraciones
    });

    // Actualizar nuestra base de datos
    await Subscription.findOneAndUpdate(
      { userId, stripeSubscriptionId: subscriptionId },
      {
        status: 'active',
        // Estados se calculan dinámicamente con métodos
        pausedAt: null,
        updatedAt: new Date(),
      }
    );

    console.log(`Subscription ${subscriptionId} resumed successfully`);

    res.json({
      success: true,
      message: 'Suscripción reanudada exitosamente',
      subscription: resumedSubscription
    });

  } catch (error: any) {
    console.error('Error resuming subscription:', error);
    
    if (error.type === 'StripeInvalidRequestError') {
      return res.status(400).json({ 
        error: 'Error en la solicitud a Stripe',
        details: error.message 
      });
    }
    
    res.status(500).json({ 
      error: 'Error interno del servidor',
      details: error.message 
    });
  }
});

export default router;
