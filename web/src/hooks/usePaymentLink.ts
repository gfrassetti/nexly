"use client";
import { useState } from "react";
import { useSubscription } from "@/contexts/SubscriptionContext";

export function usePaymentLink() {
  const [loading, setLoading] = useState(false);
  
  // Usar useSubscription solo si está disponible (en dashboard)
  let subscription;
  try {
    const { subscription: sub } = useSubscription();
    subscription = sub;
  } catch (error) {
    // Si no está disponible (como en pricing), subscription será undefined
    subscription = undefined;
  }

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
        // Manejar errores específicos
        console.error('Error creating payment link:', data.error);
        
        // Si es error 429, mostrar mensaje específico
        if (response.status === 429) {
          alert('Demasiados intentos de pago. Intenta nuevamente en 15 minutos.');
          return false;
        }
        
        // Para otros errores, mostrar el mensaje específico
        alert(data.error || 'Error al crear el enlace de pago');
        return false;
      }
    } catch (error: any) {
      console.error('Error creating payment link:', error);
      
      // Si es un error de red o timeout
      if (error.name === 'TypeError' || error.message.includes('fetch')) {
        alert('Error de conexión. Verifica tu internet e intenta nuevamente.');
      } else {
        alert('Error inesperado al crear el enlace de pago');
      }
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
