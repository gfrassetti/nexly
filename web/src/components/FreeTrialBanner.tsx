"use client";
import { useSubscription } from "@/contexts/SubscriptionContext";
import { useState } from "react";

export default function FreeTrialBanner() {
  const { subscription, startFreeTrial, canUseFreeTrial, isFreeTrialActive } = useSubscription();
  const [isStarting, setIsStarting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleStartFreeTrial = async () => {
    try {
      setIsStarting(true);
      setError(null);
      await startFreeTrial();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al activar período de prueba');
    } finally {
      setIsStarting(false);
    }
  };

  const freeTrial = subscription?.freeTrial;

  // No mostrar si no hay información del período de prueba o si ya tiene suscripción
  // (activa, cancelada, pausada, etc.)
  if (subscription?.hasSubscription || !freeTrial) {
    return null;
  }

  // Si está activo, mostrar información del tiempo restante
  if (isFreeTrialActive()) {
    return (
      <div className="bg-gradient-to-r from-blue-500 to-purple-600 text-accent-cream p-4 rounded-lg mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold">🎉 Período de Prueba Gratuito Activo</h3>
            <p className="text-blue-100">
              Tienes acceso completo a WhatsApp Business e Instagram por {freeTrial.hoursRemaining} horas más
            </p>
            <p className="text-blue-200 text-sm mt-1">
              Solo estas 2 integraciones están disponibles durante el período de prueba
            </p>
          </div>
          <div className="text-right">
            <div className="text-2xl font-bold">{freeTrial.hoursRemaining}h</div>
            <div className="text-blue-100 text-sm">restantes</div>
          </div>
        </div>
      </div>
    );
  }

  // Si puede usar el período de prueba, mostrar botón para activarlo
  if (canUseFreeTrial()) {
    return (
      <div className="bg-gradient-to-r from-green-500 to-blue-600 text-accent-cream p-4 rounded-lg mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold">🚀 ¡Prueba Gratuita Disponible!</h3>
            <p className="text-green-100">
              Obtén acceso completo a WhatsApp Business e Instagram por 24 horas completamente gratis
            </p>
            <p className="text-green-200 text-sm mt-1">
              Solo para usuarios nuevos sin suscripción previa • Solo WhatsApp Business e Instagram
            </p>
            {error && (
              <p className="text-red-200 text-sm mt-1">{error}</p>
            )}
          </div>
          <button
            onClick={handleStartFreeTrial}
            disabled={isStarting}
            className="bg-white text-green-600 px-6 py-2 rounded-lg font-semibold hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {isStarting ? 'Activando...' : 'Activar Ahora'}
          </button>
        </div>
      </div>
    );
  }

  // Si ya usó el período de prueba, mostrar mensaje
  if (freeTrial.used) {
    return (
      <div className="bg-gray-100 border border-gray-300 p-4 rounded-lg mb-6">
        <div className="flex items-center">
          <div className="text-gray-600">
            <h3 className="text-lg font-semibold">Período de Prueba Utilizado</h3>
            <p>
              Ya has utilizado tu período de prueba gratuito de 24 horas. 
              <a href="/pricing" className="text-blue-600 hover:underline ml-1">
                Suscríbete ahora para continuar usando todas las integraciones.
              </a>
            </p>
            <p className="text-sm text-gray-500 mt-1">
              El período de prueba gratuito solo está disponible para usuarios nuevos sin suscripción previa.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return null;
}
