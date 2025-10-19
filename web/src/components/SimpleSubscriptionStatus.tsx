"use client";

import { useSubscription } from '@/contexts/SubscriptionContext';

export default function SimpleSubscriptionStatus() {
  const { subscription, loading, error, status } = useSubscription();

  if (loading) {
    return (
      <div className="bg-neutral-800 rounded-lg p-4 border border-neutral-700">
        <div className="animate-pulse">
          <div className="h-4 bg-neutral-700 rounded w-1/3 mb-2"></div>
          <div className="h-3 bg-neutral-700 rounded w-2/3"></div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-900/20 border border-red-700/50 rounded-lg p-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold text-red-400 mb-2">
              Error al cargar suscripción
            </h3>
            <p className="text-sm text-red-400/80">{error}</p>
          </div>
          <button
            onClick={() => window.location.reload()}
            className="bg-red-600/20 hover:bg-red-600/30 text-red-400 border border-red-600/30 px-4 py-2 rounded-lg transition-colors text-sm"
          >
            Reintentar
          </button>
        </div>
      </div>
    );
  }

  // Si no hay suscripción activa, mostrar estado gratuito
  if (!subscription?.hasSubscription) {
    return (
      <div className="bg-neutral-800 rounded-lg p-6 border border-neutral-700">
        <div className="text-center">
          <h3 className="text-lg font-semibold text-accent-cream mb-2">
            Plan Gratuito
          </h3>
          <p className="text-neutral-400 mb-4">
            Funcionalidades básicas disponibles
          </p>
          <a
            href="/pricing"
            className="bg-nexly-green hover:bg-green-600 text-accent-cream px-4 py-2 rounded-lg transition-colors duration-300"
          >
            Ver Planes
          </a>
        </div>
      </div>
    );
  }

  const sub = subscription.subscription!;

  return (
    <div className={`rounded-lg p-6 border ${
      status.isPaid
        ? "bg-green-900/10 border-green-700/20"
        : status.isTrial
        ? "bg-blue-900/10 border-blue-700/20"
        : "bg-neutral-800 border-neutral-700"
    }`}>
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <h3 className="text-lg font-semibold text-accent-cream">
              {sub.planType === "crecimiento" ? "Plan Crecimiento" :
               sub.planType === "pro" ? "Plan Pro" :
               sub.planType === "business" ? "Plan Business" :
               "Plan Básico"}
            </h3>
            <span className={`px-2 py-1 rounded-md text-xs font-medium ${
              status.isPaid
                ? "text-green-400 border border-green-400/30"
                : status.isTrial
                ? "text-blue-400 border border-blue-400/30"
                : "text-gray-400 border border-gray-400/30"
            }`}>
              {status.isPaid ? "Activo" : status.isTrial ? "En Prueba" : "Gratuito"}
            </span>
          </div>

          <p className={`text-sm ${
            status.isPaid ? "text-green-400" :
            status.isTrial ? "text-blue-400" :
            "text-neutral-300"
          }`}>
            {status.isPaid ? "Suscripción activa y renovando automáticamente" :
             status.isTrial ? "Período de prueba activo" :
             "Funcionalidades básicas disponibles"}
          </p>
        </div>

        <div className="flex gap-2">
          <button
            onClick={() => window.location.href = '/dashboard/subscription'}
            className="bg-neutral-600 hover:bg-neutral-700 text-accent-cream px-4 py-2 rounded-lg transition-colors text-sm"
          >
            Gestionar
          </button>
        </div>
      </div>
    </div>
  );
}
