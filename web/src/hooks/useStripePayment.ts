// web/src/hooks/useStripePayment.ts
import { useState } from 'react';
import { useAuth } from './useAuth';
import api from '@/lib/api';

export const useStripePayment = () => {
  const [loading, setLoading] = useState(false);
  const { token } = useAuth();

  const createPaymentLink = async (planType: 'basic' | 'premium') => {
    if (!token) {
      throw new Error('Usuario no autenticado');
    }

    setLoading(true);
    try {
      const response = await api('/stripe/create-payment-link', {
        method: 'POST',
        body: JSON.stringify({
          planType,
        }),
      }, token);

      if (response.success && response.paymentUrl) {
        // Redirigir a Stripe Checkout
        window.location.href = response.paymentUrl;
        return true;
      } else {
        throw new Error('Error al crear el enlace de pago');
      }
    } catch (error: any) {
      console.error('Error creating Stripe payment link:', error);
      
      if (error.message) {
        throw new Error(error.message);
      } else {
        throw new Error('Error al crear el enlace de pago');
      }
    } finally {
      setLoading(false);
    }
  };

  return {
    createPaymentLink,
    loading,
  };
};
