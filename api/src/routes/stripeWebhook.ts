import { Router, Request, Response } from "express";
import Stripe from "stripe";
import { User } from "../models/User";
import { default as Subscription, ISubscription } from "../models/Subscription";

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

export default router;
