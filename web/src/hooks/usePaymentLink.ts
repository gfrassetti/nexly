"use client";
import { useState } from "react";
import { useSubscription } from "@/contexts/SubscriptionContext";

export function usePaymentLink() {
  const [loading, setLoading] = useState(false);
  const { subscription } = useSubscription();

  const createPaymentLink = async (planType?: 'basic' | 'premium'): Promise<boolean> => {
    setLoading(true);

    try {
      // Obtener token del localStorage
      const token = localStorage.getItem('token');
      if (!token) {
        alert('No estás autenticado');
        return false;
      }

      // Usar el planType pasado como parámetro, o de la suscripción, o el backend usará el plan del usuario
      const finalPlanType = planType || subscription?.subscription?.planType;

      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000'}/subscriptions/create-payment-link`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          ...(finalPlanType && { planType: finalPlanType })
        }),
      });

      const data = await response.json();

      if (data.success && data.paymentUrl) {
        window.location.href = data.paymentUrl;
        return true;
      } else {
        // Si hay error, intentar recargar la página para actualizar el estado
        console.error('Error creating payment link:', data.error);
        alert(data.error || 'Error al crear el enlace de pago. Recargando...');
        // Recargar la página para actualizar el estado
        setTimeout(() => {
          window.location.reload();
        }, 2000);
        return false;
      }
    } catch (error) {
      console.error('Error creating payment link:', error);
      alert('Error al crear el enlace de pago');
      return false;
    } finally {
      setLoading(false);
    }
  };

  return {
    createPaymentLink,
    loading,
    canCreatePayment: subscription?.userSubscriptionStatus === 'trial_pending_payment_method'
  };
}
