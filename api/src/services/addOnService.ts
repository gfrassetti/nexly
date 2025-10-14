import Stripe from 'stripe';
import { Request } from 'express';
import AddOnPurchase from '../models/AddOnPurchase';
import Subscription from '../models/Subscription';
import logger from '../utils/logger';
import { config } from '../config';

const stripe = new Stripe(config.stripeSecretKey, {
  apiVersion: '2025-08-27.basil',
});

// Producto de Stripe para paquetes de conversaciones adicionales
const ADDON_PRODUCT_ID = config.stripeAddOnProductId;

export interface CreateAddOnSessionParams {
  userId: string;
  planType: 'basic' | 'premium' | 'enterprise';
  source: 'emergency_modal' | 'preventive_dashboard';
  req: Request;
}

export interface AddOnSessionResult {
  success: boolean;
  sessionId?: string;
  url?: string;
  error?: string;
}

export async function createAddOnCheckoutSession({
  userId,
  planType,
  source,
  req
}: CreateAddOnSessionParams): Promise<AddOnSessionResult> {
  try {
    // Verificar que el usuario tenga una suscripción activa
    const subscription = await Subscription.findOne({
      userId,
      status: 'active'
    });

    if (!subscription) {
      return {
        success: false,
        error: 'Usuario no tiene una suscripción activa'
      };
    }

    // Calcular fecha de expiración (fin del mes actual)
    const now = new Date();
    const expirationDate = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);

    // Crear registro de add-on en la base de datos
    const addOnPurchase = new AddOnPurchase({
      userId,
      planType,
      conversationsAdded: 500,
      amountPaid: 30.00, // $30 USD
      currency: 'USD',
      status: 'pending',
      effectiveDate: now,
      expirationDate,
      metadata: {
        source,
        userAgent: req.get('User-Agent'),
        ipAddress: req.ip
      }
    });

    await addOnPurchase.save();

    // Crear sesión de checkout en Stripe
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [
        {
          price_data: {
            currency: 'usd',
            product: ADDON_PRODUCT_ID,
            unit_amount: 3000, // $30.00 USD en centavos
          },
          quantity: 1,
        },
      ],
      mode: 'payment', // Pago único, no suscripción
      success_url: `${config.frontendUrl}/dashboard?addon_success=true&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${config.frontendUrl}/dashboard?addon_cancelled=true`,
      customer_email: subscription.userId.toString(), // Usar el ID del usuario como referencia
      metadata: {
        userId,
        addOnPurchaseId: (addOnPurchase._id as any).toString(),
        planType,
        source
      },
      expires_at: Math.floor(Date.now() / 1000) + (30 * 60), // Expira en 30 minutos
    });

    // Actualizar el registro con el sessionId de Stripe
    addOnPurchase.stripeSessionId = session.id!;
    await addOnPurchase.save();

    logger.info('Add-on checkout session created', {
      userId,
      sessionId: session.id,
      addOnPurchaseId: addOnPurchase._id,
      planType,
      source
    });

    return {
      success: true,
      sessionId: session.id!,
      url: session.url!
    };

  } catch (error: any) {
    logger.error('Error creating add-on checkout session', {
      userId,
      planType,
      source,
      error: error.message
    });

    return {
      success: false,
      error: 'Error al crear la sesión de pago'
    };
  }
}

export async function handleAddOnPaymentSuccess(sessionId: string): Promise<boolean> {
  try {
    // Recuperar la sesión de Stripe
    const session = await stripe.checkout.sessions.retrieve(sessionId);

    if (session.payment_status !== 'paid') {
      logger.warn('Add-on session not paid', { sessionId, paymentStatus: session.payment_status });
      return false;
    }

    // Buscar el registro de add-on
    const addOnPurchase = await AddOnPurchase.findOne({
      stripeSessionId: sessionId
    });

    if (!addOnPurchase) {
      logger.error('Add-on purchase not found', { sessionId });
      return false;
    }

    // Actualizar el estado a completado
    addOnPurchase.status = 'completed';
    addOnPurchase.stripePaymentIntentId = session.payment_intent as string;
    await addOnPurchase.save();

    logger.info('Add-on purchase completed successfully', {
      userId: addOnPurchase.userId,
      addOnPurchaseId: addOnPurchase._id,
      conversationsAdded: addOnPurchase.conversationsAdded,
      amountPaid: addOnPurchase.amountPaid
    });

    return true;

  } catch (error: any) {
    logger.error('Error handling add-on payment success', {
      sessionId,
      error: error.message
    });
    return false;
  }
}

export async function getUserActiveAddOns(userId: string): Promise<any[]> {
  try {
    const now = new Date();
    
    const activeAddOns = await AddOnPurchase.find({
      userId,
      status: 'completed',
      effectiveDate: { $lte: now },
      expirationDate: { $gt: now }
    }).sort({ effectiveDate: -1 });

    return activeAddOns.map(addOn => ({
      id: addOn._id,
      conversationsAdded: addOn.conversationsAdded,
      purchaseDate: addOn.purchaseDate,
      expirationDate: addOn.expirationDate,
      source: addOn.metadata?.source,
      remainingConversations: addOn.conversationsAdded // Simplified for now
    }));

  } catch (error: any) {
    logger.error('Error getting user active add-ons', {
      userId,
      error: error.message
    });
    return [];
  }
}

export async function getTotalAddOnConversations(userId: string): Promise<number> {
  try {
    const activeAddOns = await getUserActiveAddOns(userId);
    
    return activeAddOns.reduce((total, addOn) => {
      return total + addOn.remainingConversations;
    }, 0);

  } catch (error: any) {
    logger.error('Error calculating total add-on conversations', {
      userId,
      error: error.message
    });
    return 0;
  }
}
