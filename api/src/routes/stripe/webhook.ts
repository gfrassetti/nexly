/* "Captura webhooks de Stripe y crea/actualiza suscripciones en la DB cuando ocurren eventos de pago"
Escucha eventos como checkout.session.completed
Crea la suscripción en la DB SOLO cuando el pago se completa exitosamente */


import { Router, Request, Response } from "express";
import Stripe from "stripe";
import { User } from "../../models/User";
import { default as SubscriptionModel, ISubscription } from "../../models/Subscription";
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
    
    // 1. Encontrar y actualizar la Suscripción
    const updatedSubscription = await SubscriptionModel.findOneAndUpdate(
      { stripeSubscriptionId: subscriptionId },
      { 
        status: 'active',
        lastPaymentDate: new Date()
      },
      { new: true }
    );
    
    if (updatedSubscription) {
      // 2. ENCONTRAR AL USUARIO ASOCIADO
      const user = await User.findById(updatedSubscription.userId);
      
      if (user && user.subscription_status !== 'active_paid') {
        // 3. ACTUALIZAR EL ESTADO DEL USUARIO (CRÍTICO PARA LA UI)
        user.subscription_status = 'active_paid';
        await user.save();
        console.log(`User ${user._id} status updated to active_paid after invoice paid.`);
      }
      
      console.log(`Subscription ${subscriptionId} activated after payment`);
    } else {
      console.log(`Subscription ${subscriptionId} not found in database for update.`);
    }
  }
}

// Manejar pago fallido de factura
async function handleInvoicePaymentFailed(invoice: Stripe.Invoice) {
  console.log('Invoice payment failed:', invoice.id);
  console.log('Invoice details:', {
    id: invoice.id,
    subscription: (invoice as any).subscription,
    status: invoice.status,
    payment_intent: (invoice as any).payment_intent,
    last_payment_attempt: (invoice as any).last_payment_attempt,
    next_payment_attempt: invoice.next_payment_attempt
  });
  
  if ((invoice as any).subscription && typeof (invoice as any).subscription === 'string') {
    const subscriptionId = (invoice as any).subscription as string;
    
    // Buscar la suscripción en la base de datos
    const subscription = await SubscriptionModel.findOne({ stripeSubscriptionId: subscriptionId });
    
    if (subscription) {
      // CORRECCIÓN: Simplificar lógica - marcar como past_due y dejar que 
      // customer.subscription.updated actualice el estado correctamente
      await SubscriptionModel.findOneAndUpdate(
        { stripeSubscriptionId: subscriptionId },
        { 
          status: 'past_due',
          lastPaymentAttempt: new Date()
        },
        { new: true }
      );
      
      // CORRECCIÓN: Actualizar el estado del usuario si falló el pago
      const user = await User.findById(subscription.userId);
      if (user) {
        // Si falló el pago, marcar como cancelled (no puede usar el servicio)
        if (user.subscription_status === 'active_trial' || user.subscription_status === 'active_paid') {
          user.subscription_status = 'cancelled';
          await user.save();
          console.log(`User ${user._id} marked as cancelled after payment failure`);
        }
      }
      
      console.log(`Subscription ${subscriptionId} marked as past_due after payment failure`);
    } else {
      console.log(`Subscription ${subscriptionId} not found in database`);
    }
  }
}

// Manejar actualización de suscripción
async function handleSubscriptionUpdated(subscription: Stripe.Subscription) {
  console.log('Subscription updated:', subscription.id);
  
  const subscriptionData = await SubscriptionModel.findOne({ 
    stripeSubscriptionId: subscription.id 
  });
  
  if (subscriptionData) {
    // Actualizar solo el status y fechas - los estados se calculan dinámicamente
    await SubscriptionModel.findOneAndUpdate(
      { stripeSubscriptionId: subscription.id },
      {
        status: subscription.status, // CRÍTICO: USA EL ESTADO DE STRIPE
        planType: subscription.items.data[0]?.price?.lookup_key === 'premium_plan' ? 'premium' : 'basic',
        trialEndDate: subscription.trial_end ? new Date(subscription.trial_end * 1000) : undefined,
        pausedAt: subscription.pause_collection?.behavior ? new Date() : undefined,
        cancelledAt: subscription.canceled_at ? new Date(subscription.canceled_at * 1000) : undefined,
        updatedAt: new Date()
      },
      { new: true }
    );
    
    // CORRECCIÓN: Actualizar también el estado del usuario según el estado de Stripe
    const user = await User.findById(subscriptionData.userId);
    if (user) {
      let newUserStatus = user.subscription_status;
      
      // Mapear estados de Stripe a estados de User
      switch (subscription.status) {
        case 'trialing':
          newUserStatus = 'active_trial';
          break;
        case 'active':
          newUserStatus = 'active_paid';
          break;
        case 'past_due':
        case 'canceled':
        case 'unpaid':
        case 'paused':
        case 'incomplete':
        case 'incomplete_expired':
          // Todos estos estados significan que el usuario no puede usar el servicio
          newUserStatus = 'cancelled';
          break;
      }
      
      if (user.subscription_status !== newUserStatus) {
        user.subscription_status = newUserStatus;
        await user.save();
        console.log(`User ${user._id} status updated from ${subscriptionData.status} to ${newUserStatus}`);
      }
    }
    
    console.log(`Subscription ${subscription.id} updated to ${subscription.status}`);
  }
}

// Manejar cancelación de suscripción
async function handleSubscriptionDeleted(subscription: Stripe.Subscription) {
  console.log('Subscription deleted:', subscription.id);
  
  const subscriptionData = await SubscriptionModel.findOneAndUpdate(
    { stripeSubscriptionId: subscription.id },
    { 
      status: 'canceled',
      cancelledAt: new Date()
    },
    { new: true }
  );
  
  // CORRECCIÓN: Actualizar el estado del usuario cuando se cancela la suscripción
  if (subscriptionData) {
    const user = await User.findById(subscriptionData.userId);
    if (user) {
      user.subscription_status = 'cancelled';
      await user.save();
      console.log(`User ${user._id} marked as cancelled after subscription cancellation`);
    }
  }
  
  console.log(`Subscription ${subscription.id} canceled`);
}

// Manejar fin de trial próximo
async function handleTrialWillEnd(subscription: Stripe.Subscription) {
  console.log('Trial will end soon:', subscription.id);
  
  // Aquí podrías enviar una notificación al usuario
  // Por ejemplo, un email recordando que el trial está por terminar
  
  console.log(`Trial for subscription ${subscription.id} will end soon`);
}

// Manejar checkout completado exitosamente
async function handleCheckoutSessionCompleted(session: Stripe.Checkout.Session) {
  console.log('Checkout session completed:', session.id);
  
  try {
    // Obtener el customer email de la sesión
    const customerEmail = session.customer_details?.email;
    if (!customerEmail) {
      console.error('No customer email found in session:', session.id);
      return;
    }

    // Buscar el usuario por email
    const user = await User.findOne({ email: customerEmail });
    if (!user) {
      console.error('User not found for email:', customerEmail);
      return;
    }

    // CORRECCIÓN: Obtener la suscripción de Stripe para leer su estado REAL
    if (!session.subscription) {
      console.error('No subscription found in session:', session.id);
      return;
    }

    const stripeSubscription = await stripe.subscriptions.retrieve(session.subscription as string) as Stripe.Subscription;
    
    // Determinar el tipo de plan desde los metadatos o desde la suscripción
    let planType = 'basic';
    if (session.metadata?.planType) {
      planType = session.metadata.planType;
    } else {
      const priceId = stripeSubscription.items.data[0]?.price?.id;
      const lookupKey = stripeSubscription.items.data[0]?.price?.lookup_key;
      // Mapear priceId o lookup_key a planType
      planType = (lookupKey === 'premium_plan' || priceId?.includes('premium')) ? 'premium' : 'basic';
    }

    // CORRECCIÓN: El estado inicial DEBE reflejar el estado de Stripe
    // Si hay trial_end, el estado es 'trialing', de lo contrario es 'active'
    const initialStatus = stripeSubscription.trial_end ? 'trialing' : stripeSubscription.status;
    
    // CORRECCIÓN: Usar las fechas reales de Stripe, no calcularlas manualmente
    const startDate = new Date((stripeSubscription as any).current_period_start * 1000);
    const trialEndDate = stripeSubscription.trial_end 
      ? new Date(stripeSubscription.trial_end * 1000) 
      : undefined;

    const subscription = new SubscriptionModel({
      userId: user._id.toString(),
      planType: planType as 'basic' | 'premium',
      status: initialStatus, // CORRECCIÓN: Estado real de Stripe
      startDate,
      trialEndDate,
      autoRenew: false,
      stripeSubscriptionId: session.subscription as string,
      stripeSessionId: session.id,
    });

    await subscription.save();

    // CORRECCIÓN: Actualizar el estado del usuario según el periodo de prueba
    // Si está en trial, marcar como 'active_trial', de lo contrario 'active_paid'
    user.subscription_status = stripeSubscription.trial_end ? 'active_trial' : 'active_paid';
    await user.save();

    console.log(`✅ Subscription created for user ${user._id} after checkout completion`);
    console.log(`Initial Status: ${initialStatus} (Trial: ${stripeSubscription.trial_end ? 'Yes' : 'No'})`);
    console.log(`Subscription ID: ${subscription._id}, Stripe Subscription: ${session.subscription}`);

  } catch (error) {
    console.error('Error creating subscription after checkout completion:', error);
  }
}

export default router;
