// api/src/services/stripe.ts
import Stripe from 'stripe';
import { CustomError } from '../utils/errorHandler';
import { config } from '../config';

interface StripeConfig {
  secretKey: string;
  publishableKey: string;
}

class StripeService {
  private stripe: Stripe;
  private config: StripeConfig;

  constructor() {
    this.config = {
      secretKey: config.stripeSecretKey,
      publishableKey: config.stripePublishableKey,
    };

    this.validateConfig();
    
    this.stripe = new Stripe(this.config.secretKey, {
      apiVersion: '2025-08-27.basil',
      typescript: true,
    });
  }

  private validateConfig() {
    if (!this.config.secretKey) {
      throw new CustomError('STRIPE_SECRET_KEY es requerido', 500);
    }
    if (!this.config.publishableKey) {
      throw new CustomError('STRIPE_PUBLISHABLE_KEY es requerido', 500);
    }
  }

  /**
   * Crear un producto en Stripe
   */
  async createProduct(name: string, description: string) {
    try {
      const product = await this.stripe.products.create({
        name,
        description,
        type: 'service',
      });
      
      return product;
    } catch (error: any) {
      console.error('Error creating Stripe product:', error);
      throw new CustomError('Error al crear el producto en Stripe', 500);
    }
  }

  /**
   * Crear un precio en Stripe
   */
  async createPrice(productId: string, amount: number, currency: string = 'ars') {
    try {
      const price = await this.stripe.prices.create({
        product: productId,
        unit_amount: amount, // Stripe maneja centavos, entonces 1000 = $10.00
        currency,
        recurring: {
          interval: 'month',
        },
      });
      
      return price;
    } catch (error: any) {
      console.error('Error creating Stripe price:', error);
      throw new CustomError('Error al crear el precio en Stripe', 500);
    }
  }

  /**
   * Crear una sesión de checkout para suscripción
   */
  async createCheckoutSession(data: {
    priceId: string;
    customerEmail: string;
    successUrl: string;
    cancelUrl: string;
    trialPeriodDays?: number;
  }) {
    try {
      const sessionParams: Stripe.Checkout.SessionCreateParams = {
        mode: 'subscription',
        payment_method_types: ['card'],
        line_items: [
          {
            price: data.priceId,
            quantity: 1,
          },
        ],
        customer_email: data.customerEmail,
        success_url: data.successUrl,
        cancel_url: data.cancelUrl,
        allow_promotion_codes: true,
        billing_address_collection: 'required',
        subscription_data: {
          trial_period_days: data.trialPeriodDays || 7,
        },
        metadata: {
          plan_type: 'subscription',
        },
      };

      const session = await this.stripe.checkout.sessions.create(sessionParams);
      
      return session;
    } catch (error: any) {
      console.error('Error creating Stripe checkout session:', error);
      throw new CustomError('Error al crear la sesión de checkout', 500);
    }
  }

  /**
   * Crear un plan de suscripción básico
   */
  async createBasicPlan(userEmail: string, successUrl: string, cancelUrl: string) {
    try {
      // Verificar si ya existe el producto básico
      const products = await this.stripe.products.list({
        active: true,
        limit: 100,
      });

      let basicProduct = products.data.find(p => p.name === 'Nexly - Plan Básico');
      
      if (!basicProduct) {
        basicProduct = await this.createProduct(
          'Nexly - Plan Básico',
          'Plan básico de Nexly para emprendedores y pequeñas empresas'
        );
      }

      // Verificar si ya existe el precio básico
      const prices = await this.stripe.prices.list({
        product: basicProduct.id,
        active: true,
      });

      let basicPrice = prices.data.find(p => p.unit_amount === 100000); // $1000 ARS
      
      if (!basicPrice) {
        basicPrice = await this.createPrice(basicProduct.id, 100000, 'ars'); // $1000 ARS
      }

      return await this.createCheckoutSession({
        priceId: basicPrice.id,
        customerEmail: userEmail,
        successUrl,
        cancelUrl,
        trialPeriodDays: 7,
      });
    } catch (error: any) {
      console.error('Error creating basic plan:', error);
      throw new CustomError('Error al crear el plan básico', 500);
    }
  }

  /**
   * Crear un plan de suscripción premium
   */
  async createPremiumPlan(userEmail: string, successUrl: string, cancelUrl: string) {
    try {
      // Verificar si ya existe el producto premium
      const products = await this.stripe.products.list({
        active: true,
        limit: 100,
      });

      let premiumProduct = products.data.find(p => p.name === 'Nexly - Plan Premium');
      
      if (!premiumProduct) {
        premiumProduct = await this.createProduct(
          'Nexly - Plan Premium',
          'Plan premium de Nexly para empresas que necesitan más integraciones'
        );
      }

      // Verificar si ya existe el precio premium
      const prices = await this.stripe.prices.list({
        product: premiumProduct.id,
        active: true,
      });

      let premiumPrice = prices.data.find(p => p.unit_amount === 150000); // $1500 ARS
      
      if (!premiumPrice) {
        premiumPrice = await this.createPrice(premiumProduct.id, 150000, 'ars'); // $1500 ARS
      }

      return await this.createCheckoutSession({
        priceId: premiumPrice.id,
        customerEmail: userEmail,
        successUrl,
        cancelUrl,
        trialPeriodDays: 7,
      });
    } catch (error: any) {
      console.error('Error creating premium plan:', error);
      throw new CustomError('Error al crear el plan premium', 500);
    }
  }

  /**
   * Obtener información de una suscripción
   */
  async getSubscription(subscriptionId: string) {
    try {
      const subscription = await this.stripe.subscriptions.retrieve(subscriptionId);
      return subscription;
    } catch (error: any) {
      console.error('Error getting Stripe subscription:', error);
      throw new CustomError('Error al obtener la suscripción', 500);
    }
  }

  /**
   * Obtener información de un customer
   */
  async getCustomer(customerId: string) {
    try {
      const customer = await this.stripe.customers.retrieve(customerId);
      return customer;
    } catch (error: any) {
      console.error('Error getting Stripe customer:', error);
      throw new CustomError('Error al obtener el customer', 500);
    }
  }

  /**
   * Obtener información de un método de pago
   */
  async getPaymentMethod(paymentMethodId: string) {
    try {
      const paymentMethod = await this.stripe.paymentMethods.retrieve(paymentMethodId);
      return paymentMethod;
    } catch (error: any) {
      console.error('Error getting Stripe payment method:', error);
      throw new CustomError('Error al obtener el método de pago', 500);
    }
  }

  async getInvoices(subscriptionId: string) {
    try {
      const invoices = await this.stripe.invoices.list({
        subscription: subscriptionId,
        limit: 10, // Obtener las últimas 10 facturas
      });
      return invoices.data;
    } catch (error: any) {
      console.error('Error getting Stripe invoices:', error);
      throw new CustomError('Error al obtener las facturas', 500);
    }
  }

  /**
   * Cancelar una suscripción
   */
  async cancelSubscription(subscriptionId: string) {
    try {
      const subscription = await this.stripe.subscriptions.cancel(subscriptionId);
      return subscription;
    } catch (error: any) {
      console.error('Error cancelling Stripe subscription:', error);
      throw new CustomError('Error al cancelar la suscripción', 500);
    }
  }

  /**
   * Pausar una suscripción
   */
  async pauseSubscription(subscriptionId: string) {
    try {
      const subscription = await this.stripe.subscriptions.update(subscriptionId, {
        pause_collection: {
          behavior: 'void',
        },
      });
      return subscription;
    } catch (error: any) {
      console.error('Error pausing Stripe subscription:', error);
      throw new CustomError('Error al pausar la suscripción', 500);
    }
  }

  /**
   * Reactivar una suscripción pausada
   */
  async resumeSubscription(subscriptionId: string) {
    try {
      const subscription = await this.stripe.subscriptions.update(subscriptionId, {
        pause_collection: null,
      });
      return subscription;
    } catch (error: any) {
      console.error('Error resuming Stripe subscription:', error);
      throw new CustomError('Error al reactivar la suscripción', 500);
    }
  }

  /**
   * Verificar webhook de Stripe
   */
  constructWebhookEvent(payload: string, signature: string, secret: string) {
    try {
      return this.stripe.webhooks.constructEvent(payload, signature, secret);
    } catch (error: any) {
      console.error('Error verifying Stripe webhook:', error);
      throw new CustomError('Error al verificar el webhook de Stripe', 400);
    }
  }

  /**
   * Obtener configuración pública
   */
  getPublicConfig() {
    return {
      publishableKey: this.config.publishableKey,
    };
  }
}

export const stripeService = new StripeService();
