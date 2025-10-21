// web/src/hooks/useStripePayment.ts
import { useState } from 'react';
import { useAuth } from './useAuth';
import { useSubscription } from '@/contexts/SubscriptionContext';
import api from '@/lib/api';

interface StripePaymentResponse {
  success: boolean;
  paymentUrl?: string;
  error?: string;
}

export const useStripePayment = () => {
  const [loading, setLoading] = useState(false);
  const { token } = useAuth();
  const { forceSync } = useSubscription();

  const createPaymentLink = async (planType: 'crecimiento' | 'pro' | 'business') => {
    if (!token) {
      throw new Error('Usuario no autenticado');
    }

    setLoading(true);
    try {
      // Guardar el plan seleccionado en localStorage para mantener el contexto
      localStorage.setItem('selectedPlan', planType);
      
      const response = await api('/stripe/create-payment-link', {
        method: 'POST',
        body: JSON.stringify({
          planType,
          payment_behavior: 'default_incomplete', // Mejor manejo de pagos fallidos
          payment_method_types: ['card'], // Solo tarjetas para mejor compatibilidad
        }),
      }, token) as StripePaymentResponse;

      if (response.success && response.paymentUrl) {
        // NUEVO: Cuando se regrese de Stripe, se sincronizará automáticamente
        // Guardar timestamp para referencia
        localStorage.setItem('paymentInitiatedAt', Date.now().toString());
        
        // Redirigir a Stripe Checkout
        window.location.href = response.paymentUrl;
        return true;
      } else {
        throw new Error('Error al crear el enlace de pago');
      }
    } catch (error: any) {
      console.error('Error creating Stripe payment link:', error);
      
      // Manejar errores específicos de Stripe
      if (error.message?.includes('card_declined')) {
        throw new Error('Tu tarjeta fue rechazada. Por favor, intenta con otra tarjeta.');
      } else if (error.message?.includes('insufficient_funds')) {
        throw new Error('Fondos insuficientes. Por favor, verifica tu saldo.');
      } else if (error.message?.includes('expired_card')) {
        throw new Error('Tu tarjeta ha expirado. Por favor, usa otra tarjeta.');
      } else if (error.message?.includes('incorrect_cvc')) {
        throw new Error('Código de seguridad incorrecto. Por favor, verifica tu CVC.');
      } else if (error.message?.includes('processing_error')) {
        throw new Error('Error de procesamiento. Por favor, intenta nuevamente.');
      } else if (error.message) {
        throw new Error(error.message);
      } else {
        throw new Error('Error al crear el enlace de pago');
      }
    } finally {
      setLoading(false);
    }
  };

  // Función para manejar pagos fallidos y reintentar
  const retryPayment = async (subscriptionId: string) => {
    if (!token) {
      throw new Error('Usuario no autenticado');
    }

    setLoading(true);
    try {
      const response = await api('/stripe/retry-payment', {
        method: 'POST',
        body: JSON.stringify({
          subscriptionId,
        }),
      }, token) as StripePaymentResponse;

      if (response.success) {
        return response;
      } else {
        throw new Error('Error al reintentar el pago');
      }
    } catch (error: any) {
      console.error('Error retrying payment:', error);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  // Función para actualizar método de pago
  const updatePaymentMethod = async (subscriptionId: string, paymentMethodId: string) => {
    if (!token) {
      throw new Error('Usuario no autenticado');
    }

    setLoading(true);
    try {
      const response = await api('/stripe/update-payment-method', {
        method: 'POST',
        body: JSON.stringify({
          subscriptionId,
          paymentMethodId,
        }),
      }, token) as StripePaymentResponse;

      if (response.success) {
        return response;
      } else {
        throw new Error('Error al actualizar el método de pago');
      }
    } catch (error: any) {
      console.error('Error updating payment method:', error);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  return {
    createPaymentLink,
    retryPayment,
    updatePaymentMethod,
    loading,
  };
};
