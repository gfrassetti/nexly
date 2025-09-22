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
        return {
          id: `mock_subscription_${Date.now()}`,
          init_point: 'https://www.mercadopago.com.ar/checkout/v1/redirect?pref_id=mock_pref_id',
          status: 'pending'
        };
      }

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
    const startDate = new Date();
    startDate.setDate(startDate.getDate() + 7); // Período de prueba de 7 días

    return this.createSubscription({
      payer_email: userEmail,
      reason: 'Suscripción Nexly - Plan Básico',
      auto_recurring: {
        frequency: 1,
        frequency_type: 'months',
        transaction_amount: 2999, // Precio en ARS (ajustar según necesidad)
        currency_id: 'ARS',
        start_date: startDate.toISOString(),
      },
      back_url: backUrl,
      status: 'pending',
    });
  }

  /**
   * Crear un plan de suscripción premium
   */
  async createPremiumPlan(userEmail: string, backUrl: string) {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() + 7); // Período de prueba de 7 días

    return this.createSubscription({
      payer_email: userEmail,
      reason: 'Suscripción Nexly - Plan Premium',
      auto_recurring: {
        frequency: 1,
        frequency_type: 'months',
        transaction_amount: 5999, // Precio en ARS (ajustar según necesidad)
        currency_id: 'ARS',
        start_date: startDate.toISOString(),
      },
      back_url: backUrl,
      status: 'pending',
    });
  }
}

export const mercadoPagoService = new MercadoPagoService();
