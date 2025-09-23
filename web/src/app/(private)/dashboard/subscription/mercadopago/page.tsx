"use client";

import { useSubscription } from "@/contexts/SubscriptionContext";
import { useAuth } from "@/hooks/useAuth";

export default function MercadoPagoSubscriptionPage() {
  const { subscription, loading } = useSubscription();
  const { user } = useAuth();

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-nexly-green"></div>
        <span className="ml-2 text-gray-600">Cargando...</span>
      </div>
    );
  }

  if (!subscription?.subscription) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 p-6">
        <div className="max-w-4xl mx-auto">
          <div className="bg-white rounded-2xl shadow-xl p-8 text-center">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <span className="text-2xl text-gray-400">●</span>
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Sin Suscripción Activa</h2>
            <p className="text-gray-600 mb-6">No tienes una suscripción activa con MercadoPago.</p>
            <button
              onClick={() => window.location.href = "/pricing"}
              className="bg-gradient-to-r from-nexly-green to-green-600 hover:from-green-600 hover:to-green-700 text-white font-semibold px-8 py-3 rounded-xl transition-all duration-200 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
            >
              Ver Planes Disponibles
            </button>
          </div>
        </div>
      </div>
    );
  }

  const sub = subscription.subscription;

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 p-6">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Mi Suscripción - MercadoPago</h1>
          <p className="text-gray-600">Gestiona tu suscripción con MercadoPago</p>
        </div>

        {/* Información de suscripción MercadoPago */}
        <div className="bg-white rounded-2xl shadow-xl p-6 border border-gray-100">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold text-gray-900">Estado de Suscripción</h2>
            <div className="px-4 py-2 rounded-full border text-sm font-medium bg-blue-100 text-blue-800">
              MercadoPago
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium text-gray-500 uppercase tracking-wide">ID de Suscripción</label>
                <p className="text-gray-900 font-mono text-sm mt-1 bg-gray-50 px-3 py-2 rounded-lg">
                  {(sub as any).mercadoPagoSubscriptionId || "N/A"}
                </p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-500 uppercase tracking-wide">Plan</label>
                <p className="text-lg font-semibold text-gray-900 mt-1 capitalize">
                  {sub.planType === "basic" ? "Básico" : "Premium"}
                </p>
              </div>
            </div>
            
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium text-gray-500 uppercase tracking-wide">Estado</label>
                <p className="text-lg font-semibold text-gray-900 mt-1 capitalize">
                  {sub.status}
                </p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-500 uppercase tracking-wide">Proveedor</label>
                <p className="text-lg font-semibold text-gray-900 mt-1">
                  MercadoPago
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Nota sobre funcionalidades */}
        <div className="mt-6 bg-yellow-50 border border-yellow-200 rounded-xl p-6">
          <div className="flex items-center">
            <span className="text-yellow-600 mr-2">ℹ️</span>
            <div>
              <h3 className="text-yellow-800 font-medium">Funcionalidades MercadoPago</h3>
              <p className="text-yellow-700 text-sm mt-1">
                Las funcionalidades específicas de MercadoPago (cancelar, pausar, etc.) estarán disponibles próximamente.
                Por ahora, puedes gestionar tu suscripción directamente desde tu cuenta de MercadoPago.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
