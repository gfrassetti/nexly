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

      // Lógica simple: si hay suscripción activa
      const hasActiveSubscription = subscription?.hasSubscription === true;

      if (hasActiveSubscription) {
        // Redirigir a la página específica del proveedor
        const provider = getProviderFromSubscription(subscription.subscription);
        router.replace(`/dashboard/subscription/${provider}`);
      }
      // Si no hay suscripción activa, NO redirigir - mostrar la página de "Sin Suscripción"
    }
  }, [subscription, loading, router]);

  // Mostrar loading mientras se carga la suscripción
  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-nexly-green"></div>
        <span className="ml-2 text-gray-600">Cargando...</span>
      </div>
    );
  }

  // Lógica simple: si hay suscripción activa
  const hasActiveSubscription = subscription?.hasSubscription === true;


  if (!loading && !hasActiveSubscription) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 p-6">
        <div className="max-w-4xl mx-auto">
          <div className="bg-white rounded-2xl shadow-xl p-8 text-center">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <span className="text-2xl text-gray-400">●</span>
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Sin Suscripción Activa</h2>
            <p className="text-gray-600 mb-6">No tienes una suscripción activa. Elige un plan para comenzar a usar todas las funciones de Nexly.</p>
            <div className="flex gap-4 justify-center">
              <button
                onClick={() => window.location.href = "/pricing"}
                className="bg-gradient-to-r from-nexly-green to-green-600 hover:from-green-600 hover:to-green-700 text-white font-semibold px-8 py-3 rounded-xl transition-all duration-200 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
              >
                Ver Planes Disponibles
              </button>
              <button
                onClick={() => window.location.href = "/dashboard"}
                className="bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold px-8 py-3 rounded-xl transition-all duration-200"
              >
                Volver al Dashboard
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Si hay suscripción activa, mostrar loading mientras redirige
  return (
    <div className="flex items-center justify-center h-64">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-nexly-green"></div>
      <span className="ml-2 text-gray-600">Redirigiendo a tu suscripción...</span>
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
