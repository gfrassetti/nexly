/* "Captura webhooks de Stripe y crea/actualiza suscripciones en la DB cuando ocurren eventos de pago"
Escucha eventos como checkout.session.completed
Crea la suscripción en la DB SOLO cuando el pago se completa exitosamente */


import { Router, Request, Response } from "express";
import Stripe from "stripe";
import { User } from "../../models/User";
import { default as Subscription, ISubscription } from "../../models/Subscription";
import { handleAddOnPaymentSuccess } from "../../services/addOnService";
import logger from "../../utils/logger";
const router = Router();

// Inicializar Stripe
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2025-08-27.basil',
});


// Endpoint para webhooks de Stripe
router.post('/', async (req: Request, res: Response) => {
  const sig = req.headers['stripe-signature'] as string;
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET!;

  let event: Stripe.Event;

  try {
    // Verificar la firma del webhook usando el body raw (Buffer)
    event = stripe.webhooks.constructEvent(req.body, sig, webhookSecret);
  } catch (err: any) {
    console.error('Webhook signature verification failed:', err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  try {
    switch (event.type) {
      case 'checkout.session.completed':
        await handleCheckoutSessionCompleted(event.data.object as Stripe.Checkout.Session);
        break;
      
      case 'invoice.paid':
        await handleInvoicePaid(event.data.object as Stripe.Invoice);
        break;
      
      case 'invoice.payment_failed':
        await handleInvoicePaymentFailed(event.data.object as Stripe.Invoice);
        break;
      
      case 'customer.subscription.updated':
        await handleSubscriptionUpdated(event.data.object as Stripe.Subscription);
        break;
      
      case 'customer.subscription.deleted':
        await handleSubscriptionDeleted(event.data.object as Stripe.Subscription);
        break;
      
      case 'customer.subscription.trial_will_end':
        // Este evento solo notifica; no es necesario cambiar el estado a 'active' aquí,
        // ya que el siguiente evento 'invoice.paid' o 'invoice.payment_failed' lo hará.
        await handleTrialWillEnd(event.data.object as Stripe.Subscription);
        break;
      
      default:
        console.log(`Unhandled event type: ${event.type}`);
    }

    res.json({ received: true });
  } catch (error) {
    console.error('Error processing webhook:', error);
    res.status(500).json({ error: 'Webhook processing failed' });
  }
});

// Manejar pago exitoso de factura
async function handleInvoicePaid(invoice: Stripe.Invoice) {
  console.log('Invoice paid:', invoice.id);
  
  if ((invoice as any).subscription && typeof (invoice as any).subscription === 'string') {
    const subscriptionId = (invoice as any).subscription as string;
    
    // 1. Actualizar el estado de la suscripción a 'active'
    const subscription = await Subscription.findOneAndUpdate(
      { stripeSubscriptionId: subscriptionId },
      { 
        status: 'active',
        lastPaymentDate: new Date(),
        trialEndDate: undefined // Ya no hay trial
      },
      { new: true }
    );
    
    // 2. Actualizar el estado del usuario
    if (subscription) {
      const user = await User.findById(subscription.userId);
      if (user) {
        user.subscription_status = 'active_paid'; // CLAVE: Cambia de 'active_trial' a 'active_paid'
        await user.save();
        console.log(`User ${user._id} status updated to active_paid.`);
      }
    }
    
    console.log(`Subscription ${subscriptionId} activated after payment`);
  }
}

// Manejar pago fallido de factura
async function handleInvoicePaymentFailed(invoice: Stripe.Invoice) {
  console.log('Invoice payment failed:', invoice.id);
  
  if ((invoice as any).subscription && typeof (invoice as any).subscription === 'string') {
    const subscriptionId = (invoice as any).subscription as string;
    
    // Actualizar el estado de la suscripción
    await Subscription.findOneAndUpdate(
      { stripeSubscriptionId: subscriptionId },
      { 
        status: 'past_due',
        lastPaymentAttempt: new Date(),
        // No se debe tocar trialEndDate aquí, Stripe ya lo maneja
      },
      { new: true }
    );
    
    // El estado del usuario puede seguir siendo 'active_paid' o 'active_trial'
    // hasta que el grace period termine, pero la suscripción está 'past_due'.
    // Esto lo debería manejar el evento 'customer.subscription.updated' o 'deleted' de Stripe.
    
    console.log(`Subscription ${subscriptionId} marked as past_due after payment failure`);
  }
}

// Manejar actualización de suscripción
async function handleSubscriptionUpdated(subscription: Stripe.Subscription) {
  console.log('Subscription updated:', subscription.id);
  
  const subscriptionData = await Subscription.findOne({ 
    stripeSubscriptionId: subscription.id 
  });
  
  if (subscriptionData) {
    // Determine the user's status based on the Stripe status
    let newSubscriptionStatus: 'active_paid' | 'active_trial' | 'cancelled' = 'active_paid'; // Default
    
    if (subscription.status === 'trialing') {
        newSubscriptionStatus = 'active_trial';
    } else if (subscription.status === 'active') {
        newSubscriptionStatus = 'active_paid';
    } else if (subscription.status === 'canceled') {
        newSubscriptionStatus = 'cancelled';
    }
    
    // Actualizar solo el status y fechas - los estados se calculan dinámicamente
    await Subscription.findOneAndUpdate(
      { stripeSubscriptionId: subscription.id },
      {
        status: subscription.status,
        planType: subscription.items.data[0]?.price?.lookup_key === 'premium_plan' ? 'premium' : 'basic',
        trialEndDate: subscription.trial_end ? new Date(subscription.trial_end * 1000) : undefined,
        pausedAt: subscription.pause_collection?.behavior ? new Date() : undefined,
        cancelledAt: subscription.canceled_at ? new Date(subscription.canceled_at * 1000) : undefined,
        updatedAt: new Date()
      },
      { new: true }
    );
    
    // Actualizar el estado del usuario si el estado de Stripe lo requiere
    const user = await User.findById(subscriptionData.userId);
    if (user) {
        user.subscription_status = newSubscriptionStatus;
        await user.save();
    }
    
    console.log(`Subscription ${subscription.id} updated to ${subscription.status}`);
  }
}

// Manejar cancelación de suscripción
async function handleSubscriptionDeleted(subscription: Stripe.Subscription) {
  console.log('Subscription deleted:', subscription.id);
  
  const sub = await Subscription.findOneAndUpdate(
    { stripeSubscriptionId: subscription.id },
    { 
      status: 'canceled',
      cancelledAt: new Date()
    },
    { new: true }
  );
  
  if (sub) {
    const user = await User.findById(sub.userId);
    if (user) {
        user.subscription_status = 'cancelled'; // Usuario en estado de cancelación
        await user.save();
    }
  }
  
  console.log(`Subscription ${subscription.id} canceled and user status updated.`);
}

// Manejar fin de trial próximo
async function handleTrialWillEnd(subscription: Stripe.Subscription) {
  console.log('Trial will end soon:', subscription.id);
  
  // No hacemos nada, ya que el estado se manejará con 'invoice.paid' o 'invoice.payment_failed'
  // El estado de 'trialing' ya permite acceso.
  
  console.log(`Trial will end soon notification received for ${subscription.id}. No DB change needed.`);
}

// Manejar checkout completado exitosamente
async function handleCheckoutSessionCompleted(session: Stripe.Checkout.Session) {
  console.log('Checkout session completed:', session.id);
  
  try {
    // Verificar si es un add-on o una suscripción
    if (session.metadata?.addOnPurchaseId) {
      // Es un pago de add-on
      await handleAddOnPaymentSuccess(session.id);
      logger.info('Add-on payment processed successfully', {
        sessionId: session.id,
        addOnPurchaseId: session.metadata.addOnPurchaseId,
        userId: session.metadata.userId
      });
      return;
    }

    // Es una suscripción normal - lógica de trial
    
    // 1. Obtener el customer email de la sesión
    const customerEmail = session.customer_details?.email;
    if (!customerEmail || !session.subscription) {
      console.error('No customer email or subscription ID found in session:', session.id);
      return;
    }

    // 2. Buscar el usuario por email
    const user = await User.findOne({ email: customerEmail });
    if (!user) {
      console.error('User not found for email:', customerEmail);
      return;
    }
    
    // 3. OBTENER ESTADO Y DATOS REALES DE STRIPE (CRÍTICO)
    const stripeSubscription = await stripe.subscriptions.retrieve(session.subscription as string);
    
    // 4. Determinar el estado inicial y el estado del usuario
    const isTrial = !!stripeSubscription.trial_end;
    // El status de Stripe para un trial es 'trialing'. Si no hay trial_end, será 'active' (cobro inmediato).
    const initialStatus = isTrial ? 'trialing' : 'active'; 
    const initialUserStatus = isTrial ? 'active_trial' : 'active_paid'; // Estado CLAVE para el frontend
    
    // 5. Determinar el tipo de plan
    let planType = 'basic';
    const priceId = stripeSubscription.items.data[0]?.price?.id;
    planType = priceId?.includes('premium') ? 'premium' : 'basic';
    
    // 6. Obtener fechas reales de Stripe
    const startDate = new Date(stripeSubscription.created * 1000); 
    const trialEndDate = isTrial 
      ? new Date(stripeSubscription.trial_end! * 1000) 
      : undefined; 

    // Crear la suscripción en la base de datos
    const subscription = new Subscription({
      userId: user._id.toString(),
      planType: planType as 'basic' | 'premium' | 'enterprise',
      status: initialStatus as 'trialing' | 'active', // Estado real de Stripe
      startDate,
      trialEndDate, // Fecha de trial real o undefined (CORRECCIÓN CRÍTICA)
      autoRenew: false,
      stripeSubscriptionId: session.subscription as string,
      stripeSessionId: session.id,
    });

    await subscription.save();

    // Actualizar el estado del usuario
    user.subscription_status = initialUserStatus; // CORRECCIÓN CRÍTICA
    await user.save();

    console.log(`✅ Subscription created for user ${user._id}. Initial Status: ${initialStatus} (User Status: ${user.subscription_status})`);
    console.log(`Subscription ID: ${subscription._id}, Stripe Subscription: ${session.subscription}`);

  } catch (error) {
    console.error('Error creating subscription after checkout completion:', error);
  }
}

export default router;