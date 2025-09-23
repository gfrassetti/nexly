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
    console.log("🔍 useEffect triggered:", { loading, subscription: !!subscription });
    
    if (!loading) {
      console.log("🔍 Full subscription object:", subscription);
      console.log("🔍 Subscription debug:", {
        hasSubscription: subscription?.hasSubscription,
        subscription: subscription?.subscription,
        status: subscription?.subscription?.status,
        stripeSubscriptionId: subscription?.subscription?.stripeSubscriptionId,
        userSubscriptionStatus: subscription?.userSubscriptionStatus
      });

      // Verificar si hay una suscripción activa - lógica más permisiva
      const hasActiveSubscription = subscription?.hasSubscription && 
        subscription?.subscription && 
        (subscription.subscription.status === 'active' || 
         subscription.subscription.status === 'trialing' ||
         subscription.subscription.status === 'paused' ||
         (subscription.subscription.status as any) === 'trial' || // Compatibilidad temporal
         subscription.subscription.stripeSubscriptionId ||
         subscription?.userSubscriptionStatus === 'active_trial' ||
         subscription?.userSubscriptionStatus === 'active_paid');

      console.log("🔍 Has active subscription:", hasActiveSubscription);
      console.log("🔍 Detailed check:", {
        hasSubscription: subscription?.hasSubscription,
        hasSubscriptionObject: !!subscription?.subscription,
        statusCheck: subscription?.subscription?.status,
        stripeIdCheck: !!subscription?.subscription?.stripeSubscriptionId,
        userStatusCheck: subscription?.userSubscriptionStatus
      });

      if (hasActiveSubscription) {
        // Redirigir a la página específica del proveedor
        const provider = getProviderFromSubscription(subscription.subscription);
        console.log("🔍 Redirecting to provider:", provider);
        router.push(`/dashboard/subscription/${provider}`);
      } else {
        console.log("🔍 No active subscription, redirecting to pricing");
        console.log("🔍 Reasons for no subscription:", {
          hasSubscription: subscription?.hasSubscription,
          hasSubscriptionObject: !!subscription?.subscription,
          status: subscription?.subscription?.status,
          userStatus: subscription?.userSubscriptionStatus
        });
        // Si no hay suscripción, redirigir a pricing
        router.push("/pricing");
      }
    } else {
      console.log("🔍 Still loading subscription data...");
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
