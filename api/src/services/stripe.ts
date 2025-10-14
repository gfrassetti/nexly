// api/src/services/stripe.ts

/* "Servicio que se comunica con la API de Stripe para crear productos, precios y sesiones de checkout"
Crea productos y precios en Stripe
Genera sesiones de checkout con trial de 7 días
Maneja operaciones de suscripciones en Stripe */


import Stripe from 'stripe';
import { CustomError } from '../utils/errorHandler';
import { config } from '../config';

interface StripeConfig {
  secretKey: string;
  publishableKey: string;
}

// Constantes para planes y configuración
const STRIPE_CONSTANTS = {
  // Planes nuevos (2024)
  PLAN_BASIC_NAME: 'Nexly - Plan Crecimiento',
  PLAN_BASIC_DESCRIPTION: 'Plan Crecimiento de Nexly para negocios enfocados en soporte y atención al cliente',
  PLAN_BASIC_AMOUNT: 3000, // $30.00 USD
  
  PLAN_PREMIUM_NAME: 'Nexly - Plan Pro',
  PLAN_PREMIUM_DESCRIPTION: 'Plan Pro de Nexly para negocios que hacen campañas de outbound regulares',
  PLAN_PREMIUM_AMOUNT: 5900, // $59.00 USD
  
  PLAN_ENTERPRISE_NAME: 'Nexly - Plan Business',
  PLAN_ENTERPRISE_DESCRIPTION: 'Plan Business de Nexly para empresas con alto volumen de conversaciones',
  PLAN_ENTERPRISE_AMOUNT: 12900, // $129.00 USD
  
  DEFAULT_TRIAL_DAYS: 7,
  DEFAULT_CURRENCY: 'usd', // Cambiado de ARS a USD
  API_VERSION: '2025-08-27.basil',
  
  // Límites optimizados para pocos productos
  PRODUCTS_LIMIT: 10,
  PRICES_LIMIT: 10,
  INVOICES_LIMIT: 10
} as const;

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
      apiVersion: STRIPE_CONSTANTS.API_VERSION,
      typescript: true,
    });
  }

  private validateConfig() {
    if (!this.config.secretKey) {
      throw new CustomError('Error de configuración: STRIPE_SECRET_KEY es requerido', 500);
    }
    // publishableKey solo se usa en frontend, no es crítico para operaciones backend
    if (!this.config.publishableKey) {
      console.warn('STRIPE_PUBLISHABLE_KEY no está configurado - solo necesario para frontend');
    }
  }

  /**
   * Método auxiliar para obtener o crear producto y precio
   */
  private async getOrCreateProductAndPrice(
    productName: string,
    productDescription: string,
    priceAmount: number,
    currency: string = STRIPE_CONSTANTS.DEFAULT_CURRENCY
  ) {
    try {
      // Buscar producto existente
      const products = await this.stripe.products.list({ 
        active: true, 
        limit: STRIPE_CONSTANTS.PRODUCTS_LIMIT 
      });
      let product = products.data.find(p => p.name === productName);

      if (!product) {
        console.log(`Creando nuevo producto: ${productName}`);
        product = await this.createProduct(productName, productDescription);
      }

      // Buscar precio existente
      const prices = await this.stripe.prices.list({ 
        product: product.id, 
        active: true,
        limit: STRIPE_CONSTANTS.PRICES_LIMIT
      });
      let price = prices.data.find(p => p.unit_amount === priceAmount);

      if (!price) {
        console.log(`Creando nuevo precio: ${priceAmount} ${currency} para producto ${productName}`);
        price = await this.createPrice(product.id, priceAmount, currency);
      }

      return { product, price };
    } catch (error: any) {
      console.error(`Error in getOrCreateProductAndPrice for ${productName}:`, {
        message: error.message,
        type: error.type,
        code: error.code,
        raw: error.raw
      });
      throw new CustomError(`Error al obtener/crear producto y precio: ${error.message}`, 500);
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
      console.error(`Error creating Stripe product ${name}:`, {
        message: error.message,
        type: error.type,
        code: error.code,
        raw: error.raw
      });
      throw new CustomError(`Error al crear el producto en Stripe: ${error.message}`, 500);
    }
  }

  /**
   * Crear un precio en Stripe
   */
  async createPrice(productId: string, amount: number, currency: string = STRIPE_CONSTANTS.DEFAULT_CURRENCY) {
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
      console.error(`Error creating Stripe price for product ${productId}:`, {
        message: error.message,
        type: error.type,
        code: error.code,
        amount,
        currency,
        raw: error.raw
      });
      throw new CustomError(`Error al crear el precio en Stripe: ${error.message}`, 500);
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
    planType?: string;
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
          trial_period_days: data.trialPeriodDays || STRIPE_CONSTANTS.DEFAULT_TRIAL_DAYS,
        },
        metadata: {
          planType: data.planType || 'basic',
        },
      };

      const session = await this.stripe.checkout.sessions.create(sessionParams);
      
      return session;
    } catch (error: any) {
      console.error('Error creating Stripe checkout session:', {
        message: error.message,
        type: error.type,
        code: error.code,
        priceId: data.priceId,
        customerEmail: data.customerEmail,
        raw: error.raw
      });
      throw new CustomError(`Error al crear la sesión de checkout: ${error.message}`, 500);
    }
  }

  /**
   * Crear un plan de suscripción básico usando Product ID específico
   */
  async createBasicPlan(userEmail: string, successUrl: string, cancelUrl: string) {
    try {
      // Usar Product ID específico si está configurado
      if (config.stripeBasicPriceId) {
        console.log('Using specific Basic Price ID:', config.stripeBasicPriceId);
        return await this.createCheckoutSession({
          priceId: config.stripeBasicPriceId,
          customerEmail: userEmail,
          successUrl,
          cancelUrl,
          trialPeriodDays: STRIPE_CONSTANTS.DEFAULT_TRIAL_DAYS,
          planType: 'basic',
        });
      }

      // Fallback al método anterior si no hay Product ID específico
      console.log('Using dynamic product creation for Basic plan');
      const { product, price } = await this.getOrCreateProductAndPrice(
        STRIPE_CONSTANTS.PLAN_BASIC_NAME,
        STRIPE_CONSTANTS.PLAN_BASIC_DESCRIPTION,
        STRIPE_CONSTANTS.PLAN_BASIC_AMOUNT
      );

      return await this.createCheckoutSession({
        priceId: price.id,
        customerEmail: userEmail,
        successUrl,
        cancelUrl,
        trialPeriodDays: STRIPE_CONSTANTS.DEFAULT_TRIAL_DAYS,
        planType: 'basic',
      });
    } catch (error: any) {
      console.error('Error creating basic plan:', {
        message: error.message,
        userEmail,
        raw: error.raw
      });
      throw new CustomError(`Error al crear el plan básico: ${error.message}`, 500);
    }
  }

  /**
   * Crear un plan de suscripción premium usando Product ID específico
   */
  async createPremiumPlan(userEmail: string, successUrl: string, cancelUrl: string) {
    try {
      // Usar Product ID específico si está configurado
      if (config.stripePremiumPriceId) {
        console.log('Using specific Premium Price ID:', config.stripePremiumPriceId);
        return await this.createCheckoutSession({
          priceId: config.stripePremiumPriceId,
          customerEmail: userEmail,
          successUrl,
          cancelUrl,
          trialPeriodDays: STRIPE_CONSTANTS.DEFAULT_TRIAL_DAYS,
          planType: 'premium',
        });
      }

      // Fallback al método anterior si no hay Product ID específico
      console.log('Using dynamic product creation for Premium plan');
      const { product, price } = await this.getOrCreateProductAndPrice(
        STRIPE_CONSTANTS.PLAN_PREMIUM_NAME,
        STRIPE_CONSTANTS.PLAN_PREMIUM_DESCRIPTION,
        STRIPE_CONSTANTS.PLAN_PREMIUM_AMOUNT
      );

      return await this.createCheckoutSession({
        priceId: price.id,
        customerEmail: userEmail,
        successUrl,
        cancelUrl,
        trialPeriodDays: STRIPE_CONSTANTS.DEFAULT_TRIAL_DAYS,
        planType: 'premium',
      });
    } catch (error: any) {
      console.error('Error creating premium plan:', {
        message: error.message,
        userEmail,
        raw: error.raw
      });
      throw new CustomError(`Error al crear el plan premium: ${error.message}`, 500);
    }
  }

  /**
   * Crear un plan de suscripción enterprise usando Product ID específico
   */
  async createEnterprisePlan(userEmail: string, successUrl: string, cancelUrl: string) {
    try {
      // Usar Product ID específico si está configurado
      if (config.stripeEnterprisePriceId) {
        console.log('Using specific Enterprise Price ID:', config.stripeEnterprisePriceId);
        return await this.createCheckoutSession({
          priceId: config.stripeEnterprisePriceId,
          customerEmail: userEmail,
          successUrl,
          cancelUrl,
          trialPeriodDays: STRIPE_CONSTANTS.DEFAULT_TRIAL_DAYS,
          planType: 'enterprise',
        });
      }

      // Fallback al método anterior si no hay Product ID específico
      console.log('Using dynamic product creation for Enterprise plan');
      const { product, price } = await this.getOrCreateProductAndPrice(
        STRIPE_CONSTANTS.PLAN_ENTERPRISE_NAME,
        STRIPE_CONSTANTS.PLAN_ENTERPRISE_DESCRIPTION,
        STRIPE_CONSTANTS.PLAN_ENTERPRISE_AMOUNT
      );

      return await this.createCheckoutSession({
        priceId: price.id,
        customerEmail: userEmail,
        successUrl,
        cancelUrl,
        trialPeriodDays: STRIPE_CONSTANTS.DEFAULT_TRIAL_DAYS,
        planType: 'enterprise',
      });
    } catch (error: any) {
      console.error('Error creating enterprise plan:', {
        message: error.message,
        userEmail,
        raw: error.raw
      });
      throw new CustomError(`Error al crear el plan enterprise: ${error.message}`, 500);
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
      console.error('Error getting Stripe subscription:', {
        message: error.message,
        subscriptionId,
        type: error.type,
        code: error.code,
        raw: error.raw
      });
      throw new CustomError(`Error al obtener la suscripción: ${error.message}`, 500);
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
      console.error('Error getting Stripe customer:', {
        message: error.message,
        customerId,
        type: error.type,
        code: error.code,
        raw: error.raw
      });
      throw new CustomError(`Error al obtener el customer: ${error.message}`, 500);
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
      console.error('Error getting Stripe payment method:', {
        message: error.message,
        paymentMethodId,
        type: error.type,
        code: error.code,
        raw: error.raw
      });
      throw new CustomError(`Error al obtener el método de pago: ${error.message}`, 500);
    }
  }

  async getInvoices(subscriptionId: string) {
    try {
      const invoices = await this.stripe.invoices.list({
        subscription: subscriptionId,
        limit: STRIPE_CONSTANTS.INVOICES_LIMIT,
      });
      return invoices.data;
    } catch (error: any) {
      console.error('Error getting Stripe invoices:', {
        message: error.message,
        subscriptionId,
        type: error.type,
        code: error.code,
        raw: error.raw
      });
      throw new CustomError(`Error al obtener las facturas: ${error.message}`, 500);
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
      console.error('Error cancelling Stripe subscription:', {
        message: error.message,
        subscriptionId,
        type: error.type,
        code: error.code,
        raw: error.raw
      });
      throw new CustomError(`Error al cancelar la suscripción: ${error.message}`, 500);
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
      console.error('Error pausing Stripe subscription:', {
        message: error.message,
        subscriptionId,
        type: error.type,
        code: error.code,
        raw: error.raw
      });
      throw new CustomError(`Error al pausar la suscripción: ${error.message}`, 500);
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
      console.error('Error resuming Stripe subscription:', {
        message: error.message,
        subscriptionId,
        type: error.type,
        code: error.code,
        raw: error.raw
      });
      throw new CustomError(`Error al reactivar la suscripción: ${error.message}`, 500);
    }
  }

  /**
   * Verificar webhook de Stripe
   */
  constructWebhookEvent(payload: string, signature: string, secret: string) {
    try {
      return this.stripe.webhooks.constructEvent(payload, signature, secret);
    } catch (error: any) {
      console.error('Error verifying Stripe webhook:', {
        message: error.message,
        type: error.type,
        signature: signature.substring(0, 20) + '...', // Solo mostrar parte de la signature por seguridad
        raw: error.raw
      });
      throw new CustomError(`Error al verificar el webhook de Stripe: ${error.message}`, 400);
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
