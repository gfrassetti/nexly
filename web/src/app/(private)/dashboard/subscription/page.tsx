"use client";

import { useSubscription } from "@/contexts/SubscriptionContext";
import { useAuth } from "@/hooks/useAuth";
import { usePaymentUpdates } from "@/hooks/usePaymentUpdates";
import Loader from "@/components/Loader";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

export default function SubscriptionPage() {
  const { subscription, loading } = useSubscription();
  const { user } = useAuth();
  const router = useRouter();

  // Hook para manejar actualizaciones de pago en tiempo real
  usePaymentUpdates({ enabled: true, pollingInterval: 1500 });

  // Redirigir si hay suscripción activa
  useEffect(() => {
    if (!loading && subscription) {
      if (subscription.hasSubscription) {
        router.replace(`/dashboard/subscription/stripe`);
      }
    }
  }, [subscription, loading, router]);

  // Mostrar loading mientras se carga
  if (loading) {
    return <Loader size="lg" text="Cargando suscripción..." />;
  }

  // Si no hay suscripción activa, mostrar página de "Sin Suscripción"
  if (!subscription?.hasSubscription) {
    return (
      <div className="min-h-screen bg-black p-6 no-subcription-layout">
        <div className="max-w-4xl mx-auto">
          <div className="bg-gray-900 border border-gray-800 rounded-2xl shadow-2xl p-8 text-center">
            <div className="w-16 h-16 bg-gray-800 rounded-full flex items-center justify-center mx-auto mb-6">
              <svg className="w-8 h-8 text-nexly-green" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
            </div>
            <h2 className="text-3xl font-bold text-accent-cream mb-3">Sin Suscripción Activa</h2>
            <p className="text-gray-400 text-lg mb-8 max-w-2xl mx-auto">No tienes una suscripción activa. Elige un plan para comenzar a usar todas las funciones de Nexly.</p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <button
                onClick={() => window.location.href = "/pricing"}
                className="bg-nexly-green hover:bg-green-600 text-accent-cream font-semibold px-8 py-4 rounded-xl transition-all duration-200 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 text-lg"
              >
                Ver Planes Disponibles
              </button>
              <button
                onClick={() => window.location.href = "/dashboard"}
                className="bg-gray-800 hover:bg-gray-700 text-gray-300 font-semibold px-8 py-4 rounded-xl transition-all duration-200 border border-gray-700 hover:border-gray-600 text-lg"
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
      <Loader size="md" />
      <span className="ml-2 text-gray-600">Redirigiendo a tu suscripción...</span>
    </div>
  );
}
