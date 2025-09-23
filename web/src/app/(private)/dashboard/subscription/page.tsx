"use client";

import { useSubscription } from "@/contexts/SubscriptionContext";
import { useAuth } from "@/hooks/useAuth";
import { redirect } from "next/navigation";
import { useEffect } from "react";

export default function SubscriptionPage() {
  const { subscription, loading } = useSubscription();
  const { user } = useAuth();

  useEffect(() => {
    if (!loading && subscription?.subscription) {
      // Redirigir a la página específica del proveedor
      const provider = getProviderFromSubscription(subscription.subscription);
      redirect(`/dashboard/subscription/${provider}`);
    }
  }, [subscription, loading]);

  // Mostrar loading mientras se determina el proveedor
  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-nexly-green"></div>
        <span className="ml-2 text-gray-600">Cargando...</span>
      </div>
    );
  }

  // Si no hay suscripción, redirigir a pricing
  if (!subscription?.subscription) {
    redirect("/pricing");
  }

  return null;
}

// Función para determinar el proveedor de la suscripción
function getProviderFromSubscription(sub: any): string {
  // Si tiene stripeSubscriptionId, es Stripe
  if (sub.stripeSubscriptionId) {
    return "stripe";
  }
  
  // Si tiene mercadoPagoSubscriptionId, es MercadoPago
  if (sub.mercadoPagoSubscriptionId) {
    return "mercadopago";
  }
  
  // Por defecto, usar Stripe (proveedor principal)
  return "stripe";
}
