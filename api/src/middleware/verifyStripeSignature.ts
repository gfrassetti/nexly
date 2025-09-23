// api/src/middleware/verifyStripeSignature.ts
import { Request, Response, NextFunction } from 'express';
import { stripeService } from '../services/stripe';
import { config } from '../config';

export const stripeWebhookVerification = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const signature = req.headers['stripe-signature'] as string;
    const payload = JSON.stringify(req.body);

    if (!signature) {
      return res.status(400).json({ error: 'No Stripe signature provided' });
    }

    if (!config.stripeWebhookSecret) {
      console.error('STRIPE_WEBHOOK_SECRET not configured');
      return res.status(500).json({ error: 'Webhook secret not configured' });
    }

    try {
      // Verificar la firma del webhook
      const event = stripeService.constructWebhookEvent(
        payload,
        signature,
        config.stripeWebhookSecret
      );

      // Agregar el evento verificado al request
      (req as any).stripeEvent = event;
      next();
    } catch (error: any) {
      console.error('Stripe webhook signature verification failed:', error.message);
      return res.status(400).json({ error: 'Invalid Stripe signature' });
    }
  } catch (error) {
    console.error('Error in Stripe webhook verification:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
};
