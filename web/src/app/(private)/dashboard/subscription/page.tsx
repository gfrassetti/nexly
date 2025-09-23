"use client";

import { useState } from "react";
import { useSubscription } from "@/contexts/SubscriptionContext";
import { useAuth } from "@/hooks/useAuth";
import { useNotificationHelpers } from "@/hooks/useNotification";

// Iconos de tarjetas de pago
const paymentIcons = {
  visa: "https://cdn.jsdelivr.net/gh/devicons/devicon/icons/visa/visa-original.svg",
  mastercard: "https://cdn.jsdelivr.net/gh/devicons/devicon/icons/mastercard/mastercard-original.svg",
  amex: "https://upload.wikimedia.org/wikipedia/commons/thumb/3/30/American_Express_logo_%282018%29.svg/1200px-American_Express_logo_%282018%29.svg.png",
  default: "https://cdn-icons-png.flaticon.com/512/179/179457.png",
};

const normalizeMethod = (brand: string | undefined) => {
  if (!brand) return "default";
  const map: Record<string, string> = {
    visa: "visa",
    mastercard: "mastercard",
    amex: "amex",
  };
  return map[brand.toLowerCase()] || "default";
};

const getSubscriptionLabel = (subscription: any) => {
  if (subscription.status === "trialing") {
    const trialEnd = new Date(subscription.trial_end * 1000);
    const now = new Date();
    const daysLeft = Math.ceil((trialEnd.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    return `Prueba Gratuita (${daysLeft} días restantes)`;
  }
  if (subscription.status === "active") return "Activa";
  if (subscription.status === "paused") return "Pausada";
  if (subscription.status === "canceled") return "Cancelada";
  if (subscription.status === "past_due") return "Vencida";
  return "Desconocida";
};

async function cancelStripeSubscription(subscriptionId: string) {
  const res = await fetch("/api/stripe/cancel-subscription", {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ subscriptionId }),
  });
  if (!res.ok) throw new Error("Error al cancelar la suscripción");
  return res.json();
}

async function pauseStripeSubscription(subscriptionId: string) {
  const res = await fetch("/api/stripe/pause-subscription", {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ subscriptionId }),
  });
  if (!res.ok) throw new Error("Error al pausar la suscripción");
  return res.json();
}

async function reactivateStripeSubscription(subscriptionId: string) {
  const res = await fetch("/api/stripe/reactivate-subscription", {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ subscriptionId }),
  });
  if (!res.ok) throw new Error("Error al reactivar la suscripción");
  return res.json();
}

export default function SubscriptionInfo() {
  const { subscription, loading } = useSubscription();
  const { user } = useAuth();
  const { showSuccess, showError } = useNotificationHelpers();
  
  const [isLoadingAction, setIsLoadingAction] = useState(false);

  const handleCancel = async () => {
    if (!subscription?.subscription?.stripeSubscriptionId) return;
    
    setIsLoadingAction(true);
    try {
      await cancelStripeSubscription(subscription.subscription.stripeSubscriptionId);
      showSuccess("Éxito", "Suscripción cancelada correctamente");
      // Recargar la página para actualizar el estado
      window.location.reload();
    } catch (error) {
      showError("Error", "Error al cancelar suscripción");
    } finally {
      setIsLoadingAction(false);
    }
  };

  const handlePause = async () => {
    if (!subscription?.subscription?.stripeSubscriptionId) return;
    
    setIsLoadingAction(true);
    try {
      await pauseStripeSubscription(subscription.subscription.stripeSubscriptionId);
      showSuccess("Éxito", "Suscripción pausada correctamente");
      window.location.reload();
    } catch (error) {
      showError("Error", "Error al pausar suscripción");
    } finally {
      setIsLoadingAction(false);
    }
  };

  const handleReactivate = async () => {
    if (!subscription?.subscription?.stripeSubscriptionId) return;
    
    setIsLoadingAction(true);
    try {
      await reactivateStripeSubscription(subscription.subscription.stripeSubscriptionId);
      showSuccess("Éxito", "Suscripción reactivada correctamente");
      window.location.reload();
    } catch (error) {
      showError("Error", "Error al reactivar suscripción");
    } finally {
      setIsLoadingAction(false);
    }
  };

  const handleUpgrade = () => {
    window.location.href = "/pricing";
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-nexly-green"></div>
        <span className="ml-2 text-gray-600">Cargando Suscripción...</span>
      </div>
    );
  }

  if (!subscription?.subscription || subscription.subscription.status === "canceled") {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-center gap-4">
        <p className="text-gray-700 text-lg">
          No tienes una suscripción activa.
        </p>
        <button
          onClick={handleUpgrade}
          className="bg-nexly-green hover:bg-nexly-green/90 text-white font-semibold px-6 py-2 rounded-lg transition-colors"
        >
          Actualizar a PRO
        </button>
      </div>
    );
  }

  const sub = subscription.subscription;
  // Datos simulados para la demo - en producción vendrían de Stripe
  const card = { brand: "visa", last4: "4242" };
  const normalized = normalizeMethod(card?.brand);
  const isPaused = sub.status === "paused";

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <h2 className="text-2xl font-bold mb-6 text-gray-900">Detalles de Mi Suscripción</h2>
      
      {/* Información de la suscripción */}
      <div className="bg-white rounded-lg shadow-md border border-gray-200 p-6 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-4">
            <div>
              <label className="font-semibold text-gray-700">ID</label>
              <p className="text-gray-900 font-mono text-sm">{sub.stripeSubscriptionId || "N/A"}</p>
            </div>
            <div>
              <label className="font-semibold text-gray-700">Estado</label>
              <p className="text-gray-900">{getSubscriptionLabel(sub)}</p>
            </div>
            <div>
              <label className="font-semibold text-gray-700">Monto</label>
              <p className="text-gray-900">
                {sub.status === "trialing" ? "$ 0,00" : "$ 29,99"}
              </p>
            </div>
          </div>
          <div className="space-y-4">
            <div>
              <label className="font-semibold text-gray-700">Renovación</label>
              <p className="text-gray-900">
                {sub.status === "trialing" ? "10/28/2025" : "Próximo mes"}
              </p>
            </div>
            <div>
              <label className="font-semibold text-gray-700">Método de Pago</label>
              <div className="flex items-center">
                <img
                  src={paymentIcons[normalized as keyof typeof paymentIcons] || paymentIcons.default}
                  alt={normalized}
                  className="w-8 h-8 mr-2"
                />
                <span className="text-gray-900">
                  Terminada en {card?.last4 || "****"}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Botones de acción */}
      <div className="flex flex-wrap gap-3 mb-6">
        {sub.status === "active" && !isPaused && (
          <button
            onClick={handlePause}
            disabled={isLoadingAction}
            className="bg-yellow-500 hover:bg-yellow-600 disabled:bg-yellow-300 transition-colors text-white px-4 py-2 rounded-lg font-medium"
          >
            {isLoadingAction ? "Procesando..." : "Pausar Suscripción"}
          </button>
        )}

        {isPaused && (
          <button
            onClick={handleReactivate}
            disabled={isLoadingAction}
            className="bg-green-600 hover:bg-green-700 disabled:bg-green-300 transition-colors text-white px-4 py-2 rounded-lg font-medium"
          >
            {isLoadingAction ? "Procesando..." : "Reactivar Suscripción"}
          </button>
        )}

        {sub.status !== "canceled" && (
          <button
            onClick={handleCancel}
            disabled={isLoadingAction}
            className="bg-red-600 hover:bg-red-700 disabled:bg-red-300 transition-colors text-white px-4 py-2 rounded-lg font-medium flex items-center justify-center gap-2"
          >
            {isLoadingAction ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                Cancelando...
              </>
            ) : (
              "Cancelar Suscripción"
            )}
          </button>
        )}
      </div>

      {/* Portal de pagos */}
      <div className="bg-gray-50 rounded-lg p-6">
        <h3 className="text-lg font-semibold mb-4 text-gray-900">Actualizar Método de Pago</h3>
        <button
          onClick={() => window.location.href = "/pricing"}
          className="bg-black hover:bg-gray-800 transition-colors text-white px-6 py-2 rounded-lg font-medium"
        >
          Ir al Portal de Pagos
        </button>
      </div>
    </div>
  );
}
