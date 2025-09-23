"use client";

import { useSubscription } from "@/contexts/SubscriptionContext";
import { useAuth } from "@/hooks/useAuth";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

export default function SubscriptionPage() {
  const { subscription, loading } = useSubscription();
  const { user } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading) {
      console.log("🔍 Subscription debug:", {
        hasSubscription: subscription?.hasSubscription,
        subscription: subscription?.subscription,
        status: subscription?.subscription?.status,
        stripeSubscriptionId: subscription?.subscription?.stripeSubscriptionId
      });

      // Verificar si hay una suscripción activa
      const hasActiveSubscription = subscription?.hasSubscription && 
        subscription?.subscription && 
        (subscription.subscription.status === 'active' || 
         subscription.subscription.status === 'trialing' ||
         subscription.subscription.status === 'paused' ||
         subscription.subscription.stripeSubscriptionId);

      console.log("🔍 Has active subscription:", hasActiveSubscription);

      if (hasActiveSubscription) {
        // Redirigir a la página específica del proveedor
        const provider = getProviderFromSubscription(subscription.subscription);
        console.log("🔍 Redirecting to provider:", provider);
        router.push(`/dashboard/subscription/${provider}`);
      } else {
        console.log("🔍 No active subscription, redirecting to pricing");
        // Si no hay suscripción, redirigir a pricing
        router.push("/pricing");
      }
    }
  }, [subscription, loading, router]);

  // Mostrar loading mientras se determina el proveedor
  return (
    <div className="flex items-center justify-center h-64">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-nexly-green"></div>
      <span className="ml-2 text-gray-600">Cargando...</span>
    </div>
  );
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
