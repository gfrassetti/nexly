"use client";

import { useSubscription } from "@/contexts/SubscriptionContext";
import { useAuth } from "@/hooks/useAuth";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

export default function SubscriptionPage() {
  const { subscription, loading, refetch } = useSubscription();
  const { user } = useAuth();
  const router = useRouter();

  // Refrescar suscripción al cargar la página
  useEffect(() => {
    refetch();
  }, [refetch]);

  useEffect(() => {
    if (!loading && subscription !== null) {
      // Debug temporal para entender qué está pasando
      console.log("🔍 Subscription debug:", {
        hasSubscription: subscription?.hasSubscription,
        subscription: subscription?.subscription,
        userSubscriptionStatus: subscription?.userSubscriptionStatus,
        status: subscription?.subscription?.status,
        stripeSubscriptionId: subscription?.subscription?.stripeSubscriptionId
      });

      // Verificar si hay una suscripción activa - lógica MUY permisiva
      const hasActiveSubscription = 
        // Cualquier indicador de que hay una suscripción
        subscription?.hasSubscription || 
        subscription?.subscription ||
        subscription?.userSubscriptionStatus === 'active_trial' ||
        subscription?.userSubscriptionStatus === 'active_paid' ||
        subscription?.userSubscriptionStatus === 'trial_pending_payment_method' ||
        // Cualquier estado de suscripción válido
        (subscription?.subscription && (
          subscription.subscription.status === 'active' || 
          subscription.subscription.status === 'trialing' ||
          subscription.subscription.status === 'paused' ||
          subscription.subscription.status === 'incomplete' ||
          (subscription.subscription.status as any) === 'trial' ||
          subscription.subscription.stripeSubscriptionId ||
          (subscription.subscription as any).mercadoPagoSubscriptionId
        ));

      console.log("🔍 Has active subscription:", hasActiveSubscription);

      if (hasActiveSubscription) {
        // Redirigir a la página específica del proveedor
        const provider = getProviderFromSubscription(subscription.subscription);
        console.log("🔍 Redirecting to provider:", provider);
        router.replace(`/dashboard/subscription/${provider}`);
      } else {
        // Solo si realmente NO hay suscripción, redirigir a pricing
        console.log("🔍 No active subscription, redirecting to pricing");
        router.replace("/pricing");
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
  // Si no hay objeto de suscripción, usar Stripe por defecto
  if (!sub) {
    return "stripe";
  }
  
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
