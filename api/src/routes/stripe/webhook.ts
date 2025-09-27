/* "Captura webhooks de Stripe y crea/actualiza suscripciones en la DB cuando ocurren eventos de pago"
Escucha eventos como checkout.session.completed
Crea la suscripción en la DB SOLO cuando el pago se completa exitosamente */


import { Router, Request, Response } from "express";
import Stripe from "stripe";
import { User } from "../../models/User";
import { default as Subscription, ISubscription } from "../../models/Subscription";
const router = Router();

// Inicializar Stripe
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2025-08-27.basil',
});

// Middleware para verificar la firma del webhook
const verifyStripeSignature = (req: Request, res: Response, next: any) => {
  const sig = req.headers['stripe-signature'] as string;
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET!;

  try {
    const event = stripe.webhooks.constructEvent(req.body, sig, webhookSecret);
    req.body = event;
    next();
  } catch (err: any) {
    console.error('Webhook signature verification failed:', err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }
};

// Endpoint para webhooks de Stripe
router.post('/webhook', verifyStripeSignature, async (req: Request, res: Response) => {
  const event: Stripe.Event = req.body;

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
    
    // Actualizar el estado de la suscripción en la base de datos
    await Subscription.findOneAndUpdate(
      { stripeSubscriptionId: subscriptionId },
      { 
        status: 'active',
        // Estados se calculan dinámicamente con métodos
        lastPaymentDate: new Date()
      },
      { new: true }
    );
    
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
        // Estados se calculan dinámicamente con métodos
        lastPaymentAttempt: new Date()
      },
      { new: true }
    );
    
    console.log(`Subscription ${subscriptionId} marked as past due`);
  }
}

// Manejar actualización de suscripción
async function handleSubscriptionUpdated(subscription: Stripe.Subscription) {
  console.log('Subscription updated:', subscription.id);
  
  const subscriptionData = await Subscription.findOne({ 
    stripeSubscriptionId: subscription.id 
  });
  
  if (subscriptionData) {
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
    
    console.log(`Subscription ${subscription.id} updated to ${subscription.status}`);
  }
}

// Manejar cancelación de suscripción
async function handleSubscriptionDeleted(subscription: Stripe.Subscription) {
  console.log('Subscription deleted:', subscription.id);
  
  await Subscription.findOneAndUpdate(
    { stripeSubscriptionId: subscription.id },
    { 
      status: 'canceled',
      // Estados se calculan dinámicamente con métodos
      cancelledAt: new Date()
    },
    { new: true }
  );
  
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

    // Determinar el tipo de plan desde los metadatos o desde la suscripción
    let planType = 'basic';
    if (session.metadata?.planType) {
      planType = session.metadata.planType;
    } else if (session.subscription) {
      // Obtener la suscripción de Stripe para determinar el plan
      const stripeSubscription = await stripe.subscriptions.retrieve(session.subscription as string);
      const priceId = stripeSubscription.items.data[0]?.price?.id;
      // Aquí podrías mapear priceId a planType según tu configuración
      // Por ahora usamos 'premium' si no es el plan básico
      planType = priceId?.includes('premium') ? 'premium' : 'basic';
    }

    // Crear la suscripción en la base de datos SOLO cuando el pago se complete
    const startDate = new Date();
    const trialEndDate = new Date();
    trialEndDate.setDate(trialEndDate.getDate() + 7); // 7 días de prueba

    const subscription = new Subscription({
      userId: user._id.toString(),
      planType: planType as 'basic' | 'premium',
      status: 'trialing', // Ahora sí es correcto crear con status 'trialing'
      startDate,
      trialEndDate,
      autoRenew: false,
      stripeSubscriptionId: session.subscription as string,
      stripeSessionId: session.id,
    });

    await subscription.save();

    // Actualizar el estado del usuario
    user.subscription_status = 'trial_pending_payment_method';
    await user.save();

    console.log(`✅ Subscription created for user ${user._id} after successful payment`);
    console.log(`Subscription ID: ${subscription._id}, Stripe Subscription: ${session.subscription}`);

  } catch (error) {
    console.error('Error creating subscription after checkout completion:', error);
  }
}

export default router;
