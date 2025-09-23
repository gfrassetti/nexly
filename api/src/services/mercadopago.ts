// api/src/services/mercadopago.ts
import axios from 'axios';
import { CustomError } from '../utils/errorHandler';
import { config } from '../config';

interface MercadoPagoConfig {
  accessToken: string;
  baseURL: string;
}

class MercadoPagoService {
  private config: MercadoPagoConfig;

  constructor() {
    this.config = {
      accessToken: config.mercadoPagoAccessToken,
      baseURL: config.mercadoPagoBaseUrl,
    };
  }

  private validateConfig() {
    if (!this.config.accessToken) {
      console.warn('⚠️ MERCADOPAGO_ACCESS_TOKEN no configurado. Usando modo desarrollo.');
      if (config.isProduction) {
        throw new CustomError('MERCADOPAGO_ACCESS_TOKEN es requerido en producción', 500, false);
      }
      // En desarrollo, usar un token mock
      this.config.accessToken = 'TEST_TOKEN_FOR_DEVELOPMENT';
    }

    // Log de configuración para debug
    console.log('🔧 Configuración MercadoPago:', {
      hasToken: !!this.config.accessToken,
      baseUrl: this.config.baseURL,
      isDevelopment: config.isDevelopment,
      country: process.env.MERCADOPAGO_COUNTRY || 'No especificado'
    });
  }

  private getHeaders() {
    return {
      'Authorization': `Bearer ${this.config.accessToken}`,
      'Content-Type': 'application/json',
    };
  }

  /**
   * Crear una suscripción (preapproval) en Mercado Pago
   */
  async createSubscription(data: {
    payer_email: string;
    reason: string;
    auto_recurring: {
      frequency: number;
      frequency_type: 'months' | 'days';
      transaction_amount: number;
      currency_id: string;
      start_date?: string;
      end_date?: string;
      free_trial?: {
        frequency: number;
        frequency_type: 'months' | 'days';
      };
    };
    back_url?: string;
    status?: string;
  }) {
    try {
      // Validar configuración
      this.validateConfig();
      
      // Validar datos de entrada
      if (!data.payer_email || !data.reason || !data.auto_recurring) {
        throw new CustomError('Datos de suscripción incompletos', 400);
      }

      if (data.auto_recurring.transaction_amount <= 0) {
        throw new CustomError('El monto debe ser mayor a 0', 400);
      }

      // Modo mock para desarrollo
      if (config.isDevelopment && this.config.accessToken === 'TEST_TOKEN_FOR_DEVELOPMENT') {
        console.log('🧪 Modo desarrollo: Simulando creación de suscripción en Mercado Pago');
        console.log('📧 Email:', data.payer_email);
        console.log('💰 Monto:', data.auto_recurring.transaction_amount, data.auto_recurring.currency_id);
        return {
          id: `mock_subscription_${Date.now()}`,
          init_point: `https://www.mercadopago.com.ar/checkout/v1/redirect?pref_id=mock_pref_${Date.now()}`,
          status: 'pending'
        };
      }

      // Si hay un error de países, usar modo de fallback
      console.log('🌍 Intentando crear suscripción con configuración actual...');
      console.log('📋 Datos enviados:', JSON.stringify(data, null, 2));


      const response = await axios.post(
        `${this.config.baseURL}/preapproval`,
        data,
        { 
          headers: this.getHeaders(),
          timeout: 10000 // 10 segundos timeout
        }
      );
      
      return response.data;
    } catch (error: any) {
      console.error('Error creating Mercado Pago subscription:', {
        error: error.response?.data || error.message,
        requestData: data,
        timestamp: new Date().toISOString()
      });

      if (error.response?.status === 401) {
        throw new CustomError('Credenciales de Mercado Pago inválidas', 500);
      }
      
      if (error.response?.status === 400) {
        const errorData = error.response?.data;
        if (errorData?.message?.includes('different countries')) {
          // Intentar con configuración alternativa
          console.log('🔄 Error de países detectado, intentando con configuración alternativa...');
          
          // Crear un mock más realista para evitar el error
          if (config.isDevelopment) {
            console.log('🧪 Usando mock de desarrollo debido a error de países');
            return {
              id: `fallback_subscription_${Date.now()}`,
              init_point: `https://www.mercadopago.com.ar/checkout/v1/redirect?pref_id=fallback_${Date.now()}`,
              status: 'pending'
            };
          }
          
          throw new CustomError('Error de configuración regional. Tu cuenta de MercadoPago no está configurada para el país correcto. Contacta soporte.', 400);
        }
        throw new CustomError('Datos de suscripción inválidos', 400);
      }

      if (error.code === 'ECONNABORTED') {
        throw new CustomError('Timeout al conectar con Mercado Pago', 500);
      }

      throw new CustomError('Error al crear la suscripción en Mercado Pago', 500);
    }
  }

  /**
   * Obtener información de una suscripción
   */
  async getSubscription(subscriptionId: string) {
    try {
      // Validar configuración
      this.validateConfig();
      
      const response = await axios.get(
        `${this.config.baseURL}/preapproval/${subscriptionId}`,
        { headers: this.getHeaders() }
      );
      
      return response.data;
    } catch (error: any) {
      console.error('Error getting Mercado Pago subscription:', error.response?.data || error.message);
      throw new Error('Error al obtener la suscripción');
    }
  }

  /**
   * Cancelar una suscripción
   */
  async cancelSubscription(subscriptionId: string) {
    try {
      // Validar configuración
      this.validateConfig();
      
      const response = await axios.put(
        `${this.config.baseURL}/preapproval/${subscriptionId}`,
        { status: 'cancelled' },
        { headers: this.getHeaders() }
      );
      
      return response.data;
    } catch (error: any) {
      console.error('Error cancelling Mercado Pago subscription:', error.response?.data || error.message);
      throw new Error('Error al cancelar la suscripción');
    }
  }

  /**
   * Crear un plan de suscripción básico
   */
  async createBasicPlan(userEmail: string, backUrl: string) {
    // Detectar país basado en el dominio del email o usar configuración por defecto
    const isArgentina = userEmail.includes('.ar') || process.env.MERCADOPAGO_COUNTRY === 'AR';
    const currency = isArgentina ? 'ARS' : 'USD';
    const amount = isArgentina ? 1000 : 1; // Precio mínimo: $100 ARS / $1 USD

    return this.createSubscription({
      payer_email: userEmail,
      reason: 'Suscripción Nexly - Plan Básico',
      auto_recurring: {
        frequency: 1,
        frequency_type: 'months',
        transaction_amount: amount,
        currency_id: currency,
        free_trial: {
          frequency: 7,
          frequency_type: 'days',
        },
      },
      back_url: backUrl,
      status: 'pending',
    });
  }

  /**
   * Crear un plan de suscripción premium
   */
  async createPremiumPlan(userEmail: string, backUrl: string) {
    // Detectar país basado en el dominio del email o usar configuración por defecto
    const isArgentina = userEmail.includes('.ar') || process.env.MERCADOPAGO_COUNTRY === 'AR';
    const currency = isArgentina ? 'ARS' : 'USD';
    const amount = isArgentina ? 200 : 2; // Precio mínimo: $200 ARS / $2 USD

    return this.createSubscription({
      payer_email: userEmail,
      reason: 'Suscripción Nexly - Plan Premium',
      auto_recurring: {
        frequency: 1,
        frequency_type: 'months',
        transaction_amount: amount,
        currency_id: currency,
        free_trial: {
          frequency: 7,
          frequency_type: 'days',
        },
      },
      back_url: backUrl,
      status: 'pending',
    });
  }
}

export const mercadoPagoService = new MercadoPagoService();
