/* "Captura webhooks de Stripe y crea/actualiza suscripciones en la DB cuando ocurren eventos de pago"
Este archivo centraliza la lógica de estados de suscripción, asegurando la sincronización 
entre Stripe y la Base de Datos, crucial para manejar correctamente los periodos de prueba (trials) 
y los pagos posteriores. */

import { Router, Request, Response } from "express";
import Stripe from "stripe";
import { User } from "../../models/User";
import {
  default as Subscription,
  ISubscription,
} from "../../models/Subscription";
// Importamos el modelo con otro nombre si hay conflicto
const SubscriptionModel = Subscription;
const router = Router();

// Inicializar Stripe
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2025-08-27.basil",
});

// Endpoint para webhooks de Stripe
router.post("/", async (req: Request, res: Response) => {
  const sig = req.headers["stripe-signature"] as string;
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET!;

  let event: Stripe.Event;

  try {
    // Verificar la firma del webhook usando el body raw (Buffer)
    event = stripe.webhooks.constructEvent(req.body, sig, webhookSecret);
  } catch (err: any) {
    console.error("Webhook signature verification failed:", err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  try {
    switch (event.type) {
      case "checkout.session.completed":
        await handleCheckoutSessionCompleted(
          event.data.object as Stripe.Checkout.Session
        );
        break;
      case "invoice.paid":
        await handleInvoicePaid(event.data.object as Stripe.Invoice);
        break;
      case "invoice.payment_failed":
        await handleInvoicePaymentFailed(event.data.object as Stripe.Invoice);
        break;
      case "customer.subscription.updated":
        await handleSubscriptionUpdated(
          event.data.object as Stripe.Subscription
        );
        break;
      case "customer.subscription.deleted":
        await handleSubscriptionDeleted(
          event.data.object as Stripe.Subscription
        );
        break;
      case "customer.subscription.trial_will_end":
        await handleTrialWillEnd(event.data.object as Stripe.Subscription);
        break;
      default:
        console.log(`Unhandled event type: ${event.type}`);
    }

    res.json({ received: true });
  } catch (error) {
    console.error("Error processing webhook:", error);
    res.status(500).json({ error: "Webhook processing failed" });
  }
});

// Manejar pago exitoso de factura
async function handleInvoicePaid(invoice: Stripe.Invoice) {
  console.log("Invoice paid:", invoice.id);
  if (
    (invoice as any).subscription &&
    typeof (invoice as any).subscription === "string"
  ) {
    const subscriptionId = (invoice as any).subscription as string; // 1. Actualizar el estado de la suscripción en la base de datos
    const updatedSubscription = await SubscriptionModel.findOneAndUpdate(
      { stripeSubscriptionId: subscriptionId },
      {
        status: "active",
        lastPaymentDate: new Date(),
      },
      { new: true }
    ); // DIAGNÓSTICO CRÍTICO 1: ¿Se encontró la suscripción?
    if (!updatedSubscription) {
      console.error(
        `🚨 ERROR DB: Subscription NO encontrada en DB para Stripe ID: ${subscriptionId}`
      );
      return;
    } // 2. CRÍTICO: Sincronizar el estado del usuario para actualizar la UI
    const user = await User.findById(updatedSubscription.userId); // DIAGNÓSTICO CRÍTICO 2: ¿Se encontró el usuario?
    if (!user) {
      console.error(
        `🚨 ERROR DB: Usuario NO encontrado en DB para User ID: ${updatedSubscription.userId}`
      );
      return;
    } // Si llegamos aquí, se encontraron ambos documentos. Forzamos la actualización.
    if (user.subscription_status !== "active_paid") {
      user.subscription_status = "active_paid";
      await user.save();
      console.log(
        `✅ ÉXITO UI: User ${user._id} status actualizado a active_paid.`
      );
    } else {
      console.log(
        `INFO: User ${user._id} ya estaba en active_paid. No se requirió cambio.`
      );
    }
    console.log(`Subscription ${subscriptionId} activated after payment`);
  }
}

// Manejar pago fallido de factura
async function handleInvoicePaymentFailed(invoice: Stripe.Invoice) {
  console.log("Invoice payment failed:", invoice.id);
  if (
    (invoice as any).subscription &&
    typeof (invoice as any).subscription === "string"
  ) {
    const subscriptionId = (invoice as any).subscription as string; // Buscar y actualizar la suscripción en la base de datos (solo la fecha del intento)
    await SubscriptionModel.findOneAndUpdate(
      { stripeSubscriptionId: subscriptionId },
      {
        lastPaymentAttempt: new Date(), // El cambio de status a 'past_due' es manejado por customer.subscription.updated
      },
      { new: true }
    );
    console.log(
      `Subscription ${subscriptionId} payment failed. Status sync delegated to customer.subscription.updated.`
    );
  }
}

// Manejar actualización de suscripción
async function handleSubscriptionUpdated(subscription: Stripe.Subscription) {
  console.log("Subscription updated:", subscription.id);
  const subscriptionData = await SubscriptionModel.findOne({
    stripeSubscriptionId: subscription.id,
  });
  if (subscriptionData) {
    // 1. Actualizar el SubscriptionModel
    await SubscriptionModel.findOneAndUpdate(
      { stripeSubscriptionId: subscription.id },
      {
        status: subscription.status, // Usamos el estado de Stripe como fuente de verdad // Actualización de campos adicionales
        planType:
          subscription.items.data[0]?.price?.lookup_key === "premium_plan"
            ? "premium"
            : "basic",
        trialEndDate: subscription.trial_end
          ? new Date(subscription.trial_end * 1000)
          : undefined,
        pausedAt: subscription.pause_collection?.behavior
          ? new Date()
          : undefined,
        cancelledAt: subscription.canceled_at
          ? new Date(subscription.canceled_at * 1000)
          : undefined,
        updatedAt: new Date(),
      },
      { new: true }
    ); // 2. CRÍTICO: Sincronizar el estado del User (Centralización de lógica de acceso)
    const user = await User.findById(subscriptionData.userId);
    if (user) {
      let newUserStatus = user.subscription_status;
      switch (subscription.status) {
        case "trialing":
          newUserStatus = "active_trial";
          break;
        case "active": // Si está activo, el pago fue exitoso
          newUserStatus = "active_paid";
          break;
        case "past_due":
        case "canceled":
        case "unpaid":
        case "incomplete": // Cualquier estado que implique pérdida de acceso/pago fallido
          newUserStatus = "none"; // Usamos valor permitido 'none'
          break;
      } // Ahora siempre guardamos el nuevo estado si es diferente, sin condición extra.
      if (user.subscription_status !== newUserStatus) {
        user.subscription_status = newUserStatus;
        await user.save();
        console.log(
          `User ${user._id} status synced to ${newUserStatus} from Stripe status ${subscription.status}`
        );
      }
    }
    console.log(
      `Subscription ${subscription.id} updated to ${subscription.status}`
    );
  }
}

// Manejar cancelación de suscripción
async function handleSubscriptionDeleted(subscription: Stripe.Subscription) {
  console.log("Subscription deleted:", subscription.id); // Actualizar SubscriptionModel. La actualización del User se delega a handleSubscriptionUpdated.
  await SubscriptionModel.findOneAndUpdate(
    { stripeSubscriptionId: subscription.id },
    {
      status: "canceled",
      cancelledAt: new Date(),
    },
    { new: true }
  );
  console.log(`Subscription ${subscription.id} marked as canceled`);
}

// Manejar fin de trial próximo
async function handleTrialWillEnd(subscription: Stripe.Subscription) {
  console.log("Trial will end soon:", subscription.id); // Aquí deberías enviar un email de recordatorio al usuario
  console.log(`Trial for subscription ${subscription.id} will end soon`);
}

// Manejar checkout completado exitosamente (creación inicial de suscripción)
async function handleCheckoutSessionCompleted(
  session: Stripe.Checkout.Session
) {
  console.log("Checkout session completed:", session.id);
  try {
    const customerEmail = session.customer_details?.email;
    if (!customerEmail || !session.subscription) {
      console.error("No email or subscription ID in session:", session.id);
      return;
    }

    const user = await User.findOne({ email: customerEmail });
    if (!user) {
      console.error("User not found for email:", customerEmail);
      return;
    } // 1. OBTENER ESTADO REAL DE STRIPE (CRÍTICO PARA EL TRIAL)

    const stripeSubscription = await stripe.subscriptions.retrieve(
      session.subscription as string
    ); // Si tiene trial_end, el estado DEBE ser 'trialing'
    const initialStatus = stripeSubscription.trial_end
      ? "trialing"
      : stripeSubscription.status; // CORRECCIÓN: Usar las fechas reales de Stripe
    const startDate = new Date(
      (stripeSubscription as any).current_period_start * 1000
    );
    const trialEndDate = stripeSubscription.trial_end
      ? new Date(stripeSubscription.trial_end * 1000)
      : undefined; // Mapeo de plan

    const priceId = stripeSubscription.items.data[0]?.price?.id;
    let planType = priceId?.includes("premium") ? "premium" : "basic"; // 2. Crear la suscripción en la base de datos

    const subscription = new SubscriptionModel({
      userId: user._id.toString(),
      planType: planType as "basic" | "premium",
      status: initialStatus, // <-- AHORA USA EL ESTADO REAL ('trialing' o 'active')
      startDate,
      trialEndDate,
      autoRenew: true, // Asumo que si se registra, quiere renovar
      stripeSubscriptionId: session.subscription as string,
      stripeSessionId: session.id,
    });

    await subscription.save(); // 3. Actualizar el estado del usuario: 'active_trial' o 'active_paid'

    user.subscription_status = stripeSubscription.trial_end
      ? "active_trial"
      : "active_paid";
    await user.save();

    console.log(
      `✅ Subscription created for user ${user._id}. Initial Status: ${initialStatus}`
    );
  } catch (error) {
    console.error(
      "Error creating subscription after checkout completion:",
      error
    );
  }
}

export default router;
