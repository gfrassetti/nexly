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
    
    // 1. Obtener la suscripción de Stripe para determinar el plan correcto
    const stripeSubscription = await stripe.subscriptions.retrieve(subscriptionId);
    const priceId = stripeSubscription.items.data[0]?.price?.id || '';
    const planType = mapPriceIdToPlanType(priceId);
    
    // 2. Actualizar el estado de la suscripción a 'active'
    const subscription = await Subscription.findOneAndUpdate(
      { stripeSubscriptionId: subscriptionId },
      { 
        status: 'active',
        planType: planType, // ← CORRECCIÓN: Actualizar planType
        lastPaymentDate: new Date(),
        trialEndDate: undefined // Ya no hay trial
      },
      { new: true }
    );
    
    // 3. Actualizar el estado del usuario ATÓMICAMENTE
    if (subscription) {
      await User.findByIdAndUpdate(subscription.userId, {
        subscription_status: 'active_paid', // CLAVE: Cambia de 'active_trial' a 'active_paid'
        selectedPlan: planType, // ← CORRECCIÓN CRÍTICA: Actualizar selectedPlan
        freeTrialUsed: true, // Si pagó, el trial está superado
      });
      console.log(`User ${subscription.userId} status updated to active_paid with plan ${planType}.`);
    }
    
    console.log(`Subscription ${subscriptionId} activated after payment. Plan: ${planType}`);
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
    
    // Determinar el plan correcto usando mapeo robusto
    const priceId = subscription.items.data[0]?.price?.id || '';
    const planType = mapPriceIdToPlanType(priceId);
    
    // Actualizar solo el status y fechas - los estados se calculan dinámicamente
    await Subscription.findOneAndUpdate(
      { stripeSubscriptionId: subscription.id },
      {
        status: subscription.status,
        planType: planType, // ← CORRECCIÓN: Usar mapeo robusto
        trialEndDate: subscription.trial_end ? new Date(subscription.trial_end * 1000) : undefined,
        pausedAt: subscription.pause_collection?.behavior ? new Date() : undefined,
        cancelledAt: subscription.canceled_at ? new Date(subscription.canceled_at * 1000) : undefined,
        updatedAt: new Date()
      },
      { new: true }
    );
    
    // Actualizar el estado del usuario ATÓMICAMENTE
    await User.findByIdAndUpdate(subscriptionData.userId, {
      subscription_status: newSubscriptionStatus,
      selectedPlan: planType, // ← CORRECCIÓN CRÍTICA: Actualizar selectedPlan
    });
    
    console.log(`Subscription ${subscription.id} updated to ${subscription.status} with plan ${planType}`);
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

// Función para mapear priceId de Stripe a planType interno
function mapPriceIdToPlanType(priceId: string): 'crecimiento' | 'pro' | 'business' {
  // Mapeo robusto de priceId a planType usando las variables de entorno de Railway
  if (priceId === process.env.STRIPE_BASIC_PRICE_ID) {
    return 'crecimiento';
  } else if (priceId === process.env.STRIPE_PREMIUM_PRICE_ID) {
    return 'pro';
  } else if (priceId === process.env.STRIPE_ENTERPRISE_PRICE_ID) {
    return 'business';
  }
  
  // Fallback: mapeo por palabras clave si las variables de entorno no están definidas
  if (priceId.includes('premium') || priceId.includes('pro')) {
    return 'pro';
  } else if (priceId.includes('enterprise') || priceId.includes('business')) {
    return 'business';
  } else {
    return 'crecimiento'; // Plan base por defecto
  }
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
    
    // 5. Determinar el tipo de plan usando mapeo robusto
    const priceId = stripeSubscription.items.data[0]?.price?.id || '';
    const planType = mapPriceIdToPlanType(priceId);
    
    // 6. Obtener fechas reales de Stripe
    const startDate = new Date(stripeSubscription.created * 1000); 
    const trialEndDate = isTrial 
      ? new Date(stripeSubscription.trial_end! * 1000) 
      : undefined; 

    // 7. ACTUALIZACIÓN ATÓMICA DEL USUARIO (CRÍTICO)
    // Si el usuario pagó, debe actualizarse su selectedPlan y estado
    await User.findByIdAndUpdate(user._id, {
      subscription_status: initialUserStatus,
      selectedPlan: planType, // ← CORRECCIÓN CRÍTICA: Actualizar selectedPlan
      freeTrialUsed: true, // Si compró, el trial está superado
    });

    // 8. ACTUALIZAR O CREAR suscripción en la base de datos
    // Primero buscar si ya existe una suscripción para este usuario
    let subscription = await Subscription.findOne({ userId: user._id.toString() });
    
    if (subscription) {
      // ACTUALIZAR suscripción existente
      subscription.planType = planType;
      subscription.status = initialStatus as 'trialing' | 'active';
      subscription.startDate = startDate;
      subscription.trialEndDate = trialEndDate as any;
      subscription.autoRenew = true;
      subscription.stripeSubscriptionId = session.subscription as string;
      subscription.stripeSessionId = session.id;
      subscription.updatedAt = new Date();
      
      await subscription.save();
      console.log(`✅ Subscription UPDATED for user ${user._id}. Plan: ${planType}, Status: ${initialStatus}`);
    } else {
      // CREAR nueva suscripción solo si no existe
      subscription = new Subscription({
        userId: user._id.toString(),
        planType: planType,
        status: initialStatus as 'trialing' | 'active',
        startDate,
        trialEndDate,
        autoRenew: true,
        stripeSubscriptionId: session.subscription as string,
        stripeSessionId: session.id,
      });

      await subscription.save();
      console.log(`✅ Subscription CREATED for user ${user._id}. Plan: ${planType}, Status: ${initialStatus}`);
    }

    console.log(`✅ Subscription created for user ${user._id}. Plan: ${planType}, Status: ${initialStatus} (User Status: ${initialUserStatus})`);
    console.log(`Subscription ID: ${subscription._id}, Stripe Subscription: ${session.subscription}`);
    console.log(`Price ID: ${priceId} → Plan Type: ${planType}`);

  } catch (error) {
    console.error('Error creating subscription after checkout completion:', error);
  }
}

export default router;