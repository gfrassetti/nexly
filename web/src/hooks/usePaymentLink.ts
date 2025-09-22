"use client";
import { useState } from "react";
import { useSubscription } from "@/contexts/SubscriptionContext";

export function usePaymentLink() {
  const [loading, setLoading] = useState(false);
  const { subscription } = useSubscription();

  const createPaymentLink = async (): Promise<boolean> => {
    if (!subscription?.subscription) {
      alert('No hay información de suscripción disponible');
      return false;
    }

    setLoading(true);

    try {
      // Obtener token del localStorage
      const token = localStorage.getItem('token');
      if (!token) {
        alert('No estás autenticado');
        return false;
      }

      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000'}/subscriptions/create-payment-link`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          planType: subscription.subscription.planType 
        }),
      });

      const data = await response.json();

      if (data.success && data.paymentUrl) {
        window.location.href = data.paymentUrl;
        return true;
      } else {
        alert('Error al crear el enlace de pago');
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
    canCreatePayment: !!subscription?.subscription
  };
}
